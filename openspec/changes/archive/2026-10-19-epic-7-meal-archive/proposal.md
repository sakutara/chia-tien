# Proposal

## Why
Sau Epic 1 đến Epic 6, người dùng đã quản lý trọn vẹn một bữa: từ lúc tạo bữa, thêm người và nhóm, nhập kèo, hoá đơn và món (kèm ảnh và OCR), cho tới khi tính toán quyết toán và tick xác nhận từng cá nhân hoặc nhóm đã thanh toán. Khi một bữa đã hoàn tất 100% việc thanh toán, các file ảnh hoá đơn nặng (vài trăm KB đến vài MB mỗi tấm) và các bản ghi chi tiết món không còn cần chỉnh sửa, nhưng vẫn chiếm bộ nhớ trình duyệt (OPFS và IndexedDB).

Epic 7 xây dựng quy trình Lưu trữ bữa (Archive Lifecycle) nhằm giải phóng dung lượng bộ nhớ và đóng băng lịch sử quyết toán của bữa. Mục tiêu của Epic được ghi trong `documentation/04-epics-and-roadmap.md`: cho phép lưu trữ bữa sau khi mọi thanh toán đã hoàn tất, xoá toàn bộ file ảnh và hoá đơn (giữ lại các món) để giải phóng bộ nhớ, giữ chi phí từng kèo, khoá chỉnh sửa bữa đã lưu trữ nhưng vẫn cho phép xoá. Việc lưu trữ do người dùng chủ động bấm nút và xác nhận qua hộp thoại, không tự động chạy ngầm (theo `documentation/epic-7/BR.md` mục A.6).

### Các bên liên quan
| Vai trò | Quan tâm |
| :--- | :--- |
| Chủ app | Chốt sổ những bữa đã thu và trả đủ tiền để không ai vô tình bấm sửa nhầm; giải phóng bộ nhớ ảnh hoá đơn trên điện thoại nhưng vẫn giữ lịch sử tổng tiền từng kèo và ai đã trả bao nhiêu |
| Thành viên trong bữa | Khi xem lại bữa cũ, hoặc qua link Snapshot sau khi lưu trữ, vẫn thấy rõ tổng chi phí từng kèo và kết quả quyết toán cuối cùng |
| Dev Epic 3 đến Epic 6 | Đóng vòng đời kiểm thử bữa `ARCHIVED` thật trên giao diện, vốn trước đó chỉ được giả lập trong DB ở Epic 3 và Epic 4 |
| Dev Epic 8 (Snapshot) | Có sẵn `meal.archivedSummary` và `session.archivedTotalAmount` chuẩn để tạo Snapshot URL cho cả bữa đã lưu trữ |

## What Changes
- **US-7.1 Kiểm tra điều kiện lưu trữ**: thêm hàm thuần `checkArchiveEligibility` và các mã lỗi `ARCHIVE_EMPTY_MEAL`, `ARCHIVE_UNASSIGNED_ITEMS`, `ARCHIVE_UNPAID_ENTITIES`. Chặn lưu trữ nếu bữa chưa có chi phí, còn món chưa gán người ăn, hoặc còn cá nhân hay nhóm có số dư khác 0 chưa tick "Đã thanh toán". Nút lưu trữ bị khoá kèm chú thích nêu rõ tên những người chưa thanh toán.
- **US-7.2 Thực thi lưu trữ**: thêm `getArchivePreview` và `archiveMeal`. Trước khi xoá, đóng gói `archivedTotalAmount` và `archivedPayerSummary` cho từng kèo cùng `Meal.archivedSummary`. Xoá file ảnh trong OPFS và bản ghi `invoice_files`, xoá bản ghi `invoices` của bữa, rồi chuyển bữa sang `ARCHIVED`. Hộp xác nhận `ArchiveMealDialog` nêu rõ hành động không thể hoàn tác và số lượng sẽ bị xoá. Các món (`items`) được giữ lại.
- **US-7.3 Giao diện bữa đã lưu trữ (chỉ đọc)**: khoá và ẩn toàn bộ thao tác chỉnh sửa ở mọi tầng, ẩn nút chia sẻ thanh toán và link Snapshot, hiển thị nhãn "Đã lưu trữ", tóm tắt từng kèo (số hoá đơn đã chốt, người đã ứng, tổng kèo) và bảng quyết toán đã chốt. Mọi service ghi dữ liệu từ chối thao tác trên bữa đã lưu trữ với mã `MEAL_ARCHIVED`.
- **US-7.4 Xoá vĩnh viễn bữa đã lưu trữ**: bữa đã lưu trữ có thể bị xoá hoàn toàn từ màn chi tiết bữa hoặc từ ba chế độ xem danh sách bữa (Lịch, Danh sách, Theo Loại), sau khi xác nhận. Dùng lại `deleteMeal` của Epic 3.
- Không thay đổi schema IndexedDB, không nâng version Dexie, không đổi `types/index.ts` (theo `documentation/epic-7/SA.md` mục B.4).
- Không có mục BREAKING: đây là chức năng mới. Tuy nhiên thao tác xoá hoá đơn và file ảnh là không thể hoàn tác, và không có thao tác bỏ lưu trữ.

## Capabilities

### New Capabilities
- `meal-archive`: Lưu trữ bữa khi đã thanh toán đủ, dọn hoá đơn và ảnh, giữ tóm tắt chi phí và quyết toán, khoá chỉnh sửa và cho phép xoá vĩnh viễn bữa đã lưu trữ.

### Modified Capabilities
- Không có mục nào trong change này. Các yêu cầu được ghi trong delta `specs/meal-archive/spec.md`.

## Impact

### Mã nguồn (theo SA mục B.2, kiểm tra lại với cây thư mục hiện tại)
- Mới: `app/src/domain/archiveRules.ts` và `archiveRules.test.ts`; `app/src/services/archiveService.ts` và `archiveService.test.ts`; `app/src/components/meals/ArchiveMealDialog.tsx`; `app/src/components/meals/ArchiveMealAction.tsx` và `ArchiveMealAction.test.tsx` (thêm ngoài thiết kế SA, xem "Lệch khi triển khai" bên dưới).
- Sửa: `app/src/services/peopleErrors.ts` (thêm ba mã lỗi lưu trữ); `app/src/components/sessions/SessionCard.tsx` và `SessionsPanel.tsx` (tóm tắt kèo đã chốt); `app/src/pages/MealWorkspacePage.tsx` và `MealWorkspacePage.test.tsx` (nút lưu trữ, banner trạng thái, luồng chỉ đọc).
- Không đổi: `app/src/types/index.ts`, `app/src/db/db.ts`.

### Dữ liệu
- Dùng lại các trường đã thiết kế sẵn từ Epic 1: `Meal.status`, `Meal.archivedAt`, `Meal.archivedSummary`, `SessionKeo.archivedTotalAmount`, `SessionKeo.archivedPayerSummary`. Không có migration.
- Sau khi lưu trữ, dung lượng giải phóng phải bằng tổng `sizeBytes` của ảnh thuộc bữa đó (SA mục B.7).

### Thư viện
- Không thêm thư viện mới. Tái sử dụng `deleteFilesByMeal` (Epic 1), `computeMealSettlement` (Epic 6) và `formatBytes` (Epic 4).

### Ngoài phạm vi (theo BR mục A.6)
- Khôi phục hoặc mở khoá lại (Unarchive) bữa đã lưu trữ, vì dữ liệu hoá đơn, món và ảnh đã bị xoá vật lý.
- Tự động lưu trữ ngầm khi người dùng tick xong người cuối cùng. Lưu trữ luôn do người dùng chủ động bấm nút và xác nhận.
- Chia sẻ tin nhắn thanh toán và Custom URL Snapshot, thuộc Epic 8. Dữ liệu `archivedSummary` được thiết kế tương thích để Epic 8 vẫn tạo được Snapshot URL cho bữa đã lưu trữ.

### Rủi ro còn mở (theo SA mục B.8 và phần cuối)
- Thứ tự "xoá file trước, DB sau" theo R-4 có nghĩa là nếu transaction DB lỗi sau khi file đã xoá thì hoá đơn còn lại nhưng ảnh đã mất. Đây là đánh đổi đã chấp nhận, cần cân nhắc thêm bước kiểm tra hoặc khôi phục nếu gặp thực tế.
- Người dùng bấm lưu trữ nhầm khi chưa xem kỹ món lần cuối. Giảm thiểu bằng điều kiện tick đủ 100% và hộp xác nhận với nút Huỷ là mặc định.
- Thành viên đổi tên sau khi lưu trữ không ảnh hưởng bữa đã chốt, vì tên được lưu trực tiếp trong `ArchivedMealSummary`.

### Lệch khi triển khai (theo SA cuối tài liệu và kiểm tra thư mục code)
- `archiveMeal(mealId, now)` trả về `Promise<void>`, không trả về `Meal` như thiết kế ban đầu.
- Có thêm component `ArchiveMealAction` gắn vào `actionsSlot` của Khu vực 3, chứa nút "Lưu trữ bữa" và lý do khoá.
- Lỗi lưu trữ mang `detail.unpaidEntityNames` và `unassignedItemCount` để giao diện hiển thị.
- SA dự kiến file `ArchiveMealDialog.test.tsx`, nhưng code hiện có `ArchiveMealAction.test.tsx` và không có file `ArchiveMealDialog.test.tsx`.

### Chỗ tài liệu chưa thống nhất (ghi nhận để người đọc biết)
- **Món (`items`) có được giữ hay bị xoá khi lưu trữ**: BR-7.3 bước 3 và R-4 bước 3 ghi xoá `items`; SA mục B.4 (I-E7-2) ghi số bản ghi `items` của bữa bằng `0` sau khi lưu trữ. Ngược lại, US-7.2, AC-2 và các bước mô tả trong `documentation/04-epics-and-roadmap.md` ghi các món được giữ lại. Commit `354c5cd` (2026-10-20) có tiêu đề "bỏ thông báo khoá, chỉ xoá hoá đơn và ảnh (giữ món, hiện lại món)", phù hợp với cách giữ món. Spec trong change này theo bản giữ món. Các mục BR-7.3, R-4 và I-E7-2 được giữ nguyên trong change này như tài liệu gốc.
- **Banner trên bữa đã lưu trữ**: BR-7.4 yêu cầu không hiện banner hay dòng thông báo khoá, chỉ có nhãn "Đã lưu trữ". AC-5 lại ghi "hiển thị đúng banner lưu trữ", và SA mục B.3 ghi banner theo UI §4.5. Commit `354c5cd` có ghi "bỏ thông báo khoá". Tài liệu không ghi lý do cụ thể. Spec theo BR-7.4.
- **Tự động xoá**: mục tiêu Epic trong `documentation/04-epics-and-roadmap.md` có cụm "tự động xoá". A.6 loại trừ lưu trữ ngầm, nên spec theo A.6: người dùng chủ động lưu trữ.

## Nguồn lịch sử
- Tài liệu gốc trong `documentation/`: `epic-7/BR.md`, `epic-7/SA.md`, và phần "EPIC 7" cùng dòng 17 và 18 của ma trận truy vết trong `04-epics-and-roadmap.md`.
- `documentation/epic-7` có hai commit trong lịch sử, theo lệnh `git log --format='%ad %h %s' --date=short -- documentation/epic-7`:
  - Commit đầu tiên: 2026-10-19, `d492cfe` (Đổi docs thành documentation, đặt bản build vào docs để GitHub Pages phục vụ từ main /docs).
  - Commit cuối: 2026-10-20, `354c5cd` (Lưu trữ: bỏ thông báo khoá, chỉ xoá hoá đơn và ảnh, giữ món, hiện lại món, ẩn chia sẻ thanh toán cho bữa đã lưu trữ).
- Lịch sử trước khi đổi tên thư mục từ `docs/` sang `documentation/` không nằm trong lệnh trên. Theo `git log --follow` của `BR.md`, commit cũ nhất là `a144fd2` ngày 2026-10-19.
