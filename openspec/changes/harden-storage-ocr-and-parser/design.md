# Design

## Context

Change này gom bốn nhóm việc độc lập nhưng cùng chạm vào lưu trữ và OCR: hỏi người dùng trước khi tải model VietOCR (khoảng 110 MB), chỉ giữ một bản cho mỗi ảnh hoá đơn, làm bộ phân tích hoá đơn không phụ thuộc quán cụ thể, và đóng gói phông chữ cục bộ. Hiện tại requirement "Lưu file hoá đơn với bản Blob dự phòng" ghi cả `opfsPath` lẫn `blobData` cho mọi file khi OPFS khả dụng, và requirement "Nhận dạng chữ bằng VietOCR chạy ngoại tuyến" ghi model đi kèm ứng dụng trong thư mục public.

## Goals / Non-Goals

**Goals**
- Người dùng không bị tải 110 MB mà không được hỏi trước, và có thể quét sau.
- Mỗi ảnh hoá đơn chỉ chiếm một bản lưu trữ, là bản đã xử lý dùng làm đầu vào OCR.
- Bộ phân tích giữ nguyên tắc không đoán và không phụ thuộc tên quán.
- Phông chữ hiển thị đúng khi offline và không gọi máy chủ bên thứ ba.
- Bước dọn dữ liệu AI cũ dừng hẳn sau ngày 2027-02-12.

**Non-Goals**
- Không đổi schema Dexie: không đổi index, không tăng version, không thêm bảng. Tên DB `usd-split` giữ nguyên.
- Không thêm sao lưu hoặc xuất dữ liệu. Vì bản OPFS trở thành bản duy nhất, việc mất tệp OPFS sẽ mất ảnh; đây là đánh đổi đã chấp nhận, không có cơ chế khôi phục trong change này.
- Không thêm service worker.
- Không thêm CI.
- Snapshot URL: không ảnh hưởng. Định dạng `lz-string` và cách giải mã giữ nguyên, link cũ vẫn mở được.

## Decisions

**Hộp hỏi trước khi tải model, ghi nhớ bằng localStorage.** Trạng thái "đã nạp thành công" lưu ở localStorage khoá `chia-tien.ocrModelReady`. Đây là thuộc tính của trình duyệt, không phải dữ liệu nghiệp vụ, nên không đưa vào Dexie. Nếu localStorage không truy cập được (chế độ riêng tư, bị chặn), hộp thoại có thể hiện lại; đây là chấp nhận được và không chặn chức năng. Mọi truy cập localStorage được bọc try/catch.

Ngoài ra, khi người dùng bấm "Tải và quét", lời đồng ý được ghi vào sessionStorage khoá `chia-tien.ocrModelConsentSession`, để trong cùng tab không hỏi lại dù model chưa tải xong. Lời đồng ý này không tồn tại qua các phiên trình duyệt.

**Hai lựa chọn "Tải và quét" và "Để sau".** "Để sau" không gọi bất kỳ yêu cầu tải nào, và form vẫn cho nhập tay như trước.

**Một bản cho mỗi ảnh, OPFS ưu tiên.** Khi OPFS khả dụng và ghi thành công thì chỉ có `opfsPath`, không có `blobData`. Khi không, chỉ có `blobData`. Đọc file ưu tiên OPFS nếu có `opfsPath`, nếu không thì dùng `blobData`. Ảnh gốc chưa xử lý không được ghi xuống đâu cả.

**Dọn bản ghi lưu trùng khi khởi động.** Bản ghi cũ còn cả hai trường được xử lý theo kiểm tra thực tế (`services/fileStorageMigration.ts`): tệp OPFS đọc được và đúng dung lượng của `blobData` thì bỏ `blobData`. Nếu tệp OPFS mất hoặc lệch, hệ thống ghi lại tệp OPFS từ `blobData`, đọc lại kiểm tra dung lượng, rồi mới bỏ `blobData`. Chỉ khi không ghi lại được thì giữ `blobData` và bỏ `opfsPath`, để không mất ảnh. Bước này idempotent, nên chạy lại mỗi lần khởi động không gây hại. Lỗi được nuốt để không chặn khởi động.

**Mốc ngày 2027-02-12 cho bước dọn AI cũ.** Sau mốc này, bước dọn không chạy nữa. Mốc được so với ngày của thiết bị; nếu đồng hồ máy sai thì bước dọn có thể chạy sớm hoặc muộn hơn, đây là sai số chấp nhận được cho việc xoá cache.

**Luật đọc theo cấu trúc chung.** Bộ phân tích nhận diện món bằng quan hệ số lượng × đơn giá = thành tiền và vị trí tương đối trong dòng, không dựa vào tên quán hay vị trí cột cố định. Khi một số có nhiều cách gán và không đủ căn cứ, trường để trống hoặc đánh dấu `uncertain`.

**Phông chữ qua @fontsource.** `@fontsource/inter` và `@fontsource/jetbrains-mono` đã có trong `app/package.json`. Import trong mã nguồn để Vite đóng gói font vào bundle, không dùng thẻ `<link>` tới Google Fonts.

## Risks / Trade-offs

- Bản OPFS là bản duy nhất sau khi dọn. Nếu trình duyệt xoá OPFS (ví dụ xoá dữ liệu site), ảnh mất. Trước đây `blobData` cho phép đọc lại. Đây là đánh đổi có chủ đích để tiết kiệm dung lượng.
- Mỗi lần khởi động, bước dọn đọc tệp OPFS để kiểm tra dung lượng, có thể tốn thời gian với nhiều ảnh. Bước này chạy nền sau khi khởi động xong nếu có thể, không chặn giao diện.
- Hộp thoại có thể hiện lại nếu localStorage bị chặn. Người dùng khi đó phải chọn lại, không mất dữ liệu.
- Requirement "Nhận dạng chữ bằng VietOCR chạy ngoại tuyến" trước đây nói model "đi kèm ứng dụng". Change này làm rõ model chỉ tải sau khi người dùng đồng ý. Cách model được tải và lưu (xác nhận khi viết code, task 6.1): worker `workers/vietOcrWorker.ts` nạp `det.onnx`, `vietocr_encoder.onnx`, `vietocr_decoder.onnx` và `vietocr.json` bằng `ort.InferenceSession.create` và `fetch`. Không có Cache Storage hay IndexedDB riêng; model dựa vào HTTP cache của trình duyệt. Worker tự dừng sau 15 giây rảnh, nên lần quét sau phải nạp lại từ HTTP cache. Vì vậy yêu cầu "quét không gọi mạng sau khi model đã nạp" chỉ đúng khi HTTP cache còn giữ file; đây là khoảng trống còn mở, chưa có test (task 6.2 chưa xong).
