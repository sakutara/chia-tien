# Design

## Context

Thiết kế gốc gồm các tài liệu Epic 2 đến Epic 5 và tài liệu giao diện `03-ui-ux-and-design-system.md`. Ban đầu chúng nằm trong `docs/` (commit `a144fd2`, 2026-10-19) và được đổi tên thành `documentation/` ở các commit `d492cfe` và `9b44ad2`.

Mã nguồn tại commit `a144fd2` đã có phần lớn hành vi hiện tại. Không có commit nào sau đó đổi các hành vi này từ đúng tài liệu sang sai tài liệu. Vì vậy phần lớn các chỗ lệch là lệch ngay từ đầu, không phải do thay đổi sau này. Các chỗ lệch có commit riêng gồm khoá zoom trang và bố cục hàng món trong form hoá đơn, cả hai ngày 2026-10-20.

Chủ dự án xác nhận các chỗ lệch là lựa chọn có chủ đích. Lý do của từng lựa chọn không xác định được từ lịch sử, trừ khi có ghi chú dưới đây.

## Goals / Non-Goals

**Goals**
- Ghi lại từng chỗ lệch giữa tài liệu và mã nguồn, kèm nguồn tài liệu và nguồn commit.
- Chia delta vào đúng capability của từng chỗ lệch, để spec hiện tại mô tả đúng hành vi đang chạy.
- Nêu rõ các chỗ tài liệu tự mâu thuẫn, không tự chọn bên nào.

**Non-Goals**
- Không đổi mã nguồn, không đổi hành vi, không đổi schema Dexie.
- Không sửa tài liệu cũ trong `documentation/` và không sửa spec hiện có trong `openspec/specs/`.
- Không đánh giá hành vi nào đúng hơn.

## Decisions

### Bảng các chỗ lệch

| Chỗ lệch | Tài liệu nói | Mã nguồn hiện tại | Nguồn lịch sử |
|---|---|---|---|
| Chọn chủ trì | Nhóm radio (epic-2 SA); dropdown (03 mục 4.3) | `HostSelector` là thẻ `select` | Có từ `a144fd2` |
| Thành phần người trong bữa | `ParticipantList.tsx`, `PaymentGroupPanel.tsx` | Gộp vào `components/people/MemberList.tsx` | Tên file `ParticipantList` và `PaymentGroupPanel` chưa từng có trong git; `MemberList` có từ `a144fd2` |
| Hộp nhóm thanh toán | Làm mờ người đã ở nhóm khác kèm tên nhóm; có ô chọn đại diện (epic-2 SA) | Ẩn người đã ở nhóm khác; không có ô chọn đại diện, đại diện giữ nguyên khi sửa | Có từ `a144fd2` |
| Hộp xác nhận | `window.confirm` (epic-2 SA); hộp của app bắt buộc (BR-3.12) | `ConfirmDialog` | Có từ `a144fd2` |
| Người tham gia kèo | `SessionParticipantsDialog`, nhãn `Người tham gia kèo (k/n)` (epic-4 SA, BR-4.3) | Chọn tại chỗ trong `SessionCard` bằng `PeoplePicker`, nhãn "Tham gia:" | Có từ `a144fd2` |
| Mở và thu gọn kèo | Kèo mới mở sẵn; thu gọn các kèo khác khi bữa có từ 4 kèo (epic-4 BR R-17) | Mọi kèo thu gọn mặc định (`useState(false)`) | Có từ `a144fd2` |
| Kèo có người đang được dùng | Mã lỗi `SESSION_MEMBER_IN_USE` (epic-4 SA 5.2, epic-5 BR R-9) | Trả lỗi `SESSION_MEMBER_IN_USE` | Có từ `a144fd2`, khớp tài liệu, không phải chỗ lệch |
| Sửa món | Hộp thoại `ItemInlineFormDialog` (epic-5 SA) | Popover sửa tại chỗ trong `InvoiceItemRow` | Popover có từ `a144fd2`; `ItemInlineFormDialog` chưa từng có trong git |
| Chia đều | Nút pill cho từng người và nút "Chọn tất cả" (epic-5 SA) | `PeoplePicker` chế độ `multi`, có nút "Chọn tất cả" | Có từ `a144fd2` |
| Sửa thông tin bữa | Nút "Sửa thông tin" ở thanh đầu (BR-3.9); sửa tại chỗ thay cho nút (03 mục 1) | `InlineText` cho tên, ngày, ghi chú; không có nút | `InlineText` có từ `a144fd2`; hai tài liệu mâu thuẫn nhau |
| Đường dẫn không hợp lệ | `useHashRoute` trả `{ name: 'notFound' }` (epic-3 SA) | Đưa về danh sách bữa; chỉ đường dẫn đúng định dạng mà bữa không có mới hiện "Không tìm thấy bữa này" | Có từ `a144fd2` |
| Lưới lịch | 5 hoặc 6 hàng (epic-3 BR R-12) | Số hàng theo ngày thực tế, từ 4 đến 6 | `buildMonthGrid` có từ `a144fd2` |
| Xoá ảnh trùng | Hộp xác nhận cho mọi hành động phá huỷ (BR-3.12) | Xoá ngay | Có từ `a144fd2` |
| Khoá zoom | Không có quy định | Khoá zoom trang | Thêm ở `c685d38`, 2026-10-20 |
| Bố cục hàng món | Không mô tả trong tài liệu | Hàng 1: tên món và nút xoá; hàng 2: `[đơn giá] × [SL] = [thành tiền]` | Thêm ở `199d9cc`, 2026-10-20 |

### Ghi chú về các lựa chọn

- **Khoá zoom (`c685d38`)**: commit message ghi "Khoá zoom: viewport không cho phóng to, touch-action, chặn gesture/chạm đúp/Ctrl+wheel". Comment trong `app/src/main.tsx` giải thích lý do: iOS Safari bỏ qua `user-scalable=no`, nên phải chặn thêm các sự kiện `gesturestart`, `gesturechange`, `gestureend`. Chặn chạm đúp bằng `touchend` trong 300 ms. Trên máy tính, chặn lăn chuột khi giữ phím Ctrl (`e.ctrlKey`), kể cả chụm trên touchpad. Comment trong code có nói "Ctrl/Cmd", nhưng điều kiện chỉ kiểm `ctrlKey`, nên phím Cmd trên macOS không nằm trong điều kiện này. Phần CSS đặt `touch-action: pan-x pan-y` và `-webkit-text-size-adjust: 100%` trên `html`.
- **Bố cục hàng món (`199d9cc`)**: commit message ghi "tên món gần tràn hàng kèm nút xoá; hàng 2 dạng [đơn giá] × [SL] = [thành tiền] full chiều ngang". Hàng 2 dùng lưới `grid-cols-[6.5rem_auto_3.5rem_auto_minmax(0,1fr)]`, trong đó ô thành tiền co giãn để hàng luôn đầy chiều ngang. Lý do chi tiết ngoài commit message không xác định được từ lịch sử.
- **Không có thay đổi schema**: mọi chỗ lệch là lớp giao diện hoặc luồng tương tác. Không có thay đổi schema Dexie, không cần migration dữ liệu, không ảnh hưởng link snapshot hay link cũ.
- **Tên component không khớp tài liệu**: `ParticipantList`, `PaymentGroupPanel`, `SessionParticipantsDialog`, `ItemInlineFormDialog` chưa từng xuất hiện trong mã nguồn ở bất kỳ commit nào. Đây chỉ là khác biệt về tên và cấu trúc, không đổi hành vi, nên chỉ ghi ở đây và không tạo requirement riêng.
- **Chỗ tài liệu tự mâu thuẫn**: về chọn chủ trì, epic-2 SA ghi radio nhưng 03 mục 4.3 ghi dropdown; về sửa thông tin bữa, BR-3.9 ghi có nút nhưng 03 mục 1 ghi sửa tại chỗ thay cho nút. Mã nguồn khớp với tài liệu 03 trong cả hai trường hợp. Change này không chọn tài liệu nào làm chuẩn, chỉ ghi lại cả hai.
- **Hộp xác nhận khi bỏ người đang được dùng**: tài liệu epic-4 SA 5.2 và epic-5 BR R-9 quy định trả lỗi `SESSION_MEMBER_IN_USE`, không quy định hộp xác nhận. Vì vậy hành vi hiện tại khớp tài liệu và change này không ghi delta cho mục này.
- **Chưa rõ lý do cho các lựa chọn còn lại**: lý do đổi từ hộp thoại sang sửa tại chỗ, từ radio sang dropdown, từ nút "Xoá ảnh trùng" có xác nhận sang xoá ngay, và từ 5 hoặc 6 hàng sang số hàng thực tế đều không xác định được từ lịch sử.
- **Nút sửa bữa còn sót lại**: `MealFormDialog` vẫn có nhánh `mode="edit"` với tiêu đề "Sửa thông tin bữa", nhưng `MealsPage` chỉ dùng `mode="create"`. Nhánh sửa là mã không còn dùng trong giao diện.

### Quy tắc viết delta

- Requirement đã có trong spec hiện tại thì dùng `## MODIFIED Requirements`, viết lại đầy đủ nội dung sau khi đổi, kèm dòng `**Trước đây**`.
- Requirement chưa có trong spec hiện tại (chế độ thu gọn kèo trong `session-management`, bố cục hàng món trong `design-system`) dùng `## ADDED Requirements`. Lý do: không có requirement gốc để sửa.
- Requirement đã có trong spec hiện tại nhưng nội dung đổi hoặc cần ghi lại lịch sử (khoá phóng to trang, hộp xác nhận `ConfirmDialog` trong `design-system`) dùng MODIFIED với dòng `**Trước đây**`, đúng tên requirement đã có.

## Risks / Trade-offs

- **Spec mô tả hành vi hiện tại, không phải tài liệu gốc**: người đọc spec sẽ không thấy các lựa chọn tài liệu gốc. Đã khắc phục bằng dòng `**Trước đây**` trong từng MODIFIED.
- **Khoá zoom có thể gây khó khăn cho người cần phóng to chữ**: đây là đánh đổi đã chọn có chủ đích cho ứng dụng này. Không có cơ chế thay thế trong change này.
- **Chặn chạm đúp và Ctrl+wheel toàn cục**: ảnh hưởng mọi phần tử trong trang, không chỉ khu vực nhập liệu.
- **Không kiểm chứng lại trên thiết bị**: change này chỉ đối chiếu văn bản và mã nguồn, không chạy ứng dụng để kiểm tra hành vi.
