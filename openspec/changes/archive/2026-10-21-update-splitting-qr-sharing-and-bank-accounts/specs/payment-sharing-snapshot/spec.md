## MODIFIED Requirements

### Requirement: Hộp thoại chia sẻ thanh toán
Hệ thống SHALL mở hộp thoại chia sẻ có bản xem trước tin nhắn, trong đó Snapshot URL được rút gọn còn 36 ký tự đầu và dấu "…". Nội dung sao chép hoặc chia sẻ vẫn chứa link đầy đủ. Hộp thoại có nút gửi nhanh qua Facebook và Zalo, mở liên kết chia sẻ của hai nền tảng đó với Snapshot URL, và có nút chuyển "Gửi QR" / "Gửi link" để chuyển sang chế độ ảnh.

**Trước đây**: Hộp thoại có công tắc "Chỉ khoản chưa trả" để chỉ liệt kê người chưa thanh toán. Nút gửi nhanh gửi nội dung tin nhắn qua SMS, Telegram, WhatsApp và Email, không có Facebook và Zalo. Không có chế độ gửi ảnh QR.

#### Scenario: Xem trước và sao chép
- **WHEN** người chủ mở hộp thoại chia sẻ rồi bấm "Chỉ sao chép Link Snapshot"
- **THEN** bản xem trước chỉ hiện link rút gọn
- **AND** bộ nhớ tạm nhận link đầy đủ bắt đầu bằng `http` và chứa `?s=`

#### Scenario: Link dài
- **WHEN** Snapshot URL dài hơn 4000 ký tự
- **THEN** hộp thoại hiện cảnh báo rằng link có thể bị cắt khi gửi và nên dùng ứng dụng chat hỗ trợ tin nhắn dài

#### Scenario: Gửi nhanh qua Facebook
- **WHEN** người chủ bấm liên kết Facebook
- **THEN** trình duyệt mở liên kết chia sẻ Facebook mang Snapshot URL

#### Scenario: Gửi nhanh qua Zalo
- **WHEN** người chủ bấm liên kết Zalo
- **THEN** trình duyệt mở liên kết chia sẻ Zalo mang Snapshot URL

### Requirement: Nội dung tin nhắn thanh toán
Hệ thống SHALL soạn tin nhắn thanh toán gồm dòng đầu là tên bữa, mỗi người phải chuyển tiền một dòng bắt đầu bằng "- " kèm tên người đó, và dòng cuối là Snapshot URL. Các khoản của cùng một người được nối trên một dòng bằng dấu phẩy, theo mẫu "chuyển cho <người nhận> <số tiền>". Nhóm thanh toán được hiển thị bằng tên các thành viên nối với nhau bởi " + ".

**Trước đây**: Hộp thoại có tuỳ chọn "Chỉ liệt kê khoản chưa thanh toán" (Epic 8, R-4). Khi bật, người đã tick thanh toán bị bỏ khỏi tin nhắn.

#### Scenario: Cá nhân và nhóm cùng phải chuyển
- **WHEN** Bình phải chuyển cho An hai khoản 150.000 ₫ và 80.000 ₫, còn nhóm Cường và Dung phải chuyển cho An 80.000 ₫
- **THEN** tin nhắn có dòng "- Bình: chuyển cho An 150.000 ₫, chuyển cho An 80.000 ₫"
- **AND** tin nhắn có dòng "- Cường + Dung: chuyển cho An 80.000 ₫"

#### Scenario: Không còn khoản phải chuyển
- **WHEN** không có người nào còn khoản chuyển tiền có số tiền dương
- **THEN** dòng thân của tin nhắn là "- Tất cả các khoản thanh toán đã hoàn tất."

#### Scenario: Chế độ nhờ chủ trì
- **WHEN** bữa ở chế độ nhờ chủ trì thu và nhóm nhận tiền có chứa chủ trì
- **THEN** người nhận trong tin nhắn hiển thị tên cá nhân của chủ trì

### Requirement: Mã VietQR chuyển khoản
Hệ thống SHALL dựng mã VietQR theo chuẩn EMVCo cho dịch vụ chuyển nhanh NAPAS 247, từ mã BIN của ngân hàng, số tài khoản, số tiền làm tròn và nội dung chuyển khoản. Mã chỉ được dựng khi người nhận có tài khoản, có đơn vị tiền VND và có CRC-16 kiểm tra theo `CRC-16/CCITT-FALSE`. Nội dung chuyển khoản được bỏ dấu, chỉ giữ chữ cái không dấu, chữ số và khoảng trắng, tối đa 50 ký tự.

**Trước đây**: Với người nhận là nhóm, tài khoản được lấy theo thứ tự: chủ trì (nếu nằm trong nhóm và bữa nhờ chủ trì), đại diện nhóm (`representativeId`), chủ trì, rồi thành viên đầu tiên có tài khoản. Đại diện nhóm được ưu tiên trước thành viên đầu tiên.

#### Scenario: Nội dung mặc định
- **WHEN** Bình nợ trong bữa tên "Lẩu cuối tuần Đà Lạt!"
- **THEN** nội dung chuyển khoản là "Binh thanh toan Lau cuoi tuan Da Lat"

#### Scenario: Nội dung quá dài
- **WHEN** nội dung chuyển khoản dài 80 ký tự
- **THEN** nội dung trong mã được cắt còn 50 ký tự

#### Scenario: Người nhận là nhóm
- **WHEN** người nhận là nhóm thanh toán có ít nhất một thành viên có tài khoản
- **THEN** mã QR dùng tài khoản của thành viên đầu tiên có thông tin ngân hàng trong nhóm, không dùng đại diện nhóm
- **AND** nếu bữa ở chế độ nhờ chủ trì và nhóm chứa chủ trì thì tài khoản của chủ trì được ưu tiên

## ADDED Requirements

### Requirement: Slide thanh toán
Hệ thống SHALL hiển thị mỗi khoản chuyển tiền thành một slide có tên người chuyển và người nhận, số tiền, nội dung chuyển khoản và mã QR. Người xem chuyển slide bằng nút trước và sau hoặc vuốt, kèm bộ đếm dạng "n/m". Khoản chuyển giữa hai bên cùng một nhóm thanh toán không tạo slide.

#### Scenario: Hai bên cùng nhóm
- **WHEN** hai thực thể thanh toán có chung thành viên
- **THEN** không có slide nào cho khoản giữa hai thực thể đó

#### Scenario: Người nhận chưa có tài khoản
- **WHEN** người nhận chưa nhập thông tin ngân hàng
- **THEN** slide vẫn hiện số tiền và nội dung nhưng không có mã QR
- **AND** slide hiện lưu ý rằng người nhận chưa có thông tin ngân hàng nên chưa tạo được mã QR

#### Scenario: Sao chép số tài khoản
- **WHEN** người xem bấm sao chép số tài khoản hoặc nội dung trên slide
- **THEN** bộ nhớ tạm nhận đúng giá trị tương ứng

### Requirement: Chuyển khoản qua app ngân hàng
Hệ thống SHALL cho người nhận có tài khoản bấm "Thanh toán bằng ngân hàng" để mở menu chia sẻ của thiết bị với nội dung gồm tên người nhận, tên ngân hàng, tên và số tài khoản, số tiền, nội dung chuyển khoản, và ảnh QR PNG nếu thiết bị chia sẻ được tệp. Với ngân hàng được hỗ trợ, slide có liên kết mở thẳng app kèm số tiền và nội dung; với app không tự điền thì hiện lời nhắc dán thông tin đã sao chép.

#### Scenario: Chia sẻ tới app ngân hàng
- **WHEN** người xem bấm "Thanh toán bằng ngân hàng" trên slide có tài khoản
- **THEN** menu chia sẻ mở với nội dung chứa số tài khoản và số tiền

#### Scenario: Thiết bị không hỗ trợ chia sẻ
- **WHEN** người xem bấm "Thanh toán bằng ngân hàng" trên thiết bị không có Web Share API
- **THEN** thông tin chuyển khoản được sao chép vào bộ nhớ tạm
- **AND** hệ thống hiện thông điệp cho biết thiết bị không hỗ trợ chia sẻ trực tiếp và đã sao chép thông tin

#### Scenario: Người nhận chưa có tài khoản
- **WHEN** slide không có tài khoản người nhận
- **THEN** không có nút "Thanh toán bằng ngân hàng"

### Requirement: Ảnh PNG các khoản chuyển
Hệ thống SHALL xuất các khoản chuyển đang chọn thành một ảnh PNG xếp dọc, mỗi khoản một thẻ gồm tên hai bên, số tiền, mã QR nếu có, tên ngân hàng, số tài khoản và nội dung. Ảnh không có tiêu đề bữa hay thanh tab. Người dùng tải ảnh về máy, và nếu thiết bị chia sẻ được tệp thì có thêm nút chia sẻ ảnh qua menu của thiết bị.

#### Scenario: Gửi QR trong hộp thoại
- **WHEN** người chủ bật "Gửi QR" trong hộp thoại chia sẻ
- **THEN** hộp thoại hiện ảnh PNG của các khoản chuyển theo người nhận đã chọn

#### Scenario: Tải ảnh về máy
- **WHEN** người chủ bấm "Tải ảnh QR (PNG)"
- **THEN** tệp PNG được tải về với tên là tên bữa đã cắt khoảng trắng và đuôi `.png`, hoặc `chia-tien.png` nếu bữa không có tên

### Requirement: Mở QR từng khoản chuyển tiền
Hệ thống SHALL hiển thị nút mở QR ở từng khoản chuyển tiền chưa thanh toán trong mục quyết toán. Bấm nút mở slide của đúng khoản đó trong hộp thoại. Khoản đã được tick thanh toán không có nút này.

#### Scenario: Khoản chưa chuyển
- **WHEN** người xem bấm nút QR ở khoản Bình chuyển cho An chưa được tick thanh toán
- **THEN** hộp thoại QR hiện slide của đúng khoản đó

#### Scenario: Khoản đã chuyển
- **WHEN** khoản chuyển đã được tick thanh toán
- **THEN** khoản đó không có nút QR

#### Scenario: Người nhận chưa có tài khoản
- **WHEN** người nhận của khoản chưa có thông tin ngân hàng và người xem bấm nút QR
- **THEN** slide mở ra không có mã QR và hiện lưu ý người nhận chưa có thông tin ngân hàng

## REMOVED Requirements

### Requirement: Chỉ liệt kê khoản chưa thanh toán khi chia sẻ
**Reason**: Lịch sử không ghi lý do. Commit `f5261e5` (2026-10-21) chỉ ghi là bỏ "chỉ khoản chưa trả". Không xác định được từ lịch sử.
**Migration**: Không có dữ liệu cần chuyển đổi. Người chủ tự chọn người cần nhắc trong danh sách "Gửi cho" của hộp thoại chia sẻ (requirement "Chỉ đưa khoản chuyển của người được chọn vào link"). Tin nhắn không còn tự lọc theo tick thanh toán.
