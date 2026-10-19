# Epic 2 — Business Requirements (BR)

**Epic 2**: Quản lý Danh bạ Thành viên, Quick Filter (A-Z), Chủ trì & Nhóm Thanh toán · **Trạng thái**: đang soạn BR/SA, chờ xác nhận trước khi code

Tài liệu đi cùng: [SA](./SA.md) · [Epics & Roadmap](../04-epics-and-roadmap.md) · [Epic 1 BR](../epic-1/BR.md)

---

### A.1. Bối cảnh & Mục tiêu nghiệp vụ
Chủ app mỗi bữa đi chơi với một nhóm bạn gần như cố định. Nhập lại tên từng người ở mỗi bữa vừa chậm vừa dễ sai (cùng một người bị gõ thành "Bình", "binh", "Bình T."). Epic 2 giải quyết bốn việc:

1. **Nhớ người đã từng tham gia** để lần sau chọn lại bằng vài phím gõ (danh bạ toàn cục).
2. **Chọn người nhanh**: ô lọc gõ tới đâu lọc tới đó, xếp A-Z chuẩn tiếng Việt, không có thì thêm mới ngay tại ô.
3. **Chỉ định Người chủ trì** cho từng bữa (mặc định là "Tôi").
4. **Gom nhóm thanh toán** cho cặp đôi / gia đình để Epic 6 tính như một người thanh toán duy nhất.

Epic này chỉ lo **ai tham gia bữa, ai chủ trì, ai gom nhóm với ai**. Tiền bạc (hoá đơn, chia tiền, quyết toán) thuộc Epic 4–6.

### A.2. Các bên liên quan
| Vai trò | Quan tâm |
| :--- | :--- |
| Tôi | Thêm người vào bữa thật nhanh, không tạo trùng người, gom cặp đôi/gia đình dễ dàng |
| Người chủ trì (Host) | Được nhận/chi tiền ở chế độ "Nhờ người chủ trì" (Epic 6); có thể là người khác Chủ app |
| Thành viên nhóm | Tên hiển thị đúng, thấy mình thuộc nhóm nào trong snapshot (Epic 8) |
| Dev Epic 3–8 | Cần `participantIds`, `hostMemberId`, `paymentGroups` luôn nhất quán để dùng thẳng |

### A.3. Yêu cầu nghiệp vụ (BR)

| Mã | Yêu cầu | Truy vết |
| :-: | :--- | :--- |
| **BR-2.1** | Bất kỳ ai được thêm vào một bữa đều tự động lưu vào danh bạ toàn cục và xuất hiện trong gợi ý của các bữa sau; không cần thao tác "lưu danh bạ" riêng. | US-2.1, YC#9 |
| **BR-2.2** | Danh sách chọn người luôn xếp A-Z theo thứ tự chữ cái tiếng Việt, ở mọi trạng thái (chưa gõ gì, đang lọc, sau khi thêm người mới); riêng hồ sơ "Tôi" được ghim đứng đầu (R-3). | US-2.2, YC#10 |
| **BR-2.3** | Gõ tới đâu lọc tới đó, tìm được cả khi gõ có dấu lẫn không dấu ("binh" ra "Bình"; "dat" ra "Đạt"). | US-2.2, YC#10 |
| **BR-2.4** | Nếu từ khoá chưa trùng tên ai trong danh bạ, hiển thị lựa chọn "+ Thêm người mới" ngay trong ô lọc; một cú click hoặc phím `Enter` là tạo người, lưu danh bạ và thêm vào bữa. | US-2.2, YC#10 |
| **BR-2.5** | Người đã có trong bữa được đánh dấu rõ ("Đã tham gia") trong danh sách chọn và không thể thêm hai lần. | US-2.2, US-2.1 |
| **BR-2.6** | Mỗi bữa có đúng một Người chủ trì; mặc định là "Tôi", người dùng đổi được theo từng bữa mà không ảnh hưởng bữa khác. | US-2.3, YC#11 |
| **BR-2.7** | Hồ sơ "Tôi" xem và đổi tên được, nhưng không thể xoá và luôn là chủ trì mặc định của bữa mới. | US-2.3 |
| **BR-2.8** | Cho phép gom từ 2 thành viên trở lên của cùng một bữa thành một Nhóm thanh toán; nhóm có tên (tự gợi ý, sửa được), có thể sửa thành phần, đổi tên hoặc giải tán. | US-2.4, YC#12 |
| **BR-2.9** | Một thành viên chỉ thuộc tối đa một nhóm trong cùng một bữa; hệ thống chặn gán trùng và báo rõ người đó đang ở nhóm nào. | US-2.4, YC#12 |
| **BR-2.10** | Bỏ một người khỏi bữa không được làm hỏng dữ liệu bữa: người đó phải được gỡ khỏi nhóm, và bị chặn nếu đang là chủ trì hoặc đã gắn với hoá đơn/món. | US-2.1, US-2.3, US-2.4 |
| **BR-2.11** | Dữ liệu người/nhóm của bữa đã lưu trữ (`ARCHIVED`) không được thay đổi. | US-2.1–2.4 (ràng buộc với Epic 7) |
| **BR-2.12** | Danh bạ không có hai người cùng tên và cùng dấu. Muốn có hai người trùng tên, người dùng phải phân biệt bằng từ khác (`Thuỳ An` / `Khánh An`, `An A` / `An B`). Hai tên chỉ khác nhau ở dấu (`An`, `Ân`) vẫn là hai người riêng và được phân biệt bằng hậu tố số ở khoá tìm kiếm (`an`, `an2`). | US-2.1, US-2.2, YC#9, YC#10 |

### A.4. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
| :-: | :--- |
| **R-1** | **Chuẩn hoá tên nhập**: bỏ khoảng trắng đầu/cuối, gộp nhiều khoảng trắng liên tiếp thành một; độ dài 1–50 ký tự sau chuẩn hoá. Giữ nguyên dấu người dùng gõ. Tên hiển thị **luôn được viết hoa chữ cái đầu mỗi từ (capitalized)** và các chữ còn lại viết thường, bất kể người dùng gõ kiểu nào hoặc tạo ở đâu: `bình` → `Bình`, `BÌNH` → `Bình`, `văn an` → `Văn An`, `PHƯƠNG anh` → `Phương Anh`. Từ mới bắt đầu sau khoảng trắng hoặc dấu gạch nối. Quy tắc áp dụng cho mọi đường tạo/đổi tên (Quick Filter, `Enter`, nút "+ Thêm người mới", đổi tên hồ sơ); tên hiển thị trên nút "+ Thêm người mới" cũng là dạng đã capitalized. Ngoại lệ duy nhất: nhãn hệ thống "Tôi" do seed tạo giữ nguyên cho đến khi người dùng đổi tên (khi đó áp dụng quy tắc này). |
| **R-2** | **Chống trùng tên và hậu tố khoá**. (a) *Cùng tên* = tên hiển thị giống hệt nhau cả dấu sau khi chuẩn hoá theo R-1 (`bình`, `BÌNH`, `Bình` là một). Không lưu được hai người cùng tên: gõ lại tên đã có thì chọn người đó (R-5, R-6); đổi tên thành tên của người khác bị từ chối (`DUPLICATE_NAME`). Giao diện nhắc: "Đã có 'An'. Muốn thêm người khác cùng tên, hãy thêm họ hoặc hậu tố, ví dụ 'Thuỳ An', 'An A'." (b) *Khác dấu* (`An`, `Ân`, `Ấn`) là các người khác nhau. `normalizedName` (bỏ dấu, chữ thường, `đ→d`, theo [Epic 1 R-4](../epic-1/BR.md)) là khoá duy nhất của danh bạ, nên người tạo sau nhận hậu tố số nhỏ nhất còn trống: `an`, `an2`, `an3`… Tên hiển thị vẫn giữ nguyên dấu (`Ân`). Hậu tố cố định sau khi gán; chỉ tính lại khi người đó đổi tên sang dạng không dấu khác. Nếu khoá đã bị chiếm (kể cả khi một người thật tên `An2`), lấy số kế tiếp. |
| **R-3** | **Thứ tự A-Z** dùng `Intl.Collator('vi')` trên tên hiển thị; hai tên bằng nhau theo collator thì xếp theo `createdAt` (ổn định). **Ghim**: hồ sơ "Tôi" (`isDefaultHost`) luôn đứng đầu danh sách chọn người và danh sách người tham gia, kể cả khi đang lọc (nếu khớp từ khoá); những người còn lại xếp A-Z phía sau. Chỉ ghim hồ sơ mặc định này; người chủ trì của từng bữa (nếu là người khác) xếp A-Z như mọi người và được nhận biết bằng huy hiệu vàng. |
| **R-4** | **Quy tắc lọc**: khớp khi `normalizedName` của thành viên *chứa* `normalizeName(từ khoá)`. Từ khoá rỗng → hiện toàn bộ danh bạ. Kết quả lọc vẫn xếp theo R-3 (ghim chủ app rồi A-Z, không xếp theo độ khớp). Vì `normalizedName` có thể mang hậu tố số (R-2b), gõ `an2` tìm được người thứ hai. |
| **R-5** | **Khi nào hiện "+ Thêm người mới"**: từ khoá (sau R-1, đã capitalized) không rỗng **và** không có thành viên nào có tên hiển thị giống hệt cả dấu (R-2a). Nếu đã có khớp chính xác thì không hiện nút tạo mà hiện nhắc nhở của R-2a. Khi chỉ có người *khác dấu* (R-2b) thì vẫn hiện nút, vì đó có thể là một người mới. |
| **R-6** | **Phím `Enter` trong ô lọc**: (a) nếu người dùng đang chọn một dòng bằng phím mũi tên → chọn dòng đó; (b) nếu không và có khớp chính xác (R-2a) → chọn người khớp; (c) nếu không, từ khoá **không chứa dấu** và đã có người *có dấu* cùng dạng không dấu (ví dụ gõ `binh` khi có `Bình`) → chọn người đầu tiên trong số đó, **không tạo mới**, để tránh tạo nhầm người thứ hai khi gõ tắt không dấu; muốn tạo người khác dấu thì click nút "+ Thêm người mới" hoặc dùng phím mũi tên chọn nút đó (nút là dòng cuối của danh sách); (d) còn lại, từ khoá không rỗng → tạo người mới. Chọn người đã tham gia → không làm gì, chỉ báo "Đã tham gia", không bỏ họ ra khỏi bữa. |
| **R-7** | **Thêm vào bữa** cập nhật `lastUsedAt` của thành viên. Tạo người mới và thêm vào bữa là một thao tác nguyên tử: không để lại người "mồ côi" trong danh bạ nếu bước thêm vào bữa lỗi. |
| **R-8** | **Người chủ trì**: luôn thuộc danh sách tham gia của bữa. Bữa mới có `hostMemberId = settings.defaultHostMemberId` và "Tôi" tự nằm trong danh sách tham gia. Muốn đổi chủ trì thì chọn trong số người đã tham gia (người chưa tham gia phải thêm vào bữa trước). Người chủ trì không thể bị bỏ khỏi bữa; phải đổi chủ trì trước. |
| **R-9** | **Nhóm thanh toán**: ≥ 2 thành viên, tất cả thuộc danh sách tham gia của bữa, mỗi thành viên tối đa một nhóm trong bữa. Tên nhóm tuỳ chọn; để trống thì tự đặt bằng tên các thành viên nối bằng ` + ` (ví dụ `Cường + Dung`), độ dài tối đa 80 ký tự. Người chủ trì được phép nằm trong nhóm. |
| **R-10** | **Người đại diện nhóm** (`representativeId`): thuộc nhóm; mặc định là thành viên đầu tiên được chọn. Nếu người đại diện rời nhóm thì đại diện chuyển sang thành viên đầu tiên còn lại. |
| **R-11** | **Nhóm co lại**: khi một thành viên rời nhóm (bị gỡ khỏi nhóm hoặc bị bỏ khỏi bữa) mà nhóm còn dưới 2 người thì nhóm **tự giải tán** (người còn lại trở về thanh toán cá nhân). |
| **R-12** | **Bỏ người khỏi bữa bị chặn** khi người đó: (a) là chủ trì (R-8); (b) là người ứng tiền của một hoá đơn trong bữa; (c) có tên trong danh sách người ăn của một món hoặc danh sách chia đều của một hoá đơn. Thông báo nêu rõ lý do để người dùng gỡ ràng buộc trước. Ở Epic 2, các bảng hoá đơn/món chưa có dữ liệu nên điều kiện (b), (c) chỉ có hiệu lực từ Epic 4–5 nhưng quy tắc được cài sẵn và kiểm thử bằng dữ liệu giả lập. (e) *Bổ sung theo yêu cầu "mỗi kèo có số người riêng"* ([02 §1.0](../02-business-logic-and-algorithms.md)): người được phép bỏ khỏi bữa (không rơi vào a–c) sẽ **tự rời** khỏi `SessionKeo.participantIds` của mọi kèo trong bữa đó; việc này không bị chặn vì kèo mới mặc định chứa toàn bộ người trong bữa. Kèo của bữa khác không bị đụng. |
| **R-13** | **Trạng thái "Đã thanh toán" (`settlementStatuses`)** được khoá theo thực thể thanh toán (`memberId` hoặc `paymentGroupId`). Khi tạo, sửa thành phần, hoặc giải tán nhóm, hoặc bỏ người khỏi bữa, các khoá của thực thể bị ảnh hưởng (các `memberId` trong nhóm, `paymentGroupId`) bị xoá để tránh tick thanh toán sai chủ. Nếu có khoá đang `isPaid = true` thì giao diện hỏi xác nhận trước khi thực hiện. |
| **R-14** | **Bữa `ARCHIVED`**: mọi thao tác thêm/bỏ người, đổi chủ trì, tạo/sửa/giải tán nhóm đều bị từ chối. |
| **R-15** | **Xoá khỏi danh bạ không thuộc phạm vi**: người đã tạo luôn còn trong danh bạ, kể cả khi bị bỏ khỏi mọi bữa (xem A.6). |

### A.5. Tiêu chí nghiệm thu (nghiệp vụ)

Ba tiêu chí đầu lấy từ [04 — Epic 2](../04-epics-and-roadmap.md); các tiêu chí sau do BR/SA bổ sung.

- [ ] AC-1: Danh sách chọn người luôn xếp đúng thứ tự A-Z (An → Ánh → Bình → Cường → Đạt…, sau hồ sơ "Tôi" được ghim đầu) và lọc tức thì theo từng ký tự gõ vào, có dấu lẫn không dấu. *(BR-2.2, 2.3)*
- [ ] AC-2: Thêm người mới chưa có trong danh bạ chỉ mất 1 cú click hoặc phím `Enter` ngay tại ô Quick Filter. *(BR-2.4)*
- [ ] AC-3: Các thành viên đã thuộc 1 Nhóm thanh toán không thể bị gán trùng vào nhóm thứ 2 trong cùng một bữa. *(BR-2.9)*
- [ ] AC-4: Người từng thêm vào một bữa xuất hiện trong gợi ý khi chọn người cho bữa khác, kể cả sau khi tải lại trang (F5). *(BR-2.1)*
- [ ] AC-5: Gõ lại tên đã có (khác hoa/thường) không tạo ra người thứ hai; hệ thống chọn người đã có và nhắc cách phân biệt (`Thuỳ An`, `An A`). Đổi tên thành tên của người khác bị từ chối. *(R-2a, R-5)*
- [ ] AC-5c: `An` và `Ân` tồn tại như hai người riêng, khoá lần lượt là `an`, `an2`; gõ `an2` tìm ra `Ân`; gõ `binh` + `Enter` khi có `Bình` thì chọn `Bình`, không tạo `Binh`. *(R-2b, R-6)*
- [ ] AC-5d: "Tôi" luôn đứng đầu danh sách chọn người, kể cả khi đang lọc nếu khớp; người còn lại xếp A-Z. *(R-3)*
- [ ] AC-5b: Tên thành viên luôn được lưu dạng capitalized dù gõ thường, gõ HOA hoặc lẫn lộn (`bình`, `BÌNH` → `Bình`; `văn an` → `Văn An`), ở cả tạo mới lẫn đổi tên. *(R-1)*
- [ ] AC-6: Đổi chủ trì ở bữa A không đổi chủ trì ở bữa B; "Tôi" không xoá được và là chủ trì mặc định của bữa mới. *(BR-2.6, 2.7)*
- [ ] AC-7: Tạo, đổi tên, sửa thành phần và giải tán nhóm hoạt động đúng; nhóm tự giải tán khi chỉ còn 1 người. *(BR-2.8, R-11)*
- [ ] AC-8: Bỏ người khỏi bữa gỡ họ khỏi nhóm; không bỏ được chủ trì hoặc người đã gắn với hoá đơn/món. *(BR-2.10)*
- [ ] AC-9: Bữa `ARCHIVED` không cho phép bất kỳ thay đổi người/nhóm nào. *(BR-2.11)*

### A.6. Ngoài phạm vi
- Tạo, sửa, xoá, liệt kê **Bữa** và màn hình chi tiết bữa (Epic 3). Epic 2 chỉ cung cấp các khối giao diện và service gắn vào một bữa có sẵn.
- Quản lý danh bạ như một màn hình riêng: đổi tên, gộp trùng, xoá người khỏi danh bạ (chỉ riêng đổi tên "Tôi" nằm trong phạm vi). Xem câu hỏi mở Q-3 trong [SA B.8](./SA.md).
- Tính tiền theo nhóm, hiển thị bảng quyết toán và tick thanh toán (Epic 6); Epic 2 chỉ bảo đảm dữ liệu nhóm nhất quán và dọn khoá `settlementStatuses` theo R-13.
- Ảnh đại diện thật, số điện thoại, tài khoản ngân hàng của thành viên.
- Đồng bộ danh bạ giữa các thiết bị.
