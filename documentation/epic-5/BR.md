# Epic 5 — Business Requirements (BR)

**Epic 5**: Quản lý Món (Tầng 3), Chế độ Chia tiền (Chia từng món / Chia tổng) & Người ứng tiền · **Trạng thái**: Đã triển khai (còn kiểm thủ công trên trình duyệt ở 375 px trước khi đóng)

Tài liệu đi cùng: [SA](./SA.md) · [Epics & Roadmap](../04-epics-and-roadmap.md) · [Kiến trúc & Data model §3.3–3.4](../01-architecture-and-data-model.md) · [Nghiệp vụ §1–2](../02-business-logic-and-algorithms.md) · [UI §4.2, §4.4](../03-ui-ux-and-design-system.md) · [Epic 4 BR](../epic-4/BR.md)

---

### A.1. Bối cảnh & Mục tiêu nghiệp vụ
Sau Epic 4, người dùng đã tạo được Kèo, thêm Hoá đơn kèm ảnh và quét OCR bóc tách danh sách món, giảm giá, phí phục vụ và VAT. Tuy nhiên, theo ranh giới đã chốt ở [Epic 4 BR A.1](../epic-4/BR.md), mọi hoá đơn do Epic 4 lưu đều đang cố định `splitType = 'EQUAL_TOTAL'`, danh sách chia đều luôn lấy trọn người trong kèo, các món có `consumers = []`, và thẻ kèo (`SessionCard`) mới chỉ hiển thị dòng tóm tắt hoá đơn chứ chưa mở ra Tầng 3 (danh sách món, chế độ chia và gán người ăn).

Epic 5 hoàn thiện **Tầng 3 (Món)** và cơ chế chia tiền ở cấp Hoá đơn để cung cấp dữ liệu đầu vào đầy đủ, chính xác cho động cơ quyết toán của Epic 6:

1. **Người ứng tiền (`payerMemberId`)**: Hiển thị rõ và cho phép chọn/đổi nhanh người đã trả toàn bộ hoá đơn ngay trên thẻ hoá đơn lẫn trong form hoá đơn, chỉ trong phạm vi người tham gia kèo.
2. **Hai phương thức nhập & Ràng buộc chế độ chia**:
   - Hoá đơn **Chỉ nhập tổng tiền (`TOTAL_ONLY`)**: Bắt buộc khoá cứng chế độ chia là **Chia đều theo tổng (`EQUAL_TOTAL`)**.
   - Hoá đơn **Nhập chi tiết món (`ITEMIZED`)**: Cho phép chuyển đổi linh hoạt giữa **Chia từng món (`BY_ITEM`)** và **Chia đều theo tổng (`EQUAL_TOTAL`)** bất cứ lúc nào mà không làm mất danh sách món hay cấu hình người ăn đã gán.
3. **Quản lý Món (Tầng 3) sau khi lưu hoá đơn**: Xem danh sách từng món kèm giá gốc, phần giảm giá/phí phục vụ/VAT phân bổ và giá cuối (`finalAmount`); thêm món mới, sửa hoặc xoá từng món trực tiếp và tự động tính lại phân bổ của toàn hoá đơn.
4. **Phạm vi người chia tiền**:
   - Khi ở `EQUAL_TOTAL`: Chọn những ai trong kèo tham gia chia đều hoá đơn này (`equalSplitParticipantIds`), mặc định là toàn bộ người trong kèo.
   - Khi ở `BY_ITEM`: Tick chọn nhanh những ai trong kèo cùng ăn từng món và chỉnh **số phần (`shares`)** khi một người dùng nhiều phần trong cùng một mục món; cảnh báo rõ những món chưa có người ăn.

### A.2. Các bên liên quan
| Vai trò | Quan tâm |
| :--- | :--- |
| Tôi (chủ app) | Chuyển nhanh giữa chia đều cả bill và chia theo món; tick người ăn trong vài chạm ngay trên màn chi tiết bữa; sửa/thêm/xoá lẻ một món mà không phải quét lại bill |
| Người ứng tiền | Hoá đơn ghi nhận đúng mình là người ứng toàn bộ `totalAmount`; đổi người ứng dễ dàng nếu lúc đầu chọn nhầm |
| Thành viên tham gia kèo | Chỉ bị tính tiền ở những hoá đơn/món mình thực sự dùng và đúng tỷ lệ số phần (`shares`) đã gọi |
| Dev Epic 6 (Quyết toán) | Mọi hoá đơn có `payerMemberId`, `splitType`, `equalSplitParticipantIds` và `items[].consumers` hợp lệ, nhất quán với `SessionKeo.participantIds` để tính `Paid(m)` và `Owed(m)` |
| Dev Epic 7–8 (Lưu trữ & Snapshot) | Dữ liệu Tầng 3 đầy đủ để xuất sang `MealSnapshotPayload` hoặc kiểm tra trước khi lưu trữ |

### A.3. Yêu cầu nghiệp vụ (BR)

| Mã | Yêu cầu | Truy vết |
| :-: | :--- | :--- |
| **BR-5.1** | Mỗi hoá đơn phải có đúng một **Người ứng tiền (`payerMemberId`)** thuộc danh sách người tham gia kèo (`SessionKeo.participantIds`). Người dùng chọn khi tạo hoá đơn hoặc đổi nhanh ngay trên thẻ hoá đơn. | US-5.1, YC#7, YC#23 |
| **BR-5.2** | Hỗ trợ đầy đủ 2 chế độ nhập hoá đơn (`ITEMIZED` và `TOTAL_ONLY`). Khi hoá đơn ở chế độ `TOTAL_ONLY`, hệ thống **bắt buộc đặt và khoá cứng** `splitType = 'EQUAL_TOTAL'`, vô hiệu hoá lựa chọn "Chia từng món" ở cả giao diện lẫn tầng dịch vụ. | US-5.2, YC#5, YC#6 |
| **BR-5.3** | Quản lý chi tiết từng **Món (`InvoiceItem`)** của hoá đơn `ITEMIZED`: hiển thị danh sách món ngay trong thẻ hoá đơn (tên, SL, đơn giá, điều chỉnh phân bổ, thành tiền sau điều chỉnh `finalAmount`); cho phép **thêm món mới, sửa món, xoá món** sau khi hoá đơn đã lưu và tự động tính lại tổng hoá đơn cùng phân bổ giảm giá/phí phục vụ/VAT cho tất cả các món. | US-5.2, YC#1, YC#15 |
| **BR-5.4** | Với hoá đơn `ITEMIZED`, người dùng chuyển đổi tức thì giữa **Chia từng món (`BY_ITEM`)** và **Chia đều theo tổng (`EQUAL_TOTAL`)** ngay trên thẻ hoá đơn hoặc trong form. Khi chuyển sang `EQUAL_TOTAL` rồi quay lại `BY_ITEM`, danh sách người ăn (`consumers`) đã gán ở từng món vẫn được giữ nguyên. | US-5.3, YC#5 |
| **BR-5.5** | Khi hoá đơn ở chế độ `EQUAL_TOTAL` (cả `ITEMIZED` lẫn `TOTAL_ONLY`), người dùng xem và tick chọn danh sách người cùng chia đều hoá đơn (`equalSplitParticipantIds`) trong số người tham gia kèo (mặc định gồm tất cả người trong kèo; có nút chọn nhanh "Tất cả người trong kèo"). | US-5.3, YC#5, YC#23 |
| **BR-5.6** | Khi hoá đơn ở chế độ `BY_ITEM`, mỗi món cho phép tick chọn những người cùng ăn trong số người tham gia kèo (`SessionKeo.participantIds`), mặc định mỗi người được tick có `shares = 1`. Hỗ trợ nút chọn nhanh **"Tất cả ($k$ người)"** cho từng món hoặc áp dụng cho mọi món chưa gán trong hoá đơn. | US-5.4, YC#1, YC#23 |
| **BR-5.7** | Khi một món ở chế độ `BY_ITEM` có người gọi nhiều phần riêng (VD: uống 3 lon bia trong mục 10 lon), người dùng chỉnh được **số phần (`shares`)** nguyên dương ($\ge 1$) cho từng người ăn món đó; giao diện hiển thị ngay tỷ lệ phần (`s_{i,m} / S_i`) và số tiền tạm tính của mỗi người ở món đó. | US-5.4, YC#1 |
| **BR-5.8** | Cảnh báo trực quan trên thẻ hoá đơn và từng dòng món khi hoá đơn đang ở chế độ `BY_ITEM` nhưng còn món chưa được gán người ăn (`consumers.length === 0`), để người dùng không bỏ sót món khi quyết toán. | US-5.3, US-5.4, YC#1 |
| **BR-5.9** | Bảo toàn tính nhất quán với người tham gia kèo và trạng thái bữa: không thể gán người ngoài kèo làm người ứng, người chia đều hay người ăn món; khi bữa ở trạng thái `ARCHIVED`, toàn bộ thao tác đổi người ứng, đổi chế độ chia, thêm/sửa/xoá món và gán người ăn đều bị khoá chỉ đọc. | US-5.1–5.4, YC#17, YC#23 |

### A.4. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
| :-: | :--- |
| **R-1** | **Phạm vi thành viên trong hoá đơn**: Mọi `payerMemberId`, mọi phần tử trong `equalSplitParticipantIds` và mọi `consumers[].memberId` của các món thuộc hoá đơn **phải thuộc `SessionKeo.participantIds`** của kèo chứa hoá đơn đó ([02 §1.0](../02-business-logic-and-algorithms.md)). Bất kỳ ID nào nằm ngoài `SessionKeo.participantIds` đều bị từ chối với mã lỗi tương ứng (`PAYER_NOT_IN_SESSION`, `SPLIT_MEMBER_NOT_IN_SESSION`, `CONSUMER_NOT_IN_SESSION`). |
| **R-2** | **Ràng buộc `TOTAL_ONLY` → `EQUAL_TOTAL`**: Nếu `invoice.inputMode === 'TOTAL_ONLY'` thì `invoice.splitType` bắt buộc bằng `'EQUAL_TOTAL'` và hoá đơn không có bản ghi `InvoiceItem` nào ([02 §1.1](../02-business-logic-and-algorithms.md)). Mọi yêu cầu đặt `splitType = 'BY_ITEM'` hoặc thêm món vào hoá đơn `TOTAL_ONLY` đều bị từ chối (`SPLIT_TYPE_LOCKED`). Nếu người dùng đổi một hoá đơn từ `ITEMIZED` sang `TOTAL_ONLY` trong form sửa hoá đơn, hệ thống tự động ép `splitType = 'EQUAL_TOTAL'` và xoá các món cũ của hoá đơn đó sau khi người dùng bấm Lưu. |
| **R-3** | **Chuyển đổi `BY_ITEM` ↔ `EQUAL_TOTAL` trên hoá đơn `ITEMIZED`**: Đổi `splitType` không làm thay đổi tiền hàng, giảm giá, phí phục vụ, VAT hay danh sách món. Khi chuyển từ `BY_ITEM` sang `EQUAL_TOTAL`, dữ liệu `consumers` trên các bản ghi `InvoiceItem` **được giữ nguyên trong DB** (không xoá) để nếu người dùng chuyển lại `BY_ITEM` thì không phải tick lại từ đầu; tuy nhiên khi tính tiền ở chế độ `EQUAL_TOTAL`, hệ thống chỉ chia theo `equalSplitParticipantIds` ([02 §1.2](../02-business-logic-and-algorithms.md)). |
| **R-4** | **Danh sách người chia đều (`equalSplitParticipantIds`)**: Không chứa ID trùng lặp, là tập con khác rỗng của `SessionKeo.participantIds` ($1 \le |\text{equalSplitParticipantIds}| \le |P_s|$). Nếu người dùng bỏ chọn hết khiến danh sách rỗng, hệ thống từ chối (`EQUAL_SPLIT_EMPTY`). Khi tạo hoá đơn mới, mặc định `equalSplitParticipantIds = [...session.participantIds]`. |
| **R-5** | **Danh sách người ăn của món (`consumers: ItemShare[]`)**: Mỗi `memberId` xuất hiện tối đa 1 lần trong `item.consumers` và phải thuộc `SessionKeo.participantIds`. Trường `shares` phải là **số nguyên dương** ($1 \le \text{shares} \le 999$). Khi người dùng mới tick chọn một người vào món, mặc định `shares = 1`. Khi bỏ tick hoặc giảm `shares` về 0, người đó được gỡ khỏi `item.consumers`. |
| **R-6** | **Món chưa có người ăn (`consumers.length === 0`)**: Hệ thống **cho phép lưu** món có `consumers = []` (vì người dùng mới quét OCR/nhập món xong tại Epic 4 hoặc đang thêm món trước rồi mới gán người ăn sau). Khi hoá đơn vừa được chuyển sang `BY_ITEM` lần đầu mà tất cả các món đều đang có `consumers = []`, hệ thống hỗ trợ thao tác 1 chạm **"Gán tất cả người trong kèo cho mọi món"** (hoặc gán theo từng món). Nếu một món trong hoá đơn `BY_ITEM` vẫn có `consumers = []`, giao diện hiển thị nhãn cảnh báo màu vàng đồng (`Chưa chọn người ăn`) và đếm số món chưa gán trên tiêu đề hoá đơn. |
| **R-7** | **Thêm, sửa, xoá món đơn lẻ sau khi đã lưu hoá đơn**: Chỉ áp dụng cho hoá đơn `ITEMIZED` của bữa `ACTIVE`. Mỗi khi thêm, sửa (`name`, `quantity`, `unitPrice`, `rawAmount`) hoặc xoá một món, hệ thống tính lại toàn bộ `subtotalAmount`, `discountAmount`, `serviceAmount`, `vatAmount`, `totalAmount` của hoá đơn và phân bổ lại `allocatedDiscountAmount`, `allocatedServiceAmount`, `allocatedVatAmount`, `finalAmount` cho toàn bộ các món còn lại theo đúng công thức phần dư lớn nhất ([02 §2](../02-business-logic-and-algorithms.md), R-8 Epic 4) trong **cùng một transaction**. Khi sửa món, danh sách `consumers` của món đó và các món khác được giữ nguyên. |
| **R-8** | **Xoá món cuối cùng của hoá đơn `ITEMIZED`**: Hoá đơn `ITEMIZED` bắt buộc có ít nhất 1 món (`INVALID_ITEM`). Nếu hoá đơn chỉ còn 1 món duy nhất, nút xoá món đó bị khoá (kèm gợi ý xoá cả hoá đơn hoặc chuyển hoá đơn sang chế độ *Chỉ nhập tổng tiền*), và tầng dịch vụ từ chối xoá món cuối cùng. Khi xoá một món đã có `consumers` được gán, hiển thị `ConfirmDialog` xác nhận trước khi xoá. |
| **R-9** | **Đồng bộ khi thay đổi người tham gia kèo (`SessionKeo.participantIds`)**: Giữ nguyên quy tắc đã cài ở `sessionService.setSessionParticipants` (Epic 4): không cho phép bỏ một thành viên khỏi kèo nếu người đó đang là `payerMemberId` của bất kỳ hoá đơn nào hoặc đang nằm trong `consumers` của bất kỳ món nào trong kèo (`SESSION_MEMBER_IN_USE`). Người được thêm mới vào kèo không tự động bị thêm vào `consumers` hay `equalSplitParticipantIds` của các hoá đơn/món đã tạo trước đó. |
| **R-10** | **Tương tác với trạng thái "Đã thanh toán" (`settlementStatuses`)**: Khi bữa đã có người/nhóm được tick `isPaid = true` (sau Epic 6), mọi thay đổi làm ảnh hưởng số tiền phải trả hoặc đã ứng (đổi `payerMemberId`, đổi `splitType`, đổi `equalSplitParticipantIds`, thêm/sửa/xoá món, đổi `consumers`/`shares`) đều tự động cập nhật `meal.updatedAt`. (Việc cảnh báo hoặc xử lý số dư thay đổi thuộc Epic 6; ở Epic 5 các hàm ghi vẫn thực thi nguyên tử trên bảng `invoices`/`items`/`meals`). |
| **R-11** | **Hiển thị số tiền tạm tính trên từng món**: Khi xem chi tiết món ở chế độ `BY_ITEM` và món đã có $S_i = \sum s_{i,m} > 0$, giao diện hiển thị số tiền tạm tính của mỗi người ăn $\text{round}(F_i \times s_{i,m} / S_i)$ để người dùng dễ đối chiếu tại chỗ; phép tính quyết toán chính thức của cả bữa (giữ số thực cộng dồn rồi làm tròn ở bước cuối) thuộc Epic 6 ([02 §1.2](../02-business-logic-and-algorithms.md)). |

### A.5. Tiêu chí nghiệm thu (nghiệp vụ)

Ba tiêu chí đầu lấy từ [04 — Epic 5](../04-epics-and-roadmap.md); các tiêu chí sau do BR/SA bổ sung.

- [x] AC-1: Nếu chọn "Chỉ nhập tổng tiền" (`TOTAL_ONLY`), giao diện và tầng dịch vụ tự động chọn và khoá ở chế độ "Chia đều theo tổng" (`EQUAL_TOTAL`), không cho chuyển sang "Chia từng món". *(BR-5.2, R-2)* **Đạt ở tầng dịch vụ (`invoiceService.test`); khoá nút UI chưa có test riêng.**
- [x] AC-2: Nếu hoá đơn có danh sách món (`ITEMIZED`), người dùng có thể đổi qua lại giữa "Chia từng món" (`BY_ITEM`) và "Chia đều theo tổng" (`EQUAL_TOTAL`) bất cứ lúc nào; đổi sang `EQUAL_TOTAL` rồi đổi lại `BY_ITEM` vẫn giữ nguyên người ăn và số phần đã gán cho từng món. *(BR-5.4, R-3)* **Đạt (`invoiceService.test`: đổi qua lại giữ người ăn và số phần).**
- [x] AC-3: Có thể thêm, sửa, xoá từng món ngay trên hoá đơn đã lưu và chọn/đổi người ứng tiền (`payerMemberId`) cho mỗi hoá đơn; tổng hoá đơn và phần giảm giá/phí phục vụ/VAT phân bổ vào từng món tự động cập nhật khớp 100% `totalAmount`. *(BR-5.1, BR-5.3, R-7, R-8)* **Đạt ở tầng dịch vụ (`invoiceService.test`: thêm/sửa/xoá, tổng khớp 100%).**
- [x] AC-4: Người ứng tiền, người chia đều (`equalSplitParticipantIds`) và người ăn từng món (`consumers`) chỉ chọn được trong danh sách người tham gia kèo (`SessionKeo.participantIds`); mọi ID ngoài kèo đều bị chặn. *(BR-5.1, BR-5.5, BR-5.6, R-1)* **Đạt (`invoiceService.test`: PAYER / SPLIT / CONSUMER_NOT_IN_SESSION).**
- [x] AC-5: Ở chế độ `EQUAL_TOTAL`, người dùng tick/bỏ tick được những ai trong kèo tham gia chia đều hoá đơn (tối thiểu 1 người) và có nút chọn nhanh tất cả người trong kèo. *(BR-5.5, R-4)* **Đạt (`InvoiceCard.test`: tick người chia đều; `invoiceService.test`: EQUAL_SPLIT_EMPTY).**
- [x] AC-6: Ở chế độ `BY_ITEM`, mỗi món cho phép tick/bỏ tick người ăn, chọn nhanh tất cả người trong kèo, và chỉnh số phần (`shares` nguyên dương $\ge 1$) cho từng người ăn; hiển thị đúng tỷ lệ phần và số tiền tạm tính. *(BR-5.6, BR-5.7, R-5, R-11)* **Đạt (`InvoiceCard.test`: chỉnh shares; `invoiceService.test`: setItemConsumers).**
- [x] AC-7: Khi hoá đơn ở chế độ `BY_ITEM` có món chưa gán người ăn (`consumers.length === 0`), giao diện hiển thị cảnh báo rõ ràng trên món và trên thẻ hoá đơn; có nút gán nhanh tất cả người trong kèo. *(BR-5.8, R-6)* **Đạt (`InvoiceCard.test`: cảnh báo và gán nhanh cả kèo cho món trống).**
- [x] AC-8: Không cho phép xoá món cuối cùng của hoá đơn `ITEMIZED`; xoá món đã có người ăn hiển thị `ConfirmDialog` của app (Huỷ là mặc định). *(R-8)* **Đạt (`invoiceService.test`: LAST_ITEM_CANNOT_DELETE; `InvoiceCard.test`: ConfirmDialog khi xoá món có người ăn).**
- [x] AC-9: Khi bữa ở trạng thái `ARCHIVED`, mọi thao tác đổi người ứng, đổi chế độ chia, sửa danh sách chia đều, thêm/sửa/xoá món và gán người ăn/số phần đều bị khoá chỉ đọc. *(BR-5.9)* **Đạt ở tầng dịch vụ (`invoiceService.test`: BR-5.9); khoá UI qua prop `readOnly` chưa có test riêng.**
- [ ] AC-10: Dùng tốt trên màn hình $\le 375\text{ px}$ không cuộn ngang, mọi nút chạm $\ge 44\text{ px}$, điều khiển được bằng bàn phím; toàn bộ test của Epic 1–4 vẫn đạt. *(phi chức năng & hồi quy)* ****Chưa thực hiện.** Kiểm trình duyệt 375 px và bàn phím cho Tầng 3 chưa làm; hồi quy: toàn bộ test đạt (399/399).**

### A.6. Ngoài phạm vi
- Tổng hợp chi phí toàn bữa theo từng thành viên/nhóm thanh toán, giải thuật quyết toán (`SELF_SETTLEMENT` / `HOST_MEDIATED`) và tick chọn "Đã thanh toán" (thuộc **Epic 6**).
- Lưu trữ bữa (`ARCHIVED`) và dọn dẹp hoá đơn/món/file khi lưu trữ (thuộc **Epic 7**).
- Chia sẻ tin nhắn thanh toán và mã hoá/hiển thị Custom URL Snapshot (thuộc **Epic 8**).
- Gán người ứng tiền nhiều người trên cùng một hoá đơn (quy tắc hệ thống [01 §3.3](../01-architecture-and-data-model.md), [02 §5.1](../02-business-logic-and-algorithms.md): mỗi hoá đơn có đúng **một** người ứng toàn bộ hoá đơn; nếu 2 người chia nhau trả tại quầy thì tách thành 2 hoá đơn trong cùng kèo).
- Chia món theo số tiền tuyệt đối tuỳ ý cho từng người (hệ thống chia theo tỷ lệ số phần `shares` nguyên dương theo [01 §3.4](../01-architecture-and-data-model.md) và [02 §1.2](../02-business-logic-and-algorithms.md)).
