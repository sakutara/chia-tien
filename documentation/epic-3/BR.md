# Epic 3 — Business Requirements (BR)

**Epic 3**: Hệ thống Quản lý Bữa (CRUD & 3 Chế độ Xem: Lịch, Danh sách, Loại) · **Trạng thái**: đã triển khai; tiêu chí nghiệm thu bên dưới đánh dấu theo kết quả thật ở [SA B.9](./SA.md)

Tài liệu đi cùng: [SA](./SA.md) · [Epics & Roadmap](../04-epics-and-roadmap.md) · [Epic 2 BR](../epic-2/BR.md) · [UI §4.1–4.2](../03-ui-ux-and-design-system.md)

---

### A.1. Bối cảnh & Mục tiêu nghiệp vụ
Sau Epic 1–2, ứng dụng đã có kho dữ liệu, danh bạ, chủ trì và nhóm thanh toán, nhưng **chưa có cách tạo hay tìm lại một Bữa thật**: người và nhóm đang gắn vào một bữa nháp cố định (`PeopleSandbox`). Epic 3 biến Bữa (Tầng 1, tính theo ngày) thành đối tượng người dùng quản lý được:

1. **Tạo, sửa, xoá Bữa** (cả bữa đang hoạt động lẫn bữa đã lưu trữ — riêng việc sửa chỉ cho bữa đang hoạt động).
2. **Tìm lại bữa theo ba cách nhìn** trên cùng một dữ liệu: Lịch (ngày/tháng/năm), Danh sách (mới → cũ), Loại (đang hoạt động / đã lưu trữ).
3. **Mở một Bữa** vào màn hình chi tiết, nơi đặt khối Thành viên / Chủ trì / Nhóm thanh toán của Epic 2 và chừa sẵn chỗ cho Kèo (Epic 4) và Quyết toán (Epic 6).
4. **Thay trang thử `PeopleSandbox`** bằng luồng thật, không làm mất khả năng đổi tên hồ sơ "Tôi" (BR-2.7 của Epic 2).

Epic này chỉ lo **vòng đời và việc tìm kiếm/hiển thị Bữa**. Kèo, hoá đơn, món, tính tiền, tick thanh toán, lưu trữ và chia sẻ thuộc Epic 4–8; Epic 3 chỉ hiển thị các con số đó khi đã có và hiện giá trị rỗng khi chưa có.

### A.2. Các bên liên quan
| Vai trò | Quan tâm |
| :--- | :--- |
| Tôi (chủ app) | Tạo bữa nhanh (vài giây), tìm lại bữa cũ theo ngày hoặc theo trạng thái, xoá bữa không cần |
| Người chủ trì / thành viên | Gián tiếp: bữa phải hiển thị đúng người, đúng ngày |
| Dev Epic 4–8 | Cần một Bữa tồn tại với `participantIds`, `hostMemberId` nhất quán; màn hình chi tiết có sẵn khung để gắn Kèo, Quyết toán, nút Lưu trữ, Chia sẻ; hàm xoá bữa dọn đủ mọi bảng con |
| Epic 7 (Lưu trữ) | Bữa `ARCHIVED` phải hiển thị và xoá được, nhưng không sửa được |

### A.3. Yêu cầu nghiệp vụ (BR)

| Mã | Yêu cầu | Truy vết |
| :-: | :--- | :--- |
| **BR-3.1** | Tạo Bữa mới với Tên bữa, Ngày diễn ra, Ghi chú (tuỳ chọn). Bữa mới ở trạng thái `ACTIVE`, chủ trì là "Tôi" và "Tôi" tự nằm trong danh sách tham gia. Tạo xong chuyển thẳng vào màn hình chi tiết bữa để thêm người. | US-3.1, YC#1, YC#15 |
| **BR-3.2** | Sửa Tên bữa, Ngày, Ghi chú của bữa đang hoạt động. Bữa đã lưu trữ không sửa được. | US-3.1, YC#15 |
| **BR-3.3** | Xoá Bữa (đang hoạt động **hoặc** đã lưu trữ) kèm hộp xác nhận nêu rõ sẽ mất những gì. Xoá là xoá sạch: toàn bộ Kèo, Hoá đơn, Món, bản ghi file hoá đơn và file vật lý (OPFS) của bữa đó; bữa khác không bị ảnh hưởng. | US-3.1, YC#14, YC#15, YC#18 |
| **BR-3.4** | **Chế độ xem Lịch**: lưới lịch theo tháng với chọn Năm/Tháng nhanh, nút "Hôm nay", tuần bắt đầu từ Thứ 2. Ngày có Bữa được đánh dấu kèm tên bữa và tổng tiền. Bấm vào một ngày để xem các bữa trong ngày đó và/hoặc tạo bữa mới đã điền sẵn ngày ấy. | US-3.2, YC#19 |
| **BR-3.5** | **Chế độ xem Danh sách**: mọi bữa xếp từ mới nhất đến cũ nhất; mỗi thẻ hiển thị ngày, tên, trạng thái, số kèo, số người, tổng chi phí, tiến độ thanh toán, nút Mở và Xoá. | US-3.3, YC#19 |
| **BR-3.6** | **Chế độ xem Loại**: tách hai phân khu "Đang hoạt động" (`ACTIVE`) và "Đã lưu trữ" (`ARCHIVED`), có đếm số bữa mỗi phân khu; bữa đã lưu trữ chỉ còn Mở (xem, chỉ đọc) và Xoá. | US-3.4, YC#19, YC#18 |
| **BR-3.7** | Chuyển qua lại giữa ba chế độ xem luôn cho cùng một tập dữ liệu: tạo/sửa/xoá ở một chế độ thì hai chế độ còn lại cập nhật ngay, không cần tải lại. Ứng dụng nhớ chế độ xem lần trước trên thiết bị. | US-3.2–3.4 |
| **BR-3.8** | Tóm tắt của mỗi bữa (số kèo, số người, tổng chi phí, tiến độ thanh toán) được tính từ dữ liệu thật, dùng chung một nguồn cho cả ba chế độ xem. Bữa chưa có hoá đơn hiển thị "Chưa có chi phí", không hiển thị số 0 gây hiểu nhầm. | US-3.3, US-3.2 |
| **BR-3.9** | Màn hình chi tiết Bữa (Meal Workspace): thanh đầu hiển thị tên, ngày, trạng thái, chủ trì, tổng chi; Khu vực 1 chứa khối Thành viên / Chủ trì / Nhóm thanh toán của Epic 2; Khu vực 2 (Kèo) và Khu vực 3 (Quyết toán) hiện ô giữ chỗ ghi rõ epic sẽ làm. Có nút Quay lại, Sửa thông tin, Xoá bữa. Mở được trực tiếp bằng đường dẫn và còn nguyên sau khi tải lại trang (F5). | US-3.1, ghi chú bàn giao Epic 2 |
| **BR-3.10** | Bữa đã lưu trữ mở ở chế độ chỉ đọc: khối người/nhóm/chủ trì khoá (dùng cờ `readOnly` đã có ở Epic 2), ẩn nút Sửa; vẫn có nút Xoá. | US-3.4, ràng buộc với Epic 7 |
| **BR-3.11** | Hồ sơ "Tôi" vẫn đổi tên được từ giao diện chính (chuyển từ `PeopleSandbox` lên thanh đầu trang, mục "Hồ sơ của tôi"), giữ nguyên quy tắc Epic 2 (không xoá được, tên capitalized, không trùng). | BR-2.7 (Epic 2), US-2.3 |
| **BR-3.12** | Mọi hành động phá huỷ hoặc làm mất trạng thái (xoá bữa, bỏ người đang tick "Đã thanh toán", đổi/giải tán nhóm có tick) dùng hộp xác nhận đúng giao diện USD thay cho `window.confirm`. | Nợ kỹ thuật B.8 Epic 2, US-3.1 |

### A.4. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
| :-: | :--- |
| **R-1** | **Tên bữa**: bỏ khoảng trắng đầu/cuối, gộp nhiều khoảng trắng liên tiếp, bỏ ký tự điều khiển; tối đa 100 ký tự. **Giữ nguyên chữ hoa/thường người dùng gõ** (khác tên người ở Epic 2). Để trống thì tự đặt `Bữa <dd/mm/yyyy>` theo ngày của bữa; hai bữa cùng tên được phép (phân biệt bằng ngày). |
| **R-2** | **Ngày bữa**: định dạng `YYYY-MM-DD`, phải là ngày có thật trên lịch (từ chối `2026-02-30`), trong khoảng `2000-01-01` đến `2099-12-31`. Cho phép ngày tương lai (bữa dự kiến). "Hôm nay" và ngày mặc định khi tạo luôn tính theo **giờ địa phương** của thiết bị, không phải UTC (tạo bữa lúc 00:30 giờ Việt Nam vẫn ra đúng ngày hôm đó). |
| **R-3** | **Ghi chú**: tuỳ chọn, bỏ khoảng trắng đầu/cuối, tối đa 500 ký tự; để trống thì không lưu trường `note`. Giữ nguyên xuống dòng. |
| **R-4** | **Giá trị khởi tạo của bữa mới**: `status = ACTIVE`; `participantIds = [Tôi]` và `hostMemberId = defaultHostMemberId` (lấy từ `initMealPeople()` của Epic 2); `settlementMode = SELF_SETTLEMENT`; `paymentGroups = []`; `settlementStatuses = {}`; `createdAt = updatedAt = now`. |
| **R-5** | **Sửa**: chỉ bữa `ACTIVE`. Sửa Tên/Ngày/Ghi chú cập nhật `updatedAt`; không đụng người, chủ trì, nhóm, kèo, hoá đơn. Đổi ngày bữa **không** đổi ngày in trên hoá đơn (`Invoice.invoiceDate` là dữ liệu riêng). Bữa `ARCHIVED` bị từ chối (`MEAL_ARCHIVED`). |
| **R-6** | **Xoá bữa (dây chuyền)**: xoá theo thứ tự (1) file hoá đơn của bữa, gồm cả file OPFS và bản ghi `invoice_files`; (2) trong **một transaction** xoá `items`, `invoices`, `sessions` của bữa rồi xoá chính `meals`. Nếu bước (1) lỗi giữa chừng thì bữa còn nguyên và thử xoá lại được; bữa không bao giờ biến mất khi còn dữ liệu con "mồ côi" của nó. Thành viên trong danh bạ **không** bị xoá (Epic 2 R-15). Xoá không hoàn tác được. |
| **R-7** | **Hộp xác nhận xoá** nêu tên bữa, ngày và số lượng sẽ mất: số kèo, hoá đơn, món, file ảnh. Bữa chưa có gì thì chỉ nêu tên và ngày. Nút huỷ là nút mặc định được focus. |
| **R-8** | **Thứ tự bữa ở mọi nơi**: `date` giảm dần; cùng ngày thì `createdAt` giảm dần (bữa tạo sau đứng trước). Trong ô lịch và danh sách trong ngày dùng cùng thứ tự đó. |
| **R-9** | **Tổng chi phí của bữa**: bữa `ACTIVE` = tổng `Invoice.totalAmount` của mọi hoá đơn thuộc bữa; bữa `ARCHIVED` = `archivedSummary.totalMealAmount`, nếu thiếu thì coi như chưa có chi phí. Hiển thị theo định dạng VNĐ có dấu phân cách hàng nghìn, chữ số thẳng cột. Epic 3 chưa tạo được hoá đơn nên mọi bữa mới đều là "Chưa có chi phí"; công thức được kiểm thử bằng dữ liệu giả lập. |
| **R-10** | **Tiến độ thanh toán**: *thực thể thanh toán* = mỗi nhóm thanh toán là 1, cộng mỗi người tham gia chưa thuộc nhóm nào. Hiển thị `<đã tick>/<tổng thực thể> đã thanh toán` khi bữa có chi phí (R-9); bữa chưa có chi phí hiển thị "Chưa có chi phí". Với bữa `ARCHIVED` lấy từ `archivedSummary.entitiesSummary` (`isPaid`). *Hạn chế đã biết*: Epic 6 sẽ tinh chỉnh để thực thể có số dư bằng 0 không bị tính; Epic 3 đếm mọi thực thể. |
| **R-11** | **Số kèo / số người**: số kèo = số bản ghi `sessions` của bữa (bữa `ARCHIVED` giữ nguyên các `sessions`, nên vẫn đếm đúng); số người = `participantIds.length` của **bữa** (số người từng kèo có thể ít hơn, do Epic 4 quản lý — mỗi kèo có danh sách người tham gia riêng, là tập con của người trong bữa, xem [02 §1.0](../02-business-logic-and-algorithms.md)). Xoá bữa xoá luôn các kèo cùng danh sách người của chúng (R-6). |
| **R-12** | **Lịch**: tuần bắt đầu Thứ 2; lưới đủ số tuần chạm tháng đang xem (5 hoặc 6 hàng); các ngày thuộc tháng liền kề hiển thị mờ nhưng vẫn có đánh dấu bữa và bấm được (bấm thì chuyển sang tháng đó). Ngày hôm nay có viền nhấn; ngày đang chọn tô nền xanh USD. Một ô hiển thị tối đa 2 bữa (tên + tổng tiền), từ bữa thứ 3 là "+N bữa nữa". Trên màn hình hẹp (< 640 px) ô chỉ hiện chấm đánh dấu và số bữa; chi tiết nằm ở khung danh sách bữa trong ngày bên dưới. |
| **R-13** | **Chọn ngày trên lịch**: mặc định chọn hôm nay khi mở chế độ Lịch. Khung bên dưới liệt kê các bữa của ngày đang chọn (cả `ACTIVE` lẫn `ARCHIVED`, bữa lưu trữ có biểu tượng khoá) và nút **"+ Tạo bữa mới cho ngày này"** điền sẵn ngày đó (người dùng vẫn đổi được). Ngày không có bữa hiển thị lời nhắc tạo bữa. |
| **R-14** | **Điều hướng lịch**: nút tháng trước/sau, ô chọn Tháng và Năm (2000–2099), nút "Hôm nay". Đổi tháng không làm mất ngày đang chọn nếu ngày đó vẫn nằm trong lưới. |
| **R-15** | **Chế độ Loại**: hai tab "Đang hoạt động (n)" và "Đã lưu trữ (n)", mặc định tab đầu; trong mỗi tab bữa xếp theo R-8. Tab rỗng hiển thị câu giải thích ngắn (ví dụ tab lưu trữ: "Chưa có bữa nào được lưu trữ. Bữa chỉ lưu trữ được khi mọi khoản thanh toán đã hoàn tất."). |
| **R-16** | **Nhớ chế độ xem**: lưu lựa chọn (`CALENDAR` / `LIST` / `STATUS`) cục bộ trên thiết bị; mặc định `LIST`. Nếu không đọc/ghi được bộ nhớ cục bộ (chế độ riêng tư) thì dùng mặc định và vẫn chuyển chế độ bình thường trong phiên. |
| **R-17** | **Điều hướng**: có hai màn hình, "Danh sách bữa" (`#/`) và "Chi tiết bữa" (`#/meal/<id>`). Đường dẫn tới bữa không tồn tại (đã xoá hoặc gõ sai) hiển thị thông báo "Không tìm thấy bữa này" kèm nút về danh sách, không để trắng màn hình. Xoá bữa từ màn chi tiết thì quay về danh sách. |
| **R-18** | **Trạng thái rỗng**: lần đầu mở app (chưa có bữa nào) hiển thị lời giới thiệu ngắn và nút lớn "+ Tạo bữa đầu tiên" thay vì danh sách trống. |
| **R-19** | **Bữa nháp cũ**: bữa `Bữa thử nghiệm (Epic 2)` có thể còn trong trình duyệt của người dùng từ Epic 2; nó được đối xử như một bữa bình thường (xem, sửa, xoá được), không có xử lý đặc biệt. |

### A.5. Tiêu chí nghiệm thu (nghiệp vụ)

Hai tiêu chí đầu lấy từ [04 — Epic 3](../04-epics-and-roadmap.md); các tiêu chí sau do BR/SA bổ sung.

- [x] AC-1: Chuyển đổi giữa 3 chế độ xem (Lịch / Danh sách Mới→Cũ / Theo Loại) giữ nguyên tính nhất quán dữ liệu: cùng số bữa, cùng tên, ngày, tổng tiền; thao tác ở chế độ này hiện ngay ở chế độ kia. *(BR-3.7, BR-3.8)* **Đã kiểm: tự động.**
- [x] AC-2: Khi xoá một Bữa, toàn bộ Kèo, Hoá đơn, File ảnh hoá đơn (bản ghi và file OPFS) và Món thuộc bữa đó đều bị xoá sạch; bữa khác và danh bạ nguyên vẹn. *(BR-3.3, R-6)* **Đã kiểm: tự động; chưa thử file OPFS thật.**
- [x] AC-3: Tạo bữa với Tên/Ngày/Ghi chú hợp lệ thành công và mở thẳng màn chi tiết; để trống tên thì tên tự đặt theo ngày; ngày không có thật hoặc ngoài khoảng bị từ chối kèm thông báo. *(BR-3.1, R-1…R-3)* **Đã kiểm: tự động + trình duyệt.**
- [x] AC-4: Bữa mới có "Tôi" là chủ trì và là người tham gia duy nhất; bữa A thêm/đổi người không ảnh hưởng bữa B. *(R-4, Epic 2 AC-6)* **Đã kiểm: tự động.**
- [x] AC-5: Sửa Tên/Ngày/Ghi chú của bữa `ACTIVE` lưu được và cập nhật ở cả ba chế độ xem; sửa bữa `ARCHIVED` bị từ chối. *(BR-3.2, R-5)* **Đã kiểm: tự động; chưa thử trong trình duyệt.**
- [x] AC-6: Chế độ Lịch đánh dấu đúng các ngày có bữa kèm tên và tổng tiền; bấm ngày liệt kê đúng các bữa trong ngày; "Tạo bữa mới cho ngày này" điền sẵn đúng ngày; đổi tháng/năm và "Hôm nay" hoạt động; ngày đầu/cuối tháng và tháng 2 năm nhuận hiển thị đúng. *(BR-3.4, R-12…R-14)* **Đã kiểm: tự động; trình duyệt mới xem lưới.**
- [x] AC-7: Chế độ Danh sách xếp mới → cũ; hai bữa cùng ngày thì bữa tạo sau đứng trước; thẻ đủ các trường BR-3.5. *(BR-3.5, R-8)* **Đã kiểm: tự động.**
- [x] AC-8: Chế độ Loại tách đúng Đang hoạt động / Đã lưu trữ kèm số đếm; bữa đã lưu trữ có Xoá, không có Sửa. *(BR-3.6, BR-3.10)* **Đã kiểm: tự động; chưa có bữa ARCHIVED thật.**
- [x] AC-9: Sau F5, bữa còn nguyên, chế độ xem lần trước được nhớ, và đường dẫn `#/meal/<id>` mở lại đúng bữa. Đường dẫn tới bữa không tồn tại hiển thị thông báo, không lỗi trắng trang. *(R-16, R-17, BR-3.9)* **Đã kiểm: tự động + trình duyệt (F5, đường dẫn bữa, nhớ chế độ xem).**
- [x] AC-10: Màn chi tiết bữa dùng được đầy đủ các khối người/chủ trì/nhóm của Epic 2 (thêm người bằng Quick Filter, đổi chủ trì, tạo/sửa/giải tán nhóm) và các test Epic 1–2 vẫn đạt. *(BR-3.9)* **Đã kiểm: tự động + trình duyệt.**
- [x] AC-11: Đổi được tên hồ sơ "Tôi" từ giao diện chính; "Tôi" vẫn không xoá được. *(BR-3.11)* **Đã kiểm: tự động; chưa thử trong trình duyệt.**
- [x] AC-12: Mọi hành động xoá/mất trạng thái dùng hộp xác nhận của app (không còn `window.confirm`), điều khiển được bằng bàn phím (`Esc` đóng, `Tab` không thoát khỏi hộp), nút Huỷ được focus mặc định. *(BR-3.12, R-7)* **Đã kiểm: tự động + trình duyệt (xoá bằng bàn phím).**
- [ ] AC-13: Dùng được trên màn hình ≤ 375 px không bị cuộn ngang; mọi nút/ô chạm cao tối thiểu 44 px; điều khiển hoàn toàn bằng bàn phím. *(phi chức năng)* **Trạng thái: một phần: Lịch và Loại ở 375 px đạt; chưa kiểm màn chi tiết và hộp thoại.**
- [x] AC-14: Ngày mặc định và "Hôm nay" theo giờ địa phương, không lệch ngày do múi giờ. *(R-2)* **Đã kiểm: tự động.**

### A.6. Ngoài phạm vi
- Thêm/sửa/xoá **Kèo**, chọn **người tham gia từng kèo** (US-4.1b), **Hoá đơn**, **Món**, chụp ảnh, OCR, VAT (Epic 4–5). Khu vực 2 của màn chi tiết chỉ là ô giữ chỗ. Epic 3 chỉ bảo đảm kiểu dữ liệu `SessionKeo.participantIds` đã có và `removeParticipant` (Epic 2) tự gỡ người khỏi các kèo (Epic 2 R-12e).
- Tính tiền, bảng quyết toán, chọn chế độ thanh toán, tick "Đã thanh toán" (Epic 6). Khu vực 3 chỉ là ô giữ chỗ.
- Hành động **Lưu trữ bữa** và dọn dẹp dữ liệu khi lưu trữ (Epic 7). Epic 3 chỉ *hiển thị* và *xoá* bữa `ARCHIVED`; chưa có nút chuyển một bữa sang `ARCHIVED`.
- Chia sẻ, Snapshot URL (Epic 8).
- Tìm kiếm/lọc bữa theo chữ, sắp xếp theo tiêu chí khác, phân trang, nhân đôi bữa, xoá nhiều bữa cùng lúc, thùng rác/hoàn tác xoá.
- Quản lý danh bạ như màn riêng (giữ nguyên ngoài phạm vi của Epic 2); chỉ có đổi tên "Tôi" (BR-3.11).
- Đồng bộ nhiều thiết bị; thống kê theo tháng/năm; xuất dữ liệu.
