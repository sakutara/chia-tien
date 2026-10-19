// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import {
  addFile,
  deleteFile,
  deleteFilesByMeal,
  getFileBlob,
  getTotalStorageBytes,
  listFilesByInvoice,
  normalizeFileName,
} from './fileStorageService';

// fake-indexeddb cannot structured-clone jsdom's File/Blob, so the tests use
// Node's File (which clones correctly). Loaded dynamically because the app
// tsconfig does not include Node types.
const NODE_BUFFER: string = 'node:buffer';
type NodeFileCtor = new (bits: BlobPart[], name: string, options?: FilePropertyBag) => File;
const { File: NodeFile } = (await import(/* @vite-ignore */ NODE_BUFFER)) as {
  File: NodeFileCtor;
};

function makeImage(name: string, content: string, type = 'image/jpeg'): File {
  return new NodeFile([content], name, { type });
}

const base = { mealId: 'meal-1', sessionId: 'session-1', invoiceId: 'invoice-1' };

describe('fileStorageService', () => {
  beforeEach(async () => {
    await db.invoice_files.clear();
  });

  it('normalizes file names', () => {
    expect(normalizeFileName('../Hóa đơn 1.jpg')).toBe('Hoa_don_1.jpg');
    expect(normalizeFileName('')).toBe('invoice');
  });

  it('adds a file and reads it back via the Blob fallback', async () => {
    const file = makeImage('bill.jpg', 'fake-jpeg-bytes', 'image/jpeg');
    const record = await addFile({ ...base, file, ocrRawText: 'TOTAL 100' });

    expect(record.id).toBeTruthy();
    expect(record.fileName).toBe('bill.jpg');
    expect(record.mimeType).toBe('image/jpeg');
    expect(record.sizeBytes).toBe(file.size);
    expect(record.opfsPath).toBeUndefined(); // jsdom has no OPFS
    expect(record.blobData).toBeDefined();
    expect(record.ocrRawText).toBe('TOTAL 100');

    const stored = await db.invoice_files.get(record.id);
    expect(stored?.sizeBytes).toBe(file.size);

    const blob = await getFileBlob(record.id);
    expect(blob).toBeDefined();
    expect(blob?.size).toBe(file.size);
    expect(blob?.type).toBe('image/jpeg');
    expect(await blob?.text()).toBe('fake-jpeg-bytes');
  });

  it('returns undefined for unknown ids', async () => {
    expect(await getFileBlob('missing')).toBeUndefined();
  });

  it('lists files by invoice', async () => {
    await addFile({ ...base, file: makeImage('a.jpg', 'a') });
    await addFile({ ...base, file: makeImage('b.jpg', 'bb') });
    await addFile({ ...base, invoiceId: 'invoice-2', file: makeImage('c.jpg', 'ccc') });

    const files = await listFilesByInvoice('invoice-1');
    // Records created in the same millisecond share createdAt, so compare as a set.
    expect(files.map((f) => f.fileName).sort()).toEqual(['a.jpg', 'b.jpg']);
  });

  it('deletes a single file', async () => {
    const keep = await addFile({ ...base, file: makeImage('keep.jpg', 'keep') });
    const drop = await addFile({ ...base, file: makeImage('drop.jpg', 'drop') });

    await deleteFile(drop.id);

    expect(await db.invoice_files.get(drop.id)).toBeUndefined();
    expect(await getFileBlob(drop.id)).toBeUndefined();
    expect(await db.invoice_files.get(keep.id)).toBeDefined();
  });

  it('reports total storage bytes', async () => {
    const a = makeImage('a.jpg', 'aaaa');
    const b = makeImage('b.jpg', 'bb');
    await addFile({ ...base, file: a });
    await addFile({ ...base, file: b });

    expect(await getTotalStorageBytes()).toBe(a.size + b.size);
  });

  it('deleteFilesByMeal frees all records of that meal only', async () => {
    await addFile({ ...base, file: makeImage('a.jpg', 'a') });
    await addFile({ ...base, sessionId: 'session-2', file: makeImage('b.jpg', 'b') });
    const other = await addFile({ ...base, mealId: 'meal-2', file: makeImage('c.jpg', 'c') });

    await deleteFilesByMeal('meal-1');

    expect(await db.invoice_files.where('mealId').equals('meal-1').count()).toBe(0);
    expect(await db.invoice_files.get(other.id)).toBeDefined();
    expect(await db.invoice_files.count()).toBe(1);
  });
});
