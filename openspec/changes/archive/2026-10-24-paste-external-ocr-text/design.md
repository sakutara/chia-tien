# Design

## Context

Luồng đọc hoá đơn (tài liệu cũ: `documentation/05-ocr-and-receipt-reading.md`, `documentation/ocr-pipeline.md`) có hai đầu vào: ảnh quét qua VietOCR, và PDF có lớp chữ. Cả hai đều cho ra văn bản thô, rồi `parseReceipt` tách thành món, `validateReceipt` đối chiếu tổng và `fillFromReceipt` điền form. Khi viết change này, bộ parser và tài liệu cũ đã lệch nhau ở vài điểm (tên quán, tên món trống, dòng chữ sau giá).

Commit `bde11b1` thêm một đầu vào thứ ba: văn bản dán từ công cụ AI hoặc OCR bên ngoài. Văn bản này thường có dạng khối, mỗi ô của bảng một dòng, nên commit `8ea671b` thêm bước ghép khối trước khi đưa vào parser. Commit `678b32e` làm parser hiểu bill có gạch phân cách và số thứ tự, vì văn bản khối và bill quán ăn đều có các dấu hiệu này.

## Goals / Non-Goals

**Goals**
- Văn bản dán từ công cụ ngoài được xử lý bằng đúng đường phân tích, đối chiếu và điền form của ảnh quét, để kết quả nhất quán và không có đường riêng để bảo trì.
- Bill quán ăn có gạch phân cách, số thứ tự và tên món xuống dòng được chia món đúng hơn.
- Giữ nguyên hành vi với bill bảng GTGT có cột STT chuẩn (đường `parseVatTable`).

**Non-Goals**
- Không thay đổi cách đọc ảnh (VietOCR, tiền xử lý, xoay thẳng) và không thay đổi đường Gemini.
- Không lưu văn bản dán vào `ocrRawText` hay vào bất kỳ bản ghi nào; không thêm trường dữ liệu mới.
- Không cập nhật các tài liệu cũ trong `documentation/` trong change này.

## Decisions

- **Đường xử lý dùng chung.** `InvoiceFormDialog.tsx` gom logic cũ của luồng quét thành hàm `applyRawText(rawText, emptyNotice)`: `validateReceipt(parseReceipt(rawText), rawText)`, rồi `fillFromReceipt`, `needsBetterRead` và `hasUserEntries`. Quét ảnh gọi hàm này với văn bản của các ảnh; ô dán gọi hàm này với `reflowBlockText(pasteText)`. Thông báo khi không nhận ra dữ liệu được truyền vào như tham số, để hai đường có thông báo riêng.
- **Ghép khối là hàm thuần.** `reflowBlockText` nằm trong `app/src/domain/blockTextReceipt.ts`, không có phụ thuộc React hay Dexie. Hàm chỉ chạy khi tìm thấy ít nhất ba loại tiêu đề cột trong SL, ĐG, Thành tiền, Tên món; ngoài ra trả nguyên văn. Với một món: nếu có hai ô tiền thì đơn giá là số nhỏ hơn, thành tiền là số lớn hơn, và số lượng là thương nếu chia hết và không quá 99; nếu chỉ có một ô tiền thì số lượng lấy từ ô SL (mặc định 1). Nếu tên kết thúc bằng số trùng số lượng lớn hơn 1 thì số đó bị bỏ khỏi tên. Phần tổng được ghép lại theo nhãn "Tiền hàng" và "Tổng thanh toán".
- **Gạch phân cách.** `isSeparatorLine` coi một dòng là gạch khi bỏ khoảng trắng còn ít nhất năm ký tự, toàn ký tự gạch hoặc dấu chấm, và có ít nhất một gạch, bằng, ngã hoặc gạch dưới. `parseReceipt` ghi lại chỉ số dòng ngay sau gạch vào `boundaries` trước khi `normalizeLine` xoá gạch. Tại mỗi ranh giới, parser xoá `pending` và `last`, nên dòng chữ phía trên không ghép vào món phía dưới.
- **Số thứ tự.** `detectNumbering` nhận dòng bắt đầu bằng `STT_PREFIX_RE` khi số đó lớn hơn số trước và không quá số trước cộng 3, và cần ít nhất ba dòng như vậy. Khi đọc món, số thứ tự được bỏ khỏi tên. Nếu bill không có bảng STT chuẩn (`useTable` là false), số lớn nhất được ghi vào `tableRows.expected`, và các số không gắn được món nào được đưa vào `tableRows.unread` với nội dung "STT n: không đọc được dòng này". Ghi chú: comment của `detectNumbering` nói "nhảy tối đa 2 số", nhưng code dùng `n <= last + 3`; change này theo code.
- **Tiêu đề cột.** `findItemsStart` tìm dòng có ít nhất hai trong bốn nhóm `COLUMN_HEADER_PARTS` (tên món, SL, đơn giá, thành tiền). Món chỉ được đọc từ dòng sau tiêu đề. Nếu không có món nào sau tiêu đề, `readItems` đọc lại từ đầu bill, để tránh bỏ sót khi đoán sai tiêu đề.
- **Nối tên xuống dòng.** Trong `parseItems`, `blockMode` là true khi bill có gạch hoặc số thứ tự. Khi đó, một dòng chỉ có chữ, không có giá, nằm ngay sau món `last`, và không phải dòng đánh số, được nối vào cuối tên `last`. Trong trường hợp khác, dòng đó vẫn vào `pending` như trước và ghép vào đầu món kế tiếp.
- **Tên quán.** `findSeller` duyệt tất cả các dòng để tìm nhãn `SELLER_RE` ("đơn vị bán hàng", "tên đơn vị bán", "người bán"), rồi `findVendor` mới xét bốn dòng đầu bằng điểm từ khoá và chữ hoa. Thay đổi này có từ `cbec768`; change này chỉ ghi lại hành vi đó.
- **Kiểm thử.** `receiptParser.hito.test.ts` có năm test cho bill có STT, gạch và tên xuống dòng. `blockTextReceipt.test.ts` có ba test: ghép ô số đúng món và SL theo thành tiền chia đơn giá, tổng khớp tổng bill, và giữ nguyên văn khi không phải bố cục khối.
- **Chuỗi giao diện.** Sáu khoá mới trong `app/src/i18n/en.ts`: "Dán text OCR ngoài", "Dán text OCR từ công cụ ngoài", phần mô tả trong hộp, "Không nhận ra dữ liệu hoá đơn trong văn bản đã dán…", "Văn bản OCR", "Điền vào hoá đơn".

## Risks / Trade-offs

- **Heuristic.** Ghép khối và chia món đều là quy tắc theo mẫu. Bill có định dạng khác có thể bị ghép sai tên hoặc tách sai món. Form cho người dùng sửa trước khi lưu, và món sai được đánh dấu cần xem lại khi đối chiếu không khớp.
- **Gạch có thể nhầm.** Một dòng toàn dấu gạch trong tên món (hiếm) sẽ bị coi là ranh giới. Ngưỡng năm ký tự và yêu cầu có ký tự gạch giảm rủi ro này.
- **Số thứ tự có thể nhầm số lượng.** Dòng như "2 Bia 50.000" bị loại nhờ yêu cầu ba dòng tăng dần liên tiếp. Nếu bill chỉ có ít hơn ba dòng đánh số, không có gợi ý số món.
- **Chỉ áp dụng cho ô dán.** Văn bản từ ảnh quét không đi qua `reflowBlockText`. Nếu OCR cho ra dạng khối thì vẫn đọc theo parser thông thường, và có thể kém hơn ô dán.
- **Đường dán không lưu văn bản.** Nếu người dùng dán rồi lưu hoá đơn, văn bản gốc không được giữ lại để đọc lại sau. Đây là chủ ý theo code, không phải lỗi.
