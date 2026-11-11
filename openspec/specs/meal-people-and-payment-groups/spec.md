# meal-people-and-payment-groups Specification

## Purpose
Capability này quản lý con người trong một bữa: thêm người có sẵn trong danh bạ hoặc tạo người mới rồi thêm vào bữa, bỏ người khỏi bữa kèm việc dọn dữ liệu liên quan, chỉ định và đổi người chủ trì, và tạo, sửa, giải tán nhóm thanh toán. Người dùng là chủ app khi chuẩn bị danh sách người cho một bữa, để các kèo, hoá đơn và quyết toán về sau dùng đúng người, chủ trì và nhóm. Danh bạ toàn cục và bộ lọc tìm người thuộc `member-directory`; cách tính công nợ của nhóm thuộc `settlement`.

## Requirements

### Requirement: Thêm người có sẵn trong danh bạ vào bữa
Hệ thống SHALL thêm một người đã có trong danh bạ vào danh sách người tham gia của bữa. Khi người đó được thêm mới, thời điểm dùng gần nhất của người đó được cập nhật. Người đã tham gia bữa không được thêm lần thứ hai, thao tác này không báo lỗi và không đổi thời điểm dùng gần nhất.

#### Scenario: Thêm người chưa tham gia bữa
- **WHEN** người dùng chọn một người trong danh bạ chưa tham gia bữa
- **THEN** người đó xuất hiện trong danh sách người tham gia của bữa
- **AND** thời điểm dùng gần nhất của người đó được cập nhật

#### Scenario: Chọn lại người đã tham gia
- **WHEN** người dùng chọn một người đã tham gia bữa
- **THEN** danh sách người tham gia không đổi và không có mục trùng lặp

#### Scenario: Mã người không có trong danh bạ
- **WHEN** hệ thống nhận một mã người không tồn tại trong danh bạ
- **THEN** thao tác bị từ chối với lỗi `MEMBER_NOT_FOUND`
- **AND** bữa không thay đổi

### Requirement: Tạo người mới và thêm vào bữa trong một thao tác
Hệ thống SHALL tạo người mới từ tên người dùng nhập và thêm người đó vào bữa trong cùng một thao tác. Tên được làm sạch khoảng trắng và viết hoa chữ đầu mỗi từ; tên rỗng hoặc dài quá 50 ký tự bị từ chối với lỗi `INVALID_NAME`. Nếu danh bạ đã có người cùng tên hiển thị (không phân biệt hoa thường, cùng dấu) thì dùng người đó và không tạo bản sao. Hồ sơ nhóm không được tính là người cùng tên. Kết quả trả về cho biết người đó có vừa được tạo hay không.

#### Scenario: Tạo người mới
- **WHEN** người dùng nhập một tên chưa có trong danh bạ
- **THEN** hệ thống tạo người mới, thêm vào bữa và trả về trạng thái vừa tạo

#### Scenario: Nhập lại tên đã có
- **WHEN** người dùng nhập một tên khác hoa thường với người đã có trong danh bạ, ví dụ `CƯỜNG` khi đã có `Cường`
- **THEN** hệ thống không tạo người thứ hai
- **AND** người đã có được thêm vào bữa và kết quả cho biết không tạo mới

#### Scenario: Tên rỗng hoặc quá dài
- **WHEN** người dùng nhập tên rỗng hoặc dài hơn 50 ký tự sau khi làm sạch
- **THEN** thao tác bị từ chối với lỗi `INVALID_NAME`
- **AND** danh bạ và bữa không thay đổi

#### Scenario: Tên trùng hồ sơ nhóm
- **WHEN** người dùng nhập một tên trùng với hồ sơ nhóm đã lưu trong danh bạ, ví dụ `Cặp Đôi` khi đã có hồ sơ nhóm `Cặp Đôi`
- **THEN** hệ thống tạo một người mới với tên đó và không dùng hồ sơ nhóm

### Requirement: Bữa lưu trữ không được đổi người, chủ trì hoặc nhóm
Hệ thống SHALL từ chối mọi thay đổi về người tham gia, chủ trì và nhóm thanh toán của một bữa có trạng thái `ARCHIVED`, với lỗi `MEAL_ARCHIVED`, và không ghi dữ liệu nào. Khi mã bữa không tồn tại, hệ thống báo lỗi `MEAL_NOT_FOUND`.

#### Scenario: Sửa người trong bữa đã lưu trữ
- **WHEN** người dùng thêm người, đổi chủ trì hoặc tạo nhóm trong một bữa `ARCHIVED`
- **THEN** thao tác bị từ chối với lỗi `MEAL_ARCHIVED`
- **AND** dữ liệu người, chủ trì và nhóm của bữa không thay đổi

#### Scenario: Bữa không tồn tại
- **WHEN** thao tác được gọi với mã bữa không có trong dữ liệu
- **THEN** thao tác bị từ chối với lỗi `MEAL_NOT_FOUND`

### Requirement: Khởi tạo chủ trì và người tham gia cho bữa mới
Hệ thống SHALL khởi tạo mỗi bữa mới với người chủ app (hồ sơ mặc định trong cài đặt) là người chủ trì và là người tham gia duy nhất. Nếu chưa có dữ liệu cài đặt mặc định thì việc khởi tạo thất bại.

#### Scenario: Bữa mới có chủ app làm chủ trì
- **WHEN** hệ thống khởi tạo người tham gia cho một bữa mới
- **THEN** danh sách người tham gia chỉ gồm người chủ app
- **AND** người chủ trì là người chủ app

### Requirement: Không được bỏ người đang là chủ trì
Hệ thống SHALL từ chối bỏ người đang là chủ trì của bữa khỏi bữa, với lỗi `HOST_REQUIRED`. Người dùng phải đổi chủ trì trước khi bỏ người đó.

#### Scenario: Bỏ chủ trì khỏi bữa
- **WHEN** người dùng bỏ người đang là chủ trì của bữa
- **THEN** thao tác bị từ chối với lỗi `HOST_REQUIRED`
- **AND** người đó vẫn nằm trong danh sách người tham gia

### Requirement: Không được bỏ người đang gắn với hoá đơn hoặc món
Hệ thống SHALL từ chối bỏ người khỏi bữa khi người đó đang là người ứng tiền của một hoá đơn trong bữa, đang nằm trong danh sách chia đều của một hoá đơn, hoặc đang là người ăn của một món. Lỗi `MEMBER_IN_USE` nêu đủ lý do, gồm `payer`, `equalSplit` và `consumer`. Khi bị từ chối, không có kèo, nhóm hay trạng thái thanh toán nào thay đổi.

#### Scenario: Người ứng tiền cho hoá đơn
- **WHEN** người dùng bỏ một người đang là người ứng tiền của hoá đơn trong bữa
- **THEN** thao tác bị từ chối với lỗi `MEMBER_IN_USE` và lý do `payer`
- **AND** danh sách kèo của bữa không đổi

#### Scenario: Người ăn một món
- **WHEN** người dùng bỏ một người có tên trong danh sách ăn của một món
- **THEN** thao tác bị từ chối với lỗi `MEMBER_IN_USE` và lý do `consumer`

#### Scenario: Người trong danh sách chia đều
- **WHEN** người dùng bỏ một người nằm trong danh sách chia đều của một hoá đơn
- **THEN** thao tác bị từ chối với lỗi `MEMBER_IN_USE` và lý do `equalSplit`

### Requirement: Bỏ người khỏi bữa thì gỡ người đó khỏi các kèo và dọn trạng thái thanh toán
Hệ thống SHALL khi bỏ một người không bị chặn khỏi bữa: gỡ người đó khỏi danh sách người tham gia của mọi kèo trong bữa, không đụng tới kèo của bữa khác, và xoá trạng thái "Đã thanh toán" của chính người đó và của các nhóm họ thuộc. Bỏ một người không có trong bữa thì không làm gì và không báo lỗi.

#### Scenario: Gỡ người khỏi các kèo của bữa
- **WHEN** người dùng bỏ một người không bị chặn khỏi bữa
- **THEN** người đó bị gỡ khỏi danh sách người tham gia của mọi kèo trong bữa
- **AND** kèo thuộc bữa khác vẫn giữ nguyên người đó

#### Scenario: Xoá tick thanh toán khi bỏ người
- **WHEN** người dùng bỏ một người đang có trạng thái "Đã thanh toán" hoặc đang thuộc một nhóm có trạng thái đó
- **THEN** các trạng thái "Đã thanh toán" liên quan tới người đó và nhóm của họ bị xoá

#### Scenario: Bỏ người không có trong bữa
- **WHEN** thao tác bỏ một người không có trong danh sách người tham gia của bữa
- **THEN** bữa không thay đổi và không có lỗi

### Requirement: Bỏ người khỏi nhóm và co nhóm khi thiếu người
Hệ thống SHALL gỡ người bị bỏ khỏi mọi nhóm thanh toán của bữa. Nhóm còn ít nhất hai thành viên được giữ lại; nếu người đại diện bị gỡ thì đại diện chuyển sang thành viên đầu tiên còn lại. Nhóm còn dưới hai thành viên thì bị giải tán và những người còn lại trở về thanh toán cá nhân.

#### Scenario: Nhóm còn đủ hai người
- **WHEN** người dùng bỏ một người khỏi nhóm ba người
- **THEN** nhóm giữ lại hai người còn lại

#### Scenario: Hồ sơ nhóm không đổi khi co nhóm
- **WHEN** người dùng bỏ một người khỏi bữa và người đó đang thuộc một nhóm của bữa có hồ sơ trong danh bạ
- **THEN** hồ sơ nhóm trong danh bạ vẫn giữ danh sách thành viên cũ, kể cả người vừa bị bỏ

#### Scenario: Đại diện bị bỏ
- **WHEN** người dùng bỏ người đang là đại diện của nhóm, và nhóm vẫn còn từ hai người trở lên
- **THEN** đại diện mới là thành viên đầu tiên còn lại của nhóm

#### Scenario: Nhóm chỉ còn một người
- **WHEN** người dùng bỏ một người khỏi nhóm hai người
- **THEN** nhóm bị giải tán và không còn trong danh sách nhóm của bữa

### Requirement: Chỉ định và đổi chủ trì trong từng bữa
Hệ thống SHALL chỉ cho chọn làm chủ trì một người đã tham gia bữa; người chưa tham gia bị từ chối với lỗi `NOT_PARTICIPANT`. Việc đổi chủ trì chỉ ảnh hưởng đến bữa đang được sửa, không ảnh hưởng đến bữa khác.

#### Scenario: Đổi chủ trì sang người đã tham gia
- **WHEN** người dùng chọn một người đã tham gia bữa làm chủ trì
- **THEN** bữa đó có người chủ trì mới
- **AND** các bữa khác vẫn giữ chủ trì cũ

#### Scenario: Chọn người chưa tham gia
- **WHEN** người dùng chọn làm chủ trì một người chưa tham gia bữa
- **THEN** thao tác bị từ chối với lỗi `NOT_PARTICIPANT`

### Requirement: Nhóm thanh toán cần ít nhất hai thành viên khác nhau trong bữa
Hệ thống SHALL chỉ tạo nhóm thanh toán khi có ít nhất hai thành viên khác nhau và mọi thành viên đều đã tham gia bữa. Người chủ trì được phép nằm trong nhóm. Dưới hai thành viên thì báo lỗi `GROUP_TOO_SMALL`; có thành viên chưa tham gia bữa thì báo lỗi `NOT_PARTICIPANT`.

#### Scenario: Nhóm chỉ có một người
- **WHEN** người dùng tạo nhóm với một người hoặc với cùng một người lặp lại
- **THEN** thao tác bị từ chối với lỗi `GROUP_TOO_SMALL`

#### Scenario: Thành viên ngoài bữa
- **WHEN** người dùng tạo nhóm có một người chưa tham gia bữa
- **THEN** thao tác bị từ chối với lỗi `NOT_PARTICIPANT`

### Requirement: Mỗi người chỉ thuộc một nhóm trong một bữa
Hệ thống SHALL không cho một người thuộc hai nhóm trong cùng một bữa. Khi người dùng cố đưa người đã ở nhóm khác vào nhóm mới, hệ thống báo lỗi `MEMBER_ALREADY_GROUPED` kèm tên nhóm đang chứa người đó. Hộp tạo nhóm không hiển thị những người đã thuộc nhóm khác. Khi sửa một nhóm, các thành viên của chính nhóm đó không bị coi là trùng.

#### Scenario: Thêm người đã có nhóm
- **WHEN** người dùng tạo nhóm mới có một người đang thuộc nhóm `Cặp đôi` trong bữa
- **THEN** thao tác bị từ chối với lỗi `MEMBER_ALREADY_GROUPED` và tên nhóm `Cặp đôi`
- **AND** số nhóm của bữa không đổi

#### Scenario: Danh sách chọn khi tạo nhóm
- **WHEN** người dùng mở hộp tạo nhóm trong bữa có sẵn một nhóm
- **THEN** các thành viên của nhóm đó không xuất hiện trong danh sách chọn

### Requirement: Tên nhóm và giới hạn độ dài
Hệ thống SHALL đặt tên mặc định cho nhóm là tên các thành viên, theo thứ tự đã chọn, nối bằng ` + ` khi tên để trống. Tên người dùng nhập được làm sạch khoảng trắng và giữ nguyên chữ hoa thường. Tên sau khi làm sạch dài quá 80 ký tự bị từ chối với lỗi `INVALID_NAME`.

#### Scenario: Để trống tên nhóm
- **WHEN** người dùng tạo nhóm của `Cường` và `Dung` mà không nhập tên
- **THEN** nhóm có tên `Cường + Dung`

#### Scenario: Tên quá dài
- **WHEN** người dùng nhập tên nhóm dài hơn 80 ký tự
- **THEN** thao tác bị từ chối với lỗi `INVALID_NAME`

### Requirement: Người đại diện của nhóm
Hệ thống SHALL chọn người đầu tiên trong danh sách thành viên làm đại diện khi không chỉ định khác. Đại diện phải thuộc nhóm, nếu không thao tác bị từ chối với lỗi `NOT_IN_GROUP`. Khi sửa nhóm, đại diện cũ được giữ nếu vẫn còn trong nhóm.

#### Scenario: Đại diện mặc định
- **WHEN** nhóm được tạo mà không chỉ định đại diện
- **THEN** đại diện là thành viên được chọn đầu tiên

#### Scenario: Sửa nhóm bỏ đại diện cũ
- **WHEN** người dùng sửa nhóm, bỏ người đang là đại diện, nhóm vẫn còn từ hai người trở lên và không chỉ định đại diện mới
- **THEN** đại diện là thành viên đầu tiên còn lại của nhóm

#### Scenario: Đại diện ngoài nhóm
- **WHEN** người dùng chỉ định đại diện không thuộc nhóm
- **THEN** thao tác bị từ chối với lỗi `NOT_IN_GROUP`

### Requirement: Sửa tên và thành phần nhóm
Hệ thống SHALL cho đổi tên và đổi thành phần của một nhóm trong bữa. Đổi tên không xoá trạng thái "Đã thanh toán". Đổi thành phần xoá trạng thái "Đã thanh toán" của những người vào hoặc ra khỏi nhóm và của chính nhóm đó. Thành phần mới phải thoả mọi ràng buộc khi tạo nhóm.

#### Scenario: Đổi tên nhóm
- **WHEN** người dùng đổi tên một nhóm đang có trạng thái "Đã thanh toán"
- **THEN** tên nhóm đổi theo
- **AND** trạng thái "Đã thanh toán" vẫn còn

#### Scenario: Đổi thành phần nhóm
- **WHEN** người dùng thêm một người vào nhóm đang có trạng thái "Đã thanh toán"
- **THEN** trạng thái "Đã thanh toán" của nhóm và của những người có thay đổi thành phần bị xoá

#### Scenario: Thành phần mới vi phạm ràng buộc
- **WHEN** người dùng sửa nhóm và thêm một người đang thuộc nhóm khác trong bữa
- **THEN** thao tác bị từ chối với lỗi `MEMBER_ALREADY_GROUPED`

### Requirement: Giải tán nhóm
Hệ thống SHALL giải tán một nhóm trong bữa: các thành viên trở về thanh toán cá nhân và trạng thái "Đã thanh toán" của nhóm và của các thành viên bị xoá. Hồ sơ nhóm trong danh bạ vẫn được giữ. Giải tán một nhóm không còn tồn tại thì báo lỗi `GROUP_NOT_FOUND`.

#### Scenario: Giải tán nhóm thành công
- **WHEN** người dùng giải tán một nhóm trong bữa
- **THEN** nhóm không còn trong danh sách nhóm của bữa
- **AND** các thành viên của nhóm trở về thanh toán cá nhân

#### Scenario: Giải tán nhóm đã không còn
- **WHEN** người dùng giải tán một nhóm đã bị giải tán trước đó
- **THEN** thao tác bị từ chối với lỗi `GROUP_NOT_FOUND`

### Requirement: Xác nhận trước khi xoá trạng thái đã thanh toán
Giao diện SHALL hỏi xác nhận trước khi thao tác làm xoá trạng thái "Đã thanh toán": sửa thành phần nhóm có tick, giải tán nhóm có tick, hoặc bỏ người đang có tick. Nếu người dùng huỷ xác nhận thì dữ liệu không thay đổi.

#### Scenario: Huỷ xác nhận khi sửa thành phần nhóm
- **WHEN** người dùng sửa thành phần một nhóm có người đã được tick "Đã thanh toán" và chọn huỷ ở hộp xác nhận
- **THEN** nhóm và trạng thái thanh toán không thay đổi

#### Scenario: Xác nhận giải tán nhóm có tick
- **WHEN** người dùng giải tán một nhóm có trạng thái "Đã thanh toán" và chọn xác nhận
- **THEN** nhóm bị giải tán và các trạng thái "Đã thanh toán" liên quan bị xoá

### Requirement: Nhóm có hồ sơ trong danh bạ
Hệ thống SHALL lưu mỗi nhóm được tạo thành một hồ sơ nhóm trong danh bạ, và cập nhật hồ sơ đó khi nhóm đổi tên hoặc đổi thành phần. Nếu tên nhóm trùng với tên một cá nhân đã có trong danh bạ thì nhóm vẫn được tạo nhưng không tạo hồ sơ nhóm.

#### Scenario: Tạo nhóm có hồ sơ
- **WHEN** người dùng tạo một nhóm tên `Cặp đôi`
- **THEN** danh bạ có hồ sơ nhóm tên `Cặp đôi` với đúng các thành viên của nhóm

#### Scenario: Tên nhóm trùng tên cá nhân
- **WHEN** người dùng tạo nhóm có tên trùng với một cá nhân trong danh bạ
- **THEN** nhóm được tạo
- **AND** nhóm không được liên kết với hồ sơ nhóm nào trong danh bạ

#### Scenario: Tên nhóm trùng hồ sơ nhóm đã có
- **WHEN** người dùng tạo nhóm có tên trùng với một hồ sơ nhóm đã có trong danh bạ
- **THEN** hồ sơ nhóm cũ được cập nhật thành thành viên của nhóm mới
- **AND** nhóm mới được liên kết với hồ sơ đó

### Requirement: Thêm nhóm từ danh bạ vào bữa
Hệ thống SHALL cho thêm một hồ sơ nhóm từ danh bạ vào bữa như một cá nhân: các thành viên chưa có trong bữa được thêm vào danh sách người tham gia, rồi nhóm được dựng trong bữa với tên là tên hồ sơ và đại diện là thành viên đầu tiên. Nếu bữa đã có nhóm từ hồ sơ này thì thao tác không làm gì. Nếu một thành viên đang thuộc nhóm khác trong bữa thì thao tác bị từ chối với lỗi `MEMBER_ALREADY_GROUPED`.

#### Scenario: Thêm nhóm vào bữa khác
- **WHEN** người dùng thêm một hồ sơ nhóm `Cặp đôi` vào một bữa chưa có hai thành viên của nhóm
- **THEN** hai thành viên được thêm vào danh sách người tham gia của bữa
- **AND** bữa có một nhóm tên `Cặp đôi` với đại diện là thành viên đầu tiên

#### Scenario: Thêm lại cùng nhóm
- **WHEN** người dùng thêm lại hồ sơ nhóm đã có trong bữa
- **THEN** bữa không thay đổi

#### Scenario: Thành viên đã ở nhóm khác
- **WHEN** người dùng thêm hồ sơ nhóm mà một thành viên đang thuộc nhóm khác trong bữa
- **THEN** thao tác bị từ chối với lỗi `MEMBER_ALREADY_GROUPED`

#### Scenario: Hồ sơ nhóm còn ít hơn hai người trong danh bạ
- **WHEN** người dùng thêm một hồ sơ nhóm mà chỉ còn dưới hai thành viên tồn tại trong danh bạ
- **THEN** thao tác bị từ chối với lỗi `GROUP_TOO_SMALL`
