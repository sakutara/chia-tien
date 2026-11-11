# Proposal

## Why

Thiết kế gốc trong `documentation/` không có một số tính năng mà chủ dự án đã thêm vào code sau đó, và có một quy tắc đã đổi. Cụ thể:

- Tài khoản ngân hàng của thành viên được xếp vào ngoài phạm vi ở Epic 2 (`documentation/epic-2/BR.md`, mục A.6). `documentation/epic-2/SA.md` không đề cập tới tài khoản ngân hàng.
- Slide thanh toán, mã VietQR, ảnh PNG các khoản chuyển và nút mở app ngân hàng không có trong tài liệu Epic 8 (`documentation/epic-8/BR.md`, `documentation/epic-8/SA.md`). Epic 8 chỉ có tin nhắn văn bản, sao chép và chia sẻ qua menu của thiết bị.
- Hộp thoại chia sẻ của Epic 8 có tuỳ chọn "Chỉ liệt kê khoản chưa thanh toán". Tuỳ chọn này đã bị bỏ, và nút gửi nhanh đã đổi nhóm ứng dụng.
- Epic 5 (`documentation/epic-5/BR.md`, BR-5.6 và R-6) quy định món mới ở chế độ `BY_ITEM` chưa có người ăn thì để trống và hiện cảnh báo. Code hiện tự gán cả kèo cho các món đó.

Các thay đổi này được thực hiện trong các commit từ ngày 2026-10-21 đến 2026-10-30 mà không cập nhật tài liệu. Change này ghi lại chúng để lịch sử liền mạch: thiết kế gốc (các archive Epic) cộng với các change này cho ra spec hiện tại.

Thông điệp commit chỉ mô tả tính năng và không nêu lý do thay đổi. Lý do cụ thể không xác định được từ lịch sử.

## What Changes

- Tài khoản ngân hàng của thành viên gồm ngân hàng, tên chủ tài khoản và số tài khoản, lưu trong danh bạ và dùng chung cho mọi bữa. Hồ sơ "Tôi" dùng cùng cách nhập. Phần này đã có từ bản khởi tạo `a144fd2`, không do commit nào trong change này thêm mới.
- Nhóm thanh toán được lưu vào danh bạ như một hồ sơ nhóm, và có thể thêm vào bữa khác như một người (`ae13221`).
- Tài khoản nhận của nhóm lấy từ thành viên đầu tiên có thông tin ngân hàng, không dùng đại diện nhóm (`ae13221`).
- **BREAKING** Bỏ tuỳ chọn "Chỉ liệt kê khoản chưa thanh toán" trong hộp thoại chia sẻ. Tin nhắn luôn liệt kê toàn bộ khoản chuyển của bữa (`f5261e5`).
- **BREAKING** Nút gửi nhanh trong hộp thoại chia sẻ chỉ còn Facebook và Zalo, và gửi kèm link thay vì nội dung tin nhắn. Trước đó là SMS, Telegram, WhatsApp và Email (`f5261e5`).
- Thêm chế độ "Gửi QR" trong hộp thoại chia sẻ, xuất ảnh PNG các khoản chuyển, tải về máy và chia sẻ qua menu của thiết bị nếu được hỗ trợ (`f5261e5`).
- Thêm nút QR ở từng khoản chuyển trong mục quyết toán. Khoản đã tick thanh toán không có nút này (`f5261e5`, `ae13221`).
- Slide thanh toán và mã VietQR chuyển khoản. Phần này đã có từ bản khởi tạo `a144fd2`, nhưng chưa được mô tả trong tài liệu Epic 8.
- Nút "Thanh toán bằng ngân hàng" trong link Snapshot (`a8824ca`).
- Deep link mở thẳng app ngân hàng theo danh sách VietQR, dùng mã ngân hàng VietQR ở tham số `ba=` thay vì mã BIN (`d7c1f71`, `b8d8e4c`, `6d86082`).
- **BREAKING** Khi hoá đơn ở chế độ `BY_ITEM`, món chưa có người ăn được gán toàn bộ người trong kèo, mỗi người một phần. Việc này xảy ra khi tạo hoá đơn, khi chuyển sang `BY_ITEM` và khi lưu hoá đơn (`ae13221`). Thay đổi này khác với BR-5.6 và R-6 của Epic 5.

## Capabilities

### New Capabilities

Không có.

### Modified Capabilities

- `member-directory`: thêm lưu nhóm thanh toán vào danh bạ, và bốn requirement về tài khoản ngân hàng của thành viên.
- `payment-sharing-snapshot`: đổi hộp thoại chia sẻ, đổi nội dung tin nhắn, đổi cách chọn tài khoản nhận của nhóm, bỏ tuỳ chọn lọc khoản chưa thanh toán, và thêm slide, app ngân hàng, ảnh PNG và nút QR từng khoản.
- `bill-splitting`: đổi hành vi gán người ăn của món ở chế độ `BY_ITEM`.

## Impact

Mã nguồn bị ảnh hưởng:

- `app/src/domain/banks.ts`, `app/src/domain/vietQr.ts`, `app/src/domain/paymentSlides.ts`
- `app/src/lib/paymentImage.ts` (mới trong `f5261e5`)
- `app/src/hooks/useMealPaymentSlides.ts` (mới trong `f5261e5`)
- `app/src/components/share/ShareMealDialog.tsx`, `app/src/components/share/PaymentSlides.tsx`
- `app/src/components/settlement/TransferInstructionList.tsx`
- `app/src/components/people/MemberBankDialog.tsx`, `app/src/components/profile/MyProfileDialog.tsx`
- `app/src/services/memberService.ts`, `app/src/services/mealPeopleService.ts`, `app/src/services/invoiceService.ts`, `app/src/services/snapshotService.ts`
- `app/src/types/index.ts` (`BankAccount`, `Member.bank`, `Member.groupMemberIds`)

Dữ liệu: không đổi schema Dexie. `app/src/db/db.ts` vẫn chỉ có `version(1)`. Bảng `members` có thêm hai trường tuỳ chọn là `bank` và `groupMemberIds`. Bản ghi cũ không có hai trường này vẫn hợp lệ. Hoá đơn `BY_ITEM` đã lưu với món trống không được gán lại khi mở. Món chỉ được gán khi tạo hoá đơn, khi chuyển chế độ hoặc khi lưu lại hoá đơn.

Phần ngoài phạm vi của change này:

- Đọc bill bằng AI, OCR và Gemini. Commit `f5261e5` có đụng tới các file này, nhưng thuộc change khác.
- Nén và rút gọn link Snapshot (`8030400`, `98c8184`, `2bbd628`, `83fec8d`). Các commit này thuộc change `2026-10-19-shorten-snapshot-link` và không được ghi lại ở đây.
- Cách làm tròn số tiền quyết toán. Chỗ lệch này được ghi trong `design.md`, nhưng thuộc capability `settlement`.
- Giảm kích cỡ ảnh hoá đơn (`imageCompress`), thuộc `invoice-management`.
- Công tắc "Mỗi người tự chuyển trực tiếp" trong `SettlementPanel.tsx`, thuộc `settlement`.

## Nguồn lịch sử

Commit:

- `f5261e5` (2026-10-21): Cập nhật tính năng chia tiền, chia sẻ QR và đọc bill
- `a8824ca` (2026-10-30): Thêm nút "Thanh toán bằng ngân hàng" vào link snapshot
- `d7c1f71` (2026-10-30): Thêm deep link mở thẳng app ngân hàng (MB, VietinBank, BIDV, ACB)
- `b8d8e4c` (2026-10-30): Mở rộng deep link app ngân hàng theo danh sách VietQR
- `6d86082` (2026-10-30): Sửa deep link: dùng mã ngân hàng VietQR ở ba= thay vì BIN
- `ae13221` (2026-10-22): Cải thiện kèo, nhóm và chuyển tiền. Commit này không thuộc `f5261e5`, nhưng chứa thay đổi về chia từng món, nhóm trong danh bạ và tài khoản nhận của nhóm.

Bản khởi tạo `a144fd2` (2026-10-19) chứa cả code lẫn tài liệu. Các phần đã có ở bản này: `MemberBankDialog`, `banks.ts`, `vietQr.ts`, `paymentSlides.ts`, `PaymentSlides.tsx`, nút "Chỉ khoản chưa trả" và danh sách gửi nhanh SMS, Telegram, WhatsApp, Email.

Tài liệu cũ bị thay thế hoặc chưa khớp:

- `documentation/epic-2/BR.md`, mục A.6 (tài khoản ngân hàng ngoài phạm vi)
- `documentation/epic-2/SA.md` (không đề cập tài khoản ngân hàng)
- `documentation/epic-5/BR.md`, BR-5.6 và R-6 (món chưa có người ăn)
- `documentation/epic-5/SA.md`, dòng kiểm thử tương thích về cảnh báo món chưa có người ăn
- `documentation/epic-8/BR.md`, BR-8.5, BR-8.6, R-4 và R-5 (tuỳ chọn lọc khoản chưa thanh toán, nút gửi nhanh)
- `documentation/epic-8/SA.md`, các mục tương ứng với BR-8.5 và BR-8.6
- `documentation/01-architecture-and-data-model.md`, mục 3.1 (`Member` không có `bank` và `groupMemberIds`)
- `documentation/02-business-logic-and-algorithms.md`, mục 1.2 (cách làm tròn, xem `design.md`)
