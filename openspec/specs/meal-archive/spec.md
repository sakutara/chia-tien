# meal-archive Specification

## Purpose
Capability này quản lý việc Lưu trữ một bữa đã chốt xong thanh toán: kiểm tra điều kiện, dọn hoá đơn và file ảnh để giải phóng bộ nhớ, giữ lại tổng kết chi phí và quyết toán để xem lại, và khoá bữa ở trạng thái chỉ đọc. Phục vụ chủ app khi mọi khoản chuyển tiền của bữa đã được tick xong và muốn chốt sổ bữa đó. Việc xoá vĩnh viễn một bữa đã lưu trữ cũng thuộc capability này.

## Requirements

### Requirement: Bữa chưa có chi phí không được lưu trữ
Hệ thống SHALL từ chối lưu trữ một bữa có tổng chi phí bằng 0. Bữa cần có ít nhất một hoá đơn có số tiền để đủ điều kiện lưu trữ.

#### Scenario: Bữa chưa có hoá đơn nào
- **WHEN** người dùng cố lưu trữ một bữa đang `ACTIVE` mà tổng chi phí của mọi hoá đơn bằng 0
- **THEN** hệ thống không lưu trữ bữa và báo lỗi mã `ARCHIVE_EMPTY_MEAL`
- **AND** nút "Lưu trữ bữa" hiển thị ở trạng thái khoá kèm lý do "Bữa chưa có chi phí để lưu trữ."

### Requirement: Món chưa có người ăn chặn việc lưu trữ
Hệ thống SHALL chặn lưu trữ khi còn món nào chưa có người ăn. Các món chia theo chế độ `BY_ITEM` mà không có người nào trong `consumers` được tính là món chưa gán.

#### Scenario: Còn món chưa gán người ăn
- **WHEN** người dùng cố lưu trữ một bữa có ít nhất một món chưa có người ăn
- **THEN** hệ thống không lưu trữ bữa và báo lỗi mã `ARCHIVE_UNASSIGNED_ITEMS`
- **AND** lý do khoá hiển thị dạng "Còn N món chưa có người ăn.", với N là số món chưa gán

### Requirement: Mọi khoản chuyển tiền phải được tick đã chuyển trước khi lưu trữ
Hệ thống SHALL chỉ cho phép lưu trữ khi mọi khoản chuyển tiền trong quyết toán của bữa đã được tick "Đã chuyển". Nếu bữa không có khoản chuyển tiền nào thì không cần tick gì và vẫn được lưu trữ.

#### Scenario: Còn khoản chuyển chưa tick
- **WHEN** người dùng cố lưu trữ một bữa có ít nhất một khoản chuyển tiền chưa được tick "Đã chuyển"
- **THEN** hệ thống không lưu trữ bữa và báo lỗi mã `ARCHIVE_UNPAID_ENTITIES` kèm danh sách các khoản chưa tick
- **AND** lý do khoá hiển thị dạng "Chưa tick đã chuyển:" theo sau là tên từng khoản, ví dụ tên người chuyển và tên người nhận

#### Scenario: Mọi khoản đã tick
- **WHEN** mọi khoản chuyển tiền của bữa đều đã được tick "Đã chuyển"
- **THEN** bữa đủ điều kiện lưu trữ và nút "Lưu trữ bữa" được bật

#### Scenario: Không có khoản chuyển tiền nào
- **WHEN** bữa không phát sinh khoản chuyển tiền nào, ví dụ mỗi người đã tự cân bằng
- **THEN** bữa đủ điều kiện lưu trữ mà không cần tick

#### Scenario: Sửa hoá đơn làm đổi số tiền khoản chuyển
- **GIVEN** một khoản chuyển đã được tick với số tiền cũ
- **WHEN** số tiền của khoản đó thay đổi sau khi sửa hoá đơn
- **THEN** tick cũ không còn hiệu lực và bữa bị chặn với mã `ARCHIVE_UNPAID_ENTITIES` cho đến khi tick lại
- **AND** sau khi tick lại, lưu trữ dùng tổng tiền mới để ghi vào `archivedSummary`

### Requirement: Bữa đã lưu trữ không thể lưu trữ lại
Hệ thống SHALL từ chối lưu trữ lần hai đối với bữa có `status` là `ARCHIVED`, với mã lỗi `MEAL_ARCHIVED`.

#### Scenario: Gọi lưu trữ trên bữa đã lưu trữ
- **GIVEN** một bữa đã có `status` là `ARCHIVED`
- **WHEN** hành động lưu trữ được gọi lại cho bữa đó
- **THEN** hệ thống báo lỗi mã `MEAL_ARCHIVED` và không thay đổi dữ liệu nào

### Requirement: Nút lưu trữ hiển thị lý do khi bị khoá
Hệ thống SHALL hiển thị nút "Lưu trữ bữa" ở chế độ bữa đang hoạt động. Khi điều kiện chưa đạt, nút bị khoá và lý do được đưa vào tiêu đề gợi ý và đoạn chữ dành cho trình đọc màn hình.

#### Scenario: Nút bị khoá khi chưa đủ điều kiện
- **GIVEN** một bữa đang `ACTIVE` chưa đủ điều kiện lưu trữ
- **WHEN** người dùng mở tab "Chia tiền" của bữa đó
- **THEN** nút "Lưu trữ bữa" hiển thị ở trạng thái khoá
- **AND** lý do khoá được gắn vào thuộc tính mô tả của nút, đồng thời có đoạn chữ "Chưa thể lưu trữ:" kèm nội dung lý do

#### Scenario: Nút được bật khi đủ điều kiện
- **GIVEN** một bữa đang `ACTIVE` đã đủ điều kiện lưu trữ
- **WHEN** người dùng mở tab "Chia tiền" của bữa đó
- **THEN** nút "Lưu trữ bữa" được bật và không có lý do khoá

### Requirement: Xác nhận trước khi lưu trữ và nêu rõ những gì sẽ mất
Hệ thống SHALL hiện hộp thoại xác nhận "Lưu trữ bữa?" trước khi lưu trữ. Hộp thoại nêu rõ việc lưu trữ không thể hoàn tác, số hoá đơn và số file ảnh sẽ bị xoá, tổng dung lượng sẽ được giải phóng, và những gì được giữ lại.

#### Scenario: Mở hộp thoại xác nhận
- **GIVEN** một bữa đủ điều kiện lưu trữ
- **WHEN** người dùng bấm nút "Lưu trữ bữa"
- **THEN** hộp thoại "Lưu trữ bữa?" hiển thị số hoá đơn, số file ảnh và dung lượng sẽ được giải phóng
- **AND** hộp thoại nêu rằng chi phí từng kèo, các món và lịch sử quyết toán được giữ lại
- **AND** nút "Huỷ" được đặt làm mục focus mặc định

#### Scenario: Huỷ hộp thoại
- **WHEN** người dùng bấm "Huỷ" trong hộp thoại xác nhận
- **THEN** hộp thoại đóng và bữa không thay đổi gì

### Requirement: Lưu trữ giữ lại chi phí và người ứng của từng kèo
Hệ thống SHALL ghi vào mỗi kèo của bữa trường `archivedTotalAmount` là tổng tiền các hoá đơn của kèo đó, và trường `archivedPayerSummary` là danh sách người đã ứng tiền với số tiền ứng lớn hơn 0. Kèo không có hoá đơn nào nhận tổng bằng 0 và danh sách người ứng rỗng.

#### Scenario: Ghi tổng và người ứng của từng kèo
- **WHEN** bữa được lưu trữ thành công và một kèo có hai hoá đơn của cùng một người ứng
- **THEN** `archivedTotalAmount` của kèo bằng tổng hai hoá đơn
- **AND** `archivedPayerSummary` có đúng một dòng gộp số tiền của người đó

#### Scenario: Kèo không có hoá đơn
- **WHEN** bữa được lưu trữ và một kèo không có hoá đơn nào
- **THEN** `archivedTotalAmount` của kèo đó bằng 0 và `archivedPayerSummary` là danh sách rỗng

### Requirement: Lưu trữ giữ lại bảng tổng kết toàn bữa
Hệ thống SHALL ghi vào `archivedSummary` của bữa tổng chi phí, tổng kết từng kèo gồm số hoá đơn từng có, tổng kết từng người hoặc nhóm thanh toán, và danh sách các khoản chuyển tiền. Mọi thực thể trong bảng tổng kết được ghi `isPaid` là đúng.

#### Scenario: Bảng tổng kết được ghi đầy đủ
- **WHEN** bữa được lưu trữ thành công
- **THEN** `archivedSummary.totalMealAmount` bằng tổng chi phí của bữa tại thời điểm lưu trữ
- **AND** `sessionsSummary` liệt kê các kèo theo thứ tự `orderIndex`, mỗi kèo có số hoá đơn từng có
- **AND** mọi phần tử của `entitiesSummary` có `isPaid` là đúng
- **AND** `transfers` giữ nguyên tên người chuyển, tên người nhận và số tiền của từng khoản

### Requirement: Lưu trữ xoá hoá đơn và file ảnh nhưng giữ lại món
Hệ thống SHALL xoá toàn bộ hoá đơn, toàn bộ bản ghi file ảnh và thư mục ảnh vật lý của bữa khi lưu trữ. Các món của bữa SHALL được giữ nguyên, không bị xoá.

#### Scenario: Xoá hoá đơn và ảnh, giữ món
- **GIVEN** một bữa có một hoá đơn, các file ảnh của hoá đơn đó và các món thuộc hoá đơn
- **WHEN** bữa được lưu trữ thành công
- **THEN** bữa không còn hoá đơn nào và không còn bản ghi file ảnh nào
- **AND** các món của bữa vẫn còn nguyên trong bộ nhớ

### Requirement: Lưu trữ chuyển trạng thái bữa một chiều với thời điểm lưu trữ
Hệ thống SHALL chuyển `status` của bữa từ `ACTIVE` sang `ARCHIVED`, ghi `archivedAt` và `updatedAt` bằng cùng thời điểm lưu trữ. Không có thao tác bỏ lưu trữ.

#### Scenario: Chuyển trạng thái khi lưu trữ thành công
- **WHEN** bữa được lưu trữ thành công lúc một thời điểm cho trước
- **THEN** `status` của bữa là `ARCHIVED`
- **AND** `archivedAt` và `updatedAt` đều bằng thời điểm đó

### Requirement: Lưu trữ là một giao dịch nguyên tử cho phần dữ liệu trong cơ sở dữ liệu
Hệ thống SHALL xoá file ảnh trước, sau đó ghi lại các kèo, hoá đơn, món và bữa trong một giao dịch duy nhất. Nếu giao dịch lỗi thì bữa vẫn `ACTIVE`, các kèo, hoá đơn và món không đổi.

#### Scenario: Giao dịch lỗi giữa chừng
- **GIVEN** bước ghi cơ sở dữ liệu của lưu trữ gặp lỗi
- **WHEN** lưu trữ được thực hiện
- **THEN** giao dịch được huỷ và bữa vẫn có `status` là `ACTIVE`
- **AND** hoá đơn, món và kèo của bữa không bị sửa trong cơ sở dữ liệu

#### Scenario: Lỗi khi xoá file ảnh
- **WHEN** việc xoá file ảnh trước giao dịch gặp lỗi
- **THEN** giao dịch không được thực hiện và bữa vẫn `ACTIVE`

### Requirement: Bữa đã lưu trữ là chỉ đọc ở mọi service ghi dữ liệu
Hệ thống SHALL từ chối mọi thao tác ghi vào bữa có `status` là `ARCHIVED`, gồm sửa thông tin bữa, người tham gia, nhóm thanh toán, người chủ trì, kèo, hoá đơn, món, file ảnh, chế độ quyết toán và tick "Đã chuyển". Lỗi trả về có mã `MEAL_ARCHIVED`.

#### Scenario: Thử sửa kèo của bữa đã lưu trữ
- **GIVEN** một bữa đã có `status` là `ARCHIVED`
- **WHEN** hệ thống nhận yêu cầu đổi tên kèo hoặc đổi người tham gia kèo của bữa đó
- **THEN** yêu cầu bị từ chối với mã `MEAL_ARCHIVED`
- **AND** tên kèo và người tham gia không đổi

#### Scenario: Thử tick thanh toán của bữa đã lưu trữ
- **GIVEN** một bữa đã có `status` là `ARCHIVED`
- **WHEN** hệ thống nhận yêu cầu tick hoặc bỏ tick "Đã chuyển" cho một khoản chuyển tiền
- **THEN** yêu cầu bị từ chối với mã `MEAL_ARCHIVED`

### Requirement: Giao diện bữa đã lưu trữ chỉ hiện nhãn trạng thái và khoá các thao tác sửa
Hệ thống SHALL hiển thị nhãn "Đã lưu trữ" có biểu tượng khoá thay cho nhãn "Đang hoạt động" ở đầu màn hình bữa. Hệ thống không hiện banner hay dòng chữ nào thông báo bữa đã khoá hoặc chỉ xem. Mọi điều khiển sửa đều bị ẩn hoặc hiển thị ở chế độ không sửa được.

#### Scenario: Mở bữa đã lưu trữ
- **GIVEN** một bữa đã có `status` là `ARCHIVED`
- **WHEN** người dùng mở màn hình chi tiết bữa đó
- **THEN** tiêu đề hiển thị nhãn "Đã lưu trữ" thay cho "Đang hoạt động"
- **AND** tên bữa không bấm được để sửa
- **AND** không có ô chọn người chủ trì có thể đổi và không có ô tìm để thêm người

#### Scenario: Các điều khiển sửa bị ẩn trong bữa đã lưu trữ
- **GIVEN** một bữa đã có `status` là `ARCHIVED`
- **WHEN** người dùng xem các bước "Người", "Hoá đơn" và "Chia tiền"
- **THEN** không có nút "Thêm kèo", không có nút bỏ người khỏi bữa và không có nút tạo nhóm thanh toán
- **AND** nút đổi chế độ quyết toán và các nút tick "Đã chuyển" ở trạng thái khoá

### Requirement: Kèo của bữa đã lưu trữ hiển thị tổng kết đã chốt
Hệ thống SHALL hiển thị mỗi kèo của bữa đã lưu trữ kèm dòng "Đã chốt N hoá đơn", N là số hoá đơn từng có trước khi xoá, cùng danh sách người đã ứng và tổng chi của kèo. Các món được giữ vẫn hiển thị trong kèo.

#### Scenario: Xem kèo đã chốt
- **GIVEN** một bữa đã lưu trữ có một kèo gồm hai hoá đơn và một người đã ứng tiền
- **WHEN** người dùng mở kèo đó ở bước "Hoá đơn"
- **THEN** kèo hiển thị "Đã chốt 2 hoá đơn"
- **AND** kèo hiển thị người đã ứng tiền và số tiền ứng, lấy từ `archivedPayerSummary`
- **AND** các món được giữ vẫn hiển thị trong kèo

#### Scenario: Bữa đã lưu trữ không có kèo nào
- **GIVEN** một bữa đã lưu trữ không có kèo nào
- **WHEN** người dùng mở bước "Hoá đơn"
- **THEN** hệ thống hiển thị "Bữa này không có kèo nào." và không có nút thêm kèo

### Requirement: Quyết toán của bữa đã lưu trữ là bảng đã chốt và không sửa được
Hệ thống SHALL hiển thị bảng quyết toán của bữa đã lưu trữ lấy từ `archivedSummary`, trong đó mọi khoản chuyển tiền được hiện là đã chuyển. Bảng này không có nút tick, nút đánh dấu tất cả, hay nút đổi chế độ quyết toán.

#### Scenario: Xem quyết toán đã chốt
- **GIVEN** một bữa đã lưu trữ có hai khoản chuyển tiền trong `archivedSummary`
- **WHEN** người dùng mở bước "Chia tiền"
- **THEN** hai khoản chuyển tiền hiển thị là đã chuyển
- **AND** không có nút tick hay nút đánh dấu tất cả

### Requirement: Bữa đã lưu trữ không có nút chia sẻ thanh toán
Hệ thống SHALL ẩn nút chia sẻ thông báo thanh toán trong bước "Chia tiền" của bữa đã lưu trữ. Nút "Lưu trữ bữa" cũng không hiển thị trong bữa đã lưu trữ.

#### Scenario: Mở bước Chia tiền của bữa đã lưu trữ
- **GIVEN** một bữa đã có `status` là `ARCHIVED`
- **WHEN** người dùng mở bước "Chia tiền"
- **THEN** không có nút "Chia sẻ thông báo thanh toán"
- **AND** không có nút "Lưu trữ bữa"

### Requirement: Bữa đã lưu trữ vẫn có thể xoá vĩnh viễn
Hệ thống SHALL cho phép xoá vĩnh viễn bữa đã lưu trữ bất cứ lúc nào, qua nút "Xoá bữa" ở màn hình chi tiết. Hộp thoại xoá nêu số món còn được giữ sẽ mất, và sau khi xoá, bữa, các kèo và các món của bữa bị xoá khỏi bộ nhớ. Danh bạ thành viên toàn cục không bị ảnh hưởng.

#### Scenario: Xoá bữa đã lưu trữ
- **GIVEN** một bữa đã có `status` là `ARCHIVED` với các kèo và món được giữ
- **WHEN** người dùng bấm "Xoá bữa" và xác nhận trong hộp thoại
- **THEN** bữa, các kèo và các món của bữa bị xoá khỏi bộ nhớ
- **AND** người dùng được đưa về danh sách bữa
- **AND** danh bạ thành viên vẫn còn nguyên

#### Scenario: Hộp thoại xoá nêu số món sẽ mất
- **GIVEN** một bữa đã lưu trữ có ba món được giữ
- **WHEN** người dùng bấm "Xoá bữa"
- **THEN** hộp thoại nêu "Xoá bữa này?" và liệt kê số món sẽ mất
