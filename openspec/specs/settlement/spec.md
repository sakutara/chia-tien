# settlement Specification

## Purpose
Quyết toán toàn bữa: tổng hợp số tiền mỗi thành viên đã ứng và phải chi qua mọi kèo, gom các thành viên theo nhóm thanh toán thành một đơn vị có số dư ròng, rồi đưa ra danh sách lệnh chuyển tiền theo một trong hai chế độ (tự thanh toán hoặc nhờ người chủ trì thu chi). Capability này cũng quản lý việc tick "Đã chuyển" cho từng khoản chuyển tiền, tiến độ thanh toán và trạng thái hoàn tất của bữa. Người dùng là người tổ chức bữa, dùng ở khu quyết toán trên màn hình chi tiết bữa để biết ai cần chuyển cho ai.

## Requirements

### Requirement: Tổng hợp số đã ứng và số phải chi của từng thành viên
Hệ thống SHALL tính cho mỗi thành viên trong bữa hai số: tổng tiền đã ứng (`totalPaid`), là tổng `totalAmount` của các hoá đơn mà người đó là người ứng trong kèo có người đó tham gia, và tổng tiền phải chi (`totalOwed`), là tổng phần chi phí của người đó trên mọi hoá đơn của các kèo đã tham gia. Số dư ròng bằng tổng đã ứng trừ tổng phải chi. Kết quả đi kèm bảng giải trình liệt kê từng hoá đơn đã ứng và từng dòng chi phí tạo nên tổng phải chi.

#### Scenario: Người ứng hoá đơn chia đều
- **WHEN** bữa có một kèo gồm ba người và một hoá đơn 100.000 đ chia đều cho cả ba, do người A ứng
- **THEN** tổng đã ứng của A là 100.000 đ
- **AND** tổng phải chi của ba người cộng lại bằng 100.000 đ

#### Scenario: Món được chia theo số phần
- **WHEN** một món 100.000 đ có người A ăn 3 phần và người B ăn 1 phần, hoá đơn chứa món này do A ứng, và cả hai cùng thuộc một kèo
- **THEN** tổng phải chi của A là 75.000 đ và của B là 25.000 đ
- **AND** bữa có một khoản B chuyển cho A 25.000 đ, và bữa chưa được coi là đã thanh toán xong vì khoản này chưa được tick

### Requirement: Chi phí của kèo chỉ tính trên người tham gia kèo đó
Hệ thống SHALL chỉ tính chi phí của một hoá đơn cho những người nằm trong danh sách tham gia của kèo chứa hoá đơn đó. Tiền ứng của người không tham gia kèo đó không được ghi nhận vào tổng đã ứng của người ấy. Hoá đơn vẫn được tính vào tổng tiền của bữa dù người ứng không thuộc kèo.

#### Scenario: Người ngoài kèo không bị tính tiền ở kèo đó
- **WHEN** bữa có kèo 1 gồm A và B, kèo 2 gồm A, B và C, và một hoá đơn 90.000 đ ở kèo 2 do C ứng, chia đều cho ba người
- **THEN** C chỉ phải chi 30.000 đ, là phần của hoá đơn ở kèo 2
- **AND** tổng đã ứng của C là 90.000 đ

#### Scenario: Thành viên ngoài kèo bị loại khỏi phần chia
- **WHEN** bữa có kèo 1 gồm A và B, và một hoá đơn 60.000 đ ở kèo 1 do A ứng, chia đều cho A, B và C, trong đó C không thuộc kèo 1
- **THEN** A và B mỗi người phải chi 30.000 đ
- **AND** C không phải chi khoản nào từ hoá đơn này

#### Scenario: Người ứng không thuộc kèo
- **WHEN** một hoá đơn thuộc kèo có người ứng không nằm trong danh sách tham gia của kèo đó
- **THEN** số tiền hoá đơn không được cộng vào tổng đã ứng của người ứng đó
- **AND** số tiền hoá đơn vẫn được cộng vào tổng tiền của bữa

### Requirement: Làm tròn về đồng nguyên theo phần dư lớn nhất
Hệ thống SHALL làm tròn tổng phải chi của từng thành viên về số đồng nguyên sao cho tổng phải chi của mọi thành viên bằng đúng tổng tiền đã phân bổ của bữa. Phần đồng còn thiếu được cộng thêm 1 đ cho những thành viên có phần thập phân lớn nhất. Khi các phần thập phân bằng nhau thì ưu tiên thành viên đứng trước trong danh sách thành viên của bữa.

#### Scenario: Chia 100.000 đ cho ba người
- **WHEN** một hoá đơn 100.000 đ chia đều cho ba người A, B, C theo thứ tự tham gia bữa
- **THEN** tổng phải chi của A là 33.334 đ, của B là 33.333 đ và của C là 33.333 đ
- **AND** tổng phải chi của ba người bằng 100.000 đ

#### Scenario: Chia số lẻ cho sáu hoặc bảy người
- **WHEN** một hoá đơn 999.999 đ chia đều cho 6 người, hoặc cho 7 người
- **THEN** tổng phải chi của mọi thành viên bằng đúng 999.999 đ

### Requirement: Món chưa có người ăn không được tự chia cho ai
Hệ thống SHALL không tự chia món chưa có người ăn, tức món không có người nào có số phần dương trong kèo hoặc chỉ có người ngoài kèo. Tiền của các món này được tách thành tiền chưa phân bổ, số món được đếm riêng và bảng quyết toán cảnh báo số món và số tiền đó. Bữa không được coi là đã thanh toán xong khi số món chưa có người ăn lớn hơn 0. Hoá đơn chia đều theo tổng không có người chia hợp lệ chỉ tăng tiền chưa phân bổ, không được đếm là món.

#### Scenario: Một món chưa có người ăn
- **WHEN** một hoá đơn chi tiết có món 100.000 đ có người ăn và món 50.000 đ không có ai ăn
- **THEN** tiền chưa phân bổ của bữa là 50.000 đ và số món chưa phân bổ là 1
- **AND** tổng phải chi của các thành viên là 100.000 đ
- **AND** bữa không được coi là đã thanh toán xong

#### Scenario: Hoá đơn chia đều không có người chia hợp lệ
- **WHEN** bữa có kèo gồm A và B, và một hoá đơn 100.000 đ ở kèo này do A ứng, kiểu chia đều theo tổng, mà danh sách người chia chỉ gồm người ngoài kèo
- **THEN** tiền chưa phân bổ của bữa là 100.000 đ và số món chưa phân bổ là 0
- **AND** bảng quyết toán không hiển thị cảnh báo chưa có người ăn
- **AND** khi không còn khoản chuyển nào chưa được tick, bữa được coi là đã thanh toán xong

### Requirement: Gom thành viên theo nhóm thanh toán
Hệ thống SHALL gom các thành viên thuộc cùng một nhóm thanh toán thành một thực thể thanh toán có tổng đã ứng, tổng phải chi và số dư ròng chung, và đặt tên thực thể theo tên nhóm. Chỉ nhóm còn ít nhất hai thành viên đang tham gia bữa mới được gom. Thành viên không thuộc nhóm nào, hoặc còn lại một người trong nhóm, là thực thể riêng.

#### Scenario: Cặp đôi được gom thành một thực thể
- **WHEN** bữa có nhóm "Cặp đôi X - Y" gồm X và Y, H đứng riêng, và cả ba cùng chia đều hai hoá đơn trong một kèo: 90.000 đ do X ứng và 30.000 đ do H ứng
- **THEN** thực thể nhóm có tổng đã ứng 90.000 đ, tổng phải chi 80.000 đ và số dư ròng +10.000 đ
- **AND** H là thực thể riêng có số dư ròng -10.000 đ

#### Scenario: Nhóm chỉ còn một thành viên trong bữa
- **WHEN** một nhóm thanh toán có hai thành viên nhưng một người đã không còn trong bữa
- **THEN** người còn lại là thực thể riêng và không được hiển thị như một nhóm

### Requirement: Chế độ tự thanh toán tạo lệnh chuyển tiền trực tiếp
Hệ thống SHALL khi bữa ở chế độ `SELF_SETTLEMENT` sinh các lệnh chuyển tiền trực tiếp từ thực thể đang nợ sang thực thể đang được nhận lại tiền, bằng cách ghép tham lam: thực thể nợ nhiều nhất được ghép với thực thể cần nhận nhiều nhất, mỗi lệnh có số tiền bằng số nhỏ hơn trong hai số còn lại. Tổng số tiền các lệnh bằng tổng các số dư dương. Thực thể có số dư bằng 0 không xuất hiện trong lệnh nào.

#### Scenario: Bốn thực thể cho ra ba lệnh
- **WHEN** số dư ròng của các thực thể là A -70.000 đ, B -30.000 đ, C +60.000 đ, D +40.000 đ
- **THEN** có ba lệnh: A chuyển C 60.000 đ, A chuyển D 10.000 đ, và B chuyển D 30.000 đ
- **AND** tổng các lệnh là 100.000 đ

#### Scenario: Không ai phải chuyển
- **WHEN** mọi thực thể đều có số dư ròng bằng 0
- **THEN** danh sách lệnh chuyển tiền rỗng

### Requirement: Chế độ nhờ người chủ trì thu chi
Hệ thống SHALL khi bữa ở chế độ `HOST_MEDIATED` quy mọi lệnh về thực thể chủ trì: thực thể đang nợ chuyển đúng số nợ cho chủ trì, còn chủ trì hoàn lại số dư dương cho thực thể được nhận. Nếu chủ trì nằm trong một nhóm thanh toán thì nhóm đó đóng vai trò đầu mối. Không bao giờ có lệnh từ chủ trì (hay nhóm chứa chủ trì) chuyển cho chính mình. Các lệnh có chủ trì ở một đầu vẫn có ô tick "Đã chuyển" như mọi lệnh khác.

#### Scenario: Chủ trì đứng riêng
- **WHEN** chủ trì H có số dư ròng +20.000 đ, A nợ 50.000 đ và B được nhận lại 30.000 đ
- **THEN** có hai lệnh: A chuyển H 50.000 đ, và H chuyển B 30.000 đ
- **AND** cả hai lệnh đều có ô tick "Đã chuyển" và tiến độ đếm cả hai

#### Scenario: Chủ trì nằm trong một nhóm thanh toán
- **WHEN** chủ trì H thuộc nhóm "Vợ chồng" gồm H và W, nhóm có số dư ròng -60.000 đ, và A được nhận lại 60.000 đ
- **THEN** lệnh duy nhất là nhóm "Vợ chồng" chuyển cho A 60.000 đ

### Requirement: Đổi chế độ quyết toán
Hệ thống SHALL cho đổi qua lại giữa `SELF_SETTLEMENT` và `HOST_MEDIATED` và lưu chế độ đã chọn vào bữa. Kết quả quyết toán và danh sách lệnh chuyển tiền được tính lại theo chế độ mới. Công tắc "Nhờ chủ trì thu chi" bật khi chế độ là `HOST_MEDIATED`. Giá trị chế độ không hợp lệ bị từ chối với mã `INVALID_SETTLEMENT_MODE` và bữa không thay đổi. Chọn lại chế độ đang dùng không ghi gì vào bữa.

#### Scenario: Chuyển sang nhờ người chủ trì
- **WHEN** người dùng bật công tắc "Nhờ chủ trì thu chi" khi bữa đang ở chế độ tự thanh toán
- **THEN** bữa lưu `settlementMode` là `HOST_MEDIATED`
- **AND** danh sách lệnh chuyển tiền được tính lại theo chủ trì

#### Scenario: Giá trị chế độ không hợp lệ
- **WHEN** có yêu cầu đặt chế độ quyết toán là một giá trị khác `SELF_SETTLEMENT` và `HOST_MEDIATED`
- **THEN** hệ thống từ chối với mã `INVALID_SETTLEMENT_MODE`
- **AND** bữa giữ nguyên chế độ cũ

### Requirement: Danh sách lệnh chuyển tiền
Hệ thống SHALL hiển thị mỗi lệnh chuyển tiền thành một dòng gồm tên thực thể chuyển, tên thực thể nhận và số tiền, kèm ô tick "Đã chuyển". Khi bữa chưa có chi phí để quyết toán (chưa có hoá đơn nào, hoặc tổng tiền các hoá đơn bằng 0), khu quyết toán chỉ hiển thị thông báo yêu cầu thêm hoá đơn và không hiển thị công tắc chế độ hay danh sách lệnh. Nút "Đánh dấu tất cả đã chuyển" chỉ hiển thị khi bữa không ở chế độ chỉ xem và còn ít nhất một khoản chưa tick.

#### Scenario: Bữa chưa có chi phí
- **WHEN** người dùng mở quyết toán của một bữa chưa có hoá đơn nào hoặc tổng tiền hoá đơn bằng 0
- **THEN** khu quyết toán hiển thị thông báo cần thêm hoá đơn
- **AND** không hiển thị công tắc chế độ hay danh sách lệnh chuyển tiền

#### Scenario: Danh sách có khoản chưa tick
- **WHEN** bữa có ít nhất một lệnh chuyển tiền và chưa khoản nào được tick
- **THEN** mỗi lệnh hiển thị một dòng với ô "Đã chuyển" chưa chọn
- **AND** nút "Đánh dấu tất cả đã chuyển" hiển thị

### Requirement: Tick đã chuyển theo từng khoản chuyển
Hệ thống SHALL cho tick hoặc bỏ tick "Đã chuyển" cho từng khoản chuyển tiền có trong danh sách hiện tại. Khoản chuyển được nhận diện bằng cặp thực thể nguồn và đích, dạng `fromEntityId->toEntityId`. Khi tick, bữa ghi lại thời điểm tick và số tiền của khoản đó. Khi bỏ tick, trạng thái của khoản bị xoá. Tick hoặc bỏ tick một khoản không có trong danh sách hiện tại bị từ chối với mã `TRANSFER_NOT_FOUND`.

#### Scenario: Tick rồi bỏ tick một khoản
- **WHEN** người dùng tick khoản Bình chuyển cho chủ app 45.000 đ, rồi bỏ tick
- **THEN** sau khi tick, bữa lưu trạng thái đã chuyển với thời điểm tick và số tiền 45.000 đ
- **AND** sau khi bỏ tick, bữa không còn trạng thái nào cho khoản đó

#### Scenario: Tick khoản không tồn tại
- **WHEN** có yêu cầu tick hoặc bỏ tick một khoản mà khoá không khớp với khoản chuyển nào của bữa
- **THEN** hệ thống báo không tìm thấy khoản chuyển tiền
- **AND** bữa không bị thay đổi

#### Scenario: Đánh dấu tất cả đã chuyển
- **WHEN** người dùng bấm "Đánh dấu tất cả đã chuyển"
- **THEN** mọi khoản chưa tick được tick trong cùng một lần ghi

### Requirement: Tick chỉ có hiệu lực khi số tiền khoản chuyển không đổi
Hệ thống SHALL coi một khoản là đã chuyển chỉ khi số tiền hiện tại của khoản đó bằng số tiền lưu lúc tick. Nếu số tiền đã đổi, khoản hiển thị lại là chưa chuyển và trạng thái cũ vẫn nằm trong bữa cho đến khi người dùng bỏ tick. Trạng thái của một khoản không còn tồn tại trong danh sách hiện tại vẫn được giữ trong bữa nhưng không hiển thị.

#### Scenario: Số tiền khoản đổi sau khi đã tick
- **WHEN** khoản Bình chuyển cho chủ app 45.000 đ đã được tick, rồi một hoá đơn bị sửa làm số tiền của khoản đó thay đổi
- **THEN** khoản đó hiển thị là chưa chuyển
- **AND** số khoản đã tick trong tiến độ giảm tương ứng

#### Scenario: Đổi chế độ không xoá các tick đã lưu
- **WHEN** bữa đã có khoản được tick và người dùng đổi chế độ quyết toán
- **THEN** các trạng thái tick đã lưu vẫn còn trong bữa
- **AND** một khoản mới có cùng khoá và cùng số tiền với khoản đã tick sẽ hiển thị là đã chuyển

### Requirement: Trạng thái hoàn tất của thực thể và của bữa
Hệ thống SHALL coi một thực thể là đã xong khi mọi khoản chuyển có nó làm nguồn hoặc đích đều đã được tick, hoặc khi nó không có khoản chuyển nào. Bữa được coi là đã thanh toán xong khi có ít nhất một hoá đơn, số món chưa có người ăn bằng 0, và mọi khoản chuyển đều đã được tick. Tiến độ thanh toán hiển thị dưới dạng số khoản đã tick trên tổng số khoản chuyển.

#### Scenario: Tiến độ theo số khoản chuyển
- **WHEN** bữa có một khoản chuyển và khoản đó chưa được tick
- **THEN** tiến độ hiển thị 0/1 và bữa chưa được coi là đã thanh toán xong
- **AND** sau khi tick khoản đó, tiến độ hiển thị 1/1 và bữa được coi là đã thanh toán xong

#### Scenario: Thực thể cân bằng
- **WHEN** một thực thể có số dư ròng bằng 0
- **THEN** thực thể đó hiển thị là "Cân bằng" và không cần tick

#### Scenario: Bữa chưa có hoá đơn không được coi là xong
- **WHEN** bữa chưa có hoá đơn nào
- **THEN** bữa không được coi là đã thanh toán xong

### Requirement: Bất biến cân đối giữa tổng thu và tổng trả
Hệ thống SHALL bảo đảm rằng tổng tiền đã ứng của mọi thực thể bằng tổng tiền các hoá đơn của bữa, tổng phải chi của mọi thực thể bằng tiền đã phân bổ, và tổng số dư ròng của mọi thực thể bằng tiền chưa phân bổ, nên bằng 0 khi không còn tiền chưa phân bổ. Tổng số tiền các lệnh chuyển ở chế độ tự thanh toán bằng tổng các số dư dương. Các bất biến về tổng đã ứng và tổng số dư chỉ đúng khi người ứng của mỗi hoá đơn nằm trong danh sách tham gia kèo của hoá đơn đó.

#### Scenario: Tổng khớp với hai kèo
- **WHEN** bữa có hai kèo, ba thành viên, hoá đơn 60.000 đ ở kèo 1 do A ứng và chia đều cho A và B, hoá đơn 90.000 đ ở kèo 2 do C ứng và chia đều cho A, B, C
- **THEN** tổng đã ứng của các thực thể bằng 150.000 đ và tổng phải chi của các thực thể bằng 150.000 đ
- **AND** tổng số dư ròng của các thực thể bằng 0

### Requirement: Bữa đã lưu trữ chỉ đọc quyết toán
Hệ thống SHALL khi bữa ở trạng thái `ARCHIVED` và có bản tóm tắt đã lưu, dựng kết quả quyết toán từ bản tóm tắt đó thay vì tính lại từ hoá đơn. Trong kết quả này mọi khoản chuyển đều hiển thị là đã chuyển và không có giải trình từng thành viên. Mọi yêu cầu đổi chế độ hoặc tick đã chuyển đều bị từ chối với mã `MEAL_ARCHIVED`, và các công tắc, ô tick tương ứng bị vô hiệu hoá.

#### Scenario: Xem quyết toán của bữa đã lưu trữ
- **WHEN** người dùng mở quyết toán của một bữa ở trạng thái `ARCHIVED` có bản tóm tắt
- **THEN** các lệnh chuyển tiền và thực thể lấy từ bản tóm tắt đã lưu
- **AND** mọi khoản chuyển hiển thị là đã chuyển và công tắc chế độ cùng các ô tick không bấm được

#### Scenario: Cố đổi chế độ hoặc tick ở bữa đã lưu trữ
- **WHEN** có yêu cầu đổi chế độ quyết toán hoặc tick một khoản của bữa ở trạng thái `ARCHIVED`
- **THEN** hệ thống từ chối với mã `MEAL_ARCHIVED`
- **AND** bữa không bị thay đổi

### Requirement: Chi tiết quyết toán gom theo thực thể
Hệ thống SHALL hiển thị khối "Chi tiết quyết toán" đóng sẵn bên dưới danh sách lệnh chuyển tiền. Khi mở khối này, mỗi thực thể là một khối thu gọn có tên và số dư ròng, với nhãn "Nhận lại" kèm số tiền nếu dương, "Phải trả" kèm số tiền nếu âm, hoặc "Cân bằng" nếu bằng 0. Khi mở khối của một thực thể, hiển thị ứng trước và chi của thực thể, cùng giải trình của từng thành viên trong thực thể, hiển thị sẵn và không thu gọn thêm.

#### Scenario: Xem giải trình của một thành viên trong thực thể
- **WHEN** người dùng mở "Chi tiết quyết toán" rồi mở khối "Chi tiết Bình" của thực thể Bình có nhãn "Phải trả"
- **THEN** khối của Bình hiển thị "Ứng trước" và "Chi" của Bình
- **AND** giải trình của Bình hiện ngay trong khối, gồm các hoá đơn đã ứng và các dòng chi phí, không cần mở thêm
