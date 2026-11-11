## 1. Hạ tầng i18n và công tắc ngôn ngữ (US-9.1)

- [x] 1.1 Từ điển `vi` và `en` cùng tập khoá; `t()`, `T()`, `setLang`, `initLanguage`, `detectLanguage`, `useLang` trong `app/src/i18n/` (SA B.1, B.6)
- [x] 1.2 Công tắc ngôn ngữ `role="switch"` VI/EN trên thanh đầu trang, dùng `LanguageSwitch` cho ứng dụng chính (SA B.1; BR-9.1)
- [x] 1.3 Lưu và nạp `AppSettings.language` qua `languageStore`; mặc định theo `navigator.language` và ưu tiên lựa chọn đã lưu (SA B.1, B.5; BR-9.4, AC-3)
- [ ] 1.4 Công tắc dùng được bằng bàn phím, có nhãn đọc được bằng trình đọc màn hình, vùng chạm tối thiểu 44 px (R-3). Ghi chú: tài liệu không ghi nhận kiểm chứng riêng cho R-3.

## 2. Chuỗi giao diện và tên ứng dụng (US-9.2)

- [x] 2.1 Chuyển toàn bộ chuỗi giao diện sang từ điển; `<html lang>` và `<title>` đổi theo ngôn ngữ (SA B.3; BR-9.2, AC-1)
- [x] 2.2 Tên ứng dụng "Chia tiền" và "Split Bill" ở thanh đầu trang và `<title>`; chưa có manifest PWA (BR-9.3, AC-2)
- [x] 2.3 Test quét mã nguồn: mọi `t()` và `T()` có bản dịch `en`, không có khoá thừa, bản dịch giữ đúng tham số; hai từ điển cùng tập khoá (R-1, R-2, AC-9)

## 3. Định dạng và giá trị mặc định (US-9.3)

- [x] 3.1 `formatMoney`, `formatDate`, `weekdayLabels` theo locale; tiền vẫn là VNĐ `₫` ở cả hai ngôn ngữ (SA B.2; BR-9.5, AC-4)
- [x] 3.2 `localizeMember` đổi "Tôi" và "Me"; `localizeSession` đổi "Kèo n" và "Venue n" lúc đọc (SA B.4; BR-9.9, AC-8)
- [x] 3.3 Hộp thoại "Hồ sơ của tôi" lưu lại "Tôi" khi tên không đổi, để tên mặc định không bị khoá cứng sang "Me" (SA B.4)
- [x] 3.4 Mọi phép tính tiền, chia tiền và quyết toán cho kết quả y hệt ở cả hai ngôn ngữ (R-4, AC-4)
- [x] 3.5 Danh bạ luôn sắp A–Z theo collator tiếng Việt, bất kể ngôn ngữ giao diện (BR mục A.6)

## 4. Tin nhắn thanh toán và link Snapshot (US-9.4)

- [x] 4.1 `formatShareMessage` nhận `lang`; mẫu `vi` và `en` giữ nguyên cấu trúc dòng; khoản đã hết thì ghi "All payments are settled." ở `en` (SA B.5; BR-9.6, AC-5)
- [x] 4.2 `buildSnapshotUrl` thêm tham số `&l=` theo thiết kế ban đầu (SA B.2; BR-9.8)
- [x] 4.3 Bỏ tham số `l` khỏi link để link ngắn hơn; link cũ có `&l=` vẫn được đọc (SA B.4; commit `83fec8d`, 2026-10-24)

## 5. Trang Snapshot song ngữ (US-9.5)

- [x] 5.1 Trang Snapshot có công tắc ngôn ngữ riêng, dùng chung `LanguageSwitch`; toàn bộ nội dung đổi theo ngôn ngữ (BR-9.7, AC-6)
- [x] 5.2 Đổi ngôn ngữ trên Snapshot chỉ ghi `settings.language`, không ghi dữ liệu bữa nào; payload không đổi (R-5, AC-6)
- [x] 5.3 Link Snapshot cũ không có `l` vẫn mở và rơi về ngôn ngữ đã lưu hoặc của trình duyệt (BR-9.8, AC-7)

## 6. Kiểm thử (SA B.9)

- [x] 6.1 `i18n.test`: quét `t()` và `T()`, `detectLanguage` đủ tổ hợp ưu tiên, `setLang` đổi `<html lang>` và `<title>`, số nhiều, `tIn` (R-1, R-2, AC-3, AC-7, AC-9)
- [x] 6.2 `App.i18n.test`: công tắc đổi tiêu đề, nút và tên ứng dụng; Snapshot đổi ngôn ngữ và chỉ ghi `settings.language`; nạp lại ngôn ngữ đã lưu; "Tôi" và "Me"; tham số `l` (AC-1, AC-2, AC-6, AC-7, AC-8)
- [x] 6.3 `shareSnapshot.test`: ca tin nhắn tiếng Anh và định dạng link (BR-9.6, AC-5)
- [x] 6.4 Toàn bộ test Epic 1 đến Epic 8 chạy ở `vi` vẫn đạt; tài liệu ghi 510 test đạt (R-4, AC-9)
- [x] 6.5 Duyệt bốn bước của bữa ở `en` trên trình duyệt 375 px; quét không còn ký tự tiếng Việt sót lại (AC-1, AC-9)

## 7. Việc còn lại để đóng Epic (SA B.10, B.8)

- [ ] 7.1 Kiểm thủ công trên thiết bị thật: hộp thoại chia sẻ, trang Snapshot và các hộp thoại dài ở 375 px bằng tiếng Anh (AC-9). Ghi chú: BR ghi "chưa kiểm hết các hộp thoại ở 375 px bằng tiếng Anh" và trạng thái Epic còn kiểm thủ công trước khi đóng.
- [ ] 7.2 Kiểm sao chép và Web Share với tin nhắn tiếng Anh (SA B.10). Ghi chú: tài liệu ghi là việc còn lại, chưa có kết quả.
- [ ] 7.3 Soát các câu ghép nhiều mảnh (ví dụ `Lưu trữ <b>tên</b> sẽ khoá…`) với người đọc tiếng Anh bản ngữ (SA B.8, B.10). Ghi chú: tài liệu ghi là việc còn lại, chưa có kết quả.
