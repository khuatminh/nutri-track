# NutriTrack — Design Spec v1.0

Mockup (HTML tĩnh, mở bằng trình duyệt): `docs/design/mockups/index.html` · Token: `docs/design/tokens.css` · Ảnh chụp: `docs/design/screenshots/*.png` · Kiểm tra tương phản: `docs/design/tools/contrast.mjs` (kết quả: `tools/contrast-report.md`, 64/64 cặp đạt).
> Lưu ý: mockup được dựng bám danh sách tính năng MVP của task; PRD (QLD-10, nhánh `ba/qld-10-nutritrack-prd`, `docs/product/PRD.md`) xuất hiện khi gần xong nên **mới đối chiếu mức nhóm tính năng (9 nhóm), chưa đối chiếu từng user story/AC** (xem mục 7).

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
Tổng 64/64 cặp đạt (32 cặp × 2 theme). Hai giá trị đã chỉnh sau lần đo đầu: `--border-strong` (2.87→đạt 3:1), `--macro-carb` (2.67 trên track→đạt).

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
├─ Công thức (sidebar desktop; mobile truy cập từ Thêm món → "Công thức của tôi"): tạo/sửa nguyên liệu → tính kcal/macro/khẩu phần
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
| Hồ sơ | `profile.html` | Thông tin, mục tiêu, nhắc nhở (switch), giao diện sáng/tối/hệ thống, xoá TK | Light/Dark, modal xác nhận xoá |

Ảnh chụp: `docs/design/screenshots/{dashboard,onboarding,add-food,diary,reports,profile,components}.png` (cũng đính kèm task QLD-11).

## 6. Handoff cho dev
- **Tailwind**: ánh xạ biến CSS: `colors: { bg:'var(--bg)', surface:'var(--surface)', primary:{DEFAULT:'var(--primary)',hover:'var(--primary-hover)',contrast:'var(--primary-contrast)'}, text:{DEFAULT:'var(--text)',muted:'var(--text-muted)'}, protein:'var(--macro-protein)', carb:'var(--macro-carb)', fat:'var(--macro-fat)' }, borderRadius:{sm:'8px',md:'12px',lg:'16px',xl:'24px'}, screens:{sm:'640px',md:'768px',lg:'1024px',xl:'1280px'}, fontFamily:{sans:['Be Vietnam Pro','Inter','system-ui','sans-serif']}`; bật `darkMode: ['selector','[data-theme="dark"]']`.
- Số liệu hiển thị: định dạng `vi-VN` (1.240 · 68,4). Đơn vị kg/cm/ml/kcal.
- Theme: lưu lựa chọn (sáng/tối/hệ thống); đặt `data-theme` trước khi render để tránh nháy.
- Focus: không bao giờ `outline:none` mà không có thay thế; thứ tự Tab theo thứ tự thị giác; modal/sheet focus-trap.
- Chart: không dựa vào màu đơn thuần; luôn có nhãn trục, chú giải, aria-label, bảng dữ liệu thay thế.
- Ảnh/emoji món: placeholder, dev thay bằng ảnh hoặc icon; mọi ảnh có alt hoặc `aria-hidden`.
- Responsive: layout dùng `<1024` mobile; kiểm tra 360px, 390px, 768px, 1024px, 1280px.

## 7. Hạn chế / việc tiếp theo
- Chưa đối chiếu từng user story/AC trong PRD (chỉ ở mức 9 nhóm tính năng); cần một vòng review với BA; màn Công thức (tạo/sửa công thức) mới có trong IA, **chưa có mockup chi tiết** — đề xuất task bổ sung.
- Font Be Vietnam Pro tải từ Google Fonts trong mockup; production nên self-host.
- Chưa chạy kiểm tra trình đọc màn hình thực tế; chỉ audit theo tiêu chí + đo tương phản bằng script.
