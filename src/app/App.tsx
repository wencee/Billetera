import { MotionConfig } from 'motion/react'
import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ensureDefaults } from '@/db'
import { requestPersistentStorage } from '@/lib/storage'
import { CardsScreen } from '@/features/cards/CardsScreen'
import { GoalsScreen } from '@/features/goals/GoalsScreen'
import { HomeScreen } from '@/features/home/HomeScreen'
import { MovementsScreen } from '@/features/movements/MovementsScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { StatsScreen } from '@/features/stats/StatsScreen'
import { AppShell } from './AppShell'
import { InstallGate } from './InstallGate'
import { UpdatePrompt } from './UpdatePrompt'

export function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await ensureDefaults()
      void requestPersistentStorage()
      if (!cancelled) setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) return null

  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <InstallGate>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomeScreen />} />
              <Route path="tarjetas" element={<CardsScreen />} />
              <Route path="movimientos" element={<MovementsScreen />} />
              <Route path="metas" element={<GoalsScreen />} />
              <Route path="estadisticas" element={<StatsScreen />} />
              <Route path="ajustes" element={<SettingsScreen />} />
            </Route>
          </Routes>
        </InstallGate>
        <UpdatePrompt />
      </BrowserRouter>
    </MotionConfig>
  )
}
