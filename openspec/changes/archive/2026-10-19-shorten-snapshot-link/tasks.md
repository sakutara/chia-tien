# Tasks

## 1. Rút gọn định dạng link
- [x] 1.1 Đổi tham số link thành `s`, vẫn đọc `snapshot` và `#/snapshot/` (commit `8030400`)
- [x] 1.2 Dạng gọn chỉ chứa khoản chuyển tiền và tài khoản người nhận, bỏ thành viên, kèo và hoá đơn khỏi link (commit `8030400`)
- [x] 1.3 Mã hoá nhị phân: varint, bảng chuỗi, deflate với từ điển dựng sẵn, base64url, tiền tố `~` (commit `98c8184`)
- [x] 1.4 Nhánh dự phòng JSON nén khi số không nguyên hoặc âm (commit `98c8184`)
- [x] 1.5 Thêm dependency `fflate` (commit `98c8184`)

## 2. Món trong link
- [x] 2.1 Thêm `itemShares` và `buildItemShares` (commit `2bbd628`)
- [x] 2.2 Hiện lại tab Hoá đơn và gom món theo người phải trả (commit `2bbd628`, `e704ba6`)
- [x] 2.3 Hộp thoại chia sẻ luôn kèm món của người nhận (commit `83fec8d`; công tắc bị bỏ ở commit `f5261e5`)

## 3. Hộp thoại chia sẻ và trang xem
- [x] 3.1 Chọn người nhận kiểu radio trong hộp thoại (commit `b226499`)
- [x] 3.2 Bộ lọc người trong trang xem kiểu radio (commit `70feb95`)
- [x] 3.3 Bỏ tuỳ chọn "Chỉ liệt kê khoản chưa thanh toán" (commit `f5261e5`)
- [x] 3.4 Chuyển giữa "Gửi link" và "Gửi QR" (commit `f5261e5`)
- [x] 3.5 Thanh đầu trang hiện tên bữa thay cho dòng chữ "CHẾ ĐỘ XEM SNAPSHOT (CHỈ ĐỌC)" của tài liệu; `aria-label` "Chế độ xem Snapshot" có từ commit `a144fd2`
- [x] 3.6 Tin nhắn dùng mẫu "chuyển cho <người nhận> <số tiền>" (có từ commit `c332994`)

## 4. Ngôn ngữ trong link
- [x] 4.1 Bỏ tham số `&l=` khỏi link Snapshot (commit `83fec8d`); `main.tsx` vẫn đọc `l` của link cũ

## 5. Kiểm chứng còn lại
- [ ] 5.1 Kiểm thủ công trên thiết bị thật trước khi đóng Epic 8. Lý do: tài liệu Epic 8 ghi việc này chưa làm.
- [ ] 5.2 Kiểm màn chia sẻ ở 375 px, cả tiếng Việt lẫn tiếng Anh. Lý do: tài liệu Epic 8 AC-7 và Epic 9 AC-9 ghi chưa kiểm.
- [ ] 5.3 Kiểm độ dài link thực tế trên các ứng dụng chat và xác nhận không bị cắt. Lý do: tài liệu Epic 8 mục B.7 chỉ ước tính, không có số đo trong lịch sử.
- [ ] 5.4 Cập nhật tài liệu Epic 8, Epic 9 và mục 8 của `02-business-logic-and-algorithms.md`. Lý do: change này chỉ ghi lại, không sửa tài liệu cũ.
