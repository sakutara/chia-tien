# Design

## Context

Bộ phân tích hoá đơn nằm trong `app/src/domain/receipt/` và là hàm thuần: văn bản vào, dữ liệu gợi ý ra. Vòng lặp trong `index.ts` đọc từng dòng VAT và trước đây gán `result.vat` cho mỗi dòng, nên dòng sau ghi đè dòng trước. Form hoá đơn chỉ có một ô VAT (`AdjustmentState`), gồm chế độ `PERCENTAGE` hoặc `FIXED_AMOUNT`.

## Goals / Non-Goals

**Goals**
- Bill có nhiều dòng VAT có số tiền cho ra một khoản VAT đúng bằng tổng các dòng đó.
- Dòng "Tổng tiền thuế" không bị cộng trùng.
- Bill nhiều mức % không có số tiền không bị đoán: VAT để trống, người dùng được nhắc nhập tay.

**Non-Goals**
- Không lưu VAT theo từng món hay từng mức thuế. Mọi kết quả gộp là một số tiền cố định, phù hợp với cách tính tổng hiện có (VAT tính trên tổng bill).
- Không đổi bước đối chiếu tổng (`receiptValidation.ts`): nó vẫn đọc `result.vat` như cũ.

## Decisions

**Gom dòng sau vòng lặp.** Trong vòng lặp, mỗi dòng VAT được thêm vào danh sách `VatLine` (khoản điều chỉnh và phần trăm trên dòng). Sau vòng lặp, `combineVat` quyết định kết quả:
1. Không có dòng: không có VAT.
2. Một dòng: giữ đúng hành vi cũ.
3. Từ hai dòng trở lên, có số tiền: bỏ dòng lặp (cùng số tiền và cùng % hoặc một trong hai dòng không ghi %), bỏ dòng tổng (bằng tổng các dòng đứng trước, từ hai dòng trở lên), cộng phần còn lại thành `FIXED_AMOUNT`. Nếu còn từ hai mức % khác nhau thì ghi `vatRates`.
4. Từ hai dòng trở lên, không có số tiền: mọi % giống nhau thì `PERCENTAGE`; khác nhau thì để trống `vat` và ghi `vatRates`.

**`vatRates` chỉ có khi có từ hai mức %.** Trường này là tuỳ chọn trong `ParsedReceipt`. Form dùng nó để hiện ghi chú; không dùng để tính tiền.

**Form.** `fillFromReceipt` chuyển `vatRates` sang `ReceiptFill`. `vatRatesNotes` tạo ghi chú: đã gộp (VAT là số tiền) hoặc nhắc nhập tay (VAT trống). Ghi chú được nối vào danh sách ghi chú đối chiếu đang hiện. Gợi ý cố định dưới ô VAT chỉ hiện khi `vat.mode` khác `FIXED_AMOUNT`.

**Không đổi dữ liệu lưu.** Hoá đơn đã lưu vẫn lưu VAT theo `vatMode` và `vatValue` như trước. `FIXED_AMOUNT` đã được hỗ trợ, nên không cần migration.

## Compatibility

- Không đổi schema Dexie. Không thêm bảng, index hay phiên bản.
- Payload snapshot không đổi. Snapshot đọc `vatMode` và `vatValue` đã lưu như cũ.
- Bữa đã lưu trữ và trang snapshot không bị ảnh hưởng. Hoá đơn gộp được lưu như một khoản VAT `FIXED_AMOUNT` thông thường.
- Bill một mức VAT cho cùng kết quả như trước.

## Risks

- Hai dòng VAT khác mức có cùng số tiền bị coi là lặp và chỉ giữ một. Điều kiện kèm cùng % (hoặc một trong hai dòng không có %) làm giảm rủi ro này.
- Bill có dòng % không kèm số tiền cộng với dòng có số tiền: chỉ các dòng có số tiền được cộng, mức % của dòng không có số tiền không vào `vatRates`. Đối chiếu tổng vẫn báo lệch nếu thiếu tiền.
