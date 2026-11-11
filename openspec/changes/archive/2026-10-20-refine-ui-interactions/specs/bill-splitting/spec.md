## MODIFIED Requirements

### Requirement: Sửa và xoá món
Hệ thống SHALL cho sửa hoặc xoá từng món đã lưu của hoá đơn `ITEMIZED`. Khi sửa, người ăn và số phần của món được giữ nguyên. Hoá đơn `ITEMIZED` MUST luôn còn ít nhất một món, và việc xoá món kéo theo tính lại toàn bộ hoá đơn. Việc sửa diễn ra tại chỗ trên dòng món: bấm vào dòng "đơn giá × SL = thành tiền" mở Popover để sửa số lượng và đơn giá, thành tiền tự tính lại. Tên món bấm để đổi trực tiếp trên dòng.

**Trước đây**: tài liệu `documentation/epic-5/SA.md` mô tả việc thêm và sửa nhanh một món bằng hộp thoại `ItemInlineFormDialog`, gồm các trường Tên món, Số lượng, Đơn giá và Thành tiền.

#### Scenario: Sửa món đã có người ăn
- **WHEN** người dùng sửa tên, số lượng hoặc đơn giá của một món đã có người ăn
- **THEN** danh sách người ăn và số phần của món không thay đổi

#### Scenario: Xoá món đã có người ăn
- **WHEN** người dùng bấm xoá một món đã có người ăn
- **THEN** hệ thống hỏi xác nhận trước khi xoá, và chỉ xoá khi người dùng đồng ý

#### Scenario: Xoá món cuối cùng
- **WHEN** hoá đơn `ITEMIZED` chỉ còn một món và người dùng yêu cầu xoá món đó
- **THEN** hệ thống từ chối với mã lỗi `LAST_ITEM_CANNOT_DELETE`, món vẫn được giữ lại

### Requirement: Người chia đều
Hệ thống SHALL lưu danh sách người cùng chia đều của hoá đơn gồm ít nhất một người, không trùng lặp, và tất cả đều phải tham gia kèo. Khi tạo hoá đơn, danh sách mặc định là toàn bộ người trong kèo. Danh sách được chọn bằng thành phần `PeoplePicker` chế độ nhiều lựa chọn, có nút "Chọn tất cả" của chế độ đó và có số tiền mỗi người tự tính.

**Trước đây**: tài liệu `documentation/epic-5/SA.md` mô tả `EqualSplitPicker` là các nút pill `aria-pressed` cho từng thành viên, cùng một nút "Chọn tất cả ($|P_s|$)" riêng.

#### Scenario: Bỏ chọn hết người chia đều
- **WHEN** người dùng bỏ chọn toàn bộ người chia đều
- **THEN** hệ thống từ chối với mã lỗi `EQUAL_SPLIT_EMPTY` và không lưu thay đổi

#### Scenario: Chọn người ngoài kèo
- **WHEN** danh sách chia đều có một người không tham gia kèo
- **THEN** hệ thống từ chối với mã lỗi `SPLIT_MEMBER_NOT_IN_SESSION`

#### Scenario: Người chia đều đã rời kèo khi sửa hoá đơn
- **WHEN** người dùng sửa hoá đơn và một người chia đều đã không còn trong kèo
- **THEN** người đó bị bỏ khỏi danh sách chia đều
- **AND** nếu không còn ai trong danh sách, danh sách được đặt lại thành toàn bộ người trong kèo
