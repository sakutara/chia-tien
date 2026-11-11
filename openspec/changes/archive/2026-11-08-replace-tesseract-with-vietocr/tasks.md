# Tasks

## 1. Thay Tesseract bằng VietOCR ONNX (b5c0d48)

- [x] 1.1 Thêm detector DB và encoder/decoder vgg_seq2seq chạy bằng onnxruntime-web (`workers/vietOcrWorker.ts`, `domain/vietOcr.ts`).
- [x] 1.2 Gỡ `tesseract.js` khỏi `app/package.json`, xoá asset Tesseract trong `app/public/ocr/`, xoá `domain/ocrDigits.ts` và lượt đọc lại số tiền bằng Tesseract (BR-4.19).
- [x] 1.3 Chỉ giữ VietOCR trong `services/ocrService.ts`. Worker tự dừng sau 15 giây rảnh (trước đó là 60 giây).
- [x] 1.4 Đưa `OcrWord` và `layoutOcrText` sang `domain/ocrLayout.ts`, không đổi hành vi.
- [x] 1.5 Đặt model vào `app/public/ocr/vietocr/` (`det.onnx`, `vietocr_encoder.onnx`, `vietocr_decoder.onnx`, `vietocr.json`, LICENSE), kiểm SHA-256 theo thông điệp commit.

## 2. Runtime WASM, Git LFS và kiểm chứng (f513310, f6ea1dd, bc6ee36)

- [x] 2.1 Chuyển import sang `onnxruntime-web/wasm` và thêm ánh xạ kiểu trong `app/tsconfig.app.json` (f513310).
- [x] 2.2 Chạy worker VietOCR trong bản build production trên trình duyệt: nạp model khoảng 2 giây, nhận dạng 4 dòng khoảng 1 giây, không lỗi (thông điệp f513310).
- [x] 2.3 Khai báo Git LFS cho `vietocr_encoder.onnx` trong `.gitattributes` (f6ea1dd).
- [x] 2.4 Thêm hook `.githooks/pre-push` chạy `git lfs pre-push` (bc6ee36). Hook chỉ có hiệu lực khi `core.hooksPath` trỏ tới `.githooks` trên máy đó.

## 3. Ảnh xám và xoay thẳng bill nghiêng (2899edd)

- [x] 3.1 `scanReceiptImage` giữ thang xám (`keepGray: 'always'`), không nhị phân hoá. `invoiceFileService` lưu ảnh đã quét với `compression = 'ORIGINAL'`.
- [x] 3.2 Thêm `estimateSkewAngle`, `detectProbability`, và xoay thẳng dòng nghiêng khi |góc| từ 0,5 độ trong worker.
- [x] 3.3 Test `estimateSkewAngle` (ngang, +5 độ, −8 độ, ít vùng, khối vuông) và `detectProbability` trong `domain/vietOcr.test.ts`.
- [x] 3.4 Cập nhật `documentation/05-ocr-and-receipt-reading.md` và `documentation/ocr-pipeline.md` bỏ mô tả Tesseract (một phần, xem mục 4).

## 4. Việc còn lại: tài liệu và tài nguyên chưa khớp

- [ ] 4.1 Chưa xoá `app/eng.traineddata` và `app/vie.traineddata`. Lệnh `grep -rn traineddata app/src app/vite.config.ts app/package.json` không có kết quả, nên không code nào dùng hai file này. Để chủ dự án quyết định xoá trong change khác.
- [ ] 4.2 Chưa sửa `documentation/epic-4/BR.md`: dòng 14 (Tesseract.js), BR-4.16 (ngưỡng thích nghi, không dùng ảnh xám, nén mọi ảnh Cân bằng), BR-4.19 (lượt đọc lại số), R-13 (`vie`, `eng`), AC-15.
- [ ] 4.3 Chưa sửa `documentation/epic-4/SA.md` (các dòng 14, 24, 68, 246, 248, 267, 275, 325) và `documentation/README.md` (dòng 20, 58, 79), `documentation/01-architecture-and-data-model.md` (dòng 20), `documentation/04-epics-and-roadmap.md` (dòng 102). Vẫn ghi Tesseract.js.
- [ ] 4.4 Chưa sửa `documentation/05-ocr-and-receipt-reading.md` mục 11: ghi worker dừng sau 60 giây, code là 15 giây. Mục 4 của cùng file đã ghi 15 giây, nên hai mục trong một file đang mâu thuẫn.
- [ ] 4.5 Chưa sửa `documentation/ocr-pipeline.md` bước 7 (ngưỡng 75 phần trăm và nhánh "tổng tính được gấp đôi readTotal") và bước 8 (dung sai khoảng 1.000 đ hoặc 0,5 phần trăm). Code không có các ngưỡng này, và so khớp chính xác đến từng đồng (xem `design.md` D9).
- [ ] 4.6 BR-4.19 (đọc lại số tiền) chưa có thay thế trong code. Không xác định được từ lịch sử là có kế hoạch thay thế hay không.
- [ ] 4.7 AC-18 trong `documentation/epic-4/BR.md` đang đánh dấu đạt dựa trên Tesseract. Lịch sử không cho thấy đã kiểm lại AC-18 trên VietOCR.
