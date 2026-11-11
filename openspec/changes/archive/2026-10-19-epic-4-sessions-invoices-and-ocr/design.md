<!-- Nguyên văn documentation/epic-4/SA.md (System Analysis) tại thời điểm chuyển sang OpenSpec, 2026-11-11. Tài liệu lịch sử: có thể không còn khớp code hiện tại; hành vi hiện hành nằm ở openspec/specs/. -->

# Epic 4 — System Analysis (SA)

**Epic 4**: Quản lý Kèo (Tầng 2), File Hoá đơn & Nhận diện OCR + VAT (kèm Phí phục vụ, Giảm giá, Nén ảnh) · **Trạng thái**: đã triển khai (code tại `app/`); 301 test tự động đạt, build và lint sạch; kiểm trên trình duyệt xem B.10

Tài liệu đi cùng: [BR](./BR.md) · [Kiến trúc & Data model](../01-architecture-and-data-model.md) · [Nghiệp vụ](../02-business-logic-and-algorithms.md) · [UI §4.2, §4.4](../03-ui-ux-and-design-system.md) · [Epic 3 SA](../epic-3/SA.md)

---

### B.1. Công nghệ
Dùng lại stack hiện có (React 19 · TS · Tailwind · Dexie 4 · lucide-react · Vitest + fake-indexeddb + jsdom + Testing Library). **Thêm đúng một thư viện**:

| Thư viện | Dùng cho | Ghi chú |
| :--- | :--- | :--- |
| `tesseract.js` (v5+) | OCR trong Web Worker | Nạp **lazy** (`import()` lúc bấm quét lần đầu) để không làm nặng bundle chính. `workerPath`, `corePath`, `langPath` trỏ tới file nằm trong `public/ocr/` (xem B.8-1) để chạy offline thật. |

Không thêm thư viện ảnh, form hay state: tiền xử lý OCR **và nén ảnh khi lưu** đều dùng Canvas API gốc (`createImageBitmap` + `canvas.toBlob('image/jpeg', q)`); form dùng `useState` như các dialog Epic 2–3. Camera dùng `<input type="file" accept="image/*" capture="environment">`; modal camera WebRTC (`getUserMedia`) làm sau bước nền (xem B.9-2, câu hỏi Q-2).

**Không nâng version schema Dexie**: các index cần thiết đã có (`sessions: mealId,orderIndex`; `invoices: mealId,sessionId`; `items: mealId,sessionId,invoiceId`; `invoice_files: mealId,sessionId,invoiceId`), và các trường mới (B.4) không cần index. **Có đổi interface** `Invoice` và `InvoiceItem` để chứa giảm giá/phí phục vụ (B.4); vì chưa có bản ghi thật nào nên không cần di trú dữ liệu.

### B.2. Cấu trúc mã nguồn

```text
app/
├─ public/ocr/                          # MỚI: worker + core wasm + vie/eng traineddata (chạy offline)
└─ src/
   ├─ lib/
   │  ├─ money.ts                       # THÊM parseMoney ("45k", "45.000" → 45000 | null), formatBytes
   │  ├─ imagePreprocess.ts             # MỚI: grayscale, contrast stretch, resize về 2800px (Canvas) cho OCR
   │  └─ imageCompress.ts               # MỚI: decode + vẽ lại + toBlob JPEG theo kế hoạch nén (Canvas)
   ├─ domain/                           # TOÀN HÀM THUẦN, có test riêng
   │  ├─ sessionRules.ts                # MỚI: cleanSessionName, defaultSessionName, isDefaultSessionName, vendorSessionName, reorder, normalizeParticipants
   │  ├─ billMath.ts                    # MỚI: computeAdjustment, allocateProportional (phần dư lớn nhất), computeBill (giảm giá → phí phục vụ → VAT)
   │  ├─ invoiceRules.ts                # MỚI: validateInvoiceDraft, buildInvoice (dùng billMath), sessionTotal
   │  ├─ imageQuality.ts                # MỚI: COMPRESSION_PRESETS, planCompression(width, height, bytes, preset), ocrReadiness
   │  └─ receiptParser.ts               # MỚI: parseReceipt(rawText) → ParsedReceipt (ngày, quán, món, giảm giá, phí phục vụ, VAT, tổng)
   ├─ types/index.ts                    # SỬA: AdjustmentMode; Invoice (+discount*, +service*); InvoiceItem (+allocatedDiscountAmount, +allocatedServiceAmount, +orderIndex?)
   ├─ services/
   │  ├─ sessionService.ts              # MỚI: add/rename/reorder/delete session, setSessionParticipants, getSessionDeletePreview
   │  ├─ invoiceService.ts              # MỚI: create/update/delete invoice (+items), get invoice view
   │  ├─ ocrService.ts                  # MỚI: runOcr(files, onProgress, signal) → rawText; khởi tạo worker lazy
   │  ├─ fileStorageService.ts          # DÙNG LẠI; thêm hàm nhỏ nếu cần (attach tạm → gắn vào hoá đơn)
   │  ├─ peopleErrors.ts                # THÊM mã lỗi (B.6)
   │  ├─ mealPeopleService.ts           # SỬA nhỏ: memberUsages đọc payer/equalSplit của hoá đơn (R-16)
   │  └─ mealService.ts                 # không đổi (deleteMeal/getDeletePreview đã dọn đủ bảng)
   ├─ hooks/
   │  ├─ useMealSessions.ts             # MỚI: kèo + hoá đơn + món của bữa (useLiveQuery), kèm tổng
   │  └─ useMealSummaries.ts            # không đổi (đã tính tổng từ invoices)
   ├─ components/sessions/
   │  ├─ SessionsPanel.tsx              # MỚI: Khu vực 2: danh sách kèo + "+ Thêm Kèo"
   │  ├─ SessionCard.tsx                # MỚI: 1 kèo: tên, tổng, người tham gia, danh sách hoá đơn
   │  ├─ SessionParticipantsDialog.tsx  # MỚI: tick người tham gia kèo
   │  ├─ InvoiceFormDialog.tsx          # MỚI: tạo/sửa hoá đơn (tab món | chỉ tổng; ảnh; OCR; VAT; người ứng)
   │  ├─ InvoiceItemsEditor.tsx         # MỚI: bảng món trong form (thêm/sửa/xoá dòng, cờ nghi ngờ)
   │  ├─ InvoiceFilesStrip.tsx          # MỚI: thumbnail ảnh + xem/tải/xoá + nút chụp/tải lên; nén cố định Cân bằng; gọi onAdded để form tự quét OCR
   │  ├─ InvoiceAdjustments.tsx         # MỚI: nhập Giảm giá / Phí phục vụ / VAT (chế độ + giá trị) và bảng tính tổng
   │  ├─ OcrProgress.tsx                # MỚI: tiến trình + Huỷ
   │  └─ ImageViewerDialog.tsx          # MỚI: xem ảnh gốc
   └─ pages/MealWorkspacePage.tsx       # SỬA: thay ô giữ chỗ Khu vực 2 bằng <SessionsPanel/>
```

### B.3. Thành phần & trách nhiệm

| Thành phần | Trách nhiệm | Không làm |
| :--- | :--- | :--- |
| `domain/*` | Quy tắc thuần: làm sạch tên, tính VAT, dựng hoá đơn, kiểm hợp lệ, phân tích OCR | Đọc DB, gọi DOM |
| `sessionService` | Ghi/đọc kèo trong transaction; giữ `orderIndex` liên tục; xoá dây chuyền | Tính tiền |
| `invoiceService` | Ghi hoá đơn + món **nguyên tử** (một transaction), gắn file, tính lại khi sửa | Gán người ăn (Epic 5) |
| `ocrService` | Tiền xử lý → Tesseract → ghép văn bản; huỷ được | Phân tích nội dung (việc của `receiptParser`) |
| `imageQuality` / `imageCompress` | Chọn kế hoạch nén (kích thước đích, chất lượng, cảnh báo OCR) và thực thi bằng Canvas | Lưu file (việc của `fileStorageService`) |
| `receiptParser` | Văn bản thô → `{invoiceDate?, vendorName?, items[], vat?, billTotal?}` kèm độ tin cậy từng dòng | Chạm DOM/DB |
| `fileStorageService` | Lưu/đọc/xoá file (đã có từ Epic 1) | Biết gì về OCR |
| `SessionsPanel` & con | Hiển thị/nhập liệu | Chứa quy tắc nghiệp vụ |

### B.4. Thiết kế dữ liệu

Interface `SessionKeo` giữ nguyên; `Invoice`, `InvoiceItem` và `InvoiceFileRecord` **thêm trường** (đã đồng bộ vào `01-architecture` §3.3–3.7):

```ts
export type AdjustmentMode = 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT'   // VatMode là bí danh của kiểu này

interface Invoice {
  // ... các trường hiện có ...
  discountMode: AdjustmentMode;  discountValue: number;  discountAmount: number;  // Giảm giá (≥ 0, là số trừ đi)
  serviceMode:  AdjustmentMode;  serviceValue:  number;  serviceAmount:  number;  // Phí phục vụ
  // vatMode / vatValue / vatAmount giữ nguyên nghĩa; subtotalAmount = tiền hàng trước mọi điều chỉnh
  // totalAmount = subtotalAmount − discountAmount + serviceAmount + vatAmount
}

interface InvoiceItem {
  // ... các trường hiện có ...
  allocatedDiscountAmount: number;   // phần giảm giá phân bổ vào món (≥ 0, số trừ)
  allocatedServiceAmount: number;    // phần phí phục vụ phân bổ vào món
  orderIndex?: number;               // thứ tự dòng trong hoá đơn (tuỳ chọn, không cần index Dexie)
  // finalAmount = rawAmount − allocatedDiscountAmount + allocatedServiceAmount + allocatedVatAmount
}
```

Cách Epic 4 điền giá trị:

**`SessionKeo`**: `participantIds` = bản sao `Meal.participantIds` lúc tạo; `orderIndex` liên tục từ 0; `archived*` để trống.

**`Invoice`** (Epic 4 ghi):

| Trường | Giá trị |
| :--- | :--- |
| `inputMode` | `ITEMIZED` hoặc `TOTAL_ONLY` theo tab |
| `splitType` | luôn `EQUAL_TOTAL` ở Epic 4 (Epic 5 mở `BY_ITEM`); thoả ràng buộc `TOTAL_ONLY ⇒ EQUAL_TOTAL` |
| `equalSplitParticipantIds` | = `participantIds` của kèo lúc lưu (R-6) |
| `subtotalAmount / discount* / service* / vatMode / vatValue / vatAmount / totalAmount` | theo R-8, R-9 (`computeBill`) |
| `payerMemberId` | R-5 |
| `fileIds` | id các `InvoiceFileRecord`; **nguồn sự thật** là danh sách file có `invoiceId` tương ứng, `fileIds` giữ đồng bộ |

**`InvoiceItem`**: `consumers = []`; `rawAmount`, `allocatedDiscountAmount`, `allocatedServiceAmount`, `allocatedVatAmount`, `finalAmount` theo R-8; `orderIndex` = vị trí dòng trong form (đọc ra sắp theo `orderIndex`).

**Bất biến** (kiểm trong `invoiceService` và test):

1. Khi `ITEMIZED`: `Σ item.finalAmount = invoice.totalAmount`; `Σ allocatedDiscountAmount = discountAmount`; `Σ allocatedServiceAmount = serviceAmount`; `Σ allocatedVatAmount = vatAmount`; `totalAmount = subtotalAmount − discountAmount + serviceAmount + vatAmount`; `0 ≤ discountAmount < subtotalAmount`; mỗi `finalAmount ≥ 0`.
2. `invoice.payerMemberId ∈ session.participantIds`; `equalSplitParticipantIds ⊆ session.participantIds`, không rỗng.
3. `inputMode = TOTAL_ONLY ⇒ không có item`; `splitType = EQUAL_TOTAL`.
4. Mọi `fileIds[i]` có bản ghi `invoice_files` với `invoiceId` đúng; không có bản ghi `invoice_files` nào trỏ vào hoá đơn không tồn tại (sau khi hoàn tất, trừ ảnh tạm của form đang mở).
5. Tất cả khoá ngoại `mealId`/`sessionId` khớp cha.

**Ảnh tạm của hoá đơn đang soạn**: form cần `invoiceId` để lưu ảnh (`addFile` yêu cầu). Cách làm: **sinh trước `invoiceId`** (UUID) khi mở form tạo; ảnh thêm vào gắn `invoiceId` đó. Mỗi ảnh được nén (B.5.9) rồi mới `addFile`; form giữ thêm một `Map<fileId, File gốc>` **chỉ trong bộ nhớ** để OCR đọc bản gốc khi form còn mở. Bấm Lưu mới ghi bản ghi `Invoice`; bấm Huỷ/đóng form thì `deleteFilesByInvoice(invoiceId)`. Trường hợp tắt tab giữa chừng sinh ảnh mồ côi → có hàm dọn `sweepOrphanFiles` chạy khi mở màn chi tiết bữa (B.8-3).

### B.5. Luồng xử lý chính

**5.1. Thêm kèo**: `addSession(mealId, name?)` → kiểm bữa `ACTIVE` → `orderIndex = số kèo hiện có` → `participantIds = meal.participantIds` → tên rỗng thì `Kèo <orderIndex+1>`.

**5.2. Đổi người tham gia kèo**: `setSessionParticipants(sessionId, ids)` → kiểm `ids ⊆ meal.participantIds`; nếu kèo có hoá đơn thì `ids` không rỗng và không loại ai là `payerMemberId` của hoá đơn nào trong kèo (`SESSION_MEMBER_IN_USE`); với người bị bỏ, tự gỡ khỏi `equalSplitParticipantIds` các hoá đơn của kèo (nếu thành rỗng → từ chối). Một transaction.

**5.3. Tạo hoá đơn có ảnh + OCR**:

```mermaid
sequenceDiagram
    participant U as Người dùng
    participant F as InvoiceFormDialog
    participant FS as fileStorageService
    participant O as ocrService
    participant P as receiptParser
    participant I as invoiceService
    U->>F: Mở "+ Hoá đơn" (sinh invoiceId)
    U->>F: Chụp / tải ảnh (luôn nén mức Cân bằng; form tự quét sau khi lưu)
    F->>FS: nén (imageCompress) rồi addFile(invoiceId, bản nén)
    Note over F: giữ File gốc trong bộ nhớ để OCR
    U->>F: "Nhận diện nội dung"
    F->>O: runOcr(ảnh gốc, onProgress, signal)
    O-->>F: rawText (+ lưu ocrRawText vào bản ghi file)
    F->>P: parseReceipt(rawText)
    P-->>F: ngày, quán, món, giảm giá, phí phục vụ, VAT, tổng bill
    F->>U: Đổ vào form, đánh dấu dòng nghi ngờ
    U->>F: Sửa nhanh, chọn người ứng, Lưu
    F->>I: createInvoice(draft, autoNameSession=true)
    I-->>F: Invoice (món đã phân bổ) + kèo đổi tên "Kèo <quán>" nếu còn tên mặc định
```

**5.4. Dựng hoá đơn khi lưu (`buildInvoice`)** — hàm thuần:
1. Chuẩn hoá tiền (R-1), kiểm hợp lệ (R-9, R-10).
2. `computeBill({ subtotal, discount, service, vat })` (hàm thuần, R-8): `D = computeAdjustment(discount, S)`; `N = S − D`; `C = computeAdjustment(service, N)`; `V = computeAdjustment(vat, N + C)`; `total = N + C + V`. Kiểm `0 ≤ D < S`, `total > 0`.
3. `ITEMIZED`: `S = Σ rawAmount_i`, rồi phân bổ **tuần tự** bằng `allocateProportional`: `d_i` theo `R_i`; `n_i = R_i − d_i`; `c_i` theo `n_i`; `v_i` theo `n_i + c_i`; `finalAmount_i = n_i + c_i + v_i`.
4. `TOTAL_ONLY`: `S = subtotal nhập`, không phân bổ.
5. Trả `{invoice, items}`; `invoiceService` ghi cả hai trong **một transaction** và cập nhật `fileIds`.

**5.5. `allocateProportional(weights[], amount)`**: `base_i = floor(amount × w_i / W)` với `W = Σ w_i`; vì tích `amount × w_i` có thể đến `10^20` (vượt 2^53) nên dùng `BigInt`; `remainder = amount − Σ base_i`; xếp các món theo `frac_i = (amount × w_i) mod W` giảm dần (hoà → chỉ số nhỏ trước), cộng 1đ cho `remainder` món đầu. `Σ = amount` tuyệt đối. `W = 0` mà `amount ≠ 0` → lỗi `INVALID_AMOUNT`. Hàm này dùng chung cho giảm giá, phí phục vụ và VAT.

**5.9. Nén ảnh khi thêm**: `planCompression(width, height, bytes, preset)` (thuần) trả `{ targetLongEdge, quality, willResize, ocrReadiness: 'OK' | 'RISKY' | 'POOR', warnings[] }` theo R-18: `targetLongEdge = min(cạnh dài hiện tại, mức đích)` (không phóng to); `ocrReadiness = POOR` nếu cạnh dài sau nén < 1000 px, `RISKY` nếu < 1400 px hoặc `quality < 0,6`, ngược lại `OK`. `imageCompress` vẽ ảnh (đã xoay đúng EXIF) lên canvas kích thước đích và `toBlob('image/jpeg', quality)`; nếu `blob.size ≥ bytes gốc` thì dùng file gốc. Màu nền trắng khi chuyển PNG/WebP có alpha sang JPEG. Kết quả `{ blob, before, after, plan }` để hiển thị dung lượng trước/sau trong `CompressionPicker`. Nếu trình duyệt không có `OffscreenCanvas`/`toBlob` thì rơi về lưu file gốc kèm thông báo.

**5.9b. Tự quét OCR và phát hiện ảnh trùng (BR-4.17, BR-4.18)**: `InvoiceFilesStrip` gọi `onAdded(ids)` sau khi một đợt ảnh được lưu; `InvoiceFormDialog.scanImages()` chỉ quét ảnh có `ocrRawText === undefined` (kết quả đã lưu được dùng lại), lưu văn bản bằng `saveOcrText`, rồi gọi `findDuplicateImages(fileId)`: lấy mọi ảnh cùng `mealId`, so tập từ OCR bằng `findTextDuplicates` (`domain/imageDuplicates.ts`, Jaccard ≥ 0,8, tối thiểu 8 từ). Kết quả hiện thành thông báo kèm nút `Xoá ảnh trùng` (`removeInvoiceImage` ảnh mới) hoặc `Giữ lại`. Nếu mọi ảnh vừa quét đều trùng với ảnh **cùng hoá đơn** thì bỏ qua bước điền form. Nút `Quét lại bill (OCR)` gọi `scanImages(true)` để quét lại tất cả.

**5.10. Tự đổi tên kèo theo quán**: trong cùng transaction với `createInvoice`/`updateInvoice` khi `draft.autoNameSession === true` (form đặt cờ khi dữ liệu quán đến từ OCR) và `vendorName` không rỗng: nếu `isDefaultSessionName(session.name)` (khớp `^Kèo \d+$`) thì `session.name = vendorSessionName(vendorName)` = `Kèo <tên quán>` cắt tối đa 80 ký tự. Trả về `renamedSessionTo?: string` để UI hiện thông báo. Kèo đã đổi tên rồi (hoặc người dùng tự đặt) không đạt điều kiện nên không bị đổi lần sau.

**5.6. Sửa hoá đơn**: mở lại form với dữ liệu hiện có (món là các dòng sửa được ngay trong form — đây là chỗ Epic 4 cho sửa món; Epic 5 làm màn sửa món độc lập); `updateInvoice` tính lại toàn bộ, ghi đè món (xoá món cũ + ghi mới trong cùng transaction). Nếu hoá đơn đã có `consumers` (sau Epic 5) mà người dùng sửa món ở form này thì món được ghép theo `id` để giữ `consumers` (cơ chế này dành sẵn, Epic 4 chưa kiểm vì chưa có consumers).

**5.7. Xoá**: ảnh → `deleteFile`; hoá đơn → `deleteFilesByInvoice` rồi transaction xoá món + hoá đơn; kèo → `deleteFilesBySession` rồi transaction xoá món + hoá đơn + kèo, đánh số lại `orderIndex` (R-15, R-3).

**5.8. Tổng hợp tổng chi phí**: `useMealSessions` trả mỗi kèo `{session, invoices, total}` và tổng bữa; `useMealSummaries` (Epic 3) đã cộng `Invoice.totalAmount` nên chỉ cần dữ liệu thật là cột tổng ở Epic 3 tự đúng (BR-4.11).

### B.6. Giao diện lập trình nội bộ

```ts
// services/sessionService.ts
addSession(mealId: string, name?: string): Promise<SessionKeo>
renameSession(sessionId: string, name: string): Promise<SessionKeo>
moveSession(sessionId: string, direction: 'UP' | 'DOWN'): Promise<void>
setSessionParticipants(sessionId: string, memberIds: string[]): Promise<SessionKeo>
getSessionDeletePreview(sessionId: string): Promise<{ invoices: number; items: number; files: number }>
deleteSession(sessionId: string): Promise<void>

// services/invoiceService.ts
interface InvoiceDraft {
  id?: string                       // có khi sửa, hoặc id sinh trước cho hoá đơn mới
  sessionId: string
  inputMode: 'ITEMIZED' | 'TOTAL_ONLY'
  vendorName?: string
  invoiceDate?: string
  payerMemberId: string
  items: Array<{ id?: string; name: string; quantity: number; unitPrice: number; rawAmount?: number }>
  subtotalAmount?: number           // chỉ TOTAL_ONLY (tiền hàng)
  discountMode: AdjustmentMode;  discountValue: number
  serviceMode: AdjustmentMode;   serviceValue: number
  vatMode: VatMode;              vatValue: number
  autoNameSession?: boolean         // BR-4.10: true khi quán lấy từ OCR
}
interface InvoiceResult { invoice: Invoice; items: InvoiceItem[]; renamedSessionTo?: string }
createInvoice(draft: InvoiceDraft): Promise<InvoiceResult>
updateInvoice(invoiceId: string, draft: InvoiceDraft): Promise<InvoiceResult>
getInvoiceDeletePreview(invoiceId: string): Promise<{ items: number; files: number }>
deleteInvoice(invoiceId: string): Promise<void>
discardDraftFiles(invoiceId: string): Promise<void>      // huỷ form: xoá ảnh tạm nếu hoá đơn chưa tồn tại
sweepOrphanFiles(mealId: string): Promise<number>        // dọn ảnh trỏ vào hoá đơn không tồn tại

// services/ocrService.ts
runOcr(files: Blob[], opts: { onProgress(pct: number, stage: string): void; signal?: AbortSignal }): Promise<string>

// domain
parseMoney(input: string): number | null
allocateProportional(weights: number[], amount: number): number[]
computeAdjustment(mode: AdjustmentMode, value: number, base: number): number
computeBill(input: { subtotal: number; discount: Adj; service: Adj; vat: Adj }): { discountAmount; serviceAmount; vatAmount; totalAmount }
parseReceipt(rawText: string): ParsedReceipt
interface ParsedReceipt {
  invoiceDate?: string
  vendorName?: string
  items: Array<{ name: string; quantity: number; unitPrice: number; rawAmount: number; uncertain: boolean }>
  discount?: { mode: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number }
  service?:  { mode: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number }
  vat?:      { mode: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number }
  billTotal?: number
}

// domain/sessionRules.ts, domain/imageQuality.ts, lib/imageCompress.ts
isDefaultSessionName(name: string): boolean           // /^Kèo \d+$/
vendorSessionName(vendor: string): string             // "Kèo <quán>", ≤ 80 ký tự
planCompression(w: number, h: number, bytes: number, preset: CompressionPreset): CompressionPlan   // app luôn gọi với 'BALANCED'
compressImage(file: File, preset): Promise<{ file: File; before: number; after: number; compressed: boolean; plan: CompressionPlan }>
// services/invoiceFileService.ts
addInvoiceImage({ mealId, sessionId, invoiceId, file }): Promise<InvoiceFileRecord>     // luôn nén IMAGE_COMPRESSION = 'BALANCED'
findDuplicateImages(fileId): Promise<Array<{ duplicateOf: InvoiceFileRecord; sameInvoice: boolean; similarity: number }>>
// domain/imageDuplicates.ts
textSimilarity(a: string, b: string): number                                              // Jaccard trên tập từ đã bỏ dấu
```

**Mã lỗi mới** (`peopleErrors.ts`, dùng lại `PeopleError`): `SESSION_NOT_FOUND`, `INVOICE_NOT_FOUND`, `INVALID_SESSION_NAME`, `SESSION_MEMBER_NOT_IN_MEAL`, `SESSION_MEMBER_IN_USE`, `SESSION_EMPTY`, `INVALID_AMOUNT`, `INVALID_VAT`, `INVALID_DISCOUNT`, `INVALID_SERVICE`, `INVALID_ITEM`, `PAYER_NOT_IN_SESSION`, `FILE_TYPE_NOT_ALLOWED`, `FILE_TOO_LARGE`, `TOO_MANY_FILES`, `OCR_FAILED`, `OCR_CANCELLED`. Mọi service ghi đều từ chối bữa `ARCHIVED` bằng `MEAL_ARCHIVED` có sẵn.

### B.7. Thuật toán OCR chi tiết

**Tiền xử lý (`imagePreprocess.ts`)**: đọc ảnh bằng `createImageBitmap` (tôn trọng EXIF xoay) → đưa cạnh dài về 2800 px (phóng tối đa 3×) → grayscale `0.299R+0.587G+0.114B` → kéo giãn tương phản theo phân vị 2%/98% → (tuỳ chọn) ngưỡng thích nghi nhẹ. Trả `Blob` PNG cho Tesseract; file gốc không đổi. Chạy trên main thread bằng `OffscreenCanvas` nếu có; test chạy phần thuần (hàm tính phân vị/kéo giãn trên mảng).

**Nhận diện (`ocrService`)**: tạo worker một lần, tái dùng giữa các lần quét, `terminate()` khi rời màn chi tiết bữa sau 60 giây rảnh. `logger` của Tesseract → `onProgress`. Hỗ trợ `AbortSignal` bằng cách `terminate()` worker rồi tạo lại lần sau. Nhiều ảnh quét lần lượt, nối bằng dòng trống; lưu `ocrRawText` từng ảnh vào `invoice_files`.

**Phân tích (`receiptParser`)** theo 02 §3 bước 3, cụ thể hoá:

1. Tách dòng, bỏ dòng rỗng, chuẩn hoá khoảng trắng và sửa lỗi OCR thường gặp trong **ô số** (`O→0`, `l`/`I`→`1`, `S→5` chỉ khi token còn lại là số).
2. **Ngày**: hai regex ở 02 §3; lấy ngày hợp lệ đầu tiên; áp R-7.
3. **Quán**: 1–4 dòng đầu; điểm = có từ khoá + chữ HOA − dòng địa chỉ/SĐT; chọn dòng điểm cao nhất.
4. **VAT**: nếu dòng thuế có **số tiền** thì ưu tiên `FIXED_AMOUNT` (khớp bill); ngược lại `%` (`VAT|GTGT|Thuế GTGT|Tax` + `\d{1,2}\s*%`) → `PERCENTAGE`. Chỉ nhận `%` ∈ {5, 8, 10}; số khác đánh dấu nghi ngờ nhưng vẫn điền cho người dùng xem.
4b. **Phí phục vụ**: dòng khớp `Phí phục vụ|Phục vụ|Phí DV|Service( charge)?` kèm `%` hoặc số tiền (ưu tiên số tiền). **Giảm giá**: dòng khớp `Giảm giá|Chiết khấu|Khuyến mãi|Discount|CK`, số tiền có thể mang dấu `-` hoặc ngoặc `(…)`; lấy giá trị tuyệt đối. Các dòng này (và dòng VAT) **bị loại khỏi danh sách món**.
5. **Tổng bill**: dòng `Tổng cộng|Tổng thanh toán|Thành tiền` ở nửa dưới, lấy số lớn nhất cuối dòng.
6. **Món**: loại dòng tiêu đề và chân trang (danh sách ở 02 §3); bố cục 1 dòng `tên SL đơn_giá thành_tiền` và 2 dòng `tên` + `SL x đơn_giá = thành_tiền`. Ràng buộc kiểm chéo: `quantity × unitPrice ≈ rawAmount`; lệch → dùng `rawAmount`, đặt `uncertain = true`. Dòng chỉ có tên + một số cuối → `quantity=1`, `unitPrice=rawAmount`.
7. Số tiền theo kiểu Việt `45.000` / `45,000` / `45000` / `45k`: dấu `.` hoặc `,` đứng trước đúng 3 chữ số cuối là phân cách nghìn; ngược lại không phải tiền.

Bộ **bill mẫu làm test**: 5 văn bản OCR thô trong `src/domain/__fixtures__/receipts.ts` (bố cục 2 dòng, 1 dòng, có/không VAT %, VAT cố định, OCR đọc lẫn `l`/`1`); mỗi bill được chạy thêm bản không dấu. Kiểm OCR thật bằng ảnh bill ở trình duyệt xem B.10.

### B.8. Rủi ro, hạn chế & quyết định cần chốt

| # | Mục | Mô tả | Hướng xử lý |
| :-: | :--- | :--- | :--- |
| 1 | Dữ liệu ngôn ngữ offline | `vie` + `eng` traineddata + worker + wasm core tải mạng theo mặc định (CDN), trái với "offline" | Đặt sẵn trong `public/ocr/` (dùng bản `tessdata_fast`, khoảng vài MB mỗi ngôn ngữ), cấu hình `langPath`/`corePath`/`workerPath` cục bộ; tăng dung lượng build; **cần anh xác nhận chấp nhận** (Q-1). PWA cache lần đầu sau khi tải. |
| 2 | Độ chính xác OCR | Bill nhiệt mờ/nhàu/nghiêng đọc sai nhiều; parser dựa heuristic | Luôn qua bước xem lại (BR-4.8); đánh dấu nghi ngờ; không đoán số; chấp nhận không bao giờ đạt 100% |
| 3 | Ảnh mồ côi | Tắt tab khi đang soạn hoá đơn, ảnh đã lưu nhưng `Invoice` chưa có | `sweepOrphanFiles` chạy khi mở màn chi tiết bữa; test riêng |
| 4 | OPFS lỗi/không hỗ trợ | Safari cũ, chế độ riêng tư | Đã có dự phòng Blob IndexedDB (`fileStorageService`); không đổi |
| 5 | Thứ tự món trong hoá đơn | `InvoiceItem` chưa có `orderIndex` | **Thêm `orderIndex?: number`** (B.4), không cần index Dexie nên không nâng schema; cập nhật `01-architecture` §3.4 ở bước 8 |
| 6 | Số lớn khi phân bổ | Tích `khoản × trọng số` có thể vượt 2^53 | Dùng `BigInt` trong `allocateProportional`; test với giá trị biên |
| 7 | Bộ nhớ khi quét ảnh lớn | Ảnh 12 MP trên điện thoại cũ | Thu nhỏ trước khi OCR (B.7); giới hạn 15 MB/ảnh, 10 ảnh/hoá đơn (R-12) |
| 8 | Camera WebRTC | Cần HTTPS/localhost, quyền camera, UI riêng | Giai đoạn đầu chỉ dùng `<input capture>` (đã mở camera hệ thống trên điện thoại); modal WebRTC cho desktop là bước sau (Q-2) |
| 9 | Kiểm thử OCR thật | jsdom không chạy được Tesseract/canvas thật | Test `receiptParser` bằng văn bản mẫu; `ocrService` mock; **đã kiểm OCR thật** trên bill vẽ bằng canvas trong trình duyệt (B.10); chưa kiểm trên ảnh bill chụp thật |
| 10 | Sửa hoá đơn khi Epic 5 đã có consumers | Sửa món ở form Epic 4 có thể xoá `consumers` | Ghép món theo `id` khi cập nhật (B.5.6) để giữ `consumers` |
| 11 | Quy mô truy vấn | `useMealSessions` đọc theo `mealId` | Dùng index `mealId`, không quét toàn bảng |
| 12 | Không giữ ảnh gốc | Nén là mất thông tin vĩnh viễn; quét lại sau khi lưu chỉ có bản nén | Mặc định *Cân bằng* giữ ≥ 2000 px nên OCR vẫn đạt; mức *Giữ nguyên* cho ai cần; OCR lúc soạn form dùng bản gốc trong bộ nhớ (B.4). Chấp nhận: tắt tab giữa chừng thì không còn bản gốc |
| 13 | Cơ sở tính VAT | Quán tính VAT trên tiền hàng, quán tính trên cả phí phục vụ (R-8 chọn `N + C`) | OCR ưu tiên số tiền VAT ghi trên bill (`FIXED_AMOUNT`) nên bill thật luôn khớp; chế độ `%` là mặc định có thể lệch, và cảnh báo R-11 bắt lệch với tổng bill |
| 14 | Món âm / giảm giá theo món | Bill có voucher hoặc giảm giá từng món | Ngoài phạm vi (BR A.6); dòng món có thành tiền âm bị đánh dấu nghi ngờ và gợi ý nhập thành Giảm giá cả bill |
| 15 | `toBlob`/EXIF | Trình duyệt cũ xoay ảnh sai hoặc thiếu `OffscreenCanvas` | Dùng `createImageBitmap(file, { imageOrientation: 'from-image' })`; không hỗ trợ thì lưu bản gốc kèm thông báo (B.5.9) |

### B.9. Kế hoạch triển khai (chia bước, mỗi bước commit/kiểm riêng)

| Bước | Nội dung | Kiểm |
| :-: | :--- | :--- |
| 1 | `parseMoney`, `sessionRules`, `billMath` (giảm giá → phí phục vụ → VAT, phân bổ), `invoiceRules`, `imageQuality` (thuần) + test; cập nhật `types` (B.4) | Vitest |
| 2 | `sessionService` + `useMealSessions` + `SessionsPanel/SessionCard/SessionParticipantsDialog`; thay ô giữ chỗ Khu vực 2 | Vitest + trình duyệt |
| 3 | `invoiceService` + `InvoiceFormDialog` + `InvoiceAdjustments` (nhập tay: tab món, tab chỉ tổng, giảm giá, phí phục vụ, VAT, người ứng), xoá/sửa; sửa `memberUsages` | Vitest + trình duyệt |
| 4 | `InvoiceFilesStrip` + `ImageViewerDialog` + `imageCompress`: tải ảnh, nén cố định mức Cân bằng, cảnh báo OCR, nhiều ảnh, xem/tải/xoá, `discardDraftFiles`, `sweepOrphanFiles` | Vitest (fake OPFS/Blob, mock canvas) + trình duyệt |
| 5 | `receiptParser` (gồm giảm giá, phí phục vụ) + bộ bill mẫu | Vitest |
| 6 | `imagePreprocess` + `ocrService` + `OcrProgress`; nối vào form (OCR đọc ảnh gốc trong bộ nhớ); đối chiếu tổng bill (R-11); tự đổi tên kèo (BR-4.10) | Vitest (mock) + OCR thật trên ảnh mẫu |
| 7 | Chế độ chỉ đọc cho bữa `ARCHIVED`, hồi quy Epic 1–3, 375 px, bàn phím | Vitest + trình duyệt |
| 8 | Đồng bộ tài liệu chung: `01-architecture` §3.3–3.4, §3.7 (trường mới), `02-business-logic` §2 (thứ tự giảm giá → phí phục vụ → VAT), `03-ui` §4.4 (nén ảnh, giảm giá/phí phục vụ); cập nhật B.10 và ma trận kiểm thử | — |

### B.10. Kết quả kiểm (thực tế)

**Tự động**: 301 test, 31 file (`npx vitest run`); `npx tsc -b` và `npx oxlint` sạch; `npm run build` thành công.

**Trình duyệt** (Chrome qua công cụ xem trước, dữ liệu thử trong IndexedDB của trình duyệt):

| Việc đã làm | Kết quả |
| :--- | :--- |
| Thêm kèo, đổi tên, đổi chỗ, chọn người tham gia (bỏ một người) | Đúng; kèo còn 7/8 người sau khi bỏ |
| Thêm hoá đơn món (2 món, VAT 8%) | Tổng 594.000 ₫, đúng với công thức |
| Hoá đơn chỉ nhập tổng (1.620.000, giảm 100.000, phí phục vụ 5%) | Tổng 1.596.000 ₫, đúng |
| Sửa số lượng món, xem trước tổng cập nhật ngay | 756.000 ₫, đúng |
| Xoá hoá đơn qua hộp xác nhận | Kèo về "Chưa có chi phí" |
| Tải ảnh 3,0 MB, nén mặc định Cân bằng | Lưu 643 KB, tên file chuẩn hoá |
| Chọn mức Tiết kiệm | Hiện cảnh báo OCR; mức được nhớ trên thiết bị |
| Xem ảnh, xoá ảnh qua hộp xác nhận | Đúng; 1/10 → 0/10 |
| Đóng form chưa lưu (Esc) | Ảnh tạm được dọn (form mới hiện 0/10) |
| Quét OCR bill vẽ bằng canvas (tiếng Việt không dấu và có dấu) | Điền đúng quán, ngày, 2 món, VAT, tổng; tổng khớp bill |
| Quét lại khi form có dữ liệu | Hỏi trước khi ghi đè; Huỷ thì giữ nguyên |
| Lưu hoá đơn từ OCR khi kèo còn tên mặc định | Kèo đổi thành "Kèo LAU BO GO NGOC" kèm thông báo |
| Bữa ARCHIVED (đặt trực tiếp trong IndexedDB) | Không còn nút thêm/sửa/xoá kèo, hoá đơn, người; vẫn có Xoá bữa |
| Khung 375 px (form, bữa lưu trữ, bữa hoạt động) | Không cuộn ngang; nút đạt 44 px |

**Trạng thái từng tiêu chí** (xem BR A.5): đạt AC-1, 4, 5, 6, 9, 10, 12, 13, 14, 15. Một phần: AC-2 (chưa đo OPFS thật, chưa thử tải về), AC-3 (chưa thử ảnh chụp thật), AC-7 (chưa kiểm cột tổng ở cả ba chế độ xem với dữ liệu thật), AC-8 (chưa thử F5 giữa lúc đang soạn), AC-11 (chưa thử trên điện thoại thật và camera).

**Thay đổi sau khi đóng bước 8** (yêu cầu của anh): bỏ lựa chọn mức nén (luôn Cân bằng); tự quét OCR ngay sau khi lưu ảnh và dùng lại kết quả đã lưu; phát hiện ảnh trùng bằng văn bản OCR và gợi ý xoá. Đã kiểm trên trình duyệt: tải một bill, form tự điền (quán, 3 món) không cần bấm; tải lại cùng bill (chữ khác kích thước) báo trùng 100% cùng hoá đơn, không hiện hộp xác nhận ghi đè; `Xoá ảnh trùng` còn 1/10 ảnh; bill khác hẳn không bị báo trùng. Tổng 312 test đạt.

**Khác với kế hoạch ban đầu**:
- OCR đọc **bản đã nén** của ảnh, không giữ bản gốc trong bộ nhớ như SA B.4 đề xuất. Mức *Cân bằng* vẫn đọc tốt bill thử nghiệm.
- Dùng `tesseract.js` v7 (không phải v5 như ghi trong kế hoạch). Đóng gói ba biến thể lõi LSTM, thư mục `public/ocr/` khoảng 24 MB.
- Thêm `orderIndex` cho món và giảm giá, phí phục vụ cho hoá đơn (đã được duyệt).
- Phần sửa món chi tiết (sửa/xoá món sau khi lưu) vẫn thuộc Epic 5, như BR A.6.

**Lỗi đã biết**:
- Đã sửa: Esc khi đang xem ảnh chỉ đóng trình xem (trình xem chặn phím Esc ở pha capture trên `window`); đã kiểm trên trình duyệt cả hai chiều.
- Các nút "Bỏ … khỏi bữa" của Epic 2 đã được mở rộng lên 44 px trong bước 7.

**Việc còn lại để đóng Epic 4**: kiểm trên điện thoại thật (camera `capture`, OCR trên ảnh chụp), kiểm F5 và cột tổng ở ba chế độ xem.

### B.11. Quyết định đã chốt và điểm còn cần anh xác nhận

**Anh đã chốt**:

| Mã | Quyết định |
| :-: | :--- |
| Q-1 | Đóng gói dữ liệu OCR `vie`+`eng` (+worker, wasm) vào app để chạy offline thật (`tessdata_fast`). |
| Q-2 | Modal camera WebRTC cho desktop **để sau**; Epic 4 dùng `<input capture>` + tải file. |
| Q-5 | Thêm **nén ảnh khi lưu** (BR-4.16, R-18). Sau đó đổi thành **mức Cân bằng cố định**, không cho chọn. |
| Q-6 | Thêm **phí phục vụ và giảm giá** vào hoá đơn, đọc được từ OCR (BR-4.15, R-8, R-14). |
| Q-7 | Kèo **tự đổi tên** `Kèo <tên quán>` khi scan hoá đơn (BR-4.10). |

**Em giữ theo đề xuất ban đầu (anh không phản đối, xin xác nhận)**: Q-3 thêm `orderIndex?` cho món; Q-4 ranh giới Epic 4/5 như BR A.1; giới hạn ảnh 15 MB/ảnh trước nén và 10 ảnh/hoá đơn; bill lệch tổng chỉ cảnh báo, không chặn lưu.

**Em tự quyết khi diễn giải, anh sửa nếu không đúng**:

| Mã | Điểm diễn giải | Lý do |
| :-: | :--- | :--- |
| D-1 | Thứ tự tính: giảm giá → phí phục vụ (trên tiền sau giảm) → VAT (trên tiền sau giảm + phí phục vụ) (R-8) | Cách phổ biến trên bill nhà hàng Việt; bill khác thứ tự thì dùng `FIXED_AMOUNT` theo số ghi trên bill |
| D-2 | Chỉ tự đổi tên kèo khi tên còn là `Kèo <n>`; kèo anh đã đặt tên riêng thì giữ nguyên (BR-4.10) | Tránh ghi đè tên anh tự đặt; nếu anh muốn **luôn** đổi theo quán mới nhất thì sửa điều kiện này |
| D-3 | Ảnh lưu là bản **đã nén**, không giữ bản gốc; OCR đọc bản đã lưu (R-18, B.8-12) | Đúng mục đích tiết kiệm dung lượng; nén không hoàn tác được. Mức Cân bằng giữ cạnh dài 2000 px nên OCR vẫn đạt |
| D-4 | Giảm giá/phí phục vụ chỉ ở mức **cả bill**, không theo từng món (BR A.6) | Đủ cho phần lớn bill; theo món làm sau nếu cần |

---

### B.11. Bổ sung: hoá đơn điện tử dạng bảng (ảnh chụp màn hình PDF)

Ca thật: ảnh chụp màn hình hoá đơn điện tử (nền trắng, bảng kẻ ô, cột STT / đơn vị tính, chữ ký số). Máy quét nhị phân hoá làm rơi dòng "Cơm trắng" và dính nét (đọc được 5/6 món, thiếu tổng); giữ ảnh xám thì OCR đọc đủ 6/6 món và dòng tổng. Đã sửa ở hai tầng:

- **Ảnh** (`lib/documentScan.ts`): `isCleanDocument` nhận ra tài liệu điện tử (độ sáng nền theo ô 64 px: phân vị 5% ≥ 245 và trung vị ≥ 250). Loại này chỉ cắt khung và kéo giãn tương phản, **không nhị phân hoá** (`ScanResult.binarized = false`; ép bằng `keepGray`). Ảnh chụp giấy thật luôn có bóng/nền xám nên vẫn đi đường nhị phân hoá như cũ.
- **Phân tích** (`domain/receiptParser.ts`): bỏ dòng tiêu đề cột và dòng đánh số cột (`(6=4x5)`), bỏ STT đầu dòng và từ đơn vị tính cuối tên (chỉ khi có cột "Đơn vị tính"); dừng đọc món sau dòng "Cộng tiền hàng hoá… (Total amount)" (số phải trả, đã trừ khoản giảm bên dưới) để chữ ký số không thành món; "Đã giảm 12.374,00 tương ứng 20%…" là **giảm giá bằng số tiền** (đọc cả "12.37400" mất dấu phẩy), không phải VAT; mã số thuế / cơ quan thuế không còn bị hiểu là VAT; tên quán lấy từ dòng "Đơn vị bán hàng"; ngày "Ngày (date) 13 tháng (month) 10 năm (year) 2026" chịu được ngoặc và chữ số bị đọc lẫn.
- Kết quả trên ảnh mẫu: 6/6 món đúng số lượng, đơn giá, thành tiền; giảm 12.374 ₫; tổng 2.050.000 ₫ khớp (`validateReceipt` = OK). Test: fixture "hoá đơn điện tử dạng bảng" ở `__fixtures__/receipts.ts`, `isCleanDocument` ở `documentScan.test.ts`.
- Hạn chế: tên món vẫn có thể sai dấu (OCR), ngày có thể sai một chữ số khi OCR rớt chữ số (người dùng sửa được); thời gian quét ảnh 2800 px khoảng 10 giây.

### B.12. Bổ sung: tải PDF làm hoá đơn

- **Thư viện**: `pdfjs-dist@4.10.38` (bản `legacy/build` cho trình duyệt cũ), nạp lười bằng `import()` chỉ khi người dùng chọn PDF; worker nạp qua `?url` của Vite nên vẫn chạy offline sau khi build.
- **`lib/pdfImport.ts`** (`importPdf(file, maxPages)`): mỗi trang dựng thành ảnh JPEG cạnh dài 2800 px (nền tô trắng) và lấy văn bản từ lớp chữ của PDF. **`lib/pdfText.ts`** (hàm thuần, có test) gom các mảnh chữ có toạ độ thành dòng, khoảng cách lớn giữa cột giữ thành nhiều khoảng trắng; trang có dưới 20 ký tự coi như không có lớp chữ (PDF ảnh quét).
- **`addInvoicePdf`** (`invoiceFileService`): kiểm tra PDF và ≤ 40 MB, chỉ nhận số trang còn chỗ trong giới hạn 10 ảnh/hoá đơn (báo "chỉ nhận n trang đầu" khi PDF dài hơn), lưu từng trang bằng `addFile` kèm `ocrRawText` nếu có lớp chữ. Lỗi: `PDF_INVALID` (hỏng), `PDF_ENCRYPTED` (có mật khẩu), `FILE_TYPE_NOT_ALLOWED`, `FILE_TOO_LARGE`, `TOO_MANY_FILES`.
- **Luồng quét**: form chỉ OCR những ảnh chưa có `ocrRawText`, nên PDF có chữ đi thẳng vào bộ phân tích với văn bản chính xác (không tốn ~10 giây OCR, không sai dấu); PDF ảnh quét thì OCR ảnh trang như ảnh thường. Đo trên PDF thử: PDF có chữ → 3/3 món, tổng khớp (`OK`), form tự điền; PDF ảnh quét của hoá đơn mẫu B.11 → 6/6 món, giảm 12.374 ₫, tổng khớp.
- **Giao diện**: ô tải lên nhận `application/pdf` (nhãn "Tải ảnh hoặc PDF lên"), trong lúc đọc hiện "Đang đọc PDF…".
- **Test**: `pdfText.test` (dựng dòng), `invoiceFilePdf.test` (trang có/không lớp chữ, giới hạn trang, từ chối, lỗi truyền nguyên). pdf.js/Canvas không chạy trong jsdom nên phần dựng trang được kiểm trên trình duyệt thật.
- **Hạn chế**: PDF ảnh quét không qua bước cắt khung/nắn thẳng của máy quét (ảnh trang giữ nguyên); chữ trong PDF vẫn có thể sai nếu chính PDF dùng font mã hoá lạ (khi đó nên bấm "Quét lại bill (OCR)"). Cần `npm install` sau khi kéo mã về vì có thêm phụ thuộc `pdfjs-dist`.

### B.13. Bổ sung: đọc hoá đơn bằng AI Gemini (tuỳ chọn)

Tính năng cộng thêm sau khi triển khai Epic, **ngoài phạm vi BR-4.x gốc** ("không cần API key"): mặc định vẫn là OCR offline; AI chỉ chạy khi người dùng tự nhập khoá Gemini API. Mô tả đầy đủ tại [05 §7](../05-ocr-and-receipt-reading.md): `services/geminiService.ts`, `domain/aiReceipt.ts`, `components/invoices/GeminiSettingsDialog.tsx`, điểm vào `startAi`/`readWithAi` trong `InvoiceFormDialog`. Dữ liệu duy nhất rời thiết bị là ảnh + gợi ý OCR gửi tới Google khi người dùng chủ động; khoá lưu `localStorage`. Test: `services/geminiService.test.ts`, `InvoiceFormDialog.test.tsx`. Việc còn lại: bổ sung BR/AC chính thức (ví dụ BR-4.19) nếu Epic được mở lại.

---

## Phụ lục: Business Requirements gốc của Epic 4

Nguyên văn `documentation/epic-4/BR.md` tại thời điểm chuyển sang OpenSpec (2026-11-11). `proposal.md` và các delta spec của change này được chuyển từ tài liệu này.

# Epic 4 — Business Requirements (BR)

**Epic 4**: Quản lý Kèo (Tầng 2), File Hoá đơn & Nhận diện OCR + VAT (kèm Phí phục vụ, Giảm giá, Nén ảnh) · **Trạng thái**: đã triển khai; tiêu chí đạt/chưa đạt xem [SA B.10](./SA.md)

Tài liệu đi cùng: [SA](./SA.md) · [Epics & Roadmap](../04-epics-and-roadmap.md) · [Nghiệp vụ §1–3](../02-business-logic-and-algorithms.md) · [UI §4.2, §4.4](../03-ui-ux-and-design-system.md) · [Epic 3 BR](../epic-3/BR.md)

---

### A.1. Bối cảnh & Mục tiêu nghiệp vụ
Sau Epic 1–3, người dùng đã tạo được Bữa, thêm người, gom nhóm thanh toán; màn chi tiết bữa còn **Khu vực 2 (Kèo) là ô giữ chỗ**, và bảng `sessions`, `invoices`, `items`, `invoice_files` cùng `fileStorageService` đã có nhưng chưa ai ghi dữ liệu vào. Epic 4 làm cho Khu vực 2 dùng được:

1. **Kèo** (Tầng 2): thêm, đổi tên, sắp xếp, xoá; chọn người tham gia từng kèo.
2. **Hoá đơn**: mỗi kèo có một hoặc nhiều hoá đơn; mỗi hoá đơn đính kèm một hoặc nhiều ảnh (chụp hoặc tải lên), xem lại, tải về, xoá.
3. **OCR offline** (Tesseract.js, `vie+eng`): bóc tách ngày, tên quán, danh sách món + giá, VAT từ ảnh; người dùng kiểm tra/sửa trước khi lưu.
4. **Giảm giá, Phí phục vụ, VAT**: nhận diện từ OCR hoặc nhập tay, tự phân bổ vào giá từng món sao cho tổng các món khớp 100% tổng hoá đơn.
5. **Nén ảnh khi lưu** ở mức cố định *Cân bằng* để tiết kiệm bộ nhớ mà OCR vẫn đọc tốt.
6. **Tự quét OCR sau khi lưu ảnh**, lưu kết quả vào ảnh, và **báo ảnh trùng** để người dùng xoá bớt.

**Ranh giới với Epic 5** (để hai epic không chồng việc):

| Việc | Epic 4 | Epic 5 |
| :--- | :--- | :--- |
| Bản ghi Hoá đơn (quán, ngày, tổng, giảm giá, phí phục vụ, VAT, file) | Làm | — |
| Người ứng tiền | Có ô chọn tối thiểu (bắt buộc, vì `payerMemberId` là trường bắt buộc); mặc định là chủ trì nếu chủ trì thuộc kèo | Hoàn thiện (US-5.1) |
| Món | Chỉ tạo/sửa **trong form xem lại OCR hoặc nhập tay lúc tạo hoá đơn**, kèm phân bổ VAT | Sửa/xoá món sau khi lưu, màn danh sách món đầy đủ (US-5.2) |
| `TOTAL_ONLY` / `ITEMIZED`, khoá `EQUAL_TOTAL` | Lưu đúng hai trường; nhập "chỉ tổng tiền" là một tab của form | Ràng buộc đầy đủ và giao diện chuyển chế độ (US-5.2, 5.3) |
| `splitType` BY_ITEM / EQUAL_TOTAL, gán người ăn, số phần | Mặc định `EQUAL_TOTAL`, người chia đều = toàn bộ kèo; **không** gán người ăn | Toàn bộ (US-5.3, 5.4) |
| Tính tiền mỗi người | Không | Epic 6 |

Epic 4 vẫn phải lưu `Invoice` hợp lệ theo kiểu dữ liệu hiện có, nên các trường của Epic 5 nhận **giá trị mặc định an toàn** (bảng trên) chứ không để trống.

### A.2. Các bên liên quan
| Vai trò | Quan tâm |
| :--- | :--- |
| Tôi (chủ app) | Nhập một bữa nhiều kèo nhanh ngay tại bàn: chụp bill, quét, sửa vài con số, xong |
| Người ứng tiền | Hoá đơn ghi đúng tổng tiền mình đã trả |
| Dev Epic 5–8 | Hoá đơn/món lưu đúng cấu trúc, tổng khớp, người tham gia kèo nhất quán; hàm dọn dẹp file khi xoá |
| Epic 7 (Lưu trữ) | Tổng chi phí mỗi kèo tính được từ hoá đơn |

### A.3. Yêu cầu nghiệp vụ (BR)

| Mã | Yêu cầu | Truy vết |
| :-: | :--- | :--- |
| **BR-4.1** | Thêm **Kèo** vào bữa `ACTIVE` với tên (để trống thì tự đặt `Kèo <n>`). Kèo mới ở cuối danh sách. | US-4.1, YC#15 |
| **BR-4.2** | Đổi tên kèo; sắp xếp lại thứ tự kèo (lên/xuống); xoá kèo kèm hộp xác nhận nêu số hoá đơn, món, file sẽ mất. Xoá kèo xoá sạch hoá đơn, món, file vật lý của kèo đó. | US-4.1, YC#15 |
| **BR-4.3** | **Người tham gia kèo**: mặc định gồm toàn bộ người đang có trong bữa; chọn bớt/thêm lại, chỉ chọn trong người của bữa; kèo đã có hoá đơn thì danh sách không được rỗng và không bỏ được người đang là người ứng, người chia đều của hoá đơn trong kèo. Hiển thị `Người tham gia kèo (k/n)`. | US-4.1b, 02 §1.0 |
| **BR-4.4** | Thêm **Hoá đơn** vào kèo; một kèo có nhiều hoá đơn. Hoá đơn có: tên quán, ngày in trên hoá đơn, người ứng, tổng tiền, VAT, danh sách file ảnh. Sửa và xoá hoá đơn được (xoá kèm xác nhận, xoá luôn ảnh và món của hoá đơn). | US-4.2, YC#2, YC#14, YC#15 |
| **BR-4.5** | **Hai cách nhập hoá đơn** trong cùng form: tab *Nhập chi tiết món* (có danh sách món) và tab *Chỉ nhập tổng tiền* (một ô tổng tiền; có thể kèm VAT chưa cộng). Epic 4 lưu `inputMode` tương ứng. | US-5.2 (phần nhập), YC#6 |
| **BR-4.6** | **Ảnh hoá đơn**: chụp từ camera hoặc tải ảnh lên (JPEG/PNG/WebP) hoặc tải **PDF** (mỗi trang thành một ảnh, PDF có lớp chữ thì đọc thẳng chữ, không cần OCR); mỗi hoá đơn đính kèm nhiều ảnh; xem ảnh gốc, tải về, xoá từng ảnh. Ảnh lưu thành file (OPFS, dự phòng Blob IndexedDB) qua `fileStorageService` có sẵn; xoá ảnh/hoá đơn/kèo/bữa giải phóng dung lượng thật. | US-4.2, YC#2, YC#14 |
| **BR-4.7** | **OCR offline**: ảnh của hoá đơn được quét **tự động ngay sau khi lưu** (xem BR-4.17); nút "Quét lại bill (OCR)" quét lại thủ công. Quét chạy ngay trên máy (không gửi ảnh đi đâu, không cần API key), có thanh tiến trình và nút Huỷ. Bóc tách **ngày, tên quán, danh sách món (tên, số lượng, đơn giá, thành tiền), giảm giá, phí phục vụ, VAT**. Kết quả đổ vào form, **chưa lưu** cho tới khi người dùng bấm Lưu. | US-4.3, YC#3, YC#4 |
| **BR-4.8** | **Xem lại & sửa nhanh** sau OCR: mọi trường và từng dòng món sửa/xoá/thêm được; dòng nghi ngờ (không đọc chắc số tiền) được đánh dấu. Cảnh báo khi tổng các món lệch tổng ghi trên bill. **Đối chiếu trước khi điền** (`domain/receiptValidation`): mỗi dòng phải có SL × đơn giá = thành tiền; tổng các món (trừ giảm giá, cộng phí phục vụ, VAT theo R-8) phải khớp tổng bill và dòng "Tổng tiền hàng". Lệch thì thử các kịch bản khác từ cùng văn bản OCR (sửa SL/đơn giá/thành tiền một dòng, bỏ dòng tổng bị đọc thành món, đổi hoặc thêm giảm giá/phí phục vụ/VAT, đổi cách tính), chọn kịch bản ít thay đổi nhất và đánh dấu dòng đã sửa; không kịch bản nào khớp thì giữ số đọc được và báo người dùng chỉnh tay. OCR sai hoặc lỗi **không bao giờ chặn** việc nhập tay. | US-4.3 |
| **BR-4.9** | **VAT**: ba chế độ `NONE` / `PERCENTAGE` / `FIXED_AMOUNT`, tự nhận từ OCR hoặc chọn tay. Với hoá đơn có món, VAT được **phân bổ vào từng món**; tổng giá sau mọi điều chỉnh của các món luôn bằng đúng `totalAmount` của hoá đơn (không lệch 1đ). | US-4.4, YC#4, 02 §2 |
| **BR-4.10** | **Tự đặt tên kèo theo quán**: khi lưu một hoá đơn có tên quán lấy từ OCR, nếu tên kèo vẫn là tên tự đặt (`Kèo <n>`) thì kèo **tự đổi** thành `Kèo <tên quán>`, kèm thông báo "Đã đổi tên kèo thành …". Kèo đã được người dùng đặt tên riêng thì **không bị đổi**. Đổi lại tên bằng tay được bất cứ lúc nào. | Yêu cầu của anh, UI §4.4 |
| **BR-4.15** | **Giảm giá** và **Phí phục vụ** là hai khoản điều chỉnh của hoá đơn, mỗi khoản có ba chế độ `NONE` / `PERCENTAGE` / `FIXED_AMOUNT`, nhập tay hoặc tự nhận từ OCR (dòng `Giảm giá`, `Chiết khấu`, `Phí phục vụ`, `Service charge` kèm % hoặc số tiền). Áp dụng cho cả tab *Nhập chi tiết món* và *Chỉ nhập tổng tiền*. Với hoá đơn có món, hai khoản này được phân bổ vào từng món cùng VAT (R-8), nên người ăn món đắt chịu phần phí phục vụ lớn hơn và hưởng giảm giá nhiều hơn tương ứng. | Yêu cầu của anh, 02 §2 |
| **BR-4.16** | **Xử lý ảnh như máy quét khi lưu** (`lib/documentScan`): ảnh chụp/tải lên được tìm 4 góc tờ hoá đơn, cắt và nắn phối cảnh để bỏ nền, rồi chuyển trắng đen bằng **ngưỡng thích nghi (contrast 0,25)**: nền trắng hoàn toàn, không đổ bóng, nét chữ vừa phải (không làm dày trừ khi nét đứt); ảnh lưu là bản đã xử lý (PNG nếu ≤ ~1 MB, không thì JPEG). Không dùng ảnh xám vì OCR kém hẳn ở ảnh có bóng và nếp gấp (đo trên 2 bill, 02 §3 bước 1). Không tìm thấy tờ giấy thì chỉ nhị phân hoá cả ảnh; kết quả đáng ngờ (ảnh quá tối) hoặc lỗi thì rơi về nén như dưới đây. **Nén ảnh khi lưu, luôn ở mức Cân bằng**: mọi ảnh thêm vào hoá đơn được nén cố định theo mức *Cân bằng* (R-18), người dùng **không chọn mức nén**. Ảnh vốn đã nhỏ thì không bị nén thêm; ảnh nhỏ tới mức OCR khó đọc thì có cảnh báo; dung lượng trước/sau hiển thị cho từng ảnh. | Yêu cầu của anh, US-1.3 |
| **BR-4.17** | **Tự quét OCR sau khi lưu ảnh và lưu kết quả vào ảnh**: ngay khi ảnh được lưu, app tự quét OCR những ảnh chưa có văn bản OCR rồi điền form (hỏi trước khi ghi đè nếu form đã có dữ liệu, R-13). Văn bản OCR được **lưu vào metadata của chính ảnh** (`ocrRawText`); ảnh đã có văn bản thì **không quét lại** (trừ khi bấm "Quét lại bill"), và văn bản đó là dữ liệu để phát hiện ảnh trùng (BR-4.18). OCR lỗi không làm mất ảnh và không chặn nhập tay. | Yêu cầu của anh |
| **BR-4.19** | **Đọc lại số tiền sau khi quét** (02 §3 bước 2, lượt 2): sau lượt quét chính, các số tiền được cắt riêng và đọc lại bằng bộ đọc chỉ-chữ-số để sửa lỗi nhầm chữ số (`1` ↔ `4`, `6` ↔ `8`). Chỉ sửa chữ số, không thêm/bớt dòng; kết quả vẫn qua đối soát tổng (BR-4.8) và người dùng sửa được ở form. Ký tự viền bảng, chữ `đ` bị đọc thành số, và số dài hơn 8 chữ số mà lẻ (mã số thuế, số hoá đơn, số tài khoản) không bị tính là số tiền / món. | Yêu cầu của anh |
| **BR-4.20** | **Bill có dòng tổng nhóm (Drink / Food)**: dòng `Drink 30.000`, `Food 1.510.000` là subtotal của nhóm món, **không thay thế** các món đọc được. Món của mỗi nhóm được đối soát với dòng nhóm của nó; nhóm thiếu món thì thêm dòng "Món chưa đọc được" đúng phần thiếu (đánh dấu để xem lại) và có ghi chú nêu nhóm và số tiền. Chỉ khi không đọc được món nào mới dùng hai dòng nhóm làm hai món. Số có dấu chấm/phẩy thừa phía sau (`90.000.`, `1.`) vẫn được đọc. | Yêu cầu của anh, 02 §3 bước 5 |
| **BR-4.18** | **Phát hiện và báo ảnh trùng**: sau khi quét, nếu văn bản OCR của ảnh mới giống ảnh đã có **trong cùng bữa** (cùng hoá đơn hoặc hoá đơn khác), form hiện thông báo nêu tên hai ảnh, mức giống, và nút **Xoá ảnh trùng** (xoá ảnh mới) hoặc **Giữ lại**. Ảnh trùng với ảnh cùng hoá đơn thì **không điền lại form** (dữ liệu đã có từ ảnh gốc). Chỉ cảnh báo, không tự xoá. | Yêu cầu của anh |
| **BR-4.11** | **Tổng chi phí** hiển thị ở mỗi hoá đơn, mỗi kèo (cộng các hoá đơn) và cả bữa (khớp với số đã hiển thị ở Epic 3). Bữa mới thêm hoá đơn đầu tiên thì "Chưa có chi phí" đổi thành số thật ở cả ba chế độ xem. | R-9 Epic 3 |
| **BR-4.12** | Bữa `ARCHIVED` hiển thị Khu vực 2 ở chế độ chỉ đọc: khoá mọi thao tác thêm/sửa/xoá. (Dữ liệu hoá đơn/ảnh của bữa lưu trữ do Epic 7 dọn; Epic 4 chỉ bảo đảm giao diện không cho sửa.) | US-7.3 |
| **BR-4.13** | Hành động phá huỷ (xoá kèo, xoá hoá đơn, xoá ảnh, bỏ người khỏi kèo khi đang dùng) dùng `ConfirmDialog` của app, nút Huỷ là mặc định. | BR-3.12 |
| **BR-4.14** | Dữ liệu nhập luôn bền vững: sau F5 mọi kèo, hoá đơn, món, ảnh còn nguyên; thao tác lỗi giữa chừng (quét OCR hỏng, lưu ảnh lỗi) không để lại hoá đơn nửa vời hoặc ảnh mồ côi. | US-1.2, US-1.3 |

### A.4. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
| :-: | :--- |
| **R-1** | **Tiền** là **số nguyên đồng** (VNĐ không có lẻ). Mọi ô nhập tiền chấp nhận `45000`, `45.000`, `45,000`, `45k` và lưu thành số nguyên không âm; từ chối âm, chữ lẫn lộn, hoặc > 9.999.999.999. Phép phân bổ/chia dùng số nguyên và dồn phần dư (R-8), không để lệch. |
| **R-2** | **Tên kèo**: bỏ khoảng trắng đầu/cuối, gộp khoảng trắng, tối đa 80 ký tự; để trống thì `Kèo <n>` với n là số thứ tự kế tiếp. Trùng tên được phép. **Tên quán**: tối đa 100 ký tự, tuỳ chọn. |
| **R-3** | **Thứ tự kèo** theo `orderIndex` liên tục từ 0; xoá kèo thì đánh số lại, đổi chỗ thì hoán đổi hai `orderIndex`. |
| **R-4** | **Người tham gia kèo** `P_s ⊆ Meal.participantIds`. Kèo mới = toàn bộ người bữa lúc tạo. Người thêm vào bữa sau **không tự vào kèo cũ**; muốn vào phải tick tay. Không ai ngoài bữa vào được kèo. |
| **R-5** | **Người ứng tiền** (`payerMemberId`) bắt buộc, thuộc `P_s`. Mặc định: chủ trì nếu thuộc `P_s`, ngược lại người đầu tiên trong `P_s`. Kèo có `P_s` rỗng thì không thêm được hoá đơn. |
| **R-6** | **Người chia đều** (`equalSplitParticipantIds`) ⊆ `P_s`, mặc định = `P_s`. Epic 4 không có ô chỉnh danh sách này (Epic 5 làm); khi `P_s` đổi thì cập nhật theo: người bị bỏ khỏi kèo bị bỏ khỏi danh sách, người được thêm vào kèo **không** tự thêm vào hoá đơn cũ. Danh sách chia đều không được rỗng. |
| **R-7** | **Ngày hoá đơn**: `YYYY-MM-DD` có thật, tuỳ chọn; OCR đọc `dd/mm/yyyy`, `dd-mm-yy`, `Ngày d tháng m năm yyyy` (năm 2 chữ số hiểu là 20xx). Ngày OCR ngoài `2000-01-01…2099-12-31` hoặc không có thật thì bỏ, không điền bừa. Đổi ngày bữa không đổi ngày hoá đơn (R-5 Epic 3). |
| **R-8** | **Công thức tính hoá đơn** (mọi số là số nguyên đồng). `S` = tiền hàng: `ΣR_i` với `R_i` là thành tiền gốc của món `i` (hoá đơn có món), hoặc số người dùng nhập (hoá đơn chỉ tổng). Theo **thứ tự cố định**: (1) **Giảm giá** `D`: `PERCENTAGE` → `round(S × p / 100)`, `FIXED_AMOUNT` → số nhập, `NONE` → 0; yêu cầu `0 ≤ D < S`. Tiền hàng sau giảm `N = S − D`. (2) **Phí phục vụ** `C` tính trên `N`: `PERCENTAGE` → `round(N × p / 100)`, `FIXED_AMOUNT` → số nhập. (3) **VAT** `V` tính trên `N + C`: `PERCENTAGE` → `round((N + C) × p / 100)`, `FIXED_AMOUNT` → số nhập. (4) `totalAmount = N + C + V`. *Lưu ý*: một số quán tính VAT chỉ trên tiền hàng, không gồm phí phục vụ; khi bill ghi **số tiền VAT cụ thể** thì dùng `FIXED_AMOUNT` để khớp đúng bill (OCR cũng ưu tiên số tiền ghi trên bill, xem R-14). **Phân bổ vào món** (phương pháp phần dư lớn nhất, tuần tự): `d_i` = phần của `D` theo tỷ lệ `R_i`; `n_i = R_i − d_i`; `c_i` = phần của `C` theo tỷ lệ `n_i`; `v_i` = phần của `V` theo tỷ lệ `n_i + c_i`; `finalAmount_i = n_i + c_i + v_i`. Mỗi lần phân bổ: mỗi món nhận `floor(X × w_i / Σw)`, phần dư cộng từng 1đ cho món có phần thập phân lớn nhất (hoà thì món đứng trước). Kết quả: `Σd_i = D`, `Σc_i = C`, `Σv_i = V`, `Σ finalAmount_i = totalAmount`. Tổng trọng số bằng 0 mà khoản cần phân bổ khác 0 thì từ chối với thông báo. |
| **R-9** | **Hoá đơn có món** (`ITEMIZED`): `subtotalAmount = Σ rawAmount`. **Hoá đơn chỉ tổng** (`TOTAL_ONLY`): người dùng nhập tiền hàng (`subtotalAmount`), không có món. Cả hai dùng công thức R-8 cho `totalAmount`. Nếu bill ghi sẵn "Tổng thanh toán" đã gồm mọi khoản thì người dùng để giảm giá/phí phục vụ/VAT = `NONE` và nhập tổng đó. `totalAmount` phải > 0. |
| **R-10** | **Món**: tên bắt buộc (tối đa 100 ký tự), số lượng số nguyên ≥ 1 (bill có lẻ như `0.5` thì người dùng gộp vào đơn giá), đơn giá ≥ 0; `rawAmount = quantity × unitPrice` mặc định, sửa tay thành tiền được (cho bill đã giảm giá). Hoá đơn `ITEMIZED` cần ≥ 1 món. Món mới tạo ở Epic 4 có `consumers = []` (Epic 5 gán). |
| **R-11** | **Đối chiếu tổng bill**: nếu OCR đọc được dòng "Tổng cộng/Thanh toán" và nó lệch `totalAmount` tính từ món, hiển thị cảnh báo `Tổng tính được 1.620.000 ₫ lệch tổng ghi trên bill 1.650.000 ₫` kèm gợi ý kiểm tra lại giảm giá/phí phục vụ/VAT; **không chặn lưu** (bill có khoản app chưa hỗ trợ như tip, làm tròn). |
| **R-12** | **Ảnh**: chỉ nhận `image/jpeg`, `image/png`, `image/webp` đầu vào, tối đa 40 MB/ảnh trước nén và 10 ảnh/hoá đơn. Ảnh được **nén trước khi lưu** theo R-18; bản đã nén là file duy nhất được lưu (không giữ bản gốc, xem hạn chế SA B.8-12). Hoá đơn chưa lưu (đang soạn) có ảnh tạm; huỷ form thì xoá ảnh tạm (BR-4.14). |
| **R-18** | **Mức nén ảnh cố định *Cân bằng***: đầu ra JPEG, cạnh dài tối đa **2000 px**, chất lượng **0,80**. Không bao giờ **phóng to**: ảnh có cạnh dài nhỏ hơn 2000 px giữ nguyên kích thước; ảnh nhỏ (≤ 400 KB) và không cần thu nhỏ thì không nén lại; nếu bản nén **lớn hơn** bản gốc thì giữ bản gốc. Ảnh có cạnh dài dưới 1000 px được cảnh báo "ảnh nhỏ, OCR có thể đọc sai". Dung lượng trước/sau lưu trong bản ghi ảnh (`originalSizeBytes`, `sizeBytes`). OCR đọc bản đã lưu (đã nén); mức *Cân bằng* vẫn đủ rõ cho OCR. |
| **R-19** | **So khớp ảnh trùng**: so sánh **tập từ** của văn bản OCR (bỏ dấu tiếng Việt, chỉ giữ chữ và số, bỏ từ 1 ký tự) bằng độ giống Jaccard; từ **0,8** trở lên là trùng. Văn bản dưới 8 từ thì không đủ để kết luận (không báo trùng). Chỉ so với ảnh của cùng bữa. Cùng bill chụp hai lần khác từng byte vẫn bị bắt vì số tiền và tên món giống nhau. |
| **R-13** | **OCR chạy hoàn toàn cục bộ**; dữ liệu ngôn ngữ (`vie`, `eng`) đi kèm app, không tải từ mạng khi quét. Lần quét đầu có thể chậm hơn do khởi tạo; hiển thị tiến trình. Nhiều ảnh được quét lần lượt và ghép văn bản theo thứ tự ảnh. Có thể quét lại bất cứ lúc nào; quét lại **hỏi trước khi ghi đè** những gì người dùng đã sửa tay. |
| **R-14** | **Phân tích hoá đơn** theo đúng heuristic trong 02 §3: ngày, tên quán (bỏ dòng địa chỉ/SĐT), VAT (`VAT 8%`, `Thuế GTGT: 36.000`), **giảm giá** (`Giảm giá`, `Chiết khấu`, `Khuyến mãi`, `Discount`, kèm % hoặc số tiền, có thể mang dấu trừ), **phí phục vụ** (`Phí phục vụ`, `Phục vụ`, `Phí DV`, `Service charge`, kèm % hoặc số tiền), món (bố cục 1 dòng và 2 dòng), bỏ dòng tiêu đề bảng, chân trang và các dòng giảm giá/phí phục vụ/VAT ra khỏi danh sách món. Khi bill có **cả % và số tiền** cho cùng khoản, ưu tiên số tiền (khớp đúng bill), giữ % làm ghi chú. Không chắc thì **bỏ trống và đánh dấu**, không đoán số tiền. Parser là hàm thuần, có bộ ví dụ chuẩn làm test. |
| **R-15** | **Xoá dây chuyền**: xoá ảnh → xoá bản ghi `invoice_files` (qua `fileStorageService`); xoá hoá đơn → ảnh + món + hoá đơn; xoá kèo → mọi hoá đơn của kèo. File vật lý xoá **trước**, DB sau (cùng nguyên tắc R-6 Epic 3), để lỗi giữa chừng không để file mồ côi. |
| **R-16** | **Bỏ người khỏi bữa** (Epic 2): người đang là người ứng hoặc người chia đều của một hoá đơn vẫn bị chặn `MEMBER_IN_USE` như hiện nay; người chỉ có trong `P_s` thì tự rời (đã có). Epic 4 chỉ bảo đảm hàm kiểm tra dùng chung dữ liệu hoá đơn mới. |
| **R-17** | **Hiển thị**: tiền theo `formatMoney`, chữ số thẳng cột; kèo thu gọn/mở rộng được (mặc định mở kèo vừa thêm, thu gọn các kèo khác khi bữa có ≥ 4 kèo). |

### A.5. Tiêu chí nghiệm thu (nghiệp vụ)

Bốn tiêu chí đầu lấy từ [04 — Epic 4](../04-epics-and-roadmap.md); các tiêu chí sau do BR/SA bổ sung.

- [x] AC-1: Mỗi kèo có danh sách người tham gia riêng (mặc định cả bữa); người ứng và người chia đều của hoá đơn thuộc danh sách đó; không bỏ được người đang được dùng. *(BR-4.3, R-4…R-6)*
- [ ] AC-2: Mỗi kèo thêm được nhiều hoá đơn; mỗi hoá đơn có nhiều ảnh xem lại, tải về, xoá được; xoá ảnh/hoá đơn/kèo/bữa giải phóng file thật. *(BR-4.4, BR-4.6, R-15)* *(đạt một phần, xem SA B.10)*
- [ ] AC-3: Quét ảnh bill bằng OCR bóc tách được ngày, tên quán, món + giá và VAT trên bộ bill mẫu; người dùng sửa nhanh trước khi lưu; OCR hỏng không chặn nhập tay. *(BR-4.7, BR-4.8, R-14)* *(đạt một phần, xem SA B.10)*
- [x] AC-4: Khi hoá đơn có VAT, tổng giá sau VAT của các món khớp tuyệt đối `totalAmount`, kể cả khi chia không tròn (kiểm bằng nhiều bộ số, gồm trường hợp phần dư). *(BR-4.9, R-8)*
- [x] AC-5: Thêm/đổi tên/sắp xếp/xoá kèo hoạt động; kèo mới tự đặt `Kèo <n>`; xoá kèo kèm xác nhận nêu số lượng sẽ mất và xoá sạch dữ liệu con. *(BR-4.1, BR-4.2, R-2, R-3)*
- [x] AC-6: Nhập tab "Chỉ nhập tổng tiền" lưu được hoá đơn không món, tổng đúng sau VAT. *(BR-4.5, R-9)*
- [ ] AC-7: Tổng chi phí hoá đơn/kèo/bữa đúng, và cột "tổng chi phí" ở cả ba chế độ xem bữa (Epic 3) cập nhật ngay, không cần tải lại. *(BR-4.11)* *(đạt một phần, xem SA B.10)*
- [ ] AC-8: Sau F5 mọi dữ liệu còn nguyên; huỷ form đang soạn không để lại ảnh/hoá đơn mồ côi. *(BR-4.14, R-12)* *(đạt một phần, xem SA B.10)*
- [x] AC-9: Bữa `ARCHIVED` không sửa được kèo/hoá đơn/ảnh. *(BR-4.12)*
- [x] AC-10: Nhập tiền chấp nhận `45000` / `45.000` / `45k`, từ chối giá trị không hợp lệ kèm thông báo tiếng Việt. *(R-1)*
- [ ] AC-11: Dùng được ở ≤ 375 px không cuộn ngang; mọi nút/ô chạm ≥ 44 px; thao tác bằng bàn phím được; camera hoạt động trên điện thoại. *(phi chức năng)* *(đạt một phần, xem SA B.10)*
- [x] AC-12: Các test Epic 1–3 vẫn đạt. *(hồi quy)*
- [x] AC-13: Giảm giá và phí phục vụ (%, số tiền, hoặc không) nhập tay và nhận từ OCR; `totalAmount = tiền hàng − giảm giá + phí phục vụ + VAT` theo đúng thứ tự R-8; các khoản được phân bổ vào món và `Σ finalAmount = totalAmount` tuyệt đối trên nhiều bộ số (gồm chia không tròn và `D` sát `S`). *(BR-4.15, R-8, R-14)*
- [x] AC-14: Lưu hoá đơn có tên quán từ OCR thì kèo mang tên tự đặt đổi thành `Kèo <tên quán>` và hiện thông báo; kèo đã có tên riêng không bị đổi; tên quá dài bị cắt đúng giới hạn. *(BR-4.10)*
- [x] AC-15: Mọi ảnh được nén ở mức Cân bằng (không có lựa chọn mức nén), không phóng to, không lưu bản nén lớn hơn bản gốc, hiện dung lượng trước/sau, cảnh báo ảnh nhỏ; sau nén ảnh vẫn OCR được trên bill mẫu. *(BR-4.16, R-18)*
- [x] AC-16: Sau khi lưu ảnh, app tự quét OCR và điền form; văn bản OCR được lưu vào ảnh; ảnh đã có văn bản không bị quét lại khi thêm ảnh khác. *(BR-4.17)*
- [x] AC-17: Thêm một ảnh trùng với ảnh đã có trong bữa thì hiện thông báo kèm nút Xoá ảnh trùng / Giữ lại; bill khác nhau không bị báo trùng; ảnh trùng cùng hoá đơn không điền lại form. *(BR-4.18, R-19)*
- [x] AC-18: Bill mẫu Bún Ốc (4 món, tổng 176.000): sau quét đọc đủ 4 món với SL / đơn giá / thành tiền đúng, tổng 176.000 và `Số: 2506041166`, MST, số tài khoản không thành món; nhãn `Téng thanh toán` và `176.0004` vẫn cho ra tổng 176.000. *(BR-4.19, BR-4.16)*
- [x] AC-19: Bill Matchandeul BBQ (7 món + `Drink 30.000`, `Food 1.510.000`, tổng 1.540.000): mất 2 dòng món vì số có dấu chấm thừa thì vẫn giữ đủ các món đọc được, thêm một dòng "Món chưa đọc được" 220.000 trong nhóm Food nếu hai dòng đó vẫn không đọc được, và không bao giờ chỉ còn hai dòng `Tổng đồ uống` / `Tổng đồ ăn` khi đã đọc được món. *(BR-4.20)*

### A.6. Ngoài phạm vi
- Sửa/xoá món sau khi lưu, màn danh sách món đầy đủ, khoá `TOTAL_ONLY → EQUAL_TOTAL` ở giao diện chuyển chế độ, chuyển `BY_ITEM`/`EQUAL_TOTAL`, gán người ăn và số phần, chỉnh danh sách người chia đều (Epic 5). Epic 4 chỉ để món ở dạng "đã có trong hoá đơn, chưa gán người ăn".
- Tính tiền từng người, gom nhóm thanh toán, bảng quyết toán, tick thanh toán (Epic 6).
- Lưu trữ bữa và dọn hoá đơn/món/file khi lưu trữ (Epic 7).
- Chia sẻ, Snapshot (Epic 8).
- Giảm giá **theo từng món**, tip, nhiều mức VAT trên cùng một bill, làm tròn tổng bill, ngoại tệ. (Giảm giá và phí phục vụ **ở mức cả bill** thuộc Epic 4.)
- Cắt/xoay/nắn phẳng ảnh bill bằng tay; OCR bằng dịch vụ đám mây; nhận diện chữ viết tay.
- Quét mã QR hoá đơn điện tử; nhập từ hoá đơn PDF.
- Hoàn tác xoá kèo/hoá đơn.
