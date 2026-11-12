## ADDED Requirements

### Requirement: Tự xoay bill chụp nằm ngang
Khi độ tin cậy nhận dạng trung bình của hướng 0° (điểm tin cậy chia cho số hộp chữ được dò) thấp hơn 0,6, hệ thống SHALL thử bill ở hướng 90°, 180° và 270°, tính điểm tin cậy tổng của từng hướng, và chỉ đổi sang hướng có điểm cao hơn điểm của 0° ít nhất 20%. Ngược lại hệ thống giữ hướng 0°. Sau khi chọn hướng, việc nắn góc nghiêng trong ±30° giữ như trước. Đây là lựa chọn dựa trên độ tin cậy, không dựa trên số hộp chữ được dò, vì bộ dò chữ tìm được nhiều hộp ở mọi hướng.

#### Scenario: Bill chụp xoay 90° với độ tin cậy 0° thấp
- **WHEN** độ tin cậy trung bình ở 0° dưới 0,6 và hướng 90° có điểm tin cậy cao hơn 0° ít nhất 20%
- **THEN** hệ thống đọc bill theo hướng 90°

#### Scenario: Bill đã thẳng
- **WHEN** độ tin cậy trung bình ở 0° từ 0,6 trở lên
- **THEN** không thử hướng khác và không xoay

#### Scenario: Hướng khác không đủ tốt hơn
- **WHEN** độ tin cậy trung bình ở 0° dưới 0,6 nhưng không hướng nào cao hơn 0° ít nhất 20%
- **THEN** giữ hướng 0°

### Requirement: Loại số điện thoại và mã quầy khỏi số tiền
Dòng có số điện thoại, mã quầy, mã NVBH, mã số thuế hoặc số giao dịch SHALL không thành món và các số trong đó MUST NOT được coi là số tiền.

#### Scenario: Số điện thoại có số đuôi
- **WHEN** dòng ghi "02471066866- 33761"
- **THEN** không thành món và 33.761 không được coi là số tiền

#### Scenario: Quầy và NVBH
- **WHEN** dòng ghi "Quầy:001 NVBH: 09020497"
- **THEN** không thành món

### Requirement: Nhận khuyến mãi và tiền khách đưa tiếng Anh
Dòng khuyến mãi ("KM -400") và dòng "Tổng tiền giảm" (kể cả dạng OCR "Ã GIẢM") SHALL là giảm giá bằng số tiền. Các dòng RECEIVED, CHANGE SHALL không thành món và không là tổng bill.

#### Scenario: Khuyến mãi trên dòng món
- **WHEN** bill có dòng "KM -400" và dòng "TỔNG TIỀN Ã GIẢM 400"
- **THEN** giảm giá là 400 đồng và tổng bill là số ghi sau "TỔNG TIỀN PHẢI T. TOÁN"

#### Scenario: Tiền khách đưa tiếng Anh
- **WHEN** bill ghi "RECEIVED 500,000" và "CHANGE 80,000"
- **THEN** hai dòng đó không thành món

### Requirement: Món có số lượng đứng cuối tên
Khi dòng món chỉ có một số tiền và số nhỏ (1 đến 99) đứng cuối phần tên, số nhỏ đó SHALL là số lượng nếu số lượng × số tiền bằng số tiền bill, và món được đánh dấu cần xem lại.

#### Scenario: Số lượng 1 cuối tên
- **WHEN** dòng ghi "Fruit Garden Fresh 1 420,000" và tổng bill là 420.000
- **THEN** món là "Fruit Garden Fresh", số lượng 1, thành tiền 420.000

### Requirement: Tổng bill khi dòng số dư cuối bằng 0
Khi dòng cuối cùng có nhãn số dư ("Còn phải thu", "Còn lại", "Còn nợ") và số tiền bằng 0, tổng bill SHALL là số tiền của dòng tổng ngay phía trên dòng đó. Khi số dư khác 0, quy tắc cũ được giữ.

#### Scenario: Còn phải thu bằng 0 sau thanh toán
- **WHEN** bill có "Tổng thanh toán 640,000" rồi dòng cuối "Còn phải thu 0"
- **THEN** tổng bill là 640.000

#### Scenario: Còn lại khác 0
- **WHEN** dòng cuối "Còn lại 650,000"
- **THEN** quy tắc cũ được giữ, không đổi tổng bill
