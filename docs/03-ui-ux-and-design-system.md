# 03. Giao Diện (UI/UX) & Hệ Màu USD Green

> **Đây là file duy nhất mô tả giao diện.** Mọi thay đổi giao diện cập nhật tại đây.
> Mã nguồn tương ứng: `app/src/components/ui/*` (thành phần dùng chung), `app/src/pages/*`, `app/src/index.css`.

## 1. Nguyên tắc

1. **Gọn**: không có thông tin thừa; nhãn ngắn ("Tham gia:", "Ứng:", "Chi"); thẻ `p-3`, không viền đôi.
2. **Nút = icon**: mọi nút hành động là icon, tên nằm ở `aria-label` + `title` (tooltip). Chỉ giữ chữ ở hộp xác nhận xoá/lưu trữ để tránh bấm nhầm.
3. **Bấm vào nội dung để sửa** (inline edit) thay cho nút "Đổi tên", "Chọn người", "Sửa thông tin".
4. **Theo bước**: bữa được làm qua 4 bước, mỗi bước là một tab ngang.
5. **Không vỡ hàng trên điện thoại**: một bộ nút icon luôn nằm trên một hàng (mỗi nút 40 px, ≤ 3 nút/hàng ở khổ 375 px); chữ dài tự xuống dòng (`break-words`), không đẩy nút xuống.
6. **Fluid**: nội dung `max-w-6xl`, lề `px-3 sm:px-6`; lưới tự chia cột theo bề rộng (xem §6).

## 2. Hệ màu (Design tokens)

| Token | HEX | Vai trò |
| :--- | :--- | :--- |
| `usd-green-950` | `#0A1F16` | Chữ đậm, nền tối |
| `usd-green-900` | `#123123` | Header, nút chính, tab đang chọn |
| `usd-green-800` | `#1B4332` | Hover nút chính, công tắc/viền nhấn |
| `usd-green-700` | `#2D6A4F` | Công tắc bật, nhãn phụ |
| `usd-green-600` | `#40916C` | Focus ring, viền ảnh hoá đơn |
| `usd-green-100` | `#D8F3DC` | Nền "đã thanh toán", hover chữ sửa được |
| `usd-paper-50` | `#FAF8F5` | Bề mặt thẻ |
| `usd-paper-100` | `#F2EFE9` | Nền trang |
| `usd-paper-200` | `#E4DFD5` | Đường kẻ, nền thanh tab |
| `usd-gold-600` | `#CA8A04` | Chủ trì (vương miện), "đã lưu trữ" |
| `usd-red-600` | `#DC2626` | Số âm, nút xoá |

Font: Inter (chữ), JetBrains Mono (số tiền, class `.money`, `tabular-nums`).

## 3. Thành phần dùng chung (`components/ui`)

| Thành phần | Mô tả | Hành vi chính |
| :--- | :--- | :--- |
| `IconButton` | Nút icon 40 px (36 px ≥ `sm`); `tone`: default / primary / outline / danger | `label` bắt buộc → `aria-label` + `title` |
| `Switch` | Công tắc `role="switch"` kèm nhãn | Thay cặp nút chọn một trong hai |
| `InlineText` | Chữ bấm vào hiện ô nhập (text / date / nhiều dòng) | Enter hoặc rời ô = lưu, Esc = huỷ, lỗi hiện ngay dưới ô |
| `Popover` | Khung nổi dưới nội dung; **tờ trượt ở đáy màn hình dưới `sm`** | Bấm ra ngoài / Esc = đóng |
| `PeoplePicker` | Danh sách người dạng chuỗi `An, Bình`; bấm để thêm bớt | Chế độ `multi` (tích chọn), `shares` (kèm số phần `An ×2`), `single` (chọn một); lưu ngay mỗi lần bấm |
| `Collapse` | Khối thu gọn, mặc định đóng | `aria-expanded` |
| `StepTabs` | Thanh tab ngang, mũi tên ←/→ đổi bước | Một hàng, icon trên chữ ở điện thoại |
| `DialogActions` | Chân hộp thoại: ✕ Huỷ, ✓ Lưu | |
| `Modal`, `ConfirmDialog` | `<dialog>` gốc; `size="lg"` cho form hoá đơn | Xác nhận vẫn dùng chữ |

## 4. Màn hình Danh sách Bữa

- Hàng đầu: tiêu đề "Bữa ăn" · bộ chuyển chế độ xem (3 icon: Lịch / Danh sách / Theo loại) · `＋` tạo bữa.
- **Thẻ bữa** (một khối gọn): ngày, tên (bấm để mở), icon khoá nếu đã lưu trữ; dòng số liệu `kèo · người · tổng tiền · đã trả/tổng`; icon mở `→` và xoá `🗑`.
- **Lịch** (PC): lưới tháng bên trái, khung "Ngày đã chọn" bên phải (`lg:grid-cols-[1fr_20rem]`); điện thoại xếp dọc. Nút icon: tháng trước/sau, hôm nay, tạo bữa cho ngày đang chọn.
- **Danh sách / Theo loại**: lưới 1 → 2 → 3 cột theo bề rộng.
- Tạo bữa: hộp thoại nhỏ (tên, ngày, ghi chú) với ✕ / ✓; xong chuyển thẳng sang **Bước 1** của bữa.

## 5. Màn hình Chi tiết Bữa — 4 bước

Đầu trang: `←` · tên bữa · ngày · trạng thái · `🗑`. Bên dưới là thanh bước:

| Bước | Tab | Nội dung |
| :--- | :--- | :--- |
| 1 | Bữa | Thông tin bữa sửa tại chỗ |
| 2 | Người | Thành viên (gồm nhóm thanh toán) |
| 3 | Hoá đơn | Kèo → hoá đơn → món |
| 4 | Chia tiền | Chuyển tiền, quyết toán, lưu trữ, chia sẻ |

Chân mỗi bước: `‹` bước trước · `Bước n/4` · `›` bước sau. Trên PC (`lg`) có **cột tóm tắt** bên phải (người, kèo, tổng chi, đã trả) luôn hiện khi đổi bước.

### 5.1. Bước 1 — Bữa
- **Tên bữa**, **Ngày**, **Ghi chú**: bấm để sửa tại chỗ (`InlineText`).
- **Chủ trì**: dropdown (`HostSelector`) ngay trong thông tin bữa; chỉ liệt kê người đã tham gia.
- **Tổng chi** hiển thị; bữa đã lưu trữ: mọi trường thành chữ tĩnh, có dòng chú thích ngắn.

### 5.2. Bước 2 — Người
- Ô "Thêm người: gõ tên…" (Quick Filter A–Z, không dấu, `＋ Thêm "<tên>"` khi chưa có) và icon `Tạo nhóm thanh toán` (hiện khi có ≥ 2 người). Hộp tạo nhóm chỉ có: tên nhóm (tuỳ chọn), chip chọn người (**người đã ở nhóm khác bị ẩn**), ✕ / ✓.
- **Thành viên** là một dãy chip: người lẻ (avatar, tên, vương miện nếu chủ trì, `✕` bỏ khỏi bữa).
- **Nhóm thanh toán gộp vào thành viên**: nhóm **thay thế** các thành viên của nó bằng một chip duy nhất `👥 Tên nhóm · số người`. Chỉ khi bấm chip, khối chi tiết mới mở: danh sách thành viên, icon sửa nhóm, icon giải tán, `✕` từng người.

### 5.3. Bước 3 — Hoá đơn
Lưới 1 cột (điện thoại) → 2 cột (`xl`). Mỗi **kèo** **mặc định thu gọn**: chỉ hiện `⌄` mở/đóng, tên, tổng tiền, số hoá đơn và icon thao tác; bấm `⌄` để xem tham gia, hoá đơn, món. Khi mở:

```
Lẩu Bò Gỗ                      [↑][↓][🗑]     ← tên bấm để đổi
1.620.000 ₫
Tham gia: An, Bình, Cường                      ← bấm để thêm bớt
Hoá đơn (1)                          [＋]
 ┌ #1 Lẩu Bò Gỗ            702.000 ₫ [✎][🗑]
 │ Ứng: An   (●) Chia từng món                 ← "Ứng" bấm để đổi; công tắc chia
 │ MÓN (2)                          [＋]
 │ ┌ Lẩu bò lớn                       [🗑]     ← tên bấm để đổi
 │ │ 1 × 400.000 ₫ = 400.000 ₫                 ← bấm: sửa SL, đơn giá; thành tiền tự tính
 │ │ Tham gia: An, Bình ×2                     ← bấm: thêm bớt, chỉnh số phần
```
- Chia đều theo tổng: dòng `Chia đều: An, Bình · 810.000 ₫/người` (bấm để chọn, tối thiểu 1 người).
- Món chưa có người ăn: cảnh báo vàng + icon `Gán cả kèo cho các món trống`.
- Hoá đơn chỉ nhập tổng: không có công tắc chia, không có danh sách món.

#### Form thêm/sửa hoá đơn (hộp thoại lớn `lg`)
Thứ tự từ trên xuống:
1. **Ảnh** (khung nét đứt): icon `Chụp ảnh` (chính), `Tải ảnh lên`, `Quét lại bill (OCR)`; số ảnh `n/10`; danh sách ảnh gọn (xem / tải / xoá). OCR tự chạy sau khi thêm ảnh; tiến trình có icon `Huỷ quét`.
2. Cảnh báo ảnh trùng, lỗi OCR, đối chiếu tổng (hộp vàng, icon `Xoá ảnh trùng` / `Giữ lại`).
3. **Quán · Ngày · Ứng** (một hàng 3 cột từ `sm`).
4. **Công tắc**:
   - `Nhập chi tiết món` — **chỉ hiện khi hoá đơn nhập tay** (chưa có ảnh). Tắt = chỉ nhập tổng, luôn chia đều theo tổng.
   - `Chia từng món` — chỉ hiện khi nhập chi tiết món; tắt = chia đều theo tổng.
5. Danh sách món (tên · SL · đơn giá · thành tiền, icon xoá, icon `＋`) hoặc ô **Tiền hàng**.
6. **Giảm giá / Phí phục vụ / VAT** trong khối thu gọn (tự mở nếu đã nhập); 3 cột trên PC.
7. Khung tổng: `Tiền hàng … · Giảm … · Phí … · VAT …` và **Tổng**.
8. Chân: ✕ Huỷ · ✓ Lưu hoá đơn.

### 5.4. Bước 4 — Chia tiền
Thứ tự cố định:
1. Công tắc **`Nhờ chủ trì thu chi (Tên)`** (bật = qua chủ trì, tắt = tự thanh toán).
2. Cảnh báo món chưa có người ăn (nếu có).
3. **Đã thanh toán** — dãy chip bật/tắt, **nằm trên hướng dẫn chuyển tiền**, kèm icon `Đánh dấu tất cả`.
4. **Chuyển tiền** — hướng dẫn ai → ai, số tiền; hiện trước bảng quyết toán (lưới 1 → 2 cột).
5. Dòng trạng thái `Đã thanh toán n/m khoản cần chuyển.`
6. **Bảng quyết toán = slide ngang**: mỗi thẻ là một người/nhóm (`Ứng`, `Chi`, `Nhận lại/Phải trả`), vuốt ngang (scroll-snap); trên PC có icon `‹ ›`.
7. **Chi tiết quyết toán** — khối thu gọn, **mặc định đóng**; mở ra là giải trình từng người (đã ứng hoá đơn nào, tiêu dùng món nào), 2 cột trên PC.
8. Hàng icon: `Chia sẻ thông báo thanh toán`, `Lưu trữ bữa` (khoá + lý do khi chưa đủ điều kiện).

### 5.5. Bữa đã lưu trữ
Huy hiệu khoá vàng; mọi trường chỉ đọc (không còn icon sửa/xoá, không sửa tên/ngày/chủ trì, không tick thanh toán). Kèo hiện tóm tắt đã chốt. Vẫn xoá được bữa.

## 6. Bố cục theo bề rộng (Fluid)

| Vùng | Điện thoại (< 640) | Tablet (≥ 640) | PC (≥ 1024 / 1280) |
| :--- | :--- | :--- | :--- |
| Khung | 1 cột, lề 12 px | lề 24 px | `max-w-6xl`, cột tóm tắt phải 16 rem |
| Thanh bước | icon trên, chữ dưới | icon + chữ một hàng | như tablet |
| Danh sách bữa | 1 cột | 2 cột | 3 cột |
| Lịch | xếp dọc | xếp dọc | lưới + khung ngày 2 cột |
| Kèo | 1 cột | 1 cột | 2 cột (`xl`) |
| Popover chọn người | tờ trượt đáy màn hình | khung nổi 18 rem | khung nổi 18 rem |

## 7. Xem Snapshot (chỉ đọc)

Cùng 4 tab với màn hình chính nhưng không có icon sửa/xoá/thêm, không có ô nhập. Thanh trạng thái trên cùng: `👁 Xem Snapshot · chỉ đọc` + icon `Về trang chủ ứng dụng của tôi`. Bước 4: hướng dẫn chuyển tiền → slide quyết toán → khối chi tiết thu gọn (không có chip đánh dấu).

## 8. Hộp thoại chia sẻ

Công tắc `Chỉ khoản chưa trả`; khung xem trước tin nhắn, mỗi dòng dạng `- Bình: chuyển cho An 150.000 ₫` (không dùng chữ "nợ"); hàng icon `Sao chép toàn bộ tin nhắn`, `Chỉ sao chép Link Snapshot`, `Chia sẻ qua ứng dụng khác` (khi trình duyệt hỗ trợ); dòng "Đã sao chép" hiện 2 giây; dòng "Gửi nhanh qua" liệt kê ứng dụng (Zalo, Messenger, …).

## 9. Khả năng truy cập

- Nút icon luôn có `aria-label`; chữ bấm-để-sửa có `title` "… — bấm để sửa".
- Thanh bước dùng `role="tablist"` / `tab` / `tabpanel`; công tắc dùng `role="switch"`.
- Popover là `role="dialog"` có tên; Esc đóng.
- Vùng chạm ≥ 40 px; focus ring `usd-green-600`.
- Số tiền luôn dùng `.money` (tabular-nums) để thẳng cột.
