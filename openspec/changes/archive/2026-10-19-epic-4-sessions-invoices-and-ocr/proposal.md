# Proposal

## Why

Sau Epic 1 đến Epic 3, người dùng đã tạo được Bữa, thêm người vào Bữa và gom nhóm thanh toán. Màn chi tiết Bữa còn Khu vực 2 (Kèo) là ô giữ chỗ. Các bảng `sessions`, `invoices`, `items`, `invoice_files` và dịch vụ `fileStorageService` đã có sẵn nhưng chưa có chức năng nào ghi dữ liệu vào. Epic 4 làm cho Khu vực 2 dùng được (nguồn: `documentation/epic-4/BR.md`, mục A.1).

Mục tiêu của Epic theo `documentation/04-epics-and-roadmap.md`: quản lý các Kèo trong một Bữa, lưu nhiều hoá đơn thành file cho mỗi Kèo, chụp hoặc tải ảnh hoá đơn, quét OCR tự động để bóc tách ngày, quán, món, giá, và tự động phát hiện và tính VAT.

Mục tiêu nghiệp vụ theo BR (mục A.1) gồm sáu việc: Kèo có thêm, đổi tên, sắp xếp, xoá và chọn người tham gia; Hoá đơn có nhiều ảnh; OCR offline bằng Tesseract.js với `vie+eng`; giảm giá, phí phục vụ và VAT được phân bổ vào giá từng món sao cho tổng khớp 100% tổng hoá đơn; ảnh được nén khi lưu ở mức Cân bằng; ảnh được quét OCR tự động sau khi lưu và báo ảnh trùng.

Các bên liên quan (BR mục A.2):
- Chủ app: nhập một Bữa nhiều Kèo nhanh ngay tại bàn, gồm chụp bill, quét, sửa vài con số rồi xong.
- Người ứng tiền: hoá đơn ghi đúng tổng tiền mình đã trả.
- Các Epic 5 đến 8: hoá đơn và món lưu đúng cấu trúc, tổng khớp, người tham gia Kèo nhất quán, và có hàm dọn file khi xoá.
- Epic 7 (Lưu trữ): tổng chi phí mỗi Kèo tính được từ hoá đơn.

Trạng thái khi ghi nhận: đã triển khai. Tài liệu ghi 301 test tự động đạt khi hoàn thành các bước, và 312 test sau đợt bổ sung ảnh trùng (SA B.10). Một số tiêu chí nghiệm thu chỉ đạt một phần, được ghi rõ trong `tasks.md`.

## What Changes

Các User Story của Epic (`documentation/04-epics-and-roadmap.md`, mục EPIC 4):

- **US-4.1**: thêm, đổi tên, sắp xếp và xoá Kèo trong một Bữa. Xoá Kèo phải có hộp xác nhận nêu số hoá đơn, món, file sẽ mất (BR-4.1, BR-4.2).
- **US-4.1b**: chọn người tham gia từng Kèo. Mặc định là toàn bộ người trong Bữa, có thể bỏ bớt hoặc thêm lại, và chỉ chọn trong số người của Bữa. Mọi phép chia tiền của Kèo chỉ tính trên những người này (BR-4.3).
- **US-4.2**: quản lý Hoá đơn trong Kèo. Mỗi Kèo có một hoặc nhiều Hoá đơn, mỗi Hoá đơn có một hoặc nhiều ảnh, ảnh được chụp từ camera hoặc tải lên, xem lại, tải về và xoá (BR-4.4, BR-4.5, BR-4.6).
- **US-4.3**: OCR offline bằng Tesseract.js (`vie+eng`), có bước tiền xử lý ảnh bằng Canvas. Bóc tách ngày, tên quán, danh sách món và giá, và VAT (`VAT 8%`, `VAT 10%` hoặc số tiền thuế GTGT cụ thể). Người dùng kiểm tra và sửa trước khi lưu (BR-4.7, BR-4.8).
- **US-4.4**: tự tính và phân bổ VAT vào giá từng món, theo phần trăm hoặc theo số tiền VAT cố định, sao cho tổng khớp đúng `totalAmount` của Hoá đơn (BR-4.9).

Phạm vi cộng thêm so với bản gốc của Epic (ghi trong `04-epics-and-roadmap.md`, mục Trạng thái, và SA B.11 đến B.13):

- Giảm giá và phí phục vụ ở mức cả hoá đơn, nhập tay hoặc đọc từ OCR, phân bổ vào món cùng VAT (BR-4.15).
- Nén ảnh khi lưu ở mức cố định Cân bằng, không cho người dùng chọn mức nén. Ảnh nhỏ được cảnh báo, và dung lượng trước và sau được hiển thị (BR-4.16, R-18).
- Xử lý ảnh như máy quét khi lưu: tìm bốn góc tờ hoá đơn, nắn phối cảnh, nhị phân hoá theo ngưỡng thích nghi (BR-4.16).
- Kèo tự đổi tên thành `Kèo <tên quán>` khi lưu hoá đơn có tên quán lấy từ OCR (BR-4.10).
- Tự quét OCR ngay sau khi lưu ảnh, lưu văn bản OCR vào metadata của ảnh (`ocrRawText`), và báo ảnh trùng trong cùng Bữa (BR-4.17, BR-4.18, R-19).
- Đọc lại số tiền sau lượt quét chính để sửa lỗi nhầm chữ số, và xử lý bill có dòng tổng nhóm Drink và Food (BR-4.19, BR-4.20).
- Tải PDF làm hoá đơn: mỗi trang thành một ảnh, PDF có lớp chữ được đọc trực tiếp không cần OCR (BR-4.6, SA B.12).
- Đọc bố cục hoá đơn điện tử dạng bảng, gồm cột STT và đơn vị tính, dòng "Cộng tiền hàng" và dòng "Đã giảm" (SA B.11, phần bổ sung).
- Đọc hoá đơn bằng AI Gemini khi người dùng tự nhập khoá API. Đây là tính năng ngoài phạm vi BR gốc, vì BR-4.7 ghi OCR không cần API key. Mặc định vẫn là OCR offline, và dữ liệu duy nhất rời thiết bị là ảnh và gợi ý OCR khi người dùng chủ động gửi (SA B.13).

Không có thay đổi nào **BREAKING** vì đây là Epic đầu tiên ghi dữ liệu vào các bảng đã tồn tại.

## Capabilities

### New Capabilities
- `session-management`: Kèo trong Bữa, tên Kèo, sắp xếp, người tham gia Kèo, tự đổi tên theo quán, và chế độ chỉ đọc khi Bữa đã lưu trữ.
- `invoice-management`: Hoá đơn trong Kèo, ảnh hoá đơn (chụp, tải lên, PDF, nén ảnh), VAT, giảm giá, phí phục vụ, phân bổ vào món, và lưu bền vững.
- `receipt-ocr`: OCR offline, tiền xử lý ảnh khi quét, bóc tách ngày, quán, món, giá, giảm giá, phí phục vụ, VAT, đối chiếu tổng bill, quét lại, và phát hiện ảnh trùng.

### Modified Capabilities
- Không có. Đây là các capability được tạo mới trong Epic 4.

## Impact

Mã nguồn theo SA mục B.2 (đường dẫn ghi theo tài liệu thiết kế gốc): `app/src/lib/` (`money.ts`, `imagePreprocess.ts`, `imageCompress.ts`, `documentScan.ts`, `pdfImport.ts`, `pdfText.ts`), `app/src/domain/` (`sessionRules.ts`, `billMath.ts`, `invoiceRules.ts`, `imageQuality.ts`, `receiptParser.ts`, `imageDuplicates.ts`), `app/src/services/` (`sessionService.ts`, `invoiceService.ts`, `ocrService.ts`, `invoiceFileService.ts`, `peopleErrors.ts`, `mealPeopleService.ts`), `app/src/hooks/useMealSessions.ts`, các component trong `components/sessions/` và `components/invoices/`, và `app/src/pages/MealWorkspacePage.tsx` (thay ô giữ chỗ Khu vực 2 bằng `SessionsPanel`).

Dữ liệu (SA B.1, B.4): không nâng version schema Dexie, vì các index cần thiết đã có. Interface `Invoice` và `InvoiceItem` thêm trường giảm giá, phí phục vụ, `allocatedDiscountAmount`, `allocatedServiceAmount` và `orderIndex?`. Không cần di trú dữ liệu vì chưa có bản ghi thật nào.

Thư viện (SA B.1, B.10, B.12): thêm `tesseract.js` (kế hoạch ghi v5 trở lên, khi triển khai dùng v7), nạp lười, với dữ liệu ngôn ngữ và worker đặt trong `public/ocr/` để chạy offline (khoảng 24 MB, theo B.10). Thêm `pdfjs-dist@4.10.38` nạp lười khi người dùng chọn PDF.

Ranh giới với Epic 5 (BR A.1): Epic 4 chỉ để món ở dạng "đã có trong hoá đơn, chưa gán người ăn", và các trường của Epic 5 nhận giá trị mặc định an toàn (`splitType` luôn `EQUAL_TOTAL`, `consumers` rỗng, người chia đều bằng toàn bộ kèo). Người ứng tiền có ô chọn tối thiểu.

Ngoài phạm vi (BR mục A.6, không làm trong Epic 4):
- Sửa và xoá món sau khi lưu, màn danh sách món đầy đủ, khoá `TOTAL_ONLY` sang `EQUAL_TOTAL` ở giao diện chuyển chế độ, chuyển `BY_ITEM` và `EQUAL_TOTAL`, gán người ăn và số phần, chỉnh danh sách người chia đều (Epic 5).
- Tính tiền từng người, gom nhóm thanh toán, bảng quyết toán, tick thanh toán (Epic 6).
- Lưu trữ Bữa và dọn hoá đơn, món, file khi lưu trữ (Epic 7).
- Chia sẻ và Snapshot (Epic 8).
- Giảm giá theo từng món, tip, nhiều mức VAT trên cùng một bill, làm tròn tổng bill, ngoại tệ. Giảm giá và phí phục vụ ở mức cả bill thuộc Epic 4.
- Cắt, xoay, nắn phẳng ảnh bằng tay; OCR bằng dịch vụ đám mây; nhận diện chữ viết tay.
- Quét mã QR hoá đơn điện tử; nhập dữ liệu từ hoá đơn PDF theo cấu trúc. Riêng việc tải PDF làm ảnh hoá đơn, và đọc thẳng lớp chữ của PDF khi có, đã được đưa vào phạm vi cộng thêm (SA B.12).
- Hoàn tác xoá Kèo hoặc Hoá đơn.

Điều chưa thống nhất trong tài liệu gốc: BR R-12 ghi giới hạn 40 MB cho mỗi ảnh trước nén, còn SA B.8 (mục 7) và SA B.11 ghi 15 MB cho mỗi ảnh trước nén. Change này ghi theo R-12 và nêu rõ điểm khác biệt tại requirement tương ứng trong `specs/invoice-management/spec.md`.

Các thay đổi về sau đối với OCR và đọc AI (các change `2026-11-08-replace-tesseract-with-vietocr` và `2026-11-08-replace-gemini-with-local-ai` trong cùng thư mục archive) không được mô tả trong change này. Change này giữ đúng thiết kế gốc.

Tài liệu thiết kế `design.md` là nguyên văn `documentation/epic-4/SA.md` và không được sửa.

## Nguồn lịch sử

- Tài liệu gốc: `documentation/epic-4/BR.md`, `documentation/epic-4/SA.md`, và mục EPIC 4 cùng ma trận truy vết trong `documentation/04-epics-and-roadmap.md`.
- Lịch sử git của `documentation/epic-4` (lấy bằng `git log --format='%ad %h %s' --date=short -- documentation/epic-4`, có 6 commit):
  - Commit đầu tiên: ngày 2026-10-19, mã `d492cfe`, "Đổi docs thành documentation, đặt bản build vào docs để GitHub Pages phục vụ từ main /docs".
  - Commit cuối cùng: ngày 2026-10-22, mã `3da0cda`, "Merge branch 'claude/ocr-feature-systematization-49374f'".
- Ngày tạo change trong `.openspec.yaml`: 2026-10-19.
