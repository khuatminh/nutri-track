# Báo cáo kiểm thử thủ công NutriTrack — QLD-21

Ngày chạy: 04/11/2026 (Asia/Ho_Chi_Minh). Người thực hiện: Tester (Manual/Exploratory). Trạng thái: **hoàn tất đánh giá, verdict Fail — chưa đủ bằng chứng để Go**.

## 1. Tóm tắt điều hành

- Tổng AC đã đánh giá: **106** (105 AC nguồn + 1 ca bổ sung US-25.4 cho quiet hours). Pass **83**, Fail **20** (P0: 15, P1: 5), Not run **3**; Blocked ở cấp AC: 0 (các Blocked nằm ở NFR).

- 20 AC Fail, trong đó 15 AC P0: US-01.2, US-03.1, US-03.3, US-03.5, US-05.6, US-05.7, US-05.8, US-06.1, US-06.4, US-07.1, US-08.1, US-08.3, US-09.2, US-09.3, US-16.4. Các lỗi P0 nặng nhất: onboarding sai 4 bước (US-03.1), người <18 vẫn được đề xuất giảm cân (US-05.8), thiếu sửa/xóa món tự tạo và xóa cả bữa (US-09.3/US-08.3), không sửa được bữa/ngày của log (US-08.1), dashboard tràn ngang mobile và target <44px (NFR-01), optimistic 220ms (NFR-05), offline khi lưu làm treo app (NFR-09).

- Seed thực tế **289 món / 343 servings**, không đạt mục tiêu PRD 300 món Việt + 700 nguyên liệu; vẫn đạt yêu cầu tối thiểu QLD-3 ≥200. Không đổi PRD thành 200 và không tự waiver.

- 6 bug đã tạo trong QA: **QLD-23** (responsive/touch target), **QLD-24** (thiếu CRUD sửa/xóa), **QLD-25** (onboarding & <18), **QLD-26** (ngưỡng macro & xác nhận hồ sơ), **QLD-27** (UX tìm món/chi tiết/a11y/notification), **QLD-28** (offline khi lưu làm treo app, mất input, không có Retry).

- Khuyến nghị: **No-Go** cho đến khi các bug P0/High được sửa và QA re-test trên SHA mới. Các mục Blocked (Safari/Firefox/Edge, screen reader, usability, HTTPS/HSTS, clock 23:59, CSRF production) không phải Pass.

## 2. Môi trường và bản kiểm thử

| Mục | Giá trị |
|---|---|
| SHA kiểm thử | `5293671` (feat/nutritrack-mvp, PR #1) + `4184c78` docs QA cherry-pick; worktree `/Users/justminh/Documents/ChatGPT/QLDA_PM-qa`, branch `qa/nutritrack-plan` |
| App | Next.js 15.5.28 production build, `http://localhost:3301` (không dùng 3100) |
| DB QA | PostgreSQL 16, container `nutritrack_qa_manual-db-1`, cổng `5441`, volume riêng; migrate + seed 289 món |
| Mailpit | `http://localhost:8031` (SMTP 1031), dùng cho reset mật khẩu |
| Runtime | Node v22.21.0, pnpm 10.20.0; timezone `Asia/Ho_Chi_Minh`; ngày cố định 04/11/2026 |
| Browser | Chromium **156.0.8078.4** (Playwright 1.64.1, headless); viewport 360×800, 393×851, 768×1024, 1440×900; light/dark/system; zoom 200% mô phỏng layout 720×450 |
| Dữ liệu | 2 tài khoản fixture A/B + tài khoản đăng ký thật; toàn bộ dữ liệu giả (`@example.test`), không dùng dữ liệu cá nhân |
| Bằng chứng | `docs/qa/evidence/` (ảnh PNG, JSON run, axe) |

**Phương pháp:** Playwright điều khiển Chromium thật trên app đang chạy; tính toán đối chiếu bằng oracle độc lập viết tay (không import hàm app); DB kiểm trực tiếp bằng psql; Mailpit đọc thư reset; axe-core 4.14 inject vào từng trang. Các ca screen reader, thiết bị thật, usability và clock được ghi Blocked thay vì suy đoán.

**Lưu ý lịch sử:** worktree này có thêm bằng chứng từ lượt khảo sát trước trên cùng SHA (functional.json/functional2.json/a11y.json). Báo cáo dùng kết quả lượt này; các dòng US-04.2, US-04.3, US-21, US-01.4 có tham chiếu lượt trước và được ghi rõ nguồn.

**Bổ sung lượt 23:2x–23:4x (cùng SHA):** kiểm lại a11y/axe (9 node label mismatch), responsive (scrollWidth 840), dark mode, bàn phím/zoom; đo 10.000 món synthetic (p95 104,4 ms); offline/retry (Fail — app crash); đổi mật khẩu với 2 phiên thật; reset link dùng một lần; nhắc nhở in-app/snooze; notification giải thích trước khi xin quyền. Bằng chứng mới: `runs/a11y.json`, `runs/reminders.json`, `runs/reminders2.json`, `runs/security.json`, `runs/perf.json`, `runs/reset.json`, `runs/final2.json`, `runs/future.json`.

## 3. Kết quả từng AC nguồn

Quy ước: **Pass** = đã chạy và đạt AC; **Fail** = chạy được và sai/thiếu so AC; **Blocked** = không có môi trường/người/thiết bị; **Not run** = chưa thực thi hoặc ngoài phạm vi. Mỗi dòng có evidence tương đối trong `docs/qa/evidence/`.

| AC | Ưu tiên | Kết quả | Ghi chú thực tế | Bằng chứng |
|---|---|---|---|---|
| US-01.1 | P0 | **Pass** | Đăng ký email mới → tạo tài khoản, phiên đăng nhập, chuyển /onboarding. | `auth/01-register-empty-light.png; runs/functional.json` |
| US-01.2 | P0 | **Fail** | Chặn tạo trùng đúng, nhưng câu lỗi là "Email này đã được đăng ký" thay vì "Email đã được sử dụng" như AC. | `auth/02-register-duplicate-email-light.png; auth/16-register-duplicate-light.png` |
| US-01.3 | P0 | **Pass** | Bỏ trống / email sai / mật khẩu 7 ký tự / thiếu số đều báo lỗi tiếng Việt tại trường, không tạo tài khoản. | `auth/03-register-invalid-light.png; auth/11-register-required-light.png` |
| US-01.4 | P0 | **Pass** | DB lưu `$argon2id$` (97 ký tự); app.log không chứa mật khẩu test. | `runs/functional.json; runs/security.json` |
| US-02.1 | P0 | **Pass** | Đăng nhập đúng vào /hom-nay, reload giữ phiên. | `auth/05-dashboard-after-onboarding-light.png` |
| US-02.2 | P0 | **Pass** | Sai mật khẩu và email không tồn tại đều trả cùng câu "Email hoặc mật khẩu không đúng". | `auth/06-login-wrong-light.png` |
| US-02.3 | P0 | **Pass** | Sai 5 lần/15 phút → lần 6 hiện "Tài khoản tạm khoá do đăng nhập sai nhiều lần. Thử lại sau 9 phút" (đếm ngược thực tế). | `auth/07-login-lockout-light.png; auth/19-lockout-light.png; runs/final.json` |
| US-02.4 | P0 | **Pass** | Đăng xuất hủy phiên; /hom-nay chuyển về /dang-nhap. | `auth/10-after-logout-guard-light.png` |
| US-02.5 | P0 | **Pass** | Luôn báo thành công như nhau; Mailpit nhận link; TTL 60 phút; token dùng lại bị chặn; reset thu hồi phiên. | `auth/08-forgot-sent-light.png; auth/20-forgot-success-light.png; auth/21-reset-reuse-light.png; runs/reset.json` |
| US-03.1 | P0 | **Fail** | Onboarding chỉ 4 bước và đảo thứ tự (Mục tiêu → Thông tin cơ thể gộp → Kết quả → Nhắc nhở) thay vì 5 bước như AC; quay lại giữ dữ liệu. | `auth/13-onboarding-step1-light.png; runs/functional.json` |
| US-03.2 | P0 | **Pass** | Cao 99,9/250,1 và nặng 19,9/300,1 bị chặn; biên 100/250 cm, 20/300 kg qua; tuổi 12/101 và ngày sinh tương lai bị server từ chối. | `calc/04-boundary-error-light.png; calc/05-age-block-light.png` |
| US-03.3 | P0 | **Fail** | Chỉ có các mức hợp lệ 0,25/0,5/0,75 kg/tuần nhưng không hiển thị mô tả "Giảm ~0,5 kg/tuần" (chỉ hint chung). | `calc/01-male-30-175-70-light.png` |
| US-03.4 | P0 | **Pass** | Đăng nhập lại vào thẳng /hom-nay; Hồ sơ sửa được mọi trường. | `dash/16-profile-custom-save-light.png` |
| US-03.5 | P0 | **Fail** | Sửa hồ sơ khi đang Tùy chỉnh chỉ báo "giữ nguyên", không hỏi giữ/đổi; trường hợp Tự động có tính lại (1790→1750 ở lượt trước). | `dash/16-profile-custom-save-light.png` |
| US-03.6 | P0 | **Pass** | Chỉ hệ mét (cm/kg), không có imperial. | `dash/16-profile-custom-save-light.png` |
| US-04.1 | P1 | **Pass** | Đổi mật khẩu đúng mk cũ; phiên thứ hai (token riêng) bị 307 về đăng nhập, phiên hiện tại 200; mk cũ bị từ chối, mk mới đăng nhập được. | `profile/04-password-other-session-light.png; runs/final2.json` |
| US-04.2 | P1 | **Pass** | GET /api/export trả 200 application/json gồm hồ sơ, mục tiêu, log. | `runs/functional2.json` |
| US-04.3 | P1 | **Pass** | Xóa tài khoản sau khi nhập lại mật khẩu: user không còn trong DB, phiên kết thúc. | `profile/03-account-deleted-light.png; runs/functional2.json` |
| US-05.1 | P0 | **Pass** | Nam 30/175/70 → BMR 1.649; nữ 28/162/62 → 1.332 (half-up). | `calc/01-male-30-175-70-light.png; calc/02-female-28-162-62-light.png` |
| US-05.2 | P0 | **Pass** | TDEE 2.556 (nam, PAL 1,55) và 2.064 (nữ), khớp oracle độc lập. | `calc/01-male-30-175-70-light.png` |
| US-05.3 | P0 | **Pass** | Nam: 2.010 kcal, P126/C241/F60. Nữ: yêu cầu 0,5 kg/tuần bị hạ còn 0,25 do trần 25% TDEE → 1.790 kcal, P112/C215/F54 (đúng hợp đồng). | `calc/01-male-30-175-70-light.png; calc/02-female-28-162-62-light.png` |
| US-05.4 | P0 | **Pass** | Lưu tay 2.000/120/200/60/2150, gắn nhãn "Tùy chỉnh"; nút khôi phục tên "Tính lại tự động" (khác chữ AC) đưa về 1.830. | `dash/11-custom-target-light.png; dash/15-auto-restored-light.png` |
| US-05.5 | P0 | **Pass** | 799 kcal bị chặn ("Tối thiểu 800 kcal"); 1.199 kcal (dưới sàn nữ 1.200) cảnh báo + xác nhận lần hai rồi lưu được. | `dash/12-kcal-799-blocked-light.png; dash/13-below-floor-confirm-light.png` |
| US-05.6 | P0 | **Fail** | Lệch 7% không cảnh báo (ngưỡng UI 10%); lệch 25% chỉ có badge "lệch >10%", không có "Macro không khớp kcal" và không đề xuất cân bằng carb. | `dash/14-macro-mismatch-light.png` |
| US-05.7 | P0 | **Fail** | Có BMR, TDEE, mục tiêu, disclaimer; KHÔNG hiển thị riêng mức điều chỉnh (−550 kcal) như AC. | `calc/01-male-30-175-70-light.png` |
| US-05.8 | P0 | **Fail** | Tuổi 17 vẫn được đề xuất mục tiêu giảm cân 1.670 kcal kèm badge cảnh báo; AC yêu cầu không đề xuất giảm cân cho <18. | `calc/03-under18-light.png` |
| US-06.1 | P0 | **Fail** | Mở màn thêm món: ô tìm không focus (activeElement rỗng); tab "Món của tôi" đặt tên "Tự thêm". | `food/01-add-food-open-light.png` |
| US-06.2 | P0 | **Pass** | "pho bo" và "PHỞ" đều ra phở bò; danh sách hiện kcal/100 g + khẩu phần. | `food/02-search-no-diacritics-light.png` |
| US-06.3 | P0 | **Pass** | 289 món: p95 13,7 ms; 10.000 món synthetic: p95 44,6 ms cho "pho", 104,4 ms cho 30 truy vấn; prefix "Phở bò…" xếp trước. | `food/03-search-results-light.png; runs/foods.json; runs/perf.json` |
| US-06.4 | P0 | **Fail** | Có trạng thái rỗng "Không tìm thấy …" nhưng CTA Tạo món mới không điền sẵn tên đã gõ. | `food/04-search-empty-light.png` |
| US-06.5 | P0 | **Pass** | Đủ 20/20 món Việt theo danh sách (phở bò/gà, cơm tấm, bún chả, bún bò Huế, bánh mì thịt, …). | `runs/foods.json` |
| US-07.1 | P0 | **Fail** | Sheet chi tiết chỉ có kcal/P/C/F; thiếu chất xơ, đường, natri cho khẩu phần đang chọn (dù DB có dữ liệu). | `food/05-food-detail-light.png` |
| US-07.2 | P0 | **Pass** | 150 g Phở bò tái → 108 kcal / P8,3 / C12,8 / F2,7, khớp oracle 108,3; hỗ trợ dấu phẩy, 0,5/1,5, đổi đơn vị gam/tô. | `food/05-food-detail-light.png` |
| US-07.3 | P0 | **Pass** | Số lượng 0 → "Nhập số lượng lớn hơn 0"; 5000,1 → "Số lượng quá lớn"; không lưu. | `food/06-quantity-invalid-light.png` |
| US-07.4 | P0 | **Pass** | Thêm vào đúng bữa/ngày; tổng cập nhật ngay; toast có "Hoàn tác". | `food/07-toast-undo-light.png` |
| US-07.5 | P0 | **Pass** | Thêm 2 món vẫn ở màn thêm, nút "Xong (2)"; bấm Xong về nhật ký. | `food/08-add-multiple-light.png` |
| US-08.1 | P0 | **Fail** | Sửa số lượng 150→300 g tính lại đúng, nhưng UI không cho sửa đơn vị/bữa/ngày và không di chuyển log sang ngày khác. | `food/09-edit-quantity-light.png` |
| US-08.2 | P0 | **Pass** | Xóa 1 dòng: số dòng 2→1, toast Hoàn tác, hoàn tác khôi phục 2. | `food/18-delete-single-light.png` |
| US-08.3 | P0 | **Fail** | Không có nút/chức năng "Xóa cả bữa" cùng xác nhận. | `food/10-delete-undo-light.png` |
| US-08.4 | P0 | **Pass** | Sửa kcal món gốc trong DB (180→999) rồi reload: FoodLog cũ vẫn 270 kcal (snapshot); lượt bổ sung sửa +100 kcal và log vẫn giữ kcal cũ. | `food/19-snapshot-after-source-edit-light.png; food/20-snapshot-after-source-edit-light.png; runs/final2.json` |
| US-09.1 | P0 | **Pass** | Tạo món đủ field (kcal/P/C/F bắt buộc, xơ/đường/natri tùy chọn), lưu vào Món của tôi và ghi log ngay. | `food/11-my-foods-tab-light.png` |
| US-09.2 | P0 | **Fail** | Món 500 kcal/P0/C0/F0 (lệch 100%) được lưu nhưng badge cảnh báo không bao giờ hiển thị vì sheet đóng ngay. | `food/12-kcal-mismatch-light.png` |
| US-09.3 | P0 | **Fail** | Không có UI Sửa/Xóa món tự tạo (0 nút Sửa, 0 nút Xóa); snapshot log cũ vẫn đúng. | `food/11-my-foods-tab-light.png` |
| US-09.4 | P0 | **Pass** | Tài khoản B tìm món riêng của A → 0 kết quả. | `runs/security.json` |
| US-10.1 | P0 | **Pass** | Tab Gần đây 4 dòng (≤20, không trùng), có "lần trước" kèm khẩu phần; chọn để thêm nhanh. | `food/13-recent-tab-light.png` |
| US-10.2 | P0 | **Pass** | Món ghi ≥3 lần xuất hiện ở Hay dùng (Phở gà); chưa chứng minh được ưu tiên theo bữa với dữ liệu 1 bữa. | `food/14-frequent-tab-light.png` |
| US-11.1 | P0 | **Pass** | Sao chép hôm qua vào bữa trưa hôm nay: thêm 1 dòng, dinh dưỡng theo dữ liệu hiện tại. | `food/17-copy-into-existing-light.png` |
| US-11.2 | P0 | **Pass** | Nguồn trống: nút disabled, nhãn "Hôm qua chưa có bữa này". | `food/15-copy-disabled-light.png` |
| US-11.3 | P0 | **Pass** | Bữa đích đang có món: copy thêm (0→1), không ghi đè; Hoàn tác đưa về 0. | `food/17-copy-into-existing-light.png` |
| US-11.4 | P1 | **Fail** | Không có UI "Sao chép cả ngày". | `food/16-copy-yesterday-light.png` |
| US-12 | P1 | **Pass** | Ghi nhanh 350 kcal tạo FoodLog "Trà sữa QA" không gắn Food. | `food/07-toast-undo-light.png` |
| US-13.1 | P0 | **Pass** | Mục tiêu 2.000, đã ăn 1.200 → "Còn lại 800 kcal"; không trừ vận động. | `dash/17-dashboard-1200-light.png` |
| US-13.2 | P0 | **Pass** | Ăn 2.150 → badge "ⓘ Vượt 150 kcal" (màu + icon + chữ, tông nhẹ). | `dash/18-dashboard-over-light.png` |
| US-13.3 | P0 | **Pass** | 3 thanh P/C/F "đã ăn / mục tiêu (g) · %"; vượt vẫn hiện số đúng. | `dash/17-dashboard-1200-light.png` |
| US-13.4 | P0 | **Pass** | Thẻ nước "x / y ml" + nút +150/+250/+330/+500 + Khác. | `dash/17-dashboard-1200-light.png` |
| US-13.5 | P0 | **Pass** | 4 bữa có kcal + danh sách rút gọn; bữa trống có "+ Thêm"; bấm mở nhật ký bữa. | `dash/17-dashboard-1200-light.png` |
| US-13.6 | P0 | **Pass** | Điều hướng trước/sau/chọn ngày; định dạng "Thứ Tư, 04/11/2026"; nút Hôm nay. | `dash/19-dashboard-future-light.png` |
| US-13.7 | P0 | **Pass** | Ngày rỗng: CTA "Thêm bữa đầu tiên", vòng kcal = mục tiêu lịch sử đầy đủ (1.510), không giả thành ngày đã ghi. | `dash/20-dashboard-empty-day-light.png` |
| US-13.8 | P0 | **Pass** | Ngày tương lai xem được, có badge "Ngày ở tương lai — bạn chỉ có thể xem"; ghi +1 ngày không hỏi, +2 ngày hiện confirm "Ngày này ở tương lai xa…". | `dash/19-dashboard-future-light.png; food/future-1d-light.png; food/future-2d-light.png; runs/future.json` |
| US-13.9 | P1 | **Fail** | Có streak khi ≥2 ngày ("🔥 2 ngày liên tiếp") nhưng dashboard không hiển thị tổng chất xơ/đường/natri trong ngày. | `nfr/01-mobile-360-dashboard-light.png; runs/dash.json` |
| US-14.1 | P0 | **Pass** | 62 kg → 2.170 → 2.150 ml; clamp 20 kg→1.500, 300 kg→4.000 (oracle hàm thuần). | `calc/02-female-28-162-62-light.png; runs/calc-oracle.json` |
| US-14.2 | P0 | **Pass** | Chỉnh tay 6.000 ml áp dụng ngay; 400 ml bị chặn "Nước từ 500 đến 6000 ml". | `water/26-water-custom-limit-light.png` |
| US-15.1 | P0 | **Pass** | +250/+150/+330/+500 cộng đúng 1.230 ml, tiến độ cập nhật ngay. | `water/21-quick-add-light.png` |
| US-15.2 | P0 | **Pass** | Khác: 0 và 2001 báo lỗi 1–2.000; 1 và 2000 thêm đúng. | `water/22-water-invalid-light.png` |
| US-15.3 | P0 | **Pass** | Lịch sử có Sửa/Xóa từng lần; sửa qua window.prompt; xóa có Hoàn tác (UX chưa đẹp). | `water/24-water-history-light.png; water/25-water-delete-undo-light.png` |
| US-15.4 | P0 | **Pass** | Tổng 3.231/2.150 → badge "Đạt mục tiêu" và vẫn thêm được. | `water/23-water-over-target-light.png` |
| US-15.5 | P1 | **Fail** | Không có UI cấu hình chai/cốc yêu thích; nút nhanh cố định. | `water/26-water-custom-limit-light.png; runs/dash.json` |
| US-16.1 | P0 | **Pass** | 62,4 (dấu phẩy) lưu được; nhập lại cùng ngày hỏi xác nhận, đồng ý thì cập nhật. | `weight/02-saved-comma-light.png; weight/03-duplicate-confirm-light.png` |
| US-16.2 | P0 | **Pass** | 19,9 và 300,1 báo "Cân nặng từ 20 đến 300 kg". | `weight/04-bounds-light.png` |
| US-16.3 | P0 | **Pass** | Ngày tương lai bị từ chối (server) + input max=hôm nay. | `weight/05-future-date-light.png` |
| US-16.4 | P0 | **Fail** | Không có danh sách/nút sửa/xóa bản ghi cân nặng trên /can-nang. | `weight/01-empty-light.png` |
| US-17.1 | P0 | **Pass** | ≥2 bản ghi → biểu đồ + lọc 30/90/Tất cả + xu hướng 7 ngày; đường mục tiêu chỉ hiện nếu có target weight. | `weight/09-chart-light.png` |
| US-17.2 | P0 | **Pass** | Hover hiện "04/11/2026 · 64,5 kg"; có bảng dữ liệu (details) 2 dòng. | `weight/10-chart-tooltip-table-light.png` |
| US-17.3 | P0 | **Pass** | <2 bản ghi hiện trạng thái rỗng hướng dẫn. | `weight/01-empty-light.png` |
| US-17.4 | P0 | **Pass** | Có thay đổi so với lần đầu / 7 ngày / 30 ngày. | `weight/09-chart-light.png` |
| US-18.1 | P0 | **Pass** | Lệch ≥1 kg → gợi ý "Cân nặng mới 63,4 kg…"; hộp thoại so sánh 1.510 → 1.810 (tốc độ bị hạ do trần 25%). | `weight/06-retarget-prompt-light.png; weight/07-retarget-compare-light.png` |
| US-18.2 | P0 | **Pass** | Đồng ý → tính lại 1.830 kcal (64,5 kg); ngày 03/11 vẫn giữ 1.510 (target history). | `weight/08-retarget-accepted-light.png` |
| US-18.3 | P0 | **Pass** | Từ chối → reload không còn gợi ý; chỉ nhắc lại khi lệch thêm ≥1 kg (đã thử 64,5). | `runs/dash.json` |
| US-19.1 | P0 | **Pass** | Tuần 02/11–08/11 (T2–CN), biểu đồ cột + đường mục tiêu (15 svg); có nav tuần trước/sau. | `report/30-week-1200-1800-light.png; report/32-week-recheck-light.png` |
| US-19.2 | P0 | **Pass** | Có kcal TB, macro g/%, xơ/đường/natri so tham chiếu, số ngày đạt ±10%, nước TB, thay đổi cân nặng. | `report/30-week-1200-1800-light.png` |
| US-19.3 | P0 | **Pass** | 1200 + 1800 → "Trung bình trên 2/7 ngày có dữ liệu (ngày trống không tính)", TB 1.500. | `report/30-week-1200-1800-light.png; report/32-week-recheck-light.png` |
| US-19.4 | P0 | **Pass** | Khoảng không dữ liệu → trạng thái rỗng. | `report/29-empty-month-light.png` |
| US-20.1 | P0 | **Pass** | Tháng 11: biểu đồ kcal theo ngày, chỉ số như tuần, biểu đồ cân nặng tháng. | `report/31-month-light.png` |
| US-20.2 | P0 | **Pass** | Tháng 11: 01–30/11; lùi tháng → 01–31/10 (đúng timezone Asia/Ho_Chi_Minh). | `report/31-month-light.png` |
| US-20.3 | P1 | **Not run** | Chưa có UI xuất ảnh/PDF/CSV báo cáo; PRD cho phép dời sau MVP (Q8) — không tự waiver. | `runs/reports.json` |
| US-21 | P1 | **Fail** | Không có khối insight tối đa 3 nhận xét trên báo cáo. | `runs/functional2.json` |
| US-22.1 | P0 | **Pass** | Tạo công thức tên + 2 phần + 2 nguyên liệu, lưu và hiện trong danh sách. | `recipe/03-list-light.png` |
| US-22.2 | P0 | **Pass** | Realtime cả nồi 144,4 kcal / mỗi phần 72,2 kcal; xơ 0,15 g, đường 0,5 g, natri 260 mg mỗi phần. | `recipe/02-realtime-nutrition-light.png` |
| US-22.3 | P0 | **Pass** | Công thức hiện ở tab Công thức của tôi, nhãn "Công thức · mỗi phần", đơn vị phần. | `recipe/04-log-1.5-portion-light.png` |
| US-22.4 | P0 | **Pass** | Ghi 1,5 phần → 108 kcal, khớp 1,5×72,2. | `recipe/04-log-1.5-portion-light.png` |
| US-22.5 | P0 | **Pass** | Thiếu tên/nguyên liệu, số phần 0 đều báo lỗi, không lưu. | `recipe/01-validation-light.png` |
| US-23.1 | P0 | **Pass** | Đổi 2→4 phần: dinh dưỡng/phần tính lại; log cũ vẫn 108 kcal. | `runs/recipes.json` |
| US-23.2 | P0 | **Pass** | Xóa công thức: log cũ vẫn hiển thị; tìm kiếm không còn món/công thức. | `recipe/06-deleted-log-kept-light.png` |
| US-23.3 | P1 | **Pass** | Nhân bản tạo tên "… (bản sao)". | `recipe/05-duplicate-light.png` |
| US-23.4 | P0 | **Pass** | Picker nguyên liệu lọc kind=food; không thể chọn công thức lồng nhau. | `runs/recipes.json` |
| US-24.1 | P0 | **Pass** | Có nhắc nước (khung giờ + 1/2/3 giờ) và nhắc bữa sáng/trưa/tối, switch độc lập; mặc định 07:30/12:00/19:00 khi bật. | `remind/01-config-light.png; reminder/10-defaults-enabled-light.png; runs/reminders2.json` |
| US-24.2 | P0 | **Pass** | Lưu 09:00–21:00 mỗi 3 giờ + cả 7 ngày; DB đúng, reload giữ nguyên; timezone Asia/Ho_Chi_Minh. | `reminder/11-saved-persist-light.png; runs/reminders2.json` |
| US-24.3 | P0 | **Pass** | End≤start báo "Giờ kết thúc phải sau giờ bắt đầu"; bỏ hết ngày báo "Chọn ít nhất một ngày trong tuần". UI chỉ hiện một lỗi khi cả hai sai. | `remind/04b-validation-manual-light.png; remind/05-no-days-light.png; runs/reminders.json` |
| US-25.1 | P0 | **Pass** | Đến giờ hiện toast "Đến giờ uống nước rồi 💧" + "+250 ml" + "Hoãn 30 phút"; bấm hoãn ghi snoozeUntil và reload không hiện lại. Chưa chạy hết giới hạn 3 lần hoãn (cần chờ 30 phút/lần). | `reminder/04-inapp-reminder-light.png; runs/reminders.json` |
| US-25.2 | P0 | **Pass** | Vừa ghi nước trong 30 phút → không nhắc loại đó (đã thử cả bữa trưa và nước). | `remind/02-due-banner-light.png; reminder/05-suppressed-after-log-light.png` |
| US-25.3 | P0 | **Pass** | Tắt nhắc → reload không còn banner loại đó. | `remind/03-disabled-light.png; runs/reminders.json` |
| US-25.4 | P0 | **Not run** | Chưa có đồng hồ kiểm soát để chứng minh hành vi qua 23:59→00:00 và khung 22–06; logic coi mọi slot là do người dùng đặt. | `runs/remind.json` |
| US-26.1 | P1 | **Pass** | Không xin quyền khi tải trang; bấm nút → sheet giải thích → "Tiếp tục" mới requestPermission (đo 0→1 lần; mô phỏng `Notification.permission=default` trong Chromium headless vì headless mặc định denied). | `notif/01-default-permission-light.png; reminder/12-notification-explain-light.png; runs/reminders2.json` |
| US-26.2 | P1 | **Fail** | Notification hiện đúng khi tab nền (bắt được body "Đến giờ uống nước rồi 💧") nhưng không có handler click mở màn hình hành động. | `notif/05-web-notification-hidden-light.png; reminder/09-notification-created-light.png; runs/reminders.json` |
| US-26.3 | P1 | **Pass** | Denied: hướng dẫn mở lại quyền, nhắc in-app vẫn chạy; unsupported: ẩn mục thông báo. | `notif/03-denied-guidance-light.png; reminder/07-notification-denied-light.png; reminder/08-notification-unsupported-light.png` |
| US-26.4 | P1 | **Not run** | Ghi chú kỹ thuật: chỉ dùng Notification API, không có Push API/service worker; MVP chấp nhận nhắc khi tab/PWA nền. Không phải hành vi Pass/Fail. | `runs/notif.json` |

## 4. NFR và các ca đặc biệt

| NFR | Kết quả | Nội dung | Số đo / ghi chú | Bằng chứng |
|---|---|---|---|---|
| NFR-01 | **Fail** | Responsive 360/393/768/1440 + vùng chạm ≥44×44 px | `/hom-nay` tràn ngang: scrollWidth **840 px** ở 360/393/768 (tràn 480/447/72); trường hợp nhẹ hơn 456 px; zoom 200% (layout 720×450) vẫn 840 > 720. Hàng `MacroBar` `flex justify-between` thiếu `min-w-0`/wrap + badge "Vượt" đẩy min-content ~790 px. 45 control <44 px (Đi 31×44, +150 60×36, link Thêm 89×36, switch 48×28). 6 màn còn lại không tràn. | `nfr/01-mobile-360-dashboard-light.png; responsive/hom-nay-360-overflow.png; responsive/hom-nay-360x800.png; responsive/hom-nay-768x1024.png; runs/a11y.json; runs/nfr.json` |
| NFR-02 | **Pass** | Dark mode Sáng/Tối/Theo hệ thống, lưu lựa chọn, không nhấp nháy sai theme, biểu đồ đọc được | `data-theme=dark` giữ sau reload; system theo `prefers-color-scheme`; dark mobile 360 không tràn; nền/chữ đổi đúng token. Inline script chống FOUC có trong `<head>`; chưa quay video kiểm nhấp nháy từng frame. Biểu đồ dark đọc được (ảnh). | `a11y/hom-nay-dark-desktop.png; a11y/nhat-ky-dark-360x800.png; nfr/04-mobile-360-dashboard-dark.png; nfr/05-system-dark-390.png` |
| NFR-03 | **Fail** | WCAG 2.1 AA: axe, keyboard/focus, zoom 200%, reduced motion, progressbar/chart, screen reader | axe: **9 nút** vi phạm `label-content-name-mismatch` (serious) trên `/nhat-ky` (nút "Sửa <món>" thay accessible name không chứa text hiển thị); 9 màn còn lại 0 vi phạm. Keyboard: 10–12 Tab, focus outline xanh rõ trên hầu hết; 1 input ngày có `outline: none`; không có skip-link. Progressbar có role/aria-valuenow; biểu đồ có bảng; reduced-motion transition 0s. Zoom 200% làm `/hom-nay` tràn. Screen reader thật (NVDA/VoiceOver): **Blocked** — chưa có người/thiết bị. | `a11y/axe-nhat-ky-light.png; a11y/focus-tab-desktop.png; runs/a11y.json; runs/axe.json; runs/nfr.json` |
| NFR-04 | **Pass** | Ngôn ngữ & định dạng VN: dấu phẩy thập phân, dấu chấm nghìn, `dd/MM/yyyy`, thứ, tuần bắt đầu Thứ Hai, giờ 24h, nhập cả dấu chấm/phẩy | UI tiếng Việt; "2.150 kcal", "62,4 kg", "Thứ Tư, 04/11/2026"; tuần 02/11–08/11 bắt đầu Thứ Hai; giờ 24h; nhập 62,4 và 62.4 đều lưu; không có imperial. Lưu ISO/số chuẩn trong DB. | `weight/02-saved-comma-light.png; report/32-week-recheck-light.png; runs/functional.json` |
| NFR-05 | **Fail** | LCP ≤2,5 s; TTI ≤4 s; thao tác log lạc quan ≤100 ms; Dashboard ≤1 s sau shell | 4G mô phỏng 1,6/0,75 Mbps, RTT 150 ms, cache off: **LCP 1.136 ms**, FCP 1.136 ms, DCL 1.025 ms, load 2.130 ms → LCP đạt. TTI: **Blocked** (không có chỉ số TTI chuẩn trong Chromium headless). Optimistic +250 ml: UI đổi sau **220 ms** (lượt trước 264 ms với CPU 4×) → không đạt ≤100 ms. Dashboard ≤1 s sau shell chưa tách riêng khỏi load. | `perf/01-dashboard-mobile-4g.png; runs/perf.json` |
| NFR-06 | **Pass** | Tìm món p95 ≤300 ms với CSDL ~10.000 món | DB QA 10.289 món (289 seed + 10.000 synthetic, đã xóa sau đo): 30 truy vấn p50 **66,9 ms**, p95 **104,4 ms**, max 127,7 ms; "pho" 15 truy vấn p95 **44,6 ms**; baseline 289 món p95 33,3 ms. | `runs/perf.json` |
| NFR-07 | **Fail** | HTTPS, băm mật khẩu, cookie httpOnly/SameSite, CSRF/XSS/SQLi, rate limit, cách ly `user_id`, header bảo mật, không log PII | Cách ly: B không thấy/xuất dữ liệu A; B tìm món A → 0; chưa đăng nhập export → 401. Cookie `nt_session`: HttpOnly=true, SameSite=Lax, Secure=false (localhost HTTP). HSTS `max-age=63072000; includeSubDomains` có; **CSP chưa có**. Mật khẩu argon2id; rate limit đăng nhập hoạt động. HTTPS/CSRF cross-site/backup production: **Blocked** (không có môi trường HTTPS thật). | `runs/security.json; profile/02-password-changed-light.png` |
| NFR-08 | **Pass** | Riêng tư dữ liệu sức khỏe: consent, export/xóa, không chia sẻ, không log PII | Consent bắt buộc khi đăng ký; export JSON đủ hồ sơ/log; xóa tài khoản xóa user khỏi DB; log app không chứa email/mật khẩu; tên chứa `<img onerror>` render thành text, script không chạy. Rà soát pháp lý NĐ 13/2023 (Q7) và analytics ẩn danh: **Blocked** — chưa có tài liệu/người duyệt. | `security/03-xss-diary-light.png; runs/security.json; runs/functional2.json` |
| NFR-09 | **Fail** | Mất kết nối: hiển thị trạng thái, không mất input, lỗi tiếng Việt + "Thử lại"; hai phiên sửa đồng thời | Offline khi bấm "Thêm vào nhật ký": toàn trang thành **"Application error: a client-side exception has occurred"**, hộp thoại/input biến mất, không có thông báo tiếng Việt hay Retry; không tạo log (1/1). Concurrent edit hai phiên: **Blocked** — chưa có kịch bản điều khiển ổn định. | `security/02-offline-add-light.png; runs/security.json` |
| NFR-10 | **Blocked** | Safari/iOS 16+, Firefox, Edge (2 phiên bản mới nhất) | Chỉ có Chromium 156.0.8078.4 headless; không có thiết bị/trình duyệt khác — không suy Pass. | `` |
| NFR-11 | **Blocked** | Usability 5 người: ≥4/5 thành công, onboarding ≤3 phút, ghi bữa ≤30 s/≤4 thao tác | Không có người thử trong phiên QA; không giả dữ liệu. | `` |
| NFR-12 | **Not run** | E2E đăng ký→onboarding→ghi bữa→dashboard→báo cáo gắn SHA/PR | Ngoài phạm vi Tester thủ công; task Automation QLD-22 đã `done` — QA Lead tổng hợp báo cáo E2E riêng, không quy đổi thành Pass của task này. | `` |

## 5. Bug đã tạo

| Issue | Severity | Phạm vi |
|---|---|---|
| QLD-23 | High | Dashboard tràn ngang 360/393px + 45 target <44px (NFR-01) |
| QLD-24 | High | Thiếu sửa/xóa món tự tạo, sửa bữa/ngày, xóa cả bữa, sửa/xóa cân nặng; cảnh báo kcal không hiện (US-08.1/08.3/09.2/09.3/16.4) |
| QLD-25 | High | Onboarding 4 bước sai AC; <18 vẫn được đề xuất giảm cân (US-03.1/05.8) |
| QLD-26 | Medium | Ngưỡng cảnh báo macro 10% thay vì 5%, thiếu gợi ý carb; không hỏi giữ/đổi khi sửa hồ sơ đang Tùy chỉnh (US-05.6/03.5) |
| QLD-27 | Medium/Low | Tìm món không focus/prefill, thiếu 3 vi chất chi tiết, notification không mở hành động, axe label mismatch (US-06.1/06.4/07.1/26.2, NFR-03) |
| QLD-28 | High | Offline khi lưu làm treo app, mất input, không có thông báo tiếng Việt/Retry (NFR-09) |

Chi tiết severity, SHA, precondition, bước tái hiện, expected/actual và evidence nằm trong từng issue. Không gán sang phòng Engineering; QA Lead điều phối.

## 6. Đối chiếu dữ liệu seed với PRD

- Seed chạy thật: **289 foods, 343 servings** (log seed: `Seeded 289 foods (db totals: foods=289, servings=343)`).
- PRD đặt mục tiêu 300 món Việt + 700 nguyên liệu; bàn giao thiếu ít nhất 11 món Việt và không có bộ 700 nguyên liệu riêng → **chưa đạt mục tiêu dữ liệu PRD**.
- QLD-3 yêu cầu tối thiểu ≥200 món: **đạt**.
- Không lấy 289 món làm bằng chứng cho NFR tải 10.000 món; NFR-06 được đo bằng 10.000 món synthetic chèn riêng vào DB QA rồi xóa sau đo (DB trở về 292 foods: 289 seed + 3 món QA).
- 20 món Việt bắt buộc ở US-06.5: đủ 20/20.

## 7. Giới hạn, Blocked và việc cần QA Lead quyết

- **Safari/iOS, Firefox, Edge, thiết bị thật:** chưa có → NFR-10 Blocked. Không suy Pass từ Chromium.
- **Screen reader thật (NVDA/VoiceOver):** chưa có → NFR-03 Blocked một phần; chỉ có axe + accessibility snapshot + kiểm keyboard.
- **Usability 5 người (NFR-11):** chưa có người thử → Blocked; không giả số liệu.
- **HTTPS/CSRF cross-site/backup production:** local HTTP → NFR-07 Blocked một phần; CSP chưa có là Fail thực tế; không coi local là Pass production.
- **Clock 23:59→00:00, quiet hours 22–06:** không có đồng hồ kiểm soát → US-25.4/QA-21 Blocked; mới kiểm biên tuần/tháng ISO và target history.
- **Token reset hết hạn 60 phút:** xác nhận TTL bằng DB; đã kiểm link dùng một lần và thu hồi phiên (`runs/reset.json`).
- **Offline/retry:** đã chạy và **Fail** — app crash, mất input; bug QLD-28. Concurrent edit hai phiên: Blocked (chưa có kịch bản điều khiển).
- **NFR-05 TTI:** không có chỉ số TTI chuẩn trong Chromium headless → Blocked; LCP đo được 1.136 ms.
- **NFR-02/NFR-04:** dark mode và định dạng VN đã Pass; chưa quay video FOUC và chưa kiểm tay toàn bộ contrast token ngoài axe.

- Đề nghị QA Lead/CEO: xác nhận mục tiêu dữ liệu (300+700 hay chấp nhận 289/≥200) là quyết định sản phẩm, không phải waiver QA; quyết định P1 (US-11.4, 13.9, 15.5, 20.3, 21, 26.2) có bắt buộc trước release hay không.

## 8. Khuyến nghị Go/No-Go (có giới hạn)

**No-Go ở thời điểm này.** Lý do:

1. Còn 15 AC P0 Fail, trong đó có lỗi an toàn sức khỏe (US-05.8), luồng onboarding sai AC (US-03.1), thiếu CRUD bắt buộc (US-08.1/08.3/09.3/16.4) và responsive mobile hỏng (NFR-01).
2. NFR-01, NFR-03, NFR-05 (optimistic), NFR-07 (CSP) và NFR-09 (offline crash) Fail; nhiều NFR Blocked chưa có bằng chứng (TTI, screen reader, Safari/Firefox/Edge, usability, HTTPS/CSRF production).
3. Seed 289 < 300 món Việt + thiếu 700 nguyên liệu theo PRD.

Điều kiện tối thiểu để QA có thể đề xuất Go: toàn bộ P0 Pass trên SHA mới, NFR-01/03/05/06/07/09 có bằng chứng Pass (hoặc Blocked được người có thẩm quyền chấp nhận), NFR-10/11 có thiết bị/người thử, E2E của Automation Tester pass gắn SHA, và không còn bug Critical/High mở. **Go của QA không cấp phép release; CEO xin Board duyệt riêng.**

## 9. Phụ lục bằng chứng

- Ảnh UI thật: `docs/qa/evidence/{auth,calc,food,weight,dash,water,report,recipe,remind,reminder,notif,nfr,a11y,responsive,security,perf,profile}/` (chụp từ app đang chạy, không dùng mockup).
- Số đo thô và trạng thái từng ca: `docs/qa/evidence/runs/*.json` (`calc`, `foods`, `dash`, `reports`, `recipes`, `remind`, `reminders`, `reminders2`, `notif`, `nfr`, `a11y`, `security`, `perf`, `functional`, `functional2`, `final2`, `reset`, `future`, `verify`).
- axe: `docs/qa/evidence/runs/axe.json` và `runs/a11y.json`.
- Không đính kèm cookie/token/mật khẩu hay dữ liệu cá nhân; mọi email là `@example.test`.

