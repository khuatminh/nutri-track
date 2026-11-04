# Truy vết US Must-have (P0) → hiện thực (QLD-19)

Trạng thái: ✅ đã làm + có test/chạy thử · 🟡 làm một phần · ⬜ chưa làm. Tất cả service ở `src/server/*` có test tích hợp DB (`*.int.test.ts`); UI được chạy thử bằng trình duyệt thật (ảnh ở `docs/screenshots/app/`) nhưng **chưa có e2e tự động chạy xanh** (cần QA, QLD-4).

| US | Route / component | Service / logic | TT |
|---|---|---|---|
| 01 Đăng ký | `/dang-ky` `components/auth/forms.tsx` | `server/auth/service.register`, argon2id | ✅ |
| 02 Đăng nhập/xuất/quên MK, khoá 5 lần | `/dang-nhap` `/quen-mat-khau` `/dat-lai-mat-khau`, nút Đăng xuất ở `/ho-so` | `auth/service`, `tokens.lockoutRemainingMs`, Mailpit | ✅ |
| 03 Onboarding & hồ sơ | `/onboarding` `components/onboarding/wizard.tsx`; `/ho-so` `ProfileForm` | `profile/service.saveProfile` | ✅ |
| 04 Đổi MK / xuất / xoá (P1) | `/ho-so` `AccountCard`, `/api/export` | `changePassword` (revoke phiên khác), `deleteAccount` | ✅ |
| 05 Mục tiêu kcal/macro | wizard bước 3; `/ho-so` `TargetsCard` | `lib/nutrition/targets.ts`, `setCustomTargets` (sàn, chặn <800) | ✅ (05.8 cảnh báo <18 tuổi: có ở onboarding) |
| 06 Tìm & thêm món (không dấu) | `/nhat-ky/them` `AddFood` | `/api/foods/search`, `foods/search.ts` (pg_trgm) | ✅ |
| 07 Chọn khẩu phần | sheet trong `AddFood` | `food-log.addLog` (snapshot) | ✅ |
| 08 Sửa/xoá nhật ký + hoàn tác | `/nhat-ky` `MealCard` | `updateLog/deleteLog/restoreLog` | ✅ |
| 09 Món tự tạo | `AddFood` → "Tạo món mới" | `foods/custom.ts` | ✅ (sửa/xoá món của tôi: service có, UI chưa) |
| 10 Gần đây & hay dùng | tab trong `AddFood` | `recentFoods`, `frequentFoods` | ✅ |
| 11 Sao chép bữa | `MealCard` "Sao chép từ hôm qua" | `copyMeal` (11.4 sao chép cả ngày: service có, UI chưa) | 🟡 |
| 13 Dashboard | `/hom-nay` | `dashboard/service` | ✅ (13.8 cảnh báo ngày tương lai ở bước ghi) |
| 14 Mục tiêu nước | `/hom-nay` WaterCard, `/ho-so` | `waterTarget`, custom 500–6000 | ✅ |
| 15 Ghi nước | `components/dashboard/water-card.tsx` | `water/service` | ✅ (15.5 chai yêu thích P1: chưa) |
| 16 Ghi cân nặng | `/can-nang` `WeightForm` | `weight/service.saveWeight` | ✅ |
| 17 Biểu đồ xu hướng | `/can-nang` `WeightChartView` (+ bảng) | `getWeightChart`, `weightTrend` | ✅ |
| 18 Cập nhật TDEE theo cân nặng | `RetargetPrompt` ở `/hom-nay` | `getRetargetSuggestion/accept/dismiss` | ✅ |
| 19 Báo cáo tuần | `/bao-cao?view=week` + `KcalChart` | `reports/service`, `summarizePeriod` | ✅ |
| 20 Báo cáo tháng | `/bao-cao?view=month` | như trên (20.3 xuất: chưa, P1) | ✅ |
| 22 Tạo công thức | `/cong-thuc/moi` `RecipeEditor` | `recipes/service`, `recipeNutrition` | ✅ |
| 23 Sửa/xoá/nhân bản | `/cong-thuc` `RecipeList`, `/cong-thuc/[id]` | `updateRecipe/deleteRecipe/duplicateRecipe` | ✅ |
| 24 Cấu hình nhắc nhở | `/ho-so` `RemindersCard` | `reminders/service` (validate US-24.3) | ✅ |
| 25 Nhắc in-app | `components/reminders/runner.tsx` | `lib/reminders.ts` (test) | ✅ (chưa kiểm thử thời gian thực bằng tay) |
| 26 Web notification (P1) | `RemindersCard` (giải thích trước khi xin quyền) | `Notification` API | 🟡 |
| 12, 21 (P1) | Ghi nhanh calo ✅ (`AddFood`); Insights ⬜ | `addQuickLog` | 🟡 |

**Chưa kiểm chứng:** Lighthouse/axe, kiểm tay trình đọc màn hình, e2e tự động, hiệu năng p95 tìm món trên 10.000 món (đã đo < 300 ms trên 289 món).
