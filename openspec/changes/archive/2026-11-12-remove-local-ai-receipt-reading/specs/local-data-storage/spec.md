## REMOVED Requirements

### Requirement: Giải phóng bộ nhớ khi tác vụ AI kết thúc
**Reason**: Phạm vi bao tác vụ AI (`withAiMemoryScope`) chỉ do bộ đọc AI trên máy dùng; khi bộ đọc bị gỡ thì không còn nơi gọi. Yêu cầu giải phóng worker OCR khi đóng form và khi app ẩn vẫn giữ nguyên ở requirement "Đăng ký và giải phóng bộ nhớ của worker AI/OCR".
**Migration**: Không cần thay thế. Gọi `releaseAllAiMemory()` khi đóng form và `installMemoryLifecycleHooks()` khi khởi động, như hiện tại.

## ADDED Requirements

### Requirement: Dọn dữ liệu AI trên máy cũ khi khởi động
Hệ thống SHALL xoá một lần khi khởi động cache Cache Storage tên `transformers-cache` và bốn khoá localStorage `fee-calculator.useLocalAi`, `fee-calculator.localAiCached`, `fee-calculator.geminiApiKey` và `fee-calculator.geminiModel`, để giải phóng 480–790 MB mà người dùng đã tải trước đó. Lỗi khi truy cập Cache Storage hoặc localStorage MUST NOT chặn khởi động ứng dụng và MUST NOT được hiện ra cho người dùng.

#### Scenario: Thiết bị còn cache mô hình cũ
- **GIVEN** Cache Storage có cache `transformers-cache` và localStorage có bốn khoá cũ
- **WHEN** ứng dụng khởi động
- **THEN** cache `transformers-cache` bị xoá và bốn khoá cũ bị xoá khỏi localStorage

#### Scenario: Trình duyệt không có Cache Storage
- **GIVEN** trình duyệt không có đối tượng `caches`
- **WHEN** ứng dụng khởi động
- **THEN** việc dọn cache bị bỏ qua, các khoá localStorage vẫn được xoá và ứng dụng khởi động bình thường

#### Scenario: Xoá cache bị từ chối
- **GIVEN** thao tác xoá cache `transformers-cache` bị từ chối
- **WHEN** ứng dụng khởi động
- **THEN** lỗi được nuốt, ứng dụng vẫn khởi động bình thường và không có thông báo lỗi cho người dùng

#### Scenario: localStorage bị chặn
- **GIVEN** trình duyệt chặn truy cập localStorage (ví dụ chế độ riêng tư)
- **WHEN** ứng dụng khởi động
- **THEN** việc xoá khoá bị bỏ qua và ứng dụng khởi động bình thường
