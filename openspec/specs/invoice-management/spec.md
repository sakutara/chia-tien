# invoice-management Specification

## Purpose
Capability này quản lý vòng đời của hoá đơn trong kèo: tạo, sửa, xoá hoá đơn, các quy tắc hợp lệ, cách tính tổng và các khoản điều chỉnh cả hoá đơn (giảm giá, phí phục vụ, VAT). Nó cũng quản lý ảnh hoặc PDF đính kèm hoá đơn, gồm chụp bằng camera, tải lên, nhập PDF, quét và nén ảnh, gợi ý chất lượng ảnh và cảnh báo ảnh trùng trong cùng bữa. Người dùng là các thành viên ghi lại chi phí của bữa từ bill giấy hoặc bill điện tử. Việc đọc chữ từ ảnh thuộc `receipt-ocr`, còn gán người ăn, chế độ chia và phép chia tiền thuộc `bill-splitting`.

## Requirements

### Requirement: Tạo hoá đơn trong kèo
Hệ thống SHALL cho tạo hoá đơn mới trong một kèo của bữa đang ở trạng thái ACTIVE, và chỉ ghi hoá đơn khi toàn bộ dữ liệu đã hợp lệ. Hoá đơn được gắn với bữa và kèo chứa nó, còn tổng tiền được tính ngay khi lưu. Người ứng tiền phải là người tham gia kèo, và kèo phải có ít nhất một người tham gia.

#### Scenario: Tạo hoá đơn có món thành công
- **WHEN** người dùng lưu hoá đơn có hai món, không có giảm giá, phí phục vụ hay VAT, trong kèo có ba người tham gia
- **THEN** hệ thống tạo hoá đơn cùng hai dòng món, và tổng tiền của hoá đơn bằng tổng thành tiền của các món
- **AND** thời điểm cập nhật của bữa được ghi nhận lại

#### Scenario: Người ứng không thuộc kèo
- **WHEN** người ứng được chọn không nằm trong danh sách người tham gia kèo
- **THEN** hệ thống từ chối lưu và báo người ứng tiền phải tham gia kèo này
- **AND** không có hoá đơn hay món nào được ghi

#### Scenario: Kèo không có người tham gia
- **WHEN** người dùng lưu hoá đơn vào một kèo không còn người tham gia nào
- **THEN** hệ thống từ chối lưu và báo kèo chưa có người tham gia

#### Scenario: Bữa đã lưu trữ
- **WHEN** người dùng tạo hoá đơn trong bữa có trạng thái ARCHIVED
- **THEN** hệ thống từ chối với mã `MEAL_ARCHIVED` và không ghi gì

### Requirement: Hai cách nhập hoá đơn
Hệ thống SHALL hỗ trợ hai cách nhập hoá đơn: `ITEMIZED` có danh sách món, và `TOTAL_ONLY` chỉ nhập tiền hàng dưới dạng một con số. Hoá đơn `ITEMIZED` MUST có ít nhất một món. Hoá đơn `TOTAL_ONLY` không có danh sách món nào.

#### Scenario: Hoá đơn có món nhưng không có món nào
- **WHEN** người dùng lưu hoá đơn ở chế độ có món mà danh sách món rỗng
- **THEN** hệ thống từ chối và báo hoá đơn có món phải có ít nhất một món

#### Scenario: Nhập chỉ tổng tiền
- **WHEN** người dùng tắt chế độ nhập chi tiết món và nhập tiền hàng 200 000 đồng, không có khoản điều chỉnh nào
- **THEN** hệ thống lưu hoá đơn ở chế độ `TOTAL_ONLY` với tổng thanh toán 200 000 đồng và không có món nào

#### Scenario: Hoá đơn đã có ảnh luôn ở chế độ có món
- **WHEN** hoá đơn đã có ít nhất một ảnh và đang ở chế độ có món
- **THEN** công tắc chuyển sang chỉ nhập tổng tiền không được hiện, vì ảnh đã được đọc ra danh sách món

### Requirement: Quy tắc của từng món
Hệ thống SHALL kiểm tra từng món trước khi lưu: tên món là bắt buộc và tối đa 100 ký tự sau khi bỏ khoảng trắng thừa, số lượng là số nguyên từ 1, đơn giá là số tiền không âm. Thành tiền mặc định bằng số lượng nhân đơn giá, nhưng người dùng có thể nhập thành tiền khác và giá trị đó phải là số tiền không âm.

#### Scenario: Tên món chỉ có khoảng trắng
- **WHEN** người dùng lưu món có tên chỉ gồm khoảng trắng
- **THEN** hệ thống từ chối và báo tên món là bắt buộc, không ghi hoá đơn

#### Scenario: Số lượng không phải số nguyên dương
- **WHEN** người dùng nhập số lượng 0 hoặc 1,5 cho một món
- **THEN** hệ thống từ chối và báo số lượng của món phải là số nguyên từ 1

#### Scenario: Thành tiền nhập tay
- **WHEN** món có số lượng 10, đơn giá 25 000 đồng và thành tiền nhập tay 200 000 đồng, ví dụ bill đã giảm giá từng dòng
- **THEN** thành tiền của món là 200 000 đồng và tiền hàng của hoá đơn tính theo thành tiền đã nhập

#### Scenario: Dòng món để trống bị bỏ qua
- **WHEN** form có một dòng món được thêm vào rồi để trống hoàn toàn
- **THEN** dòng đó không được lưu và không gây lỗi

### Requirement: Cách nhập số tiền
Hệ thống SHALL đọc số tiền từ ô nhập theo các cách viết 45000, 45.000, 1,620,000, 45k và 1,5k, trong đó đơn vị k nhân với 1000. Số tiền tối đa là 9 999 999 999 đồng và không nhận số âm. Ô trống hoặc viết sai báo lỗi kèm ví dụ cách viết đúng.

#### Scenario: Viết tắt bằng chữ k
- **WHEN** người dùng nhập 45k vào ô tiền hàng
- **THEN** hệ thống hiểu là 45 000 đồng

#### Scenario: Số tiền âm
- **WHEN** người dùng nhập -5 vào một ô số tiền
- **THEN** hệ thống không nhận giá trị và báo ô đó không hợp lệ, kèm ví dụ 45000, 45.000 hoặc 45k

#### Scenario: Số tiền vượt mức tối đa
- **WHEN** người dùng nhập số tiền lớn hơn 9 999 999 999 đồng
- **THEN** hệ thống không nhận giá trị và báo ô đó không hợp lệ

### Requirement: Tên quán và ngày trên hoá đơn
Hệ thống SHALL lưu tên quán tuỳ chọn, tối đa 100 ký tự, với khoảng trắng thừa được gộp lại. Tên quán chỉ có khoảng trắng coi như không có. Ngày trên hoá đơn là tuỳ chọn và phải là một ngày tồn tại thật. Ô ngày trên form gợi ý khoảng từ 2000-01-01 đến 2099-12-31, nhưng việc lưu không kiểm tra khoảng này.

#### Scenario: Tên quán được gọn khoảng trắng
- **WHEN** người dùng nhập tên quán là "  Lẩu   Bò  "
- **THEN** hệ thống lưu tên là "Lẩu Bò"
- **AND** nếu tên quán chỉ gồm khoảng trắng thì hoá đơn không có tên quán

#### Scenario: Tên quán quá dài
- **WHEN** tên quán sau khi làm gọn có 101 ký tự
- **THEN** hệ thống từ chối và báo tên quán tối đa 100 ký tự

#### Scenario: Ngày không tồn tại
- **WHEN** ngày trên hoá đơn là 30/02/2026
- **THEN** hệ thống từ chối và báo ngày trên hoá đơn không hợp lệ

#### Scenario: Ngày ngoài khoảng gợi ý
- **WHEN** ngày trên hoá đơn là 1999-12-31, đúng định dạng và có thật
- **THEN** hệ thống vẫn lưu hoá đơn với ngày đó

### Requirement: Khoản điều chỉnh cả hoá đơn
Hệ thống SHALL hỗ trợ ba khoản điều chỉnh cả hoá đơn là giảm giá, phí phục vụ và VAT. Mỗi khoản có một trong ba chế độ: không áp dụng, theo phần trăm, hoặc theo số tiền cố định. Giá trị theo phần trăm MUST là số nguyên từ 0 đến 100, và giá trị theo số tiền MUST là số tiền không âm theo cách đọc số tiền của form.

#### Scenario: Phần trăm nằm ngoài khoảng cho phép
- **WHEN** giảm giá được nhập 150 phần trăm, hoặc phí phục vụ theo phần trăm được nhập -1
- **THEN** hệ thống từ chối và báo lỗi đúng cho khoản đó, giảm giá hoặc phí phục vụ

#### Scenario: Phần trăm không phải số nguyên hoặc để trống
- **WHEN** VAT theo phần trăm được nhập 8,5 hoặc bỏ trống
- **THEN** hệ thống báo VAT: nhập tỷ lệ phần trăm là số nguyên và không lưu

#### Scenario: Số tiền cố định âm
- **WHEN** VAT theo số tiền được nhập -5
- **THEN** ô số tiền không được nhận và hệ thống báo VAT không hợp lệ, kèm ví dụ cách viết đúng

#### Scenario: Đổi chế độ xoá giá trị cũ
- **WHEN** người dùng đổi chế độ của một khoản điều chỉnh từ phần trăm sang số tiền
- **THEN** ô giá trị được xoá trắng để người dùng nhập lại theo chế độ mới

### Requirement: Công thức tổng hoá đơn và xem trước
Hệ thống SHALL tính tổng hoá đơn theo đúng thứ tự: tiền hàng trừ giảm giá, phí phục vụ tính trên phần sau giảm giá, rồi VAT tính trên phần sau giảm giá cộng phí phục vụ. Mỗi khoản tiền được làm tròn đến đồng, nửa lên. Tiền hàng và tổng thanh toán MUST lớn hơn 0, và tiền giảm giá MUST nhỏ hơn tiền hàng. Hệ thống hiển thị tổng xem trước khi dữ liệu đã đủ.

#### Scenario: Ví dụ đầy đủ các khoản điều chỉnh
- **WHEN** tiền hàng là 550 000 đồng, giảm giá 10 phần trăm, phí phục vụ 5 phần trăm, VAT 8 phần trăm
- **THEN** tiền giảm là 55 000 đồng, phí phục vụ là 24 750 đồng, VAT là 41 580 đồng và tổng thanh toán là 561 330 đồng

#### Scenario: Giảm giá bằng hoặc vượt tiền hàng
- **WHEN** giảm giá theo số tiền bằng đúng tiền hàng 550 000 đồng
- **THEN** hệ thống từ chối và báo giảm giá phải nhỏ hơn tiền hàng

#### Scenario: Xem trước khi dữ liệu chưa đủ
- **WHEN** người dùng chưa nhập món hoặc tiền hàng nào
- **THEN** hệ thống không hiện tổng và thay bằng lý do còn thiếu dữ liệu hoặc gợi ý nhập món hoặc tiền hàng

#### Scenario: Tổng tính được lệch tổng ghi trên bill
- **WHEN** tổng ghi trên bill đọc được từ OCR là 1 650 000 đồng nhưng tổng tính được là 1 620 000 đồng
- **THEN** hệ thống hiện cảnh báo nêu cả hai số và gợi ý kiểm tra giảm giá, phí phục vụ hoặc VAT
- **AND** cảnh báo không chặn việc lưu, người dùng vẫn lưu được hoá đơn

### Requirement: Sửa hoá đơn
Hệ thống SHALL cho sửa hoá đơn đã lưu theo cùng quy tắc như khi tạo. Khi sửa, món còn lại giữ nguyên mã định danh, món không còn trong form bị xoá khỏi hoá đơn, và tổng được tính lại từ đầu. Bữa đã lưu trữ MUST khoá việc sửa hoá đơn.

#### Scenario: Món đã có giữ nguyên mã định danh
- **WHEN** người dùng sửa tên và số lượng của một món đã có, bỏ một món khác và thêm một món mới
- **THEN** món đã có giữ nguyên mã định danh với thông tin mới, món bị bỏ được xoá, món mới được thêm
- **AND** tổng của hoá đơn được tính lại theo danh sách mới

#### Scenario: Sửa hoá đơn của bữa đã lưu trữ
- **WHEN** người dùng sửa hoá đơn trong bữa có trạng thái ARCHIVED
- **THEN** hệ thống từ chối với mã `MEAL_ARCHIVED` và hoá đơn giữ nguyên

### Requirement: Xoá hoá đơn
Hệ thống SHALL xoá hoá đơn cùng toàn bộ món và ảnh của nó. Trước khi xoá, hệ thống MUST cho biết số món và số file ảnh sẽ bị mất. Ảnh được xoá trước, rồi mới xoá dữ liệu hoá đơn; nếu xoá ảnh lỗi thì hoá đơn vẫn còn nguyên.

#### Scenario: Xem trước số lượng sẽ mất
- **WHEN** người dùng chuẩn bị xoá một hoá đơn có hai món và một ảnh
- **THEN** hệ thống báo hoá đơn này sẽ bị xoá cùng 2 món và 1 file ảnh, và không hoàn tác được

#### Scenario: Xoá hoàn tất
- **WHEN** người dùng xác nhận xoá hoá đơn đó
- **THEN** hoá đơn, các món và ảnh của nó không còn tồn tại
- **AND** xoá lại hoá đơn đã mất sẽ bị báo không tìm thấy hoá đơn

### Requirement: Tên kèo theo quán từ bill
Hệ thống SHALL đổi tên kèo thành "Kèo" cộng tên quán khi lưu hoá đơn có tên quán đọc từ OCR và người dùng chưa sửa ô quán. Kèo còn tên mặc định có dạng "Kèo" cộng số thứ tự, hoặc "Venue" cộng số thứ tự. Kèo đã có tên do người dùng đặt MUST giữ nguyên tên. Tên kèo sau khi đổi không vượt 80 ký tự.

#### Scenario: Kèo tên mặc định được đổi theo quán
- **WHEN** hoá đơn có tên quán lấy từ ảnh bill được lưu vào kèo đang có tên mặc định
- **THEN** kèo đổi tên thành "Kèo" cộng tên quán, ví dụ "Kèo Lẩu Bò Gỗ"
- **AND** hệ thống thông báo đã đổi tên kèo

#### Scenario: Kèo đã có tên riêng
- **WHEN** hoá đơn có tên quán lấy từ ảnh bill được lưu vào kèo tên "Karaoke"
- **THEN** tên kèo vẫn là "Karaoke"

#### Scenario: Người dùng sửa tên quán do OCR điền
- **WHEN** người dùng sửa ô quán sau khi OCR đã điền và lưu hoá đơn vào kèo tên mặc định
- **THEN** tên kèo không đổi

### Requirement: Định dạng, dung lượng và số lượng ảnh đính kèm
Hệ thống SHALL chỉ nhận ảnh JPEG, PNG hoặc WebP làm ảnh hoá đơn, với dung lượng tối đa 40 MB (41 943 040 byte) cho mỗi ảnh trước khi xử lý. Một hoá đơn MUST có tối đa 10 ảnh, kể cả ảnh tách từ PDF. Khi trình duyệt không cho biết kiểu tệp, hệ thống suy ra kiểu từ đuôi .jpg, .jpeg, .png hoặc .webp.

#### Scenario: Tệp không phải ảnh được hỗ trợ
- **WHEN** người dùng tải lên một tệp GIF
- **THEN** hệ thống từ chối tệp và báo chỉ nhận JPEG, PNG, WebP hoặc PDF, kèm gợi ý đổi sang JPEG nếu máy chụp ảnh HEIC
- **AND** không có ảnh nào được lưu

#### Scenario: Tệp ảnh không có kiểu MIME
- **WHEN** người dùng tải lên tệp có đuôi .jpg nhưng trình duyệt không cho kiểu tệp
- **THEN** hệ thống nhận tệp như ảnh JPEG

#### Scenario: Ảnh vượt quá 40 MB
- **WHEN** người dùng tải lên ảnh nặng hơn 40 MB
- **THEN** hệ thống từ chối và báo ảnh tối đa 40 MB

#### Scenario: Thêm ảnh thứ mười một
- **WHEN** hoá đơn đã có 10 ảnh và người dùng thêm thêm một ảnh
- **THEN** hệ thống từ chối với thông báo mỗi hoá đơn tối đa 10 ảnh
- **AND** nút chụp và nút tải lên bị khoá khi đã đủ 10 ảnh

### Requirement: Chụp ảnh hoá đơn bằng camera
Hệ thống SHALL mở camera ngay trong trang khi trang chạy trong ngữ cảnh an toàn của trình duyệt và trình duyệt hỗ trợ truy cập camera, yêu cầu độ phân giải lý tưởng 2560 x 1920. Người dùng bấm chụp để thêm khung hình thành ảnh JPEG chất lượng 0,92 của hoá đơn. Nếu không mở được camera trong trang, hệ thống MUST đề nghị dùng camera của máy.

#### Scenario: Chụp ảnh thành công
- **WHEN** camera trong trang đã mở và người dùng bấm Chụp
- **THEN** ảnh JPEG của khung hình được thêm vào hoá đơn như một ảnh tải lên

#### Scenario: Quyền camera bị từ chối
- **WHEN** người dùng từ chối quyền camera hoặc máy không có camera dùng được
- **THEN** hệ thống báo không mở được camera trong app và hiện nút Dùng camera của máy
- **AND** khi người dùng bấm nút đó, ứng dụng camera của máy được mở

#### Scenario: Không ở ngữ cảnh an toàn
- **WHEN** người dùng bấm chụp ảnh nhưng trang không chạy trong ngữ cảnh an toàn của trình duyệt
- **THEN** ứng dụng camera của máy được mở ngay

### Requirement: Nhập PDF làm hoá đơn
Hệ thống SHALL nhận tệp PDF tối đa 40 MB làm ảnh đính kèm hoá đơn. Mỗi trang PDF thành một ảnh JPEG cạnh dài khoảng 2800 px, chất lượng 0,92, và không qua bước quét hay nén ảnh. Trang có ít nhất 20 ký tự chữ (không tính khoảng trắng) được lưu kèm văn bản của PDF để không phải đọc lại bằng OCR. Chỉ các trang đầu còn chỗ được nhận, và hệ thống MUST báo khi PDF bị cắt bớt. PDF có mật khẩu hoặc không đọc được MUST bị từ chối với thông báo tương ứng.

#### Scenario: PDF có trang có chữ và trang ảnh quét
- **WHEN** người dùng tải lên PDF hai trang, trang một có lớp chữ và trang hai là ảnh quét
- **THEN** hai ảnh được thêm vào hoá đơn
- **AND** ảnh trang một mang kèm văn bản của PDF, còn ảnh trang hai không có văn bản

#### Scenario: PDF dài hơn số chỗ còn lại
- **WHEN** hoá đơn còn một chỗ và người dùng tải lên PDF ba trang
- **THEN** chỉ trang đầu được thêm vào hoá đơn
- **AND** hệ thống báo PDF có 3 trang nhưng chỉ nhận 1 trang đầu, và mỗi hoá đơn tối đa 10 ảnh

#### Scenario: PDF có mật khẩu
- **WHEN** người dùng tải lên PDF có mật khẩu
- **THEN** hệ thống từ chối và báo PDF cần được mở khoá trước khi tải lại

#### Scenario: PDF không đọc được
- **WHEN** người dùng tải lên tệp PDF hỏng hoặc không đọc được
- **THEN** hệ thống từ chối với mã `PDF_INVALID` và gợi ý xuất lại PDF hoặc chụp ảnh hoá đơn
- **AND** không có ảnh nào được lưu

### Requirement: Quét và nén ảnh khi lưu
Hệ thống SHALL xử lý mọi ảnh hoá đơn khi lưu bằng cách quét tờ hoá đơn thành ảnh xám, cắt và nắn thẳng khi thấy đủ bốn góc, với cạnh dài tối đa 2800 px. Nếu quá trình quét lỗi, ảnh được nén ở mức Cân bằng cố định, cạnh dài tối đa 2000 px và chất lượng 0,8. Ảnh luôn được lưu dù xử lý lỗi, và hệ thống MUST lưu dung lượng trước và sau khi xử lý để hiển thị.

#### Scenario: Ảnh chụp tờ hoá đơn được cắt và nắn thẳng
- **WHEN** người dùng thêm ảnh chụp tờ hoá đơn mà hệ thống tìm thấy đủ bốn góc
- **THEN** ảnh được lưu là ảnh xám đã cắt và nắn thẳng, cạnh dài tối đa 2800 px
- **AND** ảnh được lưu dạng PNG nếu PNG không quá khoảng 1 MB, nếu không thì dạng JPEG hạ chất lượng dần để cố đạt khoảng 1 MB
- **AND** mức nén của ảnh được ghi là Giữ nguyên

#### Scenario: Không thấy tờ giấy rõ
- **WHEN** người dùng thêm ảnh mà hệ thống không tìm thấy đủ bốn góc tờ giấy
- **THEN** ảnh giữ nguyên toàn khung hình nhưng vẫn được chuyển thành ảnh xám và ghi mức nén Giữ nguyên

#### Scenario: Hiển thị dung lượng trước và sau xử lý
- **WHEN** ảnh đã lưu có dung lượng gốc khác dung lượng sau xử lý
- **THEN** danh sách ảnh hiển thị dung lượng gốc và dung lượng sau xử lý, ngăn cách bằng dấu mũi tên
- **AND** khi hai dung lượng bằng nhau thì chỉ hiển thị một dung lượng

#### Scenario: Bản quét lớn hơn ảnh gốc
- **WHEN** bản quét của ảnh có dung lượng lớn hơn ảnh gốc
- **THEN** hệ thống vẫn lưu bản quét và không giữ lại ảnh gốc

#### Scenario: Quét lỗi nên nén theo mức Cân bằng
- **WHEN** quá trình quét ném lỗi nhưng ảnh vẫn đọc được
- **THEN** ảnh được nén ở mức Cân bằng: cạnh dài tối đa 2000 px, JPEG chất lượng 0,8
- **AND** chỉ dùng bản nén khi bản nén nhỏ hơn ảnh gốc, nếu không thì giữ ảnh gốc

#### Scenario: Ảnh nén Cân bằng vẫn lớn
- **WHEN** bản nén Cân bằng vẫn có dung lượng trên khoảng 1 MB
- **THEN** hệ thống hạ chất lượng JPEG lần lượt qua các mức 0,85, 0,75, 0,65 và 0,55
- **AND** nếu vẫn lớn thì thu cạnh dài còn 0,8 lần mỗi bước, không xuống dưới 1400 px, rồi giữ bản nhỏ nhất đã thử

#### Scenario: Ảnh nhỏ không nén lại
- **WHEN** ảnh có cạnh dài không quá 2000 px và dung lượng dưới 400 KB trong nhánh nén Cân bằng
- **THEN** ảnh được lưu nguyên, không đổi kích thước và chỉ hiển thị một dung lượng

#### Scenario: Ảnh rất lớn được giải mã thu nhỏ trước
- **WHEN** ảnh có cạnh dài trên 4096 px
- **THEN** ảnh được giải mã thu nhỏ về cạnh dài 4096 px trước khi quét hoặc nén

#### Scenario: Xử lý ảnh lỗi hoàn toàn
- **WHEN** cả quá trình quét lẫn nén đều không xử lý được ảnh
- **THEN** ảnh gốc vẫn được lưu vào hoá đơn và không bị mất, và không ghi mức nén

### Requirement: Gợi ý chất lượng ảnh
Hệ thống SHALL cảnh báo khi thêm ảnh có cạnh dài nhỏ đến mức OCR dễ đọc sai, dựa trên ảnh đầu tiên trong đợt thêm gần nhất. Ảnh có cạnh dài dưới 1000 px được cảnh báo rằng ảnh nhỏ và OCR có thể đọc sai, nên chụp lại ở độ phân giải cao hơn hoặc gần bill hơn. Ảnh có cạnh dài từ 1000 đến 1400 px được cảnh báo rằng mức này có thể làm OCR kém với bill chữ nhỏ. Cảnh báo không chặn việc lưu ảnh.

#### Scenario: Ảnh quá nhỏ
- **WHEN** người dùng thêm ảnh 800 x 600 px
- **THEN** hệ thống hiện cảnh báo ảnh nhỏ và OCR có thể đọc sai
- **AND** ảnh vẫn được lưu

#### Scenario: Ảnh cỡ trung bình
- **WHEN** người dùng thêm ảnh 1200 x 900 px
- **THEN** hệ thống hiện cảnh báo rằng OCR có thể kém với bill chữ nhỏ
- **AND** ảnh vẫn được lưu

### Requirement: Xem, tải và xoá ảnh đính kèm
Hệ thống SHALL cho xem ảnh đã lưu, tải ảnh về máy và xoá từng ảnh. Xoá ảnh MUST có hộp xác nhận nêu rõ không hoàn tác được. Với hoá đơn đã lưu, thêm hoặc xoá ảnh cập nhật ngay danh sách ảnh của hoá đơn. Khi đang xem ảnh, phím Esc chỉ đóng trình xem và không đóng form hoá đơn bên dưới.

#### Scenario: Xoá ảnh có xác nhận
- **WHEN** người dùng bấm xoá một ảnh
- **THEN** hệ thống hiện hộp xác nhận nêu ảnh sẽ bị xoá khỏi bộ nhớ và không hoàn tác được
- **AND** nếu người dùng xác nhận thì ảnh biến khỏi danh sách

#### Scenario: Phím Esc khi đang xem ảnh
- **WHEN** trình xem ảnh đang mở trên form hoá đơn và người dùng bấm Esc
- **THEN** trình xem ảnh đóng
- **AND** form hoá đơn bên dưới vẫn mở

#### Scenario: Ảnh không còn dữ liệu
- **WHEN** người dùng mở một ảnh mà dữ liệu của nó không còn trong bộ nhớ
- **THEN** hệ thống báo không còn dữ liệu ảnh này

### Requirement: Ảnh của hoá đơn đang soạn
Hệ thống SHALL gắn ảnh thêm khi đang soạn vào hoá đơn sắp được tạo, để ảnh đã có đúng hoá đơn đó khi lưu. Khi huỷ form của hoá đơn chưa lưu, mọi ảnh tạm của nó MUST bị xoá. Khi huỷ form của hoá đơn đã lưu, ảnh của hoá đơn được giữ nguyên. Khi mở một bữa, hệ thống dọn các ảnh mồ côi của bữa đó, tức ảnh có hoá đơn không còn tồn tại.

#### Scenario: Huỷ form hoá đơn mới
- **WHEN** người dùng thêm hai ảnh vào hoá đơn đang soạn rồi huỷ form mà chưa lưu
- **THEN** hai ảnh tạm bị xoá và không còn ảnh nào của hoá đơn đó

#### Scenario: Huỷ form sửa hoá đơn đã lưu
- **WHEN** người dùng huỷ form sửa một hoá đơn đã lưu có ảnh
- **THEN** các ảnh của hoá đơn đó được giữ nguyên

#### Scenario: Dọn ảnh mồ côi của bữa
- **WHEN** bữa có ảnh thuộc một hoá đơn không còn tồn tại và người dùng mở bữa đó
- **THEN** các ảnh mồ côi đó bị xoá
- **AND** ảnh của hoá đơn còn tồn tại được giữ nguyên

### Requirement: Cảnh báo ảnh trùng trong cùng bữa
Hệ thống SHALL so sánh văn bản OCR đã lưu của ảnh vừa quét với ảnh khác trong cùng bữa, sau khi quét OCR, và báo trùng khi tỷ lệ số từ chung trên tổng số từ khác nhau của hai văn bản đạt 80 phần trăm trở lên. Từ được so sánh đã bỏ dấu, chỉ giữ chữ và số, bỏ từ một ký tự. Chỉ kết luận khi cả hai văn bản đều có ít nhất 8 từ khác nhau. Ảnh chưa có văn bản OCR không được so sánh, và ảnh của bữa khác không được so sánh. Hệ thống chỉ cảnh báo và không tự xoá ảnh.

#### Scenario: Cùng một bill được chụp lại
- **WHEN** người dùng thêm ảnh của một bill đã có trong bữa, dù OCR đọc mất dấu
- **THEN** hệ thống hiện cảnh báo nêu tên hai ảnh, mức giống và hai lựa chọn Xoá ảnh trùng hoặc Giữ lại

#### Scenario: Xoá ảnh trùng
- **WHEN** người dùng bấm Xoá ảnh trùng trong cảnh báo
- **THEN** ảnh mới vừa thêm bị xoá và cảnh báo biến mất

#### Scenario: Bill khác nhau
- **WHEN** văn bản OCR của hai ảnh khác nhau về bill
- **THEN** hệ thống không cảnh báo trùng

#### Scenario: Ảnh trùng nằm trong cùng hoá đơn
- **WHEN** mọi ảnh vừa quét đều trùng với ảnh đã có trong cùng hoá đơn đang soạn
- **THEN** hệ thống cảnh báo trùng nhưng không điền lại form từ văn bản đó

### Requirement: Bữa lưu trữ khoá thay đổi ảnh và hoá đơn
Hệ thống MUST khoá mọi thao tác thêm ảnh, xoá ảnh, tạo, sửa và xoá hoá đơn khi bữa có trạng thái ARCHIVED. Các thao tác này bị từ chối với mã `MEAL_ARCHIVED`, và dữ liệu hoá đơn cùng ảnh giữ nguyên.

#### Scenario: Thêm hoặc xoá ảnh của bữa đã lưu trữ
- **WHEN** người dùng thêm một ảnh hoặc xoá một ảnh của hoá đơn trong bữa ARCHIVED
- **THEN** hệ thống từ chối với mã `MEAL_ARCHIVED`
- **AND** các ảnh của hoá đơn vẫn còn nguyên

### Requirement: Mã lỗi khi lưu hoá đơn và ảnh
Hệ thống SHALL trả về mã lỗi nghiệp vụ khi từ chối một thao tác về hoá đơn hoặc ảnh, gồm `SESSION_NOT_FOUND`, `SESSION_EMPTY`, `PAYER_NOT_IN_SESSION`, `INVOICE_NOT_FOUND`, `INVOICE_EXISTS`, `INVALID_ITEM`, `INVALID_AMOUNT`, `INVALID_DISCOUNT`, `INVALID_SERVICE`, `INVALID_VAT`, `INVALID_NAME`, `INVALID_DATE`, `MEAL_NOT_FOUND`, `MEAL_ARCHIVED`, `FILE_TYPE_NOT_ALLOWED`, `FILE_TOO_LARGE`, `TOO_MANY_FILES`, `PDF_ENCRYPTED` và `PDF_INVALID`.

#### Scenario: Từ chối lưu hoá đơn không hợp lệ
- **WHEN** người dùng lưu hoá đơn vi phạm một quy tắc của capability này
- **THEN** hệ thống từ chối với mã tương ứng với lỗi phát hiện đầu tiên
- **AND** không có hoá đơn, món hay ảnh nào được ghi
