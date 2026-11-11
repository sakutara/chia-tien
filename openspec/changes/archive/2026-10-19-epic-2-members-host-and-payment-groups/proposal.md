# Proposal

## Why

Chủ app đi chơi với một nhóm bạn gần như cố định. Mỗi bữa nhập lại tên từng người vừa chậm vừa dễ sai: cùng một người bị gõ thành "Bình", "binh", "Bình T.". Nguồn: `documentation/epic-2/BR.md` mục A.1.

Epic 2 giải quyết bốn việc:

1. Nhớ người đã từng tham gia để lần sau chọn lại bằng vài phím gõ (danh bạ toàn cục).
2. Chọn người nhanh: ô lọc gõ tới đâu lọc tới đó, xếp A-Z chuẩn tiếng Việt, không có thì thêm mới ngay tại ô.
3. Chỉ định Người chủ trì cho từng bữa, mặc định là "Tôi".
4. Gom nhóm thanh toán cho cặp đôi hoặc gia đình để Epic 6 tính như một người thanh toán duy nhất.

Mục tiêu Epic theo `documentation/04-epics-and-roadmap.md`: cho phép thêm và bỏ người khỏi bữa; tự lưu lịch sử người từng tham gia để chọn nhanh lần sau qua bộ lọc alphabet; chỉ định Người chủ trì; gom nhóm thanh toán (cặp đôi, gia đình). Epic này chỉ lo ai tham gia bữa, ai chủ trì, ai gom nhóm với ai. Tiền bạc (hoá đơn, chia tiền, quyết toán) thuộc Epic 4 đến 6.

Các bên liên quan (BR mục A.2):

- Chủ app: thêm người vào bữa thật nhanh, không tạo trùng người, gom cặp đôi hoặc gia đình dễ dàng.
- Người chủ trì (Host): được nhận hoặc chi tiền ở chế độ "Nhờ người chủ trì" (Epic 6); có thể là người khác chủ app.
- Thành viên nhóm: tên hiển thị đúng, thấy mình thuộc nhóm nào trong snapshot (Epic 8).
- Người phát triển Epic 3 đến 8: cần `participantIds`, `hostMemberId` và `paymentGroups` luôn nhất quán để dùng trực tiếp.

Trạng thái ghi trong tài liệu: BR ghi "đang soạn BR/SA, chờ xác nhận trước khi code"; SA ghi "đã triển khai" (code tại `app/`) và kiểm thử thủ công trên trình duyệt chưa đầy đủ. Không xác định được từ lịch sử git thời điểm từng trạng thái này được ghi. Change này lấy SA làm trạng thái cuối cùng của Epic.

## What Changes

- **US-2.1 Danh bạ thành viên toàn cục**: mọi người được thêm vào một bữa tự động lưu vào bảng `members` và xuất hiện trong gợi ý của các bữa sau, không cần thao tác lưu riêng. Tên được chuẩn hoá và viết hoa chữ cái đầu mỗi từ. Hai người không được trùng tên hiển thị cùng dấu; hai tên khác dấu là hai người, phân biệt bằng hậu tố số ở khoá tìm kiếm.
- **US-2.2 Quick Filter chọn người**: danh sách chọn người xếp A-Z theo `Intl.Collator('vi')`, lọc tức thì theo từng ký tự gõ vào, tìm được cả khi gõ có dấu lẫn không dấu. Ô lọc hiện "+ Thêm người mới" khi tên chưa có, tạo và thêm vào bữa bằng một cú click hoặc phím `Enter`. Quy tắc phím `Enter` được xác định rõ, người đã tham gia được đánh dấu "Đã tham gia".
- **US-2.3 Hồ sơ "Tôi" và Người chủ trì theo từng bữa**: hồ sơ "Tôi" xem và đổi tên được, không xoá được, được ghim đầu danh sách và là chủ trì mặc định của bữa mới. Mỗi bữa có đúng một chủ trì, đổi chủ trì ở bữa này không ảnh hưởng bữa khác.
- **US-2.4 Nhóm thanh toán**: gom từ 2 thành viên trở lên của cùng một bữa thành một nhóm có tên (tự gợi ý nếu để trống), sửa được thành phần và tên, giải tán được. Mỗi thành viên chỉ thuộc tối đa một nhóm trong một bữa. Nhóm tự giải tán khi còn dưới 2 người.
- **Bỏ người khỏi bữa**: người bị bỏ được gỡ khỏi nhóm và khỏi các kèo của bữa đó. Việc bỏ bị chặn nếu người đó là chủ trì hoặc đã gắn với hoá đơn, món. Trạng thái đã thanh toán theo khoá của thực thể bị ảnh hưởng được dọn theo R-13.
- Không có thay đổi schema Dexie và không nâng version cơ sở dữ liệu.

## Capabilities

### New Capabilities
- `member-directory`: danh bạ thành viên toàn cục, ô chọn người với lọc không dấu, sắp xếp A-Z, thêm người mới ngay tại ô, quy tắc chống trùng tên và hậu tố khoá, hồ sơ "Tôi".
- `meal-people-and-payment-groups`: người tham gia một bữa, Người chủ trì theo từng bữa, nhóm thanh toán và các ràng buộc khi thêm, bỏ người, bữa đã lưu trữ.

### Modified Capabilities
- Không có. Change này ghi lại thiết kế gốc của Epic 2 như tài liệu lịch sử.

## Impact

- Mã nguồn (theo SA mục B.2): `app/src/db/normalize.ts` (thêm `cleanName`, `formatMemberName`, `hasDiacritics`, `MEMBER_NAME_MAX`), `app/src/domain/memberFilter.ts`, `app/src/domain/paymentGroupRules.ts`, `app/src/services/peopleErrors.ts`, `app/src/services/memberService.ts`, `app/src/services/mealPeopleService.ts`, các hook `app/src/hooks/useMembers.ts` và `app/src/hooks/useMealPeople.ts`, các component trong `app/src/components/people/`, và `app/src/App.tsx`.
- Dữ liệu: không đổi schema Dexie, không nâng version (SA mục B.4). Các trường dùng: `Member`, `Meal.participantIds`, `Meal.hostMemberId`, `Meal.paymentGroups`, `Meal.settlementStatuses`.
- Thư viện: không thêm thư viện cho phần logic. Thêm devDependencies cho kiểm thử component: `@testing-library/react@16.3.0`, `@testing-library/dom@10.4.0`, `@testing-library/user-event@14.6.1` (SA mục B.1).
- Ngoài phạm vi (BR mục A.6):
  - Tạo, sửa, xoá, liệt kê Bữa và màn hình chi tiết bữa thuộc Epic 3. Epic 2 chỉ cung cấp các khối giao diện và service gắn vào một bữa có sẵn.
  - Quản lý danh bạ như một màn hình riêng: đổi tên, gộp trùng, xoá người khỏi danh bạ. Chỉ đổi tên hồ sơ "Tôi" nằm trong phạm vi.
  - Tính tiền theo nhóm, bảng quyết toán và tick thanh toán thuộc Epic 6. Epic 2 chỉ bảo đảm dữ liệu nhóm nhất quán và dọn khoá `settlementStatuses` theo R-13.
  - Ảnh đại diện thật, số điện thoại, tài khoản ngân hàng của thành viên.
  - Đồng bộ danh bạ giữa các thiết bị.
- Việc kiểm thử và bàn giao còn dở được ghi trong `tasks.md`.

## Nguồn lịch sử

- Tài liệu gốc: `documentation/epic-2/BR.md` và `documentation/epic-2/SA.md` (nguyên văn SA nằm trong `design.md` của change này), cùng mục EPIC 2 và ma trận truy vết trong `documentation/04-epics-and-roadmap.md`.
- Trước đây tài liệu nằm ở `docs/epic-2/`, được đổi tên sang `documentation/epic-2/` trong commit `d492cfe`.
- Ngày và mã commit đầu tiên, cuối cùng của `documentation/epic-2` (theo lệnh `git log --format='%ad %h %s' --date=short -- documentation/epic-2`): lệnh này chỉ trả về một commit, `2026-10-19 d492cfe Đổi docs thành documentation, đặt bản build vào docs để GitHub Pages phục vụ từ main /docs`, vì đây là commit đổi tên thư mục.
- Lịch sử đầy đủ có theo dõi đổi tên gồm bốn commit, đều ngày 2026-10-19: `94e9ab1` và `a144fd2` (cả hai là "Initial commit: fee calculator app (Vite + React) and docs", thêm `docs/epic-2/`), `506e87c` và `d492cfe` (đổi tên sang `documentation/epic-2/`). Commit đầu tiên là `94e9ab1`, commit cuối là `d492cfe`.
