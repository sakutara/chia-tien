## ADDED Requirements

### Requirement: Thêm nhiều Hoá đơn vào một Kèo
Hệ thống SHALL cho phép thêm một hoặc nhiều Hoá đơn vào mỗi Kèo. Mỗi Hoá đơn SHALL lưu tên quán, ngày in trên hoá đơn, người ứng, tổng tiền, VAT và danh sách file ảnh. (BR-4.4)

#### Scenario: Thêm Hoá đơn thứ hai vào cùng Kèo
- **WHEN** người dùng thêm một Hoá đơn mới vào Kèo đã có một Hoá đơn
- **THEN** Kèo có hai Hoá đơn, và tổng chi phí của Kèo là cộng của cả hai

### Requirement: Sửa và xoá Hoá đơn
Hệ thống SHALL cho phép sửa Hoá đơn. Khi xoá Hoá đơn, hệ thống SHALL hiện hộp xác nhận và SHALL xoá luôn ảnh và món của Hoá đơn đó. (BR-4.4, R-15)

#### Scenario: Xoá Hoá đơn có ảnh và món
- **WHEN** người dùng xoá một Hoá đơn và xác nhận
- **THEN** các file ảnh được xoá trước, sau đó các món và Hoá đơn được xoá trong cùng một giao dịch

### Requirement: Hai cách nhập Hoá đơn trong cùng một form
Form nhập Hoá đơn SHALL có hai tab: tab nhập chi tiết món có danh sách món, và tab chỉ nhập tổng tiền có một ô tổng tiền, kèm VAT chưa cộng nếu có. Epic 4 SHALL lưu đúng `inputMode` tương ứng với tab được chọn. (BR-4.5)

#### Scenario: Lưu Hoá đơn chỉ nhập tổng tiền (AC-6)
- **WHEN** người dùng nhập tổng 1.620.000 ở tab chỉ nhập tổng tiền rồi lưu
- **THEN** Hoá đơn được lưu với `inputMode` là `TOTAL_ONLY`, không có món, và tổng đúng sau VAT

### Requirement: Ảnh hoá đơn từ camera hoặc tải lên
Hệ thống SHALL nhận ảnh hoá đơn từ camera, qua `<input type="file" accept="image/*" capture="environment">`, hoặc tải ảnh lên dạng JPEG, PNG hoặc WebP. Mỗi Hoá đơn SHALL đính kèm được nhiều ảnh. Người dùng SHALL xem được ảnh gốc, tải ảnh về, và xoá từng ảnh. (BR-4.6, AC-2)

#### Scenario: Thêm nhiều ảnh, xem, tải về và xoá (AC-2)
- **WHEN** người dùng thêm nhiều ảnh vào một Hoá đơn, mở một ảnh để xem, tải một ảnh về, rồi xoá một ảnh
- **THEN** Hoá đơn còn lại các ảnh chưa bị xoá, và ảnh đã xoá không còn trong danh sách của Hoá đơn

### Requirement: Tải PDF làm Hoá đơn
Hệ thống SHALL nhận file PDF của Hoá đơn. Mỗi trang PDF SHALL thành một ảnh JPEG cạnh dài 2800 px có nền trắng. Nếu trang có lớp chữ thì văn bản của trang SHALL được lưu vào `ocrRawText` để không phải OCR lại. PDF có mật khẩu hoặc bị hỏng SHALL bị từ chối với mã lỗi tương ứng. (BR-4.6)

#### Scenario: PDF dài hơn số ảnh còn chỗ
- **WHEN** người dùng tải một PDF có nhiều trang hơn số ảnh còn chỗ trong Hoá đơn
- **THEN** hệ thống chỉ nhận số trang còn chỗ, từ trang đầu, và báo người dùng biết

#### Scenario: PDF có mật khẩu
- **WHEN** người dùng tải một PDF có mật khẩu
- **THEN** thao tác bị từ chối với lỗi `PDF_ENCRYPTED`

### Requirement: Giới hạn định dạng và số lượng ảnh
Hệ thống SHALL chỉ nhận ảnh có định dạng `image/jpeg`, `image/png` hoặc `image/webp`, tối đa 40 MB cho mỗi ảnh trước khi nén, và tối đa 10 ảnh cho mỗi Hoá đơn. Ảnh được nén trước khi lưu theo R-18, và bản đã nén là file duy nhất được lưu. Hoá đơn đang soạn chưa lưu SHALL có ảnh tạm. (R-12)

Ghi chú: SA B.8 (mục 7) và SA B.11 ghi giới hạn 15 MB cho mỗi ảnh trước khi nén. Requirement này ghi theo R-12 (40 MB) và giữ nguyên điểm khác biệt đó trong tài liệu gốc.

#### Scenario: Tải file không phải ảnh
- **WHEN** người dùng tải lên một file không thuộc định dạng ảnh cho phép
- **THEN** thao tác bị từ chối với lỗi `FILE_TYPE_NOT_ALLOWED`

#### Scenario: Thêm ảnh thứ mười một
- **WHEN** Hoá đơn đã có mười ảnh và người dùng thêm một ảnh nữa
- **THEN** thao tác bị từ chối với lỗi `TOO_MANY_FILES`

### Requirement: Lưu ảnh thành file và giải phóng dung lượng khi xoá
Ảnh hoá đơn SHALL được lưu thành file qua `fileStorageService` (OPFS, dự phòng Blob IndexedDB). Xoá ảnh, Hoá đơn, Kèo hoặc Bữa SHALL giải phóng dung lượng file thật. Khi lưu thất bại giữa chừng, file vật lý SHALL được xoá trước và bản ghi cơ sở dữ liệu xoá sau, để không còn file mồ côi. (BR-4.6, R-15, AC-2)

#### Scenario: Xoá ảnh giải phóng file thật (AC-2)
- **WHEN** người dùng xoá một ảnh và xác nhận trong hộp xác nhận
- **THEN** file ảnh được xoá khỏi bộ nhớ và số ảnh của Hoá đơn giảm đi một

### Requirement: Nén ảnh cố định ở mức Cân bằng
Mọi ảnh thêm vào Hoá đơn SHALL được nén cố định theo mức Cân bằng, và người dùng SHALL NOT chọn mức nén. Đầu ra là JPEG với cạnh dài tối đa 2000 px và chất lượng 0,80. Ảnh SHALL NOT bị phóng to. Ảnh nhỏ tới 400 KB và không cần thu nhỏ SHALL NOT bị nén lại. Nếu bản nén lớn hơn bản gốc thì giữ bản gốc. Ảnh có cạnh dài dưới 1000 px SHALL được cảnh báo rằng OCR có thể đọc sai. Dung lượng trước và sau SHALL được lưu vào bản ghi ảnh (`originalSizeBytes`, `sizeBytes`) và hiển thị cho từng ảnh. (BR-4.16, R-18, AC-15)

#### Scenario: Ảnh 3 MB được nén còn khoảng 640 KB (AC-15)
- **WHEN** người dùng tải một ảnh khoảng 3,0 MB
- **THEN** ảnh được nén ở mức Cân bằng, hiển thị dung lượng trước và sau, và OCR vẫn đọc được bill mẫu

#### Scenario: Ảnh nhỏ hơn 1000 px được cảnh báo (AC-15)
- **WHEN** người dùng tải một ảnh có cạnh dài dưới 1000 px
- **THEN** ảnh được lưu và hiện cảnh báo rằng OCR có thể đọc sai

#### Scenario: Không phóng to ảnh (AC-15)
- **WHEN** người dùng tải một ảnh có cạnh dài nhỏ hơn 2000 px
- **THEN** ảnh giữ nguyên kích thước và không được phóng to

### Requirement: Tiền là số nguyên đồng
Mọi ô nhập tiền SHALL chấp nhận các dạng `45000`, `45.000`, `45,000` và `45k`, và SHALL lưu thành số nguyên không âm. Hệ thống SHALL từ chối giá trị âm, chữ lẫn lộn và giá trị lớn hơn 9.999.999.999, kèm thông báo tiếng Việt. (R-1, AC-10)

#### Scenario: Nhập tiền theo nhiều dạng (AC-10)
- **WHEN** người dùng nhập `45k` hoặc `45.000` vào ô tiền
- **THEN** giá trị được lưu là 45000

#### Scenario: Nhập tiền không hợp lệ (AC-10)
- **WHEN** người dùng nhập `-5000` hoặc `12abc` vào ô tiền
- **THEN** giá trị bị từ chối kèm thông báo tiếng Việt và không được lưu

### Requirement: Người ứng tiền và người chia đều của Hoá đơn
Mỗi Hoá đơn SHALL có `payerMemberId` bắt buộc và thuộc danh sách người tham gia của Kèo. Mặc định là chủ trì nếu chủ trì thuộc Kèo, ngược lại là người đầu tiên trong danh sách. Danh sách `equalSplitParticipantIds` SHALL là tập con của người tham gia Kèo, mặc định bằng toàn bộ người tham gia, và SHALL NOT rỗng. Epic 4 SHALL NOT có ô chỉnh danh sách chia đều. Kèo có danh sách người tham gia rỗng SHALL NOT nhận thêm Hoá đơn. (R-5, R-6)

#### Scenario: Mặc định người ứng là chủ trì
- **WHEN** người dùng mở form tạo Hoá đơn trong Kèo có chủ trì tham gia
- **THEN** người ứng được chọn sẵn là chủ trì

### Requirement: Phân bổ VAT vào từng món
Khi Hoá đơn có món, VAT SHALL được phân bổ vào từng món theo phương pháp phần dư lớn nhất. Tổng giá sau mọi điều chỉnh của các món SHALL bằng đúng `totalAmount` của Hoá đơn, không lệch 1 đồng. (BR-4.9, AC-4)

#### Scenario: Tổng các món khớp tuyệt đối sau VAT (AC-4)
- **WHEN** một Hoá đơn có nhiều món, VAT theo phần trăm, và tổng tiền chia không tròn cho các món
- **THEN** tổng `finalAmount` của các món bằng đúng `totalAmount` của Hoá đơn

### Requirement: Công thức tính Hoá đơn theo thứ tự cố định
Tổng Hoá đơn SHALL được tính theo thứ tự cố định: giảm giá trước, rồi phí phục vụ trên tiền sau giảm, rồi VAT trên tiền sau giảm cộng phí phục vụ. Cụ thể `totalAmount = N + C + V`, với `N = S − D`, trong đó giảm giá `D` không âm và nhỏ hơn tiền hàng `S`. Tiền hàng `S` là tổng `rawAmount` của món nếu hoá đơn có món, hoặc số người dùng nhập nếu hoá đơn chỉ có tổng. Khi bill ghi số tiền VAT cụ thể, người dùng SHALL chọn `FIXED_AMOUNT` để khớp đúng bill. Tổng trọng số bằng 0 mà khoản cần phân bổ khác 0 thì SHALL bị từ chối với thông báo. (R-8)

Ghi chú về công thức: `D` là giảm giá, `C` là phí phục vụ, `V` là VAT. Theo bản gốc, `D` theo phần trăm được làm tròn `round(S × p / 100)`, `C` theo phần trăm được tính trên `N`, và `V` theo phần trăm được tính trên `N + C`.

#### Scenario: Giảm giá theo số tiền, phí phục vụ theo phần trăm (AC-13)
- **WHEN** người dùng nhập tổng 1.620.000 ở tab chỉ nhập tổng tiền, giảm giá 100.000, phí phục vụ 5 phần trăm và không có VAT
- **THEN** tổng hoá đơn là 1.596.000

#### Scenario: Giảm giá sát tiền hàng vẫn được tính đúng (AC-13)
- **WHEN** giảm giá D sát bằng tiền hàng S trong các bộ số thử nghiệm
- **THEN** `totalAmount = S − D + C + V` đúng và `Σ finalAmount` bằng `totalAmount` tuyệt đối

### Requirement: Giảm giá và phí phục vụ của Hoá đơn
Giảm giá và phí phục vụ SHALL là hai khoản điều chỉnh ở mức cả Hoá đơn. Mỗi khoản có ba chế độ `NONE`, `PERCENTAGE` và `FIXED_AMOUNT`, và được nhập tay hoặc nhận từ OCR. Hai khoản này SHALL áp dụng cho cả tab nhập chi tiết món và tab chỉ nhập tổng tiền. Với Hoá đơn có món, hai khoản này SHALL được phân bổ vào từng món cùng VAT, nên món đắt chịu phần phí phục vụ lớn hơn và hưởng giảm giá nhiều hơn tương ứng. Giảm giá theo từng món không thuộc phạm vi Epic 4. (BR-4.15, AC-13)

#### Scenario: Giảm giá và phí phục vụ phân bổ vào món (AC-13)
- **WHEN** một Hoá đơn có món có giảm giá và phí phục vụ theo phần trăm
- **THEN** `allocatedDiscountAmount` và `allocatedServiceAmount` của từng món tỷ lệ với thành tiền gốc của món, và tổng của mỗi khoản bằng đúng khoản đó trên Hoá đơn

### Requirement: Hoá đơn có món và Hoá đơn chỉ có tổng
Hoá đơn có món (`ITEMIZED`) SHALL có `subtotalAmount` bằng tổng `rawAmount` của các món. Hoá đơn chỉ có tổng (`TOTAL_ONLY`) SHALL có tiền hàng do người dùng nhập và SHALL NOT có món. Cả hai SHALL dùng công thức R-8 để tính `totalAmount`. Nếu bill ghi sẵn tổng đã gồm mọi khoản thì người dùng SHALL để giảm giá, phí phục vụ và VAT ở `NONE` và nhập tổng đó. `totalAmount` SHALL lớn hơn 0. (R-9)

#### Scenario: Hoá đơn có món mà không có món nào bị từ chối
- **WHEN** người dùng lưu Hoá đơn ở tab nhập chi tiết món nhưng không có món nào
- **THEN** thao tác bị từ chối

### Requirement: Món trong Hoá đơn ở Epic 4
Món SHALL có tên bắt buộc tối đa 100 ký tự, số lượng là số nguyên từ 1 trở lên, và đơn giá từ 0 trở lên. `rawAmount` SHALL mặc định bằng `quantity × unitPrice`, và người dùng SHALL sửa được thành tiền (dùng cho bill đã giảm giá). Món mới ở Epic 4 SHALL có `consumers` rỗng, và Epic 4 SHALL chỉ cho món ở dạng đã có trong Hoá đơn, chưa gán người ăn. (R-10)

#### Scenario: Số lượng lẻ bị từ chối
- **WHEN** người dùng nhập số lượng `0.5` cho một món
- **THEN** giá trị bị từ chối và người dùng được hướng dẫn gộp phần lẻ vào đơn giá

### Requirement: Tổng chi phí hiển thị theo Hoá đơn, Kèo và Bữa
Hệ thống SHALL hiển thị tổng chi phí ở mỗi Hoá đơn, mỗi Kèo (cộng các Hoá đơn của Kèo) và cả Bữa, khớp với số đã hiển thị ở Epic 3. Khi Bữa thêm Hoá đơn đầu tiên, chữ "Chưa có chi phí" SHALL đổi thành số thật ở cả ba chế độ xem Bữa. (BR-4.11, AC-7)

#### Scenario: Thêm Hoá đơn đầu tiên cho Bữa (AC-7)
- **WHEN** người dùng lưu Hoá đơn đầu tiên của một Bữa đang hiển thị "Chưa có chi phí"
- **THEN** tổng chi phí của Hoá đơn, Kèo và Bữa đổi thành số thật ở cả ba chế độ xem mà không cần tải lại trang

#### Scenario: Xoá Hoá đơn làm Kèo về chưa có chi phí (AC-7)
- **WHEN** người dùng xoá Hoá đơn duy nhất của một Kèo và xác nhận
- **THEN** Kèo hiển thị "Chưa có chi phí"

### Requirement: Dữ liệu bền vững và huỷ form đang soạn
Dữ liệu nhập SHALL bền vững: sau khi tải lại trang, mọi Kèo, Hoá đơn, món và ảnh SHALL còn nguyên. Thao tác lỗi giữa chừng, gồm quét OCR hỏng và lưu ảnh lỗi, SHALL NOT để lại Hoá đơn nửa vời hoặc ảnh mồ côi. Huỷ form đang soạn SHALL xoá ảnh tạm của Hoá đơn chưa lưu. Ảnh tạm dùng `invoiceId` được sinh trước khi mở form, và hàm `sweepOrphanFiles` SHALL dọn ảnh trỏ vào Hoá đơn không tồn tại khi mở màn chi tiết Bữa. (BR-4.14, R-12, AC-8)

#### Scenario: Huỷ form chưa lưu không để lại ảnh (AC-8)
- **WHEN** người dùng thêm ảnh vào form Hoá đơn mới rồi đóng form bằng Esc mà không lưu
- **THEN** các ảnh tạm được xoá và form mới mở ra không còn ảnh nào

#### Scenario: Tải lại trang giữa chừng khi đang soạn (AC-8)
- **WHEN** người dùng tải lại trang khi đang soạn Hoá đơn chưa lưu
- **THEN** các ảnh tạm không còn trỏ vào Hoá đơn nào sau khi dọn dẹp chạy khi mở lại Bữa

### Requirement: Giao diện nhập Hoá đơn dùng được trên màn hình hẹp
Các màn hình của Epic 4 SHALL dùng được ở chiều rộng 375 px mà không cuộn ngang, mọi nút và ô chạm SHALL có kích thước ít nhất 44 px, thao tác được bằng bàn phím, và camera SHALL hoạt động trên điện thoại. (AC-11)

#### Scenario: Form Hoá đơn ở 375 px (AC-11)
- **WHEN** người dùng mở form Hoá đơn ở chiều rộng 375 px
- **THEN** trang không cuộn ngang và các nút đạt ít nhất 44 px
