## MODIFIED Requirements

### Requirement: Nhận dạng chữ bằng VietOCR chạy ngoại tuyến
Hệ thống SHALL nhận dạng chữ bằng VietOCR dạng ONNX, gồm một detector DB (`det.onnx`) và một recognizer vgg_seq2seq (encoder và decoder), chạy trong Web Worker với WASM một luồng. Model nằm trong thư mục public của ứng dụng và chỉ được tải về trình duyệt sau khi người dùng đồng ý theo requirement "Hỏi trước khi tải bộ đọc chữ lần đầu". Sau khi model đã nạp thành công, quá trình quét MUST NOT gọi mạng. Khi không có văn bản nào được nhận dạng, kết quả là danh sách rỗng.

#### Scenario: Quét khi không có mạng
- **WHEN** model đã nạp thành công trước đó và người dùng quét hoá đơn lúc thiết bị không có kết nối mạng
- **THEN** nhận dạng vẫn hoàn tất và trả về văn bản

#### Scenario: Lần quét đầu tiên khởi tạo bộ đọc chữ
- **WHEN** người dùng quét hoá đơn lần đầu sau khi mở ứng dụng và đã đồng ý tải bộ đọc chữ
- **THEN** tiến trình hiển thị "Đang khởi tạo bộ đọc chữ" trước khi đọc ảnh

## ADDED Requirements

### Requirement: Hỏi trước khi tải bộ đọc chữ lần đầu
Trước lần quét OCR đầu tiên trên thiết bị, khi bộ đọc chữ chưa từng nạp thành công, hệ thống SHALL hỏi người dùng bằng hộp thoại với hai lựa chọn "Tải và quét" và "Để sau" trước khi tải bất kỳ thứ gì. Sau khi model nạp thành công một lần, hệ thống MUST NOT hỏi lại trên thiết bị đó. Chuỗi giao diện MUST có đủ tiếng Việt và tiếng Anh.

#### Scenario: Lần quét đầu tiên trên thiết bị
- **WHEN** người dùng bấm quét hoá đơn và khoá `chia-tien.ocrModelReady` chưa có
- **THEN** hộp thoại hiện ra với khoảng 110 MB, khuyên dùng Wi-Fi, và hai lựa chọn "Tải và quét" và "Để sau" trước khi có bất kỳ yêu cầu tải nào

#### Scenario: Chọn Để sau
- **WHEN** người dùng chọn "Để sau" trong hộp thoại
- **THEN** không có model nào được tải, không có lần quét nào được thực hiện, và form hoá đơn vẫn cho nhập tay

#### Scenario: Chọn Tải và quét
- **WHEN** người dùng chọn "Tải và quét" trong hộp thoại
- **THEN** model được tải, ảnh được quét, và tiến trình hiển thị trong lúc chờ

#### Scenario: Các lần quét sau khi đã nạp thành công
- **WHEN** model đã nạp thành công một lần và người dùng quét lại, kể cả sau khi đóng và mở lại ứng dụng
- **THEN** hộp thoại không hiện lại và quét bắt đầu ngay

#### Scenario: Hộp thoại nêu dung lượng và khuyên Wi-Fi
- **WHEN** hộp thoại hỏi trước khi tải
- **THEN** hộp thoại nêu khoảng 110 MB và khuyên dùng Wi-Fi

#### Scenario: Lời đồng ý trong phiên
- **WHEN** người dùng chọn "Tải và quét" và khoá `chia-tien.ocrModelReady` chưa có
- **THEN** hệ thống ghi lời đồng ý vào sessionStorage khoá `chia-tien.ocrModelConsentSession` (nếu chưa có), và trong cùng tab các lần quét sau không hỏi lại dù model chưa tải xong

#### Scenario: Storage không truy cập được
- **GIVEN** trình duyệt chặn localStorage hoặc sessionStorage (ví dụ chế độ riêng tư)
- **WHEN** người dùng mở hộp thoại hoặc quét
- **THEN** mọi truy cập được bọc try/catch, trạng thái được coi là chưa sẵn sàng, và hộp thoại vẫn hoạt động

### Requirement: Luật đọc hoá đơn theo cấu trúc chung
Bộ phân tích hoá đơn SHALL nhận diện các thành phần theo cấu trúc chung của hoá đơn: dòng món có tên cùng số lượng, đơn giá và thành tiền theo nhiều thứ tự cột; dòng tổng; giảm giá; phí phục vụ; và VAT. Luật đọc MUST NOT phụ thuộc vào tên một quán cụ thể. Khi một thành phần không đủ căn cứ để xác định chắc chắn, hệ thống SHALL bỏ trống trường đó hoặc đánh dấu `uncertain`, và MUST NOT đoán giá trị.

#### Scenario: Hai hoá đơn cùng bố cục khác tên quán
- **WHEN** hai hoá đơn có cùng bố cục món, tổng và VAT nhưng tên quán khác nhau
- **THEN** các món, số tiền và tổng đọc ra giống nhau, không phụ thuộc tên quán

#### Scenario: Thứ tự cột khác nhau
- **WHEN** dòng món ghi thành tiền trước đơn giá hoặc số lượng đứng sau tên món
- **THEN** số lượng, đơn giá và thành tiền được gán theo quan hệ số lượng × đơn giá = thành tiền, không theo vị trí cố định

#### Scenario: Số không đủ căn cứ
- **WHEN** một số có nhiều cách gán hợp lệ và không có căn cứ để chọn
- **THEN** trường tương ứng được bỏ trống hoặc đánh dấu `uncertain`, và giá trị không được đoán
