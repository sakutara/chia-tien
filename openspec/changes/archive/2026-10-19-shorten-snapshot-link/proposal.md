# Proposal

## Why
Epic 8 đóng gói toàn bộ dữ liệu ba tầng của một bữa (bữa, thành viên, nhóm, kèo, hoá đơn, món, trạng thái tick) thành JSON nén lz-string và gắn vào `?snapshot=` (BR-8.1, R-2). Link dài, khó gửi qua ứng dụng chat, và bảng ký tự của lz-string có `+` và `$` phải mã hoá khi đưa vào URL. Trong quá trình dùng thực tế, chủ dự án đã rút gọn link: link chỉ mang các khoản chuyển tiền, dùng định dạng nhị phân nén deflate, đổi tham số thành `?s=`, và thay đổi một số hành vi của hộp thoại chia sẻ. Các thay đổi này được làm trực tiếp trong code và không cập nhật tài liệu Epic 8 và Epic 9. Change này ghi lại chúng để lịch sử liền mạch: thiết kế gốc (archive Epic 8 và Epic 9) cộng change này cho ra spec hiện tại.

Lý do được ghi trong thông điệp commit: commit `8030400` nêu mục tiêu làm link gọn và chỉ chứa khoản chuyển tiền; commit `98c8184` nêu mục tiêu làm link ngắn hơn, và ghi nhận khoảng 24% trên mẫu thử. Lý do đổi kiểu chọn người nhận, đưa món trở lại link, và bỏ tuỳ chọn lọc khoản chưa thanh toán không xác định được từ lịch sử.

## What Changes
- **BREAKING** Link mới dùng tham số `?s=` và dữ liệu nhị phân bắt đầu bằng `~`. Link cũ với `?snapshot=` và `#/snapshot/` vẫn mở được nhưng không còn được tạo ra.
- **BREAKING** Link mới không còn mang toàn bộ bữa. Chỉ mang khoản chuyển tiền, và khi tạo từ hộp thoại chia sẻ thì kèm danh sách món theo người phải chuyển, với số tiền phần của người đó.
- Mã hoá nhị phân: số nguyên dạng varint, bảng chuỗi dùng chung, nén deflate với từ điển dựng sẵn, đổi sang base64url. Thêm dependency `fflate`.
- Trang xem Snapshot hiện tab Hoá đơn khi link có món, và gom món theo người phải trả thay vì theo kèo.
- Trang xem Snapshot dựng hai tab Hoá đơn và Chia tiền riêng, không tái sử dụng bảng quyết toán và giải trình chi tiết của ứng dụng chính.
- Hộp thoại chia sẻ: chọn người nhận bằng nút kiểu radio (một người), thay cho nút bật tắt chọn nhiều người. Bỏ tuỳ chọn "Chỉ liệt kê khoản chưa thanh toán". Chuyển giữa "Gửi link" và "Gửi QR".
- Tin nhắn thanh toán dùng mẫu "chuyển cho <người nhận> <số tiền>" thay cho "nợ <người nhận> <số tiền>".
- Bộ lọc người trong trang xem đổi từ nút bật tắt sang nút kiểu radio.
- Thanh đầu trang xem Snapshot hiện tên bữa và có `aria-label` "Chế độ xem Snapshot", thay cho dòng chữ "CHẾ ĐỘ XEM SNAPSHOT (CHỈ ĐỌC)".
- Link không còn mang tham số ngôn ngữ `l` (chi tiết ở capability `i18n`).

## Capabilities

### New Capabilities
Không có.

### Modified Capabilities
- `payment-sharing-snapshot`: định dạng link gọn, mã hoá nhị phân, phạm vi khoản chuyển và món trong link, hộp thoại chia sẻ, tab Hoá đơn và Chia tiền, tin nhắn thanh toán, thanh tiêu đề trang xem.
- `i18n`: link Snapshot không còn tham số `l` (BR-9.8 và AC-7 của Epic 9).

## Impact
- Mã nguồn: `app/src/domain/shareSnapshot.ts` (định dạng gọn, giải mã, tin nhắn, `buildItemShares`), `app/src/domain/snapshotCodec.ts` (mới: mã hoá nhị phân), `app/src/services/snapshotService.ts` (`scopeSnapshot`, `encodeCompactSnapshot`), `app/src/hooks/useHashRoute.ts` (đọc `s` và `snapshot`), `app/src/pages/SnapshotViewerPage.tsx` (hai tab, gom theo người trả, bộ lọc radio), `app/src/components/share/ShareMealDialog.tsx` (radio, bỏ công tắc, Gửi link và Gửi QR), `app/src/components/share/SnapshotBanner.tsx` (tên bữa), `app/src/types/index.ts` (`itemShares`, `SnapshotKeoShares`).
- Thư viện: thêm `fflate` vào `app/package.json`. `lz-string` vẫn cần để đọc link cũ và cho nhánh dự phòng.
- Dữ liệu: không có thay đổi schema IndexedDB. Không có dữ liệu bữa nào được ghi khi mở link.
- Tương thích: link đã gửi trước đây vẫn mở được (`?snapshot=`, `#/snapshot/`, JSON v1, `&l=`).
- Ngoài phạm vi: cập nhật tài liệu `documentation/epic-8`, `documentation/epic-9` và mục 8 của `documentation/02-business-logic-and-algorithms.md` (các tài liệu này được archive bởi change khác). Kiểm thử trên thiết bị thật và kiểm màn chia sẻ ở 375 px (xem tasks). Không thay đổi cơ chế Zalo, Facebook hay Web Share API.

## Nguồn lịch sử
Commit (mã, ngày, tiêu đề rút gọn):
- `8030400`, 2026-10-19: Rút gọn link snapshot, định dạng gọn chỉ chứa khoản chuyển tiền, tham số `?s=`.
- `2bbd628`, 2026-10-19: Link snapshot gọn kèm các món của người nhận và số tiền phần của họ; hiện lại tab Hoá đơn.
- `98c8184`, 2026-10-19: Link snapshot gọn, mã hoá nhị phân và deflate với từ điển dựng sẵn.
- `70feb95`, 2026-10-19: Snapshot, chọn người kiểu radio thay vì checkbox (bộ lọc trang xem).
- `b226499`, 2026-10-19: Chia sẻ thanh toán, chọn người nhận kiểu radio thay vì chọn nhiều.
- `83fec8d`, 2026-10-24: Link snapshot kèm hoá đơn của người nhận và bỏ tham số ngôn ngữ `&l=`.
- `e704ba6`, 2026-10-24: Hoá đơn Snapshot gom theo nhóm người trả thay vì theo kèo.

Commit ngoài danh sách giao việc nhưng liên quan, tìm được khi kiểm lại trong code:
- `f5261e5`, 2026-10-21: Cập nhật tính năng chia tiền và chia sẻ QR. Bỏ tuỳ chọn "Chỉ khoản chưa trả" và công tắc "Kèm các món của người nhận"; thêm công tắc "Gửi QR"; hộp thoại gửi link dùng link gọn.
- `c332994`, 2026-10-20: Epic 9, song ngữ. Là commit đầu tiên có chuỗi `chuyển cho {name}` trong code (kiểm bằng `git log -S`). Cùng commit này bọc các chuỗi giao diện bằng `t()`. Chuỗi `aria-label` "Chế độ xem Snapshot" đã có từ commit đầu tiên `a144fd2`. Dòng chữ "CHẾ ĐỘ XEM SNAPSHOT (CHỈ ĐỌC)" chỉ có trong tài liệu, chưa bao giờ có trong `app/src`.

Tài liệu cũ bị thay thế hoặc lệch:
- `documentation/epic-8/BR.md`: A.1 mục 1 (lz-string, `?snapshot=`), A.3 BR-8.1, BR-8.2, BR-8.5 (mẫu "nợ"), BR-8.6 (hộp thoại), A.4 R-2 (mã hoá), R-4 (tuỳ chọn "Chỉ liệt kê khoản chưa thanh toán"), R-6 (đường dẫn `?snapshot`).
- `documentation/epic-8/SA.md`: B.2 cấu trúc mã nguồn (`SnapshotBanner` ghi "CHẾ ĐỘ XEM SNAPSHOT"), B.3 thành phần (`ShareMealDialog` có tuỳ chọn lọc, `SnapshotViewerPage` tái sử dụng bảng quyết toán), B.4 thiết kế dữ liệu, B.5 luồng xử lý, B.6 giao diện lập trình, B.7 yêu cầu phi chức năng (kích thước URL với lz-string), B.8 rủi ro 1, B.9 ma trận truy vết.
- `documentation/02-business-logic-and-algorithms.md`, mục 8.1 (đóng gói lz-string và `?snapshot=`), 8.2 (ví dụ link có `?snapshot=`; mẫu dòng nợ dùng "chuyển cho" và khớp code), 8.3 (nút "Gửi qua ứng dụng khác").
- `documentation/epic-9/BR.md`: BR-9.6 (tham số `l` trong link), BR-9.8 (link mang `l=vi|en`), AC-7 (link mới mở đúng ngôn ngữ người gửi).
