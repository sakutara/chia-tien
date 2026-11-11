## ADDED Requirements

### Requirement: Danh bạ thành viên toàn cục
Hệ thống SHALL lưu mọi người được thêm vào một bữa vào danh bạ thành viên toàn cục (bảng `members`) một cách tự động, không cần thao tác "lưu danh bạ" riêng, và người đó SHALL xuất hiện trong gợi ý của các bữa sau. (BR-2.1)

#### Scenario: Người đã thêm vào bữa vẫn còn sau khi tải lại trang (AC-4)
- **WHEN** người dùng thêm một người vào bữa, sau đó tải lại trang (F5) và mở danh sách chọn người của một bữa khác
- **THEN** người đó vẫn có trong danh bạ và xuất hiện trong danh sách gợi ý

### Requirement: Danh sách chọn người xếp A-Z
Hệ thống SHALL xếp danh sách chọn người theo thứ tự chữ cái tiếng Việt, dùng `Intl.Collator('vi')` trên tên hiển thị, ở mọi trạng thái: khi chưa gõ gì, khi đang lọc và sau khi thêm người mới. Hai tên bằng nhau theo collator SHALL xếp theo `createdAt`, người tạo trước xếp trước. (BR-2.2, R-3)

#### Scenario: Danh sách khi chưa gõ gì (AC-1)
- **WHEN** ô lọc chưa có ký tự nào
- **THEN** danh sách hiện mọi người theo thứ tự A-Z, ví dụ An, Ánh, Bình, Cường, Đạt, sau hồ sơ "Tôi" được ghim đầu

#### Scenario: Người mới được thêm vào đúng vị trí A-Z (BR-2.2)
- **WHEN** vừa thêm một người mới có tên đứng giữa hai người đã có trong danh bạ
- **THEN** người mới xuất hiện đúng vị trí A-Z, không nằm cuối danh sách

#### Scenario: Tên bằng nhau theo collator xếp theo thời điểm tạo (R-3)
- **WHEN** hai người có tên bằng nhau theo `Intl.Collator('vi')`
- **THEN** người có `createdAt` nhỏ hơn xếp trước

### Requirement: Lọc theo gõ có dấu và không dấu
Hệ thống SHALL lọc danh sách chọn người ngay khi người dùng gõ, khớp khi `normalizedName` của thành viên chứa `normalizeName(từ khoá)`. Kết quả lọc SHALL xếp theo quy tắc ghim và A-Z, không xếp theo độ khớp. Từ khoá rỗng SHALL hiện toàn bộ danh bạ. (BR-2.3, R-4)

#### Scenario: Lọc tức thì theo từng ký tự, có dấu và không dấu (AC-1)
- **WHEN** người dùng gõ từng ký tự, ví dụ `binh` hoặc `dat`
- **THEN** danh sách lọc ngay theo từng ký tự và hiện `Bình` hoặc `Đạt` tương ứng

#### Scenario: Từ khoá rỗng hiện toàn bộ danh bạ (R-4)
- **WHEN** ô lọc rỗng hoặc chỉ có khoảng trắng
- **THEN** danh sách hiện toàn bộ danh bạ, xếp theo quy tắc ghim và A-Z

### Requirement: Người đã tham gia được đánh dấu và không thêm hai lần
Hệ thống SHALL đánh dấu rõ "Đã tham gia" cho người đã có trong bữa khi hiện trong danh sách chọn người, và MUST NOT thêm cùng một người vào bữa hai lần. (BR-2.5)

#### Scenario: Dòng người đã tham gia có nhãn (BR-2.5)
- **WHEN** danh sách chọn người hiện một người đã có trong bữa
- **THEN** dòng đó hiện nhãn "Đã tham gia"

#### Scenario: Thêm lần hai không tạo bản ghi thứ hai (BR-2.5)
- **WHEN** người dùng thêm một người đã có trong bữa
- **THEN** hệ thống không thêm lại và không tạo bản ghi mới trong danh sách người tham gia

### Requirement: Ô thêm người mới trong bộ lọc
Hệ thống MUST hiển thị lựa chọn "+ Thêm người mới" ngay trong ô lọc khi từ khoá đã chuẩn hoá không rỗng và không có thành viên nào có tên hiển thị giống hệt cả dấu. Một cú click hoặc phím `Enter` SHALL tạo người, lưu vào danh bạ và thêm vào bữa. (BR-2.4, R-5)

#### Scenario: Gõ tên chưa có trong danh bạ (AC-2)
- **WHEN** người dùng gõ một tên chưa có trong danh bạ
- **THEN** ô lọc hiện dòng "+ Thêm người mới" với tên đã viết hoa chữ cái đầu, và một cú click hoặc phím `Enter` tạo người rồi thêm vào bữa

#### Scenario: Chỉ có người khác dấu vẫn hiện nút tạo (R-5)
- **WHEN** người dùng gõ `Ân` và trong danh bạ chỉ có `An`
- **THEN** nút "+ Thêm người mới" vẫn hiện, vì đó có thể là một người khác

#### Scenario: Tên trùng hoàn toàn không hiện nút tạo (R-5)
- **WHEN** từ khoá trùng tên hiển thị của một người đã có, cùng dấu và không phân biệt hoa thường
- **THEN** ô lọc không hiện nút tạo mới mà hiện nhắc nhở cách phân biệt (R-2)

### Requirement: Quy tắc phím Enter trong ô lọc
Hệ thống MUST xử lý phím `Enter` trong ô lọc theo thứ tự sau: (a) nếu người dùng đang chọn một dòng bằng phím mũi tên thì chọn dòng đó; (b) nếu không và có khớp chính xác theo R-2 thì chọn người khớp; (c) nếu không, từ khoá không chứa dấu và đã có người có dấu cùng dạng không dấu thì chọn người đầu tiên trong số đó và không tạo mới; (d) còn lại, từ khoá không rỗng thì tạo người mới. Chọn người đã tham gia SHALL chỉ báo "Đã tham gia", không làm gì khác và không bỏ người đó ra khỏi bữa. (R-6)

#### Scenario: Dòng đang được chọn bằng mũi tên (R-6)
- **WHEN** người dùng dùng phím mũi tên đến một dòng rồi nhấn `Enter`
- **THEN** hệ thống chọn dòng đó

#### Scenario: Khớp chính xác thì chọn người khớp (R-6)
- **WHEN** người dùng gõ đúng tên đã có, cùng dấu, rồi nhấn `Enter`
- **THEN** hệ thống chọn người đã có, không tạo người mới

#### Scenario: Gõ tắt không dấu không tạo người thứ hai (AC-5c)
- **WHEN** người dùng gõ `binh` rồi nhấn `Enter` khi trong danh bạ có `Bình`
- **THEN** hệ thống chọn `Bình` và không tạo `Binh`; muốn tạo người khác dấu thì click nút "+ Thêm người mới" hoặc dùng phím mũi tên chọn nút đó, vì nút là dòng cuối của danh sách

#### Scenario: Không có khớp thì tạo người mới (R-6)
- **WHEN** từ khoá không rỗng và không rơi vào các trường hợp trên
- **THEN** hệ thống tạo người mới với tên đã chuẩn hoá và thêm vào bữa

### Requirement: Không có hai người cùng tên hiển thị
Hệ thống MUST NOT lưu hai người có tên hiển thị giống hệt nhau cả dấu sau chuẩn hoá, không phân biệt hoa thường. Đổi tên sang tên đã có của người khác SHALL bị từ chối với lỗi `DUPLICATE_NAME`. Muốn có hai người trùng tên, người dùng SHALL phân biệt bằng từ khác, ví dụ `Thuỳ An` và `Khánh An`, hoặc `An A` và `An B`. (BR-2.12, R-2)

#### Scenario: Gõ lại tên đã có khác hoa thường (AC-5)
- **WHEN** người dùng gõ lại tên đã có nhưng khác hoa thường, ví dụ `BÌNH` khi đã có `Bình`
- **THEN** hệ thống chọn người đã có, không tạo người thứ hai, và hiện nhắc theo mẫu "Đã có 'Bình'. Muốn thêm người khác cùng tên, hãy thêm họ hoặc hậu tố, ví dụ 'Thuỳ An', 'An A'."

#### Scenario: Đổi tên sang tên người khác bị từ chối (AC-5)
- **WHEN** người dùng đổi tên hồ sơ thành tên hiển thị đã có của người khác, cùng dấu
- **THEN** hệ thống từ chối đổi tên với lỗi `DUPLICATE_NAME`

### Requirement: Khoá tìm kiếm có hậu tố số cho tên khác dấu
Hệ thống SHALL cấp `normalizedName` làm khoá duy nhất của danh bạ, theo cách bỏ dấu, chuyển chữ thường và đổi `đ` thành `d`. Người tạo sau nhận hậu tố số nhỏ nhất còn trống (`an`, `an2`, `an3`), trong khi tên hiển thị vẫn giữ nguyên dấu. Hậu tố SHALL cố định sau khi gán và chỉ được tính lại khi người đó đổi sang dạng không dấu khác. (R-2, BR-2.12)

#### Scenario: An và Ân là hai người riêng (AC-5c)
- **WHEN** danh bạ có `An` rồi người dùng tạo `Ân`
- **THEN** `An` có khoá `an`, `Ân` có khoá `an2`, và gõ `an2` tìm ra `Ân`

#### Scenario: Khoá đã bị người thật chiếm thì lấy số kế tiếp (R-2)
- **WHEN** danh bạ có `An` (khoá `an`) và một người thật tên `An2` (khoá `an2`), rồi người dùng tạo `Ân`
- **THEN** `Ân` nhận khoá `an3`

### Requirement: Viết hoa chữ cái đầu mỗi từ khi nhập tên
Hệ thống SHALL chuẩn hoá tên nhập: bỏ khoảng trắng đầu và cuối, gộp các khoảng trắng liên tiếp thành một, độ dài 1 đến 50 ký tự sau chuẩn hoá, và giữ nguyên dấu người dùng gõ. Tên hiển thị SHALL viết hoa chữ cái đầu mỗi từ và viết thường các chữ còn lại, bất kể người dùng gõ kiểu nào hoặc tạo ở đâu. Quy tắc áp dụng cho mọi đường tạo và đổi tên, kể cả tên trên nút "+ Thêm người mới". (R-1, AC-5b)

#### Scenario: Gõ thường hoặc gõ hoa toàn bộ (AC-5b)
- **WHEN** người dùng nhập `bình` hoặc `BÌNH`
- **THEN** tên được lưu và hiển thị là `Bình`

#### Scenario: Nhiều từ và dấu gạch nối (AC-5b)
- **WHEN** người dùng nhập `văn an` hoặc `PHƯƠNG anh`
- **THEN** tên được lưu là `Văn An` hoặc `Phương Anh`; từ mới bắt đầu sau khoảng trắng hoặc dấu gạch nối

#### Scenario: Tên rỗng hoặc quá dài bị từ chối (R-1)
- **WHEN** tên sau chuẩn hoá rỗng hoặc dài hơn 50 ký tự
- **THEN** hệ thống từ chối tên với lỗi `INVALID_NAME`

#### Scenario: Nhãn "Tôi" do seed tạo giữ nguyên đến khi đổi tên (R-1)
- **WHEN** hồ sơ chủ app còn nhãn "Tôi" do seed tạo và người dùng chưa đổi tên
- **THEN** nhãn giữ nguyên; khi người dùng đổi tên thì quy tắc viết hoa được áp dụng

### Requirement: Hồ sơ "Tôi" được ghim đầu và không xoá được
Hệ thống SHALL cho phép xem và đổi tên hồ sơ "Tôi" nhưng MUST NOT xoá hồ sơ này. Hồ sơ "Tôi" (`isDefaultHost`) SHALL đứng đầu danh sách chọn người và danh sách người tham gia, kể cả khi đang lọc nếu khớp từ khoá; những người còn lại xếp A-Z phía sau. (BR-2.7, R-3)

#### Scenario: Tôi đứng đầu khi đang lọc (AC-5d)
- **WHEN** người dùng gõ một từ khoá khớp cả hồ sơ "Tôi" và người khác
- **THEN** hồ sơ "Tôi" đứng đầu, những người khớp còn lại xếp A-Z phía sau

#### Scenario: Không xoá được hồ sơ Tôi (BR-2.7)
- **WHEN** người dùng cố xoá hồ sơ "Tôi"
- **THEN** hệ thống từ chối thao tác

#### Scenario: Đổi tên hồ sơ Tôi giữ vai trò mặc định (BR-2.7)
- **WHEN** người dùng đổi tên hồ sơ "Tôi"
- **THEN** tên mới áp dụng quy tắc viết hoa và hồ sơ vẫn là hồ sơ mặc định (`isDefaultHost`)

#### Scenario: Người chủ trì khác không được ghim (R-3)
- **WHEN** một người khác hồ sơ "Tôi" được chọn làm chủ trì của một bữa
- **THEN** người đó xếp A-Z như mọi người và được nhận biết bằng huy hiệu vàng

### Requirement: Người đã tạo được giữ trong danh bạ
Hệ thống SHALL giữ người đã tạo trong danh bạ kể cả khi người đó bị bỏ khỏi mọi bữa. (R-15)

#### Scenario: Bỏ khỏi bữa không xoá khỏi danh bạ (R-15)
- **WHEN** một người bị bỏ khỏi bữa và không còn ở bữa nào
- **THEN** người đó vẫn còn trong danh bạ và vẫn xuất hiện trong gợi ý của các bữa sau
