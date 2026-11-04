# QLD-42 — Kiểm chứng macro và hồ sơ Tùy chỉnh

## Thay đổi

- Cảnh báo “Macro không khớp kcal” khi chênh lệch tuyệt đối lớn hơn 5% kcal mục tiêu; đúng 5% không cảnh báo.
- Nút áp dụng cân bằng chỉ đổi carb: `max(0, (kcal - 4P - 9F) / 4)`, làm tròn gram nguyên theo PRD §5.6 và định dạng dữ liệu hiện có. Không chặn lưu khi bỏ qua cảnh báo.
- Trước khi lưu thay đổi hồ sơ ảnh hưởng đến mục tiêu trong chế độ Tùy chỉnh, hỏi Giữ hoặc Tính lại. Đóng hộp xác nhận không lưu hồ sơ.
- Dùng lại `saveProfileAction` và `recalculateTargetsAction`; không đổi hợp đồng API hoặc schema DB. Lựa chọn Tính lại lưu hồ sơ trước, sau đó tính lại từ hồ sơ vừa lưu. Nếu bước tính lại trả lỗi, UI hiển thị lỗi và giữ hộp xác nhận để thử lại; hai bước dùng các transaction hiện có, không phải một transaction chung.

## AC → test

| Tiêu chí | Bằng chứng tự động |
| --- | --- |
| 4,9% không cảnh báo; 5,1%, 7%, 25% cảnh báo | `src/lib/nutrition/custom-targets.test.ts`: cả lệch trên và dưới mục tiêu, thêm mốc đúng 5% |
| 25% đề xuất carb đúng; carb không âm | Unit: kcal 2000/P100/F100/C50 → C175; trường hợp P/F vượt kcal → C0; thêm làm tròn gram |
| Ngưỡng cảnh báo được nối vào UI | `e2e/profile-targets.spec.ts`: 4,8% và 5% không cảnh báo, 5,2% và 7% cảnh báo |
| Lưu được khi bỏ qua cảnh báo | E2E lưu kcal 2000/P100/C50/F100, tải lại vẫn còn C50; integration `persists mismatched custom macros without blocking the save` |
| Áp dụng carb rồi lưu | E2E áp dụng C175, giữ P100/F100, cảnh báo biến mất, tải lại vẫn còn C175 |
| Giữ → không đổi mục tiêu | E2E thay chiều cao, chọn Giữ, tải lại so sánh toàn bộ nội dung mục tiêu; integration kiểm tra kcal/P/C/F/nước |
| Tính lại → dùng hồ sơ mới | E2E sửa chiều cao/ngày sinh/giới tính/vận động/mục tiêu, đối chiếu kcal và macro với công thức PRD độc lập; integration kiểm tra chế độ auto và lịch sử hôm trước không đổi |
| Hủy xác nhận không lưu | E2E đóng hộp xác nhận rồi tải lại: chiều cao vẫn giữ giá trị trước |

## Môi trường và kết quả local

- Worktree: `QLDA_PM-be2`; branch `fix/qld-42-macro-custom-confirm`; base `c954c85`.
- Node 22.21.0, pnpm 10.20.0; app production `http://localhost:3202`; PostgreSQL 16, DB riêng `nt_be2`, cổng 5452.
- `.env` riêng, bị gitignore. Đã generate Prisma, áp dụng migration hiện có và seed 289 món vào DB riêng.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build`: pass; 10 file test, 98 test, không skip. Lint có hai warning cấu hình đã có sẵn, không có error.
- `E2E_BASE_URL=http://localhost:3202 pnpm test:e2e`: 8/8 pass, gồm QLD-42 và smoke cũ, trên mobile/desktop × sáng/tối, chạy production build.
- Ảnh cảnh báo và xác nhận được Playwright tạo trong `test-results/` và đính kèm báo cáo HTML; bộ bằng chứng đính kèm task chứa cả 8 ảnh.
- Không có migration mới. Hoàn tác: revert commit sửa QLD-42.

## Còn chờ bàn giao

Chưa push hoặc mở PR, chưa có kết quả GitHub CI: đang chờ người phụ trách cấp kết nối GitHub qua thẻ đã gửi. Sau khi có kết nối: cập nhật base, rebase lên `feat/nutritrack-mvp`, kiểm tra lại nếu base thay đổi, push branch fix, mở PR nhắm vào `feat/nutritrack-mvp`, ghi SHA cuối và chờ CI xanh trước khi bàn giao Tech Lead.
