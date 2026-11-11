import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadStoredLang } from './db/languageStore'
import { initLanguage } from './i18n'
import { installMemoryLifecycleHooks } from './services/memoryLifecycle'
import { cleanUpLegacyLocalAi } from './services/legacyAiCleanup'

// Trả RAM của worker OCR về hệ điều hành khi app ẩn hoặc đóng tab (memoryLifecycle).
installMemoryLifecycleHooks()

// Xoá một lần mô hình AI trên máy và khoá cũ của tính năng đã gỡ (~480–790 MB); lỗi không chặn khởi động.
void cleanUpLegacyLocalAi()

// iOS Safari bỏ qua `user-scalable=no`, nên chặn thêm cử chỉ chụm (gesture*) và chạm đúp để không zoom được.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (e) => e.preventDefault())
}
let lastTouchEnd = 0
document.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) e.preventDefault()
    lastTouchEnd = now
  },
  { passive: false },
)
// Ctrl/Cmd + lăn chuột (và chụm trên touchpad) trên máy tính cũng không phóng to trang.
document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault() }, { passive: false })

// Ngôn ngữ ban đầu: lựa chọn đã lưu trong IndexedDB > tham số `l` của link Snapshot > ngôn ngữ trình duyệt (BR-9.4, BR-9.8).
loadStoredLang().then((stored) => {
  initLanguage({ stored, urlLang: new URLSearchParams(window.location.search).get('l') })
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
