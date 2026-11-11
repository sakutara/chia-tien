---
name: new-feature
description: Tạo tính năng mới hoặc thay đổi hành vi của app Chia tiền theo quy trình OpenSpec của dự án (đề xuất → duyệt → code → kiểm tra → archive). Dùng khi người dùng nói "thêm tính năng", "làm tính năng mới", "new feature", "thêm chức năng", "đổi hành vi của ...", hoặc mô tả một thay đổi làm khác đi điều app đang làm. Không dùng cho sửa lỗi nhỏ đưa hành vi về đúng spec, refactor không đổi hành vi, hay sửa tài liệu.
---

# Tạo tính năng mới theo OpenSpec

Skill này gắn luồng OpenSpec (`/opsx:propose` → `/opsx:apply` → `/opsx:archive`) với quy tắc riêng của dự án. Nguồn sự thật về hành vi hiện tại là `openspec/specs/`; mọi thay đổi hành vi phải đi qua một change trong `openspec/changes/`. Lịch sử thiết kế và các thay đổi trước đây nằm trong `openspec/changes/archive/` (xem bằng `openspec list --archived`); dự án không có thư mục tài liệu nào khác, nên không viết tài liệu thiết kế ngoài OpenSpec.

Có ba điểm dừng bắt buộc chờ người dùng: sau bước 2 (duyệt đề xuất), sau bước 4 (duyệt kết quả), và trước khi push hoặc mở PR.

## Quy tắc xuyên suốt

- **Subtask luôn chạy bằng Haiku.** Mỗi lần gọi Agent tool trong quy trình này phải đặt `model: "haiku"`, kể cả khi tìm kiếm trong code, viết test hay rà soát. Phần cần phán đoán (chọn phạm vi, thiết kế, duyệt kết quả của subtask) do phiên chính tự làm, không giao đi.
- **Hỏi trước khi chạy.** Không bắt đầu code khi người dùng chưa duyệt đề xuất.
- **Không commit lên `main`.** Làm trên branch riêng, đặt tên `feat/<tên-change>`. Không dùng `--no-verify` hay `SKIP_PAGES_BUILD=1`.
- **Không sửa `docs/`.** Đó là bản build GitHub Pages do hook sinh ra.
- Viết artifact bằng tiếng Việt; giữ tiêu đề cấu trúc và từ khoá SHALL/MUST, WHEN/THEN bằng tiếng Anh.

## Bước 1 — Hiểu yêu cầu và xác định phạm vi

1. Chạy `openspec list --specs` để xem các capability hiện có, rồi đọc `openspec/specs/<capability>/spec.md` của những capability mà yêu cầu chạm tới.
2. Xác định thay đổi thuộc loại nào:
   - sửa hành vi của capability đã có: delta dùng `## MODIFIED Requirements` hoặc `## REMOVED Requirements`;
   - thêm hành vi vào capability đã có: delta dùng `## ADDED Requirements`;
   - miền hoàn toàn mới: tạo capability mới, tên kebab-case bằng tiếng Anh theo kiểu các capability đang có.
3. Nếu còn mơ hồ về phạm vi, hành vi nhìn thấy được, hoặc tiêu chí nghiệm thu, hỏi người dùng trước khi viết gì. Với yêu cầu còn ở dạng ý tưởng, dùng `/opsx:explore` để cùng làm rõ.

Bảng tra nhanh miền nào nằm ở đâu:

| Capability | Mã nguồn chính trong `app/src` |
| :--- | :--- |
| `local-data-storage` | `db/`, `services/fileStorageService.ts`, `services/memoryLifecycle.ts` |
| `member-directory` | `services/memberService.ts`, `domain/memberFilter.ts`, `domain/banks.ts`, `components/people/` |
| `meal-people-and-payment-groups` | `services/mealPeopleService.ts`, `domain/paymentGroupRules.ts` |
| `meal-management` | `services/mealService.ts`, `domain/mealRules.ts`, `components/meals/`, `pages/` |
| `session-management` | `services/sessionService.ts`, `domain/sessionRules.ts`, `components/sessions/` |
| `invoice-management` | `services/invoiceService.ts`, `services/invoiceFileService.ts`, `domain/invoiceRules.ts`, `components/invoices/` |
| `receipt-ocr` | `services/ocrService.ts`, `domain/receiptParser.ts`, `domain/vietOcr.ts`, `workers/vietOcrWorker.ts`, `lib/documentScan.ts` |
| `local-ai-receipt-reading` | `services/localAiService.ts`, `domain/aiReceipt.ts`, `workers/slmWorker.ts`, `lib/networkGuard.ts` |
| `bill-splitting` | `domain/billMath.ts`, `lib/money.ts`, `components/invoices/InvoiceItem*.tsx` |
| `settlement` | `domain/settlementEngine.ts`, `services/settlementService.ts`, `components/settlement/` |
| `meal-archive` | `domain/archiveRules.ts`, `services/archiveService.ts` |
| `payment-sharing-snapshot` | `domain/shareSnapshot.ts`, `domain/snapshotCodec.ts`, `domain/vietQr.ts`, `services/snapshotService.ts`, `components/share/` |
| `i18n` | `i18n/index.ts`, `i18n/en.ts`, `db/languageStore.ts` |
| `design-system` | `components/ui/`, `index.css`, `app/tailwind.config.js`, `app/index.html` |

## Bước 2 — Viết đề xuất (chỉ lập kế hoạch, chưa code)

1. Tạo branch: `git switch -c feat/<tên-change>` từ `main` mới nhất (nếu đang ở worktree hoặc branch tính năng do người dùng chỉ định thì dùng luôn branch đó).
2. Chạy luồng `/opsx:propose` với tên change kebab-case bắt đầu bằng động từ (`add-…`, `update-…`, `remove-…`). Luồng này tạo `openspec/changes/<tên>/` gồm `proposal.md`, `specs/<capability>/spec.md` (delta), `design.md`, `tasks.md`.
3. Khi viết các artifact, kiểm tra những điểm riêng của dự án:
   - **Tiền**: số nguyên VNĐ, mọi phép chia phải khớp tổng tuyệt đối. Tính năng đụng tới tiền phải có Scenario về làm tròn và phần dư.
   - **Dữ liệu**: `design.md` ghi rõ có đổi schema Dexie không (bảng, index, tăng version, cách nâng cấp dữ liệu cũ) hoặc ghi "không đổi".
   - **Snapshot URL**: nếu đổi dữ liệu của bữa, ghi rõ payload snapshot có đổi không và link cũ còn mở được không.
   - **Chỉ đọc**: nêu hành vi của tính năng với bữa `ARCHIVED` và trên trang Snapshot.
   - **Lưu trữ bữa**: dữ liệu mới có cần giữ lại trong `archivedSummary` hay bị xoá khi lưu trữ.
   - **i18n**: mọi chuỗi giao diện mới có khoá ở cả `vi` (`i18n/index.ts`) và `en` (`i18n/en.ts`).
   - **Offline**: app không có backend; tính năng gọi mạng phải là tuỳ chọn và nêu rõ dữ liệu nào rời thiết bị.
4. `tasks.md` phải có: task viết test Vitest cho từng Requirement mới hoặc đổi, task i18n khi có chuỗi mới, và task cuối chạy bộ kiểm tra ở bước 4.
5. Chạy `openspec validate <tên-change> --strict` và sửa cho đạt.
6. **Dừng lại.** Tóm tắt cho người dùng: phạm vi, capability bị ảnh hưởng, các Requirement thêm/sửa/bỏ, quyết định thiết kế chính, phần ngoài phạm vi. Chờ người dùng duyệt hoặc yêu cầu sửa (sửa bằng `/opsx:update`).

## Bước 3 — Triển khai

Chỉ bắt đầu khi người dùng đã duyệt đề xuất.

1. Chạy luồng `/opsx:apply` cho change, làm lần lượt từng task trong `tasks.md` và đánh dấu `- [x]` khi xong.
2. Theo cấu trúc hiện có: quy tắc nghiệp vụ thuần đặt trong `domain/` kèm test đơn vị; thao tác dữ liệu trong `services/`; giao diện trong `components/` và `pages/`. Không đặt quy tắc nghiệp vụ trong component.
3. Việc có thể giao cho subagent Haiku: tìm chỗ dùng một hàm trong code, viết test theo Scenario đã có, thêm khoá i18n cho hai từ điển, rà chuỗi cứng còn sót. Giao từng việc nhỏ, nêu rõ file được sửa, rồi tự đọc lại diff trước khi tin kết quả.
4. Nếu khi code phát hiện đề xuất sai hoặc thiếu, dừng code, cập nhật artifact bằng `/opsx:update` và báo người dùng khi thay đổi làm khác phạm vi đã duyệt.

## Bước 4 — Kiểm tra

Chạy trong `app/` và chỉ báo đạt khi cả ba đều đạt:

```bash
npm test
npm run lint
npm run build
```

Sau đó:

1. Đối chiếu từng Scenario trong delta spec với test hoặc với thao tác thật trên app. Với thay đổi giao diện, chạy app (`npm run dev`) và thử trực tiếp, kể cả ở chiều rộng 375 px và ở cả hai ngôn ngữ.
2. Chạy `openspec validate <tên-change> --strict`.
3. **Dừng lại.** Báo người dùng kết quả thật: lệnh nào đạt, Scenario nào đã kiểm bằng cách nào, phần nào chưa kiểm được. Không ghi "đạt" cho điều chưa chạy.

## Bước 5 — Archive và giao

Chỉ làm khi người dùng đồng ý với kết quả.

1. Chạy luồng `/opsx:archive` cho change. Lệnh này gộp delta vào `openspec/specs/` và chuyển change vào `openspec/changes/archive/`.
2. Chạy `openspec validate --specs --strict` để chắc spec chính vẫn hợp lệ.
3. Commit code, test và thư mục `openspec/` cùng nhau trên branch tính năng.
4. Hỏi người dùng trước khi push và mở Pull Request vào `main`. Trong mô tả PR ghi tên change và các capability đã đổi.

## Khi nào không cần change

- Sửa lỗi làm code quay về đúng hành vi mà spec đã mô tả: sửa thẳng, thêm test hồi quy.
- Refactor, đổi tên, cập nhật thư viện mà không đổi hành vi quan sát được.
- Nếu phát hiện spec đang mô tả sai hành vi thực tế và hành vi thực tế mới là đúng: hỏi người dùng, rồi sửa spec qua một change nhỏ.
