## ADDED Requirements

### Requirement: Tạo bữa mới
Hệ thống SHALL cho phép người dùng tạo Bữa mới với Tên bữa, Ngày diễn ra và Ghi chú (tuỳ chọn). Bữa mới SHALL có `status = ACTIVE`, `participantIds = [Tôi]`, `hostMemberId = defaultHostMemberId` (lấy từ `initMealPeople()`), `settlementMode = SELF_SETTLEMENT`, `paymentGroups = []`, `settlementStatuses = {}` và `createdAt = updatedAt = now`. Chủ trì mặc định là "Tôi" và "Tôi" tự nằm trong danh sách tham gia. (BR-3.1, R-4)

#### Scenario: Tạo bữa hợp lệ và mở thẳng màn chi tiết (AC-3)
- **WHEN** người dùng nhập Tên bữa, Ngày hợp lệ và bấm tạo
- **THEN** bữa được lưu và màn hình chi tiết của bữa đó mở ngay (BR-3.1, AC-3)

#### Scenario: Bữa mới chỉ có "Tôi" là người tham gia (AC-4)
- **WHEN** một bữa mới được tạo
- **THEN** "Tôi" là chủ trì và là người tham gia duy nhất của bữa đó (R-4, AC-4)

#### Scenario: Thay đổi người trong bữa này không ảnh hưởng bữa khác (AC-4)
- **WHEN** người dùng thêm hoặc đổi người ở bữa A
- **THEN** danh sách người và chủ trì của bữa B không thay đổi (R-4, AC-4)

### Requirement: Tên bữa
Hệ thống SHALL chuẩn hoá Tên bữa: bỏ khoảng trắng đầu và cuối, gộp nhiều khoảng trắng liên tiếp, bỏ ký tự điều khiển, và giới hạn tối đa 100 ký tự. Hệ thống SHALL giữ nguyên chữ hoa và chữ thường người dùng gõ. Hai bữa cùng tên SHALL được phép, vì được phân biệt bằng ngày. (R-1)

#### Scenario: Tên trống được đặt mặc định theo ngày (AC-3)
- **WHEN** người dùng để trống Tên bữa
- **THEN** hệ thống tự đặt tên theo mẫu `Bữa <dd/mm/yyyy>` theo ngày của bữa (R-1, AC-3)

#### Scenario: Khoảng trắng thừa bị bỏ khi lưu (R-1)
- **WHEN** người dùng nhập tên có khoảng trắng đầu, cuối hoặc nhiều khoảng trắng liên tiếp
- **THEN** tên được lưu sau khi bỏ khoảng trắng thừa, còn chữ hoa và chữ thường giữ nguyên (R-1)

#### Scenario: Tên vượt 100 ký tự bị từ chối (R-1)
- **WHEN** Tên bữa dài hơn 100 ký tự
- **THEN** hệ thống từ chối lưu và báo lỗi tại ô tên (R-1)

#### Scenario: Hai bữa cùng tên được phép (R-1)
- **WHEN** người dùng tạo hai bữa có cùng Tên bữa ở hai ngày khác nhau
- **THEN** cả hai bữa được lưu và hiển thị riêng biệt (R-1)

### Requirement: Ngày bữa
Hệ thống SHALL lưu Ngày bữa theo định dạng `YYYY-MM-DD`, phải là ngày có thật trên lịch, và nằm trong khoảng `2000-01-01` đến `2099-12-31`. Ngày tương lai SHALL được chấp nhận vì là bữa dự kiến. "Hôm nay" và ngày mặc định khi tạo SHALL tính theo giờ địa phương của thiết bị, không tính theo UTC. (R-2)

#### Scenario: Ngày không có thật bị từ chối kèm thông báo (AC-3)
- **WHEN** người dùng nhập ngày không có thật, ví dụ `2026-02-30`, hoặc ngày ngoài khoảng cho phép
- **THEN** hệ thống từ chối tạo hoặc sửa bữa và hiển thị thông báo tại ô ngày (R-2, AC-3)

#### Scenario: Ngày mặc định theo giờ địa phương (AC-14)
- **WHEN** người dùng tạo bữa lúc 00:30 theo giờ địa phương
- **THEN** ngày mặc định là ngày hôm đó theo giờ địa phương, không bị lệch sang ngày trước do múi giờ UTC (R-2, AC-14)

#### Scenario: Ngày tương lai được chấp nhận (R-2)
- **WHEN** người dùng chọn một ngày nằm sau hôm nay trong khoảng cho phép
- **THEN** hệ thống lưu bữa với ngày đó như bữa dự kiến (R-2)

### Requirement: Ghi chú bữa
Hệ thống SHALL cho phép Ghi chú bữa để trống hoặc tối đa 500 ký tự, bỏ khoảng trắng đầu và cuối, và giữ nguyên các dòng xuống hàng. Khi Ghi chú để trống, hệ thống SHALL không lưu trường `note`. (R-3)

#### Scenario: Ghi chú trống không được lưu (R-3)
- **WHEN** người dùng tạo hoặc sửa bữa và để trống Ghi chú
- **THEN** bữa được lưu không có trường `note` (R-3)

#### Scenario: Ghi chú vượt 500 ký tự bị từ chối (R-3)
- **WHEN** Ghi chú dài hơn 500 ký tự
- **THEN** hệ thống từ chối lưu và báo lỗi tại ô ghi chú (R-3)

### Requirement: Sửa thông tin bữa đang hoạt động
Hệ thống SHALL cho phép sửa Tên bữa, Ngày và Ghi chú của bữa có trạng thái `ACTIVE`. Thao tác sửa SHALL cập nhật `updatedAt` và SHALL NOT thay đổi người tham gia, chủ trì, nhóm thanh toán, kèo hoặc hoá đơn của bữa. Đổi ngày bữa SHALL NOT đổi ngày in trên hoá đơn, vì `Invoice.invoiceDate` là dữ liệu riêng. Bữa có trạng thái `ARCHIVED` SHALL bị từ chối sửa với mã lỗi `MEAL_ARCHIVED`. (BR-3.2, R-5)

#### Scenario: Sửa bữa đang hoạt động và cập nhật ở cả ba chế độ xem (AC-5)
- **WHEN** người dùng sửa Tên, Ngày hoặc Ghi chú của bữa `ACTIVE` và lưu
- **THEN** thay đổi được lưu, `updatedAt` được cập nhật và bữa hiển thị đúng ở chế độ Lịch, Danh sách và Loại (BR-3.2, R-5, AC-5)

#### Scenario: Sửa bữa đã lưu trữ bị từ chối (AC-5)
- **WHEN** một thao tác sửa được gửi cho bữa `ARCHIVED`
- **THEN** hệ thống từ chối với mã `MEAL_ARCHIVED` và không đổi dữ liệu của bữa (BR-3.2, R-5, AC-5)

#### Scenario: Đổi ngày bữa không đổi ngày hoá đơn (R-5)
- **WHEN** người dùng đổi Ngày của bữa đang hoạt động
- **THEN** `Invoice.invoiceDate` của các hoá đơn trong bữa không thay đổi (R-5)

### Requirement: Xoá bữa
Hệ thống SHALL cho phép xoá Bữa ở cả trạng thái `ACTIVE` lẫn `ARCHIVED`. Khi xoá, hệ thống SHALL xoá các file hoá đơn của bữa, gồm file OPFS và bản ghi `invoice_files`, trước. Sau đó, trong một transaction, hệ thống SHALL xoá `items`, `invoices`, `sessions` của bữa rồi xoá chính `meals`. Thành viên trong danh bạ SHALL NOT bị xoá (Epic 2 R-15). Bữa khác và danh bạ SHALL NOT bị ảnh hưởng. Xoá SHALL NOT hoàn tác được. (BR-3.3, R-6)

#### Scenario: Xoá sạch mọi dữ liệu thuộc bữa (AC-2)
- **WHEN** người dùng xác nhận xoá một bữa có kèo, hoá đơn, món và file ảnh
- **THEN** toàn bộ kèo, hoá đơn, món, bản ghi file hoá đơn và file vật lý của bữa đó bị xoá (BR-3.3, R-6, AC-2)

#### Scenario: Bữa khác và danh bạ được giữ nguyên (AC-2)
- **WHEN** một bữa được xoá
- **THEN** các bữa khác và các thành viên trong danh bạ vẫn còn nguyên (BR-3.3, R-6, AC-2)

#### Scenario: Xoá bữa đã lưu trữ (BR-3.3)
- **WHEN** người dùng xoá một bữa có trạng thái `ARCHIVED`
- **THEN** bữa đó được xoá như bữa đang hoạt động (BR-3.3)

#### Scenario: Lỗi giữa chừng khi xoá file hoá đơn (R-6)
- **WHEN** bước xoá file hoá đơn gặp lỗi trước khi xoá dữ liệu trong transaction
- **THEN** bữa còn nguyên và có thể thử xoá lại; bữa không bao giờ biến mất khi vẫn còn dữ liệu con của nó (R-6)

### Requirement: Hộp xác nhận cho hành động phá huỷ
Hệ thống SHALL dùng hộp xác nhận của app, không dùng `window.confirm`, cho mọi hành động xoá bữa và mọi hành động làm mất trạng thái, gồm bỏ người đang tick "Đã thanh toán" và đổi hoặc giải tán nhóm có tick. Hộp xác nhận xoá bữa SHALL nêu tên bữa, ngày và số lượng sẽ mất gồm số kèo, hoá đơn, món và file ảnh. Bữa chưa có gì SHALL chỉ nêu tên và ngày. Nút Huỷ SHALL là nút mặc định được focus. (BR-3.12, R-7)

#### Scenario: Hộp xác nhận xoá nêu số lượng sẽ mất (R-7)
- **WHEN** người dùng bấm xoá một bữa có 2 kèo, 3 hoá đơn và 5 món
- **THEN** hộp xác nhận nêu tên bữa, ngày và các số lượng đó (R-7)

#### Scenario: Bữa chưa có dữ liệu chỉ nêu tên và ngày (R-7)
- **WHEN** người dùng bấm xoá một bữa chưa có kèo, hoá đơn hay món
- **THEN** hộp xác nhận chỉ nêu tên và ngày của bữa (R-7)

#### Scenario: Điều khiển hộp xác nhận bằng bàn phím (AC-12)
- **WHEN** hộp xác nhận mở ra
- **THEN** nút Huỷ được focus mặc định, phím `Esc` đóng hộp, và `Tab` không thoát khỏi hộp (BR-3.12, R-7, AC-12)

#### Scenario: Bỏ người đang tick "Đã thanh toán" dùng hộp xác nhận (BR-3.12)
- **WHEN** người dùng bỏ một người đang được tick "Đã thanh toán" khỏi bữa
- **THEN** hệ thống hiện hộp xác nhận của app và không gọi `window.confirm` (BR-3.12)

### Requirement: Thứ tự hiển thị bữa
Hệ thống SHALL sắp xếp mọi bữa theo `date` giảm dần; các bữa cùng ngày SHALL xếp theo `createdAt` giảm dần, nghĩa là bữa tạo sau đứng trước. Thứ tự này SHALL áp dụng nhất quán ở ô lịch, khung bữa trong ngày và chế độ Danh sách. (R-8)

#### Scenario: Hai bữa cùng ngày xếp theo thời điểm tạo (AC-7)
- **WHEN** hai bữa có cùng ngày được tạo lần lượt
- **THEN** bữa tạo sau đứng trước trong chế độ Danh sách và trong khung bữa của ngày đó (R-8, AC-7)

### Requirement: Tổng chi phí của bữa
Hệ thống SHALL tính Tổng chi phí của bữa có trạng thái `ACTIVE` bằng tổng `Invoice.totalAmount` của mọi hoá đơn thuộc bữa. Với bữa `ARCHIVED`, hệ thống SHALL lấy `archivedSummary.totalMealAmount`; nếu thiếu giá trị này thì coi như chưa có chi phí. Tổng chi SHALL hiển thị theo định dạng VNĐ có dấu phân cách hàng nghìn. Khi bữa chưa có hoá đơn, hệ thống SHALL hiển thị "Chưa có chi phí" và SHALL NOT hiển thị số 0 gây hiểu nhầm. (BR-3.8, R-9)

#### Scenario: Bữa chưa có hoá đơn hiển thị "Chưa có chi phí" (BR-3.8, R-9)
- **WHEN** một bữa chưa có hoá đơn nào
- **THEN** tổng chi hiển thị "Chưa có chi phí" thay vì 0 (BR-3.8, R-9)

#### Scenario: Tổng chi cộng từ mọi hoá đơn của bữa (R-9)
- **WHEN** bữa đang hoạt động có nhiều hoá đơn
- **THEN** tổng chi bằng tổng `totalAmount` của mọi hoá đơn và hiển thị theo VNĐ có dấu phân cách hàng nghìn (R-9)

#### Scenario: Bữa đã lưu trữ dùng tổng đã chốt (R-9)
- **WHEN** bữa `ARCHIVED` có `archivedSummary.totalMealAmount`
- **THEN** tổng chi hiển thị giá trị đó; nếu thiếu thì hiển thị "Chưa có chi phí" (R-9)

### Requirement: Tiến độ thanh toán của bữa
Hệ thống SHALL đếm thực thể thanh toán của bữa như sau: mỗi nhóm thanh toán là một thực thể, cộng mỗi người tham gia chưa thuộc nhóm nào là một thực thể. Hệ thống SHALL hiển thị tiến độ theo dạng `<đã tick>/<tổng thực thể> đã thanh toán` khi bữa có chi phí. Với bữa `ARCHIVED`, hệ thống SHALL lấy số liệu từ `archivedSummary.entitiesSummary` (trường `isPaid`). Epic 3 đếm mọi thực thể; Epic 6 sẽ tinh chỉnh để thực thể có số dư bằng 0 không bị tính. (R-10)

#### Scenario: Tiến độ đếm nhóm và người lẻ như hai loại thực thể (R-10)
- **WHEN** bữa có một nhóm thanh toán gồm hai người và một người lẻ
- **THEN** tổng thực thể là 2 và số đã tick được đếm theo từng thực thể (R-10)

#### Scenario: Bữa chưa có chi phí không hiển thị tiến độ (R-10)
- **WHEN** bữa chưa có chi phí
- **THEN** phần tiến độ hiển thị "Chưa có chi phí" (R-10)

### Requirement: Số kèo và số người của bữa
Hệ thống SHALL tính số kèo của bữa bằng số bản ghi `sessions` thuộc bữa; bữa `ARCHIVED` SHALL giữ nguyên các `sessions` nên vẫn đếm đúng. Hệ thống SHALL tính số người của bữa bằng `participantIds.length` của chính bữa đó, không tính theo từng kèo, vì mỗi kèo có danh sách người riêng là tập con của người trong bữa. Xoá bữa SHALL xoá luôn các kèo cùng danh sách người của chúng. (R-11)

#### Scenario: Bữa đã lưu trữ vẫn đếm đúng số kèo (R-11)
- **WHEN** bữa `ARCHIVED` còn các bản ghi `sessions`
- **THEN** số kèo hiển thị bằng số bản ghi `sessions` của bữa đó (R-11)

#### Scenario: Số người tính theo bữa, không theo kèo (R-11)
- **WHEN** một kèo chỉ có một phần người của bữa tham gia
- **THEN** số người của bữa vẫn bằng `participantIds.length` của bữa (R-11)

### Requirement: Chế độ xem Danh sách
Hệ thống SHALL hiển thị chế độ xem Danh sách gồm mọi bữa theo thứ tự R-8. Mỗi thẻ bữa SHALL hiển thị ngày, tên, trạng thái, số kèo, số người, tổng chi phí, tiến độ thanh toán, nút Mở và nút Xoá. (BR-3.5)

#### Scenario: Thẻ bữa hiển thị đủ các trường (AC-7)
- **WHEN** chế độ Danh sách có ít nhất một bữa
- **THEN** mỗi thẻ hiển thị đủ ngày, tên, trạng thái, số kèo, số người, tổng chi phí, tiến độ, nút Mở và nút Xoá, và các bữa xếp từ mới đến cũ (BR-3.5, AC-7)

### Requirement: Chế độ xem Lịch
Hệ thống SHALL hiển thị chế độ xem Lịch dạng lưới theo tháng, tuần bắt đầu từ Thứ 2, với số hàng đủ để chứa tháng đang xem (5 hoặc 6 hàng). Các ngày thuộc tháng liền kề SHALL hiển thị mờ nhưng vẫn có đánh dấu bữa và bấm được; bấm vào thì chuyển sang tháng đó. Ngày hôm nay SHALL có viền nhấn và ngày đang chọn SHALL có nền xanh. Một ô SHALL hiển thị tối đa hai bữa gồm tên và tổng tiền; từ bữa thứ ba hiển thị "+N bữa nữa". Trên màn hình hẹp dưới 640 px, ô SHALL chỉ hiện chấm đánh dấu và số bữa, còn chi tiết nằm ở khung bữa trong ngày. (BR-3.4, R-12)

#### Scenario: Đánh dấu ngày có bữa kèm tên và tổng tiền (AC-6)
- **WHEN** tháng đang xem có bữa ở một số ngày
- **THEN** mỗi ngày có bữa được đánh dấu kèm tên và tổng tiền của bữa (BR-3.4, R-12, AC-6)

#### Scenario: Ô lịch chỉ hiển thị tối đa hai bữa (R-12)
- **WHEN** một ngày có ba bữa trở lên
- **THEN** ô hiển thị hai bữa đầu và dòng "+N bữa nữa" cho các bữa còn lại (R-12)

#### Scenario: Màn hình hẹp chỉ hiện chấm đánh dấu (R-12)
- **WHEN** màn hình rộng dưới 640 px
- **THEN** ô lịch chỉ hiện chấm đánh dấu và số bữa, không hiện tên bữa (R-12)

#### Scenario: Ngày đầu tháng, cuối tháng và tháng 2 năm nhuận hiển thị đúng (AC-6)
- **WHEN** người dùng xem tháng có ngày đầu tuần lệch, tháng có 28 hoặc 29 ngày
- **THEN** lưới hiển thị đúng các ngày và các ô ngoài tháng hiện mờ (R-12, AC-6)

### Requirement: Chọn ngày và tạo bữa theo ngày trên Lịch
Hệ thống SHALL mặc định chọn hôm nay khi mở chế độ Lịch. Khung bên dưới SHALL liệt kê các bữa của ngày đang chọn, gồm cả bữa `ACTIVE` và `ARCHIVED`; bữa lưu trữ có biểu tượng khoá. Khung SHALL có nút "+ Tạo bữa mới cho ngày này" điền sẵn ngày đó, và người dùng vẫn đổi được ngày. Ngày không có bữa SHALL hiển thị lời nhắc tạo bữa. (BR-3.4, R-13)

#### Scenario: Bấm một ngày liệt kê đúng các bữa trong ngày (AC-6)
- **WHEN** người dùng bấm một ngày trên lưới
- **THEN** khung bên dưới liệt kê đúng các bữa của ngày đó, cả đang hoạt động lẫn đã lưu trữ (R-13, AC-6)

#### Scenario: Tạo bữa mới cho ngày đang chọn (AC-6)
- **WHEN** người dùng bấm "+ Tạo bữa mới cho ngày này"
- **THEN** hộp tạo bữa mở với ngày đã điền sẵn là ngày đang chọn (BR-3.4, R-13, AC-6)

#### Scenario: Ngày không có bữa hiển thị lời nhắc (R-13)
- **WHEN** ngày đang chọn không có bữa nào
- **THEN** khung bên dưới hiển thị lời nhắc tạo bữa thay vì danh sách trống (R-13)

### Requirement: Điều hướng lịch
Hệ thống SHALL cung cấp nút tháng trước và tháng sau, ô chọn Tháng và Năm (từ 2000 đến 2099), và nút "Hôm nay". Khi đổi tháng, ngày đang chọn SHALL được giữ nếu ngày đó vẫn nằm trong lưới. (R-14)

#### Scenario: Đổi tháng, đổi năm và nút Hôm nay (AC-6)
- **WHEN** người dùng bấm tháng trước hoặc tháng sau, chọn Tháng và Năm khác, hoặc bấm "Hôm nay"
- **THEN** lưới chuyển đến tháng, năm tương ứng, và "Hôm nay" đưa lưới về tháng hiện tại (R-14, AC-6)

#### Scenario: Đổi tháng giữ ngày đang chọn khi còn trong lưới (R-14)
- **WHEN** người dùng đổi tháng và ngày đang chọn vẫn nằm trong lưới của tháng mới
- **THEN** ngày đang chọn vẫn được giữ (R-14)

### Requirement: Chế độ xem Loại
Hệ thống SHALL hiển thị chế độ xem Loại gồm hai tab "Đang hoạt động (n)" và "Đã lưu trữ (n)", với n là số bữa của mỗi tab. Tab đầu SHALL được chọn mặc định. Trong mỗi tab, bữa xếp theo R-8. Tab rỗng SHALL hiển thị câu giải thích ngắn. (BR-3.6, R-15)

#### Scenario: Hai tab tách đúng trạng thái kèm số đếm (AC-8)
- **WHEN** có bữa đang hoạt động và bữa đã lưu trữ
- **THEN** tab "Đang hoạt động (n)" chỉ liệt kê bữa `ACTIVE`, tab "Đã lưu trữ (n)" chỉ liệt kê bữa `ARCHIVED`, và hai số đếm đúng (BR-3.6, R-15, AC-8)

#### Scenario: Tab rỗng có lời giải thích (R-15)
- **WHEN** tab "Đã lưu trữ" không có bữa nào
- **THEN** tab hiển thị câu giải thích, ví dụ "Chưa có bữa nào được lưu trữ. Bữa chỉ lưu trữ được khi mọi khoản thanh toán đã hoàn tất." (R-15)

### Requirement: Bữa đã lưu trữ chỉ đọc
Hệ thống SHALL mở bữa `ARCHIVED` ở chế độ chỉ đọc: khối người, nhóm và chủ trì bị khoá bằng cờ `readOnly` đã có ở Epic 2, và nút Sửa bị ẩn. Bữa đã lưu trữ SHALL vẫn có nút Mở và nút Xoá. Epic 3 chỉ hiển thị và xoá bữa `ARCHIVED`; chưa có thao tác chuyển một bữa sang `ARCHIVED`. (BR-3.10)

#### Scenario: Bữa đã lưu trữ không có nút Sửa và vẫn xoá được (AC-8)
- **WHEN** người dùng mở một bữa `ARCHIVED` từ chế độ Loại hoặc từ màn chi tiết
- **THEN** nút Sửa không hiển thị, khối người, nhóm và chủ trì bị khoá, và nút Xoá vẫn hoạt động (BR-3.10, AC-8)

### Requirement: Đồng bộ giữa ba chế độ xem
Hệ thống SHALL hiển thị ba chế độ xem Lịch, Danh sách và Loại trên cùng một tập dữ liệu, dùng chung một nguồn tóm tắt bữa. Thao tác tạo, sửa hoặc xoá ở một chế độ SHALL hiện ngay ở hai chế độ còn lại mà không cần tải lại trang. (BR-3.7, BR-3.8)

#### Scenario: Thay đổi ở một chế độ hiện ngay ở các chế độ khác (AC-1)
- **WHEN** người dùng đổi tên hoặc tạo một bữa ở chế độ Lịch, rồi chuyển sang Danh sách và Loại
- **THEN** cả ba chế độ có cùng số bữa, cùng tên, ngày và tổng tiền (BR-3.7, BR-3.8, AC-1)

### Requirement: Nhớ chế độ xem đã chọn
Hệ thống SHALL lưu lựa chọn chế độ xem (`CALENDAR`, `LIST` hoặc `STATUS`) cục bộ trên thiết bị, mặc định là `LIST`. Nếu không đọc hoặc ghi được bộ nhớ cục bộ (chế độ riêng tư), hệ thống SHALL dùng mặc định và vẫn chuyển chế độ bình thường trong phiên làm việc. (R-16)

#### Scenario: Chế độ xem còn nguyên sau khi tải lại trang (AC-9)
- **WHEN** người dùng chọn chế độ Lịch rồi tải lại trang (F5)
- **THEN** ứng dụng mở lại ở chế độ Lịch (R-16, AC-9)

#### Scenario: Bộ nhớ cục bộ không dùng được (R-16)
- **WHEN** đọc hoặc ghi bộ nhớ cục bộ gây lỗi
- **THEN** ứng dụng dùng chế độ mặc định `LIST` và vẫn chuyển được chế độ trong phiên (R-16)

### Requirement: Màn chi tiết bữa
Hệ thống SHALL hiển thị màn chi tiết bữa (Meal Workspace) gồm thanh đầu với tên, ngày, trạng thái, chủ trì và tổng chi. Khu vực 1 SHALL chứa khối Thành viên, Chủ trì và Nhóm thanh toán của Epic 2. Khu vực 2 (Kèo) và Khu vực 3 (Quyết toán) SHALL hiện ô giữ chỗ ghi rõ epic sẽ làm. Màn chi tiết SHALL có nút Quay lại, Sửa thông tin và Xoá bữa. Màn chi tiết SHALL mở được trực tiếp bằng đường dẫn `#/meal/<id>` và còn nguyên sau khi tải lại trang. (BR-3.9)

#### Scenario: Mở bữa bằng đường dẫn và giữ nguyên sau F5 (AC-9)
- **WHEN** người dùng mở `#/meal/<id>` của một bữa tồn tại rồi tải lại trang
- **THEN** màn chi tiết của đúng bữa đó vẫn hiển thị (BR-3.9, AC-9)

#### Scenario: Khối người của Epic 2 hoạt động trong bữa thật (AC-10)
- **WHEN** người dùng mở màn chi tiết của một bữa
- **THEN** người dùng thêm được người bằng Quick Filter, đổi được chủ trì, và tạo, sửa, giải tán được nhóm thanh toán (BR-3.9, AC-10)

### Requirement: Điều hướng giữa danh sách bữa và chi tiết bữa
Hệ thống SHALL có hai màn hình: "Danh sách bữa" (`#/`) và "Chi tiết bữa" (`#/meal/<id>`). Khi đường dẫn tới bữa không tồn tại, vì đã xoá hoặc gõ sai, hệ thống SHALL hiển thị thông báo "Không tìm thấy bữa này" kèm nút về danh sách và SHALL NOT để trắng màn hình. Khi xoá bữa từ màn chi tiết, hệ thống SHALL quay về danh sách. (R-17)

#### Scenario: Đường dẫn tới bữa không tồn tại (AC-9)
- **WHEN** người dùng mở `#/meal/<id>` với một id không có trong dữ liệu
- **THEN** hệ thống hiển thị "Không tìm thấy bữa này" kèm nút về danh sách, không lỗi và không trắng trang (R-17, AC-9)

#### Scenario: Xoá bữa từ màn chi tiết quay về danh sách (R-17)
- **WHEN** người dùng xác nhận xoá bữa đang mở ở màn chi tiết
- **THEN** ứng dụng quay về màn Danh sách bữa (R-17)

### Requirement: Trạng thái rỗng khi chưa có bữa nào
Khi chưa có bữa nào, hệ thống SHALL hiển thị lời giới thiệu ngắn và nút lớn "+ Tạo bữa đầu tiên" thay vì danh sách trống. (R-18)

#### Scenario: Lần đầu mở ứng dụng khi chưa có bữa (R-18)
- **WHEN** người dùng mở ứng dụng và cơ sở dữ liệu chưa có bữa nào
- **THEN** hệ thống hiển thị lời giới thiệu và nút "+ Tạo bữa đầu tiên" (R-18)

### Requirement: Bữa nháp cũ từ Epic 2
Bữa `Bữa thử nghiệm (Epic 2)` có thể còn trong trình duyệt của người dùng từ Epic 2. Bữa này SHALL được đối xử như một bữa bình thường, gồm xem, sửa và xoá, và không có xử lý đặc biệt. (R-19)

#### Scenario: Bữa thử nghiệm cũ được xử lý như bữa thường (R-19)
- **WHEN** bữa `Bữa thử nghiệm (Epic 2)` còn tồn tại trong dữ liệu
- **THEN** bữa đó hiển thị và xử lý như mọi bữa khác (R-19)

### Requirement: Đổi tên hồ sơ "Tôi"
Hệ thống SHALL cho phép đổi tên hồ sơ "Tôi" từ giao diện chính, tại mục "Hồ sơ của tôi" trên thanh đầu trang. Quy tắc của Epic 2 vẫn áp dụng: hồ sơ "Tôi" không xoá được, tên được viết hoa chữ cái đầu, và tên không được trùng với người khác. (BR-3.11)

#### Scenario: Đổi tên "Tôi" từ thanh đầu trang (AC-11)
- **WHEN** người dùng mở "Hồ sơ của tôi" trên thanh đầu và đổi tên
- **THEN** tên mới được lưu và hiển thị ở các nơi dùng hồ sơ "Tôi" (BR-3.11, AC-11)

#### Scenario: Hồ sơ "Tôi" không xoá được (AC-11)
- **WHEN** người dùng tìm cách xoá hồ sơ "Tôi"
- **THEN** hệ thống không cho xoá hồ sơ "Tôi" (BR-3.11, AC-11)

### Requirement: Hiển thị trên màn hình hẹp và điều khiển bằng bàn phím
Hệ thống SHALL dùng được trên màn hình rộng 375 px mà không cuộn ngang. Mọi nút và ô chạm SHALL cao tối thiểu 44 px. Mọi điều khiển SHALL dùng được hoàn toàn bằng bàn phím. (AC-13)

#### Scenario: Màn hình 375 px không cuộn ngang (AC-13)
- **WHEN** người dùng mở chế độ Lịch hoặc chế độ Loại ở màn hình rộng 375 px
- **THEN** trang không có thanh cuộn ngang và mọi nút, ô chạm có chiều cao tối thiểu 44 px (AC-13)
