## MODIFIED Requirements

### Requirement: Đưa kết quả vào form hoá đơn để người dùng kiểm tra
Hệ thống SHALL điền kết quả đọc vào form hoá đơn ở trạng thái chưa lưu, kèm thông báo đối chiếu và cờ cần xem trên từng món. Nếu form đã có dữ liệu do người dùng nhập (tên quán, ngày, món, tiền hàng hoặc giảm giá, phí, VAT), hệ thống MUST hỏi trước khi ghi đè. Trường không đọc được được để trống, không điền 0. Khi kết quả chưa khớp, hệ thống chỉ hiện ghi chú đối chiếu để người dùng sửa tay theo ảnh; không có bước đọc lại tự động nào khác.

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

### Requirement: Nhận ngày hoá đơn và tên quán
Hệ thống SHALL lấy ngày hoá đơn ở dạng dd/mm/yyyy, dd-mm-yy hoặc "Ngày d tháng m năm yyyy", kể cả khi có chú thích trong ngoặc. Chỉ nhận ngày có thật và năm từ 2000 đến 2099; ngày không có thật thì để trống. Tên quán lấy từ phần sau nhãn "Đơn vị bán hàng" nếu có; nếu không, chọn trong bốn dòng đầu một dòng không phải địa chỉ, điện thoại hoặc tiêu đề và có từ khoá (nhà hàng, quán, cafe, lẩu, bbq, phở, bún, cơm và tương tự) hoặc phần lớn là chữ hoa; dòng có nhiều dấu hiệu hơn được ưu tiên. Dòng gồm nhãn và mã số (Số HĐ, Mã HĐ, Số bill, Số order, Số phiếu, Ngày, Giờ theo sau là dấu hai chấm và số) và dòng rác có từ một nửa số từ trở lên chỉ là một chữ cái hoặc một con số MUST NOT được chọn làm tên quán; không còn dòng nào phù hợp thì tên quán để trống.

#### Scenario: Ngày không có thật
- **WHEN** bill ghi ngày 30/02/2026
- **THEN** ngày không được điền

#### Scenario: Năm hai chữ số
- **WHEN** bill ghi ngày 05/07/26
- **THEN** ngày được hiểu là 2026-07-05

#### Scenario: Tên quán trên hoá đơn điện tử
- **WHEN** bill có dòng "Đơn vị bán hàng (Company): TÊN QUÁN"
- **THEN** tên quán là phần sau dấu hai chấm hoặc ngoặc của nhãn

#### Scenario: Dòng số hoá đơn không phải tên quán
- **WHEN** bốn dòng đầu chỉ có tiêu đề "HÓA ĐƠN THANH TOÁN" và dòng "Số HĐ: 300174"
- **THEN** tên quán để trống

#### Scenario: Dòng rác từ logo
- **WHEN** dòng đầu là "E R MAT s 38 E" do OCR đọc hỏng logo
- **THEN** dòng đó không được chọn làm tên quán
