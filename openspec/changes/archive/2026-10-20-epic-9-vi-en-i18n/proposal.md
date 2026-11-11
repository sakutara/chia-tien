# Proposal

## Why

Toàn bộ ứng dụng hiện chỉ có tiếng Việt: văn bản giao diện, tin nhắn chia sẻ, định dạng tiền `1.620.000 ₫`, tên ứng dụng "Chia tiền". Người dùng và người nhận Snapshot không đọc được tiếng Việt thì chưa dùng được ứng dụng. Epic 9 bổ sung tiếng Anh (`en`) bên cạnh tiếng Việt (`vi`), chuyển qua lại bằng một công tắc ngôn ngữ, và áp dụng nhất quán cho mọi nơi hiển thị, kể cả tên ứng dụng và trang xem Snapshot (BR mục A.1; mục tiêu Epic 9 trong `documentation/04-epics-and-roadmap.md`).

Các bên liên quan (BR mục A.2):
- Người chủ trì (chủ app): dùng app và gửi tin nhắn thanh toán bằng ngôn ngữ mình chọn.
- Người nhận Snapshot: mở link và đọc được bằng ngôn ngữ của mình, đổi được ngôn ngữ ngay trên trang Snapshot mà không cần cài đặt hay đăng nhập.

## What Changes

- **US-9.1** Hạ tầng i18n và công tắc ngôn ngữ: từ điển `vi` và `en` cùng tập khoá, công tắc ngôn ngữ trên thanh đầu trang của ứng dụng chính, ghi nhớ lựa chọn trong IndexedDB, mặc định theo ngôn ngữ trình duyệt ở lần mở đầu tiên.
- **US-9.2** Chuyển toàn bộ chuỗi giao diện (nhãn, nút, placeholder, `aria-label`, thông báo lỗi, trạng thái rỗng) sang từ điển; tên ứng dụng đổi theo ngôn ngữ ở thanh đầu trang và `<title>`.
- **US-9.3** Định dạng theo ngôn ngữ: ngày, thứ, dấu phân cách số, thứ tự sắp xếp; tiền vẫn là VNĐ (`₫`); các giá trị mặc định do hệ thống sinh ("Tôi" và "Me", "Kèo n" và "Venue n") hiển thị theo ngôn ngữ đang chọn.
- **US-9.4** Tin nhắn thanh toán (`formatShareMessage`) sinh theo ngôn ngữ giao diện lúc chia sẻ; link Snapshot mang tham số `l` là ngôn ngữ của người gửi theo thiết kế ban đầu (xem mục Impact về thay đổi sau đó).
- **US-9.5** Trang xem Snapshot (chỉ đọc) có công tắc ngôn ngữ riêng; toàn bộ nội dung đổi theo mà không ghi dữ liệu bữa vào IndexedDB; link Snapshot cũ vẫn mở được.

Không có requirement nào bị bỏ hoặc đổi hành vi cũ theo nghĩa **BREAKING**. Mọi chuỗi tiếng Việt hiện có vẫn là khoá gốc của từ điển, nên các test chạy ở `vi` không đổi.

## Capabilities

### New Capabilities
- `i18n`: song ngữ Việt – Anh cho giao diện, định dạng ngày và tiền, tin nhắn thanh toán, giá trị mặc định do hệ thống sinh và trang Snapshot. Capability này đã có sẵn tại `openspec/specs/i18n/` từ đợt tích hợp OpenSpec (mô tả hành vi hiện tại). Delta trong change này chỉ thêm các requirement ghi lại thiết kế của Epic 9, với tên requirement riêng để không trùng với requirement hiện có.

### Modified Capabilities
- Không có capability nào khác được sửa bằng delta trong change này. Các thay đổi của Epic 9 chạm vào tin nhắn chia sẻ và link Snapshot (Epic 8) được ghi trong delta của `i18n`.

## Impact

Mã nguồn bị ảnh hưởng (theo SA mục B.2):
- Thư mục mới `app/src/i18n/` gồm `index.ts`, `en.ts` và `i18n.test.ts`.
- Thành phần mới `app/src/components/ui/LanguageSwitch.tsx`; mới `app/src/db/languageStore.ts` và `app/src/db/localize.ts`; test `app/src/App.i18n.test.tsx`.
- Sửa `lib/money.ts` (`formatMoney` nhận `lang`), `lib/dates.ts` (`formatDate`, `weekdayLabels`), `domain/shareSnapshot.ts` (`formatShareMessage` nhận `lang`, `buildSnapshotUrl` thêm `&l=`), `domain/sessionRules.ts`, `domain/vietQr.ts`, các hook `use*` (đưa `lang` vào deps của `useLiveQuery`), `main.tsx` (gọi `initLanguage`) và mọi component, service, domain có chuỗi hiển thị.

Dữ liệu:
- `AppSettings` có thêm trường tuỳ chọn `language?: 'vi' | 'en'`. Không nâng phiên bản schema Dexie, vì bảng `settings` khoá theo `id`.
- `MealSnapshotPayload` không đổi.

Thư viện và hiệu năng:
- Không thêm thư viện i18n. Lớp tự viết dùng `Intl.*` của trình duyệt.
- Từ điển `en` nạp tĩnh, khoảng 500 câu. Ghi chú trong SA: nếu về sau thêm ngôn ngữ thứ ba thì tách bằng `import()` động.
- Trước khi render lần đầu, `main.tsx` chờ đọc `settings.language` một lần từ IndexedDB để không nháy giao diện.

Ngoài phạm vi (BR mục A.6):
- Chỉ có 2 ngôn ngữ. Kiến trúc để mở rộng ngôn ngữ thứ ba về sau nhưng chưa làm.
- Không dịch tự động dữ liệu người dùng nhập và không dịch nội dung OCR của hoá đơn.
- Không quy đổi tiền tệ và không đổi định dạng tài khoản hay VietQR.
- Văn bản OCR (`tesseract` với `vie` và `eng`) giữ nguyên cấu hình, không phụ thuộc ngôn ngữ giao diện.
- Đã chốt khi triển khai: tên tiếng Anh là "Split Bill"; tin nhắn chia sẻ luôn theo ngôn ngữ giao diện, chưa có ghi đè riêng; danh bạ luôn sắp A–Z theo collator tiếng Việt.

Điểm không thống nhất giữa các tài liệu gốc (được ghi theo nguồn nêu trong ngoặc):
- Tham số `l` của link Snapshot: BR-9.8 và US-9.4 yêu cầu link mang `l`. SA mục B.4 và B.7 ghi nhận tham số `l` đã bị bỏ để link ngắn hơn, link có dạng `…?s=<mã>`, và commit `83fec8d` (2026-10-24) có nội dung "bỏ tham số ngôn ngữ &l=". Delta ghi theo BR, kèm ghi chú lịch sử trong requirement tương ứng. Không xác định được từ lịch sử lý do cụ thể ngoài nội dung commit message.
- Lưu lựa chọn ngôn ngữ trên trang Snapshot: BR-9.4, BR-9.7 và SA mục B.1 ghi lưu vào IndexedDB (`settings.language`). SA mục B.5 bước 3 lại ghi "Context và `localStorage`". Delta ghi theo BR và SA B.1.
- Nội dung chuyển khoản: BR-9.9 liệt kê nội dung chuyển khoản trong nhóm giữ nguyên như đã nhập, nhưng cũng ghi nội dung mặc định `<người> thanh toán <bữa>` được dựng lại theo ngôn ngữ người xem. Delta tách hai trường hợp này.
- Sắp xếp: BR-9.5 ghi sắp xếp "A–Z chuẩn locale", còn BR mục A.6 ghi danh bạ luôn sắp theo collator tiếng Việt. Delta giữ cả hai ý.
- Tiêu chí nghiệm thu trong `documentation/04-epics-and-roadmap.md` chưa được đánh dấu, trong khi BR mục A.5 đánh dấu AC-1 đến AC-8 là đạt và AC-9 đạt một phần. Delta và tasks theo BR.

## Nguồn lịch sử

- File gốc: `documentation/epic-9/BR.md` (nghiệp vụ), `documentation/epic-9/SA.md` (thiết kế; nguyên văn được giữ trong `design.md`), và mục "EPIC 9" cùng dòng 24 của ma trận truy vết trong `documentation/04-epics-and-roadmap.md`.
- Commit đầu tiên của `documentation/epic-9`: 2026-10-20, `0fc0052` ("Thêm Epic 9: song ngữ Việt – Anh (BR, SA, roadmap, README)").
- Commit cuối cùng của `documentation/epic-9`: 2026-10-24, `83fec8d` ("Link snapshot kèm hoá đơn của người nhận và bỏ tham số ngôn ngữ &l=").
- Lịch sử được lấy bằng `git log --format='%ad %h %s' --date=short -- documentation/epic-9`. Các commit triển khai mã nguồn (ví dụ `c332994`, `a6f74f7`) nằm ngoài thư mục tài liệu này và không được liệt kê ở đây.
