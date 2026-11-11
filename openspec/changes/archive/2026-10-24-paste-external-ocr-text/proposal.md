# Proposal

## Why

Ba commit cùng ngày 2026-10-24 xử lý hai việc. Thứ nhất, bill có các món được ngăn bằng dòng gạch dài, có số thứ tự đầu dòng, và tên món bị xuống dòng; parser khi đó không xử lý các dấu hiệu này theo tài liệu cũ. Thứ hai, văn bản đọc từ công cụ AI hoặc OCR bên ngoài thường được copy về dạng khối (mỗi ô của bảng một dòng); ô dán cho phép đưa văn bản này vào form hoá đơn mà không cần chụp lại ảnh. Lý do cụ thể ngoài thông điệp commit không xác định được từ lịch sử.

Nguồn: thông điệp commit `678b32e` ("chia món theo gạch phân cách, bỏ STT, ghép tên món xuống dòng"), `bde11b1` ("Thêm ô dán text OCR ngoài để điền hoá đơn") và `8ea671b` ("ghép bố cục xuống dòng theo khối về dòng món"). Tài liệu thiết kế gốc (documentation/05-ocr-and-receipt-reading.md, documentation/ocr-pipeline.md, documentation/epic-4/SA.md) không mô tả ô dán text, và mô tả hai quy tắc đã lệch so với code (xem mục Nguồn lịch sử).

## What Changes

- Thêm nút "Dán text OCR ngoài" trong form hoá đơn (`app/src/components/invoices/InvoiceFormDialog.tsx`). Nút mở một hộp để dán văn bản; bấm "Điền vào hoá đơn" thì văn bản đi qua cùng đường phân tích, đối chiếu và điền form như kết quả quét ảnh, vẫn ở trạng thái chưa lưu.
- Thêm hàm thuần `reflowBlockText` (`app/src/domain/blockTextReceipt.ts`) để ghép văn bản copy theo khối (mỗi ô một dòng) thành dòng món `STT. Tên SL ĐG Thành tiền` trước khi phân tích. Chỉ áp dụng cho ô dán, không áp dụng cho ảnh quét.
- Parser (`app/src/domain/receiptParser.ts`) nhận dòng gạch phân cách như ranh giới giữa các món, bỏ số thứ tự đầu dòng khỏi tên món, đếm số thứ tự để báo thiếu món khi bill không có bảng STT chuẩn, bỏ qua thông tin đơn nằm trên tiêu đề cột, và nối dòng tên bị xuống dòng vào món đứng trước trong bill có gạch hoặc số thứ tự.
- Tên quán tìm nhãn "Đơn vị bán hàng" trên mọi dòng của bill trước, rồi mới xét bốn dòng đầu.
- Thêm sáu chuỗi i18n tiếng Anh cho ô dán (`app/src/i18n/en.ts`).
- Không có requirement nào bị bỏ. Không có thay đổi **BREAKING**.

## Capabilities

### New Capabilities
- Không có. Capability `receipt-ocr` đã có trong `openspec/specs/receipt-ocr/`.

### Modified Capabilities
- `receipt-ocr`: thêm ba requirement mới (dán văn bản OCR ngoài, ghép văn bản dán theo khối, chia món theo gạch phân cách và số thứ tự); sửa requirement "Nhận món từ một dòng hoặc hai dòng" (ghép tên món bị xuống dòng, quy tắc tên trống) và requirement "Nhận ngày hoá đơn và tên quán" (nhãn "Đơn vị bán hàng" được tìm trên mọi dòng).

## Impact

- Mã nguồn: `app/src/domain/receiptParser.ts`, `app/src/domain/blockTextReceipt.ts` (mới), `app/src/components/invoices/InvoiceFormDialog.tsx`, `app/src/i18n/en.ts`.
- Kiểm thử: `app/src/domain/receiptParser.hito.test.ts` (năm test, bill Hito Sushi có STT và gạch phân cách) và `app/src/domain/blockTextReceipt.test.ts` (ba test).
- Dữ liệu: không đổi schema Dexie, không đổi `ocrRawText`. Văn bản dán không được lưu vào ảnh nào; chỉ điền form ở trạng thái chưa lưu. Hoá đơn đã lưu không bị ảnh hưởng.
- Ngoài phạm vi: đường đọc lớp chữ PDF, nhận dạng VietOCR, đường đọc bằng AI Gemini, và việc cập nhật các tài liệu cũ trong `documentation/` (sẽ bị xoá sau khi lịch sử được lưu vào `openspec/changes/archive/`).

## Nguồn lịch sử

Commit (tất cả của Leonard Le, ngày 2026-10-24, theo giờ +0700):
- `678b32e`, 23:24, "OCR hoá đơn: chia món theo gạch phân cách, bỏ STT, ghép tên món xuống dòng" (`receiptParser.ts`, `receiptParser.hito.test.ts`).
- `bde11b1`, 23:36, "Thêm ô dán text OCR ngoài để điền hoá đơn" (`InvoiceFormDialog.tsx`, `en.ts`).
- `8ea671b`, 23:42, "Dán text OCR ngoài: ghép bố cục xuống dòng theo khối về dòng món" (`blockTextReceipt.ts`, `blockTextReceipt.test.ts`, `InvoiceFormDialog.tsx`).

Các chỗ tài liệu cũ bị thay thế hoặc lệch so với code:
- `documentation/ocr-pipeline.md`, bước 2 ("Tên quán"): tên quán chỉ xét 4 dòng đầu. Code tìm nhãn "Đơn vị bán hàng" trên mọi dòng trước, từ commit `cbec768` (2026-10-20, hàm `findSeller`). Commit `cbec768` không nằm trong ba commit được giao nhưng là nguồn của thay đổi này.
- `documentation/epic-4/SA.md`, mục 3 ("Quán: 1–4 dòng đầu"): cùng lệch như trên.
- `documentation/05-ocr-and-receipt-reading.md`, mục 5, dòng "Tên quán": cùng lệch như trên.
- `documentation/ocr-pipeline.md`, bước 11 (Đọc tên món): ghi "Tên không còn chữ nào thì để `Món chưa rõ tên` và đánh dấu `uncertain`". Đây không bao giờ là hành vi của code: không commit nào trong `app/` chứa chuỗi `Món chưa rõ tên` (kiểm bằng `git log -S`). Quy tắc này được viết vào tài liệu ở commit `6b6674c` và `5cc0ade` (2026-10-22). Code hiện tại bỏ hẳn món không còn chữ cái. Placeholder thật trong code là `Món chưa đọc được`, dùng cho món thiếu khi đối soát, từ commit `73d87cc` (2026-10-22).
- `documentation/05-ocr-and-receipt-reading.md`, mục 5, dòng "Món": ghi "dòng chỉ chữ ngay trước dòng có giá được ghép vào tên". Code thêm rule nối dòng chữ vào món đứng trước trong bill có gạch hoặc số thứ tự, từ commit `678b32e`.
