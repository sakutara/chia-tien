## ADDED Requirements

### Requirement: Tổng hợp chi phí toàn Bữa theo từng thành viên
Hệ thống SHALL tính cho mỗi thành viên tham gia Bữa tổng tiền đã ứng `Paid(m)`, là tổng `totalAmount` của các hoá đơn có `payerMemberId === m`, và tổng tiền tiêu dùng `Owed(m)`, là tổng chi phí từ các hoá đơn chia đều (`EQUAL_TOTAL`) và các món ăn (`BY_ITEM`) trong các kèo mà thành viên đó tham gia. Chi phí phát sinh ở một kèo mà thành viên không nằm trong `SessionKeo.participantIds` SHALL bằng 0 (BR-6.1).

#### Scenario: Tổng hợp Paid và Owed qua nhiều kèo và hoá đơn (BR-6.1)
- **WHEN** một Bữa có nhiều kèo, mỗi kèo có hoá đơn `EQUAL_TOTAL` hoặc `BY_ITEM`
- **THEN** `Paid(m)` của mỗi thành viên bằng tổng `totalAmount` của các hoá đơn do người đó ứng
- **AND** `Owed(m)` của mỗi thành viên bằng tổng chi phí của người đó trên tất cả hoá đơn của mọi kèo

#### Scenario: Người ngoài kèo có chi phí bằng 0 ở kèo đó (AC-5)
- **WHEN** một thành viên không nằm trong `SessionKeo.participantIds` của kèo `s`, và kèo `s` có hoá đơn `EQUAL_TOTAL` hoặc `BY_ITEM`
- **THEN** chi phí của thành viên đó ở mọi hoá đơn thuộc kèo `s` bằng 0
- **AND** thành viên đó không bị tính tiền ở bất kỳ món nào thuộc kèo `s`

### Requirement: Tính chi phí của một thành viên trên từng hoá đơn
Hệ thống SHALL tính chi phí của thành viên `m` trên từng hoá đơn `inv` thuộc kèo `s` theo các quy tắc sau. Nếu `m` không nằm trong `s.participantIds` thì `Paid_inv(m)` và `Cost_inv(m)` đều bằng 0. Nếu `inv.payerMemberId === m` thì `Paid_inv(m)` bằng `inv.totalAmount`, ngược lại bằng 0. Chi phí `Cost_inv(m)` là số thực chưa làm tròn (R-1).

#### Scenario: Thành viên ngoài kèo không ứng và không chi trên hoá đơn (R-1)
- **WHEN** thành viên `m` không nằm trong `s.participantIds` của kèo `s` chứa hoá đơn `inv`
- **THEN** `Paid_inv(m)` bằng 0
- **AND** `Cost_inv(m)` bằng 0

#### Scenario: Người ứng hoá đơn ghi nhận đủ tổng tiền hoá đơn (R-1)
- **WHEN** thành viên `m` có `inv.payerMemberId === m`
- **THEN** `Paid_inv(m)` bằng `inv.totalAmount`
- **AND** `Paid_inv(m)` không phụ thuộc việc `m` có ăn phần nào của hoá đơn hay không

#### Scenario: Hoá đơn chia đều chỉ chia cho người tham gia kèo (R-1)
- **WHEN** `inv.splitType === 'EQUAL_TOTAL'`, và tập `P_eq = inv.equalSplitParticipantIds` giao với `s.participantIds` có số phần tử lớn hơn 0 và chứa `m`
- **THEN** `Cost_inv(m)` bằng `inv.totalAmount / |P_eq|`
- **AND** nếu `m` không thuộc `P_eq` hoặc `|P_eq|` bằng 0 thì `Cost_inv(m)` bằng 0

#### Scenario: Hoá đơn chia theo món chia theo số phần của người ăn (R-1)
- **WHEN** `inv.splitType === 'BY_ITEM'` và với mỗi món `i` của `inv`, tập `C_i` gồm các cặp `(u, s_i,u)` với `u` thuộc `s.participantIds` và `s_i,u > 0`, tổng `S_i` là tổng các `s_i,u` trong `C_i`, và `S_i > 0`
- **THEN** nếu `(m, s_i,m)` thuộc `C_i` thì `Cost_i(m)` bằng `i.finalAmount` nhân với `s_i,m / S_i`
- **AND** nếu `m` không thuộc `C_i` thì `Cost_i(m)` bằng 0
- **AND** `Cost_inv(m)` bằng tổng `Cost_i(m)` trên mọi món `i` của `inv`

### Requirement: Giải trình chi tiết theo từng thành viên
Hệ thống SHALL cho phép người dùng bấm vào một cá nhân, hoặc vào từng người trong một nhóm thanh toán, để xem bảng giải trình chi tiết. Bảng giải trình SHALL liệt kê những hoá đơn người đó đã ứng và những kèo, hoá đơn, món mà người đó bị tính tiền, kèm số tiền tương ứng (BR-6.2).

#### Scenario: Mở giải trình của một cá nhân (BR-6.2, AC-6)
- **WHEN** người dùng bấm vào một cá nhân trong Bảng quyết toán
- **THEN** hệ thống hiển thị danh sách hoá đơn mà cá nhân đó đã ứng, kèm số tiền
- **AND** hệ thống hiển thị từng kèo, hoá đơn và món mà cá nhân đó bị tính tiền, kèm số tiền tương ứng

#### Scenario: Mở giải trình của từng người trong nhóm thanh toán (BR-6.2)
- **WHEN** người dùng bấm vào một nhóm thanh toán có nhiều thành viên
- **THEN** hệ thống hiển thị giải trình cho từng thành viên trong nhóm, không gộp lẫn số tiền của các thành viên với nhau

### Requirement: Làm tròn phần dư lớn nhất cho chi phí cấp thành viên
Hệ thống SHALL làm tròn `RawOwed(m)`, là tổng các `Cost_inv(m)` của mọi hoá đơn trong Bữa, thành số nguyên đồng `Owed(m)` bằng phương pháp phần dư lớn nhất (Largest Remainder Method). Mỗi thành viên nhận phần nguyên `floor(RawOwed(m))`. Phần thiếu `Δ` được cộng thêm 1 đồng cho các thành viên có `RawOwed(m) > 0` theo thứ tự phần thập phân giảm dần. Khi phần thập phân bằng nhau (sai số `10^-9`) thì ưu tiên theo thứ tự xuất hiện trong `Meal.participantIds`. Tổng `Owed(m)` SHALL khớp đúng tổng tiền đã phân bổ `T_assigned` (R-3).

#### Scenario: Tổng tiền cần thu khớp tổng phân bổ khi chia lẻ cho 3, 6 hoặc 7 người (AC-1, R-3)
- **WHEN** các món của Bữa đều đã có người ăn và tổng tiền chia cho 3, 6 hoặc 7 thành viên không chia hết cho số người
- **THEN** tổng `Owed(m)` của mọi thành viên bằng đúng `T_assigned`
- **AND** không có đồng nào bị thất thoát hoặc dư khi cộng gộp vào nhóm thanh toán

#### Scenario: Phần lệch 1 đồng được bù theo phần thập phân rồi theo thứ tự thành viên (R-3)
- **WHEN** nhiều thành viên có cùng phần thập phân của `RawOwed(m)` và tổng phần nguyên còn thiếu `Δ` đồng
- **THEN** `Δ` thành viên đầu tiên theo thứ tự `Meal.participantIds` nhận thêm 1 đồng
- **AND** thành viên có `RawOwed(m)` bằng 0 không nhận phần bù

### Requirement: Món chưa có người ăn không được tự động chia cho ai
Hệ thống SHALL không tự chia một món `BY_ITEM` chưa có người ăn (có `S_i` bằng 0) cho bất kỳ thành viên nào. Giá trị `i.finalAmount` của món đó SHALL được cộng vào `unassignedAmount` của Bữa. `T_assigned` SHALL bằng `T_meal` trừ `unassignedAmount` (R-2).

#### Scenario: Món BY_ITEM chưa có người ăn được đưa vào unassignedAmount (R-2)
- **WHEN** một món thuộc hoá đơn `BY_ITEM` không có người ăn nào hợp lệ (`S_i` bằng 0)
- **THEN** `finalAmount` của món đó được cộng vào `unassignedAmount` của Bữa
- **AND** Bảng quyết toán vẫn tính trên `T_assigned`, không tự chia số tiền đó cho thành viên nào

### Requirement: Cảnh báo món chưa gán người ăn trên Bảng quyết toán
Hệ thống SHALL hiển thị hộp cảnh báo trên Bảng quyết toán khi trong Bữa có ít nhất một món `BY_ITEM` chưa có người ăn (`unassignedItemCount > 0`). Cảnh báo SHALL nêu rõ tên kèo, tên hoá đơn và tổng số tiền chưa phân bổ để người dùng bổ sung trước khi chốt thanh toán (BR-6.8, R-2).

#### Scenario: Cảnh báo nêu số món và số tiền chưa phân bổ (AC-7)
- **WHEN** `unassignedItemCount` lớn hơn 0
- **THEN** Khu vực 3 hiển thị cảnh báo nổi bật
- **AND** cảnh báo nêu số món, tên kèo, tên hoá đơn và tổng số tiền chưa có người nhận
- **AND** bữa được đánh dấu chưa đủ điều kiện lưu trữ (`isAllSettled` bằng false)

### Requirement: Gom công nợ theo Nhóm thanh toán
Hệ thống SHALL gom các thành viên cùng một `PaymentGroup` thành một Thực thể thanh toán (`PaymentEntity`) duy nhất, với `TotalPaid(E)` bằng tổng `Paid(m)`, `TotalOwed(E)` bằng tổng `Owed(m)` và `NetBalance(E)` bằng `TotalPaid(E)` trừ `TotalOwed(E)`. Thành viên không thuộc nhóm nào SHALL là một Thực thể thanh toán độc lập. Tổng `TotalPaid(E)` trên mọi thực thể bằng `T_meal`, và tổng `TotalOwed(E)` bằng `T_assigned` (BR-6.3, R-4).

#### Scenario: Cặp đôi hiển thị một thực thể với số dư ròng duy nhất (AC-2, R-4)
- **WHEN** hai thành viên thuộc cùng một nhóm thanh toán có `Paid` và `Owed` riêng
- **THEN** hệ thống hiển thị một dòng cho nhóm, với tổng ứng, tổng chi và một số `NetBalance` duy nhất
- **AND** tổng ứng và tổng chi của nhóm bằng tổng của các thành viên con

#### Scenario: Thành viên lẻ là một Thực thể thanh toán độc lập (R-4)
- **WHEN** một thành viên của Bữa không thuộc nhóm thanh toán nào
- **THEN** hệ thống tạo một Thực thể thanh toán riêng cho thành viên đó với `isGroup` bằng false và `memberIds` chỉ gồm chính người đó

#### Scenario: Tổng các số dư bằng 0 khi không còn món chưa gán (R-4)
- **WHEN** `unassignedAmount` bằng 0
- **THEN** tổng `NetBalance(E)` trên mọi Thực thể thanh toán bằng 0

### Requirement: Chế độ 1, Tự thanh toán (SELF_SETTLEMENT)
Hệ thống SHALL hỗ trợ chế độ `SELF_SETTLEMENT` bằng thuật toán tối ưu dòng tiền Greedy Net-Balance Matching. Thuật toán sinh danh sách lệnh chuyển tiền trực tiếp từ Thực thể thiếu tiền (`NetBalance < 0`) sang Thực thể ứng dư (`NetBalance > 0`) với số giao dịch tối thiểu theo cách tham lam (BR-6.4, R-5).

#### Scenario: Ghép chủ nợ và con nợ theo số dư lớn nhất để giảm số giao dịch (BR-6.4, R-5)
- **WHEN** chế độ quyết toán là `SELF_SETTLEMENT` và `unassignedAmount` bằng 0
- **THEN** tập chủ nợ `C` gồm các thực thể có `NetBalance > 0`, sắp xếp giảm dần theo `NetBalance`
- **AND** tập con nợ `D` gồm các thực thể có `NetBalance < 0`, sắp xếp giảm dần theo `|NetBalance|`
- **AND** với đầu hai tập, sinh một lệnh `fromEntityId` là con nợ, `toEntityId` là chủ nợ, `amount` bằng `min(d, c)`
- **AND** giảm `d` và `c` đi `amount`, loại bỏ thực thể đã về 0, và lặp cho đến khi một trong hai tập rỗng

#### Scenario: Tổng tiền các lệnh chuyển bằng tổng số dư dương (BR-6.4, R-5)
- **WHEN** mọi món của Bữa đã có người ăn
- **THEN** tổng `amount` của mọi lệnh chuyển tiền bằng tổng `NetBalance(E)` của các thực thể có `NetBalance > 0`
- **AND** mỗi `amount` là số nguyên đồng lớn hơn 0

### Requirement: Chế độ 2, Nhờ người chủ trì (HOST_MEDIATED)
Hệ thống SHALL hỗ trợ chế độ `HOST_MEDIATED`, trong đó mọi Thực thể thanh toán khác Thực thể chủ trì `E_H` đều giao dịch với `E_H`. Thực thể có `NetBalance < 0` chuyển `|NetBalance|` cho `E_H`. Thực thể có `NetBalance > 0` được `E_H` hoàn trả `NetBalance`. Hệ thống SHALL cho phép chuyển đổi tức thì giữa `SELF_SETTLEMENT` và `HOST_MEDIATED`, và SHALL lưu lựa chọn vào `Meal.settlementMode` (BR-6.5, R-6).

#### Scenario: Chủ trì đứng lẻ là chính thực thể chủ trì (R-6)
- **WHEN** `Meal.hostMemberId` không thuộc nhóm thanh toán nào
- **THEN** `E_H` là thực thể chỉ gồm người chủ trì
- **AND** mọi thực thể khác có `NetBalance < 0` chuyển đúng `|NetBalance|` cho người chủ trì
- **AND** mọi thực thể khác có `NetBalance > 0` được người chủ trì hoàn trả đúng `NetBalance`

#### Scenario: Chủ trì thuộc một nhóm thanh toán (R-6)
- **WHEN** `Meal.hostMemberId` thuộc nhóm thanh toán `G`
- **THEN** `E_H` là thực thể của nhóm `G`
- **AND** các thành viên khác của nhóm `G` không sinh lệnh chuyển tiền cho nhau, và không sinh lệnh chuyển tiền cho chính nhóm `G`

#### Scenario: Thực thể cân bằng không sinh lệnh chuyển tiền (R-6)
- **WHEN** một Thực thể thanh toán khác `E_H` có `NetBalance` bằng 0
- **THEN** không có lệnh chuyển tiền nào được sinh cho thực thể đó

#### Scenario: Chuyển đổi chế độ cập nhật ngay danh sách lệnh và được lưu lại (AC-3)
- **WHEN** người dùng chọn chuyển từ `SELF_SETTLEMENT` sang `HOST_MEDIATED`, hoặc ngược lại
- **THEN** danh sách lệnh chuyển tiền được tính lại và hiển thị ngay
- **AND** `Meal.settlementMode` được ghi lại với giá trị mới, và lựa chọn vẫn còn sau khi tải lại trang

### Requirement: Bảng tổng hợp thực thể và hướng dẫn chuyển tiền
Hệ thống SHALL hiển thị Bảng tổng hợp Thực thể thanh toán và Hướng dẫn chuyển tiền chi tiết ngay tại Khu vực 3 của màn hình chi tiết bữa, theo hệ màu USD Green. Số tiền nhận lại SHALL có màu xanh lá kèm dấu `+`. Số tiền phải trả SHALL có màu đỏ kèm dấu `-`. Các chữ số SHALL thẳng cột (BR-6.6).

#### Scenario: Số dư dương và số dư âm có màu và dấu riêng (BR-6.6)
- **WHEN** Bảng quyết toán hiển thị một Thực thể có `NetBalance` khác 0
- **THEN** nếu `NetBalance > 0` thì số tiền có màu xanh lá và dấu `+`, kèm nhãn "Nhận lại"
- **AND** nếu `NetBalance < 0` thì số tiền có màu đỏ và dấu `-`, kèm nhãn "Phải trả"
- **AND** cột số tiền dùng font chữ số thẳng cột

#### Scenario: Hướng dẫn chuyển tiền nêu rõ ai chuyển cho ai (BR-6.6)
- **WHEN** danh sách lệnh chuyển tiền không rỗng
- **THEN** mỗi dòng nêu tên thực thể chuyển, tên thực thể nhận và số tiền

### Requirement: Tick Đã thanh toán theo từng Thực thể thanh toán
Hệ thống SHALL cho phép tick hoặc bỏ tick trạng thái "Đã thanh toán" (`Meal.settlementStatuses[entityId]`) cho từng Thực thể thanh toán có `NetBalance` khác 0, khi bữa đang `ACTIVE`. Khi tick, hệ thống SHALL lưu `{ isPaid: true, paidAt: nowIso() }`. Khi bỏ tick, hệ thống SHALL xoá khoá `entityId` khỏi `settlementStatuses` hoặc đặt `isPaid` thành false. Thực thể có `NetBalance` bằng 0 SHALL được hiển thị trạng thái "Đã cân bằng" và không cần tick (BR-6.7, R-7).

#### Scenario: Tick và bỏ tick cho thực thể có số dư khác 0 (AC-4, R-7)
- **WHEN** người dùng tick checkbox "Đã thanh toán" của một thực thể có `NetBalance` khác 0 trong bữa `ACTIVE`
- **THEN** `settlementStatuses[entityId]` được ghi với `isPaid` bằng true và `paidAt` là thời điểm hiện tại
- **AND** khi người dùng bỏ tick, khoá `entityId` bị xoá khỏi `settlementStatuses` hoặc `isPaid` đổi thành false

#### Scenario: Thực thể cân bằng hiển thị Đã cân bằng và không cần tick (AC-4, R-7)
- **WHEN** một Thực thể thanh toán có `NetBalance` bằng 0
- **THEN** hệ thống hiển thị trạng thái "Đã cân bằng" thay cho checkbox
- **AND** thực thể đó được coi là đã thanh toán mà không cần lưu trong `settlementStatuses`

### Requirement: Điều kiện hoàn tất toàn bữa
Hệ thống SHALL xác định `isAllSettled` bằng true khi và chỉ khi đồng thời: `hasCost` bằng true, `unassignedItemCount` bằng 0, và mọi Thực thể có `NetBalance` khác 0 đều có `settlementStatuses[entityId]?.isPaid === true`. Giá trị này là điều kiện mở khoá nút Lưu trữ bữa ở Epic 7 (R-7).

#### Scenario: Bữa đủ điều kiện hoàn tất khi mọi thực thể có số dư khác 0 đã tick (R-7)
- **WHEN** `hasCost` bằng true, `unassignedItemCount` bằng 0, và mọi thực thể có `NetBalance` khác 0 đã được tick "Đã thanh toán"
- **THEN** `isAllSettled` bằng true

#### Scenario: Bữa còn món chưa gán không đủ điều kiện hoàn tất (R-2, R-7)
- **WHEN** `unassignedItemCount` lớn hơn 0, dù mọi thực thể khác đã được tick
- **THEN** `isAllSettled` bằng false

### Requirement: Chỉ đọc khi bữa đã lưu trữ
Hệ thống SHALL đọc dữ liệu Khu vực 3 trực tiếp từ `meal.archivedSummary` khi `meal.status === 'ARCHIVED'`, và SHALL khoá nút chuyển đổi `settlementMode` cũng như các checkbox tick thanh toán (R-8).

#### Scenario: Bữa ARCHIVED hiển thị từ archivedSummary và khoá điều khiển (R-8)
- **WHEN** `meal.status === 'ARCHIVED'` và `meal.archivedSummary` có dữ liệu
- **THEN** Khu vực 3 hiển thị dữ liệu lấy từ `meal.archivedSummary`
- **AND** nút chuyển đổi `settlementMode` và các checkbox "Đã thanh toán" đều bị khoá

### Requirement: Tiến độ thanh toán của Bữa trên thẻ bữa
Hệ thống SHALL tinh chỉnh tiến độ thanh toán trên cả ba chế độ xem danh sách bữa (Lịch, Danh sách, Loại) theo Epic 3 R-10. Chỉ các Thực thể thanh toán có `NetBalance` khác 0 được đếm trên mẫu số `<đã tick>/<cần thanh toán> đã thanh toán`. Nếu mọi thực thể đều có `NetBalance` bằng 0, và bữa có chi phí đã phân bổ đủ, thì tiến độ SHALL hiển thị hoàn tất (BR-6.9).

#### Scenario: Tiến độ chỉ đếm thực thể có số dư khác 0 ở cả ba chế độ xem (AC-8, BR-6.9)
- **WHEN** Bữa có cả thực thể cân bằng và thực thể có `NetBalance` khác 0, và một số thực thể đã được tick
- **THEN** mẫu số chỉ gồm các thực thể có `NetBalance` khác 0
- **AND** tử số chỉ gồm các thực thể trong mẫu số đã được tick
- **AND** kết quả hiển thị giống nhau ở chế độ Lịch, Danh sách và Loại

#### Scenario: Bữa hiển thị hoàn tất khi mọi thực thể cân bằng (BR-6.9)
- **WHEN** mọi Thực thể thanh toán có `NetBalance` bằng 0 và bữa có chi phí đã phân bổ đủ
- **THEN** tiến độ thanh toán của bữa hiển thị trạng thái hoàn tất

### Requirement: Khu vực 3 dùng được trên màn hình 375 px và bàn phím
Hệ thống SHALL hiển thị Khu vực 3 không cuộn ngang trên màn hình rộng 375 px. Mọi nút và checkbox trong Khu vực 3 SHALL có chiều cao tối thiểu 44 px. Các điều khiển trong Khu vực 3 SHALL điều khiển được bằng bàn phím. Toàn bộ test của Epic 1 đến Epic 5 SHALL vẫn đạt (AC-9).

#### Scenario: Kiểm tra trên trình duyệt ở 375 px (AC-9)
- **WHEN** màn hình chi tiết của một bữa thật được mở ở chiều rộng 375 px
- **THEN** bảng quyết toán không gây cuộn ngang
- **AND** mọi nút và checkbox có chiều cao tối thiểu 44 px
