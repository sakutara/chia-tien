# Proposal

## Why

Epic 6 là "Động cơ Tính toán Chia tiền theo Bữa, 2 Chế độ Quyết toán & Tick Thanh toán". Nguồn: `documentation/epic-6/BR.md` mục A.1 và mục tiêu của Epic 6 trong `documentation/04-epics-and-roadmap.md`. Tài liệu gốc ghi trạng thái "Đã triển khai (còn kiểm thủ công trên trình duyệt ở 375 px trước khi đóng)".

Bối cảnh: sau Epic 1 đến Epic 5, ứng dụng đã có đầy đủ dữ liệu ba tầng. Bữa gồm thành viên, người chủ trì và nhóm thanh toán. Kèo gồm người tham gia từng kèo. Hoá đơn gồm người ứng tiền, chế độ chia, các điều chỉnh giảm giá, phí phục vụ và VAT. Món gồm số phần `shares` của từng người ăn. Tuy nhiên Khu vực 3 (Bảng quyết toán) trên màn hình chi tiết bữa vẫn là ô giữ chỗ, và tiến độ thanh toán ở danh sách bữa (Epic 3 R-10) mới chỉ đếm thô trên số lượng thực thể.

Epic 6 xây dựng động cơ tính toán chia tiền toàn bữa và hoàn thiện Khu vực 3, gồm năm mục tiêu:

1. Tổng hợp chi phí cá nhân trên toàn Bữa: số tiền mỗi thành viên đã ứng trước (`Paid(m)`) và số tiền thực tế tiêu dùng (`Owed(m)`) qua tất cả các kèo, hoá đơn và món, kèm bảng giải trình chi tiết (ai ứng ở hoá đơn nào, ăn món gì ở kèo nào).
2. Gom công nợ theo Nhóm thanh toán (`PaymentGroup`): gộp tổng tiền đã ứng và tổng tiền phải chi của các thành viên cùng cặp đôi hoặc gia đình thành một Thực thể thanh toán (`PaymentEntity`) với một số dư ròng (`NetBalance`).
3. Hai chế độ quyết toán: Tự thanh toán (`SELF_SETTLEMENT`) tối ưu số giao dịch chuyển khoản trực tiếp giữa người nợ và người ứng dư; Nhờ người chủ trì (`HOST_MEDIATED`) quy toàn bộ dòng tiền về đầu mối Người chủ trì của bữa.
4. Theo dõi trạng thái "Đã thanh toán": tick hoặc bỏ tick hoàn tất thanh toán cho từng cá nhân hoặc nhóm thanh toán có phát sinh công nợ, và tinh chỉnh chỉ số tiến độ thanh toán của bữa (bàn giao từ Epic 3 R-10).

### Các bên liên quan (BR mục A.2)

| Vai trò | Quan tâm |
| :--- | :--- |
| Chủ app và Người chủ trì | Nhìn ngay ai cần đóng bao nhiêu và cần hoàn lại cho ai bao nhiêu. Đổi qua lại giữa "Tự thanh toán" và "Nhờ người chủ trì" chỉ với một chạm. Tick ghi nhận ai đã chuyển khoản xong. |
| Thành viên và Cặp đôi, Gia đình | Xem được giải trình chi tiết từng khoản mình ăn ở từng kèo để tin con số cuối cùng. Nhóm gia đình chỉ cần chuyển khoản một lần cho cả nhóm. |
| Epic 7 (Lưu trữ bữa) | Cần kết quả quyết toán chuẩn và trạng thái `isAllSettled` (mọi thực thể có `netBalance !== 0` đã tick thanh toán, và không còn món chưa gán người ăn) để mở nút Lưu trữ và đóng gói `ArchivedMealSummary`. |
| Epic 8 (Chia sẻ và Snapshot) | Cần danh sách lệnh chuyển tiền (`transfers`) và thông tin thực thể thanh toán để định dạng tin nhắn đòi tiền và hiển thị trên Snapshot Viewer. |

## What Changes

- **US-6.1 Tổng hợp chi phí toàn Bữa theo thành viên**: tính `Paid(m)` và `Owed(m)` cho từng thành viên qua các kèo, hoá đơn chia đều (`EQUAL_TOTAL`) và món ăn (`BY_ITEM`). Người không nằm trong `SessionKeo.participantIds` của kèo nào thì chi phí ở kèo đó bằng 0. Kèm chế độ xem giải trình chi tiết theo từng thành viên, và cảnh báo món `BY_ITEM` chưa có người ăn trên Khu vực 3.
- **US-6.2 Gom công nợ theo Nhóm thanh toán**: các thành viên cùng `PaymentGroup` được gộp thành một Thực thể thanh toán với `TotalPaid`, `TotalOwed` và `NetBalance` riêng. Thành viên không thuộc nhóm nào là một thực thể độc lập.
- **US-6.3 Chế độ 1, Tự thanh toán (`SELF_SETTLEMENT`)**: tính và liệt kê từng cá nhân hoặc nhóm phải trả cho ai bao nhiêu tiền, dựa trên số thực chi và người đã ứng tiền. Thuật toán ghép cặp số dư theo lối tham lam (Greedy Net-Balance Matching) để giảm số giao dịch.
- **US-6.4 Chế độ 2, Nhờ người chủ trì (`HOST_MEDIATED`)**: mọi cá nhân hoặc nhóm thiếu tiền chuyển khoản đó cho Người chủ trì, và Người chủ trì hoàn lại cho những thực thể ứng dư. Cho phép chuyển đổi tức thì giữa hai chế độ và lưu lựa chọn vào `Meal.settlementMode`.
- **US-6.5 Tick chọn "Đã thanh toán"**: ghi nhận trạng thái hoàn tất thanh toán sau bữa của từng cá nhân hoặc nhóm thanh toán có số dư khác 0 vào `Meal.settlementStatuses`. Tiến độ thanh toán trên thẻ bữa (cả ba chế độ xem) chỉ đếm các thực thể có số dư khác 0.
- **Chung cho US-6.2 đến US-6.4**: Khu vực 3 của màn hình chi tiết bữa hiển thị Bảng tổng hợp thực thể thanh toán và Hướng dẫn chuyển tiền chi tiết theo hệ màu USD Green. Bữa đã lưu trữ chỉ đọc.

Các yêu cầu cụ thể nằm trong delta spec `specs/settlement/spec.md`. Các việc đã làm và việc còn lại nằm trong `tasks.md`.

## Capabilities

### New Capabilities
- `settlement`: động cơ tính toán quyết toán theo bữa, gồm tổng hợp chi phí theo thành viên, gom nhóm thanh toán, hai chế độ quyết toán (Tự thanh toán và Nhờ người chủ trì), tick trạng thái Đã thanh toán, điều kiện hoàn tất toàn bữa và tiến độ thanh toán trên thẻ bữa.

### Modified Capabilities
- Không có delta nào của capability khác trong change này. Tài liệu gốc mô tả việc tinh chỉnh tiến độ thanh toán ở BR-6.9 là bàn giao từ Epic 3 R-10. Yêu cầu đó được ghi trong delta `settlement` theo đúng mã BR-6.9.

## Impact

**Mã nguồn bị ảnh hưởng** (theo `documentation/epic-6/SA.md` mục B.2, trong `app/src`):
- `types/index.ts`: thêm các kiểu kết quả tính toán dùng chung (`MemberChargeLine`, `MemberBreakdown`, `PaymentEntitySettlement`, `SettlementTransfer`, `MealSettlementResult`). Đây là kiểu chỉ dùng trong bộ nhớ.
- `domain/settlementEngine.ts` (mới, hàm thuần): `computeMealSettlement`, `computeSelfSettlementTransfers`, `computeHostMediatedTransfers`. Kèm `settlementEngine.test.ts`.
- `domain/mealRules.ts` và `mealRules.test.ts`: `summarizeMeal` nhận thêm dữ liệu kèo và món để tính tiến độ thanh toán theo thực thể có số dư khác 0 (BR-6.9).
- `services/settlementService.ts` (mới): `setSettlementMode`, `toggleEntityPaid`, `setAllEntitiesPaid`. Kèm `settlementService.test.ts`.
- `services/peopleErrors.ts`: thêm mã `ENTITY_NOT_FOUND` và `INVALID_SETTLEMENT_MODE`.
- `hooks/useMealSettlement.ts` (mới) và `hooks/useMealSummaries.ts` (truyền thêm sessions và items).
- `components/settlement/`: `SettlementPanel`, `EntitySettlementRow`, `TransferInstructionList`, `MemberBreakdownDialog`, cùng `SettlementPanel.test.tsx`.
- `pages/MealWorkspacePage.tsx`: thay ô giữ chỗ Khu vực 3 bằng `SettlementPanel`.

**Dữ liệu**: không đổi schema IndexedDB và không nâng version Dexie. Bảng `meals` đã có sẵn `settlementMode`, `paymentGroups`, `settlementStatuses` và `archivedSummary` từ Epic 1 và Epic 2.

**Thư viện**: không thêm thư viện mới (SA mục B.1).

**Lệch so với thiết kế khi triển khai** (ghi theo cuối `design.md`):
- `SettlementPanel` nhận `meal`, `readOnly` và `actionsSlot`, và tự gọi `useMealSettlement`, thay vì nhận `MealSettlementResult` từ ngoài.
- `MemberBreakdownDialog` nhận `breakdowns: MemberBreakdown[]` vì một thực thể nhóm có nhiều thành viên, thay vì một `breakdown`.
- Tick "Đã thanh toán" dùng `toggleEntityPaid`, và có thêm `setAllEntitiesPaid` cho nút "Đánh dấu tất cả đã thanh toán".
- Bữa đã lưu trữ dựng kết quả từ `archivedSummary` ngay trong `computeMealSettlement`, không truy vấn bảng đã xoá.

**Ngoài phạm vi** (BR mục A.6, thuộc các epic khác hoặc không làm):
- Nút "Lưu trữ bữa", xoá hoá đơn, món và ảnh khi lưu trữ, và giao diện bữa lưu trữ hoàn chỉnh (thuộc Epic 7).
- Nút "Chia sẻ thông báo thanh toán", định dạng bản tin đòi nợ, và mã hoá hoặc hiển thị Custom URL Snapshot (thuộc Epic 8).
- Thanh toán từng phần (Partial payment) của một cá nhân hoặc nhóm. Hệ thống chỉ ghi nhận hoàn tất thanh toán theo từng thực thể bằng checkbox `isPaid`.
- Tích hợp cổng thanh toán ngân hàng hoặc tạo mã VietQR động. Hệ thống chỉ hiển thị số tiền và hướng dẫn ai chuyển cho ai.

Yêu cầu phi chức năng ở SA mục B.7 (hiệu năng dưới 5 ms, độ chính xác từng đồng, vùng chạm 44 px) nằm trong `design.md` và không chép lại ở đây. Yêu cầu về 375 px và vùng chạm được ghi trong delta spec theo AC-9.

## Nguồn lịch sử

- Tài liệu gốc: `documentation/epic-6/BR.md`, `documentation/epic-6/SA.md` (nguyên văn trong `design.md`), và `documentation/04-epics-and-roadmap.md` (phần EPIC 6; các dòng 8, 11, 12, 13, 16 và 23 của ma trận truy vết).
- Lịch sử git của `documentation/epic-6` (lệnh `git log --format='%ad %h %s' --date=short -- documentation/epic-6`): ngày 2026-10-19, commit `d492cfe` ("Đổi docs thành documentation, đặt bản build vào docs để GitHub Pages phục vụ từ main /docs"). Đây là commit đầu tiên và cũng là commit cuối cùng trong lịch sử của nhánh hiện tại.
- Trước khi đổi tên thành `documentation`, cùng thư mục nằm ở `docs/epic-6`. Lịch sử các ref khác (`git log --all`) có thêm commit `94e9ab1` và `a144fd2` (đều ngày 2026-10-19, tiêu đề "Initial commit: fee calculator app (Vite + React) and docs") và commit `506e87c` (ngày 2026-10-19, đổi tên docs thành documentation).
