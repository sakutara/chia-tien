import QRCode from 'qrcode'
import { useMemo } from 'react'

interface Props {
  value: string
  /** Mô tả cho trình đọc màn hình. */
  label: string
  className?: string
}

/** Mã QR dạng SVG (dựng tại chỗ, không cần mạng). Nền trắng + viền yên tĩnh để máy quét đọc được cả khi giao diện tối. */
export default function QrCode({ value, label, className = '' }: Props) {
  const { size, path } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
    const n = qr.modules.size
    let d = ''
    for (let y = 0; y < n; y += 1) {
      for (let x = 0; x < n; x += 1) if (qr.modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`
    }
    return { size: n, path: d }
  }, [value])

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`-4 -4 ${size + 8} ${size + 8}`}
      shapeRendering="crispEdges"
      className={`aspect-square rounded-lg bg-white ${className}`}
    >
      <path d={path} fill="#000" />
    </svg>
  )
}
