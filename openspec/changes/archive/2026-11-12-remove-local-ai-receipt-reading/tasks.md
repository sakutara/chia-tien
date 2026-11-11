# Tasks

## 1. Gỡ dependency
- [x] 1.1 Chạy `npm uninstall @huggingface/transformers` trong `app/`; giữ `onnxruntime-web`

## 2. Xoá mã AI trên máy
- [x] 2.1 Xoá `workers/slmWorker.ts`, `services/localAiService.ts` và test, `domain/aiReceipt.ts` và test, `components/invoices/LocalAiControl.tsx` và test, `lib/networkGuard.ts` và test
- [x] 2.2 Bỏ kiểu slmWorker và trạng thái Local AI khỏi `services/aiContracts.ts`; sửa comment đầu file
- [x] 2.3 Bỏ mã `AI_*` khỏi `services/peopleErrors.ts`
- [x] 2.4 Bỏ `withAiMemoryScope` và bộ đếm tác vụ khỏi `services/memoryLifecycle.ts`, giữ các hàm đăng ký và giải phóng worker OCR; cập nhật test
- [x] 2.5 Gỡ luồng đọc lại bằng AI, công tắc, hộp gợi ý và hộp xác nhận tải khỏi `components/invoices/InvoiceFormDialog.tsx`, giữ giải phóng bộ nhớ khi đóng form
- [x] 2.6 Xoá các chuỗi i18n không còn dùng trong `i18n/en.ts`

## 3. Dọn dữ liệu AI cũ trên máy người dùng
- [x] 3.1 Thêm `services/legacyAiCleanup.ts`: xoá cache `transformers-cache` và bốn khoá localStorage cũ, không ném lỗi
- [x] 3.2 Thêm `services/legacyAiCleanup.test.ts` với các trường hợp: xoá cache, xoá khoá, không có `caches`, `caches.delete` bị từ chối
- [x] 3.3 Gọi `cleanUpLegacyLocalAi` một lần trong `main.tsx`

## 4. OpenSpec
- [x] 4.1 Tạo `proposal.md`, `design.md` và spec delta cho `local-ai-receipt-reading` và `local-data-storage`
- [x] 4.2 Chạy `openspec validate remove-local-ai-receipt-reading --strict` và sửa đến khi pass

## 5. Kiểm tra
- [x] 5.1 `npx tsc -b`, `npm run lint`, `npx vitest run src/services src/components src/lib src/i18n`, `npm run build` trong `app/`

## 6. Hoàn tất
- [x] 6.1 Archive change sau khi người dùng duyệt
