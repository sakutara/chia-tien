# Tasks

## 1. Nhập PDF làm hoá đơn (commit 2e7ad8e, 2026-10-20)

- [x] 1.1 Thêm phụ thuộc `pdfjs-dist@^4.10.38` vào `app/package.json` (bản `legacy/build`, worker nạp qua `?url`).
- [x] 1.2 Viết `app/src/lib/pdfText.ts`: gom mảnh chữ có toạ độ thành dòng, `MIN_TEXT_CHARS = 20`, `pageTextOrUndefined`; kèm test `app/src/lib/pdfText.test.ts`.
- [x] 1.3 Viết `app/src/lib/pdfImport.ts`: `importPdf(file, maxPages)` nạp pdf.js lười, dựng mỗi trang thành JPEG cạnh dài 2800 px nền trắng, lấy lớp chữ của trang.
- [x] 1.4 Viết `addInvoicePdf` trong `app/src/services/invoiceFileService.ts`: kiểm tra PDF và 40 MB, chỉ nhận số trang còn chỗ trong giới hạn 10 ảnh, lưu từng trang kèm `ocrRawText`, báo `truncated`; kèm test `app/src/services/invoiceFilePdf.test.ts`.
- [x] 1.5 Xử lý lỗi `PDF_ENCRYPTED` và `PDF_INVALID` với thông báo tiếng Việt, và đưa chuỗi mới vào `app/src/i18n/en.ts`.
- [x] 1.6 Cập nhật `app/src/components/invoices/InvoiceFilesStrip.tsx`: nhận `application/pdf`, nhãn "Tải ảnh hoặc PDF lên", hiện "Đang đọc PDF…", báo khi PDF bị cắt bớt.
- [x] 1.7 Form hoá đơn chỉ OCR ảnh chưa có `ocrRawText`, nên trang PDF có chữ được phân tích trực tiếp.
- [x] 1.8 Bổ sung cho bộ phân tích: bỏ số thứ tự dính đầu tên món khi bảng có cột STT và cột đơn vị tính trong `app/src/domain/receiptParser.ts`.
- [x] 1.9 Kiểm trên trình duyệt thật: PDF có chữ đọc được 3 món và tổng khớp; PDF ảnh quét của hoá đơn mẫu đọc được 6 món, giảm 12.374 đồng, tổng khớp (theo SA mục B.12).
- [x] 1.10 Cập nhật `documentation/epic-4/BR.md` BR-4.6 và viết SA mục B.12 để ghi lại thay đổi.
- [ ] 1.11 Cắt khung và nắn thẳng cho trang PDF ảnh quét: chưa làm, vì tài liệu ghi đây là hạn chế hiện tại (trang PDF giữ nguyên ảnh).

## 2. Hoá đơn điện tử dạng bảng (commit cbec768, 2026-10-20)

- [x] 2.1 Thêm `isCleanDocument`, tuỳ chọn `keepGray` và cờ `binarized` vào `app/src/lib/documentScan.ts`; giữ thang xám cho tài liệu điện tử sạch; kèm test `app/src/lib/documentScan.test.ts`.
- [x] 2.2 Mở rộng `app/src/domain/receiptParser.ts`: bỏ dòng tiêu đề cột và dòng đánh số cột, bỏ STT và từ đơn vị tính, dừng sau dòng "Total amount", đọc "Đã giảm" là giảm giá theo số tiền, loại mã số thuế khỏi VAT, lấy tên quán từ "Đơn vị bán hàng", đọc ngày song ngữ có chữ số bị đọc lẫn, rút gọn phần thập phân `,00`.
- [x] 2.3 Thêm fixture "hoá đơn điện tử dạng bảng" vào `app/src/domain/__fixtures__/receipts.ts` và test trong `app/src/domain/receiptParser.test.ts`.
- [x] 2.4 Đổi chuỗi "Xong" của `app/src/services/ocrService.ts` sang `t('Xong')` và thêm bản tiếng Anh vào `app/src/i18n/en.ts`.
- [x] 2.5 Đo trên ảnh mẫu: 6/6 món đúng số lượng, đơn giá, thành tiền; giảm 12.374 đồng; tổng 2.050.000 đồng khớp (theo SA mục B.11).
- [ ] 2.6 Cập nhật BR-4.16 để khớp hành vi giữ ảnh xám cho tài liệu sạch: chưa làm, commit cbec768 không sửa BR; BR-4.16 vẫn ghi không dùng ảnh xám.
- [ ] 2.7 Sửa lỗi tên món sai dấu do OCR và ngày sai một chữ số khi OCR rớt chữ số: chưa xử lý, người dùng sửa tay (hạn chế đã ghi trong SA mục B.11).
