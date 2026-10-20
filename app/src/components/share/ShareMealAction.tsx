import { Share2 } from 'lucide-react'
import { useState } from 'react'
import IconButton from '../ui/IconButton'
import ShareMealDialog from './ShareMealDialog'
import { t } from '../../i18n'

interface Props {
  mealId: string
}

/** Nút icon "Chia sẻ thông báo thanh toán" ở bước quyết toán (BR-8.6). Dùng được cả khi bữa đã lưu trữ. */
export default function ShareMealAction({ mealId }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton icon={Share2} label={t('Chia sẻ thông báo thanh toán')} tone="outline" onClick={() => setOpen(true)} />
      {open && <ShareMealDialog mealId={mealId} onClose={() => setOpen(false)} />}
    </>
  )
}
