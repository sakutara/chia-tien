## MODIFIED Requirements

### Requirement: Chỉ định và đổi chủ trì trong từng bữa
Hệ thống SHALL chỉ cho chọn làm chủ trì một người đã tham gia bữa; người chưa tham gia bị từ chối với lỗi `NOT_PARTICIPANT`. Việc đổi chủ trì chỉ ảnh hưởng đến bữa đang được sửa, không ảnh hưởng đến bữa khác. Trong khối thông tin của bữa, chủ trì được chọn bằng ô chọn thả xuống (thẻ `select`, thành phần `HostSelector`) chỉ liệt kê những người đã tham gia bữa.

**Trước đây**: tài liệu `documentation/epic-2/SA.md` mục bảng component ghi `HostSelector` là nhóm radio chọn chủ trì. Tài liệu `documentation/03-ui-ux-and-design-system.md` mục 4.3 ghi chủ trì là dropdown, và mã nguồn khớp với tài liệu 03.

#### Scenario: Đổi chủ trì sang người đã tham gia
- **WHEN** người dùng chọn một người đã tham gia bữa làm chủ trì
- **THEN** bữa đó có người chủ trì mới
- **AND** các bữa khác vẫn giữ chủ trì cũ

#### Scenario: Chọn người chưa tham gia
- **WHEN** người dùng chọn làm chủ trì một người chưa tham gia bữa
- **THEN** thao tác bị từ chối với lỗi `NOT_PARTICIPANT`

### Requirement: Mỗi người chỉ thuộc một nhóm trong một bữa
Hệ thống SHALL không cho một người thuộc hai nhóm trong cùng một bữa. Khi người dùng cố đưa người đã ở nhóm khác vào nhóm mới, hệ thống báo lỗi `MEMBER_ALREADY_GROUPED` kèm tên nhóm đang chứa người đó. Hộp tạo nhóm ẩn những người đã thuộc nhóm khác, không hiển thị họ dưới dạng bị vô hiệu. Khi sửa một nhóm, các thành viên của chính nhóm đó không bị coi là trùng.

**Trước đây**: tài liệu `documentation/epic-2/SA.md` mục `PaymentGroupDialog` ghi người đã ở nhóm khác bị làm mờ kèm tên nhóm.

#### Scenario: Thêm người đã có nhóm
- **WHEN** người dùng tạo nhóm mới có một người đang thuộc nhóm `Cặp đôi` trong bữa
- **THEN** thao tác bị từ chối với lỗi `MEMBER_ALREADY_GROUPED` và tên nhóm `Cặp đôi`
- **AND** số nhóm của bữa không đổi

#### Scenario: Danh sách chọn khi tạo nhóm
- **WHEN** người dùng mở hộp tạo nhóm trong bữa có sẵn một nhóm
- **THEN** các thành viên của nhóm đó không xuất hiện trong danh sách chọn

### Requirement: Người đại diện của nhóm
Hệ thống SHALL chọn người đầu tiên trong danh sách thành viên làm đại diện khi không chỉ định khác. Đại diện phải thuộc nhóm, nếu không thao tác bị từ chối với lỗi `NOT_IN_GROUP`. Khi sửa nhóm, đại diện cũ được giữ nếu vẫn còn trong nhóm. Hộp tạo và sửa nhóm trên giao diện không có ô chọn đại diện, nên người dùng không đổi đại diện bằng tay.

**Trước đây**: tài liệu `documentation/epic-2/SA.md` mục `PaymentGroupDialog` ghi hộp nhóm có chọn đại diện.

#### Scenario: Đại diện mặc định
- **WHEN** nhóm được tạo mà không chỉ định đại diện
- **THEN** đại diện là thành viên được chọn đầu tiên

#### Scenario: Đại diện ngoài nhóm
- **WHEN** người dùng chỉ định đại diện không thuộc nhóm
- **THEN** thao tác bị từ chối với lỗi `NOT_IN_GROUP`

### Requirement: Xác nhận trước khi xoá trạng thái đã thanh toán
Giao diện SHALL hỏi xác nhận bằng `ConfirmDialog` của app trước khi thao tác làm xoá trạng thái "Đã thanh toán": sửa thành phần nhóm có tick, giải tán nhóm có tick, hoặc bỏ người đang có tick. Nếu người dùng huỷ xác nhận thì dữ liệu không thay đổi.

**Trước đây**: tài liệu `documentation/epic-2/SA.md` ghi hộp xác nhận là `window.confirm`, chấp nhận cho bản thử nghiệm. Tài liệu `documentation/epic-3/BR.md` BR-3.12 yêu cầu thay bằng hộp xác nhận của app.

#### Scenario: Huỷ xác nhận khi sửa thành phần nhóm
- **WHEN** người dùng sửa thành phần một nhóm có người đã được tick "Đã thanh toán" và chọn huỷ ở hộp xác nhận
- **THEN** nhóm và trạng thái thanh toán không thay đổi

#### Scenario: Xác nhận giải tán nhóm có tick
- **WHEN** người dùng giải tán một nhóm có trạng thái "Đã thanh toán" và chọn xác nhận
- **THEN** nhóm bị giải tán và các trạng thái "Đã thanh toán" liên quan bị xoá
