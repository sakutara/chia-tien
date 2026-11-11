## ADDED Requirements

### Requirement: Điều kiện đủ để lưu trữ bữa
Hệ thống SHALL chỉ cho phép lưu trữ một bữa khi đồng thời thoả mãn: bữa đang ở trạng thái `ACTIVE`, bữa có ít nhất một hoá đơn với `totalMealAmount` lớn hơn `0`, không còn món thuộc hoá đơn `BY_ITEM` chưa gán người ăn, và mọi thực thể thanh toán có `netBalance` khác `0` đều đã được tick `isPaid === true` (BR-7.1, R-1).

#### Scenario: Bữa đã lưu trữ không thể lưu trữ lần hai (R-1)
- **WHEN** `meal.status` đã là `ARCHIVED` và có người gọi `archiveMeal` thêm lần nữa
- **THEN** hệ thống từ chối thao tác và không xoá thêm dữ liệu nào

#### Scenario: Chặn lưu trữ bữa chưa có chi phí (R-1, ARCHIVE_EMPTY_MEAL)
- **WHEN** bữa không có hoá đơn nào hoặc tổng `totalMealAmount` bằng `0`, và có người gọi `archiveMeal`
- **THEN** hệ thống ném lỗi mã `ARCHIVE_EMPTY_MEAL` và không xoá dữ liệu nào

#### Scenario: Chặn lưu trữ khi còn món chưa gán người ăn (R-1, ARCHIVE_UNASSIGNED_ITEMS)
- **WHEN** bữa còn món thuộc hoá đơn `BY_ITEM` mà `unassignedItemCount` lớn hơn `0`
- **THEN** hệ thống ném lỗi mã `ARCHIVE_UNASSIGNED_ITEMS` và không xoá dữ liệu nào

#### Scenario: Chặn lưu trữ khi còn thực thể chưa thanh toán và nêu tên (BR-7.1, R-1, ARCHIVE_UNPAID_ENTITIES)
- **WHEN** có thực thể thanh toán có `netBalance` khác `0` mà `settlementStatuses[entityId]?.isPaid` không phải `true`
- **THEN** hệ thống ném lỗi mã `ARCHIVE_UNPAID_ENTITIES` kèm `detail.unpaidEntityNames` là danh sách tên các thực thể đó, và giao diện hiển thị danh sách này để người dùng biết lý do

#### Scenario: Cho phép lưu trữ khi mọi khoản đã tick đủ (R-1)
- **WHEN** bữa có tổng chi phí lớn hơn `0`, không còn món chưa gán người ăn, và mọi thực thể có `netBalance` khác `0` đều đã được tick `isPaid`
- **THEN** hệ thống cho phép lưu trữ bữa

#### Scenario: Bữa tự cân bằng vẫn được lưu trữ ngay (R-1)
- **WHEN** bữa có hoá đơn với tổng lớn hơn `0`, không còn món chưa gán người ăn, và mọi thực thể đều có `netBalance` bằng `0` ngay từ đầu
- **THEN** bữa được coi là đã thanh toán đủ 100% và được phép lưu trữ ngay mà không cần tick thêm

#### Scenario: Nút Lưu trữ bị khoá kèm chú thích nêu tên người chưa thanh toán (AC-1, BR-7.1)
- **WHEN** bữa chưa đủ điều kiện lưu trữ và người dùng xem khu vực thao tác của bữa
- **THEN** nút "Lưu trữ bữa" không bấm được, và có dòng chú thích gắn qua `aria-describedby` nêu rõ tên các cá nhân hoặc nhóm chưa thanh toán

### Requirement: Hộp xác nhận trước khi lưu trữ
Hệ thống SHALL hiển thị hộp xác nhận `ArchiveMealDialog` trước khi lưu trữ, nêu rõ hành động không thể hoàn tác, số hoá đơn và số file ảnh sẽ bị xoá vĩnh viễn cùng tổng dung lượng được giải phóng, và những thông tin sẽ được giữ lại (BR-7.2).

#### Scenario: Hộp xác nhận nêu số lượng sẽ xoá và nút Huỷ được focus (BR-7.2, AC-4)
- **WHEN** người dùng bấm "Lưu trữ bữa" với bữa đủ điều kiện
- **THEN** hệ thống tải số hoá đơn và số file ảnh từ `getArchivePreview(mealId)`, hiển thị tổng dung lượng bằng `formatBytes`, ghi rõ hành động không thể hoàn tác, nêu các món và chi phí từng kèo được giữ lại, và nút Huỷ được focus mặc định

### Requirement: Đóng gói tóm tắt chi phí và quyết toán trước khi xoá
Hệ thống SHALL, trước khi xoá hoá đơn và ảnh, ghi `archivedTotalAmount` và `archivedPayerSummary` cho từng kèo, đồng thời lập `Meal.archivedSummary` (`ArchivedMealSummary`) từ kết quả quyết toán của bữa (BR-7.3, R-2, R-3).

#### Scenario: Ghi tổng chi phí và người ứng của từng kèo (R-2)
- **WHEN** hệ thống chuẩn bị lưu trữ một bữa có các kèo và hoá đơn
- **THEN** `archivedTotalAmount` của mỗi kèo bằng tổng `totalAmount` của các hoá đơn thuộc kèo đó, bằng `0` nếu kèo không có hoá đơn; `archivedPayerSummary` gom tiền theo `payerMemberId` của từng hoá đơn và chỉ giữ những người có `paidAmount` lớn hơn `0`; kèo rỗng vẫn được giữ trong danh sách với tổng bằng `0`

#### Scenario: Lập bảng tổng kết toàn bữa (R-3)
- **WHEN** hệ thống dựng `Meal.archivedSummary`
- **THEN** `totalMealAmount` lấy từ `MealSettlementResult`; `sessionsSummary` gồm `sessionId`, `sessionName`, `totalAmount` và `invoiceCount` theo thứ tự `orderIndex`; `entitiesSummary` gồm `entityId`, `entityName`, `isGroup`, `memberNames`, `totalPaid`, `totalOwed`, `netBalance` và `isPaid` bằng `true`; `transfers` theo chế độ quyết toán đang chọn tại thời điểm lưu trữ, mỗi phần tử gồm `fromEntityName`, `toEntityName` và `amount`

### Requirement: Thực thi lưu trữ theo thứ tự an toàn
Hệ thống SHALL thực thi lưu trữ theo đúng thứ tự: xoá file ảnh hoá đơn trong OPFS và các bản ghi `invoice_files` của bữa trước, sau đó trong một transaction ghi trên `meals`, `sessions`, `invoices`, `items` và `invoice_files` thì xoá các bản ghi `invoices` của bữa, cập nhật các kèo và chuyển bữa sang `ARCHIVED` (BR-7.3, R-4). Các món `items` được giữ lại theo scenario bên dưới.

#### Scenario: Xoá file ảnh trước rồi cập nhật DB trong một transaction (R-4, BR-7.3)
- **WHEN** `archiveMeal(mealId)` chạy và mọi điều kiện đã đạt
- **THEN** hệ thống gọi `deleteFilesByMeal(mealId)` để xoá thư mục `/invoices/<mealId>` trong OPFS và các bản ghi `invoice_files`; rồi trong một transaction `rw` xoá toàn bộ `invoices` của bữa, `bulkPut` các kèo đã gắn `archivedTotalAmount` và `archivedPayerSummary`, và `put` bản ghi bữa với `status` là `ARCHIVED`, `archivedAt` và `updatedAt` là thời điểm lưu trữ, cùng `archivedSummary`

#### Scenario: Giữ lại các món sau khi lưu trữ (AC-2, US-7.2)
- **WHEN** bữa được lưu trữ thành công
- **THEN** các bản ghi `items` của bữa vẫn còn trong IndexedDB và vẫn hiển thị trong giao diện bữa đã lưu trữ, còn số bản ghi `invoices` và `invoice_files` của bữa bằng `0`

#### Scenario: Lỗi trong transaction ghi DB được rollback (R-4)
- **WHEN** một thao tác trong transaction ghi DB gặp lỗi sau khi file ảnh đã bị xoá
- **THEN** mọi thay đổi trong transaction được rollback, bữa vẫn ở trạng thái `ACTIVE` với số tiền trong DB còn nguyên để người dùng có thể lưu trữ lại; file ảnh đã xoá không khôi phục được, đây là đánh đổi đã chấp nhận theo R-4

#### Scenario: Dung lượng được giải phóng đúng bằng tổng ảnh đã xoá (BR-7.3)
- **WHEN** `archiveMeal` hoàn tất
- **THEN** `getTotalStorageBytes()` giảm đúng bằng tổng `sizeBytes` của các ảnh thuộc bữa vừa được lưu trữ

### Requirement: Bữa đã lưu trữ là bất biến một chiều
Hệ thống SHALL coi lưu trữ là thao tác một chiều: mọi service ghi dữ liệu vào bữa đều từ chối thao tác trên bữa có `status` là `ARCHIVED` với mã lỗi `MEAL_ARCHIVED`, và không có thao tác bỏ lưu trữ (R-5).

#### Scenario: Service ghi dữ liệu từ chối bữa đã lưu trữ (R-5)
- **WHEN** gọi `mealService.updateMealInfo`, `mealPeopleService.*`, `sessionService.*`, `invoiceService.*`, `settlementService.*` hoặc `archiveService.archiveMeal` trên bữa có `status` là `ARCHIVED`
- **THEN** hệ thống ném lỗi mã `MEAL_ARCHIVED` và không ghi gì vào bữa đó

#### Scenario: Không có thao tác bỏ lưu trữ (R-5)
- **WHEN** người dùng xem một bữa đã lưu trữ
- **THEN** giao diện không cung cấp thao tác mở khoá hay bỏ lưu trữ, vì hoá đơn và file ảnh đã bị xoá vĩnh viễn

### Requirement: Giao diện bữa đã lưu trữ chỉ đọc
Hệ thống SHALL khoá và ẩn 100% thao tác chỉnh sửa trên bữa đã lưu trữ, chỉ hiển thị nhãn trạng thái "Đã lưu trữ" mà không hiển thị banner hay dòng thông báo khoá, và ẩn nút chia sẻ thông báo thanh toán cùng link Snapshot (BR-7.4, US-7.3).

#### Scenario: Ẩn toàn bộ thao tác chỉnh sửa (AC-2, BR-7.4)
- **WHEN** người dùng mở một bữa có `status` là `ARCHIVED`
- **THEN** thông tin bữa, thành viên, chủ trì, nhóm thanh toán, kèo, hoá đơn, món, chế độ quyết toán và checkbox thanh toán đều không chỉnh sửa được

#### Scenario: Không hiện banner khoá và ẩn chia sẻ (BR-7.4)
- **WHEN** người dùng mở một bữa đã lưu trữ
- **THEN** giao diện không hiện banner hay dòng thông báo khoá hoặc chỉ xem, chỉ có nhãn "Đã lưu trữ", và không có nút chia sẻ thông báo thanh toán hay link Snapshot

### Requirement: Hiển thị kèo và quyết toán đã chốt
Hệ thống SHALL hiển thị cho bữa đã lưu trữ tóm tắt từng kèo và bảng quyết toán đã chốt, đọc từ `meal.archivedSummary` và `session.archivedPayerSummary`, thay cho câu "Chưa có hoá đơn trong kèo này" (R-6, BR-7.4).

#### Scenario: Kèo hiển thị số hoá đơn đã chốt và người đã ứng (R-6, AC-5)
- **WHEN** bữa có `status` là `ARCHIVED` và người dùng xem danh sách kèo
- **THEN** mỗi kèo hiển thị "Đã chốt N hoá đơn" với N là `invoiceCount`, danh sách người đã ứng tiền lấy từ `archivedPayerSummary`, và tổng chi phí của kèo lấy từ `archivedTotalAmount`

#### Scenario: Bảng quyết toán và lịch sử chuyển khoản đã chốt (AC-5, BR-7.4)
- **WHEN** người dùng xem một bữa đã lưu trữ
- **THEN** giao diện hiển thị kết quả quyết toán từ `entitiesSummary` và lịch sử chuyển khoản từ `transfers` ở dạng chỉ đọc

#### Scenario: Bữa đã lưu trữ hiện huy hiệu trên cả ba chế độ xem (AC-6, BR-7.3, BR-7.4)
- **WHEN** người dùng xem danh sách bữa ở chế độ Lịch, Danh sách hoặc Theo Loại sau khi bữa được lưu trữ
- **THEN** bữa có huy hiệu "Đã lưu trữ", giữ nguyên tổng chi phí bữa và tiến độ thanh toán hoàn tất, và ở chế độ Theo Loại bữa xuất hiện trong tab "Đã lưu trữ"

### Requirement: Xoá vĩnh viễn bữa đã lưu trữ
Hệ thống SHALL cho phép xoá vĩnh viễn một bữa có `status` là `ARCHIVED` bất cứ lúc nào, từ màn chi tiết bữa hoặc từ ba chế độ xem danh sách bữa, sau khi người dùng xác nhận trong hộp xác nhận (US-7.4, BR-7.5, R-7).

#### Scenario: Xoá bữa đã lưu trữ từ màn chi tiết hoặc danh sách (BR-7.5, AC-3)
- **WHEN** người dùng bấm Xoá trên một bữa đã lưu trữ và xác nhận trong hộp xác nhận
- **THEN** hệ thống xoá bữa đó bằng `deleteMeal(mealId)`

#### Scenario: Xoá bữa đã lưu trữ không ảnh hưởng danh bạ (R-7)
- **WHEN** `deleteMeal` chạy trên một bữa đã lưu trữ
- **THEN** mọi bản ghi `sessions` của bữa và bản ghi `meals` (kèm `archivedSummary`) bị xoá hoàn toàn khỏi IndexedDB, còn danh bạ `members` toàn cục vẫn giữ nguyên

### Requirement: Khả dụng trên điện thoại và bằng bàn phím
Hệ thống SHALL hoạt động dùng được trên màn hình 375 px, mọi nút chạm có kích thước không nhỏ hơn 44 px, và điều khiển được toàn bộ bằng bàn phím (AC-7, SA B.7).

#### Scenario: Màn bữa đã lưu trữ hiển thị đúng ở 375 px (AC-7)
- **WHEN** người dùng mở màn chi tiết của bữa đã lưu trữ trên màn hình 375 px
- **THEN** nội dung hiển thị đầy đủ, các nút chạm đạt tối thiểu 44 px

#### Scenario: Thao tác lưu trữ và xác nhận bằng bàn phím (AC-7, SA B.7)
- **WHEN** người dùng chỉ dùng bàn phím để mở hộp xác nhận lưu trữ
- **THEN** người dùng điều khiển được toàn bộ hộp xác nhận, và nút Huỷ là nút được focus mặc định

#### Scenario: Hồi quy các test Epic 1 đến Epic 6 vẫn đạt (AC-7)
- **WHEN** chạy toàn bộ bộ test sau khi bổ sung chức năng lưu trữ
- **THEN** toàn bộ test của Epic 1 đến Epic 6 vẫn đạt
