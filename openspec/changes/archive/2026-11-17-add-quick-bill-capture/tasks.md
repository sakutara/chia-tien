# Tasks

## 1. Domain
- [x] 1.1 Thêm `domain/quickBill.ts`: `canAutoSaveReceipt(check)` và `quickMealDate(billDate, today)`
- [x] 1.2 Viết `domain/quickBill.test.ts` cho các Requirement "Tự lưu hoá đơn khi bill đọc khớp", "Mở form hoá đơn khi bill chưa đọc khớp" (các trạng thái, không món, thiếu dòng) và "Ngày bữa theo ngày trên bill"

## 2. Service
- [x] 2.1 Thêm `draftFromFill` vào `components/invoices/receiptFormState.ts` kèm test
- [x] 2.2 Thêm `services/quickBillService.ts`: `startQuickBill(file)` (tạo bữa, kèo, lưu ảnh, hoàn tác khi lỗi), `applyQuickBillText(...)` (cập nhật ngày bữa, tự lưu hoá đơn hoặc trả về "cần form")
- [x] 2.3 Viết `services/quickBillService.test.ts`: tạo bữa + kèo, hoàn tác khi lưu ảnh lỗi, ngày theo bill, tự lưu với tổng bằng tổng bill, phần dư chia đều khớp tổng, trả về "cần form" khi MISMATCH/UNVERIFIED/không món

## 3. Giao diện
- [x] 3.1 `InvoiceFormDialog`: thêm prop `draftInvoiceId` và `initialNotice`; điền từ `ocrRawText` đã lưu khi mở; test
- [x] 3.2 Thêm `components/meals/QuickBillCapture.tsx`: nút, camera (kèm dự phòng camera của máy), hộp hỏi tải bộ đọc chữ, tiến trình + huỷ, form sửa; test
- [x] 3.3 `MealsPage`: đặt nút ở màn hình chính, hiện lỗi; `onOpenMeal(id, step?)`; test
- [x] 3.4 `App` + `MealWorkspacePage`: prop `initialStep`, mở bước "Người" cho bữa vừa tạo nhanh; test

## 4. i18n
- [x] 4.1 Thêm bản dịch `en.ts` cho mọi chuỗi mới; rà chuỗi cứng

## 5. Kiểm tra
- [x] 5.1 `npm test`, `npm run lint`, `npm run build` trong `app/`
- [x] 5.2 Thử trên app thật ở 375 px, hai ngôn ngữ
- [x] 5.3 `openspec validate add-quick-bill-capture --strict`
