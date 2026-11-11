## ADDED Requirements

### Requirement: Nhận dạng chữ bằng Tesseract trên trình duyệt ở lượt 1
Hệ thống SHALL nhận dạng chữ trên ảnh hoá đơn bằng `tesseract.js` v7 chạy trong trình duyệt, với dữ liệu ngôn ngữ đóng gói trong `public/ocr/`, và MUST NOT gọi mạng khi quét. Lượt 1 SHALL dùng worker `vie` và `eng`, với `tessedit_pageseg_mode = 4` để giữ thứ tự dòng và cột giá, `preserve_interword_spaces = 1` để cột đơn giá, số lượng và thành tiền không dính nhau, và `user_defined_dpi = 300`. Kết quả lượt 1 SHALL gồm cả văn bản lẫn toạ độ từng từ để lượt 2 cắt được vùng số tiền.

#### Scenario: Quét tự động ngay sau khi lưu ảnh
- **WHEN** ảnh hoá đơn vừa được lưu và chưa có `ocrRawText`
- **THEN** hệ thống quét ảnh tự động, không cần người dùng bấm gì
- **AND** văn bản nhận được được lưu vào `ocrRawText` của ảnh đó

#### Scenario: Nhiều ảnh của một hoá đơn
- **WHEN** hoá đơn có nhiều ảnh cần quét
- **THEN** hệ thống quét lần lượt từng ảnh và báo tiến trình theo từng ảnh
- **AND** người dùng có thể bấm Huỷ để dừng

#### Scenario: Ảnh đã có văn bản không quét lại
- **WHEN** ảnh đã có `ocrRawText`, kể cả chuỗi rỗng
- **THEN** hệ thống dùng lại văn bản đã lưu và không quét lại

#### Scenario: Quét lại bằng nút riêng
- **WHEN** người dùng bấm "Quét lại bill (OCR)"
- **THEN** hệ thống quét lại ảnh dù đã có văn bản
- **AND** nếu form đã có dữ liệu do người dùng nhập thì hệ thống hỏi trước khi ghi đè

#### Scenario: Worker được tạo, dùng lại và tự dừng
- **WHEN** lần quét đầu tiên bắt đầu
- **THEN** hệ thống tạo worker, dùng lại cho các lần quét sau
- **AND** worker tự dừng sau 60 giây rảnh

#### Scenario: Người dùng huỷ quét
- **WHEN** người dùng bấm Huỷ khi đang quét
- **THEN** hệ thống dừng worker bằng `AbortSignal` và báo lỗi `OCR_CANCELLED`

#### Scenario: Lỗi nhận dạng khác
- **WHEN** quét gặp lỗi không phải huỷ
- **THEN** hệ thống báo `OCR_FAILED` với thông báo "Không quét được ảnh. Bạn vẫn có thể nhập tay"
- **AND** ảnh vẫn được giữ trong hoá đơn

### Requirement: Đọc lại các số tiền ở lượt 2
Sau lượt 1, hệ thống SHALL đọc lại các từ số tiền bằng một worker `eng` riêng, được tạo lười và có cùng cơ chế tự dừng sau 60 giây rảnh như worker chính. Lượt 2 SHALL chỉ sửa chữ số, không được thêm hoặc bớt dòng. Lý do của lượt này là mô hình tiếng Việt hay đọc chữ `1` thành `4` ở chữ to đậm. Trong bill mẫu của tài liệu, dòng "Tổng thanh toán" lượt 1 đọc ra `476.000` ở cả 6 lần chạy, trong khi đọc riêng dòng đó bằng `eng` ra `176.000`.

#### Scenario: Chọn từ cần đọc lại
- **WHEN** lượt 1 có từ chứa chữ số, dạng nhóm nghìn hoặc số từ 3 chữ số trở lên
- **THEN** hệ thống cắt vùng toạ độ của từ đó từ ảnh đã lưu, thêm viền trắng khoảng 20 px
- **AND** từ đã được loại bỏ nếu là số dài lẻ theo quy tắc của bộ phân tích

#### Scenario: Đọc vùng bằng chế độ một dòng và whitelist chữ số
- **WHEN** vùng số tiền được đọc lại
- **THEN** hệ thống dùng worker `eng` với PSM 7 (một dòng) và whitelist `0123456789.,`
- **AND** không đọc chữ nên không nhầm `đ`, `l` hay `O`

#### Scenario: Thay từ khi kết quả hợp lệ
- **WHEN** kết quả lượt 2 có dạng số nhóm nghìn hoặc số thuần và khác kết quả lượt 1
- **THEN** hệ thống thay từ cũ bằng từ mới
- **AND** văn bản đã thay được lưu vào `ocrRawText`

#### Scenario: Giữ kết quả lượt 1 khi lượt 2 không hợp lệ
- **WHEN** kết quả lượt 2 rỗng hoặc sai dạng số
- **THEN** hệ thống giữ nguyên kết quả lượt 1

#### Scenario: Giới hạn số vùng đọc lại
- **WHEN** ảnh có nhiều hơn 40 vùng số tiền
- **THEN** hệ thống chỉ đọc lại tối đa 40 vùng, ưu tiên các dòng cuối gồm tổng, VAT và giảm giá
- **AND** tiến trình hiện thông báo "Đang đọc lại số…"

#### Scenario: Lượt 2 đã đọc đúng dòng tổng
- **WHEN** dòng "Tổng thanh toán" lượt 1 đọc `476.000` và lượt 2 đọc `176.000`, dạng số hợp lệ
- **THEN** văn bản dùng cho bộ phân tích có `176.000` ở dòng đó

### Requirement: Tiền xử lý ảnh khi lưu bằng cắt, nắn thẳng và nhị phân hoá
Khi thêm ảnh chụp hoá đơn, hệ thống SHALL giải mã ảnh tối đa 4096 px cạnh dài, chuyển sang thang xám, dò bốn góc tờ giấy là vùng sáng lớn nhất chiếm ít nhất 12% diện tích và lấp đầy tứ giác ít nhất 65%, rồi nắn phối cảnh thành hình chữ nhật với cạnh dài 2800 px và phóng tối đa 3 lần. Nếu tờ giấy chiếm hơn 97% ảnh và gần thẳng thì hệ thống SHALL bỏ qua bước cắt. Nếu không tìm được tờ giấy thì hệ thống SHALL xử lý cả ảnh.

#### Scenario: Tài liệu điện tử sạch
- **WHEN** nền ảnh rất sáng và đồng đều, ví dụ ảnh chụp màn hình PDF
- **THEN** hệ thống chỉ cắt khung và kéo giãn tương phản, giữ thang xám
- **AND** không nhị phân hoá

#### Scenario: Ảnh chụp thường được nhị phân hoá thích nghi
- **WHEN** ảnh chụp thường được xử lý
- **THEN** hệ thống nhị phân hoá theo Bradley với `contrast` 0,25, cho chữ đen trên nền trắng hoàn toàn
- **AND** ngưỡng 0,25 được chọn thay cho 0,12 vì 0,12 làm nét quá đậm, bít lỗ của số `6` và dính số `1` vào đường kẻ bảng

#### Scenario: Ảnh quá đen bị coi là đáng ngờ
- **WHEN** sau nhị phân hoá, vùng đen chiếm hơn 40% diện tích
- **THEN** hệ thống coi kết quả nhị phân là không đáng tin và rơi về ảnh gốc đã nén

#### Scenario: Làm dày nét khi nét quá mỏng
- **WHEN** độ dày nét trung vị của ảnh nhị phân không lớn hơn 2 px
- **THEN** hệ thống làm dày nét để bắt được chữ in nhiệt mờ
- **AND** nếu nét đã đủ dày thì không làm dày

#### Scenario: Không tách được tờ giấy
- **WHEN** không tìm thấy tờ giấy đủ rõ
- **THEN** hệ thống xử lý cả ảnh thay vì cắt

### Requirement: Lưu ảnh đã xử lý theo dung lượng và rơi về nén khi lỗi
Hệ thống SHALL lưu ảnh đã xử lý dạng PNG nếu dung lượng không quá 1 MB (`TARGET_IMAGE_BYTES`); nếu vượt thì lưu dạng JPEG và hạ chất lượng hoặc thu nhỏ dần. Tên tệp SHALL thêm hậu tố `-scan`. Nếu bước xử lý trả về rỗng hoặc lỗi thì hệ thống SHALL nén ảnh ở mức "Cân bằng" cố định: cạnh dài tối đa 2000 px, JPEG chất lượng 0,80, không phóng to, bỏ qua nén nếu ảnh không quá 400 KB, và giữ ảnh gốc nếu bản nén lớn hơn. Nếu nén cũng lỗi thì hệ thống SHALL lưu ảnh gốc.

#### Scenario: Ảnh đã xử lý đủ nhỏ
- **WHEN** PNG của ảnh đã xử lý không quá 1 MB
- **THEN** ảnh được lưu dạng PNG với hậu tố `-scan`

#### Scenario: Ảnh đã xử lý quá lớn
- **WHEN** PNG vượt 1 MB
- **THEN** ảnh được lưu dạng JPEG, hạ chất lượng hoặc thu nhỏ dần cho đến khi đủ dung lượng

#### Scenario: Ảnh nhỏ không cần nén
- **WHEN** ảnh rơi về nén và có dung lượng không quá 400 KB
- **THEN** ảnh được giữ nguyên

#### Scenario: Ảnh gốc được giữ khi nén không hiệu quả
- **WHEN** bản nén lớn hơn ảnh gốc
- **THEN** hệ thống giữ ảnh gốc

#### Scenario: Cảnh báo ảnh quá nhỏ
- **WHEN** cạnh dài của ảnh dưới 1000 px
- **THEN** hệ thống cảnh báo "OCR có thể đọc sai"

### Requirement: Chuẩn bị ảnh riêng cho OCR
Trước khi nhận dạng, hệ thống SHALL dựng một bản ảnh riêng cho OCR: giải mã theo hướng EXIF, đưa cạnh dài về 2800 px (phóng tối đa 3 lần, thu nhỏ nếu lớn hơn), chuyển sang thang xám theo `Y = 0,299R + 0,587G + 0,114B`, kéo giãn tương phản theo phân vị 2% và 98%, rồi xuất PNG. Bản này chỉ phục vụ OCR và MUST NOT thay đổi ảnh đã lưu.

#### Scenario: Ảnh được đọc từ bản đã lưu
- **WHEN** quét một ảnh hoá đơn
- **THEN** hệ thống đọc bản đã lưu của ảnh, không đọc ảnh gốc
- **AND** với mức nén "Cân bằng" cạnh dài 2000 px, chữ trên bill vẫn đọc tốt

#### Scenario: Ảnh gốc không bị đổi
- **WHEN** bản chuẩn bị cho OCR được tạo
- **THEN** ảnh đã lưu trong `invoice_files` giữ nguyên

### Requirement: Đọc lớp chữ có sẵn của PDF thay cho OCR
Khi người dùng tải PDF, hệ thống SHALL dựng mỗi trang thành ảnh JPEG 2800 px (chất lượng 0,92, nền tô trắng, hệ số dựng tối đa 4 lần) và đồng thời lấy lớp chữ của trang. Lớp chữ SHALL được gom thành dòng theo trục dọc với dung sai bằng nửa chiều cao chữ, xếp theo trục ngang, và khoảng cách lớn hơn 2,5 lần cỡ chữ giữa hai mảnh SHALL được giữ thành ba khoảng trắng để bộ phân tích tách cột. Trang có ít nhất 20 ký tự (không tính khoảng trắng) SHALL được lưu thẳng vào `ocrRawText`, không chạy OCR. PDF không qua bước cắt và nắn thẳng.

#### Scenario: PDF hoá đơn điện tử có chữ
- **WHEN** trang PDF có ít nhất 20 ký tự chữ
- **THEN** văn bản lớp chữ được lưu vào `ocrRawText` và hệ thống bỏ qua OCR cho trang đó

#### Scenario: PDF ảnh quét
- **WHEN** trang PDF có ít hơn 20 ký tự chữ
- **THEN** hệ thống dùng ảnh JPEG của trang để chạy OCR như ảnh thường

#### Scenario: PDF có mật khẩu hoặc hỏng
- **WHEN** PDF có mật khẩu hoặc không đọc được
- **THEN** hệ thống báo `PDF_ENCRYPTED` hoặc `PDF_INVALID` tương ứng

### Requirement: Giới hạn nhập ảnh và PDF
Hệ thống SHALL chấp nhận ảnh JPEG, PNG, WebP và PDF, và SHALL từ chối HEIC với thông báo đổi sang JPEG. Mỗi tệp không quá 40 MB. Mỗi hoá đơn có tối đa 10 ảnh. Với PDF dài hơn số ảnh còn chỗ, hệ thống SHALL chỉ nhận số trang đầu còn chỗ và báo "chỉ nhận n trang đầu". Khi MIME của tệp bị thiếu (một số máy Android), hệ thống SHALL suy ra từ đuôi tệp.

#### Scenario: Tệp quá lớn
- **WHEN** người dùng chọn tệp trên 40 MB
- **THEN** hệ thống từ chối tệp đó

#### Scenario: Vượt số ảnh cho phép
- **WHEN** hoá đơn đã có 10 ảnh và người dùng thêm ảnh
- **THEN** hệ thống không nhận thêm ảnh

#### Scenario: PDF nhiều trang
- **WHEN** PDF có nhiều trang hơn số ảnh còn chỗ
- **THEN** hệ thống chỉ nhận số trang đầu còn chỗ và báo "chỉ nhận n trang đầu"

### Requirement: Phát hiện ảnh trùng trong cùng bữa
Sau khi quét, hệ thống SHALL so văn bản OCR của ảnh mới với các ảnh cùng bữa. Văn bản SHALL được đổi thành tập từ sau khi bỏ dấu, chỉ giữ chữ và số, và bỏ các từ một ký tự. Độ giống SHALL là hệ số Jaccard của hai tập từ. Hệ số từ 0,8 trở lên là trùng. Nếu một trong hai văn bản có dưới 8 từ thì hệ thống SHALL không kết luận trùng. Hệ thống SHALL chỉ cảnh báo, không tự xoá ảnh.

#### Scenario: Ảnh trùng với ảnh khác hoá đơn
- **WHEN** hệ số Jaccard từ 0,8 trở lên và cả hai có ít nhất 8 từ
- **THEN** hệ thống hiện tên hai ảnh, mức giống, nút "Xoá ảnh trùng" và nút "Giữ lại"

#### Scenario: Ảnh trùng với ảnh cùng hoá đơn
- **WHEN** ảnh mới trùng với một ảnh cùng hoá đơn
- **THEN** hệ thống cảnh báo và không điền lại form

#### Scenario: Văn bản quá ngắn
- **WHEN** một trong hai văn bản có dưới 8 từ
- **THEN** hệ thống không báo trùng

### Requirement: Bộ phân tích chuẩn hoá dòng trước khi tách số
Bộ phân tích SHALL sửa lỗi OCR ở chỗ dính với chữ số: `O` thành `0`, và `l`, `I`, `|` đứng trước chữ số thành `1`, rồi gọn khoảng trắng. Trước khi tách số, hệ thống SHALL thay các ký tự viền bảng `|`, `¦`, `[`, `]`, `{`, `}`, `_` và chuỗi ba ký tự `-`, `=`, `~`, `—`, `.` liên tiếp bằng khoảng trắng. Dấu `-` đơn lẻ trong tên món và số âm SHALL được giữ nguyên.

#### Scenario: Ký tự viền bảng bị đọc thành dấu câu
- **WHEN** dòng có `106.000]` hoặc `-..| Bún Ốc Lẫn 2| 53.000 106.000]`
- **THEN** bộ phân tích đọc được số tiền và không làm mất dòng món

#### Scenario: Dấu thừa sau số
- **WHEN** số có dấu chấm hoặc phẩy thừa ở cuối như `90.000.` hoặc `130,000,`
- **THEN** bộ phân tích bỏ dấu cuối trước khi tách số

#### Scenario: Dấu gạch trong tên món
- **WHEN** tên món có dạng `Bún - Chả`
- **THEN** dấu `-` được giữ nguyên trong tên

### Requirement: Sửa chữ số `đ` bị đọc thành số
Khi số tiền có nhóm cuối gồm 4 chữ số, ví dụ `176.0004` hoặc `476.0000`, bộ phân tích SHALL bỏ chữ số cuối, vì số tiền hợp lệ chỉ có nhóm nghìn gồm 3 chữ số và chữ số cuối là ký hiệu `đ` hoặc `₫` bị đọc thành `4` hoặc `0`.

#### Scenario: Ký hiệu đồng bị đọc thành chữ số
- **WHEN** dòng có số `176.0004`
- **THEN** bộ phân tích đọc số tiền là `176.000`

### Requirement: So khớp từ khoá không phân biệt dấu tiếng Việt
Mọi so khớp từ khoá SHALL dùng dạng đã bỏ dấu: bỏ dấu, `đ` thành `d`, chữ thường. Nhãn tổng SHALL khớp cả các biến thể lệch dấu như `Téng`, `Teng` và `Tõng`, nên dòng `Téng thanh toán 176.000đ` được nhận là dòng tổng. Tên món và tên quán SHALL được lấy từ dòng gốc, có dấu.

#### Scenario: Bill mất dấu
- **WHEN** OCR đọc bill với nhãn không có dấu, ví dụ `Tong thanh toan`
- **THEN** bộ phân tích vẫn nhận đúng dòng tổng và các khoản

#### Scenario: Tên món giữ dấu
- **WHEN** tên món được đọc từ dòng gốc
- **THEN** tên món có đầy đủ dấu tiếng Việt như trên bill

### Requirement: Trích ngày, tên quán, VAT, giảm giá và phí phục vụ
Bộ phân tích SHALL trích ngày theo các dạng `dd/mm/yyyy`, `dd-mm-yy` (năm hai chữ số là 20xx), và `Ngày d tháng m năm yyyy`; chỉ nhận ngày có thật và trong khoảng năm 2000 đến 2099, không có thì bỏ trống. Tên quán SHALL được lấy trong 4 dòng đầu, bỏ dòng địa chỉ, điện thoại, mã số thuế và tiêu đề, và điểm cao hơn cho dòng có từ khoá như `NHÀ HÀNG`, `QUÁN`, `CAFE`, `LẨU`, `BBQ` và dòng viết hoa. VAT SHALL được nhận từ dòng có `VAT`, `GTGT` hoặc `Thuế`; giảm giá từ `Giảm giá`, `Chiết khấu`, `Khuyến mãi`, `Discount`; phí phục vụ từ `Phí phục vụ`, `Service`. Với VAT, giảm giá và phí, nếu dòng có số tiền thì SHALL lấy số tiền (`FIXED_AMOUNT`), không có thì lấy `%` (`PERCENTAGE`). Số tiền có thể có dấu `-` hoặc ngoặc và SHALL lấy giá trị tuyệt đối.

#### Scenario: Ngày không có thật
- **WHEN** bill có ngày không tồn tại hoặc nằm ngoài năm 2000 đến 2099
- **THEN** bộ phân tích bỏ trống ngày

#### Scenario: Tên quán ở đầu bill
- **WHEN** trong 4 dòng đầu có dòng `NHÀ HÀNG` và dòng địa chỉ
- **THEN** tên quán là dòng có từ khoá, còn dòng địa chỉ bị bỏ

#### Scenario: VAT ghi số tiền trên bill
- **WHEN** dòng VAT có số tiền
- **THEN** VAT được lưu là `FIXED_AMOUNT` đúng số trên bill

#### Scenario: VAT chỉ có phần trăm
- **WHEN** dòng VAT chỉ có `%`
- **THEN** VAT được lưu là `PERCENTAGE`

#### Scenario: Giảm giá ghi âm
- **WHEN** dòng giảm giá ghi `-20.000` hoặc `(20.000)`
- **THEN** giảm giá được lưu là 20.000

### Requirement: Đọc dòng món theo cột trái và cột phải
Mỗi dòng SHALL được tách thành nhãn bên trái (chữ) và số bên phải (số tiền cuối dòng). Đơn vị tiền tệ như `đ`, `₫`, `VND`, `vnđ`, `k` có thể có hoặc không. Cột phải SHALL là thành tiền của món (`lineTotal`), được đọc trước và giữ nguyên ở các bước sau. Bộ phân tích SHALL ghi lại số lượng nếu đọc được, dạng `2`, `2x`, `x2` hoặc `2 x 150.000`. Các dòng không phải món SHALL bị loại: tiêu đề, địa chỉ, ngày giờ, số điện thoại, mã số thuế, số hoá đơn, số bàn, mã giao dịch, và các dòng VAT, giảm giá, phí phục vụ, tổng, tạm tính, tiền mặt, tiền thừa.

#### Scenario: Ba bố cục món được nhận
- **WHEN** bill có dòng `Bò Mỹ nhúng 2 150.000 300.000`, hoặc `Lẩu bò 2 x 150.000 = 300.000`, hoặc tên ở một dòng và `2 x 150.000 = 300.000` ở dòng dưới
- **THEN** bộ phân tích nhận đúng món, số lượng, đơn giá và thành tiền trong từng bố cục

#### Scenario: Dòng chỉ có tên và một số cuối
- **WHEN** một dòng chỉ có tên và một số ở cuối
- **THEN** món được coi là 1 phần, với thành tiền là số đó

#### Scenario: Số dài không phải tiền
- **WHEN** dãy số có hơn 8 chữ số, kể cả số 0 đứng đầu, và không chia hết cho 100, ví dụ mã số thuế hoặc số hoá đơn
- **THEN** dãy số đó bị bỏ khỏi các số tiền của dòng
- **AND** dòng chỉ còn các số này không được coi là món

#### Scenario: Số dài chia hết cho 100 vẫn là tiền
- **WHEN** dãy số dài có hơn 8 chữ số nhưng chia hết cho 100
- **THEN** bộ phân tích vẫn coi là số tiền

#### Scenario: Dòng số hoá đơn
- **WHEN** dòng có nhãn `MST`, `Số`, `No`, `Bàn` hoặc `Mã` đứng trước số
- **THEN** dòng đó không được coi là món

### Requirement: Dòng tổng nhóm không thay thế món đã đọc
Dòng tổng nhóm như `Drink`, `Food`, `Tổng đồ uống`, `Tổng đồ ăn` SHALL được coi là subtotal của một nhóm món, không phải món. Hệ thống MUST NOT thay các món đã đọc bằng các dòng nhóm. Chỉ khi không đọc được món nào thì các dòng nhóm mới được dùng làm món, mỗi nhóm một dòng, để vẫn chia được tiền.

#### Scenario: Một món đọc thiếu
- **WHEN** bill có 7 món nhưng chỉ đọc được 5 món và có dòng nhóm
- **THEN** hệ thống giữ 5 món đã đọc và không thay bằng hai dòng nhóm

#### Scenario: Không đọc được món nào
- **WHEN** không đọc được món nào nhưng có dòng `Tổng đồ uống` và `Tổng đồ ăn`
- **THEN** hệ thống dùng hai dòng nhóm làm món, mỗi nhóm một dòng

### Requirement: Đối soát theo nhóm và thêm món chưa đọc được
Với mỗi dòng nhóm, hệ thống SHALL xác định nhóm là các món đứng ngay trên dòng đó, từ dòng nhóm trước hoặc đầu bảng. Tổng các món của nhóm SHALL được so với số trên dòng nhóm. Nếu nhóm thiếu tiền, hệ thống SHALL thêm một dòng "Món chưa đọc được" vào đúng nhóm, với thành tiền bằng phần thiếu và đánh dấu `uncertain`, kèm ghi chú nêu tên nhóm, số tiền các món cộng được, số tiền dòng nhóm ghi và phần thiếu. Đối soát theo nhóm không giới hạn 10% như đối soát tổng vì tổng nhóm là số đáng tin. Nhóm đã khớp thì giữ nguyên. Nhóm có tổng các món lớn hơn dòng nhóm thì giữ nguyên các món và báo lệch, không tự xoá món. Nếu không xác định được nhóm thì hệ thống đối soát chung giữa tổng các nhóm và tổng các món. Tổng các dòng nhóm SHALL bằng `readTotal` sau khi trừ giảm giá, phí và VAT, và được dùng làm nguồn xác nhận thứ hai cho tổng bill.

#### Scenario: Nhóm Food thiếu một món
- **WHEN** các món phía trên dòng `Food` cộng được 1.290.000 và dòng `Food` ghi 1.510.000
- **THEN** hệ thống thêm dòng "Món chưa đọc được" thành tiền 220.000 vào nhóm Food, đánh dấu `uncertain`
- **AND** ghi chú nêu "Food: các món cộng được 1.290.000, dòng Food ghi 1.510.000, thiếu 220.000"

#### Scenario: Nhóm đã khớp
- **WHEN** tổng các món của một nhóm bằng số trên dòng nhóm
- **THEN** nhóm đó được giữ nguyên, không thêm dòng

#### Scenario: Nhóm có tổng món lớn hơn dòng nhóm
- **WHEN** tổng các món của nhóm lớn hơn số trên dòng nhóm
- **THEN** hệ thống giữ nguyên các món và báo lệch

#### Scenario: Không xác định được nhóm
- **WHEN** không có món nào nằm trên dòng nhóm
- **THEN** hệ thống đối soát chung giữa tổng các nhóm và tổng các món

### Requirement: Chọn tổng bill đọc được
Hệ thống SHALL lấy `readTotal` từ dòng có nhãn `Tổng`, `Tổng cộng`, `Tổng thanh toán`, `Tổng tiền`, `Amount`, `Total` hoặc `Total amount` và coi là tổng với độ tin cậy cao. Nếu không có dòng nào mang nhãn tổng thì hệ thống SHALL lấy số ở dòng cuối cùng của bill làm `readTotal` với độ tin cậy thấp và đánh dấu để người dùng xem lại. Các dòng `Tiền hàng`, `Tạm tính`, `Subtotal`, `Tiền mặt`, `Tiền thừa` MUST NOT được nhận là tổng.

#### Scenario: Có dòng nhãn tổng
- **WHEN** bill có dòng `Tổng thanh toán`
- **THEN** số trên dòng đó là `readTotal` với độ tin cậy cao

#### Scenario: Không có nhãn tổng
- **WHEN** bill không có dòng nhãn tổng
- **THEN** số ở dòng cuối cùng là `readTotal` với độ tin cậy thấp và được đánh dấu để người dùng xem lại

#### Scenario: Dòng tiền hàng không phải tổng
- **WHEN** bill có dòng `Tiền hàng` và dòng `Tổng thanh toán`
- **THEN** `readTotal` lấy từ dòng `Tổng thanh toán`

### Requirement: Loại subtotal bị đọc thành món
Hệ thống SHALL xét các dòng gần cuối phần món, sát khu vực tổng và VAT. Dòng nào có giá trị lớn hơn 75% `readTotal` được coi là gần như chắc chắn là subtotal. Hệ thống SHALL thử bỏ dòng đó: nếu giữ lại làm tổng tính được gấp đôi `readTotal` thì SHALL loại hẳn dòng khỏi danh sách món. Dòng lớn mà bỏ ra không làm tổng khớp thì giữ nguyên, vì có thể đó là món đắt thật. Mỗi bill chỉ được loại subtotal một lần.

#### Scenario: Subtotal bị đọc thành món
- **WHEN** một dòng gần cuối có giá lớn hơn 75% `readTotal` và giữ lại làm tổng tính được gấp đôi `readTotal`
- **THEN** dòng đó bị loại khỏi danh sách món

#### Scenario: Món đắt thật
- **WHEN** một dòng lớn hơn 75% `readTotal` nhưng bỏ ra không làm tổng khớp
- **THEN** dòng đó được giữ nguyên trong danh sách món

### Requirement: Đối soát tổng bill trước khi điền đơn giá
Trước khi điền đơn giá, hệ thống SHALL tính `calcTotal = Σ thành tiền món − giảm giá + phí phục vụ + VAT` theo thứ tự R-8, rồi so với `readTotal` với dung sai làm tròn nhỏ khoảng 1.000 đ hoặc 0,5%. Kết quả chẩn đoán SHALL theo bảng sau:

| Tình huống | Chẩn đoán | Xử lý |
|---|---|---|
| `calcTotal` khớp `readTotal` | Khớp | Chuyển sang bước điền đơn giá |
| `calcTotal` gấp đôi `readTotal` | Có một subtotal bị tính như món | Tìm dòng gần cuối có giá gần bằng `calcTotal − readTotal` và loại khỏi món |
| `calcTotal` lớn hơn `readTotal` một chút | Giảm giá, thuế hoặc phí bị đọc thành món | Tìm một hoặc hai dòng cuối có giá bằng phần chênh; nhãn giảm giá hoặc dấu âm thì chuyển thành giảm giá; nhãn thuế hoặc phí thì chuyển thành VAT hoặc phí phục vụ; rồi tính lại |
| `calcTotal` nhỏ hơn `readTotal` một chút | Thiếu một món | Kiểm lại danh sách món; nếu có dòng ứng viên có giá bằng phần thiếu thì thêm vào; không có thì thêm món "Món chưa đọc được" với thành tiền bằng phần thiếu, đánh dấu `uncertain` |
| Vẫn lệch sau các bước trên | Không tự giải thích được | Giữ kết quả, đánh dấu `uncertain`, hiện cảnh báo lệch với số tiền chênh |

Mỗi lần sửa danh sách SHALL tính lại `calcTotal`. Mỗi bill tối đa một lần loại subtotal và một lần chuyển giảm giá hoặc thuế. Hệ thống MUST NOT sửa `readTotal` hay thành tiền của món để cho khớp.

#### Scenario: Tổng khớp ngay
- **WHEN** `calcTotal` khớp `readTotal` trong dung sai
- **THEN** hệ thống chuyển sang bước điền đơn giá

#### Scenario: Subtotal bị tính như món
- **WHEN** `calcTotal` gấp đôi `readTotal`
- **THEN** hệ thống tìm dòng gần cuối có giá gần bằng phần chênh và loại dòng đó khỏi món

#### Scenario: Giảm giá bị đọc thành món
- **WHEN** `calcTotal` lớn hơn `readTotal` một chút và một dòng cuối có giá bằng phần chênh, mang nhãn giảm giá
- **THEN** dòng đó được chuyển thành giảm giá và tổng được tính lại

#### Scenario: Thiếu một món
- **WHEN** `calcTotal` nhỏ hơn `readTotal` một chút và không có dòng ứng viên
- **THEN** hệ thống thêm món "Món chưa đọc được" với thành tiền bằng phần thiếu và đánh dấu `uncertain`

#### Scenario: Lệch không giải thích được
- **WHEN** sau các bước sửa vẫn lệch
- **THEN** kết quả được giữ, các món liên quan được đánh dấu `uncertain`, và form hiện cảnh báo lệch với số tiền chênh

### Requirement: Chỉ đọc đơn giá và số lượng khi thành tiền đã khớp
Hệ thống SHALL chỉ đọc đơn giá và số lượng khi thành tiền từng món, VAT, giảm giá, phí và tổng đã khớp bill. Nếu chưa khớp, hệ thống SHALL bỏ qua bước này để người dùng sửa.

#### Scenario: Tổng chưa khớp
- **WHEN** tổng chưa khớp sau đối soát
- **THEN** hệ thống không điền đơn giá và số lượng tự động

### Requirement: Sửa đúng một số khi số lượng nhân đơn giá không khớp thành tiền
Khi `SL × đơn giá` không bằng thành tiền, hệ thống SHALL sửa đúng một số, giữ nguyên thành tiền, theo thứ tự: nếu SL khác 1 và đã đọc được số lượng thì thử SL bằng 1 và đơn giá bằng thành tiền; nếu không được thì thử đơn giá bằng thành tiền chia cho SL khi chia hết; nếu vẫn không khớp thì giữ nguyên số đọc được và đánh dấu `uncertain`. Các món đã tự sửa SHALL được đánh dấu `uncertain`.

#### Scenario: Số lượng đọc sai thành 4
- **WHEN** món có SL đọc là 4, đơn giá 45.000 và thành tiền 45.000
- **THEN** hệ thống thử SL bằng 1, đơn giá bằng thành tiền, và đánh dấu món là `uncertain`

#### Scenario: Không cách nào khớp
- **WHEN** không có cách sửa một số nào làm `SL × đơn giá` bằng thành tiền
- **THEN** hệ thống giữ nguyên số đọc được và đánh dấu món `uncertain`, không đoán

### Requirement: Hoán đổi chữ số 1 và 4 khi cần sửa
Khi cần sửa một dòng, kể cả khi đối soát tổng lệch, hệ thống SHALL thử hoán đổi chữ số `1` thành `4` và `4` thành `1` ở từng chữ số của SL, đơn giá và thành tiền, mỗi lần đổi tối đa một hoặc hai chữ số, ưu tiên cách đổi ít chữ số nhất. Một cách đọc chỉ được nhận khi làm `SL × đơn giá = thành tiền` đúng. Nếu có nhiều cách, hệ thống SHALL chọn cách làm tổng các món khớp `readTotal`.

#### Scenario: Chữ số 1 bị đọc thành 4
- **WHEN** đơn giá đọc là `450.000` nhưng `SL × đơn giá` không bằng thành tiền `150.000` với SL 1
- **THEN** hệ thống thử đổi chữ số `4` thành `1` và nhận cách đọc làm phép nhân đúng

#### Scenario: Nhiều cách đều đúng phép nhân
- **WHEN** có nhiều cách đổi chữ số đều làm `SL × đơn giá = thành tiền`
- **THEN** hệ thống chọn cách làm tổng các món khớp `readTotal`

### Requirement: Tổng bill có dòng lặp lại
Khi bill có nhiều dòng lặp lại cùng một số, như `Tiền hàng`, `Tổng thanh toán` và `Còn phải thu`, và các dòng này đọc lệch nhau, hệ thống SHALL lấy số xuất hiện nhiều nhất. Nếu cả ba khác nhau, hệ thống SHALL thử hoán đổi `1` và `4` để chúng trùng nhau rồi mới dùng làm `readTotal`.

#### Scenario: Ba dòng tổng đọc lệch nhau
- **WHEN** `Tiền hàng` và `Tổng thanh toán` đọc cùng số, còn `Còn phải thu` khác
- **THEN** hệ thống lấy số xuất hiện nhiều nhất làm `readTotal`

### Requirement: Đọc tên món
Tên món SHALL chứa nhiều chữ. Số ở cuối tên giữ tối đa 4 chữ số, ví dụ `Bia 33` và `Bia 1964`. Số từ 3.000 trở lên trong tên được coi là số tiền và bị bỏ khỏi tên. Nếu số cuối dài hơn 4 chữ số thì hệ thống bỏ hết số đó khỏi tên, không cắt bớt. Số đứng đầu dòng như STT hoặc mã món bị coi là mã và bỏ khỏi tên. Nếu tên không còn chữ nào thì để `Món chưa rõ tên` và đánh dấu `uncertain`.

#### Scenario: Số ở cuối tên
- **WHEN** tên món là `Bia 33` và `Bia 1964`
- **THEN** tên giữ `Bia 33`, còn `1964` được giữ vì không quá 4 chữ số

#### Scenario: Số tiền trong tên
- **WHEN** tên món chứa số 3.000 trở lên
- **THEN** số đó bị bỏ khỏi tên

#### Scenario: Số dài ở cuối tên
- **WHEN** số cuối tên dài hơn 4 chữ số
- **THEN** hệ thống bỏ hết số đó, không cắt bớt

#### Scenario: Tên không còn chữ
- **WHEN** sau khi bỏ số, tên món không còn chữ nào
- **THEN** tên được đặt là "Món chưa rõ tên" và món được đánh dấu `uncertain`

### Requirement: Đưa kết quả vào form để người dùng kiểm tra
Phần còn lại SHALL được người dùng tự sửa trong Form Kiểm Tra Hoá Đơn. Kết quả OCR SHALL được điền vào form để người dùng kiểm tra trước khi lưu. Các món bị đánh dấu `uncertain` SHALL được tô vàng. Hệ thống MUST NOT chặn người dùng lưu chỉ vì kết quả đối soát chưa khớp.

#### Scenario: Món không chắc được tô vàng
- **WHEN** form có món bị đánh dấu `uncertain`
- **THEN** dòng món đó được tô vàng để người dùng xem lại

#### Scenario: Đối soát chưa khớp không chặn lưu
- **WHEN** đối soát báo `MISMATCH`
- **THEN** form hiện cảnh báo với `role="alert"` nhưng người dùng vẫn lưu được

### Requirement: Trạng thái đối soát và gợi ý đọc lại
`validateReceipt` SHALL trả về một trong bốn trạng thái: `OK` khi khớp ngay, `CORRECTED` khi khớp sau khi tự sửa và kèm ghi chú nêu đã sửa gì, `MISMATCH` khi mọi kịch bản đều lệch và giữ số đọc được, `UNVERIFIED` khi không có dòng tổng hoặc không có món để đối chiếu. Hệ thống SHALL hiện gợi ý "Đọc lại bằng AI" khi trạng thái là `MISMATCH` hoặc `UNVERIFIED`, hoặc không có món, hoặc còn dòng đếm thiếu món.

#### Scenario: Khớp ngay
- **WHEN** các dòng và tổng khớp mà không cần sửa
- **THEN** trạng thái là `OK` và form hiện thông báo xanh

#### Scenario: Khớp sau khi sửa
- **WHEN** đối soát khớp sau khi thử một kịch bản sửa
- **THEN** trạng thái là `CORRECTED`, form hiện ghi chú nêu đã sửa gì và tô vàng dòng đã sửa

#### Scenario: Không có dòng tổng để đối chiếu
- **WHEN** bill không có dòng tổng và không có món để đối chiếu
- **THEN** trạng thái là `UNVERIFIED` và người dùng được yêu cầu tự so với ảnh

#### Scenario: Gợi ý đọc lại
- **WHEN** trạng thái là `MISMATCH`
- **THEN** form hiện gợi ý "Đọc lại bằng AI"

### Requirement: Chọn kịch bản đối soát ít thay đổi nhất
Khi tổng lệch, hệ thống SHALL thử các kịch bản khác từ cùng văn bản OCR và chọn kịch bản ít thay đổi nhất. Các kịch bản gồm: sửa một trong ba số của một dòng, vì OCR hiếm khi hỏng hai số cùng dòng; bỏ dòng món thực ra là dòng tổng bị đọc lệch chữ như "Tông Cộng"; đổi hoặc thêm giảm giá, phí phục vụ, VAT, thử các mức phần trăm phổ biến; đổi cách tính gồm phí phục vụ tính trên tiền hàng trước giảm giá, VAT chỉ trên tiền hàng, giảm giá áp dụng sau cùng; và thử nhiều ứng viên làm tổng bill, gồm dòng `Tổng cộng` đọc được và các số ở dòng cuối bill.

#### Scenario: Kịch bản ít thay đổi nhất được chọn
- **WHEN** có nhiều kịch bản làm tổng khớp
- **THEN** hệ thống chọn kịch bản thay đổi ít số nhất

#### Scenario: Dòng tổng bị đọc thành món
- **WHEN** một dòng món có chữ như "Tông Cộng" và bỏ đi thì tổng khớp
- **THEN** hệ thống bỏ dòng đó khỏi danh sách món

### Requirement: Đọc hoá đơn GTGT dạng bảng
Bộ phân tích SHALL nhận biết bảng hoá đơn điện tử hoặc GTGT có cột số thứ tự (STT). Mỗi dòng có số thứ tự là một món. Tên món có thể xuống dòng trước hoặc sau. Cột "Đơn vị tính" nằm giữa bảng SHALL được nhận diện và bỏ khỏi tên. Khi bảng có cả cột tiền trước thuế và sau thuế, hệ thống SHALL chọn cột trước thuế.

#### Scenario: Bảng có cả hai cột tiền
- **WHEN** bảng có cột thành tiền trước thuế và sau thuế
- **THEN** hệ thống dùng cột trước thuế cho thành tiền của món

#### Scenario: Tên món xuống dòng
- **WHEN** tên một món nằm trên hai dòng của bảng
- **THEN** hai dòng được gộp thành một món và số thứ tự chỉ tính một lần

#### Scenario: Hoá đơn Grab dạng bảng
- **WHEN** hoá đơn có bảng STT với cột đơn vị tính ở giữa
- **THEN** mỗi dòng STT thành một món và cột đơn vị tính không bị lẫn vào tên món

### Requirement: Đếm dòng hàng để phát hiện thiếu món
Với bảng có số thứ tự, bộ phân tích SHALL đếm số dòng đánh số là `expected` và số món đọc được là `read`, rồi ghi vào `tableRows.expected` và `tableRows.read`. Nếu `expected` lớn hơn `read`, hệ thống SHALL coi là thiếu món và kết quả SHALL có các dòng `missingRows`, khiến gợi ý "Đọc lại bằng AI" được hiện.

#### Scenario: Thiếu món trong bảng
- **WHEN** bảng có 12 dòng đánh số nhưng chỉ đọc được 11 món
- **THEN** `tableRows.expected` là 12, `tableRows.read` là 11
- **AND** kết quả có `missingRows` nên form hiện gợi ý "Đọc lại bằng AI"

#### Scenario: Đủ món trong bảng
- **WHEN** số dòng đánh số bằng số món đọc được
- **THEN** không có `missingRows`

### Requirement: Hằng số và ngưỡng của đối soát và nhận dạng
Các ngưỡng sau SHALL được áp dụng như đã nêu: cạnh dài ảnh quét và ảnh OCR là 2800 px với hệ số phóng tối đa 3 lần; ảnh đã lưu tối đa 1 MB; bốn góc tờ giấy tối thiểu 12% diện tích; ngưỡng nhị phân `contrast` 0,25; ngưỡng ảnh đen 40%; ngưỡng dòng tổng nhóm và subtotal 75%; dung sai đối soát khoảng 1.000 đ hoặc 0,5%; số vùng đọc lại lượt 2 tối đa 40; viền trắng khoảng 20 px; worker rảnh tự dừng sau 60 giây; ngưỡng trùng Jaccard 0,8 và tối thiểu 8 từ.

#### Scenario: Ngưỡng dung sai đối soát
- **WHEN** `calcTotal` lệch `readTotal` không quá khoảng 1.000 đ hoặc 0,5%
- **THEN** hệ thống coi là khớp
