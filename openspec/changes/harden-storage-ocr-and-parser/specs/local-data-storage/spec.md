## MODIFIED Requirements

### Requirement: Lưu file hoá đơn với bản Blob dự phòng
Hệ thống SHALL lưu mỗi file hoá đơn thành một bản ghi trong `invoice_files`, với đúng một bản nội dung. Khi OPFS khả dụng và ghi thành công, hệ thống SHALL ghi file vào `/invoices/<mealId>/<id>_<tên file đã chuẩn hoá>`, lưu đường dẫn đó vào `opfsPath` và MUST NOT lưu `blobData`. Khi OPFS không khả dụng hoặc ghi lỗi, hệ thống SHALL lưu Blob trong `blobData` và không có `opfsPath`. Bản nội dung là chính file đã xử lý (đã cắt, nắn, nén) dùng làm đầu vào OCR; ảnh gốc chưa xử lý MUST NOT được lưu ở bất kỳ đâu. Mã file là UUID mới.

#### Scenario: Thêm file khi OPFS khả dụng
- **WHEN** người dùng thêm một file ảnh đã xử lý và trình duyệt hỗ trợ OPFS
- **THEN** bản ghi có `opfsPath` và không có `blobData`, `sizeBytes` bằng dung lượng file đã ghi
- **AND** `mimeType` lấy từ file, hoặc `application/octet-stream` nếu file không có kiểu
- **AND** `ocrRawText`, `originalSizeBytes` và `compression` được lưu kèm nếu nơi gọi có truyền vào

#### Scenario: OPFS không khả dụng hoặc ghi lỗi
- **WHEN** trình duyệt không có OPFS, hoặc ghi OPFS thất bại
- **THEN** bản ghi được lưu với `blobData` và không có `opfsPath`
- **AND** bản vật lý dở dang (nếu có) bị xoá và thao tác không báo lỗi cho người dùng

#### Scenario: Ảnh gốc không được lưu
- **WHEN** người dùng thêm một ảnh chụp chưa qua xử lý cắt, nắn hoặc nén
- **THEN** chỉ bản đã xử lý được ghi vào OPFS hoặc `blobData`, và không có bản thứ hai của ảnh gốc

### Requirement: Đọc lại nội dung file hoá đơn
Hệ thống SHALL trả về Blob của một file theo mã bản ghi, ưu tiên bản vật lý trong OPFS nếu bản ghi có `opfsPath`. Nếu bản ghi không có `opfsPath`, hệ thống MUST dùng `blobData` của bản ghi. Nếu mã không tồn tại thì kết quả là không có gì.

#### Scenario: Mã không tồn tại
- **WHEN** nơi gọi đọc file với mã không có trong `invoice_files`
- **THEN** kết quả là không có gì (undefined)

#### Scenario: Bản ghi chỉ có Blob
- **WHEN** bản ghi không có `opfsPath` và có `blobData`
- **THEN** Blob trong `blobData` được trả về với đúng dung lượng và kiểu đã lưu

#### Scenario: Bản vật lý đã mất
- **WHEN** bản ghi có `opfsPath` nhưng file vật lý không còn hoặc OPFS không khả dụng, và bản ghi không có `blobData`
- **THEN** kết quả là không có gì (undefined), vì không còn bản nào để đọc

### Requirement: Dọn dữ liệu AI trên máy cũ khi khởi động
Hệ thống SHALL xoá một lần khi khởi động cache Cache Storage `transformers-cache` và bốn khoá localStorage `fee-calculator.useLocalAi`, `fee-calculator.localAiCached`, `fee-calculator.geminiApiKey`, `fee-calculator.geminiModel`, để giải phóng 480–790 MB. Bước này chỉ chạy đến hết ngày 2027-02-12; sau ngày đó MUST NOT chạy nữa. Lỗi khi truy cập Cache Storage hoặc localStorage MUST NOT chặn khởi động ứng dụng.

#### Scenario: Thiết bị còn cache mô hình cũ
- **GIVEN** Cache Storage có cache `transformers-cache` và localStorage có bốn khoá cũ
- **WHEN** ứng dụng khởi động trước hoặc vào ngày 2027-02-12
- **THEN** cache `transformers-cache` bị xoá và bốn khoá cũ bị xoá khỏi localStorage

#### Scenario: Trình duyệt không có Cache Storage
- **GIVEN** trình duyệt không có đối tượng `caches`
- **WHEN** ứng dụng khởi động trước hoặc vào ngày 2027-02-12
- **THEN** việc dọn cache bị bỏ qua, các khoá localStorage vẫn được xoá và ứng dụng khởi động bình thường

#### Scenario: Xoá cache bị từ chối
- **GIVEN** thao tác xoá cache `transformers-cache` bị từ chối
- **WHEN** ứng dụng khởi động trước hoặc vào ngày 2027-02-12
- **THEN** lỗi được nuốt, ứng dụng vẫn khởi động bình thường và không có thông báo lỗi cho người dùng

#### Scenario: localStorage bị chặn
- **GIVEN** trình duyệt chặn truy cập localStorage (ví dụ chế độ riêng tư)
- **WHEN** ứng dụng khởi động trước hoặc vào ngày 2027-02-12
- **THEN** việc xoá khoá bị bỏ qua và ứng dụng khởi động bình thường

#### Scenario: Khởi động sau ngày 2027-02-12
- **GIVEN** cache `transformers-cache` và bốn khoá cũ vẫn còn trên thiết bị
- **WHEN** ứng dụng khởi động sau ngày 2027-02-12
- **THEN** bước dọn không chạy, cache và các khoá cũ không bị xoá

## ADDED Requirements

### Requirement: Dọn bản ghi file hoá đơn lưu trùng khi khởi động
Khi khởi động, hệ thống SHALL dọn các bản ghi `invoice_files` còn lưu cả `opfsPath` lẫn `blobData` từ bản trước, để mỗi ảnh chỉ còn một bản lưu trữ hợp lệ. Bước dọn chạy nền, không chặn khởi động. Lỗi của bước dọn MUST NOT chặn khởi động ứng dụng và MUST NOT được hiện ra cho người dùng.

#### Scenario: Bản ghi lưu trùng có tệp OPFS đúng dung lượng
- **GIVEN** một bản ghi có cả `opfsPath` và `blobData`, tệp OPFS đọc được và có đúng dung lượng của `blobData`
- **WHEN** ứng dụng khởi động
- **THEN** `blobData` bị xoá, `opfsPath` được giữ, và file vẫn đọc được

#### Scenario: Tệp OPFS mất hoặc lệch dung lượng nhưng ghi lại được
- **GIVEN** một bản ghi có cả `opfsPath` và `blobData`, nhưng tệp OPFS không đọc được hoặc lệch dung lượng, và `blobData` ghi lại được xuống OPFS
- **WHEN** ứng dụng khởi động
- **THEN** tệp OPFS được ghi lại từ `blobData`, đọc lại đúng dung lượng, rồi `blobData` mới bị xoá và `opfsPath` được giữ

#### Scenario: Tệp OPFS mất hoặc lệch và không ghi lại được
- **GIVEN** một bản ghi có cả `opfsPath` và `blobData`, tệp OPFS không đọc được hoặc lệch dung lượng, và việc ghi lại OPFS thất bại
- **WHEN** ứng dụng khởi động
- **THEN** `blobData` được giữ, `opfsPath` bị xoá, và file vẫn đọc được qua `blobData`

#### Scenario: Bước dọn gặp lỗi
- **GIVEN** truy cập OPFS ném lỗi trong bước dọn
- **WHEN** ứng dụng khởi động
- **THEN** lỗi được nuốt, ứng dụng khởi động bình thường và không có thông báo lỗi cho người dùng
