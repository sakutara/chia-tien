import { Lock } from 'lucide-react'
import { useId, useState } from 'react'
import { checkArchiveEligibility } from '../../domain/archiveRules'
import { useMealSettlement } from '../../hooks/useMealSettlement'
import IconButton from '../ui/IconButton'
import ArchiveMealDialog from './ArchiveMealDialog'

interface Props {
  mealId: string
  mealTitle: string
  /** Bữa đã lưu trữ hoặc chế độ chỉ xem: không hiện nút. */
  readOnly: boolean
}

/** Nút "Lưu trữ bữa" và lý do khoá khi chưa đủ điều kiện (BR-7.1, AC-1). */
export default function ArchiveMealAction({ mealId, mealTitle, readOnly }: Props) {
  const settlement = useMealSettlement(mealId)
  const [confirming, setConfirming] = useState(false)
  const reasonId = useId()

  if (readOnly || !settlement) return null
  const eligibility = checkArchiveEligibility(settlement)

  return (
    <>
      <IconButton
        icon={Lock}
        label="Lưu trữ bữa"
        tone="primary"
        disabled={!eligibility.canArchive}
        title={eligibility.canArchive ? 'Lưu trữ bữa' : `Chưa thể lưu trữ: ${eligibility.message}`}
        aria-describedby={eligibility.canArchive ? undefined : reasonId}
        onClick={() => setConfirming(true)}
      />
      {!eligibility.canArchive && (
        <p id={reasonId} className="sr-only">
          Chưa thể lưu trữ: {eligibility.message}
        </p>
      )}
      {confirming && (
        <ArchiveMealDialog
          mealId={mealId}
          mealTitle={mealTitle}
          onClose={() => setConfirming(false)}
          onArchived={() => setConfirming(false)}
        />
      )}
    </>
  )
}
