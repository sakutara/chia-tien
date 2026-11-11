# Tasks

## 1. US-2.1 Danh bạ thành viên toàn cục
- [x] 1.1 Chuẩn hoá tên nhập và viết hoa chữ cái đầu mỗi từ (`cleanName`, `formatMemberName`, `hasDiacritics`, `MEMBER_NAME_MAX`), có test trong `normalize.test.ts` (SA mục B.9).
- [x] 1.2 Tạo, tìm và tái dùng người theo tên hiển thị; cấp khoá `normalizedName` không trùng bằng hậu tố số; đổi tên và cấp lại khoá; lỗi `DUPLICATE_NAME` (`memberService.test.ts`, SA mục B.9).
- [x] 1.3 Tự động lưu người vào danh bạ khi thêm vào bữa, không thêm trùng, từ chối bữa `ARCHIVED` (`mealPeopleService.test.ts`, SA mục B.9).
- [x] 1.4 Dữ liệu còn sau khi đóng và mở lại cơ sở dữ liệu (AC-4, `memberService.test.ts`).
- [ ] 1.5 Kiểm thủ công AC-4 bằng F5 trên trình duyệt. Chưa làm: SA mục B.9 và B.10 ghi chưa kiểm F5.

## 2. US-2.2 Quick Filter chọn người
- [x] 2.1 Hàm thuần `sortMembers`, `filterMembers`, `findExactMatch`, `findDiacriticVariants`, `allocateKey`, `decideEnter` trong `domain/memberFilter.ts`, có test cho từng nhánh của R-6 (SA mục B.9).
- [x] 2.2 Component `MemberQuickFilter` (combobox ARIA, phím mũi tên, `Enter`, "+ Thêm người mới", "Đã tham gia") có test.
- [x] 2.3 Phím `Enter` đang chốt ký tự của bộ gõ tiếng Việt (IME) không tạo người; có test (SA mục B.10, mục 3b).
- [ ] 2.4 Giữ focus ở ô lọc sau khi thêm để thêm liên tiếp. Chưa làm: SA mục B.10 mục 3 ghi UI §4.3 muốn nhưng chưa làm, và B.9 ghi chưa kiểm.
- [ ] 2.5 Kiểm thủ công bằng bàn phím thuần và trên màn hình hẹp (từ 375 px). Chưa làm (SA mục B.9, B.10 mục 1).
- [x] 2.6 Kiểm thủ công trên dev server (Chrome): gõ `Thảo` và `Enter` tạo người; gõ lại `Thảo` báo "Đã tham gia" (SA mục B.9, đạt một phần).

## 3. US-2.3 Hồ sơ "Tôi" và Người chủ trì
- [x] 3.1 `setHost` chỉ nhận người đã tham gia (`NOT_PARTICIPANT`); đổi chủ trì ở bữa này không đổi bữa khác (AC-6); `initMealPeople` trả về chủ app làm chủ trì mặc định.
- [x] 3.2 Đổi tên hồ sơ chủ app vẫn giữ `isDefaultHost` (`memberService.test.ts`).
- [x] 3.3 Component `HostSelector` chỉ liệt kê người đã tham gia; chọn ghi vào cơ sở dữ liệu; khoá khi chỉ đọc; có test.
- [x] 3.4 Kiểm thủ công: đổi chủ trì sang `Bình` cập nhật huy hiệu chủ trì (SA mục B.9).

## 4. US-2.4 Nhóm thanh toán
- [x] 4.1 Hàm thuần trong `domain/paymentGroupRules.ts`: tên mặc định, kiểm nhóm dưới 2 người, không trùng, không phải người tham gia, người đã ở nhóm khác (AC-3), co nhóm, đổi đại diện, tự giải tán (AC-7); có test.
- [x] 4.2 `mealPeopleService`: tạo, sửa thành phần, giải tán nhóm; xoá khoá `settlementStatuses` theo R-13; có test.
- [x] 4.3 Component `PaymentGroupDialog`: người ở nhóm khác bị vô hiệu hoá kèm tên nhóm; tạo nhóm ghi đúng thành viên và tên mặc định; không cho lưu khi chưa đủ 2 người; có test.
- [x] 4.4 Kiểm thủ công: tạo nhóm `Cường + Dung` hiện trong danh sách (SA mục B.9).
- [ ] 4.5 Kiểm thủ công sửa và giải tán nhóm. Chưa thực hiện đầy đủ (SA mục B.10, mục 1).

## 5. Kiểm thử tổng thể
- [x] 5.1 `npm run build` đạt (SA mục B.9).
- [x] 5.2 `npm run lint` đạt, không có cảnh báo (SA mục B.9).
- [x] 5.3 `npm test` toàn bộ đạt 102 test, trong đó Epic 2 có 92 test (SA mục B.9).
- [ ] 5.4 Kiểm thủ công đầy đủ màn hình thử với AC-1 đến AC-9. Chưa thực hiện đầy đủ (SA mục B.9).
- [ ] 5.5 Kiểm thủ công AC-9 trên bữa thật đã lưu trữ. Tài liệu ghi cần Epic 3 để tạo bữa lưu trữ; không có ghi nhận đã làm trong SA (SA mục B.10, mục 1).
- [ ] 5.6 Kiểm thử thứ tự `Intl.Collator('vi')` trên Safari và Firefox. Chưa làm: mới kiểm trên Node (SA mục B.8).

## 6. Bàn giao và cập nhật tài liệu
- [ ] 6.1 Ghi chú sang Epic 1 BR R-4: `normalizedName` là khoá duy nhất có hậu tố số. Chưa làm (SA mục B.8, B.10 mục 4).
- [ ] 6.2 Đánh dấu các AC đã kiểm chứng trong BR. Chưa làm: các mục AC trong BR vẫn để trống (SA mục B.10, mục 5).
- [x] 6.3 Thay `PeopleSandbox` bằng màn bữa thật và nhúng ba khối người, chủ trì, nhóm. Ghi chú trong SA mục B.2: `PeopleSandbox` đã bị xoá ở Epic 3 và thay bằng `MealWorkspacePage`.
- [ ] 6.4 Bàn giao cho Epic 4 và Epic 5: kiểm lại `MEMBER_IN_USE` với dữ liệu thật, đủ ba nhánh `payer`, `consumer`, `equalSplit`. Chưa làm; không xác định được từ tài liệu (SA mục B.10, mục 7).
- [ ] 6.5 Bàn giao cho Epic 6: dùng cùng quy ước khoá `settlementStatuses` (memberId cho người lẻ, groupId cho nhóm). Tài liệu không ghi trạng thái; không xác định được từ lịch sử (SA mục B.10, mục 8).
