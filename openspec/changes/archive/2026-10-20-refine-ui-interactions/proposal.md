# Proposal

## Why

Thiết kế gốc của app (các tài liệu Epic và tài liệu giao diện, lúc đầu nằm trong thư mục `docs/`, nay là `documentation/`) mô tả nhiều chi tiết giao diện và tương tác khác với mã nguồn. Chủ dự án đã chủ động chọn các cách làm khác đó, nhưng không cập nhật tài liệu.

Lịch sử git cho thấy phần lớn các chỗ lệch đã có ngay từ commit đầu tiên của repo (`a144fd2`, 2026-10-19). Commit đầu tiên chứa cả mã nguồn lẫn tài liệu, nên các chỗ lệch này không phải do một commit sau này đổi hành vi từ đúng tài liệu sang hành vi khác. Chỉ có hai thay đổi có commit riêng sau thiết kế gốc: khoá zoom trang (`c685d38`) và bố cục hàng món trong form hoá đơn (`199d9cc`), cả hai cùng ngày 2026-10-20.

Change này ghi lại các chỗ lệch đó để spec hiện tại có lịch sử liền mạch từ thiết kế gốc. Change không đổi mã nguồn.

## What Changes

Ghi lại các chỗ lệch giữa tài liệu thiết kế gốc và hành vi hiện tại. Không có thay đổi mã nguồn.

- Chọn chủ trì bữa: tài liệu ghi nhóm radio, mã nguồn dùng ô chọn thả xuống (`HostSelector`). Tài liệu `03-ui-ux-and-design-system.md` cũng ghi dropdown, nên mã nguồn khớp với tài liệu 03.
- Thành phần người trong bữa: tài liệu nêu `ParticipantList.tsx` và `PaymentGroupPanel.tsx`; mã nguồn gộp chúng vào `components/people/MemberList.tsx`. Đây là chỗ lệch về tên file, không đổi hành vi nên không có requirement riêng.
- Hộp tạo và sửa nhóm thanh toán: tài liệu ghi làm mờ người đã ở nhóm khác kèm tên nhóm, có ô chọn đại diện. Mã nguồn ẩn người đã ở nhóm khác và không có ô chọn đại diện.
- Xác nhận thao tác phá huỷ: tài liệu Epic 2 ghi `window.confirm`, tài liệu Epic 3 (BR-3.12) yêu cầu thay bằng hộp xác nhận của app. Mã nguồn dùng `ConfirmDialog`.
- Người tham gia kèo: tài liệu ghi hộp thoại `SessionParticipantsDialog`. Mã nguồn chọn tại chỗ trong thẻ kèo (`SessionCard`) bằng `PeoplePicker`, với nhãn "Tham gia:".
- Trạng thái mở và thu gọn kèo: tài liệu (BR-4 R-17) ghi kèo mới mở sẵn và thu gọn các kèo khác khi bữa có từ 4 kèo. Mã nguồn thu gọn mọi kèo mặc định.
- Bỏ người khỏi kèo đang được dùng: mã nguồn trả lỗi `SESSION_MEMBER_IN_USE` và không có thay đổi. Mã lỗi này cũng được tài liệu (epic-4 SA mục 5.2, epic-5 BR R-9) quy định, nên đây không phải chỗ lệch về hành vi và không có delta.
- Sửa món hoá đơn: tài liệu ghi hộp thoại `ItemInlineFormDialog`. Mã nguồn sửa tại chỗ bằng Popover trong `InvoiceItemRow`.
- Chia đều trong hoá đơn: tài liệu ghi các nút pill riêng cho từng người và nút "Chọn tất cả". Mã nguồn dùng `PeoplePicker` chế độ nhiều lựa chọn, vẫn có nút "Chọn tất cả".
- Sửa thông tin bữa: tài liệu BR-3.9 ghi nút "Sửa thông tin" ở thanh đầu trang bữa. Mã nguồn sửa tên, ngày và ghi chú tại chỗ bằng `InlineText`, không có nút đó. Tài liệu 03 cũng ghi sửa tại chỗ thay cho nút.
- Điều hướng: tài liệu SA Epic 3 ghi `useHashRoute` trả `{ name: 'notFound' }`. Mã nguồn đưa đường dẫn sai định dạng về danh sách bữa, và chỉ hiện "Không tìm thấy bữa này" khi mã đúng định dạng nhưng bữa không tồn tại.
- Lưới lịch: tài liệu Epic 3 (R-12) ghi lưới 5 hoặc 6 hàng. Mã nguồn tính số tuần theo số ngày thực tế, nên có tháng chỉ có 4 hàng (ví dụ tháng 2/2027).
- Xoá ảnh trùng: nút "Xoá ảnh trùng" xoá ngay, không hỏi xác nhận. Tài liệu BR-3.12 yêu cầu hộp xác nhận cho mọi hành động phá huỷ.
- Khoá zoom trang: thêm mới ở commit `c685d38`. Tài liệu không có quy định nào về zoom.
- Bố cục hàng món trong form hoá đơn: thay đổi ở commit `199d9cc`. Tài liệu không mô tả bố cục hàng món trong form.

## Capabilities

### New Capabilities
Không có.

### Modified Capabilities
- `design-system`: khoá phóng to trang (ghi lại lịch sử, nội dung đã có trong spec), hộp xác nhận `ConfirmDialog` dùng cho mọi thao tác phá huỷ thay cho `window.confirm`, và thêm requirement bố cục hàng món trong form hoá đơn.
- `meal-management`: chế độ xem Lịch (số hàng của lưới), sửa thông tin bữa (không có nút "Sửa thông tin"), điều hướng bằng đường dẫn hash (xử lý đường dẫn sai định dạng).
- `meal-people-and-payment-groups`: chọn chủ trì bằng ô chọn thả xuống, người đã ở nhóm khác bị ẩn khỏi hộp tạo nhóm, người đại diện không có ô chọn trong giao diện, xác nhận thao tác làm mất trạng thái dùng `ConfirmDialog`.
- `session-management`: người tham gia kèo chọn tại chỗ trong thẻ kèo, và thêm requirement thu gọn và mở rộng kèo (mặc định thu gọn).
- `bill-splitting`: sửa món tại chỗ bằng Popover thay cho hộp thoại, chia đều dùng `PeoplePicker` chế độ nhiều lựa chọn.
- `invoice-management`: nút "Xoá ảnh trùng" xoá ngay không hỏi xác nhận. Đây là capability ngoài danh sách được giao cho change này, được thêm vì mục này không thuộc năm capability được giao.

## Impact

- Mã nguồn: không đổi. Các file liên quan đã đọc để kiểm chứng gồm `app/index.html`, `app/src/main.tsx`, `app/src/index.css`, `app/src/components/invoices/InvoiceItemsEditor.tsx`, `app/src/components/invoices/InvoiceItemRow.tsx`, `app/src/components/invoices/EqualSplitPicker.tsx`, `app/src/components/invoices/InvoiceFormDialog.tsx`, `app/src/components/people/HostSelector.tsx`, `app/src/components/people/MemberList.tsx`, `app/src/components/people/PaymentGroupDialog.tsx`, `app/src/components/sessions/SessionCard.tsx`, `app/src/components/meals/MealInfo.tsx`, `app/src/components/meals/MealCalendarView.tsx`, `app/src/lib/dates.ts`, `app/src/hooks/useHashRoute.ts`, `app/src/pages/MealWorkspacePage.tsx`, `app/src/services/mealPeopleService.ts`, `app/src/services/sessionService.ts`.
- Dữ liệu: không đổi, không có thay đổi schema Dexie.
- Ngoài phạm vi: không sửa `openspec/specs/` hiện có, không sửa `documentation/`, không đổi hành vi nào. Các chỗ tài liệu tự mâu thuẫn (ví dụ BR-3.9 và tài liệu 03 về nút "Sửa thông tin") được ghi nhận trong `design.md` mà không chọn bên nào làm chuẩn.
- Nhánh `ItemInlineFormDialog` và `SessionParticipantsDialog` không tồn tại trong mã nguồn ở bất kỳ commit nào. Chúng chỉ tồn tại trong tài liệu.

## Nguồn lịch sử

- Tài liệu gốc (commit `a144fd2`, 2026-10-19, "Initial commit: fee calculator app (Vite + React) and docs", khi đó tài liệu nằm trong `docs/`; về sau đổi thành `documentation/` ở `d492cfe` và `9b44ad2`):
  - `docs/epic-2/SA.md`, nay là `documentation/epic-2/SA.md`: mục bảng component (`ParticipantList`, `HostSelector` radio group, `PaymentGroupPanel`, `PaymentGroupDialog`) và mục "Hộp xác nhận `window.confirm`" trong bảng rủi ro.
  - `docs/epic-3/BR.md`, nay là `documentation/epic-3/BR.md`: BR-3.9 (nút Sửa thông tin), BR-3.12 (hộp xác nhận thay `window.confirm`), R-12 (lịch 5 hoặc 6 hàng), R-17 (không tìm thấy bữa).
  - `docs/epic-3/SA.md`, nay là `documentation/epic-3/SA.md`: mục `useHashRoute` trả `notFound`, Q-7 về `window.confirm`.
  - `docs/epic-4/BR.md`, nay là `documentation/epic-4/BR.md`: BR-4.3 (người tham gia kèo), R-17 (mở và thu gọn kèo), AC-17 (ảnh trùng).
  - `docs/epic-4/SA.md`, nay là `documentation/epic-4/SA.md`: `SessionParticipantsDialog`, mục 5.2 về đổi người tham gia kèo và mã lỗi `SESSION_MEMBER_IN_USE`.
  - `docs/epic-5/SA.md`, nay là `documentation/epic-5/SA.md`: `ItemInlineFormDialog`, `EqualSplitPicker` có nút "Chọn tất cả".
  - `docs/03-ui-ux-and-design-system.md`, nay là `documentation/03-ui-ux-and-design-system.md`: mục 1 (sửa tại chỗ), mục 4 (chủ trì dạng dropdown), mục cảnh báo ảnh trùng.
- Commit có thay đổi riêng sau thiết kế gốc:
  - `c685d38`, 2026-10-20, "Khoá zoom: viewport không cho phóng to, touch-action, chặn gesture/chạm đúp/Ctrl+wheel" (sửa `app/index.html`, `app/src/index.css`, `app/src/main.tsx`). Bản sao cùng thông điệp và cùng ngày trên nhánh khác: `33a4a5e`.
  - `199d9cc`, 2026-10-20, "Form hoá đơn: tên món gần tràn hàng kèm nút xoá; hàng 2 dạng [đơn giá] × [SL] = [thành tiền] full chiều ngang" (sửa `app/src/components/invoices/InvoiceItemsEditor.tsx`). Bản sao trên nhánh khác: `f613325`.
- Commit đầu tiên `a144fd2` là nguồn của mọi chỗ lệch khác trong danh sách trên, vì mã nguồn tại đó đã có hành vi hiện tại. Lý do của từng lựa chọn không xác định được từ lịch sử, trừ khoá zoom và bố cục hàng món (xem `design.md`).
