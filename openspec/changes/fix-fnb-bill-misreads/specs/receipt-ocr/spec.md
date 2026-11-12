## ADDED Requirements

### Requirement: Tự xoay bill chụp nằm ngang
Trước khi dò chữ, hệ thống SHALL thử bill ở hướng 0°, 90°, 180° và 270°, chọn hướng cho nhiều dòng chữ được dò nhất, rồi mới nắn góc nghiêng trong ±30° như trước. Hệ thống MUST NOT xoay khi hướng 0° đã có đủ chữ.

#### Scenario: Bill chụp xoay 90°
- **WHEN** bill được chụp xoay 90° và hướng 0° dò được ít dòng chữ
- **THEN** hệ thống xoay bill sang hướng cho nhiều dòng chữ nhất và đọc theo hướng đó

#### Scenario: Bill đã thẳng
- **WHEN** hướng 0° dò được đủ dòng chữ
- **THEN** không xoay

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
