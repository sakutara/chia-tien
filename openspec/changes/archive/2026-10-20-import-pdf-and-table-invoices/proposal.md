# Proposal

## Why

Thiết kế gốc của Epic 4 (`documentation/epic-4/BR.md`, BR-4.6 và R-12; `documentation/epic-4/SA.md`) chỉ cho nhận ảnh hoá đơn ở định dạng JPEG, PNG hoặc WebP. Hoá đơn điện tử thường được xuất dưới dạng PDF có sẵn lớp chữ, nên người dùng phải chụp màn hình hoặc chuyển PDF thành ảnh rồi mới nhập được. Với loại PDF có lớp chữ, việc OCR ảnh là không cần thiết và còn làm mất dấu hoặc làm sai số.

Ngoài ra, hoá đơn điện tử dạng bảng (có cột số thứ tự, cột đơn vị tính, dòng "Đã giảm", chữ ký số) không được đọc đúng bằng bộ phân tích và bước nhị phân hoá ảnh của thiết kế gốc. Commit `cbec768` đã xử lý phần này: tài liệu điện tử sạch được giữ ảnh xám, và bộ phân tích được bổ sung các quy tắc cho bảng hoá đơn điện tử. Commit `2e7ad8e` bổ sung nhập PDF làm hoá đơn.

Change này ghi lại các thay đổi có chủ đích đó để lịch sử liền mạch: thiết kế gốc (archive Epic 4) cộng change này cho ra spec hiện tại.

## What Changes

- Nhận thêm tệp PDF làm ảnh đính kèm hoá đơn. Mỗi trang PDF được dựng thành một ảnh JPEG cạnh dài 2800 px. Trang có lớp chữ từ 20 ký tự trở lên được đọc thẳng văn bản, không qua OCR. Trang không có lớp chữ (PDF ảnh quét) đi qua OCR như ảnh thường.
- Thư viện pdf.js (`pdfjs-dist`) được nạp lười, chỉ khi người dùng chọn PDF, để không làm nặng bundle chính.
- Giới hạn file: mỗi tệp tối đa 40 MB, mỗi hoá đơn tối đa 10 ảnh kể cả ảnh tách từ PDF. PDF dài hơn số chỗ còn lại chỉ nhận các trang đầu và báo số trang bị bỏ. Thiết kế gốc (SA) ghi 15 MB mỗi ảnh trước nén; code dùng 40 MB, khớp với R-12 trong BR.
- PDF có mật khẩu hoặc hỏng bị từ chối với thông báo riêng (`PDF_ENCRYPTED`, `PDF_INVALID`).
- Tài liệu điện tử sạch (nền trắng đều, không đổ bóng) được giữ ảnh xám sau khi cắt và nắn thẳng, không nhị phân hoá. **BREAKING** so với BR-4.16, vốn quy định nhị phân hoá mọi ảnh và "không dùng ảnh xám". Ảnh chụp giấy thật vẫn được nhị phân hoá như cũ.
- Bộ phân tích hoá đơn điện tử dạng bảng: bỏ dòng tiêu đề cột và dòng đánh số cột, bỏ số thứ tự đầu dòng và từ đơn vị tính cuối tên món, dừng đọc món sau dòng "Cộng tiền hàng hoá, dịch vụ (Total amount)", đọc "Đã giảm ... tương ứng ..." như giảm giá bằng số tiền, không coi mã số thuế là VAT, lấy tên quán từ dòng "Đơn vị bán hàng", đọc ngày có chú thích trong ngoặc. **BREAKING** so với thiết kế gốc, vì "Đã giảm" trước đây được hiểu là VAT (theo SA B.11).
- Bộ phân tích xử lý bảng có cột STT nhưng không có đường kẻ: số thứ tự dính vào đầu tên món được bỏ đi.

## Capabilities

### New Capabilities
- Không có.

### Modified Capabilities
- `invoice-management`: nhận PDF làm ảnh đính kèm hoá đơn (requirement mới "Nhập PDF làm hoá đơn"); định dạng và dung lượng ảnh đính kèm được ghi lại theo code (40 MB, PDF đi qua đường riêng).
- `receipt-ocr`: đọc trực tiếp lớp chữ của PDF; giữ ảnh xám cho tài liệu điện tử sạch; đọc bảng hoá đơn điện tử có cột số thứ tự; cách đọc VAT, giảm giá và tổng; tên quán và ngày; loại dòng không phải món.

## Impact

- Mã nguồn: `app/src/lib/pdfImport.ts`, `app/src/lib/pdfText.ts`, `app/src/services/invoiceFileService.ts` (`addInvoicePdf`), `app/src/components/invoices/InvoiceFilesStrip.tsx`, `app/src/lib/documentScan.ts` (`isCleanDocument`, `keepGray`, `binarized`), `app/src/domain/receiptParser.ts`, `app/src/services/ocrService.ts`, `app/src/i18n/en.ts`.
- Thư viện: thêm `pdfjs-dist@^4.10.38` vào `app/package.json`. Cần chạy `npm install` sau khi kéo mã về.
- Dữ liệu: không đổi schema Dexie. Trang PDF được lưu như `invoice_files` thông thường, với `ocrRawText` có giá trị khi trang có lớp chữ.
- Kiểm thử: `lib/pdfText.test.ts`, `services/invoiceFilePdf.test.ts`, `lib/documentScan.test.ts`, `domain/receiptParser.test.ts` cùng fixture `domain/__fixtures__/receipts.ts`.
- Ngoài phạm vi: cắt khung và nắn thẳng cho trang PDF ảnh quét (trang PDF giữ nguyên ảnh); đọc hoá đơn có mã QR; sửa dấu tiếng Việt của tên món do OCR đọc sai.

## Nguồn lịch sử

Commit (theo `git log`, giờ +0700):
- `cbec768`, 2026-10-20: "OCR: đọc được hoá đơn điện tử dạng bảng (giữ ảnh xám cho tài liệu sạch; parser xử lý STT, đơn vị tính, Đã giảm, tổng, tên quán, ngày)". Sửa `app/src/domain/receiptParser.ts`, `app/src/lib/documentScan.ts`, `app/src/services/ocrService.ts`, `app/src/i18n/en.ts`, và thêm fixture cùng test. Ghi chú trong `documentation/epic-4/SA.md` mục B.11 (thêm mới).
- `2e7ad8e`, 2026-10-20: "Tải PDF làm hoá đơn: mỗi trang thành ảnh, đọc thẳng lớp chữ nếu có (khỏi OCR), nạp lười pdf.js". Thêm `app/src/lib/pdfImport.ts`, `app/src/lib/pdfText.ts`, sửa `app/src/services/invoiceFileService.ts`, `app/src/components/invoices/InvoiceFilesStrip.tsx`, `app/src/domain/receiptParser.ts`, `app/package.json`. Ghi chú trong `documentation/epic-4/SA.md` mục B.12 (thêm mới); `documentation/epic-4/BR.md` BR-4.6 được sửa.

Chỗ tài liệu cũ bị thay thế hoặc lệch:
- `documentation/epic-4/BR.md`, BR-4.6: ghi ảnh chỉ JPEG, PNG hoặc WebP. Commit `2e7ad8e` đã sửa dòng này để thêm PDF.
- `documentation/epic-4/BR.md`, BR-4.16: ghi nhị phân hoá mọi ảnh bằng ngưỡng thích nghi (contrast 0,25) và "không dùng ảnh xám". Commit `cbec768` không sửa BR; hành vi mới chỉ được ghi trong `documentation/epic-4/SA.md` mục B.11.
- `documentation/epic-4/BR.md`, R-12: ghi 40 MB mỗi ảnh và 10 ảnh mỗi hoá đơn, chỉ JPEG, PNG, WebP. Không đổi trong các commit này.
- `documentation/epic-4/SA.md`, mục rủi ro 7 và mục "Em giữ theo đề xuất ban đầu": ghi giới hạn 15 MB mỗi ảnh trước nén. Hai tài liệu BR và SA không khớp nhau về con số này; lý do không xác định được từ lịch sử.
- `documentation/01-architecture-and-data-model.md`, mục 3.5 (dòng 258 liệt kê `mimeType` chỉ có ảnh; dòng 270 nói "chọn file ảnh"): chưa cập nhật để nhắc tới PDF.
