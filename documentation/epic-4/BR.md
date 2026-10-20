# Epic 4 — Business Requirements (BR)

**Epic 4**: Quản lý Kèo (Tầng 2), File Hoá đơn & Nhận diện OCR + VAT (kèm Phí phục vụ, Giảm giá, Nén ảnh) · **Trạng thái**: đã triển khai; tiêu chí đạt/chưa đạt xem [SA B.10](./SA.md)

Tài liệu đi cùng: [SA](./SA.md) · [Epics & Roadmap](../04-epics-and-roadmap.md) · [Nghiệp vụ §1–3](../02-business-logic-and-algorithms.md) · [UI §4.2, §4.4](../03-ui-ux-and-design-system.md) · [Epic 3 BR](../epic-3/BR.md)

---

### A.1. Bối cảnh & Mục tiêu nghiệp vụ
Sau Epic 1–3, người dùng đã tạo được Bữa, thêm người, gom nhóm thanh toán; màn chi tiết bữa còn **Khu vực 2 (Kèo) là ô giữ chỗ**, và bảng `sessions`, `invoices`, `items`, `invoice_files` cùng `fileStorageService` đã có nhưng chưa ai ghi dữ liệu vào. Epic 4 làm cho Khu vực 2 dùng được:

1. **Kèo** (Tầng 2): thêm, đổi tên, sắp xếp, xoá; chọn người tham gia từng kèo.
2. **Hoá đơn**: mỗi kèo có một hoặc nhiều hoá đơn; mỗi hoá đơn đính kèm một hoặc nhiều ảnh (chụp hoặc tải lên), xem lại, tải về, xoá.
3. **OCR offline** (Tesseract.js, `vie+eng`): bóc tách ngày, tên quán, danh sách món + giá, VAT từ ảnh; người dùng kiểm tra/sửa trước khi lưu.
4. **Giảm giá, Phí phục vụ, VAT**: nhận diện từ OCR hoặc nhập tay, tự phân bổ vào giá từng món sao cho tổng các món khớp 100% tổng hoá đơn.
5. **Nén ảnh khi lưu** ở mức cố định *Cân bằng* để tiết kiệm bộ nhớ mà OCR vẫn đọc tốt.
6. **Tự quét OCR sau khi lưu ảnh**, lưu kết quả vào ảnh, và **báo ảnh trùng** để người dùng xoá bớt.

**Ranh giới với Epic 5** (để hai epic không chồng việc):

| Việc | Epic 4 | Epic 5 |
| :--- | :--- | :--- |
| Bản ghi Hoá đơn (quán, ngày, tổng, giảm giá, phí phục vụ, VAT, file) | Làm | — |
| Người ứng tiền | Có ô chọn tối thiểu (bắt buộc, vì `payerMemberId` là trường bắt buộc); mặc định là chủ trì nếu chủ trì thuộc kèo | Hoàn thiện (US-5.1) |
| Món | Chỉ tạo/sửa **trong form xem lại OCR hoặc nhập tay lúc tạo hoá đơn**, kèm phân bổ VAT | Sửa/xoá món sau khi lưu, màn danh sách món đầy đủ (US-5.2) |
| `TOTAL_ONLY` / `ITEMIZED`, khoá `EQUAL_TOTAL` | Lưu đúng hai trường; nhập "chỉ tổng tiền" là một tab của form | Ràng buộc đầy đủ và giao diện chuyển chế độ (US-5.2, 5.3) |
| `splitType` BY_ITEM / EQUAL_TOTAL, gán người ăn, số phần | Mặc định `EQUAL_TOTAL`, người chia đều = toàn bộ kèo; **không** gán người ăn | Toàn bộ (US-5.3, 5.4) |
| Tính tiền mỗi người | Không | Epic 6 |

Epic 4 vẫn phải lưu `Invoice` hợp lệ theo kiểu dữ liệu hiện có, nên các trường của Epic 5 nhận **giá trị mặc định an toàn** (bảng trên) chứ không để trống.

### A.2. Các bên liên quan
| Vai trò | Quan tâm |
| :--- | :--- |
| Tôi (chủ app) | Nhập một bữa nhiều kèo nhanh ngay tại bàn: chụp bill, quét, sửa vài con số, xong |
| Người ứng tiền | Hoá đơn ghi đúng tổng tiền mình đã trả |
| Dev Epic 5–8 | Hoá đơn/món lưu đúng cấu trúc, tổng khớp, người tham gia kèo nhất quán; hàm dọn dẹp file khi xoá |
| Epic 7 (Lưu trữ) | Tổng chi phí mỗi kèo tính được từ hoá đơn |

### A.3. Yêu cầu nghiệp vụ (BR)

| Mã | Yêu cầu | Truy vết |
| :-: | :--- | :--- |
| **BR-4.1** | Thêm **Kèo** vào bữa `ACTIVE` với tên (để trống thì tự đặt `Kèo <n>`). Kèo mới ở cuối danh sách. | US-4.1, YC#15 |
| **BR-4.2** | Đổi tên kèo; sắp xếp lại thứ tự kèo (lên/xuống); xoá kèo kèm hộp xác nhận nêu số hoá đơn, món, file sẽ mất. Xoá kèo xoá sạch hoá đơn, món, file vật lý của kèo đó. | US-4.1, YC#15 |
| **BR-4.3** | **Người tham gia kèo**: mặc định gồm toàn bộ người đang có trong bữa; chọn bớt/thêm lại, chỉ chọn trong người của bữa; kèo đã có hoá đơn thì danh sách không được rỗng và không bỏ được người đang là người ứng, người chia đều của hoá đơn trong kèo. Hiển thị `Người tham gia kèo (k/n)`. | US-4.1b, 02 §1.0 |
| **BR-4.4** | Thêm **Hoá đơn** vào kèo; một kèo có nhiều hoá đơn. Hoá đơn có: tên quán, ngày in trên hoá đơn, người ứng, tổng tiền, VAT, danh sách file ảnh. Sửa và xoá hoá đơn được (xoá kèm xác nhận, xoá luôn ảnh và món của hoá đơn). | US-4.2, YC#2, YC#14, YC#15 |
| **BR-4.5** | **Hai cách nhập hoá đơn** trong cùng form: tab *Nhập chi tiết món* (có danh sách món) và tab *Chỉ nhập tổng tiền* (một ô tổng tiền; có thể kèm VAT chưa cộng). Epic 4 lưu `inputMode` tương ứng. | US-5.2 (phần nhập), YC#6 |
| **BR-4.6** | **Ảnh hoá đơn**: chụp từ camera hoặc tải ảnh lên (JPEG/PNG/WebP) hoặc tải **PDF** (mỗi trang thành một ảnh, PDF có lớp chữ thì đọc thẳng chữ, không cần OCR); mỗi hoá đơn đính kèm nhiều ảnh; xem ảnh gốc, tải về, xoá từng ảnh. Ảnh lưu thành file (OPFS, dự phòng Blob IndexedDB) qua `fileStorageService` có sẵn; xoá ảnh/hoá đơn/kèo/bữa giải phóng dung lượng thật. | US-4.2, YC#2, YC#14 |
| **BR-4.7** | **OCR offline**: ảnh của hoá đơn được quét **tự động ngay sau khi lưu** (xem BR-4.17); nút "Quét lại bill (OCR)" quét lại thủ công. Quét chạy ngay trên máy (không gửi ảnh đi đâu, không cần API key), có thanh tiến trình và nút Huỷ. Bóc tách **ngày, tên quán, danh sách món (tên, số lượng, đơn giá, thành tiền), giảm giá, phí phục vụ, VAT**. Kết quả đổ vào form, **chưa lưu** cho tới khi người dùng bấm Lưu. | US-4.3, YC#3, YC#4 |
| **BR-4.8** | **Xem lại & sửa nhanh** sau OCR: mọi trường và từng dòng món sửa/xoá/thêm được; dòng nghi ngờ (không đọc chắc số tiền) được đánh dấu. Cảnh báo khi tổng các món lệch tổng ghi trên bill. **Đối chiếu trước khi điền** (`domain/receiptValidation`): mỗi dòng phải có SL × đơn giá = thành tiền; tổng các món (trừ giảm giá, cộng phí phục vụ, VAT theo R-8) phải khớp tổng bill và dòng "Tổng tiền hàng". Lệch thì thử các kịch bản khác từ cùng văn bản OCR (sửa SL/đơn giá/thành tiền một dòng, bỏ dòng tổng bị đọc thành món, đổi hoặc thêm giảm giá/phí phục vụ/VAT, đổi cách tính), chọn kịch bản ít thay đổi nhất và đánh dấu dòng đã sửa; không kịch bản nào khớp thì giữ số đọc được và báo người dùng chỉnh tay. OCR sai hoặc lỗi **không bao giờ chặn** việc nhập tay. | US-4.3 |
| **BR-4.9** | **VAT**: ba chế độ `NONE` / `PERCENTAGE` / `FIXED_AMOUNT`, tự nhận từ OCR hoặc chọn tay. Với hoá đơn có món, VAT được **phân bổ vào từng món**; tổng giá sau mọi điều chỉnh của các món luôn bằng đúng `totalAmount` của hoá đơn (không lệch 1đ). | US-4.4, YC#4, 02 §2 |
| **BR-4.10** | **Tự đặt tên kèo theo quán**: khi lưu một hoá đơn có tên quán lấy từ OCR, nếu tên kèo vẫn là tên tự đặt (`Kèo <n>`) thì kèo **tự đổi** thành `Kèo <tên quán>`, kèm thông báo "Đã đổi tên kèo thành …". Kèo đã được người dùng đặt tên riêng thì **không bị đổi**. Đổi lại tên bằng tay được bất cứ lúc nào. | Yêu cầu của anh, UI §4.4 |
| **BR-4.15** | **Giảm giá** và **Phí phục vụ** là hai khoản điều chỉnh của hoá đơn, mỗi khoản có ba chế độ `NONE` / `PERCENTAGE` / `FIXED_AMOUNT`, nhập tay hoặc tự nhận từ OCR (dòng `Giảm giá`, `Chiết khấu`, `Phí phục vụ`, `Service charge` kèm % hoặc số tiền). Áp dụng cho cả tab *Nhập chi tiết món* và *Chỉ nhập tổng tiền*. Với hoá đơn có món, hai khoản này được phân bổ vào từng món cùng VAT (R-8), nên người ăn món đắt chịu phần phí phục vụ lớn hơn và hưởng giảm giá nhiều hơn tương ứng. | Yêu cầu của anh, 02 §2 |
| **BR-4.16** | **Xử lý ảnh như máy quét khi lưu** (`lib/documentScan`): ảnh chụp/tải lên được tìm 4 góc tờ hoá đơn, cắt và nắn phối cảnh để bỏ nền, rồi chuyển trắng đen bằng ngưỡng thích nghi (nền trắng hoàn toàn, không đổ bóng) và làm dày nét chữ mảnh để OCR đọc rõ hơn; ảnh lưu là bản đã xử lý (PNG). Không tìm thấy tờ giấy thì chỉ nhị phân hoá cả ảnh; kết quả đáng ngờ (ảnh quá tối) hoặc lỗi thì rơi về nén như dưới đây. **Nén ảnh khi lưu, luôn ở mức Cân bằng**: mọi ảnh thêm vào hoá đơn được nén cố định theo mức *Cân bằng* (R-18), người dùng **không chọn mức nén**. Ảnh vốn đã nhỏ thì không bị nén thêm; ảnh nhỏ tới mức OCR khó đọc thì có cảnh báo; dung lượng trước/sau hiển thị cho từng ảnh. | Yêu cầu của anh, US-1.3 |
| **BR-4.17** | **Tự quét OCR sau khi lưu ảnh và lưu kết quả vào ảnh**: ngay khi ảnh được lưu, app tự quét OCR những ảnh chưa có văn bản OCR rồi điền form (hỏi trước khi ghi đè nếu form đã có dữ liệu, R-13). Văn bản OCR được **lưu vào metadata của chính ảnh** (`ocrRawText`); ảnh đã có văn bản thì **không quét lại** (trừ khi bấm "Quét lại bill"), và văn bản đó là dữ liệu để phát hiện ảnh trùng (BR-4.18). OCR lỗi không làm mất ảnh và không chặn nhập tay. | Yêu cầu của anh |
| **BR-4.18** | **Phát hiện và báo ảnh trùng**: sau khi quét, nếu văn bản OCR của ảnh mới giống ảnh đã có **trong cùng bữa** (cùng hoá đơn hoặc hoá đơn khác), form hiện thông báo nêu tên hai ảnh, mức giống, và nút **Xoá ảnh trùng** (xoá ảnh mới) hoặc **Giữ lại**. Ảnh trùng với ảnh cùng hoá đơn thì **không điền lại form** (dữ liệu đã có từ ảnh gốc). Chỉ cảnh báo, không tự xoá. | Yêu cầu của anh |
| **BR-4.11** | **Tổng chi phí** hiển thị ở mỗi hoá đơn, mỗi kèo (cộng các hoá đơn) và cả bữa (khớp với số đã hiển thị ở Epic 3). Bữa mới thêm hoá đơn đầu tiên thì "Chưa có chi phí" đổi thành số thật ở cả ba chế độ xem. | R-9 Epic 3 |
| **BR-4.12** | Bữa `ARCHIVED` hiển thị Khu vực 2 ở chế độ chỉ đọc: khoá mọi thao tác thêm/sửa/xoá. (Dữ liệu hoá đơn/ảnh của bữa lưu trữ do Epic 7 dọn; Epic 4 chỉ bảo đảm giao diện không cho sửa.) | US-7.3 |
| **BR-4.13** | Hành động phá huỷ (xoá kèo, xoá hoá đơn, xoá ảnh, bỏ người khỏi kèo khi đang dùng) dùng `ConfirmDialog` của app, nút Huỷ là mặc định. | BR-3.12 |
| **BR-4.14** | Dữ liệu nhập luôn bền vững: sau F5 mọi kèo, hoá đơn, món, ảnh còn nguyên; thao tác lỗi giữa chừng (quét OCR hỏng, lưu ảnh lỗi) không để lại hoá đơn nửa vời hoặc ảnh mồ côi. | US-1.2, US-1.3 |

### A.4. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
| :-: | :--- |
| **R-1** | **Tiền** là **số nguyên đồng** (VNĐ không có lẻ). Mọi ô nhập tiền chấp nhận `45000`, `45.000`, `45,000`, `45k` và lưu thành số nguyên không âm; từ chối âm, chữ lẫn lộn, hoặc > 9.999.999.999. Phép phân bổ/chia dùng số nguyên và dồn phần dư (R-8), không để lệch. |
| **R-2** | **Tên kèo**: bỏ khoảng trắng đầu/cuối, gộp khoảng trắng, tối đa 80 ký tự; để trống thì `Kèo <n>` với n là số thứ tự kế tiếp. Trùng tên được phép. **Tên quán**: tối đa 100 ký tự, tuỳ chọn. |
| **R-3** | **Thứ tự kèo** theo `orderIndex` liên tục từ 0; xoá kèo thì đánh số lại, đổi chỗ thì hoán đổi hai `orderIndex`. |
| **R-4** | **Người tham gia kèo** `P_s ⊆ Meal.participantIds`. Kèo mới = toàn bộ người bữa lúc tạo. Người thêm vào bữa sau **không tự vào kèo cũ**; muốn vào phải tick tay. Không ai ngoài bữa vào được kèo. |
| **R-5** | **Người ứng tiền** (`payerMemberId`) bắt buộc, thuộc `P_s`. Mặc định: chủ trì nếu thuộc `P_s`, ngược lại người đầu tiên trong `P_s`. Kèo có `P_s` rỗng thì không thêm được hoá đơn. |
| **R-6** | **Người chia đều** (`equalSplitParticipantIds`) ⊆ `P_s`, mặc định = `P_s`. Epic 4 không có ô chỉnh danh sách này (Epic 5 làm); khi `P_s` đổi thì cập nhật theo: người bị bỏ khỏi kèo bị bỏ khỏi danh sách, người được thêm vào kèo **không** tự thêm vào hoá đơn cũ. Danh sách chia đều không được rỗng. |
| **R-7** | **Ngày hoá đơn**: `YYYY-MM-DD` có thật, tuỳ chọn; OCR đọc `dd/mm/yyyy`, `dd-mm-yy`, `Ngày d tháng m năm yyyy` (năm 2 chữ số hiểu là 20xx). Ngày OCR ngoài `2000-01-01…2099-12-31` hoặc không có thật thì bỏ, không điền bừa. Đổi ngày bữa không đổi ngày hoá đơn (R-5 Epic 3). |
| **R-8** | **Công thức tính hoá đơn** (mọi số là số nguyên đồng). `S` = tiền hàng: `ΣR_i` với `R_i` là thành tiền gốc của món `i` (hoá đơn có món), hoặc số người dùng nhập (hoá đơn chỉ tổng). Theo **thứ tự cố định**: (1) **Giảm giá** `D`: `PERCENTAGE` → `round(S × p / 100)`, `FIXED_AMOUNT` → số nhập, `NONE` → 0; yêu cầu `0 ≤ D < S`. Tiền hàng sau giảm `N = S − D`. (2) **Phí phục vụ** `C` tính trên `N`: `PERCENTAGE` → `round(N × p / 100)`, `FIXED_AMOUNT` → số nhập. (3) **VAT** `V` tính trên `N + C`: `PERCENTAGE` → `round((N + C) × p / 100)`, `FIXED_AMOUNT` → số nhập. (4) `totalAmount = N + C + V`. *Lưu ý*: một số quán tính VAT chỉ trên tiền hàng, không gồm phí phục vụ; khi bill ghi **số tiền VAT cụ thể** thì dùng `FIXED_AMOUNT` để khớp đúng bill (OCR cũng ưu tiên số tiền ghi trên bill, xem R-14). **Phân bổ vào món** (phương pháp phần dư lớn nhất, tuần tự): `d_i` = phần của `D` theo tỷ lệ `R_i`; `n_i = R_i − d_i`; `c_i` = phần của `C` theo tỷ lệ `n_i`; `v_i` = phần của `V` theo tỷ lệ `n_i + c_i`; `finalAmount_i = n_i + c_i + v_i`. Mỗi lần phân bổ: mỗi món nhận `floor(X × w_i / Σw)`, phần dư cộng từng 1đ cho món có phần thập phân lớn nhất (hoà thì món đứng trước). Kết quả: `Σd_i = D`, `Σc_i = C`, `Σv_i = V`, `Σ finalAmount_i = totalAmount`. Tổng trọng số bằng 0 mà khoản cần phân bổ khác 0 thì từ chối với thông báo. |
| **R-9** | **Hoá đơn có món** (`ITEMIZED`): `subtotalAmount = Σ rawAmount`. **Hoá đơn chỉ tổng** (`TOTAL_ONLY`): người dùng nhập tiền hàng (`subtotalAmount`), không có món. Cả hai dùng công thức R-8 cho `totalAmount`. Nếu bill ghi sẵn "Tổng thanh toán" đã gồm mọi khoản thì người dùng để giảm giá/phí phục vụ/VAT = `NONE` và nhập tổng đó. `totalAmount` phải > 0. |
| **R-10** | **Món**: tên bắt buộc (tối đa 100 ký tự), số lượng số nguyên ≥ 1 (bill có lẻ như `0.5` thì người dùng gộp vào đơn giá), đơn giá ≥ 0; `rawAmount = quantity × unitPrice` mặc định, sửa tay thành tiền được (cho bill đã giảm giá). Hoá đơn `ITEMIZED` cần ≥ 1 món. Món mới tạo ở Epic 4 có `consumers = []` (Epic 5 gán). |
| **R-11** | **Đối chiếu tổng bill**: nếu OCR đọc được dòng "Tổng cộng/Thanh toán" và nó lệch `totalAmount` tính từ món, hiển thị cảnh báo `Tổng tính được 1.620.000 ₫ lệch tổng ghi trên bill 1.650.000 ₫` kèm gợi ý kiểm tra lại giảm giá/phí phục vụ/VAT; **không chặn lưu** (bill có khoản app chưa hỗ trợ như tip, làm tròn). |
| **R-12** | **Ảnh**: chỉ nhận `image/jpeg`, `image/png`, `image/webp` đầu vào, tối đa 40 MB/ảnh trước nén và 10 ảnh/hoá đơn. Ảnh được **nén trước khi lưu** theo R-18; bản đã nén là file duy nhất được lưu (không giữ bản gốc, xem hạn chế SA B.8-12). Hoá đơn chưa lưu (đang soạn) có ảnh tạm; huỷ form thì xoá ảnh tạm (BR-4.14). |
| **R-18** | **Mức nén ảnh cố định *Cân bằng***: đầu ra JPEG, cạnh dài tối đa **2000 px**, chất lượng **0,80**. Không bao giờ **phóng to**: ảnh có cạnh dài nhỏ hơn 2000 px giữ nguyên kích thước; ảnh nhỏ (≤ 400 KB) và không cần thu nhỏ thì không nén lại; nếu bản nén **lớn hơn** bản gốc thì giữ bản gốc. Ảnh có cạnh dài dưới 1000 px được cảnh báo "ảnh nhỏ, OCR có thể đọc sai". Dung lượng trước/sau lưu trong bản ghi ảnh (`originalSizeBytes`, `sizeBytes`). OCR đọc bản đã lưu (đã nén); mức *Cân bằng* vẫn đủ rõ cho OCR. |
| **R-19** | **So khớp ảnh trùng**: so sánh **tập từ** của văn bản OCR (bỏ dấu tiếng Việt, chỉ giữ chữ và số, bỏ từ 1 ký tự) bằng độ giống Jaccard; từ **0,8** trở lên là trùng. Văn bản dưới 8 từ thì không đủ để kết luận (không báo trùng). Chỉ so với ảnh của cùng bữa. Cùng bill chụp hai lần khác từng byte vẫn bị bắt vì số tiền và tên món giống nhau. |
| **R-13** | **OCR chạy hoàn toàn cục bộ**; dữ liệu ngôn ngữ (`vie`, `eng`) đi kèm app, không tải từ mạng khi quét. Lần quét đầu có thể chậm hơn do khởi tạo; hiển thị tiến trình. Nhiều ảnh được quét lần lượt và ghép văn bản theo thứ tự ảnh. Có thể quét lại bất cứ lúc nào; quét lại **hỏi trước khi ghi đè** những gì người dùng đã sửa tay. |
| **R-14** | **Phân tích hoá đơn** theo đúng heuristic trong 02 §3: ngày, tên quán (bỏ dòng địa chỉ/SĐT), VAT (`VAT 8%`, `Thuế GTGT: 36.000`), **giảm giá** (`Giảm giá`, `Chiết khấu`, `Khuyến mãi`, `Discount`, kèm % hoặc số tiền, có thể mang dấu trừ), **phí phục vụ** (`Phí phục vụ`, `Phục vụ`, `Phí DV`, `Service charge`, kèm % hoặc số tiền), món (bố cục 1 dòng và 2 dòng), bỏ dòng tiêu đề bảng, chân trang và các dòng giảm giá/phí phục vụ/VAT ra khỏi danh sách món. Khi bill có **cả % và số tiền** cho cùng khoản, ưu tiên số tiền (khớp đúng bill), giữ % làm ghi chú. Không chắc thì **bỏ trống và đánh dấu**, không đoán số tiền. Parser là hàm thuần, có bộ ví dụ chuẩn làm test. |
| **R-15** | **Xoá dây chuyền**: xoá ảnh → xoá bản ghi `invoice_files` (qua `fileStorageService`); xoá hoá đơn → ảnh + món + hoá đơn; xoá kèo → mọi hoá đơn của kèo. File vật lý xoá **trước**, DB sau (cùng nguyên tắc R-6 Epic 3), để lỗi giữa chừng không để file mồ côi. |
| **R-16** | **Bỏ người khỏi bữa** (Epic 2): người đang là người ứng hoặc người chia đều của một hoá đơn vẫn bị chặn `MEMBER_IN_USE` như hiện nay; người chỉ có trong `P_s` thì tự rời (đã có). Epic 4 chỉ bảo đảm hàm kiểm tra dùng chung dữ liệu hoá đơn mới. |
| **R-17** | **Hiển thị**: tiền theo `formatMoney`, chữ số thẳng cột; kèo thu gọn/mở rộng được (mặc định mở kèo vừa thêm, thu gọn các kèo khác khi bữa có ≥ 4 kèo). |

### A.5. Tiêu chí nghiệm thu (nghiệp vụ)

Bốn tiêu chí đầu lấy từ [04 — Epic 4](../04-epics-and-roadmap.md); các tiêu chí sau do BR/SA bổ sung.

- [x] AC-1: Mỗi kèo có danh sách người tham gia riêng (mặc định cả bữa); người ứng và người chia đều của hoá đơn thuộc danh sách đó; không bỏ được người đang được dùng. *(BR-4.3, R-4…R-6)*
- [ ] AC-2: Mỗi kèo thêm được nhiều hoá đơn; mỗi hoá đơn có nhiều ảnh xem lại, tải về, xoá được; xoá ảnh/hoá đơn/kèo/bữa giải phóng file thật. *(BR-4.4, BR-4.6, R-15)* *(đạt một phần, xem SA B.10)*
- [ ] AC-3: Quét ảnh bill bằng OCR bóc tách được ngày, tên quán, món + giá và VAT trên bộ bill mẫu; người dùng sửa nhanh trước khi lưu; OCR hỏng không chặn nhập tay. *(BR-4.7, BR-4.8, R-14)* *(đạt một phần, xem SA B.10)*
- [x] AC-4: Khi hoá đơn có VAT, tổng giá sau VAT của các món khớp tuyệt đối `totalAmount`, kể cả khi chia không tròn (kiểm bằng nhiều bộ số, gồm trường hợp phần dư). *(BR-4.9, R-8)*
- [x] AC-5: Thêm/đổi tên/sắp xếp/xoá kèo hoạt động; kèo mới tự đặt `Kèo <n>`; xoá kèo kèm xác nhận nêu số lượng sẽ mất và xoá sạch dữ liệu con. *(BR-4.1, BR-4.2, R-2, R-3)*
- [x] AC-6: Nhập tab "Chỉ nhập tổng tiền" lưu được hoá đơn không món, tổng đúng sau VAT. *(BR-4.5, R-9)*
- [ ] AC-7: Tổng chi phí hoá đơn/kèo/bữa đúng, và cột "tổng chi phí" ở cả ba chế độ xem bữa (Epic 3) cập nhật ngay, không cần tải lại. *(BR-4.11)* *(đạt một phần, xem SA B.10)*
- [ ] AC-8: Sau F5 mọi dữ liệu còn nguyên; huỷ form đang soạn không để lại ảnh/hoá đơn mồ côi. *(BR-4.14, R-12)* *(đạt một phần, xem SA B.10)*
- [x] AC-9: Bữa `ARCHIVED` không sửa được kèo/hoá đơn/ảnh. *(BR-4.12)*
- [x] AC-10: Nhập tiền chấp nhận `45000` / `45.000` / `45k`, từ chối giá trị không hợp lệ kèm thông báo tiếng Việt. *(R-1)*
- [ ] AC-11: Dùng được ở ≤ 375 px không cuộn ngang; mọi nút/ô chạm ≥ 44 px; thao tác bằng bàn phím được; camera hoạt động trên điện thoại. *(phi chức năng)* *(đạt một phần, xem SA B.10)*
- [x] AC-12: Các test Epic 1–3 vẫn đạt. *(hồi quy)*
- [x] AC-13: Giảm giá và phí phục vụ (%, số tiền, hoặc không) nhập tay và nhận từ OCR; `totalAmount = tiền hàng − giảm giá + phí phục vụ + VAT` theo đúng thứ tự R-8; các khoản được phân bổ vào món và `Σ finalAmount = totalAmount` tuyệt đối trên nhiều bộ số (gồm chia không tròn và `D` sát `S`). *(BR-4.15, R-8, R-14)*
- [x] AC-14: Lưu hoá đơn có tên quán từ OCR thì kèo mang tên tự đặt đổi thành `Kèo <tên quán>` và hiện thông báo; kèo đã có tên riêng không bị đổi; tên quá dài bị cắt đúng giới hạn. *(BR-4.10)*
- [x] AC-15: Mọi ảnh được nén ở mức Cân bằng (không có lựa chọn mức nén), không phóng to, không lưu bản nén lớn hơn bản gốc, hiện dung lượng trước/sau, cảnh báo ảnh nhỏ; sau nén ảnh vẫn OCR được trên bill mẫu. *(BR-4.16, R-18)*
- [x] AC-16: Sau khi lưu ảnh, app tự quét OCR và điền form; văn bản OCR được lưu vào ảnh; ảnh đã có văn bản không bị quét lại khi thêm ảnh khác. *(BR-4.17)*
- [x] AC-17: Thêm một ảnh trùng với ảnh đã có trong bữa thì hiện thông báo kèm nút Xoá ảnh trùng / Giữ lại; bill khác nhau không bị báo trùng; ảnh trùng cùng hoá đơn không điền lại form. *(BR-4.18, R-19)*

### A.6. Ngoài phạm vi
- Sửa/xoá món sau khi lưu, màn danh sách món đầy đủ, khoá `TOTAL_ONLY → EQUAL_TOTAL` ở giao diện chuyển chế độ, chuyển `BY_ITEM`/`EQUAL_TOTAL`, gán người ăn và số phần, chỉnh danh sách người chia đều (Epic 5). Epic 4 chỉ để món ở dạng "đã có trong hoá đơn, chưa gán người ăn".
- Tính tiền từng người, gom nhóm thanh toán, bảng quyết toán, tick thanh toán (Epic 6).
- Lưu trữ bữa và dọn hoá đơn/món/file khi lưu trữ (Epic 7).
- Chia sẻ, Snapshot (Epic 8).
- Giảm giá **theo từng món**, tip, nhiều mức VAT trên cùng một bill, làm tròn tổng bill, ngoại tệ. (Giảm giá và phí phục vụ **ở mức cả bill** thuộc Epic 4.)
- Cắt/xoay/nắn phẳng ảnh bill bằng tay; OCR bằng dịch vụ đám mây; nhận diện chữ viết tay.
- Quét mã QR hoá đơn điện tử; nhập từ hoá đơn PDF.
- Hoàn tác xoá kèo/hoá đơn.
