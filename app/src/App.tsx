import { useEffect, useState } from 'react'
import { Banknote, UserRound } from 'lucide-react'
import IconButton from './components/ui/IconButton'
import MyProfileDialog from './components/profile/MyProfileDialog'
import { ensureDefaultData } from './db/seed'
import { exitSnapshot, mealPath, useHashRoute } from './hooks/useHashRoute'
import { useMembers } from './hooks/useMembers'
import MealsPage from './pages/MealsPage'
import MealWorkspacePage from './pages/MealWorkspacePage'
import SnapshotViewerPage from './pages/SnapshotViewerPage'

export default function App() {
  const [ready, setReady] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const { route, navigate } = useHashRoute()
  const members = useMembers()
  const me = members?.find((m) => m.isDefaultHost)
  const inSnapshot = route.name === 'snapshot'

  useEffect(() => {
    ensureDefaultData()
      .then(() => setReady(true))
      .catch((err) => {
        console.error('Seed failed', err)
        setSeedError('Không khởi tạo được dữ liệu. Hãy tải lại trang.')
      })
  }, [])

  return (
    <div className="min-h-dvh">
      <header className="bg-usd-green-900 text-usd-paper-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-1.5 sm:px-6">
          <a href="#/" className="flex min-h-10 items-center gap-2 rounded-lg">
            <Banknote className="h-5 w-5 text-usd-green-100" aria-hidden="true" />
            <h1 className="text-base font-bold tracking-tight">Chia tiền</h1>
          </a>
          {!inSnapshot && (
            <IconButton
              icon={UserRound}
              label="Hồ sơ của tôi"
              onClick={() => setProfileOpen(true)}
              disabled={!me}
              className="border border-usd-green-600 !text-usd-paper-50 hover:!bg-usd-green-800"
            />
          )}
        </div>
        <div className="h-0.5 bg-usd-gold-600" aria-hidden="true" />
      </header>

      <main className="mx-auto max-w-6xl px-3 py-2 sm:px-6 sm:py-5">
        {route.name === 'snapshot' ? (
          <SnapshotViewerPage key={route.encoded} encoded={route.encoded} onExit={exitSnapshot} />
        ) : seedError ? (
          <p role="alert" className="text-usd-red-600">
            {seedError}
          </p>
        ) : !ready ? (
          <p className="text-usd-green-700">Đang tải…</p>
        ) : route.name === 'meal' ? (
          <MealWorkspacePage key={route.id} mealId={route.id} onBack={() => navigate('/')} />
        ) : (
          <MealsPage onOpenMeal={(id) => navigate(mealPath(id))} />
        )}
      </main>

      {profileOpen && me && !inSnapshot && <MyProfileDialog profile={me} onClose={() => setProfileOpen(false)} />}
    </div>
  )
}
