## MODIFIED Requirements

### Requirement: Sửa thông tin bữa đang hoạt động
Hệ thống SHALL cho sửa tên, ngày và ghi chú của bữa `ACTIVE` ngay tại bước Bữa của trang làm việc, bằng cách bấm vào nội dung cần sửa (sửa tại chỗ qua `InlineText`). Trang làm việc không có nút "Sửa thông tin". Khi lưu, chỉ tên, ngày, ghi chú và thời điểm cập nhật thay đổi; chủ trì, người tham gia, nhóm thanh toán, kèo và hoá đơn giữ nguyên. Xoá trắng tên bữa thì tên được tự đặt theo ngày.

**Trước đây**: tài liệu `documentation/epic-3/BR.md` BR-3.9 ghi thanh đầu của trang làm việc có nút "Sửa thông tin" cùng nút "Quay lại" và "Xoá bữa". Tài liệu `documentation/03-ui-ux-and-design-system.md` mục 1 ghi sửa tại chỗ thay cho các nút "Đổi tên", "Chọn người", "Sửa thông tin".

#### Scenario: Sửa tên và thêm ghi chú
- **WHEN** người dùng bấm vào tên bữa, nhập "Tên mới" rồi nhấn Enter, sau đó bấm "Thêm ghi chú" và nhập nội dung
- **THEN** tiêu đề trang đổi thành "Tên mới" và bữa được lưu với tên và ghi chú mới
- **AND** các ngày ở mọi chế độ xem danh sách được cập nhật mà không cần tải lại trang

#### Scenario: Tên không hợp lệ giữ nguyên tên cũ
- **WHEN** người dùng nhập tên dài hơn 100 ký tự rồi nhấn Enter
- **THEN** thông báo lỗi hiện cạnh ô tên
- **AND** bữa vẫn giữ tên cũ

### Requirement: Chế độ xem Lịch
Hệ thống SHALL hiển thị lưới một tháng với tuần bắt đầu từ Thứ 2. Số hàng của lưới là số tuần cần để chứa đủ ngày của tháng, nên có thể là 4, 5 hoặc 6 hàng tuỳ tháng. Các ngày của tháng liền kề hiển thị mờ nhưng vẫn bấm được. Ngày hôm nay có dấu riêng, ngày đang chọn có nền riêng. Ô của ngày có bữa hiện tên và tổng tiền của tối đa hai bữa, từ bữa thứ ba trở đi hiện "+N bữa nữa"; dưới 640 px thì ô chỉ hiện chấm và số bữa. Khung bên dưới lưới liệt kê các bữa của ngày đang chọn, kể cả bữa đã lưu trữ có biểu tượng khoá.

**Trước đây**: tài liệu `documentation/epic-3/BR.md` R-12 ghi lưới đủ số tuần chạm tháng đang xem với "5 hoặc 6 hàng".

#### Scenario: Xem các bữa của một ngày
- **WHEN** người dùng bấm vào ngày 19/10/2026 có hai bữa
- **THEN** khung bên dưới liệt kê đúng hai bữa đó theo thứ tự chuẩn

#### Scenario: Ngày không có bữa
- **WHEN** người dùng chọn một ngày không có bữa nào
- **THEN** khung bên dưới hiện "Chưa có bữa nào vào ngày này." và nút tạo bữa cho ngày đó

#### Scenario: Tạo bữa cho ngày đang chọn
- **WHEN** người dùng bấm "Tạo bữa mới cho ngày này"
- **THEN** form tạo bữa mở với ngày đã điền là ngày đang chọn, và người dùng vẫn đổi được ngày đó

#### Scenario: Tháng có bốn hàng
- **WHEN** người dùng mở lịch tháng 2/2027, tháng bắt đầu vào Thứ 2 và có 28 ngày
- **THEN** lưới có đúng 4 hàng và không có hàng trống thêm

### Requirement: Điều hướng bằng đường dẫn hash
Hệ thống SHALL dùng đường dẫn hash để chuyển giữa danh sách bữa (`#/`) và trang làm việc của một bữa (`#/meal/<id>`). Mã bữa phải gồm 8 đến 64 ký tự thập lục phân hoặc dấu gạch ngang. Đường dẫn đúng định dạng nhưng bữa không tồn tại thì hiện thông báo "Không tìm thấy bữa này" kèm nút "Về danh sách bữa", không để trang trắng. Đường dẫn sai định dạng thì hiện danh sách bữa.

**Trước đây**: tài liệu `documentation/epic-3/SA.md` mục `useHashRoute` mô tả hàm này trả `{ name: 'notFound' }` cho đường dẫn không phân tích được. Hiện hàm trả `{ name: 'home' }` cho đường dẫn sai định dạng, và trang làm việc tự hiện "Không tìm thấy bữa này" cho mã đúng định dạng nhưng không có bữa tương ứng.

#### Scenario: Tải lại trang ở trang làm việc của bữa
- **WHEN** người dùng đang ở `#/meal/<id>` của một bữa có thật rồi tải lại trang
- **THEN** trang làm việc của đúng bữa đó vẫn hiện

#### Scenario: Bữa không tồn tại
- **WHEN** người dùng mở `#/meal/<id>` với mã chưa từng có hoặc đã bị xoá
- **THEN** trang hiện "Không tìm thấy bữa này" và nút "Về danh sách bữa"
- **AND** bấm nút đó thì quay về `#/`

#### Scenario: Đường dẫn sai định dạng
- **WHEN** người dùng mở `#/meal/abc`
- **THEN** ứng dụng hiện danh sách bữa

#### Scenario: Quay lại hoặc xoá từ trang làm việc
- **WHEN** người dùng bấm nút quay lại, hoặc xoá bữa đang mở
- **THEN** ứng dụng quay về danh sách bữa theo đường dẫn `#/`
