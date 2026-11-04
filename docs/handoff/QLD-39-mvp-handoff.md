# Bàn giao MVP NutriTrack (QLD-39)

Cập nhật: 2026-11-04 · Tech Lead

## SHA bàn giao

- Nhánh: `feat/nutritrack-mvp`
- SHA code tích hợp: `9c59002ee21bf37512c3dde78b8a488042ff8518` (commit tài liệu này nằm sau SHA đó trên cùng nhánh)
- PR tổng vào `main`: [#1](https://github.com/khuatminh/nutri-track/pull/1) — **đang mở, chưa merge, chưa deploy** theo chỉ đạo Board.

## Đã tích hợp trong SHA này

| Task | PR | Nội dung |
| --- | --- | --- |
| QLD-40 | [#7](https://github.com/khuatminh/nutri-track/pull/7) | Chặn mục tiêu giảm cân cho người <18 (server + hợp đồng `docs/api/underage-weight-loss.md`) |
| QLD-41 | [#9](https://github.com/khuatminh/nutri-track/pull/9) | Server sửa/xóa dữ liệu thiết yếu (log, món riêng, cân nặng) |
| QLD-42 | [#11](https://github.com/khuatminh/nutri-track/pull/11) | Macro 5%, gợi ý carb, xác nhận sửa hồ sơ Tùy chỉnh |
| QLD-43 | [#8](https://github.com/khuatminh/nutri-track/pull/8) | Dashboard không tràn ngang, vùng chạm ≥44px |
| QLD-44 | [#10](https://github.com/khuatminh/nutri-track/pull/10) | Tìm món, vi chất, notification, axe |
| QLD-45 | [#6](https://github.com/khuatminh/nutri-track/pull/6) | Offline không crash, giữ input, Thử lại; optimistic delete |
| QLD-46 | [#12](https://github.com/khuatminh/nutri-track/pull/12) | UI chặn giảm cân <18, disable option ở onboarding và hồ sơ |
| QLD-47 | [#13](https://github.com/khuatminh/nutri-track/pull/13) | UI sửa/xóa log, món riêng, cân nặng; đổi bữa/đơn vị |

Ghi chú tích hợp: PR #13 xung đột với QLD-45 ở `add-food.tsx` / `meal-card.tsx`. Đã hợp nhất thủ công, giữ cả xử lý offline/Thử lại/optimistic delete của QLD-45 và dialog sửa đơn vị/bữa của QLD-47.

## Kiểm chứng

- CI tại head từng PR: #12 xanh tại `b70c7d5`, #13 xanh tại `197ae4b` (lint · typecheck · unit/integration · build · e2e).
- Trên cây merge `9c59002` (local): `tsc --noEmit` chỉ còn lỗi thiếu devDependency `@axe-core/playwright` trong worktree (CI có cài), `eslint` các file đổi pass, `next build` pass.
- CI tích hợp trên `9c59002` (PR #1): **pass** toàn bộ `lint · typecheck · unit/integration · build · e2e`.

## Hướng dẫn chạy cho QA smoke

Yêu cầu: Docker Engine/Desktop, Node 22, pnpm 10.

```sh
git fetch origin
git checkout feat/nutritrack-mvp
git reset --hard 9c59002
cp .env.example .env
pnpm install --frozen-lockfile
docker compose up -d
pnpm dev:setup
pnpm dev
```

- App: http://localhost:3000 · Mailpit: http://localhost:8025
- Không dùng cổng 3100 (Paperclip). Đổi cổng thì cập nhật `APP_URL`.

## Phạm vi smoke (một lượt, theo QLD-39)

1. Đăng ký + onboarding (4 bước hiện tại) → vào dashboard.
2. Ghi bữa, sửa số lượng/đơn vị/bữa, xóa và hoàn tác.
3. Sửa/xóa món tự tạo; sửa/xóa bản ghi cân nặng.
4. Dashboard trên mobile: không tràn ngang, nút chạm ≥44px.
5. Người <18: không chọn được mục tiêu giảm cân ở onboarding và hồ sơ; server trả `UNDERAGE_WEIGHT_LOSS_BLOCKED` nếu gọi thẳng.
6. Offline: thêm món/nước khi mất mạng không crash, giữ input, có nút Thử lại.

Không regression toàn bộ, không thêm E2E/ảnh/báo cáo dài.

## Đã hoãn (theo `mvp-scope` tại QLD-48)

US-11.4, US-13.9, US-15.5, US-21, US-09.2; xóa cả bữa + hoàn tác, đổi ngày log; onboarding 5 bước; NFR-05 (đo ≤100 ms); axe toàn bộ 10 màn; các AC P1 chưa có bug.

## Ràng buộc

- Không merge `main`, không deploy production.
- Không mở task tính năng mới trong đợt MVP.
