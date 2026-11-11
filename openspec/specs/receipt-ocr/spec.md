# receipt-ocr Specification

## Purpose
Capability này đọc ảnh chụp hoặc PDF hoá đơn thành dữ liệu có cấu trúc (ngày, tên quán, món, số lượng, đơn giá, thành tiền, giảm giá, phí phục vụ, VAT, tổng bill) ngay trên trình duyệt, không cần mạng. Gồm tiền xử lý ảnh, nhận diện chữ bằng VietOCR dạng ONNX chạy trong Web Worker, đọc lớp chữ có sẵn của PDF, bộ phân tích văn bản, đối chiếu tổng tiền và tự sửa số đọc sai. Kết quả được đưa vào form hoá đơn để người dùng kiểm tra trước khi lưu. Ngoài ra người dùng có thể dán văn bản OCR đã có từ công cụ ngoài. Capability dành cho người dùng nhập hoá đơn bữa ăn chung.

## Requirements

### Requirement: Cắt và nắn thẳng tờ hoá đơn khi thêm ảnh chụp
Hệ thống SHALL dò bốn góc của tờ giấy sáng lớn nhất trong ảnh chụp hoá đơn, cắt và nắn phối cảnh thành hình chữ nhật không còn nền, rồi đưa cạnh dài về 2800 px (phóng tối đa 3 lần). Ảnh sau xử lý là ảnh xám, không nhị phân hoá, để chữ in nhiệt mờ không bị đứt nét. Nếu không tìm thấy tờ giấy rõ ràng, hệ thống giữ cả ảnh và cũng đưa cạnh dài về 2800 px (phóng tối đa 3 lần).

#### Scenario: Ảnh chụp nghiêng trên nền tối
- **WHEN** người dùng thêm ảnh chụp tờ hoá đơn nghiêng trên nền tối
- **THEN** hệ thống cắt theo bốn góc tờ giấy và nắn thẳng thành hình chữ nhật
- **AND** ảnh kết quả là ảnh xám, không có vùng nền tối ở mép

#### Scenario: Không tách được tờ giấy khỏi nền
- **WHEN** ảnh gần như đồng nhất hoặc tờ giấy không tách rõ khỏi nền
- **THEN** hệ thống giữ cả ảnh và đưa cạnh dài về 2800 px (phóng tối đa 3 lần)

#### Scenario: Tờ giấy đã chiếm gần hết khung ảnh
- **WHEN** tờ giấy chiếm trên 97% diện tích ảnh và gần thẳng
- **THEN** hệ thống không cắt

#### Scenario: Ảnh đã xử lý được lưu theo dung lượng
- **WHEN** bản PNG của ảnh đã xử lý có dung lượng không quá 1 MB
- **THEN** ảnh được lưu dạng PNG, tên tệp thêm hậu tố `-scan`
- **AND** nếu PNG vượt 1 MB thì ảnh được lưu dạng JPEG

### Requirement: Tiền xử lý ảnh trước khi nhận dạng chữ
Trước khi nhận dạng, hệ thống SHALL dựng một bản ảnh riêng cho OCR: giải mã theo hướng EXIF, đưa cạnh dài về 2800 px, chuyển sang thang xám theo độ sáng 0,299 R + 0,587 G + 0,114 B, rồi kéo giãn tương phản theo phân vị 2% và 98% của mức xám. Bản này chỉ phục vụ nhận dạng và không thay ảnh đã lưu.

#### Scenario: Ảnh bill nhỏ được phóng to
- **WHEN** ảnh có cạnh dài 1289 px
- **THEN** ảnh được phóng khoảng 2,17 lần để cạnh dài đạt 2800 px

#### Scenario: Ảnh rất nhỏ không phóng quá 3 lần
- **WHEN** ảnh có cạnh dài 500 px
- **THEN** ảnh được phóng tối đa 3 lần

#### Scenario: Ảnh chụp lớn được thu nhỏ
- **WHEN** ảnh có cạnh dài 4000 px
- **THEN** ảnh được thu về cạnh dài 2800 px

#### Scenario: Chữ mờ được kéo giãn tương phản
- **WHEN** ảnh có mức xám chỉ nằm trong một dải hẹp
- **THEN** mức xám được kéo giãn ra toàn dải 0 đến 255
- **AND** ảnh đồng nhất giữ nguyên giá trị

### Requirement: Nhận dạng chữ bằng VietOCR chạy ngoại tuyến
Hệ thống SHALL nhận dạng chữ bằng VietOCR dạng ONNX, gồm một detector DB (`det.onnx`) và một recognizer vgg_seq2seq (encoder và decoder), chạy trong Web Worker với WASM một luồng. Quá trình quét MUST NOT gọi mạng; model đi kèm ứng dụng trong thư mục public. Khi không có văn bản nào được nhận dạng, kết quả là danh sách rỗng.

#### Scenario: Quét khi không có mạng
- **WHEN** người dùng quét hoá đơn lúc thiết bị không có kết nối mạng
- **THEN** nhận dạng vẫn hoàn tất và trả về văn bản

#### Scenario: Lần quét đầu tiên khởi tạo bộ đọc chữ
- **WHEN** người dùng quét hoá đơn lần đầu sau khi mở ứng dụng
- **THEN** tiến trình hiển thị "Đang khởi tạo bộ đọc chữ" trước khi đọc ảnh

### Requirement: Phát hiện vùng chữ và nhận dạng từng dòng
Detector SHALL dùng ngưỡng xác suất 0,3 để tách các vùng liên thông, bỏ vùng có ít hơn 4 điểm hoặc có điểm trung bình dưới 0,5, rồi mở rộng hộp theo hệ số 2 để bao trọn dấu tiếng Việt. Cạnh lớn nhất của ảnh đưa vào detector là 960 px và hai cạnh là bội số của 32. Mỗi hộp được cắt và đưa về chiều cao cố định 32 px; chiều rộng giữ tỉ lệ, làm tròn lên bội số của 10 và kẹp trong khoảng 32 đến 512 px. Dòng nhận dạng ra rỗng bị bỏ.

#### Scenario: Dấu tiếng Việt nằm ngoài nét chính
- **WHEN** dấu thanh nằm phía trên nét chính của một dòng chữ
- **THEN** hộp bao của dòng được mở rộng để không cắt mất dấu

#### Scenario: Vùng sáng nhiễu không thành dòng chữ
- **WHEN** một vùng sáng quá nhỏ hoặc có điểm trung bình dưới 0,5
- **THEN** vùng đó không được coi là dòng chữ

#### Scenario: Nhận dạng một dòng
- **WHEN** một hộp chữ được cắt và đưa vào recognizer
- **THEN** văn bản được giải mã tham lam từ token bắt đầu đến token kết thúc hoặc đến giới hạn độ dài chuỗi

### Requirement: Xoay thẳng dòng chữ nghiêng
Hệ thống SHALL ước lượng góc nghiêng của dòng chữ từ các vùng chữ dài trên bản đồ xác suất, lấy trung vị của hướng trục chính. Khi góc có trị tuyệt đối không nhỏ hơn 0,5 độ, hệ thống SHALL xoay ảnh quanh tâm với nền trắng để làm thẳng, dò lại trên ảnh đã xoay và dùng ảnh đó cho mọi bước sau. Cần ít nhất 3 vùng chữ dài để tin vào góc; góc có trị tuyệt đối trên 30 độ được coi là ước lượng sai và trả về 0.

#### Scenario: Bill nghiêng khoảng 5 độ
- **WHEN** các dòng chữ trên bill nghiêng khoảng 5 độ
- **THEN** ảnh được xoay thẳng trước khi nhận dạng
- **AND** toạ độ các hộp chữ tính trên ảnh đã xoay

#### Scenario: Góc nhỏ hơn ngưỡng
- **WHEN** góc nghiêng nhỏ hơn 0,5 độ
- **THEN** ảnh không được xoay và dùng lại kết quả dò lần đầu

#### Scenario: Không đủ vùng chữ dài
- **WHEN** ảnh có ít hơn 3 vùng chữ dài
- **THEN** góc nghiêng được coi là 0

#### Scenario: Góc quá lớn
- **WHEN** góc ước lượng vượt 30 độ
- **THEN** góc bị bỏ và ảnh không được xoay

### Requirement: Vòng đời worker nhận dạng
Worker nhận dạng SHALL được tạo ở lần quét đầu tiên và dùng lại giữa các lần quét. Worker SHALL tự dừng sau 15 giây không có yêu cầu nào. Worker SHALL dừng ngay khi người dùng huỷ quét hoặc khi bộ nhớ được giải phóng (đóng form hoá đơn hoặc ứng dụng bị ẩn). Lần quét sau khi worker đã dừng sẽ tạo lại worker và nạp lại model.

#### Scenario: Hai lần quét liên tiếp dùng chung worker
- **WHEN** người dùng quét hai lần liên tiếp trong thời gian worker còn hoạt động
- **THEN** chỉ có một worker được tạo

#### Scenario: Rảnh quá 15 giây
- **WHEN** không có yêu cầu quét nào trong 15 giây
- **THEN** worker dừng

#### Scenario: Đóng form khi đang giữ model
- **WHEN** người dùng đóng form hoá đơn hoặc ẩn ứng dụng
- **THEN** worker dừng ngay, không chờ hết 15 giây

### Requirement: Hiển thị tiến trình, huỷ quét và xử lý lỗi
Hệ thống SHALL báo tiến trình quét bằng phần trăm tổng cộng và nhãn giai đoạn, chia đều phần trăm cho các ảnh theo thứ tự. Thanh tiến trình có nút "Huỷ quét". Khi người dùng huỷ, hệ thống SHALL dừng worker, huỷ mọi yêu cầu đang chờ và báo lỗi `OCR_CANCELLED` với thông báo "Đã huỷ quét ảnh.". Khi nhận dạng lỗi, hệ thống SHALL báo `OCR_FAILED` với thông báo "Không quét được ảnh. Bạn vẫn có thể nhập tay." và không có phương án dự phòng nào khác; ảnh đã lưu không bị xoá.

#### Scenario: Quét hai ảnh
- **WHEN** người dùng quét hai ảnh
- **THEN** phần trăm tiến trình đi từ 0 đến 100
- **AND** ảnh thứ hai bắt đầu từ khoảng 50%

#### Scenario: Hoàn tất
- **WHEN** toàn bộ ảnh đã được đọc
- **THEN** tiến trình hiển thị 100% và nhãn "Xong"

#### Scenario: Huỷ giữa chừng
- **WHEN** người dùng bấm "Huỷ quét" khi còn ảnh chưa đọc
- **THEN** quá trình dừng với lỗi `OCR_CANCELLED`
- **AND** worker bị dừng

#### Scenario: Worker báo lỗi
- **WHEN** worker báo lỗi khi đọc một ảnh
- **THEN** quá trình dừng với lỗi `OCR_FAILED`
- **AND** form vẫn cho người dùng nhập tay

### Requirement: Ghép từ nhận dạng thành dòng theo toạ độ
Hệ thống SHALL gom các từ có tâm dọc lệch không quá 0,55 lần chiều cao chữ trung vị vào cùng một dòng, rồi sắp các dòng từ trên xuống và từ trong mỗi dòng từ trái sang phải. Khoảng trắng ngang giữa hai từ liền kề lớn hơn 1,5 lần chiều cao chữ được thể hiện bằng hai khoảng trắng trong văn bản dòng đó. Từ rỗng bị bỏ. Bộ phân tích gộp mọi khoảng trắng liền nhau nên không dựa vào hai khoảng trắng này để tách cột.

#### Scenario: Tên món và giá tách cột
- **WHEN** tên món và số tiền nằm ở hai đầu xa nhau trên cùng một hàng
- **THEN** văn bản dòng đó có hai khoảng trắng giữa tên và số tiền

#### Scenario: Từ đến không theo thứ tự
- **WHEN** các từ của một hàng được cung cấp theo thứ tự ngẫu nhiên
- **THEN** dòng được sắp đúng từ trái sang phải

### Requirement: Đọc trực tiếp lớp chữ của PDF
Với PDF, nếu một trang có ít nhất 20 ký tự không tính khoảng trắng, hệ thống SHALL dùng văn bản của lớp chữ thay cho OCR. Các mảnh chữ có đường cơ sở lệch nhau không quá nửa chiều cao chữ (tối thiểu 1,5 đơn vị) được gom thành một dòng, dòng sắp từ trên xuống. Trong dòng, mảnh cách mảnh trước dưới 0,15 lần cỡ chữ được ghép liền không chèn khoảng trắng; mảnh cách xa hơn 2,5 lần cỡ chữ được ngăn bằng ba khoảng trắng. Trang có dưới 20 ký tự được coi là ảnh quét và phải qua OCR.

#### Scenario: Hoá đơn điện tử có lớp chữ
- **WHEN** trang PDF có ít nhất 20 ký tự chữ
- **THEN** văn bản của lớp chữ được dùng thay cho OCR

#### Scenario: Trang ảnh quét
- **WHEN** trang PDF có ít hơn 20 ký tự chữ
- **THEN** lớp chữ không được dùng và trang phải qua OCR

#### Scenario: Một từ bị PDF tách thành nhiều mảnh
- **WHEN** một từ được lưu thành nhiều mảnh nằm sát nhau
- **THEN** các mảnh được ghép liền, không chèn khoảng trắng

### Requirement: Chuẩn hoá dòng OCR trước khi phân tích
Bộ phân tích SHALL chuẩn hoá từng dòng trước khi đọc: bỏ đơn vị tiền dính sau số (đ, ₫, VND); bỏ dấu chấm hoặc phẩy thừa đứng sau số ở cuối dòng; đổi chữ O thành số 0 khi dính với chữ số; đổi chữ l, I, | đứng trước chữ số thành 1; đổi ký tự viền bảng và chuỗi gạch thành khoảng trắng; đổi dấu / hoặc nháy giữa ba chữ số thành dấu phẩy nghìn; bỏ phần thập phân ,00 của số tiền. Khớp từ khoá dùng dạng đã bỏ dấu tiếng Việt và không phân biệt hoa thường, nên bill mất dấu vẫn được đọc đúng.

#### Scenario: Đơn vị tiền dính sau số
- **WHEN** một dòng ghi "25.000đ"
- **THEN** số tiền được đọc là 25.000

#### Scenario: Chữ đ bị đọc thành chữ số
- **WHEN** nhóm nghìn cuối có bốn chữ số, ví dụ "176.0004"
- **THEN** chữ số thừa cuối bị bỏ và số tiền là 176.000

#### Scenario: Nhãn tổng bị lệch dấu
- **WHEN** dòng tổng ghi "Téng thanh toán 176.000đ"
- **THEN** dòng đó được nhận là dòng tổng

### Requirement: Chia món theo gạch phân cách
Khi văn bản OCR có dòng gạch phân cách (ít nhất 5 ký tự gạch, dấu bằng, chấm hoặc tương tự), hệ thống SHALL coi dòng sau gạch là khối mới: dòng chữ phía trên gạch không được ghép vào món phía dưới gạch. Dòng gạch bị bỏ khỏi nội dung đọc.

#### Scenario: Các món ngăn bằng gạch
- **WHEN** văn bản gồm "Cơm 50.000", một dòng gạch, "Phở 60.000", một dòng gạch, "Cà phê 25.000"
- **THEN** có ba món là "Cơm", "Phở" và "Cà phê", mỗi món đúng tên và số tiền của dòng mình

### Requirement: Nhận ngày hoá đơn và tên quán
Hệ thống SHALL lấy ngày hoá đơn ở dạng dd/mm/yyyy, dd-mm-yy hoặc "Ngày d tháng m năm yyyy", kể cả khi có chú thích trong ngoặc. Chỉ nhận ngày có thật và năm từ 2000 đến 2099; ngày không có thật thì để trống. Tên quán lấy từ phần sau nhãn "Đơn vị bán hàng" nếu có; nếu không, chọn trong bốn dòng đầu một dòng không phải địa chỉ, điện thoại hoặc tiêu đề và có từ khoá (nhà hàng, quán, cafe, lẩu, bbq, phở, bún, cơm và tương tự) hoặc phần lớn là chữ hoa; dòng có nhiều dấu hiệu hơn được ưu tiên.

#### Scenario: Ngày không có thật
- **WHEN** bill ghi ngày 30/02/2026
- **THEN** ngày không được điền

#### Scenario: Năm hai chữ số
- **WHEN** bill ghi ngày 05/07/26
- **THEN** ngày được hiểu là 2026-07-05

#### Scenario: Tên quán trên hoá đơn điện tử
- **WHEN** bill có dòng "Đơn vị bán hàng (Company): TÊN QUÁN"
- **THEN** tên quán là phần sau dấu hai chấm hoặc ngoặc của nhãn

### Requirement: Nhận món từ một dòng hoặc hai dòng
Hệ thống SHALL nhận món theo ba bố cục: một dòng gồm tên và các số tiền ở cuối, một dòng có dạng "tên SL x đơn giá = thành tiền", hoặc một dòng tên kèm dòng phép tính ngay sau. Thành tiền luôn là số cuối cùng của dòng. Món dưới 1.000 đồng, món không có chữ cái, và dòng ghi chú như "Ghi chú" hoặc "Size" không thành món. Món có SL × đơn giá khác thành tiền vẫn giữ thành tiền trên bill và được đánh dấu cần xem lại.

#### Scenario: Hai số tiền ở cuối dòng
- **WHEN** dòng món kết thúc bằng hai số tiền và số đầu chia hết số sau
- **THEN** đơn giá là số đầu, thành tiền là số sau và số lượng được suy ra bằng phép chia

#### Scenario: Số lượng nằm trước một số tiền
- **WHEN** dòng món có một số nhỏ (từ 1 đến 99) và một số tiền, số nhỏ chia hết thành tiền
- **THEN** số nhỏ là số lượng và món được đánh dấu cần xem lại

#### Scenario: Số đầu không chia hết thành tiền
- **WHEN** số đứng trước các cột tiền không chia hết thành tiền
- **THEN** số đó thuộc về tên món và số lượng là 1

#### Scenario: Phép tính trên cùng một dòng
- **WHEN** dòng ghi "Lẩu bò 2 x 150.000 = 300.000"
- **THEN** món có tên "Lẩu bò", số lượng 2, đơn giá 150.000 và thành tiền 300.000

### Requirement: Loại dòng không phải món
Bộ phân tích SHALL không đưa vào danh sách món các dòng tiêu đề, chân trang, địa chỉ, điện thoại, ngày giờ, ghi chú, dòng VAT, giảm giá, phí phục vụ, tổng, tiền mặt hoặc tiền thừa. Số dài hơn 8 chữ số mà không chia hết cho 100 (mã số thuế, số hoá đơn, số tài khoản) không được coi là số tiền. Trong tên món, số tiền từ 3.000 trở lên bị bỏ khỏi tên và số ở cuối tên dài hơn 4 chữ số bị bỏ hết.

#### Scenario: Mã số thuế và số hoá đơn
- **WHEN** một dòng chứa mã số thuế hoặc số hoá đơn có hơn 8 chữ số không chia hết cho 100
- **THEN** dòng đó không thành món và số đó không được coi là tiền

#### Scenario: Số dài chia hết cho 100
- **WHEN** một số tiền có hơn 8 chữ số nhưng chia hết cho 100
- **THEN** số đó vẫn được coi là số tiền

#### Scenario: Dòng rác từ mã QR hoặc đường kẻ
- **WHEN** một dòng chỉ gồm chuỗi chữ số hoặc token rác
- **THEN** dòng đó không thành món

#### Scenario: Số tiền lẫn trong tên món
- **WHEN** tên món chứa số từ 3.000 trở lên
- **THEN** số đó bị bỏ khỏi tên và tên món không còn số tiền

### Requirement: Đọc bảng hoá đơn GTGT có cột số thứ tự
Khi bill có tiêu đề bảng gồm cột STT và tên hàng, hệ thống SHALL coi mỗi dòng bắt đầu bằng số thứ tự là một món. Số thứ tự phải tăng dần, mỗi bước nhảy không quá 3. Tên hàng có thể xuống dòng trước hoặc sau dòng số, và cột đơn vị tính không thuộc tên món. Số thứ tự bị bỏ sót được đếm để báo thiếu món.

#### Scenario: Bảng hoá đơn điện tử đầy đủ
- **WHEN** bảng có 13 dòng đánh số và đọc được đủ 13 dòng
- **THEN** bill được ghi nhận là đọc đủ 13 dòng hàng

#### Scenario: Thiếu một dòng hàng
- **WHEN** bill đánh số tới 13 nhưng chỉ đọc được 12 dòng
- **THEN** kết quả nêu dòng bị thiếu theo số thứ tự và cảnh báo có thể thiếu món

#### Scenario: Cột trước thuế và sau thuế
- **WHEN** bảng có giá trước thuế, tiền thuế và thành tiền sau thuế, và SL × đơn giá khớp cột trước thuế
- **THEN** thành tiền của dòng lấy theo cột sau thuế, đơn giá dòng là thành tiền chia số lượng, bill được đánh dấu giá đã gồm VAT và VAT không được cộng thêm

#### Scenario: Dòng giảm trừ trong bảng
- **WHEN** một dòng của bảng là chiết khấu, giảm giá, khuyến mãi hoặc có thành tiền âm
- **THEN** số tiền đó được cộng vào giảm giá của bill và không thành món

### Requirement: Nhận dạng dòng tổng nhóm đồ uống và đồ ăn
Khi bill có dòng tổng nhóm đồ uống (Drink, Đồ uống) hoặc đồ ăn (Food, Đồ ăn) kèm số tiền, hệ thống SHALL không thay các món đã đọc bằng hai dòng tổng. Mỗi nhóm được đối soát với các món đứng ngay trên dòng nhóm, và phần thiếu được thêm thành món "Món chưa đọc được" kèm cờ cần xem.

#### Scenario: Chỉ còn dòng nhóm
- **WHEN** không đọc được món nào và bill chỉ còn dòng tổng nhóm
- **THEN** hai dòng tổng nhóm được dùng làm hai món

#### Scenario: Món có tên chứa từ đồ uống
- **WHEN** một món có tên như "Soft drink" và có số lượng hoặc giá
- **THEN** món đó không được coi là dòng tổng nhóm

#### Scenario: Nhóm đồ ăn thiếu một món
- **WHEN** các món trong nhóm Food cộng lại thấp hơn số trên dòng Food
- **THEN** thêm món "Món chưa đọc được" với phần chênh và báo nhóm Food thiếu số tiền đó

#### Scenario: Nhóm đồ uống có món thừa
- **WHEN** các món trong nhóm Drink cộng lại cao hơn số trên dòng Drink
- **THEN** các món được giữ nguyên và báo lệch, không thêm món

### Requirement: Đọc VAT, giảm giá, phí phục vụ và tổng bill
Hệ thống SHALL đọc VAT, giảm giá, phí phục vụ và tổng bill từ các dòng có nhãn tương ứng, ưu tiên số tiền ghi trên bill hơn phần trăm. Phí giao hàng và phụ phí của ứng dụng giao đồ ăn được cộng vào phí phục vụ; dòng "Đã giảm ... tương ứng ...%" là giảm giá bằng số tiền. Dòng tiền hàng và tạm tính không phải tổng bill. Nhãn tổng không có số thì lấy số ở dòng kế tiếp nếu dòng đó chỉ có số tiền. Khi nhiều dòng tổng đọc lệch nhau, lấy số xuất hiện nhiều nhất nếu có ít nhất hai lần lặp lại.

#### Scenario: VAT ghi cả phần trăm và số tiền
- **WHEN** dòng VAT ghi cả "8%" và một số tiền
- **THEN** khoản VAT là số tiền trên bill

#### Scenario: Các dòng tổng đọc lệch nhau
- **WHEN** ba dòng tổng cùng ghi 550.000 và một dòng khác ghi 540.000
- **THEN** tổng bill là 550.000

#### Scenario: Dòng tổng ghi đã có thuế
- **WHEN** dòng tổng ghi "Tổng cộng số tiền đã có thuế GTGT" kèm số tiền
- **THEN** số tiền đó là tổng bill

#### Scenario: Không có dòng tổng
- **WHEN** bill không có dòng nhãn tổng và không có dòng tiền hàng
- **THEN** tổng bill để trống

### Requirement: Đối chiếu tổng bill và tự sửa số đọc sai
Hệ thống SHALL đối chiếu tổng bill bằng phép tính của app, đúng từng đồng: tổng các món trừ giảm giá, cộng phí phục vụ và VAT phải bằng tổng bill. Phép tính có thể theo bốn cách về thứ tự giảm giá, phí và VAT. Khi không khớp, hệ thống thử các cách sửa từ cùng văn bản OCR và chọn cách ít thay đổi nhất. Kết quả có trạng thái OK, CORRECTED, MISMATCH hoặc UNVERIFIED.

#### Scenario: Tổng khớp ngay
- **WHEN** các món, giảm giá, phí và VAT cho đúng tổng bill
- **THEN** trạng thái là OK và không có số nào bị đổi

#### Scenario: Sửa được một dòng đọc sai
- **WHEN** một dòng lệch và có cách sửa làm tổng khớp bill
- **THEN** trạng thái là CORRECTED, ghi chú nêu đã sửa gì và dòng đó được đánh dấu cần xem
- **AND** các cách sửa được thử gồm sửa một số của một dòng, bỏ dòng tổng bị đọc thành món, và đổi lẫn chữ số 1 và 4

#### Scenario: Lệch nhỏ do thiếu món
- **WHEN** tổng các món thấp hơn tổng bill không quá 10% và không cách nào khớp
- **THEN** thêm một món "Món chưa đọc được" với đúng số tiền thiếu và đánh dấu cần xem

#### Scenario: Không cách nào khớp
- **WHEN** mọi cách sửa đều không làm tổng khớp bill, kể cả khi lệch trên 10%
- **THEN** trạng thái là MISMATCH, không món nào được tự thêm hay bớt, và người dùng được yêu cầu chỉnh tay

### Requirement: Dán văn bản OCR từ công cụ ngoài
Form hoá đơn SHALL có nút "Dán text OCR ngoài" mở hộp thoại dán văn bản đã quét từ công cụ bên ngoài. Nút "Điền vào hoá đơn" chỉ bật khi văn bản không rỗng. Khi điền, văn bản được đưa qua bước ghép khối (khi có đủ tiêu đề cột SL, ĐG và Thành tiền) rồi qua cùng bộ phân tích và đối chiếu như ảnh quét. Văn bản không nhận ra dữ liệu hoá đơn thì báo người dùng kiểm tra lại hoặc nhập tay.

#### Scenario: Văn bản copy theo khối
- **WHEN** văn bản dán có tiêu đề SL, ĐG, Thành tiền và các ô số đứng riêng từng dòng, ví dụ "2", "50.000", "100.000" rồi "1 Phở bò"
- **THEN** ghép lại thành món "Phở bò" với số lượng 2, đơn giá 50.000 và thành tiền 100.000

#### Scenario: Văn bản không có bố cục khối
- **WHEN** văn bản dán không có đủ ba tiêu đề cột
- **THEN** văn bản được phân tích nguyên bản, không ghép lại

### Requirement: Đưa kết quả vào form hoá đơn để người dùng kiểm tra
Hệ thống SHALL điền kết quả đọc vào form hoá đơn ở trạng thái chưa lưu, kèm thông báo đối chiếu và cờ cần xem trên từng món. Nếu form đã có dữ liệu do người dùng nhập (tên quán, ngày, món, tiền hàng hoặc giảm giá, phí, VAT), hệ thống MUST hỏi trước khi ghi đè. Trường không đọc được được để trống, không điền 0.

#### Scenario: Form trống
- **WHEN** form hoá đơn chưa có dữ liệu nào và người dùng quét xong
- **THEN** kết quả được điền ngay và chưa được lưu

#### Scenario: Form đã có dữ liệu
- **WHEN** form đã có tên quán hoặc món do người dùng nhập và người dùng quét lại
- **THEN** hệ thống hỏi trước khi ghi đè

#### Scenario: Kết quả cần đọc lại
- **WHEN** kết quả là MISMATCH hoặc UNVERIFIED, không có món nào, hoặc còn dòng hàng thiếu
- **THEN** hệ thống đánh dấu kết quả cần đọc lại; việc đọc lại thuộc capability local-ai-receipt-reading

#### Scenario: Không đọc được số tiền
- **WHEN** một khoản như VAT không đọc được số tiền hay phần trăm
- **THEN** ô tương ứng trong form để trống và không điền 0

### Requirement: Ghép văn bản dán theo khối thành dòng món
Hệ thống SHALL ghép lại văn bản dán khi mỗi ô của bảng nằm trên một dòng riêng, thành từng dòng món dạng "STT. Tên SL ĐG Thành tiền" trước khi phân tích. Văn bản không có ít nhất ba loại tiêu đề cột trong SL, ĐG, Thành tiền và Tên món, hoặc không có món nào, được giữ nguyên văn. Hệ thống không đoán tên hay giá.

#### Scenario: Ô số lượng bị đọc sai
- **WHEN** một món có hai ô tiền, thành tiền chia hết cho đơn giá và thương từ 1 đến 99
- **THEN** số lượng là thương đó, không lấy theo ô SL

#### Scenario: Tên kết thúc bằng số trùng số lượng
- **WHEN** tên món kết thúc bằng số đúng bằng số lượng lớn hơn 1, ví dụ "Miso Soup 4" với số lượng 4
- **THEN** số đó bị bỏ khỏi tên món

#### Scenario: Phần tổng bị tách khối
- **WHEN** nhãn "Tiền hàng" và "Tổng thanh toán" nằm trong một nhóm dòng và các số tiền nằm trong nhóm dòng sau
- **THEN** văn bản được ghép thành dòng "Tiền hàng" với số tiền hàng và dòng "Tổng thanh toán" với số cuối

#### Scenario: Không phải bố cục khối
- **WHEN** văn bản dán không có đủ ba loại tiêu đề cột hoặc không có món nào
- **THEN** văn bản giữ nguyên và được phân tích như văn bản thường

#### Scenario: Món chỉ có một ô tiền
- **WHEN** một món trong văn bản dán theo khối chỉ có một ô tiền
- **THEN** số lượng lấy từ ô SL, và là 1 khi không có ô SL
