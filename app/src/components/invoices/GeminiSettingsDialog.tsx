import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { DEFAULT_GEMINI_MODEL, getGeminiKey, getGeminiModel, saveGeminiKey, saveGeminiModel } from '../../services/geminiService'
import DialogActions from '../ui/DialogActions'
import IconButton from '../ui/IconButton'
import Modal from '../ui/Modal'
import { t } from '../../i18n'

interface Props {
  onClose: () => void
  /** Gọi sau khi lưu với khoá còn hiệu lực (rỗng nếu người dùng xoá khoá). */
  onSaved: (hasKey: boolean) => void
}

const INPUT = 'field min-h-10'

/** Cài đặt đọc hoá đơn bằng AI: khoá Gemini API (chỉ lưu trên trình duyệt này) và tên mô hình. */
export default function GeminiSettingsDialog({ onClose, onSaved }: Props) {
  const [key, setKey] = useState(getGeminiKey)
  const [model, setModel] = useState(getGeminiModel)

  function submit(e: FormEvent) {
    e.preventDefault()
    saveGeminiKey(key)
    saveGeminiModel(model)
    onSaved(key.trim() !== '')
  }

  return (
    <Modal open title={t('Đọc hoá đơn bằng AI (Gemini)')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <p className="text-sm text-usd-green-700">
          {t('Khi OCR đọc chưa chuẩn, app có thể gửi ảnh hoá đơn kèm gợi ý OCR tới Google Gemini để đọc lại và tự đối chiếu tổng tiền.')}
        </p>
        <div>
          <label htmlFor="gemini-key" className="mb-0.5 block text-xs font-medium text-usd-green-700">{t('Khoá Gemini API')}</label>
          <input
            id="gemini-key"
            data-autofocus
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className={INPUT}
          />
          <p className="mt-1 text-xs text-usd-green-700">
            {t('Lấy khoá miễn phí tại')}{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer noopener" className="underline">
              aistudio.google.com/apikey
            </a>
            . {t('Khoá chỉ lưu trên trình duyệt này và chỉ được gửi tới Google.')}
          </p>
        </div>
        <div>
          <label htmlFor="gemini-model" className="mb-0.5 block text-xs font-medium text-usd-green-700">{t('Mô hình')}</label>
          <input id="gemini-model" value={model} spellCheck={false} onChange={(e) => setModel(e.target.value)} className={INPUT} placeholder={DEFAULT_GEMINI_MODEL} />
        </div>
        <p className="text-xs text-amber-900">{t('Ảnh hoá đơn gửi cho AI có thể chứa thông tin cá nhân. Chỉ dùng khi bạn đồng ý gửi tới Google.')}</p>
        <div className="flex items-center justify-between gap-2">
          <IconButton icon={Trash2} label={t('Xoá khoá')} tone="danger" disabled={key.trim() === ''} onClick={() => setKey('')} />
          <DialogActions onCancel={onClose} saveLabel={t('Lưu cài đặt AI')} />
        </div>
      </form>
    </Modal>
  )
}
