# Tasks

Nguồn: `documentation/epic-6/BR.md` (mục A.5 về trạng thái tiêu chí) và `documentation/epic-6/SA.md` (mục B.9 ma trận kiểm thử, mục B.10 việc còn lại). Việc được đánh dấu `- [x]` khi tài liệu ghi là đã làm và đã có kiểm thử.

## 1. US-6.1 Tổng hợp chi phí toàn Bữa theo thành viên

- [x] 1.1 Tính `Paid(m)` và `Owed(m)` qua các kèo, hoá đơn `EQUAL_TOTAL` và món `BY_ITEM` trong `domain/settlementEngine.ts` (kiểm bằng `settlementEngine.test.ts`). Nguồn: SA B.9, BR-6.1.
- [x] 1.2 Người không nằm trong `SessionKeo.participantIds` có chi phí bằng 0 ở kèo đó (AC-5, kiểm bằng `settlementEngine.test`).
- [x] 1.3 Chia lẻ cho 3, 6 và 7 người khớp 100% tổng hoá đơn, bù phần dư ±1 đồng (AC-1, kiểm bằng `settlementEngine.test`).
- [x] 1.4 Phát hiện `unassignedItemCount` và `unassignedAmount` (dữ liệu đã kiểm, AC-7).
- [x] 1.5 Bảng giải trình `MemberBreakdownDialog` đã kiểm qua `SnapshotViewerPage.test` (AC-6, đạt một phần).
- [ ] 1.6 Thêm test mở bảng giải trình từ màn hình chi tiết bữa (AC-6). Ghi chú: A.5 ghi "mở giải trình trên màn bữa chưa có test". B.9 ghi dòng này là Đạt, nhưng không khớp với A.5, nên mục này để chưa làm. Xem thêm B.10 mục 2.
- [ ] 1.7 Thêm test cảnh báo món chưa gán hiển thị trên Khu vực 3 (AC-7). Ghi chú: A.5 ghi "cảnh báo hiển thị trên Khu vực 3 chưa có test riêng". Xem thêm B.10 mục 2.

## 2. US-6.2 Gom công nợ theo Nhóm thanh toán

- [x] 2.1 Gộp `TotalPaid`, `TotalOwed` và `NetBalance` của nhóm bằng tổng các thành viên con (AC-2, kiểm bằng `settlementEngine.test`).
- [x] 2.2 Thành viên lẻ giữ thực thể riêng (BR-6.3, kiểm bằng `settlementEngine.test`).

## 3. US-6.3 Chế độ 1, Tự thanh toán (SELF_SETTLEMENT)

- [x] 3.1 `computeSelfSettlementTransfers` tối ưu số giao dịch với nhiều chủ nợ và con nợ, tổng tiền chuyển khớp tổng số dư dương (AC-1, AC-3, kiểm bằng `settlementEngine.test`).

## 4. US-6.4 Chế độ 2, Nhờ người chủ trì (HOST_MEDIATED)

- [x] 4.1 `computeHostMediatedTransfers` khi chủ trì đứng lẻ và khi chủ trì thuộc một `PaymentGroup` (kiểm bằng `settlementEngine.test`).
- [x] 4.2 Đổi qua lại giữa hai chế độ và ghi `Meal.settlementMode` (AC-3, kiểm bằng `SettlementPanel.test`). Ghi chú: B.9 nêu thêm `settlementService.test` cho mục này, nhưng tài liệu không ghi rõ phần đó đã kiểm những gì.

## 5. US-6.5 Tick "Đã thanh toán" và tiến độ thanh toán

- [x] 5.1 `toggleEntityPaid`, `setAllEntitiesPaid` và chặn ghi khi bữa `ARCHIVED` (kiểm bằng `settlementService.test`).
- [x] 5.2 `summarizeMeal` chỉ đếm thực thể có `netBalance` khác 0 vào tiến độ thanh toán (AC-8, BR-6.9, kiểm bằng `mealRules.test`).
- [x] 5.3 Tick và bỏ tick checkbox trên giao diện, thực thể cân bằng hiển thị "Đã cân bằng" (AC-4, kiểm bằng `SettlementPanel.test`).

## 6. Việc còn lại để đóng Epic (SA mục B.10)

- [ ] 6.1 Kiểm thủ công trên trình duyệt ở 375 px cho Khu vực 3 của một bữa thật (SA B.10 mục 1; AC-9). Ghi chú: tài liệu ghi "chưa thực hiện". Bản snapshot dùng cùng component đã được kiểm, nhưng không thay thế kiểm trên bữa thật.
- [ ] 6.2 Thêm test cho cảnh báo món chưa gán trên Khu vực 3 và mở giải trình từ màn hình bữa (SA B.10 mục 2). Ghi chú: tương ứng với 1.6 và 1.7, tài liệu ghi "chưa thực hiện".
- [x] 6.3 Hồi quy: toàn bộ test Epic 1 đến Epic 5 vẫn đạt (AC-9, theo ghi chú của BR mục A.5). Ghi chú: mục AC-9 vẫn còn phần kiểm thủ công ở 6.1.
