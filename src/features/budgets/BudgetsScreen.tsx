import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AmountInput } from '@/components/form/AmountInput'
import { ListGroup } from '@/components/List'
import { ProgressBar } from '@/components/ProgressBar'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { Sheet } from '@/components/Sheet'
import { budgetLevel, budgetRows, spendingForMonth, type BudgetLevel } from '@/core/budgets'
import { addPeriods, periodOf, todayISO } from '@/core/dates'
import { formatMoney, formatPeriodLong } from '@/core/format'
import type { Category } from '@/core/types'
import { setBudget } from '@/db'
import { useBudgets, useCategories, useSettings, useSpendingItems } from '@/db/hooks'

const TONE: Record<BudgetLevel, 'tint' | 'orange' | 'red'> = { ok: 'tint', warning: 'orange', over: 'red' }

export function BudgetsScreen() {
  const categories = useCategories('expense')
  const budgets = useBudgets()
  const items = useSpendingItems()
  const settings = useSettings()
  const privateMode = settings?.privateMode ?? false
  const [month, setMonth] = useState(periodOf(todayISO()))
  const [editing, setEditing] = useState<Category | null>(null)

  const spending = useMemo(() => (items ? spendingForMonth(items, month, settings?.usdRate ?? 0) : null), [items, month, settings?.usdRate])
  const rows = useMemo(() => (budgets && spending ? budgetRows(budgets, spending) : []), [budgets, spending])
  const byCategory = new Map(rows.map((r) => [r.categoryId, r]))
  const withBudget = (categories ?? []).filter((c) => byCategory.has(c.id))
  const withoutBudget = (categories ?? []).filter((c) => !byCategory.has(c.id))
  const totalLimit = rows.reduce((s, r) => s + r.limit, 0)
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)

  const money = (c: number) => formatMoney(c, 'ARS', { hide: privateMode, fractionDigits: 0 })

  return (
    <Screen title="Presupuestos" back="Ajustes" backTo="/ajustes">
      <div className="flex items-center justify-between px-2">
        <Pressable pressScale={0.9} aria-label="Mes anterior" onClick={() => setMonth(addPeriods(month, -1))} className="flex items-center justify-center text-tint">
          <ChevronLeft size={24} />
        </Pressable>
        <span className="text-headline">{formatPeriodLong(month)}</span>
        <Pressable pressScale={0.9} aria-label="Mes siguiente" onClick={() => setMonth(addPeriods(month, 1))} className="flex items-center justify-center text-tint">
          <ChevronRight size={24} />
        </Pressable>
      </div>

      {rows.length > 0 && (
        <div className="card mx-4 mt-2 p-4">
          <p className="text-footnote uppercase text-label-2">Gastado en categorías con presupuesto</p>
          <p className="tabular mt-1 text-title2">
            {money(totalSpent)} <span className="text-subhead text-label-2">de {money(totalLimit)}</span>
          </p>
          <ProgressBar value={totalLimit ? totalSpent / totalLimit : 0} tone={TONE[budgetLevel(totalSpent, totalLimit)]} className="mt-2" />
          {spending && spending.unconvertedUSD > 0 && <p className="mt-2 text-footnote text-orange">Hay gastos en dólares sin contar: cargá la cotización en Ajustes.</p>}
        </div>
      )}

      {withBudget.length > 0 && (
        <ListGroup title="Con presupuesto" footer="Las compras en cuotas cuentan de a una cuota por mes, desde el mes de la compra. Aviso naranja al 80 %, rojo al pasarte.">
          {withBudget.map((c, i) => {
            const r = byCategory.get(c.id)!
            return (
              <button key={c.id} type="button" onClick={() => setEditing(c)} className={`flex w-full flex-col gap-2 px-4 py-3 text-left active:bg-fill-2 ${i === withBudget.length - 1 ? '' : 'border-b border-separator/60'}`}>
                <div className="flex w-full items-center gap-3">
                  <span className="text-xl" aria-hidden>{c.icon}</span>
                  <span className="flex-1 text-body">{c.name}</span>
                  <span className={`tabular text-subhead ${r.level === 'over' ? 'font-semibold text-red' : r.level === 'warning' ? 'text-orange' : 'text-label-2'}`}>
                    {money(r.spent)} / {money(r.limit)}
                  </span>
                </div>
                <ProgressBar value={r.pct} tone={TONE[r.level]} />
                <span className="text-footnote text-label-2">{r.remaining >= 0 ? `Quedan ${money(r.remaining)}` : `Te pasaste por ${money(-r.remaining)}`}</span>
              </button>
            )
          })}
        </ListGroup>
      )}

      <ListGroup title="Sin presupuesto" footer="Tocá una categoría para ponerle un límite mensual.">
        {withoutBudget.map((c, i) => (
          <button key={c.id} type="button" onClick={() => setEditing(c)} className={`flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left active:bg-fill-2 ${i === withoutBudget.length - 1 ? '' : 'border-b border-separator/60'}`}>
            <span className="text-xl" aria-hidden>{c.icon}</span>
            <span className="flex-1 text-body">{c.name}</span>
            <span className="tabular text-subhead text-label-2">{spending?.byCategory.get(c.id) ? money(spending.byCategory.get(c.id)!) : ''}</span>
          </button>
        ))}
      </ListGroup>

      <BudgetSheet category={editing} limit={editing ? (byCategory.get(editing.id)?.limit ?? null) : null} onClose={() => setEditing(null)} />
    </Screen>
  )
}

function BudgetSheet({ category, limit, onClose }: { category: Category | null; limit: number | null; onClose: () => void }) {
  const [value, setValue] = useState<number | null>(limit)
  useEffect(() => setValue(limit), [limit, category])
  const save = async (v: number | null) => {
    if (category) await setBudget(category.id, v)
    onClose()
  }
  return (
    <Sheet
      open={category !== null}
      onClose={onClose}
      title={category ? `${category.icon} ${category.name}` : ''}
      footer={
        <div className="flex flex-col gap-3">
          <Button className="w-full" onClick={() => void save(value)}>
            Guardar límite
          </Button>
          {limit !== null && (
            <Button variant="destructive" className="w-full" onClick={() => void save(null)}>
              Quitar presupuesto
            </Button>
          )}
        </div>
      }
    >
      <p className="pb-2 text-center text-footnote uppercase text-label-2">Límite por mes</p>
      <AmountInput size="hero" value={value} onChange={setValue} autoFocus />
    </Sheet>
  )
}
