## MODIFIED Requirements

### Requirement: Trang làm việc của bữa theo bước
Hệ thống SHALL hiển thị trang làm việc của bữa thành bốn bước theo thứ tự: 1 Bữa, 2 Người, 3 Hoá đơn, 4 Chia tiền, và mở sẵn bước 1. Riêng khi bữa vừa được tạo bằng luồng chụp bill tạo nhanh, trang mở sẵn bước 2 "Người" trong lần mở đó; tải lại trang thì mở bước 1. Bước Bữa chứa thông tin bữa sửa tại chỗ. Thanh đầu trang hiện nút quay lại, tên bữa, ngày, trạng thái và nút xoá. Từ 1024 px trở lên, trang có thêm cột tóm tắt bên phải gồm số người, số kèo, tổng chi và, khi bữa có chi phí, số khoản đã trả.

#### Scenario: Chuyển bước bằng tab
- **WHEN** người dùng bấm tab "2. Người"
- **THEN** nội dung bước Người hiện ra và tab đó được chọn

#### Scenario: Nút bước trước và bước sau
- **WHEN** người dùng đang ở bước 4 "Chia tiền"
- **THEN** nút "Bước sau" bị vô hiệu hoá
- **AND** bấm "Bước trước" thì chuyển về bước 3 "Hoá đơn"

#### Scenario: Mở bữa vừa tạo nhanh từ bill
- **WHEN** luồng chụp bill tạo nhanh kết thúc và mở trang làm việc của bữa mới
- **THEN** tab "2. Người" được chọn sẵn
