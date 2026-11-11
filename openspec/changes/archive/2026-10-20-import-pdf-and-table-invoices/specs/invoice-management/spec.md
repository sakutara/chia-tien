## ADDED Requirements

### Requirement: Nhập PDF làm hoá đơn
Hệ thống SHALL nhận tệp PDF tối đa 40 MB làm ảnh đính kèm hoá đơn. Mỗi trang PDF thành một ảnh JPEG, và nếu trang có lớp chữ thì văn bản đó được lưu cùng ảnh để không phải đọc lại bằng OCR. Chỉ các trang đầu còn chỗ trong giới hạn ảnh được nhận, và hệ thống MUST báo khi PDF bị cắt bớt. PDF có mật khẩu hoặc không đọc được MUST bị từ chối với thông báo tương ứng.

#### Scenario: PDF có trang có chữ và trang ảnh quét
- **WHEN** người dùng tải lên PDF hai trang, trang một có lớp chữ và trang hai là ảnh quét
- **THEN** hai ảnh được thêm vào hoá đơn
- **AND** ảnh trang một mang kèm văn bản của PDF, còn ảnh trang hai không có văn bản

#### Scenario: PDF dài hơn số chỗ còn lại
- **WHEN** hoá đơn còn một chỗ và người dùng tải lên PDF ba trang
- **THEN** chỉ trang đầu được thêm vào hoá đơn
- **AND** hệ thống báo PDF có 3 trang nhưng chỉ nhận 1 trang đầu

#### Scenario: PDF có mật khẩu
- **WHEN** người dùng tải lên PDF có mật khẩu
- **THEN** hệ thống từ chối và báo PDF cần được mở khoá trước khi tải lại

## MODIFIED Requirements

### Requirement: Định dạng, dung lượng và số lượng ảnh đính kèm
Hệ thống SHALL chỉ nhận ảnh JPEG, PNG hoặc WebP làm ảnh hoá đơn, với dung lượng tối đa 40 MB cho mỗi ảnh trước khi nén. PDF được nhận qua đường riêng theo requirement "Nhập PDF làm hoá đơn". Một hoá đơn MUST có tối đa 10 ảnh, kể cả ảnh tách từ PDF. Khi trình duyệt không cho biết kiểu tệp, hệ thống suy ra kiểu từ đuôi .jpg, .jpeg, .png hoặc .webp.

**Trước đây**: thiết kế gốc (BR-4.6, R-12) chỉ nhận JPEG, PNG hoặc WebP và không có PDF. SA ghi giới hạn 15 MB mỗi ảnh trước nén (mục rủi ro 7 và mục "Em giữ theo đề xuất ban đầu"), còn R-12 trong BR ghi 40 MB. Lý do cho việc chọn 40 MB không xác định được từ lịch sử.

#### Scenario: Tệp không phải ảnh được hỗ trợ
- **WHEN** người dùng tải lên một tệp GIF
- **THEN** hệ thống từ chối tệp và báo chỉ nhận JPEG, PNG, WebP hoặc PDF, kèm gợi ý đổi sang JPEG nếu máy chụp ảnh HEIC
- **AND** không có ảnh nào được lưu

#### Scenario: Tệp ảnh không có kiểu MIME
- **WHEN** người dùng tải lên tệp có đuôi .jpg nhưng trình duyệt không cho kiểu tệp
- **THEN** hệ thống nhận tệp như ảnh JPEG

#### Scenario: Ảnh vượt quá 40 MB
- **WHEN** người dùng tải lên ảnh nặng hơn 40 MB
- **THEN** hệ thống từ chối và báo ảnh tối đa 40 MB

#### Scenario: Thêm ảnh thứ mười một
- **WHEN** hoá đơn đã có 10 ảnh và người dùng thêm thêm một ảnh
- **THEN** hệ thống từ chối với thông báo mỗi hoá đơn tối đa 10 ảnh
- **AND** nút chụp và nút tải lên bị khoá khi đã đủ 10 ảnh
