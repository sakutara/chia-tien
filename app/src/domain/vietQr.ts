
import { t } from '../i18n'/*
 * Dựng chuỗi VietQR (EMVCo, dịch vụ chuyển nhanh NAPAS 247 đến tài khoản). Hàm thuần.
 * Ứng dụng ngân hàng quét mã sẽ tự điền số tài khoản, số tiền và nội dung.
 */

const tlv = (tag: string, value: string) => `${tag}${String(value.length).padStart(2, '0')}${value}`

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) như EMVCo yêu cầu. */
export function crc16(input: string): string {
  let crc = 0xffff
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Nội dung chuyển khoản: bỏ dấu, chỉ giữ chữ-số-khoảng trắng (nhiều ngân hàng từ chối ký tự lạ), tối đa 50 ký tự. */
export function sanitizeTransferContent(raw: string): string {
  const folded = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
  return folded.replace(/[^A-Za-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50).trim()
}

/** Nội dung mặc định: "<người nợ> thanh toán <tên bữa>". */
export function buildTransferContent(debtorName: string, mealTitle: string): string {
  return sanitizeTransferContent(t('{debtorName} thanh toán {mealTitle}', { debtorName, mealTitle }))
}

export interface VietQrInput {
  bankBin: string
  accountNumber: string
  /** Số tiền đồng nguyên dương. */
  amount: number
  content: string
}

export function buildVietQrPayload({ bankBin, accountNumber, amount, content }: VietQrInput): string {
  const account = tlv('00', bankBin) + tlv('01', accountNumber)
  const merchant = tlv('00', 'A000000727') + tlv('01', account) + tlv('02', 'QRIBFTTA')
  const text = sanitizeTransferContent(content)
  const body =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('38', merchant) +
    tlv('53', '704') +
    tlv('54', String(Math.round(amount))) +
    tlv('58', 'VN') +
    (text ? tlv('62', tlv('08', text)) : '') +
    '6304'
  return body + crc16(body)
}
