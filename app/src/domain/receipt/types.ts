// Kiểu dữ liệu của bộ phân tích hoá đơn.

export interface ParsedItem {
  name: string
  quantity: number
  unitPrice: number
  rawAmount: number
  /** Số lượng × đơn giá không khớp thành tiền trên bill: cần người dùng xem lại. */
  uncertain: boolean
}

export interface ParsedAdjustment {
  mode: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
}

export interface ParsedReceipt {
  invoiceDate?: string
  vendorName?: string
  items: ParsedItem[]
  discount?: ParsedAdjustment
  service?: ParsedAdjustment
  vat?: ParsedAdjustment
  /** Tổng thanh toán ghi trên bill, để đối chiếu với tổng các món (R-11). */
  billTotal?: number
  /** Dòng "Tổng tiền hàng" / "Tạm tính" ghi trên bill (trước giảm giá, phí, VAT), để đối chiếu tổng các món. */
  billSubtotal?: number
  /** Đơn giá / thành tiền từng dòng đã gồm VAT (hoá đơn GTGT ghi cột "Thành tiền" sau thuế): không cộng VAT lần nữa. */
  vatIncluded?: boolean
  /** Đếm số dòng của bảng hàng hoá để phát hiện thiếu món: `expected` dòng đánh số trên bill, `read` dòng đọc được. */
  tableRows?: { expected: number; read: number; unread: string[] }
  /** Bill có dòng tổng nhóm (Drink / Food): nhóm mà tổng các món đọc được khác số trên dòng nhóm (`group` bỏ trống: đối soát chung). */
  groupChecks?: Array<{ group?: 'drink' | 'food'; expected: number; read: number }>
}
