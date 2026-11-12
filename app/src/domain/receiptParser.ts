/*
 * Bộ phân tích văn bản OCR của hoá đơn (02 §3, BR-4.7, BR-4.14). Mã nằm trong thư mục receipt/, tệp này giữ đường dẫn import cũ
 * và re-export API công khai. Nguyên tắc: hàm thuần, văn bản vào, dữ liệu gợi ý ra; không đoán.
 */

export { parseReceipt } from './receipt'
export { parseVatTable, type TableParse } from './receipt/table'
export { trailingAmounts } from './receipt/adjustments'
export type { ParsedAdjustment, ParsedItem, ParsedReceipt } from './receipt/types'
