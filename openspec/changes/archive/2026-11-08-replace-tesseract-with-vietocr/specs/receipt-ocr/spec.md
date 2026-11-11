## MODIFIED Requirements

### Requirement: Cắt và nắn thẳng tờ hoá đơn khi thêm ảnh chụp
Hệ thống SHALL dò bốn góc của tờ giấy sáng lớn nhất trong ảnh chụp hoá đơn, cắt và nắn phối cảnh thành hình chữ nhật không còn nền, rồi đưa cạnh dài về 2800 px (phóng tối đa 3 lần). Ảnh sau xử lý là ảnh xám, không nhị phân hoá, để chữ in nhiệt mờ không bị đứt nét. Nếu không tìm thấy tờ giấy rõ ràng, hệ thống giữ cả ảnh và chỉ thu về cạnh dài 2800 px.

**Trước đây**: ảnh được chuyển thành đen trắng bằng ngưỡng thích nghi (contrast 0,25, hằng `RECEIPT_SCAN_CONTRAST`), nền trắng, nét chữ vừa phải và chỉ làm dày khi nét đứt. Nếu không tìm thấy tờ giấy thì nhị phân hoá cả ảnh. BR-4.16 ghi rõ không dùng ảnh xám (`documentation/epic-4/BR.md`).

#### Scenario: Ảnh chụp nghiêng trên nền tối
- **WHEN** người dùng thêm ảnh chụp tờ hoá đơn nghiêng trên nền tối
- **THEN** hệ thống cắt theo bốn góc tờ giấy và nắn thẳng thành hình chữ nhật
- **AND** ảnh kết quả là ảnh xám, không có vùng nền tối ở mép

#### Scenario: Không tách được tờ giấy khỏi nền
- **WHEN** ảnh gần như đồng nhất hoặc tờ giấy không tách rõ khỏi nền
- **THEN** hệ thống giữ cả ảnh và chỉ thu về cạnh dài 2800 px

#### Scenario: Tờ giấy đã chiếm gần hết khung ảnh
- **WHEN** tờ giấy chiếm trên 97% diện tích ảnh và gần thẳng
- **THEN** hệ thống không cắt

#### Scenario: Ảnh đã xử lý được lưu theo dung lượng
- **WHEN** bản PNG của ảnh đã xử lý có dung lượng không quá 1 MB
- **THEN** ảnh được lưu dạng PNG, tên tệp thêm hậu tố `-scan`
- **AND** nếu PNG vượt 1 MB thì ảnh được lưu dạng JPEG

### Requirement: Nhận dạng chữ bằng VietOCR chạy ngoại tuyến
Hệ thống SHALL nhận dạng chữ bằng VietOCR dạng ONNX, gồm một detector DB (`det.onnx`) và một recognizer vgg_seq2seq (encoder và decoder), chạy trong Web Worker với WASM một luồng. Quá trình quét MUST NOT gọi mạng; model đi kèm ứng dụng trong thư mục public. Khi không có văn bản nào được nhận dạng, kết quả là danh sách rỗng.

**Trước đây**: OCR dùng Tesseract.js (`tesseract.js`, bản v7 theo ghi chú trong `documentation/epic-4/SA.md`) với dữ liệu ngôn ngữ `vie` và `eng` nằm trong `public/ocr/`, khoảng 24 MB. Worker và core WASM được nạp lười khi quét lần đầu, cấu hình `workerPath`, `corePath` và `langPath` trỏ tới file cục bộ.

#### Scenario: Quét khi không có mạng
- **WHEN** người dùng quét hoá đơn lúc thiết bị không có kết nối mạng
- **THEN** nhận dạng vẫn hoàn tất và trả về văn bản

#### Scenario: Lần quét đầu tiên khởi tạo bộ đọc chữ
- **WHEN** người dùng quét hoá đơn lần đầu sau khi mở ứng dụng
- **THEN** tiến trình hiển thị "Đang khởi tạo bộ đọc chữ" trước khi đọc ảnh

### Requirement: Vòng đời worker nhận dạng
Worker nhận dạng SHALL được tạo ở lần quét đầu tiên và dùng lại giữa các lần quét. Worker SHALL tự dừng sau 15 giây không có yêu cầu nào. Worker SHALL dừng ngay khi người dùng huỷ quét hoặc khi bộ nhớ được giải phóng (đóng form hoá đơn hoặc ứng dụng bị ẩn). Lần quét sau khi worker đã dừng sẽ tạo lại worker và nạp lại model.

**Trước đây**: worker tự dừng sau 60 giây không có yêu cầu (`IDLE_MS = 60_000` trong `services/ocrService.ts` trước b5c0d48). `documentation/05-ocr-and-receipt-reading.md` mục 11 và `documentation/epic-4/SA.md` cũng ghi 60 giây.

#### Scenario: Hai lần quét liên tiếp dùng chung worker
- **WHEN** người dùng quét hai lần liên tiếp trong thời gian worker còn hoạt động
- **THEN** chỉ có một worker được tạo

#### Scenario: Rảnh quá 15 giây
- **WHEN** không có yêu cầu quét nào trong 15 giây
- **THEN** worker dừng

#### Scenario: Đóng form khi đang giữ model
- **WHEN** người dùng đóng form hoá đơn hoặc ẩn ứng dụng
- **THEN** worker dừng ngay, không chờ hết 15 giây

### Requirement: Đối chiếu tổng bill và tự sửa số đọc sai
Hệ thống SHALL đối chiếu tổng bill bằng phép tính của app, đúng từng đồng: tổng các món trừ giảm giá, cộng phí phục vụ và VAT phải bằng tổng bill. Phép tính có thể theo bốn cách về thứ tự giảm giá, phí và VAT. Khi không khớp, hệ thống thử các cách sửa từ cùng văn bản OCR và chọn cách ít thay đổi nhất. Kết quả có trạng thái OK, CORRECTED, MISMATCH hoặc UNVERIFIED.

**Trước đây**: `documentation/ocr-pipeline.md` bước 8 ghi tổng tính được khớp khi lệch trong khoảng 1.000 đ hoặc 0,5 phần trăm. Bước 7 ghi dòng có giá trị trên 75 phần trăm `readTotal` là subtotal cần loại, và nhánh "tổng tính được gấp đôi `readTotal`", tối đa một lần loại subtotal mỗi bill. Code không có ngưỡng 75 phần trăm và so khớp chính xác đến từng đồng; cách chọn kịch bản theo chi phí có từ trước (xem `design.md` D9).

#### Scenario: Tổng khớp ngay
- **WHEN** các món, giảm giá, phí và VAT cho đúng tổng bill
- **THEN** trạng thái là OK và không có số nào bị đổi

#### Scenario: Sửa được một dòng đọc sai
- **WHEN** một dòng lệch và có cách sửa làm tổng khớp bill
- **THEN** trạng thái là CORRECTED, ghi chú nêu đã sửa gì và dòng đó được đánh dấu cần xem
- **AND** các cách sửa được thử gồm sửa một số của một dòng, bỏ dòng tổng bị đọc thành món, và đổi lẫn chữ số 1 và 4

#### Scenario: Lệch nhỏ do thiếu món
- **WHEN** tổng các món thấp hơn tổng bill không quá 10% và không cách nào khớp
- **THEN** thêm một món "Món chưa đọc được" với đúng số tiền thiếu và đánh dấu cần xem

#### Scenario: Không cách nào khớp
- **WHEN** mọi cách sửa đều không làm tổng khớp bill, kể cả khi lệch trên 10%
- **THEN** trạng thái là MISMATCH, không món nào được tự thêm hay bớt, và người dùng được yêu cầu chỉnh tay

## ADDED Requirements

### Requirement: Phát hiện vùng chữ và nhận dạng từng dòng
Detector SHALL dùng ngưỡng xác suất 0,3 để tách các vùng liên thông, bỏ vùng có ít hơn 4 điểm hoặc có điểm trung bình dưới 0,5, rồi mở rộng hộp theo hệ số 2 để bao trọn dấu tiếng Việt. Cạnh lớn nhất của ảnh đưa vào detector là 960 px và hai cạnh là bội số của 32. Mỗi hộp được cắt và đưa về chiều cao cố định 32 px; chiều rộng giữ tỉ lệ, làm tròn lên bội số của 10 và kẹp trong khoảng 32 đến 512 px. Dòng nhận dạng ra rỗng bị bỏ.

#### Scenario: Dấu tiếng Việt nằm ngoài nét chính
- **WHEN** dấu thanh nằm phía trên nét chính của một dòng chữ
- **THEN** hộp bao của dòng được mở rộng để không cắt mất dấu

#### Scenario: Vùng sáng nhiễu không thành dòng chữ
- **WHEN** một vùng sáng quá nhỏ hoặc có điểm trung bình dưới 0,5
- **THEN** vùng đó không được coi là dòng chữ

#### Scenario: Nhận dạng một dòng
- **WHEN** một hộp chữ được cắt và đưa vào recognizer
- **THEN** văn bản được giải mã tham lam từ token bắt đầu đến token kết thúc hoặc đến giới hạn độ dài chuỗi

### Requirement: Xoay thẳng dòng chữ nghiêng
Hệ thống SHALL ước lượng góc nghiêng của dòng chữ từ các vùng chữ dài trên bản đồ xác suất, lấy trung vị của hướng trục chính. Khi góc có trị tuyệt đối không nhỏ hơn 0,5 độ, hệ thống SHALL xoay ảnh quanh tâm với nền trắng để làm thẳng, dò lại trên ảnh đã xoay và dùng ảnh đó cho mọi bước sau. Cần ít nhất 3 vùng chữ dài để tin vào góc; góc có trị tuyệt đối trên 30 độ được coi là ước lượng sai và trả về 0.

#### Scenario: Bill nghiêng khoảng 5 độ
- **WHEN** các dòng chữ trên bill nghiêng khoảng 5 độ
- **THEN** ảnh được xoay thẳng trước khi nhận dạng
- **AND** toạ độ các hộp chữ tính trên ảnh đã xoay

#### Scenario: Góc nhỏ hơn ngưỡng
- **WHEN** góc nghiêng nhỏ hơn 0,5 độ
- **THEN** ảnh không được xoay và dùng lại kết quả dò lần đầu

#### Scenario: Không đủ vùng chữ dài
- **WHEN** ảnh có ít hơn 3 vùng chữ dài
- **THEN** góc nghiêng được coi là 0

#### Scenario: Góc quá lớn
- **WHEN** góc ước lượng vượt 30 độ
- **THEN** góc bị bỏ và ảnh không được xoay

## REMOVED Requirements

### Requirement: Đọc lại số tiền sau khi quét
**Reason**: Lượt 2 đọc lại vùng số tiền bằng worker Tesseract `eng` riêng (`domain/ocrDigits.ts`, BR-4.19). Commit b5c0d48 gỡ lượt này cùng lúc với việc bỏ Tesseract. Thông điệp commit không nêu lý do riêng cho việc bỏ lượt đọc lại; lý do không xác định được từ lịch sử.

**Migration**: Không có dữ liệu cần chuyển. Ảnh đã có `ocrRawText` từ lượt quét cũ vẫn giữ nguyên và chỉ được quét lại khi người dùng bấm "Quét lại bill (OCR)". Việc sửa lẫn `1` và `4` vẫn có trong đối soát tổng (`validateTotals` và `oneFourVariants` trong `domain/receiptValidation.ts`).

### Requirement: Giữ ảnh xám cho tài liệu điện tử sạch
**Reason**: Commit `2899edd` (2026-11-10) đặt việc giữ thang xám cho mọi ảnh quét vì VietOCR cần ảnh xám, nên không còn phân biệt tài liệu điện tử sạch với ảnh chụp giấy. Requirement này được thêm ở change `2026-10-20-import-pdf-and-table-invoices`.
**Migration**: Hành vi hiện hành nằm ở requirement "Cắt và nắn thẳng tờ hoá đơn khi thêm ảnh chụp" của `receipt-ocr`. Ảnh đã lưu không đổi.
