## ADDED Requirements

### Requirement: Nhập khoá API Gemini và chọn mô hình do người dùng quản lý
Hệ thống SHALL cho người dùng tự nhập khoá Gemini API và tên mô hình trong hộp cài đặt AI (`GeminiSettingsDialog`). Khoá SHALL được lưu trong `localStorage` dưới khoá `fee-calculator.geminiApiKey`, mô hình dưới khoá `fee-calculator.geminiModel`, và mô hình mặc định là `gemini-3.6-flash`. Để trống khoá hoặc mô hình thì cấu hình đó bị xoá. Hộp cài đặt SHALL hướng dẫn lấy khoá miễn phí tại aistudio.google.com/apikey và SHALL cảnh báo rằng ảnh có thể chứa thông tin cá nhân.

#### Scenario: Lưu khoá và mô hình
- **WHEN** người dùng nhập khoá và mô hình rồi lưu
- **THEN** khoá và mô hình được ghi vào `localStorage` dưới hai khoá đã nêu

#### Scenario: Xoá khoá
- **WHEN** người dùng để trống ô khoá API và lưu
- **THEN** khoá `fee-calculator.geminiApiKey` bị xoá khỏi `localStorage`

#### Scenario: Mô hình mặc định
- **WHEN** người dùng chưa chọn mô hình
- **THEN** hệ thống dùng `gemini-3.6-flash`

#### Scenario: Cảnh báo quyền riêng tư trong hộp cài đặt
- **WHEN** người dùng mở hộp cài đặt AI
- **THEN** hộp hiện cảnh báo rằng ảnh có thể chứa thông tin cá nhân

### Requirement: Cấu hình AI chỉ nằm trên trình duyệt này
Cấu hình AI SHALL chỉ tồn tại trên trình duyệt đang dùng. Hệ thống MUST NOT lưu khoá hoặc mô hình vào IndexedDB, và MUST NOT đưa vào Snapshot URL.

#### Scenario: Cấu hình không đi theo dữ liệu bữa ăn
- **WHEN** người dùng xuất hoặc chia sẻ Snapshot URL của bữa ăn
- **THEN** khoá API và tên mô hình không xuất hiện trong URL đó

#### Scenario: Cấu hình không nằm trong IndexedDB
- **WHEN** dữ liệu được ghi vào IndexedDB
- **THEN** khoá API và tên mô hình không có trong các bản ghi đó

### Requirement: Gửi ảnh thẳng tới Google từ trình duyệt
Khi người dùng đọc hoá đơn bằng AI, hệ thống SHALL gửi ảnh và gợi ý OCR thẳng từ trình duyệt tới `generativelanguage.googleapis.com`, kèm header `x-goog-api-key`. Hệ thống MUST NOT có máy chủ trung gian. Đây là chức năng duy nhất của hệ thống gửi dữ liệu ra ngoài thiết bị, và chỉ xảy ra khi người dùng chủ động chọn đọc bằng AI. Hộp gợi ý đọc lại bằng AI SHALL cảnh báo về thông tin cá nhân trong ảnh.

#### Scenario: Gửi yêu cầu khi người dùng chủ động đọc bằng AI
- **WHEN** người dùng bấm "Đọc lại bằng AI" hoặc "Đọc bill bằng AI"
- **THEN** ảnh và gợi ý OCR được gửi tới `generativelanguage.googleapis.com` với header `x-goog-api-key`

#### Scenario: Không gửi khi người dùng không chọn AI
- **WHEN** người dùng chỉ quét bằng OCR offline
- **THEN** không có dữ liệu nào được gửi ra ngoài thiết bị

#### Scenario: Hộp gợi ý có cảnh báo
- **WHEN** hộp gợi ý "Đọc lại bằng AI" hiện ra
- **THEN** hộp có cảnh báo ảnh có thể chứa thông tin cá nhân

### Requirement: Các điểm vào của đọc bằng AI
Hệ thống SHALL cung cấp ba điểm vào cho đọc bằng AI. Thứ nhất, nút "Đọc lại bằng AI" ở hộp gợi ý khi kết quả OCR cần đọc lại. Thứ hai, nút "Đọc bill bằng AI" SHALL hỏi người dùng chụp hay tải ảnh khi chưa có ảnh, và ảnh mới chọn từ luồng này SHALL chỉ đọc bằng AI, không chạy OCR trước. Thứ ba, khi chưa có khoá, hệ thống SHALL mở hộp cài đặt, và sau khi lưu thì tự đọc tiếp (`readAfterSave`).

#### Scenario: Đọc lại sau OCR
- **WHEN** OCR xong và kết quả cần đọc lại
- **THEN** hộp gợi ý hiện nút "Đọc lại bằng AI"

#### Scenario: Đọc bill bằng AI với ảnh mới
- **WHEN** người dùng bấm "Đọc bill bằng AI" và chọn ảnh mới
- **THEN** hệ thống đọc bằng AI trực tiếp và không chạy OCR offline trước

#### Scenario: Chưa có khoá
- **WHEN** người dùng chọn đọc bằng AI nhưng chưa có khoá
- **THEN** hệ thống mở hộp cài đặt
- **AND** sau khi lưu khoá, hệ thống tự đọc tiếp

### Requirement: Chuẩn bị ảnh gửi Gemini
Trước khi gửi, hệ thống SHALL gửi nguyên ảnh nếu ảnh không quá 1,5 MB. Nếu lớn hơn, hệ thống SHALL thu ảnh về cạnh dài 2000 px và mã hoá JPEG chất lượng 0,85. Nếu thu nhỏ lỗi thì hệ thống SHALL gửi nguyên ảnh. Hệ thống SHALL gửi tối đa 6 ảnh (`MAX_AI_IMAGES`), và tất cả phải thuộc cùng một hoá đơn.

#### Scenario: Ảnh nhỏ được gửi nguyên
- **WHEN** ảnh không quá 1,5 MB
- **THEN** ảnh được gửi nguyên bản

#### Scenario: Ảnh lớn được thu nhỏ
- **WHEN** ảnh lớn hơn 1,5 MB
- **THEN** ảnh được thu về cạnh dài 2000 px, JPEG chất lượng 0,85 trước khi gửi

#### Scenario: Thu nhỏ lỗi
- **WHEN** bước thu nhỏ ảnh gặp lỗi
- **THEN** ảnh được gửi nguyên bản

#### Scenario: Quá nhiều ảnh
- **WHEN** hoá đơn có nhiều hơn 6 ảnh
- **THEN** hệ thống chỉ gửi tối đa 6 ảnh của hoá đơn đó

### Requirement: Lời nhắc có gợi ý OCR và kết quả đếm được
Hệ thống SHALL tạo lời nhắc từ văn bản OCR đã cắt tối đa 6000 ký tự, các dòng món bộ phân tích đã đọc cùng tổng, số dòng bảng đếm được, và các vấn đề mà `validateReceipt` đã tìm ra. Các thông tin này SHALL chỉ là gợi ý, và lời nhắc SHALL nêu rõ rằng ảnh mới là nguồn sự thật.

#### Scenario: Văn bản OCR quá dài
- **WHEN** văn bản OCR dài hơn 6000 ký tự
- **THEN** lời nhắc chỉ chứa 6000 ký tự đầu

#### Scenario: Gợi ý mâu thuẫn với ảnh
- **WHEN** các dòng đã đọc khác với ảnh
- **THEN** lời nhắc yêu cầu AI theo ảnh, không theo gợi ý

### Requirement: Gọi Gemini với lược đồ JSON và lời nhắc hệ thống
Hệ thống SHALL gọi `generateContent` với `temperature` bằng 0, `responseMimeType` là `application/json`, `responseSchema` là `AI_RESPONSE_SCHEMA` và system prompt `AI_SYSTEM_PROMPT`. Lời nhắc hệ thống SHALL yêu cầu:
- liệt kê mọi dòng của bảng và khai báo `itemRowCount`;
- số tiền là đồng, dạng số nguyên;
- chiết khấu không phải là món;
- phí phục vụ dạng phụ thu đưa vào `serviceAmount`, còn "Phí dịch vụ" là dòng của bảng như hoá đơn Grab thì giữ là món;
- `vatIncludedInPrices` khi giá đã gồm VAT;
- tự kiểm tổng trước khi trả kết quả;
- bill tách đồ ăn và đồ uống thì trả đúng hai dòng tổng nhóm;
- ngày theo dạng `YYYY-MM-DD`.

#### Scenario: Yêu cầu định dạng JSON
- **WHEN** hệ thống gửi yêu cầu tới Gemini
- **THEN** yêu cầu có `temperature` bằng 0 và `responseMimeType` là `application/json` kèm lược đồ

#### Scenario: Hoá đơn Grab có phí dịch vụ là dòng bảng
- **WHEN** bảng có dòng "Phí dịch vụ" như hoá đơn Grab
- **THEN** dòng đó được giữ là món, không đưa vào `serviceAmount`

#### Scenario: Phí phục vụ là phụ thu
- **WHEN** bill có khoản phí phục vụ là phụ thu
- **THEN** khoản đó được đưa vào `serviceAmount`

#### Scenario: Giá đã gồm VAT
- **WHEN** giá trên bill đã bao gồm VAT
- **THEN** kết quả đặt `vatIncludedInPrices` và không có `vatAmount`

### Requirement: Chuyển kết quả AI thành kết quả bộ phân tích
Hệ thống SHALL chuyển kết quả AI thành cấu trúc `ParsedReceipt` bằng `aiToParsedReceipt`. Dòng thiếu tên hoặc có số tiền không lớn hơn 0 SHALL bị bỏ. Giảm giá, phí và VAT SHALL luôn là `FIXED_AMOUNT`. Nếu `vatIncludedInPrices` là đúng thì hệ thống SHALL bỏ `vatAmount` và đặt `vatIncluded`.

#### Scenario: Dòng thiếu tên
- **WHEN** một dòng AI trả về không có tên
- **THEN** dòng đó bị bỏ khỏi kết quả

#### Scenario: Khoản giảm giá
- **WHEN** AI trả về giảm giá bằng số tiền
- **THEN** giảm giá được lưu là `FIXED_AMOUNT`

#### Scenario: Giá đã gồm VAT
- **WHEN** `vatIncludedInPrices` là đúng
- **THEN** `vatAmount` bị bỏ và kết quả đặt `vatIncluded`

### Requirement: Đối chiếu kết quả AI bằng phép tính của app
Hệ thống SHALL đối chiếu kết quả AI bằng `computeBill` trong `checkAiReceipt`. Số món phải bằng `itemRowCount`, và tổng tính được phải bằng `total`. Nếu không khớp thì hệ thống SHALL tạo danh sách `problems` mô tả các sai lệch.

#### Scenario: Số món khác itemRowCount
- **WHEN** số món đọc được khác `itemRowCount` do AI khai báo
- **THEN** `problems` có một mục nêu số món không khớp

#### Scenario: Tổng không khớp
- **WHEN** tổng tính được không bằng `total` do AI trả về
- **THEN** `problems` có một mục nêu tổng không khớp

#### Scenario: Kết quả khớp
- **WHEN** số món và tổng đều khớp
- **THEN** `problems` rỗng

### Requirement: Đọc lại tối đa một lần khi kết quả AI còn vấn đề
Khi kết quả AI còn vấn đề, hệ thống SHALL gửi lại hội thoại kèm `problems` và yêu cầu trả lại JSON đã sửa, tối đa hai vòng (`MAX_ROUNDS = 2`). Hệ thống SHALL giữ kết quả có ít vấn đề hơn giữa hai vòng.

#### Scenario: Vòng đọc lại cải thiện kết quả
- **WHEN** vòng đầu có vấn đề và vòng đọc lại có ít vấn đề hơn
- **THEN** hệ thống giữ kết quả của vòng đọc lại

#### Scenario: Vòng đọc lại không cải thiện
- **WHEN** vòng đọc lại có nhiều vấn đề hơn hoặc bằng vòng đầu
- **THEN** hệ thống giữ kết quả của vòng đầu

### Requirement: Ghi chú và trạng thái kiểm tra của kết quả AI
Mọi kết quả đọc bằng AI SHALL kèm ghi chú "Đã đọc bằng AI (Gemini). Hãy xem lại các món so với ảnh" và trạng thái kiểm tra `check.status`, nhận một trong các giá trị `OK`, `MISMATCH` hoặc `UNVERIFIED`.

#### Scenario: Kết quả AI luôn có ghi chú
- **WHEN** kết quả AI được điền vào form
- **THEN** form hiện ghi chú "Đã đọc bằng AI (Gemini). Hãy xem lại các món so với ảnh"

#### Scenario: Trạng thái khớp
- **WHEN** kết quả AI khớp phép tính của app
- **THEN** `check.status` là `OK`

### Requirement: Xử lý lỗi khi gọi Gemini
Hệ thống SHALL báo lỗi theo bảng sau:

| Tình huống | Mã hoặc thông báo |
|---|---|
| Không có khoá | `AI_NO_KEY`, mở cài đặt AI |
| HTTP 401 hoặc 403, hoặc thông báo liên quan khoá API | "Gemini từ chối khoá API…" |
| HTTP 429 | "hết hạn mức hoặc đang quá tải…" |
| Mất mạng | "Không kết nối được tới Gemini…" |
| Bị chặn (`blockReason`), rỗng, hoặc JSON hỏng | `AI_FAILED` với thông báo tương ứng |
| Người dùng huỷ | `OCR_CANCELLED`, không báo lỗi |

#### Scenario: Khoá bị từ chối
- **WHEN** Gemini trả về 401 hoặc 403
- **THEN** hệ thống báo "Gemini từ chối khoá API…"

#### Scenario: Vượt hạn mức
- **WHEN** Gemini trả về 429
- **THEN** hệ thống báo "hết hạn mức hoặc đang quá tải…"

#### Scenario: Mất mạng
- **WHEN** yêu cầu tới Gemini không kết nối được
- **THEN** hệ thống báo "Không kết nối được tới Gemini…"

#### Scenario: Phản hồi bị chặn hoặc rỗng
- **WHEN** Gemini trả về `blockReason`, phản hồi rỗng hoặc JSON hỏng
- **THEN** hệ thống báo `AI_FAILED` với thông báo tương ứng

#### Scenario: Người dùng huỷ đọc
- **WHEN** người dùng huỷ khi đang đọc bằng AI
- **THEN** hệ thống dừng và không báo lỗi

### Requirement: Chuyển sang OCR offline khi AI không đọc được
Khi bất kỳ lỗi `AI_FAILED` nào xảy ra, form SHALL tự chuyển sang OCR offline và hiện thông báo lý do, theo mẫu "AI chưa đọc được (…) nên chuyển sang OCR".

#### Scenario: AI lỗi và chuyển sang OCR
- **WHEN** Gemini trả về `AI_FAILED`
- **THEN** form tự chạy OCR offline
- **AND** hiện thông báo "AI chưa đọc được (…) nên chuyển sang OCR"
