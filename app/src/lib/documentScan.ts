/*
 * Xử lý ảnh hoá đơn kiểu máy quét (thuần số học trên mảng xám, không đụng Canvas để test được):
 * 1. Tìm 4 góc tờ hoá đơn (vùng giấy sáng lớn nhất) rồi nắn phối cảnh thành hình chữ nhật, bỏ nền xung quanh.
 * 2. Nhị phân hoá thích nghi: chữ đen, nền trắng hoàn toàn, không bị đổ bóng/ánh sáng không đều.
 * 3. Làm dày nét chữ khi nét quá mảnh, để OCR bắt được chữ in nhiệt mờ.
 * Mọi bước sai hoặc không chắc thì trả về `null`/giữ nguyên để lớp gọi dùng ảnh gốc: không bao giờ làm mất ảnh.
 */

export interface Point {
  x: number
  y: number
}

/** 4 góc theo thứ tự trên-trái, trên-phải, dưới-phải, dưới-trái. */
export type Quad = [Point, Point, Point, Point]

export interface GrayImage {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** Cạnh dài của ảnh dùng để dò góc: đủ để thấy tờ giấy, đủ nhỏ để chạy nhanh. */
const DETECT_LONG_EDGE = 480
/** Tờ giấy phải chiếm ít nhất chừng này diện tích ảnh mới coi là hoá đơn. */
const MIN_PAPER_AREA = 0.12
/** Phần vùng sáng lấp đầy tứ giác tối thiểu: thấp hơn nghĩa là hình không giống một tờ giấy. */
const MIN_FILL_RATIO = 0.65
/** Tứ giác chiếm hơn chừng này ảnh và gần thẳng thì không cần cắt. */
const SKIP_CROP_COVERAGE = 0.97
/** Cạnh chạm khung ảnh ở chừng này chiều dài trở lên thì coi là bị cắt. */
const TOUCH_BORDER = 0.3
/** Thu tứ giác vào trong một chút để bỏ viền nền lọt qua mép giấy. */
const CROP_INSET = 0.008

// ---------------------------------------------------------------------------
// Hình học
// ---------------------------------------------------------------------------

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function polygonArea(points: Point[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

function isConvex(q: Quad): boolean {
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i]
    const b = q[(i + 1) % 4]
    const c = q[(i + 2) % 4]
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (cross === 0) return false
    const s = cross > 0 ? 1 : -1
    if (sign !== 0 && s !== sign) return false
    sign = s
  }
  return true
}

/** Thu 4 góc vào phía tâm theo tỉ lệ `amount` của kích thước tứ giác. */
export function insetQuad(q: Quad, amount: number): Quad {
  const cx = (q[0].x + q[1].x + q[2].x + q[3].x) / 4
  const cy = (q[0].y + q[1].y + q[2].y + q[3].y) / 4
  return q.map((p) => ({ x: p.x + (cx - p.x) * amount * 2, y: p.y + (cy - p.y) * amount * 2 })) as Quad
}

// ---------------------------------------------------------------------------
// Ngưỡng Otsu và thu nhỏ
// ---------------------------------------------------------------------------

/** Ngưỡng Otsu của mảng xám: tách hai nhóm (tối / sáng) sao cho phương sai giữa nhóm lớn nhất. */
export function otsuThreshold(gray: ArrayLike<number>): number {
  const hist = new Array<number>(256).fill(0)
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++
  const total = gray.length
  let sumAll = 0
  for (let v = 0; v < 256; v++) sumAll += v * hist[v]
  let sumBg = 0
  let weightBg = 0
  let first = 0
  let last = 0
  let bestVar = -1
  for (let v = 0; v < 256; v++) {
    weightBg += hist[v]
    if (weightBg === 0) continue
    const weightFg = total - weightBg
    if (weightFg === 0) break
    sumBg += v * hist[v]
    const meanBg = sumBg / weightBg
    const meanFg = (sumAll - sumBg) / weightFg
    const between = weightBg * weightFg * (meanBg - meanFg) ** 2
    if (between > bestVar) {
      bestVar = between
      first = last = v
    } else if (between === bestVar) last = v
  }
  // Hai nhóm tách hẳn nhau thì mọi ngưỡng ở khoảng trống đều như nhau: lấy giữa khoảng.
  return Math.round((first + last) / 2)
}

/**
 * Ngưỡng tách giấy khỏi nền: Otsu cho hai nhóm, rồi hạ về phía nhóm tối (30% khoảng cách hai trung bình) để phần giấy
 * bị bóng đổ (xám hơn) vẫn tính là giấy; nền tối (khoảng 40–80) vẫn nằm dưới ngưỡng.
 */
export function paperThreshold(gray: ArrayLike<number>): number {
  const otsu = otsuThreshold(gray)
  let darkSum = 0
  let darkCount = 0
  let brightSum = 0
  let brightCount = 0
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] <= otsu) {
      darkSum += gray[i]
      darkCount++
    } else {
      brightSum += gray[i]
      brightCount++
    }
  }
  if (darkCount === 0 || brightCount === 0) return otsu
  const darkMean = darkSum / darkCount
  const brightMean = brightSum / brightCount
  return Math.round(darkMean + 0.3 * (brightMean - darkMean))
}

/** Thu nhỏ bằng trung bình ô (box filter): giữ vùng giấy sáng ổn định, bớt nhiễu chữ nhỏ. */
export function downscaleGray(src: GrayImage, scale: number): GrayImage {
  if (scale >= 1) return src
  const width = Math.max(1, Math.round(src.width * scale))
  const height = Math.max(1, Math.round(src.height * scale))
  const data = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor((y * src.height) / height)
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * src.height) / height))
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor((x * src.width) / width)
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * src.width) / width))
      let sum = 0
      for (let yy = y0; yy < y1; yy++) {
        const row = yy * src.width
        for (let xx = x0; xx < x1; xx++) sum += src.data[row + xx]
      }
      data[y * width + x] = sum / ((y1 - y0) * (x1 - x0))
    }
  }
  return { data, width, height }
}

interface Line {
  /** `v = a·t + b`: với cạnh trái/phải t là y và v là x; với cạnh trên/dưới t là x và v là y. */
  a: number
  b: number
}

/** Đường thẳng bền vững qua các điểm (t, v): RANSAC chọn đường nhiều điểm gần nhất, rồi bình phương tối thiểu trên các điểm đó. */
function ransacLine(points: Array<[number, number]>, tolerance: number): Line | null {
  if (points.length < 8) return null
  let seed = 12345
  const rand = (): number => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  const tMin = Math.min(...points.map((p) => p[0]))
  const tMax = Math.max(...points.map((p) => p[0]))
  const minGap = (tMax - tMin) * 0.2
  let bestInliers: Array<[number, number]> = []
  for (let iter = 0; iter < 200; iter++) {
    const p = points[Math.floor(rand() * points.length)]
    const q = points[Math.floor(rand() * points.length)]
    if (Math.abs(p[0] - q[0]) < minGap) continue
    const a = (q[1] - p[1]) / (q[0] - p[0])
    const b = p[1] - a * p[0]
    const inliers = points.filter((pt) => Math.abs(pt[1] - (a * pt[0] + b)) <= tolerance)
    if (inliers.length > bestInliers.length) bestInliers = inliers
  }
  if (bestInliers.length < 8) return null
  const n = bestInliers.length
  const meanT = bestInliers.reduce((s, p) => s + p[0], 0) / n
  const meanV = bestInliers.reduce((s, p) => s + p[1], 0) / n
  let num = 0
  let den = 0
  for (const [t, v] of bestInliers) {
    num += (t - meanT) * (v - meanV)
    den += (t - meanT) ** 2
  }
  if (den === 0) return null
  const a = num / den
  return { a, b: meanV - a * meanT }
}

/**
 * Cạnh của tờ giấy từ các điểm mép (đã loại điểm nằm ngay trên khung ảnh). Quá ít điểm nghĩa là cạnh đó bị khung cắt
 * hoặc không thấy rõ: dùng chính mép khung (`border`).
 */
function fitEdge(points: Array<[number, number]>, extent: number, border: number, tolerance: number): Line {
  if (points.length < extent * 0.25) return { a: 0, b: border }
  return ransacLine(points, tolerance) ?? { a: 0, b: border }
}

// ---------------------------------------------------------------------------
// Tìm 4 góc tờ hoá đơn
// ---------------------------------------------------------------------------

/**
 * Tìm 4 góc tờ hoá đơn (toạ độ trong ảnh `gray`). Tờ giấy là vùng sáng liên thông lớn nhất sau ngưỡng Otsu; 4 góc là các
 * điểm cực của vùng đó theo hai đường chéo. Trả `null` khi không giống một tờ giấy (quá nhỏ, không lồi, rỗng ruột) hoặc khi
 * tờ giấy đã chiếm gần hết ảnh (không cần cắt).
 */
export function findDocumentQuad(gray: GrayImage): Quad | null {
  const scale = Math.min(1, DETECT_LONG_EDGE / Math.max(gray.width, gray.height))
  const work = downscaleGray(gray, scale)
  const { width: w, height: h, data } = work
  const threshold = paperThreshold(data)

  // Hai nhóm quá giống nhau (ảnh gần đồng nhất): không có tờ giấy tách khỏi nền.
  let min = 255
  let max = 0
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) min = data[i]
    if (data[i] > max) max = data[i]
  }
  if (max - min < 40) return null

  // Thành phần sáng liên thông lớn nhất (4 láng giềng, ngăn xếp tường minh để không tràn đệ quy).
  const label = new Int32Array(w * h)
  const stack = new Int32Array(w * h)
  let bestLabel = 0
  let bestSize = 0
  let nextLabel = 0
  for (let start = 0; start < w * h; start++) {
    if (label[start] !== 0 || data[start] <= threshold) continue
    nextLabel++
    let size = 0
    let top = 0
    stack[top++] = start
    label[start] = nextLabel
    while (top > 0) {
      const p = stack[--top]
      size++
      const x = p % w
      const y = (p - x) / w
      if (x > 0 && label[p - 1] === 0 && data[p - 1] > threshold) {
        label[p - 1] = nextLabel
        stack[top++] = p - 1
      }
      if (x < w - 1 && label[p + 1] === 0 && data[p + 1] > threshold) {
        label[p + 1] = nextLabel
        stack[top++] = p + 1
      }
      if (y > 0 && label[p - w] === 0 && data[p - w] > threshold) {
        label[p - w] = nextLabel
        stack[top++] = p - w
      }
      if (y < h - 1 && label[p + w] === 0 && data[p + w] > threshold) {
        label[p + w] = nextLabel
        stack[top++] = p + w
      }
    }
    if (size > bestSize) {
      bestSize = size
      bestLabel = nextLabel
    }
  }
  if (bestSize < MIN_PAPER_AREA * w * h) return null

  // Bốn cạnh: với mỗi hàng lấy mép trái/phải của vùng giấy, với mỗi cột lấy mép trên/dưới, rồi khớp đường thẳng bền vững
  // (RANSAC, bỏ qua chỗ giấy rách/nhàu). Cạnh nào bị khung ảnh cắt thì dùng chính mép khung. Góc = giao điểm hai cạnh kề.
  const left: Array<[number, number]> = []
  const right: Array<[number, number]> = []
  const top: Array<[number, number]> = []
  const bottom: Array<[number, number]> = []
  const topEdge = new Float64Array(w).fill(-1)
  const bottomEdge = new Float64Array(w).fill(-1)
  let rowsWithPaper = 0
  let leftTouch = 0
  let rightTouch = 0
  for (let y = 0; y < h; y++) {
    let first = -1
    let last = -1
    for (let x = 0; x < w; x++) {
      if (label[y * w + x] !== bestLabel) continue
      if (first < 0) first = x
      last = x
      if (topEdge[x] < 0) topEdge[x] = y
      bottomEdge[x] = y + 1
    }
    if (first >= 0) {
      rowsWithPaper++
      if (first === 0) leftTouch++
      if (last === w - 1) rightTouch++
      if (first > 0) left.push([y + 0.5, first])
      if (last < w - 1) right.push([y + 0.5, last + 1])
    }
  }
  let colsWithPaper = 0
  let topTouch = 0
  let bottomTouch = 0
  for (let x = 0; x < w; x++) {
    if (topEdge[x] >= 0) {
      colsWithPaper++
      if (topEdge[x] === 0) topTouch++
      if (bottomEdge[x] === h) bottomTouch++
    }
    if (topEdge[x] > 0) top.push([x + 0.5, topEdge[x]])
    if (bottomEdge[x] >= 0 && bottomEdge[x] < h) bottom.push([x + 0.5, bottomEdge[x]])
  }
  // Cạnh chạm khung ảnh ở phần lớn chiều dài là cạnh bị cắt (hoá đơn dài tràn khỏi ảnh): dùng mép khung, không khớp đường
  // qua phần góc giấy cong ở gần mép.
  const spanRows = rowsWithPaper
  const spanCols = colsWithPaper
  const edgeL = leftTouch >= TOUCH_BORDER * spanRows ? { a: 0, b: 0 } : fitEdge(left, h, 0, 1.5)
  const edgeR = rightTouch >= TOUCH_BORDER * spanRows ? { a: 0, b: w } : fitEdge(right, h, w, 1.5)
  const edgeT = topTouch >= TOUCH_BORDER * spanCols ? { a: 0, b: 0 } : fitEdge(top, w, 0, 2.5)
  const edgeB = bottomTouch >= TOUCH_BORDER * spanCols ? { a: 0, b: h } : fitEdge(bottom, w, h, 2.5)

  const corner = (vertical: Line, horizontal: Line): Point => {
    // x = a·y + b và y = c·x + d
    const x = (vertical.a * horizontal.b + vertical.b) / (1 - vertical.a * horizontal.a)
    return { x, y: horizontal.a * x + horizontal.b }
  }
  const quad: Quad = [corner(edgeL, edgeT), corner(edgeR, edgeT), corner(edgeR, edgeB), corner(edgeL, edgeB)]
  if (quad.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null
  if (!isConvex(quad)) return null
  const area = polygonArea(quad)
  if (area < MIN_PAPER_AREA * w * h) return null
  if (bestSize / area < MIN_FILL_RATIO) return null

  const grown = quad.map((p) => ({ x: Math.min(w, Math.max(0, p.x)), y: Math.min(h, Math.max(0, p.y)) })) as Quad

  const nearlyRect = grown.every((p, i) => {
    const corner = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }][i]
    return dist(p, corner) < 0.04 * Math.max(w, h)
  })
  if (nearlyRect && polygonArea(grown) >= SKIP_CROP_COVERAGE * w * h) return null

  return insetQuad(
    grown.map((p) => ({ x: p.x / scale, y: p.y / scale })) as Quad,
    CROP_INSET,
  )
}

// ---------------------------------------------------------------------------
// Nắn phối cảnh
// ---------------------------------------------------------------------------

/** Kích thước tự nhiên (cạnh lớn hơn của hai cặp cạnh đối) của tờ giấy trong ảnh gốc. */
export function quadSize(q: Quad): { width: number; height: number } {
  return {
    width: Math.max(dist(q[0], q[1]), dist(q[3], q[2])),
    height: Math.max(dist(q[0], q[3]), dist(q[1], q[2])),
  }
}

/**
 * Nắn tứ giác `quad` của ảnh xám thành hình chữ nhật `outWidth × outHeight` (phép chiếu phối cảnh, lấy mẫu song tuyến).
 * Ánh xạ hình vuông đơn vị → tứ giác theo công thức Heckbert.
 */
export function warpToRect(src: GrayImage, quad: Quad, outWidth: number, outHeight: number): GrayImage {
  const [p0, p1, p2, p3] = quad
  const dx1 = p1.x - p2.x
  const dx2 = p3.x - p2.x
  const dx3 = p0.x - p1.x + p2.x - p3.x
  const dy1 = p1.y - p2.y
  const dy2 = p3.y - p2.y
  const dy3 = p0.y - p1.y + p2.y - p3.y

  let g = 0
  let h = 0
  if (dx3 !== 0 || dy3 !== 0) {
    const det = dx1 * dy2 - dx2 * dy1
    g = (dx3 * dy2 - dx2 * dy3) / det
    h = (dx1 * dy3 - dx3 * dy1) / det
  }
  const a = p1.x - p0.x + g * p1.x
  const b = p3.x - p0.x + h * p3.x
  const d = p1.y - p0.y + g * p1.y
  const e = p3.y - p0.y + h * p3.y

  const out = new Uint8ClampedArray(outWidth * outHeight)
  const { data, width: sw, height: sh } = src
  for (let y = 0; y < outHeight; y++) {
    const v = (y + 0.5) / outHeight
    for (let x = 0; x < outWidth; x++) {
      const u = (x + 0.5) / outWidth
      const den = g * u + h * v + 1
      const sx = (a * u + b * v + p0.x) / den - 0.5
      const sy = (d * u + e * v + p0.y) / den - 0.5
      const x0 = Math.floor(sx)
      const y0 = Math.floor(sy)
      const fx = sx - x0
      const fy = sy - y0
      const cx0 = Math.min(sw - 1, Math.max(0, x0))
      const cx1 = Math.min(sw - 1, Math.max(0, x0 + 1))
      const cy0 = Math.min(sh - 1, Math.max(0, y0))
      const cy1 = Math.min(sh - 1, Math.max(0, y0 + 1))
      const top = data[cy0 * sw + cx0] * (1 - fx) + data[cy0 * sw + cx1] * fx
      const bottom = data[cy1 * sw + cx0] * (1 - fx) + data[cy1 * sw + cx1] * fx
      out[y * outWidth + x] = top * (1 - fy) + bottom * fy
    }
  }
  return { data: out, width: outWidth, height: outHeight }
}

// ---------------------------------------------------------------------------
// Nhị phân hoá thích nghi và làm dày chữ
// ---------------------------------------------------------------------------

/** Kéo giãn mức xám theo phân vị 1% và 99%. */
function normalizeGray(gray: Uint8ClampedArray): Uint8ClampedArray {
  const hist = new Array<number>(256).fill(0)
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++
  const find = (fraction: number): number => {
    const target = gray.length * fraction
    let acc = 0
    for (let v = 0; v < 256; v++) {
      acc += hist[v]
      if (acc >= target) return v
    }
    return 255
  }
  const lo = find(0.01)
  const hi = find(0.99)
  const out = new Uint8ClampedArray(gray.length)
  if (hi - lo < 8) {
    out.set(gray)
    return out
  }
  const scale = 255 / (hi - lo)
  for (let i = 0; i < gray.length; i++) out[i] = (gray[i] - lo) * scale
  return out
}

export interface BinarizeOptions {
  /** Pixel đen khi tối hơn trung bình cục bộ chừng này (0–1). */
  contrast?: number
}

/**
 * Nhị phân hoá thích nghi kiểu Bradley: so mỗi pixel với trung bình cục bộ (ảnh tích phân), nên bóng đổ và ánh sáng
 * không đều không làm nền thành đen. Pixel rất tối so với toàn ảnh luôn đen (mảng đen lớn như mã QR không bị rỗng ruột).
 * Kết quả chỉ có 0 (chữ đen) và 255 (nền trắng hoàn toàn).
 */
export function binarize(src: GrayImage, options: BinarizeOptions = {}): GrayImage {
  const { width: w, height: h } = src
  const gray = normalizeGray(src.data)
  const contrast = options.contrast ?? 0.12
  const globalDark = otsuThreshold(gray) * 0.55

  // Ảnh tích phân (w+1)×(h+1), Uint32 đủ chứa 255 × 16 triệu pixel.
  const stride = w + 1
  const integral = new Uint32Array(stride * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x]
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + rowSum
    }
  }

  const half = Math.max(15, Math.round(Math.max(w, h) / 40))
  const out = new Uint8ClampedArray(w * h)
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - half)
    const y1 = Math.min(h, y + half + 1)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half)
      const x1 = Math.min(w, x + half + 1)
      const sum = integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0]
      const mean = sum / ((x1 - x0) * (y1 - y0))
      const value = gray[y * w + x]
      out[y * w + x] = value < mean * (1 - contrast) || value < globalDark ? 0 : 255
    }
  }
  return { data: out, width: w, height: h }
}

/** Độ dày nét chữ điển hình: trung vị chiều dài đoạn đen liên tiếp theo hàng (bỏ mảng đen lớn). */
export function medianStrokeWidth(bin: GrayImage): number {
  const runs: number[] = []
  const step = Math.max(1, Math.floor(bin.height / 400))
  for (let y = 0; y < bin.height; y += step) {
    let run = 0
    for (let x = 0; x <= bin.width; x++) {
      if (x < bin.width && bin.data[y * bin.width + x] === 0) run++
      else {
        if (run > 0 && run <= 20) runs.push(run)
        run = 0
      }
    }
  }
  if (runs.length === 0) return 0
  runs.sort((a, b) => a - b)
  return runs[Math.floor(runs.length / 2)]
}

/**
 * Làm dày chữ đen thêm 1 pixel mỗi phía, theo 4 hướng (`cross`) hoặc cả 8 hướng (`square`, dày hơn ở nét chéo).
 */
export function thicken(bin: GrayImage, shape: 'cross' | 'square' = 'cross'): GrayImage {
  const { width: w, height: h, data } = bin
  const out = new Uint8ClampedArray(data)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[y * w + x] !== 0) continue
      if (x > 0) out[y * w + x - 1] = 0
      if (x < w - 1) out[y * w + x + 1] = 0
      if (y > 0) out[(y - 1) * w + x] = 0
      if (y < h - 1) out[(y + 1) * w + x] = 0
      if (shape === 'square') {
        if (x > 0 && y > 0) out[(y - 1) * w + x - 1] = 0
        if (x < w - 1 && y > 0) out[(y - 1) * w + x + 1] = 0
        if (x > 0 && y < h - 1) out[(y + 1) * w + x - 1] = 0
        if (x < w - 1 && y < h - 1) out[(y + 1) * w + x + 1] = 0
      }
    }
  }
  return { data: out, width: w, height: h }
}

/**
 * Chỉ làm dày khi nét mảnh hơn ngưỡng này (pixel, sau khi phóng về cỡ OCR). Đo trên ảnh bill thật (nét 5–7px ở cỡ 2800px):
 * giãn nét 1px làm OCR đọc đúng ít hơn (trung bình 5,3–5,9/9 món so với 7,5/9 khi không giãn), vì chữ dính nhau; nên chỉ
 * giữ cho nét gần như đứt nét (≤ 2px).
 */
export const THIN_STROKE_MAX = 2

export function blackFraction(bin: GrayImage): number {
  let black = 0
  for (let i = 0; i < bin.data.length; i++) if (bin.data[i] === 0) black++
  return black / bin.data.length
}

// ---------------------------------------------------------------------------
// Quy trình đầy đủ
// ---------------------------------------------------------------------------

/** Cạnh ô (pixel) khi đo độ sáng nền của `isCleanDocument`. */
const CLEAN_BLOCK = 64
/** Phân vị 5% và 50% của độ sáng nền theo ô tối thiểu để coi là tài liệu điện tử (nền gần như trắng tuyệt đối, đều). */
const CLEAN_BACKGROUND_P5 = 245
const CLEAN_BACKGROUND_P50 = 250

/**
 * Tài liệu điện tử (ảnh chụp màn hình PDF, hoá đơn điện tử): nền trắng đều mọi ô, không đổ bóng. Với loại này nhị phân hoá
 * chỉ có hại (làm nét mảnh dính hoặc đứt, rơi mất dòng, vd. đo trên hoá đơn điện tử 6 món: 5/6 món so với 6/6 khi giữ xám),
 * nên giữ ảnh xám đã cắt. Ảnh chụp giấy thật luôn có bóng/nền xám nên không qua được ngưỡng này.
 */
export function isCleanDocument(gray: GrayImage): boolean {
  const bw = Math.floor(gray.width / CLEAN_BLOCK)
  const bh = Math.floor(gray.height / CLEAN_BLOCK)
  if (bw < 4 || bh < 4) return false
  const levels: number[] = []
  const hist = new Array<number>(256)
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      hist.fill(0)
      for (let y = by * CLEAN_BLOCK; y < (by + 1) * CLEAN_BLOCK; y++) {
        const row = y * gray.width
        for (let x = bx * CLEAN_BLOCK; x < (bx + 1) * CLEAN_BLOCK; x++) hist[gray.data[row + x]]++
      }
      let acc = 0
      let v = 0
      for (; v < 255; v++) {
        acc += hist[v]
        if (acc >= CLEAN_BLOCK * CLEAN_BLOCK * 0.9) break
      }
      levels.push(v)
    }
  }
  levels.sort((a, b) => a - b)
  return levels[Math.floor(levels.length * 0.05)] >= CLEAN_BACKGROUND_P5 && levels[Math.floor(levels.length / 2)] >= CLEAN_BACKGROUND_P50
}

export interface ScanResult {
  image: GrayImage
  /** Có cắt theo 4 góc tờ hoá đơn không (không tìm được thì chỉ nhị phân hoá cả ảnh). */
  cropped: boolean
  quad: Quad | null
  thickened: boolean
  /** false: giữ ảnh xám (tài liệu điện tử sạch), chỉ cắt và kéo giãn tương phản. */
  binarized: boolean
}

/** Cỡ ảnh đầu ra: phóng nhỏ/lớn để cạnh dài về `targetLongEdge` (phóng tối đa `maxUpscale`). */
function outputSize(width: number, height: number, targetLongEdge: number, maxUpscale: number): { width: number; height: number } {
  const scale = Math.min(maxUpscale, targetLongEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export interface ScanOptions {
  targetLongEdge?: number
  maxUpscale?: number
  /** Làm dày chữ: `auto` (mặc định) chỉ khi nét mảnh; hoặc ép số lần/kiểu để thử nghiệm. */
  thickness?: 'auto' | 'none' | { passes: number; shape: 'cross' | 'square' }
  /** Ngưỡng nhị phân hoá (xem `BinarizeOptions.contrast`): nhỏ hơn thì nét đậm hơn. */
  contrast?: number
  /** `auto` (mặc định): tài liệu điện tử sạch thì giữ xám; `never`: luôn nhị phân hoá; `always`: luôn giữ xám. */
  keepGray?: 'auto' | 'never' | 'always'
}

/**
 * Ảnh xám → ảnh hoá đơn đã cắt theo 4 góc, nắn thẳng, trắng đen nền trắng, chữ dày. Trả `null` nếu kết quả đáng ngờ
 * (đen quá nhiều: nền tối hoặc ảnh hỏng), để lớp gọi dùng ảnh gốc.
 */
export function scanDocument(gray: GrayImage, options: ScanOptions = {}): ScanResult | null {
  const targetLongEdge = options.targetLongEdge ?? 2800
  const maxUpscale = options.maxUpscale ?? 3

  const quad = findDocumentQuad(gray)
  let rect: GrayImage
  if (quad) {
    const natural = quadSize(quad)
    const size = outputSize(natural.width, natural.height, targetLongEdge, maxUpscale)
    rect = warpToRect(gray, quad, size.width, size.height)
  } else {
    const size = outputSize(gray.width, gray.height, targetLongEdge, maxUpscale)
    rect = size.width === gray.width && size.height === gray.height ? gray : warpToRect(gray, [{ x: 0, y: 0 }, { x: gray.width, y: 0 }, { x: gray.width, y: gray.height }, { x: 0, y: gray.height }], size.width, size.height)
  }

  const keepGray = options.keepGray ?? 'auto'
  if (keepGray === 'always' || (keepGray === 'auto' && isCleanDocument(rect))) {
    return { image: { ...rect, data: normalizeGray(rect.data) }, cropped: quad !== null, quad, thickened: false, binarized: false }
  }

  let bin = binarize(rect, { contrast: options.contrast })
  if (blackFraction(bin) > 0.4) return null
  const thickness = options.thickness ?? 'auto'
  let thickened = false
  if (thickness === 'auto') {
    thickened = medianStrokeWidth(bin) <= THIN_STROKE_MAX
    if (thickened) bin = thicken(bin)
  } else if (thickness !== 'none') {
    for (let i = 0; i < thickness.passes; i++) bin = thicken(bin, thickness.shape)
    thickened = thickness.passes > 0
  }
  return { image: bin, cropped: quad !== null, quad, thickened, binarized: true }
}
