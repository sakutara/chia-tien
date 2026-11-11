# Tasks

Các việc dưới đây được ghi lại từ lịch sử commit. Tất cả đã hoàn thành trong lịch sử git.

## 1. Đọc hoá đơn GTGT dạng bảng và đếm dòng hàng (a6a8c7b, 2026-10-21)

- [x] 1.1 Thêm bộ đọc bảng hoá đơn điện tử và GTGT (`parseVatTable`) với cột STT, cột đơn vị tính và chọn cột trước thuế.
- [x] 1.2 Đếm số dòng đánh số để có `tableRows.expected` và `tableRows.read`, và đánh dấu thiếu món khi hai số khác nhau.
- [x] 1.3 Thêm bộ phân tích VAT, giảm giá và phí phục vụ theo số tiền hoặc phần trăm, và kiểm thử cho các trường hợp này.
- [x] 1.4 Thêm một fixture hoá đơn cho bộ kiểm thử (`domain/__fixtures__/receipts.ts`).

## 2. Đọc lại hoá đơn bằng AI Gemini (a6a8c7b, 2026-10-21)

- [x] 2.1 Thêm hộp cài đặt `GeminiSettingsDialog` để nhập khoá API và mô hình, lưu trong `localStorage`.
- [x] 2.2 Thêm `geminiService` gọi API trực tiếp từ trình duyệt, với header `x-goog-api-key`, `temperature` bằng 0 và JSON có lược đồ.
- [x] 2.3 Thêm `aiReceipt` với lời nhắc, lược đồ `AI_RESPONSE_SCHEMA`, hàm chuyển kết quả và hàm đối chiếu `checkAiReceipt`.
- [x] 2.4 Thêm đọc lại tối đa một lần (`MAX_ROUNDS = 2`) và giữ kết quả ít vấn đề hơn.
- [x] 2.5 Nối các điểm vào "Đọc lại bằng AI", "Đọc bill bằng AI" và luồng chưa có khoá (`readAfterSave`) trong `InvoiceFormDialog`.
- [x] 2.6 Thêm thông báo lỗi tiếng Việt cho 401/403, 429, mất mạng và `AI_FAILED`, và tự chuyển sang OCR khi AI lỗi.
- [x] 2.7 Thêm kiểm thử `geminiService` và kiểm thử form.

## 3. Hoàn thiện đối soát tổng và tên món (5cc0ade, 2026-10-22)

- [x] 3.1 Đối soát: xử lý trường hợp giảm giá, thuế hoặc phí bị đọc thành món.
- [x] 3.2 Đối soát: thêm món "Món chưa đọc được" khi thiếu món.
- [x] 3.3 Nhận diện tổng từ nhãn `Amount`.
- [x] 3.4 Tên món: giữ tối đa 4 chữ số ở cuối; số từ 3.000 trở lên là số tiền và bị bỏ khỏi tên; số dài hơn 4 chữ số bị bỏ hết.
- [x] 3.5 Cập nhật tài liệu OCR mục 3 của `02-business-logic-and-algorithms.md` theo logic mới.
- [x] 3.6 Gom hook `pre-push` vào `post-merge` (chỉ nhánh main). Việc này không thuộc OCR và được ghi ở đây chỉ để đủ lịch sử của commit.

## 4. Ảnh nhị phân, lượt 2 đọc số và đối soát 1 và 4 (73d87cc, 2026-10-22)

- [x] 4.1 Quét: nhị phân thích nghi `contrast` 0,25, không làm dày chữ, lưu PNG nếu không quá 1 MB, nếu không thì JPEG.
- [x] 4.2 OCR lượt 2: đọc lại các từ số tiền bằng worker `eng`, PSM 7 và whitelist chữ số, rồi ghép lại văn bản (`ocrDigits.ts`).
- [x] 4.3 Parser: dọn viền bảng, bỏ chữ số thừa của `đ`, sửa nhãn tổng lệch dấu, bỏ số dài lẻ không phải tiền, dòng tổng nhóm không xoá món.
- [x] 4.4 Đối soát: thử hoán đổi `1` và `4` cho SL, đơn giá, thành tiền và tổng; tổng lặp lại lấy số xuất hiện nhiều nhất.
- [x] 4.5 Thêm đối soát theo nhóm và dòng "Món chưa đọc được" cho nhóm thiếu.
- [x] 4.6 Thêm kiểm thử cho nhóm, số dài, lượt 2 và ảnh quét.
- [x] 4.7 Tách pipeline OCR offline thành tài liệu `documentation/ocr-pipeline.md`.

## 5. Tài liệu OCR và đọc hoá đơn bằng AI (df4d64b, 9081572, 2026-10-22)

- [x] 5.1 Thêm `documentation/05-ocr-and-receipt-reading.md` làm điểm vào tổng hợp cho chuỗi ảnh hoặc PDF thành dữ liệu hoá đơn.
- [x] 5.2 Cập nhật README, nghiệp vụ, kiến trúc, UI và epic 4 theo OCR mới (`df4d64b`).
- [x] 5.3 Liên kết chéo giữa tài liệu 02, 05 và `ocr-pipeline.md` (`9081572`).
