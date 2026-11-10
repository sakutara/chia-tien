# i18n Specification

## Purpose
Capability này cho phép ứng dụng "Chia tiền" hiển thị song ngữ Việt (`vi`) và Anh (`en`) trên toàn bộ giao diện, trang Snapshot và tin nhắn thanh toán. Người dùng đổi ngôn ngữ bằng một công tắc, lựa chọn được ghi nhớ trong IndexedDB, và lần mở đầu tiên dựa theo ngôn ngữ của trình duyệt. Định dạng ngày, số tiền và thứ trong tuần cũng theo ngôn ngữ đang chọn, còn dữ liệu do người dùng nhập thì giữ nguyên.

## Requirements

### Requirement: Hai ngôn ngữ giao diện
Hệ thống SHALL hỗ trợ đúng hai ngôn ngữ giao diện là `vi` và `en`. Tiếng Việt là ngôn ngữ gốc: khoá của từ điển chính là câu tiếng Việt, nên với `vi` hàm `t()` trả đúng câu đó. Với `en`, hệ thống tra bản dịch trong từ điển `en`, và khi thiếu bản dịch thì dùng lại câu tiếng Việt gốc, không bao giờ hiển thị chuỗi rỗng.

#### Scenario: Dịch sang tiếng Anh
- **WHEN** ngôn ngữ hiện tại là `en` và một thành phần gọi `t('Chia tiền')`
- **THEN** kết quả là `Split Bill`
- **AND** với ngôn ngữ `vi` cùng câu đó trả về `Chia tiền`

#### Scenario: Thiếu bản dịch
- **WHEN** ngôn ngữ hiện tại là `en` và câu gọi `t()` không có trong từ điển `en`
- **THEN** hệ thống hiển thị đúng câu tiếng Việt gốc, đã nội suy tham số nếu có

### Requirement: Từ điển en khớp với mã nguồn
Hệ thống SHALL giữ tập khoá của từ điển `en` trùng với tập câu được truyền vào `t()`, `T()` và `tIn()` trong mã nguồn ứng dụng. Mỗi bản dịch SHALL giữ nguyên tập tham số `{…}` của câu gốc. Việc này được kiểm bằng test quét mã nguồn, nên thiếu hay thừa khoá sẽ làm test thất bại.

#### Scenario: Thiếu bản dịch cho một câu mới
- **WHEN** lập trình viên thêm một câu mới vào `t()` mà chưa thêm vào từ điển `en`
- **THEN** test quét mã nguồn báo lỗi và liệt kê câu thiếu

#### Scenario: Khoá thừa không còn được dùng
- **WHEN** một câu bị xoá khỏi mã nguồn nhưng khoá vẫn còn trong từ điển `en`
- **THEN** test báo lỗi khoá thừa

#### Scenario: Bản dịch sai tham số
- **WHEN** bản dịch tiếng Anh thiếu hoặc thêm một tham số so với câu gốc
- **THEN** test về tham số báo lỗi

### Requirement: Nội suy tham số và số nhiều
Hệ thống SHALL thay tham số có dạng `{tên}` bằng giá trị tương ứng. Với dạng `{n|một|nhiều}` hệ thống SHALL chọn vế đầu khi `n` bằng 1 và vế sau trong các trường hợp còn lại. Tham số không được truyền vào thì SHALL giữ nguyên dạng `{tên}` trong chuỗi kết quả.

#### Scenario: Số nhiều tiếng Anh
- **WHEN** ngôn ngữ là `en` và gọi `t('{n} bữa', { n: 1 })`, rồi `t('{n} bữa', { n: 3 })`
- **THEN** kết quả đầu là `1 meal` và kết quả sau là `3 meals`

#### Scenario: Tham số không được truyền
- **WHEN** gọi nội suy với chuỗi `a {x} b` và không có giá trị cho `x`
- **THEN** kết quả vẫn là `a {x} b`

### Requirement: Công tắc ngôn ngữ trên thanh đầu trang
Hệ thống SHALL có đúng một công tắc ngôn ngữ trên thanh đầu trang, hiển thị ở mọi màn hình kể cả trang Snapshot. Nhãn công tắc hiển thị ngôn ngữ sẽ chuyển tới: đang tiếng Việt thì nhãn là `EN`, đang tiếng Anh thì nhãn là `VI`. Khi bấm, toàn bộ giao diện đổi ngay mà không tải lại trang và không làm mất dữ liệu đang hiển thị.

#### Scenario: Chuyển sang tiếng Anh
- **WHEN** người dùng đang ở tiếng Việt và bấm nút `EN`
- **THEN** tiêu đề ứng dụng, tiêu đề các mục và nút như `Hồ sơ của tôi` đổi sang tiếng Anh ngay lập tức
- **AND** trang không được tải lại

#### Scenario: Chuyển lại tiếng Việt
- **WHEN** người dùng đang ở tiếng Anh và bấm nút `VI`
- **THEN** giao diện trở về tiếng Việt như ban đầu

### Requirement: Ghi nhớ lựa chọn ngôn ngữ
Hệ thống SHALL lưu lựa chọn ngôn ngữ vào trường `language` của bản ghi `settings` trong IndexedDB và SHALL nạp lại lựa chọn đó ở lần mở app kế tiếp. Lựa chọn này dùng chung cho app chính và trang Snapshot. Nếu đọc hoặc ghi IndexedDB bị lỗi, hệ thống SHALL coi như chưa có lựa chọn đã lưu và tiếp tục chạy bình thường.

#### Scenario: Tải lại trang giữ nguyên ngôn ngữ
- **WHEN** người dùng đã chọn `en` và tải lại trang
- **THEN** ứng dụng mở ở tiếng Anh

#### Scenario: Đọc lựa chọn đã lưu bị lỗi
- **WHEN** đọc `settings` trong IndexedDB ném lỗi hoặc giá trị `language` không phải `vi` hoặc `en`
- **THEN** hệ thống coi như không có lựa chọn đã lưu và tiếp tục xác định ngôn ngữ theo các nguồn còn lại

### Requirement: Thứ tự xác định ngôn ngữ khi khởi động
Khi khởi động, hệ thống SHALL chọn ngôn ngữ theo thứ tự ưu tiên: lựa chọn đã lưu trong IndexedDB trước, sau đó là tham số `l` trên URL (chỉ khi giá trị là `vi` hoặc `en`), cuối cùng là `navigator.language`. Nếu ngôn ngữ trình duyệt bắt đầu bằng `vi` thì chọn `vi`, còn lại chọn `en`. Trước khi khởi động xong, ngôn ngữ hiện tại SHALL là `vi`.

#### Scenario: Lựa chọn đã lưu thắng tham số URL
- **WHEN** IndexedDB lưu `vi`, URL có `l=en` và trình duyệt là `en-US`
- **THEN** ứng dụng dùng `vi`

#### Scenario: Tham số URL khi chưa có lựa chọn đã lưu
- **WHEN** chưa có lựa chọn đã lưu, URL có `l=en` và trình duyệt là `vi-VN`
- **THEN** ứng dụng dùng `en`

#### Scenario: Ngôn ngữ trình duyệt tiếng Việt
- **WHEN** chưa có lựa chọn đã lưu, URL không có `l` và trình duyệt là `vi-VN`
- **THEN** ứng dụng dùng `vi`

#### Scenario: Ngôn ngữ trình duyệt khác
- **WHEN** chưa có lựa chọn đã lưu, URL không có `l` và trình duyệt là `fr`
- **THEN** ứng dụng dùng `en`

### Requirement: Tên ứng dụng và tiêu đề trang
Hệ thống SHALL hiển thị tên ứng dụng là `Chia tiền` khi ngôn ngữ là `vi` và `Split Bill` khi ngôn ngữ là `en`, ở tiêu đề thanh đầu trang và ở `<title>` của trang. Mỗi lần đổi ngôn ngữ, thuộc tính `lang` của thẻ `<html>` SHALL được cập nhật theo ngôn ngữ mới.

#### Scenario: Đổi tên sang tiếng Anh
- **WHEN** người dùng chuyển sang `en`
- **THEN** tiêu đề thanh đầu trang là `Split Bill`, `document.title` là `Split Bill` và `<html lang>` là `en`

### Requirement: Link Snapshot không mang tham số ngôn ngữ
Hệ thống SHALL dựng link Snapshot dạng `…?s=<mã>` mà không thêm tham số `l`. Người nhận mở link sẽ dùng lựa chọn đã lưu hoặc ngôn ngữ của trình duyệt. Nếu URL vẫn có tham số `l=vi` hoặc `l=en` thì hệ thống SHALL đọc tham số đó theo thứ tự ưu tiên ở Requirement thứ tự xác định ngôn ngữ.

#### Scenario: Dựng link chia sẻ
- **WHEN** hệ thống dựng link Snapshot từ một mã `abc` với gốc `https://x.test/`
- **THEN** link kết quả là `https://x.test/?s=abc`, không có tham số `l`

#### Scenario: Mở link có tham số ngôn ngữ
- **WHEN** người nhận mở link có `l=en` và chưa có lựa chọn đã lưu
- **THEN** ứng dụng mở ở tiếng Anh

### Requirement: Trang Snapshot theo ngôn ngữ
Trang xem Snapshot SHALL dùng chung công tắc ngôn ngữ trên thanh đầu trang và SHALL hiển thị lại toàn bộ nội dung Snapshot theo ngôn ngữ đang chọn khi người dùng đổi ngôn ngữ. Việc đổi ngôn ngữ trên Snapshot SHALL chỉ ghi lựa chọn ngôn ngữ vào `settings`; hệ thống không được ghi bữa, hoá đơn hay dữ liệu Snapshot nào vào IndexedDB.

#### Scenario: Đổi ngôn ngữ khi đang xem Snapshot
- **WHEN** người dùng mở link Snapshot ở tiếng Việt và bấm `EN`
- **THEN** dòng thanh toán hiển thị theo tiếng Anh, ví dụ `Payment Bình to An`, và nhãn trạng thái là `Snapshot view`
- **AND** IndexedDB không có bữa nào được ghi thêm và chỉ có `settings.language` được cập nhật

### Requirement: Định dạng số tiền
Hệ thống SHALL hiển thị số tiền bằng đơn vị `₫` ở cả hai ngôn ngữ và không quy đổi sang ngoại tệ. Dấu phân cách nghìn theo ngôn ngữ: `vi` dùng dấu chấm và `en` dùng dấu phẩy. Số tiền được làm tròn đến đồng trước khi hiển thị. Việc đổi ngôn ngữ SHALL NOT thay đổi giá trị tiền.

#### Scenario: Hiển thị cùng một số tiền ở hai ngôn ngữ
- **WHEN** số tiền là `1620000`
- **THEN** ngôn ngữ `vi` hiển thị `1.620.000 ₫` và ngôn ngữ `en` hiển thị `1,620,000 ₫`

#### Scenario: Nhập tiền không phụ thuộc ngôn ngữ
- **WHEN** người dùng nhập `45,000`, `45.000`, `45k` hoặc `45.000 ₫`
- **THEN** hệ thống hiểu cùng một giá trị `45000` trong cả hai ngôn ngữ

### Requirement: Định dạng ngày và thứ trong tuần
Hệ thống SHALL hiển thị ngày dạng `dd/mm/yyyy` khi ngôn ngữ là `vi` và dạng `Oct 19, 2026` khi ngôn ngữ là `en`. Tên thứ trong tuần SHALL là `T2` đến `T7` và `CN` ở `vi`, còn `Mon` đến `Sun` ở `en`, và tuần luôn bắt đầu từ thứ Hai. Chuỗi không phải ngày hợp lệ SHALL được trả về nguyên văn.

#### Scenario: Ngày hiển thị theo ngôn ngữ
- **WHEN** ngày là `2026-10-19`
- **THEN** ngôn ngữ `vi` hiển thị `19/10/2026` và ngôn ngữ `en` hiển thị `Oct 19, 2026`

#### Scenario: Chuỗi ngày không hợp lệ
- **WHEN** chuỗi `2026-02-30` được định dạng
- **THEN** hệ thống trả về nguyên chuỗi `2026-02-30`

### Requirement: Sắp xếp danh bạ theo tiếng Việt
Hệ thống SHALL sắp xếp danh bạ thành viên theo quy tắc tiếng Việt A–Z ngay cả khi giao diện đang là `en`. Hồ sơ "Tôi" của chủ app SHALL luôn đứng đầu danh sách. Các tên bằng nhau thì xếp theo thời điểm tạo.

#### Scenario: Danh bạ ở giao diện tiếng Anh
- **WHEN** ngôn ngữ là `en` và danh bạ có các thành viên `Bình`, `An` và hồ sơ "Tôi"
- **THEN** hồ sơ "Tôi" đứng đầu, sau đó là `An` rồi `Bình` theo quy tắc tiếng Việt

### Requirement: Giá trị mặc định do hệ thống sinh
Hệ thống SHALL hiển thị theo ngôn ngữ đang chọn các giá trị mặc định do hệ thống tạo: hồ sơ chủ app có tên `Tôi` hiển thị là `Me` ở `en`, và kèo mặc định `Kèo n` hiển thị là `Venue n` ở `en`. Dữ liệu được lưu vẫn là tiếng Việt. Tên do người dùng tự đặt SHALL giữ nguyên, không bao giờ bị dịch.

#### Scenario: Hồ sơ Tôi và tên tự đặt
- **WHEN** ngôn ngữ là `en` và hồ sơ chủ app đang mang tên mặc định `Tôi`
- **THEN** tên hiển thị là `Me`
- **AND** nếu người dùng đã đặt tên `Leonard` cho hồ sơ đó thì tên hiển thị vẫn là `Leonard`

#### Scenario: Kèo mặc định
- **WHEN** kèo có tên đã lưu là `Kèo 2` và ngôn ngữ là `en`
- **THEN** tên hiển thị là `Venue 2`
- **AND** kèo đặt tên riêng như `Lẩu bò` không bị thay đổi

### Requirement: Tin nhắn thanh toán theo ngôn ngữ
Tin nhắn thông báo thanh toán SHALL được sinh theo ngôn ngữ truyền vào, mặc định là ngôn ngữ giao diện lúc chia sẻ. Tin nhắn SHALL gồm dòng tên bữa, mỗi người cần chuyển một dòng dạng `- <người>: chuyển cho <người nhận> <số tiền>` (ở `en` là `transfer to`), và dòng link Snapshot ở cuối. Nếu không còn khoản nào cần chuyển thì tin nhắn có một dòng báo đã hoàn tất thanh toán theo ngôn ngữ đã chọn.

#### Scenario: Tin nhắn tiếng Anh
- **WHEN** ngôn ngữ là `en`, bữa tên `Lẩu cuối tuần` có An cần chuyển 50000 cho Bình
- **THEN** tin nhắn có dòng `- An: transfer to Bình 50,000 ₫`
- **AND** dòng cuối là link Snapshot

#### Scenario: Không còn khoản cần chuyển
- **WHEN** tất cả các khoản đã thanh toán và tin nhắn được sinh ở `vi`
- **THEN** tin nhắn có dòng `- Tất cả các khoản thanh toán đã hoàn tất.` trước link Snapshot

### Requirement: Nội dung chuyển khoản
Nội dung chuyển khoản mặc định SHALL được dựng từ câu `{tên người chuyển} thanh toán {tên bữa}` theo ngôn ngữ của người xem khi trong link không có nội dung riêng. Nội dung do người dùng hoặc link đã mang theo SHALL giữ nguyên.

#### Scenario: Nội dung mặc định ở Snapshot tiếng Anh
- **WHEN** người xem mở Snapshot ở `en` và link không lưu nội dung chuyển khoản
- **THEN** nội dung chuyển khoản được dựng theo bản dịch tiếng Anh của câu đó

#### Scenario: Nội dung đã lưu trong link
- **WHEN** link Snapshot có sẵn nội dung chuyển khoản
- **THEN** nội dung đó được hiển thị nguyên văn, không dịch lại
