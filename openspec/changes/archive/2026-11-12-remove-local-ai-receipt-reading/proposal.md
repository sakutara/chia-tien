# Proposal

## Why

Tính năng đọc hoá đơn bằng mô hình ngôn ngữ nhỏ chạy trên máy (Qwen2.5-0.5B-Instruct qua Transformers.js, capability `local-ai-receipt-reading`) được đưa vào app ngày 2026-11-08. Khi đo trên 12 bill thật (tháng 11/2026), tính năng có hai vấn đề không chấp nhận được:

- Nạp mô hình làm RAM của trình duyệt tăng khoảng 4–7 GB (số đo gần đúng, trên máy Mac 16 GB). Trên điện thoại, trình duyệt bị crash.
- Kết quả đọc sai số tiền. Bản WebGPU q4f16 trả về văn bản không phải JSON trên 12/12 bill. Khi dùng chữ OCR thô, mô hình 0,5B đọc đúng 2/12 bill và mô hình 350M đọc đúng 0/12. Khi có thêm dòng món từ bộ phân tích theo quy tắc, mô hình chỉ sao chép lại kết quả quy tắc và đôi khi làm sai tiền (rơi mất VAT). Bộ phân tích theo quy tắc một mình cho số tiền đúng trên 11/12 bill.

Chủ app quyết định tắt hẳn tính năng và chỉ dùng bộ phân tích theo quy tắc. Các đường đọc còn lại (OCR VietOCR, dán text OCR ngoài) không đổi.

## What Changes

- **BREAKING** Gỡ capability `local-ai-receipt-reading`: không còn công tắc "Xử lý nâng cao bằng AI trên máy", nhãn trạng thái mô hình, nút xoá mô hình, nút "Đọc lại bằng AI trên máy" và hộp gợi ý tương ứng trên form hoá đơn, hộp xác nhận tải mô hình qua mạng di động.
- Xoá các mã nguồn: `workers/slmWorker.ts`, `services/localAiService.ts`, `domain/aiReceipt.ts`, `components/invoices/LocalAiControl.tsx`, `lib/networkGuard.ts` và test tương ứng.
- Gỡ dependency `@huggingface/transformers`. `onnxruntime-web` được giữ lại vì VietOCR dùng trực tiếp.
- Bỏ khỏi `services/aiContracts.ts` các kiểu của slmWorker và trạng thái Local AI; bỏ khỏi `services/peopleErrors.ts` các mã `AI_MODEL_NOT_CACHED`, `AI_DOWNLOAD_FAILED`, `AI_OUT_OF_MEMORY`, `AI_FAILED`; bỏ `withAiMemoryScope` khỏi `services/memoryLifecycle.ts`. Giữ `registerMemoryCleaner`, `releaseAllAiMemory` và `installMemoryLifecycleHooks` vì worker OCR vẫn dùng.
- Thêm `services/legacyAiCleanup.ts`: khi khởi động, xoá một lần cache Cache Storage `transformers-cache` (480–790 MB trên máy người đã tải) và bốn khoá localStorage cũ. Lỗi không chặn khởi động.
- Xoá các chuỗi i18n không còn dùng liên quan đến bộ đọc AI trong `i18n/en.ts`.

## Capabilities

### New Capabilities

Không có.

### Modified Capabilities

- `local-data-storage`: bỏ requirement "Giải phóng bộ nhớ khi tác vụ AI kết thúc" và thêm requirement "Dọn dữ liệu AI trên máy cũ khi khởi động".
- `receipt-ocr`: kết quả chưa khớp chỉ hiện ghi chú đối chiếu (không còn đọc lại bằng AI); tên quán bỏ dòng nhãn kèm mã số và dòng rác từ logo.
- `local-ai-receipt-reading`: bỏ toàn bộ 18 requirement; capability không còn hành vi nào trong app.

## Impact

Mã nguồn:
- `app/src/components/invoices/InvoiceFormDialog.tsx`: bỏ luồng đọc lại bằng AI, công tắc, hộp gợi ý và hộp xác nhận tải. Quét OCR và hộp ghi chú đối chiếu (`ocrCheck`) không đổi.
- `app/src/main.tsx`: gọi `cleanUpLegacyLocalAi()` một lần khi khởi động.
- `app/src/services/memoryLifecycle.ts`: bỏ `withAiMemoryScope` và logic đếm tác vụ, cùng nhánh chờ 5 giây khi app ẩn chỉ dùng bởi `withAiMemoryScope`. Khi app ẩn, các worker OCR được giải phóng ngay, đúng như hành vi thực tế trước đây vì OCR không dùng scope này.
- `app/package.json`, `app/package-lock.json`: gỡ `@huggingface/transformers`.

Dữ liệu:
- Cache Storage `transformers-cache` và bốn khoá localStorage cũ bị xoá khi khởi động.
- Không đổi schema IndexedDB; `invoice_files.ocrRawText` vẫn là chữ OCR.

Tài liệu: không sửa `docs/`. Các mục tài liệu cũ về AI trên máy (nếu có) được ghi nhận lệch ở change này.
