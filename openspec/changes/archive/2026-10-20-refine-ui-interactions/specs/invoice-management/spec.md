## MODIFIED Requirements

### Requirement: Cảnh báo ảnh trùng trong cùng bữa
Hệ thống SHALL so sánh văn bản OCR đã lưu của ảnh vừa quét với ảnh khác trong cùng bữa, và báo trùng khi độ giống đạt 80 phần trăm trở lên. Độ giống được tính trên tập từ đã bỏ dấu, và chỉ kết luận khi cả hai văn bản đều có ít nhất 8 từ khác nhau. Ảnh chưa có văn bản OCR không được so sánh, và ảnh của bữa khác không được so sánh. Hệ thống chỉ cảnh báo và không tự xoá ảnh. Khi người dùng bấm "Xoá ảnh trùng", ảnh bị xoá ngay, không có hộp xác nhận.

**Trước đây**: tài liệu `documentation/epic-3/BR.md` BR-3.12 yêu cầu mọi hành động phá huỷ dùng hộp xác nhận của app, trong khi thao tác "Xoá ảnh trùng" trong thiết kế gốc chỉ ghi là một icon trong cảnh báo (tài liệu `documentation/03-ui-ux-and-design-system.md` mục cảnh báo). Mã nguồn xoá ngay.

#### Scenario: Cùng một bill được chụp lại
- **WHEN** người dùng thêm ảnh của một bill đã có trong bữa, dù OCR đọc mất dấu
- **THEN** hệ thống hiện cảnh báo nêu tên hai ảnh, mức giống và hai lựa chọn Xoá ảnh trùng hoặc Giữ lại

#### Scenario: Xoá ảnh trùng
- **WHEN** người dùng bấm Xoá ảnh trùng trong cảnh báo
- **THEN** ảnh mới vừa thêm bị xoá ngay, không có hộp xác nhận, và cảnh báo biến mất

#### Scenario: Bill khác nhau
- **WHEN** văn bản OCR của hai ảnh khác nhau về bill
- **THEN** hệ thống không cảnh báo trùng

#### Scenario: Ảnh trùng nằm trong cùng hoá đơn
- **WHEN** mọi ảnh vừa quét đều trùng với ảnh đã có trong cùng hoá đơn đang soạn
- **THEN** hệ thống cảnh báo trùng nhưng không điền lại form từ văn bản đó
