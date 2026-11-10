# local-ai-receipt-reading Specification

## Purpose
Tính năng tuỳ chọn đọc và sửa kết quả hoá đơn bằng mô hình ngôn ngữ nhỏ (Qwen2.5-0.5B-Instruct) chạy ngay trong trình duyệt, sau khi OCR đã có văn bản. Người dùng bật hoặc tắt tính năng, xem trạng thái mô hình, và xoá mô hình khi cần lấy lại bộ nhớ. Kết quả của mô hình luôn được đối chiếu bằng phép tính của app trước khi điền vào hoá đơn, và người dùng vẫn sửa được mọi ô. Đây là capability dành cho người dùng tự quản lý hoá đơn trên thiết bị của mình. Việc quét ảnh bằng VietOCR và bộ phân tích hoá đơn thuộc capability `receipt-ocr`.

## Requirements

### Requirement: Bật hoặc tắt AI trên máy theo lựa chọn của người dùng
Hệ thống SHALL cho người dùng bật hoặc tắt công tắc "Xử lý nâng cao bằng AI trên máy" và SHALL ghi nhớ lựa chọn đó trên trình duyệt. Sau khi người dùng đã gạt công tắc, trạng thái hiệu lực luôn theo lựa chọn đó, không còn phụ thuộc vào việc mô hình có sẵn hay không.

#### Scenario: Chưa gạt lần nào và mô hình đã tải sẵn
- **WHEN** người dùng chưa gạt công tắc lần nào và mô hình đã có trong Cache Storage
- **THEN** công tắc hiển thị BẬT

#### Scenario: Chưa gạt lần nào và mô hình chưa tải
- **WHEN** người dùng chưa gạt công tắc lần nào và mô hình chưa có trong Cache Storage
- **THEN** công tắc hiển thị TẮT

#### Scenario: Đã gạt tắt thì không tự bật lại
- **WHEN** người dùng đã gạt công tắc sang TẮT và mô hình đã tải sẵn
- **THEN** công tắc vẫn TẮT

### Requirement: Nhận diện mô hình đã tải qua Cache Storage
Hệ thống SHALL coi mô hình là đã tải khi Cache Storage tên `transformers-cache` có ít nhất một file trọng số của `LOCAL_SLM_MODEL_ID` có đuôi `.onnx` hoặc `.onnx_data`. Dung lượng hiển thị là tổng `content-length` của các file trọng số đó. Các file khác, kể cả file `.onnx` của nguồn khác, không được tính.

#### Scenario: Chỉ tính file trọng số của mô hình
- **GIVEN** Cache Storage có file trọng số của mô hình 300 byte, file tokenizer của mô hình 9 byte và một file `.onnx` của địa chỉ khác 999 byte
- **WHEN** hệ thống kiểm tra cache
- **THEN** mô hình được báo là đã tải với dung lượng 300 byte

#### Scenario: Cache Storage không dùng được
- **WHEN** trình duyệt không có Cache Storage hoặc không mở được cache
- **THEN** mô hình được báo là chưa tải, dung lượng bằng 0, và không có lỗi hiện ra cho người dùng

### Requirement: Hiển thị trạng thái mô hình trên giao diện
Hệ thống SHALL hiển thị nhãn trạng thái cạnh công tắc. Khi mô hình đã tải, nhãn ghi "Đã tải sẵn (Offline)" kèm dung lượng và có nút xoá. Khi chưa tải, nhãn ghi chưa tải và dung lượng dự kiến khoảng 320 MB cho lần đầu.

#### Scenario: Mô hình đã tải hiển thị nhãn offline và nút xoá
- **GIVEN** mô hình đã có trong cache với dung lượng 300 byte
- **WHEN** người dùng mở khung nhập hoá đơn
- **THEN** giao diện hiện "Đã tải sẵn (Offline)" kèm dung lượng và nút "Xoá dữ liệu AI đã tải"

#### Scenario: Mô hình chưa tải hiển thị dung lượng dự kiến
- **WHEN** mô hình chưa có trong cache
- **THEN** giao diện hiện "Chưa tải (~320 MB lần đầu)" và không có nút xoá

### Requirement: Xoá mô hình đã tải và tắt tính năng
Hệ thống SHALL xoá mô hình khỏi Cache Storage khi người dùng xác nhận, SHALL dừng worker đang chạy nếu có, và SHALL đưa công tắc về TẮT. Giao diện SHALL hỏi xác nhận trước khi xoá, và nội dung hỏi nêu rõ khoảng 320 MB sẽ bị xoá và lần sau cần tải lại.

#### Scenario: Xác nhận xoá
- **GIVEN** mô hình đã tải và công tắc đang BẬT
- **WHEN** người dùng bấm xoá và xác nhận trong hộp thoại
- **THEN** mọi file trọng số của mô hình bị xoá khỏi cache
- **AND** nhãn chuyển về "Chưa tải (~320 MB lần đầu)"
- **AND** công tắc chuyển về TẮT

#### Scenario: Huỷ hộp thoại xoá
- **WHEN** người dùng bấm huỷ trong hộp thoại xác nhận xoá
- **THEN** mô hình vẫn còn trong cache và công tắc giữ nguyên

### Requirement: Xoá khoá cấu hình Gemini cũ
Hệ thống SHALL xoá hai khoá `fee-calculator.geminiApiKey` và `fee-calculator.geminiModel` khỏi trình duyệt mỗi khi module dịch vụ AI cục bộ được nạp, để không còn khoá API nào được giữ trên máy. Hệ thống không gọi Gemini và không dùng khoá API của người dùng.

#### Scenario: Khoá Gemini cũ còn trong trình duyệt
- **GIVEN** trình duyệt đang lưu `fee-calculator.geminiApiKey` và `fee-calculator.geminiModel`
- **WHEN** module AI cục bộ được nạp
- **THEN** cả hai khoá bị xoá khỏi localStorage

### Requirement: Xác nhận trước khi tải mô hình trên mạng không phải Wi-Fi
Hệ thống SHALL chỉ tự tải mô hình (khoảng 320 MB) khi đang dùng Wi-Fi hoặc Ethernet. Trên mạng di động, khi chế độ tiết kiệm dữ liệu đang bật, hoặc khi không xác định được loại mạng (ví dụ iOS Safari), hệ thống SHALL hỏi người dùng trước khi tải. Mô hình đã có trong cache thì không bao giờ hỏi.

#### Scenario: Mạng di động, mô hình chưa có, chưa xác nhận
- **GIVEN** mô hình chưa có trong cache và mạng là cellular
- **WHEN** người dùng yêu cầu đọc hoá đơn bằng AI
- **THEN** hệ thống không khởi động worker
- **AND** báo lỗi `AI_MODEL_NOT_CACHED` với thông báo cần xác nhận để tải

#### Scenario: Người dùng đã xác nhận tải
- **GIVEN** mô hình chưa có trong cache và mạng là cellular
- **WHEN** người dùng bấm tiếp tục trong hộp thoại xác nhận và yêu cầu đọc được gửi lại với xác nhận
- **THEN** mô hình được tải và việc đọc tiếp tục

#### Scenario: Wi-Fi thì tải luôn
- **GIVEN** mô hình chưa có trong cache và mạng là wifi
- **WHEN** người dùng yêu cầu đọc hoá đơn bằng AI
- **THEN** mô hình được tải ngay, không hỏi

#### Scenario: Mô hình đã có thì không hỏi
- **GIVEN** mô hình đã có trong cache và mạng là cellular
- **WHEN** người dùng yêu cầu đọc hoá đơn bằng AI
- **THEN** việc đọc bắt đầu ngay, không hỏi

### Requirement: Chọn thiết bị chạy mô hình
Hệ thống SHALL chạy mô hình trên WebGPU với dtype `q4f16` khi trình duyệt có WebGPU, và chạy trên WASM với dtype `q4` khi không có. Mô hình luôn chạy trong Web Worker riêng, không chạy trên luồng giao diện.

#### Scenario: Trình duyệt có WebGPU
- **WHEN** worker nạp mô hình trên trình duyệt có `navigator.gpu`
- **THEN** mô hình được nạp với thiết bị `webgpu` và dtype `q4f16`

#### Scenario: Trình duyệt không có WebGPU
- **WHEN** worker nạp mô hình trên trình duyệt không có `navigator.gpu`
- **THEN** mô hình được nạp với thiết bị `wasm` và dtype `q4`

### Requirement: Hiển thị tiến trình tải mô hình
Hệ thống SHALL hiển thị phần trăm tải mô hình trong khi tải, và SHALL hiển thị các giai đoạn "Đang chuẩn bị bộ đọc AI…", "Đang nhờ AI trên máy đọc hoá đơn…" và "Số liệu chưa khớp, đang nhờ AI đọc lại…" theo đúng tiến trình.

#### Scenario: Tải mô hình lần đầu
- **GIVEN** mô hình chưa có trong cache và người dùng đã cho phép tải
- **WHEN** worker báo tiến trình tải 42%
- **THEN** giao diện hiện "Đang tải bộ đọc AI… 42%"

### Requirement: Đầu vào gửi cho mô hình chỉ là văn bản OCR và gợi ý
Hệ thống SHALL gửi cho mô hình văn bản OCR của hoá đơn, không gửi ảnh. Văn bản OCR bị cắt còn tối đa 3000 ký tự. Nếu có kết quả của bộ phân tích thì kèm các dòng món, tổng bill và số dòng bảng đếm được. Nếu lượt đọc trước chưa khớp, các vấn đề đối soát được kèm theo để mô hình đọc lại. Khi không có gợi ý nào, lời nhắc chỉ còn yêu cầu trả về JSON.

#### Scenario: Văn bản OCR quá dài
- **WHEN** văn bản OCR dài 10 000 ký tự
- **THEN** phần văn bản đưa vào lời nhắc chỉ gồm 3000 ký tự đầu

#### Scenario: Không có gợi ý nào
- **WHEN** văn bản OCR chỉ có khoảng trắng và không có kết quả bộ phân tích
- **THEN** lời nhắc chỉ là yêu cầu trả về đối tượng JSON

### Requirement: Đầu ra của mô hình phải là một đối tượng JSON
Hệ thống SHALL chấp nhận phản hồi của mô hình khi là một đối tượng JSON, có hoặc không có hàng rào mã ```json. Mảng, chuỗi thường hoặc JSON hỏng đều bị coi là lỗi và báo `AI_FAILED` với thông báo "Dữ liệu AI trả về không đọc được. Hãy thử lại."

#### Scenario: Phản hồi có hàng rào mã
- **WHEN** mô hình trả về đối tượng JSON bọc trong hàng rào ```json
- **THEN** đối tượng được đọc bình thường

#### Scenario: Phản hồi không phải JSON
- **WHEN** mô hình trả về câu văn xuôi không có JSON
- **THEN** hệ thống báo lỗi `AI_FAILED`

### Requirement: Chuẩn hoá kết quả AI thành dữ liệu hoá đơn
Hệ thống SHALL chuyển kết quả AI thành dữ liệu hoá đơn theo các quy tắc sau: bỏ món thiếu tên hoặc có thành tiền không dương; số lượng tối thiểu bằng 1; đơn giá mặc định bằng thành tiền chia số lượng; món có số lượng nhân đơn giá khác thành tiền thì được đánh dấu không chắc chắn; giảm giá, phí phục vụ và VAT đều là số tiền cố định dương; VAT bị bỏ qua khi giá đã gồm VAT; ngày phải có dạng `YYYY-MM-DD` mới được nhận.

#### Scenario: Món thiếu tên hoặc thành tiền bằng không
- **WHEN** kết quả AI có một món có tên rỗng và một món có thành tiền 0
- **THEN** cả hai món bị bỏ khỏi bill

#### Scenario: Món có số lượng và đơn giá không khớp thành tiền
- **WHEN** món có số lượng 2, đơn giá 50 000 và thành tiền 90 000
- **THEN** món được giữ với thành tiền 90 000 và được đánh dấu không chắc chắn

#### Scenario: Giá đã gồm VAT
- **WHEN** kết quả AI có `vatIncludedInPrices` là đúng và có `vatAmount` dương
- **THEN** bill được đánh dấu VAT đã gồm trong giá và không có VAT cố định

### Requirement: Đối chiếu kết quả AI với phép tính của app
Hệ thống SHALL đối chiếu kết quả AI theo hai điều kiện: số món phải bằng `itemRowCount` mà AI đã đếm, và tổng tính được (tổng các món trừ giảm giá, cộng phí phục vụ và VAT) phải bằng tổng trên bill. Khi cả hai đều khớp, trạng thái là `OK`. Khi tổng lệch, trạng thái là `MISMATCH`. Khi bill không có tổng để đối chiếu, hoặc không có món nào, trạng thái là `UNVERIFIED`. Mọi kết quả AI đều kèm ghi chú yêu cầu người dùng xem lại các món so với ảnh.

#### Scenario: Tổng khớp và số dòng khớp
- **WHEN** AI trả về một món 50 000, `itemRowCount` là 1 và tổng bill là 50 000
- **THEN** trạng thái đối chiếu là `OK`
- **AND** ghi chú cho biết tổng các món khớp tổng trên bill

#### Scenario: Tổng lệch
- **WHEN** các món cộng lại 50 000 nhưng tổng bill ghi 60 000
- **THEN** trạng thái đối chiếu là `MISMATCH`

#### Scenario: Bill không ghi tổng
- **WHEN** kết quả AI không có tổng bill
- **THEN** trạng thái đối chiếu là `UNVERIFIED` và ghi chú nhắc người dùng tự so với ảnh

### Requirement: Đọc lại tối đa hai vòng và giữ kết quả tốt hơn
Hệ thống SHALL hỏi mô hình tối đa hai vòng cho mỗi lần đọc. Nếu vòng đầu chưa khớp, hệ thống gửi lại các vấn đề đối soát và hỏi đọc lại. Khi hai vòng đều chạy, hệ thống giữ kết quả có ít vấn đề đối soát hơn, và khi số vấn đề bằng nhau thì giữ kết quả của vòng sau.

#### Scenario: Vòng đầu lệch, vòng hai khớp
- **GIVEN** vòng đầu cho tổng lệch và vòng hai cho kết quả khớp
- **WHEN** hệ thống đọc hoá đơn
- **THEN** kết quả trả về là của vòng hai với số vòng đã hỏi là 2

#### Scenario: Vòng đầu đã khớp
- **WHEN** vòng đầu cho kết quả khớp
- **THEN** hệ thống không hỏi lại và số vòng đã hỏi là 1

### Requirement: Điền kết quả AI vào hoá đơn và hỏi trước khi ghi đè
Hệ thống SHALL điền kết quả AI đã chuẩn hoá vào form hoá đơn cùng trạng thái đối chiếu. Khi form đã có dữ liệu người dùng nhập (tên, ngày, dòng món, tổng, giảm giá, phí, VAT), hệ thống SHALL hỏi trước khi ghi đè và chỉ điền khi người dùng đồng ý. Nếu form còn trống, kết quả được điền ngay.

#### Scenario: Form còn trống
- **WHEN** kết quả AI đọc xong và form chưa có dữ liệu người dùng nhập
- **THEN** kết quả được điền ngay vào form

#### Scenario: Form đã có dữ liệu người dùng
- **WHEN** kết quả AI đọc xong và người dùng đã nhập tên hoặc dòng món
- **THEN** kết quả được giữ làm bản chờ điền và người dùng phải xác nhận trước khi ghi đè

### Requirement: Tự đọc lại bằng AI khi OCR chưa chuẩn
Hệ thống SHALL tự đọc lại bằng AI sau khi OCR xong khi kết quả OCR chưa chuẩn và công tắc AI trên máy đang BẬT. Người dùng cũng SHALL có nút "Đọc lại bằng AI trên máy" để chạy thủ công từ văn bản OCR đã có. Nếu chưa có ảnh nào hoặc ảnh chưa có chữ OCR, hệ thống báo người dùng quét ảnh trước và không chạy AI.

#### Scenario: OCR chưa chuẩn và công tắc đang bật
- **GIVEN** công tắc AI trên máy đang BẬT
- **WHEN** OCR xong và bộ phân tích thấy kết quả chưa đủ tin cậy
- **THEN** hệ thống tự đọc lại bằng AI trên máy

#### Scenario: Chưa có chữ OCR
- **WHEN** người dùng bấm đọc lại bằng AI nhưng ảnh chưa có văn bản OCR
- **THEN** hệ thống báo cần quét ảnh trước và không tải mô hình

### Requirement: Huỷ việc đọc bằng AI
Hệ thống SHALL cho phép huỷ việc đọc bằng AI đang chạy. Khi huỷ, hệ thống SHALL báo lỗi `OCR_CANCELLED`, dừng worker ngay, không điền gì vào form và không hiện thông báo lỗi.

#### Scenario: Người dùng huỷ giữa chừng
- **GIVEN** việc đọc bằng AI đang chạy
- **WHEN** người dùng huỷ
- **THEN** worker bị dừng ngay
- **AND** form giữ nguyên, không có thông báo lỗi

### Requirement: Dừng worker sau mỗi lần đọc và khi bộ nhớ bị giải phóng
Hệ thống SHALL tạo worker mới cho mỗi lần đọc và SHALL dừng worker đó khi lần đọc kết thúc, kể cả khi thành công, lỗi hoặc bị huỷ, để trả lại bộ nhớ cho thiết bị. Khi giải phóng bộ nhớ của app, worker cũng bị dừng.

#### Scenario: Lỗi giữa chừng vẫn dừng worker
- **GIVEN** worker báo lỗi bộ nhớ
- **WHEN** lần đọc kết thúc
- **THEN** worker đã được dừng

### Requirement: Báo lỗi đọc bằng AI cho người dùng
Hệ thống SHALL báo lỗi theo mã sau: `AI_OUT_OF_MEMORY` khi trình duyệt hết bộ nhớ, `AI_DOWNLOAD_FAILED` khi tải mô hình thất bại, `AI_FAILED` cho các lỗi còn lại kể cả lỗi chính worker. Khi có lỗi, dữ liệu OCR đã điền vào form vẫn được giữ nguyên.

#### Scenario: Hết bộ nhớ khi sinh kết quả
- **WHEN** worker báo lỗi có mã `AI_OUT_OF_MEMORY`
- **THEN** lỗi được ném với đúng mã đó và form không đổi

#### Scenario: Worker gặp lỗi không xác định
- **WHEN** worker phát sinh sự kiện lỗi
- **THEN** hệ thống báo `AI_FAILED` với thông báo "Không đọc được hoá đơn bằng AI."
</content>
