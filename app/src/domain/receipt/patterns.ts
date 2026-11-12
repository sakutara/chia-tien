// Regex và từ khoá nhận dạng dòng (văn bản đã bỏ dấu, xem fold).
import { fold } from '../../lib/textFold'

export const PERCENT_RE = /(\d{1,2}(?:[.,]\d)?)\s*%/g
export const MONEY_TOKEN_RE = /\d[\d.,]*k?/gi

export const VAT_RE = /\b(vat|gtgt|thue)\b/
/** Dòng nhắc tới thuế nhưng không phải khoản VAT: mã số thuế, cơ quan thuế, tra cứu thuế. */
export const TAX_ID_RE = /ma so thue|\bmst\b|tax code|tax id|co quan thue/
export const SERVICE_RE = /phi phuc vu|phuc vu|phi dv|service/
export const DISCOUNT_RE = /giam gia|chiet khau|khuyen mai|discount|\bck\b/
/** Phí giao hàng và các phụ phí của app giao đồ ăn (không phải món): cộng dồn vào phí phục vụ. */
export const EXTRA_FEE_RE = /phi giao hang|phi van chuyen|phi ap dung|phi nen tang|phi ship|delivery fee|shipping/
/** Dòng ghi chú / tuỳ chọn của một món trên đơn app ("Ghi chú: Ít đá", "Size L"): không phải tên món, cũng không ghép vào tên món sau. */
export const ITEM_NOTE_RE = /^\W*(?:ghi chu|note)\b|^\W*size\b/
/** Số lượng đứng trước tên món: "1x Cà phê sữa". */
/** Cho phép tối đa hai token rác ngắn đứng trước (ảnh món bị OCR đọc thành "là.", "Pi"). */
export const LEADING_QTY_RE = /^(?:\S{1,3}\s+){0,2}?\W*(\d{1,2})\s*[xX×]\s+(?=\p{L})/u
export const TOTAL_RE = /t[oe]ng cong|t[oe]ng thanh toan|t[oe]ng tien|can thanh toan|thanh toan|con phai thu|total|\bamount\b/
/** Dòng tiền hàng / tạm tính: tổng các món, chưa gồm giảm giá, phí phục vụ, VAT. */
export const SUBTOTAL_RE = /tong \(\d+ mon\)|tien hang|tong tam tinh|tam tinh|sub ?total|cong tien/
export const TOTAL_EXCLUDE_RE = /tien hang|tam tinh|sub ?total|tien mat|tien thua|tien thoi|\bthe\b|card|cash/

/** Dòng địa chỉ, điện thoại, mã số thuế: không phải tên quán cũng không phải món. */
export const ADDRESS_RE = /^\W*dc\b|d\/c|dia chi|sdt|\btel\b|hotline|phone|\bmst\b|ma so|website|www\./
/** Tiêu đề và chân trang của bill. */
export const HEADER_RE =
  /tom tat don|chi tiet don hang|hoa don|bien lai|phieu|receipt|ten mon|ten hang|don gia|thanh tien|^sl\b|\bban\b|table|cam on|hen gap|thank|nhan vien|thu ngan|gio vao|gio ra|gio in|\bin:|\bstt\b|description|quantity|unit price|\bamount\b|bill of sale|ky hieu|serial|so\s*\(no|\(\d\s*=\s*\d\s*x\s*\d\)/
/** Dòng đánh số cột của bảng hoá đơn điện tử: "(1) (2) (3) (4) (5) (6=4x5)" (OCR hay đọc hỏng ngoặc: "a) 2) t3)"). */
export const COLUMN_INDEX_RE = /6\s*=\s*4\s*x\s*5|^(?:\W{0,2}\w{1,2}\)\s*){3,}/
export const FOOTER_RE = /^\W*t[oe0]ng\b|\bsub ?total\b|\bgrand\b|tong|tam tinh|tien mat|tien thua|tien thoi|thanh toan|tien hang|\bthe\b|card|cash|change/

/** Dòng chữ ký, mã tra cứu, đơn vị cung cấp giải pháp ở chân hoá đơn điện tử. */
export const NOTE_RE =
  /chu ky|signature|ky boi|ky ngay|tra cuu|ma cua co quan|co quan thue|nguoi mua hang|nguoi ban hang|cung cap giai phap|ma qhns|hinh thuc thanh toan|so tai khoan|ngan hang|\bwi-?fi\b|mat khau|password|\bpass\b/
/** Khoản giảm ghi dạng "Đã giảm 12.374,00 tương ứng 20% mức tỷ lệ % để tính thuế GTGT..." (giảm thuế theo nghị quyết): là giảm giá bằng số tiền, không phải VAT. */
export const REDUCTION_RE = /^\W*da giam\b|\bgiam\s+\d[\d.,]*\s+tuong ung/
/** Dòng tổng của hoá đơn điện tử: "Cộng tiền hàng hoá, dịch vụ (Total amount) 2.050.000" là số phải trả, đã trừ khoản giảm bên dưới. */
export const TOTAL_AMOUNT_RE = /total amount/
export const UNIT_COLUMN_RE = /don vi tinh|\(unit\)|\bdvt\b/
/** Đơn vị tính hay gặp (đã bỏ dấu, kể cả dạng OCR đọc hỏng) ở cột "Đơn vị tính" của hoá đơn điện tử. */
export const UNIT_WORDS = new Set([
  'lau',
  'dia',
  'di',
  'die',
  'tho',
  'chai',
  'ly',
  'phan',
  'to',
  'cai',
  'kg',
  'bat',
  'suat',
  'lon',
  'hop',
  'goi',
  'chiec',
  'con',
  'lit',
  'thung',
  'ket',
  'cay',
  'mieng',
  'cuon',
  'cu',
  'qua',
])
/** Dòng "Đơn vị bán hàng (Company): TÊN" của hoá đơn điện tử: tên quán chính là phần sau dấu hai chấm. */
export const SELLER_RE = /(?:don vi ban hang|ten don vi ban|nguoi ban)\b(.*)$/

/** Nhãn đứng trước số dài không phải tiền: "Số" (số hoá đơn), "Số tài khoản", "STK" (OCR hay đọc thành "SO"). */
export const LONG_NUMBER_LABEL_RE = /^\W*(?:so|stk|so tai khoan|so hoa don|ma so)\s*[:.]?\s*\d/
export const VENDOR_KEYWORD_RE =
  /nha hang|quan\b|cafe|coffee|\blau\b|bbq|\bbill\b|restaurant|karaoke|\btra\b|\bbar\b|buffet|\bcom\b|\bpho\b|\bbun\b|bistro|kitchen/

/** Nhãn "Thành tiền" đầu dòng: sau các dòng món thì là dòng tổng theo vị trí (tiền hàng hoặc tổng bill). */
export const THANH_TIEN_RE = /^thanh tien\b/
/** Dòng tiền khách đưa / khách trả / trả khách: không phải món (spec: "Nhận dòng tổng, tạm tính và tiền khách trả"). */
export const CASH_GIVEN_RE = /tien khach dua|khach dua|khach tra|tra khach/

/** Tiêu đề cột của bảng món không có số tiền ("Mặt hàng SL Số tiền"): cần ít nhất hai nhóm để không nhầm với tên món. */
export const ITEM_HEADER_GROUPS = [
  /\b(mat hang|ten mon|ten hang|mon)\b/,
  /\b(sl|so luong)\b/,
  /\b(so tien|don gia|dg|thanh tien|don vi tinh|amount)\b/,
]

export const QTY_PAIR_RE = /^(\d{1,3})\s*[xX×*]\s*(\d[\d.,]*k?)\s*=\s*(\d[\d.,]*k?)$/i
/** Tên, số lượng, đơn giá và thành tiền trên cùng một dòng: "Lẩu bò 2 x 150.000 = 300.000". */
export const ONE_LINE_EQ_RE = /^(.*\S)\s+(\d{1,3})\s*[xX×*]\s*(\d[\d.,]*k?)\s*=\s*(\d[\d.,]*k?)$/

export function hit(re: RegExp, line: string): boolean {
  return re.test(fold(line))
}
