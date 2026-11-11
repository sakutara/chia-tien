# Proposal

## Why

Sau Epic 1 đến Epic 7, toàn bộ quy trình quản lý Bữa, Kèo, Hoá đơn, Món, tính toán quyết toán và lưu trữ đã hoạt động trọn vẹn trên thiết bị của người chủ trì. Ứng dụng vận hành 100% phía client, không có máy chủ trung gian, nên các thành viên khác trong nhóm chưa có cách xem trực tiếp tờ hoá đơn và bảng chia tiền trên máy của họ. Người chủ trì vẫn phải tự gõ tay tin nhắn đòi tiền để gửi vào nhóm chat (Zalo, Messenger, Telegram...).

Epic 8 khép lại lộ trình tám Epic bằng tính năng Chia sẻ Thông báo Thanh toán và Custom URL Snapshot chỉ đọc. Tính năng gồm hai phần: đóng gói toàn bộ dữ liệu một Bữa thành một đường dẫn tự chứa, không cần server, và tạo tin nhắn thông báo thanh toán đúng định dạng để gửi sang ứng dụng khác. Theo ma trận truy vết trong `documentation/04-epics-and-roadmap.md`, Epic 8 đáp ứng YC#20 (chia sẻ qua ứng dụng khác), YC#21 (Snapshot là custom URL chỉ đọc) và YC#22 (định dạng tin nhắn chia sẻ).

Các bên liên quan và nhu cầu của họ:
- Chủ app, tức người chủ trì: bấm một nút để có ngay tin nhắn đòi tiền đúng chuẩn kèm link chi tiết, để gửi vào nhóm Zalo hoặc Messenger mà không phải chụp nhiều ảnh màn hình.
- Thành viên nhận link Snapshot: mở link trên bất kỳ trình duyệt hay thiết bị nào, không cần cài đặt hay đăng nhập, xem được mình ăn những món nào, hoá đơn của quán nào, VAT và giảm giá bao nhiêu, cần chuyển cho ai bao nhiêu tiền, và không sợ bấm nhầm làm hỏng dữ liệu.
- Người dùng cũng đang dùng app trên máy của họ: mở link Snapshot của bạn bè gửi không làm ghi đè hay trộn lẫn vào danh sách bữa và danh bạ cá nhân trên máy của mình.

Theo BR, tính năng đã được triển khai. Việc kiểm thủ công trên thiết bị thật vẫn còn dở dang trước khi đóng Epic (xem `tasks.md`).

## What Changes

- **US-8.1 Đóng gói và giải mã Custom URL Snapshot**: đóng gói toàn bộ dữ liệu một Bữa, cả Bữa `ACTIVE` lẫn Bữa `ARCHIVED`, thành đối tượng `MealSnapshotPayload` với `v: 1`. Payload bỏ dữ liệu ảnh nhị phân, được nén bằng `lz-string` (`compressToEncodedURIComponent`) và gắn vào tham số `?snapshot=<chuỗi_nén>`. Hàm giải mã `decodeSnapshotPayload` kiểm tra cấu trúc và ném lỗi `INVALID_SNAPSHOT` khi chuỗi hỏng.
- **US-8.2 Xem Snapshot chỉ đọc (Read-Only Snapshot Viewer)**: khi mở đường link có `?snapshot=` hoặc `#/snapshot/`, ứng dụng giải mã ngay trên bộ nhớ tạm và hiển thị đủ ba tầng thông tin (Bữa, Thành viên và nhóm thanh toán, Kèo, Hoá đơn, Món) cùng bảng quyết toán. Mọi thao tác sửa bị khoá, dữ liệu không được ghi vào IndexedDB của người mở. Có thanh trạng thái ở đầu trang và nút "Về trang chủ ứng dụng của tôi". Link hỏng hiển thị thông báo lỗi thân thiện kèm nút về trang chủ.
- **US-8.3 Định dạng tin nhắn thanh toán (`formatShareMessage`)**: tạo bản tin theo mẫu gồm dòng tên Bữa, một dòng cho mỗi người có khoản phải trả với các khoản nợ gom trên cùng dòng, dòng nhóm thanh toán dạng `<Cá nhân> + <cá nhân>`, và link Snapshot ở dòng cuối. Có tuỳ chọn chỉ liệt kê các khoản chưa thanh toán.
- **US-8.4 Chia sẻ qua ứng dụng khác và sao chép nhanh**: thêm hộp thoại `ShareMealDialog` trong Khu vực 3 của màn hình chi tiết Bữa. Hộp thoại có khung xem trước, nút chia sẻ qua Web Share API (`navigator.share`) khi thiết bị hỗ trợ, nút sao chép toàn bộ tin nhắn và nút chỉ sao chép link Snapshot vào Clipboard, kèm phản hồi đã sao chép.
- Thêm phụ thuộc `lz-string` `^1.5.0` vào `app/package.json`.
- Không đổi schema IndexedDB và không nâng version Dexie.
- Không có thay đổi **BREAKING** nào: đây là tính năng mới, không bỏ hay đổi hành vi cũ.

## Capabilities

### New Capabilities
- `payment-sharing-snapshot`: đóng gói một Bữa thành Custom URL Snapshot chỉ đọc, giải mã và hiển thị ở chế độ chỉ đọc, dựng tin nhắn thông báo thanh toán và chia sẻ hoặc sao chép tin nhắn đó.

### Modified Capabilities
- Không có.

## Impact

Mã nguồn theo thiết kế trong SA mục B.2:
- File mới: `app/src/domain/shareSnapshot.ts` và test, `app/src/services/snapshotService.ts` và test, `app/src/components/share/ShareMealDialog.tsx` và test, `app/src/components/share/SnapshotBanner.tsx`, `app/src/pages/SnapshotViewerPage.tsx` và test.
- File sửa: `app/package.json`, `app/src/types/index.ts`, `app/src/services/peopleErrors.ts` (thêm `INVALID_SNAPSHOT` và `SHARE_FAILED`), `app/src/hooks/useHashRoute.ts` và `viewHooks.test.ts`, `app/src/pages/MealWorkspacePage.tsx`, `app/src/App.tsx`.
- Dữ liệu: không đổi schema IndexedDB, `app/src/db/db.ts` không đổi.
- Thư viện và Web API: `lz-string` và Web Share API, Clipboard API.

Điểm lệch so với thiết kế khi triển khai, ghi theo SA mục "Lệch so với thiết kế đã ghi nhận khi triển khai":
- `parseRoute(hash, search)` nhận thêm tham số `search`. `?snapshot=` được ưu tiên hơn mọi route khác. Dấu `+` trong chuỗi nén được khôi phục vì `URLSearchParams` đổi nó thành khoảng trắng.
- `exitSnapshot()` phát `hashchange` thủ công vì `history.replaceState` không tự phát sự kiện.
- Nút mở hộp thoại `ShareMealAction` được gắn vào `actionsSlot` của Khu vực 3, cùng `ArchiveMealAction`.
- `SnapshotViewerPage` tái sử dụng `EntitySettlementRow` ở chế độ chỉ đọc, `TransferInstructionList` và `MemberBreakdownDialog`.
- Khi mở link, `App` vẫn chạy `ensureDefaultData()` để ghi hồ sơ "Tôi" mặc định của người xem nếu chưa có. Không có dữ liệu nào từ Snapshot được ghi vào IndexedDB.
- Chuỗi nén được đặt vào `?snapshot=` qua `encodeURIComponent`.

Ngoài phạm vi (BR mục A.6):
- Rút gọn link bằng dịch vụ bên thứ ba như Bitly hoặc TinyURL. Cách này cần gọi mạng và API key, trái với kiến trúc 100% client-side offline-first.
- Nhập dữ liệu từ Snapshot URL vào IndexedDB cá nhân để chỉnh sửa tiếp. YC#21 quy định người mở Snapshot chỉ xem, không thay đổi thông tin Bữa.
- Đính kèm file ảnh hoá đơn gốc vào chuỗi URL. Ảnh nhị phân làm URL dài hàng trăm nghìn ký tự, vượt giới hạn của trình duyệt và ứng dụng chat.
- Đồng bộ hai chiều theo thời gian thực sau khi link đã gửi. Mỗi link là bản chụp tại thời điểm tạo; nếu chủ trì sửa lại hoá đơn hoặc tick thêm người thanh toán thì phải gửi link mới.

## Nguồn lịch sử

- Tài liệu gốc: `documentation/epic-8/BR.md` (nguồn cho mục Why, bên liên quan, BR-8.1 đến BR-8.6, R-1 đến R-6 và AC-1 đến AC-7), `documentation/epic-8/SA.md` (nguồn cho `design.md`, tasks và Impact), và mục "EPIC 8" cùng các dòng 20 đến 22 trong ma trận truy vết của `documentation/04-epics-and-roadmap.md`.
- `design.md` trong thư mục change là nguyên văn `documentation/epic-8/SA.md`, không sửa.
- Commit đầu tiên và cuối cùng dưới `documentation/epic-8` (lệnh `git log --format='%ad %h %s' --date=short -- documentation/epic-8`): cùng một commit, `2026-10-19 d492cfe` ("Đổi docs thành documentation, đặt bản build vào docs để GitHub Pages phục vụ từ main /docs"). Commit này đổi tên thư mục từ `docs/epic-8` sang `documentation/epic-8`.
- Lịch sử trước khi đổi tên: commit `2026-10-19 a144fd2` ("Initial commit: fee calculator app (Vite + React) and docs") tạo thư mục dưới đường dẫn `docs/epic-8`.
- Trạng thái ghi trong BR và SA tại thời điểm lưu: đã triển khai, còn kiểm thủ công trên thiết bị thật. Không xác định được từ lịch sử thời điểm chính xác các trạng thái này được cập nhật.
