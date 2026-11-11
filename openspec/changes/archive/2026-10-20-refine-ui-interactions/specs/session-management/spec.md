## MODIFIED Requirements

### Requirement: Chọn người tham gia kèo trong phạm vi bữa
Hệ thống SHALL chỉ cho chọn người tham gia kèo trong số người đang có trong bữa. Mỗi người chỉ được tính một lần trong danh sách kèo. Nếu chọn người ngoài bữa, thao tác bị từ chối với mã `SESSION_MEMBER_NOT_IN_MEAL`. Người tham gia kèo được chọn tại chỗ trong thẻ kèo đang mở, bằng thành phần `PeoplePicker` có nhãn "Tham gia:", không mở hộp thoại riêng.

**Trước đây**: tài liệu `documentation/epic-4/SA.md` mục 5.2 và thành phần `SessionParticipantsDialog` ghi việc tick người tham gia thực hiện trong một hộp thoại riêng `SessionParticipantsDialog`.

#### Scenario: Chọn người không có trong bữa
- **WHEN** người dùng gửi danh sách tham gia gồm một mã người không thuộc bữa
- **THEN** thao tác bị từ chối với mã `SESSION_MEMBER_NOT_IN_MEAL`
- **AND** danh sách tham gia của kèo không đổi

#### Scenario: Bỏ bớt rồi thêm lại người tham gia
- **GIVEN** kèo có ba người An, Bình, Cường
- **WHEN** người dùng bỏ Cường khỏi kèo rồi chọn lại Cường
- **THEN** kèo lại có đủ ba người

#### Scenario: Kèo chưa có hoá đơn được để trống người tham gia
- **GIVEN** kèo không có hoá đơn nào
- **WHEN** người dùng bỏ hết mọi người khỏi kèo
- **THEN** thao tác thành công và kèo có danh sách tham gia rỗng

## ADDED Requirements

### Requirement: Thu gọn và mở rộng kèo
Hệ thống SHALL hiển thị mỗi kèo thành một khối thu gọn được. Khi thu gọn, khối hiện tên kèo và số hoá đơn của kèo. Mọi kèo mặc định ở trạng thái thu gọn, kể cả kèo vừa thêm. Người dùng bấm nút "Mở" của kèo để xem chi tiết, và bấm "Thu gọn" để đóng lại.

Tài liệu `documentation/epic-4/BR.md` R-17 ghi kèo vừa thêm mở sẵn và các kèo khác tự thu gọn khi bữa có từ 4 kèo. Hành vi này không có trong mã nguồn.

#### Scenario: Mở bữa có nhiều kèo
- **GIVEN** bữa có hai kèo
- **WHEN** người dùng mở trang làm việc của bữa
- **THEN** cả hai kèo đều thu gọn

#### Scenario: Mở một kèo
- **WHEN** người dùng bấm "Mở" trên một kèo đang thu gọn
- **THEN** kèo đó hiện phần chi tiết, gồm dòng "Tham gia:" và danh sách hoá đơn
