# Epic 7 — Business Requirements (BR)

**Epic 7**: Lưu trữ Bữa (Archive), Dọn dẹp Hoá đơn/Món & Khoá Chỉnh sửa · **Trạng thái**: Đã triển khai (còn kiểm thủ công trên trình duyệt trước khi đóng)

Tài liệu đi cùng: [SA](./SA.md) · [Epics & Roadmap](../04-epics-and-roadmap.md) · [Kiến trúc & Data model §3.2–3.6](../01-architecture-and-data-model.md) · [Nghiệp vụ §7.2](../02-business-logic-and-algorithms.md) · [UI §4.2, §4.5](../03-ui-ux-and-design-system.md) · [Epic 6 BR](../epic-6/BR.md)

---

### A.1. Bối cảnh & Mục tiêu nghiệp vụ
Sau Epic 1–6, người dùng đã quản lý trọn vẹn một Bữa từ lúc tạo, thêm người/nhóm, nhập kèo/hoá đơn/món (kèm ảnh và OCR) cho tới khi tính toán quyết toán và tick xác nhận từng cá nhân/nhóm đã thanh toán. Khi một bữa đã hoàn tất 100% việc thanh toán, các file ảnh hoá đơn nặng (vài trăm KB đến vài MB mỗi tấm) và hàng chục bản ghi chi tiết món không còn nhu cầu chỉnh sửa nữa nhưng lại chiếm dụng bộ nhớ trình duyệt (OPFS & IndexedDB).

Epic 7 xây dựng **quy trình Lưu trữ Bữa (`Archive Lifecycle`)** nhằm giải phóng dung lượng bộ nhớ và đóng băng lịch sử quyết toán của bữa:

1. **Kiểm tra điều kiện tiên quyết trước khi lưu trữ (Guard Rule)**: Chỉ cho phép lưu trữ khi **100% các Thực thể thanh toán có phát sinh công nợ ($\text{NetBalance} \neq 0$) đã được tick "Đã thanh toán"**, bữa đã có chi phí và không còn món nào chưa được gán người ăn. Nếu chưa đạt, hiển thị rõ danh sách những ai chưa thanh toán.
2. **Thực thi Lưu trữ & Dọn dẹp bộ nhớ**: Đóng gói bản tóm tắt cuối cùng (`ArchivedMealSummary` trên `Meal` và `archivedTotalAmount` / `archivedPayerSummary` trên từng `SessionKeo`), xoá sạch toàn bộ file ảnh hoá đơn (OPFS + `invoice_files`), xoá toàn bộ bản ghi `invoices` và `items` của bữa đó, và chuyển trạng thái bữa sang `ARCHIVED`.
3. **Giao diện Bữa đã lưu trữ (Read-only)**: Khoá 100% thao tác chỉnh sửa ở mọi tầng; hiển thị banner thông báo đã lưu trữ, bảng tóm tắt chi phí từng kèo (kèm số lượng hoá đơn và người ứng trước khi xoá) và bảng lịch sử quyết toán đã chốt.
4. **Xoá vĩnh viễn bữa đã lưu trữ**: Cho phép người dùng xoá hẳn bữa đã lưu trữ khỏi hệ thống bất cứ lúc nào.

### A.2. Các bên liên quan
| Vai trò | Quan tâm |
| :--- | :--- |
| Tôi (chủ app) | Chốt sổ những bữa đã thu/trả đủ tiền để không ai vô tình bấm sửa nhầm; giải phóng bộ nhớ ảnh hoá đơn trên điện thoại nhưng vẫn giữ được lịch sử tổng tiền từng kèo và ai đã trả bao nhiêu |
| Thành viên trong bữa | Khi xem lại bữa cũ (hoặc qua link Snapshot sau khi lưu trữ) vẫn thấy rõ tổng chi phí từng kèo và kết quả quyết toán cuối cùng |
| Dev Epic 3–6 | Đóng vòng đời kiểm thử bữa `ARCHIVED` thật trên giao diện (vốn mới chỉ được giả lập trong DB ở Epic 3 và Epic 4) |
| Dev Epic 8 (Snapshot) | Có sẵn `meal.archivedSummary` và `session.archivedTotalAmount` chuẩn để tạo Snapshot URL cho cả những bữa đã lưu trữ |

### A.3. Yêu cầu nghiệp vụ (BR)

| Mã | Yêu cầu | Truy vết |
| :-: | :--- | :--- |
| **BR-7.1** | Kiểm tra điều kiện Lưu trữ bữa (`canArchiveMeal`): chặn thao tác Lưu trữ nếu bữa chưa có chi phí, còn món ở chế độ `BY_ITEM` chưa gán người ăn, hoặc còn bất kỳ Thực thể thanh toán nào có $\text{NetBalance} \neq 0$ chưa được tick "Đã thanh toán" (`isPaid === true`). Hiển thị rõ tên các cá nhân/nhóm chưa hoàn tất thanh toán để người dùng biết lý do nút Lưu trữ bị khoá. | US-7.1, YC#17, 02 §7.2 |
| **BR-7.2** | Trước khi thực hiện Lưu trữ, hiển thị hộp thoại xác nhận (`ArchiveMealDialog` theo chuẩn USD) nêu rõ hành động này **không thể hoàn tác**, liệt kê số lượng hoá đơn, số món và số file ảnh (kèm tổng dung lượng giải phóng) sẽ bị xoá vĩnh viễn, và những thông tin sẽ được giữ lại. | US-7.2, YC#17, BR-3.12 |
| **BR-7.3** | Thực thi quy trình Lưu trữ (`archiveMeal`):<br>1. Lưu tổng chi phí từng kèo và tóm tắt người ứng vào `SessionKeo.archivedTotalAmount` & `SessionKeo.archivedPayerSummary`, đồng thời lưu bảng tổng kết toàn bữa vào `Meal.archivedSummary`.<br>2. Xoá sạch toàn bộ file ảnh hoá đơn của bữa trong OPFS và bảng `invoice_files`.<br>3. Xoá toàn bộ các bản ghi `items` và `invoices` thuộc bữa đó trong IndexedDB.<br>4. Chuyển `Meal.status = 'ARCHIVED'` và ghi nhận thời điểm `Meal.archivedAt`. | US-7.2, YC#17, 02 §7.2 |
| **BR-7.4** | Giao diện **Bữa đã lưu trữ (`ARCHIVED` Read-only View)**: hiển thị banner thông báo bữa đã lưu trữ và đã dọn dẹp hoá đơn/chi tiết món; khoá và ẩn 100% thao tác chỉnh sửa (thông tin bữa, thành viên, chủ trì, nhóm thanh toán, kèo, hoá đơn, món, chế độ quyết toán, checkbox thanh toán); hiển thị bảng tóm tắt từng Kèo (tên kèo, số hoá đơn từng có, ai đã ứng, tổng tiền kèo) và bảng lịch sử quyết toán đã chốt. | US-7.3, YC#17, UI §4.5 |
| **BR-7.5** | Cho phép **Xoá vĩnh viễn** một bữa đã lưu trữ (`status === 'ARCHIVED'`) ngay từ màn hình chi tiết bữa hoặc từ cả 3 chế độ xem danh sách bữa (Lịch, Danh sách, Loại) kèm hộp xác nhận. | US-7.4, YC#18 |

### A.4. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
| :-: | :--- |
| **R-1** | **Điều kiện đủ để Lưu trữ bữa (`canArchiveMeal`)**: Một bữa chỉ được phép lưu trữ khi thoả đồng thời 4 điều kiện:<br>1. `meal.status === 'ACTIVE'` (chưa lưu trữ).<br>2. Bữa có ít nhất 1 hoá đơn với tổng chi phí bữa `totalMealAmount > 0` (`ARCHIVE_EMPTY_MEAL`).<br>3. Không còn món nào thuộc hoá đơn `BY_ITEM` chưa được gán người ăn (`unassignedItemCount === 0`, nếu vi phạm báo `ARCHIVE_UNASSIGNED_ITEMS`).<br>4. Mọi Thực thể thanh toán $E$ có $\text{NetBalance}(E) \neq 0$ đều đã được tick `settlementStatuses[E.entityId]?.isPaid === true` (`ARCHIVE_UNPAID_ENTITIES`, kèm danh sách tên các thực thể chưa thanh toán).<br>*Trường hợp đặc biệt*: Nếu bữa có hoá đơn (`totalMealAmount > 0`, `unassignedItemCount === 0`) và mọi thực thể đều có $\text{NetBalance}(E) = 0$ (tự cân bằng ngay từ đầu), bữa được coi là đã hoàn tất 100% thanh toán và **được phép lưu trữ ngay**. |
| **R-2** | **Đóng gói dữ liệu Kèo khi lưu trữ (`SessionKeo.archived*`)**: Với mỗi kèo $s$ của bữa trước khi xoá hoá đơn:<br>- `archivedTotalAmount` = tổng `inv.totalAmount` của mọi hoá đơn thuộc kèo $s$ (bằng `0` nếu kèo không có hoá đơn).<br>- `archivedPayerSummary` = danh sách `{ memberId, paidAmount }` gom nhóm theo `inv.payerMemberId` của các hoá đơn trong kèo $s$ (chỉ giữ những người có `paidAmount > 0`). |
| **R-3** | **Đóng gói `Meal.archivedSummary` (`ArchivedMealSummary`)** ([01 §3.6](../01-architecture-and-data-model.md)):<br>- `totalMealAmount`: tổng tiền toàn bữa từ `MealSettlementResult`.<br>- `sessionsSummary`: mảng theo thứ tự `orderIndex` của các kèo, mỗi phần tử gồm `{ sessionId, sessionName, totalAmount, invoiceCount }`.<br>- `entitiesSummary`: mảng từ `MealSettlementResult.entities`, mỗi phần tử gồm `{ entityId, entityName, isGroup, memberNames, totalPaid, totalOwed, netBalance, isPaid: true }`.<br>- `transfers`: mảng từ `MealSettlementResult.transfers` theo chế độ quyết toán đang chọn lúc lưu trữ, mỗi phần tử gồm `{ fromEntityName, toEntityName, amount }`. |
| **R-4** | **Thứ tự xoá file và cập nhật DB an toàn khi Lưu trữ**: Tuân thủ nguyên tắc an toàn giống `deleteMeal` (Epic 3 R-6):<br>1. Đọc và kiểm tra toàn bộ điều kiện `R-1`, dựng sẵn `archivedSummary` và các bản ghi `SessionKeo` đã gắn `archivedTotalAmount` / `archivedPayerSummary`.<br>2. Gọi `deleteFilesByMeal(mealId)` để xoá toàn bộ file ảnh vật lý trong OPFS `/invoices/<mealId>` và các bản ghi trong `invoice_files`.<br>3. Trong **một transaction `rw`** trên `[db.meals, db.sessions, db.invoices, db.items, db.invoice_files]`: kiểm tra lại bữa còn tồn tại và đang `ACTIVE`, xoá toàn bộ `items` và `invoices` theo `mealId`, đảm bảo `invoice_files` của `mealId` trống, `bulkPut` các `sessions` đã cập nhật, và `put` bản ghi `Meal` mới với `status = 'ARCHIVED'`, `archivedAt = nowIso()`, `updatedAt = nowIso()`, `archivedSummary`. |
| **R-5** | **Tính bất biến một chiều của trạng thái `ARCHIVED`**: Lưu trữ là thao tác **một chiều, không có "Bỏ lưu trữ" (Unarchive)** vì chi tiết món và file ảnh hoá đơn đã bị xoá vĩnh viễn. Mọi service ghi dữ liệu vào bữa (`mealService.updateMealInfo`, `mealPeopleService.*`, `sessionService.*`, `invoiceService.*`, `settlementService.*`, và chính `archiveService.archiveMeal`) đều từ chối thao tác trên bữa có `status === 'ARCHIVED'` với mã lỗi `MEAL_ARCHIVED`. |
| **R-6** | **Hiển thị Kèo của bữa đã lưu trữ**: Khi `meal.status === 'ARCHIVED'`, vì bảng `invoices` không còn bản ghi nào của bữa đó, giao diện Kèo **không** hiển thị câu `"Chưa có hoá đơn trong kèo này"`, mà đọc từ `meal.archivedSummary.sessionsSummary` và `session.archivedPayerSummary` để hiển thị số lượng hoá đơn đã chốt (`Đã chốt N hoá đơn`), danh sách người đã ứng tiền trong kèo đó và tổng chi phí của kèo. |
| **R-7** | **Xoá vĩnh viễn bữa đã lưu trữ (`US-7.4`)**: Sử dụng hàm `deleteMeal(mealId)` (đã hỗ trợ cả `ACTIVE` và `ARCHIVED` từ Epic 3). Khi xoá bữa đã lưu trữ, toàn bộ các bản ghi `sessions` còn giữ lại và bản ghi `meals` (chứa `archivedSummary`) bị xoá hoàn toàn khỏi IndexedDB; danh bạ `members` toàn cục không bị ảnh hưởng. |

### A.5. Tiêu chí nghiệm thu (nghiệp vụ)

Ba tiêu chí đầu lấy từ [04 — Epic 7](../04-epics-and-roadmap.md); các tiêu chí sau do BR/SA bổ sung.

- [x] AC-1: Không thể bấm Lưu trữ nếu bữa chưa có chi phí, còn món chưa gán người ăn, hoặc chưa tick đủ 100% các khoản thanh toán (các cá nhân/nhóm có $\text{NetBalance} \neq 0$) trong bữa; giao diện hiển thị rõ những ai chưa thanh toán. *(BR-7.1, R-1)* **Đạt (`archiveRules.test`, `archiveService.test`, `ArchiveMealAction.test`).**
- [x] AC-2: Sau khi xác nhận Lưu trữ, bữa chuyển sang trạng thái `ARCHIVED` và hoàn toàn không thể chỉnh sửa được nữa ở bất kỳ khu vực nào; toàn bộ file ảnh hoá đơn (`invoice_files` / OPFS), bản ghi hoá đơn (`invoices`) và chi tiết món (`items`) của bữa bị xoá sạch khỏi bộ nhớ, chỉ còn lại thông tin chi phí từng kèo và lịch sử quyết toán trong `archivedSummary`. *(BR-7.3, BR-7.4, R-2…R-5)* **Đạt (`archiveService.test`: xoá invoices, items, invoice_files; sessions giữ tổng; meal ARCHIVED).**
- [x] AC-3: Bữa đã lưu trữ vẫn có thể bị xoá hoàn toàn khi người dùng bấm Xoá (từ màn chi tiết bữa hoặc từ 3 chế độ xem danh sách bữa). *(BR-7.5, R-7)* **Đạt (`archiveService.test`: `deleteMeal` cho bữa đã lưu trữ).**
- [x] AC-4: Hộp thoại xác nhận Lưu trữ (`ArchiveMealDialog`) hiển thị đúng số lượng hoá đơn, số món, số file ảnh và dung lượng bộ nhớ sẽ được giải phóng; nút Huỷ được focus mặc định. *(BR-7.2)* **Đạt một phần (`ArchiveMealAction.test`: Huỷ được focus, số hoá đơn/món/file); dung lượng hiển thị chưa có test.**
- [x] AC-5: Màn hình chi tiết của bữa `ARCHIVED` hiển thị đúng banner lưu trữ, tổng chi phí từng kèo kèm số hoá đơn từng có và người đã ứng, cùng bảng kết quả quyết toán và lịch sử chuyển khoản đã chốt. *(BR-7.4, R-6)* **Đạt một phần: tóm tắt đã chốt trong `SessionCard` và banner đã triển khai; chưa có test component riêng.**
- [ ] AC-6: Trên cả 3 chế độ xem bữa (Lịch, Danh sách, Loại — Epic 3), bữa vừa lưu trữ hiển thị huy hiệu `Đã lưu trữ`, giữ nguyên tổng chi phí bữa và tiến độ thanh toán hoàn tất, và chuyển sang tab "Đã lưu trữ" ở chế độ xem Theo Loại. *(BR-7.3, BR-7.4)* ****Chưa thực hiện.** Kiểm 3 chế độ xem danh sách bữa sau lưu trữ chưa làm.**
- [ ] AC-7: Dùng tốt trên màn hình $\le 375\text{ px}$, mọi nút chạm $\ge 44\text{ px}$, điều khiển được bằng bàn phím; toàn bộ test Epic 1–6 vẫn đạt. *(phi chức năng & hồi quy)* ****Chưa thực hiện.** Kiểm 375 px trên trình duyệt chưa làm; hồi quy: toàn bộ test đạt.**

### A.6. Ngoài phạm vi
- Khôi phục / Mở khoá lại (Unarchive) bữa đã lưu trữ (do dữ liệu hoá đơn, món và ảnh đã bị xoá vật lý để tối ưu dung lượng theo đúng yêu cầu cốt lõi YC#17).
- Tự động lưu trữ ngầm khi người dùng vừa tick xong người cuối cùng (việc lưu trữ xoá dữ liệu gốc nên luôn phải do người dùng chủ động bấm nút "Lưu trữ bữa" và xác nhận qua hộp thoại).
- Chia sẻ tin nhắn thanh toán và Custom URL Snapshot (thuộc **Epic 8** — tuy nhiên dữ liệu `archivedSummary` của Epic 7 được thiết kế tương thích hoàn toàn để Epic 8 vẫn tạo được Snapshot URL cho bữa đã lưu trữ).
