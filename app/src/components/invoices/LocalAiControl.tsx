import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatBytes } from '../../lib/bytes'
import { t } from '../../i18n'
import type { LocalAiStatus } from '../../services/aiContracts'
import { clearLocalAiCache, getLocalAiStatus, setLocalAiEnabled } from '../../services/localAiService'
import ConfirmDialog from '../ui/ConfirmDialog'
import IconButton from '../ui/IconButton'
import Switch from '../ui/Switch'

const EMPTY: LocalAiStatus = { cached: false, cachedBytes: 0, enabled: false }

/**
 * Công tắc "Xử lý nâng cao bằng AI trên máy" dưới khung ảnh hoá đơn, kèm nhãn trạng thái mô hình.
 * Khi mô hình đã tải, có nút xoá để lấy lại ~320 MB bộ nhớ (công tắc trở về TẮT).
 */
export default function LocalAiControl() {
  const [status, setStatus] = useState<LocalAiStatus>(EMPTY)
  const [confirmClear, setConfirmClear] = useState(false)

  const refresh = () => {
    getLocalAiStatus().then(setStatus, () => setStatus(EMPTY))
  }

  useEffect(() => {
    refresh()
  }, [])

  const toggle = (on: boolean) => {
    setLocalAiEnabled(on)
    refresh()
  }

  const clear = async () => {
    await clearLocalAiCache()
    setConfirmClear(false)
    refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <Switch label={t('Xử lý nâng cao bằng AI trên máy')} checked={status.enabled} onChange={toggle} />
      {status.cached ? (
        <>
          <span className="text-xs font-medium text-usd-green-700">
            {t('Đã tải sẵn (Offline)')}
            {status.cachedBytes > 0 && ` · ${formatBytes(status.cachedBytes)}`}
          </span>
          <IconButton icon={Trash2} label={t('Xoá dữ liệu AI đã tải')} tone="danger" onClick={() => setConfirmClear(true)} />
        </>
      ) : (
        <span className="text-xs text-usd-green-700">{t('Chưa tải (~320 MB lần đầu)')}</span>
      )}

      <ConfirmDialog
        open={confirmClear}
        title={t('Xoá dữ liệu AI đã tải?')}
        message={t('Sẽ xoá khoảng 320 MB bộ đọc AI khỏi máy và tắt công tắc. Lần sau bạn cần tải lại.')}
        confirmLabel={t('Xoá')}
        tone="danger"
        onConfirm={clear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
