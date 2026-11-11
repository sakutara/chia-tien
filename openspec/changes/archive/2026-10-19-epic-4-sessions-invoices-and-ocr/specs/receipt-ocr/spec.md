## ADDED Requirements

### Requirement: Quét OCR chạy cục bộ với tiến trình và nút Huỷ
Hệ thống SHALL quét OCR hoàn toàn trên máy bằng Tesseract.js với dữ liệu ngôn ngữ `vie` và `eng` đi kèm app, không gửi ảnh đi đâu và không cần API key. Quá trình quét SHALL hiển thị thanh tiến trình và nút Huỷ. Lần quét đầu có thể chậm hơn do khởi tạo. Nhiều ảnh SHALL được quét lần lượt và văn bản được ghép theo thứ tự ảnh. (BR-4.7, R-13)

#### Scenario: Quét bill mẫu bóc tách đủ thông tin (AC-3)
- **WHEN** người dùng bấm nhận diện nội dung cho ảnh bill mẫu có tiếng Việt
- **THEN** form được điền ngày, tên quán, các món với số lượng, đơn giá và thành tiền, VAT và tổng bill

#### Scenario: Huỷ quá trình quét
- **WHEN** người dùng bấm Huỷ trong lúc quét
- **THEN** quá trình quét dừng và form giữ nguyên dữ liệu đã có

### Requirement: Kết quả quét chưa được lưu cho tới khi người dùng bấm Lưu
Kết quả quét SHALL đổ vào form nhưng SHALL NOT được lưu cho tới khi người dùng bấm Lưu. OCR lỗi SHALL NOT làm mất ảnh và SHALL NOT chặn việc nhập tay. (BR-4.7, AC-3)

#### Scenario: OCR hỏng không chặn nhập tay (AC-3)
- **WHEN** quá trình quét OCR báo lỗi
- **THEN** ảnh vẫn được giữ, và người dùng vẫn nhập tay được các trường của Hoá đơn

### Requirement: Quét lại bill hỏi trước khi ghi đè
Người dùng SHALL có thể quét lại bill bất cứ lúc nào bằng nút "Quét lại bill (OCR)". Trước khi ghi đè những gì người dùng đã sửa tay, hệ thống SHALL hỏi xác nhận, và người dùng bấm Huỷ thì dữ liệu được giữ nguyên. (R-13, BR-4.7)

#### Scenario: Quét lại khi form đã có dữ liệu
- **WHEN** người dùng bấm quét lại trong form đã có dữ liệu do người dùng sửa tay
- **THEN** hệ thống hỏi trước khi ghi đè, và nếu người dùng bấm Huỷ thì form không đổi

### Requirement: Xử lý ảnh khi lưu như máy quét
Ảnh chụp hoặc tải lên SHALL được tìm bốn góc tờ hoá đơn, cắt và nắn phối cảnh để bỏ nền, rồi chuyển sang trắng đen bằng ngưỡng thích nghi với contrast 0,25, sao cho nền trắng hoàn toàn, không đổ bóng, và nét chữ vừa phải. Ảnh lưu là bản đã xử lý, dạng PNG nếu nhỏ hơn khoảng 1 MB, còn không thì dạng JPEG. Không dùng ảnh xám cho OCR vì OCR kém hẳn ở ảnh có bóng và nếp gấp. Không tìm thấy tờ giấy thì chỉ nhị phân hoá cả ảnh. Kết quả đáng ngờ hoặc lỗi SHALL rơi về bước nén ảnh. (BR-4.16)

Ghi chú: trước khi OCR, ảnh được đưa về cạnh dài 2800 px, chuyển xám, và kéo giãn tương phản theo phân vị 2% và 98% (SA B.7). Ảnh hoá đơn điện tử dạng bảng, nền trắng, được giữ ảnh xám và không nhị phân hoá (SA B.11, phần bổ sung).

#### Scenario: Ảnh hoá đơn điện tử nền trắng không bị nhị phân hoá
- **WHEN** ảnh có nền trắng đồng đều và bảng kẻ ô, như ảnh chụp màn hình hoá đơn điện tử
- **THEN** ảnh chỉ được cắt khung và kéo giãn tương phản, giữ dạng ảnh xám

### Requirement: Tự quét OCR sau khi lưu ảnh
Ngay sau khi ảnh được lưu, hệ thống SHALL tự quét OCR những ảnh chưa có văn bản OCR và điền form. Nếu form đã có dữ liệu thì SHALL hỏi trước khi ghi đè. Văn bản OCR SHALL được lưu vào metadata của chính ảnh (`ocrRawText`). Ảnh đã có văn bản SHALL NOT bị quét lại, trừ khi người dùng bấm "Quét lại bill (OCR)". (BR-4.17, AC-16)

#### Scenario: Thêm một bill rồi form tự điền (AC-16)
- **WHEN** người dùng tải một ảnh bill mới vào form Hoá đơn và không bấm nút quét
- **THEN** hệ thống tự quét, lưu văn bản vào `ocrRawText` của ảnh và điền form

#### Scenario: Ảnh đã có văn bản không bị quét lại (AC-16)
- **WHEN** người dùng thêm một ảnh khác vào Hoá đơn đã có ảnh được quét trước đó
- **THEN** chỉ ảnh mới được quét, còn ảnh cũ dùng lại văn bản đã lưu

### Requirement: Xem lại và sửa nhanh sau khi quét
Sau khi quét, mọi trường và từng dòng món SHALL sửa, xoá và thêm được. Dòng nghi ngờ, tức là dòng không đọc chắc số tiền, SHALL được đánh dấu. (BR-4.8)

#### Scenario: Dòng món nghi ngờ được đánh dấu (AC-3)
- **WHEN** một dòng món có số tiền không đọc chắc sau khi quét
- **THEN** dòng đó được đánh dấu để người dùng kiểm tra trước khi lưu

### Requirement: Đối chiếu trước khi điền và thử các kịch bản sửa
Trước khi điền form, hệ thống SHALL đối chiếu bằng `domain/receiptValidation`. Mỗi dòng món phải có số lượng nhân đơn giá bằng thành tiền. Tổng các món, sau khi trừ giảm giá, cộng phí phục vụ và VAT theo R-8, SHALL khớp tổng bill và dòng "Tổng tiền hàng". Nếu lệch, hệ thống SHALL thử các kịch bản khác từ cùng văn bản OCR, gồm sửa số lượng, đơn giá hoặc thành tiền một dòng, bỏ dòng tổng bị đọc thành món, đổi hoặc thêm giảm giá, phí phục vụ, VAT, và đổi cách tính. Hệ thống SHALL chọn kịch bản ít thay đổi nhất và đánh dấu dòng đã sửa. Nếu không kịch bản nào khớp, hệ thống SHALL giữ số đọc được và báo người dùng chỉnh tay. OCR sai hoặc lỗi SHALL NOT bao giờ chặn nhập tay. (BR-4.8)

#### Scenario: Có kịch bản sửa một dòng khớp tổng
- **WHEN** tổng các món lệch tổng bill do một dòng bị đọc sai số lượng
- **THEN** hệ thống chọn kịch bản chỉ sửa dòng đó, đánh dấu dòng đã sửa, và tổng khớp

#### Scenario: Không kịch bản nào khớp tổng
- **WHEN** không có kịch bản nào khiến tổng các món khớp tổng bill
- **THEN** hệ thống giữ số đọc được và báo người dùng chỉnh tay

### Requirement: Cảnh báo khi tổng các món lệch tổng ghi trên bill
Khi OCR đọc được dòng "Tổng cộng" hoặc "Thanh toán" và tổng tính được từ món lệch với tổng ghi trên bill, hệ thống SHALL hiển thị cảnh báo kèm gợi ý kiểm tra lại giảm giá, phí phục vụ và VAT. Cảnh báo SHALL NOT chặn lưu, vì bill có thể có khoản app chưa hỗ trợ như tip hoặc làm tròn. (R-11)

#### Scenario: Tổng tính được lệch tổng bill
- **WHEN** tổng tính được là 1.620.000 ₫ nhưng bill ghi 1.650.000 ₫
- **THEN** hệ thống hiện cảnh báo lệch tổng kèm gợi ý kiểm tra lại giảm giá, phí phục vụ và VAT, và người dùng vẫn lưu được

### Requirement: Bóc tách ngày của Hoá đơn
Hệ thống SHALL bóc tách ngày theo các mẫu `dd/mm/yyyy`, `dd-mm-yy` và `Ngày d tháng m năm yyyy`, lấy ngày hợp lệ đầu tiên. Năm hai chữ số SHALL được hiểu là 20xx. Ngày ngoài khoảng từ 2000-01-01 đến 2099-12-31, hoặc không có thật, SHALL bị bỏ và không được điền bừa. Đổi ngày của Bữa không đổi ngày của Hoá đơn. (R-7)

#### Scenario: Ngày bị đọc lẫn chữ không có thật
- **WHEN** OCR đọc được chuỗi `31/02/2026`
- **THEN** ngày đó bị bỏ và trường ngày để trống

### Requirement: Bóc tách tên quán và các dòng không phải món
Hệ thống SHALL lấy tên quán từ một đến bốn dòng đầu, chọn dòng có điểm cao nhất theo từ khoá và chữ in hoa, và trừ điểm cho dòng địa chỉ hoặc số điện thoại. Hệ thống SHALL bỏ dòng tiêu đề bảng, dòng chân trang và các dòng giảm giá, phí phục vụ, VAT ra khỏi danh sách món. Hệ thống SHALL NOT coi mã số thuế, số hoá đơn hay số tài khoản là món hoặc số tiền. (R-14, BR-4.19)

#### Scenario: Dòng địa chỉ không được chọn làm tên quán
- **WHEN** dòng đầu của bill là tên quán và dòng thứ hai là địa chỉ
- **THEN** tên quán là dòng đầu tiên

### Requirement: Bóc tách món, giá, giảm giá, phí phục vụ và VAT
Hệ thống SHALL bóc tách món theo hai bố cục: một dòng gồm tên, số lượng, đơn giá và thành tiền; và hai dòng gồm tên ở dòng trên, số lượng `x` đơn giá `=` thành tiền ở dòng dưới. Số tiền theo kiểu Việt như `45.000`, `45,000`, `45000` và `45k` được nhận biết, còn dấu `.` hoặc `,` đứng trước đúng ba chữ số cuối là dấu phân cách nghìn. Với VAT, nếu dòng thuế có số tiền thì ưu tiên `FIXED_AMOUNT`, ngược lại dùng phần trăm `PERCENTAGE` cho các giá trị 5, 8 hoặc 10, còn giá trị khác được đánh dấu nghi ngờ nhưng vẫn được điền. Giảm giá và phí phục vụ, khi có cả phần trăm và số tiền, SHALL ưu tiên số tiền và giữ phần trăm làm ghi chú. Giảm giá có thể mang dấu trừ hoặc đặt trong ngoặc, và SHALL được lấy giá trị tuyệt đối. Nếu quantity nhân unitPrice không bằng rawAmount thì SHALL dùng rawAmount và đặt `uncertain = true`. Không chắc thì bỏ trống và đánh dấu, không đoán số tiền. (R-14)

#### Scenario: Giảm giá bằng số tiền có dấu trừ
- **WHEN** bill có dòng `Giảm giá -100.000` và dòng `Giảm giá 10%` cùng lúc
- **THEN** giảm giá lấy số tiền 100.000 và giữ 10% làm ghi chú

#### Scenario: Mã số thuế không bị hiểu là VAT
- **WHEN** bill có dòng mã số thuế và dòng VAT 8%
- **THEN** VAT được lấy từ dòng VAT 8%, còn mã số thuế không được dùng làm VAT

### Requirement: Đọc lại số tiền sau lượt quét chính
Sau lượt quét chính, các số tiền SHALL được cắt riêng và đọc lại bằng bộ đọc chỉ có chữ số để sửa lỗi nhầm chữ số, gồm `1` và `4`, `6` và `8`. Lượt đọc lại SHALL chỉ sửa chữ số, không thêm và không bớt dòng, và kết quả vẫn qua đối chiếu tổng theo BR-4.8. Ký tự viền bảng, chữ `đ` bị đọc thành số, và số dài hơn tám chữ số mà lẻ SHALL NOT bị tính là số tiền hoặc món. (BR-4.19)

#### Scenario: Số 1 bị đọc thành 4 được sửa lại
- **WHEN** lượt quét chính đọc đơn giá `14.000` nhưng lượt đọc lại chỉ chữ số cho `11.000`
- **THEN** đơn giá được sửa thành `11.000` và kết quả vẫn được đối chiếu tổng

### Requirement: Bill có dòng tổng nhóm Drink và Food
Các dòng nhóm như `Drink 30.000` và `Food 1.510.000` SHALL được hiểu là subtotal của nhóm món, và SHALL NOT thay thế các món đọc được. Món của mỗi nhóm SHALL được đối chiếu với dòng nhóm của nó. Nếu nhóm thiếu món thì hệ thống SHALL thêm dòng "Món chưa đọc được" đúng phần còn thiếu, đánh dấu để xem lại, và ghi chú nêu nhóm và số tiền. Chỉ khi không đọc được món nào mới dùng hai dòng nhóm làm hai món. Số có dấu chấm hoặc phẩy thừa phía sau, như `90.000.` hoặc `1.`, vẫn được đọc. (BR-4.20, AC-19)

#### Scenario: Bill Matchandeul BBQ giữ đủ món đọc được (AC-19)
- **WHEN** bill có bảy món, dòng `Drink 30.000`, dòng `Food 1.510.000` và tổng 1.540.000, trong đó hai dòng món bị mất vì số có dấu chấm thừa
- **THEN** các món đọc được vẫn được giữ, nhóm Food có thêm dòng "Món chưa đọc được" 220.000 nếu phần đó vẫn không đọc được, và không bao giờ chỉ còn hai dòng `Tổng đồ uống` và `Tổng đồ ăn` khi đã đọc được món

### Requirement: Bill mẫu Bún Ốc đọc đúng tổng và các món
Với bill mẫu Bún Ốc có bốn món và tổng 176.000, sau khi quét hệ thống SHALL đọc đủ bốn món với số lượng, đơn giá và thành tiền đúng, tổng 176.000, và SHALL NOT biến số `Số: 2506041166`, mã số thuế hoặc số tài khoản thành món. Nhãn `Téng thanh toán` và `176.0004` vẫn SHALL cho ra tổng 176.000. (BR-4.19, BR-4.16, AC-18)

#### Scenario: Bill Bún Ốc đọc đủ bốn món (AC-18)
- **WHEN** người dùng quét ảnh bill Bún Ốc mẫu
- **THEN** có bốn món đúng số lượng, đơn giá và thành tiền, tổng 176.000, và không có món nào là số hoá đơn hay mã số thuế

#### Scenario: Nhãn tổng bị OCR đọc sai vẫn ra đúng tổng (AC-18)
- **WHEN** OCR đọc nhãn tổng thành `Téng thanh toán` và số tổng thành `176.0004`
- **THEN** tổng bill được lấy là 176.000

### Requirement: Phát hiện ảnh trùng trong cùng Bữa
Sau khi quét, nếu văn bản OCR của ảnh mới giống ảnh đã có trong cùng Bữa, hoặc trong cùng Hoá đơn hoặc Hoá đơn khác, form SHALL hiện thông báo nêu tên hai ảnh, mức giống và hai nút: "Xoá ảnh trùng", xoá ảnh mới, và "Giữ lại". Ảnh trùng với ảnh cùng Hoá đơn SHALL NOT điền lại form, vì dữ liệu đã có từ ảnh gốc. Hệ thống SHALL chỉ cảnh báo và SHALL NOT tự xoá. (BR-4.18, AC-17)

#### Scenario: Chụp cùng bill hai lần ở kích thước khác nhau (AC-17)
- **WHEN** người dùng thêm vào cùng Hoá đơn một ảnh khác byte nhưng cùng nội dung bill với ảnh đã có
- **THEN** hệ thống báo trùng 100 phần trăm, hiện nút "Xoá ảnh trùng" và "Giữ lại", và không điền lại form

#### Scenario: Bill khác nhau không bị báo trùng (AC-17)
- **WHEN** người dùng thêm một bill khác hẳn các ảnh đã có trong Bữa
- **THEN** hệ thống không báo trùng

### Requirement: So khớp ảnh trùng bằng tập từ
Hệ thống SHALL so sánh tập từ của văn bản OCR sau khi bỏ dấu tiếng Việt, chỉ giữ chữ và số, và bỏ từ một ký tự, bằng độ giống Jaccard. Từ 0,8 trở lên thì coi là trùng. Văn bản dưới 8 từ không đủ để kết luận và SHALL NOT bị báo trùng. Chỉ so sánh với ảnh của cùng Bữa. (R-19)

#### Scenario: Văn bản quá ngắn không báo trùng
- **WHEN** hai ảnh có văn bản OCR đều dưới 8 từ và giống nhau
- **THEN** hệ thống không báo trùng

### Requirement: Phân tích hoá đơn là hàm thuần có bộ ví dụ chuẩn
Bộ phân tích hoá đơn SHALL là hàm thuần, không đọc cơ sở dữ liệu và không chạm DOM, và SHALL có bộ bill mẫu làm test. Trước khi phân tích, văn bản SHALL được tách dòng, bỏ dòng rỗng, chuẩn hoá khoảng trắng, và sửa các lỗi OCR thường gặp trong ô số như `O` thành `0`, `l` hoặc `I` thành `1`, và `S` thành `5` chỉ khi phần còn lại là số. (R-14)

#### Scenario: Bộ bill mẫu được chạy cả bản có dấu và bản không dấu (AC-3)
- **WHEN** test chạy trên năm bill mẫu và bản không dấu của từng bill
- **THEN** kết quả phân tích của mỗi bill khớp với kết quả mong đợi
