import { Home } from 'lucide-react'
import IconButton from '../ui/IconButton'

interface Props {
  /** Tên bữa được chia sẻ; thay cho dòng "snapshot chỉ đọc". */
  title: string
  onExit: () => void
}

/** Thanh đầu trang xem Snapshot (BR-8.3): tên bữa và icon về trang chủ. Không có ô nhập nào trong chế độ này. */
export default function SnapshotBanner({ title, onExit }: Props) {
  return (
    <div role="status" aria-label="Chế độ xem Snapshot" className="flex items-center justify-between gap-2 rounded-lg border border-usd-gold-600 bg-usd-paper-100 py-0 pl-3 pr-0.5">
      <h2 className="min-w-0 flex-1 truncate text-sm font-bold" title={title}>{title}</h2>
      <IconButton icon={Home} label="Về trang chủ ứng dụng của tôi" tone="outline" onClick={onExit} />
    </div>
  )
}
