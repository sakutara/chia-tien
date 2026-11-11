# bill-splitting Specification

## Purpose
Capability này quản lý phần chia tiền bên trong một hoá đơn: các món (tên, số lượng, đơn giá, thành tiền), hai cách nhập hoá đơn (chi tiết món hoặc chỉ tổng tiền), chế độ chia `BY_ITEM` hoặc `EQUAL_TOTAL`, người ứng tiền, người chia đều, người ăn và số phần của từng món, cùng phép tính phân bổ giảm giá, phí phục vụ và VAT vào từng món. Dành cho nhóm bạn đi ăn cùng, khi cần biết ai ứng tiền, ai ăn món nào và mỗi người chịu bao nhiêu trước khi quyết toán cả bữa. Quyết toán toàn bữa thuộc `settlement`, còn file ảnh hoá đơn thuộc `invoice-management`.

## Requirements

### Requirement: Thêm món vào hoá đơn chi tiết
Hệ thống SHALL cho phép thêm món vào cuối một hoá đơn ở chế độ `ITEMIZED` sau khi hoá đơn đã lưu. Mỗi lần thêm, hệ thống tính lại tiền hàng, các khoản điều chỉnh và phần phân bổ của mọi món trong cùng một thao tác ghi.

#### Scenario: Thêm một món mới
- **WHEN** người dùng thêm món "Trà đá", số lượng 3, đơn giá 10.000 vào hoá đơn `ITEMIZED` của bữa đang hoạt động
- **THEN** món mới nằm ở cuối danh sách với số thứ tự kế tiếp
- **AND** tiền hàng, `totalAmount` và phần phân bổ của mọi món được tính lại, tổng `finalAmount` của các món bằng đúng `totalAmount`

### Requirement: Ràng buộc dữ liệu của món
Hệ thống SHALL kiểm tra từng món trước khi lưu: tên món bắt buộc, sau khi gộp khoảng trắng thừa còn tối đa 100 ký tự; số lượng MUST là số nguyên từ 1 trở lên; đơn giá MUST là số tiền nguyên đồng không âm.

#### Scenario: Tên món trống hoặc quá dài
- **WHEN** tên món chỉ gồm khoảng trắng, hoặc dài hơn 100 ký tự
- **THEN** hệ thống từ chối lưu với mã lỗi `INVALID_ITEM`

#### Scenario: Số lượng không hợp lệ
- **WHEN** số lượng là 0 hoặc là số thập phân như 1,5
- **THEN** hệ thống từ chối lưu với mã lỗi `INVALID_ITEM`

#### Scenario: Đơn giá âm
- **WHEN** đơn giá của món là số âm
- **THEN** hệ thống từ chối lưu với mã lỗi `INVALID_AMOUNT`

### Requirement: Thành tiền của món
Hệ thống SHALL tính thành tiền của món bằng số lượng nhân đơn giá khi người dùng không nhập riêng. Khi có thành tiền nhập tay, hệ thống dùng đúng số đó làm tiền hàng của món, ví dụ để khớp với bill đã giảm giá từng dòng.

#### Scenario: Bỏ trống thành tiền
- **WHEN** món có số lượng 2, đơn giá 150.000 và không nhập thành tiền
- **THEN** thành tiền của món là 300.000

#### Scenario: Đổi tên giữ nguyên thành tiền nhập tay
- **WHEN** người dùng chỉ đổi tên một món có thành tiền nhập tay 200.000
- **THEN** thành tiền của món vẫn là 200.000

#### Scenario: Sửa số lượng hoặc đơn giá
- **WHEN** người dùng lưu lại số lượng hoặc đơn giá của một món
- **THEN** thành tiền của món được tính lại từ số lượng nhân đơn giá

### Requirement: Sửa và xoá món
Hệ thống SHALL cho sửa hoặc xoá từng món đã lưu của hoá đơn `ITEMIZED`. Khi sửa, người ăn và số phần của món được giữ nguyên. Hoá đơn `ITEMIZED` MUST luôn còn ít nhất một món, và việc xoá món kéo theo tính lại toàn bộ hoá đơn.

#### Scenario: Sửa món đã có người ăn
- **WHEN** người dùng sửa tên, số lượng hoặc đơn giá của một món đã có người ăn
- **THEN** danh sách người ăn và số phần của món không thay đổi

#### Scenario: Xoá món đã có người ăn
- **WHEN** người dùng bấm xoá một món đã có người ăn
- **THEN** hệ thống hỏi xác nhận trước khi xoá, và chỉ xoá khi người dùng đồng ý

#### Scenario: Xoá món cuối cùng
- **WHEN** hoá đơn `ITEMIZED` chỉ còn một món và người dùng yêu cầu xoá món đó
- **THEN** hệ thống từ chối với mã lỗi `LAST_ITEM_CANNOT_DELETE`, món vẫn được giữ lại

### Requirement: Thứ tự món
Hệ thống SHALL cho đổi vị trí một món lên hoặc xuống trong danh sách của hoá đơn `ITEMIZED`. Thứ tự được lưu thành số thứ tự liên tục bắt đầu từ 0. Việc đổi thứ tự không làm thay đổi người ăn của bất kỳ món nào, nhưng thành tiền của món được tính lại theo thứ tự mới, nên phần dư 1 đồng có thể chuyển sang món khác.

#### Scenario: Chuyển món lên hoặc xuống
- **WHEN** người dùng bấm nút lên hoặc xuống của một món
- **THEN** món đó đổi chỗ với món liền kề và thứ tự mới được lưu
- **AND** nút lên bị vô hiệu ở món đầu tiên, nút xuống bị vô hiệu ở món cuối cùng

### Requirement: Hoá đơn chỉ nhập tổng tiền
Hệ thống SHALL cho phép nhập hoá đơn `TOTAL_ONLY` chỉ bằng tiền hàng, không có danh sách món. Hoá đơn này MUST có chế độ chia `EQUAL_TOTAL` và mọi thao tác liên quan đến món bị từ chối.

#### Scenario: Lưu hoá đơn chỉ có tổng tiền
- **WHEN** người dùng lưu hoá đơn `TOTAL_ONLY` với tiền hàng 100.000 và VAT cố định 8.000
- **THEN** tổng hoá đơn là 108.000 và không có món nào được lưu

#### Scenario: Tiền hàng trống hoặc bằng 0
- **WHEN** hoá đơn `TOTAL_ONLY` không có tiền hàng hoặc tiền hàng bằng 0
- **THEN** hệ thống từ chối với mã lỗi `INVALID_AMOUNT`

#### Scenario: Yêu cầu chia từng món trên hoá đơn tổng tiền
- **WHEN** người dùng đặt chế độ `BY_ITEM` cho hoá đơn `TOTAL_ONLY`, hoặc thêm, sửa, xoá món của hoá đơn này
- **THEN** hệ thống từ chối với mã lỗi `SPLIT_TYPE_LOCKED`

#### Scenario: Đổi hoá đơn chi tiết thành chỉ tổng tiền
- **WHEN** người dùng sửa một hoá đơn `ITEMIZED` thành `TOTAL_ONLY` rồi lưu
- **THEN** mọi món cũ của hoá đơn bị xoá và chế độ chia thành `EQUAL_TOTAL`

### Requirement: Chế độ chia tiền từng món và chia đều theo tổng
Hệ thống SHALL cho hoá đơn `ITEMIZED` chuyển qua lại giữa `BY_ITEM` và `EQUAL_TOTAL` bất cứ lúc nào. Việc chuyển chế độ không làm đổi tiền hàng, các khoản điều chỉnh hay danh sách món.

#### Scenario: Chuyển đi rồi chuyển lại
- **WHEN** hoá đơn đổi từ `BY_ITEM` sang `EQUAL_TOTAL` rồi lại sang `BY_ITEM`
- **THEN** người ăn và số phần của từng món vẫn như trước khi chuyển

#### Scenario: Bật chia từng món
- **WHEN** hoá đơn chuyển sang `BY_ITEM`
- **THEN** mỗi món chưa có người ăn được gán toàn bộ người trong kèo, mỗi người một phần
- **AND** món đã có người ăn giữ nguyên người ăn của mình

#### Scenario: Tạo hoá đơn ở chế độ chia từng món
- **WHEN** hoá đơn `ITEMIZED` được tạo với chế độ `BY_ITEM`
- **THEN** mỗi món được gán toàn bộ người trong kèo, mỗi người một phần

### Requirement: Người ứng tiền của hoá đơn
Hệ thống SHALL gắn đúng một người ứng tiền cho mỗi hoá đơn, và người đó MUST là người tham gia kèo chứa hoá đơn. Người ứng tiền đổi được bất cứ lúc nào khi bữa đang hoạt động.

#### Scenario: Chọn người ứng ngoài kèo
- **WHEN** người dùng tạo hoá đơn hoặc đổi người ứng sang một người không tham gia kèo
- **THEN** hệ thống từ chối với mã lỗi `PAYER_NOT_IN_SESSION`

#### Scenario: Đổi người ứng trong kèo
- **WHEN** người dùng đổi người ứng sang một thành viên trong kèo
- **THEN** hoá đơn lưu người ứng mới và tổng tiền hoá đơn không đổi

### Requirement: Người chia đều
Hệ thống SHALL lưu danh sách người cùng chia đều của hoá đơn gồm ít nhất một người, không trùng lặp, và tất cả đều phải tham gia kèo. Khi tạo hoá đơn, danh sách mặc định là toàn bộ người trong kèo.

#### Scenario: Bỏ chọn hết người chia đều
- **WHEN** người dùng bỏ chọn toàn bộ người chia đều
- **THEN** hệ thống từ chối với mã lỗi `EQUAL_SPLIT_EMPTY` và không lưu thay đổi

#### Scenario: Chọn người ngoài kèo
- **WHEN** danh sách chia đều có một người không tham gia kèo
- **THEN** hệ thống từ chối với mã lỗi `SPLIT_MEMBER_NOT_IN_SESSION`

#### Scenario: Người chia đều đã rời kèo khi sửa hoá đơn
- **WHEN** người dùng sửa hoá đơn và một người chia đều đã không còn trong kèo
- **THEN** người đó bị bỏ khỏi danh sách chia đều
- **AND** nếu không còn ai trong danh sách, danh sách được đặt lại thành toàn bộ người trong kèo

### Requirement: Người ăn và số phần của món
Hệ thống SHALL gán người ăn cho từng món với số phần là số nguyên từ 1 đến 999. Mỗi người chỉ xuất hiện một lần trong một món, và mọi người ăn MUST thuộc kèo. Người có số phần bằng 0 bị gỡ khỏi món.

#### Scenario: Gán người ngoài kèo làm người ăn
- **WHEN** người dùng gán một người không tham gia kèo làm người ăn của món
- **THEN** hệ thống từ chối với mã lỗi `CONSUMER_NOT_IN_SESSION`

#### Scenario: Số phần không hợp lệ
- **WHEN** số phần là số thập phân như 0,5, là số âm, hoặc lớn hơn 999
- **THEN** hệ thống từ chối với mã lỗi `INVALID_SHARES`

#### Scenario: Gỡ người ăn bằng số phần 0
- **WHEN** người dùng đặt số phần của một người về 0
- **THEN** người đó không còn là người ăn của món

#### Scenario: Một người xuất hiện hai lần trong một món
- **WHEN** danh sách người ăn của món chứa cùng một người hai lần
- **THEN** hệ thống từ chối với mã lỗi `INVALID_SHARES`

### Requirement: Gán người ăn hàng loạt
Hệ thống SHALL cho gán cùng một nhóm người ăn, mỗi người một phần, cho mọi món của hoá đơn hoặc chỉ cho các món chưa có người ăn. Chế độ chỉ món trống không ghi đè người ăn đã chọn ở món khác.

#### Scenario: Gán cho các món còn trống
- **WHEN** người dùng gán nhóm người ăn theo chế độ chỉ món trống, và hoá đơn có món A đã có người ăn cùng món B chưa có người ăn
- **THEN** chỉ món B được gán, món A giữ nguyên người ăn

#### Scenario: Hoá đơn chỉ có tổng tiền
- **WHEN** người dùng gán người ăn hàng loạt cho hoá đơn `TOTAL_ONLY`
- **THEN** không món nào được ghi và kết quả là danh sách rỗng

#### Scenario: Gán nhóm rỗng cho tất cả món
- **WHEN** người dùng gán cho mọi món một nhóm người ăn rỗng theo chế độ tất cả món
- **THEN** mọi món bị xoá hết người ăn và hệ thống không báo lỗi

### Requirement: Cảnh báo món chưa có người ăn
Hệ thống SHALL đếm số món chưa có người ăn khi hoá đơn ở chế độ `BY_ITEM` và cảnh báo người dùng về các món đó. Ở chế độ `EQUAL_TOTAL`, hệ thống không đếm và không cảnh báo món.

#### Scenario: Còn món chưa có người ăn ở chế độ chia từng món
- **WHEN** hoá đơn ở chế độ `BY_ITEM` có một món không có người ăn nào
- **THEN** số món chưa gán được đếm là 1 và món đó được hiển thị cảnh báo

#### Scenario: Chế độ chia đều theo tổng
- **WHEN** hoá đơn ở chế độ `EQUAL_TOTAL`
- **THEN** số món chưa gán luôn là 0

### Requirement: Thứ tự tính các khoản điều chỉnh
Hệ thống SHALL tính hoá đơn theo đúng thứ tự: tiền hàng S, giảm giá D tính trên S, phí phục vụ C tính trên `N = S - D`, VAT V tính trên `N + C`, và tổng thanh toán là `N + C + V`. Tỷ lệ phần trăm MUST là số nguyên từ 0 đến 100 và được làm tròn đến đồng theo kiểu nửa lên.

#### Scenario: Hoá đơn có đủ giảm giá, phí phục vụ và VAT
- **WHEN** tiền hàng là 400.000, giảm giá 10%, phí phục vụ 5%, VAT 8%
- **THEN** giảm giá là 40.000, tiền hàng sau giảm là 360.000, phí phục vụ là 18.000, VAT là 30.240, tổng là 408.240

#### Scenario: Làm tròn nửa lên
- **WHEN** một khoản 10% được tính trên 105
- **THEN** kết quả là 11, còn trên 104 thì kết quả là 10

#### Scenario: Giảm giá không được bằng hoặc lớn hơn tiền hàng
- **WHEN** số tiền giảm giá bằng hoặc lớn hơn tiền hàng
- **THEN** hệ thống từ chối với mã lỗi `INVALID_DISCOUNT`

#### Scenario: Tỷ lệ phần trăm không hợp lệ
- **WHEN** một khoản điều chỉnh theo phần trăm có giá trị âm, lớn hơn 100, hoặc không phải số nguyên
- **THEN** hệ thống từ chối và báo lỗi đúng khoản đó (`INVALID_DISCOUNT`, `INVALID_SERVICE` hoặc `INVALID_VAT`)

### Requirement: Phân bổ khoản điều chỉnh vào từng món
Hệ thống SHALL phân bổ giảm giá, phí phục vụ và VAT vào từng món theo tỷ lệ thành tiền của món, tính tuần tự theo thứ tự giảm giá, phí phục vụ, VAT. Tổng của mỗi khoản trên các món MUST bằng đúng khoản đó của hoá đơn đến từng đồng. Phần dư được cộng 1 đồng cho các món có phần thập phân lớn nhất, nếu hoà thì món đứng trước được ưu tiên.

#### Scenario: Phân bổ phần dư
- **WHEN** chia 10 đồng cho ba món có trọng số bằng nhau
- **THEN** kết quả là 4 đồng, 3 đồng và 3 đồng, tổng đúng 10

#### Scenario: Tổng các món khớp hoá đơn
- **WHEN** hoá đơn có hai món 150.000 và 250.000 với giảm giá 10%, phí phục vụ 5%, VAT 8%
- **THEN** tổng `finalAmount` của hai món bằng đúng tổng thanh toán của hoá đơn
- **AND** tổng giảm giá, phí phục vụ và VAT phân bổ của các món lần lượt bằng đúng ba khoản của hoá đơn

### Requirement: Đọc số tiền người dùng nhập
Hệ thống SHALL đọc số tiền người dùng gõ ở các dạng `45000`, `45.000`, `45,000`, `45k`, `1,5k` và có thể kèm ký hiệu đồng ₫. Chuỗi không đọc được, chuỗi trống hoặc số vượt 9.999.999.999 đồng MUST bị từ chối.

#### Scenario: Nhập số tiền theo nhiều dạng
- **WHEN** người dùng nhập `45.000`, `45,000` hoặc `45k`
- **THEN** cả ba đều được hiểu là 45.000 đồng
- **AND** `1,5k` được hiểu là 1.500 đồng

#### Scenario: Nhập số tiền không hợp lệ
- **WHEN** người dùng nhập `abc`, `-5`, `1e5`, `4.5.0` hoặc để trống
- **THEN** số tiền bị coi là không hợp lệ và không được lưu

### Requirement: Giữ người ăn khi sửa hoá đơn
Hệ thống SHALL ghép món cũ với món mới theo mã món khi sửa hoá đơn, để người ăn đã gán của món được giữ nguyên. Người ăn không còn tham gia kèo bị bỏ khỏi món.

#### Scenario: Sửa hoá đơn giữ nguyên món
- **WHEN** người dùng sửa hoá đơn và giữ nguyên món có mã cũ với người ăn đã gán
- **THEN** món đó vẫn có đúng người ăn và số phần như trước

#### Scenario: Người ăn đã rời kèo
- **WHEN** hoá đơn được sửa và một người ăn không còn trong kèo
- **THEN** người đó bị bỏ khỏi người ăn của món

### Requirement: Khoá thao tác khi bữa đã lưu trữ
Hệ thống SHALL từ chối mọi thao tác ghi lên người ứng, chế độ chia, người chia đều, món và người ăn khi bữa ở trạng thái `ARCHIVED`.

#### Scenario: Sửa món của bữa đã lưu trữ
- **WHEN** người dùng thêm, sửa, xoá, đổi thứ tự món, gán người ăn hoặc đổi người ứng của một hoá đơn thuộc bữa `ARCHIVED`
- **THEN** hệ thống từ chối với mã lỗi `MEAL_ARCHIVED` và dữ liệu không đổi

### Requirement: Hiển thị dòng món và số thứ tự
Hệ thống SHALL đánh số các món của hoá đơn `ITEMIZED` từ 1 theo vị trí hiện tại trong danh sách. Số thứ tự chỉ để hiển thị và người dùng không sửa được. Mỗi dòng món hiển thị theo dạng `đơn giá × số lượng = thành tiền`.

#### Scenario: Đánh số lại sau khi chuyển món
- **WHEN** một món được chuyển lên hoặc xuống
- **THEN** số thứ tự của mọi món được tính lại theo vị trí mới, bắt đầu từ 1

#### Scenario: Dạng hiển thị của dòng món
- **WHEN** dòng món được hiển thị với đơn giá 150.000 và số lượng 2
- **THEN** dòng hiển thị `150.000 ₫ × 2 = 300.000 ₫`
