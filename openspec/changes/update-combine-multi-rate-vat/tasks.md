# Tasks

## 1. Gộp dòng VAT trong bộ phân tích
- [x] 1.1 Thêm `combineVat` và kiểu `VatLine` vào `app/src/domain/receipt/adjustments.ts`
- [x] 1.2 Thu thập mọi dòng VAT trong vòng lặp của `app/src/domain/receipt/index.ts`, gọi `combineVat` sau vòng lặp, và xoá `vatRates` khi `vatIncluded`
- [x] 1.3 Thêm trường `vatRates?: number[]` có JSDoc tiếng Việt vào `app/src/domain/receipt/types.ts`

## 2. Test bộ phân tích
- [x] 2.1 Test hai dòng VAT có số tiền (8% 40.000 và 10% 20.000) cho ra VAT 60.000, `vatRates` [8, 10], đối chiếu OK
- [x] 2.2 Test dòng "Tổng tiền thuế" sau hai dòng VAT không cộng trùng
- [x] 2.3 Test nhiều mức % không có số tiền để VAT trống và ghi `vatRates`
- [x] 2.4 Test bill một dòng VAT giữ hành vi cũ

## 3. Form hoá đơn
- [x] 3.1 Truyền `vatRates` qua `fillFromReceipt` vào `ReceiptFill` và thêm `vatRatesNotes` trong `app/src/components/invoices/receiptFormState.ts`
- [x] 3.2 Hiện ghi chú đã gộp hoặc nhắc nhập tay trong khối ghi chú đối chiếu của `InvoiceFormDialog.tsx`
- [x] 3.3 Thêm gợi ý dưới ô VAT khi `vat.mode` khác `FIXED_AMOUNT`
- [x] 3.4 Test `receiptFormState` truyền `vatRates` và tạo ghi chú; test hộp thoại hiện ghi chú và gợi ý

## 4. i18n
- [x] 4.1 Thêm ba câu tiếng Anh vào `app/src/i18n/en.ts`; test `i18n.test.ts` xác nhận đủ khoá và không thừa khoá

## 5. Kiểm tra
- [x] 5.1 `npx vitest run` từ `app/` đạt toàn bộ
- [x] 5.2 `npm run lint` và `npm run typecheck` đạt
- [x] 5.3 `openspec validate update-combine-multi-rate-vat --strict` đạt
