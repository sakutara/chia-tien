## ADDED Requirements

### Requirement: Bộ bill hồi quy của quán ăn và quán cà phê
Dự án SHALL có một bộ bill hồi quy gồm văn bản đã nhận dạng của các bill quán ăn và quán cà phê thật, mỗi bill kèm tổng tiền chuẩn. Một bài kiểm tra tự động SHALL chạy bộ phân tích và bước đối chiếu trên toàn bộ bộ bill và đếm hai chỉ số: số bill lấy đúng tổng bill, và số bill khớp trọn (lấy đúng tổng và trạng thái đối chiếu là OK hoặc CORRECTED). Hai chỉ số MUST NOT thấp hơn ngưỡng sàn ghi trong bài kiểm tra. Bộ bill MUST NOT chứa ảnh.

#### Scenario: Thay đổi làm bộ phân tích tốt lên
- **WHEN** một thay đổi của bộ phân tích làm số bill khớp trọn tăng
- **THEN** bài kiểm tra đạt và ngưỡng sàn được nâng lên bằng số mới

#### Scenario: Thay đổi làm hỏng bill đang đọc được
- **WHEN** một thay đổi làm số bill lấy đúng tổng hoặc số bill khớp trọn thấp hơn ngưỡng sàn
- **THEN** bài kiểm tra không đạt

### Requirement: Đọc dòng món có số thứ tự đầu dòng và nghìn cách bằng khoảng trắng
Khi tiêu đề bảng món có cột số thứ tự (TT, STT, #) hoặc dòng món bắt đầu bằng số thứ tự kèm dấu ")" hoặc ".", hệ thống SHALL bỏ số thứ tự khỏi tên món. Số tiền viết nhóm nghìn cách nhau bằng khoảng trắng ("50 000", "1 250 000") SHALL được đọc như số tiền có dấu phân cách nghìn, kể cả khi đơn giá và thành tiền đứng liền nhau trên cùng dòng. Số lượng, đơn giá và thành tiền được gán theo quan hệ số lượng × đơn giá = thành tiền.

#### Scenario: Một món có số thứ tự, số lượng, đơn giá và thành tiền
- **WHEN** dòng món ghi "1 Caramel Machiato (Đá) (Nhỏ) 1 50 000 50 000" dưới tiêu đề "TT Tên món SL Đ.Giá T.Tiền"
- **THEN** món có tên "Caramel Machiato (Đá) (Nhỏ)", số lượng 1, đơn giá 50.000 và thành tiền 50.000

#### Scenario: Nhiều món, số lượng lớn hơn 1
- **WHEN** dòng món ghi "2 Bánh Mì Que 2 10 000 20 000"
- **THEN** món có tên "Bánh Mì Que", số lượng 2, đơn giá 10.000 và thành tiền 20.000

#### Scenario: Số thứ tự kèm dấu ngoặc
- **WHEN** dòng món ghi "1) Nước ép dưa hấu 1 39,000 39,000"
- **THEN** món có tên "Nước ép dưa hấu", số lượng 1, đơn giá 39.000 và thành tiền 39.000

#### Scenario: Số đầu dòng thuộc tên món
- **WHEN** bill không có cột số thứ tự và dòng món ghi "7 Up 1 15 000 15 000"
- **THEN** tên món giữ nguyên là "7 Up"

### Requirement: Đọc món hai dòng khi dòng dưới chỉ có số
Khi một dòng chỉ có chữ (tên món) được theo sau bởi một dòng chỉ có số, hệ thống SHALL ghép hai dòng thành một món. Dòng số có thể gồm đơn giá, số lượng và thành tiền theo thứ tự bất kỳ, hoặc có dạng "SL x đơn giá thành tiền". Khi dòng tên đã có số lượng và thành tiền, dòng dưới chỉ có một số tiền là đơn giá của món đó. Dòng tiêu đề cột MUST NOT được ghép vào tên món.

#### Scenario: Dòng số gồm đơn giá, số lượng, thành tiền
- **WHEN** bill ghi "Trà chanh" rồi dòng "10,000 6 60,000"
- **THEN** món có tên "Trà chanh", số lượng 6, đơn giá 10.000 và thành tiền 60.000

#### Scenario: Dòng số có dấu nhân
- **WHEN** bill ghi "GOI GA-110" rồi dòng "1 x 110,000 110,000"
- **THEN** món có tên "GOI GA-110", số lượng 1, đơn giá 110.000 và thành tiền 110.000

#### Scenario: Dòng dưới chỉ có đơn giá
- **WHEN** bill ghi "Trà 2 12,000" rồi dòng "6,000"
- **THEN** món có tên "Trà", số lượng 2, đơn giá 6.000 và thành tiền 12.000
- **AND** dòng "6,000" không thành món riêng

#### Scenario: Dòng tiêu đề cột đứng ngay trên món đầu tiên
- **WHEN** dòng "Mặt hàng SL Số tiền" đứng ngay trên dòng "Set 30 1 459,000"
- **THEN** tên món là "Set 30", không chứa chữ của dòng tiêu đề

### Requirement: Nhận dòng tổng, tạm tính và tiền khách trả theo nhãn của quán ăn
Hệ thống SHALL coi dòng có nhãn "Thành tiền" đứng đầu dòng, sau các dòng món, là dòng tổng: nếu bill có thêm dòng tổng thanh toán phía dưới thì số đó là tiền hàng, nếu không thì số đó là tổng bill. Dòng "Số tiền" đứng trước dòng "Thanh toán" là tiền hàng. Với nhãn tiếng Anh, "Sub Total" là tiền hàng và "Total" là tổng bill. Các dòng tiền khách đưa, khách trả, trả khách, tiền thừa, Cash và Change MUST NOT thành món và MUST NOT là tổng bill.

#### Scenario: Bill chỉ có nhãn Thành tiền
- **WHEN** sau các dòng món chỉ có dòng "Thành tiền: 25,000" và không có dòng tổng nào khác
- **THEN** tổng bill là 25.000

#### Scenario: Thành tiền đứng trước giảm giá và Thanh toán
- **WHEN** bill ghi "Thành tiền: 107 000", "- Giảm giá: 6 000", "Thanh Toán 101000"
- **THEN** tiền hàng là 107.000, giảm giá là 6.000 và tổng bill là 101.000

#### Scenario: Bill nhãn tiếng Anh
- **WHEN** bill ghi "Sub Total: 64,000", "Total VND 64,000", "Cash -64,000"
- **THEN** tiền hàng là 64.000 và tổng bill là 64.000
- **AND** dòng Cash không thành món

#### Scenario: Dòng tiền khách đưa
- **WHEN** bill có dòng "Tiền khách đưa 200,000" và "Tiền thừa: 116,000"
- **THEN** hai dòng đó không thành món và không đổi tổng bill

### Requirement: Đọc bill có hai dòng Tổng và làm tròn
Khi bill có hai dòng nhãn "Tổng" với số khác nhau và giữa chúng có dòng giảm giá, phí hoặc làm tròn, hệ thống SHALL coi số của dòng đầu là tiền hàng và số của dòng sau là tổng bill. Dòng "Làm tròn" là khoản điều chỉnh nguyên đồng và SHALL được gộp vào giảm giá sao cho tổng các món trừ giảm giá đúng bằng tổng bill từng đồng.

#### Scenario: Hai dòng Tổng
- **WHEN** bill ghi "Tổng 4 495,000", "Giảm Giá (15%) -74,250", "Làm tròn 250", "Tổng 421,000"
- **THEN** tiền hàng là 495.000 và tổng bill là 421.000

#### Scenario: Làm tròn lên gộp vào giảm giá
- **WHEN** tiền hàng là 495.000, giảm giá 15% là 74.250 và bill làm tròn lên 250 để tổng là 421.000
- **THEN** giảm giá của bill là 74.000 đồng
- **AND** tổng các món trừ giảm giá bằng đúng 421.000

### Requirement: Tính lại giảm giá theo phần trăm khi số tiền không khớp
Khi dòng giảm giá ghi cả phần trăm lẫn số tiền mà số tiền không làm tổng khớp, bước đối chiếu SHALL thử số tiền tính từ phần trăm trên tiền hàng và ghi nhận là đã sửa nếu khớp.

#### Scenario: Số tiền giảm giá bị đọc sai một chữ số
- **WHEN** dòng giảm giá ghi "(15%) -44,250" trong khi 15% của tiền hàng 495.000 là 74.250 và chỉ số 74.250 làm tổng khớp
- **THEN** trạng thái đối chiếu là CORRECTED và ghi chú nêu giảm giá đã được tính lại từ phần trăm

#### Scenario: Làm tròn khi không có giảm giá
- **WHEN** bill không có giảm giá, tiền hàng là 100.300 và dòng "Làm tròn -300" cho tổng 100.000
- **THEN** giảm giá của bill là 300 đồng và tổng các món trừ giảm giá bằng đúng 100.000

### Requirement: Bỏ dòng tuỳ chọn không đồng và dòng bảng thuế khỏi danh sách món
Dòng nằm ngay dưới một món mà chỉ gồm ghi chú trong ngoặc hoặc tên tuỳ chọn, kèm số lượng 0 hoặc đơn giá 0, MUST NOT thành món và MUST NOT làm mất món phía trên. Chữ cái đơn lẻ đứng sau thành tiền (mã thuế suất như "B") SHALL bị bỏ khỏi dòng món. Dòng của bảng thuế ở chân bill, gồm mã thuế suất, phần trăm, giá trước thuế, tiền thuế và giá sau thuế, MUST NOT thành món.

#### Scenario: Dòng tuỳ chọn trong ngoặc
- **WHEN** bill ghi "cà phê sữa hạt dẻ (M) 1 19 000 19 000" rồi dòng "(MV) 0 19 000"
- **THEN** có đúng một món "cà phê sữa hạt dẻ (M)" với số lượng 1 và thành tiền 19.000

#### Scenario: Mã thuế suất sau thành tiền
- **WHEN** dòng món ghi "Sua Chua Voi Trai Ca pha 64,000 B"
- **THEN** món có tên "Sua Chua Voi Trai Ca pha" và thành tiền 64.000

#### Scenario: Dòng bảng thuế
- **WHEN** dưới dòng tổng có tiêu đề "VAT% Net.Amt VAT Amount" và dòng "B 10 58,182 5,818 64,000"
- **THEN** dòng đó không thành món
