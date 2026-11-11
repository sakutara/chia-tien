## MODIFIED Requirements

### Requirement: Link Snapshot không mang tham số ngôn ngữ
Hệ thống SHALL dựng link Snapshot dạng `…?s=<mã>` mà không thêm tham số `l`. Người nhận mở link sẽ dùng lựa chọn đã lưu hoặc ngôn ngữ của trình duyệt. Nếu URL vẫn có tham số `l=vi` hoặc `l=en` thì hệ thống SHALL đọc tham số đó theo thứ tự ưu tiên ở Requirement thứ tự xác định ngôn ngữ.

**Trước đây**: link Snapshot mang thêm `&l=vi` hoặc `&l=en` theo ngôn ngữ của người gửi lúc chia sẻ, để người nhận mở đúng ngôn ngữ người gửi muốn (Epic 9, BR-9.6, BR-9.8 và R-6). Tham số `l` được đặt sau `s` để không đổi chuỗi mã hoá. Commit bỏ tham số là `83fec8d`.

#### Scenario: Dựng link chia sẻ
- **WHEN** hệ thống dựng link Snapshot từ một mã `abc` với gốc `https://x.test/`
- **THEN** link kết quả là `https://x.test/?s=abc`, không có tham số `l`

#### Scenario: Mở link có tham số ngôn ngữ
- **WHEN** người nhận mở link có `l=en` và chưa có lựa chọn đã lưu
- **THEN** ứng dụng mở ở tiếng Anh

#### Scenario: Link của người gửi tiếng Anh không đổi ngôn ngữ người nhận
- **WHEN** người gửi đang dùng tiếng Anh khi chia sẻ, và người nhận dùng tiếng Việt với lựa chọn đã lưu là `vi`
- **THEN** link không mang ngôn ngữ của người gửi
- **AND** người nhận mở link ở tiếng Việt theo lựa chọn đã lưu của chính họ
