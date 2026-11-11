## ADDED Requirements

### Requirement: Người ứng tiền của hoá đơn
Hệ thống SHALL gán cho mỗi hoá đơn đúng một người ứng tiền (`payerMemberId`) thuộc danh sách người tham gia kèo, chọn khi tạo hoá đơn hoặc đổi nhanh ngay trên thẻ hoá đơn. (BR-5.1, US-5.1)

#### Scenario: Chọn người ứng khi tạo hoá đơn (BR-5.1)
- **WHEN** người dùng tạo hoá đơn mới trong một kèo và chọn một thành viên của kèo làm người ứng
- **THEN** hoá đơn được lưu với đúng một `payerMemberId` là thành viên đó

#### Scenario: Đổi nhanh người ứng trên thẻ hoá đơn (BR-5.1)
- **WHEN** người dùng chọn một thành viên khác của kèo làm người ứng ngay trên thẻ hoá đơn
- **THEN** `payerMemberId` của hoá đơn đổi sang thành viên đó

### Requirement: Thành viên trong hoá đơn phải thuộc kèo
Hệ thống MUST từ chối mọi `payerMemberId`, mọi phần tử của `equalSplitParticipantIds` và mọi `consumers[].memberId` của món nếu ID đó không thuộc `SessionKeo.participantIds` của kèo chứa hoá đơn. Các trường hợp bị từ chối dùng mã lỗi `PAYER_NOT_IN_SESSION`, `SPLIT_MEMBER_NOT_IN_SESSION` và `CONSUMER_NOT_IN_SESSION` tương ứng. (R-1, AC-4, BR-5.5, BR-5.6)

#### Scenario: Người ứng ngoài kèo bị từ chối (R-1)
- **WHEN** yêu cầu đặt người ứng là một ID không thuộc `SessionKeo.participantIds`
- **THEN** hệ thống từ chối với mã `PAYER_NOT_IN_SESSION`

#### Scenario: Người chia đều hoặc người ăn ngoài kèo bị từ chối (AC-4)
- **WHEN** danh sách `equalSplitParticipantIds` hoặc `consumers` của một món chứa ID không thuộc kèo
- **THEN** hệ thống từ chối với mã `SPLIT_MEMBER_NOT_IN_SESSION` hoặc `CONSUMER_NOT_IN_SESSION`

#### Scenario: Chỉ chọn được thành viên của kèo (AC-4)
- **WHEN** người dùng mở danh sách chọn người ứng, người chia đều hoặc người ăn của một kèo
- **THEN** danh sách chỉ gồm các thành viên thuộc `SessionKeo.participantIds`

### Requirement: Hai phương thức nhập hoá đơn
Hệ thống SHALL hỗ trợ hai phương thức nhập hoá đơn: `ITEMIZED` (nhập chi tiết từng món) và `TOTAL_ONLY` (chỉ nhập tổng tiền). (BR-5.2, US-5.2)

#### Scenario: Nhập hoá đơn chỉ có tổng tiền (AC-1)
- **WHEN** người dùng chọn "Chỉ nhập tổng tiền" khi tạo hoá đơn
- **THEN** giao diện và tầng dịch vụ tự động chọn và khoá chế độ "Chia đều theo tổng" (`EQUAL_TOTAL`), và không cho chuyển sang "Chia từng món"

### Requirement: Khoá chia đều theo tổng cho hoá đơn chỉ có tổng tiền
Khi `inputMode` là `TOTAL_ONLY`, hệ thống MUST đặt và giữ `splitType` bằng `EQUAL_TOTAL`, hoá đơn MUST không có bản ghi `InvoiceItem` nào, và mọi yêu cầu đặt `splitType = 'BY_ITEM'` hoặc thêm món vào hoá đơn này bị từ chối với mã `SPLIT_TYPE_LOCKED`. (R-2, BR-5.2)

#### Scenario: Đặt chia từng món trên hoá đơn chỉ có tổng bị từ chối (R-2)
- **WHEN** yêu cầu đặt `splitType = 'BY_ITEM'` hoặc thêm món cho hoá đơn có `inputMode = 'TOTAL_ONLY'`
- **THEN** hệ thống từ chối với mã `SPLIT_TYPE_LOCKED`

#### Scenario: Đổi hoá đơn chi tiết sang chỉ có tổng khi sửa (R-2)
- **WHEN** người dùng đổi một hoá đơn từ `ITEMIZED` sang `TOTAL_ONLY` trong form sửa hoá đơn và bấm Lưu
- **THEN** hệ thống tự động đặt `splitType = 'EQUAL_TOTAL'` và xoá các món cũ của hoá đơn đó

### Requirement: Thêm, sửa và xoá món sau khi đã lưu hoá đơn
Hệ thống SHALL cho phép thêm, sửa (`name`, `quantity`, `unitPrice`, `rawAmount`) và xoá từng món của hoá đơn `ITEMIZED` đã lưu khi bữa ở trạng thái `ACTIVE`. Mỗi thao tác MUST tính lại `subtotalAmount`, `discountAmount`, `serviceAmount`, `vatAmount`, `totalAmount` của hoá đơn và phân bổ lại `allocatedDiscountAmount`, `allocatedServiceAmount`, `allocatedVatAmount`, `finalAmount` cho các món còn lại theo công thức phần dư lớn nhất của Epic 4, trong cùng một transaction. (BR-5.3, R-7, US-5.2)

#### Scenario: Hiển thị danh sách món trong thẻ hoá đơn (BR-5.3)
- **WHEN** người dùng mở thẻ một hoá đơn chi tiết trong kèo
- **THEN** mỗi món hiển thị tên, số lượng, đơn giá, phần giảm giá, phí phục vụ và VAT phân bổ, cùng `finalAmount` sau điều chỉnh

#### Scenario: Thêm món mới và tính lại tổng hoá đơn (BR-5.3, R-7)
- **WHEN** người dùng thêm một món vào hoá đơn `ITEMIZED` đã lưu
- **THEN** hệ thống tính lại tổng hoá đơn và phân bổ cho mọi món trong cùng một transaction

#### Scenario: Sửa món giữ nguyên người ăn (R-7)
- **WHEN** người dùng sửa `name`, `quantity`, `unitPrice` hoặc `rawAmount` của một món đã có người ăn
- **THEN** danh sách `consumers` của món đó và của các món khác được giữ nguyên

#### Scenario: Tổng các món khớp tổng hoá đơn sau mọi thao tác (AC-3)
- **WHEN** người dùng thêm, sửa, xoá món hoặc đổi người ứng tiền của hoá đơn đã lưu
- **THEN** tổng `finalAmount` của các món khớp 100% với `totalAmount` của hoá đơn, và phần giảm giá, phí phục vụ, VAT phân bổ vào từng món được cập nhật tự động

### Requirement: Món cuối cùng của hoá đơn chi tiết không được xoá
Hoá đơn `ITEMIZED` MUST luôn có ít nhất một món; ràng buộc này dùng mã `INVALID_ITEM`. Tầng dịch vụ MUST từ chối xoá món cuối cùng với mã `LAST_ITEM_CANNOT_DELETE`, và giao diện MUST khoá nút xoá của món đó. Khi xoá một món đã có người ăn, giao diện MUST hiển thị `ConfirmDialog` xác nhận, với nút Huỷ là lựa chọn mặc định. (R-8, AC-8)

#### Scenario: Xoá món cuối cùng bị chặn (R-8, AC-8)
- **WHEN** hoá đơn `ITEMIZED` chỉ còn một món và người dùng yêu cầu xoá món đó
- **THEN** nút xoá bị khoá, kèm gợi ý xoá cả hoá đơn hoặc chuyển hoá đơn sang "Chỉ nhập tổng tiền", và tầng dịch vụ từ chối với mã `LAST_ITEM_CANNOT_DELETE`

#### Scenario: Xoá món đã có người ăn cần xác nhận (AC-8)
- **WHEN** người dùng bấm xoá một món đã có người ăn được gán
- **THEN** hệ thống hiển thị `ConfirmDialog` của app, nút Huỷ là mặc định, và món chỉ bị xoá khi người dùng xác nhận

### Requirement: Chuyển đổi giữa chia từng món và chia đều theo tổng
Với hoá đơn `ITEMIZED`, hệ thống SHALL cho phép người dùng chuyển tức thì giữa `BY_ITEM` và `EQUAL_TOTAL` trên thẻ hoá đơn hoặc trong form. Việc đổi chế độ không làm thay đổi tiền hàng, giảm giá, phí phục vụ, VAT hay danh sách món. Khi chuyển từ `BY_ITEM` sang `EQUAL_TOTAL`, `consumers` của các món MUST được giữ nguyên trong cơ sở dữ liệu. (BR-5.4, R-3, US-5.3)

#### Scenario: Đổi qua lại giữ người ăn và số phần (AC-2, BR-5.4)
- **WHEN** người dùng chuyển hoá đơn từ `BY_ITEM` sang `EQUAL_TOTAL` rồi quay lại `BY_ITEM`
- **THEN** người ăn và số phần đã gán cho từng món vẫn còn nguyên, người dùng không phải tick lại

#### Scenario: Chia đều theo tổng chỉ tính trên người chia đều (R-3)
- **WHEN** hoá đơn ở chế độ `EQUAL_TOTAL` và các món vẫn còn `consumers` đã gán
- **THEN** hệ thống chỉ chia theo `equalSplitParticipantIds`

### Requirement: Danh sách người chia đều của hoá đơn
Ở chế độ `EQUAL_TOTAL`, hệ thống SHALL lưu `equalSplitParticipantIds` là một tập con khác rỗng của người tham gia kèo, không có ID trùng lặp. Người dùng xem và tick chọn danh sách này, với nút chọn nhanh "Tất cả người trong kèo". Khi tạo hoá đơn mới, danh sách mặc định gồm toàn bộ người trong kèo. (BR-5.5, R-4, US-5.3)

#### Scenario: Tick chọn người chia đều (AC-5, BR-5.5)
- **WHEN** hoá đơn ở `EQUAL_TOTAL` và người dùng tick hoặc bỏ tick một thành viên của kèo, hoặc bấm "Tất cả người trong kèo"
- **THEN** danh sách người chia đều được cập nhật theo lựa chọn, và danh sách luôn có ít nhất một người

#### Scenario: Bỏ chọn hết người chia đều bị từ chối (R-4)
- **WHEN** người dùng bỏ chọn hết người chia đều của hoá đơn
- **THEN** hệ thống từ chối với mã `EQUAL_SPLIT_EMPTY`

#### Scenario: Hoá đơn mới mặc định chia đều cho cả kèo (R-4)
- **WHEN** người dùng tạo một hoá đơn mới trong kèo
- **THEN** `equalSplitParticipantIds` mặc định gồm toàn bộ `SessionKeo.participantIds`

### Requirement: Gán người ăn và số phần cho từng món
Ở chế độ `BY_ITEM`, hệ thống SHALL cho phép tick người ăn của từng món trong số người tham gia kèo. Khi một người mới được tick, `shares` mặc định bằng 1. `shares` MUST là số nguyên dương từ 1 đến 999. Mỗi `memberId` MUST xuất hiện tối đa một lần trong `consumers` của món. Khi bỏ tick hoặc giảm `shares` về 0, người đó được gỡ khỏi `consumers`. (BR-5.6, BR-5.7, R-5, US-5.4)

#### Scenario: Tick người ăn với số phần mặc định (BR-5.6, R-5)
- **WHEN** người dùng tick một thành viên của kèo vào một món ở chế độ `BY_ITEM`
- **THEN** thành viên đó được thêm vào `consumers` của món với `shares = 1`

#### Scenario: Chọn nhanh tất cả người trong kèo (BR-5.6, AC-6)
- **WHEN** người dùng bấm nút "Tất cả" cho một món, hoặc áp dụng cho mọi món chưa gán trong hoá đơn
- **THEN** mọi thành viên của kèo được gán làm người ăn với `shares = 1` cho các món được chọn

#### Scenario: Chỉnh số phần và hiển thị tỷ lệ phần (BR-5.7, AC-6)
- **WHEN** người dùng tăng hoặc giảm số phần của một người ăn trong một món
- **THEN** `shares` được lưu là số nguyên từ 1 đến 999, và giao diện hiển thị tỷ lệ phần của người đó trên tổng số phần của món

#### Scenario: Giảm số phần về 0 gỡ người ăn (R-5)
- **WHEN** người dùng bỏ tick hoặc giảm `shares` của một người ăn về 0
- **THEN** người đó bị gỡ khỏi `consumers` của món

#### Scenario: Số phần ngoài khoảng bị từ chối (R-5)
- **WHEN** yêu cầu lưu `shares` không phải số nguyên, hoặc nhỏ hơn 1, hoặc lớn hơn 999
- **THEN** hệ thống từ chối với mã `INVALID_SHARES`

### Requirement: Số tiền tạm tính của từng người ăn
Khi món ở chế độ `BY_ITEM` có tổng số phần lớn hơn 0, giao diện SHALL hiển thị số tiền tạm tính của mỗi người ăn theo công thức `round(F_i × s_{i,m} / S_i)`, trong đó `F_i` là `finalAmount` của món, `s_{i,m}` là số phần của người đó và `S_i` là tổng số phần của món. Đây là số để đối chiếu nhanh tại chỗ; phép tính quyết toán chính thức của cả bữa thuộc Epic 6. (R-11, AC-6)

#### Scenario: Xem tiền tạm tính khi món đã có người ăn (R-11, AC-6)
- **WHEN** người dùng xem chi tiết một món ở chế độ `BY_ITEM` và món đã có tổng số phần lớn hơn 0
- **THEN** giao diện hiển thị số tiền tạm tính của từng người ăn theo công thức trên

### Requirement: Cảnh báo món chưa có người ăn
Khi hoá đơn ở chế độ `BY_ITEM` và có món với `consumers.length === 0`, giao diện SHALL hiển thị cảnh báo màu vàng đồng với nhãn "Chưa chọn người ăn" trên món đó, và đếm số món chưa gán trên tiêu đề hoá đơn. Hệ thống SHALL cho phép lưu món có `consumers = []`, vì người dùng có thể thêm món trước rồi mới gán người ăn sau. (BR-5.8, R-6, AC-7)

#### Scenario: Cảnh báo món trống khi chia từng món (BR-5.8, AC-7)
- **WHEN** hoá đơn ở `BY_ITEM` có ít nhất một món với `consumers` rỗng
- **THEN** món đó hiển thị nhãn "Chưa chọn người ăn" và tiêu đề hoá đơn hiển thị số món chưa gán

#### Scenario: Gán nhanh cả kèo cho các món trống (R-6, AC-7)
- **WHEN** hoá đơn vừa được chuyển sang `BY_ITEM` và các món đang có `consumers = []`
- **THEN** người dùng gán được tất cả người trong kèo cho mọi món bằng một thao tác, hoặc gán theo từng món

#### Scenario: Lưu món chưa có người ăn (R-6)
- **WHEN** người dùng thêm hoặc lưu một món mà chưa chọn người ăn
- **THEN** hệ thống cho phép lưu món với `consumers = []`

### Requirement: Nhất quán với người tham gia kèo và trạng thái lưu trữ của bữa
Khi bữa ở trạng thái `ARCHIVED`, mọi thao tác đổi người ứng, đổi chế độ chia, sửa danh sách chia đều, thêm, sửa, xoá món và gán người ăn hoặc số phần MUST bị khoá chỉ đọc. Hệ thống MUST không cho gán người ngoài kèo làm người ứng, người chia đều hoặc người ăn món. (BR-5.9, AC-9, US-5.1, US-5.2, US-5.3, US-5.4)

#### Scenario: Bữa đã lưu trữ khoá mọi thao tác ghi (AC-9, BR-5.9)
- **WHEN** người dùng thử đổi người ứng, đổi chế độ chia, sửa danh sách chia đều, thêm, sửa, xoá món hoặc gán người ăn của một hoá đơn trong bữa `ARCHIVED`
- **THEN** thao tác bị khoá chỉ đọc, tầng dịch vụ từ chối với mã `MEAL_ARCHIVED`, và dữ liệu không thay đổi

### Requirement: Không bỏ thành viên đang được dùng khỏi kèo
Hệ thống MUST giữ nguyên quy tắc đã cài ở `sessionService.setSessionParticipants` từ Epic 4: không cho bỏ một thành viên khỏi kèo nếu người đó là `payerMemberId` của bất kỳ hoá đơn nào, hoặc nằm trong `consumers` của bất kỳ món nào trong kèo, và báo mã `SESSION_MEMBER_IN_USE`. Thành viên mới được thêm vào kèo MUST NOT tự động được thêm vào `consumers` hay `equalSplitParticipantIds` của các hoá đơn và món đã tạo trước đó. (R-9, US-5.4)

#### Scenario: Bỏ thành viên đang ứng tiền hoặc đang ăn món bị chặn (R-9)
- **WHEN** người dùng bỏ khỏi kèo một thành viên đang là người ứng của hoá đơn hoặc đang nằm trong `consumers` của món
- **THEN** hệ thống từ chối với mã `SESSION_MEMBER_IN_USE`

#### Scenario: Thành viên mới không tự vào hoá đơn đã tạo (R-9)
- **WHEN** một thành viên được thêm vào kèo sau khi hoá đơn và món đã được tạo
- **THEN** thành viên đó không tự động xuất hiện trong `equalSplitParticipantIds` hoặc `consumers` của các hoá đơn và món đã có

### Requirement: Cập nhật thời điểm bữa khi thay đổi số tiền đã đánh dấu thanh toán
Khi bữa đã có người hoặc nhóm được tick `isPaid = true`, mọi thay đổi ảnh hưởng số tiền phải trả hoặc đã ứng MUST cập nhật `meal.updatedAt`. Các thay đổi này gồm đổi `payerMemberId`, đổi `splitType`, đổi `equalSplitParticipantIds`, thêm, sửa, xoá món, và đổi `consumers` hoặc `shares`. Các hàm ghi MUST thực thi nguyên tử trên các bảng `invoices`, `items` và `meals`. Việc cảnh báo hoặc xử lý số dư thay đổi thuộc Epic 6. (R-10)

#### Scenario: Thay đổi sau khi đã đánh dấu thanh toán (R-10)
- **WHEN** bữa đã có người hoặc nhóm được tick `isPaid = true` và người dùng đổi người ứng, đổi chế độ chia, đổi người chia đều, sửa món hoặc đổi người ăn và số phần
- **THEN** `meal.updatedAt` được cập nhật và thay đổi được ghi nguyên tử trên các bảng `invoices`, `items`, `meals`

### Requirement: Giao diện Tầng 3 dùng được trên màn hình 375 px
Giao diện Tầng 3 SHALL dùng được trên màn hình rộng 375 px mà không cuộn ngang. Mọi nút chạm MUST có vùng chạm tối thiểu 44 px, các điều khiển MUST điều khiển được bằng bàn phím, và toàn bộ test của Epic 1 đến Epic 4 MUST vẫn đạt. (AC-10)

#### Scenario: Hiển thị trên màn hình 375 px (AC-10)
- **WHEN** người dùng mở màn chi tiết bữa trên màn hình rộng 375 px
- **THEN** giao diện không cuộn ngang và mọi nút chạm có vùng chạm tối thiểu 44 px

#### Scenario: Hồi quy các epic trước vẫn đạt (AC-10)
- **WHEN** chạy toàn bộ bộ test sau khi hoàn tất Epic 5
- **THEN** toàn bộ test của Epic 1 đến Epic 4 đều đạt
