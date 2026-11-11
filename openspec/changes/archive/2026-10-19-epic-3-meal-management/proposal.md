# Proposal

## Why

Sau Epic 1 và Epic 2, ứng dụng đã có kho dữ liệu trên trình duyệt, danh bạ thành viên, người chủ trì và nhóm thanh toán. Tuy nhiên ứng dụng chưa có cách tạo hay tìm lại một Bữa thật: người dùng và nhóm bạn đang gắn người vào một bữa nháp cố định (`PeopleSandbox`). Epic 3 biến Bữa (tầng 1 của mô hình dữ liệu, tính theo ngày) thành đối tượng người dùng quản lý được. Cụ thể, Epic 3 cần:

1. Tạo, sửa và xoá Bữa, bao gồm cả bữa đang hoạt động lẫn bữa đã lưu trữ. Riêng việc sửa chỉ áp dụng cho bữa đang hoạt động.
2. Tìm lại bữa theo ba cách nhìn trên cùng một dữ liệu: Lịch (ngày, tháng, năm), Danh sách (mới đến cũ) và Loại (đang hoạt động hoặc đã lưu trữ).
3. Mở một Bữa vào màn hình chi tiết, nơi đặt khối Thành viên, Chủ trì và Nhóm thanh toán của Epic 2, và chừa sẵn chỗ cho Kèo (Epic 4) và Quyết toán (Epic 6).
4. Thay trang thử `PeopleSandbox` bằng luồng thật, đồng thời giữ khả năng đổi tên hồ sơ "Tôi" (BR-2.7 của Epic 2).

Mục tiêu của Epic 3 theo tài liệu roadmap là quản lý Tầng 1 (Bữa), hỗ trợ thêm, sửa, xoá bữa và chuyển đổi giữa ba chế độ hiển thị danh sách bữa.

Epic này chỉ lo vòng đời và việc tìm kiếm, hiển thị Bữa. Kèo, hoá đơn, món, tính tiền, tick thanh toán, lưu trữ và chia sẻ thuộc Epic 4 đến Epic 8. Epic 3 chỉ hiển thị các con số đó khi đã có và hiện giá trị rỗng khi chưa có.

### Các bên liên quan

| Vai trò | Quan tâm |
| :--- | :--- |
| Người dùng chính (chủ app) | Tạo bữa nhanh (vài giây), tìm lại bữa cũ theo ngày hoặc theo trạng thái, xoá bữa khi không cần nữa |
| Người chủ trì và thành viên | Gián tiếp: bữa phải hiển thị đúng người và đúng ngày |
| Nhóm phát triển Epic 4 đến Epic 8 | Cần một Bữa tồn tại với `participantIds` và `hostMemberId` nhất quán; màn hình chi tiết có sẵn khung để gắn Kèo, Quyết toán, nút Lưu trữ và Chia sẻ; hàm xoá bữa dọn đủ mọi bảng con |
| Epic 7 (Lưu trữ) | Bữa `ARCHIVED` phải hiển thị và xoá được, nhưng không sửa được |

## What Changes

- **US-3.1 Tạo, sửa, xoá Bữa**: người dùng tạo bữa với Tên bữa, Ngày diễn ra và Ghi chú; sửa Tên, Ngày, Ghi chú của bữa đang hoạt động; xoá bữa (đang hoạt động hoặc đã lưu trữ) kèm hộp xác nhận. Xoá bữa xoá sạch Kèo, Hoá đơn, Món, bản ghi file hoá đơn và file vật lý của bữa đó (BR-3.1, BR-3.2, BR-3.3).
- **US-3.1 Màn chi tiết Bữa (Meal Workspace)**: thanh đầu hiển thị tên, ngày, trạng thái, chủ trì và tổng chi; Khu vực 1 chứa khối Thành viên, Chủ trì và Nhóm thanh toán của Epic 2; Khu vực 2 (Kèo) và Khu vực 3 (Quyết toán) là ô giữ chỗ (BR-3.9, BR-3.10).
- **US-3.1 Hộp xác nhận**: mọi hành động phá huỷ hoặc làm mất trạng thái dùng hộp xác nhận của app thay cho `window.confirm` (BR-3.12).
- **US-3.2 Chế độ xem Lịch**: lưới lịch theo tháng với chọn Năm và Tháng nhanh, nút "Hôm nay", tuần bắt đầu từ Thứ 2. Ngày có bữa được đánh dấu kèm tên bữa và tổng tiền. Bấm vào một ngày để xem các bữa trong ngày và tạo bữa mới đã điền sẵn ngày đó (BR-3.4).
- **US-3.3 Chế độ xem Danh sách**: mọi bữa xếp từ mới nhất đến cũ nhất. Mỗi thẻ hiển thị ngày, tên, trạng thái, số kèo, số người, tổng chi phí, tiến độ thanh toán, nút Mở và nút Xoá (BR-3.5, BR-3.8).
- **US-3.4 Chế độ xem Loại**: tách hai phân khu "Đang hoạt động" (`ACTIVE`) và "Đã lưu trữ" (`ARCHIVED`), có đếm số bữa của mỗi phân khu. Bữa đã lưu trữ chỉ còn nút Mở (xem, chỉ đọc) và nút Xoá (BR-3.6, BR-3.10).
- **Đồng bộ ba chế độ xem**: tạo, sửa, xoá ở một chế độ thì hai chế độ còn lại cập nhật ngay trên cùng một nguồn dữ liệu. Ứng dụng nhớ chế độ xem lần trước trên thiết bị (BR-3.7, BR-3.8).
- **Điều hướng**: hai màn hình, "Danh sách bữa" và "Chi tiết bữa", mở được trực tiếp bằng đường dẫn và còn nguyên sau khi tải lại trang. Đường dẫn tới bữa không tồn tại hiển thị thông báo thay vì màn hình trắng (R-17).
- **Hồ sơ "Tôi"**: chuyển chức năng đổi tên từ `PeopleSandbox` lên thanh đầu trang, mục "Hồ sơ của tôi", giữ nguyên quy tắc của Epic 2 (BR-3.11).
- **BREAKING**: xoá trang thử `PeopleSandbox`. Trang này được Epic 2 hẹn thay thế bằng luồng thật ở Epic 3, và chức năng đổi tên "Tôi" được chuyển sang thanh đầu trang.
- **BREAKING**: hành động xoá bữa và các hành động phá huỷ khác không còn dùng `window.confirm` của trình duyệt. Hộp xác nhận của app thay thế, có nút Huỷ là mặc định.

## Capabilities

### New Capabilities
- `meal-management`: quản lý Bữa (tầng 1) gồm tạo, sửa, xoá bữa; ba chế độ xem Lịch, Danh sách và Loại; màn chi tiết bữa; quy tắc tên, ngày, ghi chú; tóm tắt chi phí và tiến độ thanh toán của bữa.

### Modified Capabilities
- Không có capability nào được sửa trong change này. Phần đổi tên hồ sơ "Tôi" được ghi trong `meal-management` (BR-3.11) vì nó nằm trong màn hình quản lý bữa.

## Impact

**Mã nguồn (`app/src`, theo SA mục B.2):**
- Thêm kiểu `MealSummary` và `MealViewMode` vào `types/index.ts`, không đổi các interface đã có.
- Thêm `lib/dates.ts` (ngày cục bộ, kiểm tra `YYYY-MM-DD`, lưới tháng, định dạng ngày tiếng Việt) và `lib/money.ts` (định dạng VNĐ).
- Thêm `domain/mealRules.ts` (hàm thuần: làm sạch tên, tên mặc định, kiểm tra bản nháp, sắp xếp, nhóm theo ngày, tóm tắt bữa, lọc theo trạng thái).
- Thêm `services/mealService.ts` (`createMeal`, `updateMealInfo`, `getDeletePreview`, `deleteMeal`) và mở rộng `services/peopleErrors.ts` với các mã `INVALID_TITLE`, `INVALID_DATE`, `INVALID_NOTE`.
- Thêm các hook `useMealSummaries`, `useHashRoute`, `useMealViewMode`.
- Thêm các component `ui/Modal`, `ui/ConfirmDialog`, các component trong `components/meals/` (chế độ xem, thẻ bữa, hộp tạo và sửa, hộp xoá), `components/profile/MyProfileDialog`.
- Thêm `pages/MealsPage` và `pages/MealWorkspacePage`; sửa `App.tsx` để có header, chọn trang theo route và nút "Hồ sơ của tôi"; sửa nhỏ các component trong `components/people/` để thay `window.confirm` bằng `ConfirmDialog`.
- Xoá `pages/PeopleSandbox.tsx`.

**Dữ liệu:** không nâng phiên bản schema IndexedDB (`db/db.ts` không đổi). Epic 3 dùng lại các bảng `meals`, `sessions`, `invoices`, `items`, `members`, `invoice_files` và `settings` đã có từ Epic 1 và Epic 2. Dữ liệu bữa nháp cũ "Bữa thử nghiệm (Epic 2)" được giữ và xử lý như bữa bình thường.

**Thư viện:** không thêm thư viện mới, kể cả thư viện router và thư viện lịch. Điều hướng dùng hash routing tự viết; lịch tự dựng bằng hàm thuần; hộp thoại dùng phần tử `<dialog>` gốc.

**Kiểm thử:** thêm các file test cho `dates`, `mealRules`, `mealService`, `Modal`, `viewHooks`, `MealsPage`, `MealWorkspacePage` và bổ sung hai test cho R-12e của Epic 2. Theo SA mục B.9, lúc đóng epic có 174 test tự động đạt, build và lint đạt.

**Ngoài phạm vi (theo BR mục A.6):**
- Thêm, sửa, xoá **Kèo**, chọn người tham gia từng kèo, **Hoá đơn**, **Món**, chụp ảnh, OCR và VAT thuộc Epic 4 và Epic 5. Khu vực 2 của màn chi tiết chỉ là ô giữ chỗ. Epic 3 chỉ bảo đảm kiểu dữ liệu `SessionKeo.participantIds` đã có và `removeParticipant` (Epic 2) tự gỡ người khỏi các kèo.
- Tính tiền, bảng quyết toán, chọn chế độ thanh toán và tick "Đã thanh toán" thuộc Epic 6. Khu vực 3 chỉ là ô giữ chỗ.
- Hành động **Lưu trữ bữa** và dọn dẹp dữ liệu khi lưu trữ thuộc Epic 7. Epic 3 chỉ hiển thị và xoá bữa `ARCHIVED`, chưa có nút chuyển một bữa sang `ARCHIVED`.
- Chia sẻ và Snapshot URL thuộc Epic 8. Song ngữ thuộc Epic 9.
- Tìm kiếm và lọc bữa theo chữ, sắp xếp theo tiêu chí khác, phân trang, nhân đôi bữa, xoá nhiều bữa cùng lúc, thùng rác hoặc hoàn tác xoá.
- Quản lý danh bạ như một màn hình riêng (giữ ngoài phạm vi của Epic 2). Chỉ có đổi tên "Tôi" theo BR-3.11.
- Đồng bộ nhiều thiết bị, thống kê theo tháng hoặc năm, xuất dữ liệu.

## Nguồn lịch sử

- Tài liệu gốc: `documentation/epic-3/BR.md` (Business Requirements), `documentation/epic-3/SA.md` (System Analysis, nguyên văn ở `design.md` của change này), và phần "EPIC 3" cùng ma trận truy vết trong `documentation/04-epics-and-roadmap.md`.
- Commit đầu tiên của `documentation/epic-3`: `d492cfe`, ngày 2026-10-19 (commit "Đổi docs thành documentation, đặt bản build vào docs để GitHub Pages phục vụ từ main /docs").
- Commit cuối cùng của `documentation/epic-3`: `d492cfe`, ngày 2026-10-19. Lệnh `git log --format='%ad %h %s' --date=short -- documentation/epic-3` chỉ trả về một commit này, vì thư mục đổi tên từ `docs/` sang `documentation/` trong chính commit đó.
- Lịch sử trước khi đổi tên nằm ở đường dẫn `docs/epic-3`. Theo `git log --all -- docs/epic-3`, commit sớm nhất chạm vào thư mục này là `94e9ab1` cùng ngày 2026-10-19 (commit "Initial commit: fee calculator app (Vite + React) and docs"); các commit `a144fd2` và `506e87c` cũng cùng ngày. Lệnh được giao chỉ tìm theo đường dẫn mới nên không thấy các commit này; chúng được ghi lại ở đây để không làm rơi thông tin lịch sử.
