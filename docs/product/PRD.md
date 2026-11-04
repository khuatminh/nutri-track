# PRD — NutriTrack MVP

| | |
|---|---|
| Phiên bản | 1.0 (draft để CPO/Board duyệt) |
| Tác giả | Business Analyst (QLDA Agent Co.) |
| Task | QLD-10 (thuộc QLD-2, dự án QLD-1) |
| Ngôn ngữ sản phẩm | Tiếng Việt (vi-VN) |
| Nền tảng | Web app, mobile-first |

---

## 1. Tổng quan

### 1.1 Bối cảnh & vấn đề
Người Việt muốn kiểm soát cân nặng/sức khỏe nhưng các app dinh dưỡng phổ biến (MyFitnessPal, Cronometer…) thiếu món Việt, giao diện tiếng Anh, đơn vị khẩu phần xa lạ (cup, oz) và việc ghi nhật ký thường rườm rà nên người dùng bỏ giữa chừng.

### 1.2 Tầm nhìn
NutriTrack là web app quản lý dinh dưỡng cá nhân **đẹp, dễ dùng, đầy đủ tính năng**: biết mình nên ăn bao nhiêu (kcal + macro), ghi nhanh những gì đã ăn (đặc biệt món Việt), theo dõi nước, cân nặng và xem xu hướng theo tuần/tháng.

### 1.3 Mục tiêu MVP
1. Người dùng mới hoàn tất onboarding và có mục tiêu kcal/macro cá nhân hóa trong **≤ 3 phút**.
2. Ghi một bữa ăn (tìm món → chọn khẩu phần → lưu) trong **≤ 30 giây / ≤ 4 thao tác** với món thường gặp.
3. CSDL món ăn có độ phủ tốt món Việt (≥ 300 món Việt phổ biến + ≥ 700 thực phẩm/nguyên liệu chung khi ra mắt).
4. Dùng tốt trên điện thoại ≥ 360px, hỗ trợ dark mode, đạt WCAG 2.1 AA.

### 1.4 Chỉ số thành công (KPI)
Đo trong 30 ngày sau ra mắt (nhóm người dùng nội bộ/beta). Cần Dev bổ sung analytics tối thiểu, không thu thập PII ngoài tài khoản.

| KPI | Mục tiêu | Cách đo |
|---|---|---|
| Hoàn tất onboarding | ≥ 80% người đăng ký | funnel đăng ký → có mục tiêu kcal |
| Kích hoạt (activation) | ≥ 60% ghi ≥ 1 bữa trong 24h đầu | FoodLog đầu tiên |
| Retention D7 | ≥ 35% | có ≥ 1 FoodLog ở ngày 7±1 |
| Số ngày ghi / tuần (user hoạt động) | ≥ 4 ngày | trung vị |
| Thời gian ghi 1 món | trung vị ≤ 30s | từ mở "Thêm món" đến lưu |
| Tìm không ra món ("không có kết quả") | ≤ 15% lượt tìm | log truy vấn rỗng → bổ sung CSDL |
| Lighthouse (mobile) | Performance ≥ 85, Accessibility ≥ 95 | CI |

### 1.5 Phạm vi
**Trong MVP:** 9 nhóm tính năng ở mục 4 (tài khoản & hồ sơ; BMR/TDEE/macro; nhật ký ăn uống; dashboard; nước; cân nặng; báo cáo tuần/tháng; công thức tự tạo; nhắc nhở).

**Ngoài MVP (không làm, ghi nhận cho sau):**
- Quét mã vạch; nhận diện món ăn bằng ảnh.
- Gợi ý thực đơn / meal plan tự động.
- Đồng bộ wearable / Apple Health / Google Fit.
- Mạng xã hội, bạn bè, thách thức.
- Ứng dụng native iOS/Android (chỉ PWA-ready ở mức cơ bản nếu chi phí thấp).
- Theo dõi vi chất chi tiết (vitamin/khoáng) ngoài natri; theo dõi tập luyện/kcal đốt thêm (MVP chỉ dùng hệ số vận động).
- Tư vấn y khoa; đa ngôn ngữ ngoài tiếng Việt; thanh toán/gói trả phí.
- Chia sẻ món/công thức giữa người dùng; quản trị CSDL món bằng giao diện admin (MVP nạp bằng seed/script).

---

## 2. Persona

### P1 — Linh, 28 tuổi, nhân viên văn phòng muốn giảm cân
- Nữ, 162 cm, 62 kg, ngồi nhiều (ít vận động), mục tiêu giảm 4 kg trong 3 tháng.
- Ăn cơm văn phòng, cơm tấm, bún, trà sữa; không biết gram, quen đơn vị "bát/đĩa/ly".
- Nhu cầu: biết mình còn ăn được bao nhiêu kcal, ghi nhanh trên điện thoại giờ nghỉ trưa, nhắc uống nước.
- Nỗi đau: app tiếng Anh, thiếu món Việt, nhập quá nhiều bước, nản sau 1 tuần.
- Thành công: ghi đều ≥ 5 ngày/tuần, cân nặng giảm ~0,5 kg/tuần.

### P2 — Minh, 24 tuổi, người tập gym muốn tăng cơ
- Nam, 175 cm, 66 kg, tập 4–5 buổi/tuần (vận động nhiều), mục tiêu tăng cơ, dư kcal nhẹ.
- Quan tâm protein (g), tự nấu ức gà/trứng/cơm, hay chuẩn bị meal prep nhiều phần.
- Nhu cầu: chỉnh tay macro, tạo công thức (nấu 1 nồi chia 4 hộp), copy bữa hôm qua, xem trung bình protein theo tuần.
- Nỗi đau: tính tay bằng bảng tính; công thức nhiều nguyên liệu khó chia phần.
- Thành công: đạt mục tiêu protein ≥ 5/7 ngày, cân nặng tăng ~0,25 kg/tuần.

### P3 — Bác Hòa, 55 tuổi, cần theo dõi sức khỏe/natri
- Nam, 165 cm, 72 kg, vận động nhẹ; được bác sĩ khuyên giảm muối/đường, mục tiêu giữ cân.
- Ít rành công nghệ: cần chữ lớn, tương phản tốt, thao tác đơn giản, ít bước.
- Nhu cầu: xem tổng natri và đường mỗi ngày/tuần, so với khuyến nghị; nhắc ghi bữa.
- Nỗi đau: chữ nhỏ, nhiều tính năng gây rối; sợ nhập sai.
- Thành công: nắm được lượng natri trung bình/ngày và giảm dần; dùng được không cần hướng dẫn.

---

## 3. Quy ước tài liệu
- Mỗi user story có ID `US-xx`; mỗi AC có ID `US-xx.n` theo dạng **Given / When / Then**, kiểm thử được.
- Ưu tiên: **P0** = bắt buộc cho MVP, **P1** = nên có, cắt được nếu trễ.
- Đơn vị nội bộ: khối lượng gram (g), thể tích mililit (ml), cân nặng kg, chiều cao cm, năng lượng kcal.

---

## 4. User stories & Acceptance Criteria

### Nhóm 1 — Tài khoản & hồ sơ

**US-01 (P0) — Đăng ký.** Là người dùng mới, tôi muốn đăng ký bằng email + mật khẩu để lưu dữ liệu của mình.
- **US-01.1** Given tôi ở màn Đăng ký, When tôi nhập email hợp lệ chưa dùng và mật khẩu ≥ 8 ký tự (có chữ và số) rồi gửi, Then tài khoản được tạo, tôi được đăng nhập và chuyển sang onboarding hồ sơ.
- **US-01.2** Given email đã tồn tại, When tôi gửi form, Then hiện lỗi "Email đã được sử dụng" ngay tại trường email, không tạo tài khoản thứ hai.
- **US-01.3** Given mật khẩu < 8 ký tự hoặc email sai định dạng, When tôi gửi, Then hiện thông báo lỗi tiếng Việt cụ thể cho từng trường và không gọi tạo tài khoản.
- **US-01.4** Given mật khẩu được lưu, Then chỉ lưu dạng băm (argon2/bcrypt), không lưu/log plaintext.

**US-02 (P0) — Đăng nhập / đăng xuất / quên mật khẩu.**
- **US-02.1** Given tôi có tài khoản, When nhập đúng email + mật khẩu, Then tôi vào Dashboard hôm nay và phiên được giữ khi tải lại trang.
- **US-02.2** Given nhập sai thông tin, When gửi, Then hiện "Email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại hay không).
- **US-02.3** Given 5 lần sai liên tiếp trong 15 phút, When thử lần tiếp, Then bị chặn tạm thời và hiện thời gian chờ.
- **US-02.4** Given tôi đang đăng nhập, When bấm Đăng xuất, Then phiên bị hủy và truy cập trang cần đăng nhập sẽ chuyển về Đăng nhập.
- **US-02.5** Given tôi quên mật khẩu, When nhập email đã đăng ký, Then hệ thống gửi liên kết đặt lại có hạn 60 phút (luôn hiện cùng thông báo thành công dù email có tồn tại hay không).

**US-03 (P0) — Hồ sơ cơ thể & mục tiêu (onboarding).** Là người dùng, tôi muốn nhập tuổi, giới tính, chiều cao, cân nặng, mức vận động và mục tiêu để hệ thống tính nhu cầu năng lượng.
- **US-03.1** Given vừa đăng ký xong, When tôi vào onboarding, Then các bước: (1) giới tính + ngày sinh, (2) chiều cao + cân nặng, (3) mức vận động, (4) mục tiêu giảm/giữ/tăng (+ tốc độ), (5) xem mục tiêu kcal/macro đề xuất; có thể quay lại bước trước mà không mất dữ liệu.
- **US-03.2** Given tôi nhập giá trị ngoài khoảng hợp lệ (xem 8.1), When tiếp tục, Then hiện lỗi ở trường tương ứng và không cho qua bước.
- **US-03.3** Given tôi chọn giảm hoặc tăng cân, When chọn tốc độ, Then chỉ cho các mức hợp lệ (mục 5.4) và hiển thị mô tả (VD "Giảm ~0,5 kg/tuần").
- **US-03.4** Given đã hoàn tất onboarding, When đăng nhập lại, Then không bị yêu cầu onboarding lại; tôi sửa được mọi trường trong Cài đặt → Hồ sơ.
- **US-03.5** Given tôi sửa chiều cao/tuổi/mức vận động/mục tiêu/giới tính, When lưu, Then mục tiêu kcal/macro được tính lại và hỏi xác nhận nếu đang có chỉnh tay (xem US-05.4).
- **US-03.6** Given tôi chọn đơn vị hiển thị, Then MVP cố định hệ mét (kg, cm); (đơn vị imperial ngoài phạm vi).

**US-04 (P1) — Quản lý tài khoản & dữ liệu.**
- **US-04.1** Given tôi ở Cài đặt, When đổi mật khẩu với mật khẩu cũ đúng, Then đổi thành công và các phiên khác bị đăng xuất.
- **US-04.2** Given tôi chọn Xuất dữ liệu, When xác nhận, Then tải về file JSON/CSV chứa hồ sơ và toàn bộ log của tôi.
- **US-04.3** Given tôi chọn Xóa tài khoản, When nhập lại mật khẩu và xác nhận, Then toàn bộ dữ liệu cá nhân bị xóa vĩnh viễn và tôi bị đăng xuất.

### Nhóm 2 — Tính BMR, TDEE, mục tiêu kcal & macro

**US-05 (P0) — Mục tiêu kcal & macro cá nhân hóa.** Là người dùng, tôi muốn app tự tính nhu cầu hằng ngày và cho tôi chỉnh tay.
- **US-05.1** Given hồ sơ đầy đủ, When hệ thống tính, Then BMR theo Mifflin-St Jeor đúng công thức mục 5.1. *Ví dụ kiểm thử:* nam 30 tuổi, 175 cm, 70 kg → BMR = 10·70 + 6,25·175 − 5·30 + 5 = **1648,75 → 1649 kcal**; nữ 28 tuổi, 162 cm, 62 kg → 620 + 1012,5 − 140 − 161 = **1331,5 → 1332 kcal** (làm tròn half-up).
- **US-05.2** Given BMR và mức vận động, Then TDEE = BMR × hệ số (mục 5.2). *Ví dụ:* nam trên, "vận động vừa" 1,55 → 1648,75 × 1,55 = 2555,5 → **2556 kcal**.
- **US-05.3** Given mục tiêu và tốc độ, Then mục tiêu kcal = TDEE ± điều chỉnh (mục 5.4), áp giới hạn an toàn (mục 5.5); macro tính theo mục 5.6, làm tròn gram nguyên.
- **US-05.4** Given tôi mở "Chỉnh mục tiêu", When tôi nhập tay kcal và/hoặc macro (g hoặc %), Then hệ thống dùng giá trị của tôi làm mục tiêu, gắn nhãn "Tùy chỉnh", nút "Khôi phục đề xuất" đưa về giá trị tính tự động.
- **US-05.5** Given kcal tay thấp hơn mức sàn an toàn (mục 5.5), When lưu, Then hiện cảnh báo rõ lý do và yêu cầu xác nhận lần hai; nếu < 800 kcal thì **chặn** không cho lưu.
- **US-05.6** Given macro tay có tổng kcal (4P+4C+9F) lệch > 5% so với kcal mục tiêu, When lưu, Then hiện cảnh báo "Macro không khớp kcal" và đề xuất tự cân bằng carb; người dùng vẫn lưu được.
- **US-05.7** Given mục tiêu kcal đã tính, Then màn hình hiển thị đầy đủ BMR, TDEE, mức điều chỉnh và mục tiêu cuối cùng cùng ghi chú "Ước tính, không thay thế tư vấn y tế".
- **US-05.8** Given tuổi < 18 hoặc mang thai/cho con bú (nếu được khai báo), Then MVP hiện cảnh báo nên tham khảo chuyên gia và không đề xuất giảm cân (xem câu hỏi mở Q1).

### Nhóm 3 — Nhật ký ăn uống

**US-06 (P0) — Tìm và thêm món vào bữa.**
- **US-06.1** Given tôi ở Nhật ký, When bấm "+ Thêm" ở bữa Sáng/Trưa/Tối/Phụ, Then mở màn tìm món với ô tìm đã focus, hiển thị tab Gần đây / Hay dùng / Món của tôi.
- **US-06.2** Given CSDL có món "Phở bò", When tôi gõ "pho bo" (không dấu) hoặc "phở", Then phở bò nằm trong kết quả; tìm không phân biệt hoa/thường và dấu tiếng Việt; hiển thị kcal/khẩu phần mặc định ngay trong danh sách.
- **US-06.3** Given tôi gõ ≥ 2 ký tự, Then kết quả hiển thị với p95 ≤ 300 ms phía máy chủ (xem NFR-07), kết quả khớp đầu từ xếp trước, món Việt/món đã dùng của tôi được ưu tiên.
- **US-06.4** Given không có kết quả, Then hiện trạng thái rỗng "Không tìm thấy 'xyz'" cùng nút "Tạo món mới" điền sẵn tên đã gõ.
- **US-06.5** Given CSDL seed, Then có tối thiểu các món Việt: phở bò, phở gà, cơm tấm sườn, bún chả, bún bò Huế, bánh mì thịt, bún riêu, hủ tiếu, mì Quảng, cơm gà, gỏi cuốn, bánh xèo, cháo, canh chua, rau muống xào tỏi, thịt kho trứng, cá kho, trứng chiên, đậu hũ sốt cà, chè (kiểm thử bằng danh sách).

**US-07 (P0) — Chọn khẩu phần & lưu.**
- **US-07.1** Given tôi chọn một món, When mở chi tiết, Then thấy kcal, P/C/F, chất xơ, đường, natri cho khẩu phần đang chọn, cập nhật tức thì khi đổi số lượng/đơn vị.
- **US-07.2** Given món có các đơn vị (g, và đơn vị tự nhiên như bát, đĩa, tô, cái, ly, muỗng canh, lát), When tôi đổi đơn vị hoặc nhập số lượng (hỗ trợ 0,5; 1,5; dấu phẩy thập phân kiểu VN), Then dinh dưỡng = nutrients_per_100g × (quy đổi gram ÷ 100), làm tròn theo mục 8.2.
- **US-07.3** Given số lượng ≤ 0 hoặc > giới hạn (> 5000 g mỗi dòng), When lưu, Then báo lỗi và không lưu.
- **US-07.4** Given tôi bấm "Thêm vào bữa X", Then FoodLog được tạo cho đúng ngày đang xem + bữa, Dashboard/tổng ngày cập nhật ngay không cần tải lại, hiện toast có "Hoàn tác".
- **US-07.5** Given tôi thêm nhiều món liên tiếp, Then có thể thêm nhiều món rồi bấm "Xong" (không bị đẩy ra màn ngoài sau mỗi món).

**US-08 (P0) — Sửa/xóa mục nhật ký.**
- **US-08.1** Given một FoodLog, When tôi sửa số lượng/đơn vị/bữa/ngày rồi lưu, Then dinh dưỡng và tổng ngày được tính lại đúng; di chuyển sang ngày khác cập nhật cả hai ngày.
- **US-08.2** Given một FoodLog, When tôi xóa, Then mục biến mất, tổng ngày cập nhật, và hiện "Hoàn tác" trong 5 giây.
- **US-08.3** Given một bữa có nhiều mục, When chọn "Xóa cả bữa" và xác nhận, Then toàn bộ mục của bữa đó (ngày đó) bị xóa.
- **US-08.4** Given FoodLog đã lưu, When món gốc trong CSDL/món tự tạo bị sửa sau này, Then FoodLog cũ **không** đổi (lưu snapshot dinh dưỡng tại thời điểm ghi — xem 8.4).

**US-09 (P0) — Món tự tạo (custom food).**
- **US-09.1** Given tôi chọn "Tạo món mới", When nhập tên, khẩu phần cơ sở (VD 100 g hoặc 1 phần = x g) và kcal + protein + carb + fat (bắt buộc), cùng chất xơ/đường/natri (tùy chọn), Then món được lưu vào "Món của tôi" và dùng để ghi nhật ký được ngay.
- **US-09.2** Given kcal nhập lệch quá 20% so với 4P+4C+9F, When lưu, Then cảnh báo mềm (vẫn cho lưu).
- **US-09.3** Given tôi sửa/xóa món của tôi, Then các FoodLog cũ không đổi (US-08.4); món bị xóa không còn xuất hiện khi tìm.
- **US-09.4** Món của tôi chỉ hiển thị cho chính tôi.

**US-10 (P0) — Gần đây & hay dùng.**
- **US-10.1** Given tôi đã ghi món, When mở màn tìm (chưa gõ), Then tab "Gần đây" liệt kê ≤ 20 món ghi gần nhất (không trùng) kèm khẩu phần lần trước; chọn là thêm nhanh với khẩu phần đó.
- **US-10.2** Given tôi đã ghi một món ≥ 3 lần, Then nó xuất hiện ở "Hay dùng", sắp theo số lần giảm dần (ưu tiên đúng bữa đang thêm, VD hay ăn sáng).

**US-11 (P0) — Sao chép bữa hôm trước.**
- **US-11.1** Given hôm trước có món ở bữa Trưa, When tôi bấm "Sao chép từ hôm qua" (hoặc chọn ngày/bữa nguồn bất kỳ) ở một bữa, Then các mục được nhân bản vào bữa/ngày đích với cùng khẩu phần, dinh dưỡng lấy lại từ CSDL hiện tại (nếu món còn tồn tại) hoặc snapshot cũ.
- **US-11.2** Given ngày/bữa nguồn trống, Then nút bị vô hiệu hoặc hiện "Hôm qua chưa có bữa này".
- **US-11.3** Given bữa đích đã có món, When sao chép, Then các mục được **thêm vào** (không ghi đè), và có thể Hoàn tác cả thao tác.
- **US-11.4** (P1) Given tôi sao chép cả ngày, Then tất cả bữa của ngày nguồn được sao chép vào ngày đích.

**US-12 (P1) — Ghi nhanh calo.** Given tôi không biết món, When chọn "Ghi nhanh" và nhập tên (tùy chọn) + kcal (và macro tùy chọn), Then tạo FoodLog không gắn Food.

### Nhóm 4 — Dashboard hôm nay

**US-13 (P0) — Tổng quan trong ngày.**
- **US-13.1** Given mục tiêu 2000 kcal và đã ăn 1200 kcal, When mở Dashboard, Then vòng tròn hiển thị "Còn lại 800 kcal", công thức còn lại = mục tiêu − đã ăn (không trừ vận động ở MVP).
- **US-13.2** Given đã ăn vượt mục tiêu, Then vòng chuyển trạng thái "Vượt 150 kcal" bằng màu + biểu tượng + chữ (không chỉ dựa vào màu), và không báo lỗi/đỏ gây hoảng sợ (tông trung tính-cảnh báo nhẹ).
- **US-13.3** Given có mục tiêu macro, Then hiển thị 3 thanh P/C/F với "đã ăn / mục tiêu (g)" và % hoàn thành; vượt mục tiêu vẫn hiển thị số đúng.
- **US-13.4** Given có dữ liệu nước, Then thẻ nước hiển thị "x / y ml" và nút thêm nhanh (US-15).
- **US-13.5** Given có FoodLog, Then thẻ tóm tắt 4 bữa hiển thị kcal mỗi bữa và danh sách mục (rút gọn), bấm vào bữa mở nhật ký bữa đó; bữa trống hiện nút "+ Thêm".
- **US-13.6** Given tôi bấm mũi tên trái/phải hoặc chọn ngày từ lịch, Then toàn bộ dashboard chuyển sang ngày đó; ngày được hiển thị dạng "Thứ Ba, 04/11/2026"; có nút "Hôm nay" để quay lại.
- **US-13.7** Given ngày chưa có dữ liệu, Then hiện trạng thái rỗng thân thiện kèm CTA "Thêm bữa đầu tiên" và vòng kcal = mục tiêu đầy đủ.
- **US-13.8** Given tôi chọn ngày tương lai, Then cho phép xem (rỗng) nhưng cảnh báo khi ghi dữ liệu vào tương lai > 1 ngày (xem 8.3).
- **US-13.9** (P1) Given tôi hiển thị Dashboard, Then thấy thêm chuỗi ngày ghi liên tiếp (streak) và tổng chất xơ/đường/natri trong ngày.

### Nhóm 5 — Nước uống

**US-14 (P0) — Mục tiêu nước.**
- **US-14.1** Given hồ sơ có cân nặng, Then mục tiêu nước mặc định = 35 ml × kg, làm tròn tới 50 ml, giới hạn 1500–4000 ml (mục 5.7); *ví dụ* 62 kg → 2170 → **2150 ml**.
- **US-14.2** Given tôi chỉnh tay mục tiêu nước (500–6000 ml), When lưu, Then dùng giá trị của tôi cho các ngày từ nay về sau.

**US-15 (P0) — Ghi nước nhanh.**
- **US-15.1** Given tôi ở Dashboard, When bấm nút +250 ml (có các nút nhanh 150 / 250 / 330 / 500 ml), Then thêm WaterLog tại thời điểm hiện tại, tiến độ nước cập nhật ngay.
- **US-15.2** Given tôi chọn "Khác", When nhập số ml (1–2000), Then thêm đúng lượng nhập.
- **US-15.3** Given có WaterLog trong ngày, When mở danh sách, Then sửa hoặc xóa từng lần uống được; có Hoàn tác sau khi xóa.
- **US-15.4** Given tổng nước ≥ mục tiêu, Then hiển thị trạng thái hoàn thành (đạt mục tiêu) nhưng vẫn cho thêm; không giới hạn cứng.
- **US-15.5** (P1) Given tôi cấu hình chai/cốc yêu thích (VD 350 ml), Then nút nhanh dùng dung tích đó.

### Nhóm 6 — Cân nặng

**US-16 (P0) — Ghi cân nặng.**
- **US-16.1** Given tôi ở màn Cân nặng, When nhập 62,4 kg (dấu phẩy hoặc chấm đều được) cho hôm nay, Then lưu WeightLog; mỗi ngày tối đa 1 bản ghi (nhập lại → cập nhật bản ghi ngày đó, hỏi xác nhận).
- **US-16.2** Given giá trị ngoài 20–300 kg, When lưu, Then báo lỗi.
- **US-16.3** Given tôi nhập cho ngày quá khứ, Then cho phép chọn ngày ≤ hôm nay; không cho ngày tương lai.
- **US-16.4** Given bản ghi cân nặng, Then sửa/xóa được.

**US-17 (P0) — Biểu đồ xu hướng.**
- **US-17.1** Given ≥ 2 bản ghi, When mở tab Cân nặng, Then hiển thị biểu đồ đường theo thời gian với bộ lọc 30 ngày / 90 ngày / Tất cả, có đường xu hướng (trung bình trượt 7 ngày) và đường/nhãn cân nặng mục tiêu nếu có.
- **US-17.2** Given biểu đồ, When bấm/hover một điểm, Then tooltip hiện ngày và kg; có bảng dữ liệu tương đương cho trình đọc màn hình.
- **US-17.3** Given < 2 bản ghi, Then hiện trạng thái rỗng hướng dẫn thay vì biểu đồ trống.
- **US-17.4** Hiển thị thay đổi so với lần đầu và so với 7/30 ngày trước (VD "−1,2 kg / 30 ngày").

**US-18 (P0) — Cập nhật lại TDEE theo cân nặng.**
- **US-18.1** Given tôi lưu cân nặng mới có ngày là bản ghi mới nhất, When cân nặng này lệch ≥ 1 kg so với cân nặng dùng trong lần tính mục tiêu gần nhất, Then hiện gợi ý "Cập nhật mục tiêu kcal theo cân nặng mới?" kèm so sánh mục tiêu cũ → mới.
- **US-18.2** Given tôi đồng ý, Then hồ sơ cập nhật cân nặng hiện tại, BMR/TDEE/macro tính lại (nếu không đang "Tùy chỉnh"; nếu đang tùy chỉnh thì hỏi giữ hay đổi); ngày quá khứ **không** bị tính lại (mục tiêu là snapshot theo ngày hiệu lực).
- **US-18.3** Given tôi từ chối, Then giữ nguyên mục tiêu và không nhắc lại cho đến khi lệch thêm ≥ 1 kg nữa.

### Nhóm 7 — Báo cáo tuần/tháng

**US-19 (P0) — Báo cáo tuần.**
- **US-19.1** Given tôi mở Báo cáo → Tuần, Then thấy tuần hiện tại (Thứ Hai–Chủ Nhật) với biểu đồ cột kcal mỗi ngày + đường mục tiêu, và có thể chuyển sang tuần trước/sau.
- **US-19.2** Given tuần có dữ liệu, Then hiển thị: kcal trung bình/ngày, tỷ lệ macro P/C/F (g trung bình và % kcal), chất xơ, đường, natri trung bình/ngày so với mức tham chiếu (mục 5.8), số ngày đạt mục tiêu kcal (trong ±10%), nước trung bình, thay đổi cân nặng trong tuần.
- **US-19.3** Given một số ngày không có FoodLog, Then **các ngày trống không được tính vào trung bình** (không coi là 0 kcal) và báo "Trung bình trên n/7 ngày có dữ liệu".
- **US-19.4** Given tuần không có dữ liệu, Then hiện trạng thái rỗng.

**US-20 (P0) — Báo cáo tháng.**
- **US-20.1** Given tôi chọn Tháng, Then thấy biểu đồ kcal theo ngày trong tháng, trung bình theo tuần, và các chỉ số như US-19.2 cộng biểu đồ cân nặng của tháng.
- **US-20.2** Given tôi chuyển tháng trước/sau, Then dữ liệu đúng khoảng ngày theo múi giờ người dùng (mục 8.3).
- **US-20.3** (P1) Given báo cáo, Then xuất ảnh/PDF hoặc CSV (có thể dời sau MVP — xem Q8).

**US-21 (P1) — Điểm nhấn (insights).** Given đủ dữ liệu ≥ 3 ngày, Then hiện tối đa 3 nhận xét dạng quy tắc cố định (VD "Natri trung bình vượt 2000 mg/ngày", "Protein đạt mục tiêu 5/7 ngày") — không phải lời khuyên y tế.

### Nhóm 8 — Công thức tự tạo

**US-22 (P0) — Tạo công thức.**
- **US-22.1** Given tôi chọn "Tạo công thức", When nhập tên, số khẩu phần (1–50, cho phép 0,5) và thêm ≥ 1 nguyên liệu (tìm từ CSDL + số lượng/đơn vị), Then lưu công thức.
- **US-22.2** Given công thức có nguyên liệu, Then hiển thị realtime tổng dinh dưỡng cả nồi và dinh dưỡng **mỗi khẩu phần** = tổng ÷ số khẩu phần (kcal, P, C, F, chất xơ, đường, natri).
- **US-22.3** Given công thức đã lưu, Then nó xuất hiện trong tìm kiếm/“Món của tôi” như một món với đơn vị "phần" (1 phần = tổng khối lượng ÷ số phần; tùy chọn nhập tổng khối lượng thành phẩm sau nấu để quy đổi gram).
- **US-22.4** Given tôi ghi 1,5 phần công thức vào bữa, Then FoodLog = 1,5 × dinh dưỡng/phần.
- **US-22.5** Given không có nguyên liệu hoặc số khẩu phần ≤ 0, When lưu, Then báo lỗi.

**US-23 (P0) — Sửa/xóa công thức.**
- **US-23.1** Given tôi sửa nguyên liệu/số phần, When lưu, Then dinh dưỡng/phần tính lại; FoodLog cũ giữ nguyên (snapshot).
- **US-23.2** Given tôi xóa công thức, Then FoodLog cũ vẫn hiển thị; công thức không còn trong tìm kiếm.
- **US-23.3** (P1) Given tôi bấm "Nhân bản công thức", Then tạo bản sao tên "… (bản sao)".
- **US-23.4** Công thức không cho chứa chính nó làm nguyên liệu (MVP: nguyên liệu chỉ là Food, không lồng công thức).

### Nhóm 9 — Nhắc nhở

**US-24 (P0) — Cấu hình nhắc nhở.**
- **US-24.1** Given tôi ở Cài đặt → Nhắc nhở, Then có hai loại: Nhắc uống nước (khoảng cách mỗi 1/2/3 giờ trong khung giờ bắt đầu–kết thúc) và Nhắc ghi bữa (giờ riêng cho Sáng/Trưa/Tối, mặc định 07:30/12:00/19:00), mỗi loại bật/tắt độc lập.
- **US-24.2** Given tôi đặt giờ/ngày trong tuần và lưu, Then cấu hình được lưu theo tài khoản và áp dụng theo múi giờ của tôi.
- **US-24.3** Given khung giờ kết thúc ≤ bắt đầu hoặc không chọn ngày nào, When lưu, Then báo lỗi.

**US-25 (P0) — Nhận nhắc nhở in-app.**
- **US-25.1** Given tôi đang mở app và đến giờ nhắc đang bật, Then hiện banner/toast in-app có hành động nhanh ("+250 ml" / "Ghi bữa trưa"), có thể đóng/hoãn 30 phút.
- **US-25.2** Given tôi đã ghi nước/bữa tương ứng trong 30 phút trước giờ nhắc, Then **không** hiện nhắc (không làm phiền thừa).
- **US-25.3** Given tắt nhắc, Then không còn banner nào của loại đó.

**US-26 (P1) — Web notification.**
- **US-26.1** Given tôi bật nhắc lần đầu cho kênh thông báo trình duyệt, When tôi bấm "Bật thông báo trình duyệt", Then app giải thích lý do **trước** rồi mới gọi yêu cầu quyền của trình duyệt (không xin quyền khi vừa vào trang).
- **US-26.2** Given quyền được cấp và tab/app đang chạy ở nền, When đến giờ nhắc, Then hiện web notification; bấm vào mở đúng màn hình hành động.
- **US-26.3** Given quyền bị từ chối/chặn, Then app hiện hướng dẫn mở lại quyền, vẫn dùng được nhắc in-app; trình duyệt không hỗ trợ Notification API thì ẩn tùy chọn.
- **US-26.4** Ghi chú kỹ thuật: web notification đáng tin cậy khi app đóng cần Push API + service worker (phụ thuộc trình duyệt/iOS cài PWA); MVP chấp nhận nhắc hoạt động khi tab/PWA còn chạy ở nền (xem Q5).

---

## 5. Công thức & quy tắc tính

### 5.1 BMR — Mifflin-St Jeor
Với w = cân nặng (kg), h = chiều cao (cm), a = tuổi (năm tròn):

- Nam: `BMR = 10·w + 6,25·h − 5·a + 5`
- Nữ: `BMR = 10·w + 6,25·h − 5·a − 161`
- Giới tính "Khác/không muốn nói": dùng trung bình hai hằng số: `… − 78` (hằng số = (5 − 161)/2); người dùng được thông báo đây là ước tính trung bình (Q2).

Tuổi tính từ ngày sinh theo ngày hiện tại (múi giờ người dùng). BMR giữ độ chính xác thập phân trong tính toán, chỉ làm tròn khi hiển thị (half-up về số nguyên).

### 5.2 TDEE — hệ số vận động
`TDEE = BMR × PAL`

| Mức | Mô tả hiển thị | PAL |
|---|---|---|
| Ít vận động | Công việc ngồi nhiều, ít/không tập | 1,2 |
| Vận động nhẹ | Tập nhẹ 1–3 buổi/tuần | 1,375 |
| Vận động vừa | Tập vừa 3–5 buổi/tuần | 1,55 |
| Vận động nhiều | Tập nặng 6–7 buổi/tuần | 1,725 |
| Rất nhiều | Lao động nặng/tập 2 lần mỗi ngày | 1,9 |

### 5.3 Quy đổi năng lượng
1 kg mô cơ thể ≈ 7700 kcal. Macro: protein 4 kcal/g, carb 4 kcal/g, fat 9 kcal/g.

### 5.4 Mục tiêu kcal theo mục tiêu cân nặng
| Mục tiêu | Tốc độ (chọn) | Điều chỉnh kcal/ngày | Mặc định |
|---|---|---|---|
| Giảm cân | 0,25 / 0,5 / 0,75 kg/tuần | −275 / −550 / −825 | 0,5 kg/tuần |
| Giữ cân | — | 0 | — |
| Tăng cân (tăng cơ) | 0,25 / 0,5 kg/tuần | +275 / +550 | 0,25 kg/tuần |

(Điều chỉnh = tốc độ kg/tuần × 7700 ÷ 7, làm tròn bội số 5.) Thâm hụt tối đa cho phép **không quá 25% TDEE** và không quá 1000 kcal/ngày; nếu vượt, tự hạ tốc độ xuống mức hợp lệ gần nhất và thông báo.

`Mục tiêu kcal = round(TDEE + điều chỉnh)` làm tròn bội số 10.

### 5.5 Giới hạn an toàn
- **Sàn kcal đề xuất:** nam ≥ **1500**, nữ ≥ **1200**, giới tính khác ≥ **1350**. Nếu `TDEE − thâm hụt` thấp hơn sàn → mục tiêu = sàn, hiển thị thông báo "Đã nâng lên mức tối thiểu an toàn" và giảm tốc độ hiển thị thực tế tương ứng.
- **Chỉnh tay:** < sàn → cảnh báo + xác nhận 2 lần; **< 800 kcal chặn hoàn toàn**.
- Không đề xuất tăng cân khi BMI ≥ 30; không đề xuất giảm cân khi BMI < 18,5 — hiển thị gợi ý chọn "Giữ cân" (người dùng vẫn có thể chọn, kèm cảnh báo).
- Mọi màn hình mục tiêu có dòng miễn trừ trách nhiệm không phải tư vấn y tế.

### 5.6 Macro P/C/F mặc định
- **Protein (g)** = hệ số × cân nặng: Giảm cân **1,8 g/kg**; Giữ cân **1,4 g/kg**; Tăng cân **1,8 g/kg**. Tối đa 35% kcal mục tiêu.
- **Fat (g)** = **27% kcal mục tiêu ÷ 9** (và không dưới 0,6 g/kg).
- **Carb (g)** = (kcal mục tiêu − 4·P − 9·F) ÷ 4, sàn **100 g**; nếu thiếu thì giảm protein về tối thiểu 1,2 g/kg rồi giảm fat tới 20%.
- Làm tròn gram nguyên; sau làm tròn kcal macro có thể lệch ≤ ±10 kcal so với mục tiêu (chấp nhận).
- *Ví dụ:* nữ 62 kg, mục tiêu 1500 kcal, giảm cân → P = 112 g (448 kcal), F = 45 g (405 kcal), C = (1500−448−405)/4 = 162 g.
- Chất xơ khuyến nghị 14 g / 1000 kcal (tối thiểu 25 g); đường bổ sung/tự do ≤ 10% kcal (tham chiếu WHO khuyến nghị; dữ liệu "đường" trong MVP là tổng đường); natri ≤ 2000 mg/ngày (tham chiếu WHO).

### 5.7 Mục tiêu nước
`ml = round50(35 × cân nặng kg)`, kẹp trong [1500, 4000]. Người dùng chỉnh tay [500, 6000].

### 5.8 Giá trị tham chiếu báo cáo
Natri 2000 mg/ngày; đường tổng tham chiếu hiển thị ≤ 50 g/ngày (≈10% của 2000 kcal; MVP lấy 10% mục tiêu kcal ÷ 4); chất xơ theo 5.6. Các giá trị cấu hình trong một file hằng số, không hard-code rải rác.

---

## 6. Yêu cầu phi chức năng (NFR)

| ID | Yêu cầu |
|---|---|
| NFR-01 | **Responsive:** thiết kế mobile-first; hỗ trợ viewport từ **360 px**; breakpoints: mobile 360–599, tablet 600–1023, desktop ≥ 1024. Không cuộn ngang ở mọi breakpoint. Mobile: điều hướng thanh tab dưới; desktop: sidebar. Vùng chạm ≥ 44×44 px. |
| NFR-02 | **Dark mode:** chế độ Sáng / Tối / Theo hệ thống (mặc định theo hệ thống), lưu lựa chọn; không nhấp nháy sai theme khi tải; mọi màu đạt tương phản ở cả hai theme; biểu đồ đọc được ở cả hai theme. |
| NFR-03 | **Khả năng truy cập WCAG 2.1 AA:** tương phản chữ ≥ 4,5:1 (chữ lớn/UI ≥ 3:1); điều khiển hoàn toàn bằng bàn phím với focus rõ; nhãn/ARIA cho form, vòng/thanh tiến độ (role=progressbar + giá trị chữ), biểu đồ có bảng thay thế; không truyền đạt thông tin chỉ bằng màu; tôn trọng `prefers-reduced-motion`; hỗ trợ zoom chữ 200%; lỗi form gắn với trường (aria-describedby). Kiểm thử bằng axe + kiểm tay trình đọc màn hình. |
| NFR-04 | **Ngôn ngữ & định dạng VN:** toàn bộ UI tiếng Việt; số thập phân dùng dấu phẩy ("62,5 kg"), ngăn nghìn dấu chấm ("2.150 kcal" / "2.150 ml"); ngày `dd/MM/yyyy`, thứ trong tuần "Thứ Hai … Chủ Nhật", tuần bắt đầu Thứ Hai; giờ 24h; chấp nhận nhập cả dấu chấm và phẩy. Dùng `Intl` với locale `vi-VN`. Lưu trữ nội bộ dạng chuẩn (số, ISO 8601). |
| NFR-05 | **Hiệu năng:** LCP ≤ 2,5 s trên 4G mô phỏng (mobile tầm trung); TTI ≤ 4 s; thêm/sửa/xóa log phản hồi UI lạc quan ≤ 100 ms; Dashboard tải ≤ 1 s sau khi có shell. |
| NFR-06 | **Tìm món:** p95 ≤ **300 ms** từ lúc gửi yêu cầu đến có kết quả (máy chủ, CSDL ~10.000 món), debounce 150 ms phía client; hỗ trợ tìm không dấu, sai chính tả nhẹ (prefix/trigram). |
| NFR-07 | **Bảo mật:** HTTPS bắt buộc; mật khẩu băm argon2id/bcrypt; phiên bằng cookie httpOnly + SameSite hoặc token ngắn hạn + refresh; chống CSRF/XSS/SQLi; rate limit đăng nhập & API; kiểm soát truy cập theo `user_id` ở mọi truy vấn (không xem được dữ liệu người khác); header bảo mật (CSP, HSTS); không log dữ liệu sức khỏe/PII ở mức thường; backup mã hóa. |
| NFR-08 | **Riêng tư dữ liệu sức khỏe:** chỉ thu thập dữ liệu cần thiết; chính sách quyền riêng tư và đồng ý rõ ràng khi đăng ký (hiểu rằng đây là dữ liệu nhạy cảm); xuất & xóa dữ liệu theo US-04; không chia sẻ/bán dữ liệu cho bên thứ ba; analytics ẩn danh, không gắn nội dung nhật ký; tuân thủ tinh thần Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (cần rà soát pháp lý — Q7). |
| NFR-09 | **Độ tin cậy:** mất kết nối → hiển thị trạng thái và không mất dữ liệu đang nhập; lỗi API hiển thị thông điệp tiếng Việt thân thiện kèm "Thử lại". Uptime mục tiêu 99,5%. |
| NFR-10 | **Trình duyệt hỗ trợ:** 2 phiên bản mới nhất của Chrome, Safari (iOS 16+), Edge, Firefox. |
| NFR-11 | **Chất lượng UX ("đẹp & dễ dùng"):** hệ thống thiết kế nhất quán (token màu/typography/spacing), trạng thái rỗng/đang tải (skeleton)/lỗi cho mọi màn hình, hoạt ảnh nhẹ, bố cục thoáng; người dùng mới hoàn thành nhiệm vụ ghi món đầu tiên không cần hướng dẫn (kiểm thử usability với ≥ 5 người, ≥ 80% thành công). |
| NFR-12 | **Kiểm thử được:** logic tính BMR/TDEE/macro/khẩu phần là hàm thuần có unit test với các ví dụ trong PRD; e2e cho luồng đăng ký → onboarding → ghi bữa → dashboard. |

---

## 7. Mô hình dữ liệu khái niệm

```
User 1─1 Profile
User 1─* FoodLog      FoodLog *─0..1 Food      FoodLog *─0..1 Recipe
User 1─* Food (custom, owner_id != null; Food hệ thống owner_id = null)
User 1─* Recipe 1─* RecipeIngredient *─1 Food
User 1─* WaterLog, WeightLog, Reminder
Food 1─* FoodServing (đơn vị quy đổi)
```

**User:** id, email (unique), password_hash, created_at, last_login_at, consent_at, timezone, theme_pref.

**Profile:** user_id, display_name, sex (male/female/other), birth_date, height_cm, weight_kg (hiện tại), activity_level, goal (lose/maintain/gain), goal_rate_kg_per_week, target_weight_kg (tùy chọn), calorie_target, protein_g, carb_g, fat_g, targets_mode (auto/custom), water_target_ml, targets_effective_from. *Lưu lịch sử mục tiêu* (`TargetHistory`: user_id, effective_from, kcal, P, C, F, water) để báo cáo quá khứ dùng đúng mục tiêu của ngày đó.

**Food:** id, owner_id (null = hệ thống), name, name_unaccented (chỉ mục tìm), brand/ghi chú (tùy chọn), category (VD "Món nước", "Cơm", "Rau"), is_vietnamese, base_unit = 100 g (mọi giá trị dinh dưỡng theo **100 g**), default_serving_id, deleted_at.
Trường dinh dưỡng tối thiểu (trên 100 g): `energy_kcal`, `protein_g`, `carb_g`, `fat_g` (bắt buộc), `fiber_g`, `sugar_g`, `sodium_mg` (bắt buộc với món hệ thống; tùy chọn với món người dùng, thiếu coi là 0 và gắn cờ "chưa có dữ liệu").
**FoodServing:** food_id, label ("bát", "đĩa", "tô", "cái", "ly", "muỗng canh", "lát", "g"), grams (quy đổi), is_default.

**FoodLog:** id, user_id, log_date (DATE theo múi giờ người dùng), meal (breakfast/lunch/dinner/snack), food_id (nullable), recipe_id (nullable), name_snapshot, quantity, serving_label, grams, và **snapshot dinh dưỡng**: kcal, protein_g, carb_g, fat_g, fiber_g, sugar_g, sodium_mg; source (search/recent/copy/quick), created_at, updated_at.

**Recipe:** id, user_id, name, servings (số phần), cooked_weight_g (tùy chọn), note, tổng dinh dưỡng được tính (cache) + per_serving. **RecipeIngredient:** recipe_id, food_id, quantity, serving_label, grams.

**WaterLog:** id, user_id, logged_at (timestamp), log_date, amount_ml.
**WeightLog:** id, user_id, log_date (unique cùng user), weight_kg, note.
**Reminder:** id, user_id, type (water/meal), meal (nullable), enabled, times (danh sách giờ HH:mm hoặc start/end + interval), days_of_week, channel (in_app, web_push), snooze_until.

---

## 8. Edge case & quy tắc nghiệp vụ

### 8.1 Khoảng giá trị hợp lệ
Tuổi 13–100 (MVP đề xuất cho người ≥ 18, xem Q1; 13–17 hiện cảnh báo); chiều cao 100–250 cm; cân nặng 20–300 kg; mức vận động bắt buộc chọn; khẩu phần 0,1–5000 g mỗi dòng; kcal một món 0–5000.

### 8.2 Đơn vị & làm tròn
- Lưu trữ nội bộ gram/ml/kg/kcal; chuyển đổi đơn vị tại lớp hiển thị. Món có đơn vị tự nhiên (bát…) quy ra gram bằng `FoodServing.grams`.
- Tính toán giữ số thực; **chỉ làm tròn khi hiển thị**, tổng được cộng từ giá trị chưa làm tròn rồi mới làm tròn (tránh sai lệch cộng dồn).
- Hiển thị: kcal và natri (mg) → số nguyên; macro/chất xơ/đường (g) → 1 chữ số thập phân (phần trăm hiển thị số nguyên); cân nặng → 1 chữ số thập phân; nước → số nguyên ml. Làm tròn half-up. Snapshot lưu 2 chữ số thập phân.
- Mục tiêu hiển thị cùng đơn vị với "đã ăn" để phép trừ nhìn thấy được nhất quán.

### 8.3 Ngày, múi giờ
- Mỗi người dùng có timezone (mặc định lấy từ trình duyệt, mặc định `Asia/Ho_Chi_Minh`, chỉnh được). "Ngày" của log = ngày theo múi giờ này; ngày đổi lúc **00:00** giờ địa phương.
- Đổi múi giờ không dịch chuyển các log cũ (log_date là DATE cố định).
- Cho phép ghi vào ngày quá khứ không giới hạn; ngày tương lai chỉ cho tối đa +1 ngày (xác nhận), tránh ghi nhầm.
- Tuần ISO: Thứ Hai–Chủ Nhật; tháng theo lịch.

### 8.4 Snapshot & nhất quán
FoodLog lưu snapshot dinh dưỡng; sửa/xóa Food/Recipe không đổi lịch sử. Món hệ thống không bị xóa cứng (soft delete). Báo cáo quá khứ dùng mục tiêu hiệu lực của ngày đó.

### 8.5 Ngày/dữ liệu trống & thiếu
- Ngày không có FoodLog → không tính vào trung bình báo cáo; hiển thị "Chưa có dữ liệu" thay vì 0.
- Ngày có ghi quá ít (< 50% mục tiêu kcal) → đánh dấu "có thể chưa ghi đủ" trong báo cáo (không loại khỏi trung bình).
- Thiếu dữ liệu natri/đường/xơ của một món → coi là 0 trong tổng nhưng báo "một số món chưa có dữ liệu natri" ở báo cáo.
- Cân nặng cách xa nhau: biểu đồ nối điểm hiện có, không nội suy.

### 8.6 Khác
- Trùng lặp: thêm cùng món nhiều lần trong một bữa tạo nhiều dòng (không gộp).
- Hai thiết bị chỉnh cùng lúc: "ghi sau thắng" theo `updated_at`; không mất log đã thêm.
- Kiểm soát nhập: số âm/chữ bị chặn, dán giá trị có đơn vị ("250ml") được phân tích hoặc báo lỗi rõ ràng.
- Vượt mục tiêu kcal không bị chặn ghi; không dùng ngôn ngữ chê trách/gây áp lực (đặc biệt vì nguy cơ rối loạn ăn uống — Q6).
- Mục tiêu nước/ kcal đổi chỉ áp dụng từ ngày hiệu lực trở đi.
- Nhắc nhở: không gửi giữa 22:00–06:00 trừ khi người dùng đặt rõ; hoãn tối đa 3 lần/lần nhắc.

---

## 9. Dữ liệu món ăn (seed)
- Nguồn đề xuất: Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng Quốc gia), USDA FoodData Central (nguyên liệu chung), bổ sung tay các món Việt chế biến sẵn có khẩu phần thực tế (tô phở, đĩa cơm tấm…). Mỗi món ghi nguồn & cờ độ tin cậy. Giấy phép dữ liệu cần xác nhận (Q4).
- Món hệ thống chỉ đọc; chất lượng dữ liệu được rà soát trước ra mắt (kcal khớp 4P+4C+9F trong ±15%).

---

## 10. Màn hình chính (tham chiếu cho thiết kế UI/UX)
Onboarding (5 bước) · Đăng nhập/Đăng ký · Hôm nay (Dashboard) · Nhật ký (theo bữa) · Tìm/Thêm món · Chi tiết món/khẩu phần · Tạo món/Tạo công thức · Nước · Cân nặng · Báo cáo (Tuần/Tháng) · Cài đặt (Hồ sơ, Mục tiêu, Nhắc nhở, Giao diện, Dữ liệu & riêng tư).
Điều hướng chính (mobile): Hôm nay · Nhật ký · (+ Thêm nhanh) · Báo cáo · Cá nhân.

---

## 11. Câu hỏi mở

| # | Câu hỏi | Giả định tạm thời trong PRD | Người quyết |
|---|---|---|---|
| Q1 | Độ tuổi tối thiểu? Xử lý người < 18 tuổi, phụ nữ mang thai/cho con bú? | Cho đăng ký từ 13 tuổi nhưng < 18 chỉ cảnh báo và không đề xuất giảm cân; không có chế độ thai kỳ. | Board/CPO |
| Q2 | Lựa chọn giới tính "Khác/không muốn nói" có cần không? | Có; dùng hằng số trung bình (−78). | CPO |
| Q3 | Chỉ đăng nhập email+mật khẩu hay thêm Google/Apple? | Chỉ email+mật khẩu trong MVP. | CPO/Board |
| Q4 | Nguồn & giấy phép CSDL món ăn (Viện Dinh dưỡng, USDA…) và ai chịu trách nhiệm chất lượng dữ liệu? | Seed ≥ 1000 mục từ nguồn mở + nhập tay; cần xác nhận pháp lý. | Board/Dev |
| Q5 | Web notification có cần hoạt động khi đóng hẳn app (Push API + server)? Hỗ trợ iOS PWA? | Chỉ khi tab/PWA còn chạy ở nền; push server để sau MVP (US-26 là P1). | CTO/Board |
| Q6 | Biện pháp giảm nguy cơ rối loạn ăn uống (ẩn cân nặng, không hiển thị "vượt", giới hạn thâm hụt)? | Dùng sàn kcal, ngôn ngữ trung tính, cho ẩn số liệu cân nặng. | CPO |
| Q7 | Yêu cầu pháp lý về dữ liệu sức khỏe (Nghị định 13/2023, lưu trữ dữ liệu trong nước)? | Nêu ở NFR-08; cần rà soát trước khi công khai. | Board |
| Q8 | Xuất báo cáo PDF/ảnh có thuộc MVP? | Không (P1, có thể dời). | CPO |
| Q9 | Vận động/tập luyện có cộng vào kcal còn lại không? | Không; chỉ dùng hệ số PAL (kcal đốt thêm ngoài MVP). | CPO |
| Q10 | Mục tiêu đường/natri dùng ngưỡng nào (WHO 2000 mg natri; Việt Nam khuyến nghị tương đương <5 g muối)? | WHO; có thể cá nhân hóa sau. | CPO |
| Q11 | Có cần theo dõi nhiều chỉ số cơ thể (vòng eo, % mỡ) không? | Không trong MVP. | CPO |
| Q12 | Tổng số món Việt tối thiểu khi ra mắt có đủ với 300 món? | 300 món Việt + 700 nguyên liệu. | CPO/Dev |

---

## 12. Truy vết nhóm tính năng → User story
| Nhóm | US |
|---|---|
| 1. Tài khoản & hồ sơ | US-01 – US-04 |
| 2. BMR/TDEE/macro | US-05 |
| 3. Nhật ký ăn uống | US-06 – US-12 |
| 4. Dashboard | US-13 |
| 5. Nước uống | US-14 – US-15 |
| 6. Cân nặng | US-16 – US-18 |
| 7. Báo cáo tuần/tháng | US-19 – US-21 |
| 8. Công thức | US-22 – US-23 |
| 9. Nhắc nhở | US-24 – US-26 |
