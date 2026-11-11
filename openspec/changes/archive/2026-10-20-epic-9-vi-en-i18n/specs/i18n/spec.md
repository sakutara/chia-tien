## ADDED Requirements

### Requirement: Công tắc ngôn ngữ và đổi tức thì
Hệ thống SHALL hỗ trợ đúng hai ngôn ngữ `vi` (Tiếng Việt) và `en` (English), và SHALL có một công tắc ngôn ngữ trên thanh đầu trang của ứng dụng chính. Công tắc đổi ngôn ngữ tức thì, không tải lại trang và không làm mất dữ liệu đang nhập. (BR-9.1)

#### Scenario: Đổi ngôn ngữ ngay lập tức trên toàn bộ màn hình (AC-1)
- **WHEN** người dùng bật công tắc ngôn ngữ khi đang ở danh sách bữa, chi tiết bữa, kèo, hoá đơn, món, quyết toán, hộp thoại hoặc thông báo lỗi
- **THEN** toàn bộ màn hình chuyển sang ngôn ngữ mới ngay lập tức, không còn chuỗi của ngôn ngữ cũ sót lại
- **AND** chuyển từ `vi` sang `en` và ngược lại đều cho kết quả tương tự

#### Scenario: Công tắc dùng được bằng bàn phím và trình đọc màn hình (R-3)
- **WHEN** người dùng thao tác công tắc bằng bàn phím hoặc trình đọc màn hình
- **THEN** công tắc nhận được tiêu điểm, đổi trạng thái bằng bàn phím và có nhãn đọc được bằng trình đọc màn hình
- **AND** vùng chạm của công tắc tối thiểu 44 px

### Requirement: Mọi chuỗi giao diện theo ngôn ngữ đã chọn
Hệ thống SHALL hiển thị mọi chuỗi cho người dùng theo ngôn ngữ đã chọn. Phạm vi gồm nhãn, nút, tiêu đề, placeholder, `aria-label`, thông báo lỗi và xác nhận, trạng thái rỗng, tên các bước và chế độ xem, `<title>` của trang và thuộc tính `lang` của thẻ `<html>`. Không còn chuỗi cứng nằm lẫn trong component. (BR-9.2)

#### Scenario: Nguồn chuỗi duy nhất và kiểm tra từ điển (R-1)
- **WHEN** mã nguồn dùng `t('…')` hoặc `T('…')` với câu tiếng Việt gốc làm khoá
- **THEN** bản tiếng Anh của khoá nằm trong `src/i18n/en.ts`
- **AND** test quét mã nguồn xác nhận mọi câu `t()` và `T()` đều có bản dịch `en`, không có khoá thừa, và bản dịch giữ đúng các tham số `{…}`

#### Scenario: Thiếu bản dịch lúc chạy (R-2)
- **WHEN** một khoá không có bản dịch cho ngôn ngữ đang chọn
- **THEN** hệ thống dùng bản `vi` của khoá, rồi mới tới tên khoá
- **AND** hệ thống không bao giờ hiển thị chuỗi trống

#### Scenario: Hai từ điển cùng tập khoá và bố cục không vỡ ở 375 px (AC-9)
- **WHEN** test kiểm hai từ điển và người dùng mở ứng dụng ở chiều rộng 375 px với cả hai ngôn ngữ
- **THEN** hai từ điển có cùng tập khoá, và toàn bộ test của Epic 1 đến Epic 8 vẫn đạt
- **AND** màn hình không cuộn ngang, và chuỗi tiếng Anh dài hơn không làm vỡ bố cục

### Requirement: Tên ứng dụng đổi theo ngôn ngữ
Hệ thống SHALL hiển thị tên ứng dụng theo ngôn ngữ đã chọn: `vi` là "Chia tiền" và `en` là "Split Bill". Tên này áp dụng ở thanh đầu trang và ở `<title>`, vì ứng dụng chưa có manifest PWA. (BR-9.3)

#### Scenario: Tên ứng dụng đổi khi chọn tiếng Anh (AC-2)
- **WHEN** người dùng chuyển ngôn ngữ sang `en`
- **THEN** thanh đầu trang và `<title>` hiển thị "Split Bill"
- **AND** khi chuyển về `vi`, cả hai hiển thị "Chia tiền"

### Requirement: Ngôn ngữ mặc định lần đầu và ghi nhớ lựa chọn
Hệ thống SHALL chọn ngôn ngữ mặc định lần mở đầu tiên theo `navigator.language`: nếu bắt đầu bằng `vi` thì chọn `vi`, còn lại chọn `en`. Lựa chọn của người dùng SHALL được lưu trong IndexedDB tại `AppSettings.language` (bảng `settings`), dùng chung cho ứng dụng chính và trang Snapshot, và được ưu tiên hơn mặc định ở những lần mở sau. Đổi ngôn ngữ trên Snapshot cũng được lưu vào đây, vì đó là thiết lập cá nhân của người xem chứ không phải dữ liệu của Snapshot. (BR-9.4)

#### Scenario: Giữ ngôn ngữ đã chọn sau khi tải lại trang (AC-3)
- **WHEN** người dùng đã chọn một ngôn ngữ và tải lại trang
- **THEN** ứng dụng mở bằng ngôn ngữ đã chọn
- **AND** khi chưa có lựa chọn nào được lưu, lần mở đầu tiên theo `navigator.language`

### Requirement: Định dạng ngày, số và sắp xếp theo ngôn ngữ
Hệ thống SHALL định dạng ngày, tháng, thứ, dấu phân cách số và thứ tự sắp xếp tên theo ngôn ngữ đã chọn, với thứ tự sắp xếp A–Z chuẩn của locale. Đơn vị tiền SHALL vẫn là VNĐ (`₫`) ở cả hai ngôn ngữ; chỉ dấu phân cách nghìn đổi: `vi` là `1.620.000 ₫`, `en` là `1,620,000 ₫`. Hệ thống KHÔNG quy đổi sang ngoại tệ. (BR-9.5)

#### Scenario: Ngày và dấu phân cách số theo đúng ngôn ngữ (AC-4)
- **WHEN** ứng dụng hiển thị ngày, thứ và số tiền ở `vi` rồi ở `en`
- **THEN** ngày, thứ và dấu phân cách số theo đúng quy ước của từng ngôn ngữ
- **AND** giá trị số tiền không đổi giữa hai ngôn ngữ

#### Scenario: Phép tính tiền không phụ thuộc ngôn ngữ (R-4)
- **WHEN** người dùng đổi ngôn ngữ giữa `vi` và `en`
- **THEN** mọi phép tính tiền, chia tiền và quyết toán cho kết quả y hệt ở cả hai ngôn ngữ

### Requirement: Tin nhắn thanh toán sinh theo ngôn ngữ giao diện
Hệ thống SHALL sinh tin nhắn thanh toán theo ngôn ngữ giao diện đang chọn tại thời điểm chia sẻ, và giữ nguyên cấu trúc dòng. Ví dụ `vi` là `- An: chuyển cho Bình 50.000 ₫`, còn `en` là `- An: transfer to Bình 50,000 ₫`. Ngôn ngữ của tin nhắn là ngôn ngữ giao diện lúc chia sẻ, chưa có ghi đè riêng. Link Snapshot đi kèm có cùng ngôn ngữ đó. (BR-9.6)

#### Scenario: Tin nhắn tiếng Anh giữ cấu trúc dòng (AC-5)
- **WHEN** người dùng chia sẻ thanh toán khi giao diện đang là `en`
- **THEN** mỗi khoản chuyển được viết thành `transfer to <người> <số tiền>` và số tiền dùng dấu phân cách của `en`
- **AND** khi không còn khoản cần chuyển, tin nhắn ghi "All payments are settled."
- **AND** link Snapshot đi kèm là link của cùng ngôn ngữ

### Requirement: Công tắc ngôn ngữ riêng trên trang Snapshot
Trang xem Snapshot (chỉ đọc) SHALL có công tắc ngôn ngữ riêng. Toàn bộ nội dung trên trang, gồm chuỗi giao diện, tên các bước, trạng thái thanh toán, bảng quyết toán, giải trình và định dạng ngày và tiền, SHALL hiển thị theo ngôn ngữ đang chọn. Đổi ngôn ngữ trên Snapshot chỉ ảnh hưởng người đang xem và không sửa link. (BR-9.7)

#### Scenario: Đổi ngôn ngữ trên Snapshot không ghi dữ liệu bữa (AC-6)
- **WHEN** người xem đổi ngôn ngữ trên trang Snapshot
- **THEN** toàn bộ nội dung trên trang đổi theo, kể cả bảng quyết toán và giải trình
- **AND** IndexedDB không có dữ liệu bữa nào được ghi; chỉ `settings.language` được ghi

#### Scenario: Snapshot chỉ đọc và không phụ thuộc server (R-5)
- **WHEN** người xem mở hoặc đổi ngôn ngữ trên trang Snapshot
- **THEN** ngôn ngữ chỉ là tham số hiển thị và không thay đổi dữ liệu bữa trong payload
- **AND** trang không phụ thuộc server; tính chỉ đọc của Snapshot được giữ nguyên, và quy tắc của Epic 8 BR-8.3 vẫn đúng với dữ liệu bữa

### Requirement: Tham số ngôn ngữ của link Snapshot theo thiết kế Epic 9
Link Snapshot SHALL mang tham số `l` (`vi` hoặc `en`) là ngôn ngữ của người gửi, để người nhận mở ra thấy đúng ngôn ngữ người gửi muốn. Thứ tự ưu tiên khi mở là: lựa chọn đã lưu trong IndexedDB của người nhận (nếu có) trước, rồi tới `l` trong link, rồi tới `navigator.language`. Link cũ không có `l` vẫn mở bình thường và rơi về hai mức sau. Ghi chú lịch sử: SA mục B.4 ghi nhận tham số `l` đã bị bỏ để link ngắn hơn (link có dạng `…?s=<mã>`, người nhận dùng ngôn ngữ đã lưu hoặc của trình duyệt), và commit `83fec8d` ngày 2026-10-24 ghi "bỏ tham số ngôn ngữ &l=". (BR-9.8)

#### Scenario: Link mới mở đúng ngôn ngữ người gửi (AC-7)
- **WHEN** người nhận mở link Snapshot có tham số `l` và chưa từng chọn ngôn ngữ trên thiết bị này
- **THEN** trang mở bằng ngôn ngữ trong `l`
- **AND** khi người nhận đã có lựa chọn được lưu, lựa chọn đó được dùng thay cho `l`

#### Scenario: Tham số `l` ngắn và không đổi định dạng nén (R-6)
- **WHEN** link Snapshot có thêm tham số `l`
- **THEN** link chỉ dài thêm vài ký tự (`&l=en` là 4 ký tự)
- **AND** định dạng nén nhị phân của payload không đổi, nên link đã phát hành trước đó vẫn mở được

### Requirement: Dữ liệu người dùng nhập giữ nguyên khi đổi ngôn ngữ
Hệ thống SHALL giữ nguyên dữ liệu người dùng nhập khi đổi ngôn ngữ, gồm tên bữa, tên người, tên kèo, tên quán, tên món, tên nhóm, ghi chú và nội dung chuyển khoản do người dùng nhập. Các giá trị mặc định do hệ thống sinh SHALL hiển thị theo ngôn ngữ đang chọn thay vì bị đóng cứng theo ngôn ngữ lúc tạo, gồm hồ sơ "Tôi" hoặc "Me", kèo mặc định "Kèo n" hoặc "Venue n", và nhóm không tên. Tên bữa mặc định `Bữa <ngày>` giữ ngôn ngữ lúc tạo, vì là dữ liệu sinh lúc tạo. Nội dung chuyển khoản mặc định `<người> thanh toán <bữa>`, kể cả trong link Snapshot, được dựng lại theo ngôn ngữ của người xem. (BR-9.9)

#### Scenario: Giá trị mặc định đổi theo ngôn ngữ, tên tự đặt giữ nguyên (AC-8)
- **WHEN** người dùng chuyển ngôn ngữ giữa `vi` và `en`
- **THEN** hồ sơ "Tôi" hiển thị thành "Me" (hoặc ngược lại) và kèo mặc định "Kèo n" hiển thị thành "Venue n" (hoặc ngược lại)
- **AND** tên bữa, tên người, tên món và các tên do người dùng tự đặt không bị dịch
