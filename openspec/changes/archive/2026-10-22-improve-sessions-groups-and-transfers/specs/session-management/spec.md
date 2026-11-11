## ADDED Requirements

### Requirement: Thêm hoá đơn nhanh trên kèo chưa có chi phí
Hệ thống SHALL hiển thị nút "Thêm hoá đơn nhanh" trên kèo chưa có hoá đơn nào và bữa chưa lưu trữ. Bấm nút mở form thêm hoá đơn của kèo đó. Nút bị vô hiệu hoá khi kèo chưa có người tham gia. Nút không hiển thị ở bữa đã lưu trữ.

#### Scenario: Kèo chưa có chi phí có nút thêm nhanh
- **GIVEN** kèo có ít nhất một người tham gia và chưa có hoá đơn nào
- **WHEN** người dùng xem kèo
- **THEN** kèo hiển thị nút "Thêm hoá đơn nhanh" bấm được
- **AND** bấm nút mở form thêm hoá đơn của kèo đó

#### Scenario: Kèo chưa có người tham gia
- **GIVEN** kèo chưa có người tham gia nào
- **WHEN** người dùng xem kèo
- **THEN** nút "Thêm hoá đơn nhanh" hiển thị nhưng bị vô hiệu hoá

#### Scenario: Kèo đã có chi phí
- **GIVEN** kèo đã có ít nhất một hoá đơn
- **WHEN** người dùng xem kèo
- **THEN** kèo không hiển thị nút "Thêm hoá đơn nhanh"
