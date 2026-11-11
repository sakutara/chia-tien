## Context

Epic 7 (Lưu trữ Bữa) được thiết kế trong `documentation/epic-7/` với quy tắc: khi lưu trữ, xoá cả hoá đơn, chi tiết món và file ảnh; bữa đã lưu trữ hiện banner khoá và vẫn giữ nút chia sẻ thanh toán ở bước "Chia tiền". Commit `354c5cd` (2026-10-20) đổi các điểm này trong mã nguồn và cập nhật tài liệu tương ứng. Tài liệu trước commit không còn khớp với mã nguồn sau commit. Change này mô tả trạng thái mã nguồn sau commit `354c5cd`.

Bối cảnh kỹ thuật: ứng dụng chạy phía client, dữ liệu nằm trong IndexedDB qua Dexie (bảng `meals`, `sessions`, `invoices`, `items`, `invoice_files`), file ảnh nằm trong OPFS dưới thư mục `/invoices/<mealId>`. Hàm `deleteFilesByMeal` trong `services/fileStorageService.ts` xoá bản ghi `invoice_files` và thư mục OPFS.

## Goals / Non-Goals

**Goals**
- Lưu trữ vẫn giải phóng bộ nhớ của hoá đơn và ảnh, là phần lớn dung lượng.
- Giữ lại các món để người dùng xem lại món của từng kèo sau khi bữa đã lưu trữ.
- Bữa đã lưu trữ không có banner khoá và không có nút chia sẻ thanh toán.

**Non-Goals**
- Không thêm chức năng bỏ lưu trữ.
- Không đổi điều kiện lưu trữ trong `domain/archiveRules.ts`.
- Không đổi schema Dexie và không nâng version.
- Không sửa thứ tự xoá file trước transaction. Đây là rủi ro đã biết, xem mục Risks.

## Decisions

- **Giữ bản ghi `items`**: `archiveMeal` không còn gọi `db.items.where('mealId').equals(mealId).delete()`. Transaction rút gọn còn `[db.meals, db.sessions, db.invoices, db.invoice_files]`. Lý do thay đổi không xác định được từ lịch sử.
- **Món được hiển thị theo kèo**: `useMealSessions` tính trường `keptItems` cho mỗi kèo bằng cách lấy các món có `sessionId` của kèo và có `invoiceId` không còn nằm trong danh sách hoá đơn của bữa. `SessionCard` hiển thị các món này dưới tiêu đề "Món (N)" khi có ít nhất một món. Với bữa còn hoạt động, `keptItems` luôn rỗng vì mọi món đều còn hoá đơn.
- **Xem trước lưu trữ không đếm món**: `ArchivePreview` bỏ trường `itemCount`. Hộp thoại chỉ đếm hoá đơn, file ảnh và dung lượng.
- **Bỏ banner**: `MealInfo` không còn khối thông báo khi `archived`. Trạng thái bữa đã lưu trữ chỉ hiện qua nhãn "Đã lưu trữ" với biểu tượng khoá trên tiêu đề `MealWorkspacePage`.
- **Ẩn chia sẻ**: `MealWorkspacePage` render `ShareMealAction` khi `!archived`. Đây cũng là điểm vào của link Snapshot trong bước "Chia tiền", nên link cũng bị ẩn.
- **Bỏ nhãn "Chỉ xem" trong quyết toán**: `SettlementPanel` không còn biểu tượng khoá có nhãn "Chỉ xem" khi `readOnly`. Các nút tick vẫn bị khoá theo `readOnly` như trước.
- **Ghi chú về phân loại yêu cầu ẩn chia sẻ**: trong `documentation/epic-7/SA.md` trước commit đã có quy định ẩn nút chia sẻ, nhưng code trước commit chưa làm. Commit này làm code khớp SA. `BR-7.4` trước commit không nêu việc ẩn nút chia sẻ, nên yêu cầu này được ghi là ADDED trong delta spec.

## Tương thích dữ liệu

- Bữa được lưu trữ trước commit `354c5cd` đã bị xoá `items` theo logic cũ. Với các bữa này, `keptItems` rỗng và kèo không có mục "Món". Đây là suy luận từ diff của commit, không có dữ liệu kiểm chứng trong repo.
- Với bữa lưu trữ sau commit, các bản ghi `items` có `invoiceId` trỏ tới hoá đơn đã xoá. Mã nguồn hiện không xoá hay sửa các tham chiếu này. Việc nhận diện món được giữ dựa vào việc `invoiceId` không còn trong bảng `invoices` của bữa.
- Không có thay đổi schema hay migration.

## Risks / Trade-offs

- **Thứ tự xoá file trước transaction (chưa sửa)**: `archiveMeal` gọi `deleteFilesByMeal` trước transaction. Hàm này xoá bản ghi `invoice_files` và thư mục OPFS trước khi transaction chạy. Nếu transaction lỗi, file ảnh đã mất nhưng bữa vẫn `ACTIVE` và hoá đơn vẫn còn. Trường hợp này không có scenario trong spec. Spec chỉ có scenario lỗi khi xoá file (bữa vẫn `ACTIVE`) và scenario transaction lỗi (không sửa DB). Hai scenario này không bao phủ việc file đã mất khi transaction lỗi.
- **Dung lượng**: giữ lại `items` làm bữa đã lưu trữ vẫn chiếm một lượng nhỏ dữ liệu văn bản. Đổi lại, người dùng xem được món.
- **Tham chiếu treo**: `items.invoiceId` trỏ tới hoá đơn đã xoá. Mọi chỗ đọc `items` khác ngoài `keptItems` chưa được rà soát trong change này.
- **Nhãn trên 3 chế độ xem**: SA AC-6 yêu cầu nhãn "Đã lưu trữ" trên cả 3 chế độ xem danh sách bữa. Code hiện có biểu tượng khoá trên thẻ bữa (`MealCard`) và tab ARCHIVED trong chế độ xem Loại (`MealStatusView`). Chưa kiểm đủ chế độ Lịch. Xem `tasks.md`.
