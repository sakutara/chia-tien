# Proposal

## Why

Sau thiết kế gốc (các Epic 2, 3, 4, 6, 7 trong `documentation/`), chủ dự án đã thay đổi code về kèo, nhóm thanh toán và chuyển tiền mà không cập nhật tài liệu. Commit `ae13221` ngày 22/10/2026 với tiêu đề "Cải thiện kèo, nhóm và chuyển tiền" gom một phần các thay đổi này. Thông điệp commit không nêu lý do cho từng thay đổi, nên phần lý do bên dưới chỉ ghi những gì có thể thấy trong code và trong tài liệu cũ.

Các thay đổi chính:

- Tick "Đã chuyển" được đặt theo từng khoản chuyển tiền (khoá `fromEntityId->toEntityId`), không theo từng cá nhân hoặc nhóm như tài liệu. Lý do chuyển sang cách này: không xác định được từ lịch sử. Mã tick theo khoản chuyển đã có ngay từ commit `a144fd2`, là commit đầu tiên của repo.
- Nhóm thanh toán được lưu vào danh bạ như một hồ sơ, để lần sau thêm vào bữa khác như một cá nhân. Tài liệu Epic 2 không có phần này.
- Kèo chưa có chi phí có nút "Thêm hoá đơn nhanh".
- Một số chi tiết giao diện và quy tắc đổi theo, ví dụ nhãn "Ứng" đổi thành "Ứng trước", khoản đã chuyển không còn hiện mã QR, và khoản chuyển tiền có số tiền canh trái.

Change này ghi lại các thay đổi có chủ đích đó, để thiết kế gốc (archive các Epic) cộng với các change này cho ra spec hiện tại.

## What Changes

- **BREAKING** Tick "Đã thanh toán" chuyển từ khoá theo thực thể (`settlementStatuses[entityId]`, `toggleEntityPaid`, `setAllEntitiesPaid`, lỗi `ENTITY_NOT_FOUND`) sang khoá theo khoản chuyển (`settlementStatuses[fromEntityId->toEntityId]`, `toggleTransferPaid`, `setTransfersPaid`, lỗi `TRANSFER_NOT_FOUND`). Mỗi khoản lưu thêm `amount` lúc tick. Tick chỉ có hiệu lực khi số tiền khoản chuyển không đổi.
- **BREAKING** Tiến độ thanh toán đếm theo số khoản chuyển (`transferCount`, `paidTransferCount`) thay vì số thực thể (`activeEntityCount`, `paidEntityCount`). `isAllSettled` là khi mọi khoản chuyển đã được tick, bữa có hoá đơn và không còn món chưa có người ăn.
- **BREAKING** Điều kiện lưu trữ chuyển từ "mọi thực thể có số dư khác 0 đã tick" sang "mọi khoản chuyển đã tick" (`checkArchiveEligibility`). Sửa hoá đơn làm đổi số tiền một khoản thì tick cũ mất hiệu lực.
- Thẻ bữa đang hoạt động đếm tiến độ theo khoản chuyển. Thẻ bữa đã lưu trữ lấy tổng số khoản từ `archivedSummary.transfers` và coi mọi khoản là đã chuyển.
- Giao diện quyết toán: khối "Chi tiết quyết toán" thu gọn trong danh sách thực thể thay cho hộp thoại giải trình; khoản đã chuyển không hiện nút mở QR.
- Nhóm lưu sẵn trong danh bạ: thêm `Member.groupMemberIds` (hồ sơ nhóm) và `PaymentGroup.contactId`. Hàm nội bộ `saveGroupContact` tạo, cập nhật hồ sơ khi tạo hoặc sửa nhóm. Hàm `addGroupContactToMeal` thêm nhóm từ danh bạ vào bữa. Danh bạ hiện biểu tượng nhóm.
- Kèo chưa có chi phí có nút "Thêm hoá đơn nhanh", bị vô hiệu hoá khi kèo chưa có người tham gia.
- Thay đổi ngoài năm capability của change này (ghi nhận để lịch sử đầy đủ, chưa có delta spec riêng): khi bật "Chia từng món", món chưa có người ăn được gán cả kèo (`everyoneShares`, thuộc `invoice-management`); tài khoản nhận của nhóm lấy từ thành viên đầu tiên có thông tin ngân hàng (`resolveRecipient`, thuộc `payment-sharing-snapshot`); nhãn "Ứng" đổi thành "Ứng trước" trên form hoá đơn, kèo và quyết toán.

## Capabilities

### New Capabilities
- Không có.

### Modified Capabilities
- `settlement`: tick theo khoản chuyển, tiến độ theo khoản chuyển, khối chi tiết quyết toán thu gọn, không hiện QR cho khoản đã chuyển, và tick có kiểm tra số tiền.
- `meal-people-and-payment-groups`: nhóm có hồ sơ trong danh bạ, thêm nhóm từ danh bạ vào bữa, sửa nhóm đồng bộ hồ sơ, và xác nhận khi bỏ người có tick.
- `session-management`: nút thêm hoá đơn nhanh trên kèo chưa có chi phí.
- `meal-archive`: điều kiện lưu trữ theo khoản chuyển đã tick.
- `meal-management`: tiến độ thanh toán trên thẻ bữa đếm theo khoản chuyển.

## Impact

Mã nguồn bị ảnh hưởng (theo `ae13221` và các commit đã nêu ở mục Nguồn lịch sử):

- `app/src/services/settlementService.ts`: `setTransfersPaid`, `toggleTransferPaid`, `setSettlementMode`.
- `app/src/domain/settlementEngine.ts`: `transferKey`, `isPaid` theo khoản, `transferCount`, `paidTransferCount`, `isAllSettled`, nhánh dựng từ `archivedSummary`.
- `app/src/domain/mealRules.ts`: `summarizeMeal` đếm theo khoản chuyển.
- `app/src/domain/archiveRules.ts`: `checkArchiveEligibility` và `buildArchivedPayload`.
- `app/src/services/mealPeopleService.ts`: `saveGroupContact`, `createGroup`, `updateGroup`, `dissolveGroup`, `addGroupContactToMeal`, `hasPaidStatusAffected`, `withoutKeys`.
- `app/src/services/memberService.ts`: `getOrCreateMember` bỏ qua hồ sơ nhóm khi tìm trùng tên.
- `app/src/components/people/MemberQuickFilter.tsx`, `app/src/components/people/MemberList.tsx`, `app/src/components/people/PaymentGroupDialog.tsx`.
- `app/src/components/settlement/`: `SettlementPanel.tsx`, `EntityGroupList.tsx`, `MemberBreakdownList.tsx`, `TransferInstructionList.tsx`.
- `app/src/components/sessions/SessionCard.tsx`: nút thêm hoá đơn nhanh.
- `app/src/pages/MealWorkspacePage.tsx`: chọn nhóm từ danh bạ khi thêm người vào bữa.
- `app/src/types/index.ts`: `Member.groupMemberIds`, `PaymentGroup.contactId`, `settlementStatuses[].amount`, `transferCount`, `paidTransferCount`.
- Dữ liệu: không đổi schema Dexie (`app/src/db/db.ts` vẫn `version(1)`). Trường mới đều là tuỳ chọn.

Ngoài phạm vi change này: nội dung của `invoice-management` và `payment-sharing-snapshot` nêu ở trên; chưa có delta spec riêng cho hai capability này trong change này.

Phần còn lại chưa đóng (xem `tasks.md`): xác nhận khi bỏ người có tick của nhóm (code chưa làm); kiểm 375 px cho khu vực quyết toán; test cảnh báo món chưa gán và mở giải trình từ màn bữa.

## Nguồn lịch sử

Commit chính:
- `ae13221`, 2026-10-22, "Cải thiện kèo, nhóm và chuyển tiền" (20 file, 217 dòng thêm và 38 dòng bớt).

Commit đã xác định nguồn của các chỗ lệch có trước `ae13221`:
- `a144fd2`, 2026-10-19, "Initial commit: fee calculator app (Vite + React) and docs". Đây là commit đầu tiên của repo và chứa cả mã nguồn lẫn tài liệu. Mã tick theo khoản chuyển (`toggleTransferPaid`, `setTransfersPaid`, `TRANSFER_NOT_FOUND`), đếm theo khoản (`transferCount`, `paidTransferCount`), `isAllSettled`, `hasPaidStatusAffected`, `validateSessionName`, `moveSession`, `renamedSessionTo` (tự đổi tên kèo theo quán), `EntityGroupList`, `MemberBreakdownList`, `fromArchivedSummary`, `UNPAID_ENTITIES` đều đã có trong commit này. Vì vậy không xác định được từ lịch sử thời điểm các thay đổi này tách khỏi thiết kế gốc.
- `c332994`, 2026-10-20, "Epic 9: song ngữ Việt – Anh (i18n)": có thay đổi ở `settlementEngine.ts`, `sessionRules.ts` và `sessionService.ts`. Nội dung từng thay đổi không được đối chiếu chi tiết trong change này.
- `ba90393`, 2026-11-11, "Tích hợp OpenSpec": tạo các spec hiện tại mà delta của change này bám theo tên requirement.

Tài liệu cũ bị thay thế (đây là các mục nêu hành vi trước khi thay đổi):
- `documentation/epic-6/BR.md`: BR-6.7 (tick theo thực thể), BR-6.9 (tiến độ theo thực thể).
- `documentation/epic-6/SA.md`: B.4 (`PaymentEntitySettlement.isPaid`, `activeEntityCount`, `paidEntityCount`), B.6 (`toggleEntityPaid`, `setAllEntitiesPaid`, `ENTITY_NOT_FOUND`, `EntitySettlementRow`, `MemberBreakdownDialog`), B.10 (lệch đã ghi nhận).
- `documentation/epic-6/BR.md` và `documentation/epic-6/SA.md`, mục R-7: điều kiện `isAllSettled` theo thực thể.
- `documentation/epic-2/BR.md`: R-13 (khoá `settlementStatuses` theo `memberId` hoặc `paymentGroupId`, xác nhận khi bỏ người có khoá đang tick). Tài liệu Epic 2 không có hồ sơ nhóm trong danh bạ.
- `documentation/epic-2/SA.md`: mục về nhóm thanh toán và `settlementStatuses`.
- `documentation/epic-3/BR.md`: R-10 (tiến độ theo thực thể, bữa đã lưu trữ lấy từ `archivedSummary.entitiesSummary`).
- `documentation/epic-7/BR.md`: BR-7.1 và R-1 (điều kiện lưu trữ theo thực thể có số dư khác 0 đã tick).
- `documentation/epic-4/BR.md` và `documentation/epic-4/SA.md`: mục 5.10 và `sessionRules.ts` (tên hàm `cleanSessionName`, `reorder`, `normalizeParticipants`). Phần tự đổi tên theo quán không lệch.
- `documentation/02-business-logic-and-algorithms.md`: mục 7.1 (tick theo `entityId`) và 7.2 (điều kiện lưu trữ theo thực thể).
- `documentation/01-architecture-and-data-model.md`: mục 3.2 (chú thích `settlementStatuses` theo thực thể; `PaymentGroup` không có `contactId`).
