## MODIFIED Requirements

### Requirement: Lưu trữ xoá hoá đơn và file ảnh nhưng giữ lại món
Hệ thống SHALL xoá toàn bộ hoá đơn, toàn bộ bản ghi file ảnh và thư mục ảnh vật lý của bữa khi lưu trữ. Các món của bữa SHALL được giữ nguyên, không bị xoá, và tiếp tục hiển thị trong từng kèo của bữa đã lưu trữ.

**Trước đây**: theo thiết kế gốc (BR-7.3 và R-4 của Epic 7), lưu trữ xoá cả hoá đơn, chi tiết món (`items`) và file ảnh trong cùng một bước.

#### Scenario: Xoá hoá đơn và ảnh, giữ món
- **GIVEN** một bữa có một hoá đơn, các file ảnh của hoá đơn đó và các món thuộc hoá đơn
- **WHEN** bữa được lưu trữ thành công
- **THEN** bữa không còn hoá đơn nào và không còn bản ghi file ảnh nào
- **AND** các món của bữa vẫn còn nguyên trong bộ nhớ

### Requirement: Xác nhận trước khi lưu trữ và nêu rõ những gì sẽ mất
Hệ thống SHALL hiện hộp thoại xác nhận "Lưu trữ bữa?" trước khi lưu trữ. Hộp thoại nêu rõ việc lưu trữ không thể hoàn tác, số hoá đơn và số file ảnh sẽ bị xoá, tổng dung lượng sẽ được giải phóng, và nêu rằng chi phí từng kèo, các món và lịch sử quyết toán vẫn được giữ lại.

**Trước đây**: hộp thoại đếm thêm số chi tiết món sẽ bị xoá cùng hoá đơn và ảnh (BR-7.2, SA B.6 `ArchivePreview.itemCount`), và chỉ nêu giữ lại chi phí từng kèo và lịch sử quyết toán.

#### Scenario: Mở hộp thoại xác nhận
- **GIVEN** một bữa đủ điều kiện lưu trữ
- **WHEN** người dùng bấm nút "Lưu trữ bữa"
- **THEN** hộp thoại "Lưu trữ bữa?" hiển thị số hoá đơn, số file ảnh và dung lượng sẽ được giải phóng
- **AND** hộp thoại nêu rằng chi phí từng kèo, các món và lịch sử quyết toán được giữ lại
- **AND** nút "Huỷ" được đặt làm mục focus mặc định

#### Scenario: Huỷ hộp thoại
- **WHEN** người dùng bấm "Huỷ" trong hộp thoại xác nhận
- **THEN** hộp thoại đóng và bữa không thay đổi gì

### Requirement: Giao diện bữa đã lưu trữ chỉ hiện nhãn trạng thái và khoá các thao tác sửa
Hệ thống SHALL hiển thị nhãn "Đã lưu trữ" có biểu tượng khoá thay cho nhãn "Đang hoạt động" ở đầu màn hình bữa. Hệ thống không hiện banner hay dòng chữ nào thông báo bữa đã khoá hoặc chỉ xem. Mọi điều khiển sửa đều bị ẩn hoặc hiển thị ở chế độ không sửa được.

**Trước đây**: bữa đã lưu trữ hiện banner "Đã lưu trữ: ảnh và chi tiết món đã xoá, chỉ xem. Vẫn xoá được bữa." (BR-7.4 và UI §4.5).

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
Hệ thống SHALL hiển thị mỗi kèo của bữa đã lưu trữ kèm dòng "Đã chốt N hoá đơn", N là số hoá đơn từng có trước khi xoá, cùng danh sách người đã ứng và tổng chi của kèo. Các món được giữ vẫn hiển thị trong kèo, dưới tiêu đề "Món (N)" với N là số món được giữ.

**Trước đây**: thiết kế gốc không có món trong kèo của bữa đã lưu trữ, vì chi tiết món đã bị xoá. Kèo chỉ hiển thị số hoá đơn đã chốt, người đã ứng và tổng chi (R-6).

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

## ADDED Requirements

### Requirement: Bữa đã lưu trữ không có nút chia sẻ thanh toán
Hệ thống SHALL ẩn nút "Chia sẻ thông báo thanh toán" và link Snapshot đi kèm trong bước "Chia tiền" của bữa đã lưu trữ. Nút "Lưu trữ bữa" cũng không hiển thị trong bữa đã lưu trữ.

#### Scenario: Mở bước Chia tiền của bữa đã lưu trữ
- **GIVEN** một bữa đã có `status` là `ARCHIVED`
- **WHEN** người dùng mở bước "Chia tiền"
- **THEN** không có nút "Chia sẻ thông báo thanh toán"
- **AND** không có nút "Lưu trữ bữa"
