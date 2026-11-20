## MODIFIED Requirements

### Requirement: Đọc VAT, giảm giá, phí phục vụ và tổng bill
Hệ thống SHALL đọc VAT, giảm giá, phí phục vụ và tổng bill từ các dòng có nhãn tương ứng, ưu tiên số tiền ghi trên bill hơn phần trăm. Khi bill có nhiều dòng VAT (ví dụ 8% cho đồ ăn và 10% cho bia rượu), hệ thống SHALL gộp các dòng có số tiền thành một khoản VAT theo số tiền cố định, bỏ dòng "Tổng tiền thuế" đứng sau các dòng VAT và bằng tổng của chúng, và ghi các mức phần trăm đã gộp; hệ thống MUST NOT tách hay lưu VAT theo từng món. Nếu nhiều dòng VAT chỉ ghi phần trăm khác nhau và không có số tiền, VAT để trống để người dùng nhập tổng tiền thuế. Phí giao hàng và phụ phí của ứng dụng giao đồ ăn được cộng vào phí phục vụ; dòng "Đã giảm ... tương ứng ...%" là giảm giá bằng số tiền. Dòng tiền hàng và tạm tính không phải tổng bill. Nhãn tổng không có số thì lấy số ở dòng kế tiếp nếu dòng đó chỉ có số tiền. Khi nhiều dòng tổng đọc lệch nhau, lấy số xuất hiện nhiều nhất nếu có ít nhất hai lần lặp lại.

#### Scenario: VAT ghi cả phần trăm và số tiền
- **WHEN** dòng VAT ghi cả "8%" và một số tiền
- **THEN** khoản VAT là số tiền trên bill

#### Scenario: Hai mức VAT có số tiền được gộp
- **WHEN** bill có dòng "VAT 8%" kèm 40.000 và dòng "VAT 10%" kèm 20.000
- **THEN** khoản VAT là số tiền cố định 60.000 và các mức đã gộp là 8% và 10%
- **AND** không tạo khoản VAT theo từng món

#### Scenario: Dòng tổng tiền thuế không bị cộng trùng
- **WHEN** bill có hai dòng VAT có số tiền và dòng "Tổng tiền thuế" ghi đúng tổng của hai dòng đó
- **THEN** khoản VAT là tổng của hai dòng VAT, không cộng thêm dòng tổng

#### Scenario: Nhiều mức phần trăm không có số tiền
- **WHEN** bill có dòng "VAT 8%" và dòng "VAT 10%" nhưng không dòng nào ghi số tiền thuế
- **THEN** VAT để trống và các mức 8% và 10% được ghi nhận để form nhắc người dùng nhập tổng tiền thuế

#### Scenario: Các dòng tổng đọc lệch nhau
- **WHEN** ba dòng tổng cùng ghi 550.000 và một dòng khác ghi 540.000
- **THEN** tổng bill là 550.000

#### Scenario: Dòng tổng ghi đã có thuế
- **WHEN** dòng tổng ghi "Tổng cộng số tiền đã có thuế GTGT" kèm số tiền
- **THEN** số tiền đó là tổng bill

#### Scenario: Không có dòng tổng
- **WHEN** bill không có dòng nhãn tổng và không có dòng tiền hàng
- **THEN** tổng bill để trống

## ADDED Requirements

### Requirement: Nhắc nhiều mức VAT trên form hoá đơn
Form hoá đơn SHALL hiện ghi chú sau khi quét khi bill có từ hai mức VAT: khi các mức đã được gộp thành một số tiền, ghi chú nêu các mức đã gộp; khi không đọc được số tiền thuế, ghi chú nêu các mức và nhắc người dùng chọn "Số tiền" và nhập tổng tiền VAT. Khi khoản VAT chưa ở dạng số tiền, form SHALL hiện gợi ý dưới ô VAT nhắc chọn "Số tiền" và nhập tổng tiền thuế. Gợi ý này MUST NOT hiện khi VAT đã là số tiền cố định.

#### Scenario: Bill hai mức đã gộp
- **WHEN** bill có VAT 8% và 10% đều có số tiền và người dùng quét bill
- **THEN** ghi chú hiện "Đã gộp VAT 8% + 10% thành một số tiền."
- **AND** ô VAT có giá trị là số tiền cố định đã gộp

#### Scenario: Bill hai mức không có số tiền thuế
- **WHEN** bill có VAT 8% và 10% nhưng không đọc được số tiền thuế
- **THEN** ô VAT để trống và ghi chú nhắc chọn "Số tiền" và nhập tổng tiền VAT

#### Scenario: Gợi ý dưới ô VAT
- **WHEN** ô VAT đang là phần trăm hoặc chưa nhập
- **THEN** form hiện gợi ý "Bill có nhiều mức VAT (8%, 10%)? Chọn "Số tiền" và nhập tổng tiền thuế."
- **AND** gợi ý không hiện khi ô VAT là số tiền cố định
