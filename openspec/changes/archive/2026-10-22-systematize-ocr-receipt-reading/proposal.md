# Proposal

## Why

Từ ngày 20 đến 22 tháng 10 năm 2026, hệ thống đọc hoá đơn được hoàn thiện qua nhiều lượt. Nền tảng OCR khi đó là Tesseract.js chạy trong trình duyệt, và kết quả đọc thường sai ở ba chỗ: chữ số `1` bị đọc thành `4` ở chữ to đậm, dòng tổng bị đọc thành món, và món bị thiếu mà app không hay biết. Tài liệu thiết kế ghi rõ nguyên tắc "không đoán": thứ không chắc thì bỏ trống hoặc đánh dấu để người dùng xem lại. Vì vậy đợt này bổ sung một lớp đối soát bằng phép tính của app (tổng các món, trừ giảm giá, cộng phí và VAT phải bằng tổng bill), một lớp tự sửa từ chính văn bản OCR, một lần đọc lại các số tiền, cách đọc hoá đơn GTGT dạng bảng có đếm số dòng, và tuỳ chọn đọc lại bằng AI Gemini với khoá API do người dùng tự nhập.

Đây là bản lưu trữ lịch sử. Các hành vi được ghi theo đúng tài liệu và các commit đã nêu ở mục Nguồn lịch sử. Tesseract và Gemini về sau đã được thay bằng VietOCR và AI cục bộ, hành vi hiện hành nằm ở các capability `receipt-ocr` và `local-ai-receipt-reading` trong `openspec/specs/`.

## What Changes

- Nhận dạng chữ trên ảnh bằng Tesseract.js v7 chạy trong trình duyệt, với lượt 1 dùng `vie` + `eng` và lượt 2 đọc lại các số tiền bằng `eng` với whitelist chữ số.
- Tiền xử lý ảnh khi lưu bằng cách cắt bốn góc, nắn thẳng, nhị phân hoá thích nghi với `contrast` 0,25 và không làm dày nét khi nét đã đủ dày; rơi về ảnh gốc khi ảnh quá đen.
- Bộ phân tích văn bản được mở rộng: dọn ký tự viền bảng, sửa lỗi dấu, đọc hoá đơn GTGT dạng bảng (`parseVatTable`), đếm số dòng đánh số để phát hiện thiếu món (`tableRows`).
- Đối soát tổng trước khi điền form: `calcTotal` so với `readTotal`, với các chẩn đoán và cách xử lý riêng cho từng tình huống (bỏ subtotal, chuyển giảm giá hoặc thuế từ món sang đúng khoản, thêm "Món chưa đọc được").
- Đối soát theo nhóm cho bill có dòng tổng nhóm (đồ ăn, đồ uống).
- Đơn giá và số lượng được sửa đúng một số khi lệch, kể cả hoán đổi chữ số `1` và `4`.
- Trạng thái đối soát `OK`, `CORRECTED`, `MISMATCH`, `UNVERIFIED` và gợi ý "Đọc lại bằng AI" khi cần.
- Đọc lại hoá đơn bằng AI Gemini: người dùng nhập khoá API, ảnh được gửi thẳng từ trình duyệt tới Google, kết quả được kiểm bằng phép tính của app và đọc lại tối đa một lần.
- Phát hiện ảnh trùng bằng hệ số Jaccard trên tập từ đã bỏ dấu.

Không có thay đổi nào bị bỏ hay đổi hành vi cũ theo nghĩa phá vỡ trong đợt này, nên không có mục **BREAKING**.

## Capabilities

### New Capabilities
- `gemini-receipt-reading`: đọc lại hoá đơn bằng AI Gemini qua khoá API của người dùng, gồm cấu hình khoá và mô hình, lời nhắc, lược đồ kết quả, đối chiếu và xử lý lỗi.

### Modified Capabilities
- `receipt-ocr`: bổ sung các requirement về nhận dạng hai lượt bằng Tesseract, đối soát tổng và tự sửa, đọc hoá đơn GTGT dạng bảng, đếm dòng hàng, tiền xử lý ảnh nhị phân và các ngưỡng, hằng số của đợt này.

## Impact

Mã nguồn bị ảnh hưởng, theo lịch sử commit:
- `app/src/domain/receiptParser.ts`, `receiptValidation.ts`, `ocrDigits.ts`, `aiReceipt.ts`: bộ phân tích, đối soát, xử lý số và lời nhắc, lược đồ AI.
- `app/src/lib/documentScan.ts`, `imageScan.ts`, `imagePreprocess.ts`: cắt, nắn thẳng, nhị phân hoá và chuẩn bị ảnh cho OCR.
- `app/src/services/ocrService.ts`: worker Tesseract, lượt 2, huỷ và tự dừng.
- `app/src/services/geminiService.ts`: gọi API Gemini, khoá, mô hình, đọc lại một lần.
- `app/src/components/invoices/GeminiSettingsDialog.tsx`, `InvoiceFormDialog.tsx`: hộp cài đặt AI và điều phối quét, đọc AI, điền form.
- Dữ liệu: trường `invoice_files.ocrRawText` và hai khoá `localStorage` của cấu hình AI. Cấu hình AI chỉ nằm trên trình duyệt đó.
- Tài liệu: `documentation/05-ocr-and-receipt-reading.md` và `documentation/ocr-pipeline.md`.

Ngoài phạm vi của change này: thay đổi hook Git trong commit `5cc0ade` (gom `pre-push` vào `post-merge`), các tài liệu nghiệp vụ và kiến trúc khác chỉ được cập nhật liên quan đến OCR, và mọi thay đổi sau ngày 22 tháng 10 năm 2026 (VietOCR, AI cục bộ).

## Nguồn lịch sử

- `documentation/05-ocr-and-receipt-reading.md` tại commit `df4d64b` (2026-10-22) và `9081572` (2026-10-22): tổng hợp các đường đọc, quy trình tiền xử lý, luồng AI Gemini, đối soát và hằng số.
- `documentation/ocr-pipeline.md` tại commit `9081572` (2026-10-22), tách từ mục 3 của `02-business-logic-and-algorithms.md` ở commit `73d87cc` (2026-10-22): pipeline OCR offline ba bước và các bước đánh số trong bộ phân tích.
- Commit lịch sử:
  - `a6a8c7b` (2026-10-21): đọc hoá đơn GTGT dạng bảng, đếm dòng hàng để phát hiện thiếu món, đọc lại bằng AI Gemini.
  - `5cc0ade` (2026-10-22): hoàn thiện đối soát tổng và tên món.
  - `73d87cc` (2026-10-22): ảnh nhị phân `contrast` 0,25, lượt 2 đọc số, đối soát 1 và 4, tách tài liệu OCR.
  - `df4d64b` (2026-10-22): thêm tài liệu 05 và cập nhật tài liệu liên quan.
  - `9081572` (2026-10-22): liên kết chéo giữa các tài liệu OCR.
- `design.md` trong thư mục change là bản chụp nguyên văn hai tài liệu trên tại ngày 2026-11-11. Bản chụp này đã mô tả VietOCR, nên không được dùng làm nguồn cho tên engine và các bước nhận dạng của đợt này. Phần OCR trong các spec của change này được lấy từ bản ở commit `9081572`. Phần bộ phân tích, đối soát và Gemini giống nhau giữa hai bản.
