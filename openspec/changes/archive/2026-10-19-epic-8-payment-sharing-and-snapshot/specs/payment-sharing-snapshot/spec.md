## ADDED Requirements

### Requirement: Đóng gói Bữa thành Custom URL Snapshot
Hệ thống SHALL đóng gói toàn bộ thông tin của một Bữa, cả Bữa `ACTIVE` lẫn Bữa `ARCHIVED`, thành một đối tượng `MealSnapshotPayload` với `v: 1`, nén chuỗi JSON bằng `LZString.compressToEncodedURIComponent` và gắn vào đường dẫn `?snapshot=<chuỗi_nén>`. Payload loại bỏ ảnh gốc nhị phân `Blob`. (BR-8.1)

#### Scenario: Đóng gói Bữa đang hoạt động (R-1)
- **WHEN** người chủ trì tạo link chia sẻ cho một Bữa ở trạng thái `ACTIVE`
- **THEN** payload chứa thông tin Bữa, các thành viên thuộc `Meal.participantIds` dưới dạng `{ id, name, avatarColor }`, toàn bộ `paymentGroups` và `settlementStatuses`
- **AND** mỗi kèo theo thứ tự `orderIndex` có `{ id, name, orderIndex, participantIds }` cùng danh sách hoá đơn và món

#### Scenario: Đóng gói Bữa đã lưu trữ (R-1)
- **WHEN** người chủ trì tạo link chia sẻ cho một Bữa ở trạng thái `ARCHIVED`
- **THEN** payload chứa thêm `archivedSummary`
- **AND** mỗi kèo chứa thêm `archivedTotalAmount` và `archivedPayerSummary`

#### Scenario: Hoá đơn và món đầy đủ trường tiền (R-1)
- **WHEN** payload được dựng từ một hoá đơn có giảm giá, phí phục vụ và VAT
- **THEN** mỗi hoá đơn có metadata tiền hàng, các trường `discount*`, `service*`, `vat*`, `totalAmount`, `payerMemberId`, `inputMode`, `splitType` và `equalSplitParticipantIds`
- **AND** mảng món theo `orderIndex` có `allocatedDiscountAmount`, `allocatedServiceAmount` và `allocatedVatAmount`

#### Scenario: Không đưa dữ liệu ảnh vào payload (R-1)
- **WHEN** Bữa có hoá đơn kèm ảnh gốc hoặc kết quả OCR
- **THEN** payload không chứa `Blob`, `opfsPath` hoặc `ocrRawText`, để giữ chiều dài URL nhỏ gọn (BR-8.1)

### Requirement: Mã hoá và giải mã URL Snapshot
Hệ thống SHALL tạo URL theo công thức `${origin}${pathname}?snapshot=<chuỗi_nén>`, giữ nguyên đường dẫn gốc khi triển khai trên sub-path. Khi giải mã, hệ thống SHALL dùng `LZString.decompressFromEncodedURIComponent` rồi `JSON.parse`, kiểm tra `payload.v === 1`, sự có mặt của `meal.title`, `meal.date` và các mảng `members`, `sessions`. Nếu giải nén trả về `null`, JSON lỗi hoặc thiếu trường bắt buộc thì hệ thống ném lỗi `INVALID_SNAPSHOT`. (R-2)

#### Scenario: Giải mã chuỗi hợp lệ (R-2)
- **WHEN** chuỗi nén hợp lệ có `v` bằng 1 được giải mã
- **THEN** hệ thống trả về `MealSnapshotPayload` đầy đủ
- **AND** các trường tuỳ chọn còn thiếu như `discountMode` hoặc `serviceMode` được gán giá trị mặc định an toàn là `'NONE'` và `0`

#### Scenario: Giải nén hoặc JSON hỏng (R-2)
- **WHEN** chuỗi giải nén trả về `null` hoặc không phải JSON hợp lệ
- **THEN** hệ thống ném lỗi `INVALID_SNAPSHOT`

#### Scenario: Thiếu trường bắt buộc hoặc sai phiên bản (R-2)
- **WHEN** payload có `v` khác 1 hoặc thiếu `meal.title`, `meal.date`, mảng `members` hoặc mảng `sessions`
- **THEN** hệ thống ném lỗi `INVALID_SNAPSHOT`

### Requirement: Xử lý an toàn khi link Snapshot hỏng
Hệ thống SHALL hiển thị màn hình thông báo lỗi thân thiện với nội dung "Link Snapshot không hợp lệ hoặc đã bị cắt bớt khi gửi tin nhắn" kèm nút "Về trang chủ ứng dụng của tôi" khi link bị cắt cụt, hỏng hoặc sai phiên bản schema. Hệ thống SHALL NOT làm trắng trang trong các trường hợp này. (BR-8.4)

#### Scenario: Link bị cắt cụt, rỗng hoặc sai phiên bản (AC-5)
- **WHEN** người dùng mở link có `?snapshot=` rỗng, bị cắt cụt, sai JSON hoặc sai `v`
- **THEN** hệ thống hiển thị thông báo lỗi rõ ràng kèm nút "Về trang chủ ứng dụng của tôi"
- **AND** ứng dụng không bị crash

### Requirement: Mở Snapshot ở chế độ chỉ đọc
Hệ thống SHALL nhận diện tham số `?snapshot=<chuỗi_nén>` trên `window.location.search` hoặc đường dẫn `#/snapshot/<chuỗi_nén>` trên `window.location.hash`, giải mã và hiển thị giao diện Xem Snapshot Chỉ Đọc (`Read-Only Snapshot Viewer`) với đủ ba tầng thông tin: Bữa, Thành viên và nhóm thanh toán, Kèo cùng Hoá đơn và Món, và Bảng quyết toán. (BR-8.2)

#### Scenario: Mở link bằng tham số truy vấn (AC-1)
- **WHEN** người nhận mở link có `?snapshot=<chuỗi_nén>` hợp lệ trên bất kỳ trình duyệt hay thiết bị nào, không có backend
- **THEN** hệ thống hiển thị trọn vẹn thông tin Bữa, kể cả Bữa `ACTIVE` có chi tiết món lẫn Bữa `ARCHIVED` đã chốt sổ

#### Scenario: Mở link bằng đường dẫn hash (BR-8.2)
- **WHEN** người nhận mở link có dạng `#/snapshot/<chuỗi_nén>` hợp lệ
- **THEN** hệ thống hiển thị giao diện Xem Snapshot Chỉ Đọc với đủ ba tầng thông tin và bảng quyết toán

#### Scenario: Xem chi tiết kèo, hoá đơn và món (AC-6)
- **WHEN** người nhận đang xem Snapshot
- **THEN** người nhận xem được từng kèo, từng hoá đơn và từng món, kèm giảm giá, phí phục vụ, VAT, người ứng tiền và số phần mỗi người ăn
- **AND** người nhận mở được bảng giải trình chi tiết ở chế độ chỉ đọc để kiểm tra món của mình

### Requirement: Khoá chỉnh sửa và cô lập dữ liệu trong chế độ Snapshot
Hệ thống SHALL khoá tuyệt đối 100% thao tác thêm, sửa, xoá và tick thanh toán trong chế độ Xem Snapshot Chỉ Đọc, bao gồm thông tin Bữa, thành viên, nhóm, kèo, hoá đơn, món, chế độ quyết toán, lưu trữ và xoá Bữa. Hệ thống SHALL NOT ghi dữ liệu nào từ Snapshot vào IndexedDB của trình duyệt người mở. Ở đầu trang, hệ thống SHALL hiển thị thanh trạng thái Snapshot kèm nút "Về trang chủ ứng dụng của tôi". (BR-8.3)

#### Scenario: Không có thao tác sửa nào hoạt động (AC-2)
- **WHEN** người nhận mở Snapshot của một Bữa
- **THEN** không có nút thêm, sửa, xoá hay tick thanh toán nào hoạt động
- **AND** IndexedDB của trình duyệt không có Bữa nào được tạo từ Snapshot

#### Scenario: Tính quyết toán trong bộ nhớ tạm (R-6)
- **WHEN** Snapshot được hiển thị
- **THEN** `SnapshotViewerPage` tính bảng quyết toán trực tiếp từ `MealSnapshotPayload` bằng hàm thuần `computeMealSettlement`
- **AND** quá trình này không mở kết nối ghi vào IndexedDB

#### Scenario: Thoát chế độ xem Snapshot (R-6)
- **WHEN** người nhận bấm "Về trang chủ ứng dụng của tôi"
- **THEN** hệ thống xoá tham số `?snapshot` khỏi thanh địa chỉ bằng `window.history.replaceState`
- **AND** đưa người dùng về màn hình danh sách Bữa cá nhân tại `#/`

### Requirement: Định dạng tin nhắn thông báo thanh toán
Hệ thống SHALL tạo nội dung tin nhắn theo cấu trúc: dòng đầu là tên Bữa, mỗi người có khoản phải trả là một dòng dạng `- <Cá nhân>: nợ <cá nhân> <số tiền>, nợ <cá nhân> <số tiền>`, nhóm thanh toán là một dòng dạng `- <Cá nhân> + <cá nhân>: ...`, và dòng cuối cùng là link Snapshot. (BR-8.5)

#### Scenario: Tên thực thể trong tin nhắn (R-3)
- **WHEN** thực thể là cá nhân lẻ với `isGroup` bằng false
- **THEN** tin nhắn hiển thị đúng tên cá nhân đó
- **AND** khi thực thể là nhóm thanh toán với `isGroup` bằng true, tin nhắn hiển thị tên các thành viên nối bằng chuỗi ` + ` theo thứ tự `memberNames`, ví dụ `Cường + Dung`
- **AND** khi người nhận tiền là nhóm có người chủ trì trong chế độ `HOST_MEDIATED`, tên hiển thị là tên cá nhân của người chủ trì hoặc của đại diện nhóm `representativeId`

#### Scenario: Gom các khoản nợ trên cùng một dòng (R-4)
- **WHEN** một thực thể có ít nhất một khoản chuyển tiền đi với `amount` dương
- **THEN** tất cả khoản phải trả của thực thể đó nằm trên cùng một dòng, ngăn cách bằng `', '`
- **AND** thứ tự các dòng theo thứ tự thực thể xuất hiện trong bảng quyết toán

#### Scenario: Chỉ liệt kê khoản chưa thanh toán (R-4)
- **WHEN** người dùng bật tuỳ chọn "Chỉ liệt kê khoản chưa thanh toán" trong hộp thoại Chia sẻ
- **THEN** các thực thể đã được tick `isPaid` bằng true bị bỏ qua khi tạo tin nhắn

#### Scenario: Không còn khoản nợ cần chuyển (R-4)
- **WHEN** Bữa không có khoản nợ nào cần chuyển, hoặc mọi khoản đã thanh toán khi bật lọc chưa thanh toán
- **THEN** dòng thân của tin nhắn là "- Tất cả các khoản thanh toán đã hoàn tất."
- **AND** dòng cuối cùng vẫn là link Snapshot đầy đủ

#### Scenario: Tin nhắn đúng định dạng ở mọi chế độ quyết toán (AC-3)
- **WHEN** hệ thống tạo tin nhắn cho Bữa có cả khoản cá nhân lẫn khoản nhóm, ở chế độ `SELF_SETTLEMENT` hoặc `HOST_MEDIATED`
- **THEN** nội dung có dòng tên Bữa, dòng cá nhân dạng `- Bình: nợ An 150.000 ₫, nợ Phương 80.000 ₫`, dòng nhóm dạng `- Cường + Dung: nợ An 420.000 ₫`, và dòng cuối là link Snapshot

### Requirement: Chia sẻ và sao chép tin nhắn từ hộp thoại Chia sẻ
Hệ thống SHALL cung cấp hộp thoại Chia sẻ Thông báo Thanh toán (`ShareMealDialog`), mở từ nút trong Khu vực 3 của màn hình chi tiết Bữa. Hộp thoại SHALL hiển thị khung xem trước toàn bộ tin nhắn, nút "Chia sẻ qua ứng dụng khác", nút "Sao chép toàn bộ tin nhắn" và nút "Chỉ sao chép Link Snapshot", kèm phản hồi trạng thái đã sao chép. (BR-8.6)

#### Scenario: Gửi qua ứng dụng khác bằng menu chia sẻ của thiết bị (AC-4)
- **WHEN** trình duyệt hỗ trợ `navigator.share` và người dùng bấm "Chia sẻ qua ứng dụng khác"
- **THEN** hệ thống gọi `navigator.share` với `title` là tên Bữa và `text` là tin nhắn đã định dạng
- **AND** người dùng có thể gửi tin nhắn qua Zalo, Messenger, Telegram, Tin nhắn hoặc ứng dụng khác

#### Scenario: Người dùng đóng menu chia sẻ (R-5)
- **WHEN** người dùng tự đóng menu chia sẻ của hệ điều hành, tạo lỗi `AbortError`
- **THEN** hệ thống bỏ qua êm thấm và không báo lỗi

#### Scenario: Sao chép khi trình duyệt không hỗ trợ chia sẻ (R-5)
- **WHEN** trình duyệt không hỗ trợ `navigator.share`
- **THEN** nút "Sao chép toàn bộ tin nhắn" đóng vai trò hành động chính
- **AND** khi bấm nút, nội dung được ghi vào Clipboard qua `navigator.clipboard.writeText`, và nhãn nút đổi thành "✓ Đã sao chép" trong 2 giây

#### Scenario: Sao chép một chạm vào Clipboard (AC-4)
- **WHEN** người dùng bấm "Sao chép toàn bộ tin nhắn" hoặc "Chỉ sao chép Link Snapshot"
- **THEN** đúng nội dung tương ứng được ghi vào Clipboard và nút hiển thị trạng thái đã sao chép
- **AND** khi `navigator.clipboard` không khả dụng, hệ thống dùng phương án dự phòng bằng `<textarea>` ẩn và `document.execCommand('copy')`

### Requirement: Hiển thị trên màn hình hẹp và không hồi quy (AC-7)
Hệ thống SHALL hiển thị tốt trên màn hình từ 375 px trở xuống mà không cuộn ngang, mọi nút chạm có kích thước tối thiểu 44 px và điều khiển được bằng bàn phím. Toàn bộ test của Epic 1 đến Epic 7 SHALL vẫn đạt. (AC-7)

#### Scenario: Snapshot không cuộn ngang ở 375 px (AC-7)
- **WHEN** người nhận mở Snapshot trên màn hình rộng 375 px
- **THEN** trang không cuộn ngang và các nút chạm có kích thước tối thiểu 44 px

#### Scenario: Hồi quy Epic 1 đến Epic 7 (AC-7)
- **WHEN** chạy toàn bộ bộ test sau khi thêm tính năng Epic 8
- **THEN** toàn bộ test của Epic 1 đến Epic 7 vẫn đạt
