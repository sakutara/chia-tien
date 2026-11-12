import { describe, expect, it } from 'vitest'
import { parseReceipt } from './receiptParser'
import { validateReceipt } from './receiptValidation'

/** Văn bản OCR thật của bill Hito Sushi (13110a8a), copy nguyên văn từ ocrText: đọc sai 2 dòng "HITO ROLL" và "UNAGI DONBURI" trước khi sửa. */
const HITO_OCR = [
  'HITO SUSHI',
  '30 Điện Bian Phá Hiệt Sựch Định, Hồ Chí Ki',
  'Việt Nam',
  '0767265268 0908268450',
  'PHIẾU TAM TINH',
  'So HĐ 2602002242',
  'Sô order 1.11',
  'Ngày: 24:10:2026 (19 39 - 20 49)',
  'Bàn: 1',
  'Phục vụ: 10 Huỳnh Báo Châu lô Huỳnh Bảo Chau',
  'Thu ngân: 10 Huỳnh Bao Chau Tô Huỳnh Bảo Châu',
  'Tên món  SL  ĐG Thành tien',
  '1.SALMON  3  99 000  20 000',
  'SASHIMI',
  '2 TUNA SASHIMI  99.000  99 000',
  '3.NISHIN SASHIMI  119 000  199000',
  '4 UNAGE SPECIAL  139.000  139.000',
  'ROLL',
  '5 HITO ROLL  J  139 000  139 000',
  '0.JAPANESE  2 159.000  318 000',
  'STEAK DONBURI',
  '7 UNAGI DONBURI  159 000  159 000',
  '8 Tra dào cam sá 1  35.000  35.000',
  '19 OKONOMIYAKI 1  39 000  39.000',
  '(BÁNH XEO NHẠT)',
  '10 EBI TEMPURA 1  79.000  79.000',
  '(TOM CHIẾN BỌT)',
  '11.Coke  2  22.000  44 000',
  '12 Soda việ: quâ: 1  35.000  35.000',
  '13 Miso Soup  4  15 000  60.000',
  'Tiền hàng  1.562.000d',
  'Tống thanh toán  1.562.000d',
].join('\n')

/** 8 dòng đầu bill 24621c94: dòng "Số HĐ" là metadata, không phải tên quán (logo không đọc được). */
const NO_VENDOR_24621 = [
  'HÓA ĐƠN TH- NT TOAN',
  'Số HĐ: 300174',
  'Mã HĐ: 4FJ9C1  TRI: 8: F F Hall Mark',
  'Bàn: THÉ 12 - TẠI CH? Ngày: 30/10/20126',
  'Giờ vàn: 13.05  Giới ra: 13:07',
  'STT  Tên mới  SL Đơn giá Thành tiền',
  '1 Cà Phê (Latte.Meii Milk)  11 65,000 65,000',
  '- Hot 30 Meji  11  0  a',
].join('\n')

/** 8 dòng đầu bill 6a971d5f: logo đọc thành rác "E R MAT s 38 E", không phải tên quán. */
const NO_VENDOR_6A97 = [
  '01211235 g ss  TẾ',
  'Propy Tilesses  29',
  'E R MAT  s 38 E',
  'PHIẾU TÍNH TIỀN',
  'RECEIPT',
  'Bàn Table: 2F-09',
  'Phiếu Bill: 5-211026-5E374',
  'Giờ vào Time in: 21-10-2026 19:31 Printed: 2',
].join('\n')

/** Bill có tên quán đọc đúng: tên không được đổi sau khi sửa tên quán. */
const VENDOR_CAFE_LUA = [
  'CAFE LÚA',
  'ĐO THO NGAFF LƯỢN MU THU',
  '001000001201',
  'Bàn 29  PHIẾU TẠM TÍNH 125-961',
  'Giờ im',
  'Giờ vào 17/10/2026 10:09  13:42',
  'Nhân Viên: BÙI LÊ ANH',
  'KHOA',
  'Tèn hàng  Đ.Giá SL Thành tiền',
  'Trà Cóc Đác Thơm Pha ngọt  59,000 x 1  59,000',
  'Matcha Yén Mạch 55,000 x 1  55,000',
  'AMERICANO  49,000 x 1  49,000',
  'BỎ NÉ  55,000 1  55,000',
  'HỦ TIẾ" THẬP CÂM Khô  75,000  75,000',
  'HỦ TIỂU CÁ LÓC Khô  65,000 x 11  65,000',
  'NUI XÀO BÒ  55,000 x 1  55,000',
  'PHỤ THU ĐỘ ĂN 2 Súp sườn thêm  30,000 x  30,000',
  'ÉP CÓC  49,000 x 1  49,000',
  'Tổng tiền hàng:  492,000',
  'Chiết khấu:  0',
  'Tổng Cộng:  492,000',
].join('\n')
const VENDOR_NHA_KHACH = [
  'HÓA ĐƠN BÁN HÀNG',
  '(BILL OF SALE)  Ký hiệu (Serinal):',
  'Bản thể hiện của hóa đơn điện tử  2C26TTN',
  'STRINGED  (Electronic invoice display) Ngày (date)13 tháng (manh) 10 năm (year)2026  Số (No,:00001075',
  'Mã của cơ quan thuế:006B42C75C4B7647388FED 33 22 SPED THE HON',
  'Đơn vị bán hàng (Company): NHÀ KHÁCH THÁNG LỢI',
  'Mã số thuế (Tax code): 1600852713',
  'Địa chỉ (Address): Số 01 Lê Hồng Phong, Phường Long Xuyên, Tỉnh An Giang, Việt Nam',
  'Điện thoại (Tel): 02963852637 - Fax: - Website: nhakhachthangloi.vn',
  'Số tài khoản (Account Na): 7010057388 - Ngân hàng (Bank): Ngân hàng đầu tư và phát triển Việt Nam',
  'BIDV - CN An Giang',
  "Họ tên người mua hàng (Customer's name):",
  "Tên đơn vị (Company's name): CÔNG TY CÓ PHẦN RAU QUẢ THỰC PHÁM AN GIANG",
  'Mã số thuế (Tax code); 1600230014',
  'Mã QHNS:',
  'Địa chỉ (Address): Số 69-71-73 Nguyễn Huệ, Phường Long Xuyên, Tỉnh An Giang, Việt Nam',
  'Số tài khoản (Account No,): Ngân hàng (Bank):',
  'Hình thức thanh toản:  Tiền mặt',
  'STT  Tên hàng hóa, dịch vụ  Đơn vị tính Số lượng Đơn giá  Thành tiền',
  'No  (Description)  (Unit) Quantity) (Unit price)  (Amount)',
  '1)  (2)  (3)  (4)  (5)  (6?4x5)',
  '1 Canh chua cá điêu hồng  Lầu  2  250.000  500.000',
  '2 Thịt kho trứng  Dĩa  2  280.000  560.000',
  '3 Cải ngọt xào thịt bò  Dĩa  2  320.000  640.000',
  '4 Trái cây  Dĩa  2  71.187  142.374',
  '5 Cơm trắng  Thố  2  55.000  110.000',
  '6 Trứng chiên gia vị  Dĩa  2  55.000  110.000',
  'DIARTED  K',
  'Cộng tiền hàng hóa, dịch vụ (Total amount)  2.050.000',
  'Đi giảm 12.374,00 tương ứng 20% nức ty 17%% để tính thuế giá trị gia tăng theo Nghị quyết số 204 2025 QHI',
  'Số tiền viết bằng chữ (Amount in words): Hai triệu, không trăm năm mươi nghìn đồng',
  'Người mua hàng  Cơ quan thuế  Người bán hàng',
  '(Ký. ghi rõ họ tên)  (Kỳ, đóng dầu)  (Kỳ, ghi rõ họ tên)',
  'Signant Vaid  Signatur Valid',
  'Số thà chi thi Kỳ ngày 1971120060162000 THÌNH THA NGLO-VIN KỲ BAI: NHÀ KHÁCH THÀNH Kinh 1101000000 10.000',
  '(Cần kiểm tra đổi chiếu khi lập, giao, nhận hóa đơn)',
  'Tra cứu hóa đơn: https:/1600852713-177.vnpt-invoice.com.vn/',
  'Mã tra cửu hóa đơn: 169942001C26TTN1075244518',
  'Đom vị cung cấp giải pháp hòa đơn điện từ: Trung tâm kinh doanh vnpt an giang MST: 033, Điện thoại 190012',
].join('\n')
const VENDOR_COFFEE = [
  'EVERY',
  'Hắc Pumm santan',
  'JUNIAN',
  'COFFEE ROASTERS',
  'HÓA ĐƠN THANH TOÁN',
  'SỐ HD: 300097',
  'Mã HĐ: 4BF7XW  Thi: Store Hall Mark',
  'BÀN: THẾ 3 - TẠI CHO Ngày: 30/10/2026',
  'Giờ vào::00:29  Giờ ra: 19922',
  'STT Tên môn SL Đơn giá Thành tiền',
  '1 Cà Phê (Nitro Coldbrew)  "i 55,000 55,000',
  '2 Cà Phê (Latte Oal Milk)  1 65,000 65,000',
  '- Hot 50 Oat  "I  o  ol',
  'Tổng số món: 2',
  'Thành tiền:  120,000',
  'Tổng tiền:  120,000 g',
  '+Thanh toán (MOMOLELC)  120,000 d',
  'THỐNG TIN GIAO DỊ: HÀ KHÔNG TIỀN MẶT ?',
  'Số thé  5304166941418864',
].join('\n')
const VENDOR_TAO = [
  'Tu',
  'C.TAO - Chinese Restaurant',
  'Hiện phá Thủ Thiêm 10 Hiên Thiên Thành, P',
  'Thiêm, TP. Thủ Đức, TP.HCM',
  'Diện thoại: 028 3915 1689',
  'PHIẾU TẠM TÍNH',
  'Bàn: 218 (Lầu 1)',
  'Số bill:  CTO01-2610300034',
  'Giờ vào: 12:22 Giờ ra: 12:56',
  'Ngày tạo  30/10/2026 12:22',
  'Ngày in  30/10/2026 - 12:56',
  'Nhân viên:  Bùi Thị Thu Thùy',
  'Số khách:  4',
  'Hàng hóa SL  Đ.Giá T.TIÊN',
  'Khăn Lạnh 3 x  5,000 5  15,000',
  'Mì Kéo Hài Sàn',
  '1 x 125,000 F  125,000',
  'Mì Kéo Hoành Thánh Xá Xíu',
  '2 x 105,000 5  210,000',
  'Mi Kéo Vịt Quay',
  '1 105,000 F  105,000',
  'Xíu Mại Tồm Thịt Nấm Hương 3 Viên',
  '1 x  85,000 s  85,000',
  'Tổng số lương:  8',
  'Tổng tiền:  540,000',
  'VAT 8%:  43,2000',
  'Thanh toán:  583,200',
  '+ VnPay  583,200',
  'Khách hàng lê',
  'Cảm ơn quý khách, hẹn gặp lail',
  'Phiếu thanh toàn này co giau phát hóa đon',
  'GTGT trong ngày',
  'sands thers',
].join('\n')

describe('bill Hito Sushi (13110a8a): hàng bị rơi và đối soát về 1.562.000', () => {
  const parsed = parseReceipt(HITO_OCR)

  it('đọc đủ 13 món, không món nào bị rơi', () => {
    expect(parsed.items).toHaveLength(13)
    expect(parsed.tableRows).toMatchObject({ expected: 13 })
  })

  it('"HITO ROLL" (SL bị đọc thành J) và "UNAGI DONBURI" (sau dòng nối "STEAK DONBURI") đều có mặt, đúng đơn giá', () => {
    const hito = parsed.items.find((i) => i.name === 'HITO ROLL')
    const unagi = parsed.items.find((i) => i.name === 'UNAGI DONBURI')
    expect([hito?.quantity, hito?.unitPrice, hito?.rawAmount]).toEqual([1, 139_000, 139_000])
    expect([unagi?.quantity, unagi?.unitPrice, unagi?.rawAmount]).toEqual([1, 159_000, 159_000])
  })

  it('tên món bỏ số thứ tự dính dấu chấm: "1.SALMON", "3.NISHIN", "11.Coke"', () => {
    expect(parsed.items[0].name).toBe('SALMON SASHIMI')
    expect(parsed.items[2].name).toBe('NISHIN SASHIMI')
    expect(parsed.items[10].name).toBe('Coke')
  })

  it('đối soát sửa thành tiền về đúng 13 món, tổng 1.562.000 và không còn MISMATCH', () => {
    const check = validateReceipt(parsed, HITO_OCR)
    expect(check.status).not.toBe('MISMATCH')
    expect(check.status).toBe('CORRECTED')
    expect(check.receipt.billTotal).toBe(1_562_000)
    expect(check.receipt.items.map((i) => i.rawAmount)).toEqual([
      297_000, 99_000, 119_000, 139_000, 139_000, 318_000, 159_000, 35_000, 39_000, 79_000, 44_000, 35_000, 60_000,
    ])
    expect(check.receipt.items.reduce((s, i) => s + i.rawAmount, 0)).toBe(1_562_000)
  })
})

describe('dòng món: SL bị đọc thành một chữ, tiền dính thành nhóm nghìn', () => {
  it('"J" giữa tên và hai tiền bằng nhau là SL 1: bỏ chữ khỏi tên', () => {
    const parsed = parseReceipt(['Quán test', 'Gà nướng J 139.000 139.000'].join('\n'))
    expect(parsed.items.map((i) => [i.name, i.quantity, i.unitPrice, i.rawAmount])).toEqual([['Gà nướng', 1, 139_000, 139_000]])
  })

  it('cùng quy tắc khi tiền viết cách nhau bằng khoảng trắng: "139 000 139 000" là hai tiền, không gộp thành một số', () => {
    const parsed = parseReceipt(['Quán test', 'HITO ROLL J 139 000 139 000'].join('\n'))
    expect(parsed.items.map((i) => [i.name, i.quantity, i.unitPrice, i.rawAmount])).toEqual([['HITO ROLL', 1, 139_000, 139_000]])
  })

  it('dòng có STT sau dòng chữ không bị nối vào tên món trước', () => {
    const parsed = parseReceipt(['Quán test', '3 UNAGE SPECIAL 139.000 139.000', 'ROLL', '4 HITO ROLL 139.000 139.000', '5 TUNA 99.000 99.000'].join('\n'))
    expect(parsed.items.map((i) => i.name)).toEqual(['UNAGE SPECIAL ROLL', 'HITO ROLL', 'TUNA'])
  })
})

describe('cleanItemName: STT dính dấu chấm bị bỏ, số đầu tên thật được giữ', () => {
  it('"1.SALMON", "11.Coke", "0.JAPANESE" bỏ số thứ tự', () => {
    const parsed = parseReceipt(
      ['Quán test', '1.SALMON SASHIMI 3 99.000 297.000', '11.Coke 2 22.000 44.000', '0.JAPANESE STEAK DONBURI 2 159.000 318.000'].join('\n'),
    )
    expect(parsed.items.map((i) => i.name)).toEqual(['SALMON SASHIMI', 'Coke', 'JAPANESE STEAK DONBURI'])
  })

  it('"7 Up" giữ nguyên số đầu tên (không có dấu chấm)', () => {
    const parsed = parseReceipt(['Quán test', '7 Up  1  15.000  15.000'].join('\n'))
    expect(parsed.items.map((i) => [i.name, i.rawAmount])).toEqual([['7 Up', 15_000]])
  })
})

describe('tên quán: bỏ dòng metadata (Số HĐ, Ngày…) và dòng rác OCR', () => {
  it('bill 24621c94: dòng "Số HĐ: 300174" không làm tên quán, và không đoán tên khác', () => {
    expect(parseReceipt(NO_VENDOR_24621).vendorName).toBeUndefined()
  })

  it('bill 6a971d5f: dòng rác "E R MAT s 38 E" không làm tên quán', () => {
    expect(parseReceipt(NO_VENDOR_6A97).vendorName).toBeUndefined()
  })

  it('dòng metadata có nhãn và số bị bỏ, dòng tên quán ngay sau vẫn được nhận', () => {
    expect(parseReceipt(['Số HĐ: 300174', 'Ngày: 30/10/2026', 'Quán Gà Nướng', 'Gà 2 10.000 20.000'].join('\n')).vendorName).toBe('Quán Gà Nướng')
  })

  it('dòng rác: quá nửa token là một chữ hoặc một số; một token đơn không bị coi là rác', () => {
    expect(parseReceipt(['E R MAT s 38 E', 'Gà 2 10.000 20.000'].join('\n')).vendorName).toBeUndefined()
    expect(parseReceipt(['HITO', 'Gà 2 10.000 20.000'].join('\n')).vendorName).toBe('HITO')
  })

  it('các tên quán đã đọc đúng vẫn giữ nguyên', () => {
    expect(parseReceipt(VENDOR_CAFE_LUA).vendorName).toBe('CAFE LÚA')
    expect(parseReceipt(VENDOR_NHA_KHACH).vendorName).toBe('NHÀ KHÁCH THÁNG LỢI')
    expect(parseReceipt(VENDOR_COFFEE).vendorName).toBe('COFFEE ROASTERS')
    expect(parseReceipt(VENDOR_TAO).vendorName).toBe('C.TAO - Chinese Restaurant')
  })
})

describe('gộp nhóm nghìn bị tách bởi khoảng trắng', () => {
  it('số hàng chục triệu "12 500 000" vẫn là một số', () => {
    const parsed = parseReceipt(['Quán test', 'Set hải sản 1 12 500 000', 'Tổng cộng 12 500 000'].join('\n'))
    expect(parsed.items.map((i) => i.rawAmount)).toEqual([12_500_000])
    expect(parsed.billTotal).toBe(12_500_000)
  })

  it('cỡ "L" cuối tên không bị coi là SL đọc sai', () => {
    const parsed = parseReceipt(['Quán test', 'Trà sữa L 35.000 35.000'].join('\n'))
    expect(parsed.items.map((i) => i.name)).toEqual(['Trà sữa L'])
  })
})

describe('dòng tổng có nhóm nghìn tách bởi khoảng trắng', () => {
  it('"Tổng cộng 562 000" và "Tổng cộng 1 562 000" đọc đủ số', () => {
    expect(parseReceipt(['Quán test', 'Set A 1 562.000', 'Tổng cộng 562 000'].join('\n')).billTotal).toBe(562_000)
    expect(parseReceipt(['Quán test', 'Set A 1 1.562.000', 'Tổng cộng 1 562 000'].join('\n')).billTotal).toBe(1_562_000)
  })
})
