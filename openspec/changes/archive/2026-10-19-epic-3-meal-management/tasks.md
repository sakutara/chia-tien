# Tasks

Trạng thái theo SA mục B.9 và B.10 (kết quả kiểm chạy ngày 2026-10-19). Việc có `- [ ]` là việc tài liệu ghi là chưa làm hoặc chưa kiểm đủ; ghi chú nêu lý do.

## 1. US-3.1 Tạo, sửa, xoá Bữa

- [x] 1.1 Tạo bữa với Tên, Ngày, Ghi chú hợp lệ và giá trị khởi tạo đúng R-4; "Tôi" là chủ trì và là người tham gia duy nhất (BR-3.1, R-1, R-2, R-3, R-4, AC-3, AC-4). Kiểm tự động: `lib/dates.test.ts`, `domain/mealRules.test.ts`, `services/mealService.test.ts`, `pages/MealsPage.test.tsx`. Trình duyệt: tạo bữa bằng bàn phím, ngày mặc định là hôm nay.
- [ ] 1.2 Sửa Tên, Ngày, Ghi chú của bữa đang hoạt động; từ chối sửa bữa đã lưu trữ với `MEAL_ARCHIVED` (BR-3.2, R-5, AC-5). Ghi chú: kiểm tự động đạt; chưa thử sửa trong trình duyệt (SA B.9, B.10 mục 1).
- [ ] 1.3 Xoá bữa xoá sạch kèo, hoá đơn, món, bản ghi file và file OPFS của bữa, không ảnh hưởng bữa khác và danh bạ (BR-3.3, R-6, AC-2). Ghi chú: kiểm tự động đạt; chưa xoá file OPFS thật vì chưa có ảnh hoá đơn (chờ Epic 4); nhánh lỗi giữa chừng của `deleteFilesByMeal` chưa có test (SA B.9, B.10 mục 2).
- [x] 1.4 Hộp xác nhận xoá nêu số lượng sẽ mất; nút Huỷ focus mặc định; `Esc` đóng, `Tab` không thoát hộp; thay `window.confirm` ở các hành động làm mất trạng thái (BR-3.12, R-7, AC-12). Kiểm tự động: `components/ui/Modal.test.tsx`, `MealsPage.test.tsx`, `MealWorkspacePage.test.tsx`. Trình duyệt: xoá bằng bàn phím đạt.
- [x] 1.5 Màn chi tiết bữa có thanh đầu, Khu vực 1 (khối Epic 2), ô giữ chỗ Khu vực 2 và 3, nút Quay lại, Sửa thông tin, Xoá bữa (BR-3.9). Kiểm tự động: `pages/MealWorkspacePage.test.tsx`. Trình duyệt: mở `#/meal/<id>`, thêm người, F5 vẫn còn bữa và người.

## 2. US-3.2 Chế độ xem Lịch

- [x] 2.1 Lưới tháng bắt đầu từ Thứ 2, 5 hoặc 6 hàng, tháng 2 năm nhuận đúng; ngày có bữa đánh dấu kèm tên và tổng tiền; ô hiện tối đa hai bữa và "+N bữa nữa" (BR-3.4, R-12, AC-6). Kiểm tự động: `lib/dates.test.ts`, `MealsPage.test.tsx`. Trình duyệt: lưới tháng 10/2026 đúng.
- [x] 2.2 Dưới 640 px ô lịch chỉ hiện chấm và số bữa (R-12). Trình duyệt: màn 375 px đạt.
- [ ] 2.3 Chọn ngày, khung bữa trong ngày, nút "+ Tạo bữa mới cho ngày này" điền sẵn ngày, đổi tháng và năm, nút "Hôm nay" (BR-3.4, R-13, R-14, AC-6). Ghi chú: kiểm tự động đạt; trình duyệt chưa thử đổi tháng, năm và tạo bữa từ ngày đã chọn (SA B.9, B.10 mục 1).

## 3. US-3.3 Chế độ xem Danh sách

- [x] 3.1 Thẻ bữa đủ các trường, xếp từ mới đến cũ; hai bữa cùng ngày xếp theo thời điểm tạo; trạng thái rỗng (BR-3.5, R-8, AC-7). Kiểm tự động: `domain/mealRules.test.ts`, `MealsPage.test.tsx`.
- [ ] 3.2 Tóm tắt của bữa lấy từ dữ liệu thật: số kèo, số người, tổng chi, tiến độ thanh toán; "Chưa có chi phí" khi chưa có hoá đơn (BR-3.8, R-9, R-10, R-11). Ghi chú: công thức kiểm tự động bằng dữ liệu giả lập vì chưa có hoá đơn thật; chờ Epic 4 và Epic 6 để kiểm bằng dữ liệu thật. Tiến độ hiện đếm mọi thực thể, Epic 6 sẽ tinh chỉnh (R-10).

## 4. US-3.4 Chế độ xem Loại

- [x] 4.1 Hai tab "Đang hoạt động (n)" và "Đã lưu trữ (n)" với số đếm; tab rỗng có câu giải thích (BR-3.6, R-15, AC-8). Kiểm tự động: `MealsPage.test.tsx`. Trình duyệt: tab hiển thị đúng ở 375 px.
- [ ] 4.2 Bữa đã lưu trữ chỉ đọc: khoá khối người, nhóm, chủ trì; ẩn nút Sửa; vẫn có nút Xoá (BR-3.10, AC-8). Ghi chú: kiểm tự động đạt; chưa có bữa `ARCHIVED` thật để thử trong trình duyệt, cần Epic 7.

## 5. Đồng bộ, điều hướng và trạng thái

- [ ] 5.1 Ba chế độ xem dùng chung một nguồn dữ liệu và cập nhật ngay khi tạo, sửa, xoá (BR-3.7, BR-3.8, AC-1). Ghi chú: kiểm tự động đạt; chưa tách kiểm thử riêng từng chế độ trong trình duyệt.
- [x] 5.2 Nhớ chế độ xem qua `localStorage` với mặc định `LIST`; chịu được khi bộ nhớ lỗi (R-16, AC-9). Kiểm tự động: `hooks/viewHooks.test.ts`. Trình duyệt: chọn Lịch, F5 vẫn ở Lịch.
- [ ] 5.3 Mở bữa không tồn tại hiển thị "Không tìm thấy bữa này" kèm nút về danh sách, không trắng trang; xoá từ màn chi tiết quay về danh sách (R-17, AC-9). Ghi chú: kiểm tự động đạt; trình duyệt chưa thử đường dẫn bữa không tồn tại (SA B.9, B.10 mục 1).
- [x] 5.4 Trạng thái rỗng lần đầu mở app có lời giới thiệu và nút "+ Tạo bữa đầu tiên" (R-18). Kiểm tự động: `pages/MealsPage.test.tsx`.
- [ ] 5.5 Bữa `Bữa thử nghiệm (Epic 2)` còn trong trình duyệt được xem, sửa, xoá như bữa thường (R-19). Ghi chú: SA không ghi kiểm thử riêng cho quy tắc này; không xác định được từ lịch sử.

## 6. Hồ sơ "Tôi" và phi chức năng

- [ ] 6.1 Đổi tên hồ sơ "Tôi" từ thanh đầu trang, "Tôi" không xoá được (BR-3.11, AC-11). Ghi chú: kiểm tự động đạt; chưa thử đổi tên trong trình duyệt (SA B.9, B.10 mục 1).
- [ ] 6.2 Màn hình 375 px không cuộn ngang, nút và ô chạm tối thiểu 44 px, điều khiển đầy đủ bằng bàn phím (AC-13). Ghi chú: đạt ở chế độ Lịch và Loại; chưa kiểm màn chi tiết bữa và các hộp thoại tạo, sửa (SA B.9, B.10 mục 1).
- [ ] 6.3 Kiểm thủ công trên Safari và Firefox. Ghi chú: mới chạy trong trình duyệt của app; chưa kiểm trên Safari và Firefox (SA B.10 mục 1).

## 7. Dọn tài liệu và bàn giao

- [ ] 7.1 Đánh dấu bàn giao Epic 2 đã xong: dùng `initMealPeople()`, thay `PeopleSandbox`, thay `window.confirm`; ghi chú ở Epic 1 BR R-4 về `normalizedName` (SA B.10 mục 4). Ghi chú: việc dọn tài liệu chưa làm trong change này.
- [ ] 7.2 Bàn giao cho Epic 4: thêm Kèo vào Khu vực 2, chọn người tham gia từng kèo, kiểm tra người ứng tiền và người ăn thuộc kèo (SA B.10 mục 5). Ghi chú: việc của Epic 4, chưa làm trong Epic 3.
- [ ] 7.3 Bàn giao cho Epic 6, 7 và 8: gắn Quyết toán vào Khu vực 3 và tinh chỉnh `paymentEntities`; thêm nút Lưu trữ và ghi `archivedSummary`; thêm route snapshot vào `useHashRoute` (SA B.10 mục 5). Ghi chú: việc của các epic sau, chưa làm trong Epic 3.
- [ ] 7.4 Viết test riêng cho từng component `MealCard`, `MealCalendarView`, và test riêng `MyProfileDialog` (SA B.10 mục 3). Ghi chú: hiện phủ qua `MealsPage` và `MealWorkspacePage`, tài liệu chấp nhận cách này; bổ sung nếu component được tách ra dùng ở nơi khác.
