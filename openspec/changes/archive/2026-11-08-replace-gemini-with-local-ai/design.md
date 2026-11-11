# Design

## Context

Trước change này, đường đọc thứ ba của hoá đơn là AI Gemini (`documentation/05-ocr-and-receipt-reading.md` mục 7). Người dùng nhập khoá Gemini API vào `GeminiSettingsDialog`, khoá và tên mô hình được lưu trong `localStorage` dưới `fee-calculator.geminiApiKey` và `fee-calculator.geminiModel`. Khi OCR chưa chuẩn, người dùng bấm "Đọc lại bằng AI Gemini"; ảnh (thu về cạnh dài 2000 px, JPEG 0,85, tối đa 6 ảnh) cùng văn bản OCR được gửi từ trình duyệt tới `generativelanguage.googleapis.com` với `responseSchema`, và kết quả được đối chiếu bằng `computeBill`.

Commit `f5c3381` (2026-11-08) xoá luồng đó và chuẩn bị interface cho bộ đọc AI trên máy. Các commit `8e2f0f9`, `b5c0d48` và `c122aef` cùng ngày thêm bộ đọc mới. Phần này mô tả quyết định kỹ thuật thấy được trong các commit và mã nguồn hiện tại (đối chiếu ngày 2026-11-11).

Bộ đọc mới gồm:
- `services/localAiService.ts`: bật tắt, kiểm tra cache, đọc hai vòng, dọn khoá Gemini cũ.
- `workers/slmWorker.ts`: nạp và sinh bằng mô hình trong Web Worker.
- `domain/aiReceipt.ts`: lời nhắc chỉ có văn bản, chuẩn hoá và đối chiếu kết quả.
- `components/invoices/LocalAiControl.tsx`: công tắc, nhãn trạng thái, nút xoá cache.
- `lib/networkGuard.ts`, `services/memoryLifecycle.ts`, `services/aiContracts.ts`, `domain/ocrLayout.ts`: phần dùng chung.

Các chỗ tài liệu cũ lệch với mã nguồn hiện tại, đã kiểm lại trong code:
- Tài liệu mục 1, 7: đường đọc AI là "AI Gemini" gọi API bằng khoá người dùng nhập, gửi ảnh. Code: AI cục bộ, Qwen2.5-0.5B qua Transformers.js trong Web Worker. Chỉ gửi văn bản OCR, tối đa 3000 ký tự. Không gửi ảnh.
- Tài liệu mục 1, README mục 2 và 3: AI cần mạng và khoá riêng. Code: không có khoá. Mạng chỉ cần để tải mô hình khoảng 320 MB lần đầu, khi mô hình chưa có trong cache. Khi không chắc đang dùng Wi-Fi, app hỏi xác nhận.
- Tài liệu mục 2 và 7.2: đọc lại bằng AI chỉ qua nút hoặc hộp gợi ý. Code: khi OCR chưa chuẩn và công tắc "Xử lý nâng cao bằng AI trên máy" đang BẬT, app tự đọc lại (`scanImages` trong `InvoiceFormDialog.tsx`).
- Tài liệu mục 7.2: có điểm vào "Đọc bill bằng AI" đọc ảnh mới không qua OCR. Code: không còn điểm vào này; mọi ảnh đều qua OCR trước.
- Tài liệu mục 7.1: lưu khoá và mô hình trong `localStorage`. Code: hai khoá này bị xoá khi `localAiService.ts` được nạp (`LEGACY_GEMINI_KEYS`).
- Tài liệu mục 11: văn bản OCR gửi cho AI cắt 6000 ký tự. Code: cắt 3000 ký tự (`MAX_HINT_CHARS`).
- Tài liệu mục 7.3: gọi `generateContent` với `responseSchema`. Code: không có lời gọi nào. Hằng số `AI_RESPONSE_SCHEMA` còn trong `domain/aiReceipt.ts`, xem Risks.
- `lib/networkGuard.ts` chỉ phân loại loại kết nối, không chặn mạng. Quyết định hỏi người dùng nằm ở `localAiService.readReceiptWithLocalAi` và `InvoiceFormDialog.readWithLocalAi`.
- Tài liệu không có `geminiService.ts` và `GeminiSettingsDialog.tsx`; cả hai đã bị xoá.

## Goals / Non-Goals

**Goals**
- Ảnh hoá đơn không rời thiết bị trong bất kỳ đường đọc AI nào.
- Không cần khoá API; người dùng bật một công tắc là dùng được.
- Kết quả mô hình luôn được đối chiếu bằng `computeBill` và được đánh dấu để người dùng xem lại so với ảnh.
- Giải phóng RAM của worker AI khi xong, khi lỗi, khi huỷ và khi app bị ẩn.
- Người dùng có thể xoá mô hình đã tải để lấy lại khoảng 320 MB.

**Non-Goals**
- Không đọc trực tiếp từ ảnh bằng mô hình. Chỉ nhận văn bản OCR.
- Không hỗ trợ chọn mô hình khác hoặc nhập mô hình từ ngoài. `LOCAL_SLM_MODEL_ID` là hằng số.
- Không đồng bộ cache mô hình giữa các trình duyệt hoặc thiết bị.
- Không thay đổi quy trình OCR và bộ phân tích văn bản; xem capability `receipt-ocr`.

## Decisions

1. **Mô hình và thư viện.** Mô hình là `onnx-community/Qwen2.5-0.5B-Instruct` (`LOCAL_SLM_MODEL_ID` trong `services/aiContracts.ts`). Thư viện là `@huggingface/transformers` phiên bản 3.8.1, được thêm trong `f5c3381`. Worker gọi `pipeline('text-generation', ...)` và đặt `env.allowLocalModels = false`, nên trọng số được tải từ nguồn từ xa.

2. **Thiết bị và dtype.** Nếu có `navigator.gpu`, worker dùng `device: 'webgpu'` với `dtype: 'q4f16'`. Nếu không có, worker dùng `device: 'wasm'` với `dtype: 'q4'`. Lựa chọn này nằm trong `slmWorker.ts`, hàm `loadModel`.

3. **Cache mô hình.** Trọng số được lưu trong Cache Storage tên `transformers-cache` (`CACHE_NAME` trong `localAiService.ts`). Mô hình được coi là đã tải khi cache có ít nhất một request mà URL chứa `LOCAL_SLM_MODEL_ID` và kết thúc bằng `.onnx` hoặc `.onnx_data`. Dung lượng là tổng `content-length` của các file đó. Cờ `fee-calculator.localAiCached` được ghi để giao diện render ngay mà không chờ kiểm tra cache.

4. **Trạng thái bật tắt.** Khoá `fee-calculator.useLocalAi` nhận `'true'`, `'false'` hoặc chưa đặt. Khi chưa đặt, trạng thái hiệu lực bằng cờ cache: đã tải thì BẬT, chưa tải thì TẮT. Khi người dùng đã gạt, lựa chọn đó được giữ. Xoá cache đặt lựa chọn về `'false'`.

5. **Tải qua mạng.** `networkGuard.detectConnectionKind` đọc Network Information API (`connection`, `mozConnection`, `webkitConnection`). `saveData` bật coi như `cellular`. `wifi` và `ethernet` là `wifi`. `cellular` và `wimax` là `cellular`. Mọi trường hợp khác, kể cả trình duyệt không có API như iOS Safari, là `unknown`. `shouldConfirmModelDownload(isCached)` trả `false` khi đã có cache hoặc khi là `wifi`, và `true` trong các trường hợp còn lại. Khi cần hỏi và người dùng chưa xác nhận, `readReceiptWithLocalAi` ném `AI_MODEL_NOT_CACHED` trước khi tạo worker. Giao diện hiện hộp thoại xác nhận rồi gọi lại với `confirmedDownload: true`.

6. **Sinh và giới hạn.** Mỗi lần sinh dùng `do_sample: false` (chọn token có xác suất cao nhất) và `max_new_tokens: 768`. Lời nhắc hệ thống là `LOCAL_SLM_SYSTEM_PROMPT`, lời nhắc người dùng là `buildLocalSlmPrompt(hints)`, gồm văn bản OCR cắt 3000 ký tự, các dòng bộ phân tích đọc được, số dòng bảng đếm được và các vấn đề đối soát của lượt trước. Phản hồi phải là một đối tượng JSON, có hoặc không có hàng rào mã `json`.

7. **Đối chiếu và đọc lại hai vòng.** `MAX_ROUNDS = 2`. Mỗi vòng, kết quả được chuyển bằng `aiToParsedReceipt` và kiểm bằng `checkAiReceipt`, dùng `computeBill`. Nếu vòng đầu không khớp, vòng hai gửi lại các vấn đề đối soát trong lời nhắc. Kết quả được giữ theo số vấn đề ít nhất. Nếu hai vòng có số vấn đề bằng nhau, kết quả vòng sau được giữ. Trạng thái kết quả là `OK`, `MISMATCH` hoặc `UNVERIFIED` như mô tả trong `checkAiReceipt`.

8. **Vòng đời worker.** Mỗi lần đọc tạo một `Worker` mới từ `workers/slmWorker.ts`, gửi `LOAD_MODEL` rồi một hoặc hai lần `GENERATE_RECEIPT`, và gọi `terminateSlmWorker` trong `finally`. Việc đọc được bọc trong `withAiMemoryScope`, nên khi tác vụ AI cuối cùng kết thúc, `releaseAllAiMemory` chạy và gọi mọi cleaner đã đăng ký, gồm `terminateSlmWorker` và `terminateOcrWorker`. Huỷ bằng `AbortSignal` terminate worker ngay và báo `OCR_CANCELLED`. `memoryLifecycle.installMemoryLifecycleHooks` nghe `visibilitychange` và `pagehide`: khi app bị ẩn và không có tác vụ nào, giải phóng ngay; khi có tác vụ đang chạy, giải phóng sau tối đa 5 giây (`MAX_BACKGROUND_GRACE_MS`).

9. **Phân loại lỗi.** `slmWorker.classify` xếp lỗi theo thông điệp: chứa `out of memory`, `allocation` hoặc `memory` thì `AI_OUT_OF_MEMORY`; chứa `fetch`, `network`, `failed to load` hoặc `download` thì `AI_DOWNLOAD_FAILED`; còn lại là `AI_FAILED`. Sự kiện `error` của worker là `AI_FAILED` với thông báo "Không đọc được hoá đơn bằng AI.". JSON hỏng hoặc không phải đối tượng là `AI_FAILED` với thông báo "Dữ liệu AI trả về không đọc được. Hãy thử lại.".

10. **Dọn khoá Gemini cũ.** Ngay khi `localAiService.ts` được nạp, hàm `writeStorage(key, null)` xoá `fee-calculator.geminiApiKey` và `fee-calculator.geminiModel`. Đây là cơ chế migration duy nhất; không có dữ liệu nào khác được chuyển.

11. **Tự đọc khi OCR chưa chuẩn.** `needsBetterRead(check)` là đúng khi trạng thái là `MISMATCH` hoặc `UNVERIFIED`, không có món, hoặc còn dòng thiếu. Khi đúng và công tắc đang BẬT, `scanImages` gọi `readWithLocalAi`. Khi không có ảnh hoặc ảnh chưa có chữ OCR, `readWithLocalAi` báo người dùng quét ảnh trước và không chạy mô hình. Khi mô hình chưa có trong cache và mạng cần hỏi, hộp thoại xác nhận hiện trước khi tải.

## Risks / Trade-offs

- **Chất lượng đọc của mô hình 0.5B.** Mô hình nhỏ có thể sửa sai hoặc bỏ sót món. Đối chiếu bằng `computeBill` và đánh dấu "Hãy xem lại các món so với ảnh" giảm rủi ro này, nhưng không loại bỏ. Mọi ô vẫn được người dùng sửa. Kết quả `MISMATCH` vẫn cho phép lưu, theo nguyên tắc cũ của tài liệu.
- **Tải lần đầu khoảng 320 MB.** Trên mạng di động hoặc khi không xác định được loại mạng, app hỏi trước. Trên iOS Safari, không có Network Information API, nên app luôn hỏi trừ khi mô hình đã có trong cache.
- **Lệch cấu hình cũ.** Người dùng từng nhập khoá Gemini sẽ thấy khoá đó bị xoá mà không có thông báo. Hai khoá này chỉ có trên trình duyệt đó và không được app dùng nữa.
- **Mã còn sót.** `AI_RESPONSE_SCHEMA` vẫn được export từ `domain/aiReceipt.ts`, và chú thích của `AiReceipt` vẫn nhắc tới nó, dù không có lời gọi nào gửi lược đồ này. `domain/aiReceipt.test.ts` vẫn kiểm tra hằng số này. Có thể xoá trong một change sau, cùng với test.
- **Bộ nhớ và hiệu năng.** Mỗi lần đọc tạo worker mới và tải lại mô hình từ cache vào RAM, nên lần đọc thứ hai vẫn tốn thời gian nạp. Đổi lại, RAM được trả ngay sau mỗi lần đọc, phù hợp với giới hạn của trình duyệt di động. Lịch sử không ghi số liệu đo thời gian nạp.
- **Kiểm thử.** Các test có trong cây mã: `services/localAiService.test.ts`, `domain/aiReceipt.test.ts`, `lib/networkGuard.test.ts`, `services/memoryLifecycle.test.ts`, `domain/ocrLayout.test.ts`, `components/invoices/LocalAiControl.test.tsx`. Lịch sử commit không ghi kết quả kiểm thử thủ công trên thiết bị thật hoặc trên iOS. Không xác định được từ lịch sử.
