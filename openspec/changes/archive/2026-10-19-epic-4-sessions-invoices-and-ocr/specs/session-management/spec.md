## ADDED Requirements

### Requirement: Thêm Kèo vào Bữa đang hoạt động
Hệ thống SHALL cho phép thêm Kèo vào Bữa có trạng thái `ACTIVE`, và Kèo mới SHALL nằm ở cuối danh sách Kèo của Bữa. (BR-4.1)

#### Scenario: Thêm Kèo khi để trống tên (AC-5)
- **WHEN** người dùng thêm Kèo trong Bữa `ACTIVE` và để trống ô tên
- **THEN** Kèo mới có tên `Kèo <n>`, với n là số thứ tự kế tiếp, và xuất hiện ở cuối danh sách

#### Scenario: Thêm Kèo có tên riêng
- **WHEN** người dùng thêm Kèo và nhập một tên
- **THEN** Kèo mới có đúng tên đó, sau khi đã chuẩn hoá theo quy tắc tên Kèo

### Requirement: Chuẩn hoá và giới hạn tên Kèo
Hệ thống SHALL bỏ khoảng trắng đầu và cuối của tên Kèo, gộp các khoảng trắng liên tiếp, và giới hạn tên Kèo tối đa 80 ký tự. Trùng tên giữa các Kèo SHALL được phép. Tên quán SHALL giới hạn tối đa 100 ký tự và là tuỳ chọn. (R-2)

#### Scenario: Tên Kèo quá dài bị cắt
- **WHEN** người dùng nhập tên Kèo dài hơn 80 ký tự
- **THEN** tên được lưu với tối đa 80 ký tự

#### Scenario: Hai Kèo trùng tên
- **WHEN** người dùng đặt cho một Kèo tên đã có ở Kèo khác trong cùng Bữa
- **THEN** hệ thống chấp nhận và lưu cả hai Kèo

### Requirement: Đổi tên Kèo bằng tay
Hệ thống SHALL cho phép đổi tên Kèo bất cứ lúc nào khi Bữa đang hoạt động. (BR-4.2)

#### Scenario: Đổi tên Kèo đã có tên riêng
- **WHEN** người dùng đổi tên một Kèo đã có tên riêng
- **THEN** Kèo mang tên mới và các hoá đơn của Kèo không thay đổi

### Requirement: Sắp xếp thứ tự Kèo
Hệ thống SHALL cho phép đưa Kèo lên hoặc xuống trong danh sách. Thứ tự Kèo SHALL là `orderIndex` liên tục từ 0, và việc đổi chỗ SHALL hoán đổi hai `orderIndex`. (BR-4.2, R-3)

#### Scenario: Đưa Kèo xuống một vị trí
- **WHEN** người dùng chuyển một Kèo xuống dưới Kèo kế tiếp
- **THEN** hai Kèo đổi `orderIndex` cho nhau và `orderIndex` của cả bữa vẫn liên tục từ 0

#### Scenario: Xoá Kèo rồi đánh số lại
- **WHEN** một Kèo bị xoá khỏi giữa danh sách
- **THEN** các Kèo còn lại được đánh số lại liên tục từ 0

### Requirement: Xoá Kèo kèm xác nhận
Hệ thống SHALL xoá Kèo cùng toàn bộ hoá đơn, món và file vật lý của Kèo đó, và SHALL hiện hộp xác nhận nêu số hoá đơn, số món và số file sẽ mất trước khi xoá. (BR-4.2, R-15)

#### Scenario: Xoá Kèo có hoá đơn (AC-5)
- **WHEN** người dùng xoá một Kèo đang có hoá đơn và xác nhận trong hộp xác nhận
- **THEN** hệ thống xoá các file vật lý trước, sau đó xoá trong cơ sở dữ liệu các món, hoá đơn và Kèo, rồi đánh số lại `orderIndex` của các Kèo còn lại

### Requirement: Người tham gia Kèo mặc định là cả Bữa
Hệ thống SHALL gán cho Kèo mới danh sách người tham gia bằng toàn bộ người đang có trong Bữa lúc tạo, và `participantIds` của Kèo SHALL là tập con của `Meal.participantIds`. Người được thêm vào Bữa sau đó SHALL NOT tự vào các Kèo đã có, muốn vào Kèo phải được tick thủ công. Không ai ngoài Bữa được vào Kèo. (BR-4.3, R-4, AC-1)

#### Scenario: Kèo mới lấy đủ người trong Bữa (AC-1)
- **WHEN** người dùng thêm Kèo vào một Bữa có năm người
- **THEN** Kèo có đủ năm người tham gia

#### Scenario: Người thêm vào Bữa sau không tự vào Kèo cũ (AC-1)
- **WHEN** một người mới được thêm vào Bữa sau khi Kèo đã được tạo
- **THEN** người đó không xuất hiện trong danh sách tham gia của Kèo cũ cho tới khi được tick thủ công

### Requirement: Chọn bớt hoặc thêm lại người tham gia Kèo
Hệ thống SHALL cho phép bỏ bớt hoặc thêm lại người tham gia Kèo, chỉ trong số người của Bữa, và SHALL hiển thị số lượng theo dạng `Người tham gia kèo (k/n)`. (BR-4.3, R-4)

#### Scenario: Bỏ bớt một người khỏi Kèo chưa có hoá đơn
- **WHEN** người dùng bỏ một người khỏi Kèo chưa có hoá đơn
- **THEN** người đó không còn trong Kèo và số hiển thị giảm đi một

#### Scenario: Chọn người không thuộc Bữa
- **WHEN** hệ thống nhận danh sách người tham gia có một người không thuộc Bữa
- **THEN** thao tác bị từ chối với lỗi `SESSION_MEMBER_NOT_IN_MEAL`

### Requirement: Không bỏ người đang được dùng khỏi Kèo
Kèo đã có hoá đơn SHALL có danh sách người tham gia không rỗng, và SHALL NOT bỏ khỏi Kèo người đang là người ứng hoặc người chia đều của một hoá đơn trong Kèo. Người bị bỏ khỏi Kèo mà không phải người ứng của hoá đơn nào SHALL được tự gỡ khỏi danh sách chia đều của các hoá đơn trong Kèo, và nếu danh sách chia đều thành rỗng thì thao tác bị từ chối. (BR-4.3, R-5, R-6, R-16)

#### Scenario: Bỏ người đang là người ứng của một hoá đơn
- **WHEN** người dùng cố bỏ người đang là người ứng của một hoá đơn trong Kèo
- **THEN** thao tác bị chặn với lỗi `SESSION_MEMBER_IN_USE`

#### Scenario: Bỏ hết người khỏi Kèo có hoá đơn
- **WHEN** người dùng bỏ toàn bộ người tham gia của một Kèo đã có hoá đơn
- **THEN** thao tác bị từ chối và Kèo giữ nguyên danh sách người tham gia

### Requirement: Tự đặt tên Kèo theo quán
Khi lưu một hoá đơn có tên quán lấy từ OCR và tên Kèo vẫn là tên tự đặt dạng `Kèo <n>`, hệ thống SHALL đổi tên Kèo thành `Kèo <tên quán>` trong cùng giao dịch lưu, cắt tối đa 80 ký tự, và SHALL hiện thông báo "Đã đổi tên kèo thành …". Kèo đã có tên riêng SHALL NOT bị đổi. Người dùng SHALL có thể đổi lại tên bằng tay bất cứ lúc nào. (BR-4.10)

#### Scenario: Kèo tên mặc định đổi theo quán lần đầu (AC-14)
- **WHEN** người dùng lưu một hoá đơn có tên quán từ OCR khi tên Kèo là `Kèo 2`
- **THEN** tên Kèo đổi thành `Kèo <tên quán>` và hiện thông báo đã đổi tên

#### Scenario: Kèo đã có tên riêng không bị đổi (AC-14)
- **WHEN** người dùng lưu một hoá đơn có tên quán từ OCR khi Kèo đã có tên riêng
- **THEN** tên Kèo không đổi

#### Scenario: Tên quán quá dài bị cắt đúng giới hạn (AC-14)
- **WHEN** tên quán từ OCR làm tên Kèo mới vượt 80 ký tự
- **THEN** tên Kèo được cắt còn tối đa 80 ký tự

### Requirement: Hiển thị Kèo thu gọn và mở rộng
Hệ thống SHALL cho phép thu gọn và mở rộng từng Kèo. Kèo vừa thêm SHALL mặc định được mở, và các Kèo khác SHALL được thu gọn khi Bữa có từ bốn Kèo trở lên. Tiền SHALL hiển thị theo `formatMoney` với các chữ số thẳng cột. (R-17)

#### Scenario: Bữa có bốn Kèo trở lên
- **WHEN** người dùng thêm Kèo thứ tư vào một Bữa
- **THEN** Kèo vừa thêm được mở và ba Kèo trước đó được thu gọn

### Requirement: Khu vực Kèo ở chế độ chỉ đọc cho Bữa đã lưu trữ
Khi Bữa có trạng thái `ARCHIVED`, Khu vực Kèo SHALL hiển thị ở chế độ chỉ đọc và SHALL khoá mọi thao tác thêm, sửa và xoá Kèo, hoá đơn, ảnh và người tham gia. Epic 4 chỉ bảo đảm giao diện không cho sửa, còn dọn dữ liệu của Bữa lưu trữ thuộc Epic 7. Mọi service ghi SHALL từ chối Bữa `ARCHIVED` bằng mã lỗi `MEAL_ARCHIVED`. (BR-4.12, AC-9)

#### Scenario: Mở Bữa đã lưu trữ (AC-9)
- **WHEN** người dùng mở một Bữa có trạng thái `ARCHIVED`
- **THEN** không còn nút thêm, sửa hoặc xoá Kèo, hoá đơn, ảnh và người tham gia

### Requirement: Xác nhận trước khi phá huỷ dữ liệu
Các hành động phá huỷ, gồm xoá Kèo, xoá hoá đơn, xoá ảnh và bỏ người khỏi Kèo khi đang được dùng, SHALL dùng `ConfirmDialog` của app, với nút Huỷ là nút mặc định. (BR-4.13)

#### Scenario: Huỷ hộp xác nhận xoá Kèo
- **WHEN** người dùng mở hộp xác nhận xoá Kèo và nhấn Huỷ hoặc phím Esc
- **THEN** Kèo và dữ liệu con của Kèo được giữ nguyên

### Requirement: Giữ nguyên hành vi của Epic 1 đến Epic 3
Các chức năng của Epic 1 đến Epic 3 SHALL tiếp tục đạt sau khi bổ sung Khu vực Kèo. (AC-12)

#### Scenario: Chạy lại bộ test của Epic 1 đến Epic 3 (AC-12)
- **WHEN** bộ test tự động của dự án được chạy sau khi hoàn thành Epic 4
- **THEN** các test của Epic 1 đến Epic 3 đều đạt
