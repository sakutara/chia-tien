# design-system Specification

## Purpose
Capability này định nghĩa hệ thống giao diện dùng chung của ứng dụng chia tiền: bảng màu USD Green và nền giấy, kiểu chữ và cách căn số tiền, khung ứng dụng và bố cục cho màn hình hẹp, vùng chạm tối thiểu, khoá zoom trang, cùng các thành phần dùng chung trong `components/ui/` và hành vi trợ năng của chúng. Capability này dành cho mọi màn hình của chủ app và người dùng trên điện thoại lẫn máy tính. Nội dung từng màn hình (bữa, kèo, hoá đơn, quyết toán) thuộc các capability riêng và chỉ dùng lại các thành phần được mô tả ở đây.

## Requirements

### Requirement: Bảng màu USD Green
Hệ thống SHALL dùng đúng bộ token màu đã khai báo trong `tailwind.config.js` cho mọi màu nền, chữ và viền. Các token là `usd-green-950` (`#0A1F16`), `usd-green-900` (`#123123`), `usd-green-800` (`#1B4332`), `usd-green-700` (`#2D6A4F`), `usd-green-600` (`#40916C`), `usd-green-100` (`#D8F3DC`), `usd-paper-50` (`#FAF8F5`), `usd-paper-100` (`#F2EFE9`), `usd-paper-200` (`#E4DFD5`), `usd-gold-600` (`#CA8A04`) và `usd-red-600` (`#DC2626`).
#### Scenario: Màu nhấn của nút chính
- **WHEN** một nút chính (`btn-primary` hoặc `IconButton` với tone `primary`) hiển thị ở trạng thái thường
- **THEN** nền là `usd-green-900` và chữ là `usd-paper-50`
- **AND** khi con trỏ đưa lên, nền đổi sang `usd-green-800`

#### Scenario: Nút xoá dùng màu đỏ
- **WHEN** nút có kiểu nguy hiểm (`btn-danger`) hiển thị
- **THEN** nền là `usd-red-600` và chữ là trắng
- **AND** nút chỉ có icon dạng nguy hiểm (`IconButton` với tone `danger`) có icon màu `usd-red-600`

### Requirement: Nền giấy và chữ mặc định
Hệ thống SHALL vẽ toàn trang trên nền `usd-paper-100` với chữ `usd-green-950`, font sans và khử răng cưa chữ. Thẻ nội dung (`card`) và hộp thoại có nền `usd-paper-50` với viền `usd-paper-200`. Đường kẻ phân cách và nền thanh tab dùng `usd-paper-200`.

#### Scenario: Thẻ nằm trên nền giấy
- **WHEN** một thẻ `card` hiển thị trên trang
- **THEN** thẻ có nền `usd-paper-50`, viền `usd-paper-200`, bo góc lớn và đổ bóng nhẹ
- **AND** phần đệm là 12 px trên điện thoại và 16 px từ breakpoint `sm` trở lên

### Requirement: Kiểu chữ và cột số tiền
Hệ thống SHALL dùng font Inter cho chữ thường và JetBrains Mono cho số tiền. Mọi số tiền dùng class `money`, gồm font mono, căn phải và số dạng bảng (`tabular-nums`), để các số trong cùng một cột thẳng hàng. Class `money` có thể đổi sang căn trái khi một vị trí cần thế.

#### Scenario: Cột số tiền thẳng hàng
- **WHEN** nhiều số tiền được hiển thị liên tiếp trong một danh sách, ví dụ bảng quyết toán
- **THEN** mỗi số dùng font mono với chữ số cùng độ rộng
- **AND** các số được căn phải trong ô của chúng

### Requirement: Khung ứng dụng
Hệ thống SHALL hiển thị thanh đầu trang nền `usd-green-900` với chữ `usd-paper-50`, tiêu đề "Chia tiền" bấm được để về trang chủ, công tắc ngôn ngữ và nút "Hồ sơ của tôi". Ngay dưới thanh đầu trang có một vạch vàng `usd-gold-600` cao 2 px. Nút "Hồ sơ của tôi" không hiện trong chế độ xem Snapshot và bị vô hiệu khi chưa có hồ sơ chủ app. Nội dung chính nằm trong khung rộng tối đa 6xl (72 rem) và căn giữa.

#### Scenario: Ẩn nút hồ sơ trong Snapshot
- **WHEN** người dùng mở một link Snapshot chỉ đọc
- **THEN** thanh đầu trang vẫn hiện công tắc ngôn ngữ
- **AND** nút "Hồ sơ của tôi" không hiện

#### Scenario: Hồ sơ chưa sẵn sàng
- **WHEN** chưa tìm thấy hồ sơ mặc định của chủ app
- **THEN** nút "Hồ sơ của tôi" hiện nhưng bị vô hiệu

### Requirement: Bố cục màn hình hẹp
Hệ thống SHALL dùng lề 12 px quanh nội dung trên màn hình hẹp hơn 640 px và lề 24 px từ 640 px trở lên. Dưới 640 px, khung Popover hiện thành tờ trượt cố định ở đáy màn hình, rộng hết chiều ngang trừ 12 px mỗi bên. Từ 640 px trở lên, khung Popover hiện ngay dưới nội dung với chiều rộng 18 rem. Chữ dài tự xuống dòng và không đẩy hàng nút icon xuống dòng khác.

#### Scenario: Popover trên điện thoại
- **WHEN** người dùng bấm vào một nội dung có Popover trên màn hình 375 px
- **THEN** khung chọn hiện như tờ trượt cố định ở đáy màn hình
- **AND** khung cách mép trái, mép phải và đáy màn hình 12 px

#### Scenario: Chữ dài trên điện thoại
- **WHEN** tên người hoặc tên bữa dài hơn chiều rộng còn lại
- **THEN** chữ xuống dòng trong ô của nó
- **AND** hàng nút icon bên cạnh vẫn nằm trên một hàng

### Requirement: Vùng chạm tối thiểu
Hệ thống SHALL làm cho các điều khiển chạm được có vùng chạm tối thiểu theo từng thành phần. Nút icon (`IconButton`, `DialogActions`, `StepTabs`) cao và rộng 40 px trên điện thoại, và 36 px từ breakpoint `sm`. Nút đóng của `Modal`, tiêu đề `Collapse` và tab bước của `StepTabs` có chiều cao tối thiểu 40 px. Nút "Huỷ" và nút xác nhận của `ConfirmDialog` có chiều cao tối thiểu 44 px. Công tắc `ToggleButton` có chiều cao tối thiểu 32 px và không đạt 40 px.

#### Scenario: Nút icon trên điện thoại
- **WHEN** một nút icon hiển thị trên màn hình dưới 640 px
- **THEN** nút có kích thước 40 px x 40 px

#### Scenario: Nút xác nhận xoá
- **WHEN** hộp xác nhận hiển thị
- **THEN** nút "Huỷ" và nút xác nhận đều có chiều cao tối thiểu 44 px

### Requirement: Khoá phóng to trang
Hệ thống SHALL không cho phóng to trang bằng cử chỉ hoặc chạm đúp. Thẻ viewport đặt `user-scalable=no`, `minimum-scale=1.0` và `maximum-scale=1.0`. Trên cảm ứng, `html` chỉ cho cuộn dọc và ngang (`touch-action: pan-x pan-y`). Các sự kiện cử chỉ chụm (`gesturestart`, `gesturechange`, `gestureend`) bị chặn. Hai lần chạm kết thúc cách nhau 300 ms hoặc ít hơn bị bỏ qua. Trên máy tính, giữ Ctrl và lăn chuột không phóng to trang.

#### Scenario: Chạm đúp trên iPhone
- **WHEN** người dùng chạm hai lần liên tiếp trong 300 ms trên nội dung
- **THEN** trang không phóng to
- **AND** thao tác chạm đơn vẫn hoạt động bình thường

#### Scenario: Ctrl cộng lăn chuột trên máy tính
- **WHEN** người dùng giữ Ctrl và lăn chuột trên trang
- **THEN** trang không phóng to và không cuộn theo kiểu phóng to

### Requirement: Viền focus hiển thị rõ
Hệ thống SHALL hiện viền focus cho mọi phần tử nhận focus bằng bàn phím: viền 2 px màu `usd-green-600`, cách phần tử 2 px và khoảng cách đó có nền `usd-paper-100`. Viền mặc định của trình duyệt bị tắt khi có viền focus này.

#### Scenario: Điều hướng bằng Tab
- **WHEN** người dùng nhấn Tab để chuyển đến một nút
- **THEN** nút hiện viền `usd-green-600` 2 px
- **AND** viền mặc định của trình duyệt không hiện

### Requirement: Hộp thoại Modal
Hệ thống SHALL hiển thị `Modal` như một hộp thoại modal có tên bằng tiêu đề, chỉ khi `open` là đúng, và giữ focus trong hộp khi đang mở. Esc, nút "Đóng" và bấm nền chỉ gọi `onClose`; bên gọi quyết định đóng bằng cách đặt `open` về sai. Khi đóng, focus trở về phần tử đã mở hộp.

#### Scenario: Esc gọi onClose
- **WHEN** hộp đang mở và người dùng nhấn Esc
- **THEN** `onClose` được gọi đúng một lần
- **AND** hộp vẫn hiện cho đến khi bên gọi đặt `open` về sai

#### Scenario: Bấm nền đóng hộp
- **WHEN** người dùng bấm vào phần nền ngoài nội dung hộp
- **THEN** `onClose` được gọi
- **AND** bấm vào nội dung bên trong hộp không gọi `onClose`

#### Scenario: Trả focus khi đóng
- **WHEN** người dùng mở hộp từ một nút rồi hộp đóng lại
- **THEN** focus quay về nút đã mở hộp

#### Scenario: Hộp đóng không hiện gì
- **WHEN** `open` là sai
- **THEN** không có phần tử hộp thoại nào trong trang

#### Scenario: Kích thước hộp
- **WHEN** `size` là `lg`, ví dụ form hoá đơn
- **THEN** chiều rộng tối đa là 42 rem
- **AND** khi không truyền `size`, chiều rộng tối đa là 32 rem
### Requirement: Hộp xác nhận ConfirmDialog
Hệ thống SHALL hiện `ConfirmDialog` với nút "Huỷ" được focus mặc định. Nút xác nhận dùng `btn-danger` khi `tone` là `danger`, còn lại dùng `btn-primary`. Khi đang xác nhận, cả hai nút bị vô hiệu. Huỷ, Esc và bấm nền gọi `onCancel`, xoá thông báo lỗi và không gọi `onConfirm`.

#### Scenario: Focus mặc định ở Huỷ
- **WHEN** hộp xác nhận mở
- **THEN** nút "Huỷ" nhận focus

#### Scenario: Xác nhận bị lỗi
- **WHEN** người dùng bấm nút xác nhận và `onConfirm` ném lỗi "Không xoá được"
- **THEN** hộp vẫn mở và hiện "Không xoá được" với vai trò alert
- **AND** `onCancel` không được gọi

#### Scenario: Huỷ không xác nhận
- **WHEN** người dùng bấm "Huỷ"
- **THEN** `onCancel` được gọi và `onConfirm` không được gọi

### Requirement: Chân hộp thoại DialogActions
Hệ thống SHALL hiện chân hộp thoại gồm hai nút chỉ có icon: nút Huỷ (icon X, kiểu viền, tên mặc định "Huỷ") và nút Lưu (icon dấu tick, kiểu chính, tên do bên gọi truyền vào). Khi có `onSave`, nút Lưu có kiểu `button` và gọi `onSave`. Khi không có `onSave`, nút Lưu là `submit` của form chứa nó. Nút Lưu bị vô hiệu khi `saving` hoặc `saveDisabled` đúng.

#### Scenario: Lưu ngoài form
- **WHEN** `DialogActions` có `onSave` và người dùng bấm nút Lưu
- **THEN** `onSave` được gọi

#### Scenario: Lưu khi đang lưu
- **WHEN** `saving` là đúng
- **THEN** nút Lưu bị vô hiệu

### Requirement: Popover
Hệ thống SHALL hiện `Popover` như một nút chứa nội dung hiện tại, bấm vào thì mở khung nổi có vai trò dialog và tên là `label`. Nút có `aria-haspopup="dialog"` và `aria-expanded` theo trạng thái mở. Khi có `summary`, tên truy cập của nút là "label: summary". Khung đóng khi người dùng bấm ra ngoài (chuột hoặc chạm) hoặc nhấn Esc. Nếu `children` là hàm, hàm nhận một lệnh `close` để nội dung tự đóng khung sau khi lưu.

#### Scenario: Mở và đóng bằng bấm ra ngoài
- **WHEN** người dùng bấm nút mở Popover rồi bấm vào vùng ngoài khung
- **THEN** khung mở ra trước, sau đó đóng lại

#### Scenario: Nội dung tự đóng sau khi lưu
- **WHEN** nội dung dạng hàm gọi `close` sau khi lưu
- **THEN** khung đóng và nút mở trở về trạng thái đóng

### Requirement: Khối thu gọn Collapse
Hệ thống SHALL hiện `Collapse` mặc định đóng, trừ khi `defaultOpen` là đúng. Nút tiêu đề có `aria-expanded` và `aria-controls` trỏ tới nội dung. Bấm tiêu đề thì đổi trạng thái mở hoặc đóng. Khi có `label`, đó là tên truy cập của nút; khi không có, tên lấy từ nội dung tiêu đề. Nội dung chỉ được hiển thị khi khối đang mở.

#### Scenario: Mở khối thu gọn
- **WHEN** người dùng bấm tiêu đề của khối đang đóng
- **THEN** nội dung hiện ra và `aria-expanded` là đúng

### Requirement: Thanh bước StepTabs
Hệ thống SHALL hiện `StepTabs` như thanh cố định ở đáy màn hình gồm nút bước trước, một `tablist` các tab bước và nút bước sau. Chỉ tab đang chọn nhận focus khi bấm Tab. Mũi tên trái và phải đổi bước và đi vòng. Nút bước trước và sau bị vô hiệu ở đầu và cuối danh sách.

#### Scenario: Mũi tên đi vòng
- **WHEN** tab bước cuối đang chọn và người dùng nhấn mũi tên phải khi focus ở tab
- **THEN** bước đầu được chọn và tab đó nhận focus

#### Scenario: Nút bước trước ở bước đầu
- **WHEN** bước đầu đang chọn
- **THEN** nút bước trước bị vô hiệu

#### Scenario: Bố cục thanh bước
- **WHEN** màn hình dưới 640 px
- **THEN** icon nằm trên nhãn
- **AND** từ 640 px trở lên icon và nhãn nằm cùng một hàng
- **AND** trang chứa thanh này chừa đệm dưới `pb-20` để nội dung không bị thanh che
### Requirement: Công tắc Switch và nút chuyển ToggleButton
Hệ thống SHALL hiện `Switch` như nút có vai trò `switch` với `aria-checked` theo trạng thái; nhãn vừa hiển thị vừa là tên truy cập, và bấm thì gọi `onChange` với giá trị đảo ngược. `ToggleButton` hiện nhãn của trạng thái kế tiếp: khi tắt hiện `label`, khi bật hiện `uncheckedLabel`.

#### Scenario: Bật công tắc
- **WHEN** công tắc đang tắt và người dùng bấm vào
- **THEN** `onChange` được gọi với giá trị đúng

#### Scenario: Nhãn nút chuyển ngôn ngữ
- **WHEN** giao diện đang tiếng Việt
- **THEN** nút ngôn ngữ hiện "EN"

#### Scenario: Màu của công tắc và nút bật
- **WHEN** công tắc đang bật
- **THEN** nền công tắc là `usd-green-700`
- **AND** khi nút chuyển đang bật, viền là `usd-green-700` và nền là `usd-green-100`
### Requirement: Nút chỉ có icon IconButton
Hệ thống SHALL bắt buộc mọi `IconButton` có `label`, và `label` làm tên truy cập (`aria-label`) đồng thời là tooltip (`title`). Icon bên trong ẩn khỏi trình đọc màn hình. Tone `default` không có màu nền riêng, `primary` dùng nền `usd-green-900`, `outline` có viền `usd-paper-200` và nền `usd-paper-50`, `danger` có chữ `usd-red-600` và khi di chuột vào thì nền đỏ nhạt. Khi `disabled`, nút mờ đi và không bấm được.

#### Scenario: Nút icon có tên truy cập
- **WHEN** một `IconButton` được hiển thị với `label` "Lưu hoá đơn"
- **THEN** trình đọc màn hình đọc tên "Lưu hoá đơn"
- **AND** rê chuột vào nút hiện tooltip cùng nội dung

#### Scenario: Nút icon bị vô hiệu
- **WHEN** `IconButton` có `disabled` đúng
- **THEN** nút mờ và không nhận lượt bấm

### Requirement: Chọn người PeoplePicker
Hệ thống SHALL hiện `PeoplePicker` như chuỗi tên người, bấm vào thì mở Popover để thêm hoặc bớt người, và mỗi lần bấm được lưu ngay. Chế độ `multi` không cho bỏ người khi số người đang chọn đã bằng `min`. Chế độ `shares` giới hạn số phần của mỗi người ở 999. Chế độ `single` chọn đúng một người. Khi `readOnly` chỉ hiện chuỗi tên.

#### Scenario: Không bỏ người cuối cùng
- **WHEN** chế độ `multi` với `min` là 1 và chỉ còn một người được chọn
- **THEN** ô của người đó bị vô hiệu và không bỏ được

#### Scenario: Số phần vượt giới hạn
- **WHEN** người dùng tăng số phần của một người đã đạt 999
- **THEN** nút tăng bị vô hiệu và số phần không vượt 999

#### Scenario: Chưa chọn ai
- **WHEN** chưa có người nào được chọn và không `readOnly`
- **THEN** ô hiện chữ `empty` (mặc định "Chọn") in nghiêng
- **AND** khi `readOnly` và chưa có ai, ô hiện "—"
### Requirement: Chữ bấm để sửa InlineText
Hệ thống SHALL hiện `InlineText` như chữ bấm được để sửa tại chỗ. Enter hoặc rời ô thì lưu, Esc thì huỷ. Nếu `onCommit` ném lỗi, ô vẫn mở và thông báo lỗi hiện dưới ô với vai trò alert. Khi `readOnly` chỉ hiện chữ tĩnh.

#### Scenario: Sửa tên bằng Enter
- **WHEN** người dùng bấm tên, gõ tên mới và nhấn Enter
- **THEN** `onCommit` được gọi với tên mới và ô đóng lại

#### Scenario: Huỷ bằng Esc
- **WHEN** người dùng sửa chữ rồi nhấn Esc
- **THEN** ô đóng lại và giá trị không đổi, kể cả khi ô sau đó mất focus

#### Scenario: Lưu bị từ chối
- **WHEN** `onCommit` ném `PeopleError` với nội dung "Tên đã tồn tại"
- **THEN** ô vẫn mở và "Tên đã tồn tại" hiện dưới ô với vai trò alert

#### Scenario: Giữ dòng mới trong ô nhiều dòng
- **WHEN** ô là nhiều dòng và người dùng nhấn Shift+Enter
- **THEN** ký tự xuống dòng được thêm vào và ô chưa lưu

### Requirement: Bố cục hàng món trong form hoá đơn
Hệ thống SHALL trình bày mỗi hàng món trong form hoá đơn thành hai dòng. Dòng đầu gồm ô tên món chiếm phần rộng còn lại và nút xoá món ở bên phải, không bị tràn ra ngoài hàng khi tên dài. Dòng thứ hai dạng `[đơn giá] × [số lượng] = [thành tiền]`: ô đơn giá và ô số lượng có chiều rộng cố định, ô thành tiền co giãn để cả dòng đầy chiều ngang. Dấu `×` và dấu `=` chỉ mang tính trình bày, không phải ô nhập.

#### Scenario: Tên món dài gần tràn hàng
- **WHEN** người dùng nhập tên món dài gần hết chiều rộng hàng
- **THEN** ô tên co lại và nút xoá vẫn nằm trong hàng, không bị đẩy ra ngoài

#### Scenario: Hàng đơn giá, số lượng, thành tiền
- **WHEN** form hoá đơn hiện một món
- **THEN** dòng thứ hai hiện ô đơn giá, dấu `×`, ô số lượng, dấu `=` và ô thành tiền theo đúng thứ tự
- **AND** ô thành tiền kéo dài tới mép phải của hàng
