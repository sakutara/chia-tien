# Tasks

Trạng thái lấy từ `documentation/epic-4/SA.md` (mục B.9 và B.10) và `documentation/epic-4/BR.md` (mục A.5). Việc nào tài liệu ghi là chưa làm hoặc chưa kiểm thì để `- [ ]` kèm ghi chú.

## 1. Quản lý Kèo (US-4.1, US-4.1b)

- [x] 1.1 Thêm, đổi tên, đổi chỗ và xoá Kèo trong Bữa `ACTIVE`; Kèo mới tự đặt `Kèo <n>` (AC-5, đạt).
- [x] 1.2 Xoá Kèo qua hộp xác nhận nêu số lượng sẽ mất và xoá sạch dữ liệu con (AC-5, đạt).
- [x] 1.3 Chọn người tham gia từng Kèo, mặc định cả Bữa, bỏ một người được phép (AC-1, đạt; B.10 ghi kèo còn 7/8 người sau khi bỏ một người).
- [x] 1.4 Chặn bỏ người đang là người ứng hoặc người chia đều của hoá đơn trong Kèo (AC-1, đạt theo thiết kế R-16).
- [x] 1.5 Bữa `ARCHIVED` khoá mọi thao tác sửa Kèo, hoá đơn, ảnh và người (AC-9, đạt).

## 2. Hoá đơn và ảnh (US-4.2)

- [x] 2.1 Thêm, sửa, xoá hoá đơn; tab nhập chi tiết món và tab chỉ nhập tổng tiền (AC-6, đạt; B.10 ghi hoá đơn món và hoá đơn chỉ tổng đều đúng công thức).
- [x] 2.2 Tải ảnh lên, xem ảnh gốc, xoá ảnh qua hộp xác nhận; số ảnh giảm đúng (B.10, đạt một phần của AC-2).
- [x] 2.3 Tải PDF làm hoá đơn: mỗi trang thành một ảnh, PDF có lớp chữ được đọc trực tiếp (SA B.12, đã đo trên PDF thử).
- [x] 2.4 Đóng form chưa lưu bằng Esc thì ảnh tạm được dọn (B.10, đạt một phần của AC-8).
- [ ] 2.5 Tải một ảnh về máy từ trình xem. Chưa làm: B.10 ghi "chưa thử tải về" (AC-2 còn đạt một phần).
- [ ] 2.6 Đo file ảnh trên OPFS thật để kiểm xoá giải phóng dung lượng vật lý. Chưa làm: B.10 ghi "chưa đo OPFS thật" (AC-2).
- [ ] 2.7 Kiểm F5 giữa lúc đang soạn hoá đơn và sau khi lưu, để xác nhận dữ liệu còn nguyên và không có ảnh mồ côi. Chưa làm: B.10 ghi "chưa thử F5 giữa lúc đang soạn" (AC-8, BR-4.14).
- [ ] 2.8 Kiểm cột tổng chi phí ở cả ba chế độ xem Bữa với dữ liệu thật, và xác nhận cập nhật ngay không cần tải lại. Chưa làm: B.10 ghi "chưa kiểm cột tổng ở cả ba chế độ xem với dữ liệu thật" (AC-7, BR-4.11).
- [ ] 2.9 Chụp ảnh bằng camera trên điện thoại thật qua `<input capture>`. Chưa làm: B.10 ghi "chưa thử trên điện thoại thật và camera" (AC-11).

## 3. OCR và phân tích hoá đơn (US-4.3)

- [x] 3.1 Tiền xử lý ảnh bằng Canvas trước khi OCR: cạnh dài 2800 px, chuyển xám, kéo giãn tương phản (SA B.7).
- [x] 3.2 Quét OCR bằng Tesseract.js (`vie+eng`) cục bộ, nạp lười, có tiến trình và nút Huỷ (BR-4.7, đạt theo B.9 bước 6).
- [x] 3.3 Bộ phân tích `receiptParser` cho ngày, tên quán, món, giảm giá, phí phục vụ, VAT và tổng bill, kèm bộ bill mẫu làm test (SA B.7, B.9 bước 5).
- [x] 3.4 Đối chiếu tổng bill và cảnh báo lệch, không chặn lưu (R-11, đạt theo B.9 bước 6).
- [x] 3.5 Đối chiếu trước khi điền, thử các kịch bản sửa và đánh dấu dòng đã sửa (BR-4.8, đạt theo B.9 bước 6).
- [x] 3.6 Tự đổi tên Kèo theo quán khi lưu hoá đơn có tên quán từ OCR (BR-4.10, AC-14, đạt; B.10 ghi "Kèo LAU BO GO NGOC" kèm thông báo).
- [x] 3.7 Hỏi trước khi ghi đè khi quét lại trong form đã có dữ liệu (R-13, đạt).
- [x] 3.8 Đọc lại số tiền sau lượt quét chính, nhóm Drink và Food, bill điện tử dạng bảng (BR-4.19, BR-4.20, AC-18, AC-19, đạt).
- [x] 3.9 Tự quét OCR sau khi lưu ảnh, lưu văn bản vào `ocrRawText`, và phát hiện ảnh trùng (BR-4.17, BR-4.18, AC-16, AC-17, đạt; B.11 ghi đã kiểm trên trình duyệt).
- [x] 3.10 Đọc hoá đơn bằng AI Gemini khi người dùng tự nhập khoá API, ngoài phạm vi BR gốc (SA B.13). Ghi chú: BR và AC chính thức cho tính năng này chưa được bổ sung trong tài liệu.
- [ ] 3.11 Kiểm OCR trên ảnh bill chụp thật, không phải bill vẽ bằng canvas. Chưa làm: SA B.8 (mục 9) và B.10 ghi chưa thử ảnh chụp thật (AC-3 đạt một phần).

## 4. VAT, giảm giá và phí phục vụ (US-4.4)

- [x] 4.1 Hàm `computeBill` theo thứ tự giảm giá, phí phục vụ, VAT, và `allocateProportional` dùng `BigInt` (R-8, SA B.5.5).
- [x] 4.2 Phân bổ VAT vào từng món, tổng `finalAmount` khớp tuyệt đối `totalAmount` kể cả khi chia không tròn (AC-4, đạt).
- [x] 4.3 Giảm giá và phí phục vụ nhập tay và nhận từ OCR; bộ số kiểm gồm chia không tròn và giảm giá sát tiền hàng (AC-13, đạt).
- [x] 4.4 Nén ảnh cố định ở mức Cân bằng, không có lựa chọn mức nén; hiện dung lượng trước và sau (AC-15, đạt; B.10 ghi ảnh 3,0 MB còn 643 KB).

## 5. Các bước triển khai (SA B.9)

- [x] 5.1 Bước 1: `parseMoney`, `sessionRules`, `billMath`, `invoiceRules`, `imageQuality` kèm test, và cập nhật `types` (Vitest).
- [x] 5.2 Bước 2: `sessionService`, `useMealSessions`, `SessionsPanel`, `SessionCard`, `SessionParticipantsDialog`, thay ô giữ chỗ Khu vực 2 (Vitest và trình duyệt).
- [x] 5.3 Bước 3: `invoiceService`, `InvoiceFormDialog`, `InvoiceAdjustments`, sửa `memberUsages` (Vitest và trình duyệt).
- [x] 5.4 Bước 4: `InvoiceFilesStrip`, `ImageViewerDialog`, `imageCompress`, `discardDraftFiles`, `sweepOrphanFiles` (Vitest và trình duyệt).
- [x] 5.5 Bước 5: `receiptParser` kèm giảm giá, phí phục vụ, và bộ bill mẫu (Vitest).
- [x] 5.6 Bước 6: `imagePreprocess`, `ocrService`, `OcrProgress`, đối chiếu tổng bill, tự đổi tên Kèo (Vitest và OCR thật trên ảnh mẫu).
- [x] 5.7 Bước 7: chế độ chỉ đọc cho Bữa `ARCHIVED`, kiểm 375 px không cuộn ngang và nút đạt 44 px, hồi quy Epic 1 đến Epic 3 (AC-9, AC-11 một phần, AC-12, đạt).
- [ ] 5.8 Bước 7 (phần còn lại): kiểm thao tác bằng bàn phím. Chưa làm: B.10 không ghi kết quả kiểm bàn phím, và AC-11 còn đạt một phần.
- [ ] 5.9 Bước 8: đồng bộ tài liệu chung `01-architecture` mục 3.3 đến 3.4 và 3.7, `02-business-logic` mục 2 (thứ tự giảm giá, phí phục vụ, VAT), và `03-ui` mục 4.4 (nén ảnh, giảm giá, phí phục vụ), kèm ma trận kiểm thử. Chưa xác nhận: SA B.9 ghi bước này nhưng B.10 không ghi kết quả.

## 6. Việc còn lại để đóng Epic 4 (SA B.10)

- [ ] 6.1 Kiểm trên điện thoại thật: camera `capture`, và OCR trên ảnh chụp thật. Chưa làm (AC-3, AC-11).
- [ ] 6.2 Kiểm F5 và cột tổng ở ba chế độ xem Bữa. Chưa làm (AC-7, AC-8).
- [ ] 6.3 Đo OPFS thật và thử tải về ảnh. Chưa làm (AC-2).

Ghi chú chung: B.10 ghi tự động đạt 301 test và sau đó 312 test. Các tiêu chí đạt đầy đủ theo A.5 là AC-1, AC-4, AC-5, AC-6, AC-9, AC-10, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19. Các tiêu chí còn lại đạt một phần hoặc chưa đạt: AC-2, AC-3, AC-7, AC-8, AC-11.
