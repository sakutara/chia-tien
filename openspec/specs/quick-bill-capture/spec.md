# quick-bill-capture Specification

## Purpose
Capability này cho chủ app ghi nhanh một tờ bill ngay từ màn hình danh sách bữa: chụp một ảnh là có bữa mới, một kèo và hoá đơn có ảnh đính kèm, rồi được đưa thẳng tới bước thêm người. Bill đọc khớp tổng thì hoá đơn được lưu thẳng; bill chưa khớp thì mở form hoá đơn để sửa, và huỷ form thì không để lại bữa trống. Việc nhận dạng chữ và đối chiếu bill thuộc `receipt-ocr`; lưu hoá đơn thuộc `invoice-management`.

## Requirements

### Requirement: Nút chụp bill tạo bữa nhanh ở màn hình chính
Hệ thống SHALL hiển thị nút "Chụp bill tạo bữa nhanh" trên màn hình danh sách bữa, ở cả ba chế độ xem, có nhãn chữ và vùng chạm tối thiểu 44 px. Bấm nút mở camera trong trang; khi camera trong trang không dùng được thì dùng ứng dụng camera của máy. Nút không hiển thị ở trang Snapshot. Người dùng đóng camera mà chưa chụp thì không có dữ liệu nào được tạo.

#### Scenario: Mở camera từ màn hình chính
- **WHEN** người dùng bấm "Chụp bill tạo bữa nhanh" trên danh sách bữa
- **THEN** hộp thoại camera mở ra

#### Scenario: Huỷ trước khi chụp
- **WHEN** người dùng đóng hộp thoại camera mà chưa chụp
- **THEN** không có bữa, kèo hay ảnh nào được tạo

### Requirement: Tự tạo bữa và kèo sau khi chụp
Hệ thống SHALL, ngay sau khi có ảnh chụp, tạo một bữa `ACTIVE` theo đúng quy tắc tạo bữa mới (chủ trì và người tham gia duy nhất là "Tôi") với ngày hôm nay và tên mặc định theo ngày, tạo một kèo ở vị trí đầu trong bữa đó, và lưu ảnh vào một hoá đơn nháp của kèo. Nếu lưu ảnh thất bại, hệ thống MUST xoá bữa và kèo vừa tạo và báo lỗi tại màn hình chính.

#### Scenario: Chụp xong thì có bữa và kèo
- **WHEN** người dùng chụp một ảnh bill
- **THEN** một bữa `ACTIVE` mới và một kèo thuộc bữa đó được tạo
- **AND** ảnh được lưu gắn với bữa và kèo đó

#### Scenario: Không lưu được ảnh
- **WHEN** ảnh chụp không lưu được (sai định dạng, quá dung lượng hoặc bộ nhớ đầy)
- **THEN** bữa và kèo vừa tạo bị xoá
- **AND** màn hình chính hiện thông báo lỗi và không chuyển trang

### Requirement: Ngày bữa theo ngày trên bill
Hệ thống SHALL đặt ngày bữa tạo nhanh bằng ngày đọc được trên bill khi ngày đó hợp lệ trong khoảng `2000-01-01` đến `2099-12-31`, và đặt lại tên bữa thành tên mặc định theo ngày mới. Không đọc được ngày hợp lệ thì bữa giữ ngày hôm nay theo giờ địa phương của thiết bị.

#### Scenario: Bill có ngày
- **WHEN** bill đọc được ngày 05/03/2026 và hôm nay là 17/11/2026
- **THEN** bữa có ngày `2026-03-05` và tên "Bữa 05/03/2026"

#### Scenario: Bill không có ngày
- **WHEN** bill không đọc được ngày
- **THEN** bữa có ngày hôm nay và tên mặc định theo ngày hôm nay

### Requirement: Tự lưu hoá đơn khi bill đọc khớp
Hệ thống SHALL tự lưu hoá đơn vào kèo vừa tạo, không qua form, khi kết quả đọc bill có ít nhất một món, trạng thái đối chiếu là `OK` hoặc `CORRECTED`, và không có dòng hàng nào bị thiếu. Tổng hoá đơn tự lưu MUST bằng đúng tổng ghi trên bill, tính bằng số nguyên VNĐ.

#### Scenario: Bill đọc khớp
- **WHEN** bill đọc ra 3 món với tổng các món cộng VAT bằng tổng ghi trên bill là 1.234.500 đ
- **THEN** hoá đơn được lưu vào kèo với tổng 1.234.500 đ mà không mở form

#### Scenario: Bill khớp sau khi tự sửa số
- **WHEN** kết quả đối chiếu là `CORRECTED`
- **THEN** hoá đơn được lưu với các số đã sửa và tổng bằng tổng ghi trên bill

#### Scenario: Phần dư khi chia đều
- **WHEN** hoá đơn tự lưu có tổng 100.000 đ và sau đó bữa có 3 người tham gia kèo
- **THEN** tổng các phần chia của 3 người bằng đúng 100.000 đ

### Requirement: Nội dung hoá đơn tự lưu
Hệ thống SHALL lưu hoá đơn tự lưu ở dạng nhập chi tiết món, chia đều theo tổng, người ứng là "Tôi", gồm tên quán, ngày, món, giảm giá, phí phục vụ và VAT đọc được, và có ảnh bill đính kèm. Kèo được đổi tên theo quán theo quy tắc tên kèo theo quán từ bill.

#### Scenario: Hoá đơn tự lưu có ảnh và người ứng
- **WHEN** hoá đơn được tự lưu từ bill của quán "Phở Thìn"
- **THEN** hoá đơn có người ứng là "Tôi", cách chia đều theo tổng và ảnh bill đính kèm
- **AND** kèo được đổi tên theo quán thành "Kèo Phở Thìn"

### Requirement: Mở form hoá đơn khi bill chưa đọc khớp
Hệ thống SHALL mở form thêm hoá đơn của kèo vừa tạo, với ảnh bill đã đính kèm và dữ liệu đọc được đã điền kèm ghi chú đối chiếu, khi kết quả là `MISMATCH` hoặc `UNVERIFIED`, không có món nào, hoặc còn dòng hàng thiếu. Hệ thống cũng mở form này khi người dùng chọn "Để sau" ở hộp hỏi tải bộ đọc chữ, huỷ quét, hoặc quét gặp lỗi; khi đó form hiện lý do và người dùng nhập tay hoặc quét lại. Hoá đơn chỉ được lưu khi người dùng bấm "Lưu hoá đơn".

#### Scenario: Tổng lệch
- **WHEN** kết quả đối chiếu là `MISMATCH`
- **THEN** form hoá đơn mở với các món đã điền, ghi chú đối chiếu và ảnh bill
- **AND** chưa có hoá đơn nào được lưu

#### Scenario: Từ chối tải bộ đọc chữ
- **WHEN** bộ đọc chữ chưa có trên máy và người dùng chọn "Để sau"
- **THEN** form hoá đơn mở với ảnh bill và thông báo chưa tải bộ đọc chữ, các ô để trống

### Requirement: Huỷ tạo nhanh khi đóng form không lưu
Hệ thống SHALL xoá bữa, kèo và ảnh bill vừa tạo khi người dùng đóng form hoá đơn của luồng tạo nhanh mà không lưu, và ở lại danh sách bữa.

#### Scenario: Đóng form không lưu
- **WHEN** người dùng đóng form hoá đơn mà không lưu
- **THEN** bữa, kèo và ảnh bill vừa tạo bị xoá
- **AND** ứng dụng ở lại danh sách bữa

### Requirement: Chuyển sang bước thêm người
Hệ thống SHALL, sau khi hoá đơn được tự lưu hoặc sau khi form hoá đơn được lưu, chuyển sang trang làm việc của bữa vừa tạo theo đường dẫn `#/meal/<id>` và mở sẵn bước 2 "Người". Trong lúc lưu ảnh và quét, hệ thống hiển thị tiến trình kèm nút huỷ quét.

#### Scenario: Sau khi tự lưu
- **WHEN** hoá đơn được tự lưu từ bill đọc khớp
- **THEN** ứng dụng mở `#/meal/<id>` của bữa mới ở bước "Người"

#### Scenario: Sau khi lưu form
- **WHEN** người dùng sửa xong và bấm "Lưu hoá đơn" trong form mở từ luồng tạo nhanh
- **THEN** ứng dụng mở bữa mới ở bước "Người"
