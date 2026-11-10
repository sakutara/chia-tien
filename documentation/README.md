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
6. **Tài liệu theo Epic** (`documentation/epic-<n>/`, mỗi Epic gồm 2 file; đây là tài liệu lịch sử — đặc tả hiện hành nằm ở `openspec/specs/`, xem mục 5 bên dưới):
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

## 5. Quy trình đặc tả & phát triển tính năng: OpenSpec (BẮT BUỘC)

Từ 2026-11, dự án dùng [OpenSpec](https://github.com/Fission-AI/OpenSpec) thay cho bộ đôi BR/SA theo Epic.

### 5.1. Nguồn sự thật
- **`openspec/specs/<capability>/spec.md`** mô tả hành vi hiện tại của app, chia theo 13 capability (xem `openspec list --specs`). Khi tài liệu trong `documentation/` và spec mâu thuẫn, spec đúng.
- **`openspec/changes/<tên-change>/`** chứa từng thay đổi đang làm: `proposal.md` (làm gì, vì sao), `specs/` (delta so với spec chính), `design.md` (làm thế nào), `tasks.md` (các bước).
- **`openspec/config.yaml`** giữ bối cảnh và quy tắc dự án áp cho mọi artifact.
- `documentation/epic-1` … `epic-9` (BR/SA) và các file 01–05 là **tài liệu lịch sử**: giữ nguyên để tra cứu, không còn bắt buộc cập nhật, không viết BR/SA cho tính năng mới.

### 5.2. Quy trình cho tính năng mới
Dùng skill `new-feature` trong Claude Code (`.claude/skills/new-feature/SKILL.md`), hoặc làm tay theo đúng thứ tự:

1. **Đề xuất** — `/opsx:propose`: tạo change với proposal, delta spec, design, tasks. Chưa code.
2. **Duyệt** — người phụ trách đọc và đồng ý đề xuất.
3. **Triển khai** — `/opsx:apply`: code và test theo `tasks.md`.
4. **Kiểm tra** — trong `app/`: `npm test`, `npm run lint`, `npm run build`; `openspec validate <tên-change> --strict`.
5. **Archive** — `/opsx:archive`: gộp delta vào `openspec/specs/`, chuyển change vào `openspec/changes/archive/`.

Sửa lỗi đưa hành vi về đúng spec và refactor không đổi hành vi thì không cần change.

### 5.3. Quy ước
- Viết tiếng Việt; giữ tiêu đề cấu trúc (`### Requirement:`, `#### Scenario:`) và từ khoá SHALL/MUST, WHEN/THEN bằng tiếng Anh; tên kiểu/hàm/bảng giữ tiếng Anh trong dấu `code`.
- Mỗi Requirement có ít nhất một Scenario kiểm chứng được; spec mô tả hành vi quan sát được, không mô tả cài đặt.
- Ghi trung thực: điều chưa kiểm chứng phải ghi "chưa thực hiện".
- Cài CLI: `npm i -g @fission-ai/openspec@1.17.0` (cần Node 22.12 trở lên). Tắt thống kê ẩn danh bằng `openspec config set telemetry.enabled false`.

### 5.4. Điều kiện hoàn thành một thay đổi (Definition of Done)
- [ ] Change có đủ proposal, delta spec, design, tasks và đạt `openspec validate --strict`.
- [ ] Mọi task trong `tasks.md` đã đánh dấu xong; mỗi Requirement mới hoặc đổi có test.
- [ ] `npm test`, `npm run lint`, `npm run build` đạt.
- [ ] Change đã archive; `openspec validate --specs --strict` đạt.

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
