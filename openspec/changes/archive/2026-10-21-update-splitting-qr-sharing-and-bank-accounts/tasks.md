# Tasks

## 1. Tài khoản ngân hàng và danh bạ

- [x] 1.1 Lưu tài khoản ngân hàng (ngân hàng, tên chủ, số tài khoản) vào `Member.bank`. Có từ bản khởi tạo `a144fd2` (`MemberBankDialog`, `updateMemberBank`).
- [x] 1.2 Chọn ngân hàng theo BIN, tìm không dấu. Có từ `a144fd2` (`domain/banks.ts`, `BankSelect`).
- [x] 1.3 Hồ sơ "Tôi" dùng cùng cách nhập tài khoản (`MyProfileDialog`). Có từ `a144fd2`.
- [x] 1.4 Lưu nhóm thanh toán vào danh bạ như hồ sơ có `groupMemberIds`, và thêm nhóm vào bữa khác (`ae13221`).
- [ ] 1.5 Sửa thông báo lỗi số tài khoản để khớp regex cho phép chữ cái. Chưa làm: thông báo trong `services/memberService.ts` và `i18n/en.ts` vẫn ghi "chữ số".

## 2. Chia sẻ, QR và slide thanh toán

- [x] 2.1 Slide thanh toán và mã VietQR. Có từ `a144fd2` (`domain/vietQr.ts`, `domain/paymentSlides.ts`, `PaymentSlides.tsx`).
- [x] 2.2 Chế độ "Gửi QR" xuất ảnh PNG trong hộp thoại chia sẻ (`f5261e5`, `lib/paymentImage.ts`).
- [x] 2.3 Nút QR ở từng khoản chuyển trong mục quyết toán, không hiện cho khoản đã tick (`f5261e5`, `ae13221`).
- [x] 2.4 Bỏ tuỳ chọn "Chỉ khoản chưa trả" trong hộp thoại chia sẻ (`f5261e5`).
- [x] 2.5 Gửi nhanh chỉ còn Facebook và Zalo, gửi kèm link (`f5261e5`).
- [x] 2.6 Tài khoản nhận của nhóm lấy từ thành viên đầu tiên có thông tin ngân hàng, không dùng đại diện nhóm (`ae13221`).
- [x] 2.7 Nút "Thanh toán bằng ngân hàng" trong link Snapshot (`a8824ca`).

## 3. Deep link app ngân hàng

- [x] 3.1 Deep link cho MB, VietinBank, BIDV, ACB (`d7c1f71`).
- [x] 3.2 Mở rộng bảng app theo danh sách VietQR (`b8d8e4c`).
- [x] 3.3 Tham số `ba` dùng mã ngân hàng VietQR thay vì BIN (`6d86082`).
- [ ] 3.4 Kiểm tra trên thiết bị thật. Chưa xác định được từ lịch sử đã làm việc này chưa. Tài liệu Epic 8 (`documentation/epic-8/BR.md`, đầu file) ghi việc kiểm thủ công trên thiết bị thật là việc còn lại trước khi đóng.

## 4. Chia tiền từng món

- [x] 4.1 Tự gán cả kèo cho món chưa có người ăn khi tạo hoá đơn `BY_ITEM` (`ae13221`, `invoiceService.ts`).
- [x] 4.2 Tự gán cho món trống khi chuyển sang `BY_ITEM` và khi lưu hoá đơn `BY_ITEM` (`ae13221`).
- [x] 4.3 Giữ nút "Gán cả kèo cho các món trống" và cảnh báo món chưa chọn người ăn (`InvoiceCard.tsx`, có từ `a144fd2`).

## 5. Ghi nhận chỗ lệch

- [x] 5.1 Ghi nhận chỗ lệch về cách làm tròn (02, mục 1.2) trong `design.md`. Không sửa code, không sửa tài liệu.
