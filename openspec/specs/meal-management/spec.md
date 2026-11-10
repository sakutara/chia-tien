# meal-management Specification

## Purpose
Capability này quản lý Bữa, tầng đầu tiên trong chuỗi Bữa, Kèo, Món của ứng dụng chia tiền nhóm. Chủ app tạo bữa, sửa tên, ngày và ghi chú, xoá bữa cùng toàn bộ dữ liệu con, rồi tìm lại bữa qua ba chế độ xem: Lịch, Danh sách và Theo loại. Capability này cũng điều hướng giữa danh sách bữa và trang làm việc của từng bữa gồm các bước Bữa, Người, Hoá đơn và Chia tiền, kèm cử chỉ vuốt để đổi bước. Việc lưu trữ bữa thuộc capability `meal-archive`; kèo, hoá đơn và quyết toán thuộc các capability riêng.

## Requirements

### Requirement: Tạo bữa mới
Hệ thống SHALL tạo một bữa mới ở trạng thái `ACTIVE` khi người dùng gửi form tạo bữa hợp lệ. Bữa mới có chủ trì là "Tôi", người tham gia duy nhất là "Tôi", kiểu thanh toán `SELF_SETTLEMENT`, chưa có nhóm thanh toán và chưa có trạng thái thanh toán nào. Thời điểm tạo và thời điểm cập nhật của bữa mới bằng nhau.

#### Scenario: Tạo bữa và mở ngay trang làm việc
- **WHEN** người dùng nhập tên "Đi ăn tối", chọn ngày và bấm "Tạo bữa"
- **THEN** bữa được lưu với tên đã chuẩn hoá và trạng thái `ACTIVE`
- **AND** ứng dụng chuyển sang trang làm việc của bữa đó theo đường dẫn `#/meal/<id>`

#### Scenario: Để trống tên thì tự đặt theo ngày
- **WHEN** người dùng tạo bữa với tên để trống và ngày 05/03/2026
- **THEN** tên bữa được đặt là "Bữa 05/03/2026"

#### Scenario: Ghi chú chỉ có khoảng trắng không được lưu
- **WHEN** người dùng tạo bữa với ghi chú chỉ gồm khoảng trắng
- **THEN** bữa được lưu mà không có trường ghi chú

### Requirement: Kiểm tra tên, ghi chú và ngày bữa
Hệ thống SHALL kiểm tra dữ liệu bữa trước khi ghi, cho cả tạo mới lẫn sửa. Tên bữa bỏ ký tự điều khiển, gộp khoảng trắng liên tiếp, cắt khoảng trắng đầu cuối, giữ nguyên chữ hoa và chữ thường, và tối đa 100 ký tự. Ghi chú cắt khoảng trắng đầu cuối và tối đa 500 ký tự. Ngày bữa phải là ngày có thật theo dạng `YYYY-MM-DD`, nằm trong khoảng từ `2000-01-01` đến `2099-12-31`, và được chấp nhận cả ngày tương lai. Ngày mặc định của bữa mới là hôm nay theo giờ địa phương của thiết bị, không theo UTC.

#### Scenario: Ngày không có thật hoặc ngoài khoảng bị từ chối
- **WHEN** người dùng nhập ngày `2026-02-30`, hoặc một ngày trước 01/01/2000 hoặc sau 31/12/2099
- **THEN** ô ngày hiện thông báo "Ngày không hợp lệ" ngay bên dưới
- **AND** không có bữa nào được ghi

#### Scenario: Tên hoặc ghi chú quá dài
- **WHEN** người dùng nhập tên dài 101 ký tự hoặc ghi chú dài 501 ký tự rồi lưu
- **THEN** thông báo lỗi hiện ngay bên dưới ô tương ứng
- **AND** bữa không bị tạo mới hoặc sửa

#### Scenario: Ngày mặc định theo giờ địa phương
- **WHEN** người dùng mở form tạo bữa lúc 00:30 ngày 19/10/2026 giờ địa phương
- **THEN** ô ngày được điền sẵn là `2026-10-19`

### Requirement: Sửa thông tin bữa đang hoạt động
Hệ thống SHALL cho sửa tên, ngày và ghi chú của bữa `ACTIVE` ngay tại bước Bữa của trang làm việc. Khi lưu, chỉ tên, ngày, ghi chú và thời điểm cập nhật thay đổi; chủ trì, người tham gia, nhóm thanh toán, kèo và hoá đơn giữ nguyên. Xoá trắng tên bữa thì tên được tự đặt theo ngày.

#### Scenario: Sửa tên và thêm ghi chú
- **WHEN** người dùng bấm vào tên bữa, nhập "Tên mới" rồi nhấn Enter, sau đó bấm "Thêm ghi chú" và nhập nội dung
- **THEN** tiêu đề trang đổi thành "Tên mới" và bữa được lưu với tên và ghi chú mới
- **AND** các ngày ở mọi chế độ xem danh sách được cập nhật mà không cần tải lại trang

#### Scenario: Tên không hợp lệ giữ nguyên tên cũ
- **WHEN** người dùng nhập tên dài hơn 100 ký tự rồi nhấn Enter
- **THEN** thông báo lỗi hiện cạnh ô tên
- **AND** bữa vẫn giữ tên cũ

### Requirement: Bữa đã lưu trữ chỉ đọc
Hệ thống SHALL hiển thị bữa `ARCHIVED` với huy hiệu khoá "Đã lưu trữ" và không cho sửa tên, ngày, ghi chú, chủ trì hay người tham gia của bữa đó. Bữa đã lưu trữ vẫn được mở để xem và vẫn có thể xoá. Thao tác đưa một bữa vào trạng thái lưu trữ thuộc capability `meal-archive`.

#### Scenario: Mở bữa đã lưu trữ
- **WHEN** người dùng mở trang làm việc của một bữa có trạng thái `ARCHIVED`
- **THEN** tên bữa không bấm để sửa được và không có ô chọn chủ trì
- **AND** ở bước Người không có ô thêm người và không có nút bỏ người khỏi bữa
- **AND** nút xoá bữa vẫn hiện

#### Scenario: Yêu cầu sửa bữa đã lưu trữ bị từ chối
- **WHEN** một yêu cầu sửa thông tin được gửi cho bữa có trạng thái `ARCHIVED`
- **THEN** yêu cầu thất bại với mã `MEAL_ARCHIVED`
- **AND** dữ liệu của bữa không thay đổi

### Requirement: Xoá bữa phải qua xác nhận
Hệ thống SHALL yêu cầu xác nhận trước khi xoá bữa, với cả bữa đang hoạt động lẫn bữa đã lưu trữ. Hộp xác nhận nêu tên bữa, ngày, và số kèo, hoá đơn, món, file ảnh sẽ mất; loại nào có số lượng bằng 0 thì không được nêu. Nút Huỷ là nút được focus mặc định, và việc xoá không hoàn tác được.

#### Scenario: Huỷ thì không xoá gì
- **WHEN** người dùng bấm Xoá bữa rồi bấm Huỷ trong hộp xác nhận
- **THEN** bữa và toàn bộ dữ liệu con vẫn còn nguyên

#### Scenario: Xác nhận xoá
- **WHEN** người dùng bấm "Xoá bữa" trong hộp xác nhận
- **THEN** bữa biến mất khỏi mọi chế độ xem danh sách

#### Scenario: Bữa chưa có dữ liệu con
- **WHEN** người dùng mở hộp xác nhận xoá một bữa chưa có kèo, hoá đơn, món hay file nào
- **THEN** hộp chỉ nêu tên bữa và ngày, không có dòng "Sẽ mất kèm theo"

### Requirement: Xoá sạch dữ liệu con của bữa
Hệ thống SHALL khi xoá bữa, xoá toàn bộ kèo, hoá đơn, món, bản ghi file hoá đơn và file ảnh vật lý thuộc bữa đó, không để lại bản ghi mồ côi. Dữ liệu của các bữa khác và danh bạ thành viên không bị ảnh hưởng.

#### Scenario: Xoá bữa có đầy đủ dữ liệu con
- **WHEN** người dùng xác nhận xoá một bữa có kèo, hoá đơn, món và file ảnh
- **THEN** mọi bản ghi và file thuộc bữa đó bị xoá
- **AND** các bữa khác và danh bạ thành viên giữ nguyên

#### Scenario: Xoá file lỗi thì bữa còn nguyên
- **WHEN** việc xoá file ảnh của bữa gặp lỗi
- **THEN** bữa và dữ liệu con trong cơ sở dữ liệu vẫn còn nguyên
- **AND** người dùng có thể thử xoá lại

#### Scenario: Bữa không tồn tại
- **WHEN** yêu cầu xoá hoặc xem trước dữ liệu xoá được gửi cho mã bữa không tồn tại
- **THEN** yêu cầu thất bại với mã `MEAL_NOT_FOUND`

### Requirement: Ba chế độ xem trên cùng một tập dữ liệu
Hệ thống SHALL cung cấp ba chế độ xem danh sách bữa: Lịch (`CALENDAR`), Danh sách (`LIST`) và Theo loại (`STATUS`), chuyển bằng thanh ba nút ở đầu trang cùng nút "Tạo bữa mới". Ba chế độ dùng chung một nguồn tóm tắt bữa nên luôn cùng số bữa, tên, ngày và tổng tiền.

#### Scenario: Đổi chế độ bằng bàn phím
- **WHEN** một nút chế độ đang có tiêu điểm và người dùng bấm mũi tên phải hoặc trái
- **THEN** chế độ kế tiếp hoặc trước đó được chọn và nhận tiêu điểm
- **AND** chuyển qua mép thì quay vòng về chế độ ở đầu kia

#### Scenario: Thay đổi ở chế độ này hiện ngay ở chế độ kia
- **WHEN** người dùng tạo bữa hoặc đổi tên bữa khi đang ở chế độ Danh sách
- **THEN** khi chuyển sang chế độ Theo loại, bữa đó đã hiện với tên và số liệu mới

### Requirement: Thứ tự danh sách bữa
Hệ thống SHALL xếp mọi bữa theo ngày giảm dần, bữa mới nhất đứng trước. Hai bữa cùng ngày thì bữa được tạo sau đứng trước. Thứ tự này áp dụng cho chế độ Danh sách, cho từng tab của chế độ Theo loại và cho khung các bữa trong ngày của chế độ Lịch.

#### Scenario: Hai bữa cùng ngày
- **WHEN** hai bữa cùng ngày 19/10/2026, một tạo lúc 09:00 và một tạo lúc 20:00
- **THEN** bữa tạo lúc 20:00 đứng trước

#### Scenario: Hai bữa khác ngày
- **WHEN** một bữa ngày 19/10/2026 và một bữa ngày 10/01/2026
- **THEN** bữa ngày 19/10/2026 đứng trước

### Requirement: Chế độ xem Lịch
Hệ thống SHALL hiển thị lưới một tháng với tuần bắt đầu từ Thứ 2, số hàng từ 4 đến 6 tuỳ tháng để chứa đủ ngày của tháng. Các ngày của tháng liền kề hiển thị mờ nhưng vẫn bấm được. Ngày hôm nay có dấu riêng, ngày đang chọn có nền riêng. Ô của ngày có bữa hiện tên và tổng tiền của tối đa hai bữa, từ bữa thứ ba trở đi hiện "+N bữa nữa"; dưới 640 px thì ô chỉ hiện chấm và số bữa. Khung bên dưới lưới liệt kê các bữa của ngày đang chọn, kể cả bữa đã lưu trữ có biểu tượng khoá.

#### Scenario: Xem các bữa của một ngày
- **WHEN** người dùng bấm vào ngày 19/10/2026 có hai bữa
- **THEN** khung bên dưới liệt kê đúng hai bữa đó theo thứ tự chuẩn

#### Scenario: Ngày không có bữa
- **WHEN** người dùng chọn một ngày không có bữa nào
- **THEN** khung bên dưới hiện "Chưa có bữa nào vào ngày này." và nút tạo bữa cho ngày đó

#### Scenario: Tạo bữa cho ngày đang chọn
- **WHEN** người dùng bấm "Tạo bữa mới cho ngày này"
- **THEN** form tạo bữa mở với ngày đã điền là ngày đang chọn, và người dùng vẫn đổi được ngày đó

### Requirement: Điều hướng lịch
Hệ thống SHALL cho đổi tháng bằng nút tháng trước và tháng sau, bằng ô chọn tháng và năm (năm từ 2000 đến 2099), và nút "Hôm nay" đưa lịch về tháng hiện tại với ngày hôm nay được chọn. Nút tháng trước bị khoá ở tháng 1/2000 và nút tháng sau bị khoá ở tháng 12/2099. Khi đổi tháng, ngày đang chọn được giữ nếu vẫn nằm trong lưới mới, nếu không thì ngày 1 của tháng mới được chọn.

#### Scenario: Đổi tháng giữ ngày đang chọn
- **WHEN** người dùng chọn ngày 19/10/2026 rồi bấm tháng sau
- **THEN** lưới chuyển sang tháng 11/2026
- **AND** vì ngày 19/10/2026 không nằm trong lưới mới, ngày 01/11/2026 được chọn

#### Scenario: Đổi tháng giữ ngày nằm trong lưới mới
- **WHEN** ngày đang chọn vẫn hiện trong lưới của tháng mới sau khi đổi tháng
- **THEN** ngày đó vẫn là ngày được chọn

#### Scenario: Di chuyển ngày bằng phím mũi tên
- **WHEN** một ô ngày đang có tiêu điểm và người dùng bấm mũi tên phải
- **THEN** ngày được chọn tăng thêm một ngày
- **AND** mũi tên lên hoặc xuống thì đổi ngày chọn đi 7 ngày

### Requirement: Chế độ xem Danh sách
Hệ thống SHALL hiển thị mỗi bữa thành một thẻ gồm ngày, tên bữa, huy hiệu khoá nếu bữa đã lưu trữ, số kèo, số người, tổng chi, tiến độ thanh toán khi có chi phí, nút Mở và nút Xoá. Bấm tên bữa thì mở trang làm việc của bữa đó. Khi chưa có bữa nào, chế độ Danh sách hiện lời giới thiệu và nút lớn "Tạo bữa đầu tiên" thay cho danh sách trống.

#### Scenario: Lần đầu mở ứng dụng
- **WHEN** chưa có bữa nào trong ứng dụng
- **THEN** màn hình hiện lời giới thiệu ngắn và nút "Tạo bữa đầu tiên"
- **AND** không hiện danh sách trống

#### Scenario: Bấm tên bữa trên thẻ
- **WHEN** người dùng bấm tên bữa trên một thẻ
- **THEN** ứng dụng mở trang làm việc của bữa đó theo đường dẫn `#/meal/<id>`

### Requirement: Chế độ xem Theo loại
Hệ thống SHALL chia bữa thành hai tab "Đang hoạt động (n)" và "Đã lưu trữ (n)", với n là số bữa của tab, và chọn sẵn tab đầu tiên khi mở. Mỗi tab chỉ liệt kê bữa thuộc trạng thái của tab đó, theo thứ tự chung của ứng dụng. Mũi tên trái và phải chuyển giữa hai tab. Tab trống hiện một câu giải thích; tab "Đã lưu trữ" trống nêu rằng bữa chỉ lưu trữ được khi mọi khoản thanh toán đã hoàn tất.

#### Scenario: Đếm và tách hai tab
- **WHEN** có hai bữa đang hoạt động và một bữa đã lưu trữ
- **THEN** hai tab hiện "Đang hoạt động (2)" và "Đã lưu trữ (1)"
- **AND** tab đầu tiên hiện hai bữa đang hoạt động

#### Scenario: Tab Đã lưu trữ trống
- **WHEN** người dùng mở tab "Đã lưu trữ" khi không có bữa nào được lưu trữ
- **THEN** tab hiện câu giải thích về điều kiện lưu trữ bữa

### Requirement: Tổng chi và tiến độ thanh toán trên thẻ bữa
Hệ thống SHALL tính tổng chi của bữa đang hoạt động bằng tổng tiền các hoá đơn của bữa đó. Bữa chưa có hoá đơn hiện "Chưa có chi phí" chứ không hiện số 0. Với bữa đã lưu trữ, tổng chi lấy từ bản tóm tắt lưu trữ của bữa; thiếu bản tóm tắt thì coi như chưa có chi phí. Tiến độ thanh toán chỉ hiện khi bữa có chi phí, và đếm theo số khoản chuyển tiền do quyết toán tính (xem capability `settlement`), không đếm theo số người.

#### Scenario: Bữa có hoá đơn
- **WHEN** bữa có hai hoá đơn tổng 1.620.000 đồng và 830.000 đồng
- **THEN** thẻ hiện tổng chi "2.450.000 ₫"
- **AND** thẻ hiện tiến độ dạng "đã trả trên tổng" của các khoản chuyển tiền

#### Scenario: Bữa chưa có hoá đơn
- **WHEN** bữa đang hoạt động chưa có hoá đơn nào
- **THEN** thẻ hiện "Chưa có chi phí" và không hiện tiến độ thanh toán
- **AND** cột tóm tắt ở trang làm việc hiện "—" thay cho tổng chi

#### Scenario: Bữa đã lưu trữ thiếu bản tóm tắt
- **WHEN** bữa có trạng thái `ARCHIVED` nhưng không có bản tóm tắt lưu trữ
- **THEN** thẻ hiện "Chưa có chi phí"

### Requirement: Ghi nhớ chế độ xem trên thiết bị
Hệ thống SHALL ghi nhớ chế độ xem đang chọn (`CALENDAR`, `LIST` hoặc `STATUS`) trên thiết bị và mở lại đúng chế độ đó ở lần sau. Mặc định là `LIST`. Giá trị đã lưu không hợp lệ hoặc chưa có thì dùng `LIST`. Nếu trình duyệt chặn bộ nhớ cục bộ, ứng dụng vẫn đổi chế độ được trong phiên hiện tại nhưng không ghi nhớ.

#### Scenario: Mở lại sau khi tải lại trang
- **WHEN** người dùng chọn chế độ Theo loại rồi tải lại trang
- **THEN** ứng dụng mở ở chế độ Theo loại

#### Scenario: Giá trị lạ hoặc chưa có
- **WHEN** chưa có chế độ nào được lưu, hoặc giá trị đã lưu không nằm trong ba chế độ
- **THEN** ứng dụng mở ở chế độ Danh sách

#### Scenario: Bộ nhớ cục bộ bị chặn
- **WHEN** trình duyệt chặn đọc hoặc ghi bộ nhớ cục bộ
- **THEN** ứng dụng vẫn mở ở chế độ Danh sách và người dùng vẫn đổi được chế độ trong phiên

### Requirement: Điều hướng bằng đường dẫn hash
Hệ thống SHALL dùng đường dẫn hash để chuyển giữa danh sách bữa (`#/`) và trang làm việc của một bữa (`#/meal/<id>`). Mã bữa phải gồm 8 đến 64 ký tự thập lục phân hoặc dấu gạch ngang. Đường dẫn đúng định dạng nhưng bữa không tồn tại thì hiện thông báo "Không tìm thấy bữa này" kèm nút "Về danh sách bữa", không để trang trắng. Đường dẫn sai định dạng thì hiện danh sách bữa.

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

### Requirement: Trang làm việc của bữa theo bước
Hệ thống SHALL hiển thị trang làm việc của bữa thành bốn bước theo thứ tự: 1 Bữa, 2 Người, 3 Hoá đơn, 4 Chia tiền, và mở sẵn bước 1. Bước Bữa chứa thông tin bữa sửa tại chỗ. Thanh đầu trang hiện nút quay lại, tên bữa, ngày, trạng thái và nút xoá. Từ 1024 px trở lên, trang có thêm cột tóm tắt bên phải gồm số người, số kèo, tổng chi và số khoản đã trả.

#### Scenario: Chuyển bước bằng tab
- **WHEN** người dùng bấm tab "2. Người"
- **THEN** nội dung bước Người hiện ra và tab đó được chọn

#### Scenario: Nút bước trước và bước sau
- **WHEN** người dùng đang ở bước 4 "Chia tiền"
- **THEN** nút "Bước sau" bị vô hiệu hoá
- **AND** bấm "Bước trước" thì chuyển về bước 3 "Hoá đơn"

### Requirement: Vuốt ngang để đổi bước
Hệ thống SHALL cho đổi bước bằng cử chỉ vuốt ngang trên trang làm việc của bữa: vuốt sang trái chuyển sang bước sau, vuốt sang phải chuyển sang bước trước. Cử chỉ chỉ được tính khi đủ dài và chủ yếu nằm ngang, và không vòng lại ở bước đầu hay bước cuối.

#### Scenario: Vuốt sang trái ở vùng trống
- **WHEN** người dùng vuốt ngang sang trái 100 px ở vùng không cuộn ngang trên trang làm việc
- **THEN** ứng dụng chuyển sang bước sau

#### Scenario: Vuốt không đủ dài hoặc chủ yếu là dọc
- **WHEN** người dùng vuốt dưới 60 px, hoặc vuốt có chiều ngang nhỏ hơn 1,5 lần chiều dọc
- **THEN** bước không đổi

#### Scenario: Đang ở bước cuối
- **WHEN** người dùng đang ở bước 4 và vuốt sang trái
- **THEN** bước không đổi và không quay về bước 1

#### Scenario: Vuốt trong slide còn chỗ cuộn
- **WHEN** người dùng vuốt sang trái trong slide hoặc dãy chip còn nội dung bên phải
- **THEN** vùng đó được cuộn và bước không đổi
- **AND** chỉ khi đã tới mép mới vuốt tiếp để đổi bước

#### Scenario: Vuốt trong hộp thoại hoặc ô nhập liệu
- **WHEN** cử chỉ vuốt bắt đầu trong một hộp thoại, ô nhập liệu hoặc ô chọn
- **THEN** cử chỉ bị bỏ qua và bước không đổi
