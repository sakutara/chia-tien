## 1. Khoá zoom trang (commit c685d38)

- [x] 1.1 Thêm `minimum-scale=1.0, maximum-scale=1.0, user-scalable=no` vào thẻ meta viewport trong `app/index.html`
- [x] 1.2 Đặt `touch-action: pan-x pan-y` và `-webkit-text-size-adjust: 100%` cho `html` trong `app/src/index.css`
- [x] 1.3 Chặn sự kiện `gesturestart`, `gesturechange`, `gestureend`, chạm đúp trong 300 ms, và lăn chuột khi giữ Ctrl trong `app/src/main.tsx`

## 2. Bố cục hàng món trong form hoá đơn (commit 199d9cc)

- [x] 2.1 Đưa tên món và nút xoá lên cùng một hàng, ô tên co giãn theo chiều ngang
- [x] 2.2 Hàng thứ hai dạng `[đơn giá] × [SL] = [thành tiền]`, ô thành tiền co giãn để hàng đầy chiều ngang

## 3. Ghi lại các chỗ lệch với thiết kế gốc (không đổi code)

- [x] 3.1 Chủ trì bữa dùng ô chọn thả xuống `HostSelector`, không phải nhóm radio (có từ commit đầu tiên `a144fd2`)
- [x] 3.2 Thành phần người trong bữa gộp vào `MemberList.tsx`; không có `ParticipantList.tsx` hay `PaymentGroupPanel.tsx` trong git (có từ `a144fd2`)
- [x] 3.3 Hộp nhóm thanh toán ẩn người đã ở nhóm khác, không có ô chọn đại diện (có từ `a144fd2`)
- [x] 3.4 Xác nhận thao tác phá huỷ dùng `ConfirmDialog`, không dùng `window.confirm` (có từ `a144fd2`)
- [x] 3.5 Người tham gia kèo chọn tại chỗ trong `SessionCard` bằng `PeoplePicker` (có từ `a144fd2`)
- [x] 3.6 Mọi kèo thu gọn mặc định, không tự mở kèo mới (có từ `a144fd2`)
- [x] 3.7 Bỏ người đang được dùng khỏi kèo trả lỗi `SESSION_MEMBER_IN_USE`, khớp tài liệu (có từ `a144fd2`)
- [x] 3.8 Sửa món tại chỗ bằng Popover trong `InvoiceItemRow`, không có hộp thoại `ItemInlineFormDialog` (Popover có từ `a144fd2`)
- [x] 3.9 Chia đều dùng `PeoplePicker` chế độ nhiều lựa chọn có nút "Chọn tất cả" (có từ `a144fd2`)
- [x] 3.10 Sửa tên, ngày, ghi chú bữa tại chỗ bằng `InlineText`, không có nút "Sửa thông tin" (có từ `a144fd2`; tài liệu BR-3.9 và tài liệu 03 mâu thuẫn nhau)
- [x] 3.11 Đường dẫn sai định dạng đưa về danh sách bữa, không dùng trạng thái `notFound` (có từ `a144fd2`)
- [x] 3.12 Lưới lịch có số hàng theo ngày thực tế, từ 4 đến 6 (có từ `a144fd2`)
- [x] 3.13 Nút "Xoá ảnh trùng" xoá ngay không hỏi xác nhận (có từ `a144fd2`)
- [ ] 3.14 Viết test component cho `ItemInlineFormDialog` và khoá chỉ đọc khi bữa lưu trữ ở tầng giao diện: tài liệu epic-5 SA ghi là chưa thực hiện, nhưng không còn áp dụng vì mã nguồn không có `ItemInlineFormDialog`
