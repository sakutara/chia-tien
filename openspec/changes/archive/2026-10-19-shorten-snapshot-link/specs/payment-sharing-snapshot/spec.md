## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Tạo link chia sẻ gọn cho một bữa
Hệ thống SHALL tạo Snapshot URL từ kết quả quyết toán của bữa, kể cả bữa đang hoạt động lẫn bữa đã lưu trữ. Link chỉ mang các khoản chuyển tiền của bữa, hoặc của những người được chọn trong hộp thoại chia sẻ. Hộp thoại chia sẻ luôn kèm danh sách món theo người phải chuyển tiền, với số tiền phần của người đó, để người nhận xem được tab Hoá đơn. Ảnh hoá đơn, văn bản OCR và đường dẫn file không bao giờ được đưa vào link.

**Trước đây**: link mang toàn bộ dữ liệu ba tầng của bữa (bữa, thành viên, nhóm, kèo, hoá đơn, món, trạng thái tick thanh toán và tóm tắt lưu trữ) dưới dạng JSON nén lz-string gắn vào `?snapshot=`.

#### Scenario: Bữa đang hoạt động
- **WHEN** người chủ bấm chia sẻ thông báo thanh toán cho một bữa có kèo và hoá đơn
- **THEN** link được tạo và mở được trên trình duyệt khác mà không cần máy chủ
- **AND** link không chứa dữ liệu ảnh, văn bản OCR hay đường dẫn file của hoá đơn

#### Scenario: Hộp thoại kèm món của người nhận
- **WHEN** người chủ mở hộp thoại chia sẻ cho bữa có kèo và hoá đơn có món
- **THEN** link chứa danh sách món theo người phải chuyển tiền và số tiền phần của người đó
- **AND** link không chứa món của người phải chuyển khác

#### Scenario: Bữa đã lưu trữ
- **WHEN** người chủ tạo link cho bữa có trạng thái `ARCHIVED`
- **THEN** link vẫn được tạo với các khoản chuyển tính theo kết quả quyết toán của bữa
- **AND** danh sách món không xuất hiện vì hoá đơn đã bị xoá khi lưu trữ, và món chỉ được dựng từ hoá đơn còn trong bữa

### Requirement: Chỉ đưa khoản chuyển của người được chọn vào link
Hệ thống SHALL cho người chủ chọn gửi cho tất cả người phải chuyển tiền hoặc chỉ một người, bằng các nút kiểu radio trong hộp thoại chia sẻ. Các nút chọn người chỉ hiện khi có từ hai người phải chuyển tiền trở lên. Khi chỉ chọn một người, link không được chứa khoản chuyển, số dư, tài khoản ngân hàng hay món của người khác. Tài khoản của người nhận tiền vẫn có trong link vì người chuyển cần số tài khoản để chuyển.

**Trước đây**: người chủ chọn được nhiều người nhận cùng lúc bằng các nút bật tắt (`aria-pressed`).

#### Scenario: Gửi cho tất cả
- **WHEN** bữa có nhiều người phải chuyển và người chủ chọn "Tất cả"
- **THEN** link mang đủ mọi khoản chuyển của bữa

#### Scenario: Gửi cho một người
- **WHEN** người chủ chỉ chọn Bình trong danh sách những người phải chuyển
- **THEN** link chỉ có khoản chuyển của Bình
- **AND** link không chứa tên, khoản chuyển hay tài khoản ngân hàng của người phải chuyển khác
- **AND** link không chứa tài khoản ngân hàng của chính Bình

#### Scenario: Chọn người khác
- **WHEN** người chủ đã chọn Bình rồi bấm Cường
- **THEN** chỉ Cường còn được chọn và link chỉ có khoản chuyển của Cường

### Requirement: Định dạng tham số của link
Hệ thống SHALL đặt dữ liệu link trong tham số `s` của đường dẫn. Link gọn có dữ liệu bắt đầu bằng ký tự `~`, phần còn lại chỉ gồm chữ cái, chữ số, `-` và `_`, nên không cần mã hoá thêm khi gửi qua ứng dụng chat. Hệ thống SHALL vẫn mở được link cũ dùng tham số `snapshot` hoặc dạng đường dẫn `#/snapshot/<dữ liệu>`.

**Trước đây**: link dùng tham số `snapshot` với chuỗi nén lz-string có bảng ký tự `+` và `$`, hai ký tự này bị mã hoá thành `%2B` và `%24` khi gửi qua URL.

#### Scenario: Link mới
- **WHEN** người chủ sao chép Snapshot URL của một bữa
- **THEN** đường dẫn có dạng `?s=` theo sau là dữ liệu bắt đầu bằng `~`
- **AND** phần dữ liệu không chứa ký tự cần mã hoá phần trăm

#### Scenario: Link cũ
- **WHEN** ứng dụng mở đường dẫn `?snapshot=<dữ liệu>` hoặc `#/snapshot/<dữ liệu>`
- **THEN** trang xem Snapshot hiển thị bữa theo dữ liệu đó

#### Scenario: Dấu cộng bị đổi thành khoảng trắng
- **WHEN** dữ liệu link cũ dùng tham số `snapshot` có dấu `+` nhưng trình duyệt đã đổi thành khoảng trắng khi đọc tham số
- **THEN** hệ thống khôi phục dấu `+` trước khi giải mã và link vẫn mở được

### Requirement: Dạng dữ liệu đầy đủ và phiên bản định dạng
Hệ thống SHALL giải mã được dạng JSON đầy đủ có trường `v` bằng 1, gồm thông tin bữa, thành viên, nhóm thanh toán, kèo, hoá đơn, món, trạng thái tick thanh toán và tóm tắt lưu trữ. Dạng JSON đầy đủ chỉ tồn tại trong link tạo trước khi rút gọn, ứng dụng không còn tạo ra dạng này. Dữ liệu có phiên bản không nhận biết được phải bị từ chối như link hỏng.

**Trước đây**: mọi link đều là JSON đầy đủ có trường `v` bằng 1, nén lz-string, và ứng dụng tạo ra dạng này khi chia sẻ.

#### Scenario: Thiếu trường tuỳ chọn của hoá đơn
- **WHEN** link JSON phiên bản 1 không có `discountMode` và `serviceMode` của một hoá đơn
- **THEN** hai trường này được hiểu là `NONE` và link vẫn mở được

#### Scenario: Phiên bản không nhận biết được
- **WHEN** dữ liệu link có trường `v` bằng 2
- **THEN** hệ thống báo link không hợp lệ thay vì cố hiển thị

### Requirement: Xử lý link hỏng hoặc bị cắt
Hệ thống SHALL báo lỗi `INVALID_SNAPSHOT` với thông điệp "Link Snapshot không hợp lệ hoặc đã bị cắt bớt khi gửi tin nhắn." khi link rỗng, bị cắt cụt, chứa ký tự ngoài bảng ký tự hợp lệ của dạng đang dùng, không giải nén được hoặc sai cấu trúc. Trang xem phải hiển thị thông điệp, gợi ý hỏi lại người gửi và có nút về trang chủ, không được làm trắng trang.

**Trước đây**: lỗi được báo cho link lz-string khi link bị cắt cụt, rỗng hoặc sai cấu trúc. Bảng ký tự hợp lệ là bảng của lz-string, gồm chữ cái, chữ số, `+`, `-`, `$`.

#### Scenario: Link bị cắt
- **WHEN** người dùng mở link đã bị cắt mất một nửa hoặc vài ký tự cuối
- **THEN** trang hiện thông điệp lỗi trong khung cảnh báo và nút "Về trang chủ ứng dụng của tôi"

#### Scenario: Link rỗng
- **WHEN** người dùng mở trang xem Snapshot với dữ liệu rỗng
- **THEN** trang hiện cùng thông điệp lỗi và không gặp lỗi khi chạy

#### Scenario: Ký tự lạ trong link gọn
- **WHEN** link gọn có thêm ký tự ngoài bảng base64url ở cuối
- **THEN** hệ thống báo `INVALID_SNAPSHOT`

### Requirement: Thanh tiêu đề và thoát chế độ xem
Hệ thống SHALL hiển thị ở đầu trang một thanh có tên bữa và nút "Về trang chủ ứng dụng của tôi". Thanh có `aria-label` "Chế độ xem Snapshot" để trình đọc màn hình nhận biết đang ở chế độ chỉ đọc. Khi người dùng bấm nút này, hệ thống xoá phần tham số của link khỏi thanh địa chỉ và quay về danh sách bữa cá nhân.

**Trước đây**: thanh có dòng chữ "CHẾ ĐỘ XEM SNAPSHOT (CHỈ ĐỌC)" hiển thị trên màn hình, theo tài liệu Epic 8 mục B.2.

#### Scenario: Thanh hiện tên bữa
- **WHEN** người xem mở link của bữa tên "Lẩu cuối tuần Đà Lạt"
- **THEN** thanh đầu trang hiện đúng tên bữa đó

#### Scenario: Thoát về trang chủ
- **WHEN** người dùng bấm "Về trang chủ ứng dụng của tôi"
- **THEN** trang xem gọi hành động thoát một lần
- **AND** địa chỉ không còn phần tham số sau đường dẫn và trở về `#/`

### Requirement: Tab Hoá đơn và Chia tiền
Hệ thống SHALL mở trang xem ở tab "Chia tiền" mặc định. Tab "Hoá đơn" chỉ xuất hiện khi link có danh sách món hoặc có kèo đầy đủ; link chỉ có khoản chuyển thì trang không có tab nào và chỉ hiện phần chia tiền. Trang xem tự dựng hai tab này từ dữ liệu của link. Với danh sách món, các món được gom theo người phải trả, mỗi dòng ghi tên món, tên kèo và số tiền phần của người đó.

**Trước đây**: trang xem tái sử dụng bảng quyết toán (`EntitySettlementRow`), `TransferInstructionList` và `MemberBreakdownDialog` của ứng dụng chính, và tab Hoá đơn liệt kê hoá đơn theo từng kèo, theo tài liệu Epic 8 mục B.3 và B.5.

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
Hệ thống SHALL cho lọc các khoản chuyển theo một người trong số những người phải chuyển tiền, bằng các nút kiểu radio, mặc định hiện tất cả. Khi chọn một người, chỉ hiện các khoản mà người đó là bên chuyển hoặc bên nhận. Danh sách lọc chỉ hiện khi có từ hai người phải chuyển tiền trở lên.

**Trước đây**: các nút lọc là nút bật tắt (`aria-pressed`), người xem chọn được nhiều người cùng lúc.

#### Scenario: Chọn một người
- **WHEN** người xem bấm tên Cường trong danh sách lọc
- **THEN** chỉ hiện khoản Cường chuyển cho An

#### Scenario: Bỏ lọc
- **WHEN** người xem bấm "Tất cả" sau khi đã chọn một người
- **THEN** hiện lại đủ mọi khoản chuyển của bữa

### Requirement: Nội dung tin nhắn thanh toán
Hệ thống SHALL soạn tin nhắn thanh toán gồm dòng đầu là tên bữa, mỗi người phải chuyển tiền một dòng bắt đầu bằng "- " kèm tên người đó, và dòng cuối là Snapshot URL. Các khoản của cùng một người được nối trên một dòng bằng dấu phẩy, theo mẫu "chuyển cho <người nhận> <số tiền>". Nhóm thanh toán được hiển thị bằng tên các thành viên nối với nhau bởi " + ". Tin nhắn luôn liệt kê mọi khoản chuyển của những người được chọn, kể cả khoản đã được tick thanh toán.

**Trước đây**: mỗi khoản theo mẫu "nợ <người nhận> <số tiền>" theo tài liệu Epic 8 mục BR-8.5.

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
Hệ thống SHALL mở hộp thoại chia sẻ có bản xem trước tin nhắn, trong đó Snapshot URL được rút gọn còn 36 ký tự đầu và dấu "…". Bản xem trước chỉ rút gọn hiển thị, nội dung sao chép hoặc chia sẻ vẫn chứa link đầy đủ. Hộp thoại có công tắc chuyển giữa "Gửi link" và "Gửi QR", nút gửi nhanh qua Facebook và Zalo mở liên kết chia sẻ của hai nền tảng đó với Snapshot URL, và không có tuỳ chọn lọc chỉ liệt kê khoản chưa thanh toán.

**Trước đây**: theo tài liệu Epic 8 (R-4 và mục B.3), hộp thoại có tuỳ chọn "Chỉ liệt kê khoản chưa thanh toán". Hộp thoại chưa có nút chuyển "Gửi QR". Tuỳ chọn "Chỉ liệt kê khoản chưa thanh toán" bị bỏ ở commit `f5261e5`.

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

#### Scenario: Gửi QR
- **WHEN** người chủ bật "Gửi QR" trong hộp thoại chia sẻ
- **THEN** hộp thoại hiện ảnh PNG của các khoản chuyển theo người nhận đã chọn và không hiện bản xem trước tin nhắn

## REMOVED Requirements

### Requirement: Lọc tin nhắn chỉ liệt kê khoản chưa thanh toán
**Reason**: Tuỳ chọn này nằm trong hộp thoại chia sẻ và bị bỏ ở commit `f5261e5` (2026-10-21). Lý do cụ thể không xác định được từ lịch sử. Tuỳ chọn không còn trong giao diện, và hàm `formatShareMessage` chỉ còn tham số `onlyUnpaid` mặc định là tắt.

**Migration**: Người gửi muốn nhắc riêng một người thì chọn người đó trong danh sách "Gửi cho" để tin nhắn chỉ có khoản của người đó. Tin nhắn không còn lọc theo trạng thái đã tick, nên khoản đã tick vẫn nằm trong tin nhắn nếu người được chọn còn khoản chuyển.
