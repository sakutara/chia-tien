## MODIFIED Requirements

### Requirement: Chế độ chia tiền từng món và chia đều theo tổng
Hệ thống SHALL cho hoá đơn `ITEMIZED` chuyển qua lại giữa `BY_ITEM` và `EQUAL_TOTAL` bất cứ lúc nào. Việc chuyển chế độ không làm đổi tiền hàng, các khoản điều chỉnh hay danh sách món. Món chưa có người ăn ở chế độ `BY_ITEM` được gán toàn bộ người trong kèo, mỗi người một phần, khi hoá đơn được tạo, khi chuyển sang `BY_ITEM`, và khi hoá đơn được lưu.

**Trước đây**: Theo Epic 5 (BR-5.6 và R-6), món chưa có người ăn được để trống và hệ thống chỉ cảnh báo. Người dùng phải gán bằng tay, hoặc dùng thao tác một chạm không tự động. Tạo hoá đơn ở `BY_ITEM` không tự gán người ăn.

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

#### Scenario: Lưu hoá đơn ở chế độ chia từng món
- **WHEN** hoá đơn `BY_ITEM` được lưu lại và có món không còn người ăn
- **THEN** món đó được gán toàn bộ người trong kèo, mỗi người một phần
- **AND** món đã có người ăn giữ nguyên người ăn của mình
