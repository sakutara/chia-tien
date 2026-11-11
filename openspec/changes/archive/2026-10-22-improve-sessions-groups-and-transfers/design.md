# Design

## Context

Thiết kế gốc của Epic 2, 3, 4, 6 và 7 coi "Đã thanh toán" là trạng thái của từng thực thể thanh toán (cá nhân hoặc nhóm), lưu tại `Meal.settlementStatuses[entityId]`. Thiết kế gốc cũng coi nhóm thanh toán chỉ tồn tại trong một bữa, không có hồ sơ trong danh bạ.

Commit `ae13221` (22/10/2026) và các commit trước đó trong repo đã đổi các điểm này. Những đổi khác biệt đã được xác nhận trong code tại thời điểm viết change này:

- Mã tick theo khoản chuyển tiền, khoá `fromEntityId->toEntityId`, đã có từ commit `a144fd2`. Commit này là commit đầu tiên của repo và chứa cả mã nguồn lẫn tài liệu, nên không xác định được từ lịch sử thời điểm tài liệu và mã tách khỏi nhau.
- Hồ sơ nhóm trong danh bạ (`Member.groupMemberIds`, `PaymentGroup.contactId`) và các hàm liên quan là thay đổi thuộc `ae13221`.
- Nút "Thêm hoá đơn nhanh", nhãn "Ứng trước", và việc ẩn QR cho khoản đã chuyển là thay đổi thuộc `ae13221`.

### Chỗ lệch giữa tài liệu cũ và code

| Mục | Tài liệu cũ | Code hiện tại | Commit nguồn |
| :--- | :--- | :--- | :--- |
| Khoá tick "Đã chuyển" | `settlementStatuses[entityId]`, theo thực thể | `settlementStatuses[fromEntityId->toEntityId]`, theo khoản chuyển, kèm `amount` | `a144fd2` (có sẵn từ đầu repo) |
| Hàm tick | `toggleEntityPaid`, `setAllEntitiesPaid` | `toggleTransferPaid`, `setTransfersPaid` (không có `toggleEntityPaid` trong lịch sử) | `a144fd2` |
| Lỗi khi tick sai khoá | `ENTITY_NOT_FOUND` | `TRANSFER_NOT_FOUND`; `ENTITY_NOT_FOUND` được khai báo trong `peopleErrors.ts` nhưng không ném ở đâu | `a144fd2` |
| Tiến độ | `activeEntityCount`, `paidEntityCount` (thực thể có số dư khác 0) | `transferCount`, `paidTransferCount` (khoản chuyển) | `a144fd2` |
| `isAllSettled` | mọi thực thể có số dư khác 0 đã tick | mọi khoản chuyển đã tick, bữa có hoá đơn, không còn món chưa gán người ăn | `a144fd2` |
| Thực thể cân bằng | số dư bằng 0 coi là đã tick, không lưu | thực thể không có khoản chuyển nào thì coi là đã xong; trạng thái `isPaid` của thực thể suy ra từ các khoản chuyển liên quan | `a144fd2` |
| Điều kiện lưu trữ | mọi thực thể có số dư khác 0 đã tick (`ARCHIVE_UNPAID_ENTITIES`) | mọi khoản chuyển đã tick (`checkArchiveEligibility`, mã vẫn là `ARCHIVE_UNPAID_ENTITIES`) | `a144fd2` |
| Thẻ bữa đã lưu trữ | tiến độ theo `archivedSummary.entitiesSummary` (`isPaid`) | tổng số khoản lấy từ `archivedSummary.transfers`, coi mọi khoản là đã chuyển | `a144fd2` |
| Tổng đã ứng | Σ `TotalPaid` của mọi thực thể bằng tổng hoá đơn của bữa | chỉ cộng tiền ứng khi người ứng thuộc kèo đó; tổng hoá đơn vẫn cộng đủ | `a144fd2` |
| Giao diện quyết toán | `EntitySettlementRow`, `MemberBreakdownDialog` (hộp thoại giải trình) | `EntityGroupList` và `MemberBreakdownList` trong khối thu gọn "Chi tiết quyết toán" | `a144fd2` (hai tên component có từ đầu repo) |
| Hồ sơ nhóm trong danh bạ | không có | `Member.groupMemberIds`, `PaymentGroup.contactId`, `saveGroupContact`, `addGroupContactToMeal` | `ae13221` |
| Tên hàm kèo | `cleanSessionName`, `reorder`, `normalizeParticipants` | `validateSessionName` (từ chối tên quá 80 ký tự thay vì cắt), `moveSession`; không có `normalizeParticipants` (logic chọn người nằm trong `setSessionParticipants`) | `a144fd2` |
| Tự đổi tên kèo theo quán | đổi khi tên kèo còn dạng `Kèo <n>` (`isDefaultSessionName`) | giống tài liệu, không lệch | `a144fd2` |
| Xác nhận khi bỏ người có tick | hỏi khi có khoá của người hoặc nhóm đang tick | chỉ hỏi khi chính người đó có khoá tick (`hasPaidStatusAffected(meal, [member.id])`). Khoá của nhóm là `groupId` nên không được kiểm | `a144fd2` |
| Nhãn "Ứng" | "Ứng" | "Ứng trước" | `ae13221` |

## Goals / Non-Goals

**Goals**

- Ghi lại trạng thái "Đã chuyển" theo đúng đơn vị thực tế của việc chuyển tiền, tức là một khoản giữa hai thực thể, để một người chuyển nhiều khoản không bị gộp.
- Ghi lại hồ sơ nhóm trong danh bạ để nhóm lặp lại giữa các bữa được thêm nhanh.
- Ghi lại hành vi giao diện đã đổi (ẩn QR cho khoản đã chuyển, khối chi tiết thu gọn, nút thêm hoá đơn nhanh) để spec hiện tại khớp với code.

**Non-Goals**

- Không đổi code, không đổi `openspec/specs/`, không đổi `documentation/`.
- Không sửa schema Dexie: `app/src/db/db.ts` vẫn `version(1)`.
- Không mô tả lại phần chia tiền theo món (`invoice-management`) và tài khoản nhận của nhóm (`payment-sharing-snapshot`) vì ngoài năm capability của change này.

## Decisions

### Khoá tick theo khoản chuyển

- Khoá là `transferKey(fromEntityId, toEntityId) = "<from>-><to>"`. Mỗi khoản được lưu thành `settlementStatuses[key] = { isPaid: true, paidAt, amount }`.
- Bỏ tick xoá khoá. Tick nhiều khoản cùng lúc qua `setTransfersPaid(mealId, keys, isPaid)`.
- Thời điểm tick và số tiền lúc tick được lưu. Khoản có số tiền hiện tại khác số tiền đã lưu được coi là chưa chuyển (`isPaid` tính lại trong `computeMealSettlement`).
- Khoá không khớp khoản chuyển nào của bữa bị từ chối với `TRANSFER_NOT_FOUND`.
- Lý do chọn khoá theo cặp thực thể: không xác định được từ lịch sử. Hệ quả đã thấy trong code: khi đổi chế độ quyết toán, khoản mới có cùng cặp và cùng số tiền sẽ hiện là đã chuyển.

### Tiến độ và trạng thái hoàn tất

- `transferCount` là số khoản chuyển, `paidTransferCount` là số khoản đã tick. Thẻ bữa đang hoạt động hiển thị `paidTransferCount/transferCount`.
- Thực thể `isPaid` khi mọi khoản có nó làm nguồn hoặc đích đã tick; thực thể không có khoản nào thì `isPaid` là true.
- `isAllSettled = hasCost && unassignedItemCount === 0 && paidTransferCount === transferCount`. Bữa không có hoá đơn không được coi là xong.

### Điều kiện lưu trữ

- `checkArchiveEligibility` chặn lưu trữ khi bữa không có chi phí, còn món chưa có người ăn, hoặc còn khoản chuyển chưa tick. Danh sách khoản chưa tick gồm tên thực thể nguồn và tên thực thể đích, ghép bằng ký tự mũi tên trong `archiveRules.ts`. Tên mã lỗi giữ nguyên.
- `buildArchivedPayload` ghi `entitiesSummary[].isPaid = true` cho mọi thực thể và ghi `transfers` không kèm trạng thái tick.

### Hồ sơ nhóm trong danh bạ

- Hồ sơ nhóm là một `Member` có `groupMemberIds` (danh sách thành viên). Hồ sơ này không được dùng làm cá nhân trong `getOrCreateMember`, nên tên trùng với hồ sơ nhóm không bị coi là trùng người.
- `saveGroupContact(name, memberIds, contactId, now)` xử lý ba trường hợp: có hồ sơ theo `contactId` hoặc tên trùng hồ sơ nhóm thì cập nhật thành viên và tên; tên trùng với một cá nhân trong danh bạ thì không lưu, và nhóm vẫn được tạo với `contactId` là undefined; các trường hợp còn lại thì tạo hồ sơ mới.
- `createGroup` và `updateGroup` gọi `saveGroupContact` và ghi `contactId` vào nhóm. `updateGroup` chỉ xoá khoá tick khi thành phần đổi, không xoá khi chỉ đổi tên.
- `dissolveGroup` không xoá hồ sơ nhóm trong danh bạ; chỉ xoá khoá tick của nhóm và các thành viên.
- `addGroupContactToMeal(mealId, contactId)` thêm thành viên chưa có trong bữa, bỏ qua các hồ sơ nhóm trong danh sách thành viên, dựng nhóm với tên là tên hồ sơ và đại diện là thành viên đầu tiên. Nếu nhóm này đã có trong bữa thì không làm gì. Nếu thành viên đang ở nhóm khác thì `validateGroupDraft` từ chối với `MEMBER_ALREADY_GROUPED`.
- Thẻ thành viên trong danh bạ (`MemberQuickFilter`) hiện biểu tượng nhóm nếu `groupMemberIds` có mặt. Nút chọn ở `MealWorkspacePage` gọi `addGroupContactToMeal` cho hồ sơ nhóm và `addParticipant` cho cá nhân.

### Kèo

- Nút "Thêm hoá đơn nhanh" hiện trên kèo chưa có chi phí (không có hoá đơn), không hiện ở chế độ chỉ đọc. Nút bị vô hiệu hoá khi kèo chưa có người tham gia.
- Tự đổi tên kèo theo quán và giới hạn 80 ký tự theo đúng tài liệu Epic 4. Không đổi trong `ae13221`.

### Giao diện quyết toán

- Khoản đã chuyển không hiện nút mở QR (`slideOf(tr) && !tr.isPaid`).
- Giải trình từng thành viên nằm trong khối "Chi tiết quyết toán" thu gọn, không dùng hộp thoại.
- Nhãn "Ứng trước" thay cho "Ứng" ở khối thực thể và khối giải trình.

### Dữ liệu và tương thích

- Không có migration. Trường mới đều tuỳ chọn. Dữ liệu bữa cũ không có `amount` vẫn hợp lệ, vì tick chỉ kiểm `amount` khi có.
- Không xác định được từ lịch sử có bản ghi cũ nào dùng khoá kiểu `entityId` hay không, vì mã khoá theo khoản đã có từ `a144fd2`.
- Bữa đã lưu trữ dựng `transfers` từ `archivedSummary.transfers` và không có giải trình từng thành viên (`memberBreakdowns` rỗng). Đây là hành vi có trong code, tài liệu Epic 6 không nói rõ.

## Risks / Trade-offs

- Xác nhận khi bỏ người có tick chưa đủ. `MemberList.requestRemove` chỉ kiểm khoá của chính người đó. Khi người thuộc nhóm có khoản chuyển đã tick bị bỏ khỏi bữa, không có hộp xác nhận, nhưng `removeParticipant` vẫn xoá khoá của nhóm đó. Spec `Xác nhận trước khi xoá trạng thái đã thanh toán` yêu cầu hỏi xác nhận trong trường hợp này, nên hai bên chưa khớp.
- Bất biến tổng đã ứng chỉ đúng khi người ứng thuộc kèo của hoá đơn đó. Nếu người ứng không thuộc kèo, tổng hoá đơn của bữa vẫn tính đủ nhưng tổng đã ứng của thực thể thiếu phần đó. Không xác định được từ lịch sử có ràng buộc giao diện nào ngăn trường hợp này.
- Đổi số tiền khoản chuyển làm tick cũ mất hiệu lực, nhưng khoá cũ vẫn nằm trong bữa cho đến khi người dùng bỏ tick. Đây là hành vi có chủ đích theo `amount`.
- Khoá theo cặp thực thể có thể khớp lại khoản mới sau khi đổi chế độ quyết toán, nếu số tiền không đổi.
- Tiến độ theo khoản chuyển thay đổi số đếm so với tài liệu. Một thực thể có hai khoản chuyển sẽ đếm thành hai. Các màn hình hiển thị đã dùng số mới.
- Chưa kiểm giao diện ở 375 px cho khu vực quyết toán (theo `documentation/epic-6/SA.md` B.10).
