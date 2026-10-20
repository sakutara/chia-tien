# Epic 9 — Business Requirements (BR)

**Epic 9**: Song ngữ Việt – Anh (i18n) cho toàn bộ ứng dụng & Snapshot · **Trạng thái**: Chưa triển khai (đang ở giai đoạn đặc tả)

Tài liệu đi cùng: [SA](./SA.md) · [Epics & Roadmap](../04-epics-and-roadmap.md) · [UI §4](../03-ui-ux-and-design-system.md) · [Epic 8 BR](../epic-8/BR.md)

---

### A.1. Bối cảnh & Mục tiêu nghiệp vụ
Toàn bộ ứng dụng hiện chỉ có tiếng Việt (văn bản giao diện, tin nhắn chia sẻ, định dạng tiền `1.620.000 ₫`, tên ứng dụng "Chia tiền"). Người dùng và người nhận Snapshot không đọc được tiếng Việt chưa thể dùng ứng dụng. Epic 9 bổ sung **tiếng Anh (`en`)** bên cạnh **tiếng Việt (`vi`)**, chuyển qua lại bằng một **công tắc (switch) ngôn ngữ**, và áp dụng nhất quán cho mọi nơi hiển thị — kể cả tên ứng dụng và trang xem Snapshot.

### A.2. Các bên liên quan
| Vai trò | Quan tâm |
| :--- | :--- |
| Người chủ trì (chủ app) | Dùng app và gửi tin nhắn thanh toán bằng ngôn ngữ mình chọn. |
| Người nhận Snapshot | Mở link và đọc được bằng ngôn ngữ của mình, đổi được ngay trên trang Snapshot mà không cần cài hay đăng nhập. |

### A.3. Yêu cầu nghiệp vụ (BR)

| Mã | Yêu cầu |
| :-: | :--- |
| **BR-9.1** | Ứng dụng hỗ trợ đúng 2 ngôn ngữ: `vi` (Tiếng Việt) và `en` (English). Có **một công tắc ngôn ngữ** trên thanh đầu trang của ứng dụng chính, đổi tức thì (không tải lại trang, không mất dữ liệu đang nhập). |
| **BR-9.2** | **Mọi** chuỗi hiển thị cho người dùng đều theo ngôn ngữ đã chọn: nhãn, nút, tiêu đề, placeholder, `aria-label`, thông báo lỗi/xác nhận, trạng thái rỗng, tên các bước/chế độ xem, `<title>` của trang và `lang` của thẻ `<html>`. Không còn chuỗi cứng nằm lẫn trong component. |
| **BR-9.3** | **Tên ứng dụng** đổi theo ngôn ngữ: `vi` = "Chia tiền", `en` = "Split Bill" (tên cuối cùng do chủ sản phẩm chốt, xem A.6). Áp dụng ở thanh đầu trang, `<title>`, manifest/PWA và tin nhắn chia sẻ. |
| **BR-9.4** | Ngôn ngữ mặc định lần đầu mở app: theo `navigator.language` (bắt đầu bằng `vi` → `vi`, còn lại → `en`). Lựa chọn của người dùng được ghi nhớ (bảng `settings`) và ưu tiên hơn mặc định ở những lần mở sau. |
| **BR-9.5** | **Định dạng theo ngôn ngữ**: ngày/tháng/thứ, thứ tự sắp xếp tên (A–Z chuẩn locale), dấu phân cách số. Đơn vị tiền vẫn là VNĐ (`₫`) ở cả hai ngôn ngữ; chỉ đổi dấu phân cách nghìn (`vi`: `1.620.000 ₫`, `en`: `1,620,000 ₫`). **Không** quy đổi sang ngoại tệ. |
| **BR-9.6** | **Tin nhắn thanh toán** (Epic 8 BR-8.5) được sinh theo ngôn ngữ đang chọn khi chia sẻ, giữ nguyên cấu trúc dòng: `vi` → `- An: nợ Bình 50.000 ₫`; `en` → `- An: owes Bình ₫50,000` (mẫu cuối cùng ghi ở SA). Hộp thoại Chia sẻ có thể chọn ngôn ngữ của tin nhắn độc lập với ngôn ngữ giao diện (mặc định bằng ngôn ngữ giao diện). |
| **BR-9.7** | **Snapshot theo ngôn ngữ**: trang xem Snapshot (chỉ đọc) có **công tắc ngôn ngữ riêng** và toàn bộ nội dung — chuỗi giao diện, tên các bước, trạng thái thanh toán, bảng quyết toán, giải trình, định dạng ngày/tiền — hiển thị theo ngôn ngữ đang chọn. Đổi ngôn ngữ ở Snapshot chỉ ảnh hưởng người đang xem, không sửa link, không ghi IndexedDB. |
| **BR-9.8** | **Ngôn ngữ khởi tạo của Snapshot**: link Snapshot mang theo ngôn ngữ của người gửi (tham số `l=vi|en`) để người nhận mở ra thấy đúng ngôn ngữ người gửi muốn. Thứ tự ưu tiên khi mở: lựa chọn đã lưu của người nhận (nếu từng chọn) > `l` trong link > `navigator.language`. Link cũ không có `l` vẫn mở bình thường (rơi về 2 mức sau). |
| **BR-9.9** | **Dữ liệu người dùng nhập không bị dịch**: tên bữa, tên người, tên kèo, tên quán, tên món, tên nhóm, ghi chú, nội dung chuyển khoản giữ nguyên như đã nhập. Riêng các giá trị mặc định do hệ thống sinh (hồ sơ "Tôi" / "Me", kèo mặc định "Kèo n" / "Venue n", nhóm không tên) hiển thị theo ngôn ngữ đang chọn thay vì bị đóng cứng theo ngôn ngữ lúc tạo. |

### A.4. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
| :-: | :--- |
| **R-1** | Một nguồn duy nhất cho chuỗi: mọi văn bản giao diện nằm trong từ điển `vi` và `en`; hai từ điển phải có **cùng tập khoá** (kiểm bằng test; thiếu khoá `en` là lỗi build/test). |
| **R-2** | Khi thiếu bản dịch lúc chạy, dùng bản `vi` rồi mới tới tên khoá; không bao giờ hiển thị trống. |
| **R-3** | Công tắc ngôn ngữ hoạt động bằng bàn phím và có nhãn đọc được bằng trình đọc màn hình; vùng chạm $\ge 44\text{ px}$. |
| **R-4** | Đổi ngôn ngữ không làm đổi số liệu: mọi phép tính tiền, chia tiền và quyết toán cho kết quả y hệt ở cả hai ngôn ngữ. |
| **R-5** | Snapshot vẫn giữ tính chỉ đọc và không phụ thuộc server: ngôn ngữ chỉ là tham số hiển thị, không thay đổi dữ liệu bữa trong payload. |
| **R-6** | Thêm tham số `l` vào link không được làm link dài thêm đáng kể (tối đa vài ký tự) và không đổi định dạng nén đã phát hành. |

### A.5. Tiêu chí nghiệm thu (nghiệp vụ)

- [ ] AC-1: Công tắc ngôn ngữ trên ứng dụng chính đổi toàn bộ màn hình (danh sách bữa, chi tiết bữa, kèo, hoá đơn, món, quyết toán, hộp thoại, thông báo lỗi) giữa `vi` và `en` ngay lập tức, không còn chuỗi tiếng Việt sót lại khi chọn `en` và ngược lại. *(BR-9.1, BR-9.2)*
- [ ] AC-2: Tên ứng dụng đổi theo ngôn ngữ ở thanh đầu trang và `<title>`. *(BR-9.3)*
- [ ] AC-3: Tải lại trang giữ nguyên ngôn ngữ đã chọn; lần mở đầu tiên theo ngôn ngữ trình duyệt. *(BR-9.4)*
- [ ] AC-4: Ngày và dấu phân cách số theo đúng ngôn ngữ; số tiền không đổi giá trị. *(BR-9.5, R-4)*
- [ ] AC-5: Tin nhắn thanh toán sinh đúng ngôn ngữ đã chọn, đúng cấu trúc dòng, link Snapshot đi kèm. *(BR-9.6)*
- [ ] AC-6: Trang Snapshot có công tắc ngôn ngữ; đổi ngôn ngữ làm toàn bộ nội dung (kể cả quyết toán, giải trình) đổi theo mà không ghi gì vào IndexedDB. *(BR-9.7, R-5)*
- [ ] AC-7: Link Snapshot mới mở ra đúng ngôn ngữ người gửi; link cũ (không có `l`) vẫn mở được. *(BR-9.8)*
- [ ] AC-8: Tên bữa, tên người, tên món… không bị dịch; "Tôi"/"Me" và tên kèo mặc định đổi theo ngôn ngữ. *(BR-9.9)*
- [ ] AC-9: Test kiểm hai từ điển cùng tập khoá; toàn bộ test Epic 1–8 vẫn đạt; dùng tốt ở $\le 375\text{ px}$ không cuộn ngang với cả hai ngôn ngữ (chuỗi tiếng Anh dài hơn không vỡ bố cục). *(R-1, R-3)*

### A.6. Ngoài phạm vi / câu hỏi mở
- Chỉ 2 ngôn ngữ; kiến trúc để mở rộng ngôn ngữ thứ ba về sau nhưng chưa làm.
- Không dịch tự động dữ liệu người dùng nhập, không dịch nội dung OCR hoá đơn.
- Không quy đổi tiền tệ; không đổi định dạng tài khoản/VietQR.
- **Cần chủ sản phẩm chốt**: tên ứng dụng tiếng Anh (đề xuất "Split Bill"); mẫu câu tin nhắn tiếng Anh (đề xuất ở SA B.5); có cần ghi đè ngôn ngữ riêng cho tin nhắn chia sẻ hay luôn theo ngôn ngữ giao diện.
- Văn bản OCR (`tesseract` `vie`+`eng`) giữ nguyên cấu hình, không phụ thuộc ngôn ngữ giao diện.
