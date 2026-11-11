## ADDED Requirements

### Requirement: Thêm người vào bữa là một thao tác nguyên tử
Hệ thống SHALL cập nhật `lastUsedAt` của thành viên mỗi khi thêm người đó vào bữa. Tạo người mới và thêm vào bữa SHALL là một thao tác nguyên tử: không để lại người mồ côi trong danh bạ nếu bước thêm vào bữa lỗi. (R-7)

#### Scenario: Lỗi ở bước thêm vào bữa không để lại người mới (R-7)
- **WHEN** người dùng tạo người mới nhưng bước thêm vào bữa gặp lỗi
- **THEN** người mới không được lưu vào danh bạ

#### Scenario: Thêm người đã có cập nhật lần dùng gần nhất (R-7)
- **WHEN** người dùng thêm một người đã có trong danh bạ vào bữa
- **THEN** hệ thống cập nhật `lastUsedAt` của người đó

### Requirement: Bữa lưu trữ không được thay đổi người và nhóm
Hệ thống MUST từ chối mọi thao tác thêm hoặc bỏ người, đổi chủ trì, tạo, sửa hoặc giải tán nhóm trên bữa có trạng thái `ARCHIVED`. Dữ liệu người và nhóm của bữa đã lưu trữ MUST NOT thay đổi. (BR-2.11, R-14)

#### Scenario: Bữa lưu trữ từ chối mọi thay đổi người và nhóm (AC-9)
- **WHEN** người dùng thử thêm hoặc bỏ người, đổi chủ trì, hoặc sửa nhóm của một bữa `ARCHIVED`
- **THEN** hệ thống từ chối thao tác với lỗi `MEAL_ARCHIVED` và không ghi gì

### Requirement: Mỗi bữa có đúng một người chủ trì
Hệ thống SHALL gán đúng một người chủ trì cho mỗi bữa. Mặc định là hồ sơ "Tôi". Người dùng SHALL đổi được chủ trì theo từng bữa mà không ảnh hưởng bữa khác. Người chủ trì luôn thuộc danh sách tham gia của bữa. (BR-2.6, R-8)

#### Scenario: Bữa mới có "Tôi" làm chủ trì và là người tham gia (AC-6)
- **WHEN** người dùng tạo một bữa mới
- **THEN** bữa có chủ trì mặc định là hồ sơ "Tôi", và "Tôi" nằm sẵn trong danh sách tham gia

#### Scenario: Đổi chủ trì ở bữa này không đổi bữa khác (AC-6)
- **WHEN** người dùng đổi chủ trì của bữa A sang một người khác
- **THEN** chủ trì của bữa B giữ nguyên

#### Scenario: Chỉ chọn người đã tham gia làm chủ trì (R-8)
- **WHEN** người dùng chọn làm chủ trì một người chưa có trong bữa
- **THEN** hệ thống từ chối với lỗi `NOT_PARTICIPANT`; người đó phải được thêm vào bữa trước

### Requirement: Bỏ người khỏi bữa không làm hỏng dữ liệu bữa
Hệ thống MUST chặn việc bỏ người đang là chủ trì của bữa, và MUST chặn việc bỏ người đang là người ứng tiền của một hoá đơn hoặc có tên trong danh sách người ăn của một món hoặc danh sách chia đều của một hoá đơn. Thông báo chặn SHALL nêu rõ lý do để người dùng gỡ ràng buộc trước. Ở Epic 2, các bảng hoá đơn và món chưa có dữ liệu nên các điều kiện về hoá đơn và món được cài sẵn và kiểm thử bằng dữ liệu giả lập. Người bị bỏ SHALL được gỡ khỏi nhóm thanh toán của bữa đó. (BR-2.10, R-12, AC-8)

#### Scenario: Bỏ người đang ở trong nhóm (AC-8)
- **WHEN** người dùng bỏ một người đang thuộc nhóm thanh toán của bữa
- **THEN** người đó được gỡ khỏi nhóm; nếu nhóm còn dưới 2 người thì nhóm tự giải tán (R-11)

#### Scenario: Bỏ chủ trì khỏi bữa bị chặn (R-8)
- **WHEN** người dùng bỏ người đang là chủ trì của bữa
- **THEN** hệ thống chặn thao tác; người dùng phải đổi chủ trì trước

#### Scenario: Bỏ người đã gắn với hoá đơn hoặc món bị chặn (R-12)
- **WHEN** người dùng bỏ một người đang là người ứng tiền của một hoá đơn, hoặc có tên trong danh sách người ăn của một món, hoặc danh sách chia đều của một hoá đơn
- **THEN** hệ thống chặn thao tác và nêu rõ hoá đơn hoặc món đang gắn với người đó

#### Scenario: Bỏ người không bị chặn tự rời các kèo của bữa đó (R-12)
- **WHEN** người dùng bỏ một người không rơi vào các trường hợp bị chặn
- **THEN** người đó tự rời `SessionKeo.participantIds` của mọi kèo trong bữa; kèo của bữa khác không bị ảnh hưởng

### Requirement: Tạo nhóm thanh toán
Hệ thống SHALL cho phép gom từ 2 thành viên trở lên của cùng một bữa thành một Nhóm thanh toán (`PaymentGroup`). Mọi thành viên SHALL thuộc danh sách tham gia của bữa. Tên nhóm là tuỳ chọn; để trống thì hệ thống tự đặt bằng tên các thành viên nối bằng ` + `, ví dụ `Cường + Dung`, độ dài tối đa 80 ký tự. Người chủ trì được phép nằm trong nhóm. (BR-2.8, R-9)

#### Scenario: Tạo nhóm không đặt tên (R-9)
- **WHEN** người dùng chọn `Cường` và `Dung` làm một nhóm và để trống tên
- **THEN** nhóm được tạo với tên `Cường + Dung`

#### Scenario: Chưa đủ hai người thì không tạo nhóm (R-9)
- **WHEN** người dùng tạo nhóm chỉ có một thành viên
- **THEN** hệ thống từ chối với lỗi `GROUP_TOO_SMALL`

### Requirement: Mỗi thành viên tối đa một nhóm trong bữa
Hệ thống MUST NOT gán một thành viên vào hai nhóm thanh toán trong cùng một bữa. Khi gán trùng, hệ thống SHALL chặn và báo rõ người đó đang ở nhóm nào. (BR-2.9)

#### Scenario: Gán người đã ở nhóm khác (AC-3)
- **WHEN** người dùng tạo hoặc sửa nhóm và chọn một người đã thuộc nhóm thanh toán khác trong cùng bữa
- **THEN** hệ thống chặn thao tác với lỗi `MEMBER_ALREADY_GROUPED`, nêu tên nhóm đang chứa người đó

### Requirement: Sửa và giải tán nhóm thanh toán
Hệ thống SHALL cho phép đổi tên nhóm, sửa thành phần nhóm và giải tán nhóm. Thành phần sau khi sửa SHALL vẫn thoả các quy tắc của nhóm, và thông tin của nhóm được lưu trong bữa. (BR-2.8)

#### Scenario: Sửa thành phần và tên nhóm hoạt động đúng (AC-7)
- **WHEN** người dùng đổi tên nhóm hoặc thêm, bớt thành viên của nhóm
- **THEN** nhóm hiện đúng tên và đúng thành phần mới

#### Scenario: Giải tán nhóm (AC-7)
- **WHEN** người dùng giải tán một nhóm
- **THEN** nhóm bị xoá và các thành viên trở về thanh toán cá nhân

### Requirement: Đại diện nhóm
Hệ thống SHALL đặt đại diện nhóm là một thành viên của nhóm, mặc định là thành viên đầu tiên được chọn. Nếu đại diện rời nhóm thì đại diện SHALL chuyển sang thành viên đầu tiên còn lại của nhóm. (R-10)

#### Scenario: Đại diện rời nhóm (R-10)
- **WHEN** đại diện của nhóm bị gỡ khỏi nhóm
- **THEN** đại diện chuyển sang thành viên đầu tiên còn lại của nhóm

### Requirement: Nhóm tự giải tán khi còn dưới hai người
Hệ thống SHALL tự giải tán nhóm khi một thành viên rời nhóm (bị gỡ khỏi nhóm hoặc bị bỏ khỏi bữa) và nhóm còn dưới 2 người. Người còn lại SHALL trở về thanh toán cá nhân. (R-11, AC-7)

#### Scenario: Nhóm chỉ còn một người thì tự giải tán (AC-7)
- **WHEN** một thành viên rời nhóm và nhóm chỉ còn 1 người
- **THEN** nhóm tự giải tán và người còn lại thanh toán cá nhân

### Requirement: Trạng thái đã thanh toán theo khoá của người hoặc nhóm
Hệ thống SHALL khoá trạng thái `settlementStatuses` theo thực thể thanh toán (`memberId` hoặc `paymentGroupId`). Khi tạo, sửa thành phần, giải tán nhóm, hoặc bỏ người khỏi bữa, các khoá của thực thể bị ảnh hưởng (các `memberId` trong nhóm, `paymentGroupId`) SHALL bị xoá để tránh tick thanh toán sai chủ. Nếu có khoá đang `isPaid = true` thì giao diện SHALL hỏi xác nhận trước khi thực hiện. (R-13)

#### Scenario: Đổi nhóm có người đã tick thanh toán (R-13)
- **WHEN** người dùng sửa thành phần hoặc giải tán một nhóm có khoá `isPaid = true`
- **THEN** giao diện hỏi xác nhận trước; sau khi đồng ý, các khoá bị ảnh hưởng bị xoá

#### Scenario: Tạo nhóm xoá khoá của các thành viên trong nhóm (R-13)
- **WHEN** người dùng tạo một nhóm mới từ các thành viên đang có khoá thanh toán cá nhân
- **THEN** các khoá `memberId` của các thành viên đó bị xoá khỏi `settlementStatuses`
