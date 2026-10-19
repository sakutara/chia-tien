import type { ParsedReceipt } from '../receiptParser'

/*
 * Bộ bill mẫu cho receiptParser. Mỗi bill là văn bản OCR thô; `expected` là kết quả tính tay từ bill.
 * Dùng để kiểm bố cục (1 dòng, 2 dòng), VAT %, VAT số tiền, giảm giá, phí phục vụ, lỗi OCR thường gặp.
 */

export interface ReceiptFixture {
  name: string
  text: string
  expected: ParsedReceipt
}

export const RECEIPT_FIXTURES: ReceiptFixture[] = [
  {
    name: 'lẩu, bố cục 2 dòng, VAT ghi số tiền',
    text: `LẨU BÒ GỖ NGỌC
Đ/C: 12 Lê Lợi, Q1
SĐT: 0909 123 456
HÓA ĐƠN BÁN HÀNG
Ngày 19/10/2026 14:30
Bàn: 5
Lẩu bò mỹ
2 x 150.000 = 300.000
Bia Tiger 330ml
10 x 25.000 = 250.000
Tổng tiền hàng 550.000
VAT 8% 44.000
Tổng cộng 594.000
Tiền mặt 600.000
Cảm ơn quý khách`,
    expected: {
      vendorName: 'LẨU BÒ GỖ NGỌC',
      invoiceDate: '2026-10-19',
      items: [
        { name: 'Lẩu bò mỹ', quantity: 2, unitPrice: 150_000, rawAmount: 300_000, uncertain: false },
        { name: 'Bia Tiger 330ml', quantity: 10, unitPrice: 25_000, rawAmount: 250_000, uncertain: false },
      ],
      vat: { mode: 'FIXED_AMOUNT', value: 44_000 },
      billSubtotal: 550_000,
      billTotal: 594_000,
    },
  },
  {
    name: 'cafe, bố cục 1 dòng, giảm giá, phí phục vụ, VAT',
    text: `CAFE SÀI GÒN
Bàn 3
Cà phê sữa 2 30.000 60.000
Bánh flan 1 25.000 25.000
Trà đào 1 35.000 35.000
Tạm tính 120.000
Giảm giá 10% -12.000
Phí phục vụ 5% 5.400
VAT 8% 9.072
TỔNG CỘNG 122.472`,
    expected: {
      vendorName: 'CAFE SÀI GÒN',
      items: [
        { name: 'Cà phê sữa', quantity: 2, unitPrice: 30_000, rawAmount: 60_000, uncertain: false },
        { name: 'Bánh flan', quantity: 1, unitPrice: 25_000, rawAmount: 25_000, uncertain: false },
        { name: 'Trà đào', quantity: 1, unitPrice: 35_000, rawAmount: 35_000, uncertain: false },
      ],
      discount: { mode: 'FIXED_AMOUNT', value: 12_000 },
      service: { mode: 'FIXED_AMOUNT', value: 5_400 },
      vat: { mode: 'FIXED_AMOUNT', value: 9_072 },
      billSubtotal: 120_000,
      billTotal: 122_472,
    },
  },
  {
    name: 'nhà hàng, ngày dạng chữ, giá viết tắt k, không VAT',
    text: `NHÀ HÀNG HẢI SẢN BIỂN ĐÔNG
Địa chỉ: 99 Trần Phú
Ngày 15 tháng 3 năm 2026
Cua hoàng đế 1 450k 450k
Mực nướng 2 120.000 240.000
Tổng cộng 690.000
Tiền mặt 700.000
Tiền thừa 10.000`,
    expected: {
      vendorName: 'NHÀ HÀNG HẢI SẢN BIỂN ĐÔNG',
      invoiceDate: '2026-03-15',
      items: [
        { name: 'Cua hoàng đế', quantity: 1, unitPrice: 450_000, rawAmount: 450_000, uncertain: false },
        { name: 'Mực nướng', quantity: 2, unitPrice: 120_000, rawAmount: 240_000, uncertain: false },
      ],
      billTotal: 690_000,
    },
  },
  {
    name: 'quán, thành tiền không khớp SL × đơn giá: đánh dấu xem lại',
    text: `QUÁN BÚN ĐẬU
Bún đậu mắm tôm 2 45.000 80.000
Chả cốm 1 30.000 30.000
Tổng cộng 110.000`,
    expected: {
      vendorName: 'QUÁN BÚN ĐẬU',
      items: [
        { name: 'Bún đậu mắm tôm', quantity: 2, unitPrice: 45_000, rawAmount: 80_000, uncertain: true },
        { name: 'Chả cốm', quantity: 1, unitPrice: 30_000, rawAmount: 30_000, uncertain: false },
      ],
      billTotal: 110_000,
    },
  },
  {
    name: 'OCR đọc nhầm l thành 1 trong giá tiền',
    text: `BBQ ĐÊM NAY
Gà nướng 1 l20.000 120.000
Nước ngọt 2 15.000 30.000
TOTAL 150.000`,
    expected: {
      vendorName: 'BBQ ĐÊM NAY',
      items: [
        { name: 'Gà nướng', quantity: 1, unitPrice: 120_000, rawAmount: 120_000, uncertain: false },
        { name: 'Nước ngọt', quantity: 2, unitPrice: 15_000, rawAmount: 30_000, uncertain: false },
      ],
      billTotal: 150_000,
    },
  },
  {
    name: 'Cafe Lúa: "đơn giá x SL  thành tiền", ghi chú tách dòng, ảnh nhỏ OCR hỏng chữ',
    text: `CAFELÚA -
Hotline: 0g06.722:

TẠM TINH

:   F      '         _           Giờ in:

Giò vào: 17/10/2026 10:09             13:42
Nhân Viên: BUI LE ANH

KHOA

Tén hang               D.Gid SL Thành tiền
[rà Cóc Đác Thom

Panga               59,000 x 1        59,000
Matcha Yến Mach      55,000 x 1        55,000
AMERICANO          49,000 x 1        49,000
BO NE                 55,000 x 1        55,000
HU TIE'J THAP CAM   75,000 x 1      75,000
Khô

HU TIEU CÁ LÓC                   :

Khô                    65,000 x           65,000
NUI XÀO BÒ           55,000 x 1        55,000
PHU THU ĐÔ AN 2     :           n        :

Súp sườn thêm          S022             30,000
ÉP CÓC            49,000 x 1      49,000
——>mRmnmeeeee

Tổng tiền hang:                         492,000
Chiết khẩu:                                     0
Tổng Cộng:                          492,000
`,
    expected: {
      vendorName: 'CAFELÚA',
      invoiceDate: '2026-10-17',
      items: [
        { name: '[rà Cóc Đác Thom - Panga', quantity: 1, unitPrice: 59_000, rawAmount: 59_000, uncertain: false },
        { name: 'Matcha Yến Mach', quantity: 1, unitPrice: 55_000, rawAmount: 55_000, uncertain: false },
        { name: 'AMERICANO', quantity: 1, unitPrice: 49_000, rawAmount: 49_000, uncertain: false },
        { name: 'BO NE', quantity: 1, unitPrice: 55_000, rawAmount: 55_000, uncertain: false },
        { name: "HU TIE'J THAP CAM", quantity: 1, unitPrice: 75_000, rawAmount: 75_000, uncertain: false },
        { name: 'HU TIEU CÁ LÓC - Khô', quantity: 1, unitPrice: 65_000, rawAmount: 65_000, uncertain: true },
        { name: 'NUI XÀO BÒ', quantity: 1, unitPrice: 55_000, rawAmount: 55_000, uncertain: false },
        { name: 'PHU THU ĐÔ AN 2 - Súp sườn thêm', quantity: 1, unitPrice: 30_000, rawAmount: 30_000, uncertain: false },
        { name: 'ÉP CÓC', quantity: 1, unitPrice: 49_000, rawAmount: 49_000, uncertain: false },
      ],
      billSubtotal: 492_000,
      billTotal: 492_000,
    },
  },
  {
    name: 'dòng tổng bị OCR đọc lệch chữ ("Tông cọng") không được thành món',
    text: `QUÁN CƠM TẤM
Cơm sườn 2 x 45.000 = 90.000
Trà đá 3 x 5.000 = 15.000
Tông cọng 105.000
Thanh toán 105.000`,
    expected: {
      vendorName: 'QUÁN CƠM TẤM',
      items: [
        { name: 'Cơm sườn', quantity: 2, unitPrice: 45_000, rawAmount: 90_000, uncertain: false },
        { name: 'Trà đá', quantity: 3, unitPrice: 5_000, rawAmount: 15_000, uncertain: false },
      ],
      billTotal: 105_000,
    },
  },
]
