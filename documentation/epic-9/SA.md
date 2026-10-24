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
