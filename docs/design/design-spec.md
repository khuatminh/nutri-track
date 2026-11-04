# NutriTrack — Design Spec v1.1 (QLD-17)

Mockup (HTML tĩnh, mở bằng trình duyệt): `docs/design/mockups/index.html` · Token: `docs/design/tokens.css` · Ảnh chụp: `docs/design/screenshots/*.png` · Kiểm tra tương phản: `docs/design/tools/contrast.mjs` (kết quả: `tools/contrast-report.md`, 64/64 cặp đạt).
> **Bản chuẩn:** `docs/design/` trên nhánh `design/nutritrack-ui` là bản chuẩn duy nhất. Nhánh `design/nutritrack-ds` (commit `ed6afb1`, thư mục `docs/design/nutritrack/`) là **LỖI THỜI** — không dùng làm nguồn cho dev; nó còn nhãn tab "Cá nhân" và dòng "Tập luyện +0".
> **v1.1:** đã đối chiếu từng US/AC với PRD (`docs/product/PRD.md`, QLD-10) — xem mục 8; thêm màn Công thức (`mockups/recipes.html`) và trạng thái bổ sung (`mockups/states.html`); bỏ "Tập luyện +0" (Q9); nhãn tab mobile thống nhất là **"Hồ sơ"**; thêm tuỳ chọn **ẩn số cân nặng** (Q6).

## 1. Nguyên tắc
Mobile-first · tiếng Việt (Be Vietnam Pro, fallback Inter/system) · WCAG 2.1 AA · không chỉ dùng màu để truyền thông tin · ghi một món ≤ 3 chạm từ Dashboard (Gần đây → khẩu phần → Thêm).

## 2. Design tokens
Nguồn chuẩn: `tokens.css` (CSS variables, `data-theme="light|dark"`, mặc định theo `prefers-color-scheme`).

| Nhóm | Giá trị |
|---|---|
| Font | Be Vietnam Pro 400/500/600/700 (đủ dấu tiếng Việt), số dùng `font-variant-numeric: tabular-nums` |
| Cỡ chữ | 12 / 14 / 16 (body) / 18 / 22 / 28 / 40 px |
| Spacing | lưới 4px: 4, 8, 12, 16, 20, 24, 32, 40, 48 |
| Radius | 8 / 12 / 16 / 24 / full |
| Shadow | 3 cấp (`--shadow-1..3`), dark dùng bóng đậm hơn |
| Breakpoint | sm 640 · md 768 · lg 1024 · xl 1280. `<1024`: bottom nav; `≥1024`: sidebar 248px, nội dung max 1120px |
| Touch target | ≥ 44×44px (`--touch-min`) |
| Icon | bộ nét 24px, stroke 1.75 (đề xuất Lucide); mockup dùng emoji làm placeholder — dev thay bằng SVG |
| Motion | 120/200ms, tôn trọng `prefers-reduced-motion` |

### Màu (light / dark)
| Token | Light | Dark |
|---|---|---|
| bg / surface / surface-2 | #F6F8F5 / #FFFFFF / #EEF2EC | #0E1511 / #161F1A / #1F2B24 |
| text / muted / faint | #17211B / #4A5A50 / #5C6B61 | #EAF2EC / #A9B8AE / #98A89D |
| primary (+ chữ trên nó) | #0B6E4F (#FFF) | #4FC78F (#06251A) |
| focus | #1B5FD1 | #7CB2FF |
| danger / warning / success | #B3261E / #8A5A00 / #1B6B3A | #FF8A80 / #F2C04D / #6FD695 |

### Màu macro — an toàn cho người mù màu
Bảng Okabe–Ito (phân biệt được với deuteranopia/protanopia/tritanopia) **và** luôn đi kèm 2 tín hiệu phụ: chữ cái + hình đánh dấu + hoạ tiết thanh.

| Macro | Light | Dark | Hình | Hoạ tiết thanh |
|---|---|---|---|---|
| Đạm (P) | #0072B2 | #56B4E9 | ■ vuông | sọc chéo |
| Tinh bột (C) | #B36B00 | #F0B429 | ● tròn | chấm |
| Béo (F) | #A8447F | #E58FC0 | ◆ thoi | lưới ô |
Chữ số macro dùng biến `--macro-*-text` (đạt ≥4.5:1).

### Tương phản đo được (trích — đầy đủ ở `tools/contrast-report.md`)
Chạy: `node docs/design/tools/contrast.mjs`.
| Cặp | Light | Dark |
|---|---|---|
| text / bg | xem report | xem report |
| Toàn bộ cặp chữ (text, muted, faint, primary-contrast/primary, link, soft badges, danger/warning/success, macro-text) | ≥ 4.5:1 ✅ | ≥ 4.5:1 ✅ |
| Viền input, focus ring, màu macro/kcal/nước trên surface & track | ≥ 3:1 ✅ | ≥ 3:1 ✅ |
Tổng 64/64 cặp đạt (32 cặp × 2 theme); chạy lại `contrast.mjs` ở v1.1: ALL PASS. v1.1 không thêm token màu mới (màn Công thức và trạng thái mới chỉ dùng token sẵn có). Hai giá trị đã chỉnh sau lần đo đầu: `--border-strong` (2.87→đạt 3:1), `--macro-carb` (2.67 trên track→đạt).

## 3. Component & trạng thái
Xem trực quan: `mockups/components.html` (light + dark).
| Component | Trạng thái bắt buộc | Ghi chú a11y |
|---|---|---|
| Button (primary/secondary/ghost/danger; sm/md) | default, hover, focus-visible (outline 3px `--focus`, offset 2), active, disabled (opacity .45 + `disabled`), loading (spinner + "Đang lưu…", `aria-busy`) | min-height 44px (sm 36px chỉ dùng desktop/dày đặc) |
| Input / Select / Stepper | default, focus, error (viền 2px + icon ⚠ + text lỗi, `aria-invalid`, `aria-describedby`), disabled, có đơn vị | label luôn hiển thị, không dùng placeholder thay label |
| Tabs / Segmented | selected, focus; `role=tablist/tab`, mũi tên chuyển tab | |
| Chip, Badge | on/off; badge luôn có chữ (không chỉ màu) | |
| Card | default, clickable (hover nâng `--shadow-2`) | |
| Progress ring (kcal) | <90% xanh · 90–100% cảnh báo · >100% vượt (đổi sang `--macro-carb` + chữ "vượt X kcal") | `role=img` + aria-label "760 kcal còn lại" |
| Macro bar | thường, đạt, vượt (viền + badge "Vượt") | `role=progressbar` aria-valuenow/max |
| List item món | default, swipe-to-delete (mobile; có nút ⋯ thay thế), selected | cả hàng là 1 vùng bấm ≥56px |
| Bottom nav (mobile) | 5 mục, nút + giữa nổi (FAB) | `nav aria-label`, `aria-current="page"` |
| Sidebar (desktop) | active/hover/focus, thu gọn ở 1024–1279 (chỉ icon + tooltip) | |
| Bottom sheet (mobile) / Modal (desktop) | mở/đóng, kéo xuống đóng, scrim | `role=dialog aria-modal`, focus trap, Esc đóng, trả focus |
| Toast | success/error/undo, tự ẩn 5s (undo 8s) | `role=status`, không auto-ẩn khi hover/focus |
| Empty state | icon + tiêu đề + gợi ý + 1 CTA | |
| Skeleton (loading) | thay vì spinner toàn trang | `aria-busy` |
| Chart (cột/đường) | loading, empty (<3 ngày), có dữ liệu; vượt mục tiêu đổi màu **và** có chú giải | `role=img` + aria-label tóm tắt; cung cấp "Xem dạng bảng" |

Error toàn cục: banner "Không tải được dữ liệu. [Thử lại]" ; offline: banner "Bạn đang offline — thay đổi sẽ đồng bộ khi có mạng".

## 4. Information architecture & user flow
```
NutriTrack
├─ Onboarding (lần đầu): Mục tiêu → Thông tin cơ thể → Kết quả BMR/TDEE/macro → Nhắc nhở
├─ Hôm nay (Dashboard): vòng kcal, macro, nước, bữa hôm nay, cân nặng (desktop)
├─ Nhật ký: chọn ngày → bữa (Sáng/Trưa/Tối/Phụ) → sửa/xoá món → Sao chép bữa
│   └─ Thêm món (modal/sheet): Tìm kiếm · Gần đây · Yêu thích · Công thức của tôi · Tự thêm → Chọn khẩu phần
├─ Công thức (sidebar desktop; mobile: Hồ sơ → "Công thức của tôi" hoặc Thêm món → chip "Công thức của tôi"): danh sách → tạo/sửa nguyên liệu → tính kcal/macro cả nồi & mỗi phần realtime → nhân bản/xoá (xác nhận)
├─ Báo cáo: Tuần | Tháng → kcal/ngày, macro TB, nước, cân nặng (+ Ghi cân nặng)
└─ Hồ sơ & cài đặt: thông tin, mục tiêu (tính lại), nhắc nhở, giao diện (sáng/tối/hệ thống), xuất dữ liệu, đăng xuất/xoá TK
```
Luồng chính: **Đăng ký → Onboarding 4 bước → Dashboard → nút "+" → (Gần đây|Tìm kiếm) → chọn khẩu phần → "Thêm vào nhật ký" → toast "Đã thêm · Hoàn tác" → Dashboard cập nhật vòng/macro.** Nước và cân nặng ghi nhanh ngay trên Dashboard (nút +250/+500 ml; "Ghi cân nặng" ở Báo cáo/Dashboard desktop).

## 5. Mô tả 6 màn (mobile + desktop)
| Màn | File | Nội dung chính | Trạng thái đã thiết kế |
|---|---|---|---|
| Onboarding | `mockups/onboarding.html` | 4 bước có stepper; kết quả BMR/TDEE/macro (Mifflin-St Jeor); desktop căn giữa 720px | lỗi validate (mục tiêu ≠ cân nặng mục tiêu), disclaimer "không phải tư vấn y tế" |
| Dashboard | `dashboard.html` | Vòng kcal còn lại, 3 macro bar, nước, bữa hôm nay; desktop 2 cột + biểu đồ cân nặng | Light + Dark × Mobile + Desktop |
| Thêm món | `add-food.html` | Tìm kiếm, chip nguồn, danh sách Gần đây, sheet chọn khẩu phần + bữa; desktop 2 panel | kết quả, empty "không tìm thấy" + tạo món mới, toast Hoàn tác |
| Nhật ký | `diary.html` | Dải chọn ngày, tổng ngày, thẻ theo bữa, Sao chép bữa (sheet) | bữa trống |
| Báo cáo | `reports.html` | Tuần/Tháng, 3 số liệu, biểu đồ cột kcal, đường cân nặng, macro TB, top món | empty (<3 ngày) |
| Hồ sơ | `profile.html` | Thông tin, mục tiêu, nhắc nhở (switch), giao diện, **công tắc "Ẩn số cân nặng"**, lối vào Công thức của tôi, xoá TK | Light/Dark, modal xác nhận xoá |
| **Công thức** | `recipes.html` | Danh sách; tạo/sửa (tên, khẩu phần 0,5–50, nguyên liệu + số lượng/đơn vị, khối lượng thành phẩm tuỳ chọn); thẻ Dinh dưỡng **cả nồi vs mỗi phần** tính lại tự động (kcal, P/C/F, xơ, đường, natri); menu ⋯ Sửa/Nhân bản/Xoá | Mobile + Desktop, Light + Dark; lỗi (thiếu tên, khẩu phần 0, chưa có nguyên liệu); modal xác nhận xoá; toast sau nhân bản; empty; sheet thêm nguyên liệu |
| **Trạng thái bổ sung** | `states.html` | Đăng ký/Đăng nhập/Khoá tạm thời/Quên MK; Chỉnh mục tiêu + cách tính; cảnh báo dưới sàn & chặn <800 kcal; macro lệch; banner nhắc nhở; vượt kcal; ngày trống; ghi nhanh; danh sách nước; ghi cân nặng/xu hướng/empty; hỏi cập nhật TDEE; quyền thông báo trình duyệt; điểm nhấn | Xem cột "Màn" ở mục 8 |

Ảnh chụp: `docs/design/screenshots/{dashboard,onboarding,add-food,diary,reports,profile,components,recipes,states}.png`.

### Quyết định thiết kế v1.1
- **Dashboard:** bỏ dòng "Tập luyện +0" (Q9: MVP không cộng kcal vận động; kcal còn lại = mục tiêu − đã ăn). Thẻ Cân nặng có nút **Ẩn/Hiện** (`aria-pressed`); khi ẩn hiển thị "••••" + lời giải thích, không hiện xu hướng. Cùng công tắc trong Hồ sơ → Giao diện (áp dụng cả Dashboard và Báo cáo).
- **Nhãn tab mobile:** Hôm nay · Nhật ký · (+) · Báo cáo · **Hồ sơ**. Không dùng "Cá nhân". Desktop sidebar: "Hồ sơ & cài đặt".
- **Vượt kcal (US-13.2):** vòng chuyển màu cam + chữ "+150 kcal vượt" + biểu tượng ℹ️, giọng trung tính (Q6), không dùng đỏ/cảnh báo.
- **Công thức:** thẻ Dinh dưỡng đặt **trên** danh sách nguyên liệu trên mobile để thấy ngay kết quả khi sửa; vùng `aria-live=polite`. Lỗi hiện khi bấm Lưu (US-22.5): banner tổng + lỗi từng trường + khung đỏ "Thêm ít nhất 1 nguyên liệu". Xoá: modal xác nhận nêu rõ "bữa đã ghi giữ nguyên" (US-23.2). Nhân bản: tạo "… (bản sao)" + toast "Sửa ngay" (US-23.3).

## 6. Handoff cho dev
- **Tailwind**: ánh xạ biến CSS: `colors: { bg:'var(--bg)', surface:'var(--surface)', primary:{DEFAULT:'var(--primary)',hover:'var(--primary-hover)',contrast:'var(--primary-contrast)'}, text:{DEFAULT:'var(--text)',muted:'var(--text-muted)'}, protein:'var(--macro-protein)', carb:'var(--macro-carb)', fat:'var(--macro-fat)' }, borderRadius:{sm:'8px',md:'12px',lg:'16px',xl:'24px'}, screens:{sm:'640px',md:'768px',lg:'1024px',xl:'1280px'}, fontFamily:{sans:['Be Vietnam Pro','Inter','system-ui','sans-serif']}`; bật `darkMode: ['selector','[data-theme="dark"]']`.
- Số liệu hiển thị: định dạng `vi-VN` (1.240 · 68,4). Đơn vị kg/cm/ml/kcal.
- Theme: lưu lựa chọn (sáng/tối/hệ thống); đặt `data-theme` trước khi render để tránh nháy.
- Focus: không bao giờ `outline:none` mà không có thay thế; thứ tự Tab theo thứ tự thị giác; modal/sheet focus-trap.
- Chart: không dựa vào màu đơn thuần; luôn có nhãn trục, chú giải, aria-label, bảng dữ liệu thay thế.
- Ảnh/emoji món: placeholder, dev thay bằng ảnh hoặc icon; mọi ảnh có alt hoặc `aria-hidden`.
- Responsive: layout dùng `<1024` mobile; kiểm tra 360px, 390px, 768px, 1024px, 1280px.

## 7. Hạn chế / việc tiếp theo
- Mockup mobile màn Sửa công thức cắt ở khung 844px (cuộn thật); danh sách nguyên liệu dài cuộn trong trang.
- Font Be Vietnam Pro tải từ Google Fonts trong mockup; production nên self-host.
- Chưa chạy kiểm tra trình đọc màn hình thực tế; chỉ audit theo tiêu chí + đo tương phản bằng script.
- Các mục "Chưa có mockup riêng" ở mục 8 là trạng thái nhỏ dev dựng theo component có sẵn (xem cột Ghi chú).

## 8. Bảng truy vết US → màn/component
Màn: DB=dashboard, ON=onboarding, AF=add-food, DI=diary, RP=reports, PR=profile, RC=recipes, ST=states (đều trong `mockups/`).
| US | Màn / component | Ghi chú |
|---|---|---|
| US-01 Đăng ký (01.1–01.3) | ST: "Đăng ký: lỗi từng trường" | 01.4 băm mật khẩu: chỉ backend |
| US-02 Đăng nhập/xuất/quên MK | ST: Đăng nhập sai (02.2), Khoá tạm thời (02.3), Quên mật khẩu (02.5); PR: nút Đăng xuất (02.4) | 02.1 phiên giữ: hành vi |
| US-03 Onboarding hồ sơ | ON (4 bước, lỗi validate 03.2, tốc độ 03.3); PR: sửa hồ sơ (03.4–03.5) | 03.6 chỉ mét: PR hiển thị "kg · cm · ml" |
| US-04 Tài khoản & dữ liệu (P1) | PR: Xuất dữ liệu, Xoá tài khoản (modal) | Đổi mật khẩu (04.1): dùng Input/Modal chuẩn, chưa có mockup riêng |
| US-05 Mục tiêu kcal/macro | ON bước 3 (05.1–05.3, 05.7); ST: Chỉnh mục tiêu + cách tính (05.4, 05.7), dưới sàn (05.5), <800 chặn (05.5), macro lệch (05.6) | 05.1–05.2 công thức: backend; 05.8 cảnh báo <18 tuổi/thai kỳ: dùng banner cảnh báo (`.badge.warn`), chưa có mockup riêng |
| US-06 Tìm & thêm món | AF: tìm, chip Gần đây/Yêu thích/Công thức/Tự thêm, empty + "Tạo món mới" (06.4) | 06.2–06.3, 06.5 tìm không dấu/p95/seed: backend |
| US-07 Chọn khẩu phần | AF: sheet/panel khẩu phần, toast Hoàn tác (07.4) | 07.3 lỗi số lượng: Input error chuẩn; 07.5 "Xong" sau nhiều món: dev nút "Xong" cạnh "Thêm" (chưa mockup) |
| US-08 Sửa/xoá nhật ký | DI: thẻ bữa, ⋯; AF toast Hoàn tác (08.2) | Sửa/xoá bữa dùng Sheet/Modal chuẩn; 08.4 snapshot: backend |
| US-09 Món tự tạo | AF: "Tạo món mới" | Form tạo món: dùng Input/Stepper chuẩn, cảnh báo mềm 09.2 dùng `.badge.warn`; chưa mockup riêng |
| US-10 Gần đây & hay dùng | AF: chip Gần đây | 10.2 sắp xếp: backend |
| US-11 Sao chép bữa | DI: sheet Sao chép bữa; desktop nút "Sao chép bữa" | 11.2 nút vô hiệu khi nguồn trống: Button disabled |
| US-12 Ghi nhanh (P1) | ST: sheet Ghi nhanh calo | |
| US-13 Dashboard | DB: vòng kcal, macro, nước, bữa, chọn ngày; ST: vượt kcal (13.2), ngày trống (13.7) | 13.8 cảnh báo ngày tương lai & 13.9 streak (P1): chưa mockup |
| US-14 Mục tiêu nước | DB thẻ nước | 14.1 công thức: backend; chỉnh tay 14.2: Input chuẩn |
| US-15 Ghi nước | DB nút +250/+500/Tuỳ chỉnh; ST: Danh sách nước + đạt mục tiêu (15.3–15.4) | 15.5 chai yêu thích (P1): chưa mockup |
| US-16 Ghi cân nặng | ST: Ghi cân nặng + lỗi 20–300 kg (16.2); RP: nút Ghi cân nặng | 16.3 chọn ngày: trường Ngày |
| US-17 Biểu đồ xu hướng | RP: đường cân nặng; ST: bộ lọc 30/90 ngày/Tất cả, delta (17.1, 17.4), empty (17.3), "Xem dạng bảng" (17.2) | |
| US-18 Cập nhật TDEE | ST: modal "Cập nhật mục tiêu?" | |
| US-19 Báo cáo tuần | RP: Tuần, empty (19.4); ST: "n/7 ngày có dữ liệu" (19.3) | |
| US-20 Báo cáo tháng | RP: desktop Tháng | 20.3 xuất (P1): chưa mockup |
| US-21 Insights (P1) | ST: thẻ Điểm nhấn | |
| **US-22 Tạo công thức (22.1–22.5)** | **RC**: tạo/sửa (22.1), thẻ cả nồi/mỗi phần realtime (22.2), "Khối lượng thành phẩm" (22.3), lỗi (22.5); AF chip "Công thức của tôi" (22.3–22.4) | 22.4 FoodLog = 1,5 × /phần: dùng sheet khẩu phần AF với đơn vị "phần" |
| **US-23 Sửa/xoá công thức (23.1–23.4)** | **RC**: Sửa (23.1), modal xoá (23.2), Nhân bản + toast (23.3); hint "không lồng công thức" (23.4) | 23.1 snapshot: backend |
| US-24 Cấu hình nhắc | PR: switch nhắc; ST: lỗi giờ kết thúc ≤ bắt đầu (24.3) | Form chọn giờ/ngày dùng Input/Chip chuẩn |
| US-25 Nhắc in-app | ST: banner nhắc (+250 ml / Ghi bữa trưa / Hoãn 30 phút / Đóng) (25.1) | 25.2–25.3 logic: backend/FE |
| US-26 Web notification (P1) | ST: thẻ "Bật thông báo trình duyệt" + hướng dẫn khi bị chặn | 26.4: kỹ thuật |

**Tóm tắt:** 26/26 US đều có ít nhất 1 màn/component tương ứng. US chỉ liên quan backend (không cần UI): US-01.4, US-05.1–05.2, US-06.2–06.3/06.5, US-08.4, US-10.2, US-14.1, US-23.1 (snapshot), US-26.4. Các điểm "chưa mockup riêng" ở cột Ghi chú đều dựng được từ component sẵn có (mục 3), không cần token mới.
