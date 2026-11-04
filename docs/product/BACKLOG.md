# Backlog MoSCoW & Milestone — NutriTrack MVP

| | |
|---|---|
| Tác giả | Project Manager (QLDA Agent Co.) |
| Task | QLD-12 (thuộc QLD-2, dự án QLD-1) |
| Đầu vào | `docs/product/PRD.md` (QLD-10, 26 user story US-01…US-26), `docs/design/` (QLD-11) |
| Trạng thái | Draft để CPO duyệt |

## 1. Quy ước
- **MoSCoW:** Must = bắt buộc cho MVP (PRD P0); Should = nên có, làm sau Must trong cùng milestone; Could = làm nếu còn thời gian, cắt được; Won't = không làm trong MVP.
- **Ước lượng tương đối:** S ≈ 1–2 ngày công, M ≈ 3–5, L ≈ 6–10, XL > 10 (nên tách). Gồm BE + FE + test của story, chưa gồm QA tổng.
- **Thứ tự giao việc chuẩn:** API spec (BE) → BE + FE song song → QA → DevOps release. Mỗi story khi tách task ≤ 1 ngày công, có AC lấy từ PRD (`US-xx.n`).
- Story kỹ thuật bổ sung (không có ID trong PRD) dùng ID `TS-xx`.

## 2. Backlog theo story

| ID | Story | MoSCoW | Size | Milestone | Phụ thuộc |
|---|---|---|---|---|---|
| US-01 | Đăng ký email + mật khẩu | Must | M | M1 | TS-01 |
| US-02 | Đăng nhập/đăng xuất/quên mật khẩu (+ rate limit) | Must | M | M1 | US-01, TS-04 (email) |
| US-03 | Hồ sơ cơ thể & onboarding 5 bước | Must | L | M1 | US-01, US-05 |
| US-04 | Quản lý tài khoản: đổi MK, xuất, xóa dữ liệu | Should | M | M3 | US-02 (cần xong trước khi công khai — NFR-08) |
| US-05 | BMR/TDEE/macro, chỉnh tay, giới hạn an toàn | Must | L | M1 | — (hàm thuần, làm sớm nhất) |
| US-06 | Tìm & thêm món vào bữa (tìm không dấu) | Must | L | M2 | TS-02, US-03 |
| US-07 | Chọn khẩu phần & lưu FoodLog | Must | M | M2 | US-06 |
| US-08 | Sửa/xóa mục nhật ký (snapshot) | Must | M | M2 | US-07 |
| US-09 | Món tự tạo (custom food) | Must | M | M2 | US-06 |
| US-10 | Gần đây & hay dùng | Must | S | M2 | US-07 |
| US-11 | Sao chép bữa hôm trước (US-11.4 = Should) | Must | M | M2 | US-07 |
| US-12 | Ghi nhanh calo | Should | S | M2 | US-07 |
| US-13 | Dashboard hôm nay (US-13.9 streak/xơ-đường-natri = Should) | Must | L | M2 | US-05, US-07 |
| US-14 | Mục tiêu nước | Must | S | M2 | US-03 |
| US-15 | Ghi nước nhanh (US-15.5 chai yêu thích = Could) | Must | S | M2 | US-14 |
| US-16 | Ghi cân nặng | Must | S | M2 | US-03 |
| US-17 | Biểu đồ xu hướng cân nặng | Must | M | M2 | US-16 |
| US-18 | Cập nhật TDEE theo cân nặng + TargetHistory | Must | M | M2 | US-16, US-05 |
| US-19 | Báo cáo tuần | Must | L | M3 | US-07, US-15, US-16, TargetHistory (US-18) |
| US-20 | Báo cáo tháng (US-20.3 xuất PDF/CSV = Won't MVP, Q8) | Must | M | M3 | US-19 |
| US-21 | Điểm nhấn (insights theo quy tắc) | Could | S | M3 | US-19 |
| US-22 | Tạo công thức | Must | L | M3 | US-06, US-09 |
| US-23 | Sửa/xóa công thức (US-23.3 nhân bản = Could) | Must | M | M3 | US-22 |
| US-24 | Cấu hình nhắc nhở | Must | M | M3 | US-03 |
| US-25 | Nhận nhắc nhở in-app | Must | M | M3 | US-24, US-15 |
| US-26 | Web Notification (xin quyền đúng lúc) | Should | M | M3 | US-25 |
| TS-01 | Khung dự án, CI, CSDL, migration, auth middleware, lint/test | Must | L | M1 | — |
| TS-02 | Seed CSDL món ăn: ≥ 300 món Việt + ≥ 700 nguyên liệu, kèm FoodServing, nguồn & cờ tin cậy | Must | XL (tách: thu thập dữ liệu / script nạp / rà soát chất lượng) | M1 | Q4 (giấy phép) |
| TS-03 | Design system: token, component nền, layout responsive, theme sáng/tối (từ `docs/design/tokens.css`) | Must | L | M1 | QLD-11 |
| TS-04 | Dịch vụ gửi email (đặt lại MK) | Must | S | M1 | TS-01 |
| TS-05 | i18n/định dạng vi-VN (Intl), múi giờ, hằng số cấu hình (PRD 5.8) | Must | S | M1 | — |
| TS-06 | Analytics tối thiểu cho KPI (PRD 1.4), không PII | Should | S | M3 | — |
| TS-07 | Dark mode + a11y polish (NFR-02/03): audit axe, bàn phím, reduced-motion, tương phản biểu đồ | Must | M | M3 | M2 |
| TS-08 | Hiệu năng & bảo mật hardening (NFR-05/06/07), Lighthouse CI | Must | M | M4 | M3 |

**Won't (MVP)** — theo PRD 1.5: quét mã vạch/nhận diện ảnh; meal plan tự động; wearable; mạng xã hội; app native; vi chất ngoài natri & theo dõi tập luyện; đa ngôn ngữ/imperial/thanh toán; chia sẻ món/công thức; giao diện admin CSDL món; Push server khi app đóng hẳn (Q5); xuất báo cáo PDF/ảnh (US-20.3); đăng nhập Google/Apple (Q3).

**Kiểm tra phủ:** 26/26 user story (US-01…US-26) đều có mức MoSCoW và đúng 1 milestone. Tổng US: Must 22, Should 3 (US-04, US-12, US-26), Could 1 (US-21) = 26; story kỹ thuật: Must 7 (TS-01…05, 07, 08), Should 1 (TS-06). Story chứa sub-AC có mức khác (US-11.4, US-13.9, US-15.5, US-20.3, US-23.3) được ghi chú ngay ở cột Story và có thể cắt mà không ảnh hưởng DoD của story.

## 3. Milestone & lộ trình

Giả định thứ tự thời gian: M1 → M2 → M3 → M4, mỗi milestone nối tiếp; trong milestone BE và FE chạy song song sau khi API spec xong. Ước lượng tổng (tương đối): M1 ≈ 22–30 ngày công, M2 ≈ 28–38, M3 ≈ 28–38, M4 ≈ 10–15. Thời lượng lịch phụ thuộc số kỹ sư (do CTO quyết định).

### M1 — Nền tảng
**Story:** US-01, US-02, US-03, US-05, TS-01, TS-02, TS-03, TS-04, TS-05.
**Thứ tự:** API spec auth/profile → (BE auth+profile ‖ FE shell/design system/onboarding) ; US-05 hàm thuần làm đầu tiên vì US-03 phụ thuộc; TS-02 chạy song song suốt milestone.
**DoD:**
- Đăng ký → đăng nhập → onboarding 5 bước → thấy BMR/TDEE/mục tiêu kcal & macro, đúng toàn bộ ví dụ số trong PRD (US-05.1, 05.2, 5.6) bằng unit test.
- Giới hạn an toàn (sàn kcal, chặn < 800, BMI) có test.
- CSDL đã nạp ≥ 300 món Việt + ≥ 700 nguyên liệu; danh sách món bắt buộc của US-06.5 có đủ; kcal khớp 4P+4C+9F ±15% (script kiểm tra); nguồn/giấy phép đã được xác nhận hoặc ghi rõ rủi ro.
- API spec (OpenAPI) được duyệt và khớp implementation; CI chạy lint + unit + e2e luồng đăng ký→onboarding xanh.
- Design system + theme sáng/tối khớp token của QLD-11; UI tiếng Việt, định dạng vi-VN.
**Điều kiện chuyển QA:** toàn bộ story M1 merged vào nhánh tích hợp (không phải main), staging deploy chạy được, e2e xanh, không còn bug blocker/critical; QA test M1 song song khi Engineering bắt đầu M2.

### M2 — Lõi (giá trị chính)
**Story:** US-06…US-18 (US-06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18).
**Thứ tự:** API spec nhật ký (food search, FoodLog) → US-06/07/08 → US-09/10/11/12 song song với dashboard (US-13) và nước/cân nặng (US-14–18).
**DoD:**
- Mục tiêu MVP 2 đạt: ghi 1 món thường gặp ≤ 4 thao tác, ≤ 30 s (đo bằng kiểm thử thủ công + e2e).
- Tìm món không dấu, p95 ≤ 300 ms trên CSDL seed (đo bằng benchmark).
- Snapshot dinh dưỡng đúng (US-08.4), làm tròn đúng 8.2, Hoàn tác hoạt động.
- Dashboard cập nhật ngay sau mỗi thao tác; trạng thái rỗng/đang tải/lỗi cho mọi màn hình; múi giờ/đổi ngày đúng 8.3.
- TargetHistory lưu mục tiêu theo ngày hiệu lực (US-18.2) — tiền đề cho báo cáo.
- e2e: đăng ký → onboarding → ghi bữa → dashboard → ghi nước → ghi cân nặng xanh; unit test khẩu phần/nước/cân nặng.
**Điều kiện chuyển QA:** story Must của M2 xong và review; staging cập nhật; QA bắt đầu hồi quy M1 + kiểm thử chức năng M2 theo AC `US-xx.n`; bug critical/high của M1 đã đóng.

### M3 — Mở rộng
**Story:** US-19, US-20, US-21, US-22, US-23, US-24, US-25, US-26, US-04, TS-06, TS-07.
**Thứ tự:** báo cáo (cần dữ liệu M2) ‖ công thức ‖ nhắc nhở; US-04 trước khi công khai; TS-07 polish cuối milestone.
**DoD:**
- Báo cáo tuần/tháng khớp số liệu mẫu; ngày trống không tính vào trung bình (US-19.3); dùng mục tiêu theo ngày hiệu lực; biểu đồ có bảng thay thế.
- Công thức: dinh dưỡng/phần đúng, sửa/xóa không đổi FoodLog cũ, chặn lồng công thức.
- Nhắc nhở in-app đúng giờ/múi giờ, không nhắc thừa (US-25.2); web notification xin quyền sau khi giải thích, xử lý từ chối/không hỗ trợ (US-26.1, 26.3).
- Xuất & xóa dữ liệu hoạt động (US-04), có đồng ý quyền riêng tư khi đăng ký (NFR-08).
- Dark mode đủ mọi màn hình; axe không lỗi nghiêm trọng; điều khiển bằng bàn phím; hoạt động ở 360 px không cuộn ngang; tôn trọng reduced-motion.
- Should/Could chưa xong được ghi nhận rõ (không chặn M3).
**Điều kiện chuyển QA:** tính năng M3 hoàn tất (feature freeze), staging cập nhật, e2e xanh; không còn story Must dở dang.

### M4 — QA & hardening
**Story:** TS-08 + sửa lỗi từ QA (không thêm tính năng mới).
**DoD:**
- Toàn bộ AC `US-xx.n` của story Must đã được QA kiểm và pass; kết quả lưu ở báo cáo QA.
- Không còn bug blocker/critical/high mở; bug medium có kế hoạch.
- Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95; LCP ≤ 2,5 s; WCAG 2.1 AA (axe + kiểm tay trình đọc màn hình).
- Kiểm thử bảo mật cơ bản: kiểm soát truy cập theo `user_id`, rate limit, header bảo mật, không log PII (NFR-07).
- Usability ≥ 5 người, ≥ 80% hoàn thành ghi món đầu tiên (NFR-11).
- Trình duyệt NFR-10 đã kiểm; runbook + kế hoạch rollback; DevOps sẵn sàng release.
**Điều kiện release:** QA ký xác nhận → CPO duyệt → **Board duyệt** trước khi deploy production (không tự deploy/không push main).

## 4. Rủi ro & giả định

| # | Rủi ro / giả định | Mức | Giảm thiểu | Chủ |
|---|---|---|---|---|
| R1 | Nguồn dữ liệu dinh dưỡng món Việt thiếu, giấy phép chưa rõ (Q4, Q12); chất lượng sai số lớn → mất niềm tin | Cao | Bắt đầu TS-02 ngay từ đầu M1; ưu tiên nguồn mở (Viện Dinh dưỡng, USDA) + nhập tay có cờ tin cậy; script kiểm tra ±15%; chốt giấy phép sớm | CPO/Board, Dev |
| R2 | Quyền Notification của trình duyệt bị từ chối / iOS yêu cầu cài PWA; không có Push server (Q5) | Trung bình | Nhắc in-app là kênh chính; US-26 là Should; xin quyền sau khi giải thích; UI hướng dẫn khi bị chặn | CTO |
| R3 | Pháp lý dữ liệu sức khỏe (Nghị định 13/2023, lưu trữ trong nước — Q7) | Cao | Rà soát trước khi công khai; US-04 + đồng ý riêng tư làm trước release; chỉ beta nội bộ nếu chưa rà soát xong | Board |
| R4 | Rủi ro rối loạn ăn uống / tư vấn y tế (Q1, Q6) | Trung bình | Giữ sàn kcal, ngôn ngữ trung tính, disclaimer; chờ CPO chốt Q1/Q6 trước khi build US-03/05.8 | CPO |
| R5 | Tìm món p95 ≤ 300 ms không dấu/sai chính tả | Trung bình | Cột `name_unaccented` + chỉ mục trigram; benchmark sớm trong M2 | Dev |
| R6 | Logic tính toán sai (BMR, làm tròn, snapshot, múi giờ) | Cao | Hàm thuần + unit test theo ví dụ PRD; review chéo; làm US-05 đầu M1 | Dev/QA |
| R7 | Phạm vi M2/M3 lớn so với năng lực; trễ lịch | Trung bình | Cắt theo thứ tự: Could → Should (US-26, US-04 sau cùng phải có trước release) → không cắt Must; theo dõi velocity cuối M1 | PM |
| R8 | Chậm bàn giao design/API spec làm FE/BE chờ nhau | Trung bình | API spec đứng đầu chuỗi phụ thuộc; mock API cho FE | PM/Dev |
| R9 | Câu hỏi mở chưa chốt (Q1–Q12) | Trung bình | Dùng giả định tạm thời trong PRD; chốt Q1, Q3, Q4, Q5, Q6 trước khi bắt đầu M1 | CPO |

**Giả định:** đăng nhập chỉ email+mật khẩu (Q3); mục tiêu kcal không cộng kcal vận động (Q9); không có giao diện admin món ăn — nạp seed bằng script; chưa có số lượng kỹ sư/lịch cụ thể nên chỉ ước lượng tương đối; tất cả việc làm trên nhánh riêng, không push main, không deploy production khi chưa có Board duyệt.

## 5. Đề xuất bước tiếp theo
1. CPO duyệt backlog và chốt Q1, Q3, Q4, Q5, Q6.
2. PM tách M1 thành task ≤ 1 ngày với `blocked by` đúng thứ tự (API spec → BE ‖ FE → QA → DevOps), giao cho CTO/Engineering sau khi duyệt.
