import { normalizeName } from '../db/normalize'

export interface BankInfo {
  /** Mã BIN NAPAS dùng trong VietQR. */
  bin: string
  /** Mã viết tắt (VD: VCB). */
  code: string
  /** Tên hiển thị ngắn (VD: Vietcombank). */
  name: string
  /** Tên đầy đủ, chỉ dùng để tìm kiếm và gợi ý. */
  fullName: string
}

const bank = (bin: string, code: string, name: string, fullName: string): BankInfo => ({ bin, code, name, fullName })

/** Ngân hàng/ví hỗ trợ VietQR (nhận chuyển khoản liên ngân hàng NAPAS 24/7). */
export const BANKS: ReadonlyArray<BankInfo> = [
  bank('970436', 'VCB', 'Vietcombank', 'Ngân hàng TMCP Ngoại thương Việt Nam'),
  bank('970415', 'CTG', 'VietinBank', 'Ngân hàng TMCP Công thương Việt Nam'),
  bank('970418', 'BIDV', 'BIDV', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam'),
  bank('970405', 'AGR', 'Agribank', 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam'),
  bank('970407', 'TCB', 'Techcombank', 'Ngân hàng TMCP Kỹ thương Việt Nam'),
  bank('970422', 'MB', 'MB Bank', 'Ngân hàng TMCP Quân đội'),
  bank('970416', 'ACB', 'ACB', 'Ngân hàng TMCP Á Châu'),
  bank('970432', 'VPB', 'VPBank', 'Ngân hàng TMCP Việt Nam Thịnh Vượng'),
  bank('970423', 'TPB', 'TPBank', 'Ngân hàng TMCP Tiên Phong'),
  bank('970403', 'STB', 'Sacombank', 'Ngân hàng TMCP Sài Gòn Thương Tín'),
  bank('970437', 'HDB', 'HDBank', 'Ngân hàng TMCP Phát triển TP.HCM'),
  bank('970441', 'VIB', 'VIB', 'Ngân hàng TMCP Quốc tế Việt Nam'),
  bank('970443', 'SHB', 'SHB', 'Ngân hàng TMCP Sài Gòn - Hà Nội'),
  bank('970440', 'SSB', 'SeABank', 'Ngân hàng TMCP Đông Nam Á'),
  bank('970448', 'OCB', 'OCB', 'Ngân hàng TMCP Phương Đông'),
  bank('970426', 'MSB', 'MSB', 'Ngân hàng TMCP Hàng Hải Việt Nam'),
  bank('970431', 'EIB', 'Eximbank', 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam'),
  bank('970449', 'LPB', 'LPBank', 'Ngân hàng TMCP Lộc Phát Việt Nam (LienVietPostBank)'),
  bank('970429', 'SCB', 'SCB', 'Ngân hàng TMCP Sài Gòn'),
  bank('970428', 'NAB', 'Nam A Bank', 'Ngân hàng TMCP Nam Á'),
  bank('970409', 'BAB', 'Bac A Bank', 'Ngân hàng TMCP Bắc Á'),
  bank('970425', 'ABB', 'ABBANK', 'Ngân hàng TMCP An Bình'),
  bank('970412', 'PVCB', 'PVcomBank', 'Ngân hàng TMCP Đại Chúng Việt Nam'),
  bank('970419', 'NCB', 'NCB', 'Ngân hàng TMCP Quốc Dân'),
  bank('970433', 'VBB', 'VietBank', 'Ngân hàng TMCP Việt Nam Thương Tín'),
  bank('970438', 'BVB', 'BaoViet Bank', 'Ngân hàng TMCP Bảo Việt'),
  bank('970454', 'VCCB', 'Viet Capital Bank', 'Ngân hàng TMCP Bản Việt'),
  bank('970400', 'SGB', 'Saigonbank', 'Ngân hàng TMCP Sài Gòn Công Thương'),
  bank('970430', 'PGB', 'PG Bank', 'Ngân hàng TMCP Thịnh vượng và Phát triển'),
  bank('970452', 'KLB', 'KienlongBank', 'Ngân hàng TMCP Kiên Long'),
  bank('970408', 'GPB', 'GPBank', 'Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu'),
  bank('970414', 'OJB', 'Oceanbank', 'Ngân hàng Thương mại TNHH MTV Đại Dương'),
  bank('970444', 'CBB', 'CBBank', 'Ngân hàng Thương mại TNHH MTV Xây dựng Việt Nam'),
  bank('970446', 'COOP', 'Co-opBank', 'Ngân hàng Hợp tác xã Việt Nam'),
  bank('970421', 'VRB', 'VRB', 'Ngân hàng Liên doanh Việt - Nga'),
  bank('970457', 'WVN', 'Woori Bank', 'Ngân hàng TNHH MTV Woori Việt Nam'),
  bank('970424', 'SHBVN', 'Shinhan Bank', 'Ngân hàng TNHH MTV Shinhan Việt Nam'),
  bank('970410', 'SCVN', 'Standard Chartered', 'Ngân hàng TNHH MTV Standard Chartered Việt Nam'),
  bank('970439', 'PBVN', 'Public Bank', 'Ngân hàng TNHH MTV Public Việt Nam'),
  bank('970442', 'HLBVN', 'Hong Leong Bank', 'Ngân hàng TNHH MTV Hong Leong Việt Nam'),
  bank('458761', 'HSBC', 'HSBC', 'Ngân hàng TNHH MTV HSBC Việt Nam'),
  bank('422589', 'CIMB', 'CIMB', 'Ngân hàng TNHH MTV CIMB Việt Nam'),
  bank('970458', 'UOB', 'UOB', 'Ngân hàng United Overseas Bank Việt Nam'),
  bank('796500', 'DBS', 'DBS Bank', 'DBS Bank Ltd - Chi nhánh TP.HCM'),
  bank('668888', 'KBANK', 'KBank', 'Ngân hàng đại chúng TNHH Kasikornbank'),
  bank('546034', 'CAKE', 'CAKE', 'Ngân hàng số CAKE by VPBank'),
  bank('546035', 'UBANK', 'Ubank', 'Ngân hàng số Ubank by VPBank'),
  bank('963388', 'TIMO', 'Timo', 'Ngân hàng số Timo by Bản Việt'),
  bank('963369', 'LIO', 'Liobank', 'Ngân hàng số Liobank by OCB'),
  bank('971005', 'VTLMONEY', 'Viettel Money', 'Tổng Công ty Dịch vụ số Viettel'),
  bank('971011', 'VNPTMONEY', 'VNPT Money', 'VNPT Money'),
]

const KEYS = BANKS.map((b) => normalizeName(`${b.name} ${b.code} ${b.fullName}`))

/** Tìm ngân hàng theo tên/mã/tên đầy đủ, không phân biệt hoa-thường và dấu. Rỗng → toàn bộ danh sách. */
export function searchBanks(query: string): BankInfo[] {
  const q = normalizeName(query)
  if (!q) return [...BANKS]
  const terms = q.split(/\s+/)
  return BANKS.filter((_, i) => terms.every((t) => KEYS[i].includes(t))).sort((a, b) => {
    const rank = (x: BankInfo) => {
      const name = normalizeName(x.name)
      const code = normalizeName(x.code)
      return name.startsWith(q) || code.startsWith(q) ? 0 : 1
    }
    return rank(a) - rank(b)
  })
}

export function findBankByBin(bin: string): BankInfo | undefined {
  return BANKS.find((b) => b.bin === bin)
}
