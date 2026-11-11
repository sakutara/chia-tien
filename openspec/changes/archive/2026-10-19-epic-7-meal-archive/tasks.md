# Tasks

## 1. Kiểm tra điều kiện lưu trữ (US-7.1)
- [x] 1.1 Viết hàm thuần `checkArchiveEligibility` trong `domain/archiveRules.ts` theo R-1 (BR-7.1)
- [x] 1.2 Unit test `archiveRules.test.ts` cho các trường hợp `NO_COST`, `UNASSIGNED_ITEMS`, `UNPAID_ENTITIES` kèm tên thực thể, và cho phép khi đủ điều kiện (AC-1)
- [x] 1.3 Thêm mã lỗi `ARCHIVE_EMPTY_MEAL`, `ARCHIVE_UNASSIGNED_ITEMS`, `ARCHIVE_UNPAID_ENTITIES` vào `services/peopleErrors.ts` (SA mục B.6)
- [x] 1.4 Test `archiveService.test.ts` xác nhận `archiveMeal` ném đúng mã `ARCHIVE_*` (AC-1)
- [x] 1.5 Component `ArchiveMealAction` hiển thị nút "Lưu trữ bữa" và lý do khoá, có test `ArchiveMealAction.test.tsx` (AC-1)

## 2. Thực thi lưu trữ (US-7.2)
- [x] 2.1 Viết `buildArchivedPayload` đóng gói `archivedSummary` và `SessionKeo.archived*` theo R-2, R-3, kèm unit test trong `archiveRules.test.ts`
- [x] 2.2 Viết `getArchivePreview` và `archiveMeal` theo R-4, gồm xoá file OPFS, `invoice_files`, `invoices` và chuyển `status` sang `ARCHIVED` (BR-7.3)
- [x] 2.3 Test `archiveService.test.ts` xác nhận xoá sạch `invoices` và `invoice_files` của bữa, giữ nguyên bữa khác, cập nhật kèo (AC-2)
- [x] 2.4 Giữ lại `items` sau khi lưu trữ, theo US-7.2 và AC-2. Lưu ý: BR-7.3 bước 3 và R-4 bước 3 ghi xoá `items`, chưa thống nhất với US-7.2 (xem proposal, mục "Chỗ tài liệu chưa thống nhất")
- [x] 2.5 Hộp xác nhận `ArchiveMealDialog` với nút Huỷ focus mặc định, có số hoá đơn, món và file ảnh được kiểm trong `ArchiveMealAction.test.tsx` (AC-4)
- [ ] 2.6 Kiểm thử hiển thị tổng dung lượng giải phóng trong `ArchiveMealDialog` (AC-4). Ghi chú: tài liệu ghi dung lượng chưa có test. SA đặt tên file test là `ArchiveMealDialog.test.tsx` nhưng code hiện không có file này
- [ ] 2.7 Kiểm chứng `getTotalStorageBytes()` giảm đúng bằng tổng `sizeBytes` của ảnh bữa vừa lưu trữ (SA mục B.7). Ghi chú: tài liệu không ghi nhận kiểm thử cho mục này

## 3. Giao diện bữa đã lưu trữ chỉ đọc (US-7.3)
- [x] 3.1 Mọi service ghi dữ liệu (`mealService`, `mealPeopleService`, `sessionService`, `invoiceService`, `settlementService`, `archiveService`) từ chối bữa `ARCHIVED` với mã `MEAL_ARCHIVED` (R-5), có test trong `archiveService.test.ts`
- [x] 3.2 Hiển thị tóm tắt kèo đã chốt trong `SessionCard` khi bữa `ARCHIVED`: số hoá đơn, người đã ứng, tổng kèo; `SessionsPanel` truyền `archivedSummary` xuống (R-6)
- [x] 3.3 Giao diện chỉ đọc: khoá thao tác chỉnh sửa, ẩn nút chia sẻ và link Snapshot, hiển thị nhãn "Đã lưu trữ" (BR-7.4, AC-2). Ghi chú: AC-5 ghi "banner", BR-7.4 ghi không hiện banner; việc triển khai theo BR-7.4 (xem proposal)
- [x] 3.4 Test `MealWorkspacePage.test.tsx` xác nhận bữa đã lưu trữ hiện các món được giữ và không có nút chia sẻ (AC-2)
- [ ] 3.5 Test component cho tóm tắt kèo đã chốt trong `SessionCard` (AC-5). Ghi chú: tài liệu ghi "chưa có test component riêng" (SA mục B.10, việc 3)
- [ ] 3.6 Kiểm trình duyệt: danh sách bữa ở cả ba chế độ xem (Lịch, Danh sách, Theo Loại) hiển thị huy hiệu "Đã lưu trữ" sau khi lưu trữ, giữ tổng chi phí và tiến độ thanh toán, và tab "Đã lưu trữ" ở chế độ Theo Loại (AC-6). Ghi chú: tài liệu ghi chưa thực hiện (SA mục B.10, việc 1)

## 4. Xoá vĩnh viễn bữa đã lưu trữ (US-7.4)
- [x] 4.1 `deleteMeal` xoá được bữa `ARCHIVED`, kiểm tra IndexedDB không còn `meal` và `sessions` của bữa đó (AC-3, R-7), có test trong `archiveService.test.ts`
- [ ] 4.2 Test `MealWorkspacePage.test.tsx` và `MealsPage.test.tsx` cho luồng xoá bữa vừa lưu trữ qua giao diện (BR-7.5). Ghi chú: SA mục B.9 nêu đây là bài kiểm thử dự kiến, còn trạng thái "Đạt" chỉ ghi `archiveService.test` (xem 4.1)

## 5. Phi chức năng và đóng Epic (AC-7)
- [ ] 5.1 Kiểm trình duyệt ở màn hình 375 px cho màn bữa đã lưu trữ (AC-7). Ghi chú: tài liệu ghi chưa thực hiện (SA mục B.10, việc 2)
- [ ] 5.2 Kiểm nút chạm tối thiểu 44 px và điều khiển bằng bàn phím cho luồng lưu trữ (AC-7). Ghi chú: tài liệu không ghi nhận kết quả kiểm
- [x] 5.3 Hồi quy: toàn bộ test Epic 1 đến Epic 6 đạt (ghi chú của AC-7 trong BR)
- [ ] 5.4 Kiểm thủ công trên trình duyệt trước khi đóng Epic (trạng thái trong BR và SA). Ghi chú: gồm các việc 3.6 và 5.1 ở trên
