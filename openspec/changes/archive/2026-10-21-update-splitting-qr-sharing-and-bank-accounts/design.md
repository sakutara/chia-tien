# Design

## Context

Bản khởi tạo `a144fd2` (2026-10-19) chứa cả code và tài liệu. Các tính năng sau đã có trong bản này, nên không do commit nào trong change này thêm mới: `MemberBankDialog`, `updateMemberBank`, `domain/banks.ts` (mã BIN), `domain/vietQr.ts`, `domain/paymentSlides.ts`, `components/share/PaymentSlides.tsx` (slide có QR), nút "Chỉ khoản chưa trả" và `buildShareTargets` với SMS, Telegram, WhatsApp, Email.

### Chỗ lệch với tài liệu cũ

Các chỗ lệch dưới đây được kiểm trong code hiện tại.

1. **Tài khoản ngân hàng (Epic 2, BR mục A.6).** Tài liệu xếp tài khoản ngân hàng vào ngoài phạm vi. Code có `MemberBankDialog`, `updateMemberBank` trong `services/memberService.ts`, `domain/banks.ts`, và trường `bank` trong `Member` (`types/index.ts`). Hàm `validateAccountNumber` trong `services/memberService.ts` bỏ khoảng trắng, dấu chấm và dấu gạch, rồi kiểm tra bằng `^[A-Za-z0-9]{6,19}$`. Regex này cho phép chữ cái. Nhưng thông báo lỗi `Số tài khoản gồm 6–19 chữ số.` (`i18n/en.ts` có bản dịch tương ứng) lại ghi là chữ số. Chưa sửa.

2. **Slide, mã VietQR, ảnh PNG, deep link (Epic 8).** Tài liệu Epic 8 không mô tả các tính năng này. Code có đủ, như đã liệt kê ở phần Impact trong `proposal.md`.

3. **Món chưa có người ăn ở chế độ `BY_ITEM` (Epic 5, BR-5.6 và R-6).** Tài liệu quy định món để trống và hiện cảnh báo, người dùng gán bằng tay. Code tự gán, và việc này do commit `ae13221` (2026-10-22) làm, không phải `f5261e5`. Cụ thể:
   - `createInvoice` trong `services/invoiceService.ts` gán `everyoneShares(session.participantIds)` cho món khi `splitType` là `BY_ITEM`.
   - `updateInvoice` dùng cùng hàm cho món có danh sách người ăn rỗng sau khi lưu. Món đã có người ăn giữ nguyên.
   - `setInvoiceSplitType` gán cho món rỗng khi chuyển từ `ITEMIZED` sang `BY_ITEM`.
   - Cảnh báo vẫn còn: `InvoiceCard` hiển thị "Còn {n} món chưa chọn người ăn" và nút "Gán cả kèo cho các món trống", `InvoiceItemRow` đổi màu chữ, `SettlementPanel` báo món chưa có người ăn.

4. **Cách làm tròn (02, mục 1.2).** Tài liệu nói cộng dồn số thực và chỉ làm tròn ở bước cuối, rồi bù phần lệch ±1đ vào người đầu tiên. Code làm như sau:
   - Quyết toán (`domain/settlementEngine.ts`, hàm `largestRemainderRound`): cộng dồn số thực trong `acc.raw`, làm tròn ở cuối. Phần thiếu được cộng 1đ cho thành viên có phần thập phân lớn nhất, hoà thì theo thứ tự thành viên trong bữa. Đây là phần khớp với tài liệu về cộng dồn số thực, nhưng cách bù khác.
   - Phân bổ giảm giá, phí phục vụ và VAT (`domain/billMath.ts`): dùng số nguyên và `BigInt`. Phần dư được cộng cho mục có phần thập phân lớn nhất, hoà thì theo thứ tự mục.

   Cả hai đoạn code này có từ `a144fd2`, không có commit nào trong change này sửa. Không xác định được từ lịch sử vì sao chọn phần thập phân lớn nhất thay vì người đầu tiên.

## Goals / Non-Goals

**Goals**

- Ghi đúng lịch sử các thay đổi nằm ngoài thiết kế gốc, kèm mã commit và ngày.
- Mô tả hành vi sau thay đổi khớp với code hiện tại.

**Non-Goals**

- Không sửa code, không sửa `openspec/specs/`, không sửa `documentation/`.
- Không xử lý OCR, Gemini và link Snapshot rút gọn, vì các phần này thuộc change khác.
- Không sửa thông báo lỗi số tài khoản. Chỗ lệch này được ghi nhận, việc sửa để sau.

## Decisions

- **D1. Tài khoản ngân hàng nằm trong `Member.bank`.** Mỗi người có tối đa một tài khoản, dùng cho cả danh bạ và hồ sơ "Tôi" (`MyProfileDialog` gọi cùng `updateMemberBank`). Không có bảng riêng và không đổi version Dexie.

- **D2. Nhóm được lưu trong danh bạ bằng bản ghi `Member` có `groupMemberIds`.** `getOrCreateMember` bỏ qua các bản ghi nhóm khi tìm trùng tên người. `saveGroupContact` trong `services/mealPeopleService.ts` cập nhật hồ sơ nhóm nếu trùng `contactId` hoặc trùng tên nhóm. Nếu tên nhóm trùng với một người đã có thì không lưu hồ sơ nhóm.

- **D3. Mã VietQR được dựng trên trình duyệt** theo chuẩn EMVCo cho dịch vụ NAPAS 247 (`QRIBFTTA`), CRC-16/CCITT-FALSE. Nội dung chuyển khoản được bỏ dấu, tối đa 50 ký tự. Nội dung mặc định là "`<người nợ>` thanh toán `<tên bữa>`" (`domain/vietQr.ts`).

- **D4. Ảnh PNG** được vẽ bằng canvas trong `lib/paymentImage.ts`. `services/snapshotService.ts` import file này động khi cần, để không tải thư viện khi không dùng. Ảnh không có tiêu đề bữa hay thanh tab. Tên file tải về là tên bữa đã cắt khoảng trắng, hoặc `chia-tien` nếu bữa không có tên.

- **D5. Deep link app ngân hàng** dùng `https://dl.vietqr.io/pay`. Tham số `app` lấy theo BIN qua bảng `DEEP_LINK_APPS`. Tham số `ba` có dạng `số tài khoản@mã VietQR`, trong đó mã VietQR là `bankCode` nếu có, nếu không thì là `appId`. Commit `6d86082` đã đổi `ba` từ BIN sang mã VietQR. Ngân hàng không có trong bảng thì dùng menu chia sẻ của thiết bị. Với app không tự điền (`autofill = false`), slide hiện lời nhắc dán thông tin đã sao chép.

- **D6. Gửi nhanh trong hộp thoại chia sẻ** chỉ có Facebook và Zalo, và chỉ gửi link (`buildShareTargets(snapshotUrl)`). Tin nhắn đầy đủ vẫn có nút sao chép và chia sẻ qua menu thiết bị. Công tắc "Gửi QR" chuyển hộp thoại sang chế độ ảnh.

- **D7. Gán người ăn tự động cho món chưa có người ăn** ở chế độ `BY_ITEM` được thực hiện tại `createInvoice`, `updateInvoice` và `setInvoiceSplitType`, bằng hàm `everyoneShares`.

- **D8. Tài khoản nhận của nhóm.** Thứ tự ưu tiên là: chủ trì (chỉ khi bữa ở chế độ `HOST_MEDIATED` và chủ trì nằm trong nhóm), rồi thành viên đầu tiên có thông tin ngân hàng theo thứ tự trong nhóm. Không dùng `representativeId` (`domain/paymentSlides.ts`, commit `ae13221`).

## Risks / Trade-offs

- **Thông báo lỗi số tài khoản không khớp regex.** Người dùng nhập chữ cái sẽ được chấp nhận, nhưng thông báo lỗi lại nói "chữ số". Chưa sửa.
- **Gán người ăn tự động làm giảm số cảnh báo.** Người dùng có thể không để ý món được gán cả kèo, và chia sai nếu có người không ăn món đó.
- **Deep link phụ thuộc dịch vụ bên ngoài `dl.vietqr.io` và danh sách app.** Danh sách app do người phát triển lập từ tài liệu VietQR, và có thể lỗi thời. Không xác định được từ lịch sử đã kiểm tra mở app trên thiết bị thật hay chưa.
- **Mất đường tắt gửi tin nhắn qua SMS, Telegram, WhatsApp và Email.** Người dùng vẫn có thể sao chép hoặc chia sẻ qua menu thiết bị.
- **Chỗ lệch làm tròn** như đã ghi ở phần Context. Không ảnh hưởng tổng tiền cần thu theo tài liệu, nhưng cách bù phần lệch khác.
- **Link quá dài** vẫn có thể bị cắt khi gửi qua ứng dụng chat. Hộp thoại có cảnh báo khi link dài hơn 4000 ký tự.
