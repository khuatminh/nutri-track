# QLD-43 — Bằng chứng responsive và vùng chạm

Ảnh trước: mã nguồn `c954c85`. Ảnh sau: nhánh `fix/qld-43-dashboard-targets`.
Tên món dài: “Cơm gạo lứt với ức gà áp chảo, rau củ luộc và sốt sữa chua không đường”.
Cùng fixture: nữ 62 kg, giữ cân, bữa trưa 5.000 kcal, P 500 g / C 500 g / F 200 g; cả ba badge “Vượt” hiện.
Ở mã gốc, fixture này làm dashboard có scrollWidth 574px tại viewport 360px và 393px.
Viewport 360×800, Chromium, locale vi-VN, múi giờ Asia/Ho_Chi_Minh.

| Chế độ | Trước | Sau |
|---|---|---|
| Sáng | [Ảnh trước](before-360-light.png) | [Ảnh sau](after-360-light.png) |
| Tối | [Ảnh trước](before-360-dark.png) | [Ảnh sau](after-360-dark.png) |

`e2e/responsive.spec.ts` chạy trên 10 project: 360×800, 393×851, 768×1024,
1440×900, 720×450 × sáng/tối. 720×450 là viewport CSS hiệu dụng của màn
1440×900 khi zoom trình duyệt 200%; test kiểm tra reflow tại viewport này.

Mỗi project kiểm tra 7 màn (`/hom-nay`, `/nhat-ky`, `/nhat-ky/them`, `/can-nang`,
`/bao-cao`, `/cong-thuc`, `/ho-so`) khi rỗng và sau khi thêm dữ liệu.
Đo scrollWidth của trang và bounding rectangle của mọi button, link, input,
select, switch, summary được render (gồm control phía dưới màn hình).
Kiểm tra thêm thao tác bật switch uống nước và các control xuất hiện sau đó.
Ảnh dashboard vượt mục tiêu được đính kèm vào báo cáo Playwright của từng project.

Chạy lại bằng `E2E_BASE_URL=http://localhost:3203 pnpm test:e2e` sau khi export
DATABASE_URL của môi trường test và chạy production build tại cổng 3203.
Dữ liệu test được tạo riêng cho từng project và xóa trong `finally`.
