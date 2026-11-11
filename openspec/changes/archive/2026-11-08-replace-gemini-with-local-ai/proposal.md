# Proposal

## Why

Tài liệu `documentation/05-ocr-and-receipt-reading.md` mô tả đường đọc thứ ba của hoá đơn là AI Gemini: người dùng tự nhập khoá Gemini API, ảnh hoá đơn và văn bản OCR được gửi thẳng từ trình duyệt tới Google, và khoá cùng mô hình được lưu trong `localStorage`. Ngày 2026-11-08, commit `f5c3381` xoá toàn bộ luồng này với thông điệp "Xoá Gemini và chuẩn bị interface cho Local AI". Ba commit tiếp theo cùng ngày thêm lớp dùng chung cho đọc hoá đơn trên máy, mô hình ngôn ngữ nhỏ Qwen2.5-0.5B-Instruct chạy trong Web Worker bằng Transformers.js, và tích hợp vào form hoá đơn. Commit không ghi lý do cụ thể cho việc đổi hướng; không xác định được lý do từ lịch sử.

Kết quả là ảnh hoá đơn không còn rời thiết bị, không cần khoá API, và mô hình chỉ nhận văn bản OCR. Thay đổi này được ghi lại thành capability `local-ai-receipt-reading` (hành vi hiện hành) và `gemini-receipt-reading` (hành vi bị bỏ) để lịch sử liền mạch với thiết kế gốc.

## What Changes

- **BREAKING** Bỏ đường đọc AI Gemini: không còn nhập khoá Gemini API, không còn gọi `generativelanguage.googleapis.com`, không còn gửi ảnh ra ngoài thiết bị. Xoá `services/geminiService.ts`, `components/invoices/GeminiSettingsDialog.tsx` và các nút, luồng Gemini trên form hoá đơn.
- **BREAKING** Hai khoá `fee-calculator.geminiApiKey` và `fee-calculator.geminiModel` trong `localStorage` bị xoá khi module dịch vụ AI cục bộ được nạp.
- Thêm đọc hoá đơn bằng mô hình `onnx-community/Qwen2.5-0.5B-Instruct` chạy trong Web Worker. Mô hình chỉ nhận văn bản OCR, tối đa 3000 ký tự, không nhận ảnh.
- Thêm công tắc "Xử lý nâng cao bằng AI trên máy", nhãn trạng thái mô hình (đã tải kèm dung lượng hoặc chưa tải, khoảng 320 MB lần đầu) và nút xoá mô hình đã tải có hộp thoại xác nhận.
- Thêm xác nhận trước khi tải mô hình khi mạng không phải Wi-Fi hoặc không xác định được loại mạng.
- Thêm nút "Đọc lại bằng AI trên máy", và tự đọc lại khi kết quả OCR chưa chuẩn và công tắc đang bật.
- Thêm đối chiếu kết quả mô hình bằng phép tính của app và đọc lại tối đa hai vòng.
- Thêm mã lỗi `AI_MODEL_NOT_CACHED`, `AI_DOWNLOAD_FAILED`, `AI_OUT_OF_MEMORY`; bỏ mã `AI_NO_KEY`.
- Thêm các thành phần dùng chung: `domain/ocrLayout.ts` (gom từ OCR thành dòng), `lib/networkGuard.ts` (phân loại loại kết nối), `services/memoryLifecycle.ts` (giải phóng RAM của worker AI và OCR), `services/aiContracts.ts` (kiểu chung và giao thức worker).

## Capabilities

### New Capabilities
- `local-ai-receipt-reading`: đọc và sửa kết quả hoá đơn bằng mô hình ngôn ngữ nhỏ chạy trên máy, gồm công tắc bật tắt, quản lý cache mô hình, xác nhận khi tải qua mạng di động, đối chiếu và đọc lại, huỷ, giải phóng bộ nhớ và báo lỗi.

### Removed Capabilities
- `gemini-receipt-reading`: đọc lại hoá đơn bằng AI Gemini qua khoá API do người dùng nhập. Capability này được khai sinh trong change `2026-10-22-systematize-ocr-receipt-reading`, không có thư mục specs riêng trong change đó; các requirement bị bỏ được đặt tên theo `documentation/05-ocr-and-receipt-reading.md` mục 7.

## Impact

Mã nguồn đã xoá, theo commit `f5c3381`:
- `app/src/services/geminiService.ts` và `geminiService.test.ts`
- `app/src/components/invoices/GeminiSettingsDialog.tsx`
- Các nút, luồng Gemini và phần test tương ứng trong `app/src/components/invoices/InvoiceFormDialog.tsx`, `InvoiceFilesStrip.tsx`, `InvoiceFormDialog.test.tsx`
- Chuỗi dịch Gemini trong `app/src/i18n/en.ts`

Mã nguồn thêm hoặc đổi, theo các commit `f5c3381`, `8e2f0f9`, `b5c0d48` và `c122aef`:
- `app/src/services/localAiService.ts`: bật tắt, cache, đọc hai vòng, xoá khoá Gemini cũ
- `app/src/workers/slmWorker.ts`: nạp và sinh bằng mô hình
- `app/src/components/invoices/LocalAiControl.tsx`: công tắc và nhãn trạng thái
- `app/src/components/invoices/InvoiceFormDialog.tsx`: điều phối đọc bằng AI trên máy
- `app/src/domain/aiReceipt.ts`: lời nhắc cục bộ, chuẩn hoá và đối chiếu kết quả
- `app/src/domain/ocrLayout.ts`, `app/src/lib/networkGuard.ts`, `app/src/services/memoryLifecycle.ts`, `app/src/services/aiContracts.ts`, `app/src/main.tsx` (cài hook giải phóng bộ nhớ khi khởi động)
- `app/package.json`: thêm `@huggingface/transformers` 3.8.1

Dữ liệu:
- `localStorage`: hai khoá Gemini bị xoá; thêm `fee-calculator.useLocalAi` (trạng thái bật tắt) và `fee-calculator.localAiCached` (cờ đồng bộ cho giao diện).
- Cache Storage `transformers-cache`: chứa trọng số mô hình, khoảng 320 MB.
- `invoice_files.ocrRawText`: không đổi cấu trúc; là đầu vào duy nhất của mô hình.

Ngoài phạm vi của change này:
- Phần thay Tesseract bằng VietOCR ONNX trong commit `b5c0d48` và commit `f513310` (kiểm chứng VietOCR, Giai đoạn 4) thuộc capability `receipt-ocr`, không thuộc change này.
- Bộ phân tích văn bản, đối chiếu tổng và tự sửa số đọc sai không đổi; change này chỉ thay đường đọc AI thứ ba.

Tài liệu bị lệch với mã nguồn sau change này, được ghi lại và thay thế bởi các capability trong `openspec/specs/`:
- `documentation/05-ocr-and-receipt-reading.md`: mục 1 (bảng ba đường đọc, dòng AI Gemini, nguyên tắc về nhập khoá), mục 2 (sơ đồ luồng có nhánh Gemini), mục 7 (toàn bộ, đọc bằng AI Gemini), mục 9 (hai khoá `localStorage` của Gemini), mục 11 (các hằng số AI), mục 12 (hạn chế về AI).
- `documentation/README.md`: mục 2, gạch đầu dòng "Đọc bằng AI Gemini (tuỳ chọn)"; mục 3, dòng "Đọc hoá đơn bằng AI (tuỳ chọn)" của bảng Tech Stack.

## Nguồn lịch sử

Commit (đều ngày 2026-11-08):
- `f5c3381`: Xoá Gemini và chuẩn bị interface cho Local AI (Giai đoạn 0)
- `8e2f0f9`: Thêm lớp dùng chung cho đọc hoá đơn trên máy (Giai đoạn 1)
- `b5c0d48`: Thay Tesseract bằng VietOCR ONNX và thêm Local SLM (Giai đoạn 2)
- `c122aef`: Tích hợp Local AI vào form hoá đơn (Giai đoạn 3)

Chỗ tài liệu cũ bị thay thế:
- `documentation/05-ocr-and-receipt-reading.md`: mục 1, 2, 7, 9, 11, 12 như liệt kê ở phần Impact. Nội dung gốc của tài liệu này có ở commit `df4d64b` (2026-10-22).
- `documentation/README.md`: mục 2 gạch đầu dòng thứ hai, mục 3 bảng Tech Stack, dòng "Đọc hoá đơn bằng AI (tuỳ chọn)".
- Các mục mô tả Gemini trong `documentation/README.md` mục 4 (danh mục tài liệu) cũng còn nhắc tới Gemini; không được sửa trong change này.
