# Tasks

## 1. Lưu thứ tự món (913bac2)

- [x] 1.1 Thêm `reorderInvoiceItems(invoiceId, orderedIds)` trong `app/src/services/invoiceService.ts`, ghi lại `orderIndex` qua `saveItemized`.
- [x] 1.2 Thêm test trong `app/src/services/invoiceService.test.ts`: đổi thứ tự lưu `orderIndex` mới, giữ người ăn và tổng tiền.

## 2. Kéo thả đổi vị trí món (913bac2, sau đó bị thay ở mục 3)

- [x] 2.1 Thêm `InvoiceItemList` với số thứ tự và tay nắm `GripVertical` kéo thả trong `app/src/components/invoices/InvoiceItemList.tsx`.
- [x] 2.2 Đổi `InvoiceCard` dùng `InvoiceItemList` thay cho danh sách `InvoiceItemRow` trực tiếp.
- [x] 2.3 Thêm chuỗi i18n `Kéo để đổi vị trí món {name}` và `Món số {n}` trong `app/src/i18n/en.ts`.

## 3. Thay kéo thả bằng hai nút lên và xuống (98fb808)

Lý do bỏ kéo thả, theo thông điệp commit: giật trên điện thoại.

- [x] 3.1 Bỏ kéo thả. Thêm hai nút `ChevronUp` và `ChevronDown` ở bên trái mỗi món, với props `onMove`, `canMoveUp`, `canMoveDown` trong `InvoiceItemRow`.
- [x] 3.2 Đổi `InvoiceItemList` thành cập nhật lạc quan qua `pending`, và gọi `reorder(next)` khi bấm nút.
- [x] 3.3 Đổi dòng món sang `đơn giá × số lượng = thành tiền`, đổi thứ tự hai ô trong form sửa, và đổi dòng tóm tắt món trong `SessionCard`.
- [x] 3.4 Thêm `sameContent.ts` (bỏ qua `orderIndex`) và bọc `InvoiceItemRow`, `InvoiceCard` bằng `memo`.
- [x] 3.5 Cập nhật `InvoiceItemList.test.tsx`: số thứ tự, chuyển xuống, chuyển lên, biên đầu và cuối, không có nút khi chỉ đọc.

## 4. Kiểm chứng

- [ ] 4.1 Kiểm thử thủ công trên điện thoại cho hai nút chuyển lên và xuống. Không xác định được từ lịch sử là đã làm hay chưa.
- [ ] 4.2 Kiểm thử thủ công việc không hiện nút chuyển ở bữa `ARCHIVED` trên trình duyệt. Không xác định được từ lịch sử là đã làm hay chưa.
