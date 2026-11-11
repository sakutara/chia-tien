# session-management Specification

## Purpose
Quản lý Kèo, tầng thứ hai trong một Bữa: mỗi Kèo là một lần thanh toán riêng trong bữa, có tên, thứ tự và danh sách người tham gia riêng. Capability này cho người dùng thêm, đặt tên, sắp xếp và xoá kèo, chọn người tham gia từng kèo, và xem tổng chi của kèo. Hoá đơn, món và OCR thuộc các capability khác.

## Requirements

### Requirement: Thêm kèo vào cuối bữa
Hệ thống SHALL thêm một kèo mới vào cuối danh sách kèo của bữa đang hoạt động. Kèo mới nhận số thứ tự bằng số kèo hiện có, và lấy toàn bộ người đang có trong bữa làm người tham gia mặc định.

#### Scenario: Thêm kèo không nhập tên
- **GIVEN** bữa đang hoạt động có hai kèo và ba người
- **WHEN** người dùng thêm kèo mà không nhập tên
- **THEN** kèo mới được đặt tên `Kèo 3` và nằm cuối danh sách
- **AND** kèo mới có đủ ba người của bữa làm người tham gia

#### Scenario: Thêm kèo có tên
- **WHEN** người dùng thêm kèo với tên `  Karaoke   Nice `
- **THEN** kèo được lưu với tên `Karaoke Nice`, đã bỏ khoảng trắng thừa ở đầu, cuối và giữa

### Requirement: Làm sạch và giới hạn tên kèo
Hệ thống SHALL chuẩn hoá tên kèo do người dùng nhập: bỏ khoảng trắng đầu và cuối, gộp các khoảng trắng liên tiếp, và thay ký tự điều khiển bằng khoảng trắng. Tên tối đa 80 ký tự; tên dài hơn bị từ chối với mã `INVALID_SESSION_NAME`, không bị cắt ngắn âm thầm. Hai kèo được phép trùng tên.

#### Scenario: Tên vượt 80 ký tự
- **WHEN** người dùng đổi tên kèo thành chuỗi 81 ký tự
- **THEN** thao tác bị từ chối với mã `INVALID_SESSION_NAME`
- **AND** tên kèo giữ nguyên như trước

#### Scenario: Hai kèo cùng tên
- **GIVEN** bữa đã có kèo tên `Lẩu`
- **WHEN** người dùng thêm kèo thứ hai cũng tên `Lẩu`
- **THEN** hệ thống chấp nhận và lưu cả hai kèo

### Requirement: Tên mặc định theo vị trí
Hệ thống SHALL đặt tên mặc định cho kèo theo dạng `Kèo <n>`, trong đó n là vị trí của kèo tính từ 1. Khi người dùng để trống tên khi đổi tên, kèo quay về tên mặc định theo vị trí hiện tại. Tên mặc định hiển thị theo ngôn ngữ đang chọn: `Kèo <n>` khi dùng tiếng Việt và `Venue <n>` khi dùng tiếng Anh, còn tên do người dùng tự đặt giữ nguyên.

#### Scenario: Đổi tên thành rỗng
- **GIVEN** kèo đang ở vị trí thứ nhất và có tên `Cafe`
- **WHEN** người dùng đổi tên thành khoảng trắng
- **THEN** kèo mang tên `Kèo 1`

#### Scenario: Hiển thị tên mặc định theo ngôn ngữ
- **GIVEN** kèo đang có tên mặc định `Kèo 2`
- **WHEN** người dùng chuyển giao diện sang tiếng Anh
- **THEN** kèo hiển thị là `Venue 2`
- **AND** kèo có tên không theo dạng mặc định, ví dụ `Lẩu`, vẫn hiển thị đúng tên đó

### Requirement: Đổi tên kèo bằng tay
Hệ thống SHALL cho phép người dùng đổi tên bất kỳ kèo nào của bữa đang hoạt động vào bất cứ lúc nào. Tên mới được lưu sau khi làm sạch như tên người dùng nhập. Tên có dạng `Kèo <số>` hoặc `Venue <số>` vẫn bị coi là tên mặc định theo vị trí.

#### Scenario: Đổi tên kèo đã có tên riêng
- **GIVEN** kèo có tên `Lẩu`
- **WHEN** người dùng đổi tên thành `Cafe`
- **THEN** kèo mang tên `Cafe`

#### Scenario: Đặt tên trùng dạng tên mặc định
- **GIVEN** kèo có tên `Lẩu`
- **WHEN** người dùng đổi tên thành `Kèo 5`
- **THEN** kèo mang tên `Kèo 5`
- **AND** kèo vẫn bị coi là tên mặc định, nên có thể bị đổi theo tên quán khi lưu hoá đơn có tên quán

### Requirement: Tự đổi tên kèo theo tên quán
Hệ thống SHALL tự đổi tên kèo thành `Kèo <tên quán>` khi một hoá đơn của kèo được lưu với tên quán lấy từ OCR, nhưng chỉ khi tên kèo hiện tại vẫn là tên mặc định dạng `Kèo <n>`. Tên quán được cắt sao cho tên kèo không vượt 80 ký tự. Kèo đã có tên riêng không bị đổi.

#### Scenario: Kèo còn tên mặc định được đổi theo quán
- **GIVEN** kèo đang có tên `Kèo 1`
- **WHEN** một hoá đơn có tên quán `NHÀ HÀNG   A` (lấy từ OCR) được lưu vào kèo
- **THEN** kèo đổi tên thành `Kèo NHÀ HÀNG A`
- **AND** hệ thống thông báo đã đổi tên kèo sang tên đó

#### Scenario: Kèo có tên riêng không bị đổi theo quán
- **GIVEN** kèo đã có tên `Lẩu bò gỗ` do người dùng đặt
- **WHEN** một hoá đơn có tên quán từ OCR được lưu vào kèo
- **THEN** tên kèo vẫn là `Lẩu bò gỗ`

#### Scenario: Tên quán quá dài
- **WHEN** tên quán dài 200 ký tự được dùng để đổi tên kèo mặc định
- **THEN** tên kèo mới không vượt 80 ký tự

### Requirement: Sắp xếp thứ tự kèo
Hệ thống SHALL cho phép đổi chỗ một kèo với kèo liền trên hoặc liền dưới. Thứ tự các kèo luôn liên tục bắt đầu từ 0 và kèo được hiển thị theo thứ tự này. Kèo ở đầu không thể đưa lên, kèo ở cuối không thể đưa xuống, và thao tác đó không làm thay đổi gì.

#### Scenario: Đưa kèo cuối lên trên
- **GIVEN** bữa có ba kèo theo thứ tự A, B, C
- **WHEN** người dùng đưa kèo C lên
- **THEN** thứ tự hiển thị là A, C, B

#### Scenario: Đưa kèo đầu lên
- **GIVEN** kèo đứng đầu danh sách
- **WHEN** người dùng đưa kèo đó lên
- **THEN** thứ tự các kèo không đổi

### Requirement: Xoá kèo kèm dữ liệu con
Hệ thống SHALL xoá kèo cùng toàn bộ hoá đơn, món và file ảnh thuộc kèo đó. Trước khi xoá, hộp xác nhận phải nêu số hoá đơn, số món và số file ảnh sẽ mất; nút huỷ là mặc định. Sau khi xoá, các kèo còn lại được đánh số thứ tự lại liên tục từ 0.

#### Scenario: Hộp xác nhận nêu rõ số lượng sẽ mất
- **GIVEN** kèo có hai hoá đơn, năm món và ba file ảnh
- **WHEN** người dùng bấm xoá kèo
- **THEN** hộp xác nhận nêu kèo sẽ mất hai hoá đơn, năm món và ba file ảnh, và không hoàn tác được

#### Scenario: Xoá kèo ở giữa đánh lại thứ tự
- **GIVEN** bữa có ba kèo A, B, C và người dùng xác nhận xoá B
- **WHEN** thao tác hoàn tất
- **THEN** còn hai kèo A và C với thứ tự 0 và 1
- **AND** hoá đơn và món của B không còn trong dữ liệu

### Requirement: Người tham gia mặc định của kèo
Hệ thống SHALL lấy danh sách người tham gia của kèo mới là bản sao danh sách người của bữa tại thời điểm tạo. Người được thêm vào bữa sau đó không tự động tham gia các kèo đã có; muốn vào kèo, người dùng phải chọn tay.

#### Scenario: Người thêm vào bữa sau không vào kèo cũ
- **GIVEN** bữa có kèo 1 gồm hai người
- **WHEN** người dùng thêm một người mới vào bữa
- **THEN** kèo 1 vẫn chỉ có hai người như trước

### Requirement: Chọn người tham gia kèo trong phạm vi bữa
Hệ thống SHALL chỉ cho chọn người tham gia kèo trong số người đang có trong bữa. Mỗi người chỉ được tính một lần trong danh sách kèo. Nếu chọn người ngoài bữa, thao tác bị từ chối với mã `SESSION_MEMBER_NOT_IN_MEAL`.

#### Scenario: Chọn người không có trong bữa
- **WHEN** người dùng gửi danh sách tham gia gồm một mã người không thuộc bữa
- **THEN** thao tác bị từ chối với mã `SESSION_MEMBER_NOT_IN_MEAL`
- **AND** danh sách tham gia của kèo không đổi

#### Scenario: Bỏ bớt rồi thêm lại người tham gia
- **GIVEN** kèo có ba người An, Bình, Cường
- **WHEN** người dùng bỏ Cường khỏi kèo rồi chọn lại Cường
- **THEN** kèo lại có đủ ba người

#### Scenario: Kèo chưa có hoá đơn được để trống người tham gia
- **GIVEN** kèo không có hoá đơn nào
- **WHEN** người dùng bỏ hết mọi người khỏi kèo
- **THEN** thao tác thành công và kèo có danh sách tham gia rỗng

### Requirement: Không bỏ người đang được dùng trong kèo
Hệ thống SHALL không cho bỏ khỏi kèo người đang là người ứng tiền của một hoá đơn trong kèo, hoặc đang được gán ăn một món trong kèo. Thao tác bị từ chối với mã `SESSION_MEMBER_IN_USE` và không có gì thay đổi. Điều này cũng áp dụng khi cố bỏ hết mọi người khỏi kèo đã có hoá đơn, vì người ứng luôn là người đang được dùng.

#### Scenario: Bỏ người đang ứng tiền
- **GIVEN** Bình là người ứng tiền của một hoá đơn trong kèo
- **WHEN** người dùng bỏ Bình khỏi kèo
- **THEN** thao tác bị từ chối với mã `SESSION_MEMBER_IN_USE`
- **AND** Bình vẫn ở trong kèo

#### Scenario: Bỏ hết người khi kèo đã có hoá đơn
- **GIVEN** kèo có một hoá đơn do Hoà ứng tiền
- **WHEN** người dùng bỏ hết mọi người khỏi kèo
- **THEN** thao tác bị từ chối với mã `SESSION_MEMBER_IN_USE`

### Requirement: Gỡ người khỏi danh sách chia đều của hoá đơn
Hệ thống SHALL gỡ người bị bỏ khỏi kèo khỏi danh sách chia đều của mọi hoá đơn trong kèo. Chỉ những hoá đơn thực sự thay đổi mới được ghi lại. Nếu việc gỡ làm danh sách chia đều của một hoá đơn thành rỗng, thao tác bị từ chối với mã `SESSION_EMPTY` và không có gì thay đổi.

#### Scenario: Bỏ người không ứng tiền và không ăn món
- **GIVEN** kèo có ba người Hoà, Bình, Cường và hoá đơn do Hoà ứng, chia đều cho cả ba
- **WHEN** người dùng bỏ Cường khỏi kèo
- **THEN** hoá đơn chia đều còn Hoà và Bình
- **AND** kèo còn Hoà và Bình

#### Scenario: Gỡ làm danh sách chia đều thành rỗng
- **GIVEN** Bình ứng một hoá đơn nhưng hoá đơn chỉ chia đều cho Hoà
- **WHEN** người dùng bỏ Hoà khỏi kèo
- **THEN** thao tác bị từ chối với mã `SESSION_EMPTY`

### Requirement: Người bị bỏ khỏi bữa rời khỏi các kèo
Hệ thống SHALL tự gỡ một người khỏi danh sách tham gia của mọi kèo trong bữa khi người đó được bỏ khỏi bữa thành công. Việc bỏ người khỏi bữa được quản lý bởi capability `meal-people-and-payment-groups`.

#### Scenario: Bỏ người khỏi bữa
- **GIVEN** Cường tham gia kèo 1 và kèo 2 của bữa và không còn dùng trong hoá đơn hay món nào
- **WHEN** người dùng bỏ Cường khỏi bữa
- **THEN** Cường không còn trong danh sách tham gia của kèo 1 và kèo 2

### Requirement: Tổng chi của kèo
Hệ thống SHALL hiển thị tổng chi của kèo bằng tổng tiền của mọi hoá đơn trong kèo. Kèo chưa có hoá đơn nào và bữa chưa lưu trữ hiển thị `Chưa có chi phí`. Với bữa đã lưu trữ, tổng là số đã chốt của kèo.

#### Scenario: Kèo có hai hoá đơn
- **GIVEN** kèo có hai hoá đơn tổng 150.000 đ và 80.000 đ
- **WHEN** người dùng xem kèo
- **THEN** tổng chi hiển thị là 230.000 đ

#### Scenario: Kèo chưa có hoá đơn
- **WHEN** người dùng xem một kèo chưa có hoá đơn nào
- **THEN** kèo hiển thị `Chưa có chi phí`

### Requirement: Bữa đã lưu trữ chỉ đọc
Hệ thống SHALL từ chối mọi thao tác thêm, đổi tên, đổi chỗ và đổi người tham gia trên kèo của bữa đã lưu trữ, với mã `MEAL_ARCHIVED`. Giao diện không hiển thị các nút thêm, đổi tên, sắp xếp, xoá kèo và chọn người tham gia; thay vào đó hiển thị tóm tắt đã chốt.

#### Scenario: Thêm kèo vào bữa đã lưu trữ
- **GIVEN** bữa có trạng thái ARCHIVED
- **WHEN** có yêu cầu thêm kèo vào bữa đó
- **THEN** thao tác bị từ chối với mã `MEAL_ARCHIVED`

### Requirement: Kèo hoặc bữa không tồn tại
Hệ thống SHALL từ chối thao tác trên kèo không tồn tại với mã `SESSION_NOT_FOUND`, và từ chối thêm kèo vào bữa không tồn tại với mã `MEAL_NOT_FOUND`. Khi bị từ chối, dữ liệu không thay đổi.

#### Scenario: Đổi tên kèo đã bị xoá
- **GIVEN** kèo đã bị xoá khỏi dữ liệu
- **WHEN** người dùng đổi tên kèo đó
- **THEN** thao tác bị từ chối với mã `SESSION_NOT_FOUND`

#### Scenario: Xem kèo của bữa đã lưu trữ
- **GIVEN** bữa có trạng thái ARCHIVED và kèo đã có số đã chốt
- **WHEN** người dùng mở bữa
- **THEN** kèo hiển thị tổng đã chốt, số hoá đơn đã chốt, danh sách người ứng tiền với số tiền đã chốt và các món còn giữ, không có nút sửa

#### Scenario: Xoá kèo của bữa đã lưu trữ
- **GIVEN** bữa có trạng thái ARCHIVED
- **WHEN** có yêu cầu xoá một kèo của bữa đó ở tầng dịch vụ
- **THEN** thao tác không bị từ chối với mã `MEAL_ARCHIVED`, và kèo cùng dữ liệu con của kèo bị xoá
- **AND** giao diện không hiển thị nút xoá kèo cho bữa đã lưu trữ

### Requirement: Thu gọn và mở rộng kèo
Hệ thống SHALL hiển thị mỗi kèo thành một khối thu gọn được. Khi thu gọn, khối hiện tên kèo và số hoá đơn của kèo. Mọi kèo mặc định ở trạng thái thu gọn, kể cả kèo vừa thêm. Người dùng bấm nút "Mở" của kèo để xem chi tiết, và bấm "Thu gọn" để đóng lại.

#### Scenario: Mở bữa có nhiều kèo
- **GIVEN** bữa có hai kèo
- **WHEN** người dùng mở trang làm việc của bữa
- **THEN** cả hai kèo đều thu gọn

#### Scenario: Mở một kèo
- **WHEN** người dùng bấm "Mở" trên một kèo đang thu gọn
- **THEN** kèo đó hiện phần chi tiết, gồm dòng "Tham gia:" và danh sách hoá đơn

### Requirement: Thêm hoá đơn nhanh trên kèo chưa có chi phí
Hệ thống SHALL hiển thị nút "Thêm hoá đơn nhanh" trên kèo chưa có hoá đơn nào và bữa chưa lưu trữ. Bấm nút mở form thêm hoá đơn của kèo đó. Nút bị vô hiệu hoá khi kèo chưa có người tham gia. Nút không hiển thị ở bữa đã lưu trữ.

#### Scenario: Kèo chưa có chi phí có nút thêm nhanh
- **GIVEN** kèo có ít nhất một người tham gia và chưa có hoá đơn nào
- **WHEN** người dùng xem kèo
- **THEN** kèo hiển thị nút "Thêm hoá đơn nhanh" bấm được
- **AND** bấm nút mở form thêm hoá đơn của kèo đó

#### Scenario: Kèo chưa có người tham gia
- **GIVEN** kèo chưa có người tham gia nào
- **WHEN** người dùng xem kèo
- **THEN** nút "Thêm hoá đơn nhanh" hiển thị nhưng bị vô hiệu hoá

#### Scenario: Kèo đã có chi phí
- **GIVEN** kèo đã có ít nhất một hoá đơn
- **WHEN** người dùng xem kèo
- **THEN** kèo không hiển thị nút "Thêm hoá đơn nhanh"
