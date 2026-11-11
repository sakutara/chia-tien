## ADDED Requirements

### Requirement: Lưu nhóm thanh toán vào danh bạ
<!-- Trong spec hiện hành, hành vi này thuộc capability `meal-people-and-payment-groups`, requirement "Nhóm có hồ sơ trong danh bạ". -->
Hệ thống SHALL lưu mỗi nhóm thanh toán vào danh bạ toàn cục như một hồ sơ nhóm, gồm tên nhóm và danh sách thành viên, để có thể thêm nhóm đó vào bữa khác như một người. Hồ sơ nhóm không tính vào việc kiểm tra trùng tên người, và không được lưu nếu tên nhóm trùng với một người đã có trong danh bạ.

**Trước đây**: Thiết kế gốc (Epic 2, BR-2.8) chỉ cho nhóm tồn tại trong từng bữa. Không có nhóm trong danh bạ.

#### Scenario: Tạo nhóm trong bữa
- **WHEN** người dùng tạo nhóm thanh toán `Cường + Dung` trong một bữa
- **THEN** hồ sơ nhóm `Cường + Dung` được lưu vào danh bạ với danh sách thành viên của nhóm
- **AND** hồ sơ nhóm hiện biểu tượng nhóm trong danh sách chọn người

#### Scenario: Thêm nhóm đã lưu vào bữa khác
- **GIVEN** nhóm `Cường + Dung` đã có trong danh bạ
- **WHEN** người dùng chọn nhóm đó trong ô thêm người của một bữa khác
- **THEN** nhóm được thêm vào bữa như một người, kèm đúng các thành viên đã lưu

#### Scenario: Tên nhóm trùng một người
- **WHEN** nhóm được tạo với tên trùng tên một người đã có trong danh bạ
- **THEN** hồ sơ nhóm không được lưu vào danh bạ
- **AND** người đã có không bị đổi tên hay đổi thông tin

### Requirement: Lưu tài khoản ngân hàng cho thành viên
Hệ thống SHALL lưu tài khoản ngân hàng gồm ngân hàng, tên chủ tài khoản và số tài khoản vào thành viên trong danh bạ, dùng chung cho mọi bữa. Khi lưu, số tài khoản được bỏ khoảng trắng, dấu chấm và dấu gạch ngang; tên chủ tài khoản được gộp khoảng trắng thừa nhưng giữ nguyên cách viết hoa thường người dùng nhập; tên ngân hàng lấy từ ngân hàng đã chọn.

#### Scenario: Lưu tài khoản hợp lệ
- **GIVEN** người `Bình` chưa có tài khoản
- **WHEN** người dùng chọn `MB Bank`, nhập tên chủ tài khoản `TRAN VAN BINH` và số tài khoản `0987 654 321`, rồi lưu
- **THEN** tài khoản được lưu với mã BIN `970422`, tên ngân hàng `MB Bank`, tên chủ `TRAN VAN BINH` và số `0987654321`
- **AND** hộp thoại đóng lại

#### Scenario: Chuẩn hoá tên chủ tài khoản
- **WHEN** người dùng nhập tên chủ tài khoản `  nguyen   van an `
- **THEN** tên được lưu là `nguyen van an`

### Requirement: Chọn ngân hàng bằng tìm nhanh không cần dấu
Hệ thống SHALL cung cấp danh sách ngân hàng và ví hỗ trợ VietQR, mỗi mục có mã BIN 6 chữ số. Ô chọn ngân hàng lọc theo tên, mã viết tắt hoặc tên đầy đủ, không phân biệt hoa thường và dấu; mọi từ gõ vào đều phải khớp. Kết quả có tên hoặc mã bắt đầu bằng từ khoá được xếp trước. Ô trống thì hiện toàn bộ danh sách.

#### Scenario: Gõ không dấu tìm ngân hàng
- **WHEN** người dùng gõ `quan doi` vào ô chọn ngân hàng
- **THEN** danh sách chỉ còn `MB Bank (MB)`

#### Scenario: Không có ngân hàng khớp
- **WHEN** người dùng gõ một chuỗi không khớp ngân hàng nào
- **THEN** danh sách hiện thông báo `Không tìm thấy ngân hàng.`

#### Scenario: Chọn ngân hàng
- **WHEN** người dùng bấm một dòng trong danh sách, hoặc chọn bằng Enter sau khi dùng mũi tên
- **THEN** ngân hàng đó được chọn và ô hiện tên kèm mã của ngân hàng

### Requirement: Kiểm tra tài khoản ngân hàng trước khi lưu
Hệ thống SHALL từ chối lưu khi chưa chọn ngân hàng, khi tên chủ tài khoản rỗng sau khi bỏ khoảng trắng, hoặc khi số tài khoản sau chuẩn hoá không gồm từ 6 đến 19 ký tự chữ hoặc số. Lỗi hiện trong hộp thoại và tài khoản đã lưu trước đó không bị thay đổi. Nếu thành viên không còn trong danh bạ thì hệ thống từ chối với mã `MEMBER_NOT_FOUND`.

#### Scenario: Chưa chọn ngân hàng
- **WHEN** người dùng nhập tên chủ tài khoản và số tài khoản nhưng không chọn ngân hàng, rồi lưu
- **THEN** hộp thoại báo `Hãy chọn ngân hàng.`

#### Scenario: Số tài khoản quá ngắn
- **WHEN** người dùng nhập số tài khoản `12-345`, sau chuẩn hoá còn 5 ký tự
- **THEN** hệ thống từ chối với mã `INVALID_BANK` và báo lỗi số tài khoản

#### Scenario: Tên chủ tài khoản chỉ có khoảng trắng
- **WHEN** người dùng nhập tên chủ tài khoản toàn khoảng trắng và đã chọn ngân hàng
- **THEN** hệ thống báo `Tên chủ tài khoản không được để trống.`

### Requirement: Xoá tài khoản ngân hàng của thành viên
Hệ thống SHALL xoá tài khoản ngân hàng của thành viên khi người dùng bấm nút xoá, hoặc khi người dùng lưu một form hoàn toàn trống (chưa chọn ngân hàng, tên và số đều trống). Nút xoá chỉ hiện khi thành viên đã có tài khoản.

#### Scenario: Xoá tài khoản đã lưu
- **GIVEN** người `An` đã có tài khoản ngân hàng
- **WHEN** người dùng bấm nút xoá tài khoản ngân hàng
- **THEN** người `An` không còn tài khoản ngân hàng trong danh bạ

#### Scenario: Lưu form trống
- **WHEN** người dùng mở hộp thoại tài khoản ngân hàng, để trống mọi trường và bấm lưu
- **THEN** hệ thống không báo lỗi và thành viên không có tài khoản ngân hàng
