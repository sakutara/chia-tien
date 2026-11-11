## 1. User Story của Epic 1

- [x] 1.1 US-1.1: Khởi tạo dự án Vite, React, TypeScript, Tailwind CSS với bảng màu USD Dark Green. Tài liệu ghi trạng thái đã triển khai (mục B.1, B.2).
- [x] 1.2 US-1.2: Thiết kế schema IndexedDB qua Dexie.js cho các bảng `meals`, `sessions`, `invoices`, `items`, `members`, `invoice_files`, `settings` (mục B.4).
- [x] 1.3 US-1.3: Xây dựng `fileStorageService` lưu, đọc, tải xuống và xoá file hoá đơn qua OPFS kết hợp Blob trong IndexedDB (mục B.5, B.6).
- [x] 1.4 US-1.4: Khởi tạo hồ sơ "Tôi" làm Người chủ trì mặc định qua `ensureDefaultData`, idempotent (mục B.5).

## 2. Kiểm thử theo ma trận truy vết (mục B.9)

- [x] 2.1 US-1.1 (BR-1.2): `vite build` và đã xem giao diện trên trình duyệt (xanh lá, nền kem, số thẳng cột).
- [x] 2.2 US-1.2 (BR-1.3): `db.test.ts` kiểm tra dữ liệu bền qua đóng và mở lại cơ sở dữ liệu.
- [x] 2.3 US-1.3 (BR-1.4, BR-1.7): `fileStorageService.test.ts` kiểm tra thêm, đọc, xoá lẻ và xoá theo bữa trên đường Blob; đường OPFS đã kiểm thử thủ công trên một trình duyệt và đạt.
  - Ghi chú: việc kiểm thử OPFS trên Safari và Firefox chưa làm, xem mục 3.2.
- [x] 2.4 US-1.4 (BR-1.5, BR-1.6): `db.test.ts` kiểm tra tạo hồ sơ một lần và gọi hai lần không tạo trùng.

## 3. Việc còn lại để đóng Epic 1 (mục B.10)

- [ ] 3.1 Kiểm tra F5 giữ dữ liệu (AC-2): hồ sơ "Tôi" còn và không bị nhân đôi.
  - Ghi chú: tài liệu ghi đây là việc còn lại, chưa có ghi nhận kết quả kiểm tra thủ công.
- [ ] 3.2 Thử đường OPFS trên Safari và Firefox (AC-3): thêm, đọc, xoá file.
  - Ghi chú: tài liệu ghi đây là việc còn lại; hiện chỉ đã kiểm thử OPFS thủ công trên một trình duyệt.
