## 1. Bỏ thông báo khoá

- [x] 1.1 Bỏ banner "Đã lưu trữ: ảnh và chi tiết món đã xoá, chỉ xem. Vẫn xoá được bữa." trong `components/meals/MealInfo.tsx`.
- [x] 1.2 Bỏ dòng "Bữa đã lưu trữ: không sửa được thành viên." trong `pages/MealWorkspacePage.tsx`.
- [x] 1.3 Bỏ nhãn "Chỉ xem" và biểu tượng khoá trong `components/settlement/SettlementPanel.tsx`.
- [x] 1.4 Xoá các chuỗi i18n tương ứng trong `i18n/en.ts`.

## 2. Chỉ xoá hoá đơn và ảnh, giữ món

- [x] 2.1 `services/archiveService.ts`: bỏ `itemCount` khỏi `ArchivePreview`; bỏ việc xoá `items` khỏi transaction.
- [x] 2.2 `components/meals/ArchiveMealDialog.tsx`: bỏ số món khỏi nội dung xác nhận; nêu rằng các món được giữ lại.
- [x] 2.3 `hooks/useMealSessions.ts`: thêm trường `keptItems` cho mỗi kèo.
- [x] 2.4 `components/sessions/SessionCard.tsx`: hiển thị "Món (N)" và danh sách món được giữ trong kèo đã chốt.
- [x] 2.5 `services/archiveService.test.ts`: kiểm món còn nguyên sau lưu trữ và hoá đơn, ảnh bị xoá.
- [x] 2.6 `i18n/en.ts`: thêm chuỗi mới cho nội dung hộp thoại và "Món của {name}".

## 3. Ẩn chia sẻ thanh toán ở bữa đã lưu trữ

- [x] 3.1 `pages/MealWorkspacePage.tsx`: render `ShareMealAction` khi `!archived`.
- [x] 3.2 `pages/MealWorkspacePage.test.tsx`: kiểm bữa đã lưu trữ không có nút "Chia sẻ thông báo thanh toán" và không có nút "Lưu trữ bữa".

## 4. Việc chưa hoàn tất hoặc lệch với thiết kế

- [ ] 4.1 Thứ tự xoá file trước transaction: `deleteFilesByMeal` chạy trước transaction nên nếu transaction lỗi thì file đã mất nhưng bữa vẫn `ACTIVE`. Chưa sửa và chưa có test cho trường hợp này. Xem `design.md`, mục Risks.
- [ ] 4.2 Nhãn "Đã lưu trữ" trên 3 chế độ xem danh sách bữa (SA AC-6): đã có biểu tượng khoá trên `MealCard` và tab ARCHIVED trong `MealStatusView`. Chưa xác nhận đủ cả chế độ Lịch.
- [ ] 4.3 Dung lượng giải phóng trong hộp thoại xác nhận (BR-7.2, AC-4): hiển thị có trong code, nhưng chưa có test kiểm giá trị dung lượng.
