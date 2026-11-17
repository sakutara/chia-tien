# Proposal

## Why

Hiện muốn ghi một bill, chủ app phải qua nhiều bước: tạo bữa (nhập tên, ngày), sang bước Hoá đơn, thêm kèo, mở form hoá đơn, rồi mới chụp ảnh. Trường hợp phổ biến nhất là "vừa ăn xong, có một tờ bill, cần chia ngay", và lúc đó mọi thông tin cần thiết (ngày, quán, món, tổng) đã nằm trên tờ bill. Chủ app muốn một nút chụp ngay trên màn hình chính: chụp xong là có bữa, có kèo, có hoá đơn, và được đưa thẳng tới bước thêm người.

## What Changes

- Thêm nút "Chụp bill tạo bữa nhanh" ở màn hình danh sách bữa (màn hình chính), nổi bật và bấm được bằng một tay.
- Sau khi chụp, app tự tạo một bữa `ACTIVE` và một kèo trong bữa đó, lưu ảnh bill, quét OCR và:
  - đọc khớp (trạng thái `OK` hoặc `CORRECTED`, có ít nhất một món, không thiếu dòng hàng): tự lưu hoá đơn vào kèo rồi mở trang làm việc của bữa ở bước 2 "Người";
  - đọc không khớp, không ra món, người dùng từ chối tải bộ đọc chữ, huỷ quét hoặc quét lỗi: mở form hoá đơn (ảnh đã gắn, dữ liệu đọc được đã điền) để người dùng sửa; lưu form xong thì mở bước 2 "Người"; đóng form không lưu thì xoá bữa, kèo và ảnh vừa tạo.
- Ngày bữa lấy theo ngày đọc được trên bill; không đọc được thì là hôm nay. Tên bữa là tên mặc định theo ngày. Kèo được đổi tên theo quán bằng quy tắc sẵn có.
- Trang làm việc của bữa nhận thêm bước mở sẵn: bữa vừa tạo nhanh mở ở bước 2 thay vì bước 1.
- Form hoá đơn nhận thêm id hoá đơn nháp có sẵn ảnh và tự điền từ chữ OCR đã lưu khi mở.

Ngoài phạm vi: chọn ảnh từ thư viện hoặc PDF ở nút tạo nhanh, chụp nhiều ảnh cho một bill ở nút tạo nhanh (thêm ảnh sau trong form hoá đơn), tự thêm người vào bữa.

## Capabilities

### New Capabilities

- `quick-bill-capture`: luồng chụp bill ở màn hình chính để tạo nhanh bữa, kèo và hoá đơn rồi chuyển sang bước thêm người.

### Modified Capabilities

- `meal-management`: trang làm việc của bữa mở sẵn bước 2 "Người" khi bữa vừa được tạo nhanh từ bill.
- `receipt-ocr`: kết quả đọc được lưu thẳng thành hoá đơn trong luồng tạo nhanh khi đã khớp; các trường hợp khác vẫn điền form chưa lưu.

## Impact

Mã nguồn:
- Mới: `app/src/domain/quickBill.ts` (quy tắc quyết định tự lưu, ngày bữa), `app/src/services/quickBillService.ts` (tạo bữa + kèo + ảnh, hoàn tác khi lỗi, tự lưu hoá đơn), `app/src/components/meals/QuickBillCapture.tsx` (nút, camera, tiến trình, form sửa).
- Sửa: `app/src/pages/MealsPage.tsx`, `app/src/pages/MealWorkspacePage.tsx`, `app/src/App.tsx`, `app/src/components/invoices/InvoiceFormDialog.tsx`, `app/src/components/invoices/receiptFormState.ts`, `app/src/i18n/en.ts`.

Dữ liệu: không đổi schema Dexie, không đổi payload snapshot, không đổi `archivedSummary`. Không có lời gọi mạng mới ngoài việc tải bộ đọc chữ OCR đã có (vẫn hỏi trước lần đầu).
