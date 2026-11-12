// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { addFile, getFileBlob, readFromOpfs } from './fileStorageService'
import { dedupeStoredInvoiceFiles } from './fileStorageMigration'

// fake-indexeddb cannot structured-clone jsdom's File/Blob, so use Node's File (see fileStorageService.test.ts).
const NODE_BUFFER: string = 'node:buffer'
type NodeFileCtor = new (bits: BlobPart[], name: string, options?: FilePropertyBag) => File
const { File: NodeFile } = (await import(/* @vite-ignore */ NODE_BUFFER)) as {
  File: NodeFileCtor
}

/* OPFS giả trong bộ nhớ: jsdom không có navigator.storage. `failWrites` làm mọi lần ghi lỗi (như hết quota). */
interface FakeDir {
  dirs: Map<string, FakeDir>
  files: Map<string, Blob>
}

function createFakeOpfs() {
  const root: FakeDir = { dirs: new Map(), files: new Map() }
  const state = { failWrites: false }
  const notFound = () => new DOMException('not found', 'NotFoundError')

  function dirHandle(dir: FakeDir): FileSystemDirectoryHandle {
    return {
      async getDirectoryHandle(name: string, opts?: { create?: boolean }) {
        let next = dir.dirs.get(name)
        if (!next) {
          if (!opts?.create) throw notFound()
          next = { dirs: new Map(), files: new Map() }
          dir.dirs.set(name, next)
        }
        return dirHandle(next)
      },
      async getFileHandle(name: string, opts?: { create?: boolean }) {
        if (!dir.files.has(name)) {
          if (!opts?.create) throw notFound()
          dir.files.set(name, new NodeFile([], name))
        }
        return {
          async getFile() {
            const blob = dir.files.get(name)
            if (!blob) throw notFound()
            return blob
          },
          async createWritable() {
            if (state.failWrites) throw new DOMException('quota', 'QuotaExceededError')
            let pending: Blob = new NodeFile([], name)
            return {
              async write(data: Blob) {
                pending = data
              },
              async close() {
                dir.files.set(name, pending)
              },
            }
          },
        }
      },
      async removeEntry(name: string) {
        if (dir.files.delete(name) || dir.dirs.delete(name)) return
        throw notFound()
      },
    } as unknown as FileSystemDirectoryHandle
  }

  return {
    root,
    state,
    install() {
      Object.defineProperty(navigator, 'storage', {
        configurable: true,
        value: { getDirectory: async () => dirHandle(root) },
      })
    },
    uninstall() {
      Reflect.deleteProperty(navigator, 'storage')
    },
  }
}

const base = { mealId: 'meal-1', sessionId: 'session-1', invoiceId: 'invoice-1' }

/** Đọc nội dung Blob qua Response (blob lấy lại từ IndexedDB có thể không có text() trong jsdom). */
const readText = (blob: Blob | undefined) => new Response(blob).text()
const makeImage = (name: string, content: string) => new NodeFile([content], name, { type: 'image/jpeg' })

/** Tạo bản ghi có CẢ opfsPath lẫn blobData (trạng thái lưu trùng của bản cũ). */
async function makeDuplicated(content: string, name = 'bill.jpg') {
  const file = makeImage(name, content)
  const record = await addFile({ ...base, file })
  await db.invoice_files.put({ ...record, blobData: file })
  return record.id
}

describe('dedupeStoredInvoiceFiles', () => {
  const opfs = createFakeOpfs()

  beforeEach(async () => {
    await db.invoice_files.clear()
    opfs.root.dirs.clear()
    opfs.root.files.clear()
    opfs.state.failWrites = false
    opfs.install()
  })

  afterEach(() => {
    opfs.uninstall()
  })

  it('bản OPFS khớp dung lượng: bỏ blobData, giữ opfsPath, nội dung vẫn đọc được', async () => {
    const id = await makeDuplicated('same-bytes')

    expect(await dedupeStoredInvoiceFiles()).toEqual({ checked: 1, freed: 1 })

    const stored = await db.invoice_files.get(id)
    expect(stored?.blobData).toBeUndefined()
    expect(stored?.opfsPath).toBeDefined()
    expect(await readText(await getFileBlob(id))).toBe('same-bytes')
  })

  it('OPFS mất và không ghi lại được: giữ blobData, bỏ opfsPath', async () => {
    const id = await makeDuplicated('keep-me')
    opfs.root.dirs.clear()
    opfs.state.failWrites = true

    expect(await dedupeStoredInvoiceFiles()).toEqual({ checked: 1, freed: 0 })

    const stored = await db.invoice_files.get(id)
    expect(stored?.opfsPath).toBeUndefined()
    // fake-indexeddb trong jsdom làm hỏng Blob Node sau hai lần clone (get rồi update), nên chỉ kiểm tra có mặt.
    expect(stored?.blobData).toBeDefined()
    expect(await getFileBlob(id)).toBeDefined()
  })

  it('OPFS mất nhưng ghi lại được từ blobData: ghi lại OPFS rồi bỏ blobData', async () => {
    const id = await makeDuplicated('restore-me')
    opfs.root.dirs.clear()

    expect(await dedupeStoredInvoiceFiles()).toEqual({ checked: 1, freed: 1 })

    const stored = await db.invoice_files.get(id)
    expect(stored?.blobData).toBeUndefined()
    expect(stored?.opfsPath).toBeDefined()
    expect((await readFromOpfs(stored!.opfsPath!))?.size).toBe('restore-me'.length)
  })

  it('OPFS lệch dung lượng: ghi lại từ blobData rồi bỏ blobData', async () => {
    const id = await makeDuplicated('right-content')
    const stored = await db.invoice_files.get(id)
    opfs.root.dirs
      .get('invoices')!
      .dirs.get('meal-1')!
      .files.set(stored!.opfsPath!.split('/').pop()!, new NodeFile(['bad'], 'bad'))

    expect(await dedupeStoredInvoiceFiles()).toEqual({ checked: 1, freed: 1 })

    const after = await db.invoice_files.get(id)
    expect(after?.blobData).toBeUndefined()
    expect(await readText(await getFileBlob(id))).toBe('right-content')
  })

  it('bản ghi chỉ có một nơi (chỉ OPFS hoặc chỉ blobData) không bị đụng tới', async () => {
    const onlyOpfs = await addFile({ ...base, file: makeImage('a.jpg', 'a') })
    const onlyBlob = await addFile({ ...base, file: makeImage('b.jpg', 'b') })
    opfs.state.failWrites = true
    const blobOnly = await addFile({ ...base, file: makeImage('c.jpg', 'c') })
    opfs.state.failWrites = false

    expect(await dedupeStoredInvoiceFiles()).toEqual({ checked: 0, freed: 0 })

    expect((await db.invoice_files.get(onlyOpfs.id))?.opfsPath).toBeDefined()
    expect((await db.invoice_files.get(onlyOpfs.id))?.blobData).toBeUndefined()
    expect((await db.invoice_files.get(onlyBlob.id))?.blobData).toBeUndefined()
    expect((await db.invoice_files.get(blobOnly.id))?.blobData).toBeDefined()
    expect((await db.invoice_files.get(blobOnly.id))?.opfsPath).toBeUndefined()
  })

  it('không ném lỗi khi không có bản ghi nào hay OPFS không khả dụng', async () => {
    opfs.uninstall()
    expect(await dedupeStoredInvoiceFiles()).toEqual({ checked: 0, freed: 0 })
  })
})
