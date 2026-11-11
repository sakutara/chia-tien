## MODIFIED Requirements

### Requirement: Tick đã chuyển theo từng khoản chuyển
Hệ thống SHALL cho tick hoặc bỏ tick "Đã chuyển" cho từng khoản chuyển tiền có trong danh sách hiện tại. Khoản chuyển được nhận diện bằng cặp thực thể nguồn và đích, dạng `fromEntityId->toEntityId`. Khi tick, bữa ghi lại thời điểm tick và số tiền của khoản đó. Khi bỏ tick, trạng thái của khoản bị xoá. Tick một khoản không có trong danh sách hiện tại bị từ chối với mã `TRANSFER_NOT_FOUND`.

**Trước đây**: tick theo thực thể, lưu tại `settlementStatuses[entityId]` bằng `toggleEntityPaid` và `setAllEntitiesPaid`, lỗi `ENTITY_NOT_FOUND` khi khoá không phải thực thể của bữa.

#### Scenario: Tick rồi bỏ tick một khoản
- **WHEN** người dùng tick khoản Bình chuyển cho chủ app 45.000 đ, rồi bỏ tick
- **THEN** sau khi tick, bữa lưu trạng thái đã chuyển với thời điểm tick và số tiền 45.000 đ
- **AND** sau khi bỏ tick, bữa không còn trạng thái nào cho khoản đó

#### Scenario: Tick khoản không tồn tại
- **WHEN** có yêu cầu tick một khoản mà khoá không khớp với khoản chuyển nào của bữa
- **THEN** hệ thống báo không tìm thấy khoản chuyển tiền
- **AND** bữa không bị thay đổi

#### Scenario: Đánh dấu tất cả đã chuyển
- **WHEN** người dùng bấm "Đánh dấu tất cả đã chuyển"
- **THEN** mọi khoản chưa tick được tick trong cùng một lần ghi

### Requirement: Trạng thái hoàn tất của thực thể và của bữa
Hệ thống SHALL coi một thực thể là đã xong khi mọi khoản chuyển có nó làm nguồn hoặc đích đều đã được tick, hoặc khi nó không có khoản chuyển nào. Bữa được coi là đã thanh toán xong khi có ít nhất một hoá đơn, không còn món chưa có người ăn, và mọi khoản chuyển đều đã được tick. Tiến độ thanh toán hiển thị dưới dạng số khoản đã tick trên tổng số khoản chuyển.

**Trước đây**: tiến độ đếm theo số thực thể có số dư khác 0 (`activeEntityCount`, `paidEntityCount`); thực thể có số dư bằng 0 được coi là đã tick mà không cần lưu; `isAllSettled` yêu cầu mọi thực thể có số dư khác 0 đã tick.

#### Scenario: Tiến độ theo số khoản chuyển
- **WHEN** bữa có một khoản chuyển và khoản đó chưa được tick
- **THEN** tiến độ hiển thị 0/1 và bữa chưa được coi là đã thanh toán xong
- **AND** sau khi tick khoản đó, tiến độ hiển thị 1/1 và bữa được coi là đã thanh toán xong

#### Scenario: Thực thể cân bằng
- **WHEN** một thực thể có số dư ròng bằng 0
- **THEN** thực thể đó hiển thị là "Cân bằng" và không cần tick

#### Scenario: Bữa chưa có hoá đơn không được coi là xong
- **WHEN** bữa chưa có hoá đơn nào
- **THEN** bữa không được coi là đã thanh toán xong

### Requirement: Bất biến cân đối giữa tổng thu và tổng trả
Hệ thống SHALL bảo đảm rằng tổng tiền đã ứng của mọi thực thể bằng tổng tiền các hoá đơn của bữa, tổng phải chi của mọi thực thể bằng tiền đã phân bổ, và khi không còn món chưa phân bổ thì tổng số dư ròng của mọi thực thể bằng 0. Tổng số tiền các lệnh chuyển ở chế độ tự thanh toán bằng tổng các số dư dương. Bất biến về tổng đã ứng chỉ đúng khi người ứng của mỗi hoá đơn nằm trong danh sách tham gia kèo của hoá đơn đó.

**Trước đây**: tổng đã ứng của mọi thực thể luôn bằng tổng tiền các hoá đơn của bữa (`R-4`), không nêu điều kiện về người ứng.

#### Scenario: Tổng khớp với hai kèo
- **WHEN** bữa có hai kèo, ba thành viên, hoá đơn 60.000 đ ở kèo 1 do A ứng và chia đều cho A và B, hoá đơn 90.000 đ ở kèo 2 do C ứng và chia đều cho A, B, C
- **THEN** tổng đã ứng của các thực thể bằng 150.000 đ và tổng phải chi của các thực thể bằng 150.000 đ
- **AND** tổng số dư ròng của các thực thể bằng 0

#### Scenario: Người ứng ngoài kèo của hoá đơn
- **WHEN** một hoá đơn thuộc kèo không có người ứng trong danh sách tham gia của kèo đó
- **THEN** khoản tiền ứng đó không được cộng vào tổng đã ứng của thực thể nào
- **AND** tổng đã ứng của các thực thể nhỏ hơn tổng hoá đơn của bữa đúng bằng số tiền hoá đơn đó

### Requirement: Chi tiết quyết toán gom theo thực thể
Hệ thống SHALL hiển thị khối "Chi tiết quyết toán" đóng sẵn bên dưới danh sách lệnh chuyển tiền. Khi mở khối này, mỗi thực thể là một khối thu gọn có tên và số dư ròng, với nhãn "Nhận lại" kèm số tiền nếu dương, "Phải trả" kèm số tiền nếu âm, hoặc "Cân bằng" nếu bằng 0. Bên trong khối thực thể có "Ứng trước" và chi của thực thể, cùng giải trình của từng thành viên đóng sẵn có thể mở.

**Trước đây**: mỗi dòng thực thể có checkbox "Đã thanh toán" và nút mở giải trình trong hộp thoại `MemberBreakdownDialog`; nhãn là "Ứng".

#### Scenario: Xem giải trình của một thành viên trong thực thể
- **WHEN** người dùng mở "Chi tiết quyết toán" rồi mở khối của thực thể "Bình" có nhãn "Phải trả"
- **THEN** khối của Bình hiển thị ứng trước và chi của Bình
- **AND** khi người dùng mở "Chi tiết Bình", giải trình của Bình hiện ra với các hoá đơn đã ứng và các dòng chi phí

### Requirement: Danh sách lệnh chuyển tiền
Hệ thống SHALL hiển thị mỗi lệnh chuyển tiền thành một dòng gồm tên thực thể chuyển, tên thực thể nhận và số tiền, kèm ô tick "Đã chuyển". Khi bữa chưa có hoá đơn nào, khu quyết toán chỉ hiển thị thông báo yêu cầu thêm hoá đơn và không hiển thị công tắc chế độ hay danh sách lệnh. Nút "Đánh dấu tất cả đã chuyển" chỉ hiển thị khi còn ít nhất một khoản chưa tick. Nút mở mã QR chuyển khoản chỉ hiện với khoản chưa tick và có thông tin ngân hàng của người nhận.

**Trước đây**: nút mở QR hiện cho mọi lệnh có thông tin ngân hàng của người nhận, kể cả khoản đã chuyển (theo code trước commit `ae13221`; tài liệu không nêu).

#### Scenario: Bữa chưa có hoá đơn
- **WHEN** người dùng mở quyết toán của một bữa chưa có hoá đơn nào
- **THEN** khu quyết toán hiển thị thông báo cần thêm hoá đơn
- **AND** không hiển thị công tắc chế độ hay danh sách lệnh chuyển tiền

#### Scenario: Danh sách có khoản chưa tick
- **WHEN** bữa có ít nhất một lệnh chuyển tiền và chưa khoản nào được tick
- **THEN** mỗi lệnh hiển thị một dòng với ô "Đã chuyển" chưa chọn
- **AND** nút "Đánh dấu tất cả đã chuyển" hiển thị

#### Scenario: Khoản đã chuyển không có nút QR
- **WHEN** một lệnh chuyển tiền đã được tick "Đã chuyển"
- **THEN** dòng đó không hiển thị nút mở mã QR

## ADDED Requirements

### Requirement: Tick chỉ có hiệu lực khi số tiền khoản chuyển không đổi
Hệ thống SHALL coi một khoản là đã chuyển chỉ khi số tiền hiện tại của khoản đó bằng số tiền lưu lúc tick. Nếu số tiền đã đổi, khoản hiển thị lại là chưa chuyển và trạng thái cũ vẫn nằm trong bữa cho đến khi người dùng bỏ tick. Trạng thái của một khoản không còn tồn tại trong danh sách hiện tại vẫn được giữ trong bữa nhưng không hiển thị.

#### Scenario: Số tiền khoản đổi sau khi đã tick
- **WHEN** khoản Bình chuyển cho chủ app 45.000 đ đã được tick, rồi một hoá đơn bị sửa làm số tiền của khoản đó thay đổi
- **THEN** khoản đó hiển thị là chưa chuyển
- **AND** số khoản đã tick trong tiến độ giảm tương ứng

#### Scenario: Đổi chế độ không xoá các tick đã lưu
- **WHEN** bữa đã có khoản được tick và người dùng đổi chế độ quyết toán
- **THEN** các trạng thái tick đã lưu vẫn còn trong bữa
- **AND** một khoản mới có cùng khoá và cùng số tiền với khoản đã tick sẽ hiển thị là đã chuyển
