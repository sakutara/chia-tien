# Design

## Context

Change `2026-11-08-replace-gemini-with-local-ai` đưa bộ đọc AI trên máy vào app: `services/localAiService.ts`, `workers/slmWorker.ts`, `domain/aiReceipt.ts`, `components/invoices/LocalAiControl.tsx`, cùng `lib/networkGuard.ts` và các phần dùng chung. Đo trên 12 bill thật (tháng 11/2026) cho thấy tính năng không đạt yêu cầu về bộ nhớ và độ đúng của số tiền (xem `proposal.md`). Quyết định của chủ app là gỡ hẳn tính năng và giữ bộ phân tích theo quy tắc.

## Goals / Non-Goals

**Goals**
- Không còn mã, dependency, UI, chuỗi i18n hay hành vi nào liên quan đến mô hình ngôn ngữ trên máy trong app.
- Người dùng đã tải mô hình trước đó được giải phóng 480–790 MB ở lần mở app kế tiếp.
- OCR VietOCR và dán text OCR ngoài hoạt động như trước.

**Non-Goals**
- Không sửa bộ phân tích `domain/receiptParser.ts` và kiểm tra đối chiếu `domain/receiptValidation.ts`; hai file này đang được chỉnh riêng.
- Không xoá `needsBetterRead` trong `domain/receiptValidation.ts` dù không còn nơi dùng trong production. Hàm được giữ để tránh đụng vào file đang chỉnh; có thể gỡ ở change sau.
- Không archive change này trước khi người dùng duyệt.

## Decisions

**Gỡ dependency thay vì để import không dùng.** Sau khi xoá `slmWorker.ts`, không còn import nào của `@huggingface/transformers`. Gỡ luôn để bundle không chứa thư viện và giảm kích thước build. `onnxruntime-web` giữ nguyên cho VietOCR.

**Giữ hook giải phóng bộ nhớ của OCR.** `registerMemoryCleaner`, `releaseAllAiMemory` và `installMemoryLifecycleHooks` vẫn được worker OCR và form hoá đơn dùng. Chỉ bỏ `withAiMemoryScope` và bộ đếm tác vụ đi kèm. Nhánh chờ 5 giây khi app ẩn chỉ có tác dụng khi có tác vụ trong scope; sau khi bỏ scope thì nhánh này không bao giờ chạy, nên được bỏ. Hành vi thực tế với OCR không đổi: OCR không đi qua scope, nên trước đây cũng được giải phóng ngay khi app ẩn.

**Dọn dữ liệu cũ khi khởi động, không dùng migration IndexedDB.** Cache Storage và localStorage nằm ngoài Dexie, nên dọn trực tiếp là đủ. Hàm chạy một lần mỗi lần khởi động (không có cờ đã chạy), vì việc xoá là idempotent và chi phí thấp. Mọi lỗi được nuốt để không chặn `main.tsx`.

**Không thêm banner mới khi OCR chưa chuẩn.** Form đã có hộp ghi chú đối chiếu (`ocrCheck`) hiển thị khi kết quả OCR không khớp; đó là thông báo duy nhất còn lại.

## Risks / Trade-offs

- Người dùng đã bật công tắc AI sẽ không còn công cụ tự sửa số đọc sai; số liệu đọc sai từ OCR cần sửa tay. Đây là đánh đổi đã được chủ app chấp nhận.
- Hàm `cleanUpLegacyLocalAi` chỉ xoá khi app được mở. Thiết bị chưa mở lại app sẽ giữ cache cũ đến lần mở kế tiếp.
- `needsBetterRead` còn tồn tại nhưng không dùng trong production; nếu test trong `receiptValidation.test.ts` và `receiptParser.vat.test.ts` vẫn gọi hàm này thì không nên xoá trước khi các test được cập nhật.
