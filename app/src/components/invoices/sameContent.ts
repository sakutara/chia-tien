const dropOrder = (key: string, value: unknown) => (key === 'orderIndex' ? undefined : value)

/**
 * So sánh theo nội dung: dữ liệu từ DB luôn là object mới dù không đổi. Bỏ qua `orderIndex` vì nó không hiển thị
 * (thứ tự thể hiện qua vị trí trong mảng), nên ghi lại thứ tự không bắt cả danh sách render lại.
 */
export const sameContent = (a: unknown, b: unknown) => JSON.stringify(a, dropOrder) === JSON.stringify(b, dropOrder)
