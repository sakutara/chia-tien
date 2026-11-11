# payment-sharing-snapshot Specification

## Purpose
Capability này cho phép chủ bữa chia sẻ thông báo thanh toán của một bữa gồm một Snapshot URL chỉ đọc chứa các khoản chuyển tiền, tin nhắn văn bản để gửi qua ứng dụng chat, và các slide thanh toán có mã VietQR để người nhận chuyển khoản. Người nhận mở link trên trình duyệt bất kỳ mà không cần tài khoản hay máy chủ, xem được số tiền phải chuyển và không thể sửa dữ liệu của bữa. Việc nhập thông tin ngân hàng của thành viên thuộc capability `member-directory`, còn đa ngôn ngữ thuộc `i18n`.

## Requirements

### Requirement: Tạo link chia sẻ gọn cho một bữa
Hệ thống SHALL tạo Snapshot URL từ kết quả quyết toán của bữa, kể cả bữa đang hoạt động lẫn bữa đã lưu trữ. Link mang các khoản chuyển tiền của những người được chọn kèm danh sách món mà từng người đó phải trả. Ảnh hoá đơn, văn bản OCR và đường dẫn file không bao giờ được đưa vào link.

#### Scenario: Bữa đang hoạt động
- **WHEN** người chủ bấm chia sẻ thông báo thanh toán cho một bữa có kèo và hoá đơn
- **THEN** link được tạo và mở được trên trình duyệt khác mà không cần máy chủ
- **AND** link không chứa dữ liệu ảnh, văn bản OCR hay đường dẫn file của hoá đơn

#### Scenario: Bữa đã lưu trữ
- **WHEN** người chủ tạo link cho bữa có trạng thái `ARCHIVED`
- **THEN** link vẫn được tạo với các khoản chuyển tính theo kết quả quyết toán của bữa
- **AND** danh sách món không xuất hiện vì hoá đơn gốc không còn trong bữa đã lưu trữ

### Requirement: Chỉ đưa khoản chuyển của người được chọn vào link
Hệ thống SHALL cho người chủ chọn gửi cho tất cả người phải chuyển tiền hoặc chỉ một người. Khi chỉ chọn một người, link không được chứa khoản chuyển, số dư, tài khoản ngân hàng hay món của người khác. Tài khoản của người nhận tiền vẫn có trong link vì người chuyển cần số tài khoản để chuyển.

#### Scenario: Gửi cho tất cả
- **WHEN** bữa có nhiều người phải chuyển và người chủ chọn "Tất cả"
- **THEN** link mang đủ mọi khoản chuyển của bữa

#### Scenario: Gửi cho một người
- **WHEN** người chủ chỉ chọn Bình trong danh sách những người phải chuyển
- **THEN** link chỉ có khoản chuyển của Bình
- **AND** link không chứa tên, khoản chuyển hay tài khoản ngân hàng của người phải chuyển khác
- **AND** link không chứa tài khoản ngân hàng của chính Bình

### Requirement: Định dạng tham số của link
Hệ thống SHALL đặt dữ liệu link trong tham số `s` của đường dẫn. Link gọn có dữ liệu bắt đầu bằng ký tự `~`, phần còn lại chỉ gồm chữ cái, chữ số, `-` và `_`, nên không cần mã hoá thêm khi gửi qua ứng dụng chat. Hệ thống SHALL vẫn mở được link cũ dùng tham số `snapshot` hoặc dạng đường dẫn `#/snapshot/<dữ liệu>`.

#### Scenario: Link mới
- **WHEN** người chủ sao chép Snapshot URL của một bữa
- **THEN** đường dẫn có dạng `?s=` theo sau là dữ liệu bắt đầu bằng `~`
- **AND** phần dữ liệu không chứa ký tự cần mã hoá phần trăm

#### Scenario: Link cũ
- **WHEN** ứng dụng mở đường dẫn `?snapshot=<dữ liệu>` hoặc `#/snapshot/<dữ liệu>`
- **THEN** trang xem Snapshot hiển thị bữa theo dữ liệu đó

#### Scenario: Dấu cộng bị đổi thành khoảng trắng
- **WHEN** dữ liệu link cũ có dấu `+` nhưng trình duyệt đã đổi thành khoảng trắng khi đọc tham số
- **THEN** hệ thống khôi phục dấu `+` trước khi giải mã và link vẫn mở được

### Requirement: Dạng dữ liệu đầy đủ và phiên bản định dạng
Hệ thống SHALL giải mã được dạng dữ liệu JSON đầy đủ có trường `v` bằng 1, gồm thông tin bữa, thành viên, nhóm thanh toán, kèo, hoá đơn, món, trạng thái tick thanh toán và tóm tắt lưu trữ. Dạng gọn cũng mang số phiên bản định dạng, và dữ liệu có phiên bản không nhận biết được phải bị từ chối như link hỏng.

#### Scenario: Thiếu trường tuỳ chọn của hoá đơn
- **WHEN** link JSON phiên bản 1 không có `discountMode` và `serviceMode` của một hoá đơn
- **THEN** hai trường này được hiểu là `NONE` và link vẫn mở được

#### Scenario: Phiên bản không nhận biết được
- **WHEN** dữ liệu link có trường `v` bằng 2
- **THEN** hệ thống báo link không hợp lệ thay vì cố hiển thị

### Requirement: Xử lý link hỏng hoặc bị cắt
Hệ thống SHALL báo lỗi `INVALID_SNAPSHOT` với thông điệp "Link Snapshot không hợp lệ hoặc đã bị cắt bớt khi gửi tin nhắn." khi link rỗng, bị cắt cụt, chứa ký tự ngoài bảng ký tự hợp lệ, không giải nén được hoặc sai cấu trúc. Trang xem phải hiển thị thông điệp, gợi ý hỏi lại người gửi và có nút về trang chủ, không được làm trắng trang.

#### Scenario: Link bị cắt
- **WHEN** người dùng mở link đã bị cắt mất một nửa hoặc vài ký tự cuối
- **THEN** trang hiện thông điệp lỗi trong khung cảnh báo và nút "Về trang chủ ứng dụng của tôi"

#### Scenario: Link rỗng
- **WHEN** người dùng mở trang xem Snapshot với dữ liệu rỗng
- **THEN** trang hiện cùng thông điệp lỗi và không gặp lỗi khi chạy

#### Scenario: Ký tự lạ trong link gọn
- **WHEN** link gọn có thêm ký tự ngoài bảng ký tự hợp lệ ở cuối
- **THEN** hệ thống báo `INVALID_SNAPSHOT`

### Requirement: Trang xem Snapshot chỉ đọc
Hệ thống SHALL hiển thị bữa lấy từ link hoàn toàn trong bộ nhớ tạm. Trang không có ô nhập, hộp đánh dấu, nút thêm, sửa hoặc xoá, và không có dữ liệu nào từ link được ghi vào IndexedDB của trình duyệt đang mở link.

#### Scenario: Mở link không để lại dữ liệu
- **WHEN** người dùng mở link rồi xem các tab của trang
- **THEN** không có bữa nào được tạo trong IndexedDB của trình duyệt đó
- **AND** không có ô nhập, hộp đánh dấu hay nút sửa, xoá nào trên trang

### Requirement: Thanh tiêu đề và thoát chế độ xem
Hệ thống SHALL hiển thị ở đầu trang một thanh trạng thái có tên bữa và nút "Về trang chủ ứng dụng của tôi". Khi người dùng bấm nút này, hệ thống xoá phần tham số của link khỏi thanh địa chỉ và quay về danh sách bữa cá nhân.

#### Scenario: Thoát về trang chủ
- **WHEN** người dùng bấm "Về trang chủ ứng dụng của tôi"
- **THEN** trang xem gọi hành động thoát một lần
- **AND** địa chỉ không còn phần tham số sau đường dẫn và trở về `#/`

### Requirement: Tab Hoá đơn và Chia tiền
Hệ thống SHALL mở trang xem ở tab "Chia tiền" mặc định. Tab "Hoá đơn" chỉ xuất hiện khi link có danh sách món hoặc có kèo đầy đủ; link chỉ có khoản chuyển thì trang không có tab nào và chỉ hiện phần chia tiền. Với danh sách món, các món được gom theo người phải trả, mỗi dòng ghi tên món, tên kèo và số tiền phần của người đó.

#### Scenario: Link có danh sách món
- **WHEN** link mang món theo người phải trả
- **THEN** tab "Hoá đơn" hiện từng người phải trả với tổng số tiền và từng món kèm tên kèo

#### Scenario: Link chỉ có khoản chuyển
- **WHEN** link không có món và không có kèo
- **THEN** trang không có tab nào và hiện các khoản chuyển tiền

#### Scenario: Link đầy đủ có kèo và hoá đơn
- **WHEN** link ở dạng JSON đầy đủ có kèo và hoá đơn
- **THEN** tab "Hoá đơn" liệt kê từng kèo, từng hoá đơn và từng món kèm người tham gia, cùng các khoản giảm giá, phí phục vụ và VAT nếu có

### Requirement: Lọc khoản chuyển theo người
Hệ thống SHALL cho lọc các khoản chuyển theo một người trong số những người phải chuyển tiền, mặc định hiện tất cả. Khi chọn một người, chỉ hiện các khoản mà người đó là bên chuyển hoặc bên nhận. Danh sách lọc chỉ hiện khi có từ hai người phải chuyển tiền trở lên.

#### Scenario: Chọn một người
- **WHEN** người xem bấm tên Cường trong danh sách lọc
- **THEN** chỉ hiện khoản Cường chuyển cho An

#### Scenario: Bỏ lọc
- **WHEN** người xem bấm "Tất cả" sau khi đã chọn một người
- **THEN** hiện lại đủ mọi khoản chuyển của bữa

### Requirement: Nội dung tin nhắn thanh toán
Hệ thống SHALL soạn tin nhắn thanh toán gồm dòng đầu là tên bữa, mỗi người phải chuyển tiền một dòng bắt đầu bằng "- " kèm tên người đó, và dòng cuối là Snapshot URL. Các khoản của cùng một người được nối trên một dòng bằng dấu phẩy, theo mẫu "chuyển cho <người nhận> <số tiền>". Nhóm thanh toán được hiển thị bằng tên các thành viên nối với nhau bởi " + ".

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

### Requirement: Hộp thoại chia sẻ thanh toán
Hệ thống SHALL mở hộp thoại chia sẻ có bản xem trước tin nhắn, trong đó Snapshot URL được rút gọn còn 36 ký tự đầu và dấu "…". Nội dung sao chép hoặc chia sẻ vẫn chứa link đầy đủ. Hộp thoại có nút gửi nhanh qua Facebook và Zalo, mở liên kết chia sẻ của hai nền tảng đó với Snapshot URL, và có công tắc "Gửi QR" để chuyển sang chế độ ảnh.

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

### Requirement: Sao chép tin nhắn hoặc link
Hệ thống SHALL cho sao chép toàn bộ tin nhắn hoặc riêng Snapshot URL vào bộ nhớ tạm. Sau khi sao chép thành công, hộp thoại hiện trạng thái "Đã sao chép" cạnh các nút trong 2 giây rồi tự ẩn. Nếu API bộ nhớ tạm không được cấp quyền thì dùng cách dự phòng; nếu cả hai cách đều thất bại thì hiện lỗi "Không sao chép được. Hãy chọn và sao chép thủ công."

#### Scenario: Sao chép thành công
- **WHEN** người chủ bấm "Sao chép toàn bộ tin nhắn"
- **THEN** bộ nhớ tạm nhận đúng nội dung tin nhắn và hiện trạng thái "Đã sao chép"

#### Scenario: Sao chép thất bại
- **WHEN** cả API bộ nhớ tạm lẫn cách dự phòng đều không dùng được
- **THEN** hộp thoại hiện thông điệp lỗi hướng dẫn sao chép thủ công

### Requirement: Chia sẻ qua menu của thiết bị
Hệ thống SHALL chỉ hiện nút "Chia sẻ qua ứng dụng khác" khi trình duyệt hỗ trợ Web Share API. Nút mở menu chia sẻ của hệ điều hành với tên bữa và nội dung tin nhắn. Nếu người dùng tự đóng menu thì không báo lỗi. Nếu trình duyệt không hỗ trợ, nút sao chép trở thành hành động chính và hộp thoại hiện ghi chú hướng dẫn dùng sao chép hoặc các liên kết Facebook, Zalo.

#### Scenario: Người dùng đóng menu
- **WHEN** người dùng mở menu chia sẻ rồi đóng lại mà không chọn ứng dụng
- **THEN** hộp thoại không hiện thông điệp lỗi

#### Scenario: Trình duyệt không hỗ trợ
- **WHEN** trình duyệt không có Web Share API
- **THEN** không có nút "Chia sẻ qua ứng dụng khác"
- **AND** nút "Sao chép toàn bộ tin nhắn" là nút chính

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

### Requirement: Mã VietQR chuyển khoản
Hệ thống SHALL dựng mã VietQR theo chuẩn EMVCo cho dịch vụ chuyển nhanh NAPAS 247, từ mã BIN của ngân hàng, số tài khoản, số tiền làm tròn và nội dung chuyển khoản. Mã chỉ được dựng khi người nhận có tài khoản, có đơn vị tiền VND và có CRC-16 kiểm tra theo `CRC-16/CCITT-FALSE`. Nội dung chuyển khoản được bỏ dấu, chỉ giữ chữ cái không dấu, chữ số và khoảng trắng, tối đa 50 ký tự.

#### Scenario: Nội dung mặc định
- **WHEN** Bình nợ trong bữa tên "Lẩu cuối tuần Đà Lạt!"
- **THEN** nội dung chuyển khoản là "Binh thanh toan Lau cuoi tuan Da Lat"

#### Scenario: Nội dung quá dài
- **WHEN** nội dung chuyển khoản dài 80 ký tự
- **THEN** nội dung trong mã được cắt còn 50 ký tự

#### Scenario: Người nhận là nhóm
- **WHEN** người nhận là nhóm thanh toán có ít nhất một thành viên có tài khoản
- **THEN** mã QR dùng tài khoản của thành viên đầu tiên có thông tin ngân hàng trong nhóm
- **AND** nếu bữa ở chế độ nhờ chủ trì và nhóm chứa chủ trì thì tài khoản của chủ trì được ưu tiên

### Requirement: Chuyển khoản qua app ngân hàng
Hệ thống SHALL cho người nhận có tài khoản bấm "Thanh toán bằng ngân hàng" để mở menu chia sẻ của thiết bị với nội dung gồm tên người nhận, tên ngân hàng, tên và số tài khoản, số tiền, nội dung chuyển khoản, và ảnh QR PNG nếu thiết bị chia sẻ được tệp. Với ngân hàng được hỗ trợ, slide có liên kết mở thẳng app kèm số tiền và nội dung; với app không tự điền thì hiện lời nhắc dán thông tin đã sao chép.

#### Scenario: Chia sẻ tới app ngân hàng
- **WHEN** người xem bấm "Thanh toán bằng ngân hàng" trên slide có tài khoản
- **THEN** menu chia sẻ mở với nội dung chứa số tài khoản và số tiền

#### Scenario: Thiết bị không hỗ trợ chia sẻ
- **WHEN** người xem bấm "Thanh toán bằng ngân hàng" trên thiết bị không có Web Share API
- **THEN** thông tin chuyển khoản được sao chép vào bộ nhớ tạm
- **AND** hệ thống hiện thông điệp cho biết thiết bị không hỗ trợ chia sẻ trực tiếp và đã sao chép thông tin

#### Scenario: Ngân hàng chưa được hỗ trợ mở app
- **WHEN** slide có tài khoản người nhận nhưng BIN của ngân hàng không nằm trong danh sách app hỗ trợ
- **THEN** slide không có liên kết "Mở app" và vẫn có nút "Thanh toán bằng ngân hàng"

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

### Requirement: Mã hoá nhị phân cho link gọn
Hệ thống SHALL mã hoá link gọn theo thứ tự sau: số nguyên dạng varint, các chuỗi gom vào một bảng và mỗi chuỗi chỉ lưu một lần, nén deflate với từ điển dựng sẵn, đổi sang base64url, rồi đặt tiền tố `~` ở đầu dữ liệu. Hệ thống SHALL giải mã được dữ liệu đó bằng cùng quy trình ngược lại.

#### Scenario: Nhiều khoản chuyển cho cùng một người
- **WHEN** hai khoản chuyển cùng gửi cho An trong một link gọn
- **THEN** tên An chỉ xuất hiện một lần trong bảng tên của dữ liệu đã mã hoá

#### Scenario: Nhiều khoản chuyển đến cùng một tài khoản
- **WHEN** hai khoản chuyển cùng gửi đến một tài khoản ngân hàng
- **THEN** thông tin tài khoản đó chỉ được lưu một lần trong bảng tài khoản

#### Scenario: Nội dung chuyển khoản mặc định
- **WHEN** nội dung chuyển khoản của một khoản bằng với nội dung mặc định được dựng từ tên người chuyển và tiêu đề bữa
- **THEN** link không chứa nội dung đó
- **AND** khi giải mã, nội dung được dựng lại từ tên người chuyển và tiêu đề bữa trong link

#### Scenario: Dữ liệu nén không ngắn hơn
- **WHEN** nén deflate không làm dữ liệu ngắn hơn
- **THEN** hệ thống lưu dữ liệu chưa nén và tắt cờ nén trong byte đầu

#### Scenario: Số không nguyên hoặc âm
- **WHEN** một số tiền trong link không phải số nguyên không âm
- **THEN** link rơi về dạng JSON nén lz-string của cùng dữ liệu
- **AND** link đó vẫn mở được và hiển thị đúng số tiền

### Requirement: Phiên bản định dạng và từ điển nén
Hệ thống SHALL ghi vào byte đầu của link gọn một cờ nén deflate và số phiên bản định dạng, hiện là 1. Từ điển nén dựng sẵn SHALL giữ nguyên cho phiên bản 1, vì đổi một byte của từ điển làm mọi link đã gửi không giải mã được. Khi cần đổi định dạng, hệ thống SHALL tăng số phiên bản và giữ từ điển cũ để giải mã link của phiên bản trước.

#### Scenario: Link đã gửi được mở sau này
- **WHEN** người nhận mở một link gọn đã được tạo bởi phiên bản 1
- **THEN** hệ thống giải mã được dữ liệu bằng từ điển dựng sẵn của phiên bản 1

#### Scenario: Phiên bản không nhận biết được
- **WHEN** byte đầu của link gọn chứa số phiên bản khác 1
- **THEN** hệ thống báo `INVALID_SNAPSHOT` thay vì cố hiển thị

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
