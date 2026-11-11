## 1. Đóng gói và giải mã Custom URL Snapshot (US-8.1)

- [x] 1.1 Khai báo `lz-string` `^1.5.0` trong `app/package.json` và đồng bộ interface `MealSnapshotPayload` trong `app/src/types/index.ts` với kiến trúc §3.7 (SA B.1, B.2, B.4).
- [x] 1.2 Viết `app/src/domain/shareSnapshot.ts` gồm `buildSnapshotPayload`, `encodeSnapshotPayload`, `decodeSnapshotPayload`, `buildSnapshotUrl` (SA B.6).
- [x] 1.3 Viết `app/src/services/snapshotService.ts` với `loadMealSnapshotPayload`, đọc dữ liệu Bữa từ IndexedDB (SA B.3).
- [x] 1.4 Thêm mã lỗi `INVALID_SNAPSHOT` và `SHARE_FAILED` vào `app/src/services/peopleErrors.ts` (SA B.6).
- [x] 1.5 Test `shareSnapshot.test.ts`: khôi phục đúng Bữa `ACTIVE` và `ARCHIVED`, không chứa dữ liệu `Blob`, ném `INVALID_SNAPSHOT` khi chuỗi rỗng, cắt cụt, sai JSON hoặc sai `v` (SA B.9, US-8.1).
- [x] 1.6 Test `snapshotService.test.ts`: `loadMealSnapshotPayload` cho Bữa `ACTIVE` và `ARCHIVED` (SA B.9, US-8.1).

## 2. Xem Snapshot chỉ đọc (US-8.2)

- [x] 2.1 Sửa `app/src/hooks/useHashRoute.ts` để nhận `?snapshot=` và `#/snapshot/`, thêm hàm `exitSnapshot()` (SA B.3, B.5).
- [x] 2.2 Viết `app/src/pages/SnapshotViewerPage.tsx` và `app/src/components/share/SnapshotBanner.tsx`, sửa `app/src/App.tsx` để điều hướng sang trang này khi route là snapshot (SA B.2).
- [x] 2.3 Test `SnapshotViewerPage.test.tsx` và `viewHooks.test.ts` cho hiển thị chỉ đọc, link hỏng và `parseRoute` với URL snapshot (SA B.9, US-8.2).
- [x] 2.4 Kiểm trình duyệt ở 375 px với snapshot của Bữa đang hoạt động, không cuộn ngang (BR A.5, AC-7; đã kiểm).

## 3. Định dạng tin nhắn thanh toán (US-8.3)

- [x] 3.1 Viết `formatEntityShareLabel`, `formatShareMessage` (kèm `onlyUnpaid` và `recipientLabelByEntityId`) trong `app/src/domain/shareSnapshot.ts` (SA B.6).
- [x] 3.2 Test định dạng dòng cá nhân, dòng nhóm `<Cá nhân> + <cá nhân>`, link cuối và lọc khoản chưa thanh toán, ở cả `SELF_SETTLEMENT` và `HOST_MEDIATED` (SA B.9, US-8.3).

## 4. Chia sẻ qua ứng dụng khác và sao chép (US-8.4)

- [x] 4.1 Viết `app/src/components/share/ShareMealDialog.tsx` và gắn nút mở hộp thoại vào Khu vực 3 của `app/src/pages/MealWorkspacePage.tsx` qua `actionsSlot` (SA B.2, B.3).
- [x] 4.2 Viết `canUseWebShare`, `shareMessageViaOs`, `copyTextToClipboard` trong `app/src/services/snapshotService.ts`, kèm phương án dự phòng bằng `<textarea>` và `execCommand` (SA B.6, B.1).
- [x] 4.3 Test `ShareMealDialog.test.tsx` bằng mock: Preview Box, `navigator.share`, xử lý `AbortError`, sao chép toàn bộ tin nhắn và chỉ link (SA B.9, US-8.4; đạt bằng mock).
- [ ] 4.4 Kiểm chia sẻ qua menu hệ điều hành trên thiết bị thật iOS và Android. Chưa thực hiện, mới kiểm bằng mock (SA B.10 mục 1).
- [ ] 4.5 Kiểm sao chép trong ngữ cảnh không HTTPS, ví dụ khi phát triển qua IP LAN. Chưa thực hiện (SA B.10 mục 1; SA B.8 mục 4).
- [ ] 4.6 Kiểm `ShareMealDialog` ở 375 px, gồm cả việc không cuộn ngang và nút chạm đủ 44 px. Chưa thực hiện (SA B.10 mục 2; BR AC-7 đạt một phần).
- [ ] 4.7 Cảnh báo nhẹ trong `ShareMealDialog` khi URL vượt 4.000 ký tự, theo rủi ro số 3 của SA B.8. Tài liệu không ghi trạng thái việc này, không xác định được từ lịch sử có đã làm hay chưa.

## 5. Hồi quy và đóng Epic

- [ ] 5.1 Xác nhận toàn bộ test của Epic 1 đến Epic 7 vẫn đạt sau khi thêm Epic 8 (BR AC-7). Tài liệu không ghi kết quả chạy hồi quy, không xác định được từ lịch sử.
- [ ] 5.2 Kiểm thủ công trên thiết bị thật trước khi đóng Epic, theo trạng thái ghi trong BR đầu tài liệu: "còn kiểm thủ công trên thiết bị thật trước khi đóng" (liên quan 4.4 và 4.5).
