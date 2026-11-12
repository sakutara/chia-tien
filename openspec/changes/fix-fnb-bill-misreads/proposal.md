# Proposal

## Why

Trên bill quán ăn và cà phê thật, pipeline vẫn đọc sai hoặc không đọc được. Phân tích cho thấy bốn nguyên nhân có thể sửa trong code:
- Bill chụp xoay 90° hoặc 270°: app chỉ nắn góc trong ±30°, nên các bill này không đọc được chữ (xoay 90° khôi phục 6/49 bill cũ).
- Parser coi số điện thoại, mã quầy, mã NVBH là số tiền, tạo ra món giả và tổng lệch.
- Parser không nhận dòng khuyến mãi (KM, "giảm") là giảm giá; không bỏ các nhãn tiền khách đưa bằng tiếng Anh (RECEIVED, CHANGE) và không đọc được số lượng đứng cuối tên món.
- Bill có dòng số dư cuối ("Còn phải thu", "Còn lại") bằng 0 sau khi thanh toán: tổng bill nằm ở dòng tổng phía trên, không phải dòng cuối.

## What Changes

- **receipt-ocr**: tự xoay bill 90° và 270° trước khi dò chữ, chọn hướng đọc được nhiều dòng nhất.
- **receipt-ocr**: loại dòng có số điện thoại, mã quầy, NVBH khỏi món và khỏi số tiền.
- **receipt-ocr**: nhận dòng khuyến mãi và giảm giá (kể cả dạng OCR "Ã GIẢM") là giảm giá; bỏ RECEIVED, CHANGE khỏi món.
- **receipt-ocr**: nhận số lượng đứng cuối tên món khi dòng chỉ có một số tiền.
- **receipt-ocr**: khi dòng số dư cuối bằng 0, tổng bill là số của dòng tổng ngay phía trên.

## Capabilities

### Modified Capabilities
- `receipt-ocr`: thêm các requirement trên, không sửa requirement cũ.

## Impact

`app/src/workers/vietOcrWorker.ts` (hoặc `domain/vietOcr.ts`), `app/src/domain/receipt/*`, `receiptValidation.ts`, test và fixture. Không đổi schema Dexie, Snapshot, i18n (trừ khi thêm ghi chú). Không đổi bộ đọc chữ hay model.

## Non-goals
- Không sửa bộ bill hồi quy hiện có ngoài việc nâng ngưỡng nếu số đo tăng.
- Không đổi nhãn fixture cho val_287 trong change này (ghi lại để anh quyết định).
- Không xử lý OCR hỏng nặng (bill nhàu, coupon lặp).
