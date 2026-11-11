## REMOVED Requirements

### Requirement: Nhập khoá API Gemini và chọn mô hình do người dùng quản lý
**Reason**: Chủ dự án thay đường đọc AI Gemini bằng mô hình chạy ngay trên máy, không cần khoá API (commit `f5c3381`, 2026-11-08, "Xoá Gemini và chuẩn bị interface cho Local AI"). Commit không ghi lý do cụ thể; không xác định được từ lịch sử.
**Migration**: Hai khoá `fee-calculator.geminiApiKey` và `fee-calculator.geminiModel` trong localStorage bị xoá khi `services/localAiService.ts` được nạp, nên không còn khoá API nào được giữ trên trình duyệt. Không có dữ liệu nào được chuyển sang cấu hình mới. Người dùng dùng tính năng thay thế bằng công tắc "Xử lý nâng cao bằng AI trên máy", xem requirement "Bật hoặc tắt AI trên máy theo lựa chọn của người dùng" trong `local-ai-receipt-reading`.

### Requirement: Gửi ảnh thẳng tới Google từ trình duyệt
**Reason**: Đường đọc Gemini gửi ảnh hoá đơn ra khỏi thiết bị tới `generativelanguage.googleapis.com`. Bản thay thế chỉ gửi văn bản OCR và chạy trên máy (commit `f5c3381` và `c122aef`). Lý do cụ thể không được ghi trong commit; không xác định được từ lịch sử. Cảnh báo rằng ảnh có thể chứa thông tin cá nhân và sẽ được gửi tới Google chỉ còn có ý nghĩa với đường đọc Gemini, nên bị xoá cùng đường đọc đó. Lý do cụ thể không được ghi trong commit; không xác định được từ lịch sử.
**Migration**: Ảnh hoá đơn không còn rời thiết bị. Văn bản OCR đã lưu trong `invoice_files.ocrRawText` được dùng lại làm đầu vào cho mô hình trên máy. Không có dữ liệu nào cần chuyển đổi. Không còn dữ liệu nào rời thiết bị khi đọc hoá đơn bằng AI. Gợi ý trong form ghi rõ ảnh và chữ OCR không rời máy (`components/invoices/InvoiceFormDialog.tsx`). Phần này không có requirement riêng trong `local-ai-receipt-reading`.

### Requirement: Chuẩn bị ảnh gửi Gemini
**Reason**: Không còn ảnh nào được gửi cho mô hình, nên bước thu nhỏ ảnh (cạnh dài 2000 px, JPEG chất lượng 0,85, ngưỡng gửi nguyên bản 1,5 MB, tối đa 6 ảnh cho một hoá đơn) bị bỏ. Lý do cụ thể không được ghi trong commit; không xác định được từ lịch sử.
**Migration**: Ảnh đã lưu trong `invoice_files` không đổi. Việc quét ảnh bằng VietOCR và tiền xử lý ảnh thuộc capability `receipt-ocr`, không bị ảnh hưởng.

### Requirement: Gọi Gemini với lược đồ JSON và lời nhắc hệ thống
**Reason**: Lời nhắc có ảnh, lược đồ `responseSchema` và cấu hình `temperature 0` với `responseMimeType` của Gemini được thay bằng lời nhắc chỉ có văn bản dành cho mô hình trên máy (`LOCAL_SLM_SYSTEM_PROMPT`, `buildLocalSlmPrompt`). Lý do cụ thể không được ghi trong commit; không xác định được từ lịch sử.
**Migration**: Hằng số `AI_RESPONSE_SCHEMA` vẫn còn trong `domain/aiReceipt.ts` và được `domain/aiReceipt.test.ts` kiểm tra, nhưng không được gửi cho mô hình nào. Đây là phần còn sót, xem `design.md`. Dữ liệu không cần chuyển đổi.

### Requirement: Đối chiếu kết quả AI bằng phép tính của app
**Reason**: Vòng đối chiếu và đọc lại một lần của Gemini (tối đa hai vòng, giữ kết quả có ít vấn đề hơn) được chuyển sang đường đọc trên máy với cùng quy tắc. Commit `c122aef` và `b5c0d48` không ghi lý do thay đổi; không xác định được từ lịch sử.
**Migration**: Quy tắc đối chiếu nay nằm ở requirement "Đối chiếu kết quả AI với phép tính của app" và "Đọc lại tối đa hai vòng và giữ kết quả tốt hơn" trong `local-ai-receipt-reading`. Hoá đơn đã lưu không thay đổi.

### Requirement: Các điểm vào của đọc bằng AI
**Reason**: Các điểm vào "Đọc bill bằng AI", "Cài đặt AI (khoá Gemini)", hộp thoại cài khoá và luồng tự đọc sau khi lưu khoá bị xoá khỏi form hoá đơn (commit `f5c3381`). Lý do cụ thể không được ghi trong commit; không xác định được từ lịch sử.
**Migration**: Người dùng đọc lại bằng nút "Đọc lại bằng AI trên máy" hoặc để app tự đọc khi OCR chưa chuẩn và công tắc đang bật. Xem requirement "Tự đọc lại bằng AI khi OCR chưa chuẩn" trong `local-ai-receipt-reading`.

### Requirement: Xử lý lỗi khi gọi Gemini
**Reason**: Các mã lỗi và thông báo của Gemini (`AI_NO_KEY` khi chưa có khoá, lỗi 401 và 403 khi khoá bị từ chối, lỗi 429 khi hết hạn mức, lỗi mất mạng, nội dung bị chặn, JSON hỏng) không còn áp dụng. Commit `f5c3381` bỏ `AI_NO_KEY` và thêm `AI_MODEL_NOT_CACHED`, `AI_DOWNLOAD_FAILED`, `AI_OUT_OF_MEMORY`. Lý do cụ thể không được ghi trong commit; không xác định được từ lịch sử.
**Migration**: Mã lỗi hiện hành nằm ở requirement "Báo lỗi đọc bằng AI cho người dùng" và "Xác nhận trước khi tải mô hình trên mạng không phải Wi-Fi" trong `local-ai-receipt-reading`. Khi lỗi, dữ liệu OCR đã điền vào form được giữ nguyên, và form không chuyển sang đường đọc nào khác. Hành vi cũ khi Gemini lỗi là chuyển sang OCR offline; hành vi này không còn.

### Requirement: Cấu hình AI chỉ nằm trên trình duyệt này
**Reason**: Bị gỡ cùng với requirement "Nhập khoá API Gemini và chọn mô hình do người dùng quản lý" trong change này (commit `f5c3381`, 2026-11-08). Lý do cụ thể không được ghi trong commit; không xác định được từ lịch sử.
**Migration**: Không còn cấu hình khoá hay mô hình nào để lưu. Lựa chọn bật tắt AI trên máy được lưu trong `localStorage` của trình duyệt, xem `local-ai-receipt-reading`.

### Requirement: Lời nhắc có gợi ý OCR và kết quả đếm được
**Reason**: Bị gỡ cùng với requirement "Gọi Gemini với lược đồ JSON và lời nhắc hệ thống" trong change này (commit `f5c3381`, 2026-11-08). Lý do cụ thể không được ghi trong commit; không xác định được từ lịch sử.
**Migration**: Gợi ý từ văn bản OCR và kết quả bộ phân tích vẫn được gửi cho mô hình trên máy, xem requirement "Đầu vào gửi cho mô hình chỉ là văn bản OCR và gợi ý" trong `local-ai-receipt-reading`.

### Requirement: Đọc lại tối đa một lần khi kết quả AI còn vấn đề
**Reason**: Bị gỡ cùng với requirement "Đối chiếu kết quả AI bằng phép tính của app" trong change này (commit `f5c3381`, 2026-11-08). Lý do cụ thể không được ghi trong commit; không xác định được từ lịch sử.
**Migration**: Quy tắc tương ứng nay là requirement "Đọc lại tối đa hai vòng và giữ kết quả tốt hơn" trong `local-ai-receipt-reading`.

### Requirement: Ghi chú và trạng thái kiểm tra của kết quả AI
**Reason**: Bị gỡ cùng với requirement "Đối chiếu kết quả AI bằng phép tính của app" trong change này (commit `f5c3381`, 2026-11-08). Lý do cụ thể không được ghi trong commit; không xác định được từ lịch sử.
**Migration**: Trạng thái `OK`, `MISMATCH`, `UNVERIFIED` và ghi chú nay thuộc requirement "Đối chiếu kết quả AI với phép tính của app" trong `local-ai-receipt-reading`.

### Requirement: Chuyển kết quả AI thành kết quả bộ phân tích
**Reason**: Bị gỡ cùng với requirement "Đối chiếu kết quả AI bằng phép tính của app" trong change này (commit `f5c3381`, 2026-11-08). Lý do cụ thể không được ghi trong commit; không xác định được từ lịch sử.
**Migration**: Quy tắc tương ứng nay là requirement "Chuẩn hoá kết quả AI thành dữ liệu hoá đơn" trong `local-ai-receipt-reading`.

### Requirement: Chuyển sang OCR offline khi AI không đọc được
**Reason**: Bị gỡ cùng với requirement "Xử lý lỗi khi gọi Gemini" trong change này (commit `f5c3381`, 2026-11-08). Lý do cụ thể không được ghi trong commit; không xác định được từ lịch sử.
**Migration**: OCR nay luôn chạy trước và AI trên máy chỉ đọc lại từ văn bản OCR, nên không còn bước chuyển ngược về OCR. Khi AI lỗi, dữ liệu OCR đã điền vào form được giữ nguyên.
