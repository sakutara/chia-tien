# Tasks

## 1. Tick đã chuyển theo khoản chuyển

- [x] 1.1 Khoá tick theo khoản `fromEntityId->toEntityId` và hàm `toggleTransferPaid`, `setTransfersPaid` (đã có từ commit `a144fd2`).
- [x] 1.2 Lưu `amount` lúc tick; khoản đổi số tiền thì tick cũ không còn hiệu lực (`computeMealSettlement`).
- [x] 1.3 Tiến độ theo khoản: `transferCount`, `paidTransferCount`, `isAllSettled` (đã có từ commit `a144fd2`).
- [x] 1.4 Thẻ bữa đang hoạt động đếm theo khoản chuyển; thẻ bữa đã lưu trữ lấy từ `archivedSummary.transfers` (`summarizeMeal`).
- [x] 1.5 Điều kiện lưu trữ kiểm khoản chuyển chưa tick (`checkArchiveEligibility`).
- [x] 1.6 Ẩn nút QR cho khoản đã chuyển (`TransferInstructionList`, commit `ae13221`).
- [x] 1.7 Đổi nhãn "Ứng" thành "Ứng trước" ở khối thực thể và khối giải trình (commit `ae13221`).

## 2. Nhóm lưu sẵn trong danh bạ

- [x] 2.1 Thêm `Member.groupMemberIds` và `PaymentGroup.contactId` (commit `ae13221`).
- [x] 2.2 `saveGroupContact` khi tạo và sửa nhóm; tên trùng với cá nhân thì không lưu hồ sơ.
- [x] 2.3 `addGroupContactToMeal`: thêm nhóm từ danh bạ vào bữa như một cá nhân.
- [x] 2.4 `getOrCreateMember` bỏ qua hồ sơ nhóm khi tìm trùng tên cá nhân.
- [x] 2.5 Biểu tượng nhóm trong danh bạ (`MemberQuickFilter`).
- [x] 2.6 Tài khoản nhận của nhóm lấy từ thành viên đầu tiên có thông tin ngân hàng (`resolveRecipient`, commit `ae13221`; thuộc `payment-sharing-snapshot`).

## 3. Kèo

- [x] 3.1 Nút "Thêm hoá đơn nhanh" trên kèo chưa có chi phí (`SessionCard`, commit `ae13221`).
- [x] 3.2 Tự đổi tên kèo theo quán khi tên kèo còn dạng mặc định (đối chiếu với Epic 4 BR-4.10; không lệch).
- [x] 3.3 Sắp xếp kèo bằng `moveSession` (tài liệu ghi là `reorder`; chỉ khác tên).

## 4. Việc còn lại

- [ ] 4.1 Xác nhận khi bỏ người có khoản tick của nhóm: code chỉ kiểm khoá của chính người đó (`MemberList.requestRemove`), chưa kiểm khoá của nhóm. Spec `Xác nhận trước khi xoá trạng thái đã thanh toán` yêu cầu hỏi trong trường hợp này.
- [ ] 4.2 Kiểm giao diện ở 375 px cho khu vực quyết toán (theo `documentation/epic-6/SA.md` B.10, chưa thực hiện).
- [ ] 4.3 Test cho cảnh báo món chưa gán và mở giải trình từ màn hình bữa (theo `documentation/epic-6/SA.md` B.10, chưa thực hiện).
