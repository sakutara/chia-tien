# Epic 9 — System Analysis (SA)

**Epic 9**: Song ngữ Việt – Anh (i18n) cho toàn bộ ứng dụng & Snapshot · **Trạng thái**: Chưa triển khai (đang ở giai đoạn đặc tả)

Tài liệu đi cùng: [BR](./BR.md) · [Epics & Roadmap](../04-epics-and-roadmap.md) · [Epic 8 SA](../epic-8/SA.md)

---

### B.1. Công nghệ / thư viện sử dụng
- **Không thêm thư viện i18n nặng.** Tự viết lớp mỏng (`src/i18n/`) gồm từ điển TypeScript, `I18nProvider` (React Context) và hook `useT()`; định dạng bằng `Intl.DateTimeFormat` / `Intl.NumberFormat` / `Intl.Collator` có sẵn của trình duyệt.
- Từ điển là object TypeScript lồng khoá, kiểu của `en` được ràng buộc bằng kiểu của `vi` (`satisfies`/`Record`) để thiếu khoá là lỗi biên dịch.
- Lưu lựa chọn: bảng `settings` (Dexie) khoá `language`; Snapshot không ghi DB nên dùng `localStorage` (bọc try/catch) cho lựa chọn của người nhận.

### B.2. Cấu trúc mã nguồn
```text
app/src/i18n/
├─ dictionaries/vi.ts        # nguồn gốc, định nghĩa tập khoá
├─ dictionaries/en.ts        # phải đủ khoá của vi
├─ I18nProvider.tsx          # Context: lang, setLang, t(), formatters
├─ useT.ts                   # hook trả về { t, lang, fmt }
├─ detectLanguage.ts         # ưu tiên: đã lưu > ?l= > navigator.language
├─ format.ts                 # formatMoney/formatDate/collator theo lang
└─ i18n.test.ts              # cùng tập khoá, nội suy, fallback, detect
app/src/components/ui/LanguageSwitch.tsx   # công tắc dùng ở app và Snapshot
```
Sửa: `lib/money.ts` (nhận `lang`), `lib/dates.ts`, `domain/shareSnapshot.ts` (`formatShareMessage` nhận `lang`), `domain/memberFilter.ts` (collator theo locale), `domain/paymentSlides.ts` (nhãn bước), `pages/SnapshotViewerPage.tsx`, `components/share/*`, `App.tsx`, `index.html`, manifest PWA, toàn bộ component có chuỗi cứng.

### B.3. Thành phần & trách nhiệm
| Thành phần | Trách nhiệm |
| :--- | :--- |
| `I18nProvider` | Giữ `lang`, nạp lựa chọn đã lưu, cập nhật `document.documentElement.lang` và `document.title`, cung cấp `t`. |
| `t(key, params?)` | Tra từ điển theo khoá dạng `scope.name`, nội suy `{name}`; fallback `vi` rồi tên khoá (R-2). Số nhiều qua khoá riêng (`items.one` / `items.other`) bằng `Intl.PluralRules`. |
| `LanguageSwitch` | Công tắc `role="switch"` hai trạng thái VI/EN, dùng chung cho app chính và Snapshot. |
| `detectLanguage` | Hàm thuần theo BR-9.4/9.8, dễ kiểm. |
| Domain thuần (`formatShareMessage`…) | **Không** import React/Context: nhận `lang` hoặc bộ chuỗi làm tham số để giữ test thuần. |

### B.4. Thiết kế dữ liệu
- `AppSettings` thêm trường `language?: 'vi' | 'en'` (không cần migration schema Dexie vì `settings` khoá theo `id`; `normalize` đặt mặc định khi thiếu).
- **Giá trị mặc định do hệ thống sinh** (BR-9.9): không lưu chuỗi đã dịch nữa mà lưu dấu hiệu rỗng/cờ rồi hiển thị theo `lang`. Cụ thể: hồ sơ mặc định nhận diện bằng cờ có sẵn (chủ app) và hiển thị `t('profile.me')`; kèo tên mặc định lưu `name: ''` + `orderIndex`, hiển thị `t('session.default', {n})`. Dữ liệu cũ đã lưu "Tôi"/"Kèo 1": `normalize` nhận diện đúng các chuỗi mặc định cũ và coi là mặc định (chuỗi người dùng tự đặt giữ nguyên).
- **Snapshot link**: thêm tham số `l` (`vi`|`en`) cạnh `s`: `…?s=<mã>&l=en`. Không đổi định dạng nhị phân `~` đã phát hành nên link cũ vẫn giải mã (R-6). `MealSnapshotPayload` không đổi.

### B.5. Luồng xử lý chính
1. **Khởi động**: `detectLanguage({ stored, urlParam, navigatorLang })` → `I18nProvider` → đặt `<html lang>`, `<title>`.
2. **Đổi ngôn ngữ (app)**: `setLang` → cập nhật Context (render lại tức thì) → ghi `settings.language`.
3. **Đổi ngôn ngữ (Snapshot)**: `setLang` → Context + `localStorage`; không động tới DB hay URL.
4. **Sinh tin nhắn**: `formatShareMessage(data, { lang })`. Mẫu đề xuất:
   - `vi`: `- An: nợ Bình 50.000 ₫, nợ Cường 20.000 ₫`
   - `en`: `- An: owes Bình ₫50,000, owes Cường ₫20,000`
   - Không có khoản cần chuyển: `vi` `- Tất cả các khoản thanh toán đã hoàn tất.` / `en` `- All payments are settled.`
   Link sinh kèm `&l=<lang của tin nhắn>`.
5. **Mở Snapshot**: giải mã payload như Epic 8, `detectLanguage` với `urlParam = l` (BR-9.8), render toàn bộ trang bằng `useT()`.

### B.6. Giao diện lập trình nội bộ
```ts
type Lang = 'vi' | 'en'
useT(): { t: (key: Key, params?: Record<string, string | number>) => string; lang: Lang; setLang(l: Lang): void; money(n: number): string; date(d: string | Date, style?: 'short' | 'long'): string; collator: Intl.Collator }
detectLanguage(input: { stored?: Lang; urlParam?: string | null; navigatorLang?: string }): Lang
formatShareMessage(input, opts: { lang: Lang; onlyUnpaid?: boolean }): string
buildSnapshotUrl(payload, opts?: { lang?: Lang }): string   // thêm &l=
```
`Key` suy ra từ kiểu của `vi` để IDE gợi ý và thiếu khoá là lỗi biên dịch.

### B.7. Yêu cầu phi chức năng
- Bundle: hai từ điển nạp tĩnh (nhỏ); nếu về sau thêm ngôn ngữ thì tách `import()` động. Không tăng đáng kể kích thước link Snapshot.
- Không nháy giao diện khi khởi động: đọc ngôn ngữ đã lưu trước lần render đầu (đọc đồng bộ từ `localStorage` bản sao, đồng bộ lại vào `settings`).
- Hiển thị: chuỗi tiếng Anh dài hơn; mọi nút/chip phải co giãn, không cắt chữ ở 375 px.

### B.8. Rủi ro & hạn chế đã biết
- **Khối lượng**: toàn bộ chuỗi cứng rải khắp component — nên làm theo từng nhóm màn hình (xem B.10), mỗi nhóm có test đổi ngôn ngữ.
- **Dữ liệu mặc định đã lưu** (“Tôi”, “Kèo n”) cần `normalize` nhận diện đúng, tránh biến tên người dùng tự đặt thành mặc định.
- **Link Snapshot ngoài đời** do người gửi dùng ngôn ngữ nào cũng phải mở được: tham số `l` tuỳ chọn, bỏ trống thì rơi về `navigator.language`.
- **Từ điển deflate đã đóng băng** của Snapshot chứa từ tiếng Việt: giữ nguyên; không ảnh hưởng ngôn ngữ giao diện.
- Sắp xếp A–Z dùng collator `vi` chuẩn tiếng Việt; với `en` dùng collator `en` nhưng tên người Việt vẫn nên sắp theo `vi` để nhất quán danh bạ — **chốt**: danh bạ luôn dùng collator `vi` bất kể ngôn ngữ giao diện.

### B.9. Ma trận truy vết kiểm thử
| Kiểm thử | Phủ |
| :--- | :--- |
| `i18n.test`: tập khoá `vi` = `en`; nội suy; plural; fallback | R-1, R-2, AC-9 |
| `i18n.test`: `detectLanguage` đủ tổ hợp ưu tiên | BR-9.4, BR-9.8, AC-3, AC-7 |
| `shareSnapshot.test`: tin nhắn `vi`/`en` đúng mẫu; link có `l` | BR-9.6, AC-5 |
| `money`/`dates` test theo locale; giá trị không đổi | BR-9.5, R-4, AC-4 |
| `SnapshotViewerPage.test`: đổi ngôn ngữ, không ghi IndexedDB | BR-9.7, R-5, AC-6 |
| `normalize.test`: nhận diện “Tôi”/“Kèo n” cũ | BR-9.9, AC-8 |
| Test app: bật `en`, không còn ký tự có dấu tiếng Việt trong DOM giao diện (trừ dữ liệu nhập) | AC-1, BR-9.2 |
| Kiểm trình duyệt 375 px, cả hai ngôn ngữ | AC-9 |

### B.10. Kế hoạch triển khai đề xuất
1. Hạ tầng `src/i18n/` + `LanguageSwitch` + `detectLanguage` + test từ điển.
2. Định dạng: tiền, ngày, collator theo `lang`.
3. Chuyển chuỗi theo nhóm: khung app & tên app → danh sách/lịch bữa → người & nhóm → kèo/hoá đơn/món/OCR → quyết toán → chia sẻ.
4. Giá trị mặc định + `normalize` (BR-9.9).
5. Tin nhắn chia sẻ & tham số `l` của link.
6. Trang Snapshot: công tắc, ưu tiên ngôn ngữ, bảng quyết toán/giải trình.
7. Kiểm `en` toàn bộ trên 375 px; cập nhật tài liệu 01/02/03.
