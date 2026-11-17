# Design

## Context

Màn hình chính (`MealsPage`) chỉ có nút "Tạo bữa mới" mở form. Ảnh hoá đơn phải gắn với `mealId`, `sessionId`, `invoiceId` ngay khi lưu (`addInvoiceImage` kiểm tra bữa `ACTIVE`), và ngày trên bill chỉ biết sau khi OCR xong. Form hoá đơn tự sinh id nháp và dọn ảnh nháp khi đóng mà không lưu.

## Goals / Non-Goals

- Goals: một lần bấm + một lần chụp là có bữa, kèo, hoá đơn; đến thẳng bước thêm người. Không lưu số tiền chưa đối chiếu được mà không cho người dùng xem.
- Non-Goals: chọn ảnh thư viện/PDF hoặc nhiều ảnh ở nút tạo nhanh; đổi cách OCR hay bộ phân tích; thêm người tự động.

## Decisions

1. **Thứ tự: tạo bữa (hôm nay) → kèo → lưu ảnh → OCR → cập nhật ngày bữa.** Ảnh cần `mealId` trước khi biết ngày bill, nên bữa được tạo với hôm nay rồi `updateMealInfo` khi đọc được ngày hợp lệ. Phương án tạo bữa sau OCR bị loại vì phải giữ ảnh ngoài kho lưu trữ, mất ảnh nếu trình duyệt giải phóng trang.
2. **Hoàn tác:** lưu ảnh lỗi, hoặc người dùng đóng form sửa mà không lưu, thì gọi `deleteMeal` cho bữa vừa tạo (xoá cả kèo và ảnh). Lỗi OCR không hoàn tác mà chuyển sang form.
3. **Quy tắc tự lưu nằm ở `domain/quickBill.ts`** (hàm thuần `canAutoSaveReceipt(check)` và `quickMealDate(billDate, today)`), có test đơn vị. Điều kiện: `status ∈ {OK, CORRECTED}`, `receipt.items.length ≥ 1`, không có `missingRows`. Hai trạng thái này đã bảo đảm tổng tính bằng tổng ghi trên bill; service vẫn so `computeInvoice(draft).bill.totalAmount` với `billTotal` và rơi về form nếu lệch.
4. **Bản nháp hoá đơn dựng bằng cùng đường với form:** `fillFromReceipt` → hàm mới `draftFromFill` trong `receiptFormState.ts` (dùng `parseItemRows`, `parseAdjustment`), để hoá đơn tự lưu giống hệt hoá đơn người dùng bấm Lưu mà không sửa gì. `autoNameSession: true`, `inputMode: 'ITEMIZED'`, `splitType: 'EQUAL_TOTAL'`, người ứng là chủ trì.
5. **Form sửa mở ngay trên màn hình chính** (trong `QuickBillCapture`), dùng `InvoiceFormDialog` với hai prop mới: `draftInvoiceId` (dùng id nháp đã có ảnh) và `initialNotice`. Khi có `draftInvoiceId`, form điền từ `ocrRawText` đã lưu lúc mở, không chạy lại OCR và không hỏi lại việc tải bộ đọc chữ.
6. **Bước mở sẵn truyền trong bộ nhớ**, không đưa vào URL: `App` giữ `{ mealId, step }` và truyền `initialStep` cho `MealWorkspacePage`. Định dạng `#/meal/<id>` và quy tắc tải lại trang không đổi.
7. **Ảnh nháp truyền vào do nơi gọi dọn:** khi có `draftInvoiceId`, form không tự xoá ảnh nháp lúc đóng (StrictMode chạy cleanup ngay khi mở, sẽ xoá mất ảnh vừa chụp). `QuickBillCapture` dọn bằng `cancelQuickBill` khi form đóng mà không lưu.
8. **Không kiểm tra ảnh trùng** trong luồng tạo nhanh: bữa mới chỉ có một ảnh.

## Dữ liệu và các điểm riêng của dự án

- Schema Dexie: không đổi. Payload snapshot: không đổi, link cũ vẫn mở được. `archivedSummary`: không đổi.
- Chỉ đọc: nút chỉ có ở danh sách bữa; bữa tạo ra luôn `ACTIVE`; trang Snapshot không có nút.
- Tiền: số nguyên VNĐ; hoá đơn tự lưu đi qua `createInvoice` và `computeInvoice` hiện có nên quy tắc làm tròn, phần dư không đổi.
- Offline: không có lời gọi mạng mới. Bộ đọc chữ OCR vẫn hỏi trước khi tải lần đầu; ảnh không rời thiết bị.
- i18n: chuỗi mới có ở `vi` (khoá) và `en.ts`.

## Risks / Trade-offs

- Hoá đơn tự lưu có thể sai tên món dù tổng khớp → người dùng sửa ở bước Hoá đơn; tổng tiền vẫn đúng với bill.
- Đóng form không lưu làm mất ảnh vừa chụp → theo quyết định của chủ app: không để lại bữa trống.
- Bước mở sẵn mất khi tải lại trang → chấp nhận, đã ghi trong spec.
- Tải lại trang hoặc đóng tab giữa lúc đang lưu ảnh/quét để lại bữa có một kèo trống (không có hoá đơn; ảnh mồ côi được dọn khi mở bước Hoá đơn của bữa hoặc khi xoá bữa) → chấp nhận; người dùng xoá bữa ở danh sách.
