# Design

## Context

Bộ phân tích hoá đơn nằm trong `app/src/domain/receipt/` (hàm thuần, văn bản vào, dữ liệu gợi ý ra) và bước đối chiếu nằm trong `app/src/domain/receiptValidation.ts`. Phép đo ngoài repo trên 107 bill quán ăn, quán cà phê của MC-OCR 2021 cho thấy:

| Chỉ số (trên 107 bill) | Hiện tại |
| :--- | :--- |
| Tổng tiền có trong văn bản VietOCR đọc ra | 91 |
| Bộ phân tích lấy đúng tổng | 75 |
| Khớp trọn bill | 58 |

16 bill còn lại VietOCR không đọc ra tổng (ảnh xoay ngang, bill quá nhỏ trong khung, giấy nhàu); phần này không thuộc change.

Chạy bộ phân tích trên văn bản thật của từng quán cho ra nguyên nhân cụ thể:

| Văn bản | Kết quả hiện tại |
| :--- | :--- |
| "1 Caramel Machiato (Đá) (Nhó) 1 50 000 50 000" | 0 món |
| "Café sữa (n/d) - Ly" / "25,000 1 25,000" / "Thành tiên: 25,000" | 0 món, không có tổng |
| "cà phê sữa hạt dẻ (M) 1 19 000 19 000" / "(MV) 0 19 000" | 0 món |
| "Trà chanh" / "10,000 6 60,000" | 0 món, "Tiền khách đưa" thành món |
| "Mặt hàng SL Số tiền" / "Set 30 1 459,000" ... hai dòng "Tổng" | tên món dính tiêu đề, không có tổng |
| "Sua Chua Voi Trai Ca pha 64,000 B" / "B 10 58,182 5,818 64,000" | dòng bảng thuế thành món |
| "1) Nước ép dưa hấu 1 39,000 39,000" | 0 món |

## Goals / Non-Goals

**Goals**
- Trên bộ bill hồi quy: lấy đúng tổng ít nhất 86/107 và khớp trọn ít nhất 78/107. Đây là mục tiêu; ngưỡng sàn trong test là số đo thật sau khi làm xong, và không thấp hơn 75 và 58.
- Toàn bộ test hiện có của bộ phân tích vẫn đạt.
- Giữ nguyên tắc không đoán và không phụ thuộc tên quán.

**Non-Goals**
- Không đổi bộ đọc chữ, tiền xử lý ảnh, bố cục dòng (`ocrLayout.ts`).
- Không đổi schema Dexie: không thêm bảng, index, không tăng version.
- Snapshot URL không đổi; link cũ vẫn mở được.
- Không có chuỗi giao diện mới, trừ ghi chú đối chiếu ở mục Decisions (có khoá `vi` và `en`).
- Không thêm phụ thuộc npm.

## Decisions

**Bộ bill hồi quy là văn bản, không phải ảnh.** Tệp `app/src/domain/__fixtures__/fnbReceipts.json` chứa mỗi bill một mục `{ id, group, totals, text }`: `id` là tên ảnh MC-OCR, `group` là nhóm quán (chỉ để báo cáo theo nhóm, bộ phân tích không đọc), `totals` là các số tổng chuẩn lấy từ nhãn TOTAL_COST của MC-OCR, `text` là văn bản VietOCR của pipeline hiện tại. Ảnh không vào repo vì nặng 26 MB và điều khoản dùng lại của bộ dữ liệu cuộc thi không rõ. Hệ quả: bộ bill đo bộ phân tích, không đo bộ đọc chữ; khi đổi bộ đọc chữ phải sinh lại văn bản bằng script ngoài repo.

**Test hồi quy dùng ngưỡng sàn, không so từng bill.** `receiptParser.fnbCorpus.test.ts` đếm số bill lấy đúng tổng và số bill khớp trọn, so với hai hằng số sàn. So từng bill sẽ buộc phải gán nhãn tay từng món của 107 bill; ngưỡng sàn đủ để chặn thụt lùi. Mỗi bố cục mới có thêm test đơn vị riêng theo Scenario trong `receiptParser.fnb.test.ts`.

**Số thứ tự đầu dòng chỉ bị bỏ khi có căn cứ.** Căn cứ là tiêu đề bảng có cột TT / STT / #, hoặc số đi kèm ")" hay ".", hoặc các dòng món liên tiếp bắt đầu bằng 1, 2, 3 tăng dần. Không có căn cứ thì số thuộc tên món ("7 Up").

**Nhóm nghìn cách bằng khoảng trắng.** `mergeThousandGroups` hiện không gộp nhóm kế tiếp khi số đứng trước đã tròn nghìn, để "139 000 139 000" không thành một số. Giữ quy tắc đó và thêm bước tách cặp: một dãy token `a bbb c ddd` ở cuối dòng món được thử cả hai cách đọc, cách nào thoả số lượng × đơn giá = thành tiền thì được chọn. Không cách nào thoả thì giữ cách đọc hiện tại và đánh dấu `uncertain`.

**Món hai dòng.** Dòng chỉ có số ngay sau dòng chỉ có chữ được ghép vào dòng chữ. Ba số được gán theo quan hệ số lượng × đơn giá = thành tiền, không theo vị trí. Dòng chỉ có một số tiền ngay sau một dòng món đã có số lượng và thành tiền là đơn giá nếu số lượng × số đó = thành tiền; không thoả thì xử lý như hiện tại.

**"Thành tiền" là nhãn tổng theo vị trí.** "Thành tiền" đang nằm trong `HEADER_RE` vì là tên cột. Dòng bắt đầu bằng nhãn này, có đúng một số tiền và nằm sau ít nhất một dòng món, được coi là dòng tổng: là tổng bill nếu phía dưới không còn dòng tổng thanh toán, là tiền hàng nếu có. Dòng tiêu đề cột (không có số tiền) không đổi.

**Làm tròn gộp vào giảm giá.** `ParsedReceipt` chỉ có giảm giá, phí phục vụ và VAT; thêm trường làm tròn sẽ kéo theo form hoá đơn, phép tính chia tiền và snapshot. Vì vậy số làm tròn được gộp vào giảm giá dạng số tiền: làm tròn xuống cộng vào giảm giá, làm tròn lên trừ khỏi giảm giá. Bill không có giảm giá mà làm tròn lên thì bộ phân tích không gộp, bước đối chiếu xử lý theo luật "Lệch nhỏ do thiếu món" đang có. Mọi số là nguyên đồng; tổng các món trừ giảm giá phải bằng tổng bill từng đồng.

**Giảm giá tính lại từ phần trăm là một kịch bản sửa của bước đối chiếu.** Bộ phân tích vẫn ưu tiên số tiền ghi trên bill như requirement hiện có. Chỉ khi không khớp, `validateReceipt` thử thêm kịch bản "giảm giá = phần trăm × tiền hàng, làm tròn về đồng"; khớp thì trạng thái là CORRECTED kèm ghi chú. Ghi chú là chuỗi mới, có khoá ở `i18n/index.ts` và `i18n/en.ts`.

**Dòng bảng thuế.** Sau khi đã gặp dòng tổng, dòng có từ 3 số tiền trở lên mà hai số cộng lại bằng số thứ ba (giá trước thuế + tiền thuế = giá sau thuế) là dòng bảng thuế và bị bỏ.

**Bill đã lưu trữ, Snapshot, lưu trữ bữa.** Không ảnh hưởng: change chỉ đổi gợi ý điền form hoá đơn của bữa đang mở, không thêm dữ liệu nào được lưu.

## Risks / Trade-offs

- Luật mới có thể làm hỏng bill đang đọc đúng. Giảm thiểu: toàn bộ test hiện có phải đạt, và ngưỡng sàn của bộ bill hồi quy không được tụt sau mỗi nhóm việc.
- Bộ bill nghiêng về quán cà phê và một quán chiếm 37/107 bill, nên số đo tổng thể lạc quan hơn thực tế. Test in thêm kết quả theo nhóm quán để thấy nhóm nào còn yếu.
- Văn bản trong bộ bill là của pipeline VietOCR hiện tại; đổi bộ đọc chữ về sau có thể làm văn bản khác đi.
- Gộp làm tròn vào giảm giá làm số giảm giá trên form khác số in trên bill vài trăm đồng. Chấp nhận, vì tổng phải khớp từng đồng.
