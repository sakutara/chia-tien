# Design

## Context
Thiết kế gốc của Epic 8 (`documentation/epic-8/SA.md`) mã hoá toàn bộ `MealSnapshotPayload` thành JSON rồi nén bằng `LZString.compressToEncodedURIComponent`, gắn vào `?snapshot=`. Epic 9 thêm tham số `l` cho ngôn ngữ. Sau đó, các commit từ `8030400` đến `83fec8d` thay đổi định dạng link và hành vi chia sẻ. Thiết kế này mô tả các quyết định thấy được trong commit và trong code hiện tại. Các phần không có lý do trong lịch sử được ghi rõ là không xác định được từ lịch sử.

Phạm vi mã nguồn chính: `app/src/domain/shareSnapshot.ts`, `app/src/domain/snapshotCodec.ts`, `app/src/services/snapshotService.ts`, `app/src/hooks/useHashRoute.ts`, `app/src/pages/SnapshotViewerPage.tsx`, `app/src/components/share/ShareMealDialog.tsx`.

## Goals / Non-Goals

**Goals**
- Link đủ ngắn để gửi trong một tin nhắn chat, không cần mã hoá lại khi dán vào URL.
- Link chỉ mang dữ liệu người nhận cần: các khoản chuyển tiền, tài khoản người nhận, và món của người nhận nếu có.
- Link cũ đã gửi vẫn mở được.

**Non-Goals**
- Không đưa lại toàn bộ bữa vào link. Link mới không mang thành viên ngoài người liên quan, kèo, hoá đơn gốc, trạng thái tick, hay tóm tắt lưu trữ.
- Không đổi dữ liệu IndexedDB. Không ghi gì từ link vào IndexedDB.
- Không dùng dịch vụ rút gọn URL bên thứ ba (BR-8, phần ngoài phạm vi của Epic 8).

## Decisions

### 1. Định dạng gọn là một tuple với bảng tên và bảng tài khoản
Commit `8030400` đặt dạng gọn là mảng không có tên trường: `[tiêu đề, [tên...], [[bin, số TK, tên TK, tên NH?]...], [[từ, đến, số tiền, tk, nội dung?]...], kèo?]`. Tên người được tham chiếu bằng chỉ số trong bảng tên. Tài khoản ngân hàng trùng nhau chỉ lưu một lần. Tên ngân hàng được bỏ khi khớp với tên tra theo BIN (`findBankByBin`), vì sẽ được suy ra lại khi giải mã. Nội dung chuyển khoản bằng mặc định (`buildTransferContent`) không được lưu, và được dựng lại khi giải mã. Chỉ khi nội dung khác mặc định thì nội dung mới nằm trong link.

Lý do chọn tuple thay vì JSON: không xác định được từ lịch sử. Thông điệp commit `8030400` chỉ nêu "định dạng gọn chỉ chứa khoản chuyển tiền".

### 2. Mã hoá nhị phân, deflate, base64url, tiền tố `~` (commit `98c8184`)
Tuple được mã hoá như sau:
- Số nguyên dùng varint (`Writer.varint`, `Reader.varint`). Giá trị tuỳ chọn dùng `optional`: ghi `n + 1`, còn vắng mặt là `0`.
- Mọi chuỗi gom vào một bảng ngăn cách bằng ký tự `\0`, mỗi chuỗi chỉ lưu một lần.
- Dữ liệu thô được nén deflate với `level: 9` và từ điển dựng sẵn (`fflate`), chỉ khi kết quả ngắn hơn dữ liệu thô. Nếu không ngắn hơn, lưu dữ liệu thô và tắt cờ.
- Byte đầu chứa cờ `FLAG_DEFLATED` ở bit 0 và `FORMAT_VERSION` (hiện là 1) ở các bit còn lại.
- Kết quả đổi sang base64url và đặt tiền tố `~`. Lz-string không bao giờ tạo ký tự `~`, nên tiền tố phân biệt được link mới và link cũ.

Thông điệp commit ghi "ngắn hơn khoảng 24% trên mẫu thử". Số đo này không được kiểm lại trong change này.

### 3. Từ điển nén đóng băng cho phiên bản 1
Từ điển deflate (chuỗi tiếng Việt thường gặp như tên món, tên ngân hàng, tên người) được đánh dấu là đóng băng trong code. Đổi một byte của từ điển làm mọi link đã gửi không giải mã được. Muốn đổi thì tăng `FORMAT_VERSION` và giữ từ điển cũ để giải mã.

### 4. Dự phòng JSON v2 khi số không nguyên hoặc âm
Nếu `encodeBinaryTuple` ném `RangeError` (số không nguyên, âm, hoặc không an toàn), `encodeCompactSnapshot` rơi về JSON của tuple nén bằng lz-string. Bảng ký tự của lz-string được đổi `+` thành `.` và `$` thành `_` (hàm `toUrlSafe`) để không cần mã hoá lại. Nhánh này không dùng `~`, nên có thể chứa `.`. Không xác định được từ lịch sử liệu có bữa nào đã rơi vào nhánh này.

### 5. Món theo người phải trả (commit `2bbd628`, `83fec8d`, `e704ba6`)
- `buildItemShares` tính số tiền phần của từng người phải chuyển theo cùng quy tắc chia với bộ quyết toán: chỉ người tham gia kèo, chia theo `shares` của từng món. Hoá đơn chia đều theo tổng thì mỗi hoá đơn là một dòng.
- Mỗi dòng làm tròn riêng (`Math.round`), nên tổng có thể lệch vài đồng so với khoản chuyển. Tài liệu này ghi nhận sự lệch đó như đã có trong code.
- Dữ liệu được đặt vào `itemShares` (kiểu `SnapshotKeoShares`) và trong tuple là phần tử thứ năm. Người nhận được chỉ số của người phải trả, trùng với `fromId` của khoản chuyển.
- Trang xem gom các dòng theo người phải trả (`itemsByOwner`), mỗi dòng ghi tên món, tên kèo và số tiền. Commit `e704ba6` đổi từ cách gom theo kèo sang cách gom theo người phải trả.
- `ShareMealDialog` luôn gọi `scopeSnapshot(..., true)`, nên link từ hộp thoại luôn có món. Trong `snapshotService.loadMealSnapshotPayload` mặc định không kèm món (tham số `withInvoices = false`), nhưng luồng hộp thoại không dùng mặc định này.

### 6. Chọn người nhận kiểu radio (commit `b226499`)
Hộp thoại chỉ cho chọn một người, hoặc "Tất cả". Lý do không xác định được từ lịch sử. Commit chỉ ghi "chọn người nhận kiểu radio thay vì chọn nhiều".

### 7. Tham số `s`, và đọc lại tham số cũ (commit `8030400`)
`SNAPSHOT_QUERY_KEY` là `s`. `LEGACY_SNAPSHOT_QUERY_KEY` là `snapshot` vẫn được đọc. Khi đọc `?snapshot=`, `+` được khôi phục từ khoảng trắng vì `URLSearchParams` đổi dấu này. Đường dẫn `#/snapshot/<dữ liệu>` vẫn được nhận diện bằng `SNAPSHOT_HASH_PATTERN`. `main.tsx` vẫn đọc tham số `l` từ link cũ.

### 8. Bỏ tham số `l` khỏi link (commit `83fec8d`)
`buildSnapshotUrl` không còn thêm `&l=`. Hàm không còn nhận tham số ngôn ngữ. Chi tiết nằm trong capability `i18n`.

### 9. Trang xem tự dựng hai tab
Trang xem không tái sử dụng bảng quyết toán `EntitySettlementRow`, `TransferInstructionList` hay `MemberBreakdownDialog` của ứng dụng chính, khác với thiết kế gốc trong `documentation/epic-8/SA.md` B.3. Lý do không xác định được từ lịch sử. Trang mở mặc định ở tab "Chia tiền". Tab "Hoá đơn" chỉ hiện khi có `itemShares` hoặc kèo đầy đủ (dạng JSON cũ).

### 10. Bỏ tuỳ chọn lọc khoản chưa thanh toán (commit `f5261e5`)
`formatShareMessage` vẫn có tham số `onlyUnpaid` (mặc định `false`), nhưng hộp thoại không truyền tham số này. Lý do bỏ tuỳ chọn không xác định được từ lịch sử.

## Risks / Trade-offs
- **Hai nhánh giải mã.** Link cũ và link mới cùng được đọc. Mỗi thay đổi về bảng ký tự hoặc nhánh dự phòng cần kiểm lại cả hai. Test `snapshotService.test.ts` và `shareSnapshot.test.ts` là nơi kiểm tra chính.
- **Từ điển đóng băng.** Không thể sửa từ điển trong phiên bản 1 mà không làm hỏng link đã gửi. Chi phí của việc này là từ điển không được cập nhật theo tên mới.
- **Lệch làm tròn của món.** Tổng các dòng món có thể lệch vài đồng so với khoản chuyển. Người xem có thể thấy hai con số không khớp nhau.
- **Giới hạn độ dài tin nhắn.** Hộp thoại cảnh báo khi link dài hơn 4000 ký tự. Số liệu thực tế trên các ứng dụng chat chưa được kiểm trong change này.
- **Lệch tài liệu.** Tài liệu Epic 8, Epic 9 và mục 8 của 02 vẫn mô tả thiết kế gốc. Change này chỉ ghi lại, không sửa tài liệu.
- **Ký tự `.` và `_` ở nhánh dự phòng.** Link dự phòng không thuộc bảng base64url của Requirement "Định dạng tham số của link". Nhánh này hiếm nên rủi ro thấp.
