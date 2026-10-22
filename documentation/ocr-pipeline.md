# OCR Hoá Đơn Offline: Xử Lý Ảnh, Nhận Diện Và Bóc Tách (`Tesseract.js`)

> Tách từ [02. Nghiệp vụ Tính toán](./02-business-logic-and-algorithms.md) (mục 3). Quy tắc nghiệp vụ liên quan: BR-4.7, BR-4.16 đến BR-4.20 trong [epic-4/BR.md](./epic-4/BR.md).

Do chạy hoàn toàn trên trình duyệt và không dùng API trả phí, hệ thống xây dựng một pipeline OCR 3 bước chuyên biệt cho hoá đơn tiếng Việt:

```mermaid
flowchart LR
    Img["Ảnh Hoá Đơn (Camera / Upload)"] --> Pre["Bước 1: Tiền xử lý\n(Cắt 4 góc, nắn thẳng, ảnh xám)"]
    Pre --> Tess["Bước 2: Tesseract.js\nLượt 1: vie + eng (chữ)\nLượt 2: eng (đọc lại số)"]
    Tess --> Parser["Bước 3: Heuristic Receipt Parser\n(Ngày, Quán, Món + Giá, VAT)"]
    Parser --> Review["Form Xác Nhận & Chỉnh Sửa Nhanh"]
```

## Bước 1: Tiền xử lý ảnh trên HTML5 Canvas (`lib/imageScan.ts`, `lib/documentScan.ts`, `lib/imagePreprocess.ts`)
- Tìm 4 góc tờ hoá đơn, cắt và nắn phối cảnh, đưa cạnh dài về **2800 px** (phóng tối đa 3 lần). Không tìm thấy tờ giấy thì xử lý cả ảnh.
- **Nhị phân hoá thích nghi (kiểu Bradley), ngưỡng `contrast = 0,25`**: mỗi pixel so với trung bình cục bộ, nên bóng đổ, nếp gấp và ánh sáng không đều không làm nền xám hay chữ nhoè; kết quả chỉ có chữ đen và nền trắng hoàn toàn. Ngưỡng cũ `0,12` làm nét quá đậm (bít lỗ `6`→`8`, dính số `1` vào đường kẻ bảng); `0,25` đủ mảnh để giữ nét số mà vẫn bắt được chữ in nhiệt mờ.
- **Không làm dày chữ**, trừ khi nét thật sự đứt (độ dày trung vị ≤ 2 px, `THIN_STROKE_MAX`). Không dùng ảnh xám cho OCR: xem bảng so sánh bên dưới.
- Ảnh nhị phân được **lưu thành chính ảnh của hoá đơn**: PNG nếu ≤ ~1 MB (thường 200–500 KB), không thì JPEG 0,85 hạ dần như BR-4.16. Nhị phân có nhiều đen quá (> 40%, nền tối hoặc ảnh hỏng) thì rơi về ảnh gốc đã nén. Bước chuẩn bị OCR (`prepareForOcr`: xám + kéo giãn tương phản) vẫn chạy trên ảnh đã lưu.

**Vì sao chọn cách này** (đo OCR thật, lượt 1 `vie`+`eng`, đếm số tiền / số hiệu đọc đúng trên 2 bill: Bún Ốc ảnh sáng đều và Matchandeul ảnh có bóng, nếp gấp, nền hoa văn; tổng 31 số):

| Cách convert | Bún Ốc (/14) | Matchandeul (/17) | Tổng (/31) |
|---|---|---|---|
| Ảnh xám đã cắt + kéo giãn tương phản (bản đã thử rồi bỏ) | 9 | 5 | 14 |
| Nhị phân thích nghi `contrast` 0,12 (bản cũ) | 8 | 17 | 25 |
| Nhị phân thích nghi `0,20` | 8 | 17 | 25 |
| **Nhị phân thích nghi `0,25`** | **11** | **17** | **28** |
| Nhị phân thích nghi `0,30` | 6 | 17 | 23 |
| Nắn nền (chia cho nền ước lượng) rồi ngưỡng Otsu | 6 | 14 | 20 |
| Nắn nền + giãn tương phản (xám), có / không làm nét | 7–9 | chưa đo | — |
| **Ảnh mềm, không tăng tương phản, không giảm chất lượng** (PNG xám, gửi thẳng vào OCR): ảnh gốc không cắt | 1 | 16 | 17 |
| Chỉ xén + nắn thẳng, giữ cỡ gốc (1×) | 8 | 3 | 11 |
| Chỉ xén + nắn thẳng, phóng 2× | 11 | 5 | 16 |
| Chỉ xén + nắn thẳng, phóng cạnh dài 2800 px | 8 | 5 | 13 |
| Xén + **xoá nền** (nắn nền, không giãn tương phản), phóng 1,5× / 2× / 3× | 7 / 8 / 8 | 14 / 16 / 15 | 21 / 24 / 23 |
| Xén + xoá nền với khối nhỏ (24 px) để bắt nếp nhăn, 2× | 9 | 13 | 22 |
| Xén + xoá nền 2× + làm nét nhẹ | 6 | 15 | 21 |
| Xén + xoá nền rồi nhị phân thích nghi `0,25` (2800 px / 2×) | 7 / 5 | 15 / 15 | 22 / 20 |
| Nhị phân `0,25` rồi xoá đường kẻ dài | 7 | 11 | 18 |
| Nhị phân `0,25`, thu nhỏ còn 70% / 85% cạnh dài | 10 / 7 | 16 / 15 | 26 / 22 |

Kết luận: ảnh xám chỉ ổn khi ánh sáng đều (Bún Ốc), còn ở ảnh có bóng và nếp gấp thì tệ (5/17); nhị phân thích nghi ổn ở cả hai. **Ảnh mềm hơn (không tăng tương phản, không nén) không giải quyết được vấn đề**: chỉ xén thì vẫn còn bóng và nếp gấp nên Tesseract (tự phân ngưỡng toàn cục bên trong) đọc rất kém trên Matchandeul (3–5/17); thêm bước xoá nền cứu được bill này (16/17) nhưng bill Bún Ốc vẫn kém (7–9/14, lỗi ở chữ số `1`/`4` và đường kẻ bảng chứ không phải độ mềm của chữ), và tổng vẫn thấp hơn nhị phân thích nghi `0,25` (24/31 so với 28/31). Chuyển nền đã xoá sang nhị phân còn kém hơn nhị phân trực tiếp (20–22/31). Xoá đường kẻ và thu nhỏ ảnh đều làm kém đi. Kết quả của Tesseract nhạy với thay đổi nhỏ (ví dụ `0,20` và `0,30` kém hơn `0,25`), nên con số chỉ là hướng, không phải đường cong trơn; lượt 2 (đọc lại số, bước 2) và đối soát tổng (bước 8–10) là lớp bù cho phần còn lệch.

## Bước 2: Nhận diện văn bản với `Tesseract.js` (`services/ocrService.ts`)
- Dùng `tesseract.js` **v7** (dữ liệu `tessdata_fast`, đóng gói trong `public/ocr/`, không gọi mạng khi quét). **Lượt 1** dùng worker `vie` + `eng`, PSM 4, lấy cả văn bản lẫn **toạ độ từng từ** (để cắt vùng ở lượt 2).
- Lõi WASM được đóng gói đủ ba biến thể LSTM (`relaxedsimd`, `simd`, thường) để thư viện chọn theo trình duyệt.
- Worker được tạo ở lần quét đầu, dùng lại giữa các lần, và tự dừng sau 60 giây rảnh. Huỷ quét dừng worker và báo `OCR_CANCELLED`.
- Hiển thị tiến trình theo từng ảnh (`OcrProgress`). OCR chạy **tự động ngay sau khi ảnh được lưu**; nhiều ảnh được quét lần lượt và văn bản từng ảnh được lưu vào `ocrRawText`. Ảnh đã có văn bản thì không quét lại. Văn bản này còn dùng để **phát hiện ảnh trùng** (so tập từ đã bỏ dấu bằng Jaccard ≥ 0,8, tối thiểu 8 từ, trong cùng bữa).
- **Lượt 2: đọc lại các số tiền** (worker `eng` riêng, tạo lười, cùng cơ chế tự dừng sau 60 giây và huỷ như worker chính): mô hình tiếng Việt hay đọc `1` thành `4` ở chữ to đậm (đo trên bill mẫu: dòng "Tổng thanh toán" ra `476.000` ở 6/6 lần chạy, trong khi đọc riêng dòng đó bằng `eng` ra `176.000` ở cả ảnh xám lẫn ảnh nhị phân).
  1. Với mỗi **từ số tiền** ở lượt 1 (có chữ số, dạng nhóm nghìn hoặc từ 3 chữ số trở lên; bỏ số dài lẻ theo bước 5 của parser), cắt vùng toạ độ từ đó từ ảnh đã lưu, thêm viền trắng ~20 px.
  2. Nhận lại vùng này bằng `eng`, PSM 7 (một dòng), **whitelist `0123456789.,`** (không đọc chữ nên không nhầm `đ`, `l`, `O`).
  3. Chuỗi mới **thay** từ cũ khi hợp lệ (dạng số nhóm nghìn hoặc số thuần) và khác kết quả lượt 1; rỗng hoặc sai dạng thì giữ kết quả lượt 1. Văn bản đã thay được lưu vào `ocrRawText`.
  4. Giới hạn **40 vùng/ảnh** (ưu tiên các dòng cuối: tổng, VAT, giảm giá) để thêm không quá vài giây; tiến trình hiện "Đang đọc lại số…".
  5. Lượt 2 chỉ sửa chữ số, không thêm/bớt dòng. Nếu vẫn lệch (SL × đơn giá ≠ thành tiền, tổng không khớp), bước đối soát của parser (bước 8, 10) tiếp tục xử lý, gồm cả hoán đổi `1` ↔ `4`.
- Quét đọc **bản đã lưu** của ảnh (đã nén theo mức đã chọn), không phải bản gốc. Với mức *Cân bằng* (cạnh dài 2000 px) chữ bill vẫn đọc tốt.

## Bước 3: Bộ Phân Tích Hoá Đơn Thông Minh (`domain/receiptParser.ts`)
Hàm thuần: văn bản vào, dữ liệu gợi ý ra. Nguyên tắc: **không đoán**; thứ không chắc thì bỏ trống hoặc đánh dấu để người dùng xem lại.

0. **Chuẩn hoá dòng**: sửa lỗi OCR ở chỗ dính với chữ số (`O` → `0`; `l`, `I`, `|` đứng trước chữ số → `1`), gọn khoảng trắng. Thêm:
   - **Dọn ký tự viền bảng**: `|`, `¦`, `[`, `]`, `{`, `}`, `_` và chuỗi từ 3 ký tự `-` `=` `~` `—` `.` liên tiếp (đường kẻ bảng bị OCR đọc thành chữ) được thay bằng khoảng trắng **trước khi tách số**, để `106.000]` thành `106.000` và dòng món `-..| Bún Ốc Lẫn 2| 53.000 106.000]` không bị mất. Dấu `-` đơn lẻ trong tên món (`Bún - Chả`) và số âm giữ nguyên.
   - **Dấu chấm / phẩy thừa sau số**: `90.000.`, `1.`, `130,000,` (vết mực hoặc đường kẻ bị đọc thành dấu câu) bỏ dấu cuối trước khi tách số. Nếu không, token không còn là số nên cả dòng món bị bỏ (bill Matchandeul: `Mì gói 1 90.000. 90,000` và `Mì lạnh … 1. - 130,000 130,000` mất vì lý do này).
   - **Ký hiệu `đ` bị đọc thành chữ số**: số tiền có nhóm cuối **4 chữ số** (`176.0004`, `476.0000`) thì bỏ chữ số cuối, vì số tiền đúng chỉ có nhóm nghìn 3 chữ số; đó là chữ `đ` / `₫` bị đọc thành `4` hoặc `0`.
   - **Nhãn bị lệch dấu**: các từ khoá `tổng` khớp cả `Téng`, `Teng`, `Tõng` (dạng đã bỏ dấu: `t[oe]ng`), nên `Téng thanh toán 176.000đ` vẫn được nhận là dòng tổng.
   - **Mọi so khớp từ khoá dùng dạng đã bỏ dấu** (`fold`: bỏ dấu, `đ` → `d`, chữ thường), nên bill mà OCR đọc mất dấu vẫn cho kết quả đúng. Tên món và tên quán được lấy từ dòng gốc.
1. **Ngày**: `dd/mm/yyyy`, `dd-mm-yy` (năm 2 chữ số là 20xx), hoặc `Ngày d tháng m năm yyyy`. Chỉ nhận ngày có thật và trong khoảng 2000–2099; không có thì bỏ trống.
2. **Tên quán**: trong 4 dòng đầu, bỏ dòng địa chỉ, điện thoại, mã số thuế và tiêu đề; điểm cao hơn cho dòng có từ khoá (`NHÀ HÀNG`, `QUÁN`, `CAFE`, `LẨU`, `BBQ`, …) và viết hoa.
3. **VAT**: dòng có `VAT` / `GTGT` / `Thuế`. Nếu dòng có số tiền thì lấy `FIXED_AMOUNT` (khớp bill), không thì lấy `PERCENTAGE` từ `%`.
4. **Giảm giá** (`Giảm giá`, `Chiết khấu`, `Khuyến mãi`, `Discount`) và **Phí phục vụ** (`Phí phục vụ`, `Service`): cùng quy tắc như VAT; số tiền có thể mang dấu `-` hoặc ngoặc, lấy giá trị tuyệt đối.
5. **Đọc dòng theo cột trái / phải**: mỗi dòng tách thành *nhãn bên trái* (chữ) và *số bên phải* (số tiền cuối dòng). Đơn vị tiền tệ (`đ`, `₫`, `VND`, `vnđ`, `k`) **có thể có hoặc không**; có thì bỏ đi, không thì vẫn đọc bình thường.
   - **Cột phải luôn là thành tiền của món** (`lineTotal`), là con số đáng tin nhất nên được đọc **trước tiên** và được giữ nguyên ở các bước sau. Cùng lúc ghi lại **số lượng** nếu đọc được (`2`, `2x`, `x2`, `2 x 150.000`) để dùng ở bước 10.
   - Dòng **không phải món** thì không vào danh sách: tiêu đề, địa chỉ, ngày giờ, số điện thoại, mã số thuế, số hoá đơn / số bàn / mã giao dịch (chuỗi số dài, hoặc đứng sau nhãn `MST`, `Số`, `No`, `Bàn`, `Mã`), dòng VAT / giảm giá / phí phục vụ / tổng / tạm tính / tiền mặt / tiền thừa.
   - **Số quá dài và lẻ không phải tiền**: số có **hơn 8 chữ số** (tính cả số 0 đứng đầu) mà **không chia hết cho 100** (`001070016165` mã số thuế, `2506041166` số hoá đơn, `888803155678` số tài khoản) bị bỏ khỏi các số tiền của dòng; dòng chỉ còn số loại này thì không phải món. Số dài chia hết cho 100 vẫn được coi là tiền.
   - Ba bố cục món được nhận: **một dòng** `Bò Mỹ nhúng 2 150.000 300.000`; **có phép tính** `Lẩu bò 2 x 150.000 = 300.000`; **hai dòng** (tên ở trên, `2 x 150.000 = 300.000` ở dưới). Dòng chỉ có tên và một số cuối được coi là 1 phần với thành tiền là số đó.
   - **Dòng tổng nhóm** (`Drink`, `Food`, `Tổng đồ uống`, `Tổng đồ ăn`…) là **subtotal của một nhóm món**, không phải món. Quy tắc:
     1. **Không bao giờ thay các món đã đọc bằng hai dòng nhóm.** (Lỗi cũ: chỉ cần một món đọc thiếu thì tổng các món lệch tổng nhóm và *toàn bộ* món bị xoá, chỉ còn hai dòng `Tổng đồ uống`, `Tổng đồ ăn`; bill Matchandeul có 7 món, đọc được 5, mất cả 5.)
     2. Chỉ khi **không đọc được món nào** thì dùng các dòng nhóm làm "món" (mỗi nhóm một dòng, `Tổng đồ uống` / `Tổng đồ ăn`) để vẫn chia được tiền.
     3. **Đối soát theo nhóm**: mỗi dòng nhóm khép nhóm các món đứng ngay trên nó (từ dòng nhóm trước, hoặc đầu bảng). Tổng các món của nhóm phải bằng số trên dòng nhóm; **nhóm nào thiếu** thì thêm một dòng **"Món chưa đọc được"** (thành tiền = phần thiếu, `uncertain`) vào đúng nhóm, kèm ghi chú nêu tên nhóm và số tiền thiếu (ví dụ "Food: các món cộng được 1.290.000, dòng Food ghi 1.510.000, thiếu 220.000"). Không giới hạn 10% như bước 8 vì tổng nhóm là số đáng tin; nhóm nào đã khớp thì giữ nguyên.
     4. Nhóm có tổng các món **lớn hơn** dòng nhóm thì giữ nguyên các món, báo lệch (không tự xoá món).
     5. Không phân nhóm được (ví dụ không có món nào nằm trên dòng nhóm) thì đối soát chung: `Σ nhóm` so với `Σ món`.
     6. Dòng nhóm vẫn là số để đối chiếu tổng: `Σ các dòng nhóm` phải bằng `readTotal` (trừ giảm giá, phí, VAT), dùng làm nguồn xác nhận thứ hai cho tổng bill.
6. **Tổng đọc được** (`readTotal`):
   - Dòng có nhãn trái là `Tổng`, `Tổng cộng`, `Tổng thanh toán`, `Tổng tiền`, `Amount`, `Total`, `Total amount` → **xác nhận chính là tổng** (độ tin cậy cao).
   - **Dòng số cuối cùng của bill** có khả năng cao là tổng. Nếu không có dòng nào mang nhãn tổng thì lấy dòng này làm `readTotal` với độ tin cậy thấp (đánh dấu để người dùng xem lại); nếu nhãn của nó là tổng thì xác nhận như trên.
   - Bỏ qua `Tiền hàng`, `Tạm tính`, `Subtotal`, `Tiền mặt`, `Tiền thừa`: các dòng này **không** được nhận là tổng.
7. **Loại subtotal lọt vào danh sách món**: xét các dòng **gần cuối** phần món (sát khu vực tổng / VAT). Dòng nào có giá trị **> 75% `readTotal`** gần như chắc chắn là subtotal chứ không phải món. Khi đó thử bỏ dòng ấy; **nếu giữ lại làm tổng tính được tăng gấp đôi** (`tổng tính được ≈ 2 × readTotal`) thì **loại hẳn** khỏi danh sách món. Dòng lớn mà bỏ ra không làm tổng khớp thì giữ nguyên (có thể đó là món đắt thật).
8. **Đối soát tổng** (làm trước mọi việc điền tên / đơn giá). Tính:

   `tổng tính được (calcTotal) = Σ thành tiền món − giảm giá + phí phục vụ + VAT` (theo thứ tự R-8), rồi so với `readTotal`, với dung sai làm tròn nhỏ (≈ 1.000 đ hoặc 0,5%):

   | Tình huống | Chẩn đoán | Xử lý |
   |---|---|---|
   | `calcTotal ≈ readTotal` | Khớp | Chuyển sang bước 9 |
   | `calcTotal ≈ 2 × readTotal` | Có 1 subtotal đang bị tính như món | Tìm dòng (thường gần cuối) có giá ≈ `calcTotal − readTotal`, loại khỏi món |
   | `calcTotal > readTotal` một chút | Giảm giá / thuế / phí phục vụ bị đọc thành món (hai khoản này thường nằm cuối) | Tìm trong các dòng cuối một dòng (hoặc hai) có giá = phần chênh; nhãn giảm giá / dấu âm → chuyển thành giảm giá, nhãn thuế / phí → chuyển thành VAT / phí phục vụ; rồi tính lại |
   | `calcTotal < readTotal` một chút | Thiếu 1 món | Kiểm lại ma trận món: dòng đã bị loại nhầm, dòng chỉ có số chưa gắn tên, dòng ghép sai. Có dòng ứng viên giá = phần thiếu thì thêm vào; không có thì thêm 1 món **"Món chưa đọc được"** với thành tiền = phần thiếu, đánh dấu `uncertain` |
   | Vẫn lệch sau các bước trên | Không tự giải thích được | Giữ nguyên kết quả, đánh dấu `uncertain`, hiện cảnh báo lệch với số tiền chênh |

   Mỗi lần sửa danh sách đều tính lại `calcTotal`. Tối đa mỗi bill một lần loại subtotal và một lần chuyển giảm giá / thuế; **không bao giờ sửa `readTotal` hay thành tiền của món** để cho khớp.
9. **Chỉ khi thành tiền từng món, VAT, giảm giá, phí và tổng đã khớp bill** mới đọc thêm phần còn lại (bước 10, 11); nếu chưa khớp thì bỏ qua và để người dùng sửa.
10. **Điền đơn giá × số lượng**: lấy số lượng đã ghi ở bước 5 và đơn giá đọc được. Nếu `SL × đơn giá ≠ thành tiền` thì **sửa đúng một số** (thành tiền giữ nguyên), theo thứ tự ưu tiên:
    - SL ≠ 1 và số lượng đọc được: thử **SL = 1**, đơn giá = thành tiền (phần lớn món có SL 1; OCR hay đọc "1" thành "4", "7", "l");
    - không được thì **đơn giá = thành tiền ÷ SL** (khi chia hết);
    - không cách nào khớp thì để nguyên và đánh dấu `uncertain`.
    Các món đã tự sửa đánh dấu `uncertain` (form tô vàng, BR-4.8). Bước này chạy trong đối soát ở `receiptValidation.ts` (`rowCandidates`), sau khi tổng đã được kiểm.
    **Nhầm chữ số `1` ↔ `4`** (ảnh sau khi xử lý nhị phân hay làm mất nét nghiêng của `1` hoặc khép nét của `4`): khi cần sửa một dòng (bước này, và cả bước 8 khi tổng lệch), ngoài các cách sửa trên còn thử **hoán đổi `1` ↔ `4` ở từng chữ số** của SL, đơn giá, thành tiền (mỗi lần đổi tối đa 1–2 chữ số, ít chữ số đổi nhất được ưu tiên). Cách đọc chỉ được nhận khi nó làm **`SL × đơn giá = thành tiền`** đúng; nếu có nhiều cách, chọn cách làm **tổng các món khớp `readTotal`** (bước 8).
    - **Tổng bill có dòng lặp lại** (`Tiền hàng`, `Tổng thanh toán`, `Còn phải thu` thường cùng một số): các dòng này đọc lệch nhau thì lấy **số xuất hiện nhiều nhất**; nếu cả ba khác nhau thì thử hoán đổi `1` ↔ `4` để chúng trùng nhau, rồi mới dùng làm `readTotal`.
    - Không cách nào khớp thì giữ nguyên số đọc được và đánh dấu `uncertain` (không đoán).

11. **Đọc tên món**: tên nên chứa **nhiều chữ**; số ở cuối tên giữ tối đa **4 chữ số** (`Bia 33`, `Bia 1964`); số từ 3.000 trở lên trong tên được coi là số tiền và bỏ khỏi tên; nếu số cuối dài hơn 4 chữ số thì bỏ hết số đó khỏi tên (không cắt bớt). Số đứng đầu dòng (STT, mã món) bị coi là mã và bỏ khỏi tên. Tên không còn chữ nào thì để `Món chưa rõ tên` và đánh dấu `uncertain`. Tên lấy từ dòng gốc (có dấu).
12. **Phần còn lại để người dùng tự sửa** trong Form Kiểm Tra Hoá Đơn.

> [!TIP]
> Sau khi OCR bóc tách xong, kết quả được đổ trực tiếp vào **Form Kiểm Tra Hoá Đơn** để người dùng có thể sửa lại bất kỳ ký tự hay con số nào chưa chuẩn chỉ với 1 chạm trước khi lưu.

---
