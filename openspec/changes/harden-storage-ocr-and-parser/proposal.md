# Proposal

## Why

Bốn việc đang làm app kém chắc chắn hơn mức cần thiết:

- Bộ đọc chữ VietOCR có kích thước khoảng 110 MB. Lần quét đầu tiên trên thiết bị phải tải model, nhưng người dùng chưa được báo trước và không được chọn có tải hay không. Trên mạng di động, việc này tốn dữ liệu mà người dùng không biết.
- Mỗi ảnh hoá đơn đang được lưu hai lần: một bản trong OPFS và một bản Blob trong IndexedDB (`blobData`). Hai bản làm tăng dung lượng lưu trữ trên thiết bị và khiến người đọc code khó biết bản nào là nguồn sự thật.
- Bộ phân tích hoá đơn cần giữ luật đọc theo cấu trúc chung của bill, không nên dựa vào tên một quán cụ thể. Khi bill của quán khác có bố cục tương tự, kết quả phải nhất quán.
- Phông chữ Inter và JetBrains Mono cần được đóng gói cùng app để hiển thị đúng khi offline và không gửi yêu cầu tới máy chủ bên thứ ba. Bước dọn dữ liệu AI cũ (`transformers-cache` và các khoá localStorage) chỉ cần chạy trong một giai đoạn chuyển tiếp, sau đó bỏ để không còn mã dọn dẹp tồn tại mãi.

## What Changes

- **receipt-ocr**: trước lần quét OCR đầu tiên trên thiết bị (khi bộ đọc chữ chưa từng nạp thành công), hiện hộp thoại báo cần tải khoảng 110 MB và khuyên dùng Wi-Fi, với hai lựa chọn "Tải và quét" và "Để sau". Chọn "Để sau" thì không tải gì và người dùng vẫn nhập tay được. Sau khi model nạp thành công một lần, ghi nhớ bằng localStorage khoá `chia-tien.ocrModelReady` và không hỏi lại. Chuỗi giao diện có đủ vi và en.
- **receipt-ocr**: thêm luật đọc hoá đơn dựa trên cấu trúc chung (dòng món gồm tên, số lượng, đơn giá, thành tiền theo nhiều thứ tự cột; dòng tổng; giảm giá; phí phục vụ; VAT). Luật này không phụ thuộc tên quán. Giữ nguyên nguyên tắc không đoán: thứ không chắc thì bỏ trống hoặc đánh dấu `uncertain`.
- **receipt-ocr**: sửa requirement nhận dạng VietOCR để ghi rõ model chỉ được tải sau khi người dùng đồng ý và quét không gọi mạng sau khi model đã nạp.
- **local-data-storage**: mỗi ảnh hoá đơn chỉ được lưu một bản, chính là bản đã xử lý (cắt, nắn, nén) dùng làm đầu vào OCR. Bản này nằm trong OPFS nếu ghi được, không thì nằm trong `blobData` của IndexedDB. Không lưu ảnh gốc và không lưu trùng ở cả hai nơi.
- **local-data-storage**: thêm bước dọn bản ghi cũ đang lưu trùng khi khởi động. Nếu tệp OPFS đọc được và đúng dung lượng `sizeBytes` thì bỏ `blobData`; nếu không thì giữ `blobData` và bỏ `opfsPath`. Lỗi của bước dọn không chặn khởi động.
- **local-data-storage**: sửa requirement đọc lại file cho khớp với cách lưu mới.
- **local-data-storage**: bước dọn dữ liệu AI cũ (`transformers-cache` và bốn khoá localStorage) chỉ chạy đến hết ngày 2027-02-12. Sau ngày đó không chạy nữa.
- **design-system**: phông chữ Inter và JetBrains Mono được đóng gói cùng app qua `@fontsource`. App không gọi Google Fonts hay máy chủ bên thứ ba và hiển thị đúng phông khi offline.

## Capabilities

### New Capabilities

Không có.

### Modified Capabilities

- `receipt-ocr`: thêm hộp hỏi trước khi tải bộ đọc chữ lần đầu; thêm luật đọc hoá đơn theo cấu trúc chung; sửa requirement nhận dạng VietOCR về nguồn model và điều kiện không gọi mạng.
- `local-data-storage`: sửa cách lưu và đọc file hoá đơn (một bản duy nhất); thêm dọn bản ghi lưu trùng khi khởi động; giới hạn thời hạn của bước dọn dữ liệu AI cũ.
- `design-system`: phông chữ được đóng gói cục bộ.

## Impact

Mã nguồn (dự kiến, không thuộc change này để sửa trong giai đoạn đề xuất):
- `app/src/services/` và `app/src/db/`: luồng lưu file hoá đơn, đọc lại file, bước dọn bản ghi khi khởi động, bước dọn dữ liệu AI cũ có thêm mốc ngày.
- `app/src/components/invoices/` và luồng quét OCR: hộp thoại xác nhận tải model và ghi nhớ bằng `chia-tien.ocrModelReady`.
- `app/src/domain/receiptParser.ts` và các file liên quan: luật đọc theo cấu trúc chung.
- `app/src/i18n/index.ts` và `app/src/i18n/en.ts`: khoá mới cho hộp thoại tải model.
- Phông chữ: import `@fontsource/inter` và `@fontsource/jetbrains-mono` (đã có trong `app/package.json`).

Dữ liệu:
- Schema Dexie: không đổi. Không đổi index, không tăng version. Tên DB `usd-split` giữ nguyên.
- Bản ghi `invoice_files` hiện có sẽ được dọn lần đầu khởi động sau khi bản mới chạy.

Snapshot URL: không ảnh hưởng. Link snapshot cũ vẫn mở được.

Tài liệu: không sửa `docs/`.

## Non-goals

- Không đổi tên DB `usd-split`.
- Không thêm sao lưu hoặc xuất dữ liệu.
- Không thêm service worker.
- Không đổi định dạng Snapshot URL; link cũ vẫn mở được.
- Không thêm CI.
- Không đổi schema Dexie.
