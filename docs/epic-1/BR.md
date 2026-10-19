# Epic 1 — Business Requirements (BR)

**Epic 1**: Khởi tạo Nền tảng, Hệ màu USD Green & Lớp Lưu trữ Local · **Trạng thái**: đã triển khai (code tại `app/`)

Tài liệu đi cùng: [SA](./SA.md) · [Epics & Roadmap](../04-epics-and-roadmap.md)

---

### A.1. Bối cảnh & Mục tiêu nghiệp vụ
Người dùng cần một ứng dụng chia tiền nhóm chạy hoàn toàn trên trình duyệt, không cần server, mang phong cách tờ USD. Epic 1 tạo nền móng để các Epic sau (danh bạ, bữa, kèo, hoá đơn...) chỉ việc dùng lại: giao diện thống nhất, dữ liệu bền vững và nơi lưu file hoá đơn.

### A.2. Các bên liên quan
| Vai trò | Quan tâm |
| :--- | :--- |
| Tôi | Dùng app một mình trên thiết bị của mình; là Người chủ trì mặc định |
| Thành viên nhóm | Chỉ xem snapshot (Epic 8), không dùng DB của Epic 1 |
| Dev / Epic 2–8 | Cần schema ổn định, service lưu file, theme dùng chung |

### A.3. Yêu cầu nghiệp vụ (BR)

| Mã | Yêu cầu | Truy vết |
| :-: | :--- | :--- |
| **BR-1.1** | Ứng dụng hoạt động 100% client-side, không backend, không cần mạng để lưu/tính toán. | US-1.1, 1.2 |
| **BR-1.2** | Giao diện phải mang phong cách tiền USD: xanh lá đậm, nền giấy kem, số tiền thẳng cột. | US-1.1, YC#13 |
| **BR-1.3** | Dữ liệu 3 tầng (Bữa – Kèo – Món) cùng hoá đơn, danh bạ, file và cài đặt phải lưu bền vững; tải lại trang (F5) không mất dữ liệu. | US-1.2, YC#1 |
| **BR-1.4** | Mọi ảnh hoá đơn được lưu thành file thật, xem lại/tải về/xoá được; xoá thì giải phóng dung lượng. | US-1.3, YC#14 |
| **BR-1.5** | Có sẵn hồ sơ "Tôi" làm Người chủ trì mặc định ngay lần mở đầu tiên, không cần người dùng cấu hình. | US-1.4 |
| **BR-1.6** | Khởi tạo dữ liệu mặc định phải an toàn khi chạy nhiều lần (không tạo trùng hồ sơ). | US-1.4 |
| **BR-1.7** | Việc xoá Bữa/Kèo/Hoá đơn (Epic 3, 4, 7) phải xoá được toàn bộ file liên quan; Epic 1 cung cấp năng lực này. | US-1.3, YC#17 |

### A.4. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
| :-: | :--- |
| **R-1** | Bảng màu cố định: `#0A1F16`, `#123123`, `#1B4332`, `#2D6A4F`, `#40916C`, `#D8F3DC` (xanh); `#FAF8F5`, `#F2EFE9`, `#E4DFD5` (giấy); vàng `#CA8A04` (chủ trì/lưu trữ/VAT); đỏ `#DC2626` (số âm, xoá). |
| **R-2** | Mọi cột số tiền dùng font số tabular (`tabular-nums`, mono) để thẳng hàng. |
| **R-3** | Chỉ có đúng **một** hồ sơ chủ app (`isDefaultHost = true`); `settings.defaultHostMemberId` trỏ tới hồ sơ đó. |
| **R-4** | Tên hiển thị gốc được giữ nguyên; `normalizedName` (bỏ dấu, chữ thường, `đ→d`) dùng cho tìm kiếm và sắp xếp A-Z ở Epic 2. |
| **R-5** | Mỗi file hoá đơn luôn có bản Blob trong IndexedDB; OPFS chỉ là bản bổ sung. Lỗi OPFS không được làm hỏng thao tác của người dùng. |
| **R-6** | Xoá file phải xoá cả bản vật lý (OPFS) lẫn bản ghi DB. Xoá theo bữa phải xoá cả thư mục `/invoices/<mealId>`. |
| **R-7** | Tên file được chuẩn hoá (bỏ dấu, `đ→d`, ký tự lạ → `_`) trước khi lưu. |
| **R-8** | "Ứng trước" = một người thanh toán toàn bộ một hoá đơn; những người còn lại bị ghi nợ phần của mình khi kết toán (Epic 5, 6). Epic 1 chỉ cung cấp trường `Invoice.payerMemberId`. |

### A.5. Tiêu chí nghiệm thu (nghiệp vụ)
- [ ] AC-1: Giao diện xanh lá đậm, nền giấy kem, số tiền thẳng cột.
- [ ] AC-2: Tải lại trang (F5), hồ sơ "Tôi" vẫn còn và không bị nhân đôi.
- [ ] AC-3: Thêm file hoá đơn → đọc lại được; xoá → bản ghi và file biến mất, dung lượng giảm.

### A.6. Ngoài phạm vi
Giao diện quản lý bữa, danh bạ, nhập hoá đơn, OCR, quyết toán, snapshot (Epic 2–8). PWA/service worker chưa nằm trong Epic 1.
