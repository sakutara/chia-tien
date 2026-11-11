## ADDED Requirements

### Requirement: Thứ tự món
Hệ thống SHALL cho đổi vị trí một món lên hoặc xuống trong danh sách của hoá đơn `ITEMIZED` bằng hai nút chuyển lên và chuyển xuống bên trái mỗi món. Thứ tự được lưu thành số thứ tự liên tục bắt đầu từ 0 trong trường `orderIndex`, và việc đổi thứ tự không làm thay đổi tiền hay người ăn của bất kỳ món nào.

#### Scenario: Chuyển món lên hoặc xuống
- **WHEN** người dùng bấm nút lên hoặc xuống của một món
- **THEN** món đó đổi chỗ với món liền kề, danh sách hiển thị thứ tự mới ngay và thứ tự mới được lưu
- **AND** tiền và người ăn của mọi món không đổi

#### Scenario: Nút ở đầu và cuối danh sách
- **WHEN** món là món đầu tiên hoặc món cuối cùng của hoá đơn
- **THEN** nút lên bị vô hiệu ở món đầu tiên, và nút xuống bị vô hiệu ở món cuối cùng

#### Scenario: Hoá đơn chỉ có một món
- **WHEN** hoá đơn `ITEMIZED` chỉ có một món
- **THEN** hệ thống không hiện nút chuyển lên hoặc xuống ở món đó

### Requirement: Hiển thị dòng món và số thứ tự
Hệ thống SHALL đánh số các món của hoá đơn `ITEMIZED` từ 1 theo vị trí hiện tại trong danh sách. Số thứ tự chỉ để hiển thị và người dùng không sửa được. Mỗi dòng món hiển thị theo dạng `đơn giá × số lượng = thành tiền`.

#### Scenario: Đánh số lại sau khi chuyển món
- **WHEN** một món được chuyển lên hoặc xuống
- **THEN** số thứ tự của mọi món được tính lại theo vị trí mới, bắt đầu từ 1

#### Scenario: Dạng hiển thị của dòng món
- **WHEN** dòng món được hiển thị với đơn giá 150.000 và số lượng 2
- **THEN** dòng hiển thị `150.000 ₫ × 2 = 300.000 ₫`

#### Scenario: Bữa đã lưu trữ
- **WHEN** bữa của hoá đơn ở trạng thái `ARCHIVED`
- **THEN** số thứ tự của các món vẫn hiển thị, nhưng không có nút chuyển lên hoặc xuống nào
