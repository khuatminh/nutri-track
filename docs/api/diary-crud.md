# Hợp đồng CRUD nhật ký — QLD-41

Theo quyết định Tech Lead tại interaction `34b0dd33-5664-4efd-abe4-61db42c131c5`.
Các action xuất từ `src/app/(app)/actions.ts`, xác thực bằng session, không nhận userId từ client.

| Action | Input | Thành công |
| --- | --- | --- |
| updateLogAction | `(id, {quantity?, servingId?: string hoặc null, meal?, date?})` | `{ok:true, log:LogDto}` |
| deleteMealAction | `({date, meal})` | `{ok:true, removed:LogDto[]}` |
| restoreMealAction | `(LogDto[])` | `{ok:true, logs:LogDto[]}` |
| createFoodAction / updateFoodAction | `(input)` / `(id,input)` theo customFoodSchema, dinh dưỡng trên 100 g | `{ok:true, food:FoodHit, warnKcalMismatch:boolean}` |
| deleteFoodAction | `(id)` | `{ok:true}` |
| listMyFoodsAction | `()` | `FoodHit[]` |
| listWeightsAction | `()` | `WeightDto[]`, ngày mới nhất trước |
| updateWeightAction | `(id,{date,weightKg,note?})` | `{ok:true, log:WeightDto}` |
| deleteWeightAction | `(id)` | `{ok:true, removed:WeightDto}` |
| saveWeightAction | `(input, overwrite?)` | `{ok:true, log:WeightDto, replaced:boolean}` |

Lỗi action: `{ok:false, code:string, message:string}` với thông báo tiếng Việt; giữ `error` tương thích client cũ, cùng `fields?`, `needsConfirm?` khi có. Lỗi đọc danh sách cũng trả đối tượng lỗi trên. Không đưa exception DB ra client. Mã lỗi: VALIDATION_ERROR, NOT_FOUND, CONFLICT, UNAUTHENTICATED, INTERNAL_ERROR.

`servingId:null` chuyển về gram; bỏ servingId giữ đơn vị đang ghi. Chỉ đổi ngày/bữa giữ snapshot. Sửa khẩu phần lấy nguồn hiện tại nếu còn; nguồn đã xóa thì scale snapshot và kiểm tra giới hạn 0,1–5.000 g. Di chuyển log cập nhật tổng cả hai ngày qua truy vấn lại và revalidate.

Xóa bữa chỉ tác động đúng ngày/bữa của chủ session, trả snapshot đã xóa. Khôi phục cả bữa nguyên tử, theo cơ chế DTO của restoreLog, chủ luôn là session. UI quản lý cửa sổ undo 5 giây như xóa từng dòng.

Món tự tạo chỉ chủ được sửa/xóa/liệt kê; xóa mềm, biến mất khỏi tìm kiếm, log cũ giữ snapshot. Cảnh báo lệch kcal >20% theo 4P+4C+9F vẫn cho lưu.

Cân nặng 20–300 kg, ngày không ở tương lai. Sửa theo ID kiểm tra chủ; ngày đích đã có bản ghi khác trả CONFLICT + needsConfirm, không thay đổi bản ghi nào. Ghi đè dùng saveWeightAction với overwrite sau xác nhận. Mutation revalidate dashboard, nhật ký, báo cáo và biểu đồ; không tự đổi mục tiêu dinh dưỡng.
