# Chặn mục tiêu giảm cân cho người dưới 18 tuổi (QLD-40)

Hợp đồng được Tech Lead chốt qua interaction `2c1ab6c9-2437-4e2d-a586-2d1ed19fedec`, tham chiếu PRD US-05.8. FE1 dùng trong QLD-46.

## Tính mục tiêu

`computeTargets` nhận `birthDate` và `today` dạng ngày ISO. Caller truyền ngày hiện tại theo timezone người dùng (`todayIn`, mặc định `Asia/Ho_Chi_Minh`). Tuổi là số năm tròn: đúng sinh nhật 18 được phép giảm cân; trước đó một ngày vẫn bị chặn.

Khi tuổi <18 và `goal="lose"`, kết quả có `weightLossBlocked: true`, `suggestedGoal: "maintain"`, `calories.kcal` bằng chính xác TDEE (không làm tròn xuống), `adjustment=0`, `effectiveRateKgPerWeek=0`, macro theo giữ cân. UI phải hiển thị cảnh báo tham khảo chuyên gia và gợi ý chọn giữ cân. Trường hợp khác có `weightLossBlocked: false`, `suggestedGoal` bằng goal đầu vào; cách tính cũ giữ nguyên.

## Lưu hồ sơ / onboarding

`saveProfile` kiểm tra dữ liệu đã qua schema theo ngày hiện tại ở timezone người dùng. Với người dưới 18 và `goal="lose"`, từ chối trước mọi truy vấn/ghi DB, cả tạo mới, sửa hồ sơ auto và sửa hồ sơ custom. Không tự đổi goal hoặc lưu mục tiêu giữ cân; người dùng phải chọn lại rồi gửi yêu cầu mới.

```json
{
  "ok": false,
  "code": "UNDERAGE_WEIGHT_LOSS_BLOCKED",
  "weightLossBlocked": true,
  "suggestedGoal": "maintain",
  "error": "Người dưới 18 tuổi không được chọn mục tiêu giảm cân. Bạn nên chọn giữ cân và tham khảo chuyên gia dinh dưỡng.",
  "message": "Người dưới 18 tuổi không được chọn mục tiêu giảm cân. Bạn nên chọn giữ cân và tham khảo chuyên gia dinh dưỡng.",
  "fields": {
    "goal": "Người dưới 18 tuổi không được chọn mục tiêu giảm cân. Bạn nên chọn giữ cân và tham khảo chuyên gia dinh dưỡng."
  }
}
```

`error` giữ tương thích với caller hiện tại; `message` là cảnh báo theo hợp đồng mới. `saveProfileAction` chuyển nguyên kết quả service. FE1 kiểm tra `!result.ok` và `"code" in result` trước khi đọc mã lỗi. Xử lý lỗi schema khác giữ nguyên. Không có migration DB.
