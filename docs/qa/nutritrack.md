# Kế hoạch kiểm thử NutriTrack — QLD-4

Ngày: 04/11/2026. Chủ trì: QA Lead. Trạng thái: sẵn sàng thực thi, chưa kết luận Pass.

## Nguồn và bản kiểm thử

- PR bàn giao: https://github.com/khuatminh/nutri-track/pull/1; baseline `5293671` trên `feat/nutritrack-mvp`.
- Nguồn chuẩn: `docs/product/PRD.md`; thiết kế `docs/design/design-spec.md`, `docs/design/mockups/`; ADR `docs/adr/0001-nutritrack-mvp-architecture.md`.
- Không dùng `docs/prd/nutritrack.md` thay nguồn chuẩn. `docs/product/TRACEABILITY.md` là tự đánh giá Engineering, không phải bằng chứng QA.
- Engineering báo 82 unit/integration test và 2 smoke E2E pass. QA phải ghi riêng kết quả tự chạy, không quy đổi thành QA Pass.
- Kiểm thử trên branch/worktree riêng; không sửa checkout Engineering đang dùng, không merge/push main, deploy hoặc công khai. Dữ liệu thử là giả; không xóa DB/volume dùng chung.

## Phân công và bằng chứng

Tester: toàn bộ AC chức năng và NFR bằng trình duyệt, khám phá, responsive, dark mode, accessibility, phép tính và dữ liệu. Automation Tester: E2E đăng ký → onboarding → ghi bữa → dashboard → báo cáo, đối chiếu số liệu, chạy mobile/desktop và light/dark; đính kèm output gắn PR và commit.

Mỗi kết quả ghi: ID AC/case, commit, thời điểm/múi giờ, trình duyệt/viewport/theme, dữ liệu đầu vào, thao tác, kết quả mong đợi/thực tế, Pass/Fail/Blocked/Not run, đường dẫn bằng chứng và issue bug. Ảnh UI phải từ app đang chạy; không dùng mockup làm bằng chứng Pass. Không đính kèm cookie/token/mật khẩu hay dữ liệu cá nhân. Nếu thiếu môi trường hoặc thông tin để chạy, nêu rõ chủ thể cần giải quyết trên task con.

Kết quả của từng người lưu document trên task con và file repo `docs/qa/nutritrack-manual-report.md` hoặc `docs/qa/nutritrack-e2e-report.md`. Khi hoàn tất đánh giá, đánh dấu task con done kể cả có Fail; QA Lead tổng hợp và quyết định. Nếu không thể hoàn tất vì phụ thuộc, dùng blocker thực tế.

## Điều kiện vào và môi trường

1. Ghi SHA thực tế của PR; nếu SHA thay đổi thì chạy lại phần bị ảnh hưởng và golden path.
2. Node 22, pnpm 10, Docker/Postgres/Mailpit theo README. DB riêng cho QA, migrate + seed; không chạy reset trên DB chung. Mỗi worker dùng email riêng; Manual và Automation dùng DB/cổng khác nhau. Không chiếm 3100 (Paperclip).
3. Đọc README, đặt DATABASE_URL/APP_URL/E2E_BASE_URL đúng cổng; `.env` không commit. `DISABLE_RATE_LIMIT=1` chỉ cho smoke E2E; case lockout/rate-limit phải bật lại.
4. Mobile 360×800 và 393×851; tablet 768×1024; desktop 1440×900. Light, dark, system; kiểm theme sau reload. Ghi phiên bản browser thực tế. Chromium automation; Safari/iOS, Firefox, Edge kiểm tay theo NFR-10; không có thiết bị thì Blocked, không suy ra Pass.
5. Hai tài khoản A/B; tài khoản trống và tài khoản đã có lịch sử, 20 món gần đây, món ≥3 lần, ít nhất hai ngày có log trong tuần/tháng. Ngày thử được cố định và ghi rõ timezone Asia/Ho_Chi_Minh.

## Bộ ca bắt buộc và cách thực hiện

Mỗi hàng gồm nhiều biến thể; báo cáo tách từng AC ở phụ lục, không đánh Pass cả nhóm nếu mới chạy một biến thể.

| Case / ưu tiên | Truy vết | Given / When / Then và bằng chứng |
|---|---|---|
| QA-01 / P0 | US-01,02 | Given email mới/trùng/sai, password hợp lệ/7 ký tự/thiếu chữ hoặc số; When đăng ký/đăng nhập/reload/đăng xuất; Then kết quả và lỗi tiếng Việt đúng AC, phiên hủy sau logout. Ảnh lỗi, điều hướng; kiểm hash không xuất bí mật. |
| QA-02 / P0 | US-02.3,02.5; NFR-07 | Given rate limit bật; When nhập sai 5 lần/15 phút và thử tiếp, reset qua Mailpit, dùng lại token/hết hạn 60 phút; Then khóa có thời gian chờ, thông báo không lộ email, token một lần. Ghi mốc thời gian, không lưu URL token đầy đủ. |
| QA-03 / P0 | US-03 | Given onboarding mới; When đi từng bước/quay lại, hoàn tất/relogin/sửa hồ sơ; Then giữ input, validate, không onboarding lại; xác nhận khi ghi đè mục tiêu tùy chỉnh. Kiểm thứ tự/số bước theo AC, không tự miễn khác biệt UI. |
| QA-04 / P0 | US-03.2; §8.1 | Given tuổi 12/13/17/18/100/101, cao 99,9/100/250/250,1, nặng 19,9/20/300/300,1; When tiếp tục; Then chỉ khoảng hợp lệ được qua và <18 cảnh báo/không đề xuất giảm cân. Kiểm ngày sinh tương lai, trước/sau sinh nhật. |
| QA-05 / P0 | US-05; §5 | Given fixture phép tính bên dưới; When tính/đổi PAL/tốc độ/chỉnh tay/khôi phục; Then số đúng, sàn và giới hạn đúng, giải thích điều chỉnh và miễn trừ hiện rõ. Chụp đầy đủ dữ liệu và tính độc lập. |
| QA-06 / P0 | US-06 | Given seed; When tìm `pho bo`, `PHỞ`, không kết quả; Then đúng thứ tự, focus, kcal/khẩu phần, CTA tạo món điền tên; đối chiếu đủ 20 món Việt ở US-06.5. Ghi count dữ liệu, không lấy 289 món làm bằng chứng 10.000 món. |
| QA-07 / P0 | US-07; §8.2 | Given món có serving quy đổi; When đổi gram/tô, nhập 0/0,1/0,5/1,5/5000/5000,1 g và dấu phẩy/chấm; Then validate, 7 chỉ số dinh dưỡng theo gram, lưu đúng ngày/bữa, thêm liên tiếp, toast Undo và tổng cập nhật ngay. |
| QA-08 / P0 | US-08 | Given hai ngày có log; When sửa số lượng/bữa/ngày, xóa từng dòng/cả bữa và Undo trong/ngoài 5 giây; Then tổng hai ngày đúng, xác nhận xóa cả bữa, không tác động người B. |
| QA-09 / P0 | US-09,10 | Given món A tự tạo; When tạo/sửa/xóa, tìm bằng B, ghi ≥3 lần, mở gần đây/hay dùng; Then đủ field, cảnh báo lệch >20%, bảo toàn snapshot, riêng tư, không trùng và ≤20 món gần đây, đúng khẩu phần cũ và thứ tự hay dùng. UI thiếu sửa/xóa phải ghi Fail cho AC tương ứng. |
| QA-10 / P0 | US-11.1–11.3 | Given nguồn rỗng/có món và đích đã có; When sao chép hôm qua/ngày-bữa khác, Undo, nguồn món đã sửa/xóa; Then thêm không ghi đè, dinh dưỡng theo quy tắc AC, Undo toàn thao tác. |
| QA-11 / P0 | US-13 | Given mục tiêu 2000, ăn 1200 hoặc 2150; When mở dashboard/chuyển ngày; Then còn 800 hoặc vượt 150, P/C/F đúng, bốn bữa/CTA, ngày rỗng không giả thành ngày đã ghi, chuyển ngày nhất quán. |
| QA-12 / P0 | US-14,15 | Given cân 62 kg; When mở nước/thêm 150/250/330/500, nhập 1/2000 và 0/2001, sửa/xóa/Undo; Then mục tiêu 2150 ml, tổng đúng, vượt vẫn thêm được; custom 500–6000, đổi chỉ từ ngày hiệu lực. |
| QA-13 / P0 | US-16–18 | Given cân 62,4/62.4 và biên 20–300; When lưu trùng ngày/xóa/xem 7-30-90 ngày/chấp nhận hoặc bỏ gợi ý tính lại TDEE; Then xác nhận cập nhật, biểu đồ+bảng đúng, không nội suy, không sửa mục tiêu lịch sử. |
| QA-14 / P0 | US-19,20; §8.5 | Given ngày 1 ăn 1200, ngày 2 ăn 1800, còn lại không log; When xem tuần; Then trung bình 1500 trên 2/7 ngày, ngày trống không tính bằng 0; macro/vi chất/nước/cân đúng dữ liệu; đổi tuần/tháng đúng ISO/timezone, ngày ít hơn 50% được gắn cờ. |
| QA-15 / P0 | US-22,23 | Given ≥1 nguyên liệu và 2 phần; When tạo/sửa/xóa, ghi 1,5 phần; Then tổng/2 và ×1,5 đúng cả kcal/P/C/F/xơ/đường/natri, snapshot cũ giữ nguyên. Kiểm 0/0,5/1/50/50,5 phần, không nguyên liệu, không lồng công thức. |
| QA-16 / P0 | US-24,25; §8.6 | Given đồng hồ/timezone kiểm soát; When tới giờ, log trong 30 phút trước đó, tắt nhắc, snooze; Then nhắc đúng loại/ngày, quick action, hoãn 30 phút tối đa 3 lần, không nhắc 22–06 trừ đặt rõ; validate end≤start/no days. Ghi clock/setup và video/time markers. |
| QA-17 / P0 | NFR-01–04 | Given bốn viewport/light-dark-system/zoom 200%; When dùng toàn bộ màn bằng keyboard và screen reader; Then không tràn ngang, target≥44px, focus rõ, label/lỗi liên kết, progressbar giá trị, biểu đồ có bảng, contrast 4,5:1 hoặc 3:1 đúng loại, reduced motion. Đính kèm axe và kiểm tay; axe sạch không thay kiểm tay. |
| QA-18 / P0 | NFR-05,06 | Given mobile 4G mô phỏng và 10.000 món synthetic DB QA; When đo tải và nhiều tìm kiếm; Then LCP≤2,5s, TTI≤4s, dashboard≤1s sau shell, optimistic≤100ms, search server p95≤300ms. Ghi cấu hình throttle, số mẫu, duration thô và percentile; không đủ dữ liệu thì Blocked. |
| QA-19 / P0 | NFR-07,08 | Given tài khoản A/B; When B thử ID log/custom food/recipe/export của A qua UI/request kiểm soát; Then từ chối và không lộ dữ liệu. Kiểm consent, cookie flags, CSRF, input HTML, log không PII. HTTPS/HSTS/backup production chưa có môi trường thì Blocked, không coi local HTTP là Pass production. |
| QA-20 / P0 | NFR-09; §8.6 | Given đang nhập form/log; When offline/timeout/lỗi máy chủ rồi Retry; Then input giữ nguyên, lỗi tiếng Việt, không nhân đôi sau retry. Given hai phiên cùng sửa; When lưu đồng thời; Then ghi sau thắng, hai log thêm độc lập không mất. Giữ trace đã làm sạch. |
| QA-21 / P0 | §8.3,8.4; NFR-04 | Given 23:59→00:00, cuối tháng/năm/tuần, lịch sử mục tiêu và snapshot cũ; When chuyển timezone/sửa món/đổi mục tiêu, ghi quá khứ/+1/>+1 ngày; Then ngày cũ không dịch chuyển, chỉ +1 được ghi với xác nhận, tổng lịch sử không đổi. AC-13.8 và §8.3 khác cách diễn đạt phải báo cần xác nhận nếu hành vi không rõ. |
| QA-22 / P1 | US-04,12,21,26 và AC gắn P1 | Given tính năng hỗ trợ; When đổi password/export/delete/ghi nhanh/insight/notification; Then đúng AC và riêng tư; chỉ thao tác trên tài khoản QA. Case chưa làm phải ghi rõ, không ngầm miễn. Không xin quyền Notification lúc vừa vào app. |
| QA-23 / P0 | NFR-10,11 | Given người dùng/thiết bị thử hợp lệ; When ghi món đầu không hướng dẫn; Then ≥4/5 người thành công, đo onboarding≤3 phút/ghi bữa≤30s và ≤4 thao tác. Chưa có người thử hoặc Safari thật thì Blocked, không giả dữ liệu. |
| QA-24 / P0 | NFR-12; QLD-4 AC | Given app+DB tại SHA PR; When E2E chạy đăng ký→onboarding→ghi bữa→dashboard→báo cáo; Then đối chiếu món/kcal/macro sau reload, báo cáo chứa ngày vừa ghi; mobile/desktop×light/dark pass, có command/output/exit code/HTML report/trace lỗi gắn SHA và PR. |

## Fixture tính độc lập (theo hợp đồng PRD, không lấy hàm app làm oracle)

- Nam 30 tuổi, 175 cm, 70 kg: BMR 1648,75 → 1649; PAL 1,55: TDEE chính xác 2555,5625 → 2556. PRD ghi số trung gian 2555,5; không cắt chính xác nội bộ vì số này.
- Nữ 28 tuổi, 162 cm, 62 kg: BMR 1331,5 → 1332. Cùng tuổi/cao/cân nhưng giới tính khác: 1414,5 → 1415; phải giải thích ước tính trung bình.
- Mỗi PAL 1,2/1,375/1,55/1,725/1,9; lose 0,25/0,5/0,75 và gain 0,25/0,5; trần thâm hụt 25% TDEE và 1000, sàn nam/nữ/khác 1500/1200/1350; mục tiêu làm tròn bội 10.
- Kcal tay 799/800, sàn−1/sàn/sàn+1; cảnh báo và xác nhận hai lần khi dưới sàn. Macro lệch 5%/hơn 5%.
- Nữ 62 kg, 1500 kcal giảm cân: P112/F45/C162 g theo ví dụ PRD; kcal quy đổi 1501, trong ±10. Kiểm protein≤35% kcal, fat≥0,6g/kg, carb≥100 và fallback theo §5.6. Nếu điều kiện không đồng thời thỏa được ở biên thì ghi xung đột, không tự chọn quy tắc mới.
- Món QA trên 100g: kcal180/P10/C20/F6, xơ2/đường3/natri100. Khẩu phần 150g → 270 kcal, P15/C30/F9, xơ3/đường4,5/natri150. Hai nguyên liệu 100g giống nhau, 2 phần → 180kcal/phần; 1,5 phần →270kcal.
- Nước 62kg→2170→2150ml; clamp tự động 1500–4000; custom 500–6000. Tổng từ số chưa làm tròn, snapshot 2 số lẻ, hiển thị theo §8.2.

## Những phạm vi cần theo dõi, chưa phải waiver

- PRD mục tiêu dữ liệu 300 món Việt +700 nguyên liệu; bàn giao 289 món và QLD-3 yêu cầu ≥200. Báo cả hai mức, chuyển chênh lệch cho QA Lead/CEO; không đổi PRD thành 200.
- Traceability ghi UI sửa/xóa món riêng và sao chép cả ngày chưa đủ; nhắc thời gian thực, axe, browser coverage và performance 10.000 món chưa có bằng chứng. Tester phải xác minh, không ghi Pass theo bảng Engineering.
- PRD có Q1–Q12 và chữ draft; không tự quyết chính sách sức khỏe, giấy phép hay pháp lý. Nếu ảnh hưởng verdict, QA Lead hỏi CEO với câu hỏi cụ thể, không giao việc sang phòng khác.
- Tương thích ngược: kiểm phiên, link ngày/báo cáo cũ, mục tiêu lịch sử, theme sau reload và snapshot. N/A cho migration từ sản phẩm production cũ vì đây là MVP chưa release; không N/A cho dữ liệu đã tạo trong MVP.
- Telemetry/audit: kiểm không log PII; KPI 30 ngày chưa thể xác minh trong một lượt trước release, đánh dấu chưa đo. Không tự thêm hợp đồng event mới; nếu thiếu instrument cần KPI thì báo khoảng trống cho CEO.

## Mức lỗi, re-test và điều kiện ra

Critical: mất/lộ dữ liệu hoặc phá cách ly; High: luồng P0 không hoàn tất, sai tính toán hoặc giới hạn an toàn; Medium: chức năng/UI bị ảnh hưởng có đường vòng; Low: hiển thị nhỏ. Mỗi bug có SHA, severity, AC, precondition/data, bước tái hiện, expected/actual, ảnh/trace sạch. Tạo issue trong phạm vi QA và báo QA Lead để CEO điều phối fix phòng Engineering; không gán trực tiếp sang phòng khác.

Re-test trên SHA fix: chạy đúng bước tái hiện, các case lân cận và golden path; ghi cả bằng chứng trước/sau, không đóng bug chỉ theo lời tác giả. Đổi tiêu chí giữa lượt phải chạy lại lượt theo bộ tiêu chí mới.

Go chỉ khi toàn bộ P0 và NFR bắt buộc có bằng chứng Pass; không Critical/High mở; các Fail khác có waiver rõ người có thẩm quyền + issue theo dõi. Blocked/Not run không phải Pass. E2E phải pass gắn PR/SHA, output lưu task. QA Lead lưu báo cáo cuối trên QLD-4 gồm **Pass**, **Fail**, **Blocked**, bug list, coverage và go/no-go. Go của QA không cấp phép release; CEO xin Board duyệt riêng. Hiện tại: **chưa đủ bằng chứng để Go**.

## Phụ lục — danh mục AC nguồn

Mỗi AC dưới đây là một dòng kết quả độc lập cần thực thi theo case nhóm và điều kiện gốc trong PRD; trạng thái ban đầu Not run. Các US chỉ có một AC nguyên đoạn được giữ cả ID US.

| AC | Ưu tiên | Điều kiện và kết quả gốc | Kết quả |
|---|---|---|---|
| US-01.1 | P0 | **US-01.1** Given tôi ở màn Đăng ký, When tôi nhập email hợp lệ chưa dùng và mật khẩu ≥ 8 ký tự (có chữ và số) rồi gửi, Then tài khoản được tạo, tôi được đăng nhập và chuyển sang onboarding hồ sơ. | Not run |
| US-01.2 | P0 | **US-01.2** Given email đã tồn tại, When tôi gửi form, Then hiện lỗi "Email đã được sử dụng" ngay tại trường email, không tạo tài khoản thứ hai. | Not run |
| US-01.3 | P0 | **US-01.3** Given mật khẩu < 8 ký tự hoặc email sai định dạng, When tôi gửi, Then hiện thông báo lỗi tiếng Việt cụ thể cho từng trường và không gọi tạo tài khoản. | Not run |
| US-01.4 | P0 | **US-01.4** Given mật khẩu được lưu, Then chỉ lưu dạng băm (argon2/bcrypt), không lưu/log plaintext. | Not run |
| US-02.1 | P0 | **US-02.1** Given tôi có tài khoản, When nhập đúng email + mật khẩu, Then tôi vào Dashboard hôm nay và phiên được giữ khi tải lại trang. | Not run |
| US-02.2 | P0 | **US-02.2** Given nhập sai thông tin, When gửi, Then hiện "Email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại hay không). | Not run |
| US-02.3 | P0 | **US-02.3** Given 5 lần sai liên tiếp trong 15 phút, When thử lần tiếp, Then bị chặn tạm thời và hiện thời gian chờ. | Not run |
| US-02.4 | P0 | **US-02.4** Given tôi đang đăng nhập, When bấm Đăng xuất, Then phiên bị hủy và truy cập trang cần đăng nhập sẽ chuyển về Đăng nhập. | Not run |
| US-02.5 | P0 | **US-02.5** Given tôi quên mật khẩu, When nhập email đã đăng ký, Then hệ thống gửi liên kết đặt lại có hạn 60 phút (luôn hiện cùng thông báo thành công dù email có tồn tại hay không). | Not run |
| US-03.1 | P0 | **US-03.1** Given vừa đăng ký xong, When tôi vào onboarding, Then các bước: (1) giới tính + ngày sinh, (2) chiều cao + cân nặng, (3) mức vận động, (4) mục tiêu giảm/giữ/tăng (+ tốc độ), (5) xem mục tiêu kcal/macro đề xuất; có thể quay lại bước trước mà không mất dữ liệu. | Not run |
| US-03.2 | P0 | **US-03.2** Given tôi nhập giá trị ngoài khoảng hợp lệ (xem 8.1), When tiếp tục, Then hiện lỗi ở trường tương ứng và không cho qua bước. | Not run |
| US-03.3 | P0 | **US-03.3** Given tôi chọn giảm hoặc tăng cân, When chọn tốc độ, Then chỉ cho các mức hợp lệ (mục 5.4) và hiển thị mô tả (VD "Giảm ~0,5 kg/tuần"). | Not run |
| US-03.4 | P0 | **US-03.4** Given đã hoàn tất onboarding, When đăng nhập lại, Then không bị yêu cầu onboarding lại; tôi sửa được mọi trường trong Cài đặt → Hồ sơ. | Not run |
| US-03.5 | P0 | **US-03.5** Given tôi sửa chiều cao/tuổi/mức vận động/mục tiêu/giới tính, When lưu, Then mục tiêu kcal/macro được tính lại và hỏi xác nhận nếu đang có chỉnh tay (xem US-05.4). | Not run |
| US-03.6 | P0 | **US-03.6** Given tôi chọn đơn vị hiển thị, Then MVP cố định hệ mét (kg, cm); (đơn vị imperial ngoài phạm vi). | Not run |
| US-04.1 | P1 | **US-04.1** Given tôi ở Cài đặt, When đổi mật khẩu với mật khẩu cũ đúng, Then đổi thành công và các phiên khác bị đăng xuất. | Not run |
| US-04.2 | P1 | **US-04.2** Given tôi chọn Xuất dữ liệu, When xác nhận, Then tải về file JSON/CSV chứa hồ sơ và toàn bộ log của tôi. | Not run |
| US-04.3 | P1 | **US-04.3** Given tôi chọn Xóa tài khoản, When nhập lại mật khẩu và xác nhận, Then toàn bộ dữ liệu cá nhân bị xóa vĩnh viễn và tôi bị đăng xuất. | Not run |
| US-05.1 | P0 | **US-05.1** Given hồ sơ đầy đủ, When hệ thống tính, Then BMR theo Mifflin-St Jeor đúng công thức mục 5.1. *Ví dụ kiểm thử:* nam 30 tuổi, 175 cm, 70 kg → BMR = 10·70 + 6,25·175 − 5·30 + 5 = **1648,75 → 1649 kcal**; nữ 28 tuổi, 162 cm, 62 kg → 620 + 1012,5 − 140 − 161 = **1331,5 → 1332 kcal** (làm tròn half-up). | Not run |
| US-05.2 | P0 | **US-05.2** Given BMR và mức vận động, Then TDEE = BMR × hệ số (mục 5.2). *Ví dụ:* nam trên, "vận động vừa" 1,55 → 1648,75 × 1,55 = 2555,5 → **2556 kcal**. | Not run |
| US-05.3 | P0 | **US-05.3** Given mục tiêu và tốc độ, Then mục tiêu kcal = TDEE ± điều chỉnh (mục 5.4), áp giới hạn an toàn (mục 5.5); macro tính theo mục 5.6, làm tròn gram nguyên. | Not run |
| US-05.4 | P0 | **US-05.4** Given tôi mở "Chỉnh mục tiêu", When tôi nhập tay kcal và/hoặc macro (g hoặc %), Then hệ thống dùng giá trị của tôi làm mục tiêu, gắn nhãn "Tùy chỉnh", nút "Khôi phục đề xuất" đưa về giá trị tính tự động. | Not run |
| US-05.5 | P0 | **US-05.5** Given kcal tay thấp hơn mức sàn an toàn (mục 5.5), When lưu, Then hiện cảnh báo rõ lý do và yêu cầu xác nhận lần hai; nếu < 800 kcal thì **chặn** không cho lưu. | Not run |
| US-05.6 | P0 | **US-05.6** Given macro tay có tổng kcal (4P+4C+9F) lệch > 5% so với kcal mục tiêu, When lưu, Then hiện cảnh báo "Macro không khớp kcal" và đề xuất tự cân bằng carb; người dùng vẫn lưu được. | Not run |
| US-05.7 | P0 | **US-05.7** Given mục tiêu kcal đã tính, Then màn hình hiển thị đầy đủ BMR, TDEE, mức điều chỉnh và mục tiêu cuối cùng cùng ghi chú "Ước tính, không thay thế tư vấn y tế". | Not run |
| US-05.8 | P0 | **US-05.8** Given tuổi < 18 hoặc mang thai/cho con bú (nếu được khai báo), Then MVP hiện cảnh báo nên tham khảo chuyên gia và không đề xuất giảm cân (xem câu hỏi mở Q1). | Not run |
| US-06.1 | P0 | **US-06.1** Given tôi ở Nhật ký, When bấm "+ Thêm" ở bữa Sáng/Trưa/Tối/Phụ, Then mở màn tìm món với ô tìm đã focus, hiển thị tab Gần đây / Hay dùng / Món của tôi. | Not run |
| US-06.2 | P0 | **US-06.2** Given CSDL có món "Phở bò", When tôi gõ "pho bo" (không dấu) hoặc "phở", Then phở bò nằm trong kết quả; tìm không phân biệt hoa/thường và dấu tiếng Việt; hiển thị kcal/khẩu phần mặc định ngay trong danh sách. | Not run |
| US-06.3 | P0 | **US-06.3** Given tôi gõ ≥ 2 ký tự, Then kết quả hiển thị với p95 ≤ 300 ms phía máy chủ (xem NFR-06), kết quả khớp đầu từ xếp trước, món Việt/món đã dùng của tôi được ưu tiên. | Not run |
| US-06.4 | P0 | **US-06.4** Given không có kết quả, Then hiện trạng thái rỗng "Không tìm thấy 'xyz'" cùng nút "Tạo món mới" điền sẵn tên đã gõ. | Not run |
| US-06.5 | P0 | **US-06.5** Given CSDL seed, Then có tối thiểu các món Việt: phở bò, phở gà, cơm tấm sườn, bún chả, bún bò Huế, bánh mì thịt, bún riêu, hủ tiếu, mì Quảng, cơm gà, gỏi cuốn, bánh xèo, cháo, canh chua, rau muống xào tỏi, thịt kho trứng, cá kho, trứng chiên, đậu hũ sốt cà, chè (kiểm thử bằng danh sách). | Not run |
| US-07.1 | P0 | **US-07.1** Given tôi chọn một món, When mở chi tiết, Then thấy kcal, P/C/F, chất xơ, đường, natri cho khẩu phần đang chọn, cập nhật tức thì khi đổi số lượng/đơn vị. | Not run |
| US-07.2 | P0 | **US-07.2** Given món có các đơn vị (g, và đơn vị tự nhiên như bát, đĩa, tô, cái, ly, muỗng canh, lát), When tôi đổi đơn vị hoặc nhập số lượng (hỗ trợ 0,5; 1,5; dấu phẩy thập phân kiểu VN), Then dinh dưỡng = nutrients_per_100g × (quy đổi gram ÷ 100), làm tròn theo mục 8.2. | Not run |
| US-07.3 | P0 | **US-07.3** Given số lượng ≤ 0 hoặc > giới hạn (> 5000 g mỗi dòng), When lưu, Then báo lỗi và không lưu. | Not run |
| US-07.4 | P0 | **US-07.4** Given tôi bấm "Thêm vào bữa X", Then FoodLog được tạo cho đúng ngày đang xem + bữa, Dashboard/tổng ngày cập nhật ngay không cần tải lại, hiện toast có "Hoàn tác". | Not run |
| US-07.5 | P0 | **US-07.5** Given tôi thêm nhiều món liên tiếp, Then có thể thêm nhiều món rồi bấm "Xong" (không bị đẩy ra màn ngoài sau mỗi món). | Not run |
| US-08.1 | P0 | **US-08.1** Given một FoodLog, When tôi sửa số lượng/đơn vị/bữa/ngày rồi lưu, Then dinh dưỡng và tổng ngày được tính lại đúng; di chuyển sang ngày khác cập nhật cả hai ngày. | Not run |
| US-08.2 | P0 | **US-08.2** Given một FoodLog, When tôi xóa, Then mục biến mất, tổng ngày cập nhật, và hiện "Hoàn tác" trong 5 giây. | Not run |
| US-08.3 | P0 | **US-08.3** Given một bữa có nhiều mục, When chọn "Xóa cả bữa" và xác nhận, Then toàn bộ mục của bữa đó (ngày đó) bị xóa. | Not run |
| US-08.4 | P0 | **US-08.4** Given FoodLog đã lưu, When món gốc trong CSDL/món tự tạo bị sửa sau này, Then FoodLog cũ **không** đổi (lưu snapshot dinh dưỡng tại thời điểm ghi — xem 8.4). | Not run |
| US-09.1 | P0 | **US-09.1** Given tôi chọn "Tạo món mới", When nhập tên, khẩu phần cơ sở (VD 100 g hoặc 1 phần = x g) và kcal + protein + carb + fat (bắt buộc), cùng chất xơ/đường/natri (tùy chọn), Then món được lưu vào "Món của tôi" và dùng để ghi nhật ký được ngay. | Not run |
| US-09.2 | P0 | **US-09.2** Given kcal nhập lệch quá 20% so với 4P+4C+9F, When lưu, Then cảnh báo mềm (vẫn cho lưu). | Not run |
| US-09.3 | P0 | **US-09.3** Given tôi sửa/xóa món của tôi, Then các FoodLog cũ không đổi (US-08.4); món bị xóa không còn xuất hiện khi tìm. | Not run |
| US-09.4 | P0 | **US-09.4** Món của tôi chỉ hiển thị cho chính tôi. | Not run |
| US-10.1 | P0 | **US-10.1** Given tôi đã ghi món, When mở màn tìm (chưa gõ), Then tab "Gần đây" liệt kê ≤ 20 món ghi gần nhất (không trùng) kèm khẩu phần lần trước; chọn là thêm nhanh với khẩu phần đó. | Not run |
| US-10.2 | P0 | **US-10.2** Given tôi đã ghi một món ≥ 3 lần, Then nó xuất hiện ở "Hay dùng", sắp theo số lần giảm dần (ưu tiên đúng bữa đang thêm, VD hay ăn sáng). | Not run |
| US-11.1 | P0 | **US-11.1** Given hôm trước có món ở bữa Trưa, When tôi bấm "Sao chép từ hôm qua" (hoặc chọn ngày/bữa nguồn bất kỳ) ở một bữa, Then các mục được nhân bản vào bữa/ngày đích với cùng khẩu phần, dinh dưỡng lấy lại từ CSDL hiện tại (nếu món còn tồn tại) hoặc snapshot cũ. | Not run |
| US-11.2 | P0 | **US-11.2** Given ngày/bữa nguồn trống, Then nút bị vô hiệu hoặc hiện "Hôm qua chưa có bữa này". | Not run |
| US-11.3 | P0 | **US-11.3** Given bữa đích đã có món, When sao chép, Then các mục được **thêm vào** (không ghi đè), và có thể Hoàn tác cả thao tác. | Not run |
| US-11.4 | P1 | **US-11.4** (P1) Given tôi sao chép cả ngày, Then tất cả bữa của ngày nguồn được sao chép vào ngày đích. | Not run |
| US-12 | P1 | **US-12 (P1) — Ghi nhanh calo.** Given tôi không biết món, When chọn "Ghi nhanh" và nhập tên (tùy chọn) + kcal (và macro tùy chọn), Then tạo FoodLog không gắn Food. | Not run |
| US-13.1 | P0 | **US-13.1** Given mục tiêu 2000 kcal và đã ăn 1200 kcal, When mở Dashboard, Then vòng tròn hiển thị "Còn lại 800 kcal", công thức còn lại = mục tiêu − đã ăn (không trừ vận động ở MVP). | Not run |
| US-13.2 | P0 | **US-13.2** Given đã ăn vượt mục tiêu, Then vòng chuyển trạng thái "Vượt 150 kcal" bằng màu + biểu tượng + chữ (không chỉ dựa vào màu), và không báo lỗi/đỏ gây hoảng sợ (tông trung tính-cảnh báo nhẹ). | Not run |
| US-13.3 | P0 | **US-13.3** Given có mục tiêu macro, Then hiển thị 3 thanh P/C/F với "đã ăn / mục tiêu (g)" và % hoàn thành; vượt mục tiêu vẫn hiển thị số đúng. | Not run |
| US-13.4 | P0 | **US-13.4** Given có dữ liệu nước, Then thẻ nước hiển thị "x / y ml" và nút thêm nhanh (US-15). | Not run |
| US-13.5 | P0 | **US-13.5** Given có FoodLog, Then thẻ tóm tắt 4 bữa hiển thị kcal mỗi bữa và danh sách mục (rút gọn), bấm vào bữa mở nhật ký bữa đó; bữa trống hiện nút "+ Thêm". | Not run |
| US-13.6 | P0 | **US-13.6** Given tôi bấm mũi tên trái/phải hoặc chọn ngày từ lịch, Then toàn bộ dashboard chuyển sang ngày đó; ngày được hiển thị dạng "Thứ Ba, 04/11/2026"; có nút "Hôm nay" để quay lại. | Not run |
| US-13.7 | P0 | **US-13.7** Given ngày chưa có dữ liệu, Then hiện trạng thái rỗng thân thiện kèm CTA "Thêm bữa đầu tiên" và vòng kcal = mục tiêu đầy đủ. | Not run |
| US-13.8 | P0 | **US-13.8** Given tôi chọn ngày tương lai, Then cho phép xem (rỗng) nhưng cảnh báo khi ghi dữ liệu vào tương lai > 1 ngày (xem 8.3). | Not run |
| US-13.9 | P1 | **US-13.9** (P1) Given tôi hiển thị Dashboard, Then thấy thêm chuỗi ngày ghi liên tiếp (streak) và tổng chất xơ/đường/natri trong ngày. | Not run |
| US-14.1 | P0 | **US-14.1** Given hồ sơ có cân nặng, Then mục tiêu nước mặc định = 35 ml × kg, làm tròn tới 50 ml, giới hạn 1500–4000 ml (mục 5.7); *ví dụ* 62 kg → 2170 → **2150 ml**. | Not run |
| US-14.2 | P0 | **US-14.2** Given tôi chỉnh tay mục tiêu nước (500–6000 ml), When lưu, Then dùng giá trị của tôi cho các ngày từ nay về sau. | Not run |
| US-15.1 | P0 | **US-15.1** Given tôi ở Dashboard, When bấm nút +250 ml (có các nút nhanh 150 / 250 / 330 / 500 ml), Then thêm WaterLog tại thời điểm hiện tại, tiến độ nước cập nhật ngay. | Not run |
| US-15.2 | P0 | **US-15.2** Given tôi chọn "Khác", When nhập số ml (1–2000), Then thêm đúng lượng nhập. | Not run |
| US-15.3 | P0 | **US-15.3** Given có WaterLog trong ngày, When mở danh sách, Then sửa hoặc xóa từng lần uống được; có Hoàn tác sau khi xóa. | Not run |
| US-15.4 | P0 | **US-15.4** Given tổng nước ≥ mục tiêu, Then hiển thị trạng thái hoàn thành (đạt mục tiêu) nhưng vẫn cho thêm; không giới hạn cứng. | Not run |
| US-15.5 | P1 | **US-15.5** (P1) Given tôi cấu hình chai/cốc yêu thích (VD 350 ml), Then nút nhanh dùng dung tích đó. | Not run |
| US-16.1 | P0 | **US-16.1** Given tôi ở màn Cân nặng, When nhập 62,4 kg (dấu phẩy hoặc chấm đều được) cho hôm nay, Then lưu WeightLog; mỗi ngày tối đa 1 bản ghi (nhập lại → cập nhật bản ghi ngày đó, hỏi xác nhận). | Not run |
| US-16.2 | P0 | **US-16.2** Given giá trị ngoài 20–300 kg, When lưu, Then báo lỗi. | Not run |
| US-16.3 | P0 | **US-16.3** Given tôi nhập cho ngày quá khứ, Then cho phép chọn ngày ≤ hôm nay; không cho ngày tương lai. | Not run |
| US-16.4 | P0 | **US-16.4** Given bản ghi cân nặng, Then sửa/xóa được. | Not run |
| US-17.1 | P0 | **US-17.1** Given ≥ 2 bản ghi, When mở tab Cân nặng, Then hiển thị biểu đồ đường theo thời gian với bộ lọc 30 ngày / 90 ngày / Tất cả, có đường xu hướng (trung bình trượt 7 ngày) và đường/nhãn cân nặng mục tiêu nếu có. | Not run |
| US-17.2 | P0 | **US-17.2** Given biểu đồ, When bấm/hover một điểm, Then tooltip hiện ngày và kg; có bảng dữ liệu tương đương cho trình đọc màn hình. | Not run |
| US-17.3 | P0 | **US-17.3** Given < 2 bản ghi, Then hiện trạng thái rỗng hướng dẫn thay vì biểu đồ trống. | Not run |
| US-17.4 | P0 | **US-17.4** Hiển thị thay đổi so với lần đầu và so với 7/30 ngày trước (VD "−1,2 kg / 30 ngày"). | Not run |
| US-18.1 | P0 | **US-18.1** Given tôi lưu cân nặng mới có ngày là bản ghi mới nhất, When cân nặng này lệch ≥ 1 kg so với cân nặng dùng trong lần tính mục tiêu gần nhất, Then hiện gợi ý "Cập nhật mục tiêu kcal theo cân nặng mới?" kèm so sánh mục tiêu cũ → mới. | Not run |
| US-18.2 | P0 | **US-18.2** Given tôi đồng ý, Then hồ sơ cập nhật cân nặng hiện tại, BMR/TDEE/macro tính lại (nếu không đang "Tùy chỉnh"; nếu đang tùy chỉnh thì hỏi giữ hay đổi); ngày quá khứ **không** bị tính lại (mục tiêu là snapshot theo ngày hiệu lực). | Not run |
| US-18.3 | P0 | **US-18.3** Given tôi từ chối, Then giữ nguyên mục tiêu và không nhắc lại cho đến khi lệch thêm ≥ 1 kg nữa. | Not run |
| US-19.1 | P0 | **US-19.1** Given tôi mở Báo cáo → Tuần, Then thấy tuần hiện tại (Thứ Hai–Chủ Nhật) với biểu đồ cột kcal mỗi ngày + đường mục tiêu, và có thể chuyển sang tuần trước/sau. | Not run |
| US-19.2 | P0 | **US-19.2** Given tuần có dữ liệu, Then hiển thị: kcal trung bình/ngày, tỷ lệ macro P/C/F (g trung bình và % kcal), chất xơ, đường, natri trung bình/ngày so với mức tham chiếu (mục 5.8), số ngày đạt mục tiêu kcal (trong ±10%), nước trung bình, thay đổi cân nặng trong tuần. | Not run |
| US-19.3 | P0 | **US-19.3** Given một số ngày không có FoodLog, Then **các ngày trống không được tính vào trung bình** (không coi là 0 kcal) và báo "Trung bình trên n/7 ngày có dữ liệu". | Not run |
| US-19.4 | P0 | **US-19.4** Given tuần không có dữ liệu, Then hiện trạng thái rỗng. | Not run |
| US-20.1 | P0 | **US-20.1** Given tôi chọn Tháng, Then thấy biểu đồ kcal theo ngày trong tháng, trung bình theo tuần, và các chỉ số như US-19.2 cộng biểu đồ cân nặng của tháng. | Not run |
| US-20.2 | P0 | **US-20.2** Given tôi chuyển tháng trước/sau, Then dữ liệu đúng khoảng ngày theo múi giờ người dùng (mục 8.3). | Not run |
| US-20.3 | P1 | **US-20.3** (P1) Given báo cáo, Then xuất ảnh/PDF hoặc CSV (có thể dời sau MVP — xem Q8). | Not run |
| US-21 | P1 | **US-21 (P1) — Điểm nhấn (insights).** Given đủ dữ liệu ≥ 3 ngày, Then hiện tối đa 3 nhận xét dạng quy tắc cố định (VD "Natri trung bình vượt 2000 mg/ngày", "Protein đạt mục tiêu 5/7 ngày") — không phải lời khuyên y tế. | Not run |
| US-22.1 | P0 | **US-22.1** Given tôi chọn "Tạo công thức", When nhập tên, số khẩu phần (1–50, cho phép 0,5) và thêm ≥ 1 nguyên liệu (tìm từ CSDL + số lượng/đơn vị), Then lưu công thức. | Not run |
| US-22.2 | P0 | **US-22.2** Given công thức có nguyên liệu, Then hiển thị realtime tổng dinh dưỡng cả nồi và dinh dưỡng **mỗi khẩu phần** = tổng ÷ số khẩu phần (kcal, P, C, F, chất xơ, đường, natri). | Not run |
| US-22.3 | P0 | **US-22.3** Given công thức đã lưu, Then nó xuất hiện trong tìm kiếm/“Món của tôi” như một món với đơn vị "phần" (1 phần = tổng khối lượng ÷ số phần; tùy chọn nhập tổng khối lượng thành phẩm sau nấu để quy đổi gram). | Not run |
| US-22.4 | P0 | **US-22.4** Given tôi ghi 1,5 phần công thức vào bữa, Then FoodLog = 1,5 × dinh dưỡng/phần. | Not run |
| US-22.5 | P0 | **US-22.5** Given không có nguyên liệu hoặc số khẩu phần ≤ 0, When lưu, Then báo lỗi. | Not run |
| US-23.1 | P0 | **US-23.1** Given tôi sửa nguyên liệu/số phần, When lưu, Then dinh dưỡng/phần tính lại; FoodLog cũ giữ nguyên (snapshot). | Not run |
| US-23.2 | P0 | **US-23.2** Given tôi xóa công thức, Then FoodLog cũ vẫn hiển thị; công thức không còn trong tìm kiếm. | Not run |
| US-23.3 | P1 | **US-23.3** (P1) Given tôi bấm "Nhân bản công thức", Then tạo bản sao tên "… (bản sao)". | Not run |
| US-23.4 | P0 | **US-23.4** Công thức không cho chứa chính nó làm nguyên liệu (MVP: nguyên liệu chỉ là Food, không lồng công thức). | Not run |
| US-24.1 | P0 | **US-24.1** Given tôi ở Cài đặt → Nhắc nhở, Then có hai loại: Nhắc uống nước (khoảng cách mỗi 1/2/3 giờ trong khung giờ bắt đầu–kết thúc) và Nhắc ghi bữa (giờ riêng cho Sáng/Trưa/Tối, mặc định 07:30/12:00/19:00), mỗi loại bật/tắt độc lập. | Not run |
| US-24.2 | P0 | **US-24.2** Given tôi đặt giờ/ngày trong tuần và lưu, Then cấu hình được lưu theo tài khoản và áp dụng theo múi giờ của tôi. | Not run |
| US-24.3 | P0 | **US-24.3** Given khung giờ kết thúc ≤ bắt đầu hoặc không chọn ngày nào, When lưu, Then báo lỗi. | Not run |
| US-25.1 | P0 | **US-25.1** Given tôi đang mở app và đến giờ nhắc đang bật, Then hiện banner/toast in-app có hành động nhanh ("+250 ml" / "Ghi bữa trưa"), có thể đóng/hoãn 30 phút. | Not run |
| US-25.2 | P0 | **US-25.2** Given tôi đã ghi nước/bữa tương ứng trong 30 phút trước giờ nhắc, Then **không** hiện nhắc (không làm phiền thừa). | Not run |
| US-25.3 | P0 | **US-25.3** Given tắt nhắc, Then không còn banner nào của loại đó. | Not run |
| US-26.1 | P1 | **US-26.1** Given tôi bật nhắc lần đầu cho kênh thông báo trình duyệt, When tôi bấm "Bật thông báo trình duyệt", Then app giải thích lý do **trước** rồi mới gọi yêu cầu quyền của trình duyệt (không xin quyền khi vừa vào trang). | Not run |
| US-26.2 | P1 | **US-26.2** Given quyền được cấp và tab/app đang chạy ở nền, When đến giờ nhắc, Then hiện web notification; bấm vào mở đúng màn hình hành động. | Not run |
| US-26.3 | P1 | **US-26.3** Given quyền bị từ chối/chặn, Then app hiện hướng dẫn mở lại quyền, vẫn dùng được nhắc in-app; trình duyệt không hỗ trợ Notification API thì ẩn tùy chọn. | Not run |
| US-26.4 | P1 | **US-26.4** Ghi chú kỹ thuật: web notification đáng tin cậy khi app đóng cần Push API + service worker (phụ thuộc trình duyệt/iOS cài PWA); MVP chấp nhận nhắc hoạt động khi tab/PWA còn chạy ở nền (xem Q5). | Not run |
