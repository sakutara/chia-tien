# Proposal

## Why

Thiết kế gốc của Epic 5 ([BR.md](../../../../documentation/epic-5/BR.md), [SA.md](../../../../documentation/epic-5/SA.md)) cho hiển thị danh sách món trong thẻ hoá đơn nhưng không quy định số thứ tự món và không có thao tác đổi vị trí món. Lý do cụ thể để thêm thứ tự món không xác định được từ lịch sử: thông điệp commit chỉ ghi nội dung thay đổi.

Ban đầu chủ dự án thử đổi vị trí bằng kéo thả (commit `913bac2`, ngày 2026-10-24). Ngày hôm sau, commit `98fb808` (ngày 2026-10-25) bỏ kéo thả vì bị giật trên điện thoại, và thay bằng hai nút chuyển món lên và xuống. Cùng commit đó, cách hiển thị một dòng món cũng đổi từ `SL × đơn giá` sang `đơn giá × SL`. Thiết kế gốc không có nội dung nào về việc này, nên change này ghi lại các thay đổi đó để lịch sử liền mạch.

## What Changes

- Mỗi món trong danh sách của hoá đơn `ITEMIZED` có số thứ tự hiển thị bắt đầu từ 1, số này không sửa được và được tính theo vị trí hiện tại của món trong danh sách.
- Mỗi món có hai nút chuyển lên và chuyển xuống nằm dọc bên trái. Nút lên bị vô hiệu ở món đầu tiên, nút xuống bị vô hiệu ở món cuối cùng. Bấm nút thì món đổi chỗ với món liền kề và thứ tự mới được lưu.
- Thứ tự được lưu vào trường `orderIndex` của `InvoiceItem`, là số liên tục bắt đầu từ 0. Việc đổi thứ tự không đổi tiền hay người ăn của món nào.
- Dòng món hiển thị theo thứ tự `đơn giá × số lượng = thành tiền` (trước đây theo thiết kế gốc là `SL × đơn giá`). Dòng tóm tắt món trong thẻ kèo cũng đổi theo cùng thứ tự này. Form sửa món đổi thứ tự hai ô, đơn giá đứng trước số lượng.
- Kéo thả để đổi vị trí món (commit `913bac2`) đã tồn tại một ngày rồi bị thay bằng hai nút lên và xuống (commit `98fb808`). Kéo thả không còn trong code hiện tại.
- Khi bữa ở trạng thái `ARCHIVED`, không hiện nút chuyển, số thứ tự vẫn hiện, và dịch vụ từ chối mọi thao tác đổi thứ tự với mã lỗi `MEAL_ARCHIVED`.

Không có thay đổi **BREAKING** đối với dữ liệu đã lưu, vì `orderIndex` đã có trên `InvoiceItem` từ commit đầu tiên của dự án và schema Dexie không đổi.

## Capabilities

### New Capabilities
- Không có.

### Modified Capabilities
- `bill-splitting`: thêm requirement `Thứ tự món` (đổi vị trí món bằng hai nút lên và xuống, lưu `orderIndex` liên tục từ 0) và requirement `Hiển thị dòng món và số thứ tự` (số thứ tự không sửa được, thứ tự hiển thị `đơn giá × số lượng`, khoá nút chuyển ở bữa đã lưu trữ). Chi tiết nằm trong [specs/bill-splitting/spec.md](specs/bill-splitting/spec.md).

## Impact

- Mã nguồn (`app/src`):
  - `components/invoices/InvoiceItemList.tsx`: danh sách món, số thứ tự, xử lý chuyển lên và xuống với cập nhật lạc quan (optimistic) cho tới khi DB trả về.
  - `components/invoices/InvoiceItemRow.tsx`: dòng món, hai nút chuyển, dòng `đơn giá × SL`, form sửa.
  - `components/invoices/InvoiceCard.tsx`: dùng `InvoiceItemList` thay cho danh sách `InvoiceItemRow` trực tiếp.
  - `components/invoices/sameContent.ts`: hàm so sánh theo nội dung dùng cho `memo`.
  - `components/sessions/SessionCard.tsx`: dòng tóm tắt món đổi thứ tự hiển thị.
  - `services/invoiceService.ts`: hàm `reorderInvoiceItems(invoiceId, orderedIds)`.
  - `i18n/en.ts`: chuỗi tiếng Anh cho nhãn nút chuyển lên và xuống.
- Dữ liệu: không đổi schema Dexie. `InvoiceItem.orderIndex` vẫn là trường cũ và được ghi lại khi lưu hoá đơn.
- Kiểm thử: `components/invoices/InvoiceItemList.test.tsx` (năm test về số thứ tự, chuyển lên, chuyển xuống, biên đầu và cuối, chế độ chỉ đọc) và `services/invoiceService.test.ts` (test đổi thứ tự giữ người ăn và tổng tiền).
- Ngoài phạm vi: change này không đổi cách sắp xếp món ở nơi khác trong code. Phần kéo thả đã bị bỏ và `913bac2` không thêm thư viện nào (không có thay đổi `package.json` trong commit), nên không có thư viện kéo thả nào trong code hiện tại.

## Nguồn lịch sử

- Commit `913bac2`, 2026-10-24, tiêu đề "Thêm số thứ tự món và kéo thả đổi vị trí món trong thẻ hoá đơn". Lịch sử git còn commit `9ca1dea` có cùng thông điệp nhưng khác mã.
- Commit `98fb808`, 2026-10-25, tiêu đề "Thay kéo thả bằng hai nút chuyển món lên/xuống; đơn giá × số lượng". Lịch sử git còn commit `96db381` có cùng thông điệp nhưng khác mã. Thông điệp nêu lý do: "Bỏ kéo thả vì giật trên điện thoại".
- Tài liệu cũ bị thay thế hoặc bổ sung:
  - `documentation/epic-5/BR.md`, mục BR-5.3: danh sách hiển thị món ghi "tên, SL, đơn giá, điều chỉnh phân bổ, thành tiền". Thiết kế gốc không có số thứ tự và không có đổi vị trí món.
  - `documentation/epic-5/BR.md`, mục R-7: thêm, sửa, xoá món. Không nói về đổi thứ tự.
  - `documentation/epic-5/SA.md`, mục B.6 (bảng props của `InvoiceItemRow`): ghi `onEdit` và `onDelete`, và hiển thị `quantity × unitPrice`. Code hiện tại dùng `onDelete(itemId)`, `onMove`, `canMoveUp`, `canMoveDown` và `number`, và hiển thị `unitPrice × quantity`.
  - `documentation/epic-5/SA.md`, mục B.2 và B.3 (cấu trúc thành phần): thiết kế gốc để `InvoiceCard` render trực tiếp các `InvoiceItemRow`. Code hiện tại thêm thành phần `InvoiceItemList` ở giữa.
