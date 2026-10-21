import QRCode from 'qrcode'
import type { PaymentSlide } from '../domain/paymentSlides'
import { t } from '../i18n'
import { formatMoney } from './money'

/*
 * Vẽ mục "Chia tiền" của Snapshot (các thẻ chuyển tiền kèm QR) thành một ảnh PNG để gửi qua Facebook/Zalo...
 * Không có phần đầu trang (tên bữa, nút thoát) và không có thanh tab. Dùng Canvas nên chỉ chạy trên trình duyệt.
 */

const WIDTH = 720
const PAD = 24
const CARD_GAP = 16
const QR_SIZE = 360
const INK = '#14301f'
const MUTED = '#4d6b57'
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

type Ctx = CanvasRenderingContext2D

/** Cắt chuỗi để vừa bề ngang, thêm "…" khi dài quá. */
function fit(ctx: Ctx, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let out = text
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1)
  return `${out}…`
}

function drawQr(ctx: Ctx, value: string, x: number, y: number, size: number): void {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  const quiet = 4
  const cell = size / (n + quiet * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, size, size)
  ctx.fillStyle = '#000000'
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (qr.modules.get(c, r)) ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, Math.ceil(cell), Math.ceil(cell))
    }
  }
}

function cardHeight(slide: PaymentSlide): number {
  // tên + số tiền + (QR hoặc ghi chú) + tài khoản + nội dung
  return 44 + 64 + (slide.qrPayload ? QR_SIZE + 16 : 56) + (slide.bank ? 64 : 0) + 40 + PAD
}

function drawCard(ctx: Ctx, slide: PaymentSlide, top: number): number {
  const height = cardHeight(slide)
  const left = PAD
  const inner = WIDTH - PAD * 2
  const mid = WIDTH / 2
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#d9d2bf'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(left, top, inner, height, 20)
  ctx.fill()
  ctx.stroke()

  let y = top + PAD
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = INK
  ctx.font = `600 26px ${FONT}`
  ctx.fillText(fit(ctx, `${slide.fromName} → ${slide.toName}`, inner - PAD * 2), mid, y)
  y += 44

  ctx.font = `700 46px ${FONT}`
  ctx.fillText(formatMoney(slide.amount), mid, y)
  y += 64

  if (slide.qrPayload) {
    drawQr(ctx, slide.qrPayload, mid - QR_SIZE / 2, y, QR_SIZE)
    y += QR_SIZE + 16
  } else {
    ctx.fillStyle = '#92400e'
    ctx.font = `500 22px ${FONT}`
    ctx.fillText(fit(ctx, t('{name} chưa có thông tin ngân hàng nên chưa tạo được mã QR.', { name: slide.toName }), inner - PAD * 2), mid, y + 8)
    y += 56
  }

  if (slide.bank) {
    ctx.fillStyle = MUTED
    ctx.font = `500 22px ${FONT}`
    ctx.fillText(fit(ctx, `${slide.bank.bankName} · ${slide.bank.accountName}`, inner - PAD * 2), mid, y)
    y += 32
    ctx.fillStyle = INK
    ctx.font = `700 26px ${FONT}`
    ctx.fillText(slide.bank.accountNumber, mid, y)
    y += 32
  }

  ctx.fillStyle = MUTED
  ctx.font = `500 22px ${FONT}`
  ctx.fillText(fit(ctx, `${t('Nội dung')}: ${slide.content}`, inner - PAD * 2), mid, y + 4)
  return top + height + CARD_GAP
}

/** Ảnh PNG gồm các khoản chuyển tiền xếp dọc, mỗi khoản một thẻ có QR. */
export async function renderPaymentsPng(slides: ReadonlyArray<PaymentSlide>): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = PAD + slides.reduce((sum, s) => sum + cardHeight(s) + CARD_GAP, 0)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(t('Canvas không khả dụng.'))
  ctx.fillStyle = '#f6f1e3'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  let top = PAD
  for (const slide of slides) top = drawCard(ctx, slide, top)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error(t('Không tạo được ảnh QR.'))
  return blob
}
