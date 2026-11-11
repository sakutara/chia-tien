## ADDED Requirements

### Requirement: Đọc trực tiếp lớp chữ của PDF
Với PDF, nếu một trang có ít nhất 20 ký tự không tính khoảng trắng, hệ thống SHALL dùng văn bản của lớp chữ thay cho OCR. Các mảnh chữ có đường cơ sở lệch nhau không quá nửa chiều cao chữ (tối thiểu 1,5 đơn vị) được gom thành một dòng, dòng sắp từ trên xuống. Trong dòng, các mảnh liền nhau không chèn khoảng trắng; mảnh cách xa hơn 2,5 lần cỡ chữ được ngăn bằng ba khoảng trắng. Trang có dưới 20 ký tự được coi là ảnh quét và phải qua OCR.

#### Scenario: Hoá đơn điện tử có lớp chữ
- **WHEN** trang PDF có ít nhất 20 ký tự chữ
- **THEN** văn bản của lớp chữ được dùng thay cho OCR

#### Scenario: Trang ảnh quét
- **WHEN** trang PDF có ít hơn 20 ký tự chữ
- **THEN** lớp chữ không được dùng và trang phải qua OCR

#### Scenario: Một từ bị PDF tách thành nhiều mảnh
- **WHEN** một từ được lưu thành nhiều mảnh nằm sát nhau
- **THEN** các mảnh được ghép liền, không chèn khoảng trắng

### Requirement: Giữ ảnh xám cho tài liệu điện tử sạch
Khi ảnh được cắt và nắn thẳng, hệ thống SHALL kiểm tra xem đây có phải tài liệu điện tử sạch không. Tài liệu được coi là sạch khi nền gần như trắng tuyệt đối và đều ở mọi ô 64 px: phân vị 5% độ sáng nền từ 245 trở lên và trung vị từ 250 trở lên. Với tài liệu sạch, ảnh được giữ thang xám và không nhị phân hoá.

#### Scenario: Ảnh chụp màn hình hoá đơn điện tử
- **WHEN** ảnh là hoá đơn điện tử có nền trắng đều, bảng kẻ ô và không đổ bóng
- **THEN** ảnh đã cắt được giữ thang xám và không bị nhị phân hoá

#### Scenario: Ảnh chụp giấy có nền xám
- **WHEN** ảnh chụp tờ giấy có bóng hoặc nền xám ở một số ô
- **THEN** ảnh không được coi là tài liệu sạch và được nhị phân hoá

## MODIFIED Requirements

### Requirement: Đọc bảng hoá đơn GTGT có cột số thứ tự
Khi bill có tiêu đề bảng gồm cột STT và tên hàng, hệ thống SHALL coi mỗi dòng bắt đầu bằng số thứ tự là một món. Số thứ tự phải tăng dần, mỗi bước nhảy không quá 3. Tên hàng có thể xuống dòng trước hoặc sau dòng số, và cột đơn vị tính không thuộc tên món. Số thứ tự bị bỏ sót được đếm để báo thiếu món. Khi bảng là hoá đơn điện tử, hệ thống SHALL bỏ số thứ tự đứng đầu dòng khỏi tên món, bỏ dòng tiêu đề cột và dòng đánh số cột "(6=4x5)", bỏ từ đơn vị tính đứng cuối tên món, và chỉ đọc món đến dòng "Cộng tiền hàng hoá, dịch vụ (Total amount)"; các dòng sau đó là chữ ký số và không thành món.

**Trước đây**: trước commit `cbec768` (2026-10-20), bộ phân tích chưa xử lý cột STT và cột đơn vị tính trong bảng hoá đơn điện tử, theo tiêu đề commit và SA mục B.11. Phần đếm số thứ tự bị bỏ sót đến từ commit khác và không thuộc change này.

#### Scenario: Bảng hoá đơn điện tử đầy đủ
- **WHEN** bảng có 13 dòng đánh số và đọc được đủ 13 dòng
- **THEN** bill được ghi nhận là đọc đủ 13 dòng hàng

#### Scenario: Thiếu một dòng hàng
- **WHEN** bill đánh số tới 13 nhưng chỉ đọc được 12 dòng
- **THEN** kết quả nêu dòng bị thiếu theo số thứ tự và cảnh báo có thể thiếu món

#### Scenario: Cột trước thuế và sau thuế
- **WHEN** bảng có cả giá trước thuế, tiền thuế và thành tiền sau thuế, và SL × đơn giá khớp cột trước thuế
- **THEN** thành tiền lấy theo cột trước thuế và giá từng dòng được đánh dấu đã gồm VAT, VAT không được cộng thêm

#### Scenario: Dòng giảm trừ trong bảng
- **WHEN** một dòng của bảng là chiết khấu, giảm giá, khuyến mãi hoặc có thành tiền âm
- **THEN** số tiền đó được cộng vào giảm giá của bill và không thành món

#### Scenario: Bảng hoá đơn điện tử ảnh chụp màn hình
- **WHEN** ảnh chụp hoá đơn điện tử có bảng sáu món, cột STT và Đơn vị tính, kèm chữ ký số ở cuối
- **THEN** cả sáu món được đọc đúng số lượng, đơn giá và thành tiền
- **AND** dòng giảm "Đã giảm" được đọc thành giảm giá và tổng bill khớp với tổng các món

#### Scenario: Số thứ tự đứng trước tên món
- **WHEN** một dòng của bảng có dạng "1 | Canh chua" trong bảng có cột Đơn vị tính
- **THEN** món được đọc với tên "Canh chua" và không có số thứ tự trong tên

#### Scenario: Chữ ký số sau dòng tổng
- **WHEN** sau dòng "Cộng tiền hàng hoá, dịch vụ (Total amount)" còn các dòng chữ ký số và mã tra cứu
- **THEN** các dòng đó không thành món

### Requirement: Cắt và nắn thẳng tờ hoá đơn khi thêm ảnh chụp
Hệ thống SHALL dò bốn góc của tờ giấy sáng lớn nhất trong ảnh chụp hoá đơn, cắt và nắn phối cảnh thành hình chữ nhật không còn nền, rồi đưa cạnh dài về 2800 px (phóng tối đa 3 lần). Với ảnh chụp giấy, ảnh sau xử lý được nhị phân hoá theo ngưỡng thích nghi (contrast 0,25). Với tài liệu điện tử sạch, ảnh được giữ thang xám theo requirement "Giữ ảnh xám cho tài liệu điện tử sạch". Nếu không tìm thấy tờ giấy rõ ràng, hệ thống nhị phân hoá cả ảnh, trừ khi là tài liệu điện tử sạch, và chỉ thu về cạnh dài 2800 px.

**Trước đây**: theo BR-4.16, mọi ảnh được nhị phân hoá theo ngưỡng thích nghi (contrast 0,25), và tài liệu ghi rõ "không dùng ảnh xám vì OCR kém hẳn ở ảnh có bóng và nếp gấp". Thay đổi cho tài liệu điện tử sạch được ghi trong SA mục B.11. Ghi chú: sau change này, commit `2899edd` (2026-11-10) đặt `keepGray: 'always'` trong `lib/imageScan.ts` nên mọi ảnh thêm vào hoá đơn đều giữ thang xám. Thay đổi đó không thuộc change này.

#### Scenario: Ảnh chụp nghiêng trên nền tối
- **WHEN** người dùng thêm ảnh chụp tờ hoá đơn giấy nghiêng trên nền tối
- **THEN** hệ thống cắt theo bốn góc tờ giấy và nắn thẳng thành hình chữ nhật
- **AND** ảnh kết quả được nhị phân hoá theo ngưỡng thích nghi

#### Scenario: Tờ giấy đã chiếm gần hết khung ảnh
- **WHEN** tờ giấy chiếm trên 97% diện tích ảnh và gần thẳng
- **THEN** hệ thống không cắt

#### Scenario: Không tách được tờ giấy khỏi nền
- **WHEN** ảnh gần như đồng nhất hoặc tờ giấy không tách rõ khỏi nền
- **THEN** hệ thống giữ cả ảnh và chỉ thu về cạnh dài 2800 px, rồi nhị phân hoá trừ khi là tài liệu điện tử sạch

#### Scenario: Ảnh đã xử lý được lưu theo dung lượng
- **WHEN** bản PNG của ảnh đã xử lý có dung lượng không quá 1 MB
- **THEN** ảnh được lưu dạng PNG, tên tệp thêm hậu tố `-scan`
- **AND** nếu PNG vượt 1 MB thì ảnh được lưu dạng JPEG

### Requirement: Đọc VAT, giảm giá, phí phục vụ và tổng bill
Hệ thống SHALL đọc VAT, giảm giá, phí phục vụ và tổng bill từ các dòng có nhãn tương ứng, ưu tiên số tiền ghi trên bill hơn phần trăm. Dòng "Đã giảm ... tương ứng ...%" là giảm giá bằng số tiền, không phải VAT. Dòng có mã số thuế hoặc cơ quan thuế không được coi là VAT. Phí giao hàng và phụ phí của ứng dụng giao đồ ăn được cộng vào phí phục vụ. Dòng tiền hàng và tạm tính không phải tổng bill, trừ dòng "Cộng tiền hàng hoá, dịch vụ (Total amount)" của hoá đơn điện tử, là số phải trả đã trừ khoản giảm và được lấy làm tổng bill. Nhãn tổng không có số thì lấy số ở dòng kế tiếp nếu dòng đó chỉ có số tiền. Khi nhiều dòng tổng đọc lệch nhau, lấy số xuất hiện nhiều nhất nếu có ít nhất hai lần lặp lại.

**Trước đây**: theo SA mục B.11, dòng "Đã giảm" bị hiểu là VAT và mã số thuế, cơ quan thuế có thể bị hiểu là VAT. Dòng "Cộng tiền hàng hoá, dịch vụ (Total amount)" chưa được dùng làm tổng bill trong thiết kế gốc.

#### Scenario: VAT ghi cả phần trăm và số tiền
- **WHEN** dòng VAT ghi cả "8%" và một số tiền
- **THEN** khoản VAT là số tiền trên bill

#### Scenario: Đã giảm bằng số tiền
- **WHEN** bill có dòng "Đã giảm 12.374,00 tương ứng 20% ..."
- **THEN** giảm giá là 12.374 đồng theo số tiền
- **AND** khoản đó không được ghi là VAT

#### Scenario: Tổng Total amount của hoá đơn điện tử
- **WHEN** bill có dòng "Cộng tiền hàng hoá, dịch vụ (Total amount)" ghi 2.050.000
- **THEN** tổng bill là 2.050.000

#### Scenario: Các dòng tổng đọc lệch nhau
- **WHEN** ba dòng tổng cùng ghi 550.000 và một dòng khác ghi 540.000
- **THEN** tổng bill là 550.000

#### Scenario: Tổng đã gồm VAT
- **WHEN** dòng tổng ghi "Tổng cộng số tiền đã có thuế GTGT"
- **THEN** bill được đánh dấu giá đã gồm VAT và tiền hàng trước thuế không dùng để đối chiếu

#### Scenario: Không có dòng tổng
- **WHEN** bill không có dòng nhãn tổng và không có dòng tiền hàng
- **THEN** tổng bill để trống

### Requirement: Nhận ngày hoá đơn và tên quán
Hệ thống SHALL lấy ngày hoá đơn ở dạng dd/mm/yyyy, dd-mm-yy, "Ngày d tháng m năm yyyy" hoặc "Ngày (date) d tháng (month) m năm (year) yyyy", kể cả khi có chú thích trong ngoặc và khi chữ số bị OCR đọc lẫn với chữ. Chỉ nhận ngày có thật và năm từ 2000 đến 2099; ngày không có thật thì để trống. Tên quán lấy từ phần sau nhãn "Đơn vị bán hàng (Company)" nếu có; nếu không, chọn trong bốn dòng đầu một dòng không phải địa chỉ, điện thoại hoặc tiêu đề, ưu tiên dòng có từ khoá như nhà hàng, quán, cafe, lẩu, bbq và dòng viết hoa.

**Trước đây**: theo SA mục B.11, các điểm được sửa là ngày có chú thích trong ngoặc theo kiểu song ngữ, chữ số bị đọc lẫn, và tên quán lấy từ dòng "Đơn vị bán hàng". Tài liệu không ghi cách đọc trước đó chi tiết hơn.

#### Scenario: Ngày không có thật
- **WHEN** bill ghi ngày 30/02/2026
- **THEN** ngày không được điền

#### Scenario: Năm hai chữ số
- **WHEN** bill ghi ngày 05/07/26
- **THEN** ngày được hiểu là 2026-07-05

#### Scenario: Ngày song ngữ có chữ số bị đọc lẫn
- **WHEN** bill ghi "Ngày (date) Í 3 tháng (month) 10 năm (year) 2026"
- **THEN** ngày được hiểu là 2026-10-13

#### Scenario: Tên quán trên hoá đơn điện tử
- **WHEN** bill có dòng "Đơn vị bán hàng (Company): TÊN QUÁN"
- **THEN** tên quán là phần sau dấu hai chấm hoặc ngoặc của nhãn

### Requirement: Loại dòng không phải món
Bộ phân tích SHALL không đưa vào danh sách món các dòng tiêu đề, chân trang, địa chỉ, điện thoại, ngày giờ, ghi chú, dòng VAT, giảm giá, phí phục vụ, tổng, tiền mặt hoặc tiền thừa. Với bảng hoá đơn điện tử, các dòng tiêu đề cột (STT, Description, Quantity, Unit price, Amount), dòng đánh số cột "(6=4x5)", dòng chữ ký số, mã tra cứu, số tài khoản và thông tin đơn vị cung cấp giải pháp cũng không thành món. Số dài hơn 8 chữ số mà không chia hết cho 100 (mã số thuế, số hoá đơn, số tài khoản) không được coi là số tiền. Trong tên món, số tiền từ 3.000 trở lên bị bỏ khỏi tên và số ở cuối tên dài hơn 4 chữ số bị bỏ hết.

**Trước đây**: theo SA mục B.11, dòng tiêu đề cột, dòng đánh số cột và chữ ký số từng bị đọc thành món hoặc gây hiểu nhầm; mã số thuế từng bị hiểu là VAT.

#### Scenario: Dòng tiêu đề cột của bảng
- **WHEN** bảng hoá đơn điện tử có dòng tiêu đề chứa các cột STT và Đơn vị tính, và dòng đánh số cột "(6=4x5)"
- **THEN** các dòng đó không thành món và không được coi là số tiền

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
