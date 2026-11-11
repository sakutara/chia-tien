# Proposal

## Why

Người dùng cần một ứng dụng chia tiền nhóm chạy hoàn toàn trên trình duyệt, không cần server, mang phong cách tờ USD (Business Requirements mục A.1). Epic 1 tạo nền móng để các Epic sau (danh bạ, bữa, kèo, hoá đơn...) chỉ việc dùng lại: giao diện thống nhất, dữ liệu bền vững và nơi lưu file hoá đơn.

Mục tiêu của Epic 1 theo tài liệu roadmap: xây dựng khung ứng dụng React và TypeScript, thiết lập hệ giao diện màu xanh lá đậm của tiền USD, và xây dựng cơ sở dữ liệu IndexedDB cùng lưu trữ file hoá đơn trên trình duyệt.

Các bên liên quan:
- Tôi: dùng app một mình trên thiết bị của mình; là Người chủ trì mặc định.
- Thành viên nhóm: chỉ xem snapshot (Epic 8), không dùng cơ sở dữ liệu của Epic 1.
- Dev, Epic 2 đến Epic 8: cần schema ổn định, service lưu file và theme dùng chung.

## What Changes

- **US-1.1**: Khởi tạo dự án Vite, React, TypeScript và Tailwind CSS với bảng màu USD Dark Green (`#123123`, `#1B4332`, `#2D6A4F`, nền giấy `#F2EFE9`) và các token màu, font, thành phần giao diện dùng chung.
- **US-1.2**: Thiết kế schema IndexedDB qua Dexie.js cho 3 tầng dữ liệu (`meals`, `sessions`, `invoices`, `items`) cùng `members` (danh bạ người), `invoice_files` (file hoá đơn) và `settings`.
- **US-1.3**: Xây dựng dịch vụ quản lý file hoá đơn (`fileStorageService`) dùng Origin Private File System (OPFS) kết hợp Blob trong IndexedDB để lưu, đọc, tải xuống và xoá vật lý các file ảnh hoá đơn.
- **US-1.4**: Khởi tạo dữ liệu mặc định: hồ sơ "Tôi" làm Người chủ trì mặc định, và bản ghi settings mặc định, với cơ chế chạy nhiều lần vẫn không tạo trùng.

Không có thay đổi **BREAKING** nào, vì đây là change nền tảng đầu tiên của dự án.

## Capabilities

### New Capabilities
- `local-data-storage`: schema IndexedDB `usd-split`, lưu file hoá đơn qua OPFS và Blob, dữ liệu mặc định (hồ sơ "Tôi", settings), độ bền dữ liệu qua tải lại trang.
- `design-system`: khung ứng dụng, hệ màu USD Green, kiểu chữ và font số, thành phần giao diện dùng chung.

### Modified Capabilities
- Không có.

## Impact

Mã nguồn bị ảnh hưởng (theo mục B.2 của System Analysis): `app/tailwind.config.js`, `app/vite.config.ts`, `app/src/index.css`, `app/src/App.tsx`, `app/src/types/index.ts`, `app/src/db/db.ts`, `app/src/db/normalize.ts`, `app/src/db/seed.ts`, `app/src/db/db.test.ts`, `app/src/services/fileStorageService.ts`, `app/src/services/fileStorageService.test.ts`.

Dữ liệu: cơ sở dữ liệu IndexedDB `usd-split` phiên bản 1 với 7 bảng. Chưa có migration.

Thư viện: Vite 8, React 19, TypeScript 6, Tailwind CSS 3, Dexie 4 cùng `dexie-react-hooks`, lucide-react, Vitest cùng fake-indexeddb và jsdom.

Ngoài phạm vi (mục A.6 của Business Requirements): giao diện quản lý bữa, danh bạ, nhập hoá đơn, OCR, quyết toán và snapshot, thuộc Epic 2 đến Epic 8. PWA và service worker chưa nằm trong Epic 1.

Ghi chú lưu trữ: đây là ghi lại thiết kế gốc của Epic 1 tại thời điểm chuyển sang OpenSpec. Tài liệu `design.md` là nguyên văn System Analysis, có thể không còn khớp code hiện tại. Hành vi hiện hành nằm ở `openspec/specs/`.

## Nguồn lịch sử

- Tài liệu gốc: `documentation/epic-1/BR.md`, `documentation/epic-1/SA.md` (nguyên văn trong `design.md`), và `documentation/04-epics-and-roadmap.md` (mục EPIC 1 và ma trận truy vết).
- Lịch sử git theo `git log -- documentation/epic-1`: commit đầu tiên là `d492cfe` ngày 2026-10-19, commit cuối cùng cũng là `d492cfe` ngày 2026-10-19. Đường dẫn này chỉ có một commit.
- Trước khi đổi tên thành `documentation/`, tài liệu nằm ở `docs/epic-1`: commit `a144fd2` ngày 2026-10-19 (Initial commit), và được đổi tên trong commit `506e87c` ngày 2026-10-19.
