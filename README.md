# Chia tiền

Ứng dụng web chia tiền cho nhóm bạn đi ăn, chạy hoàn toàn trên trình duyệt. Mọi thao tác chia tiền được tổ chức theo ba tầng: **Bữa** (một buổi ăn, ví dụ "Tối thứ Sáu") chứa nhiều **Kèo** (một lần thanh toán trong bữa, ví dụ "Quán A") và mỗi Kèo gồm nhiều **Món** (từng món và người ăn). Không có máy chủ: dữ liệu chỉ nằm trong IndexedDB của trình duyệt, nên xoá dữ liệu trình duyệt là mất dữ liệu.

## Tính năng chính

- **Bữa**: tạo, sửa tên, ngày, ghi chú; tìm lại bữa; xoá bữa kèm toàn bộ dữ liệu con (`meal-management`).
- **Người và nhóm thanh toán**: thêm người từ danh bạ hoặc tạo mới, chọn chủ trì, gom người vào nhóm thanh toán (`meal-people-and-payment-groups`, `member-directory`).
- **Kèo**: thêm, đặt tên, sắp xếp và xoá kèo trong bữa (`session-management`).
- **Hoá đơn và món**: nhập hoá đơn theo từng món hoặc chỉ nhập tổng tiền; giảm giá, phí phục vụ, VAT (`bill-splitting`, `invoice-management`).
- **Đọc hoá đơn bằng ảnh hoặc PDF**: nhận dạng chữ ngay trên máy, không cần mạng (`receipt-ocr`).
- **Quyết toán**: tổng hợp số đã ứng và số phải chi của từng người, làm tròn về đồng, tạo danh sách lệnh chuyển tiền (`settlement`).
- **Lưu trữ bữa**: khoá một bữa đã chốt để xem lại, giải phóng ảnh hoá đơn (`meal-archive`).
- **Chia sẻ thanh toán**: Snapshot URL chỉ đọc chứa các khoản chuyển tiền, kèm tin nhắn văn bản (`payment-sharing-snapshot`).
- **Song ngữ** Việt và Anh, đổi bằng công tắc trên thanh đầu trang (`i18n`).
- **Giao diện** theo bảng màu và bố cục chung, tối ưu cho màn hình hẹp (`design-system`).

Chi tiết hành vi của từng tính năng nằm trong `openspec/specs/<tên>/spec.md`.

## Yêu cầu

- Node.js 22.12 trở lên
- Git LFS (file mô hình OCR `app/public/ocr/vietocr/vietocr_encoder.onnx` được lưu qua LFS; chạy `git lfs install` và `git lfs pull` nếu file chỉ là con trỏ)

## Chạy thử

```bash
cd app
npm install
npm run dev
```

`npm install` cũng đặt `core.hooksPath` trỏ tới `.githooks` (xem mục quy trình làm việc bên dưới).

## Lệnh kiểm tra

Chạy trong thư mục `app/`:

| Lệnh | Tác dụng |
| --- | --- |
| `npm test` | Chạy test Vitest một lần |
| `npm run lint` | Kiểm tra mã bằng oxlint; cảnh báo cũng làm lệnh thất bại (`--deny-warnings`) |
| `npm run build` | Kiểm tra kiểu TypeScript (`tsc -b`) rồi build bằng Vite |
| `npm run format` | Định dạng mã |
| `npm run test:coverage` | Chạy test kèm báo cáo độ phủ |

## Cấu trúc thư mục

```
app/src/
  domain/      quy tắc nghiệp vụ thuần (không phụ thuộc UI hay DB)
  services/    thao tác dữ liệu: Dexie, file, OCR, Snapshot
  db/          schema Dexie, chuẩn hoá tên, dữ liệu mặc định
  components/  thành phần giao diện
  pages/       các trang
  hooks/       React hooks
  i18n/        từ điển vi (index.ts) và en (en.ts)
  lib/         tiện ích (tiền, ngày, ảnh, PDF)
  workers/     web worker chạy OCR
app/public/ocr/vietocr/   mô hình OCR ONNX và thư viện WASM
openspec/     nguồn sự thật về hành vi (specs/), thay đổi đang làm (changes/), lịch sử (changes/archive/)
docs/         bản build GitHub Pages, do hook sinh ra, không sửa tay
.githooks/    hook post-merge (build docs/) và pre-push (đẩy file LFS)
```

## Quy trình làm việc

- Mọi thay đổi hành vi đi qua OpenSpec: đề xuất, duyệt, code, kiểm tra, rồi archive. Tính năng mới dùng skill `new-feature` (`.claude/skills/new-feature/SKILL.md`). CLI: `npm i -g @fission-ai/openspec@1.17.0`.
- Không commit thẳng lên `main`. Làm trên branch riêng và mở Pull Request.
- Không sửa `docs/` bằng tay. Sau mỗi lần merge hoặc pull vào `main`, hook `.githooks/post-merge` tự build lại và commit "Build docs (<sha>)". Build tay bằng `.githooks/build-docs.sh`.
- Khi push, hook `.githooks/pre-push` đẩy file LFS lên remote.

## OCR

Nhận dạng chữ dùng VietOCR dạng ONNX chạy trong trình duyệt (WASM, một luồng). Mô hình gồm detector `det.onnx` và recognizer gồm `vietocr_encoder.onnx`, `vietocr_decoder.onnx`, tổng dung lượng khoảng 110 MB, gồm ba file model (khoảng 95 MB) và thư viện WASM trong `ort/` (khoảng 11 MB). Mô hình được phục vụ cùng trang web, nên lần quét đầu tiên trình duyệt phải tải khoảng 110 MB; sau đó việc quét không cần kết nối mạng. Giấy phép của mô hình nằm tại `app/public/ocr/vietocr/LICENSE-vietocr-onnx.txt`.

## Lưu ý về dữ liệu

- Không có máy chủ và không có tài khoản. Dữ liệu (bữa, kèo, món, ảnh hoá đơn) lưu trong IndexedDB và OPFS của trình duyệt trên thiết bị.
- Xoá dữ liệu trình duyệt, dùng chế độ riêng tư hoặc đổi thiết bị đều làm mất dữ liệu.
- Bữa đã lưu trữ và trang Snapshot là chỉ đọc.

## Giấy phép

Phát hành theo giấy phép MIT, xem [LICENSE](LICENSE).
