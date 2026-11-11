## ADDED Requirements

### Requirement: Dán văn bản OCR từ công cụ ngoài
Hệ thống SHALL cung cấp nút "Dán text OCR ngoài" trong form hoá đơn. Nút mở một hộp để dán văn bản đã quét từ công cụ AI hoặc OCR bên ngoài. Khi người dùng bấm "Điền vào hoá đơn", văn bản SHALL được ghép lại theo khối (xem requirement ghép văn bản dán theo khối), rồi phân tích, đối chiếu và điền vào form giống như kết quả quét ảnh, ở trạng thái chưa lưu. Nút "Điền vào hoá đơn" SHALL bị vô hiệu khi ô văn bản rỗng hoặc chỉ có khoảng trắng, và nút mở hộp SHALL bị vô hiệu khi đang có lượt quét ảnh. Văn bản dán không được ghi vào `ocrRawText` của ảnh nào.

#### Scenario: Dán và điền vào form trống
- **WHEN** form hoá đơn chưa có dữ liệu và người dùng dán văn bản rồi bấm "Điền vào hoá đơn"
- **THEN** kết quả được điền ngay, chưa được lưu, và hộp dán đóng lại

#### Scenario: Ô văn bản rỗng
- **WHEN** ô văn bản trống hoặc chỉ có khoảng trắng
- **THEN** nút "Điền vào hoá đơn" bị vô hiệu

#### Scenario: Văn bản không có dữ liệu hoá đơn
- **WHEN** văn bản dán không nhận ra dòng món, ngày, tên quán hay tổng tiền nào
- **THEN** hệ thống hiện thông báo "Không nhận ra dữ liệu hoá đơn trong văn bản đã dán. Hãy kiểm tra lại văn bản hoặc nhập tay." và không điền gì vào form

#### Scenario: Form đã có dữ liệu do người dùng nhập
- **WHEN** form đã có tên quán hoặc món do người dùng nhập và người dùng dán văn bản
- **THEN** hệ thống hỏi trước khi ghi đè, như khi quét lại ảnh

#### Scenario: Đang có lượt quét ảnh
- **WHEN** một lượt quét ảnh đang chạy
- **THEN** nút "Dán text OCR ngoài" bị vô hiệu

### Requirement: Ghép văn bản dán theo khối thành dòng món
Hệ thống SHALL ghép lại văn bản dán khi mỗi ô của bảng nằm trên một dòng riêng, thành từng dòng món dạng "STT. Tên SL ĐG Thành tiền" trước khi phân tích. Khi một món có hai ô tiền, hệ thống SHALL lấy số lượng bằng thành tiền chia đơn giá nếu phép chia hết và thương từ 1 đến 99. Khi một món chỉ có một ô tiền, số lượng lấy từ ô SL và mặc định là 1. Phần tổng bị tách khối SHALL được ghép thành dòng "Tiền hàng" và dòng "Tổng thanh toán", với giá trị là số cuối của nhóm số. Văn bản không có ít nhất ba loại tiêu đề cột trong SL, ĐG, Thành tiền và Tên món, hoặc không có món nào, SHALL được giữ nguyên văn. Hệ thống không đoán tên hay giá.

#### Scenario: Ô số lượng bị đọc sai
- **WHEN** một món có hai ô tiền, thành tiền chia hết cho đơn giá và thương từ 1 đến 99
- **THEN** số lượng là thương đó, không lấy theo ô SL

#### Scenario: Tên kết thúc bằng số trùng số lượng
- **WHEN** tên món kết thúc bằng số đúng bằng số lượng lớn hơn 1, ví dụ "Miso Soup 4" với số lượng 4
- **THEN** số đó bị bỏ khỏi tên món

#### Scenario: Phần tổng bị tách khối
- **WHEN** nhãn "Tiền hàng" và "Tổng thanh toán" nằm trong một nhóm dòng và các số tiền nằm trong nhóm dòng sau
- **THEN** văn bản được ghép thành dòng "Tiền hàng" với số tiền hàng và dòng "Tổng thanh toán" với số cuối

#### Scenario: Không phải bố cục khối
- **WHEN** văn bản dán không có đủ ba loại tiêu đề cột hoặc không có món nào
- **THEN** văn bản giữ nguyên và được phân tích như văn bản thường

### Requirement: Chia món theo gạch phân cách
Hệ thống SHALL coi mỗi dòng gạch dài (sau khi bỏ khoảng trắng còn ít nhất năm ký tự, toàn ký tự gạch hoặc dấu phân cách, và có ít nhất một gạch, bằng, ngã hoặc gạch dưới) là ranh giới giữa hai món: dòng chữ nằm trên gạch không còn được ghép vào món nằm dưới gạch. Khi bill có ít nhất ba dòng bắt đầu bằng số thứ tự tăng dần, mỗi bước tăng không quá 3, hệ thống SHALL bỏ số thứ tự khỏi tên món và dùng số thứ tự lớn nhất làm số món đã gọi. Mỗi số thứ tự không gắn được với món nào SHALL được báo là "STT n: không đọc được dòng này". Khi bill có dòng tiêu đề cột chứa ít nhất hai trong các cụm tên món, SL, đơn giá, thành tiền, hệ thống SHALL chỉ đọc món từ dòng sau tiêu đề; nếu không có món nào sau tiêu đề thì đọc lại từ đầu bill. Bill có bảng STT chuẩn vẫn được đọc theo requirement đọc bảng hoá đơn GTGT.

#### Scenario: Gạch phân cách giữa hai món
- **WHEN** hai món được ngăn bởi một dòng gạch dài
- **THEN** dòng chữ nằm trên gạch không được ghép vào món nằm dưới gạch

#### Scenario: Bill đánh số và thiếu một dòng
- **WHEN** bill đánh số tới 13 nhưng chỉ đọc được 12 dòng món
- **THEN** tên món không còn số thứ tự, số món đã gọi là 13, và dòng thiếu được báo "STT n: không đọc được dòng này"

#### Scenario: Số lượng không bị nhầm thành số thứ tự
- **WHEN** chỉ có một hoặc hai dòng bắt đầu bằng số, như "2 Bia 50.000"
- **THEN** số đó không được coi là số thứ tự

#### Scenario: Thông tin đơn nằm trên tiêu đề cột
- **WHEN** bill có các dòng thông tin đơn như ngày hoặc thu ngân phía trên dòng tiêu đề "Tên món | SL | Đơn giá | Thành tiền"
- **THEN** các dòng nằm trên tiêu đề không thành món

## MODIFIED Requirements

### Requirement: Nhận món từ một dòng hoặc hai dòng
Hệ thống SHALL nhận món theo ba bố cục: một dòng gồm tên và các số tiền ở cuối, một dòng có dạng "tên SL x đơn giá = thành tiền", hoặc một dòng tên kèm dòng phép tính ngay sau. Thành tiền luôn là số cuối cùng của dòng. Món dưới 1.000 đồng, món không có chữ cái, và dòng ghi chú như "Ghi chú" hoặc "Size" không thành món. Món có SL × đơn giá khác thành tiền vẫn giữ thành tiền trên bill và được đánh dấu cần xem lại. Dòng chỉ có chữ, không có giá, nằm ngay trước dòng có giá SHALL được ghép vào đầu tên món của dòng có giá đó. Trong bill có gạch phân cách hoặc số thứ tự, dòng chỉ có chữ nằm ngay sau một món SHALL được nối vào cuối tên món đó; dòng chữ nằm ngay sau gạch phân cách không được nối vào món trước gạch. Món không còn chữ cái sau khi bỏ số tiền và số thứ tự SHALL bị bỏ khỏi danh sách, không tạo tên thay thế.

**Trước đây**: dòng chỉ có chữ chỉ được ghép vào đầu món kế tiếp có giá (`documentation/05-ocr-and-receipt-reading.md`, mục 5); món không còn chữ thì để "Món chưa rõ tên" và đánh dấu `uncertain` (`documentation/ocr-pipeline.md`, bước 11), quy tắc này không bao giờ có trong code.

#### Scenario: Hai số tiền ở cuối dòng
- **WHEN** dòng món kết thúc bằng hai số tiền và số đầu chia hết số sau
- **THEN** đơn giá là số đầu, thành tiền là số sau và số lượng được suy ra bằng phép chia

#### Scenario: Số lượng nằm trước một số tiền
- **WHEN** dòng món có một số nhỏ (từ 1 đến 99) và một số tiền, số nhỏ chia hết thành tiền
- **THEN** số nhỏ là số lượng và món được đánh dấu cần xem lại

#### Scenario: Số đầu không chia hết thành tiền
- **WHEN** số đứng trước các cột tiền không chia hết thành tiền
- **THEN** số đó thuộc về tên món và số lượng là 1

#### Scenario: Phép tính trên cùng một dòng
- **WHEN** dòng ghi "Lẩu bò 2 x 150.000 = 300.000"
- **THEN** món có tên "Lẩu bò", số lượng 2, đơn giá 150.000 và thành tiền 300.000

#### Scenario: Tên món bị xuống dòng trong bill có gạch
- **WHEN** bill có gạch phân cách và một món có dòng tên thứ hai, không có giá, nằm ngay dưới dòng giá của món đó
- **THEN** dòng tên thứ hai được nối vào cuối tên món, ví dụ "SALMON" và "SASIMI" thành "SALMON SASIMI"

#### Scenario: Dòng sau khi bỏ số tiền không còn chữ cái
- **WHEN** một dòng sau khi bỏ số tiền và số thứ tự không còn chữ cái
- **THEN** dòng đó không thành món và không tạo món có tên thay thế

### Requirement: Nhận ngày hoá đơn và tên quán
Hệ thống SHALL lấy ngày hoá đơn ở dạng dd/mm/yyyy, dd-mm-yy hoặc "Ngày d tháng m năm yyyy", kể cả khi có chú thích trong ngoặc. Chỉ nhận ngày có thật và năm từ 2000 đến 2099; ngày không có thật thì để trống. Tên quán lấy từ phần sau nhãn "Đơn vị bán hàng" (hoặc "Tên đơn vị bán", "Người bán") nếu nhãn xuất hiện ở bất kỳ dòng nào của bill. Nếu không có nhãn, chọn trong bốn dòng đầu một dòng không phải địa chỉ, điện thoại hoặc tiêu đề, ưu tiên dòng có từ khoá như nhà hàng, quán, cafe, lẩu, bbq và dòng viết hoa.

**Trước đây**: tên quán chỉ được chọn trong bốn dòng đầu của bill, và hoá đơn điện tử lấy tên sau nhãn "Đơn vị bán hàng" trong phạm vi đó (`documentation/ocr-pipeline.md`, bước 2; `documentation/epic-4/SA.md`, mục 3).

#### Scenario: Ngày không có thật
- **WHEN** bill ghi ngày 30/02/2026
- **THEN** ngày không được điền

#### Scenario: Năm hai chữ số
- **WHEN** bill ghi ngày 05/07/26
- **THEN** ngày được hiểu là 2026-07-05

#### Scenario: Tên quán trên hoá đơn điện tử
- **WHEN** bill có dòng "Đơn vị bán hàng (Company): TÊN QUÁN"
- **THEN** tên quán là phần sau dấu hai chấm hoặc ngoặc của nhãn

#### Scenario: Nhãn đơn vị bán hàng nằm sau dòng thứ tư
- **WHEN** bill có nhãn "Đơn vị bán hàng" ở dòng thứ năm trở đi
- **THEN** tên quán vẫn lấy từ nhãn đó, không chọn từ bốn dòng đầu
