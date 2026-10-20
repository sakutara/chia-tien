import { describe, expect, it } from 'vitest'
import {
  binarize,
  blackFraction,
  findDocumentQuad,
  insetQuad,
  medianStrokeWidth,
  otsuThreshold,
  quadSize,
  isCleanDocument,
  scanDocument,
  thicken,
  warpToRect,
  type GrayImage,
  type Point,
  type Quad,
} from './documentScan'

function makeImage(width: number, height: number, fill: number): GrayImage {
  return { data: new Uint8ClampedArray(width * height).fill(fill), width, height }
}

function inside(poly: Quad, x: number, y: number): boolean {
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % 4]
    const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x)
    const s = cross >= 0 ? 1 : -1
    if (sign !== 0 && s !== sign) return false
    sign = s
  }
  return true
}

/** Nền tối, tờ giấy sáng dạng tứ giác `paper`, có các dòng chữ đen dày `stroke` px bên trong. */
function receiptPhoto(width: number, height: number, paper: Quad, opts: { bg?: number; paperValue?: number; stroke?: number; dash?: number; shade?: boolean } = {}): GrayImage {
  const { bg = 50, paperValue = 215, stroke = 3, dash = 3, shade = false } = opts
  const img = makeImage(width, height, bg)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!inside(paper, x, y)) continue
      let v = paperValue
      if (shade) v -= (x / width) * 60 // ánh sáng giảm dần từ trái sang phải
      // Dòng chữ: dãy nét đen (rộng 3px, cách nhau 8px) mỗi 18px, từ 25% đến 75% chiều ngang tờ giấy.
      const rel = (y - paper[0].y) % 18
      if (rel < stroke && x % 8 < dash && x > paper[0].x + (paper[1].x - paper[0].x) * 0.25 && x < paper[0].x + (paper[1].x - paper[0].x) * 0.75) v = 25
      img.data[y * width + x] = v
    }
  }
  return img
}

const pt = (x: number, y: number): Point => ({ x, y })
const near = (p: Point, q: Point, tol: number): boolean => Math.hypot(p.x - q.x, p.y - q.y) <= tol

describe('otsuThreshold', () => {
  it('tách hai nhóm mức xám', () => {
    const data = [...new Array(500).fill(30), ...new Array(500).fill(220)]
    const t = otsuThreshold(data)
    expect(t).toBeGreaterThanOrEqual(30)
    expect(t).toBeLessThan(220)
  })
})

describe('findDocumentQuad — tìm 4 góc tờ hoá đơn', () => {
  it('tìm đúng 4 góc của tờ giấy nghiêng trên nền tối', () => {
    const paper: Quad = [pt(120, 60), pt(330, 90), pt(300, 560), pt(100, 520)]
    const quad = findDocumentQuad(receiptPhoto(450, 640, paper))
    expect(quad).not.toBeNull()
    // Sai số: vài pixel do thu nhỏ khi dò và phần thu vào để bỏ viền nền.
    const grown = insetQuad(paper, 0.008)
    quad!.forEach((p, i) => expect(near(p, grown[i], 12)).toBe(true))
  })

  it('vẫn tìm được khi ánh sáng không đều (một bên tối dần)', () => {
    const paper: Quad = [pt(60, 40), pt(390, 40), pt(390, 600), pt(60, 600)]
    const quad = findDocumentQuad(receiptPhoto(450, 640, paper, { shade: true }))
    expect(quad).not.toBeNull()
    const { width, height } = quadSize(quad!)
    expect(width).toBeGreaterThan(300)
    expect(height).toBeGreaterThan(540)
  })

  it('không thấy tờ giấy (ảnh đồng nhất) thì trả null', () => {
    expect(findDocumentQuad(makeImage(300, 400, 128))).toBeNull()
  })

  it('tờ giấy đã chiếm gần hết khung thì không cần cắt', () => {
    expect(findDocumentQuad(receiptPhoto(300, 400, [pt(0, 0), pt(299, 0), pt(299, 399), pt(0, 399)]))).toBeNull()
  })

  it('vùng sáng quá nhỏ (không phải hoá đơn) thì trả null', () => {
    expect(findDocumentQuad(receiptPhoto(450, 640, [pt(200, 200), pt(260, 200), pt(260, 260), pt(200, 260)]))).toBeNull()
  })
})

describe('warpToRect — nắn phối cảnh', () => {
  it('đưa tứ giác nghiêng về hình chữ nhật: góc giấy ở góc ảnh, nền không lọt vào', () => {
    const paper: Quad = [pt(120, 60), pt(330, 90), pt(300, 560), pt(100, 520)]
    const src = receiptPhoto(450, 640, paper, { stroke: 0 })
    const size = quadSize(paper)
    const out = warpToRect(src, insetQuad(paper, 0.01), Math.round(size.width), Math.round(size.height))
    expect(out.width).toBeGreaterThan(190)
    // Toàn bộ vùng ra là giấy (≈215), không có pixel nền (≈50).
    expect(Math.min(...out.data)).toBeGreaterThan(190)
  })
})

describe('binarize — trắng đen, nền trắng hoàn toàn', () => {
  it('chỉ còn hai giá trị 0 và 255; giấy thành trắng, chữ thành đen, kể cả khi bị đổ bóng', () => {
    const paper: Quad = [pt(0, 0), pt(400, 0), pt(400, 600), pt(0, 600)]
    const bin = binarize(receiptPhoto(400, 600, paper, { shade: true, bg: 255 }))
    const values = new Set(bin.data)
    expect([...values].sort()).toEqual([0, 255])
    // Vùng không chữ (góc trái-dưới và phải-dưới) phải trắng hoàn toàn dù ánh sáng yếu hơn bên phải.
    let nonWhiteMargins = 0
    for (let y = 100; y < 600; y++) {
      if ((y - 0) % 18 < 3) continue
      for (const x of [20, 380]) if (bin.data[y * 400 + x] !== 255) nonWhiteMargins++
    }
    expect(nonWhiteMargins).toBe(0)
    expect(blackFraction(bin)).toBeGreaterThan(0.01)
    expect(blackFraction(bin)).toBeLessThan(0.2)
  })

  it('mảng đen lớn (như mã QR) không bị rỗng ruột', () => {
    const img = makeImage(300, 300, 230)
    for (let y = 100; y < 200; y++) for (let x = 100; x < 200; x++) img.data[y * 300 + x] = 20
    const bin = binarize(img)
    expect(bin.data[150 * 300 + 150]).toBe(0)
    expect(bin.data[10 * 300 + 10]).toBe(255)
  })
})

describe('thicken — làm dày chữ', () => {
  it('mỗi nét đen dày thêm 1 pixel mỗi phía', () => {
    const bin = makeImage(20, 9, 255)
    for (let x = 2; x < 18; x++) bin.data[4 * 20 + x] = 0 // nét ngang dày 1px
    expect(medianStrokeWidth(bin)).toBe(16)
    const thick = thicken(bin)
    expect(thick.data[3 * 20 + 10]).toBe(0)
    expect(thick.data[5 * 20 + 10]).toBe(0)
    expect(thick.data[2 * 20 + 10]).toBe(255)
  })
})

describe('scanDocument — cả quy trình', () => {
  it('ảnh chụp nghiêng trên nền tối → hoá đơn thẳng, trắng đen, nền trắng; nét đủ dày thì giữ nguyên', () => {
    const paper: Quad = [pt(120, 60), pt(330, 90), pt(300, 560), pt(100, 520)]
    const result = scanDocument(receiptPhoto(450, 640, paper, { stroke: 3, dash: 4 }), { targetLongEdge: 600 })
    expect(result).not.toBeNull()
    expect(result!.cropped).toBe(true)
    expect([...new Set(result!.image.data)].sort()).toEqual([0, 255])
    // Không còn nền tối: các góc ảnh đầu ra là trắng.
    const { data, width, height } = result!.image
    for (const [x, y] of [[2, 2], [width - 3, 2], [2, height - 3], [width - 3, height - 3]]) expect(data[y * width + x]).toBe(255)
    // Nét dày hơn ngưỡng: không giãn thêm (giãn nét làm OCR kém đi trên bill thật).
    expect(result!.thickened).toBe(false)
  })

  it('nét gần như đứt nét (≤ 2px) thì làm dày', () => {
    const paper: Quad = [pt(100, 60), pt(350, 60), pt(350, 560), pt(100, 560)]
    const thin = scanDocument(receiptPhoto(450, 640, paper, { stroke: 2, dash: 1 }), { targetLongEdge: 640, maxUpscale: 1 })
    expect(thin).not.toBeNull()
    expect(thin!.thickened).toBe(true)
  })

  it('có thể ép tắt làm dày', () => {
    const paper: Quad = [pt(100, 60), pt(350, 60), pt(350, 560), pt(100, 560)]
    const result = scanDocument(receiptPhoto(450, 640, paper, { stroke: 2, dash: 1 }), { targetLongEdge: 640, maxUpscale: 1, thickness: 'none' })
    expect(result!.thickened).toBe(false)
  })

  it('ảnh tối gần hết thì không xử lý (trả null để giữ ảnh gốc)', () => {
    const img = makeImage(300, 300, 20)
    for (let y = 0; y < 300; y += 2) for (let x = 0; x < 300; x++) img.data[y * 300 + x] = 235
    for (let y = 0; y < 300; y++) if (y % 8 < 5) for (let x = 0; x < 300; x++) img.data[y * 300 + x] = 20
    expect(scanDocument(img)).toBeNull()
  })
})

describe('isCleanDocument — tài liệu điện tử giữ ảnh xám', () => {
  /** Nền trắng tuyệt đối với vài nét chữ đen: giống ảnh chụp màn hình PDF. */
  function digital(width: number, height: number): GrayImage {
    const img = makeImage(width, height, 255)
    for (let y = 40; y < height; y += 30) for (let x = 20; x < width - 20; x++) if ((x >> 2) % 2 === 0) img.data[y * width + x] = 0
    return img
  }

  it('nền trắng đều → sạch; có bóng/nền xám → không', () => {
    expect(isCleanDocument(digital(600, 800))).toBe(true)
    const shaded = digital(600, 800)
    for (let y = 0; y < 800; y++) for (let x = 0; x < 600; x++) if (shaded.data[y * 600 + x] > 0) shaded.data[y * 600 + x] = 200 + Math.round((x / 600) * 30)
    expect(isCleanDocument(shaded)).toBe(false)
    expect(isCleanDocument(makeImage(100, 100, 255))).toBe(false)
  })

  it('scanDocument giữ ảnh xám cho tài liệu sạch và nhị phân hoá khi bị ép `never`', () => {
    const img = digital(600, 800)
    const kept = scanDocument(img, { targetLongEdge: 800, maxUpscale: 1 })!
    expect(kept.binarized).toBe(false)
    expect(new Set(kept.image.data).size).toBeGreaterThanOrEqual(1)
    const forced = scanDocument(img, { targetLongEdge: 800, maxUpscale: 1, keepGray: 'never' })!
    expect(forced.binarized).toBe(true)
  })
})
