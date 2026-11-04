# Smoke MVP NutriTrack — QLD-4

Ngày: 05/11/2026. Chủ trì: QA Lead. Trạng thái: **sẵn sàng, chưa chạy** — chờ SHA bàn giao từ QLD-39.

Phạm vi theo [mvp-scope (QLD-48)](/QLD/issues/QLD-48#document-mvp-scope): **một lượt smoke duy nhất** trên SHA bàn giao. Không regression toàn bộ, không đo NFR, không gom evidence, không chạy lại cùng bộ test trên cùng code.

## Điều kiện vào

1. Tech Lead bàn giao tại QLD-39: SHA trên `feat/nutritrack-mvp`, link PR, danh sách đã làm/đã hoãn.
2. Ghi SHA vào bảng kết quả. Nếu SHA đổi sau khi smoke → chỉ chạy lại phần bị ảnh hưởng.
3. Môi trường: Node 22, pnpm 10, Postgres/Mailpit theo README, DB QA riêng, cổng khác 3100. Chromium 360×800 và 1440×900.

## Bộ bước smoke (10 bước)

| # | Bước | Kỳ vọng | Nguồn |
|---|---|---|---|
| S1 | Đăng ký tài khoản mới `@example.test` → onboarding | Vào được app, onboarding hoàn tất, không lỗi | US-01, US-03 |
| S2 | Nhập ngày sinh người <18 tuổi | Có cảnh báo, **không chọn được** mục tiêu giảm cân | US-05.8, QLD-40/46 |
| S3 | Tìm món Việt, thêm vào bữa sáng | Lưu đúng bữa/ngày, kcal + macro cập nhật ngay | US-06, US-07 |
| S4 | Sửa log (số lượng/đơn vị/bữa) | Tổng ngày đúng sau sửa, giữ sau reload | QLD-41/47 |
| S5 | Xóa một log | Bản ghi biến mất, tổng đúng, không tái xuất hiện sau reload | QLD-41/47 |
| S6 | Tạo món tự tạo → sửa → xóa | Đủ field, sửa/xóa được, không ảnh hưởng log cũ | US-09, QLD-41/47 |
| S7 | Thêm → sửa → xóa cân nặng | Số liệu và biểu đồ đúng, không mất bản ghi khác | US-16, QLD-41/47 |
| S8 | Dashboard ở 360px | Không tràn ngang, control chính ≥44px, số liệu khớp log | NFR-01, QLD-43 |
| S9 | Ngắt mạng rồi thêm món / thêm nước | Không crash, giữ input, có thông báo + Thử lại; online lại lưu đúng **một lần** | NFR-09, QLD-45 |
| S10 | Đăng xuất → đăng nhập lại | Toàn bộ dữ liệu S3–S7 còn nguyên | US-01, US-08 |

Bước phụ chỉ chạy khi bước chính bị chặn để khoanh vùng lỗi.

## Tiêu chí Go (MVP)

**Go** khi không có: crash, mất dữ liệu, sai quy tắc an toàn (<18 vẫn được giảm cân), kẹt luồng chính (S1/S3/S9).
Mọi lỗi khác → ghi danh sách hoãn sau MVP, **không chặn**.

**No-Go** nếu vi phạm một trong bốn điều kiện trên.

## Bằng chứng tối thiểu

- Bảng 10 dòng: bước, Pass/Fail, quan sát 1 câu, SHA, viewport.
- Chỉ 1 ảnh cho mỗi lỗi chặn; không ảnh cho bước Pass.
- Kết quả ghi vào document `report` của QLD-4 và file này.

## Hoãn sau MVP (không test lần này)

Onboarding 5 bước và US-03.3/US-05.7/US-01.2; xóa cả bữa + hoàn tác; chuyển log sang ngày khác; US-09.2; NFR-05 ≤100 ms; axe 0 vi phạm toàn bộ màn; HTTPS/backup/TTI; Safari/Firefox/Edge; screen reader; usability 5 người; seed 289 vs 300+700.
