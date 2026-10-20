import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initLanguage } from './i18n'

// Ngôn ngữ ban đầu: lựa chọn đã lưu > tham số `l` của link Snapshot > ngôn ngữ trình duyệt (BR-9.4, BR-9.8).
initLanguage(new URLSearchParams(window.location.search).get('l'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
