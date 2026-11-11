## ADDED Requirements

### Requirement: Ứng dụng chạy hoàn toàn phía client
Hệ thống SHALL hoạt động 100% phía client, không có backend, và SHALL lưu trữ cũng như tính toán mà không cần mạng. (BR-1.1)

#### Scenario: Lưu và tính toán khi không có mạng
- **GIVEN** ứng dụng đã tải xong trong trình duyệt
- **WHEN** người dùng tạo hoặc sửa dữ liệu khi thiết bị không có kết nối mạng
- **THEN** dữ liệu được ghi vào IndexedDB trên thiết bị và các phép tính vẫn chạy bình thường

### Requirement: Dữ liệu chỉ nằm trên trình duyệt của người dùng
Hệ thống SHALL NOT gửi dữ liệu ứng dụng ra bất kỳ máy chủ nào bên ngoài. Ngoại lệ duy nhất là việc tải font từ Google Fonts.

#### Scenario: Không gửi dữ liệu ra ngoài
- **WHEN** ứng dụng lưu hoặc đọc dữ liệu của người dùng
- **THEN** không có yêu cầu mạng nào mang dữ liệu người dùng đi, và chỉ có yêu cầu tải font Google Fonts

### Requirement: Dữ liệu bền vững qua tải lại trang
Hệ thống SHALL lưu dữ liệu của 3 tầng Bữa, Kèo, Món cùng hoá đơn, danh bạ, file hoá đơn và cài đặt vào IndexedDB, để dữ liệu còn nguyên sau khi tải lại trang (F5). (BR-1.3)

#### Scenario: Tải lại trang không mất dữ liệu
- **GIVEN** đã có bản ghi trong các bảng `meals`, `sessions`, `invoices`, `items`, `members`, `invoice_files` và `settings`
- **WHEN** người dùng tải lại trang (F5) hoặc cơ sở dữ liệu được đóng rồi mở lại
- **THEN** toàn bộ bản ghi còn nguyên và đọc lại được

### Requirement: Schema cơ sở dữ liệu IndexedDB
Hệ thống SHALL mở cơ sở dữ liệu IndexedDB tên `usd-split`, phiên bản 1, với 7 bảng. Khoá chính và index của từng bảng như sau:
- `meals` (kiểu `Meal`): khoá `id`, index `date`, `status`, `updatedAt`.
- `sessions` (kiểu `SessionKeo`): khoá `id`, index `mealId`, `orderIndex`.
- `invoices` (kiểu `Invoice`): khoá `id`, index `mealId`, `sessionId`.
- `items` (kiểu `InvoiceItem`): khoá `id`, index `mealId`, `sessionId`, `invoiceId`.
- `members` (kiểu `Member`): khoá `id`, index `normalizedName`, `lastUsedAt`.
- `invoice_files` (kiểu `InvoiceFileRecord`): khoá `id`, index `mealId`, `sessionId`, `invoiceId`.
- `settings` (kiểu `AppSettings`): khoá `id`, cố định giá trị `'default'`.

Index `mealId` trên `sessions`, `invoices`, `items` và `invoice_files` phục vụ việc xoá hàng loạt khi xoá hoặc lưu trữ bữa. (US-1.2)

#### Scenario: Mở ứng dụng trên trình duyệt mới tạo đủ bảng
- **WHEN** ứng dụng mở cơ sở dữ liệu `usd-split` lần đầu trên một trình duyệt
- **THEN** cơ sở dữ liệu ở phiên bản 1 và có đủ 7 bảng với các index đã nêu

#### Scenario: Dữ liệu nhúng và khoá
- **WHEN** một bữa được lưu
- **THEN** `PaymentGroup`, `settlementStatuses` và `archivedSummary` được lưu nhúng trong bản ghi `Meal`, không có bảng riêng; khoá của bản ghi là UUID do `crypto.randomUUID` tạo; ngày được lưu dạng chuỗi ISO

#### Scenario: Đổi schema sau này
- **GIVEN** cơ sở dữ liệu đang ở phiên bản 1 và chưa có migration nào
- **WHEN** schema cần thay đổi
- **THEN** phải thêm một khối `version(n).upgrade` mới thay vì sửa phiên bản cũ

### Requirement: Hồ sơ "Tôi" làm Người chủ trì mặc định
Hệ thống SHALL tạo sẵn hồ sơ "Tôi" có `isDefaultHost = true` làm Người chủ trì mặc định ngay lần mở đầu tiên, không cần người dùng cấu hình. (BR-1.5)

#### Scenario: Lần mở đầu tiên
- **GIVEN** cơ sở dữ liệu chưa có bản ghi `settings` với id `'default'`
- **WHEN** ứng dụng mount và gọi `ensureDefaultData`
- **THEN** bảng `members` có một hồ sơ "Tôi" với `isDefaultHost = true`, bản ghi `settings` `'default'` có `defaultHostMemberId` trỏ tới hồ sơ đó, và `currencySymbol` là `₫`

### Requirement: Khởi tạo dữ liệu mặc định chạy an toàn nhiều lần
Hệ thống SHALL đảm bảo `ensureDefaultData` an toàn khi được gọi nhiều lần và SHALL NOT tạo trùng hồ sơ. (BR-1.6)

#### Scenario: Tải lại trang, hồ sơ "Tôi" vẫn còn và không bị nhân đôi (AC-2)
- **GIVEN** bản ghi `settings` `'default'` đã có
- **WHEN** `ensureDefaultData` được gọi lại, ví dụ sau khi tải lại trang
- **THEN** hàm thoát sớm và không thay đổi bảng `members` hay `settings`; chỉ có một hồ sơ "Tôi" với `isDefaultHost = true`

### Requirement: Chỉ có một chủ app
Hệ thống SHALL có đúng một hồ sơ với `isDefaultHost = true`, và `settings.defaultHostMemberId` SHALL trỏ tới hồ sơ đó. (R-3)

#### Scenario: Chỉ có một Người chủ trì mặc định
- **WHEN** bảng `members` được truy vấn theo điều kiện `isDefaultHost`
- **THEN** kết quả có đúng một bản ghi, và id của bản ghi đó bằng `settings.defaultHostMemberId`

### Requirement: Tên hiển thị gốc và tên chuẩn hoá
Hệ thống SHALL giữ nguyên tên hiển thị gốc của hồ sơ. Hệ thống SHALL tính `normalizedName` bằng cách bỏ dấu, chuyển chữ thường, đổi `đ` thành `d` và bỏ khoảng trắng thừa ở đầu và cuối; `normalizedName` dùng cho tìm kiếm và sắp xếp A-Z ở Epic 2. (R-4)

#### Scenario: Tên có dấu được chuẩn hoá để tìm kiếm
- **GIVEN** một hồ sơ có tên hiển thị "Đức" có dấu và chữ hoa
- **WHEN** hồ sơ được lưu
- **THEN** tên hiển thị vẫn là "Đức" và `normalizedName` là "duc"

### Requirement: Mỗi file hoá đơn luôn có bản Blob trong IndexedDB
Hệ thống SHALL lưu cho mỗi file hoá đơn một bản Blob trong bảng `invoice_files`. Bản trên OPFS chỉ là bản bổ sung. Lỗi OPFS SHALL NOT làm hỏng thao tác của người dùng. (R-5)

#### Scenario: Trình duyệt không có OPFS
- **GIVEN** trình duyệt không hỗ trợ OPFS
- **WHEN** `addFile` được gọi
- **THEN** bản ghi được lưu với `blobData`, không có `opfsPath`, và thao tác vẫn thành công

#### Scenario: Ghi OPFS bị lỗi
- **GIVEN** việc ghi vào OPFS ném lỗi
- **WHEN** `addFile` được gọi
- **THEN** lỗi được bỏ qua, bản ghi vẫn được lưu với `blobData` và không có `opfsPath`

#### Scenario: Đọc file khi OPFS lỗi hoặc không có
- **WHEN** `getFileBlob` được gọi
- **THEN** hàm đọc OPFS trước; nếu lỗi hoặc không có thì dùng `blobData` trong IndexedDB

### Requirement: File hoá đơn là file thật, xem lại, tải về và xoá được
Hệ thống SHALL lưu mọi ảnh hoá đơn thành file có thể đọc lại, tải về và xoá, thông qua `fileStorageService` với các hàm `addFile`, `getFileBlob`, `downloadFile`, `deleteFile` và `listFilesByInvoice`. Hệ thống SHALL cung cấp `getTotalStorageBytes` để xem tổng dung lượng file. (BR-1.4, US-1.3)

#### Scenario: Thêm file rồi đọc lại được (AC-3)
- **GIVEN** một file ảnh hoá đơn thuộc một bữa, kèo và hoá đơn
- **WHEN** `addFile(mealId, sessionId, invoiceId, file)` được gọi rồi `getFileBlob` được gọi với id vừa tạo
- **THEN** `getFileBlob` trả về Blob có nội dung của file, và `listFilesByInvoice` liệt kê bản ghi đó theo thứ tự `createdAt`

#### Scenario: Tải về file
- **WHEN** `downloadFile(id)` được gọi
- **THEN** nếu có dữ liệu thì hàm tải file về qua object URL và trả về `true`; nếu thiếu dữ liệu thì trả về `false`

#### Scenario: Xem tổng dung lượng file
- **WHEN** `getTotalStorageBytes` được gọi
- **THEN** hàm trả về tổng dung lượng của các file hoá đơn đã lưu

### Requirement: Xoá file xoá cả bản vật lý lẫn bản ghi
Hệ thống SHALL khi xoá một file, xoá cả file trên OPFS (nếu có `opfsPath`) lẫn bản ghi trong `invoice_files`. Khi xoá theo bữa, hệ thống SHALL xoá cả thư mục `/invoices/<mealId>`. (R-6)

#### Scenario: Xoá một file giải phóng dung lượng (AC-3)
- **GIVEN** một file hoá đơn đã được lưu
- **WHEN** `deleteFile(id)` được gọi
- **THEN** bản ghi và file đều biến mất, và `getTotalStorageBytes` giảm tương ứng

#### Scenario: Xoá theo bữa xoá cả thư mục
- **WHEN** `deleteFilesByMeal(id)` được gọi
- **THEN** các bản ghi của bữa đó bị xoá và thư mục `/invoices/<mealId>` bị xoá đệ quy

### Requirement: Xoá theo bữa, kèo hoặc hoá đơn xoá toàn bộ file liên quan
Hệ thống SHALL cung cấp năng lực xoá toàn bộ file liên quan khi xoá Bữa, Kèo hoặc Hoá đơn, qua `deleteFilesByMeal`, `deleteFilesBySession` và `deleteFilesByInvoice`, để Epic 3, Epic 4 và Epic 7 sử dụng. (BR-1.7)

#### Scenario: Xoá hoá đơn hoặc kèo kéo theo file
- **WHEN** `deleteFilesByInvoice(id)` hoặc `deleteFilesBySession(id)` được gọi
- **THEN** mọi file và bản ghi thuộc hoá đơn hoặc kèo đó bị xoá

### Requirement: Tên file được chuẩn hoá trước khi lưu
Hệ thống SHALL chuẩn hoá tên file trước khi lưu: bỏ dấu, đổi `đ` thành `d`, và thay ký tự lạ bằng `_`. (R-7)

#### Scenario: Tên file có dấu tiếng Việt hoặc ký tự lạ
- **GIVEN** một file có tên chứa dấu tiếng Việt hoặc ký tự đặc biệt
- **WHEN** `addFile` được gọi
- **THEN** tên lưu trong bản ghi và phần tên trong đường dẫn OPFS `/invoices/<mealId>/<id>_<fileName>` chỉ chứa ký tự đã chuẩn hoá, không có dấu và ký tự lạ được thay bằng `_`

### Requirement: Trường người ứng trước trên hoá đơn
Hệ thống SHALL cung cấp trường `Invoice.payerMemberId` để ghi người ứng trước của một hoá đơn. Epic 1 SHALL NOT xử lý nghiệp vụ ứng trước; nghiệp vụ này thuộc Epic 5 và Epic 6. (R-8)

#### Scenario: Hoá đơn ghi nhận người ứng trước
- **WHEN** một hoá đơn được lưu với `payerMemberId`
- **THEN** trường `payerMemberId` được lưu trong bản ghi `Invoice`
