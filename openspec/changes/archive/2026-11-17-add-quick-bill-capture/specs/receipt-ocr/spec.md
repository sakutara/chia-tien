## MODIFIED Requirements

### Requirement: Đưa kết quả vào form hoá đơn để người dùng kiểm tra
Hệ thống SHALL điền kết quả đọc vào form hoá đơn ở trạng thái chưa lưu, kèm thông báo đối chiếu và cờ cần xem trên từng món. Nếu form đã có dữ liệu do người dùng nhập (tên quán, ngày, món, tiền hàng hoặc giảm giá, phí, VAT), hệ thống MUST hỏi trước khi ghi đè. Trường không đọc được được để trống, không điền 0. Khi kết quả chưa khớp, hệ thống chỉ hiện ghi chú đối chiếu để người dùng sửa tay theo ảnh; không có bước đọc lại tự động nào khác. Ngoại lệ duy nhất: trong luồng chụp bill tạo bữa nhanh (capability `quick-bill-capture`), kết quả `OK` hoặc `CORRECTED` có món và không thiếu dòng hàng được lưu thẳng thành hoá đơn mà không qua form.

#### Scenario: Form trống
- **WHEN** form hoá đơn chưa có dữ liệu nào và người dùng quét xong
- **THEN** kết quả được điền ngay và chưa được lưu

#### Scenario: Form đã có dữ liệu
- **WHEN** form đã có tên quán hoặc món do người dùng nhập và người dùng quét lại
- **THEN** hệ thống hỏi trước khi ghi đè

#### Scenario: Kết quả cần đọc lại
- **WHEN** kết quả là MISMATCH hoặc UNVERIFIED, không có món nào, hoặc còn dòng hàng thiếu
- **THEN** hệ thống hiện ghi chú đối chiếu nêu chỗ lệch và người dùng sửa tay theo ảnh bill

#### Scenario: Không đọc được số tiền
- **WHEN** một khoản như VAT không đọc được số tiền hay phần trăm
- **THEN** ô tương ứng trong form để trống và không điền 0

#### Scenario: Tạo nhanh từ bill đọc khớp
- **WHEN** luồng chụp bill tạo bữa nhanh nhận kết quả `OK` có món và không thiếu dòng hàng
- **THEN** hoá đơn được lưu thẳng, không mở form
