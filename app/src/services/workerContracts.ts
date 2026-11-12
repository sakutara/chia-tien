/*
 * Kiểu dùng chung cho luồng đọc hoá đơn trên máy: ocrService, memoryLifecycle và vietOcrWorker.
 * Chỉ khai báo kiểu, không có logic, để các module phát triển song song mà không lệch giao diện.
 */

import type { OcrWord } from '../domain/ocrLayout'

/** Từ OCR kèm hộp bao; định nghĩa nằm ở domain/ocrLayout.ts. */
export type { OcrWord }

/** Hàm dọn tài nguyên OCR (terminate worker, revoke URL…) đăng ký với memoryLifecycle. */
export type CleanupCallback = () => Promise<void> | void

/** Thông điệp Main Thread → vietOcrWorker. */
export type VietOcrWorkerRequest = { type: 'INIT'; requestId: string; baseUrl: string } | { type: 'RECOGNIZE'; requestId: string; image: Blob }

/** Thông điệp vietOcrWorker → Main Thread. `lines` là từng dòng chữ kèm hộp, toạ độ theo ảnh gốc. */
export type VietOcrWorkerResponse =
  | { type: 'READY'; requestId: string }
  | { type: 'PROGRESS'; requestId: string; percent: number }
  | { type: 'RESULT'; requestId: string; lines: OcrWord[] }
  | { type: 'ERROR'; requestId: string; message: string }
