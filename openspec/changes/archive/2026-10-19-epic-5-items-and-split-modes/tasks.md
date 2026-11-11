## 1. US-5.1 Người ứng tiền
- [x] 1.1 Đổi người ứng tiền của hoá đơn bằng `setInvoicePayer` và chọn nhanh trên thẻ hoá đơn (BR-5.1). Đạt theo `invoiceService.test` (setInvoicePayer) và `InvoiceCard.test` (đổi người ứng trên thẻ).
- [x] 1.2 Chặn người ứng ngoài kèo với mã `PAYER_NOT_IN_SESSION` và chặn thao tác khi bữa `ARCHIVED` với mã `MEAL_ARCHIVED` (R-1, BR-5.9). Đạt theo `invoiceService.test`.

## 2. US-5.2 Hai phương thức nhập và thêm, sửa, xoá món
- [x] 2.1 Khoá `TOTAL_ONLY` sang `EQUAL_TOTAL` ở tầng dịch vụ với mã `SPLIT_TYPE_LOCKED` và hàm `resolveSplitType` (R-2, BR-5.2). Đạt theo `invoiceService.test` và `invoiceRules.test`.
- [x] 2.2 Thêm, sửa, xoá món sau khi lưu, tính lại `totalAmount` và phân bổ, giữ nguyên `consumers` (BR-5.3, R-7, AC-3). Đạt theo `invoiceService.test` (add, update, deleteInvoiceItem); tổng khớp 100%.
- [x] 2.3 Chặn xoá món cuối cùng với mã `LAST_ITEM_CANNOT_DELETE` và hiện `ConfirmDialog` khi xoá món đã có người ăn (R-8, AC-8). Đạt theo `invoiceService.test` và `InvoiceCard.test`.
- [ ] 2.4 Hiển thị danh sách món trong thẻ hoá đơn với tên, số lượng, đơn giá, phân bổ và `finalAmount` (BR-5.3). Thiết kế có `InvoiceItemRow`, nhưng tài liệu không ghi kết quả kiểm thử riêng cho phần hiển thị này, nên chưa xác nhận từ tài liệu.

## 3. US-5.3 Chế độ chia tiền và người chia đều
- [x] 3.1 Chuyển `BY_ITEM` và `EQUAL_TOTAL` mà vẫn giữ người ăn và số phần (BR-5.4, R-3, AC-2). Đạt theo `invoiceService.test`.
- [x] 3.2 Chọn người chia đều trong kèo, tối thiểu một người, mặc định cả kèo; chặn danh sách rỗng với `EQUAL_SPLIT_EMPTY` và người ngoài kèo với `SPLIT_MEMBER_NOT_IN_SESSION` (BR-5.5, R-4, AC-5). Đạt theo `invoiceRules.test` (validateEqualSplit), `invoiceService.test` và `InvoiceCard.test`.
- [x] 3.3 Cảnh báo món chưa có người ăn trên món và trên tiêu đề hoá đơn, và cho phép lưu món với `consumers = []` (BR-5.8, R-6, AC-7). Đạt theo `invoiceRules.test` (countUnassignedItems) và `InvoiceCard.test`.

## 4. US-5.4 Gán người ăn và số phần
- [x] 4.1 Tick người ăn trong kèo với `shares` mặc định 1, chặn `shares` ngoài 1 đến 999 với `INVALID_SHARES`, gỡ người ăn khi về 0 (BR-5.6, BR-5.7, R-5, AC-6). Đạt theo `invoiceRules.test` (normalizeItemConsumers) và `invoiceService.test` (setItemConsumers).
- [x] 4.2 Nút "Tất cả" cho một món hoặc cho các món trống (`setAllItemsConsumers`, chế độ `ALL_ITEMS` và `UNASSIGNED_ONLY`) (BR-5.6, R-6). Đạt theo `invoiceService.test`. Nút trên giao diện là `UNASSIGNED_ONLY`, khác với thiết kế ghi trong BR; xem `proposal.md` mục Impact.
- [x] 4.3 Hiển thị tiền tạm tính `round(F_i × s / S_i)` của từng người ăn (R-11, AC-6). Đạt theo `invoiceRules.test` (previewItemConsumerShares) và `InvoiceCard.test` (chỉnh shares).
- [ ] 4.4 Chặn bỏ người đang là người ứng hoặc người ăn khỏi kèo với `SESSION_MEMBER_IN_USE` (R-9). Tài liệu ghi đây là kiểm thử dự kiến trong `invoiceService.test`, nhưng mục trạng thái của US-5.4 không ghi kết quả đạt, nên chưa xác nhận từ tài liệu.
- [ ] 4.5 Cập nhật `meal.updatedAt` và ghi nguyên tử khi đổi số tiền của bữa đã đánh dấu thanh toán (R-10). Tài liệu không ghi bài kiểm thử hay trạng thái cho R-10, nên chưa xác nhận từ tài liệu. Việc cảnh báo số dư thuộc Epic 6.

## 5. Kiểm thử và hoàn thiện còn lại (SA mục B.10)
- [x] 5.1 Hồi quy: toàn bộ test của Epic 1 đến Epic 4 đạt, 399/399 (AC-10). Ghi nhận trong BR.
- [ ] 5.2 Kiểm thủ công trên trình duyệt ở 375 px và bằng bàn phím cho `InvoiceCard`, `InvoiceItemRow`, `ItemInlineFormDialog`; kiểm vùng chạm tối thiểu 44 px và không cuộn ngang (AC-10). Chưa thực hiện, theo SA mục B.10 mục 1 và BR AC-10.
- [ ] 5.3 Viết test component cho `ItemInlineFormDialog` (thêm và sửa món trên giao diện) (SA mục B.10 mục 2). Chưa thực hiện.
- [ ] 5.4 Kiểm khoá giao diện: nút "Chia từng món" bị khoá khi `TOTAL_ONLY` (AC-1), và khoá chỉ đọc qua prop `readOnly` khi bữa `ARCHIVED` (AC-9). Tầng dịch vụ đã đạt; khoá trên giao diện chưa có test riêng, nên chưa được xác nhận.
