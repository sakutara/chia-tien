## ADDED Requirements

### Requirement: Nhóm có hồ sơ trong danh bạ
Hệ thống SHALL lưu mỗi nhóm được tạo thành một hồ sơ nhóm trong danh bạ, và cập nhật hồ sơ đó khi nhóm đổi tên hoặc đổi thành phần. Nếu tên nhóm trùng với tên một cá nhân đã có trong danh bạ thì nhóm vẫn được tạo nhưng không tạo hồ sơ nhóm. Giải tán nhóm trong bữa không xoá hồ sơ nhóm trong danh bạ.

#### Scenario: Tạo nhóm có hồ sơ
- **WHEN** người dùng tạo một nhóm tên `Cặp đôi`
- **THEN** danh bạ có hồ sơ nhóm tên `Cặp đôi` với đúng các thành viên của nhóm

#### Scenario: Tên nhóm trùng tên cá nhân
- **WHEN** người dùng tạo nhóm có tên trùng với một cá nhân trong danh bạ
- **THEN** nhóm được tạo
- **AND** nhóm không được liên kết với hồ sơ nhóm nào trong danh bạ

#### Scenario: Giải tán nhóm giữ lại hồ sơ
- **WHEN** người dùng giải tán một nhóm đã có hồ sơ trong danh bạ
- **THEN** nhóm biến mất khỏi bữa
- **AND** hồ sơ nhóm vẫn còn trong danh bạ

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

## MODIFIED Requirements

### Requirement: Xác nhận trước khi xoá trạng thái đã thanh toán
Giao diện SHALL hỏi xác nhận trước khi thao tác làm xoá trạng thái "Đã thanh toán": sửa thành phần nhóm có tick, giải tán nhóm có tick, hoặc bỏ một người khỏi bữa khi chính người đó đang có trạng thái "Đã thanh toán". Nếu người dùng huỷ xác nhận thì dữ liệu không thay đổi.

**Trước đây**: theo Epic 2 R-13, giao diện hỏi xác nhận khi có bất kỳ khoá nào bị ảnh hưởng đang "Đã thanh toán", kể cả khoá của nhóm mà người đó thuộc khi bỏ người khỏi bữa. Code hiện tại không hỏi trong trường hợp bỏ một người thuộc nhóm đang có tick (xem `design.md`, mục Risks).

#### Scenario: Huỷ xác nhận khi sửa thành phần nhóm
- **WHEN** người dùng sửa thành phần một nhóm có người đã được tick "Đã thanh toán" và chọn huỷ ở hộp xác nhận
- **THEN** nhóm và trạng thái thanh toán không thay đổi

#### Scenario: Xác nhận giải tán nhóm có tick
- **WHEN** người dùng giải tán một nhóm có trạng thái "Đã thanh toán" và chọn xác nhận
- **THEN** nhóm bị giải tán và các trạng thái "Đã thanh toán" liên quan bị xoá

### Requirement: Sửa tên và thành phần nhóm
Hệ thống SHALL cho đổi tên và đổi thành phần của một nhóm trong bữa. Đổi tên không xoá trạng thái "Đã thanh toán". Đổi thành phần xoá trạng thái "Đã thanh toán" của những người vào hoặc ra khỏi nhóm và của chính nhóm đó. Thành phần mới phải thoả mọi ràng buộc khi tạo nhóm. Khi nhóm có hồ sơ trong danh bạ, hồ sơ đó được cập nhật theo tên và thành phần mới.

**Trước đây**: đổi tên và đổi thành phần không có tác động tới danh bạ; tài liệu Epic 2 không nêu hồ sơ nhóm.

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

#### Scenario: Cập nhật hồ sơ nhóm trong danh bạ
- **GIVEN** nhóm `Cặp đôi` có hồ sơ trong danh bạ
- **WHEN** người dùng đổi thành phần nhóm thành `Cặp đôi` gồm hai người khác
- **THEN** hồ sơ nhóm trong danh bạ có đúng thành phần mới
