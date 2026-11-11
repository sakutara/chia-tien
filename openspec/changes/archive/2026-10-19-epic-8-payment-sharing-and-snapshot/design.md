<!-- Nguyên văn documentation/epic-8/SA.md (System Analysis) tại thời điểm chuyển sang OpenSpec, 2026-11-11. Tài liệu lịch sử: có thể không còn khớp code hiện tại; hành vi hiện hành nằm ở openspec/specs/. -->

# Epic 8 — System Analysis (SA)

**Epic 8**: Chia sẻ Thông báo Thanh toán qua Ứng dụng khác & Custom URL Snapshot (Read-Only) · **Trạng thái**: Đã triển khai (còn kiểm thủ công trên thiết bị thật trước khi đóng)

Tài liệu đi cùng: [BR](./BR.md) · [Kiến trúc & Data model §3.7](../01-architecture-and-data-model.md) · [Nghiệp vụ §8](../02-business-logic-and-algorithms.md) · [UI §4.2, §4.6, §4.7](../03-ui-ux-and-design-system.md) · [Epic 6 SA](../epic-6/SA.md) · [Epic 7 SA](../epic-7/SA.md)

---

### B.1. Công nghệ / thư viện sử dụng
Dùng lại stack hiện có (React 19 · TypeScript · Tailwind CSS · Dexie 4 · `lucide-react` · Vitest + `fake-indexeddb` + jsdom + Testing Library) và **khai báo trực tiếp 1 thư viện đã có sẵn trong `node_modules` và tài liệu kiến trúc ([README §3](../README.md))**:

| Thư viện / Web API | Dùng cho | Ghi chú |
| :--- | :--- | :--- |
| `lz-string` (`^1.5.0`) | Nén và giải nén chuỗi JSON `MealSnapshotPayload` thành chuỗi Base64URL an toàn cho URL (`compressToEncodedURIComponent` / `decompressFromEncodedURIComponent`) | Đã có sẵn kiểu TypeScript đi kèm (`lz-string/typings/lz-string.d.ts`), dung lượng cực nhẹ (~2 KB gzipped), chạy hoàn toàn client-side |
| Web Share API (`navigator.share`) | Mở menu chia sẻ gốc của iOS / Android / macOS để gửi tin nhắn thanh toán sang Zalo, Messenger, Telegram, SMS... | Kiểm tra tính khả dụng tại runtime (`canUseWebShare()`) |
| Clipboard API (`navigator.clipboard.writeText`) | Sao chép 1 chạm toàn bộ tin nhắn hoặc riêng đường dẫn Snapshot URL | Kèm fallback `<textarea>` + `document.execCommand('copy')` nếu ngữ cảnh trình duyệt không cấp quyền `navigator.clipboard` |

### B.2. Cấu trúc mã nguồn

```text
app/
├─ package.json                                # SỬA: khai báo trực tiếp "lz-string": "^1.5.0" trong dependencies
└─ src/
   ├─ types/index.ts                           # SỬA: đồng bộ MealSnapshotPayload với 01-architecture §3.7
   │                                           #   (bổ sung discount*, service*, allocatedDiscountAmount,
   │                                           #   allocatedServiceAmount, orderIndex?, archivedPayerSummary?)
   ├─ db/db.ts                                 # Không đổi (không nâng version schema Dexie)
   ├─ domain/
   │  ├─ shareSnapshot.ts                      # MỚI, THUẦN: buildSnapshotPayload, encodeSnapshotPayload,
   │  │                                        #   decodeSnapshotPayload, buildSnapshotUrl,
   │  │                                        #   hydrateSnapshotForSettlement, formatEntityShareLabel,
   │  │                                        #   formatShareMessage
   │  └─ shareSnapshot.test.ts                 # MỚI: unit test mã hoá/giải mã, kiểm lỗi dữ liệu hỏng,
   │                                           #   định dạng tin nhắn cá nhân & nhóm (<Cá nhân> + <cá nhân>)
   ├─ services/
   │  ├─ snapshotService.ts                    # MỚI: loadMealSnapshotPayload(mealId), shareMessageViaOs,
   │  │                                        #   copyTextToClipboard
   │  ├─ snapshotService.test.ts               # MỚI: test đọc DB tạo snapshot cho cả bữa ACTIVE & ARCHIVED
   │  └─ peopleErrors.ts                       # SỬA: thêm mã INVALID_SNAPSHOT, SHARE_FAILED
   ├─ hooks/
   │  ├─ useHashRoute.ts                       # SỬA: nhận diện tham số ?snapshot=<data> hoặc #/snapshot/<data>
   │  │                                        #   và hỗ trợ exitSnapshot() xoá ?snapshot về #/
   │  └─ viewHooks.test.ts                     # SỬA: thêm test parseRoute với snapshot URL
   ├─ components/
   │  └─ share/
   │     ├─ ShareMealDialog.tsx                # MỚI: hộp thoại xem trước tin nhắn, lọc khoản chưa trả,
   │     │                                     #   gửi qua ứng dụng khác & sao chép nhanh (UI §4.6)
   │     ├─ SnapshotBanner.tsx                 # MỚI: thanh trạng thái "👁️ CHẾ ĐỘ XEM SNAPSHOT (CHỈ ĐỌC)"
   │     │                                     #   + nút "🏠 Về trang chủ ứng dụng của tôi" (UI §4.7)
   │     └─ ShareMealDialog.test.tsx           # MỚI: test hộp thoại chia sẻ, Web Share API & Clipboard
   ├─ pages/
   │  ├─ SnapshotViewerPage.tsx                # MỚI: màn hình xem Snapshot chỉ đọc (hoàn toàn tách biệt DB)
   │  ├─ SnapshotViewerPage.test.tsx           # MỚI: test hiển thị 3 tầng chỉ đọc & xử lý link hỏng
   │  └─ MealWorkspacePage.tsx                 # SỬA: gắn nút "📤 Chia sẻ thông báo thanh toán" &
   │                                           #   "🔗 Sao chép Link Snapshot" vào Khu vực 3 (SettlementPanel)
   └─ App.tsx                                  # SỬA: điều hướng sang SnapshotViewerPage khi route là snapshot
```

### B.3. Thành phần & trách nhiệm

| Thành phần | Trách nhiệm | Phụ thuộc |
| :--- | :--- | :--- |
| `domain/shareSnapshot` | Toàn bộ hàm thuần: dựng `MealSnapshotPayload` từ dữ liệu bữa (`buildSnapshotPayload`), nén/giải nén bằng `lz-string` kèm kiểm tra schema an toàn (`encodeSnapshotPayload`, `decodeSnapshotPayload`), chuyển đổi `MealSnapshotPayload` thành đầu vào cho `computeMealSettlement` (`hydrateSnapshotForSettlement`), và định dạng bản tin thông báo thanh toán chuẩn (`formatEntityShareLabel`, `formatShareMessage`). **Không chạm DB/DOM** | `lz-string`, `domain/settlementEngine`, `lib/money`, `services/peopleErrors`, `types` |
| `services/snapshotService` | Đọc `meal`, `members`, `sessions`, `invoices`, `items` của một `mealId` từ IndexedDB để tạo `MealSnapshotPayload` & URL (`loadMealSnapshotPayload`); bọc lời gọi `navigator.share` (`shareMessageViaOs`) và `navigator.clipboard` (`copyTextToClipboard`) | `db`, `domain/shareSnapshot`, `services/peopleErrors` |
| `hooks/useHashRoute` | Phát hiện `?snapshot=<encoded>` trên `window.location.search` hoặc `#/snapshot/<encoded>` trên `window.location.hash` để trả về route `{ name: 'snapshot', encoded: string }`; cung cấp hàm `exitSnapshot()` xoá `?snapshot` bằng `history.replaceState` và điều hướng về `#/` | Không |
| `components/share/ShareMealDialog` | Hiển thị hộp thoại chia sẻ (UI §4.6): khung xem trước tin nhắn, tuỳ chọn lọc "Chỉ hiện người chưa thanh toán", nút "📲 Chia sẻ qua ứng dụng khác", nút "📋 Sao chép toàn bộ tin nhắn" và nút "🔗 Chỉ sao chép Link Snapshot" | `Modal`, `domain/shareSnapshot`, `services/snapshotService` |
| `pages/SnapshotViewerPage` | Giải mã `encoded` từ URL; nếu lỗi thì hiển thị thông báo lỗi kèm nút về trang chủ (BR-8.4); nếu hợp lệ thì hiển thị `SnapshotBanner` và toàn bộ thông tin Bữa $\rightarrow$ Thành viên/Nhóm $\rightarrow$ Kèo/Hoá đơn/Món $\rightarrow$ Bảng quyết toán ở chế độ `readOnly = true` tuyệt đối mà không đọc/ghi IndexedDB (BR-8.2, BR-8.3) | `domain/shareSnapshot`, `domain/settlementEngine`, `SnapshotBanner`, `SettlementPanel` |

### B.4. Thiết kế dữ liệu

**Không đổi schema IndexedDB, không nâng version Dexie.**
Đồng bộ hoá interface `MealSnapshotPayload` trong `app/src/types/index.ts` cho khớp hoàn toàn với [01-architecture-and-data-model.md §3.7](../01-architecture-and-data-model.md) (bổ sung các trường giảm giá, phí phục vụ và thứ tự món đã thêm từ Epic 4, cùng `representativeId` và `archivedPayerSummary`):

```typescript
export interface MealSnapshotPayload {
  v: 1;
  exportedAt: string;
  meal: {
    title: string;
    date: string;
    note?: string;
    status: MealStatus;
    settlementMode: SettlementMode;
    hostMemberId: string;
  };
  members: Array<{
    id: string;
    name: string;
    avatarColor: string;
  }>;
  paymentGroups: Array<{
    id: string;
    name: string;
    memberIds: string[];
    representativeId?: string;
  }>;
  sessions: Array<{
    id: string;
    name: string;
    orderIndex: number;
    participantIds: string[];
    archivedTotalAmount?: number;
    archivedPayerSummary?: Array<{
      memberId: string;
      paidAmount: number;
    }>;
    invoices: Array<{
      id: string;
      vendorName?: string;
      invoiceDate?: string;
      payerMemberId: string;
      inputMode: InvoiceInputMode;
      splitType: InvoiceSplitType;
      equalSplitParticipantIds: string[];
      subtotalAmount: number;
      discountMode: AdjustmentMode;
      discountValue: number;
      discountAmount: number;
      serviceMode: AdjustmentMode;
      serviceValue: number;
      serviceAmount: number;
      vatMode: VatMode;
      vatValue: number;
      vatAmount: number;
      totalAmount: number;
      items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        rawAmount: number;
        allocatedDiscountAmount: number;
        allocatedServiceAmount: number;
        allocatedVatAmount: number;
        finalAmount: number;
        orderIndex?: number;
        consumers: ItemShare[];
      }>;
    }>;
  }>;
  settlementStatuses: Record<string, {
    isPaid: boolean;
    paidAt?: string;
  }>;
  archivedSummary?: ArchivedMealSummary;
}
```

> [!NOTE]
> **Tương thích ngược khi giải mã (`decodeSnapshotPayload`)**: Nếu một payload `v: 1` thiếu các trường tuỳ chọn như `discountMode` hoặc `serviceMode`, bộ giải mã tự động gán giá trị mặc định an toàn (`'NONE'`, `0`) để không báo lỗi giả.

### B.5. Luồng xử lý chính

**5.1. Tạo Snapshot URL, Định dạng Tin nhắn & Chia sẻ (US-8.1, US-8.3, US-8.4)**
```mermaid
sequenceDiagram
    participant U as Người dùng (Chủ trì)
    participant W as MealWorkspacePage / SettlementPanel
    participant D as ShareMealDialog
    participant S as snapshotService
    participant M as domain/shareSnapshot
    participant OS as Web Share API / Clipboard
    U->>W: Bấm "📤 Chia sẻ thông báo thanh toán"
    W->>D: Mở ShareMealDialog(mealId)
    D->>S: loadMealSnapshotPayload(mealId)
    S->>M: buildSnapshotPayload(...) -> encodeSnapshotPayload(payload)
    M-->>D: snapshotUrl + MealSettlementResult
    D->>M: formatShareMessage({ mealTitle, entities, transfers, snapshotUrl })
    M-->>D: Bản tin định dạng chuẩn (<Tên bữa>, - <Cá nhân>: nợ..., <Link snapshot>)
    alt Bấm "📲 Chia sẻ qua ứng dụng khác"
        U->>D: Click nút Chia sẻ
        D->>S: shareMessageViaOs({ title, text })
        S->>OS: navigator.share({ title, text })
    else Bấm "📋 Sao chép toàn bộ tin nhắn" / "🔗 Chỉ sao chép Link"
        U->>D: Click nút Sao chép
        D->>S: copyTextToClipboard(text)
        S->>OS: navigator.clipboard.writeText(text)
        D-->>U: Hiển thị "✓ Đã sao chép!"
    end
```

**5.2. Mở Custom URL Snapshot ở Chế độ Chỉ Đọc (US-8.2)**
```mermaid
flowchart TD
    A["Người nhận mở link ?snapshot=<encoded>\nhoặc #/snapshot/<encoded>"] --> B["useHashRoute phát hiện route.name === 'snapshot'"]
    B --> C["App.tsx render SnapshotViewerPage(encoded)\n(Không ghi dữ liệu vào IndexedDB cá nhân)"]
    C --> D["decodeSnapshotPayload(encoded)"]
    D --> E{"Payload hợp lệ?"}
    E -- "Không (cắt cụt / lỗi)" --> F["Hiển thị Card cảnh báo lỗi thân thiện\n+ Nút '🏠 Về trang chủ ứng dụng của tôi'"]
    E -- "Có (v === 1)" --> G["hydrateSnapshotForSettlement(payload)\n-> computeMealSettlement(...)"]
    G --> H["Hiển thị SnapshotBanner (Chỉ đọc)\n+ Thông tin Bữa + Thành viên & Nhóm\n+ Kèo -> Hoá đơn -> Món (readOnly = true)\n+ Bảng Quyết Toán (readOnly = true)"]
    H --> I["Người dùng bấm '🏠 Về trang chủ ứng dụng của tôi'"]
    I --> J["exitSnapshot(): history.replaceState xoá ?snapshot\nvà mở lại danh sách bữa cá nhân (#/)"]
```

### B.6. Giao diện lập trình nội bộ

**Mã lỗi bổ sung vào `services/peopleErrors.ts`**:

| `code` | Khi nào ném |
| :--- | :--- |
| `INVALID_SNAPSHOT` | Chuỗi `?snapshot=` rỗng, không giải nén được bằng `lz-string`, lỗi JSON, sai `v !== 1`, hoặc thiếu trường bắt buộc (R-2, BR-8.4) |
| `SHARE_FAILED` | Không thể chia sẻ hoặc sao chép vào Clipboard |

**`domain/shareSnapshot.ts` (Hàm thuần)**:

```ts
/** Đóng gói toàn bộ dữ liệu 1 bữa (bỏ ảnh nhị phân) thành MealSnapshotPayload (R-1). */
export function buildSnapshotPayload(
  input: SettlementEngineInput & { exportedAt?: string },
): MealSnapshotPayload;

/** Nén MealSnapshotPayload thành chuỗi Base64URL bằng LZString.compressToEncodedURIComponent (R-2). */
export function encodeSnapshotPayload(payload: MealSnapshotPayload): string;

/** Giải nén và kiểm tra tính hợp lệ của chuỗi snapshot; ném PeopleError('INVALID_SNAPSHOT') nếu hỏng (R-2). */
export function decodeSnapshotPayload(encoded: string): MealSnapshotPayload;

/** Tạo đường dẫn Custom URL đầy đủ chứa ?snapshot=<encoded> (R-2). */
export function buildSnapshotUrl(
  payload: MealSnapshotPayload,
  baseLocation?: Pick<Location, 'origin' | 'pathname'>,
): string;

/** Chuyển đổi MealSnapshotPayload thành dữ liệu đầu vào trong bộ nhớ để tái sử dụng computeMealSettlement và UI. */
export function hydrateSnapshotForSettlement(payload: MealSnapshotPayload): SettlementEngineInput;

/**
 * Hiển thị tên thực thể theo chuẩn tin nhắn chia sẻ (R-3):
 * - Cá nhân: "<Tên>"
 * - Nhóm thanh toán: "<Cá nhân 1> + <Cá nhân 2> + ..."
 */
export function formatEntityShareLabel(
  entity: Pick<PaymentEntitySettlement, 'entityName' | 'isGroup' | 'memberNames'>,
): string;

export interface FormatShareMessageInput {
  mealTitle: string;
  entities: ReadonlyArray<PaymentEntitySettlement>;
  transfers: ReadonlyArray<SettlementTransfer>;
  snapshotUrl: string;
  /** Nếu true, bỏ qua dòng nợ của những thực thể đã tick isPaid === true (R-4). */
  onlyUnpaid?: boolean;
  /** Map tên người nhận hiển thị khi thực thể nhận là nhóm của chủ trì (R-3). */
  recipientLabelByEntityId?: Record<string, string>;
}

/**
 * Định dạng bản tin thông báo thanh toán chuẩn (US-8.3, R-4):
 * <Tên bữa>
 * - <Cá nhân>: nợ <cá nhân> <số tiền>, nợ <cá nhân> <số tiền>
 * - <Cá nhân> + <cá nhân>: nợ <cá nhân> <số tiền>
 * <Link snapshot>
 */
export function formatShareMessage(input: FormatShareMessageInput): string;
```

**`services/snapshotService.ts`**:

```ts
export interface LoadedMealSnapshot {
  payload: MealSnapshotPayload;
  encoded: string;
  snapshotUrl: string;
  settlement: MealSettlementResult;
}

/** Đọc dữ liệu bữa từ IndexedDB, tạo payload, chuỗi nén, URL và kết quả quyết toán. */
export function loadMealSnapshotPayload(mealId: string): Promise<LoadedMealSnapshot>;

/** Kiểm tra trình duyệt có hỗ trợ Web Share API không. */
export function canUseWebShare(): boolean;

/** Gọi navigator.share; trả về false nếu người dùng tự đóng hộp chia sẻ (AbortError). */
export function shareMessageViaOs(data: { title: string; text: string }): Promise<boolean>;

/** Sao chép văn bản vào Clipboard (navigator.clipboard kèm fallback execCommand). */
export function copyTextToClipboard(text: string): Promise<void>;
```

### B.7. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
| :--- | :--- |
| **Kích thước URL nén** | Với một bữa điển hình (8 thành viên, 3 kèo, 4 hoá đơn, 25 món), chuỗi `encoded` sau khi nén bằng `lz-string` có độ dài khoảng $800 - 1.500\text{ ký tự}$, nằm gọn trong giới hạn URL của mọi trình duyệt hiện hành (Chrome/Safari/Firefox/Edge hỗ trợ $> 32.000\text{ ký tự}$) và các ứng dụng nhắn tin (Zalo, Messenger, Telegram) |
| **Cô lập dữ liệu & Bảo mật** | `decodeSnapshotPayload` kiểm tra nghiêm ngặt kiểu dữ liệu từng trường sau `JSON.parse`; không dùng `eval` hay `dangerouslySetInnerHTML`; không ghi dữ liệu từ URL vào IndexedDB hay `localStorage` |
| **Khả dụng (A11y & Mobile)** | Khung xem trước tin nhắn dùng font dễ đọc, cho phép bôi đen tự do; nút sao chép có thông báo `role="status"` cho trình đọc màn hình; thanh `SnapshotBanner` cố định nổi bật ở đầu trang để người xem luôn biết mình đang ở chế độ chỉ đọc |

### B.8. Rủi ro & hạn chế đã biết

| # | Rủi ro / Hạn chế | Hướng xử lý |
| :-: | :--- | :--- |
| 1 | Một số ứng dụng chat tự ngắt dòng hoặc cắt bớt URL nếu URL chứa ký tự đặc biệt | Sử dụng `LZString.compressToEncodedURIComponent` chỉ sinh các ký tự an toàn trong tập `A-Z`, `a-z`, `0-9`, `+`, `-`, `$` và đặt `<Link snapshot>` nằm riêng biệt trên dòng cuối cùng của tin nhắn |
| 2 | Người dùng mở link `?snapshot=...` rồi bấm nút điều hướng nội bộ trong trang | `useHashRoute` kiểm tra cả `window.location.search` (`?snapshot=`) và `window.location.hash` (`#/snapshot/`); hàm `exitSnapshot()` chủ động dọn sạch `search` bằng `window.history.replaceState(null, '', window.location.pathname + '#/')` rồi phát sự kiện cập nhật route |
| 3 | Bữa rất lớn (ví dụ đi du lịch dài ngày có > 150 món trong 1 bữa) khiến URL dài trên $6.000\text{ ký tự}$ | Hiển thị cảnh báo nhẹ trong `ShareMealDialog` nếu độ dài URL vượt $4.000\text{ ký tự}$ và gợi ý gửi qua ứng dụng chat hỗ trợ tin nhắn dài (Zalo, Telegram) hoặc lưu trữ bữa khi đã quyết toán xong |
| 4 | `navigator.share` hoặc `navigator.clipboard` không khả dụng trong ngữ cảnh HTTP không bảo mật (khi dev qua IP LAN) | `canUseWebShare()` ẩn hoặc chuyển nút chia sẻ hệ thống sang sao chép; `copyTextToClipboard` có fallback tạo `<textarea>` ẩn và `document.execCommand('copy')` |

### B.9. Ma trận truy vết kiểm thử

| User Story | BR | Bài kiểm thử dự kiến | Trạng thái |
| :-: | :-: | :--- | :-: |
| US-8.1 | BR-8.1, BR-8.4 | `shareSnapshot.test.ts`: `buildSnapshotPayload` → `encodeSnapshotPayload` → `decodeSnapshotPayload` khôi phục đúng 100% thông tin bữa `ACTIVE` (có món, giảm giá, phí phục vụ, VAT, nhóm) và bữa `ARCHIVED` (`archivedSummary`) (AC-1); không chứa dữ liệu ảnh `Blob`; ném `INVALID_SNAPSHOT` khi chuỗi rỗng, bị cắt cụt, sai JSON hoặc sai `v` (AC-5). `snapshotService.test.ts`: `loadMealSnapshotPayload` từ DB | Đạt (`shareSnapshot.test`: round-trip, không chứa ảnh, INVALID_SNAPSHOT; `snapshotService.test`: từ DB ACTIVE và ARCHIVED) |
| US-8.2 | BR-8.2, BR-8.3, BR-8.4 | `SnapshotViewerPage.test.tsx` & `viewHooks.test.ts`: mở `?snapshot=<encoded>` và `#/snapshot/<encoded>` hiển thị đúng `SnapshotBanner`, danh sách thành viên, nhóm, kèo, hoá đơn, món và bảng quyết toán (AC-1, AC-6); không có bất kỳ nút thêm/sửa/xoá/tick nào hoạt động và IndexedDB cá nhân vẫn trống (AC-2); link hỏng hiện thông báo lỗi và nút về trang chủ (AC-5) | Đạt (`SnapshotViewerPage.test`; `viewHooks.test`: parseRoute cho ?snapshot= và #/snapshot/) |
| US-8.3 | BR-8.5 | `shareSnapshot.test.ts`: `formatEntityShareLabel` và `formatShareMessage` xuất đúng mẫu `<Tên bữa>`, dòng cá nhân `- Bình: nợ An 150.000 ₫, nợ Phương 80.000 ₫`, dòng nhóm `- Cường + Dung: nợ An 420.000 ₫`, dòng cuối `<Link snapshot>` ở cả chế độ `SELF_SETTLEMENT` và `HOST_MEDIATED`, cùng tuỳ chọn `onlyUnpaid` (AC-3) | Đạt (`shareSnapshot.test`: formatEntityShareLabel, formatShareMessage, hostRecipientLabels) |
| US-8.4 | BR-8.6 | `ShareMealDialog.test.tsx`: mở hộp thoại chia sẻ từ Khu vực 3, kiểm tra nội dung Preview Box, bấm "Chia sẻ qua ứng dụng khác" gọi `navigator.share` (mock), xử lý êm khi `AbortError`, bấm "Sao chép toàn bộ tin nhắn" và "Chỉ sao chép Link Snapshot" ghi đúng vào Clipboard và hiện trạng thái đã sao chép (AC-4) | Đạt bằng mock (`ShareMealDialog.test`) |

### B.10. Việc còn lại để đóng Epic
1. Kiểm chia sẻ qua menu hệ điều hành trên thiết bị thật (iOS/Android) và kiểm sao chép trong ngữ cảnh không HTTPS — **chưa thực hiện** (đã kiểm bằng mock).
2. Kiểm trình duyệt ở 375 px cho hộp thoại chia sẻ (`ShareMealDialog`) — **chưa thực hiện**.

**Lệch so với thiết kế đã ghi nhận khi triển khai**
- `parseRoute(hash, search)` nhận thêm tham số `search`; `?snapshot=` được ưu tiên hơn mọi route khác. `+` trong chuỗi nén được khôi phục vì `URLSearchParams` đổi thành khoảng trắng.
- `exitSnapshot()` phát `hashchange` thủ công vì `history.replaceState` không tự phát sự kiện.
- `ShareMealAction` (nút mở hộp thoại) được gắn vào `actionsSlot` của Khu vực 3 cùng `ArchiveMealAction`.
- `SnapshotViewerPage` tái sử dụng `EntitySettlementRow` (chế độ chỉ đọc), `TransferInstructionList` và `MemberBreakdownDialog`.
- Khi mở link, `App` vẫn chạy `ensureDefaultData()` (ghi hồ sơ "Tôi" mặc định của chính người xem nếu chưa có). Không có dữ liệu từ snapshot nào được ghi vào IndexedDB.
- Dùng `encodeURIComponent` khi đặt chuỗi nén vào `?snapshot=`.

---

## Phụ lục: Business Requirements gốc của Epic 8

Nguyên văn `documentation/epic-8/BR.md` tại thời điểm chuyển sang OpenSpec (2026-11-11). `proposal.md` và các delta spec của change này được chuyển từ tài liệu này.

# Epic 8 — Business Requirements (BR)

**Epic 8**: Chia sẻ Thông báo Thanh toán qua Ứng dụng khác & Custom URL Snapshot (Read-Only) · **Trạng thái**: Đã triển khai (còn kiểm thủ công trên thiết bị thật trước khi đóng)

Tài liệu đi cùng: [SA](./SA.md) · [Epics & Roadmap](../04-epics-and-roadmap.md) · [Kiến trúc & Data model §3.7](../01-architecture-and-data-model.md) · [Nghiệp vụ §8](../02-business-logic-and-algorithms.md) · [UI §4.2, §4.6, §4.7](../03-ui-ux-and-design-system.md) · [Epic 6 BR](../epic-6/BR.md) · [Epic 7 BR](../epic-7/BR.md)

---

### A.1. Bối cảnh & Mục tiêu nghiệp vụ
Sau Epic 1–7, toàn bộ quy trình quản lý Bữa — Kèo — Hoá đơn — Món, tính toán quyết toán và lưu trữ đã hoạt động trọn vẹn trên thiết bị của người chủ trì. Tuy nhiên, vì ứng dụng vận hành 100% Client-side (không có máy chủ lưu trữ trung gian), các thành viên khác trong nhóm bạn chưa có cách xem trực tiếp tờ hoá đơn/bảng chia tiền trên máy của họ, và người chủ trì vẫn phải tự gõ tay tin nhắn đòi tiền gửi vào nhóm chat (Zalo, Messenger, Telegram...).

Epic 8 khép lại lộ trình 8 Epics bằng tính năng **Chia sẻ Thông báo Thanh toán & Custom URL Snapshot (Chỉ đọc)**:

1. **Tạo Custom URL Snapshot không cần Server (`MealSnapshotPayload`)**: Đóng gói toàn bộ dữ liệu 3 tầng của một Bữa (thông tin bữa, thành viên, nhóm thanh toán, kèo, hoá đơn, món, điều chỉnh giảm giá/phí phục vụ/VAT, trạng thái thanh toán, hoặc `archivedSummary`) thành chuỗi nén Base64URL bằng `lz-string` gắn trực tiếp vào đường dẫn URL (`?snapshot=...`).
2. **Giao diện Xem Snapshot Chỉ Đọc (`Read-Only Snapshot Viewer`)**: Khi người nhận mở đường link trên bất kỳ trình duyệt/thiết bị nào, ứng dụng giải mã dữ liệu ngay trên bộ nhớ tạm (tách biệt hoàn toàn với IndexedDB cá nhân của người xem), hiển thị trọn vẹn thông tin bữa từ tổng quan đến từng món và bảng quyết toán, đồng thời **khoá tuyệt đối 100% thao tác chỉnh sửa**.
3. **Định dạng bản tin thông báo thanh toán chuẩn**: Tự động tổng hợp các khoản nợ từ kết quả quyết toán hiện hành của bữa thành văn bản ngắn gọn theo đúng mẫu quy định (gom các khoản nợ của cùng một cá nhân hoặc nhóm `<Cá nhân> + <cá nhân>` trên 1 dòng, kèm Link Snapshot ở dòng cuối).
4. **Chia sẻ qua ứng dụng khác & Sao chép 1 chạm**: Tích hợp **Web Share API (`navigator.share`)** để gửi thẳng bản tin vào Zalo, Messenger, Telegram, iMessage, SMS... kèm nút sao chép nhanh toàn bộ tin nhắn hoặc riêng đường link Snapshot vào Clipboard.

### A.2. Các bên liên quan
| Vai trò | Quan tâm |
| :--- | :--- |
| Tôi (chủ app / Người chủ trì) | Bấm 1 nút ra ngay tin nhắn đòi tiền đúng chuẩn kèm link chi tiết để gửi vào nhóm Zalo/Messenger mà không phải chụp màn hình nhiều tấm |
| Thành viên nhận link Snapshot | Bấm vào link xem được ngay mình ăn những món nào, hoá đơn quán nào, VAT/giảm giá bao nhiêu và cần chuyển cho ai bao nhiêu tiền mà không cần cài đặt hay đăng nhập; không sợ bấm nhầm làm hỏng dữ liệu |
| Người dùng cũng đang dùng app trên máy của họ | Mở link Snapshot của bạn bè gửi không làm ghi đè hay trộn lẫn vào danh sách bữa và danh bạ cá nhân trên máy của mình |

### A.3. Yêu cầu nghiệp vụ (BR)

| Mã | Yêu cầu | Truy vết |
| :-: | :--- | :--- |
| **BR-8.1** | Đóng gói toàn bộ thông tin của 1 Bữa (cả bữa `ACTIVE` lẫn bữa `ARCHIVED`) thành đối tượng `MealSnapshotPayload` (loại bỏ ảnh gốc nhị phân `Blob`), nén bằng `lz-string` (`compressToEncodedURIComponent`) và tạo đường dẫn Custom URL có tham số `?snapshot=<chuỗi_nén>`. | US-8.1, YC#21, 01 §3.7, 02 §8.1 |
| **BR-8.2** | Khi người dùng mở ứng dụng với đường dẫn chứa tham số `?snapshot=...` (hoặc `#/snapshot/...`), tự động giải mã chuỗi thành `MealSnapshotPayload` và hiển thị giao diện **Xem Snapshot Chỉ Đọc (`Read-Only Snapshot Viewer`)** với đầy đủ 3 tầng thông tin (Bữa, Thành viên/Nhóm, Kèo $\rightarrow$ Hoá đơn $\rightarrow$ Món, và Bảng quyết toán). | US-8.1, US-8.2, YC#21, UI §4.7 |
| **BR-8.3** | Trong chế độ **Xem Snapshot Chỉ Đọc**, khoá tuyệt đối 100% thao tác thêm/sửa/xoá dữ liệu (thông tin bữa, thành viên, nhóm, kèo, hoá đơn, món, chế độ quyết toán, tick thanh toán, lưu trữ, xoá bữa), và **không ghi bất kỳ dữ liệu nào từ Snapshot vào IndexedDB** của trình duyệt người mở. Cung cấp thanh trạng thái Snapshot ở đầu trang kèm nút **"Về trang chủ ứng dụng của tôi"** để thoát chế độ xem Snapshot. | US-8.2, YC#21, UI §4.7 |
| **BR-8.4** | Xử lý an toàn khi đường link Snapshot bị cắt cụt, hỏng hoặc sai phiên bản schema: hiển thị màn hình thông báo lỗi thân thiện (*"Link Snapshot không hợp lệ hoặc đã bị cắt bớt khi gửi tin nhắn"*) kèm nút về trang chủ ứng dụng, tuyệt đối không làm trắng trang. | US-8.1, US-8.2 |
| **BR-8.5** | Định dạng nội dung tin nhắn thông báo thanh toán (`formatShareMessage`) theo đúng cấu trúc chuẩn:<br>`<Tên bữa>`<br>`- <Cá nhân>: nợ <cá nhân> <số tiền>, nợ <cá nhân> <số tiền>,...`<br>`- <Cá nhân> + <cá nhân>: ...`<br>`<Link snapshot>` | US-8.3, YC#20, YC#22, 02 §8.2 |
| **BR-8.6** | Xây dựng **Hộp thoại Chia sẻ Thông báo Thanh toán (`ShareMealDialog`)** và nút **"Sao chép Link Snapshot"** ngay tại Khu vực 3 của màn hình chi tiết bữa: hiển thị khung xem trước (Preview Box) toàn bộ tin nhắn, nút **"Chia sẻ qua ứng dụng khác"** (gọi `navigator.share` khi thiết bị hỗ trợ), nút **"Sao chép toàn bộ tin nhắn"** và nút **"Chỉ sao chép Link Snapshot"** vào Clipboard kèm phản hồi trạng thái đã sao chép. | US-8.4, YC#20, 02 §8.3, UI §4.6 |

### A.4. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
| :-: | :--- |
| **R-1** | **Nội dung đóng gói trong `MealSnapshotPayload` (`v: 1`)** ([01 §3.7](../01-architecture-and-data-model.md)):<br>- Chỉ lấy các thành viên thuộc `Meal.participantIds` (hoặc được tham chiếu trong hoá đơn/kèo của bữa), gồm `{ id, name, avatarColor }`.<br>- Lấy toàn bộ `paymentGroups`, `settlementStatuses`, và `archivedSummary` (nếu bữa `ARCHIVED`).<br>- Với mỗi kèo theo thứ tự `orderIndex`: lấy `{ id, name, orderIndex, participantIds, archivedTotalAmount, archivedPayerSummary, invoices }`.<br>- Với mỗi hoá đơn: lấy đầy đủ metadata tiền hàng, giảm giá (`discount*`), phí phục vụ (`service*`), VAT (`vat*`), `totalAmount`, `payerMemberId`, `inputMode`, `splitType`, `equalSplitParticipantIds`, và mảng `items` (theo `orderIndex`).<br>- **Tuyệt đối không đưa dữ liệu ảnh (`Blob`, `opfsPath`, `ocrRawText`) vào payload** để giữ chiều dài URL nhỏ gọn, tương thích với giới hạn độ dài tin nhắn của Zalo/Messenger/Telegram. |
| **R-2** | **Mã hoá & Giải mã URL (`encodeSnapshotUrl` / `decodeSnapshotPayload`)**:<br>- Chuỗi JSON của `MealSnapshotPayload` được nén bằng `LZString.compressToEncodedURIComponent(json)`.<br>- URL chuẩn được tạo theo công thức: `${origin}${pathname}?snapshot=${encoded}` (giữ nguyên đường dẫn gốc khi triển khai trên sub-path).<br>- Khi giải mã: dùng `LZString.decompressFromEncodedURIComponent(encoded)` rồi `JSON.parse`. Kiểm tra tính hợp lệ của cấu trúc (`payload.v === 1`, có `meal.title`, `meal.date`, mảng `members`, `sessions`, v.v.). Nếu giải nén trả về `null`, lỗi cú pháp JSON hoặc thiếu trường bắt buộc thì ném `INVALID_SNAPSHOT` (BR-8.4). |
| **R-3** | **Quy tắc hiển thị tên Thực thể trong tin nhắn chia sẻ (`formatEntityShareLabel`)** ([02 §8.2](../02-business-logic-and-algorithms.md)):<br>- **Cá nhân lẻ (`isGroup === false`)**: hiển thị trực tiếp `<Tên cá nhân>` (VD: `Bình`).<br>- **Nhóm thanh toán (`isGroup === true`)**: hiển thị tên các thành viên trong nhóm nối với nhau bằng chuỗi `' + '` theo đúng quy ước `<Cá nhân> + <cá nhân>` (VD: `Cường + Dung` hoặc `An + Bình + Em`), lấy theo thứ tự `memberNames` của nhóm.<br>- Khi người nhận tiền (`toEntity`) trong chế độ `HOST_MEDIATED` là một Nhóm thanh toán chứa Người chủ trì, tên người nhận hiển thị tên cá nhân của **Người chủ trì** (hoặc đại diện nhóm `representativeId`) để người chuyển khoản biết chính xác cá nhân nào đứng ra nhận tiền; đối với thực thể đứng ở đầu dòng nợ (`fromEntity`), luôn dùng `<Cá nhân>` hoặc `<Cá nhân> + <cá nhân>`. |
| **R-4** | **Quy tắc gom dòng nợ và định dạng số tiền trong tin nhắn chia sẻ (`formatShareMessage`)** ([02 §8.2](../02-business-logic-and-algorithms.md)):<br>- Dòng đầu tiên luôn là `<Tên bữa>` (`meal.title`).<br>- Duyệt danh sách các Thực thể thanh toán theo thứ tự xuất hiện trong bảng quyết toán: với mỗi thực thể $E$ có ít nhất một khoản chuyển tiền đi (`transfers` có `fromEntityId === E.entityId` và `amount > 0`), gom tất cả các khoản phải trả của $E$ lên **cùng một dòng duy nhất**, ngăn cách bởi dấu phẩy và khoảng trắng `', '` theo mẫu:<br>  `- <Tên hiển thị của E>: nợ <Tên người nhận 1> <formatMoney(A_1)>, nợ <Tên người nhận 2> <formatMoney(A_2)>`<br>- Mặc định liệt kê toàn bộ các khoản chuyển tiền của bữa; cung cấp thêm tuỳ chọn bật/tắt **"Chỉ liệt kê khoản chưa thanh toán"** ngay trong hộp thoại Chia sẻ (khi bật: bỏ qua các thực thể $E$ đã được tick `isPaid === true`, rất hữu ích khi nhắc nợ những người còn lại).<br>- Nếu bữa không có khoản nợ nào cần chuyển (hoặc tất cả đã thanh toán khi bật lọc), dòng thân hiển thị `- Tất cả các khoản thanh toán đã hoàn tất.`<br>- Dòng cuối cùng luôn là `<Link snapshot>` đầy đủ. |
| **R-5** | **Hành vi Web Share API & Clipboard Fallback** ([02 §8.3](../02-business-logic-and-algorithms.md)):<br>- Kiểm tra `typeof navigator.share === 'function'`. Khi người dùng bấm **"Chia sẻ qua ứng dụng khác"**, gọi `navigator.share({ title: meal.title, text: formattedMessage })`. Nếu người dùng đóng menu chia sẻ của hệ điều hành (`AbortError`), bỏ qua êm thấm không báo lỗi.<br>- Trên trình duyệt máy tính không hỗ trợ `navigator.share`, nút "Sao chép toàn bộ tin nhắn" đóng vai trò CTA chính; khi bấm sao chép (`navigator.clipboard.writeText`), nút đổi nhãn sang `"✓ Đã sao chép"` trong 2 giây. |
| **R-6** | **Cô lập tuyệt đối Chế độ Xem Snapshot (`Strict Read-Only Isolation`)**:<br>- Khi ứng dụng khởi chạy với `?snapshot=...` (hoặc `#/snapshot/...`), component gốc `App.tsx` ưu tiên hiển thị `SnapshotViewerPage` thay vì `MealsPage` / `MealWorkspacePage`.<br>- `SnapshotViewerPage` tính toán bảng quyết toán trực tiếp từ `MealSnapshotPayload` bằng hàm thuần `computeMealSettlement` (Epic 6) mà **không mở kết nối ghi vào IndexedDB**. Người xem vẫn có thể bấm mở rộng/thu gọn kèo và bấm xem bảng giải trình chi tiết (`MemberBreakdownDialog` chỉ đọc) để kiểm tra món mình ăn.<br>- Khi bấm **"Về trang chủ ứng dụng của tôi"**, ứng dụng xoá tham số `?snapshot` khỏi thanh địa chỉ (`window.history.replaceState`) và đưa người dùng về màn hình danh sách bữa cá nhân (`#/`). |

### A.5. Tiêu chí nghiệm thu (nghiệp vụ)

Bốn tiêu chí đầu lấy từ [04 — Epic 8](../04-epics-and-roadmap.md); các tiêu chí sau do BR/SA bổ sung.

- [x] AC-1: Custom URL Snapshot mở được trên bất kỳ trình duyệt/thiết bị nào và hiển thị trọn vẹn thông tin bữa (cả bữa `ACTIVE` có chi tiết món lẫn bữa `ARCHIVED` đã chốt sổ) mà không cần backend server. *(BR-8.1, BR-8.2, R-1, R-2)* **Đạt (`snapshotService.test`, `shareSnapshot.test`); kiểm trình duyệt 375 px với snapshot bữa đang hoạt động.**
- [x] AC-2: Người mở link Snapshot hoàn toàn không thể sửa đổi bất kỳ dữ liệu nào của bữa đó (ẩn/khoá 100% thao tác thêm/sửa/xoá/tick), và dữ liệu Snapshot không làm thay đổi hay ghi vào IndexedDB cá nhân của người mở. *(BR-8.3, R-6)* **Đạt (`SnapshotViewerPage.test`: không có nút sửa; IndexedDB không có bữa nào sau khi mở).**
- [x] AC-3: Nội dung chia sẻ tuân thủ chính xác định dạng: dòng đầu `<Tên bữa>`, các dòng cá nhân `- <Cá nhân>: nợ <cá nhân> <số tiền>, nợ <cá nhân> <số tiền>`, các dòng nhóm thanh toán `- <Cá nhân> + <cá nhân>: nợ ...`, và dòng cuối là `<Link snapshot>`. *(BR-8.5, R-3, R-4)* **Đạt (`shareSnapshot.test`: định dạng dòng cá nhân, dòng nhóm, link cuối, onlyUnpaid).**
- [x] AC-4: Gửi được trực tiếp qua các ứng dụng khác (Zalo, Messenger, Telegram, Tin nhắn...) thông qua menu chia sẻ của thiết bị (`navigator.share`) hoặc sao chép 1 chạm vào Clipboard. *(BR-8.6, R-5)* **Đạt bằng mock (`ShareMealDialog.test`: `navigator.share`, Clipboard, AbortError); chưa kiểm trên thiết bị thật.**
- [x] AC-5: Link Snapshot bị hỏng, rỗng hoặc bị cắt cụt khi dán được bắt lỗi an toàn, hiển thị thông báo rõ ràng kèm nút "Về trang chủ ứng dụng của tôi", không làm crash ứng dụng. *(BR-8.4, R-2)* **Đạt (`shareSnapshot.test`: cắt cụt, rỗng, sai `v`; `SnapshotViewerPage.test`: thông báo và nút về trang chủ).**
- [x] AC-6: Trong chế độ xem Snapshot, người nhận vẫn xem được đầy đủ chi tiết từng kèo, từng hoá đơn, từng món (kèm giảm giá/phí phục vụ/VAT, ai ứng, ai ăn mấy phần) và mở xem được giải trình chi tiết của mình ở chế độ chỉ đọc. *(BR-8.2, R-6)* **Đạt (`SnapshotViewerPage.test`: mở giải trình; trình duyệt hiển thị đủ kèo, món, quyết toán).**
- [x] AC-7: Dùng tốt trên màn hình $\le 375\text{ px}$ không cuộn ngang, mọi nút chạm $\ge 44\text{ px}$, điều khiển được bằng bàn phím; toàn bộ test Epic 1–7 vẫn đạt. *(phi chức năng & hồi quy)* **Đạt một phần: snapshot không cuộn ngang ở 375 px (đã kiểm trên trình duyệt); màn chia sẻ chưa kiểm ở 375 px.**

### A.6. Ngoài phạm vi
- Rút gọn link bằng dịch vụ bên thứ ba (Bitly, TinyURL...) cần gọi mạng và API key (trái với kiến trúc 100% Client-side Offline-first).
- Nhập (Import) dữ liệu từ Snapshot URL vào IndexedDB cá nhân để chỉnh sửa tiếp (yêu cầu YC#21 quy định rõ: người mở snapshot chỉ xem, không thể thay đổi thông tin bữa đó).
- Đính kèm file ảnh hoá đơn gốc vào trong chuỗi URL Snapshot (do ảnh nhị phân làm URL dài hàng trăm nghìn ký tự, vượt quá giới hạn của trình duyệt và ứng dụng chat).
- Đồng bộ hai chiều thời gian thực sau khi link đã gửi (mỗi link Snapshot là bản chụp tại thời điểm tạo link; nếu chủ trì sửa lại bill hoặc tick thêm người thanh toán thì gửi link mới).
