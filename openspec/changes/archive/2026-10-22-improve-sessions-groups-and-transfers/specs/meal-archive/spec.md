## MODIFIED Requirements

### Requirement: Mọi khoản chuyển tiền phải được tick đã chuyển trước khi lưu trữ
Hệ thống SHALL chỉ cho phép lưu trữ khi mọi khoản chuyển tiền trong quyết toán của bữa đã được tick "Đã chuyển". Nếu bữa không có khoản chuyển tiền nào thì không cần tick gì và vẫn được lưu trữ.

**Trước đây**: điều kiện được kiểm theo thực thể: mọi thực thể có số dư khác 0 phải có trạng thái "Đã thanh toán" (`settlementStatuses[entityId]`), lỗi `ARCHIVE_UNPAID_ENTITIES` kèm tên các thực thể chưa thanh toán.

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
