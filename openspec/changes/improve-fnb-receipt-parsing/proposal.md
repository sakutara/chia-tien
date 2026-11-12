# Proposal

## Why

Đo trên 107 bill quán ăn và quán cà phê thật (ảnh chụp điện thoại của cuộc thi MC-OCR 2021, có nhãn tổng tiền), VietOCR đọc ra đúng số tổng ở 91 bill, nhưng bộ phân tích chỉ lấy đúng tổng ở 75 bill và chỉ 58 bill khớp trọn (các món cộng lại bằng tổng). 33 bill hỏng dù chữ đã đọc đúng: lỗi nằm ở bộ phân tích, không nằm ở bộ đọc chữ. Đổi sang Tesseract hay PaddleOCR đều cho kết quả kém hơn trên cùng tập bill, nên change này giữ nguyên VietOCR và sửa bộ phân tích.

Các bố cục bill quán ăn, quán cà phê mà bộ phân tích chưa đọc được:

- Dòng món có số thứ tự ở đầu và số tiền cách nghìn bằng khoảng trắng ("1 Caramel Machiato 1 50 000 50 000"): không ra món nào.
- Tên món ở dòng trên, dòng dưới chỉ có số ("25,000 1 25,000" hoặc chỉ đơn giá "6,000"): không ra món, hoặc dòng tiêu đề cột bị ghép vào tên món.
- Bill chỉ có nhãn "Thành tiền:" làm dòng tổng: tổng bill bị bỏ trống.
- Bill nhãn tiếng Anh (Item Name, Qty, Sub Total, Total, Cash, Change) và dòng bảng thuế ở chân bill bị đọc thành món.
- Bill có hai dòng "Tổng", giảm giá ghi cả phần trăm lẫn số tiền, và dòng "Làm tròn".
- Dòng tuỳ chọn 0 đồng nằm ngay dưới món và dòng "Tiền khách đưa" bị đọc thành món.

Hiện cũng chưa có bộ bill thật nào trong repo để biết một thay đổi của bộ phân tích làm tốt lên hay xấu đi.

## What Changes

- **receipt-ocr**: thêm bộ bill hồi quy gồm văn bản VietOCR của 107 bill quán ăn, quán cà phê kèm tổng tiền chuẩn, và một test Vitest đo hai chỉ số (số bill lấy đúng tổng, số bill khớp trọn) với ngưỡng sàn không được tụt.
- **receipt-ocr**: thêm luật đọc dòng món có số thứ tự đầu dòng và nhóm nghìn cách bằng khoảng trắng.
- **receipt-ocr**: thêm luật đọc món hai dòng khi dòng dưới chỉ có số, và không ghép dòng tiêu đề cột vào tên món.
- **receipt-ocr**: thêm luật nhận dòng tổng, tạm tính và tiền khách trả theo nhãn "Thành tiền", "Số tiền", và nhãn tiếng Anh.
- **receipt-ocr**: thêm luật đọc bill có hai dòng "Tổng", giảm giá ghi cả phần trăm lẫn số tiền, và dòng "Làm tròn".
- **receipt-ocr**: thêm luật bỏ dòng tuỳ chọn 0 đồng và dòng bảng thuế ở chân bill khỏi danh sách món.

## Capabilities

### New Capabilities

Không có.

### Modified Capabilities

- `receipt-ocr`: thêm sáu requirement về đọc bill quán ăn, quán cà phê. Không sửa và không bỏ requirement nào đang có.

## Impact

Mã nguồn:
- `app/src/domain/receipt/` (`items.ts`, `adjustments.ts`, `patterns.ts`, `money.ts`, `normalize.ts`, `index.ts`) và `app/src/domain/receiptValidation.ts`.
- `app/src/domain/__fixtures__/fnbReceipts.json` (mới) và `app/src/domain/receiptParser.fnb*.test.ts` (mới).

Dữ liệu: schema Dexie không đổi. Snapshot URL không đổi. Không có chuỗi giao diện mới. Không gọi mạng.

Bữa `ARCHIVED` và trang Snapshot: không ảnh hưởng, vì quét hoá đơn chỉ có ở form hoá đơn của bữa đang mở.

## Non-goals

- Không đổi bộ đọc chữ: không nén model, không đổi bộ dò chữ, không thêm Tesseract hay PaddleOCR.
- Không thêm bước tự xoay ảnh chụp ngang hay sửa bước cắt giấy. Hai việc này thuộc change sau.
- Không đưa ảnh bill vào repo: chỉ đưa văn bản đã đọc và tổng tiền chuẩn.
- Không đọc số bị in cụt ("55,0" thay cho "55,000"): không đủ căn cứ, giữ nguyên tắc không đoán.
- Không đọc bill siêu thị (mã vạch, cân nặng theo kg).
- Không sửa `docs/`.
