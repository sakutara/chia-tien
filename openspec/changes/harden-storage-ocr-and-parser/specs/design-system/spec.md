## MODIFIED Requirements

### Requirement: Kiểu chữ và cột số tiền
Hệ thống SHALL dùng font Inter cho chữ thường và JetBrains Mono cho số tiền, và đóng gói cả hai font cùng ứng dụng qua `@fontsource/inter` và `@fontsource/jetbrains-mono`. Ứng dụng MUST NOT tải font từ Google Fonts hoặc từ máy chủ bên thứ ba khác. Mọi số tiền dùng class `money`, gồm font mono, căn phải và số dạng bảng (`tabular-nums`), để các số trong cùng một cột thẳng hàng. Class `money` có thể đổi sang căn trái khi một vị trí cần thế.

#### Scenario: Cột số tiền thẳng hàng
- **WHEN** nhiều số tiền được hiển thị liên tiếp trong một danh sách, ví dụ bảng quyết toán
- **THEN** mỗi số dùng font mono với chữ số cùng độ rộng
- **AND** các số được căn phải trong ô của chúng

#### Scenario: Font hiển thị khi offline
- **WHEN** người dùng mở ứng dụng khi thiết bị không có kết nối mạng
- **THEN** chữ thường hiển thị bằng Inter và số tiền hiển thị bằng JetBrains Mono

#### Scenario: Không tải font từ bên thứ ba
- **WHEN** ứng dụng được mở và tải đầy đủ
- **THEN** không có yêu cầu font nào được gửi tới Google Fonts hoặc máy chủ bên thứ ba khác
