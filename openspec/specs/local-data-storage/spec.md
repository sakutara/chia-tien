# local-data-storage Specification

## Purpose
Lớp lưu trữ cục bộ của ứng dụng: mở cơ sở dữ liệu IndexedDB `usd-split` qua Dexie, tạo dữ liệu mặc định ở lần khởi tạo đầu tiên (hồ sơ "Tôi" và cài đặt), chuẩn hoá tên khi lưu và đổi tên mặc định theo ngôn ngữ khi hiển thị, lưu/đọc/tải/xoá file hoá đơn bằng OPFS với bản Blob dự phòng trong IndexedDB, dọn file hoá đơn mồ côi, và giải phóng bộ nhớ của các worker AI/OCR khi không còn dùng. Capability này phục vụ mọi phần còn lại của app vì dữ liệu chỉ nằm trên trình duyệt của người dùng, không có máy chủ. Nghiệp vụ của bữa, kèo và hoá đơn thuộc các capability khác.

## Requirements

### Requirement: Cơ sở dữ liệu IndexedDB và chỉ mục
Hệ thống SHALL lưu toàn bộ dữ liệu trong cơ sở dữ liệu IndexedDB tên `usd-split`, gồm các bảng `meals`, `sessions`, `invoices`, `items`, `members`, `invoice_files` và `settings`. Bảng `settings` có khoá chính `id`, và bản ghi cài đặt chung dùng `id` là `default`. Các bảng `sessions`, `invoices`, `items` và `invoice_files` lập chỉ mục theo `mealId` để tra cứu và xoá hàng loạt theo bữa; bảng `members` lập chỉ mục theo `normalizedName` để tìm kiếm và sắp xếp A-Z.

#### Scenario: Mở ứng dụng lần đầu trên trình duyệt
- **WHEN** ứng dụng mở cơ sở dữ liệu lần đầu trên một trình duyệt
- **THEN** cơ sở dữ liệu `usd-split` được tạo đủ bảng ở phiên bản schema 1
- **AND** các bảng chưa có bản ghi nào cho đến khi khởi tạo dữ liệu mặc định

#### Scenario: Dữ liệu còn nguyên sau khi đóng và mở lại
- **WHEN** cơ sở dữ liệu được đóng rồi mở lại
- **THEN** các bản ghi trong `members` và `settings` còn nguyên, không đổi

#### Scenario: Truy vấn file theo hoá đơn
- **WHEN** ứng dụng liệt kê file của một hoá đơn
- **THEN** chỉ các file có đúng `invoiceId` đó được trả về

### Requirement: Phiên bản schema hiện tại
Hệ thống SHALL giữ schema ở phiên bản 1 và hiện chưa có bước nâng cấp (upgrade) dữ liệu nào giữa các phiên bản.

#### Scenario: Mở cơ sở dữ liệu đang ở phiên bản 1
- **WHEN** ứng dụng mở cơ sở dữ liệu đã có dữ liệu ở phiên bản 1
- **THEN** dữ liệu được đọc nguyên trạng, không có bước chuyển đổi nào được chạy

### Requirement: Dữ liệu mặc định với hồ sơ "Tôi"
Khi khởi tạo dữ liệu mặc định, hệ thống SHALL tạo đúng một hồ sơ chủ app tên `Tôi` với `isDefaultHost` là true, `normalizedName` là `toi` và `avatarColor` là `#2D6A4F`, cùng một bản ghi `settings` có khoá `default` với `currencySymbol` là `₫` và `defaultHostMemberId` trỏ tới hồ sơ đó. Hai bản ghi này được tạo trong cùng một giao dịch đọc-ghi.

#### Scenario: Lần đầu chưa có cài đặt
- **WHEN** khởi tạo dữ liệu mặc định chạy trên cơ sở dữ liệu chưa có cài đặt `default`
- **THEN** bảng `members` có thêm đúng một hồ sơ "Tôi" và `settings.defaultHostMemberId` trỏ tới hồ sơ đó
- **AND** hồ sơ và cài đặt được tạo trong cùng một giao dịch

#### Scenario: Gọi lại khi đã có dữ liệu mặc định
- **WHEN** khởi tạo dữ liệu mặc định được gọi lại nhiều lần
- **THEN** không có hồ sơ nào được thêm và dữ liệu hiện có không thay đổi

### Requirement: Lưu ngôn ngữ giao diện trong cài đặt
Hệ thống SHALL lưu ngôn ngữ giao diện đã chọn (`vi` hoặc `en`) trong trường `language` của bản ghi `settings`. Việc ghi ngôn ngữ chỉ ghi vào `settings`, không bao giờ ghi dữ liệu của trang Snapshot vào IndexedDB.

#### Scenario: Đọc ngôn ngữ đã lưu
- **WHEN** ứng dụng đọc ngôn ngữ và `settings.language` là `vi` hoặc `en`
- **THEN** ngôn ngữ đó được trả về

#### Scenario: Chưa có ngôn ngữ hợp lệ hoặc đọc lỗi
- **WHEN** `settings.language` vắng, không hợp lệ, hoặc việc đọc cơ sở dữ liệu lỗi
- **THEN** kết quả là rỗng và giao diện theo ngôn ngữ của trình duyệt

#### Scenario: Lưu ngôn ngữ khi chưa có dữ liệu mặc định
- **WHEN** người dùng chọn ngôn ngữ mà cơ sở dữ liệu chưa có dữ liệu mặc định
- **THEN** dữ liệu mặc định được tạo trước, rồi ngôn ngữ được ghi vào `settings`
- **AND** nếu ghi lỗi thì chỉ ghi nhật ký lỗi, không báo lỗi ra giao diện

### Requirement: Hiển thị tên mặc định theo ngôn ngữ hiện tại
Hệ thống SHALL lưu tên hồ sơ "Tôi" và tên kèo mặc định bằng tiếng Việt, nhưng khi hiển thị thì đổi sang ngôn ngữ đang dùng. Tên do người dùng tự đặt luôn được giữ nguyên.

#### Scenario: Hồ sơ chủ app chưa đổi tên
- **WHEN** hồ sơ chủ app có `isDefaultHost` là true và tên vẫn là `Tôi`
- **THEN** tên hiển thị là bản dịch theo ngôn ngữ hiện tại, còn dữ liệu gốc vẫn là `Tôi`

#### Scenario: Tên do người dùng đặt
- **WHEN** hồ sơ chủ app đã đổi tên, hoặc hồ sơ là thành viên thường
- **THEN** tên hiển thị giữ nguyên, không bị đổi theo ngôn ngữ

#### Scenario: Tên kèo mặc định
- **WHEN** tên kèo là tên mặc định do hệ thống tạo
- **THEN** tên hiển thị theo ngôn ngữ hiện tại; tên kèo do người dùng đặt thì giữ nguyên

### Requirement: Chuẩn hoá tên để tìm kiếm và nhận diện dấu tiếng Việt
Hệ thống SHALL tạo chuỗi tìm kiếm từ tên bằng cách chuyển chữ thường, bỏ dấu tiếng Việt, đổi `đ` và `Đ` thành `d`, và bỏ khoảng trắng đầu cuối. Chuỗi này được dùng làm `normalizedName` của thành viên cho Quick Filter và sắp xếp A-Z; nếu chuỗi đã thuộc thành viên khác thì thêm hậu tố số vào cuối. Hệ thống cũng SHALL nhận biết một chuỗi có dấu hay không, gồm dấu tổ hợp và `đ`, `Đ`.

#### Scenario: Tên có dấu tiếng Việt
- **WHEN** tên là `Đặng Thị Ánh`
- **THEN** chuỗi tìm kiếm là `dang thi anh`

#### Scenario: Tên của hồ sơ mặc định
- **WHEN** tên là `Tôi`
- **THEN** `normalizedName` của hồ sơ mặc định là `toi`

#### Scenario: Trùng chuỗi tìm kiếm với thành viên khác
- **GIVEN** đã có thành viên `Bình` với `normalizedName` là `binh`
- **WHEN** thêm thành viên mới tên `Binh`
- **THEN** thành viên mới được tạo với `normalizedName` là `binh2`

#### Scenario: Kiểm tra có dấu
- **WHEN** chuỗi là `Bình` hoặc `Đạt`
- **THEN** chuỗi được nhận là có dấu
- **AND** chuỗi `Binh` không được nhận là có dấu

### Requirement: Làm sạch và viết hoa tên thành viên
Hệ thống SHALL làm sạch tên nhập vào bằng cách bỏ ký tự điều khiển, gộp các khoảng trắng liên tiếp thành một và cắt khoảng trắng đầu cuối. Khi lưu tên thành viên, chữ cái đầu của mỗi từ MUST được viết hoa, các chữ còn lại viết thường; từ mới bắt đầu sau khoảng trắng, dấu gạch nối hoặc dấu ngoặc mở. Tên chỉ gồm khoảng trắng cho chuỗi rỗng. Giới hạn 50 ký tự (`MEMBER_NAME_MAX`) do nơi gọi kiểm tra, không do bước làm sạch.

#### Scenario: Gộp khoảng trắng và viết hoa
- **WHEN** tên nhập là `  phương    anh `
- **THEN** tên được lưu là `Phương Anh`

#### Scenario: Viết hoa sau dấu gạch nối
- **WHEN** tên nhập là `BÌNH` hoặc `anh-tuấn`
- **THEN** tên được lưu là `Bình` hoặc `Anh-Tuấn`

#### Scenario: Tên chỉ có khoảng trắng
- **WHEN** tên nhập chỉ gồm khoảng trắng
- **THEN** kết quả làm sạch là chuỗi rỗng và tên bị từ chối với mã lỗi `INVALID_NAME`, thông báo "Tên không được để trống."

#### Scenario: Tên quá dài bị từ chối
- **WHEN** tên sau khi làm sạch có 51 ký tự
- **THEN** tên bị từ chối với mã lỗi `INVALID_NAME`, thông báo "Tên tối đa 50 ký tự."

#### Scenario: Ký tự điều khiển
- **WHEN** tên nhập chứa ký tự điều khiển
- **THEN** các ký tự đó bị bỏ đi trước khi lưu

### Requirement: Lưu file hoá đơn với bản Blob dự phòng
Hệ thống SHALL lưu mỗi file hoá đơn thành một bản ghi trong `invoice_files`, luôn kèm bản Blob của chính file trong IndexedDB. Khi OPFS khả dụng, hệ thống SHALL ghi thêm một bản vật lý tại `/invoices/<mealId>/<id>_<tên file đã chuẩn hoá>` và lưu đường dẫn đó vào `opfsPath`. Mã file là UUID mới.

#### Scenario: Thêm file khi OPFS khả dụng
- **WHEN** người dùng thêm một file ảnh và trình duyệt hỗ trợ OPFS
- **THEN** bản ghi có cả `opfsPath` và `blobData`, `sizeBytes` bằng dung lượng file đã lưu
- **AND** `mimeType` lấy từ file, hoặc `application/octet-stream` nếu file không có kiểu
- **AND** `ocrRawText`, `originalSizeBytes` và `compression` được lưu kèm nếu nơi gọi có truyền vào

#### Scenario: OPFS không khả dụng hoặc ghi lỗi
- **WHEN** trình duyệt không có OPFS, hoặc ghi OPFS thất bại
- **THEN** bản ghi vẫn được lưu với `blobData` và không có `opfsPath`
- **AND** bản vật lý dở dang (nếu có) bị xoá và thao tác không báo lỗi cho người dùng

### Requirement: Chuẩn hoá tên file hoá đơn
Hệ thống SHALL chuẩn hoá tên file trước khi lưu: chỉ lấy phần tên cuối cùng sau dấu `/` hoặc `\`, bỏ dấu, đổi `đ` và `Đ` thành `d`, thay mỗi nhóm ký tự ngoài `A-Z`, `a-z`, `0-9`, `.`, `_` và `-` bằng một dấu `_`, gộp các dấu `_` liên tiếp thành một, rồi bỏ dấu `.` hoặc `_` ở đầu. Tên dài hơn 120 ký tự MUST được cắt bớt nhưng giữ nguyên phần mở rộng. Tên rỗng sau chuẩn hoá thành `invoice`.

#### Scenario: Tên có đường dẫn và ký tự tiếng Việt
- **WHEN** tên file là `../Hóa đơn 1.jpg`
- **THEN** tên đã chuẩn hoá là `Hoa_don_1.jpg`

#### Scenario: Tên rỗng
- **WHEN** tên file rỗng
- **THEN** tên đã chuẩn hoá là `invoice`

#### Scenario: Tên quá dài
- **WHEN** tên file có hơn 120 ký tự
- **THEN** tên được cắt bớt phần thân, tổng độ dài là 120 ký tự và phần mở rộng được giữ nguyên

### Requirement: Đọc lại nội dung file hoá đơn
Hệ thống SHALL trả về Blob của một file theo mã bản ghi, ưu tiên bản vật lý trong OPFS. Nếu bản ghi không có `opfsPath`, hoặc OPFS không khả dụng, hoặc bản vật lý không đọc được, hệ thống MUST dùng bản Blob trong IndexedDB. Nếu mã không tồn tại thì kết quả là không có gì.

#### Scenario: Mã không tồn tại
- **WHEN** nơi gọi đọc file với mã không có trong `invoice_files`
- **THEN** kết quả là không có gì (undefined)

#### Scenario: Bản vật lý đã mất
- **WHEN** bản ghi có `opfsPath` nhưng file vật lý không còn hoặc OPFS không khả dụng
- **THEN** Blob trong IndexedDB được trả về với đúng dung lượng và kiểu đã lưu

### Requirement: Tải file hoá đơn về máy
Hệ thống SHALL tải file về máy với tên là tên đã chuẩn hoá của file. Kết quả là true khi bắt đầu tải; kết quả là false khi không có bản ghi hoặc không có nội dung, và khi đó không tải gì.

#### Scenario: Tải file thành công
- **WHEN** người dùng tải một file tồn tại
- **THEN** trình duyệt bắt đầu tải file với tên đã chuẩn hoá và kết quả là true

#### Scenario: File không còn dữ liệu
- **WHEN** bản ghi không tồn tại hoặc không có Blob nào để đọc
- **THEN** kết quả là false và không có file nào được tải

### Requirement: Xoá file hoá đơn cả bản vật lý lẫn bản ghi
Hệ thống SHALL xoá cả bản vật lý trong OPFS lẫn bản ghi trong `invoice_files` khi xoá một file, xoá theo hoá đơn, xoá theo kèo hoặc xoá theo bữa. Xoá theo bữa MUST xoá thêm toàn bộ thư mục `/invoices/<mealId>`. Lỗi khi xoá OPFS bị bỏ qua và không ngăn việc xoá bản ghi.

#### Scenario: Xoá một file
- **WHEN** người dùng xoá một file
- **THEN** file đó không còn trong `invoice_files` và không đọc lại được
- **AND** các file khác của cùng hoá đơn vẫn còn nguyên

#### Scenario: Xoá theo bữa
- **WHEN** bữa bị xoá hoặc lưu trữ
- **THEN** mọi file của bữa đó bị xoá cùng thư mục `/invoices/<mealId>`
- **AND** file của các bữa khác không bị ảnh hưởng

#### Scenario: Xoá theo hoá đơn hoặc kèo
- **WHEN** hoá đơn hoặc kèo bị xoá
- **THEN** chỉ các file của hoá đơn hoặc kèo đó bị xoá, các file khác của bữa vẫn còn

### Requirement: Liệt kê file và tính tổng dung lượng
Hệ thống SHALL liệt kê các file của một hoá đơn theo thời gian tạo tăng dần, và tính tổng dung lượng của mọi file đang lưu theo `sizeBytes` (dung lượng sau nén), không tính bản Blob dự phòng thành dung lượng riêng.

#### Scenario: Liệt kê file của một hoá đơn
- **WHEN** một hoá đơn có hai file và hoá đơn khác có một file
- **THEN** danh sách của hoá đơn đầu chỉ gồm hai file, sắp theo `createdAt` tăng dần

#### Scenario: Tổng dung lượng
- **WHEN** ứng dụng tính tổng dung lượng file
- **THEN** kết quả bằng tổng `sizeBytes` của mọi bản ghi còn trong `invoice_files`

### Requirement: Dọn file hoá đơn mồ côi
Hệ thống SHALL xoá các file hoá đơn của một bữa mà hoá đơn chứa chúng không còn trong bảng `invoices`, mỗi khi bữa được mở. Khi người dùng đóng form hoá đơn mà chưa lưu, hệ thống SHALL xoá mọi file của hoá đơn nháp đó nếu hoá đơn chưa tồn tại trong `invoices`. Lỗi khi dọn không được báo cho người dùng.

#### Scenario: Mở bữa có file của hoá đơn đã mất
- **GIVEN** bữa có một hoá đơn còn tồn tại với một file, và một file thuộc hoá đơn không còn trong `invoices`
- **WHEN** người dùng mở bữa
- **THEN** file của hoá đơn đã mất bị xoá và số file đã xoá được trả về
- **AND** file của hoá đơn còn tồn tại được giữ nguyên

#### Scenario: Đóng form hoá đơn nháp chưa lưu
- **GIVEN** hoá đơn nháp có file nhưng chưa được lưu vào `invoices`
- **WHEN** người dùng đóng form mà không lưu
- **THEN** mọi file của hoá đơn nháp đó bị xoá

### Requirement: Đăng ký và giải phóng bộ nhớ của worker AI/OCR
Mỗi worker AI/OCR SHALL đăng ký một hàm dọn bộ nhớ khi khởi tạo và nhận lại hàm huỷ đăng ký. Khi giải phóng, mọi hàm đang đăng ký MUST được gọi; hàm đã huỷ đăng ký không được gọi. Lỗi của một hàm dọn, kể cả lỗi ném ngay lập tức, không được ngăn các hàm khác chạy, và việc giải phóng không ném lỗi ra ngoài.

#### Scenario: Giải phóng tất cả worker đang đăng ký
- **WHEN** hai hàm dọn đang đăng ký và hệ thống giải phóng bộ nhớ
- **THEN** cả hai hàm được gọi đúng một lần

#### Scenario: Hàm đã huỷ đăng ký
- **WHEN** một hàm dọn đã được huỷ đăng ký rồi mới giải phóng bộ nhớ
- **THEN** hàm đó không được gọi

#### Scenario: Một hàm dọn bị lỗi
- **WHEN** một hàm dọn ném lỗi khi giải phóng
- **THEN** các hàm dọn còn lại vẫn chạy và việc giải phóng kết thúc bình thường

#### Scenario: Đóng form soạn hoá đơn
- **WHEN** người dùng đóng form soạn hoá đơn
- **THEN** mọi worker AI/OCR đang đăng ký được giải phóng ngay

### Requirement: Giải phóng bộ nhớ khi ứng dụng bị ẩn hoặc đóng trang
Hệ thống SHALL giải phóng bộ nhớ AI khi ứng dụng chuyển sang trạng thái ẩn, và giải phóng ngay khi trang nhận sự kiện `pagehide`. Khi ứng dụng bị ẩn và không có tác vụ nào đang chạy, bộ nhớ được giải phóng ngay. Khi ứng dụng bị ẩn lúc đang có tác vụ, hệ thống MUST chờ tối đa 5 giây (`MAX_BACKGROUND_GRACE_MS`) rồi mới giải phóng, trừ khi người dùng quay lại trước đó.

#### Scenario: Ẩn ứng dụng khi không có tác vụ
- **WHEN** ứng dụng bị ẩn và không có tác vụ AI nào đang chạy
- **THEN** bộ nhớ được giải phóng ngay

#### Scenario: Ẩn ứng dụng khi đang có tác vụ
- **WHEN** ứng dụng bị ẩn lúc tác vụ AI đang chạy
- **THEN** bộ nhớ chưa được giải phóng trong 5 giây đầu và được giải phóng khi đủ 5 giây

#### Scenario: Quay lại trước khi hết thời gian chờ
- **WHEN** người dùng quay lại ứng dụng trước khi hết 5 giây
- **THEN** hẹn giờ bị huỷ và bộ nhớ không được giải phóng

#### Scenario: Trang bị đóng hoặc điều hướng
- **WHEN** trang nhận sự kiện `pagehide`
- **THEN** bộ nhớ AI được giải phóng ngay

### Requirement: Dọn dữ liệu AI trên máy cũ khi khởi động
Hệ thống SHALL xoá một lần khi khởi động cache Cache Storage tên `transformers-cache` và bốn khoá localStorage `fee-calculator.useLocalAi`, `fee-calculator.localAiCached`, `fee-calculator.geminiApiKey` và `fee-calculator.geminiModel`, để giải phóng 480–790 MB mà người dùng đã tải trước đó. Lỗi khi truy cập Cache Storage hoặc localStorage MUST NOT chặn khởi động ứng dụng và MUST NOT được hiện ra cho người dùng.

#### Scenario: Thiết bị còn cache mô hình cũ
- **GIVEN** Cache Storage có cache `transformers-cache` và localStorage có bốn khoá cũ
- **WHEN** ứng dụng khởi động
- **THEN** cache `transformers-cache` bị xoá và bốn khoá cũ bị xoá khỏi localStorage

#### Scenario: Trình duyệt không có Cache Storage
- **GIVEN** trình duyệt không có đối tượng `caches`
- **WHEN** ứng dụng khởi động
- **THEN** việc dọn cache bị bỏ qua, các khoá localStorage vẫn được xoá và ứng dụng khởi động bình thường

#### Scenario: Xoá cache bị từ chối
- **GIVEN** thao tác xoá cache `transformers-cache` bị từ chối
- **WHEN** ứng dụng khởi động
- **THEN** lỗi được nuốt, ứng dụng vẫn khởi động bình thường và không có thông báo lỗi cho người dùng

#### Scenario: localStorage bị chặn
- **GIVEN** trình duyệt chặn truy cập localStorage (ví dụ chế độ riêng tư)
- **WHEN** ứng dụng khởi động
- **THEN** việc xoá khoá bị bỏ qua và ứng dụng khởi động bình thường
