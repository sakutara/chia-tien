# Proposal

## Why
Sau Epic 4, người dùng đã tạo được kèo, thêm hoá đơn kèm ảnh và quét OCR để bóc tách danh sách món, giảm giá, phí phục vụ và VAT. Tuy nhiên, mọi hoá đơn do Epic 4 lưu đều cố định `splitType = 'EQUAL_TOTAL'`, danh sách chia đều luôn lấy trọn người trong kèo, các món có `consumers = []`, và thẻ kèo (`SessionCard`) mới chỉ hiển thị dòng tóm tắt hoá đơn, chưa mở ra Tầng 3 (danh sách món, chế độ chia và gán người ăn).

Epic 5 hoàn thiện Tầng 3 (Món) và cơ chế chia tiền ở cấp hoá đơn, để cung cấp dữ liệu đầy đủ và chính xác cho động cơ quyết toán của Epic 6. Mục tiêu theo `documentation/04-epics-and-roadmap.md`: đánh dấu người ứng tiền cho từng hoá đơn; cho phép nhập chi tiết món hoặc chỉ nhập tổng tiền (khi chỉ nhập tổng tiền thì bắt buộc chia đều theo tổng); chuyển đổi giữa chia từng món và chia đều theo tổng; thêm, sửa, xoá từng món sau khi đã lưu; và gán người ăn, số phần cho từng món.

### Bên liên quan
| Vai trò | Quan tâm |
| :--- | :--- |
| Chủ app | Chuyển nhanh giữa chia đều cả hoá đơn và chia theo món; tick người ăn trong vài chạm ngay trên màn chi tiết bữa; sửa, thêm, xoá lẻ một món mà không phải quét lại hoá đơn |
| Người ứng tiền | Hoá đơn ghi nhận đúng mình là người ứng toàn bộ `totalAmount`; đổi người ứng dễ dàng nếu lúc đầu chọn nhầm |
| Thành viên tham gia kèo | Chỉ bị tính tiền ở những hoá đơn và món mình thực sự dùng, đúng tỷ lệ số phần (`shares`) đã gán |
| Dev Epic 6 (Quyết toán) | Mọi hoá đơn có `payerMemberId`, `splitType`, `equalSplitParticipantIds` và `items[].consumers` hợp lệ, nhất quán với `SessionKeo.participantIds` để tính `Paid(m)` và `Owed(m)` |
| Dev Epic 7 và 8 (Lưu trữ và Snapshot) | Dữ liệu Tầng 3 đầy đủ để xuất sang `MealSnapshotPayload` hoặc kiểm tra trước khi lưu trữ |

## What Changes
- **US-5.1** Đánh dấu người ứng tiền (`payerMemberId`) cho từng hoá đơn, chỉ chọn trong số người tham gia kèo. Chọn khi tạo hoá đơn hoặc đổi nhanh ngay trên thẻ hoá đơn.
- **US-5.2** Hỗ trợ hai phương thức nhập hoá đơn. Nhập chi tiết món (`ITEMIZED`) cho phép thêm, sửa, xoá từng món sau khi đã lưu. Chỉ nhập tổng tiền (`TOTAL_ONLY`) bắt buộc khoá chế độ chia là `EQUAL_TOTAL` và không có món nào.
- **US-5.3** Với hoá đơn chi tiết, chuyển đổi giữa chia từng món (`BY_ITEM`) và chia đều theo tổng (`EQUAL_TOTAL`) mà không làm mất người ăn đã gán. Chọn danh sách người chia đều (`equalSplitParticipantIds`) và cảnh báo khi có món chưa có người ăn.
- **US-5.4** Gán người ăn cho từng món ở chế độ `BY_ITEM`: tick chọn nhanh người ăn trong kèo, chỉnh số phần (`shares`) và xem số tiền tạm tính của từng người.
- Bổ sung các mã lỗi (`SPLIT_TYPE_LOCKED`, `EQUAL_SPLIT_EMPTY`, `SPLIT_MEMBER_NOT_IN_SESSION`, `CONSUMER_NOT_IN_SESSION`, `INVALID_SHARES`, `ITEM_NOT_FOUND`, `LAST_ITEM_CANNOT_DELETE`), các hàm thuần trong `domain/invoiceRules`, các hàm dịch vụ trong `services/invoiceService`, và các component Tầng 3 theo thiết kế ghi trong `design.md`.
- Không có thay đổi **BREAKING**. Hoá đơn tạo ở Epic 4 vẫn hợp lệ và vẫn mặc định `EQUAL_TOTAL`, nên tương thích với dữ liệu cũ.

## Capabilities

### New Capabilities
- Không có. Nội dung của change này thuộc capability `bill-splitting` đã có trong `openspec/specs/bill-splitting/`.

### Modified Capabilities
- `bill-splitting`: bổ sung các requirement về người ứng tiền, hai phương thức nhập hoá đơn, khoá chia đều khi chỉ nhập tổng tiền, thêm, sửa, xoá món sau khi lưu, chuyển đổi chế độ chia, người chia đều, người ăn và số phần của món, cảnh báo món chưa có người ăn, ràng buộc nhất quán với kèo và trạng thái bữa, và yêu cầu giao diện trên màn hình 375 px.

## Impact
**Mã nguồn** (theo `documentation/epic-5/SA.md` mục B.2):
- `app/src/domain/invoiceRules.ts` và `invoiceRules.test.ts`.
- `app/src/services/peopleErrors.ts`, `invoiceService.ts` và `invoiceService.test.ts`.
- `app/src/components/sessions/SessionCard.tsx`, thay dòng hoá đơn rút gọn bằng `InvoiceCard`.
- `app/src/components/invoices/InvoiceFormDialog.tsx` (chọn `splitType`, khoá khi `TOTAL_ONLY`).
- Component mới trong `app/src/components/invoices/`: `InvoiceCard.tsx`, `EqualSplitPicker.tsx`, `InvoiceItemRow.tsx`, `ItemInlineFormDialog.tsx`, và `InvoiceCard.test.tsx`.

**Dữ liệu và thư viện**: không đổi schema Dexie, không nâng version, không đổi `types/index.ts`. Không thêm thư viện nào.

**Lệch so với thiết kế gốc** (theo cuối `documentation/epic-5/SA.md`, ghi nhận khi triển khai):
- `InvoiceCard` có nút "Gán cả kèo cho các món trống" (`setAllItemsConsumers` ở chế độ `UNASSIGNED_ONLY`), thay cho nút "Gán cả kèo cho mọi món" trong thiết kế, để không ghi đè người ăn đã chọn.
- Hoá đơn `ITEMIZED` ở chế độ `EQUAL_TOTAL` vẫn hiện danh sách món để sửa; chỉ ẩn bộ chọn người ăn.
- Người ăn và số phần được ghi trực tiếp qua `setItemConsumers` và `setAllItemsConsumers`, không qua `InvoiceFormDialog`; `InvoiceFormDialog` chỉ chọn `splitType`.

**Ngoài phạm vi** (theo `documentation/epic-5/BR.md` mục A.6):
- Tổng hợp chi phí toàn bữa theo thành viên và nhóm thanh toán, giải thuật quyết toán (`SELF_SETTLEMENT`, `HOST_MEDIATED`) và tick "Đã thanh toán": thuộc Epic 6.
- Lưu trữ bữa (`ARCHIVED`) và dọn dẹp hoá đơn, món, file khi lưu trữ: thuộc Epic 7.
- Chia sẻ tin nhắn thanh toán và Custom URL Snapshot: thuộc Epic 8.
- Gán nhiều người ứng tiền trên cùng một hoá đơn. Mỗi hoá đơn có đúng một người ứng; nếu hai người chia nhau trả tại quầy thì tách thành hai hoá đơn trong cùng kèo.
- Chia món theo số tiền tuyệt đối tuỳ ý cho từng người. Hệ thống chia theo tỷ lệ số phần `shares` nguyên dương.

**Chưa hoàn tất khi lưu trữ**: kiểm thủ công trên trình duyệt ở 375 px và bằng bàn phím; test component cho `ItemInlineFormDialog`; test riêng cho khoá nút UI khi `TOTAL_ONLY` và khoá `readOnly` khi `ARCHIVED`. Chi tiết nằm trong `tasks.md`.

## Nguồn lịch sử
- Tài liệu gốc: `documentation/epic-5/BR.md` (mục A.1 đến A.6), `documentation/epic-5/SA.md` (nguyên văn trong `design.md` của change này), và mục "EPIC 5" cùng các dòng STT 1, 5, 6, 7, 13, 15, 23 của ma trận truy vết trong `documentation/04-epics-and-roadmap.md`.
- Commit đầu tiên của `documentation/epic-5`: `a144fd2`, ngày 2026-10-19 (khi tài liệu còn nằm ở thư mục `docs/epic-5`). Lệnh `git log -- documentation/epic-5` không kèm `--follow` chỉ liệt kê commit đổi tên, nên phải dùng `--follow` để thấy commit này.
- Commit cuối cùng: `d492cfe`, ngày 2026-10-19, đổi tên thư mục `docs` thành `documentation`.
- Trạng thái ghi trong BR: Đã triển khai, còn kiểm thủ công ở 375 px trước khi đóng Epic.
