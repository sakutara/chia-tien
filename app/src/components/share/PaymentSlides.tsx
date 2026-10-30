import { ArrowRight, Check, ChevronLeft, ChevronRight, Copy, Landmark, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { PaymentSlide } from '../../domain/paymentSlides'
import { buildBankDeepLink } from '../../domain/banks'
import { formatMoney } from '../../lib/money'
import { copyTextToClipboard, shareTransferToBankApp } from '../../services/snapshotService'
import IconButton from '../ui/IconButton'
import QrCode from '../ui/QrCode'
import { t } from '../../i18n'

interface Props {
  slides: ReadonlyArray<PaymentSlide>
}

/** Một dòng thông tin kèm nút sao chép (số tài khoản, nội dung). */
function CopyRow({ label, value, copyValue }: { label: string; value: string; copyValue: string }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(() => setDone(false), 1500)
    return () => window.clearTimeout(timer)
  }, [done])
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="shrink-0 text-xs text-usd-green-700">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1">
        <span className="money min-w-0 break-words text-xs font-semibold">{value}</span>
        <IconButton
          icon={done ? Check : Copy}
          label={t('Sao chép {v}', { v: label.toLowerCase() })}
          className="!h-7 !w-7 shrink-0"
          onClick={() => void copyTextToClipboard(copyValue).then(() => setDone(true), () => undefined)}
        />
      </dd>
    </div>
  )
}

/** Nút sao chép số tiền, đặt cạnh số tiền lớn. */
function AmountCopy({ amount }: { amount: number }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(() => setDone(false), 1500)
    return () => window.clearTimeout(timer)
  }, [done])
  return (
    <IconButton
      icon={done ? Check : Copy}
      label={t('Sao chép số tiền')}
      className="!h-7 !w-7"
      onClick={() => void copyTextToClipboard(String(amount)).then(() => setDone(true), () => undefined)}
    />
  )
}

/** Nút mở menu chia sẻ của thiết bị để gửi thông tin chuyển tiền sang app ngân hàng đã cài. */
function BankPayButton({ slide }: { slide: PaymentSlide }) {
  const [error, setError] = useState('')
  const deepLink = slide.bank ? buildBankDeepLink(slide.bank, slide.amount, slide.content) : undefined
  return (
    <div className="space-y-1">
      {deepLink && (
        <a href={deepLink} className="icon-btn icon-btn-solid flex w-full items-center justify-center gap-2 no-underline">
          <Landmark className="h-4 w-4" aria-hidden="true" />
          {t('Mở app {bank}', { bank: slide.bank?.bankName ?? '' })}
        </a>
      )}
      <IconButton
        icon={Send}
        label={t('Thanh toán bằng ngân hàng')}
        tone={deepLink ? 'outline' : 'primary'}
        className="w-full"
        onClick={() => {
          setError('')
          shareTransferToBankApp(slide).catch((err: unknown) => setError(err instanceof Error ? err.message : ''))
        }}
      />
      {error && <p role="alert" className="text-center text-xs text-usd-red-600">{error}</p>}
    </div>
  )
}

/**
 * Các khoản chuyển tiền dạng slide vuốt ngang: mỗi slide chỉ gồm mã QR chuyển tiền và thông tin chuyển tiền.
 * Người nhận chưa có tài khoản thì slide vẫn hiện số tiền và nội dung kèm lời nhắc.
 */
export default function PaymentSlides({ slides }: Props) {
  // Cha đặt `key` theo bộ lọc nên đổi bộ lọc sẽ dựng lại và quay về slide đầu.
  const track = useRef<HTMLUListElement>(null)
  const [index, setIndex] = useState(0)

  function go(to: number) {
    const el = track.current
    if (!el) return
    const next = Math.max(0, Math.min(slides.length - 1, to))
    if (typeof el.scrollTo === 'function') el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    else el.scrollLeft = next * el.clientWidth
    setIndex(next)
  }

  if (slides.length === 0) return <p className="text-sm text-usd-green-700">{t('Không có khoản chuyển tiền nào.')}</p>

  return (
    <div className="space-y-1">
      <ul
        ref={track}
        aria-label={t('Các khoản chuyển tiền')}
        tabIndex={0}
        onScroll={(e) => {
          const el = e.currentTarget
          if (el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth))
        }}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s) => (
          <li
            key={s.key}
            aria-label={t('Thanh toán {fromName} cho {toName}', { fromName: s.fromName, toName: s.toName })}
            className="w-full shrink-0 snap-center px-1"
          >
            <div className="space-y-1.5 rounded-xl border border-usd-paper-200 bg-white/70 p-2 text-sm">
              <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-center text-xs">
                <strong className="break-words">{s.fromName}</strong>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-usd-green-700" aria-label={t('chuyển cho')} />
                <strong className="break-words">{s.toName}</strong>
              </p>
              <div className="flex items-center justify-center gap-1">
                <p className="money text-xl font-bold text-usd-green-900">{formatMoney(s.amount)}</p>
                <AmountCopy amount={s.amount} />
              </div>

              {s.qrPayload && s.bank ? (
                <QrCode value={s.qrPayload} label={t('Mã QR chuyển {v} tới {accountName}', { v: formatMoney(s.amount), accountName: s.bank.accountName })} className="mx-auto w-[min(52vw,27dvh)]" />
              ) : (
                <p role="note" className="flex items-start gap-2 rounded-lg border border-amber-600 bg-amber-50 p-2 text-xs text-amber-900">
                  <Landmark className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {t('{name} chưa có thông tin ngân hàng nên chưa tạo được mã QR.', { name: s.toName })}
                </p>
              )}

              <dl className="space-y-0.5">
                {s.bank && (
                  <>
                    <p className="truncate text-center text-xs text-usd-green-700">
                      <span>{s.bank.bankName}</span> · <span className="font-semibold text-usd-green-950">{s.bank.accountName}</span>
                    </p>
                    <CopyRow label={t('Số tài khoản')} value={s.bank.accountNumber} copyValue={s.bank.accountNumber} />
                  </>
                )}
                <CopyRow label={t('Nội dung')} value={s.content} copyValue={s.content} />
              </dl>

              {s.bank && <BankPayButton slide={s} />}
            </div>
          </li>
        ))}
      </ul>

      {slides.length > 1 && (
        <div className="flex items-center justify-between">
          <IconButton icon={ChevronLeft} label={t('Khoản trước')} tone="outline" disabled={index === 0} onClick={() => go(index - 1)} />
          <span role="status" className="text-xs text-usd-green-700">
            {index + 1}/{slides.length}
          </span>
          <IconButton icon={ChevronRight} label={t('Khoản sau')} tone="outline" disabled={index >= slides.length - 1} onClick={() => go(index + 1)} />
        </div>
      )}
    </div>
  )
}
