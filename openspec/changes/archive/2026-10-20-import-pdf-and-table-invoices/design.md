# Design

## Context

Thiết kế gốc của Epic 4 nhận ảnh hoá đơn ở ba định dạng JPEG, PNG và WebP, và quy định xử lý ảnh theo kiểu máy quét với nhị phân hoá (BR-4.16). Thiết kế này chưa có PDF và chưa có riêng bảng hoá đơn điện tử. Ảnh chụp màn hình hoá đơn điện tử có nền trắng đều, bảng kẻ ô, cột STT và đơn vị tính, và chữ ký số. Khi nhị phân hoá, dòng "Cơm trắng" bị rơi và nét chữ bị dính hoặc đứt (theo SA B.11: đọc được 5/6 món và thiếu tổng; giữ ảnh xám đọc được 6/6 món).

Ràng buộc chính của dự án là chạy hoàn toàn trên trình duyệt, không gửi ảnh đi đâu, không cần API key. Vì vậy PDF phải được dựng bằng Canvas và đọc bằng pdf.js ngay trên máy.

## Goals / Non-Goals

**Goals**
- Người dùng tải PDF hoá đơn điện tử vào hoá đơn như ảnh, và phần chữ có sẵn trong PDF được đọc chính xác mà không tốn thời gian OCR.
- PDF ảnh quét vẫn đi qua OCR như ảnh thường.
- Hoá đơn điện tử dạng bảng được đọc đúng số lượng, đơn giá, thành tiền, giảm giá, tổng, tên quán và ngày.
- Không làm nặng bundle chính: pdf.js chỉ tải khi cần.

**Non-Goals**
- Không cắt khung hoặc nắn thẳng trang PDF ảnh quét.
- Không xử lý mã QR của hoá đơn điện tử.
- Không đổi schema Dexie.

## Decisions

- **Thư viện PDF**: `pdfjs-dist@^4.10.38`, dùng bản `legacy/build` cho trình duyệt cũ. Module được nạp bằng `import()` trong `importPdf` (`app/src/lib/pdfImport.ts`), nên chỉ tải khi người dùng chọn PDF. Worker được nạp qua `?url` của Vite để chạy được offline sau khi build.
- **Dựng trang thành ảnh**: cạnh dài đưa về `PDF_TARGET_LONG_EDGE = 2800` px, hệ số dựng tối đa `PDF_MAX_SCALE = 4`, xuất JPEG với chất lượng `PDF_JPEG_QUALITY = 0.92`. Nền được tô trắng trước khi vẽ, vì PDF có nền trong suốt sẽ thành đen khi xuất JPEG. Cạnh 2800 px được chọn để cùng cỡ ảnh OCR của máy quét.
- **Lớp chữ**: `pageTextOrUndefined` (`app/src/lib/pdfText.ts`) gom các mảnh chữ có toạ độ thành dòng. Mảnh thuộc cùng dòng khi lệch đường cơ sở không quá max(1,5; nửa chiều cao chữ trung vị). Trong dòng, mảnh liền nhau không chèn khoảng trắng, mảnh cách xa hơn 2,5 lần cỡ chữ được ngăn bằng ba khoảng trắng để bộ phân tích tách được cột. Trang có dưới `MIN_TEXT_CHARS = 20` ký tự (không tính khoảng trắng) được coi là ảnh quét và không lưu văn bản.
- **Lưu và quét**: mỗi trang được lưu bằng `addFile` kèm `ocrRawText` nếu có lớp chữ. Form hoá đơn chỉ OCR những ảnh có `ocrRawText === undefined`, nên trang có chữ đi thẳng vào bộ phân tích.
- **Giới hạn**: PDF tối đa 40 MB (`MAX_IMAGE_BYTES`); số trang nhận được là `MAX_IMAGES_PER_INVOICE` trừ số ảnh đang có. PDF dài hơn thì trả về `truncated` và báo "chỉ nhận n trang đầu". Lỗi được trả về bằng `PeopleError` với mã `PDF_INVALID` (hỏng) hoặc `PDF_ENCRYPTED` (có mật khẩu).
- **Giữ ảnh xám cho tài liệu sạch**: `isCleanDocument` (`app/src/lib/documentScan.ts`) đo độ sáng nền theo ô 64 px. Tài liệu được coi là sạch khi phân vị 5% của độ sáng nền từ 245 trở lên và trung vị từ 250 trở lên, với ảnh tối thiểu 4 x 4 ô. Tài liệu sạch chỉ được cắt và kéo giãn tương phản, không nhị phân hoá. `scanDocument` nhận tuỳ chọn `keepGray` (`auto` mặc định, `never`, `always`) và trả về `binarized` để người gọi biết ảnh có bị nhị phân hoá không. Ảnh chụp giấy thật có bóng hoặc nền xám nên vẫn đi đường nhị phân hoá như trước.
- **Phân tích bảng hoá đơn điện tử** (`app/src/domain/receiptParser.ts`):
  - Dòng tiêu đề cột (`\bstt\b`, `description`, `quantity`, `unit price`, `amount`, `serial`, và các từ tương tự) và dòng đánh số cột `(6=4x5)` bị loại khỏi danh sách món.
  - Khi bảng có cột "Đơn vị tính" (`UNIT_COLUMN_RE`), từ đơn vị tính cuối tên được bỏ (`dropTrailingUnit`, danh sách `UNIT_WORDS`). Số thứ tự đầu dòng được bỏ bằng `cleanItemName`, và trong trường hợp bảng không có đường kẻ, bỏ thêm số thứ tự dính vào tên khi có cột đơn vị tính.
  - Dòng "Cộng tiền hàng hoá, dịch vụ (Total amount)" (`TOTAL_AMOUNT_RE`) được dùng làm `billTotal` và kết thúc việc đọc món (`tableMode`), để chữ ký số và mã tra cứu không thành món.
  - "Đã giảm ... tương ứng ..." (`REDUCTION_RE`) là giảm giá theo số tiền (`FIXED_AMOUNT`), không phải VAT. Dòng có mã số thuế, cơ quan thuế (`TAX_ID_RE`) không được coi là VAT.
  - Chuỗi số như "12.374,00" có phần thập phân `,00` được rút gọn trước khi đọc (`moneyValues`).
  - Tên quán lấy từ phần sau nhãn "Đơn vị bán hàng" (`SELLER_RE`) nếu có.
  - Ngày có chú thích trong ngoặc, dạng "Ngày (date) 13 tháng (month) 10 năm (year) 2026", được đọc bằng `wordsDate`, với chữ số bị OCR đọc lẫn (`digitsOf`) được sửa.

## Risks / Trade-offs

- **Ảnh xám và nhị phân hoá**: đây là thay đổi nghịch với BR-4.16, vốn ghi "không dùng ảnh xám" để OCR không kém với ảnh có bóng. Đánh đổi được chấp nhận vì ngưỡng `isCleanDocument` chỉ mở cho nền gần như trắng tuyệt đối. Số đo dựa trên một ảnh mẫu (SA B.11), chưa có bộ mẫu rộng hơn.
- **Bộ nhớ**: SA (rủi ro 7) đã nêu lo ngại về bộ nhớ khi quét ảnh lớn. Giới hạn thực tế là 40 MB mỗi tệp, lớn hơn đề xuất 15 MB của SA. PDF nhiều trang bị giới hạn bởi 10 ảnh mỗi hoá đơn.
- **PDF ảnh quét** không qua bước cắt khung và nắn thẳng, nên chất lượng phụ thuộc vào ảnh trang. Chữ trong PDF có font mã hoá lạ có thể cho lớp chữ sai; khi đó người dùng bấm "Quét lại bill (OCR)".
- **Kiểm thử**: pdf.js và Canvas không chạy trong jsdom, nên phần dựng trang được kiểm trên trình duyệt thật, không có test tự động cho phần này.
- **Thay đổi sau này**: commit `2899edd` (2026-11-10) đặt `keepGray: 'always'` trong `app/src/lib/imageScan.ts`. Khi đó mọi ảnh chụp đều giữ xám và nhánh `auto` (kiểm tra `isCleanDocument`) không còn được dùng trên đường thêm ảnh. Thay đổi này nằm ngoài change này và được ghi trong change riêng.
