# Tasks

## 1. Giai đoạn 0: xoá Gemini và chuẩn bị interface (commit `f5c3381`)
- [x] 1.1 Xoá `services/geminiService.ts` và test của nó
- [x] 1.2 Xoá `components/invoices/GeminiSettingsDialog.tsx` và các nút, luồng Gemini trên form hoá đơn
- [x] 1.3 Thêm mã lỗi `AI_MODEL_NOT_CACHED`, `AI_DOWNLOAD_FAILED`, `AI_OUT_OF_MEMORY`; bỏ `AI_NO_KEY`
- [x] 1.4 Thêm dependency `@huggingface/transformers` 3.8.1
- [x] 1.5 Thêm `services/aiContracts.ts` với kiểu chung cho OCR, mạng, bộ nhớ và giao thức `slmWorker`

## 2. Giai đoạn 1: lớp dùng chung cho đọc hoá đơn trên máy (commit `8e2f0f9`)
- [x] 2.1 Thêm `domain/ocrLayout.ts`: gom từ OCR thành dòng theo toạ độ dọc, tách cột bằng khoảng trắng kép
- [x] 2.2 Thêm `lib/networkGuard.ts`: phân loại Wi-Fi, mạng di động hoặc không xác định
- [x] 2.3 Thêm `services/memoryLifecycle.ts`: đăng ký cleaner worker, giải phóng RAM khi xong, khi ẩn app và khi đóng tab
- [x] 2.4 Viết lại prompt trong `domain/aiReceipt.ts` theo hướng chỉ dùng văn bản

## 3. Giai đoạn 2: Local SLM (commit `b5c0d48`, phần Local SLM)
- [x] 3.1 Thêm `workers/slmWorker.ts`: nạp Qwen2.5-0.5B-Instruct qua Transformers.js, WebGPU với `q4f16` hoặc WASM với `q4`
- [x] 3.2 Thêm `services/localAiService.ts`: bật tắt, kiểm tra cache `transformers-cache`, đọc hai vòng, huỷ, dọn khoá Gemini cũ
- [x] 3.3 Thêm hỏi xác nhận trước khi tải mô hình khi mạng không phải Wi-Fi (`AI_MODEL_NOT_CACHED`)
- [x] 3.4 Thêm các test `services/localAiService.test.ts`, `lib/networkGuard.test.ts`, `services/memoryLifecycle.test.ts`, `domain/aiReceipt.test.ts`, `domain/ocrLayout.test.ts`

## 4. Giai đoạn 3: tích hợp Local AI vào form hoá đơn (commit `c122aef`)
- [x] 4.1 Thêm `components/invoices/LocalAiControl.tsx`: công tắc "Xử lý nâng cao bằng AI trên máy", nhãn trạng thái cache, nút xoá có hộp thoại xác nhận
- [x] 4.2 Thêm nút "Đọc lại bằng AI trên máy" và gợi ý khi OCR lệch tổng trong `components/invoices/InvoiceFormDialog.tsx`
- [x] 4.3 Tự đọc lại bằng AI sau OCR khi công tắc đang BẬT
- [x] 4.4 Hỏi trước khi tải mô hình qua mạng di động
- [x] 4.5 Giải phóng RAM khi đóng form; cài hook vòng đời trong `main.tsx`
- [x] 4.6 Thêm `components/invoices/LocalAiControl.test.tsx`

## 5. Ghi chú
- Các việc kiểm thử thủ công trên thiết bị thật, đặc biệt iOS Safari, không được ghi trong lịch sử commit. Không xác định được từ lịch sử.
