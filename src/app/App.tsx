import { MotionConfig } from 'motion/react'
import { lazy, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ensureDefaults } from '@/db'
import { HomeScreen } from '@/features/home/HomeScreen'
import { MovementsScreen } from '@/features/movements/MovementsScreen'
import { requestPersistentStorage } from '@/lib/storage'
import { AppShell } from './AppShell'
import { ErrorBoundary } from './ErrorBoundary'
import { InstallGate } from './InstallGate'
import { UpdatePrompt } from './UpdatePrompt'

// Pantallas en chunks aparte; el service worker las precachea igual, así que funcionan offline.
const named = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })))

const CardsScreen = named(() => import('@/features/cards/CardsScreen'), 'CardsScreen')
const CardForm = named(() => import('@/features/cards/CardForm'), 'CardForm')
const PurchaseForm = named(() => import('@/features/cards/PurchaseForm'), 'PurchaseForm')
const PurchaseDetail = named(() => import('@/features/cards/PurchaseDetail'), 'PurchaseDetail')
const StatementDetail = named(() => import('@/features/cards/StatementDetail'), 'StatementDetail')
const StatementsList = named(() => import('@/features/cards/StatementsList'), 'StatementsList')
const ExpenseForm = named(() => import('@/features/movements/ExpenseForm'), 'ExpenseForm')
const IncomeForm = named(() => import('@/features/movements/IncomeForm'), 'IncomeForm')
const TransferForm = named(() => import('@/features/movements/TransferForm'), 'TransferForm')
const GoalsScreen = named(() => import('@/features/goals/GoalsScreen'), 'GoalsScreen')
const StatsScreen = named(() => import('@/features/stats/StatsScreen'), 'StatsScreen')
const SettingsScreen = named(() => import('@/features/settings/SettingsScreen'), 'SettingsScreen')
const AccountsScreen = named(() => import('@/features/accounts/AccountsScreen'), 'AccountsScreen')
const AccountForm = named(() => import('@/features/accounts/AccountForm'), 'AccountForm')
const CategoriesScreen = named(() => import('@/features/categories/CategoriesScreen'), 'CategoriesScreen')
const RecurringScreen = named(() => import('@/features/recurring/RecurringScreen'), 'RecurringScreen')
const RecurringForm = named(() => import('@/features/recurring/RecurringForm'), 'RecurringForm')
const BudgetsScreen = named(() => import('@/features/budgets/BudgetsScreen'), 'BudgetsScreen')

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
                <Route path="movimientos/gasto/nuevo" element={<ExpenseForm />} />
                <Route path="movimientos/gasto/:id" element={<ExpenseForm />} />
                <Route path="movimientos/ingreso/nuevo" element={<IncomeForm />} />
                <Route path="movimientos/ingreso/:id" element={<IncomeForm />} />
                <Route path="movimientos/transferencia/nueva" element={<TransferForm />} />
                <Route path="movimientos/transferencia/:id" element={<TransferForm />} />

                <Route path="metas" element={<GoalsScreen />} />
                <Route path="estadisticas" element={<StatsScreen />} />

                <Route path="ajustes" element={<SettingsScreen />} />
                <Route path="ajustes/cuentas" element={<AccountsScreen />} />
                <Route path="ajustes/cuentas/nueva" element={<AccountForm />} />
                <Route path="ajustes/cuentas/:id" element={<AccountForm />} />
                <Route path="ajustes/categorias" element={<CategoriesScreen />} />
                <Route path="ajustes/fijos" element={<RecurringScreen />} />
                <Route path="ajustes/fijos/nuevo" element={<RecurringForm />} />
                <Route path="ajustes/fijos/:id" element={<RecurringForm />} />
                <Route path="ajustes/presupuestos" element={<BudgetsScreen />} />
              </Route>
            </Routes>
          </InstallGate>
          <UpdatePrompt />
        </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  )
}
