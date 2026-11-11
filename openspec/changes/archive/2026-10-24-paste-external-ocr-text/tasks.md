# Tasks

## 1. Parser: gạch phân cách, số thứ tự và tên xuống dòng (678b32e)
- [x] 1.1 Nhận dòng gạch phân cách và ghi chỉ số ranh giới giữa các món (`isSeparatorLine`, `boundaries`)
- [x] 1.2 Bỏ số thứ tự đầu dòng khỏi tên món và đếm số thứ tự cho bill không có bảng STT (`detectNumbering`, `tableRows`)
- [x] 1.3 Đọc món sau dòng tiêu đề cột, đọc lại từ đầu nếu không có món (`findItemsStart`, `readItems`)
- [x] 1.4 Nối dòng chữ không có giá vào tên món đứng trước trong bill có gạch hoặc số thứ tự (`blockMode`)
- [x] 1.5 Kiểm thử bill có STT, gạch phân cách và tên xuống dòng (`receiptParser.hito.test.ts`, năm test)

## 2. Ô dán text OCR ngoài (bde11b1)
- [x] 2.1 Thêm nút "Dán text OCR ngoài" và hộp dán trong form hoá đơn (`InvoiceFormDialog.tsx`)
- [x] 2.2 Thêm sáu chuỗi tiếng Anh cho ô dán (`app/src/i18n/en.ts`)
- [x] 2.3 Tách logic điền form thành `applyRawText`, dùng chung cho quét ảnh và ô dán

## 3. Ghép văn bản dán theo khối (8ea671b)
- [x] 3.1 Thêm `reflowBlockText` trong `app/src/domain/blockTextReceipt.ts`
- [x] 3.2 Gọi `reflowBlockText` trước khi phân tích văn bản dán
- [x] 3.3 Kiểm thử ghép khối (`blockTextReceipt.test.ts`, ba test)
