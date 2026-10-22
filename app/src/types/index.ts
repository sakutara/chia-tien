// ============================================================
// 3.1. Cấu hình Hệ thống & Danh bạ Thành viên (`members`)
// ============================================================

export interface AppSettings {
  id: 'default';
  defaultHostMemberId: string; // ID của hồ sơ "Tôi" mặc định
  currencySymbol: string;      // Mặc định: '₫' hoặc 'VNĐ'
  language?: 'vi' | 'en';      // Ngôn ngữ giao diện đã chọn (Epic 9); vắng → theo trình duyệt
  createdAt: string;
}

/** Tài khoản ngân hàng để nhận tiền (dùng dựng QR VietQR trong Snapshot). */
export interface BankAccount {
  bankBin: string;             // Mã BIN NAPAS 6 số (VD: '970436')
  bankName: string;            // Tên hiển thị ngắn (VD: 'Vietcombank')
  accountName: string;         // Tên chủ tài khoản
  accountNumber: string;       // Số tài khoản (chỉ gồm chữ số/chữ cái, không khoảng trắng)
}

export interface Member {
  id: string;                  // UUID
  name: string;                // Tên hiển thị (VD: "An Nguyễn", "Bình Trần")
  normalizedName: string;      // Chuỗi bỏ dấu viết thường dùng cho Quick Filter & Sort A-Z
  isDefaultHost?: boolean;     // Đánh dấu đây là hồ sơ "Tôi"
  avatarColor: string;         // Mã màu badge đại diện (trong dải màu USD/Emerald)
  bank?: BankAccount;          // Tài khoản ngân hàng nhận tiền (tuỳ chọn)
  groupMemberIds?: string[];   // Có mặt → đây là nhóm lưu trong danh bạ; giá trị là các thành viên của nhóm
  createdAt: string;           // ISO Date
  lastUsedAt: string;          // ISO Date (phục vụ thống kê/gợi ý)
}

// ============================================================
// 3.2. Tầng 1: Bữa (`meals`)
// ============================================================

export type MealStatus = 'ACTIVE' | 'ARCHIVED';

export type SettlementMode = 'SELF_SETTLEMENT' | 'HOST_MEDIATED';

export interface PaymentGroup {
  id: string;                  // UUID
  mealId: string;              // Thuộc bữa nào
  name: string;                // Tên nhóm (VD: "Gia đình An - Bình", "Cặp đôi C - D")
  memberIds: string[];         // Danh sách memberId gộp chung (tối thiểu 2 người trong bữa)
  representativeId?: string;   // Người đại diện đứng tên thanh toán của nhóm
  contactId?: string;          // Nhóm này được lưu trong danh bạ dưới hồ sơ nào (Member.groupMemberIds)
}

export interface Meal {
  id: string;                  // UUID
  title: string;               // Tên bữa (VD: "Đi ăn cuối tuần Đà Lạt", "Tất niên nhóm ĐH")
  date: string;                // Ngày của bữa (Định dạng YYYY-MM-DD để filter theo Lịch)
  note?: string;               // Ghi chú thêm
  status: MealStatus;          // 'ACTIVE' (Còn hoạt động) | 'ARCHIVED' (Đã lưu trữ)

  // Thành viên & Chủ trì trong bữa
  participantIds: string[];    // Danh sách memberId tham gia bữa này
  hostMemberId: string;        // Người chủ trì bữa này (mặc định lấy defaultHostMemberId)

  // Cấu hình thanh toán của bữa
  settlementMode: SettlementMode; // 'SELF_SETTLEMENT' (Tự thanh toán) | 'HOST_MEDIATED' (Nhờ người chủ trì)
  paymentGroups: PaymentGroup[];  // Các nhóm gom thanh toán (cặp đôi/gia đình) trong bữa

  // Trạng thái tick chọn đã thanh toán
  // Trạng thái tick từng khoản chuyển tiền. Key là `<fromEntityId>-><toEntityId>` (xem transferKey).
  // `amount` là số tiền lúc tick: nếu khoản chuyển đổi số tiền sau đó thì tick cũ không còn hiệu lực.
  settlementStatuses: Record<string, {
    isPaid: boolean;
    paidAt?: string;
    amount?: number;
  }>;

  // Dữ liệu tổng hợp giữ lại sau khi Lưu trữ (Archive Snapshot)
  archivedSummary?: ArchivedMealSummary;

  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

// ============================================================
// 3.3. Tầng 2: Kèo (`sessions`) & Hoá đơn (`invoices`)
// ============================================================

export interface SessionKeo {
  id: string;                  // UUID
  mealId: string;              // Khóa ngoại trỏ tới Meal
  name: string;                // Tên kèo / Địa điểm (VD: "Kèo 1 - Lẩu Bò Gỗ", "Kèo 2 - Karaoke Nice")
  orderIndex: number;          // Thứ tự kèo trong bữa

  // Người tham gia kèo: tập con của Meal.participantIds. Mọi phép chia tiền của kèo chỉ tính trên những người này.
  // Kèo mới mặc định gồm toàn bộ người đang có trong bữa.
  participantIds: string[];

  // Khi bữa chuyển sang ARCHIVED, toàn bộ invoices và items bị xoá,
  // chỉ giữ lại tổng chi phí của kèo tại trường này:
  archivedTotalAmount?: number;
  archivedPayerSummary?: Array<{
    memberId: string;
    paidAmount: number;
  }>;

  createdAt: string;
}

export type InvoiceInputMode = 'ITEMIZED' | 'TOTAL_ONLY';
export type InvoiceSplitType = 'BY_ITEM' | 'EQUAL_TOTAL';
/** Cách tính một khoản điều chỉnh của hoá đơn: giảm giá, phí phục vụ hoặc VAT (BR-4.9, BR-4.15). */
export type AdjustmentMode = 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT';
export type VatMode = AdjustmentMode;

export interface Invoice {
  id: string;                  // UUID
  mealId: string;              // Khóa ngoại trỏ tới Meal (để truy vấn/xoá nhanh khi Archive)
  sessionId: string;           // Khóa ngoại trỏ tới SessionKeo

  vendorName?: string;         // Tên quán nhận diện từ OCR hoặc tự nhập
  invoiceDate?: string;        // Ngày in trên hoá đơn (OCR nhận diện hoặc tự nhập)

  // Người ứng tiền thanh toán hoá đơn này
  payerMemberId: string;       // ID thành viên đã trả tiền cho hoá đơn này

  // Chế độ nhập & Chia tiền của hoá đơn
  inputMode: InvoiceInputMode; // 'ITEMIZED' (Có danh sách món) | 'TOTAL_ONLY' (Chỉ nhập tổng tiền)
  splitType: InvoiceSplitType; // 'BY_ITEM' (Chia từng món) | 'EQUAL_TOTAL' (Chia đều theo tổng)
  // Ràng buộc: Nếu inputMode === 'TOTAL_ONLY' => splitType BẮT BUỘC là 'EQUAL_TOTAL'

  // Danh sách người tham gia chia đều (nếu splitType === 'EQUAL_TOTAL')
  // Mặc định là toàn bộ người trong Bữa, có thể tick bớt nếu có người không đi kèo này
  equalSplitParticipantIds: string[];

  // Giá trị tiền: tiền hàng → giảm giá → phí phục vụ → VAT (BR-4.15, R-8)
  subtotalAmount: number;      // Tiền hàng trước mọi điều chỉnh (tổng các món hoặc số nhập ở tab chỉ tổng)
  discountMode: AdjustmentMode;  // Giảm giá cả bill
  discountValue: number;         // % (VD: 10) hoặc số tiền (VD: 50000)
  discountAmount: number;        // Số tiền giảm thực tế, luôn ≥ 0 (là số trừ đi)
  serviceMode: AdjustmentMode;   // Phí phục vụ cả bill
  serviceValue: number;
  serviceAmount: number;         // Số tiền phí phục vụ thực tế, ≥ 0
  vatMode: VatMode;            // Không VAT / Theo % (VD: 8%, 10%) / Số tiền VAT cố định
  vatValue: number;            // Giá trị % (VD: 8) hoặc số tiền tuyệt đối (VD: 45000)
  vatAmount: number;           // Số tiền VAT quy đổi thực tế
  totalAmount: number;         // Tổng thanh toán = subtotalAmount − discountAmount + serviceAmount + vatAmount

  // Liên kết tới các File ảnh hoá đơn đã lưu
  fileIds: string[];           // Danh sách ID file hoá đơn trong File Storage

  createdAt: string;
}

// ============================================================
// 3.4. Tầng 3: Món (`items`)
// ============================================================

export interface ItemShare {
  memberId: string;            // Người sử dụng món này
  shares: number;              // Số phần/hệ số chia (Mặc định = 1 cho chia đều; có thể chỉnh thành 2, 3...)
}

export interface InvoiceItem {
  id: string;                  // UUID
  mealId: string;              // Khóa ngoại trỏ tới Meal (để xoá hàng loạt khi Archive bữa)
  sessionId: string;           // Khóa ngoại trỏ tới SessionKeo
  invoiceId: string;           // Khóa ngoại trỏ tới Invoice

  name: string;                // Tên món (VD: "Bò mỹ nhúng lẩu", "Bia Tiger x10")
  quantity: number;            // Số lượng hiển thị trên bill (VD: 2)
  unitPrice: number;           // Đơn giá (VD: 150000)
  rawAmount: number;           // Thành tiền chưa VAT (quantity * unitPrice hoặc nhập trực tiếp)

  allocatedDiscountAmount: number; // Phần giảm giá của hoá đơn phân bổ vào món (số trừ đi, ≥ 0)
  allocatedServiceAmount: number;  // Phần phí phục vụ phân bổ vào món
  allocatedVatAmount: number;  // Tiền VAT được tự động phân bổ vào món này (nếu hoá đơn có VAT)
  finalAmount: number;         // Thành tiền của món = rawAmount − allocatedDiscountAmount + allocatedServiceAmount + allocatedVatAmount
  orderIndex?: number;         // Thứ tự dòng món trong hoá đơn (để hiển thị đúng thứ tự bill)

  // Danh sách người ăn món này và tỷ lệ phần
  consumers: ItemShare[];
}

// ============================================================
// Kiểu hiển thị cho Quản lý Bữa (Epic 3) — không lưu vào DB
// ============================================================

export type MealViewMode = 'CALENDAR' | 'LIST' | 'STATUS';

export interface MealSummary {
  meal: Meal;
  sessionCount: number;
  participantCount: number;
  totalAmount: number;         // 0 khi chưa có chi phí
  hasCost: boolean;            // false → hiển thị "Chưa có chi phí"
  paidCount: number;           // số khoản chuyển tiền đã xong
  entityCount: number;         // số khoản chuyển tiền
}

// ============================================================
// 3.5. Lưu trữ File Hoá đơn (`invoice_files` & OPFS)
// ============================================================

/** Mức nén ảnh hoá đơn trước khi lưu (BR-4.16). */
export type CompressionPreset = 'ORIGINAL' | 'BALANCED' | 'SAVER';

export interface InvoiceFileRecord {
  id: string;                  // UUID
  mealId: string;              // Thuộc bữa nào
  sessionId: string;           // Thuộc kèo nào
  invoiceId: string;           // Thuộc hoá đơn nào
  fileName: string;            // Tên file chuẩn hoá (VD: "bill_keo1_20261019_01.jpg")
  mimeType: string;            // image/jpeg, image/png, image/webp
  sizeBytes: number;           // Dung lượng file đã lưu (sau nén)
  originalSizeBytes?: number;  // Dung lượng ảnh gốc trước khi nén (để hiện "trước → sau")
  compression?: CompressionPreset; // Mức nén đã dùng khi lưu
  opfsPath?: string;           // Đường dẫn file trong Origin Private File System (/invoices/<mealId>/<fileName>)
  blobData?: Blob;             // Lưu trực tiếp File/Blob trong IndexedDB (đảm bảo tương thích 100% trình duyệt)
  ocrRawText?: string;         // Văn bản thô OCR quét được từ ảnh này
  createdAt: string;
}

// ============================================================
// 3.6. Snapshot Dữ liệu khi Bữa đã Lưu trữ (`ArchivedMealSummary`)
// ============================================================

export interface ArchivedMealSummary {
  totalMealAmount: number;
  sessionsSummary: Array<{
    sessionId: string;
    sessionName: string;
    totalAmount: number;
    invoiceCount: number; // Số lượng hoá đơn từng có trước khi xoá
  }>;
  entitiesSummary: Array<{
    entityId: string;     // memberId hoặc paymentGroupId
    entityName: string;
    isGroup: boolean;
    memberNames: string[];
    totalPaid: number;    // Tổng tiền đã ứng
    totalOwed: number;    // Tổng tiền phải chi
    netBalance: number;   // Chênh lệch (+ được nhận lại, - phải trả thêm)
    isPaid: boolean;
  }>;
  transfers: Array<{
    fromEntityName: string;
    toEntityName: string;
    amount: number;
  }>;
}

// ============================================================
// 3.7. Cấu trúc Dữ liệu Snapshot Custom URL (`MealSnapshotPayload`)
// ============================================================

export interface MealSnapshotPayload {
  v: 1;                        // Phiên bản schema snapshot
  exportedAt: string;          // Thời điểm tạo snapshot (ISO Date)
  meal: {
    title: string;
    date: string;
    note?: string;
    status: MealStatus;
    settlementMode: SettlementMode;
    hostMemberId: string;
  };
  members: Array<{
    id: string;
    name: string;
    avatarColor: string;
    bank?: BankAccount;
  }>;
  paymentGroups: Array<{
    id: string;
    name: string;
    memberIds: string[];
    representativeId?: string;
  }>;
  sessions: Array<{
    id: string;
    name: string;
    orderIndex: number;
    participantIds: string[];
    archivedTotalAmount?: number;
    archivedPayerSummary?: Array<{
      memberId: string;
      paidAmount: number;
    }>;
    invoices: Array<{
      id: string;
      vendorName?: string;
      invoiceDate?: string;
      payerMemberId: string;
      inputMode: InvoiceInputMode;
      splitType: InvoiceSplitType;
      equalSplitParticipantIds: string[];
      subtotalAmount: number;
      discountMode: AdjustmentMode;
      discountValue: number;
      discountAmount: number;
      serviceMode: AdjustmentMode;
      serviceValue: number;
      serviceAmount: number;
      vatMode: VatMode;
      vatValue: number;
      vatAmount: number;
      totalAmount: number;
      items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        rawAmount: number;
        allocatedDiscountAmount: number;
        allocatedServiceAmount: number;
        allocatedVatAmount: number;
        finalAmount: number;
        orderIndex?: number;
        consumers: ItemShare[];
      }>;
    }>;
  }>;
  settlementStatuses: Record<string, {
    isPaid: boolean;
    paidAt?: string;
    amount?: number;
  }>;
  archivedSummary?: ArchivedMealSummary;
  /**
   * Các khoản chuyển tiền đã dựng sẵn cho đúng những người được chọn gửi. Có trường này thì Snapshot chỉ hiện
   * các khoản này và không chứa dữ liệu quyết toán của người khác. Thiếu (link cũ) thì tính lại từ hoá đơn.
   */
  payments?: SnapshotPayment[];
  /**
   * Link gọn: các món của từng kèo mà người nhận link phải trả, kèm đúng số tiền phần của họ (không phải cả món).
   * `ownerId` trỏ tới `fromId` của khoản chuyển tiền.
   */
  itemShares?: SnapshotKeoShares[];
}

export interface SnapshotKeoShares {
  name: string;
  lines: Array<{ name: string; amount: number; ownerId: string }>;
}

/** Một khoản chuyển tiền trong Snapshot: đủ để hiển thị slide và dựng QR, không kèm số dư của ai khác. */
export interface SnapshotPayment {
  key: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  content: string;
  bank?: BankAccount;
}

// ============================================================
// Kết quả quyết toán (Epic 6) — chỉ dùng trong bộ nhớ, không lưu bảng mới
// ============================================================

export interface MemberChargeLine {
  sessionId: string;
  sessionName: string;
  invoiceId: string;
  vendorName?: string;
  kind: 'EQUAL_TOTAL' | 'BY_ITEM';
  itemName?: string;           // Có khi kind === 'BY_ITEM'
  shares?: number;             // Số phần của thành viên ở món này
  totalShares?: number;        // Tổng số phần của món hoặc số người chia đều hoá đơn
  sourceAmount: number;        // totalAmount của hoá đơn (EQUAL_TOTAL) hoặc finalAmount của món
  rawCost: number;             // Số thực trước làm tròn cuối bữa
}

export interface MemberBreakdown {
  memberId: string;
  memberName: string;
  paidInvoices: Array<{
    invoiceId: string;
    sessionId: string;
    sessionName: string;
    vendorName?: string;
    amount: number;
  }>;
  chargeLines: MemberChargeLine[];
  totalPaid: number;           // Số nguyên đồng
  rawOwed: number;             // Số thực cộng dồn trước làm tròn
  totalOwed: number;           // Số nguyên đồng sau làm tròn & bù ±1đ (R-3)
  netBalance: number;          // totalPaid - totalOwed
}

export interface PaymentEntitySettlement {
  entityId: string;            // memberId (cá nhân lẻ) hoặc paymentGroupId (nhóm)
  entityName: string;
  isGroup: boolean;
  memberIds: string[];
  memberNames: string[];
  representativeId?: string;
  totalPaid: number;           // Σ Paid(m)
  totalOwed: number;           // Σ Owed(m)
  netBalance: number;          // totalPaid - totalOwed (+ nhận lại, - trả thêm, 0 cân bằng)
  isPaid: boolean;             // true nếu mọi khoản chuyển liên quan tới thực thể này đã xong (hoặc không có khoản nào)
  paidAt?: string;
}

export interface SettlementTransfer {
  fromEntityId: string;
  fromEntityName: string;
  toEntityId: string;
  toEntityName: string;
  amount: number;              // Số nguyên đồng > 0
  key: string;                 // `<fromEntityId>-><toEntityId>`, khoá lưu trạng thái tick
  isPaid: boolean;             // Khoản này đã được tick "Đã chuyển"
}

export interface MealSettlementResult {
  mealId: string;
  status: MealStatus;
  settlementMode: SettlementMode;
  hostMemberId: string;
  hostEntityId: string;        // Thực thể chứa hostMemberId
  totalMealAmount: number;     // Tổng mọi hoá đơn trong bữa
  assignedAmount: number;      // Tổng tiền đã có người nhận chia
  unassignedAmount: number;    // Tổng tiền của các món BY_ITEM chưa có người ăn (R-2)
  unassignedItemCount: number; // Số món BY_ITEM chưa có người ăn
  memberBreakdowns: MemberBreakdown[];
  entities: PaymentEntitySettlement[];
  transfers: SettlementTransfer[];
  transferCount: number;       // Số khoản chuyển tiền
  paidTransferCount: number;   // Số khoản chuyển tiền đã được tick xong
  isAllSettled: boolean;       // Điều kiện mở khoá Lưu trữ bữa cho Epic 7 (R-7)
}
