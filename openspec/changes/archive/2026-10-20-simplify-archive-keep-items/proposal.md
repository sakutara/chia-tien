# Proposal

## Why
Thiết kế gốc của Epic 7 (`documentation/epic-7/BR.md`, `documentation/epic-7/SA.md`) quy định khi lưu trữ bữa thì xoá toàn bộ hoá đơn, chi tiết món và file ảnh, hiển thị banner "Đã lưu trữ: ảnh và chi tiết món đã xoá, chỉ xem", và giữ nút chia sẻ thanh toán ở bữa đã lưu trữ. Ngày 2026-10-20, commit `354c5cd` đổi cách làm: lưu trữ chỉ xoá hoá đơn và file ảnh, giữ lại các món (và hiện lại món trong từng kèo), bỏ banner khoá, và ẩn nút chia sẻ thanh toán ở bữa đã lưu trữ. Thông điệp commit chỉ nêu nội dung thay đổi. Lý do thay đổi không xác định được từ lịch sử.

Change này ghi lại nhóm thay đổi có chủ đích đó để lịch sử liền mạch: thiết kế gốc (archive Epic 7) cộng change này cho ra hành vi hiện tại của capability `meal-archive`.

## What Changes
- **BREAKING** Lưu trữ không còn xoá bản ghi món (`items`) của bữa. Các món được giữ và hiển thị trong từng kèo của bữa đã lưu trữ dưới tiêu đề "Món (N)".
- **BREAKING** Bỏ banner "Đã lưu trữ: ảnh và chi tiết món đã xoá, chỉ xem. Vẫn xoá được bữa." Bữa đã lưu trữ chỉ hiện nhãn trạng thái "Đã lưu trữ" trên tiêu đề.
- **BREAKING** Bữa đã lưu trữ không còn nút "Chia sẻ thông báo thanh toán" trong bước "Chia tiền", kéo theo việc không còn link Snapshot trong bước này.
- Hộp thoại xác nhận lưu trữ không còn đếm số món sẽ bị xoá. Hộp thoại nêu rõ các món được giữ lại.
- Bỏ nhãn "Chỉ xem" và biểu tượng khoá trong bảng quyết toán (`SettlementPanel`), bỏ dòng "Bữa đã lưu trữ: không sửa được thành viên." ở bước người tham gia.

## Capabilities

### New Capabilities
Không có.

### Modified Capabilities
- `meal-archive`: phạm vi xoá khi lưu trữ (giữ món), giao diện bữa đã lưu trữ (không có banner), kèo đã chốt (hiển thị món được giữ), hộp thoại xác nhận (không đếm món), và ẩn nút chia sẻ thanh toán.

## Impact
- Mã nguồn trong `app/src`:
  - `services/archiveService.ts`: bỏ `itemCount` khỏi `ArchivePreview`, bỏ bước xoá `items` khỏi transaction (transaction còn `meals`, `sessions`, `invoices`, `invoice_files`).
  - `services/archiveService.test.ts`: kiểm món còn nguyên sau lưu trữ.
  - `components/meals/ArchiveMealDialog.tsx`: bỏ số món, nêu món được giữ.
  - `components/meals/MealInfo.tsx`: bỏ banner khoá.
  - `components/sessions/SessionCard.tsx`: hiển thị danh sách món được giữ trong kèo đã chốt.
  - `hooks/useMealSessions.ts`: thêm trường `keptItems` cho mỗi kèo.
  - `components/settlement/SettlementPanel.tsx`: bỏ nhãn "Chỉ xem".
  - `pages/MealWorkspacePage.tsx`: ẩn `ShareMealAction` khi bữa đã lưu trữ; bỏ dòng thông báo thành viên.
  - `pages/MealWorkspacePage.test.tsx`: kiểm không có nút chia sẻ ở bữa đã lưu trữ.
  - `i18n/en.ts`: cập nhật và xoá các chuỗi tương ứng.
- Dữ liệu: không đổi schema Dexie, không nâng version, không đổi `types/index.ts`.
- Không đổi `domain/archiveRules.ts`: điều kiện lưu trữ và đóng gói `archivedSummary` giữ nguyên.
- Ngoài phạm vi: thứ tự xoá file trước transaction (xem `design.md`, mục Risks) chưa được sửa trong change này. Nhãn "Đã lưu trữ" trên cả 3 chế độ xem danh sách bữa chưa được kiểm đủ (xem `tasks.md`).
- Liên quan nhưng thuộc change khác: commit `ae13221` (2026-10-22, "Cải thiện kèo, nhóm và chuyển tiền") nằm sau change này. Theo giao việc, commit đó đổi điều kiện lưu trữ sang theo khoản chuyển. Phần đó không thuộc change này và không được ghi lại ở đây.

## Nguồn lịch sử
- Commit `354c5cd`, ngày 2026-10-20, tiêu đề: "Lưu trữ: bỏ thông báo khoá, chỉ xoá hoá đơn và ảnh (giữ món, hiện lại món), ẩn chia sẻ thanh toán cho bữa đã lưu trữ".
- Commit liên quan khác: `c332994` (2026-10-20, Epic 9 i18n) cũng có thay đổi chuỗi banner "Đã lưu trữ"; commit `ae13221` (2026-10-22) như mục Impact.
- Tài liệu cũ bị thay thế, đọc bằng `git show 354c5cd^:<đường dẫn>`:
  - `documentation/epic-7/BR.md`: BR-7.2 (liệt kê số món sẽ xoá), BR-7.3 (bước 3 xoá `items`), BR-7.4 (banner và nút chia sẻ), R-4 (transaction có `items`), R-5 (mô tả lưu trữ một chiều vì món đã bị xoá), AC-2, AC-4, AC-5.
  - `documentation/epic-7/SA.md`: mục B.6 (`ArchivePreview.itemCount`, văn bản `ArchiveMealDialog`).
  - `documentation/02-business-logic-and-algorithms.md`: mục 7.2, bước 3 của hành động lưu trữ.
  - `documentation/04-epics-and-roadmap.md`: Epic 7, US-7.2, tiêu chí nghiệm thu, và dòng 17 của bảng yêu cầu.
  - `documentation/01-architecture-and-data-model.md`: mục 3.6 (`ArchivedMealSummary`).
  - `documentation/README.md`: mục 5 (Lưu trữ Bữa).
