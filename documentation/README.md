# 💵 Chia tiền — Ứng Dụng Chia Tiền Nhóm Bạn (3 Tầng: Bữa - Kèo - Món)

## 1. Giới thiệu tổng quan

**Chia tiền (Fee Calculator)** là ứng dụng web (Client-side PWA) hỗ trợ tính tiền, quản lý hoá đơn và quyết toán chi phí thông minh cho nhóm bạn khi đi ăn uống, du lịch hoặc vui chơi cùng nhau.

Ứng dụng lấy cảm hứng thiết kế từ **màu xanh lá đậm cổ điển của đồng Đô-la Mỹ (USD Federal Reserve Note)** kết hợp nền giấy cotton kem sang trọng, rõ ràng, giúp việc theo dõi con số, hoá đơn và thanh toán trực quan như một sổ cái tài chính cá nhân.

---

## 2. Các đặc điểm cốt lõi của hệ thống

1. **Mô hình quản lý phân cấp 3 tầng**:
   - **Tầng 1 — Bữa (Meal / Gathering)**: Tính theo ngày diễn ra cuộc hẹn/đi chơi (chứa danh sách người tham gia, cấu hình nhóm thanh toán, danh sách các kèo, và bảng quyết toán cuối bữa).
   - **Tầng 2 — Kèo (Session / Venue)**: Tính theo từng địa điểm thanh toán trong bữa đó (VD: Kèo 1 Ăn lẩu, Kèo 2 Karaoke, Kèo 3 Cafe). Mỗi kèo có thể chứa **nhiều hơn 1 hoá đơn**.
   - **Tầng 3 — Món (Item)**: Chi tiết từng món ăn/thức uống/dịch vụ trong hoá đơn, hỗ trợ gán người ăn (chia đều hoặc chia theo số phần) và tự động phân bổ thuế VAT.

2. **Quản lý Hoá đơn bằng File & Nhận diện OCR Offline**:
   - Chụp ảnh trực tiếp từ camera hoặc tải ảnh/PDF hoá đơn lên; toàn bộ ảnh hoá đơn được lưu thành file trong bộ nhớ trình duyệt (IndexedDB / OPFS), cho phép xem lại, thêm mới hoặc xoá bỏ.
   - Tích hợp **OCR Offline (Tesseract.js hỗ trợ Tiếng Việt + Tiếng Anh)** kết hợp bộ phân tích cú pháp hoá đơn thông minh để tự động bóc tách: **Ngày**, **Tên quán**, **Danh sách món & Giá tiền**, và **Thuế VAT**, kèm bước **đối chiếu tổng tiền và tự sửa** số đọc sai. PDF có lớp chữ được đọc thẳng (không cần OCR); ảnh trùng trong cùng bữa được cảnh báo.
   - **Đọc bằng AI Gemini (tuỳ chọn)**: khi OCR lệch tổng hoặc thiếu món, người dùng có thể nhập khoá Gemini API của riêng mình để AI đọc lại ảnh; ảnh gửi thẳng từ trình duyệt tới Google, không qua máy chủ nào của app. Mặc định hệ thống vẫn chạy hoàn toàn offline.
   - Cho phép nhập hoá đơn bằng tay (chi tiết từng món) hoặc chỉ nhập **Tổng tiền** (khi chỉ nhập tổng tiền, hệ thống bắt buộc chế độ chia đều theo tổng).

3. **Quản lý Thành viên & Nhóm Thanh toán linh hoạt**:
   - Lưu danh bạ người từng tham gia để chọn nhanh cho các bữa sau.
   - Bộ chọn người dạng **Quick Filter** (gõ tới đâu lọc tới đó), sắp xếp chuẩn **Alphabet (A-Z)**, cho phép thêm nhanh người mới ngay tại ô tìm kiếm nếu chưa tồn tại.
   - Hỗ trợ **Gom nhóm thanh toán (Payment Groups)** dành cho các cặp đôi hoặc gia đình: cộng gộp toàn bộ tiền đã ứng và tiền cần chi của các thành viên trong nhóm thành một đại diện thanh toán duy nhất.

4. **Hai chế độ Quyết toán & Theo dõi Thanh toán**:
   - **Tự thanh toán (Peer-to-Peer)**: Tối ưu hoá công nợ trực tiếp giữa các cá nhân/nhóm dựa trên số tiền thực chi và số tiền ai đã ứng trước.
   - **Nhờ người chủ trì (Host-Mediated)**: Mọi khoản cần đóng sẽ chuyển về cho **Người chủ trì** (mặc định là Chủ app, có thể đổi theo từng bữa), sau đó Người chủ trì thanh toán lại cho những người đã ứng tiền.
   - Có checkbox **Tick chọn đã thanh toán** cho từng cá nhân / nhóm thanh toán.

5. **Lưu trữ Bữa (Archive) & Tối ưu dung lượng**:
   - Chỉ cho phép **Lưu trữ bữa** khi **100% các khoản thanh toán trong bữa đã hoàn tất**.
   - Sau khi lưu trữ: Bữa bị **khoá chỉnh sửa**, hệ thống tự động **xoá toàn bộ file ảnh và hoá đơn** (các món được giữ lại), chỉ giữ thêm tổng chi phí của từng kèo và lịch sử quyết toán; bữa đã lưu trữ không còn nút chia sẻ thanh toán.
   - Bữa đã lưu trữ vẫn có thể xem lại hoặc xoá vĩnh viễn.

6. **Ba chế độ Quản lý & Xem danh sách Bữa**:
   - **Theo Ngày/Tháng/Năm**: Giao diện Lịch (Calendar View) trực quan.
   - **Theo Danh sách**: Sắp xếp theo thời gian từ mới nhất đến cũ nhất (Timeline List View).
   - **Theo Loại**: Phân tách rõ giữa **Bữa còn hoạt động (Active)** và **Bữa đã lưu trữ (Archived)**.

7. **Chia sẻ Thông báo Thanh toán & Custom URL Snapshot (Chỉ đọc)**:
   - Tạo **Custom URL Snapshot** nén toàn bộ thông tin của 1 Bữa (Kèo, Hoá đơn, Món, Bảng chia tiền) trực tiếp vào đường dẫn URL mà không cần server. Người nhận mở link sẽ xem được đầy đủ chi tiết bữa ở chế độ **Chỉ đọc (Read-only)**, không thể chỉnh sửa.
   - Tạo nội dung tin nhắn đòi/nhắc thanh toán chuẩn định dạng rút gọn theo cá nhân và nhóm (`<Cá nhân> + <Cá nhân>: chuyển cho <cá nhân> <số tiền>...`) kèm Link Snapshot, hỗ trợ gửi nhanh qua ứng dụng khác (Zalo, Messenger, Telegram, SMS...) bằng **Web Share API** hoặc sao chép nhanh.

---

## 3. Kiến trúc Công nghệ (Tech Stack)

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

---

## 4. Danh mục Tài liệu Thiết kế (Documentation Index)

Toàn bộ tài liệu thiết kế hệ thống được chia thành 5 phần chi tiết trong thư mục `documentation/`:

1. [**01. Kiến trúc Hệ thống & Mô hình Dữ liệu (`01-architecture-and-data-model.md`)**](./01-architecture-and-data-model.md)
   - Sơ đồ kiến trúc Client-side, thiết kế Schema IndexedDB, cấu trúc Snapshot Payload, cơ chế lưu trữ File hoá đơn (OPFS/Blob) và luồng dữ liệu.
2. [**02. Nghiệp vụ Tính toán, OCR, VAT, Quyết toán & Chia sẻ Snapshot (`02-business-logic-and-algorithms.md`)**](./02-business-logic-and-algorithms.md)
   - Pipeline OCR chi tiết (xử lý ảnh, nhận diện hai lượt, bộ phân tích và đối soát tổng): [**ocr-pipeline.md**](./ocr-pipeline.md).
   - Công thức tính tiền 3 tầng, phân bổ VAT, thuật toán OCR bóc tách hoá đơn, gom nhóm thanh toán, thuật toán Tự thanh toán vs. Nhờ người chủ trì, định dạng bản tin Chia sẻ & mã hoá Snapshot URL, và quy trình Lưu trữ (Archive).
3. [**03. Thiết kế Giao diện (UI/UX) & Hệ màu USD Green (`03-ui-ux-and-design-system.md`)**](./03-ui-ux-and-design-system.md)
   - Bảng màu USD, Typography, bố cục 3 chế độ xem Bữa, luồng tương tác Quick Filter chọn người, chụp/OCR hoá đơn, bảng thanh toán, Modal Chia sẻ và giao diện Xem Snapshot (Read-only).
4. [**04. Phân rã Epics & Lộ trình Triển khai (`04-epics-and-roadmap.md`)**](./04-epics-and-roadmap.md)
   - Chia nhỏ toàn bộ tính năng thành 9 Epics độc lập kèm User Stories, Acceptance Criteria và thứ tự ưu tiên phát triển.
5. [**05. Hệ thống đọc hoá đơn: OCR + AI Gemini (`05-ocr-and-receipt-reading.md`)**](./05-ocr-and-receipt-reading.md)
   - Tổng hợp theo mã nguồn toàn bộ chuỗi ảnh/PDF → dữ liệu hoá đơn: nhập & quét ảnh, PDF, Tesseract, bộ phân tích, đối chiếu tự sửa, đọc bằng Gemini, phát hiện ảnh trùng, hằng số, bản đồ mã nguồn, hạn chế.
6. **Tài liệu theo Epic** (`documentation/epic-<n>/`, mỗi Epic gồm 2 file — xem quy tắc bắt buộc ở mục 5 bên dưới):
   - Epic 1: [**BR — Yêu cầu nghiệp vụ**](./epic-1/BR.md) · [**SA — Phân tích hệ thống**](./epic-1/SA.md)
   - Epic 2: [**BR — Yêu cầu nghiệp vụ**](./epic-2/BR.md) · [**SA — Phân tích hệ thống**](./epic-2/SA.md) *(đã triển khai, còn kiểm thủ công trước khi đóng)*
   - Epic 3: [**BR — Yêu cầu nghiệp vụ**](./epic-3/BR.md) · [**SA — Phân tích hệ thống**](./epic-3/SA.md) *(đã triển khai, còn kiểm thủ công trước khi đóng)*
   - Epic 4: [**BR — Yêu cầu nghiệp vụ**](./epic-4/BR.md) · [**SA — Phân tích hệ thống**](./epic-4/SA.md) *(đã triển khai, còn kiểm thủ công trước khi đóng)*
   - Epic 5: [**BR — Yêu cầu nghiệp vụ**](./epic-5/BR.md) · [**SA — Phân tích hệ thống**](./epic-5/SA.md) *(đã triển khai, còn kiểm thủ công trước khi đóng)*
   - Epic 6: [**BR — Yêu cầu nghiệp vụ**](./epic-6/BR.md) · [**SA — Phân tích hệ thống**](./epic-6/SA.md) *(đã triển khai, còn kiểm thủ công trước khi đóng)*
   - Epic 7: [**BR — Yêu cầu nghiệp vụ**](./epic-7/BR.md) · [**SA — Phân tích hệ thống**](./epic-7/SA.md) *(đã triển khai, còn kiểm thủ công trước khi đóng)*
   - Epic 8: [**BR — Yêu cầu nghiệp vụ**](./epic-8/BR.md) · [**SA — Phân tích hệ thống**](./epic-8/SA.md) *(đã triển khai, còn kiểm thủ công trước khi đóng)*
   - Epic 9: [**BR — Yêu cầu nghiệp vụ**](./epic-9/BR.md) · [**SA — Phân tích hệ thống**](./epic-9/SA.md) *(đã triển khai, còn kiểm thủ công trước khi đóng)*

---

## 5. Quy tắc BR & SA cho từng Epic (BẮT BUỘC)

Mỗi Epic **phải** có đủ 2 tài liệu trước khi bắt đầu code và được cập nhật trước khi đóng Epic. Epic thiếu BR hoặc SA, hoặc hai file không đúng cấu trúc dưới đây, **không được coi là hoàn thành**.

### 5.1. Vị trí & đặt tên
```text
documentation/epic-<n>/
├─ BR.md   # Business Requirements — "làm gì & vì sao"
└─ SA.md   # System Analysis — "làm thế nào"
```
- `<n>` là số Epic trong [`04-epics-and-roadmap.md`](./04-epics-and-roadmap.md) (không đệm số 0: `epic-1`, `epic-8`).
- Chỉ đúng 2 file này; không gộp BR và SA vào một file, không đặt ở nơi khác.
- Tiêu đề: `# Epic <n> — Business Requirements (BR)` / `# Epic <n> — System Analysis (SA)`, ngay dưới là tên Epic, trạng thái và link chéo BR ↔ SA.

### 5.2. Thứ tự thực hiện
1. **Viết BR** từ mục tiêu, User Stories và Acceptance Criteria của Epic trong file 04.
2. **Viết SA** dựa trên BR + 01/02/03; mọi BR phải có chỗ được giải quyết trong SA.
3. **Code & test** theo SA.
4. **Cập nhật BR/SA** cho khớp thực tế (trạng thái, rủi ro, kết quả kiểm thử) rồi mới đóng Epic.
5. Nếu thiết kế dùng chung (01/02/03) đổi, sửa file đó trước, rồi cập nhật BR/SA của các Epic bị ảnh hưởng.

### 5.3. Cấu trúc bắt buộc của `BR.md`

| Mục | Nội dung |
| :-: | :--- |
| **A.1** | Bối cảnh & mục tiêu nghiệp vụ |
| **A.2** | Các bên liên quan (vai trò – điều quan tâm) |
| **A.3** | Yêu cầu nghiệp vụ `BR-<n>.<k>`, mỗi dòng truy vết tới `US-<n>.x` và yêu cầu người dùng (YC#) trong ma trận file 04 |
| **A.4** | Quy tắc nghiệp vụ `R-<k>` (ràng buộc, công thức, trường hợp biên) |
| **A.5** | Tiêu chí nghiệm thu `AC-<k>` (dạng checkbox, kiểm chứng được) |
| **A.6** | Ngoài phạm vi (những gì Epic này cố ý không làm) |

### 5.4. Cấu trúc bắt buộc của `SA.md`

| Mục | Nội dung |
| :-: | :--- |
| **B.1** | Công nghệ / thư viện sử dụng |
| **B.2** | Cấu trúc mã nguồn (cây thư mục các file thuộc Epic) |
| **B.3** | Thành phần & trách nhiệm (bảng: thành phần – trách nhiệm – phụ thuộc) |
| **B.4** | Thiết kế dữ liệu (bảng/index/trường mới hoặc thay đổi; ghi "không đổi" nếu không có) |
| **B.5** | Luồng xử lý chính (sơ đồ Mermaid: sequence/flowchart) |
| **B.6** | Giao diện lập trình nội bộ (hàm/service/component: chữ ký, hành vi lỗi) |
| **B.7** | Yêu cầu phi chức năng (bền vững, hiệu năng, tương thích, bảo mật, khả dụng) |
| **B.8** | Rủi ro & hạn chế đã biết (kèm hướng xử lý) |
| **B.9** | Ma trận truy vết kiểm thử: User Story → BR → bài test cụ thể (hoặc "chưa thực hiện") |
| **B.10** | Việc còn lại để đóng Epic |

### 5.5. Quy ước chung
- Viết tiếng Việt; tên kiểu/hàm/bảng giữ nguyên tiếng Anh trong dấu `code`.
- Mã định danh ổn định, không tái sử dụng: `BR-<n>.<k>`, `R-<k>`, `AC-<k>` (đánh số trong phạm vi Epic), `US-<n>.<k>` lấy từ file 04.
- Mỗi User Story trong file 04 phải xuất hiện ít nhất một lần ở cột truy vết của BR (A.3) **và** ở ma trận B.9.
- Ghi trung thực: mục chưa kiểm chứng phải ghi "chưa thực hiện", không đánh dấu đạt khi chưa chạy.
- Không lặp lại nội dung đã có ở 01/02/03; chỉ dẫn link tới mục tương ứng.

### 5.6. Điều kiện đóng Epic (Definition of Done)
- [ ] `documentation/epic-<n>/BR.md` và `SA.md` tồn tại, đủ các mục theo 5.3 và 5.4.
- [ ] Mọi User Story của Epic được truy vết trong BR (A.3) và SA (B.9).
- [ ] Mọi tiêu chí nghiệm thu trong file 04 có `AC-<k>` tương ứng và trạng thái thật.
- [ ] Code, test và build đạt; kết quả được ghi vào B.9; việc còn lại (B.10) rỗng hoặc đã chuyển sang Epic khác có ghi chú.

---

## 6. Build GitHub Pages (`docs/`) tự động

GitHub Pages phục vụ từ nhánh `main`, thư mục `/docs` (bản build prod, base `./` để asset dùng đường dẫn tương đối, không chốt cứng tên repo). Hook trong `.githooks/` giữ thư mục này luôn khớp mã nguồn:

- **`post-merge`**: sau mỗi `git merge` / `git pull` vào `main` (kể cả fast-forward), tự build và commit `Build docs (<sha>)` nếu bản build đổi. Gồm cả trường hợp merge PR trên GitHub rồi `git pull` về máy.
- Chỉ chạy trên nhánh `main`, cần `app/node_modules` (thiếu thì bỏ qua và cảnh báo). Bỏ qua bằng `SKIP_PAGES_BUILD=1`; build tay bằng `.githooks/build-docs.sh`.
- Hook được bật nhờ `core.hooksPath=.githooks`, tự đặt khi chạy `npm install` trong `app/` (script `prepare`); máy đã clone sẵn chạy một lần: `git config core.hooksPath .githooks`.

## 7. Quy tắc làm việc với Git (BẮT BUỘC)

- **Không commit trực tiếp lên `main`.** Mọi thay đổi đi qua một branch riêng (ví dụ `feat/...`, `fix/...`, `docs/...`), rồi mở Pull Request vào `main`.
- Hệ quả với hook: `post-merge` chỉ build `docs/` khi có merge/pull vào `main`. Vì vậy mọi thay đổi lên `main` phải qua merge (PR) để `docs/` luôn được build lại.
- Không dùng `--no-verify` hay `SKIP_PAGES_BUILD=1` để lách quy tắc này trừ khi người phụ trách đồng ý.
