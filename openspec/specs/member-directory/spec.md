# member-directory Specification

## Purpose
Danh bạ thành viên toàn cục lưu mọi người từng được thêm vào một bữa, để lần sau chọn lại nhanh mà không phải gõ lại tên. Capability này quy định cách đặt tên và chống trùng, tìm kiếm và sắp xếp A-Z có hỗ trợ tiếng Việt, ô thêm người nhanh trong bữa, hồ sơ "Tôi" của chủ app, và thông tin tài khoản ngân hàng của từng thành viên. Dữ liệu chỉ nằm trong trình duyệt của người dùng.

## Requirements

### Requirement: Lưu người vào danh bạ khi thêm vào bữa
Hệ thống SHALL lưu mọi người được thêm vào một bữa vào danh bạ toàn cục mà không cần thao tác lưu riêng, để các bữa sau gợi ý lại được. Danh bạ vẫn còn đầy đủ sau khi tải lại trang.

#### Scenario: Thêm người mới vào bữa
- **WHEN** người dùng tạo một người chưa có trong danh bạ từ ô thêm người của bữa
- **THEN** người đó được lưu vào danh bạ với tên đã chuẩn hoá
- **AND** người đó được thêm vào bữa trong cùng thao tác và xuất hiện trong gợi ý của bữa khác

#### Scenario: Tải lại trang
- **WHEN** người dùng tải lại trang sau khi đã thêm người vào danh bạ
- **THEN** toàn bộ người đã lưu vẫn còn trong danh bạ

### Requirement: Màu avatar cố định theo người
Hệ thống SHALL gán cho mỗi người một màu avatar lấy từ dải màu xanh USD, chọn theo khoá tìm kiếm của người đó. Cùng một người luôn có cùng màu, không cần lưu thêm trạng thái nào.

#### Scenario: Màu không đổi giữa các lần hiển thị
- **WHEN** một người được hiển thị ở các bữa khác nhau hoặc sau khi tải lại trang
- **THEN** màu avatar của người đó vẫn giống như lần trước

### Requirement: Chuẩn hoá và viết hoa tên người
Hệ thống SHALL lưu tên người sau khi bỏ khoảng trắng đầu cuối, gộp khoảng trắng liên tiếp thành một, và viết hoa chữ cái đầu của mỗi từ, các chữ còn lại viết thường, bất kể người dùng gõ kiểu nào. Dấu tiếng Việt được giữ nguyên. Một từ mới bắt đầu sau khoảng trắng, dấu gạch nối hoặc dấu mở ngoặc. Tên sau chuẩn hoá phải có từ 1 đến 50 ký tự.

#### Scenario: Gõ chữ thường
- **WHEN** người dùng tạo người tên `bình`
- **THEN** tên được lưu là `Bình`

#### Scenario: Gõ viết hoa và nhiều khoảng trắng
- **WHEN** người dùng tạo người tên `  văn   an `
- **THEN** tên được lưu là `Văn An`

#### Scenario: Tên rỗng hoặc quá dài
- **WHEN** tên sau chuẩn hoá rỗng, hoặc dài hơn 50 ký tự
- **THEN** hệ thống từ chối với mã `INVALID_NAME` và báo lỗi cho người dùng
- **AND** không có người nào được tạo hay đổi tên

### Requirement: Không tạo hai người cùng tên hiển thị
Hệ thống SHALL coi hai tên là cùng một người khi chúng giống nhau cả dấu, không phân biệt hoa thường. Gõ lại tên đã có thì dùng người đã có, không tạo người mới và không ghi đè tên đã lưu.

#### Scenario: Gõ lại tên khác hoa thường
- **WHEN** người dùng tạo người tên `BÌNH` trong khi danh bạ đã có `Bình`
- **THEN** hệ thống dùng người `Bình` có sẵn và không tạo người thứ hai

#### Scenario: Đổi tên sang tên của người khác
- **WHEN** người dùng đổi tên `Cường` thành `bình` trong khi danh bạ đã có `Bình`
- **THEN** hệ thống từ chối với mã `DUPLICATE_NAME`, chỉ rõ người đang có tên đó
- **AND** tên `Cường` được giữ nguyên

### Requirement: Tên khác dấu là hai người khác nhau
Hệ thống SHALL coi các tên khác dấu như `An`, `Ân` và `Ấn` là những người riêng. Mỗi người có một khoá tìm kiếm không trùng: người được tạo trước lấy khoá không dấu (`an`), người sau lấy hậu tố số nhỏ nhất còn trống (`an2`, `an3`). Khoá đã bị một người thật chiếm, ví dụ người tên `An2`, thì không được dùng lại. Hậu tố cố định sau khi gán, chỉ đổi khi người đó đổi sang một dạng không dấu khác.

#### Scenario: Tạo người khác dấu
- **GIVEN** danh bạ có người `An` với khoá `an`
- **WHEN** người dùng tạo `Ân`
- **THEN** `Ân` là người riêng, khoá là `an2`, và tên hiển thị vẫn là `Ân`

#### Scenario: Khoá không đụng tên thật
- **GIVEN** danh bạ có `An` và một người thật tên `An2`
- **WHEN** người dùng tạo `Ân`
- **THEN** khoá của `Ân` là `an3`

#### Scenario: Đổi chỉ dấu hoặc hoa thường thì giữ khoá
- **GIVEN** người `Ân` có khoá `an2`
- **WHEN** người dùng đổi tên thành `ân`
- **THEN** tên được lưu là `Ân` và khoá vẫn là `an2`

### Requirement: Sắp xếp danh sách A-Z theo tiếng Việt
Hệ thống SHALL xếp danh sách người theo thứ tự chữ cái tiếng Việt trên tên hiển thị, ở mọi trạng thái của ô tìm kiếm, kể cả khi đang lọc. Hai tên bằng nhau theo cách so sánh này thì người được tạo trước xếp trước.

#### Scenario: Thứ tự chữ cái tiếng Việt
- **GIVEN** danh bạ có `Đạt`, `Văn An`, `Bình`, `An`, `Ánh`, `Anh`, `Cường`, `Dung`
- **WHEN** người dùng mở danh sách chọn người
- **THEN** danh sách hiện theo thứ tự `An`, `Anh`, `Ánh`, `Bình`, `Cường`, `Dung`, `Đạt`, `Văn An`

### Requirement: Ghim hồ sơ "Tôi" lên đầu danh sách
Hệ thống SHALL luôn đặt hồ sơ "Tôi" (hồ sơ mặc định của chủ app) ở đầu danh sách, kể cả khi đang lọc và hồ sơ này khớp từ khoá. Chỉ hồ sơ mặc định được ghim; người khác xếp theo A-Z, kể cả khi họ là người chủ trì của một bữa.

#### Scenario: Tôi đứng đầu khi có kết quả
- **GIVEN** danh bạ có hồ sơ "Tôi" và các người khác
- **WHEN** người dùng xem danh sách hoặc lọc ra nhiều người
- **THEN** "Tôi" đứng đầu, các người còn lại xếp A-Z ngay sau

### Requirement: Lọc theo từ khoá không phân biệt dấu
Hệ thống SHALL lọc người theo chuỗi con của khoá tìm kiếm, sau khi từ khoá được bỏ dấu và chuyển về chữ thường. Nhờ vậy gõ có dấu hay không dấu đều ra cùng kết quả. Ô tìm trống thì hiện toàn bộ danh bạ. Kết quả lọc vẫn xếp theo quy tắc A-Z và ghim "Tôi".

#### Scenario: Gõ không dấu
- **WHEN** người dùng gõ `binh` vào ô tìm
- **THEN** danh sách chỉ còn `Bình`

#### Scenario: Gõ một phần tên
- **WHEN** người dùng gõ `an`
- **THEN** danh sách hiện `An`, `Anh`, `Ánh`, `Văn An`, theo thứ tự A-Z

#### Scenario: Gõ khoá có hậu tố số
- **WHEN** người dùng gõ `an2`
- **THEN** danh sách chỉ còn người có khoá `an2`, tức `Ân`

### Requirement: Enter trong ô thêm người chọn theo thứ tự ưu tiên
Hệ thống SHALL quyết định hành động khi nhấn Enter trong ô thêm người theo thứ tự: (a) nếu đang có dòng được chọn bằng phím mũi tên thì chọn dòng đó; (b) nếu có người trùng tên hiển thị chính xác thì chọn người đó; (c) nếu từ khoá không dấu và đã có người có dấu cùng dạng không dấu thì chọn người đầu tiên trong số đó và không tạo mới; (d) còn lại thì tạo người mới với tên đã viết hoa. Ô rỗng thì Enter không làm gì.

#### Scenario: Gõ không dấu không tạo trùng
- **GIVEN** danh bạ có `Bình`
- **WHEN** người dùng gõ `binh` rồi nhấn Enter
- **THEN** hệ thống chọn `Bình` và không tạo người mới

#### Scenario: Tạo người mới bằng Enter
- **WHEN** người dùng gõ `khánh linh` rồi nhấn Enter, và không có tên nào khớp
- **THEN** người tên `Khánh Linh` được tạo và thêm vào bữa

#### Scenario: Chọn dòng bằng mũi tên
- **WHEN** người dùng gõ `cu`, nhấn mũi tên xuống để tô sáng dòng `Cường`, rồi nhấn Enter
- **THEN** hệ thống chọn đúng `Cường`, dù từ khoá không khớp chính xác

### Requirement: Bỏ qua Enter chỉ để chốt ký tự tiếng Việt
Hệ thống SHALL không coi phím Enter là lệnh thêm người khi phím đó chỉ dùng để chốt ký tự của bộ gõ đang ghép (IME). Enter tiếp theo, khi không còn ghép, mới có hiệu lực.

#### Scenario: Enter khi đang ghép ký tự
- **WHEN** người dùng gõ `Thảo` bằng bộ gõ tiếng Việt và nhấn Enter đang ở trạng thái ghép
- **THEN** không có người nào được tạo
- **AND** khi nhấn Enter lần nữa, người `Thảo` được tạo

### Requirement: Hiện lựa chọn thêm người mới khi chưa có tên khớp chính xác
Hệ thống SHALL hiện dòng `Thêm "<tên>"` ở cuối danh sách khi ô tìm có nội dung và chưa có người nào trùng tên hiển thị chính xác. Bấm dòng này tạo người mới với tên đã viết hoa, thêm vào bữa, rồi xoá ô tìm. Khi đã có người trùng tên chính xác thì không hiện dòng thêm, mà hiện nhắc rằng người này đã có và nên thêm họ hoặc hậu tố để phân biệt.

#### Scenario: Thêm bằng cách bấm dòng thêm
- **WHEN** người dùng gõ `Thuỳ An` và bấm dòng `Thêm "Thuỳ An"`
- **THEN** người `Thuỳ An` được tạo, thêm vào bữa, và ô tìm được xoá trống

#### Scenario: Tên đã có chính xác
- **GIVEN** danh bạ có `Bình`
- **WHEN** người dùng gõ `Bình`
- **THEN** không hiện dòng thêm người và hiện nhắc `Đã có "Bình"` kèm gợi ý thêm họ hoặc hậu tố

#### Scenario: Tên khác dấu vẫn cho phép thêm
- **GIVEN** danh bạ chỉ có `An`
- **WHEN** người dùng gõ `Ân`
- **THEN** hiện dòng `Thêm "Ân"` để tạo người mới

### Requirement: Không thêm trùng người đã có trong bữa
Hệ thống SHALL không thêm một người hai lần vào cùng một bữa. Khi người dùng chọn người đã tham gia, hệ thống báo `<tên> đã tham gia bữa này.` và giữ nguyên người đó trong bữa. Danh sách chọn đánh dấu người đã tham gia bằng nhãn "Đã tham gia".

#### Scenario: Chọn lại người đã tham gia
- **GIVEN** `Bình` đã có trong bữa
- **WHEN** người dùng gõ `Bình` rồi nhấn Enter
- **THEN** hệ thống báo `Bình đã tham gia bữa này.`
- **AND** danh sách người tham gia của bữa không thay đổi

#### Scenario: Đánh dấu trong danh sách chọn
- **GIVEN** `Bình` đã có trong bữa
- **WHEN** người dùng gõ `b` để lọc danh sách
- **THEN** dòng `Bình` hiện nhãn "Đã tham gia"

### Requirement: Hồ sơ "Tôi" đổi được tên nhưng không xoá được
Hệ thống SHALL cho phép đổi tên hồ sơ "Tôi" và giữ nguyên vai trò hồ sơ mặc định của chủ app sau khi đổi. Hồ sơ này không có thao tác xoá. Nếu người dùng để tên mặc định không đổi thì tên vẫn hiển thị theo ngôn ngữ đang chọn; nếu người dùng nhập đúng tên mặc định đã dịch, hệ thống lưu lại dạng gốc để vẫn đổi theo ngôn ngữ.

#### Scenario: Đổi tên hồ sơ
- **WHEN** người dùng đổi tên hồ sơ "Tôi" thành `tôi` hoặc tên khác
- **THEN** tên được lưu theo chuẩn hoá, hồ sơ vẫn là hồ sơ mặc định, và các bữa mới vẫn chọn hồ sơ này làm chủ trì mặc định

#### Scenario: Đổi tên trùng với người khác
- **WHEN** người dùng đổi tên hồ sơ "Tôi" thành tên của một người khác đã có trong danh bạ
- **THEN** hệ thống từ chối với mã `DUPLICATE_NAME` và hiện lỗi trong hộp thoại, tên cũ được giữ nguyên

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
