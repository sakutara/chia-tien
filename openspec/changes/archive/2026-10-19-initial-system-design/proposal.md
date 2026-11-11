# Proposal

## Why

Chia tiền (Fee Calculator) là ứng dụng web chạy phía client (PWA) hỗ trợ tính tiền, quản lý hoá đơn và quyết toán chi phí cho nhóm bạn khi đi ăn uống, du lịch hoặc vui chơi cùng nhau. Ứng dụng lấy cảm hứng thiết kế từ màu xanh lá đậm cổ điển của đồng Đô-la Mỹ (USD Federal Reserve Note) kết hợp nền giấy cotton kem, giúp việc theo dõi con số, hoá đơn và thanh toán trực quan như một sổ cái tài chính cá nhân.

Thiết kế ban đầu tổ chức dữ liệu theo mô hình quản lý phân cấp 3 tầng:

- **Tầng 1, Bữa (Meal / Gathering)**: tính theo ngày diễn ra cuộc hẹn hoặc chuyến đi. Bữa chứa danh sách người tham gia, cấu hình nhóm thanh toán, danh sách các kèo và bảng quyết toán cuối bữa.
- **Tầng 2, Kèo (Session / Venue)**: tính theo từng địa điểm thanh toán trong bữa đó (ví dụ Kèo 1 ăn lẩu, Kèo 2 karaoke, Kèo 3 cà phê). Mỗi kèo có thể chứa nhiều hơn một hoá đơn.
- **Tầng 3, Món (Item)**: chi tiết từng món ăn, thức uống hoặc dịch vụ trong hoá đơn, hỗ trợ gán người ăn (chia đều hoặc chia theo số phần) và tự động phân bổ thuế VAT.

Tài liệu thiết kế ban đầu được viết thành các tài liệu 01 đến 04 trong thư mục `documentation/`. Sau đó, toàn bộ tính năng được chia thành 9 Epic, mỗi Epic có User Stories và tiêu chí nghiệm thu. Change này lưu trữ thiết kế tổng thể đó như một change đã hoàn thành, để lịch sử của thư mục `documentation/` nằm lại trong `openspec/changes/archive/` trước khi thư mục này được xoá.

## What Changes

Thiết kế ban đầu gồm 7 đặc điểm cốt lõi sau:

1. **Mô hình quản lý phân cấp 3 tầng**: tổ chức dữ liệu thành Bữa, Kèo và Món như mô tả ở mục Why. Mỗi tầng có vai trò riêng trong tính toán: Bữa gom người tham gia và kết quả quyết toán, Kèo gom các hoá đơn theo nơi thanh toán, Món là đơn vị nhỏ nhất để gán người ăn và phân bổ VAT.

2. **Quản lý hoá đơn bằng file và nhận diện OCR offline**:
   - Người dùng chụp ảnh trực tiếp từ camera hoặc tải ảnh, PDF hoá đơn lên. Toàn bộ ảnh hoá đơn được lưu thành file trong bộ nhớ trình duyệt (IndexedDB / OPFS), cho phép xem lại, thêm mới hoặc xoá bỏ.
   - Tích hợp OCR offline bằng Tesseract.js, hỗ trợ tiếng Việt và tiếng Anh, kết hợp bộ phân tích cú pháp hoá đơn để tự động bóc tách Ngày, Tên quán, danh sách món và giá tiền, và Thuế VAT. Hệ thống có bước đối chiếu tổng tiền và tự sửa các số đọc sai. PDF có lớp chữ được đọc trực tiếp, không cần OCR. Ảnh trùng trong cùng một bữa được cảnh báo.
   - Đọc bằng AI Gemini là tuỳ chọn. Khi OCR lệch tổng hoặc thiếu món, người dùng có thể nhập khoá Gemini API của riêng mình để AI đọc lại ảnh. Ảnh được gửi trực tiếp từ trình duyệt tới Google, không qua máy chủ nào của ứng dụng. Mặc định hệ thống vẫn chạy hoàn toàn offline.
   - Cho phép nhập hoá đơn bằng tay (chi tiết từng món) hoặc chỉ nhập tổng tiền. Khi chỉ nhập tổng tiền, hệ thống bắt buộc dùng chế độ chia đều theo tổng.

3. **Quản lý thành viên và nhóm thanh toán linh hoạt**:
   - Lưu danh bạ những người từng tham gia để chọn nhanh cho các bữa sau.
   - Bộ chọn người dạng Quick Filter: gõ tới đâu lọc tới đó, sắp xếp theo thứ tự chữ cái A-Z, và cho phép thêm nhanh người mới ngay tại ô tìm kiếm nếu chưa tồn tại.
   - Hỗ trợ gom nhóm thanh toán (Payment Groups) cho các cặp đôi hoặc gia đình. Tiền đã ứng và tiền cần chi của các thành viên trong nhóm được cộng gộp thành một đại diện thanh toán duy nhất.

4. **Hai chế độ quyết toán và theo dõi thanh toán**:
   - Tự thanh toán (Peer-to-Peer): tối ưu hoá công nợ trực tiếp giữa các cá nhân hoặc nhóm, dựa trên số tiền thực chi và số tiền đã ứng trước.
   - Nhờ người chủ trì (Host-Mediated): mọi khoản cần đóng được chuyển về cho Người chủ trì, mặc định là chủ ứng dụng và có thể đổi theo từng bữa. Sau đó Người chủ trì thanh toán lại cho những người đã ứng tiền.
   - Có checkbox "Tick chọn đã thanh toán" cho từng cá nhân hoặc nhóm thanh toán.

5. **Lưu trữ bữa (Archive) và tối ưu dung lượng**:
   - Chỉ cho phép lưu trữ bữa khi 100% các khoản thanh toán trong bữa đã hoàn tất.
   - Sau khi lưu trữ, bữa bị khoá chỉnh sửa. Hệ thống tự động xoá toàn bộ file ảnh và hoá đơn, các món được giữ lại. Hệ thống chỉ giữ thêm tổng chi phí của từng kèo và lịch sử quyết toán. Bữa đã lưu trữ không còn nút chia sẻ thanh toán.
   - Bữa đã lưu trữ vẫn có thể xem lại hoặc xoá vĩnh viễn.

6. **Ba chế độ quản lý và xem danh sách bữa**:
   - Theo ngày, tháng, năm: giao diện lịch (Calendar View) trực quan.
   - Theo danh sách: sắp xếp theo thời gian từ mới nhất đến cũ nhất (Timeline List View).
   - Theo loại: phân tách rõ giữa bữa còn hoạt động (Active) và bữa đã lưu trữ (Archived).

7. **Chia sẻ thông báo thanh toán và Custom URL Snapshot (chỉ đọc)**:
   - Tạo Custom URL Snapshot nén toàn bộ thông tin của một bữa (kèo, hoá đơn, món, bảng chia tiền) trực tiếp vào đường dẫn URL, không cần máy chủ. Người nhận mở link xem được đầy đủ chi tiết bữa ở chế độ chỉ đọc và không thể chỉnh sửa.
   - Tạo nội dung tin nhắn đòi hoặc nhắc thanh toán theo định dạng rút gọn cho từng cá nhân và nhóm, kèm link Snapshot. Tin nhắn có thể gửi nhanh qua ứng dụng khác (Zalo, Messenger, Telegram, SMS...) bằng Web Share API hoặc sao chép nhanh.

## Tech Stack

| Thành phần | Công nghệ lựa chọn | Lý do lựa chọn |
| :--- | :--- | :--- |
| **Framework UI** | React 18+ & TypeScript (Vite) | Tốc độ phản hồi tức thì, kiểm soát chặt chẽ kiểu dữ liệu cho các phép tính tiền tệ. |
| **Styling & Theme** | Tailwind CSS + Lucide Icons | Dễ dàng xây dựng hệ màu USD Dark Green (`#1B4332`, `#2D6A4F`, `#F4F1EA`) đồng nhất. |
| **Cơ sở dữ liệu Local** | IndexedDB (thông qua `Dexie.js`) | Lưu trữ toàn bộ cấu trúc 3 tầng (Bữa, Kèo, Món, Danh bạ, Nhóm) bền vững ngay trên trình duyệt, không cần server. |
| **Lưu trữ File Hoá đơn** | OPFS (Origin Private File System) + IndexedDB Blob Fallback | Lưu ảnh hoá đơn thành file thực sự trên trình duyệt, hỗ trợ đọc/ghi/xoá file nhanh và giải phóng dung lượng thực tế khi xoá hoặc lưu trữ bữa. |
| **Nhận diện OCR** | `tesseract.js` (Traineddata `vie` + `eng`) + Canvas Document Scanner + `pdfjs-dist` (lớp chữ PDF) | Chạy offline trên trình duyệt, miễn phí, mặc định không cần API Key. |
| **Đọc hoá đơn bằng AI (tuỳ chọn)** | Gemini API (`generateContent`, khoá do người dùng nhập, lưu `localStorage`) | Dự phòng khi OCR đọc chưa chuẩn; gọi trực tiếp từ trình duyệt, không có máy chủ trung gian. |
| **Mã hoá Snapshot URL & Chia sẻ** | `lz-string` (Base64URL Compression) + Web Share API (`navigator.share`) | Nén toàn bộ dữ liệu bữa thành chuỗi URL ngắn gọn chạy hoàn toàn client-side và chia sẻ trực tiếp sang ứng dụng nhắn tin. |
| **State Management** | React Context / Zustand + `useLiveQuery` (Dexie) | Đồng bộ dữ liệu thời gian thực giữa Database và UI. |

## Capabilities

### New Capabilities

Thiết kế này khai sinh 13 capability. Mỗi capability ghi Epic tương ứng. Delta spec chi tiết của từng capability nằm trong các change `epic-<n>-...` cùng thư mục `openspec/changes/archive/`, không nằm trong change này.

- `local-data-storage`: lớp lưu trữ local gồm IndexedDB qua Dexie.js và lưu file hoá đơn qua OPFS kèm Blob fallback. Thuộc Epic 1.
- `design-system`: bảng màu USD Dark Green, nền giấy kem và khung giao diện nền tảng của ứng dụng. Thuộc Epic 1.
- `member-directory`: danh bạ thành viên toàn cục, Quick Filter chọn người sắp xếp A-Z và hồ sơ "Tôi" làm Người chủ trì. Thuộc Epic 2.
- `meal-people-and-payment-groups`: người tham gia trong từng bữa, chỉ định Người chủ trì theo bữa và gom nhóm thanh toán. Thuộc Epic 2.
- `meal-management`: tạo, sửa, xoá bữa và ba chế độ xem danh sách bữa (lịch, danh sách, loại). Thuộc Epic 3.
- `session-management`: quản lý kèo trong một bữa, người tham gia từng kèo, hoá đơn gắn với kèo và file ảnh hoá đơn. Thuộc Epic 4.
- `invoice-management`: quản lý hoá đơn trong kèo, mỗi kèo có một hoặc nhiều hoá đơn, mỗi hoá đơn có một hoặc nhiều file ảnh. Thuộc Epic 4.
- `receipt-ocr`: nhận diện hoá đơn bằng OCR offline, bóc tách ngày, tên quán, món, giá, VAT và đối chiếu tổng. Thuộc Epic 4.
- `bill-splitting`: gán người ăn cho từng món, số phần, chia theo món hoặc chia đều theo tổng và phân bổ VAT. Thuộc Epic 5.
- `settlement`: động cơ tính toán chia tiền theo bữa, hai chế độ quyết toán và tick trạng thái đã thanh toán. Thuộc Epic 6.
- `meal-archive`: lưu trữ bữa, xoá file và hoá đơn, giữ món, khoá chỉnh sửa và xoá vĩnh viễn bữa đã lưu trữ. Thuộc Epic 7.
- `payment-sharing-snapshot`: Custom URL Snapshot chỉ đọc, tin nhắn thanh toán và chia sẻ qua Web Share API hoặc sao chép. Thuộc Epic 8.
- `i18n`: song ngữ Việt và Anh cho toàn bộ ứng dụng, tin nhắn chia sẻ và trang Snapshot. Thuộc Epic 9.

### Modified Capabilities

Không có. Change này khai sinh thiết kế ban đầu, chưa có capability nào trước đó để sửa.

## Impact

- **Mã nguồn**: change này không sửa mã nguồn, không sửa `openspec/specs/` và không tạo delta spec. Hành vi của từng capability được ghi trong các change theo Epic và trong `openspec/specs/`.
- **Dữ liệu**: thiết kế lưu toàn bộ dữ liệu trong IndexedDB của trình duyệt, gồm các bảng `meals`, `sessions`, `invoices`, `items`, `members`, `invoice_files` và `settings`. File ảnh hoá đơn lưu trong OPFS hoặc IndexedDB Blob. Không có máy chủ và không có cơ sở dữ liệu phía server.
- **Thư viện**: React, Vite, TypeScript, Tailwind CSS, Lucide Icons, Dexie.js, Tesseract.js, pdfjs-dist, lz-string, Zustand. Chi tiết xem mục Tech Stack.
- **Ngoài phạm vi của thiết kế ban đầu**: thiết kế này chạy hoàn toàn trên trình duyệt, không cần backend server để tính toán và lưu trữ. Đọc hoá đơn bằng AI Gemini chỉ là tuỳ chọn, chạy khi người dùng tự nhập khoá API.
- **Ghi chú về tài liệu gốc**: đoạn mở đầu của file 04 ghi "8 Epics", nhưng nội dung và sơ đồ phụ thuộc đều có 9 Epic. Change này giữ nguyên nội dung gốc và ghi theo 9 Epic.

## Nguồn lịch sử

Nội dung của `design.md` trong change này là nguyên văn các tài liệu 01, 02 và 03. Nội dung mục Tech Stack, mục Documentation Index, Epic breakdown và ma trận truy vết được lấy từ README và file 04. Lịch sử git dưới đường dẫn `documentation/` được lấy bằng `git log --format='%ad %h %s' --date=short`.

| File gốc | Commit đầu | Commit cuối |
| :--- | :--- | :--- |
| `documentation/01-architecture-and-data-model.md` | 2026-10-19, `d492cfe` | 2026-10-22, `df4d64b` |
| `documentation/02-business-logic-and-algorithms.md` | 2026-10-19, `d492cfe` | 2026-10-22, `9081572` |
| `documentation/03-ui-ux-and-design-system.md` | 2026-10-19, `d492cfe` | 2026-10-22, `df4d64b` |
| `documentation/04-epics-and-roadmap.md` | 2026-10-19, `d492cfe` | 2026-10-20, `354c5cd` |

Commit `d492cfe` (2026-10-19) có tiêu đề "Đổi docs thành documentation, đặt bản build vào docs để GitHub Pages phục vụ từ main /docs". Lịch sử của tài liệu trước commit này, nếu có, nằm dưới đường dẫn cũ và không nằm trong kết quả lọc theo `documentation/`.

## Ma trận truy vết yêu cầu

Nguyên văn bảng "Đối chiếu Kiểm tra Đầy đủ Yêu cầu" ở cuối file 04, giữ đủ 24 dòng và số thứ tự như bản gốc. Dòng 23 đứng trước dòng 22 như trong bản gốc.

| STT | Yêu cầu từ Người dùng | Tài liệu Thiết kế | Epic phụ trách |
| :-: | :--- | :--- | :--- |
| 1 | Hệ thống quản lý chia tiền 3 tầng: Bữa (ngày), Kèo (nơi thanh toán), Món (từng món) | `01-architecture-and-data-model.md` | Epic 1, 3, 4, 5 |
| 2 | Chụp ảnh hoá đơn, mỗi kèo có thể có nhiều hơn 1 hoá đơn | `01-architecture-and-data-model.md` | Epic 4 |
| 3 | Tự nhận diện nội dung hoá đơn bằng OCR để liệt kê ngày, quán, món, giá tiền món | `02-business-logic-and-algorithms.md` | Epic 4 |
| 4 | Tự phát hiện và tính thêm VAT vào món nếu có | `02-business-logic-and-algorithms.md` | Epic 4 |
| 5 | Lựa chọn chia tiền đều theo tổng thay vì chia từng món | `02-business-logic-and-algorithms.md` | Epic 5 |
| 6 | Thêm hoá đơn bằng tay hoặc thêm tổng tiền. Nếu chỉ thêm tổng tiền, bắt buộc chia theo tổng | `02-business-logic-and-algorithms.md` | Epic 5 |
| 7 | Đánh dấu hoá đơn nào do ai ứng tiền | `01-architecture-and-data-model.md` | Epic 5 |
| 8 | Chia tiền theo bữa | `02-business-logic-and-algorithms.md` | Epic 6 |
| 9 | Thêm người vào bữa, người từng thêm được lưu lại để chọn nhanh lần sau | `01-architecture-and-data-model.md` | Epic 2 |
| 10 | Danh sách chọn người dạng quick filter (gõ tới đâu filter tới đó) xếp theo alphabet; chưa có thì thêm mới | `02-business-logic-and-algorithms.md` | Epic 2 |
| 11 | Lựa chọn tự thanh toán hoặc nhờ người chủ trì | `02-business-logic-and-algorithms.md` | Epic 6 |
| 12 | Gom nhóm thanh toán cho cặp đôi/gia đình, cộng tổng ứng và tổng trả như 1 cá nhân | `02-business-logic-and-algorithms.md` | Epic 2, 6 |
| 13 | Giao diện với màu xanh lá đậm của tiền USD | `03-ui-ux-and-design-system.md` | Epic 1, 3, 4, 5, 6 |
| 14 | Toàn bộ hoá đơn lưu thành file, có thể thêm/xoá hoá đơn | `01-architecture-and-data-model.md` | Epic 1, 4 |
| 15 | Có thể thêm hoặc xoá bữa, kèo, món... | `01-architecture-and-data-model.md` | Epic 3, 4, 5 |
| 16 | Tick chọn đã thanh toán để ghi lại trạng thái thanh toán của cá nhân / nhóm | `02-business-logic-and-algorithms.md` | Epic 6 |
| 17 | Lưu trữ bữa: không thể chỉnh sửa nữa, xoá hoá đơn & ảnh (giữ món), lưu chi phí từng kèo; chỉ lưu trữ khi mọi thanh toán hoàn tất | `02-business-logic-and-algorithms.md` | Epic 7 |
| 18 | Bữa đã lưu trữ vẫn có thể bị xoá | `02-business-logic-and-algorithms.md` | Epic 3, 7 |
| 19 | Giao diện quản lý bữa có 3 dạng: Theo ngày/tháng/năm (dùng lịch), Theo danh sách (mới -> cũ), Theo loại (hoạt động / lưu trữ) | `03-ui-ux-and-design-system.md` | Epic 3 |
| 20 | Chia sẻ qua ứng dụng khác để gửi thông báo thanh toán tiền dạng tin nhắn cho tất cả mọi người | `02-business-logic-and-algorithms.md` | Epic 8 |
| 21 | Snapshot là 1 custom URL chứa toàn bộ thông tin của 1 bữa, người mở snapshot không thể thay đổi thông tin bữa đó | `01-architecture-and-data-model.md`, `02-business-logic-and-algorithms.md` | Epic 8 |
| 23 | Mỗi kèo có một số người tham gia cụ thể (có thể tất cả hoặc một số người trong bữa); chia tiền kèo chỉ tính trên người tham gia kèo | `01-architecture-and-data-model.md` §3.3, `02-business-logic-and-algorithms.md` §1.0 | Epic 2 (dọn khi bỏ người), 4, 5, 6 |
| 22 | Định dạng tin nhắn chia sẻ: `<Tên bữa>`, `- <Cá nhân>: nợ <cá nhân> <số tiền>...`, `- <Cá nhân> + <cá nhân>: ...`, `<Link snapshot>` | `02-business-logic-and-algorithms.md`, `03-ui-ux-and-design-system.md` | Epic 8 |
| 24 | App hỗ trợ tiếng Anh, chuyển qua lại en/vi bằng switch; mọi hiển thị (kể cả tên app và nội dung snapshot) theo ngôn ngữ đã chọn; snapshot đổi được ngôn ngữ bằng switch | `epic-9/BR.md`, `epic-9/SA.md` | Epic 9 |

## Quy tắc vận hành lúc đó

Các quy tắc sau áp dụng tại thời điểm thiết kế ban đầu, lấy từ README mục 6 và mục 7.

- **Build GitHub Pages tự động**: GitHub Pages phục vụ từ nhánh `main`, thư mục `/docs`. Đây là bản build production với base `./`, để asset dùng đường dẫn tương đối và không chốt cứng tên repo. Hook `post-merge` trong `.githooks/` chạy sau mỗi `git merge` hoặc `git pull` vào `main`, kể cả fast-forward. Hook tự build và commit `Build docs (<sha>)` nếu bản build thay đổi. Hook chỉ chạy trên nhánh `main`, cần `app/node_modules`; thiếu thì bỏ qua và cảnh báo. Có thể bỏ qua bằng `SKIP_PAGES_BUILD=1`, hoặc build tay bằng `.githooks/build-docs.sh`. Hook được bật nhờ `core.hooksPath=.githooks`, tự đặt khi chạy `npm install` trong `app/` qua script `prepare`. Máy đã clone sẵn cần chạy `git config core.hooksPath .githooks` một lần.
- **Không commit trực tiếp lên `main`**: mọi thay đổi đi qua một branch riêng (ví dụ `feat/...`, `fix/...`, `docs/...`), rồi mở Pull Request vào `main`.
- **Hệ quả với hook**: hook `post-merge` chỉ build `docs/` khi có merge hoặc pull vào `main`, nên mọi thay đổi lên `main` phải qua merge (PR) để `docs/` luôn được build lại.
- **Không lách quy tắc**: không dùng `--no-verify` hay `SKIP_PAGES_BUILD=1` trừ khi người phụ trách đồng ý.
