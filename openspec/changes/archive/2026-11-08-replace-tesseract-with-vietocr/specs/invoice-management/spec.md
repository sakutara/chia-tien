## MODIFIED Requirements

### Requirement: Quét và nén ảnh khi lưu
Hệ thống SHALL nén mọi ảnh hoá đơn ở mức Cân bằng cố định, người dùng không chọn được mức khác. Mức Cân bằng thu cạnh dài về tối đa 2000 px với chất lượng 0,8. Ảnh không bao giờ được phóng to, ảnh vốn nhỏ hơn 400 KB và không cần thu nhỏ thì không nén lại, và bản nén chỉ được lưu khi nhỏ hơn bản gốc. Ảnh luôn được lưu dù nén lỗi. Hệ thống MUST lưu dung lượng trước và sau khi xử lý để hiển thị.

**Trước đây**: mọi ảnh luôn được nén ở mức Cân bằng, kể cả ảnh chụp tờ hoá đơn. Ảnh tờ hoá đơn không được tách riêng khỏi bước nén; bước xử lý kiểu máy quét (nhị phân hoá) chỉ là một bước tiền xử lý trước khi nén (BR-4.16, AC-15 trong `documentation/epic-4/BR.md`).

#### Scenario: Ảnh lớn được thu nhỏ
- **WHEN** người dùng tải lên ảnh 4032 x 3024 nặng 5 MB và bản nén nhỏ hơn bản gốc
- **THEN** ảnh được lưu dưới dạng JPEG có cạnh dài 2000 px
- **AND** danh sách ảnh hiển thị dung lượng trước nén và sau nén, cách nhau bằng chữ "đến"

#### Scenario: Ảnh nhỏ không bị nén lại
- **WHEN** người dùng tải lên ảnh 1200 x 900 nặng dưới 400 KB
- **THEN** ảnh được lưu nguyên, không đổi kích thước và chỉ hiển thị một dung lượng

#### Scenario: Bản nén lớn hơn bản gốc
- **WHEN** bản nén của ảnh có dung lượng lớn hơn ảnh gốc
- **THEN** hệ thống lưu ảnh gốc

#### Scenario: Xử lý ảnh bị lỗi
- **WHEN** trình duyệt không xử lý hoặc không nén được ảnh
- **THEN** ảnh gốc vẫn được lưu vào hoá đơn và không bị mất

#### Scenario: Ảnh tờ hoá đơn được xử lý như máy quét
- **WHEN** ảnh chụp tờ hoá đơn được cắt và nắn thẳng thành công
- **THEN** ảnh đã xử lý ở thang xám được lưu thay cho bản nén Cân bằng
- **AND** mức nén của ảnh được ghi là Giữ nguyên
