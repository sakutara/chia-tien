/*
 * Kiểu dùng chung cho luồng đọc hoá đơn trên máy: ocrService, localAiService, memoryLifecycle, networkGuard và các Web Worker.
 * Chỉ khai báo kiểu, không có logic, để các module phát triển song song mà không lệch giao diện.
 */

import type { OcrWord } from '../domain/ocrLayout'

/** Từ OCR kèm hộp bao; định nghĩa nằm ở domain/ocrLayout.ts. */
export type { OcrWord }

/** Loại kết nối mạng hiện tại; `unknown` khi trình duyệt không cho biết (ví dụ iOS Safari). */
export type ConnectionKind = 'wifi' | 'cellular' | 'unknown'

/** Hàm dọn tài nguyên AI (terminate worker, revoke URL…) đăng ký với memoryLifecycle. */
export type CleanupCallback = () => Promise<void> | void

/** Trạng thái Local AI hiển thị trên UI. */
export interface LocalAiStatus {
  /** Mô hình đã được tải đầy đủ trong Cache Storage chưa. */
  cached: boolean
  /** Dung lượng ước tính đã lưu trong Cache (bytes). */
  cachedBytes: number
  /** Trạng thái bật/tắt hiệu lực hiện tại. */
  enabled: boolean
}

/** Mô hình SLM on-device (Hugging Face); trọng số nằm trong Cache Storage `transformers-cache`. */
export const LOCAL_SLM_MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct'

/** Mã lỗi mà slmWorker gửi về; trùng với `PeopleErrorCode`. */
export type SlmWorkerErrorCode = 'AI_DOWNLOAD_FAILED' | 'AI_OUT_OF_MEMORY' | 'AI_FAILED'

/** Thông điệp từ Main Thread gửi tới slmWorker. */
export type SlmWorkerRequest =
  | { type: 'LOAD_MODEL'; requestId: string }
  | { type: 'GENERATE_RECEIPT'; requestId: string; systemPrompt: string; userPrompt: string }

/** Thông điệp từ slmWorker gửi về Main Thread. */
export type SlmWorkerResponse =
  | { type: 'PROGRESS'; requestId: string; status: 'downloading' | 'loading' | 'generating'; percent: number; loadedBytes?: number; totalBytes?: number }
  | { type: 'LOADED'; requestId: string }
  | { type: 'RESULT'; requestId: string; rawJson: string }
  | { type: 'ERROR'; requestId: string; code: SlmWorkerErrorCode; message: string }

/** Thông điệp Main Thread → vietOcrWorker. */
export type VietOcrWorkerRequest =
  | { type: 'INIT'; requestId: string; baseUrl: string }
  | { type: 'RECOGNIZE'; requestId: string; image: Blob }

/** Thông điệp vietOcrWorker → Main Thread. `lines` là từng dòng chữ kèm hộp, toạ độ theo ảnh gốc. */
export type VietOcrWorkerResponse =
  | { type: 'READY'; requestId: string }
  | { type: 'PROGRESS'; requestId: string; percent: number }
  | { type: 'RESULT'; requestId: string; lines: OcrWord[] }
  | { type: 'ERROR'; requestId: string; message: string }
