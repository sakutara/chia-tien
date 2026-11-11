## MODIFIED Requirements

### Requirement: Tổng chi và tiến độ thanh toán trên thẻ bữa
Hệ thống SHALL tính tổng chi của bữa đang hoạt động bằng tổng tiền các hoá đơn của bữa đó. Bữa chưa có hoá đơn hiện "Chưa có chi phí" chứ không hiện số 0. Với bữa đã lưu trữ, tổng chi lấy từ bản tóm tắt lưu trữ của bữa; thiếu bản tóm tắt thì coi như chưa có chi phí. Tiến độ thanh toán chỉ hiện khi bữa có chi phí, và đếm theo số khoản chuyển tiền do quyết toán tính (xem capability `settlement`), không đếm theo số người. Với bữa đã lưu trữ, tổng số khoản lấy từ `archivedSummary.transfers` và mọi khoản được coi là đã chuyển.

**Trước đây**: tiến độ đếm theo số thực thể thanh toán (mỗi nhóm là một, mỗi người chưa thuộc nhóm nào là một), tiến độ của bữa đã lưu trữ lấy từ `archivedSummary.entitiesSummary` theo trường `isPaid`.

#### Scenario: Bữa có hoá đơn
- **WHEN** bữa có hai hoá đơn tổng 1.620.000 đồng và 830.000 đồng
- **THEN** thẻ hiện tổng chi "2.450.000 ₫"
- **AND** thẻ hiện tiến độ dạng "đã trả trên tổng" của các khoản chuyển tiền

#### Scenario: Bữa chưa có hoá đơn
- **WHEN** bữa đang hoạt động chưa có hoá đơn nào
- **THEN** thẻ hiện "Chưa có chi phí" và không hiện tiến độ thanh toán
- **AND** cột tóm tắt ở trang làm việc hiện "—" thay cho tổng chi

#### Scenario: Bữa đã lưu trữ thiếu bản tóm tắt
- **WHEN** bữa có trạng thái `ARCHIVED` nhưng không có bản tóm tắt lưu trữ
- **THEN** thẻ hiện "Chưa có chi phí"
