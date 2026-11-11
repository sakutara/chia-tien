# Proposal

## Why

Thiết kế gốc của Epic 4 và các tài liệu tổng hợp (`documentation/epic-4/`, `05-ocr-and-receipt-reading.md`, `ocr-pipeline.md`, `01`, `04`, `README.md`) dựa vào Tesseract.js với dữ liệu ngôn ngữ `vie` và `eng`. Từ ngày 2026-11-08, chủ dự án đã thay Tesseract bằng VietOCR chạy dạng ONNX trong trình duyệt (commit b5c0d48), chuyển runtime sang `onnxruntime-web` chạy WASM (f513310), đưa file model vào Git LFS (f6ea1dd, bc6ee36), rồi đổi cách xử lý ảnh quét: giữ thang xám và xoay thẳng bill nghiêng (2899edd, 2026-11-10).

Các thay đổi này có chủ đích, nhưng tài liệu thiết kế gốc chưa phản ánh hết. Change này ghi lại lịch sử đó để thiết kế gốc cộng với các change đã archive cho ra spec hiện tại. Lý do của từng thay đổi lấy từ thông điệp commit. Điều không có trong lịch sử thì ghi là không xác định được từ lịch sử.

## What Changes

- Thay Tesseract.js bằng VietOCR ONNX: detector DB (`det.onnx`), encoder và decoder `vgg_seq2seq`, chạy trong `workers/vietOcrWorker.ts` bằng `onnxruntime-web/wasm` một luồng. **BREAKING** so với tài liệu cũ: không còn `tesseract.js`, không còn dữ liệu `vie` và `eng` trong `app/public/ocr/`.
- Bỏ lượt đọc lại số tiền bằng Tesseract (BR-4.19, `domain/ocrDigits.ts`, worker `eng` riêng). **BREAKING** so với tài liệu cũ: không còn bước đọc lại vùng số tiền bằng bộ đọc chỉ chữ số. Việc sửa lẫn `1` và `4` còn lại trong bước đối soát tổng.
- Ảnh quét giữ thang xám, không nhị phân hoá. Tài liệu cũ (BR-4.16) yêu cầu ngưỡng thích nghi và không dùng ảnh xám.
- Ảnh chụp tờ hoá đơn được cắt và nắn thẳng thành công thì ảnh đã quét được lưu thay cho bản nén Cân bằng, và mức nén được ghi là `ORIGINAL`. Tài liệu cũ (BR-4.16, AC-15) yêu cầu mọi ảnh luôn nén Cân bằng.
- Thêm xoay thẳng dòng nghiêng: ước lượng góc từ bản đồ xác suất của detector, xoay ảnh khi góc từ 0,5 độ trở lên rồi dò lại. Tài liệu cũ không có bước này.
- Worker VietOCR tự dừng sau 15 giây rảnh. Tài liệu cũ (05 mục 11, SA) ghi 60 giây.
- Model nằm trong `app/public/ocr/vietocr/`. Riêng `vietocr_encoder.onnx` được quản lý bằng Git LFS.
- Đối soát tổng trong code so khớp chính xác đến từng đồng. Dung sai 10 phần trăm chỉ dùng khi thêm một món "Món chưa đọc được". Tài liệu cũ (`ocr-pipeline.md` bước 7 và 8) ghi dung sai khoảng 1.000 đ hoặc 0,5 phần trăm, và ngưỡng 75 phần trăm để loại dòng subtotal. Ngưỡng 75 phần trăm không có trong code.

## Capabilities

### New Capabilities

Không có. Các hành vi mới nằm trong capability hiện có.

### Modified Capabilities

- `receipt-ocr`: nhận dạng bằng VietOCR, phát hiện vùng chữ, xoay thẳng dòng nghiêng, vòng đời worker, cắt và nắn giữ thang xám, đối chiếu tổng, bỏ lượt đọc lại số tiền.
- `invoice-management`: ảnh chụp tờ hoá đơn đã quét được lưu thay cho bản nén Cân bằng.

## Impact

- Mã nguồn: `app/src/workers/vietOcrWorker.ts`, `app/src/domain/vietOcr.ts`, `app/src/services/ocrService.ts`, `app/src/services/invoiceFileService.ts`, `app/src/lib/imageScan.ts`, `app/src/lib/documentScan.ts` (tham số `keepGray`), `app/src/domain/ocrLayout.ts` (kiểu `OcrWord` được định nghĩa tại đây thay vì trong `ocrDigits.ts`), `app/tsconfig.app.json`.
- Gói: bỏ `tesseract.js` khỏi `app/package.json`, thêm `onnxruntime-web`.
- Tài nguyên: xoá asset Tesseract khỏi `app/public/ocr/` (`eng.traineddata`, `vie.traineddata`, các file `tesseract-core-*`, `worker.min.js`), thêm `app/public/ocr/vietocr/` khoảng 110 MB, trong đó encoder khoảng 84 MB. Thêm `.gitattributes` và `.githooks/pre-push` cho Git LFS.
- Dữ liệu: không thấy thay đổi schema Dexie trong các commit được liệt kê. Ảnh đã lưu không bị đổi. OCR chỉ quét ảnh chưa có `ocrRawText`, nên ảnh có văn bản do Tesseract đọc trước đây vẫn giữ nguyên cho đến khi người dùng bấm "Quét lại bill (OCR)".
- Ngoài phạm vi: đường đọc bằng AI Gemini và mô hình ngôn ngữ cục bộ (`services/localAiService.ts`, `workers/slmWorker.ts`, cùng commit b5c0d48) thuộc change khác. Chưa sửa các tài liệu cũ; danh sách chỗ còn lệch nằm trong `tasks.md` mục 4.
- Hai file `app/eng.traineddata` và `app/vie.traineddata` vẫn còn trong repo nhưng không có code nào tham chiếu. Không xoá trong change này.

## Nguồn lịch sử

Commit của change (theo thứ tự thời gian):

- b5c0d48, 2026-11-08, "Thay Tesseract bằng VietOCR ONNX và thêm Local SLM (Giai đoạn 2)"
- f513310, 2026-11-08, "Kiểm chứng VietOCR trong trình duyệt và chuyển sang onnxruntime-web/wasm (Giai đoạn 4)"
- f6ea1dd, 2026-11-09, "Khai báo Git LFS cho vietocr_encoder.onnx"
- bc6ee36, 2026-11-09, "Thêm hook pre-push để đẩy file LFS khi push"
- 2899edd, 2026-11-10, "VietOCR: ảnh xám, tự xoay thẳng bill nghiêng, dòng chữ thu nhỏ mượt"

Commit trước change này, ghi để truy vết các phần đối soát và lượt đọc số có trong code:

- a144fd2, 2026-10-19, "Initial commit: fee calculator app (Vite + React) and docs": `findScenario` và `findBestAttempt` trong `app/src/domain/receiptValidation.ts` đã có từ commit này.
- 73d87cc, 2026-10-22, "OCR: ảnh nhị phân 0,25, lượt 2 đọc số, đối soát lẫn 1 và 4, tách tài liệu OCR": đưa `oneFourVariants` vào đối soát, và là commit gắn với lượt đọc số và ảnh nhị phân 0,25 (theo tiêu đề commit).
- a6a8c7b, 2026-10-21, "OCR: đọc hoá đơn GTGT dạng bảng ... đọc lại bằng AI Gemini": đưa `validateTotals` vào `receiptValidation.ts`, so khớp chính xác đến từng đồng.
- 5cc0ade, 2026-10-22, "Hoàn thiện đối soát tổng và tên món OCR": đưa `SMALL_GAP_RATIO = 0.1` và `fixMisreadOrMissing`.

Chỗ tài liệu cũ bị thay thế hoặc còn lệch:

- `documentation/05-ocr-and-receipt-reading.md`: mục 4 và 3.2 đã được cập nhật theo VietOCR trong 2899edd. Mục 11 còn ghi worker dừng sau 60 giây.
- `documentation/ocr-pipeline.md`: đã được cập nhật theo VietOCR trong 2899edd. Bước 7 (ngưỡng 75 phần trăm) và bước 8 (dung sai) còn lệch code.
- `documentation/epic-4/BR.md`: dòng 14 (Tesseract.js, `vie+eng`), BR-4.16 (ngưỡng thích nghi, không dùng ảnh xám, nén Cân bằng), BR-4.19 (lượt đọc lại số), R-13 (dữ liệu `vie`, `eng`), AC-15 (mọi ảnh nén Cân bằng).
- `documentation/epic-4/SA.md`: các dòng 14, 24, 68, 246, 248, 267, 275, 325 (tesseract.js, traineddata, `public/ocr/` khoảng 24 MB).
- `documentation/README.md`: dòng 20, 58, 79 (Tesseract.js, traineddata `vie` và `eng`).
- `documentation/01-architecture-and-data-model.md`: dòng 20 (Tesseract.js).
- `documentation/04-epics-and-roadmap.md`: dòng 102, US-4.3 (Tesseract.js).
