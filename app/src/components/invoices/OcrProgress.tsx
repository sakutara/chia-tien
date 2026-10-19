import { X } from 'lucide-react'
import IconButton from '../ui/IconButton'

interface Props {
  percent: number
  stage: string
  onCancel: () => void
}

/** Tiến trình quét OCR, có nút huỷ (BR-4.7). */
export default function OcrProgress({ percent, stage, onCancel }: Props) {
  return (
    <div role="status" className="space-y-2 rounded-lg border border-usd-paper-200 bg-usd-paper-100 px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span>
          {stage} {percent}%
        </span>
        <IconButton icon={X} label="Huỷ quét" tone="outline" onClick={onCancel} />
      </div>
      <div
        role="progressbar"
        aria-label="Tiến trình quét hoá đơn"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 w-full overflow-hidden rounded-full bg-usd-paper-200"
      >
        <div className="h-full bg-usd-green-800 transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
