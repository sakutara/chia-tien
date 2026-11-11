<!-- Nguyên văn documentation/epic-2/SA.md (System Analysis) tại thời điểm chuyển sang OpenSpec, 2026-11-11. Tài liệu lịch sử: có thể không còn khớp code hiện tại; hành vi hiện hành nằm ở openspec/specs/. -->

# Epic 2 — System Analysis (SA)

**Epic 2**: Quản lý Danh bạ Thành viên, Quick Filter (A-Z), Chủ trì & Nhóm Thanh toán · **Trạng thái**: đã triển khai (code tại `app/`); build, lint và 92 test tự động đạt; kiểm thử thủ công trên trình duyệt **chưa thực hiện**

Tài liệu đi cùng: [BR](./BR.md) · [Kiến trúc & Data model](../01-architecture-and-data-model.md) · [Nghiệp vụ §4–5](../02-business-logic-and-algorithms.md) · [UI §4.3](../03-ui-ux-and-design-system.md)

---

### B.1. Công nghệ
Dùng lại stack Epic 1: React 19 · TypeScript · Tailwind · Dexie 4 + `dexie-react-hooks` · lucide-react · Vitest + fake-indexeddb + jsdom. **Không thêm thư viện cho phần logic.** Kiểm thử component (Q-5 đã chốt) thêm vào devDependencies: `@testing-library/react@16.3.0`, `@testing-library/dom@10.4.0`, `@testing-library/user-event@14.6.1`.

Lưu ý khi test component: Vitest chưa bật `globals`, nên RTL không tự dọn DOM; mỗi file component phải có `afterEach(cleanup)`. Dự án **không** dùng `jest-dom`; assert bằng `textContent` và `queryBy… === null`.

Sắp xếp A-Z: `Intl.Collator('vi')` có sẵn trong trình duyệt và Node (ICU đầy đủ).

### B.2. Cấu trúc mã nguồn

```text
app/src/
├─ types/index.ts                  # không đổi (Member, Meal, PaymentGroup đã đủ trường)
├─ db/
│  ├─ db.ts, seed.ts               # không đổi (không nâng version schema)
│  ├─ normalize.ts                 # THÊM cleanName, formatMemberName, hasDiacritics, MEMBER_NAME_MAX
│  └─ normalize.test.ts            # 13 test
├─ domain/                         # THUẦN, không chạm DB
│  ├─ memberFilter.ts              # sortMembers, filterMembers, findExactMatch, findDiacriticVariants, allocateKey, decideEnter
│  ├─ memberFilter.test.ts         # 22 test
│  ├─ paymentGroupRules.ts         # defaultGroupName, validateGroupDraft, shrinkGroups
│  └─ paymentGroupRules.test.ts    # 10 test
├─ services/
│  ├─ peopleErrors.ts              # PeopleError + PeopleErrorCode
│  ├─ memberService.ts             # validateMemberName, avatarColorFor, findMemberByName, getOrCreateMember, renameMember
│  ├─ memberService.test.ts        # 10 test
│  ├─ mealPeopleService.ts         # initMealPeople, add/create/remove participant, setHost, create/update/dissolve group, hasPaidStatusAffected
│  └─ mealPeopleService.test.ts    # 22 test
├─ hooks/
│  ├─ useMembers.ts                # danh bạ đã xếp (sortMembers) qua useLiveQuery
│  └─ useMealPeople.ts             # bữa + participants + host + groups (kèm members) qua useLiveQuery
├─ components/people/
│  ├─ MemberQuickFilter.tsx        # combobox ARIA: lọc, Enter, mũi tên, "+ Thêm người mới", "Đã tham gia"
│  ├─ MemberQuickFilter.test.tsx   # 9 test (gồm bỏ qua Enter khi IME đang ghép)
│  ├─ ParticipantList.tsx          # chip người tham gia (avatar chữ cái inline), nút bỏ, hiện lỗi chặn
│  ├─ HostSelector.tsx             # radio group chọn chủ trì trong số người tham gia
│  ├─ HostSelector.test.tsx        # 3 test (ghi DB thật)
│  ├─ PaymentGroupPanel.tsx        # danh sách nhóm + sửa / giải tán / tạo
│  ├─ PaymentGroupDialog.tsx       # tạo / sửa nhóm (người ở nhóm khác bị vô hiệu hoá)
│  └─ PaymentGroupDialog.test.tsx  # 3 test (ghi DB thật)
├─ pages/PeopleSandbox.tsx         # ĐÃ XOÁ ở Epic 3 (thay bằng MealWorkspacePage); từng là bữa nháp "Bữa thử nghiệm (Epic 2)" + đổi tên chủ app (BR-2.7); thay bằng màn bữa ở Epic 3
└─ App.tsx                         # header Epic 1 + PeopleSandbox (thay hoá đơn mẫu)
```

### B.3. Thành phần & trách nhiệm

| Thành phần | Trách nhiệm | Phụ thuộc |
| :--- | :--- | :--- |
| `normalize.cleanName` / `formatMemberName` | Áp R-1: `cleanName` trim, gộp khoảng trắng, kiểm độ dài; `formatMemberName(raw)` = `cleanName` rồi viết thường toàn chuỗi (`toLocaleLowerCase('vi')`) và viết hoa chữ cái đầu mỗi từ (từ bắt đầu sau khoảng trắng hoặc `-`, `toLocaleUpperCase('vi')`). Là **cổng duy nhất** tạo ra `Member.name` | `normalizeName` |
| `domain/memberFilter` | Sắp ghim + A-Z (R-3), lọc theo R-4, tìm khớp chính xác và khớp khác dấu (R-2), cấp khoá `normalizedName` không trùng (`allocateKey`), quyết định hành vi `Enter` (R-6). Không chạm DB | `normalizeName` |
| `domain/paymentGroupRules` | Tên nhóm mặc định, kiểm hợp lệ nhóm (R-9), co nhóm khi mất người (R-10, R-11). Hàm thuần trên mảng `PaymentGroup` | `services/peopleErrors` (ném lỗi) |
| `memberService` | Tạo/tìm người theo tên hiển thị (R-2a), cấp khoá không trùng (R-2b), đổi tên hồ sơ, gán `avatarColor`. `getOrCreateMember` **không tự mở transaction**: chỉ gọi từ trong transaction có `db.members` | `db`, `normalize`, `domain/memberFilter` |
| `mealPeopleService` | Mọi thay đổi người/chủ trì/nhóm của một bữa, mỗi hàm là **một transaction** có đủ bảng liên quan (R-7, R-14); bỏ người kiểm tra `invoices`/`items` (R-12) | `db`, `memberService`, `domain/*` |
| `useMembers` | Trả danh bạ đã xếp (ghim chủ app, A-Z), cập nhật tức thì khi DB đổi | `db`, `memberFilter` |
| `useMealPeople` | Trả `meal`, `participants` (đã xếp), `host`, `groups` kèm `members`; `null` nếu không có bữa | `db`, `memberFilter` |
| `MemberQuickFilter` | UI R-4/5/6; gọi `onPick(member)` / `onCreate(name)` do cha truyền vào; quyết định Enter lấy từ `decideEnter` | `memberFilter` |
| `PaymentGroupPanel/Dialog` | UI tạo, sửa, giải tán nhóm; hiển thị lỗi R-9 | `mealPeopleService` |
| `HostSelector` | Chọn chủ trì trong số người tham gia | `mealPeopleService` |

Quy ước: component chỉ giao tiếp với DB qua hook (đọc) và `mealPeopleService` (ghi). Không gọi `db` trực tiếp trong component.

### B.4. Thiết kế dữ liệu

**Không đổi schema, không nâng version Dexie.** `Member`, `Meal.participantIds`, `Meal.hostMemberId`, `Meal.paymentGroups`, `Meal.settlementStatuses` đã đủ trường (Epic 1 / file 01 §3.1–3.2). Lý do không thêm index: số người trong danh bạ nhỏ (tối đa vài trăm) nên lọc và xếp trong bộ nhớ; truy vấn "bữa nào có người X" chưa cần (xem R-15).

Ràng buộc toàn vẹn (service giữ, DB không tự ép) cho mỗi `Meal` ACTIVE:

| # | Bất biến |
| :-: | :--- |
| I-1 | `participantIds` không trùng; mọi id tồn tại trong `members` |
| I-2 | `hostMemberId ∈ participantIds` |
| I-3 | Mỗi `PaymentGroup.memberIds` có ≥ 2 id, đều thuộc `participantIds`, không trùng nhau |
| I-4 | Một `memberId` xuất hiện trong tối đa một nhóm |
| I-5 | `representativeId ∈ memberIds` của nhóm đó |
| I-6 | Khoá của `settlementStatuses` chỉ gồm `memberId` ∈ `participantIds` chưa vào nhóm, hoặc `paymentGroupId` còn tồn tại (Epic 6 ghi, Epic 2 dọn theo R-13) |
| I-7 | `Member.normalizedName` duy nhất trong toàn danh bạ (có thể mang hậu tố số `an`, `an2`… theo R-2b); không có hai `Member` cùng tên hiển thị (so sánh không phân biệt hoa/thường, phân biệt dấu) |

Lưu ý: `normalizedName` giờ là **khoá tìm kiếm duy nhất**, không còn là chuỗi bỏ dấu thuần như mô tả ở [Epic 1 R-4](../epic-1/BR.md). Hồ sơ cũ đã seed (`chu app (toi)`) vẫn hợp lệ. Cần ghi chú sang Epic 1 BR khi đóng Epic 2.

`Member.avatarColor`: chọn theo băm của `normalizedName` từ dải 6 màu xanh USD (`#1B4332`, `#2D6A4F`, `#40916C`, `#52796F`, `#3A5A40`, `#386641`) để cùng một người luôn cùng màu, không cần lưu trạng thái bổ sung. Hồ sơ chủ app giữ `#2D6A4F` đã seed.

### B.5. Luồng xử lý chính

**Quick Filter: gõ, chọn, tạo mới**
```mermaid
flowchart TD
    A["Người dùng gõ vào ô lọc"] --> B["q = formatMemberName(input)"]
    B --> C["list = sortMembers(filterMembers(allMembers, q)) (ghim chủ app, rồi A-Z)"]
    C --> D{"findExactMatch(q)?"}
    D -- "có" --> E["Ẩn nút '+ Thêm người mới', hiện nhắc 'Đã có ... hãy thêm họ/hậu tố'"]
    D -- "không, q rỗng" --> E
    D -- "không, q khác rỗng" --> F["Hiện '+ Thêm người mới: q'"]
    C --> G["Mỗi dòng: tên, huy hiệu chủ trì (nếu có), '✓ Đã tham gia' (nếu có)"]
    H["Nhấn Enter / click"] --> I{"decideEnter(...)"}
    I -- "pick(member), chưa tham gia" --> J["addParticipant(mealId, member.id)"]
    I -- "pick(member), đã tham gia" --> K["Báo 'Đã tham gia', không đổi gì"]
    I -- "create(q)" --> L["createAndAddParticipant(mealId, q)"]
    I -- "noop (q rỗng)" --> M["Không làm gì"]
```

**Thêm người mới vào bữa (nguyên tử)**
```mermaid
sequenceDiagram
    participant UI as MemberQuickFilter
    participant S as mealPeopleService
    participant D as IndexedDB
    UI->>S: createAndAddParticipant(mealId, raw)
    S->>D: tx rw (meals, members)
    S->>D: get meal; kiểm ACTIVE (R-14)
    S->>D: tìm member có tên hiển thị giống hệt cả dấu (R-2a)
    alt đã có
        S-->>S: dùng member cũ, created = false
    else chưa có
        S->>D: allocateKey: normalizedName không trùng (an, an2, ...) (R-2b)
        S->>D: add Member mới (avatarColor theo băm của khoá)
    end
    S->>D: put meal.participantIds += id (nếu chưa có); lastUsedAt = now
    S-->>UI: { member, created }
    D-->>UI: useLiveQuery tự cập nhật danh sách
```

**Bỏ người khỏi bữa**
```mermaid
flowchart TD
    A["removeParticipant(mealId, memberId)"] --> B{"Bữa ACTIVE?"}
    B -- "không" --> X1["PeopleError MEAL_ARCHIVED"]
    B -- "có" --> C{"memberId = hostMemberId?"}
    C -- "có" --> X2["PeopleError HOST_REQUIRED"]
    C -- "không" --> D{"Là payer của hoá đơn / có trong consumers / equalSplitParticipantIds?"}
    D -- "có" --> X3["PeopleError MEMBER_IN_USE (kèm nơi dùng)"]
    D -- "không" --> E0["Gỡ khỏi SessionKeo.participantIds của mọi kèo trong bữa (R-12e)"]
    E0 --> E["Gỡ khỏi participantIds"]
    E --> F["shrinkGroups: gỡ khỏi nhóm, đổi đại diện (R-10), giải tán nhóm còn < 2 (R-11)"]
    F --> G["Xoá khoá settlementStatuses bị ảnh hưởng (R-13)"]
    G --> H["put meal, cập nhật updatedAt"]
```

**Tạo / sửa nhóm thanh toán**
```mermaid
flowchart TD
    A["createGroup(mealId, draft)"] --> B["Bữa ACTIVE?"]
    B --> C["validateGroupDraft: ≥2 người, thuộc participantIds, không trùng"]
    C --> D{"Có người đã ở nhóm khác?"}
    D -- "có" --> X["PeopleError MEMBER_ALREADY_GROUPED (nêu tên nhóm)"]
    D -- "không" --> E["name = trim(draft.name) hoặc defaultGroupName"]
    E --> F["representativeId = draft.representativeId hoặc memberIds[0]"]
    F --> G["push PaymentGroup; xoá settlementStatuses của các memberId này (R-13)"]
```

### B.6. Giao diện lập trình nội bộ

**Lỗi**: `class PeopleError extends Error { code: PeopleErrorCode; detail?: Record<string, unknown> }` với

| `code` | Khi nào |
| :--- | :--- |
| `MEAL_NOT_FOUND` | `mealId` không tồn tại |
| `MEAL_ARCHIVED` | Bữa `ARCHIVED` (R-14) |
| `INVALID_NAME` | Tên rỗng / quá 50 ký tự (R-1), tên nhóm quá 80 ký tự |
| `DUPLICATE_NAME` | Đổi tên thành tên đã có (cùng dấu) của người khác (R-2a); `detail.existingMemberId` |
| `MEMBER_NOT_FOUND` | `memberId` không có trong danh bạ |
| `NOT_PARTICIPANT` | Thao tác với người chưa tham gia bữa (đặt chủ trì, vào nhóm) |
| `HOST_REQUIRED` | Bỏ người chủ trì khỏi bữa (R-8) |
| `MEMBER_IN_USE` | Bỏ người đang gắn với hoá đơn/món (R-12); `detail.reasons` liệt kê `payer` / `consumer` / `equalSplit` |
| `GROUP_NOT_FOUND` | `groupId` không có trong bữa |
| `GROUP_TOO_SMALL` | Nhóm < 2 người |
| `NOT_IN_GROUP` | *(thêm khi code)* Đại diện nhóm không thuộc nhóm đó (R-10); `detail.memberId` |
| `MEMBER_ALREADY_GROUPED` | Người đã ở nhóm khác; `detail.groupId`, `detail.groupName`, `detail.memberId` |

Mọi hàm ghi là `async`, chạy trong một transaction và **không ghi gì** nếu ném lỗi (vì lỗi làm transaction rollback).

**`domain/memberFilter.ts`** (thuần)

| Hàm | Mô tả |
| :--- | :--- |
| `sortMembers(members: Member[]): Member[]` | R-3: người `isDefaultHost` đứng đầu, còn lại `Intl.Collator('vi')` theo `name`, hoà thì theo `createdAt`. Trả mảng mới, không đổi mảng vào |
| `filterMembers(members, query: string): Member[]` | R-4. Khớp trên `normalizedName`; trả đã qua `sortMembers` |
| `findExactMatch(members, query): Member \| undefined` | R-2a: `query` đã qua `formatMemberName`, so sánh bằng tên hiển thị (NFC) |
| `findDiacriticVariants(members, query): Member[]` | R-2b/R-6c: người có cùng dạng không dấu với `query` (không tính khoá hậu tố) nhưng khác dấu |
| `allocateKey(members, rawName, selfId?): string` | R-2b: `base = normalizeName(rawName)`; trả `base` nếu chưa ai dùng, nếu không trả `base2`, `base3`… nhỏ nhất còn trống; bỏ qua `selfId` khi đổi tên |
| `decideEnter({ query, members, highlightedId, participantIds }): EnterAction` | R-6. `EnterAction` = `{type:'pick', member}` · `{type:'already', member}` · `{type:'create', name}` · `{type:'noop'}`. Thứ tự quyết định theo R-6: dòng đang chọn → khớp chính xác → (từ khoá không dấu và có người khác dấu) chọn người đầu tiên → tạo mới. `name` trong `create` đã qua `formatMemberName`, cũng là chuỗi hiển thị trên nút "+ Thêm người mới" |

**`domain/paymentGroupRules.ts`** (thuần)

| Hàm | Mô tả |
| :--- | :--- |
| `defaultGroupName(memberNames: string[]): string` | `A + B + C` (R-9) |
| `validateGroupDraft({ memberIds, participantIds, existingGroups, ignoreGroupId?, names }): void` | Ném `PeopleError` theo `GROUP_TOO_SMALL`, `NOT_PARTICIPANT`, `MEMBER_ALREADY_GROUPED`. *(thêm `names` so với thiết kế ban đầu để thông báo lỗi có tên người)* |
| `shrinkGroups(groups, removedMemberIds): { groups, dissolvedGroupIds }` | R-10, R-11. *(trả thêm `dissolvedGroupIds` để dọn khoá R-13)* |

**`services/memberService.ts`**

| Hàm | Mô tả |
| :--- | :--- |
| `findMemberByName(name): Promise<Member \| undefined>` | Theo tên hiển thị đã `formatMemberName`, cùng dấu (R-2a) |
| `getOrCreateMember(rawName, now): Promise<{member: Member; created: boolean}>` | *(đổi chữ ký: nhận `now` để mọi bản ghi của một thao tác dùng cùng một thời điểm)* Không mở transaction; chỉ dùng trong transaction của `mealPeopleService`. Lưu `name = formatMemberName(name)` (R-1) và `normalizedName = allocateKey(...)` (R-2b); nếu đã có người cùng tên hiển thị (R-2a) thì trả người đó, `created = false`, không ghi đè |
| `renameMember(id, name): Promise<Member>` | Lưu `name = formatMemberName(name)` + `normalizedName`; `INVALID_NAME` nếu rỗng; `DUPLICATE_NAME` nếu trùng tên hiển thị của người khác; khoá chỉ cấp lại (`allocateKey` với `selfId`) khi dạng không dấu của tên đổi |

**`services/mealPeopleService.ts`** (tham số đầu luôn là `mealId`)

| Hàm | Mô tả |
| :--- | :--- |
| `initMealPeople(): Promise<{participantIds: string[]; hostMemberId: string}>` | Giá trị khởi tạo cho **Epic 3** khi tạo bữa: host = `defaultHostMemberId`, participants = `[host]` (R-8) |
| `addParticipant(mealId, memberId)` | Thêm; đã có thì no-op (idempotent); cập nhật `lastUsedAt` |
| `createAndAddParticipant(mealId, rawName)` | Luồng B.5; trả `{member, created}` |
| `removeParticipant(mealId, memberId)` | Luồng B.5. Transaction gồm `meals`, `sessions`, `invoices`, `items`; ngoài các kiểm tra chặn còn tự gỡ người khỏi `participantIds` của các kèo trong bữa (R-12e, thêm khi làm Epic 3). Có 2 test: gỡ đúng kèo của bữa này và không đụng bữa khác; không đổi gì khi bị chặn bởi hoá đơn |
| `setHost(mealId, memberId)` | `NOT_PARTICIPANT` nếu người đó chưa tham gia |
| `createGroup(mealId, {name?, memberIds, representativeId?})` | Trả `PaymentGroup` |
| `updateGroup(mealId, groupId, {name?, memberIds?, representativeId?})` | Đổi thành phần phải qua `validateGroupDraft` với `ignoreGroupId = groupId`; dọn khoá R-13 cho cả người cũ lẫn mới |
| `dissolveGroup(mealId, groupId)` | Xoá nhóm và khoá `settlementStatuses[groupId]` |
| `hasPaidStatusAffected(meal, memberIds, groupId?)` | Hàm đọc để UI hỏi xác nhận trước khi gọi các hàm trên (R-13) |

**Hook**

| Hook | Trả về |
| :--- | :--- |
| `useMembers()` | `Member[]` A-Z, `undefined` khi đang tải |
| `useMealPeople(mealId)` | `{ meal, participants: Member[] (A-Z), host: Member, groups: Array<PaymentGroup & {members: Member[]}> } \| undefined` |

**Component chính**

| Component | Props | Hành vi |
| :--- | :--- | :--- |
| `MemberQuickFilter` | `members`, `participantIds`, `onPick(m)`, `onCreate(name)`, `disabled?` | *(không có `hostMemberId`: chủ app được ghim qua `isDefaultHost` trong `sortMembers`)* Combobox ARIA (`role="combobox"`, `aria-activedescendant`), phím `↑ ↓ Enter Esc`; `Enter` và click đều đi qua `decideEnter`; sau khi chọn/tạo xoá ô. Chưa có `autoFocus` và chưa giữ focus sau khi tạo |
| `ParticipantList` | `meal`, `participants`, `readOnly?` | *(đổi: nhận `meal` để kiểm R-13, tự gọi `removeParticipant`)* Hỏi `window.confirm` khi người bị bỏ đang có tick; hiện lỗi `MEMBER_IN_USE` (kèm lý do) và `HOST_REQUIRED` |
| `HostSelector` | `mealId`, `participants`, `hostMemberId`, `readOnly?` | *(đổi: tự gọi `setHost`, không có `onChange`)* Radio group, chỉ gồm người tham gia |
| `PaymentGroupPanel` | `meal`, `groups`, `participants`, `readOnly?` | Liệt kê nhóm, nút sửa / giải tán (giải tán có hỏi xác nhận nếu có tick), `+ Tạo nhóm thanh toán` |
| `PaymentGroupDialog` | `meal`, `participants`, `group?`, `onClose` | Tick chọn thành viên (người đã ở nhóm khác bị vô hiệu kèm tên nhóm), nhập tên (≤ 80), chọn đại diện; khi đổi thành phần có tick thì hỏi xác nhận |

Giao diện tuân [03 §4.3](../03-ui-ux-and-design-system.md): chủ trì có huy hiệu vàng `usd-gold-600` (icon `Crown`), nhóm có icon `Users`, nút dùng `btn-primary` / `btn-secondary`. Các nút và ô nhập có chiều cao tối thiểu 44 px. *Chưa làm: `MemberAvatar` riêng (avatar nằm inline trong `ParticipantList`), `autoFocus` và giữ focus sau khi thêm.*

### B.7. Yêu cầu phi chức năng

| Nhóm | Yêu cầu |
| :--- | :--- |
| Bền vững | Mọi thay đổi ghi qua transaction; F5 không mất người/nhóm (AC-4) |
| Hiệu năng | Lọc trong bộ nhớ, mục tiêu < 16 ms với 500 người; không gọi DB mỗi phím gõ (dữ liệu lấy từ `useMembers`) |
| Tương thích | `Intl.Collator('vi')` trên Safari/Chrome/Firefox hiện hành; nếu môi trường không có locale `vi` thì rơi về `'und'` và ghi vào B.8 |
| Khả dụng | Điều khiển hoàn toàn bằng bàn phím; ARIA combobox; thông báo lỗi dạng text, không chỉ dựa vào màu; vùng chạm ≥ 44 px trên di động |
| Bảo mật/riêng tư | Tên người chỉ lưu cục bộ; chuỗi tên hiển thị qua React (tự thoát HTML), không dùng `dangerouslySetInnerHTML` |
| Bảo trì | Logic quyết định nằm ở `domain/*` (thuần, dễ test), component chỉ ghép nối |

### B.8. Rủi ro, hạn chế & câu hỏi mở

| Mục | Mô tả | Hướng xử lý |
| :--- | :--- | :--- |
| Trùng tên / khác dấu | Hai người thật cùng tên cùng dấu không lưu được, phải tự thêm họ hoặc hậu tố; `An`/`Ân` là hai người và dùng khoá `an`/`an2` | Giao diện nhắc cách phân biệt khi gõ tên đã có (R-2a); `Enter` với từ khoá không dấu ưu tiên người có dấu đã có (R-6c) để tránh tạo nhầm |
| Khoá `an2` lộ ra khi tìm | Gõ `an2` mới ra người thứ hai; người dùng không biết hậu tố | Hậu tố chỉ là khoá nội bộ, không hiển thị; người dùng tìm theo tên có dấu thông thường. Nếu gây khó hiểu thì tách hẳn trường khoá khỏi `normalizedName` (cần nâng schema) |
| Quy tắc cũ của Epic 1 | `normalizedName` từng được mô tả là chuỗi bỏ dấu thuần | Ghi chú lại trong [Epic 1 BR R-4](../epic-1/BR.md) khi đóng Epic 2 (chưa làm) |
| Collator `vi` | Nếu trình duyệt thiếu dữ liệu locale, thứ tự `Đ` có thể sai | Đã kiểm trên Node (`Cường` < `Dung` < `Đạt`); chưa kiểm trên Safari/Firefox |
| `MEMBER_IN_USE` dựa trên dữ liệu giả | Hoá đơn/món chỉ có từ Epic 4–5; test ghi bản ghi giả vào `invoices`/`items` | Đã kiểm đủ ba nhánh `payer`, `consumer`, `equalSplit`; kiểm lại với dữ liệu thật khi Epic 4–5 xong |
| Dọn `settlementStatuses` | Tick thanh toán là dữ liệu của Epic 6; Epic 2 xoá khoá khi nhóm đổi | Có xác nhận ở UI (R-13) bằng `window.confirm`; Epic 6 phải dùng cùng quy ước khoá |
| Hộp xác nhận `window.confirm` | Hộp thoại hệ thống, không đúng giao diện USD | Chấp nhận cho bản thử nghiệm; thay bằng modal khi làm Epic 3 |
| Kiểm thủ công chưa đủ | Đã mở `PeopleSandbox` trên dev server (Chrome): thêm, chốt bằng Enter, đổi chủ trì, tạo nhóm đều đạt. Chưa kiểm bàn phím thuần, màn hình hẹp, F5 | Hoàn tất các mục còn lại ở B.10 trước khi đóng Epic |
| Dữ liệu thử trong trình duyệt | Bản thử nghiệm lưu trong IndexedDB của trình duyệt có vài tên thử (`Binh`, `Bình`, `Bìnhbinh`, `Hương`, `Thảo`) | Chỉ là dữ liệu cục bộ của trình duyệt, không ảnh hưởng mã nguồn; xoá bằng cách xoá dữ liệu site hoặc khi Epic 3 thay trang thử |
| Tên người dài / ký tự lạ | Emoji, ký tự điều khiển | R-1 giới hạn 50 ký tự; `cleanName` bỏ ký tự điều khiển (`\p{C}`) |
| Chưa có màn hình bữa | Epic 3 mới tạo bữa thật | Q-1: dùng `PeopleSandbox` làm chỗ thử, Epic 3 thay thế |

**Câu hỏi mở và quyết định đã chốt** (anh đã xác nhận Q-1, Q-3, Q-5, Q-6, Q-7 theo mặc định; Q-2, Q-4 do anh chỉnh):

| Mã | Câu hỏi | Quyết định |
| :-: | :--- | :--- |
| Q-1 | Epic 3 chưa có, Epic 2 thử ở đâu? | Trang `PeopleSandbox` tạo một bữa nháp (`Bữa thử nghiệm (Epic 2)`), gắn 3 khối người / chủ trì / nhóm. Epic 3 thay bằng màn bữa thật và xoá trang này |
| Q-2 | Hai người cùng `normalizedName` có coi là một người không (R-2)? | Không lưu cùng tên cùng dấu. Khác dấu là người khác, khoá có hậu tố số (`an`, `an2`) |
| Q-3 | Có cần màn hình quản lý danh bạ ở Epic 2 không? | Không; chỉ đổi tên "Tôi" (BR-2.7) |
| Q-4 | Có ghim "Tôi" lên đầu danh sách chọn không (R-3)? | Có ghim; những người còn lại xếp A-Z |
| Q-5 | Thêm `@testing-library/react` + `user-event`? | Có, chỉ devDependencies |
| Q-6 | Đổi nhóm làm mất tick "Đã thanh toán" (R-13)? | Có, kèm hộp xác nhận khi có người đã tick |
| Q-7 | Gõ không dấu `binh` + `Enter` khi có `Bình` thì chọn `Bình` (R-6c)? | Có, không tạo người thứ hai; muốn tạo người khác dấu thì click nút hoặc dùng mũi tên |

### B.9. Ma trận truy vết kiểm thử

Kết quả chạy thật ngày 2026-10-19 bằng `npm run build`, `npm run lint`, `npx vitest run` trong `app/`. Kiểm thủ công trên trình duyệt (dev server, Chrome) đã làm một phần, xem cột Kết quả.

| User Story | BR | Kiểm thử | Kết quả |
| :-: | :-: | :--- | :-: |
| US-2.1 | BR-2.1, 2.5, 2.10, 2.11 | `mealPeopleService.test.ts`: thêm người vào danh bạ và bữa; không thêm trùng; bữa `ARCHIVED` bị từ chối (AC-9); chặn `HOST_REQUIRED`; chặn `MEMBER_IN_USE` đủ ba nhánh `payer`, `consumer`, `equalSplit`; bỏ người gỡ khỏi nhóm và giải tán nhóm còn 1 người (AC-8) | Đạt (22 test cho US-2.1/2.3/2.4) |
| US-2.1 | BR-2.1 | `memberService.test.ts`: tái dùng người theo tên (AC-5); tạo `An`/`Ân`/`Ấn` → `an`/`an2`/`an3` (AC-5c); `An2` thật không đụng khoá; tên luôn capitalized (AC-5b); đổi tên giữ/cấp lại khoá đúng; `DUPLICATE_NAME`; dữ liệu còn sau đóng/mở DB (AC-4) | Đạt (9 test) |
| US-2.1 | BR-2.1 | `db/normalize.test.ts`: `formatMemberName` (`bình`, `BÌNH`, `văn an`, `anh-tuấn`, `đạt`, `ĐẠT`), `cleanName`, `hasDiacritics`, `normalizeName` | Đạt (13 test) |
| US-2.2 | BR-2.2, 2.3 | `domain/memberFilter.test.ts`: thứ tự A-Z tiếng Việt (AC-1); lọc không dấu `binh`/`dat`; từ khoá rỗng; "Tôi" luôn đứng đầu (AC-5d) | Đạt (22 test, gồm cả US-2.2 phần quyết định Enter) |
| US-2.2 | BR-2.4, 2.5 | `domain/memberFilter.test.ts` (`decideEnter` đủ nhánh R-6); `components/people/MemberQuickFilter.test.tsx`: gõ rồi Enter tạo người (AC-2), click "+ Thêm mới", Enter với người đã có chọn người cũ, báo "đã tham gia", đánh dấu "Đã tham gia", mũi tên | Đạt (8 test). **Chưa kiểm** giữ focus và xoá ô sau khi thêm |
| US-2.3 | BR-2.6, 2.7 | `mealPeopleService.test.ts`: `setHost` chỉ nhận người tham gia (`NOT_PARTICIPANT`); đổi chủ trì ở bữa A không đổi bữa B (AC-6); `initMealPeople` trả chủ app. `memberService.test.ts`: đổi tên chủ app giữ `isDefaultHost`. `HostSelector.test.tsx`: chỉ liệt kê người tham gia; chọn ghi vào DB; khoá khi chỉ đọc | Đạt (3 test HostSelector) |
| US-2.4 | BR-2.8, 2.9 | `domain/paymentGroupRules.test.ts` (10 test): tên mặc định, < 2 người, không trùng, không phải người tham gia, người đã ở nhóm khác (AC-3), co nhóm, đổi đại diện (R-10), tự giải tán (AC-7). `mealPeopleService.test.ts`: tạo/sửa/giải tán nhóm; xoá khoá R-13 | Đạt |
| US-2.4 | BR-2.8, 2.9 | `PaymentGroupDialog.test.tsx`: người ở nhóm khác bị vô hiệu kèm tên nhóm (AC-3); tạo nhóm ghi đúng thành viên và tên mặc định vào DB; chưa đủ 2 người thì không cho lưu | Đạt (3 test) |
| US-2.2 | BR-2.4 | Kiểm thủ công trên dev server (Chrome): gõ `Thảo` + Enter tạo người; gõ lại `Thảo` báo "đã tham gia"; đổi chủ trì sang `Bình` cập nhật huy hiệu; tạo nhóm `Cường + Dung` hiện trong danh sách | Đạt một phần (chưa kiểm bàn phím thuần, di động, F5) |
| Cả 4 US | tất cả | `npm run build` (tsc -b + vite build) | Đạt |
| Cả 4 US | tất cả | `npm run lint` (oxlint) | Đạt, không cảnh báo |
| Cả 4 US | tất cả | `npm test` toàn bộ | Đạt: 102/102 (Epic 2: 92, Epic 1: 10) |
| Cả 4 US | tất cả | Kiểm thủ công đầy đủ `PeopleSandbox`: bàn phím thuần, di động, F5 (AC-1…AC-9) | **Chưa thực hiện đầy đủ** |

### B.10. Việc còn lại để đóng Epic
1. **Kiểm thủ công còn lại**: Quick Filter chỉ bằng bàn phím (không chuột), trên màn hình hẹp (≤ 375 px), F5 giữ danh bạ (AC-4), sửa và giải tán nhóm, bữa đã lưu trữ khoá thao tác (AC-9, cần Epic 3 để tạo bữa lưu trữ). Cập nhật cột "Kết quả" B.9.
2. ~~Bổ sung test còn thiếu~~ — đã làm: `HostSelector`, `PaymentGroupDialog`, đổi tên chủ app giữ `isDefaultHost`, nhánh `consumer`/`equalSplit`.
3. Giữ focus ô lọc sau khi thêm để thêm liên tiếp (UI §4.3 muốn; hiện chưa làm).
3b. **Đã sửa khi kiểm thủ công**: Enter dùng để chốt ký tự của bộ gõ tiếng Việt (IME) không còn tạo người (`isComposing`). Có test trong `MemberQuickFilter.test.tsx`.
4. Cập nhật [Epic 1 BR R-4](../epic-1/BR.md): `normalizedName` là khoá duy nhất có hậu tố số (xem I-7 ở B.4).
5. Cập nhật BR: đánh dấu các `AC-k` đã kiểm chứng; chưa đánh dấu những mục chưa kiểm thủ công.
6. Bàn giao cho Epic 3: dùng `initMealPeople()` khi tạo bữa; thay `PeopleSandbox` bằng màn bữa thật và nhúng 3 khối người / chủ trì / nhóm vào Khu vực 1.
7. Bàn giao cho Epic 4–5: kiểm lại `MEMBER_IN_USE` với dữ liệu thật (cả ba nhánh).
8. Bàn giao cho Epic 6: dùng cùng quy ước khoá `settlementStatuses` (memberId lẻ, groupId cho nhóm).

---

## Phụ lục: Business Requirements gốc của Epic 2

Nguyên văn `documentation/epic-2/BR.md` tại thời điểm chuyển sang OpenSpec (2026-11-11). `proposal.md` và các delta spec của change này được chuyển từ tài liệu này.

# Epic 2 — Business Requirements (BR)

**Epic 2**: Quản lý Danh bạ Thành viên, Quick Filter (A-Z), Chủ trì & Nhóm Thanh toán · **Trạng thái**: đang soạn BR/SA, chờ xác nhận trước khi code

Tài liệu đi cùng: [SA](./SA.md) · [Epics & Roadmap](../04-epics-and-roadmap.md) · [Epic 1 BR](../epic-1/BR.md)

---

### A.1. Bối cảnh & Mục tiêu nghiệp vụ
Chủ app mỗi bữa đi chơi với một nhóm bạn gần như cố định. Nhập lại tên từng người ở mỗi bữa vừa chậm vừa dễ sai (cùng một người bị gõ thành "Bình", "binh", "Bình T."). Epic 2 giải quyết bốn việc:

1. **Nhớ người đã từng tham gia** để lần sau chọn lại bằng vài phím gõ (danh bạ toàn cục).
2. **Chọn người nhanh**: ô lọc gõ tới đâu lọc tới đó, xếp A-Z chuẩn tiếng Việt, không có thì thêm mới ngay tại ô.
3. **Chỉ định Người chủ trì** cho từng bữa (mặc định là "Tôi").
4. **Gom nhóm thanh toán** cho cặp đôi / gia đình để Epic 6 tính như một người thanh toán duy nhất.

Epic này chỉ lo **ai tham gia bữa, ai chủ trì, ai gom nhóm với ai**. Tiền bạc (hoá đơn, chia tiền, quyết toán) thuộc Epic 4–6.

### A.2. Các bên liên quan
| Vai trò | Quan tâm |
| :--- | :--- |
| Tôi | Thêm người vào bữa thật nhanh, không tạo trùng người, gom cặp đôi/gia đình dễ dàng |
| Người chủ trì (Host) | Được nhận/chi tiền ở chế độ "Nhờ người chủ trì" (Epic 6); có thể là người khác Chủ app |
| Thành viên nhóm | Tên hiển thị đúng, thấy mình thuộc nhóm nào trong snapshot (Epic 8) |
| Dev Epic 3–8 | Cần `participantIds`, `hostMemberId`, `paymentGroups` luôn nhất quán để dùng thẳng |

### A.3. Yêu cầu nghiệp vụ (BR)

| Mã | Yêu cầu | Truy vết |
| :-: | :--- | :--- |
| **BR-2.1** | Bất kỳ ai được thêm vào một bữa đều tự động lưu vào danh bạ toàn cục và xuất hiện trong gợi ý của các bữa sau; không cần thao tác "lưu danh bạ" riêng. | US-2.1, YC#9 |
| **BR-2.2** | Danh sách chọn người luôn xếp A-Z theo thứ tự chữ cái tiếng Việt, ở mọi trạng thái (chưa gõ gì, đang lọc, sau khi thêm người mới); riêng hồ sơ "Tôi" được ghim đứng đầu (R-3). | US-2.2, YC#10 |
| **BR-2.3** | Gõ tới đâu lọc tới đó, tìm được cả khi gõ có dấu lẫn không dấu ("binh" ra "Bình"; "dat" ra "Đạt"). | US-2.2, YC#10 |
| **BR-2.4** | Nếu từ khoá chưa trùng tên ai trong danh bạ, hiển thị lựa chọn "+ Thêm người mới" ngay trong ô lọc; một cú click hoặc phím `Enter` là tạo người, lưu danh bạ và thêm vào bữa. | US-2.2, YC#10 |
| **BR-2.5** | Người đã có trong bữa được đánh dấu rõ ("Đã tham gia") trong danh sách chọn và không thể thêm hai lần. | US-2.2, US-2.1 |
| **BR-2.6** | Mỗi bữa có đúng một Người chủ trì; mặc định là "Tôi", người dùng đổi được theo từng bữa mà không ảnh hưởng bữa khác. | US-2.3, YC#11 |
| **BR-2.7** | Hồ sơ "Tôi" xem và đổi tên được, nhưng không thể xoá và luôn là chủ trì mặc định của bữa mới. | US-2.3 |
| **BR-2.8** | Cho phép gom từ 2 thành viên trở lên của cùng một bữa thành một Nhóm thanh toán; nhóm có tên (tự gợi ý, sửa được), có thể sửa thành phần, đổi tên hoặc giải tán. | US-2.4, YC#12 |
| **BR-2.9** | Một thành viên chỉ thuộc tối đa một nhóm trong cùng một bữa; hệ thống chặn gán trùng và báo rõ người đó đang ở nhóm nào. | US-2.4, YC#12 |
| **BR-2.10** | Bỏ một người khỏi bữa không được làm hỏng dữ liệu bữa: người đó phải được gỡ khỏi nhóm, và bị chặn nếu đang là chủ trì hoặc đã gắn với hoá đơn/món. | US-2.1, US-2.3, US-2.4 |
| **BR-2.11** | Dữ liệu người/nhóm của bữa đã lưu trữ (`ARCHIVED`) không được thay đổi. | US-2.1–2.4 (ràng buộc với Epic 7) |
| **BR-2.12** | Danh bạ không có hai người cùng tên và cùng dấu. Muốn có hai người trùng tên, người dùng phải phân biệt bằng từ khác (`Thuỳ An` / `Khánh An`, `An A` / `An B`). Hai tên chỉ khác nhau ở dấu (`An`, `Ân`) vẫn là hai người riêng và được phân biệt bằng hậu tố số ở khoá tìm kiếm (`an`, `an2`). | US-2.1, US-2.2, YC#9, YC#10 |

### A.4. Quy tắc nghiệp vụ (Business Rules)

| Mã | Quy tắc |
| :-: | :--- |
| **R-1** | **Chuẩn hoá tên nhập**: bỏ khoảng trắng đầu/cuối, gộp nhiều khoảng trắng liên tiếp thành một; độ dài 1–50 ký tự sau chuẩn hoá. Giữ nguyên dấu người dùng gõ. Tên hiển thị **luôn được viết hoa chữ cái đầu mỗi từ (capitalized)** và các chữ còn lại viết thường, bất kể người dùng gõ kiểu nào hoặc tạo ở đâu: `bình` → `Bình`, `BÌNH` → `Bình`, `văn an` → `Văn An`, `PHƯƠNG anh` → `Phương Anh`. Từ mới bắt đầu sau khoảng trắng hoặc dấu gạch nối. Quy tắc áp dụng cho mọi đường tạo/đổi tên (Quick Filter, `Enter`, nút "+ Thêm người mới", đổi tên hồ sơ); tên hiển thị trên nút "+ Thêm người mới" cũng là dạng đã capitalized. Ngoại lệ duy nhất: nhãn hệ thống "Tôi" do seed tạo giữ nguyên cho đến khi người dùng đổi tên (khi đó áp dụng quy tắc này). |
| **R-2** | **Chống trùng tên và hậu tố khoá**. (a) *Cùng tên* = tên hiển thị giống hệt nhau cả dấu sau khi chuẩn hoá theo R-1 (`bình`, `BÌNH`, `Bình` là một). Không lưu được hai người cùng tên: gõ lại tên đã có thì chọn người đó (R-5, R-6); đổi tên thành tên của người khác bị từ chối (`DUPLICATE_NAME`). Giao diện nhắc: "Đã có 'An'. Muốn thêm người khác cùng tên, hãy thêm họ hoặc hậu tố, ví dụ 'Thuỳ An', 'An A'." (b) *Khác dấu* (`An`, `Ân`, `Ấn`) là các người khác nhau. `normalizedName` (bỏ dấu, chữ thường, `đ→d`, theo [Epic 1 R-4](../epic-1/BR.md)) là khoá duy nhất của danh bạ, nên người tạo sau nhận hậu tố số nhỏ nhất còn trống: `an`, `an2`, `an3`… Tên hiển thị vẫn giữ nguyên dấu (`Ân`). Hậu tố cố định sau khi gán; chỉ tính lại khi người đó đổi tên sang dạng không dấu khác. Nếu khoá đã bị chiếm (kể cả khi một người thật tên `An2`), lấy số kế tiếp. |
| **R-3** | **Thứ tự A-Z** dùng `Intl.Collator('vi')` trên tên hiển thị; hai tên bằng nhau theo collator thì xếp theo `createdAt` (ổn định). **Ghim**: hồ sơ "Tôi" (`isDefaultHost`) luôn đứng đầu danh sách chọn người và danh sách người tham gia, kể cả khi đang lọc (nếu khớp từ khoá); những người còn lại xếp A-Z phía sau. Chỉ ghim hồ sơ mặc định này; người chủ trì của từng bữa (nếu là người khác) xếp A-Z như mọi người và được nhận biết bằng huy hiệu vàng. |
| **R-4** | **Quy tắc lọc**: khớp khi `normalizedName` của thành viên *chứa* `normalizeName(từ khoá)`. Từ khoá rỗng → hiện toàn bộ danh bạ. Kết quả lọc vẫn xếp theo R-3 (ghim chủ app rồi A-Z, không xếp theo độ khớp). Vì `normalizedName` có thể mang hậu tố số (R-2b), gõ `an2` tìm được người thứ hai. |
| **R-5** | **Khi nào hiện "+ Thêm người mới"**: từ khoá (sau R-1, đã capitalized) không rỗng **và** không có thành viên nào có tên hiển thị giống hệt cả dấu (R-2a). Nếu đã có khớp chính xác thì không hiện nút tạo mà hiện nhắc nhở của R-2a. Khi chỉ có người *khác dấu* (R-2b) thì vẫn hiện nút, vì đó có thể là một người mới. |
| **R-6** | **Phím `Enter` trong ô lọc**: (a) nếu người dùng đang chọn một dòng bằng phím mũi tên → chọn dòng đó; (b) nếu không và có khớp chính xác (R-2a) → chọn người khớp; (c) nếu không, từ khoá **không chứa dấu** và đã có người *có dấu* cùng dạng không dấu (ví dụ gõ `binh` khi có `Bình`) → chọn người đầu tiên trong số đó, **không tạo mới**, để tránh tạo nhầm người thứ hai khi gõ tắt không dấu; muốn tạo người khác dấu thì click nút "+ Thêm người mới" hoặc dùng phím mũi tên chọn nút đó (nút là dòng cuối của danh sách); (d) còn lại, từ khoá không rỗng → tạo người mới. Chọn người đã tham gia → không làm gì, chỉ báo "Đã tham gia", không bỏ họ ra khỏi bữa. |
| **R-7** | **Thêm vào bữa** cập nhật `lastUsedAt` của thành viên. Tạo người mới và thêm vào bữa là một thao tác nguyên tử: không để lại người "mồ côi" trong danh bạ nếu bước thêm vào bữa lỗi. |
| **R-8** | **Người chủ trì**: luôn thuộc danh sách tham gia của bữa. Bữa mới có `hostMemberId = settings.defaultHostMemberId` và "Tôi" tự nằm trong danh sách tham gia. Muốn đổi chủ trì thì chọn trong số người đã tham gia (người chưa tham gia phải thêm vào bữa trước). Người chủ trì không thể bị bỏ khỏi bữa; phải đổi chủ trì trước. |
| **R-9** | **Nhóm thanh toán**: ≥ 2 thành viên, tất cả thuộc danh sách tham gia của bữa, mỗi thành viên tối đa một nhóm trong bữa. Tên nhóm tuỳ chọn; để trống thì tự đặt bằng tên các thành viên nối bằng ` + ` (ví dụ `Cường + Dung`), độ dài tối đa 80 ký tự. Người chủ trì được phép nằm trong nhóm. |
| **R-10** | **Người đại diện nhóm** (`representativeId`): thuộc nhóm; mặc định là thành viên đầu tiên được chọn. Nếu người đại diện rời nhóm thì đại diện chuyển sang thành viên đầu tiên còn lại. |
| **R-11** | **Nhóm co lại**: khi một thành viên rời nhóm (bị gỡ khỏi nhóm hoặc bị bỏ khỏi bữa) mà nhóm còn dưới 2 người thì nhóm **tự giải tán** (người còn lại trở về thanh toán cá nhân). |
| **R-12** | **Bỏ người khỏi bữa bị chặn** khi người đó: (a) là chủ trì (R-8); (b) là người ứng tiền của một hoá đơn trong bữa; (c) có tên trong danh sách người ăn của một món hoặc danh sách chia đều của một hoá đơn. Thông báo nêu rõ lý do để người dùng gỡ ràng buộc trước. Ở Epic 2, các bảng hoá đơn/món chưa có dữ liệu nên điều kiện (b), (c) chỉ có hiệu lực từ Epic 4–5 nhưng quy tắc được cài sẵn và kiểm thử bằng dữ liệu giả lập. (e) *Bổ sung theo yêu cầu "mỗi kèo có số người riêng"* ([02 §1.0](../02-business-logic-and-algorithms.md)): người được phép bỏ khỏi bữa (không rơi vào a–c) sẽ **tự rời** khỏi `SessionKeo.participantIds` của mọi kèo trong bữa đó; việc này không bị chặn vì kèo mới mặc định chứa toàn bộ người trong bữa. Kèo của bữa khác không bị đụng. |
| **R-13** | **Trạng thái "Đã thanh toán" (`settlementStatuses`)** được khoá theo thực thể thanh toán (`memberId` hoặc `paymentGroupId`). Khi tạo, sửa thành phần, hoặc giải tán nhóm, hoặc bỏ người khỏi bữa, các khoá của thực thể bị ảnh hưởng (các `memberId` trong nhóm, `paymentGroupId`) bị xoá để tránh tick thanh toán sai chủ. Nếu có khoá đang `isPaid = true` thì giao diện hỏi xác nhận trước khi thực hiện. |
| **R-14** | **Bữa `ARCHIVED`**: mọi thao tác thêm/bỏ người, đổi chủ trì, tạo/sửa/giải tán nhóm đều bị từ chối. |
| **R-15** | **Xoá khỏi danh bạ không thuộc phạm vi**: người đã tạo luôn còn trong danh bạ, kể cả khi bị bỏ khỏi mọi bữa (xem A.6). |

### A.5. Tiêu chí nghiệm thu (nghiệp vụ)

Ba tiêu chí đầu lấy từ [04 — Epic 2](../04-epics-and-roadmap.md); các tiêu chí sau do BR/SA bổ sung.

- [ ] AC-1: Danh sách chọn người luôn xếp đúng thứ tự A-Z (An → Ánh → Bình → Cường → Đạt…, sau hồ sơ "Tôi" được ghim đầu) và lọc tức thì theo từng ký tự gõ vào, có dấu lẫn không dấu. *(BR-2.2, 2.3)*
- [ ] AC-2: Thêm người mới chưa có trong danh bạ chỉ mất 1 cú click hoặc phím `Enter` ngay tại ô Quick Filter. *(BR-2.4)*
- [ ] AC-3: Các thành viên đã thuộc 1 Nhóm thanh toán không thể bị gán trùng vào nhóm thứ 2 trong cùng một bữa. *(BR-2.9)*
- [ ] AC-4: Người từng thêm vào một bữa xuất hiện trong gợi ý khi chọn người cho bữa khác, kể cả sau khi tải lại trang (F5). *(BR-2.1)*
- [ ] AC-5: Gõ lại tên đã có (khác hoa/thường) không tạo ra người thứ hai; hệ thống chọn người đã có và nhắc cách phân biệt (`Thuỳ An`, `An A`). Đổi tên thành tên của người khác bị từ chối. *(R-2a, R-5)*
- [ ] AC-5c: `An` và `Ân` tồn tại như hai người riêng, khoá lần lượt là `an`, `an2`; gõ `an2` tìm ra `Ân`; gõ `binh` + `Enter` khi có `Bình` thì chọn `Bình`, không tạo `Binh`. *(R-2b, R-6)*
- [ ] AC-5d: "Tôi" luôn đứng đầu danh sách chọn người, kể cả khi đang lọc nếu khớp; người còn lại xếp A-Z. *(R-3)*
- [ ] AC-5b: Tên thành viên luôn được lưu dạng capitalized dù gõ thường, gõ HOA hoặc lẫn lộn (`bình`, `BÌNH` → `Bình`; `văn an` → `Văn An`), ở cả tạo mới lẫn đổi tên. *(R-1)*
- [ ] AC-6: Đổi chủ trì ở bữa A không đổi chủ trì ở bữa B; "Tôi" không xoá được và là chủ trì mặc định của bữa mới. *(BR-2.6, 2.7)*
- [ ] AC-7: Tạo, đổi tên, sửa thành phần và giải tán nhóm hoạt động đúng; nhóm tự giải tán khi chỉ còn 1 người. *(BR-2.8, R-11)*
- [ ] AC-8: Bỏ người khỏi bữa gỡ họ khỏi nhóm; không bỏ được chủ trì hoặc người đã gắn với hoá đơn/món. *(BR-2.10)*
- [ ] AC-9: Bữa `ARCHIVED` không cho phép bất kỳ thay đổi người/nhóm nào. *(BR-2.11)*

### A.6. Ngoài phạm vi
- Tạo, sửa, xoá, liệt kê **Bữa** và màn hình chi tiết bữa (Epic 3). Epic 2 chỉ cung cấp các khối giao diện và service gắn vào một bữa có sẵn.
- Quản lý danh bạ như một màn hình riêng: đổi tên, gộp trùng, xoá người khỏi danh bạ (chỉ riêng đổi tên "Tôi" nằm trong phạm vi). Xem câu hỏi mở Q-3 trong [SA B.8](./SA.md).
- Tính tiền theo nhóm, hiển thị bảng quyết toán và tick thanh toán (Epic 6); Epic 2 chỉ bảo đảm dữ liệu nhóm nhất quán và dọn khoá `settlementStatuses` theo R-13.
- Ảnh đại diện thật, số điện thoại, tài khoản ngân hàng của thành viên.
- Đồng bộ danh bạ giữa các thiết bị.
