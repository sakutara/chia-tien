<!-- Nguyên văn documentation/epic-9/SA.md (System Analysis) tại thời điểm chuyển sang OpenSpec, 2026-11-11. Tài liệu lịch sử: có thể không còn khớp code hiện tại; hành vi hiện hành nằm ở openspec/specs/. -->

# Epic 9 — System Analysis (SA)

**Epic 9**: Song ngữ Việt – Anh (i18n) cho toàn bộ ứng dụng & Snapshot · **Trạng thái**: Đã triển khai (còn kiểm thủ công trên thiết bị thật trước khi đóng)

Tài liệu đi cùng: [BR](./BR.md) · [Epics & Roadmap](../04-epics-and-roadmap.md) · [Epic 8 SA](../epic-8/SA.md)

---

### B.1. Công nghệ / thư viện sử dụng
- **Không thêm thư viện i18n.** Lớp mỏng tự viết ở `app/src/i18n/`: `t()` toàn cục, `useLang()` và `Intl.*` có sẵn của trình duyệt.
- **Khoá dịch là câu tiếng Việt gốc**: `t('Chia tiền')` trả đúng câu đó khi `vi` và tra `en` khi `en`; thiếu bản dịch thì dùng câu gốc (R-2). Cách này giữ nguyên mọi test cũ (chạy ở `vi`) và không cần đặt tên khoá. Tham số `{name}`; số nhiều `{n|một|nhiều}` chọn vế đầu khi `n = 1`.
- Ngôn ngữ nằm trong một biến toàn cục nên cả code thuần (domain, service) cũng dịch được; **`App` gọi `useLang()` để cả cây render lại** khi đổi ngôn ngữ, nên không component nào phải tự đăng ký.
- Hằng số cấp module (nhãn tab, bảng lý do…) dùng `T('…')` (đánh dấu, trả nguyên chuỗi) rồi dịch lúc hiển thị bằng `t(x)`; nếu gọi `t()` ở cấp module thì chuỗi bị đóng băng ở `vi`.
- Lưu lựa chọn: `AppSettings.language` trong IndexedDB. `db/languageStore.ts` có `loadStoredLang()` (đọc, lỗi thì trả `null`) và `saveStoredLang()` (`ensureDefaultData` rồi `settings.update`). `main.tsx` đọc trước lần render đầu rồi gọi `initLanguage({ stored, urlLang })`; `LanguageSwitch` gọi `setLang` rồi `saveStoredLang`. Cùng đường này cho app chính và trang Snapshot.

### B.2. Cấu trúc mã nguồn
```text
app/src/i18n/
├─ index.ts        # Lang, t, T, tIn, setLang, initLanguage, detectLanguage, useLang, interpolate (không biết gì về DB)
├─ en.ts           # Record<câu tiếng Việt, câu tiếng Anh>
└─ i18n.test.ts    # quét mã nguồn: mọi t()/T() có bản dịch, không khoá thừa, đúng tham số; detect; đổi ngôn ngữ
app/src/components/ui/LanguageSwitch.tsx   # công tắc role="switch" VI/EN, dùng ở app và Snapshot (cùng thanh đầu trang)
app/src/db/languageStore.ts                 # đọc/ghi AppSettings.language
app/src/db/localize.ts                     # localizeMember ("Tôi" → "Me"), localizeSession ("Kèo n" → "Venue n")
app/src/App.i18n.test.tsx                  # công tắc, Snapshot, tên mặc định, tham số l
```
Sửa: `lib/money.ts` (`formatMoney(amount, lang?)`), `lib/dates.ts` (`formatDate`, `weekdayLabels`; `formatDateVi` là bí danh), `domain/shareSnapshot.ts` (`formatShareMessage` nhận `lang`, `buildSnapshotUrl` thêm `&l=`), `domain/sessionRules.ts`, `domain/vietQr.ts`, `hooks/use*` (đưa `lang` vào deps của `useLiveQuery`), `main.tsx` (`initLanguage`), và mọi component/service/domain có chuỗi hiển thị.

### B.3. Thành phần & trách nhiệm
| Thành phần | Trách nhiệm |
| :--- | :--- |
| `useLang()` ở `App` | Đăng ký đổi ngôn ngữ để cả cây render lại; `setLang` cập nhật `document.documentElement.lang` và `document.title`. |
| `t(source, params?)` | Tra `en` theo câu tiếng Việt gốc, nội suy `{name}`, số nhiều `{n\|một\|nhiều}`; thiếu bản dịch dùng câu gốc (R-2). |
| `LanguageSwitch` | Công tắc `role="switch"` hai trạng thái VI/EN, dùng chung cho app chính và Snapshot. |
| `detectLanguage` | Hàm thuần theo BR-9.4/9.8, dễ kiểm. |
| Domain thuần (`formatShareMessage`…) | **Không** import React/Context: nhận `lang` làm tham số (mặc định ngôn ngữ hiện tại) để test được cả hai ngôn ngữ. |

### B.4. Thiết kế dữ liệu
- `AppSettings` thêm trường tuỳ chọn `language?: 'vi' | 'en'`; không cần nâng phiên bản schema Dexie (`settings` khoá theo `id`). `MealSnapshotPayload` không đổi.
- **Giá trị mặc định do hệ thống sinh** (BR-9.9) vẫn lưu nguyên văn nhưng được *dịch lúc đọc*: `localizeMember` đổi hồ sơ chủ app còn tên mặc định `Tôi` thành `Me`; `localizeSession` đổi `Kèo n` / `Venue n` theo ngôn ngữ hiện tại. Áp dụng ở các hook (`useMembers`, `useMealPeople`, `useMealSessions`, `useMealSettlement`) và khi dựng Snapshot. Tên người dùng tự đặt giữ nguyên. `isDefaultSessionName` nhận cả `Kèo n` lẫn `Venue n`.
- Hộp thoại "Hồ sơ của tôi" lưu lại `Tôi` (dạng gốc) nếu tên không đổi so với bản đang hiển thị, để tên mặc định không bị khoá cứng sang `Me`.
- **Snapshot link**: ~~thêm tham số `l`~~ — đã bỏ để link ngắn hơn: `…?s=<mã>`; người nhận dùng ngôn ngữ đã lưu hoặc của trình duyệt, link cũ có `&l=` vẫn được đọc. Định dạng nén nhị phân `~` không đổi nên link cũ vẫn mở; link cũ không có `l` rơi về ngôn ngữ trình duyệt.
- **Nội dung chuyển khoản** (`<người> thanh toán <bữa>`) không lưu trong link khi bằng mặc định mà dựng lại ở máy người xem theo ngôn ngữ của họ (`en`: `<người> pays <bữa>`).

### B.5. Luồng xử lý chính
1. **Khởi động**: `detectLanguage({ stored, urlParam, navigatorLang })` → `I18nProvider` → đặt `<html lang>`, `<title>`.
2. **Đổi ngôn ngữ (app)**: `setLang` → cập nhật Context (render lại tức thì) → ghi `settings.language`.
3. **Đổi ngôn ngữ (Snapshot)**: `setLang` → Context + `localStorage`; không động tới DB hay URL.
4. **Sinh tin nhắn**: `formatShareMessage({ …, lang })`, mặc định theo ngôn ngữ giao diện. Mẫu:
   - `vi`: `- An: chuyển cho Bình 50.000 ₫, chuyển cho Cường 20.000 ₫`
   - `en`: `- An: transfer to Bình 50,000 ₫, transfer to Cường 20,000 ₫`
   - Không có khoản cần chuyển: `vi` `- Tất cả các khoản thanh toán đã hoàn tất.` / `en` `- All payments are settled.`
   Link sinh không còn kèm `&l=` (đã bỏ).
5. **Mở Snapshot**: giải mã payload như Epic 8, `detectLanguage` với `urlParam = l` (BR-9.8), render toàn bộ trang bằng `useT()`.

### B.6. Giao diện lập trình nội bộ
```ts
type Lang = 'vi' | 'en'
t(source: string, params?: Record<string, string | number | undefined>): string   // theo ngôn ngữ hiện tại
tIn(lang: Lang, source, params?): string                                            // theo ngôn ngữ chỉ định
T(source: string): string                                                           // đánh dấu câu gốc ở hằng số cấp module
setLang(lang: Lang): void                        // chỉ đổi hiển thị; không ghi DB
initLanguage({ stored?, urlLang? }): Lang        // gọi một lần ở main.tsx
loadStoredLang(): Promise<Lang | null>; saveStoredLang(lang): Promise<void>   // db/languageStore
detectLanguage({ stored, urlParam, navigatorLang }): Lang
useLang(): Lang                                  // useSyncExternalStore; gọi ở App và ở hook có useLiveQuery
formatMoney(amount, lang?), formatDate(ymd, lang?), weekdayLabels(lang?)
formatShareMessage(input: { …; lang?: Lang }): string
buildSnapshotUrl(payload | encoded, baseLocation?): string   // không còn &l=
```

### B.7. Yêu cầu phi chức năng
- Bundle: từ điển `en` nạp tĩnh (khoảng 500 câu); nếu về sau thêm ngôn ngữ thì tách `import()` động. Link Snapshot chỉ dài thêm 4 ký tự (`&l=en`).
- Không nháy giao diện khi khởi động: `main.tsx` chờ `loadStoredLang()` (một lần đọc IndexedDB) rồi mới render lần đầu.
- Hiển thị: chuỗi tiếng Anh dài hơn; mọi nút/chip phải co giãn, không cắt chữ ở 375 px.

### B.8. Rủi ro & hạn chế đã biết
- **Câu ghép từ nhiều mảnh** (ví dụ `Lưu trữ <b>tên</b> sẽ khoá…`) dịch theo từng mảnh nên đúng thứ tự từ chỉ khi hai ngôn ngữ cùng trật tự câu; khi gặp câu khó nên gộp thành một khoá có tham số.
- **`t()` gọi ở cấp module** bị đóng băng ở `vi`: dùng `T()` + `t()` lúc hiển thị (test không bắt được lỗi này, cần soát khi review).
- **Giá trị bữa/nhóm đã lưu** như tên bữa mặc định `Bữa <ngày>` giữ ngôn ngữ lúc tạo (là dữ liệu).
- **Link Snapshot ngoài đời** do người gửi dùng ngôn ngữ nào cũng phải mở được: tham số `l` tuỳ chọn, bỏ trống thì rơi về `navigator.language`.
- **Từ điển deflate đã đóng băng** của Snapshot chứa từ tiếng Việt: giữ nguyên; không ảnh hưởng ngôn ngữ giao diện.
- Danh bạ luôn sắp A–Z theo collator `vi` bất kể ngôn ngữ giao diện (tên người Việt).
- Nội dung chuyển khoản vẫn là chữ không dấu (`pays`/`thanh toan`) theo yêu cầu của ngân hàng.

### B.9. Ma trận truy vết kiểm thử
| Kiểm thử | Phủ |
| :--- | :--- |
| `i18n.test`: mọi `t()`/`T()` có bản dịch `en`; không khoá thừa; bản dịch giữ đúng tham số | R-1, R-2, AC-9 |
| `i18n.test`: `detectLanguage` đủ tổ hợp ưu tiên; `setLang` đổi `<html lang>` và `<title>`; số nhiều; `tIn` | BR-9.4, BR-9.8, AC-3, AC-7 |
| `App.i18n.test`: công tắc đổi tiêu đề, nút, tên app; Snapshot đổi ngôn ngữ, chỉ `settings.language` được ghi và không có dữ liệu bữa; nạp lại ngôn ngữ đã lưu; "Tôi" ↔ "Me"; link có `&l=` | BR-9.1, BR-9.2, BR-9.3, BR-9.7, BR-9.8, BR-9.9, AC-1, AC-2, AC-6, AC-7, AC-8 |
| `shareSnapshot.test`: tin nhắn `en`, định dạng link | BR-9.6, AC-5 |
| Toàn bộ test Epic 1–8 (chạy ở `vi`) | R-4, hồi quy |
| Duyệt bốn bước của bữa ở `en` trên trình duyệt 375 px, quét ký tự tiếng Việt còn sót | AC-1, AC-9 |

### B.10. Việc còn lại để đóng Epic
- Kiểm thủ công trên thiết bị thật: hộp thoại chia sẻ, trang Snapshot và các hộp thoại dài ở 375 px bằng tiếng Anh; sao chép/Web Share với tin nhắn `en`.
- Soát câu ghép nhiều mảnh (B.8) với người đọc tiếng Anh bản ngữ.

---

## Phụ lục: Business Requirements gốc của Epic 9

Nguyên văn `documentation/epic-9/BR.md` tại thời điểm chuyển sang OpenSpec (2026-11-11). `proposal.md` và các delta spec của change này được chuyển từ tài liệu này.

# Epic 9 — Business Requirements (BR)

**Epic 9**: Song ngữ Việt – Anh (i18n) cho toàn bộ ứng dụng & Snapshot · **Trạng thái**: Đã triển khai (còn kiểm thủ công trên thiết bị thật trước khi đóng)

Tài liệu đi cùng: [SA](./SA.md) · [Epics & Roadmap](../04-epics-and-roadmap.md) · [UI §4](../03-ui-ux-and-design-system.md) · [Epic 8 BR](../epic-8/BR.md)

---

### A.1. Bối cảnh & Mục tiêu nghiệp vụ
Toàn bộ ứng dụng hiện chỉ có tiếng Việt (văn bản giao diện, tin nhắn chia sẻ, định dạng tiền `1.620.000 ₫`, tên ứng dụng "Chia tiền"). Người dùng và người nhận Snapshot không đọc được tiếng Việt chưa thể dùng ứng dụng. Epic 9 bổ sung **tiếng Anh (`en`)** bên cạnh **tiếng Việt (`vi`)**, chuyển qua lại bằng một **công tắc (switch) ngôn ngữ**, và áp dụng nhất quán cho mọi nơi hiển thị — kể cả tên ứng dụng và trang xem Snapshot.

### A.2. Các bên liên quan
| Vai trò | Quan tâm |
| :--- | :--- |
| Người chủ trì (chủ app) | Dùng app và gửi tin nhắn thanh toán bằng ngôn ngữ mình chọn. |
| Người nhận Snapshot | Mở link và đọc được bằng ngôn ngữ của mình, đổi được ngay trên trang Snapshot mà không cần cài hay đăng nhập. |

### A.3. Yêu cầu nghiệp vụ (BR)

| Mã | Yêu cầu |
| :-: | :--- |
| **BR-9.1** | Ứng dụng hỗ trợ đúng 2 ngôn ngữ: `vi` (Tiếng Việt) và `en` (English). Có **một công tắc ngôn ngữ** trên thanh đầu trang của ứng dụng chính, đổi tức thì (không tải lại trang, không mất dữ liệu đang nhập). |
| **BR-9.2** | **Mọi** chuỗi hiển thị cho người dùng đều theo ngôn ngữ đã chọn: nhãn, nút, tiêu đề, placeholder, `aria-label`, thông báo lỗi/xác nhận, trạng thái rỗng, tên các bước/chế độ xem, `<title>` của trang và `lang` của thẻ `<html>`. Không còn chuỗi cứng nằm lẫn trong component. |
| **BR-9.3** | **Tên ứng dụng** đổi theo ngôn ngữ: `vi` = "Chia tiền", `en` = "Split Bill". Áp dụng ở thanh đầu trang và `<title>` (ứng dụng chưa có manifest PWA). |
| **BR-9.4** | Ngôn ngữ mặc định lần đầu mở app: theo `navigator.language` (bắt đầu bằng `vi` → `vi`, còn lại → `en`). Lựa chọn của người dùng được ghi nhớ trong IndexedDB (`AppSettings.language`, bảng `settings`), dùng chung cho app chính và trang Snapshot, và ưu tiên hơn mặc định ở những lần mở sau. Đổi ngôn ngữ ở Snapshot cũng lưu xuống đây; đó là thiết lập cá nhân của người xem chứ không phải dữ liệu của Snapshot. |
| **BR-9.5** | **Định dạng theo ngôn ngữ**: ngày/tháng/thứ, thứ tự sắp xếp tên (A–Z chuẩn locale), dấu phân cách số. Đơn vị tiền vẫn là VNĐ (`₫`) ở cả hai ngôn ngữ; chỉ đổi dấu phân cách nghìn (`vi`: `1.620.000 ₫`, `en`: `1,620,000 ₫`). **Không** quy đổi sang ngoại tệ. |
| **BR-9.6** | **Tin nhắn thanh toán** (Epic 8 BR-8.5) được sinh theo ngôn ngữ đang chọn khi chia sẻ, giữ nguyên cấu trúc dòng: `vi` → `- An: chuyển cho Bình 50.000 ₫`; `en` → `- An: transfer to Bình 50,000 ₫`. Ngôn ngữ của tin nhắn là ngôn ngữ giao diện lúc chia sẻ; link kèm `l` cùng ngôn ngữ đó. |
| **BR-9.7** | **Snapshot theo ngôn ngữ**: trang xem Snapshot (chỉ đọc) có **công tắc ngôn ngữ riêng** và toàn bộ nội dung — chuỗi giao diện, tên các bước, trạng thái thanh toán, bảng quyết toán, giải trình, định dạng ngày/tiền — hiển thị theo ngôn ngữ đang chọn. Đổi ngôn ngữ ở Snapshot chỉ ảnh hưởng người đang xem và không sửa link; lựa chọn được lưu vào `settings` (BR-9.4) nhưng không có dữ liệu bữa nào của Snapshot được ghi. |
| **BR-9.8** | **Ngôn ngữ khởi tạo của Snapshot**: link Snapshot mang theo ngôn ngữ của người gửi (tham số `l=vi|en`) để người nhận mở ra thấy đúng ngôn ngữ người gửi muốn. Thứ tự ưu tiên khi mở: lựa chọn đã lưu trong IndexedDB của người nhận (nếu từng chọn) > `l` trong link > `navigator.language`. Link cũ không có `l` vẫn mở bình thường (rơi về 2 mức sau). |
| **BR-9.9** | **Dữ liệu người dùng nhập không bị dịch**: tên bữa, tên người, tên kèo, tên quán, tên món, tên nhóm, ghi chú, nội dung chuyển khoản giữ nguyên như đã nhập. Riêng các giá trị mặc định do hệ thống sinh (hồ sơ "Tôi" / "Me", kèo mặc định "Kèo n" / "Venue n", nhóm không tên) hiển thị theo ngôn ngữ đang chọn thay vì bị đóng cứng theo ngôn ngữ lúc tạo. Tên bữa mặc định (`Bữa <ngày>`) và nội dung chuyển khoản (`<người> thanh toán <bữa>`, gồm cả trong link Snapshot) là dữ liệu sinh lúc tạo/hiển thị: bữa tạo ra thì giữ ngôn ngữ lúc tạo, nội dung chuyển khoản dựng lại theo ngôn ngữ người xem. |

### A.4. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
| :-: | :--- |
| **R-1** | Một nguồn duy nhất cho chuỗi: khoá là câu tiếng Việt gốc trong mã (`t('…')`), bản tiếng Anh nằm ở `src/i18n/en.ts`. Test quét mã nguồn: mọi câu `t()`/`T()` phải có bản dịch `en`, không có khoá thừa, và bản dịch giữ đúng các tham số `{…}`. |
| **R-2** | Khi thiếu bản dịch lúc chạy, dùng bản `vi` rồi mới tới tên khoá; không bao giờ hiển thị trống. |
| **R-3** | Công tắc ngôn ngữ hoạt động bằng bàn phím và có nhãn đọc được bằng trình đọc màn hình; vùng chạm $\ge 44\text{ px}$. |
| **R-4** | Đổi ngôn ngữ không làm đổi số liệu: mọi phép tính tiền, chia tiền và quyết toán cho kết quả y hệt ở cả hai ngôn ngữ. |
| **R-5** | Snapshot vẫn giữ tính chỉ đọc và không phụ thuộc server: ngôn ngữ chỉ là tham số hiển thị, không thay đổi dữ liệu bữa trong payload. Duy nhất `settings.language` được ghi (Epic 8 BR-8.3 vẫn đúng với dữ liệu bữa). |
| **R-6** | Thêm tham số `l` vào link không được làm link dài thêm đáng kể (tối đa vài ký tự) và không đổi định dạng nén đã phát hành. |

### A.5. Tiêu chí nghiệm thu (nghiệp vụ)

- [x] AC-1: Công tắc ngôn ngữ trên ứng dụng chính đổi toàn bộ màn hình (danh sách bữa, chi tiết bữa, kèo, hoá đơn, món, quyết toán, hộp thoại, thông báo lỗi) giữa `vi` và `en` ngay lập tức, không còn chuỗi tiếng Việt sót lại khi chọn `en` và ngược lại. *(BR-9.1, BR-9.2)* **Đạt (`App.i18n.test`: đổi tiêu đề, nút, `<html lang>`; trình duyệt 375 px: duyệt bốn bước của bữa ở `en` không còn ký tự tiếng Việt).**
- [x] AC-2: Tên ứng dụng đổi theo ngôn ngữ ở thanh đầu trang và `<title>`. *(BR-9.3)* **Đạt (`App.i18n.test`).**
- [x] AC-3: Tải lại trang giữ nguyên ngôn ngữ đã chọn; lần mở đầu tiên theo ngôn ngữ trình duyệt. *(BR-9.4)* **Đạt (`i18n.test`: thứ tự ưu tiên, ghi nhớ).**
- [x] AC-4: Ngày và dấu phân cách số theo đúng ngôn ngữ; số tiền không đổi giá trị. *(BR-9.5, R-4)* **Đạt (`money`/`dates` theo locale; mọi test tính tiền cũ vẫn đạt).**
- [x] AC-5: Tin nhắn thanh toán sinh đúng ngôn ngữ đã chọn, đúng cấu trúc dòng, link Snapshot đi kèm. *(BR-9.6)* **Đạt (`shareSnapshot.test` thêm ca `en`).**
- [x] AC-6: Trang Snapshot có công tắc ngôn ngữ; đổi ngôn ngữ làm toàn bộ nội dung (kể cả quyết toán, giải trình) đổi theo mà không ghi gì vào IndexedDB. *(BR-9.7, R-5)* **Đạt (`App.i18n.test`: đổi ngôn ngữ ở trang Snapshot, IndexedDB không có bữa nào).**
- [x] AC-7: Link Snapshot mới mở ra đúng ngôn ngữ người gửi; link cũ (không có `l`) vẫn mở được. *(BR-9.8)* **Đạt (`App.i18n.test`: tham số `l`; link cũ không có `l` vẫn mở).**
- [x] AC-8: Tên bữa, tên người, tên món… không bị dịch; "Tôi"/"Me" và tên kèo mặc định đổi theo ngôn ngữ. *(BR-9.9)* **Đạt (`App.i18n.test`: "Tôi"/"Me", tên tự đặt giữ nguyên).**
- [x] AC-9: Test kiểm hai từ điển cùng tập khoá; toàn bộ test Epic 1–8 vẫn đạt; dùng tốt ở $\le 375\text{ px}$ không cuộn ngang với cả hai ngôn ngữ (chuỗi tiếng Anh dài hơn không vỡ bố cục). *(R-1, R-3)* **Đạt (`i18n.test`; 510 test đạt); chưa kiểm hết các hộp thoại ở 375 px bằng tiếng Anh.**

### A.6. Ngoài phạm vi / câu hỏi mở
- Chỉ 2 ngôn ngữ; kiến trúc để mở rộng ngôn ngữ thứ ba về sau nhưng chưa làm.
- Không dịch tự động dữ liệu người dùng nhập, không dịch nội dung OCR hoá đơn.
- Không quy đổi tiền tệ; không đổi định dạng tài khoản/VietQR.
- Đã chốt khi triển khai: tên tiếng Anh "Split Bill"; tin nhắn chia sẻ luôn theo ngôn ngữ giao diện (chưa có ghi đè riêng); danh bạ luôn sắp A–Z theo collator tiếng Việt.
- Văn bản OCR (`tesseract` `vie`+`eng`) giữ nguyên cấu hình, không phụ thuộc ngôn ngữ giao diện.
