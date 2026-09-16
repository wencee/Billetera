import { MotionConfig } from 'motion/react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ensureDefaults } from '@/db'
import { requestPersistentStorage } from '@/lib/storage'
// Pantallas pesadas en chunks aparte; el service worker las precachea igual.
const CardsScreen = lazy(() => import('@/features/cards/CardsScreen').then((m) => ({ default: m.CardsScreen })))
const CardForm = lazy(() => import('@/features/cards/CardForm').then((m) => ({ default: m.CardForm })))
const PurchaseForm = lazy(() => import('@/features/cards/PurchaseForm').then((m) => ({ default: m.PurchaseForm })))
const PurchaseDetail = lazy(() => import('@/features/cards/PurchaseDetail').then((m) => ({ default: m.PurchaseDetail })))
const StatementDetail = lazy(() => import('@/features/cards/StatementDetail').then((m) => ({ default: m.StatementDetail })))
const StatementsList = lazy(() => import('@/features/cards/StatementsList').then((m) => ({ default: m.StatementsList })))
import { GoalsScreen } from '@/features/goals/GoalsScreen'
import { HomeScreen } from '@/features/home/HomeScreen'
import { MovementsScreen } from '@/features/movements/MovementsScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { StatsScreen } from '@/features/stats/StatsScreen'
import { AppShell } from './AppShell'
import { ErrorBoundary } from './ErrorBoundary'
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
    <ErrorBoundary>
    <MotionConfig reducedMotion="user">
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <InstallGate>
          <Suspense fallback={null}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomeScreen />} />
              <Route path="tarjetas" element={<CardsScreen />} />
              <Route path="tarjetas/nueva" element={<CardForm />} />
              <Route path="tarjetas/:id/editar" element={<CardForm />} />
              <Route path="tarjetas/:cardId/compras/nueva" element={<PurchaseForm />} />
              <Route path="tarjetas/:cardId/resumenes" element={<StatementsList />} />
              <Route path="tarjetas/:cardId/resumenes/:period" element={<StatementDetail />} />
              <Route path="compras/:id" element={<PurchaseDetail />} />
              <Route path="compras/:id/editar" element={<PurchaseForm />} />
              <Route path="movimientos" element={<MovementsScreen />} />
              <Route path="metas" element={<GoalsScreen />} />
              <Route path="estadisticas" element={<StatsScreen />} />
              <Route path="ajustes" element={<SettingsScreen />} />
            </Route>
          </Routes>
          </Suspense>
        </InstallGate>
        <UpdatePrompt />
      </BrowserRouter>
    </MotionConfig>
    </ErrorBoundary>
  )
}
