## MODIFIED Requirements

### Requirement: Khoá phóng to trang
Hệ thống SHALL không cho phóng to trang bằng cử chỉ hoặc chạm đúp. Thẻ viewport đặt `user-scalable=no`, `minimum-scale=1.0` và `maximum-scale=1.0`. Trên cảm ứng, `html` chỉ cho cuộn dọc và ngang (`touch-action: pan-x pan-y`). Các sự kiện cử chỉ chụm (`gesturestart`, `gesturechange`, `gestureend`) bị chặn. Hai lần chạm kết thúc cách nhau 300 ms hoặc ít hơn bị bỏ qua. Trên máy tính, lăn chuột khi giữ phím Ctrl không phóng to trang; điều kiện chỉ kiểm phím Ctrl, không kiểm phím Cmd.

**Trước đây**: không có quy định trong tài liệu thiết kế gốc. Mục này được thêm ở commit `c685d38` ngày 2026-10-20.

#### Scenario: Chạm đúp trên iPhone
- **WHEN** người dùng chạm hai lần liên tiếp trong 300 ms trên nội dung
- **THEN** trang không phóng to
- **AND** thao tác chạm đơn vẫn hoạt động bình thường

#### Scenario: Ctrl cộng lăn chuột trên máy tính
- **WHEN** người dùng giữ Ctrl và lăn chuột trên trang
- **THEN** trang không phóng to và không cuộn theo kiểu phóng to

### Requirement: Hộp xác nhận ConfirmDialog
Hệ thống SHALL hiện `ConfirmDialog` với nút "Huỷ" được focus mặc định. Nút xác nhận dùng `btn-danger` khi `tone` là `danger`, còn lại dùng `btn-primary`. Khi đang xác nhận, cả hai nút bị vô hiệu. Huỷ, Esc và bấm nền gọi `onCancel`, xoá thông báo lỗi và không gọi `onConfirm`. Mọi thao tác phá huỷ hoặc làm mất trạng thái trong app dùng `ConfirmDialog`, không dùng `window.confirm`.

**Trước đây**: tài liệu `documentation/epic-2/SA.md` ghi hộp xác nhận là `window.confirm`, chấp nhận cho bản thử nghiệm. Tài liệu `documentation/epic-3/BR.md` BR-3.12 yêu cầu thay bằng hộp xác nhận của app.

#### Scenario: Focus mặc định ở Huỷ
- **WHEN** hộp xác nhận mở
- **THEN** nút "Huỷ" nhận focus

#### Scenario: Xác nhận bị lỗi
- **WHEN** người dùng bấm nút xác nhận và `onConfirm` ném lỗi "Không xoá được"
- **THEN** hộp vẫn mở và hiện "Không xoá được" với vai trò alert
- **AND** `onCancel` không được gọi

#### Scenario: Huỷ không xác nhận
- **WHEN** người dùng bấm "Huỷ"
- **THEN** `onCancel` được gọi và `onConfirm` không được gọi

## ADDED Requirements

### Requirement: Bố cục hàng món trong form hoá đơn
Hệ thống SHALL trình bày mỗi hàng món trong form hoá đơn thành hai dòng. Dòng đầu gồm ô tên món chiếm phần rộng còn lại và nút xoá món ở bên phải, không bị tràn ra ngoài hàng khi tên dài. Dòng thứ hai dạng `[đơn giá] × [số lượng] = [thành tiền]`: ô đơn giá và ô số lượng có chiều rộng cố định, ô thành tiền co giãn để cả dòng đầy chiều ngang. Dấu `×` và dấu `=` chỉ mang tính trình bày, không phải ô nhập.

Mục này được thêm ở commit `199d9cc` ngày 2026-10-20. Tài liệu thiết kế gốc không mô tả bố cục hàng món.

#### Scenario: Tên món dài gần tràn hàng
- **WHEN** người dùng nhập tên món dài gần hết chiều rộng hàng
- **THEN** ô tên co lại và nút xoá vẫn nằm trong hàng, không bị đẩy ra ngoài

#### Scenario: Hàng đơn giá, số lượng, thành tiền
- **WHEN** form hoá đơn hiện một món
- **THEN** dòng thứ hai hiện ô đơn giá, dấu `×`, ô số lượng, dấu `=` và ô thành tiền theo đúng thứ tự
- **AND** ô thành tiền kéo dài tới mép phải của hàng
