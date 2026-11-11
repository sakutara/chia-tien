# Design

## Context

Epic 5 ([BR.md](../../../../documentation/epic-5/BR.md), [SA.md](../../../../documentation/epic-5/SA.md)) đưa danh sách món vào thẻ hoá đơn (`InvoiceCard`) với từng dòng là `InvoiceItemRow`. Thiết kế gốc chỉ có thêm, sửa và xoá món (BR-5.3, R-7, R-8). Không có số thứ tự hiển thị và không có thao tác đổi vị trí món.

Trong code, trường `orderIndex` đã có trên `InvoiceItem` (`app/src/types/index.ts`) từ commit đầu tiên của dự án (`a144fd2`). Hàm `saveItemized` trong `app/src/services/invoiceService.ts` gán `orderIndex` theo vị trí trong mảng khi lưu hoá đơn, và `useMealSessions` sắp món theo `orderIndex`. Vì vậy thứ tự món đã được lưu từ trước, change này chỉ thêm cách đổi nó từ giao diện.

Commit `913bac2` (2026-10-24) thêm số thứ tự và kéo thả. Commit `98fb808` (2026-10-25) thay kéo thả bằng hai nút lên và xuống.

## Goals / Non-Goals

**Goals**
- Người dùng đổi được thứ tự món trong một hoá đơn `ITEMIZED` mà không đổi tiền hay người ăn của món.
- Số thứ tự hiển thị luôn khớp với vị trí món hiện tại.
- Thao tác chạy được trên điện thoại mà không bị giật.
- Bữa đã lưu trữ không đổi thứ tự.

**Non-Goals**
- Không đổi schema Dexie và không thêm trường mới vào `InvoiceItem`.
- Không thêm kéo thả hoặc thư viện kéo thả.
- Không đổi thứ tự của hoá đơn trong kèo hoặc của kèo trong bữa. Các thứ tự đó do `sessionService` và `invoiceService` quản lý riêng.

## Decisions

### Quyết định 1: Thứ tự lưu trong trường `orderIndex` của `InvoiceItem`, liên tục từ 0

`reorderInvoiceItems(invoiceId, orderedIds)` trong `app/src/services/invoiceService.ts` đọc các món hiện có, sắp lại theo `orderedIds`, rồi gọi `saveItemized`. `saveItemized` ghi lại `orderIndex` theo vị trí mảng, bắt đầu từ 0. Id thiếu trong `orderedIds` thì món đó được giữ ở cuối theo thứ tự cũ. Id thừa bị bỏ qua.

Trường `orderIndex` đã tồn tại trên `InvoiceItem` từ commit đầu tiên, nên thay đổi này không cần migration Dexie. Bảng `items` vẫn có index `id,mealId,sessionId,invoiceId` như trong `app/src/db/db.ts` (version 1, không đổi từ commit đầu tiên).

### Quyết định 2: Đổi thứ tự qua `saveItemized`, trong cùng transaction

Đổi thứ tự đi qua cùng đường ghi với các thao tác món khác. Nhờ vậy `consumers` của mỗi món được giữ nguyên và tổng hoá đơn được tính lại đúng, đúng với yêu cầu "việc đổi thứ tự không làm thay đổi tiền hay người ăn" trong spec. Hàm chạy trong `db.transaction('rw', ...)` gồm `meals`, `sessions`, `invoices`, `items`.

### Quyết định 3: Hai nút lên và xuống thay cho kéo thả

Commit `913bac2` làm kéo thả bằng tay nắm `GripVertical` và `dragHandleProps`. Commit `98fb808` bỏ kéo thả. Thông điệp commit ghi lý do: "Bỏ kéo thả vì giật trên điện thoại". Thay vào đó mỗi dòng có hai nút `ChevronUp` và `ChevronDown` nằm dọc bên trái, mỗi nút gọi `onMove(itemId, -1 | 1)`.

Kéo thả không còn trong code hiện tại. Không có thay đổi thư viện nào được ghi vào `package.json` trong hai commit này.

### Quyết định 4: Cập nhật lạc quan trong `InvoiceItemList`

`InvoiceItemList` giữ `pending = { base, ids }` ngay khi bấm nút, để món không nhảy về chỗ cũ trong lúc chờ DB. Khi `items` đổi tham chiếu (DB đã trả về), `pending` không còn áp dụng nữa.

### Quyết định 5: `memo` và so sánh theo nội dung

Dữ liệu từ DB luôn là object mới, nên một lần ghi thứ tự sẽ làm mọi thẻ hoá đơn và mọi dòng món render lại. Để tránh điều đó, `InvoiceItemRow` và `InvoiceCard` bọc bằng `memo` với hàm so sánh riêng. File `app/src/components/invoices/sameContent.ts` bỏ qua `orderIndex` khi so sánh, vì `orderIndex` không hiển thị và thứ tự hiển thị được quyết định bởi vị trí trong mảng. Các handler có danh tính cố định nhờ `latest` ref trong `InvoiceItemList`.

### Quyết định 6: Số thứ tự là nhãn hiển thị, không phải dữ liệu

Số thứ tự được tính `i + 1` theo vị trí trong danh sách đã sắp (prop `number`), không lưu. Commit `913bac2` đặt số này trong `<span aria-label="Món số n">`. Commit `98fb808` đổi thành `aria-hidden="true"` với thuộc tính `data-item-number`, vì tên món đã đủ cho trình đọc màn hình.

### Quyết định 7: Hiển thị `đơn giá × số lượng`

Commit `98fb808` đổi dòng món từ `SL × đơn giá = thành tiền` sang `đơn giá × SL = thành tiền`. Dòng tóm tắt món trong `SessionCard` và form sửa món (đơn giá đứng trước số lượng) đổi theo. Commit không nêu lý do. Lý do không xác định được từ lịch sử.

### Quyết định 8: Bữa đã lưu trữ

Trong `InvoiceItemList`, `canReorder = !readOnly && items.length > 1`. Với bữa `ARCHIVED`, `SessionsPanel` truyền `readOnly` xuống, và không có nút chuyển nào được hiện. Số thứ tự vẫn hiện. Ở tầng dịch vụ, `reorderInvoiceItems` gọi `loadEditableInvoice` rồi `loadActiveMeal` trong `app/src/services/mealPeopleService.ts`, và hàm này ném `MEAL_ARCHIVED` nếu bữa đã lưu trữ.

## Risks / Trade-offs

- **Cập nhật lạc quan có thể để lại thứ tự sai khi ghi lỗi.** `pending` chỉ bị bỏ khi `items` đổi tham chiếu. Nếu `reorderInvoiceItems` ném lỗi, `items` giữ nguyên tham chiếu nên `pending` vẫn áp dụng, và danh sách hiện thứ tự chưa được lưu cho tới khi dữ liệu khác đổi. Code không xử lý trường hợp này riêng. Điều này được ghi nhận từ code, không có ghi chú trong lịch sử.
- **So sánh theo nội dung tốn chi phí.** `sameContent` dùng `JSON.stringify` cho mỗi lần render. Với số món nhỏ trong một hoá đơn thì chi phí này không đáng kể, nhưng là đánh đổi có chủ đích.
- **Kiểm thử thủ công trên điện thoại chưa được ghi nhận.** Lịch sử không có ghi nhận kiểm thử thủ công cho hai nút trên điện thoại. Xem `tasks.md`.
- **Thứ tự hiển thị khác tài liệu gốc.** Dòng món đổi từ `SL × đơn giá` sang `đơn giá × SL`, nên các ảnh chụp màn hình hoặc tài liệu cũ không còn khớp. Đây là thay đổi có chủ đích theo commit `98fb808`.
