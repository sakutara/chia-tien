import { generateId } from '../lib/id'
import { db } from '../db/db';
import type { CompressionPreset, InvoiceFileRecord } from '../types';

/* ------------------------------------------------------------------ */
/* Constants & small helpers                                          */
/* ------------------------------------------------------------------ */

const OPFS_ROOT_DIR = 'invoices';
const MAX_FILE_NAME_LENGTH = 120;

export interface AddFileInput {
  mealId: string;
  sessionId: string;
  invoiceId: string;
  file: File;
  ocrRawText?: string;
  /** Dung lượng ảnh gốc trước khi nén; bỏ trống nếu không nén. */
  originalSizeBytes?: number;
  compression?: CompressionPreset;
}

function createId(): string {
  return generateId();
}

/**
 * Chuẩn hoá tên file: bỏ dấu, bỏ ký tự path, thay ký tự không an toàn bằng "_",
 * giữ phần mở rộng và giới hạn độ dài.
 */
export function normalizeFileName(rawName: string): string {
  const baseName = rawName.split(/[\\/]/).pop() ?? '';
  const ascii = baseName
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]+/, '');

  if (!ascii) return 'invoice';
  if (ascii.length <= MAX_FILE_NAME_LENGTH) return ascii;

  const dotIndex = ascii.lastIndexOf('.');
  const ext = dotIndex > 0 ? ascii.slice(dotIndex) : '';
  return ascii.slice(0, MAX_FILE_NAME_LENGTH - ext.length) + ext;
}

/* ------------------------------------------------------------------ */
/* OPFS helpers                                                       */
/* ------------------------------------------------------------------ */

async function getOpfsRoot(): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) {
      return undefined;
    }
    return await navigator.storage.getDirectory();
  } catch {
    return undefined;
  }
}

/** Tách "/invoices/<mealId>/<entry>" thành các segment không rỗng. */
function splitOpfsPath(opfsPath: string): string[] {
  return opfsPath.split('/').filter(Boolean);
}

async function writeToOpfs(
  mealId: string,
  entryName: string,
  blob: Blob,
): Promise<string | undefined> {
  const root = await getOpfsRoot();
  if (!root) return undefined;

  const segments = [OPFS_ROOT_DIR, mealId];
  const entryPath = `/${segments.join('/')}/${entryName}`;

  try {
    let dir = root;
    for (const segment of segments) {
      dir = await dir.getDirectoryHandle(segment, { create: true });
    }
    const fileHandle = await dir.getFileHandle(entryName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return entryPath;
  } catch {
    // Ghi OPFS thất bại -> dọn file dở dang, dựa vào blobData trong IndexedDB.
    await removeOpfsEntry(entryPath);
    return undefined;
  }
}

async function readFromOpfs(opfsPath: string): Promise<Blob | undefined> {
  const root = await getOpfsRoot();
  if (!root) return undefined;

  try {
    const segments = splitOpfsPath(opfsPath);
    const entryName = segments.pop();
    if (!entryName) return undefined;

    let dir = root;
    for (const segment of segments) {
      dir = await dir.getDirectoryHandle(segment);
    }
    const fileHandle = await dir.getFileHandle(entryName);
    return await fileHandle.getFile();
  } catch {
    return undefined;
  }
}

/** Xoá một entry (file hoặc thư mục) trong OPFS. Lỗi bị nuốt: không ảnh hưởng DB. */
async function removeOpfsEntry(opfsPath: string, recursive = false): Promise<void> {
  const root = await getOpfsRoot();
  if (!root) return;

  try {
    const segments = splitOpfsPath(opfsPath);
    const entryName = segments.pop();
    if (!entryName) return;

    let dir = root;
    for (const segment of segments) {
      dir = await dir.getDirectoryHandle(segment);
    }
    await dir.removeEntry(entryName, { recursive });
  } catch {
    // Đã không tồn tại hoặc OPFS không khả dụng: bỏ qua.
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Thêm một file hoá đơn. Luôn lưu blobData trong IndexedDB; nếu OPFS khả dụng
 * thì ghi thêm bản sao vật lý và lưu opfsPath.
 */
export async function addFile({
  mealId,
  sessionId,
  invoiceId,
  file,
  ocrRawText,
  originalSizeBytes,
  compression,
}: AddFileInput): Promise<InvoiceFileRecord> {
  const id = createId();
  const fileName = normalizeFileName(file.name);
  const mimeType = file.type || 'application/octet-stream';

  const opfsPath = await writeToOpfs(mealId, `${id}_${fileName}`, file);

  const record: InvoiceFileRecord = {
    id,
    mealId,
    sessionId,
    invoiceId,
    fileName,
    mimeType,
    sizeBytes: file.size,
    originalSizeBytes,
    compression,
    opfsPath,
    blobData: file,
    ocrRawText,
    createdAt: new Date().toISOString(),
  };

  await db.invoice_files.add(record);
  return record;
}

/** Đọc Blob: ưu tiên OPFS, fallback sang blobData trong IndexedDB. */
export async function getFileBlob(id: string): Promise<Blob | undefined> {
  const record = await db.invoice_files.get(id);
  if (!record) return undefined;

  if (record.opfsPath) {
    const fromOpfs = await readFromOpfs(record.opfsPath);
    if (fromOpfs) return fromOpfs;
  }
  return record.blobData;
}

/**
 * Tải file về máy. Trả về false nếu không tìm thấy bản ghi hoặc không có dữ liệu.
 */
export async function downloadFile(id: string): Promise<boolean> {
  const record = await db.invoice_files.get(id);
  if (!record) return false;

  const blob = await getFileBlob(id);
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = record.fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Revoke sau khi trình duyệt đã bắt đầu tải.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

/** Xoá một file: gỡ khỏi OPFS rồi xoá bản ghi. */
export async function deleteFile(id: string): Promise<void> {
  const record = await db.invoice_files.get(id);
  if (!record) return;

  if (record.opfsPath) {
    await removeOpfsEntry(record.opfsPath);
  }
  await db.invoice_files.delete(id);
}

async function deleteRecords(records: InvoiceFileRecord[]): Promise<void> {
  if (records.length === 0) return;

  await Promise.all(
    records
      .filter((record) => record.opfsPath)
      .map((record) => removeOpfsEntry(record.opfsPath as string)),
  );
  await db.invoice_files.bulkDelete(records.map((record) => record.id));
}

export async function deleteFilesByInvoice(invoiceId: string): Promise<void> {
  const records = await db.invoice_files.where('invoiceId').equals(invoiceId).toArray();
  await deleteRecords(records);
}

export async function deleteFilesBySession(sessionId: string): Promise<void> {
  const records = await db.invoice_files.where('sessionId').equals(sessionId).toArray();
  await deleteRecords(records);
}

/** Xoá toàn bộ file của một bữa, kể cả thư mục OPFS /invoices/<mealId>. */
export async function deleteFilesByMeal(mealId: string): Promise<void> {
  const records = await db.invoice_files.where('mealId').equals(mealId).toArray();
  await db.invoice_files.bulkDelete(records.map((record) => record.id));

  await removeOpfsEntry(`/${OPFS_ROOT_DIR}/${mealId}`, true);
}

export async function listFilesByInvoice(invoiceId: string): Promise<InvoiceFileRecord[]> {
  const records = await db.invoice_files.where('invoiceId').equals(invoiceId).toArray();
  return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Tổng dung lượng (byte) của mọi file hoá đơn đang lưu. */
export async function getTotalStorageBytes(): Promise<number> {
  let total = 0;
  await db.invoice_files.each((record) => {
    total += record.sizeBytes;
  });
  return total;
}
