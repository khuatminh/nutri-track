# ADR-0001 — Kiến trúc & stack cho NutriTrack MVP

| | |
|---|---|
| Trạng thái | **Accepted** (CTO, 2026-11-04) |
| Task | QLD-3 (thuộc QLD-1) |
| Đầu vào | PRD `docs/product/PRD.md` v1.0 (nguồn chuẩn), design `docs/design/design-spec.md` + `docs/design/tokens.css` + `docs/design/mockups/` |
| Người thực thi | Tech Lead (+ FE/BE Dev), DevOps |

> `docs/prd/nutritrack.md` (v0.1) là bản nháp cũ; khi mâu thuẫn, **`docs/product/PRD.md` thắng**.

## 1. Bối cảnh

MVP là web app mobile-first, tiếng Việt, 9 nhóm tính năng (PRD §1.5). Ràng buộc chính:
- NFR-06: tìm món không dấu / sai chính tả nhẹ, p95 ≤ 300 ms trên ~10.000 món.
- NFR-07/08: dữ liệu sức khỏe nhạy cảm — mật khẩu argon2id, cookie httpOnly, rate limit, mọi truy vấn lọc theo `user_id`.
- NFR-12: công thức BMR/TDEE/macro là hàm thuần có unit test với ví dụ PRD.
- Đội nhỏ, chạy local được bằng 1–2 lệnh, KHÔNG deploy production trong phạm vi task.

## 2. Quyết định

### 2.1 Kiến trúc: monolith full-stack một repo
Một ứng dụng **Next.js (App Router)** chứa cả UI và API. Không tách service. Lý do: một đội, một deploy unit, chia sẻ type TS giữa client/server, ít hạ tầng.

```
Browser ──► Next.js (RSC + Server Actions + Route Handlers /api/*)
                 │
                 ├─ src/lib/nutrition/*   (hàm thuần: BMR, TDEE, macro, nước, khẩu phần, báo cáo)
                 ├─ src/server/*          (service + repository, luôn nhận userId)
                 └─ Prisma ──► PostgreSQL 16 (pg_trgm + unaccent)
```

### 2.2 Stack

| Lớp | Lựa chọn | Ghi chú |
|---|---|---|
| Ngôn ngữ | TypeScript `strict` | Node 22 LTS |
| Framework | Next.js 15 App Router | Server Components mặc định; Server Actions cho mutation form; Route Handlers cho API JSON (tìm món, export) |
| UI | Tailwind CSS v4 + CSS variables từ `docs/design/tokens.css` | Ánh xạ theo design-spec §6; icon `lucide-react`; font Be Vietnam Pro **self-host** qua `next/font` |
| Component a11y | Radix UI primitives (Dialog, Tabs, Switch…) | Đáp ứng focus-trap, ARIA (NFR-03) |
| Biểu đồ | Recharts | Luôn kèm bảng dữ liệu thay thế + `aria-label` |
| Validation | Zod (dùng chung client/server) | Thông điệp lỗi tiếng Việt |
| ORM / migration | Prisma | `prisma migrate`; seed bằng `prisma db seed` |
| CSDL | **PostgreSQL 16** | Extension `pg_trgm`, `unaccent`; cột `name_unaccented` + GIN trigram index cho tìm kiếm |
| Auth | Tự triển khai session-based (theo mô hình Lucia v3 guide): bảng `Session`, cookie httpOnly + `SameSite=Lax` + `Secure` (prod), token ngẫu nhiên 32 byte, lưu **SHA-256 hash** của token | Băm mật khẩu `@node-rs/argon2` (argon2id). Lockout 5 lần sai/15 phút (bảng `LoginAttempt`). Reset password token hạn 60 phút, dùng 1 lần |
| Email (reset mật khẩu) | Nodemailer → **Mailpit** (local, docker-compose) | Không gửi email thật trong MVP |
| Ngày/giờ | `date-fns` + `date-fns-tz`; format qua `Intl` locale `vi-VN` | `log_date` là `DATE` theo timezone người dùng (PRD §8.3) |
| Unit test | **Vitest** | Bắt buộc cho `src/lib/nutrition/**` (coverage ≥ 90% dòng) |
| E2E | Playwright (khung sẵn; QA mở rộng ở QLD-4) | Luồng đăng ký → onboarding → ghi bữa → dashboard |
| Lint/format | ESLint (next + jsx-a11y) + Prettier | |
| Package manager | **pnpm** | Lockfile commit |
| Local infra | `docker-compose.yml`: `db` (postgres:16), `mailpit`; tùy chọn service `app` | Script `pnpm dev:setup` = migrate + seed |

### 2.3 Quy tắc mã nguồn
- `src/lib/nutrition/` **không** import Prisma/Next — chỉ hàm thuần, nhận số liệu, trả số thực chưa làm tròn; làm tròn ở lớp hiển thị (PRD §8.2). Hằng số (PAL, sàn kcal, 7700 kcal/kg, ngưỡng natri…) đặt trong **một file** `src/lib/nutrition/constants.ts` (PRD §5.8).
- Mọi hàm truy cập dữ liệu người dùng ở `src/server/` nhận `userId` từ session phía server; **không bao giờ** lấy `userId` từ body/query.
- FoodLog lưu **snapshot dinh dưỡng** (PRD §8.4); Food hệ thống soft-delete; `TargetHistory` lưu mục tiêu theo ngày hiệu lực.
- Theme: script inline đặt `data-theme` trước khi hydrate (không nháy); lưu lựa chọn trong `User.theme_pref` + cookie.
- Chuỗi UI tiếng Việt; code/comment tiếng Anh.
- Secrets chỉ qua `.env` (không commit); có `.env.example`.

### 2.4 Mô hình dữ liệu
Theo PRD §7: `User, Session, LoginAttempt, PasswordResetToken, Profile, TargetHistory, Food, FoodServing, FoodLog, Recipe, RecipeIngredient, WaterLog, WeightLog, Reminder` (+ `Favorite` cho tab "Yêu thích"). Dinh dưỡng của Food tính trên **100 g**.

### 2.5 Tìm món
`WHERE name_unaccented ILIKE '%q%' OR similarity(name_unaccented, q) > 0.3 ORDER BY (prefix match) DESC, similarity DESC LIMIT 20`, ưu tiên món của chính người dùng + món hệ thống. `name_unaccented` sinh ở tầng ứng dụng (chuẩn hóa NFD, bỏ dấu, `đ→d`, lowercase) để không phụ thuộc cấu hình `unaccent`. Client debounce 150 ms.

### 2.6 Nhắc nhở (trả lời PRD Q5)
MVP **không có push server**. Lịch nhắc lưu ở DB; client (tab/PWA đang mở) chạy scheduler, hiện toast in-app và `Notification` API khi đã cấp quyền (US-25, US-26). Không nhắc 22:00–06:00 trừ khi người dùng đặt rõ. Web Push + service worker để sau MVP.

### 2.7 Seed CSDL thực phẩm
- File dữ liệu `prisma/seed/foods.vi.json` (có thể chia nhiều file theo nhóm), schema kiểm bằng Zod trong seed script.
- Phạm vi task này: **≥ 200 món Việt phổ biến** (mục tiêu PRD 300 món + 700 nguyên liệu là việc tiếp theo), mỗi món: kcal/P/C/F/xơ/đường/natri trên 100 g, ≥ 1 khẩu phần tự nhiên (bát/tô/đĩa/cái…) có gram quy đổi, `source` + `confidence`.
- Kiểm tra tự động: kcal khớp 4P+4C+9F trong ±15% (PRD §9) — là unit test chạy trên file seed.
- Số liệu là **ước tính tổng hợp** từ tài liệu công khai (Bảng TPTP VN – Viện Dinh dưỡng, USDA FDC), không sao chép nguyên bảng; giấy phép dữ liệu (PRD Q4) cần Board/Legal xác nhận trước khi public.

## 3. Phương án đã cân nhắc

| Phương án | Lý do không chọn |
|---|---|
| SQLite | Không có trigram/unaccent tốt, khác prod; Postgres chạy local bằng docker-compose đủ đơn giản |
| Auth.js (NextAuth) Credentials | Credentials provider hạn chế với DB session, lockout, revoke phiên khi đổi mật khẩu (US-04.1) — tự làm gọn và kiểm soát hơn |
| Tách SPA + API riêng (Vite + NestJS/Express) | Gấp đôi hạ tầng & type sharing, không cần cho MVP |
| Drizzle ORM | Tốt, nhưng Prisma có migrate/seed/Studio quen thuộc hơn với đội |

## 4. Hệ quả
- (+) Một lệnh `docker compose up -d && pnpm dev:setup && pnpm dev` để chạy local.
- (+) Logic tính toán tách biệt, test nhanh, không cần DB.
- (−) Cần Docker cho Postgres khi dev; tự triển khai auth đòi hỏi review bảo mật kỹ (CTO review trước khi merge).
- (−) Nhắc nhở chỉ hoạt động khi tab/PWA mở (đã chấp nhận theo PRD US-26.4).

## 5. Quy trình bàn giao
- Code trên branch `feat/nutritrack-mvp` (worktree riêng), PR vào `main`. **Không push `main`, không deploy production.**
- PR phải có: output `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` pass; README chạy local; ảnh chụp các màn chính light/dark mobile/desktop.
- CTO review PR (bảo mật auth, phân quyền theo `userId`, logic tính toán) trước khi chuyển QA (QLD-4).
