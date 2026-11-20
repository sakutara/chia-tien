# Proposal

## Why

Bill F&B ở Việt Nam có thể có hai mức VAT: 8% cho đồ ăn và 10% cho bia, rượu, thuốc lá. Bộ phân tích hiện giữ lại dòng VAT cuối cùng và ghi đè các dòng trước, nên khoản VAT đọc được chỉ là một phần. Tổng bill không khớp và người dùng phải tự tìm lỗi. Với bill chỉ có nhãn phần trăm mà không có số tiền thuế, app cũng không có cách tách VAT theo món, nhưng hiện chưa nói rõ với người dùng.

## What Changes

- **receipt-ocr**: gom mọi dòng VAT của bill. Các dòng có số tiền được cộng thành một khoản VAT theo số tiền cố định, không bao giờ lưu theo từng mức thuế cho từng món.
- **receipt-ocr**: dòng "Tổng tiền thuế" đứng sau các dòng VAT (bằng tổng các dòng trước) và dòng lặp không được cộng trùng.
- **receipt-ocr**: khi bill có nhiều mức % nhưng không có số tiền, VAT để trống và kết quả ghi các mức % để form nhắc người dùng nhập tay.
- **receipt-ocr**: form hoá đơn hiện ghi chú sau khi quét khi bill có nhiều mức VAT, và gợi ý dưới ô VAT khi VAT chưa là số tiền.

## Capabilities

### Modified Capabilities
- `receipt-ocr`: sửa requirement "Đọc VAT, giảm giá, phí phục vụ và tổng bill" và thêm requirement nhắc nhiều mức VAT trên form.

## Impact

`app/src/domain/receipt/adjustments.ts` (hàm gộp VAT), `app/src/domain/receipt/index.ts`, `app/src/domain/receipt/types.ts` (trường `vatRates`), `app/src/components/invoices/receiptFormState.ts`, `app/src/components/invoices/InvoiceFormDialog.tsx`, `app/src/i18n/en.ts`, test Vitest tương ứng. Không đổi schema Dexie, payload Snapshot hay trang bữa đã lưu trữ.

## Non-goals
- Không tách VAT theo từng món hoặc lưu thuế suất theo món.
- Không tự suy ra tiền VAT từ phần trăm khi bill không ghi số tiền.
- Không đổi bộ đọc chữ, tiền xử lý ảnh hay model.
