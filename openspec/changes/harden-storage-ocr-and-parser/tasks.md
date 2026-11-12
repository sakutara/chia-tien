# Tasks

## 1. Hỏi trước khi tải model OCR (receipt-ocr)
- [x] 1.1 Thêm hộp thoại xác nhận tải model với nội dung khoảng 110 MB, khuyên dùng Wi-Fi, hai nút "Tải và quét" và "Để sau"
- [x] 1.2 Đọc và ghi khoá localStorage `chia-tien.ocrModelReady` trong try/catch; ghi khoá khi model nạp thành công
- [x] 1.3 Chọn "Để sau" không gọi bất kỳ yêu cầu tải model nào và form vẫn cho nhập tay
- [x] 1.4 Viết test Vitest cho hộp thoại: lần đầu hiện hộp, "Để sau" không tải, "Tải và quét" tải và quét, lần sau khi khoá đã có thì không hiện
- [ ] 1.5 Viết test Vitest cho trường hợp localStorage ném lỗi: hộp thoại vẫn hoạt động và không làm hỏng luồng quét (CHƯA XONG: mới có test cho các hàm đọc/ghi trong `ocrModelConsent.test.ts`, chưa có test ở mức hộp thoại và luồng quét)
- [x] 1.6 Thêm khoá i18n cho hộp thoại và các nút vào `app/src/i18n/index.ts` (vi) và `app/src/i18n/en.ts` (en), cùng tập khoá

## 2. Một bản duy nhất cho mỗi ảnh hoá đơn (local-data-storage)
- [x] 2.1 Sửa luồng lưu file: khi OPFS ghi thành công chỉ đặt `opfsPath`, không đặt `blobData`; khi không thì chỉ đặt `blobData`
- [ ] 2.2 Bảo đảm ảnh gốc chưa xử lý không được ghi vào OPFS hay IndexedDB (CHƯA XONG: không có test riêng; tầng lưu chỉ ghi file được truyền vào, chưa đối chiếu toàn bộ nơi gọi)
- [x] 2.3 Sửa hàm đọc file: ưu tiên OPFS khi có `opfsPath`, nếu không dùng `blobData`; trả về không có gì khi cả hai đều không đọc được
- [x] 2.4 Viết test Vitest: lưu khi OPFS khả dụng chỉ có `opfsPath`; lưu khi OPFS không khả dụng chỉ có `blobData`; đọc theo thứ tự ưu tiên; ảnh gốc không được ghi
- [ ] 2.5 Viết test Vitest cho đọc file khi tệp OPFS đã mất và không có `blobData`: kết quả là không có gì (CHƯA XONG: chưa có test cho tổ hợp này)

## 3. Dọn bản ghi lưu trùng khi khởi động (local-data-storage)
- [x] 3.1 Thêm bước dọn chạy khi khởi động: với mỗi bản ghi có cả `opfsPath` và `blobData`, đọc tệp OPFS và so với dung lượng của `blobData`
- [x] 3.2 Nếu tệp OPFS đọc được và đúng dung lượng thì bỏ `blobData`; nếu không thì ghi lại OPFS từ `blobData`, đọc lại kiểm tra dung lượng rồi mới bỏ `blobData`; chỉ khi không ghi lại được thì giữ `blobData` và bỏ `opfsPath`
- [x] 3.3 Bọc toàn bộ bước dọn trong try/catch; gọi bước dọn từ `main.tsx` mà không chờ để chặn khởi động
- [x] 3.4 Viết test Vitest: bản ghi lưu trùng với tệp đúng dung lượng bị bỏ `blobData`; tệp mất hoặc lệch nhưng ghi lại được thì bỏ `blobData` sau khi kiểm tra lại; tệp mất hoặc lệch mà không ghi lại được thì bỏ `opfsPath`; lỗi của bước dọn không ném ra ngoài

## 4. Dọn dữ liệu AI cũ có mốc ngày (local-data-storage)
- [x] 4.1 Thêm kiểm tra ngày trong bước dọn `services/legacyAiCleanup.ts`: chỉ chạy khi ngày hiện tại không muộn hơn 2027-02-12
- [x] 4.2 Viết test Vitest: trước hoặc đúng 2027-02-12 bước dọn chạy; sau 2027-02-12 không xoá cache hay khoá nào (dùng fake timers hoặc mock ngày)

## 5. Luật đọc hoá đơn theo cấu trúc chung (receipt-ocr)
- [x] 5.1 Sửa `app/src/domain/receiptParser.ts` để nhận món theo quan hệ số lượng × đơn giá = thành tiền, không theo vị trí cột cố định hay tên quán
- [x] 5.2 Giữ nguyên nguyên tắc không đoán: số không đủ căn cứ thì để trống hoặc đánh dấu `uncertain`
- [ ] 5.3 Viết test Vitest: hai bill cùng bố cục nhưng khác tên quán cho cùng kết quả; thứ tự cột khác nhau vẫn gán đúng; trường không chắc để trống hoặc `uncertain` (CHƯA XONG: chưa có test so sánh hai bill khác tên quán; các test hiện có chỉ phủ một phần thứ tự cột và trường không chắc)

## 6. Sửa nhận dạng VietOCR (receipt-ocr)
- [x] 6.1 Xác nhận cách model được tải và lưu trong trình duyệt sau khi người dùng đồng ý; ghi kết quả vào design nếu khác giả định (đã ghi vào design: model nạp qua `fetch`/`ort`, dựa vào HTTP cache của trình duyệt, worker dừng sau 15 giây rảnh)
- [ ] 6.2 Viết test Vitest: sau khi model đã nạp, quét không gọi mạng (CHƯA XONG: chưa có test; worker nạp lại model khi bị dừng vì rảnh nên yêu cầu này chưa được đảm bảo, xem design)

## 7. Đóng gói phông chữ (design-system)
- [x] 7.1 Import `@fontsource/inter` và `@fontsource/jetbrains-mono` trong mã khởi động app; bỏ mọi liên kết tới Google Fonts trong HTML và CSS
- [x] 7.2 Kiểm tra trong bản build không có yêu cầu font nào tới máy chủ bên thứ ba (đã quét bản build: không có fonts.googleapis/gstatic, 40 file woff2 đóng gói sẵn)
- [ ] 7.3 Kiểm tra bằng trình duyệt khi offline: chữ hiển thị bằng Inter và số tiền bằng JetBrains Mono (CHƯA XONG: chưa kiểm tra trên trình duyệt)

## 8. Kiểm tra cuối
- [x] 8.1 Chạy `npm test` trong `app/` và sửa đến khi pass
- [x] 8.2 Chạy `npm run lint` trong `app/` và sửa đến khi pass
- [x] 8.3 Chạy `npm run build` trong `app/` và sửa đến khi pass
