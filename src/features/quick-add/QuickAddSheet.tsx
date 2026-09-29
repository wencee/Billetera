import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/app/toast'
import { CategoryPicker } from '@/components/CategoryPicker'
import { AmountInput } from '@/components/form/AmountInput'
import { Chips } from '@/components/form/Chips'
import { AccountPicker, DatePicker } from '@/components/form/Pickers'
import { Segmented } from '@/components/form/Segmented'
import { TextField } from '@/components/form/TextField'
import { Toggle } from '@/components/form/Toggle'
import { Button } from '@/components/Pressable'
import { Sheet } from '@/components/Sheet'
import { todayISO } from '@/core/dates'
import { formatMoney, formatPct } from '@/core/format'
import { analyzeFinancing } from '@/core/interest'
import { expenseInputSchema, fieldErrors, incomeInputSchema, purchaseInputSchema } from '@/core/schemas'
import type { Cents, Currency } from '@/core/types'
import { createExpense, createIncome, createPurchase, deleteMovement } from '@/db'
import { useAccounts, useCategories } from '@/db/hooks'
import { useCards } from '@/features/cards/hooks'
import { defaultMethodFor } from '@/lib/labels'
import { loadQuickAddPrefs, saveQuickAddPrefs } from './prefs'

interface Props {
  open: boolean
  onClose: () => void
}

type Kind = 'expense' | 'income'
const INSTALLMENTS = [1, 3, 6, 9, 12, 18, 24] as const

/**
 * Carga rápida: monto grande (con el teclado ya abierto), categoría en chips
 * y Guardar. "Con tarjeta" despliega tarjeta, cuotas e interés. Recuerda la
 * última cuenta y tarjeta usadas para que el caso común sean tres toques.
 */
export function QuickAddSheet({ open, onClose }: Props) {
  const close = () => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    onClose()
  }
  return (
    // Sin título: con el teclado abierto cada píxel cuenta; el selector Gasto/Ingreso hace de encabezado.
    <Sheet open={open} onClose={close}>
      <QuickAddForm onDone={close} />
    </Sheet>
  )
}

function QuickAddForm({ onDone }: { onDone: () => void }) {
  const accounts = useAccounts()
  const cards = useCards()
  const expenseCategories = useCategories('expense')
  const incomeSources = useCategories('income')
  const prefs = useMemo(loadQuickAddPrefs, [])

  const [kind, setKind] = useState<Kind>('expense')
  const [amount, setAmount] = useState<Cents | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [source, setSource] = useState('')
  const [withCard, setWithCard] = useState(prefs.withCard)
  const [cardId, setCardId] = useState(prefs.cardId)
  const [cardCurrency, setCardCurrency] = useState<Currency>('ARS')
  const [installments, setInstallments] = useState(1)
  const [withInterest, setWithInterest] = useState(false)
  const [installmentValue, setInstallmentValue] = useState<Cents | null>(null)
  const [accountId, setAccountId] = useState(prefs.accountId)
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Si lo recordado ya no existe (cuenta archivada, tarjeta borrada), usar la primera.
  useEffect(() => {
    if (accounts && !accounts.some((a) => a.id === accountId)) setAccountId(accounts[0]?.id ?? '')
  }, [accounts, accountId])
  useEffect(() => {
    if (cards && !cards.some((c) => c.id === cardId)) setCardId(cards[0]?.id ?? '')
  }, [cards, cardId])

  const usingCard = kind === 'expense' && withCard && (cards?.length ?? 0) > 0
  const card = cards?.find((c) => c.id === cardId)
  const account = accounts?.find((a) => a.id === accountId)
  const currency: Currency = usingCard ? (card?.currencies.includes(cardCurrency) ? cardCurrency : (card?.currencies[0] ?? 'ARS')) : (account?.currency ?? 'ARS')

  const financing = useMemo(() => {
    if (!usingCard || !amount || amount <= 0) return null
    try {
      return analyzeFinancing({
        cashPrice: amount, count: installments, financing: withInterest ? 'interest' : 'none',
        ...(withInterest && installmentValue ? { interestInput: { mode: 'installment' as const, value: installmentValue } } : {}),
      })
    } catch {
      return null
    }
  }, [usingCard, amount, installments, withInterest, installmentValue])

  const categoryName = expenseCategories?.find((c) => c.id === categoryId)?.name

  const save = async () => {
    setErrors({})
    let undo: (() => Promise<void>) | null = null
    let label = ''
    if (kind === 'income') {
      const parsed = incomeInputSchema.safeParse({ amount: amount ?? 0, currency, date, source, accountId, note: note || undefined })
      if (!parsed.success) return setErrors(fieldErrors(parsed.error))
      const income = await createIncome(parsed.data)
      undo = async () => void (await deleteMovement('income', income.id))
      label = 'Ingreso cargado'
    } else if (usingCard) {
      const parsed = purchaseInputSchema.safeParse({
        cardId, description: note.trim() || categoryName || 'Compra', categoryId, date, currency, cashPrice: amount ?? 0,
        installments, financing: withInterest ? 'interest' : 'none',
        interestInput: withInterest && installmentValue ? { mode: 'installment', value: installmentValue } : undefined,
      })
      if (!parsed.success) return setErrors(fieldErrors(parsed.error))
      const purchase = await createPurchase(parsed.data)
      undo = async () => void (await deleteMovement('card', purchase.id))
      label = installments > 1 ? `Compra en ${installments} cuotas cargada` : 'Compra con tarjeta cargada'
    } else {
      const parsed = expenseInputSchema.safeParse({
        amount: amount ?? 0, currency, categoryId, date, method: account ? defaultMethodFor(account.type) : 'cash', accountId, note: note || undefined,
      })
      if (!parsed.success) return setErrors(fieldErrors(parsed.error))
      const expense = await createExpense(parsed.data)
      undo = async () => void (await deleteMovement('expense', expense.id))
      label = 'Gasto cargado'
    }
    saveQuickAddPrefs({ accountId, cardId, withCard })
    onDone()
    toast(`${label} · ${formatMoney(amount ?? 0, currency)}`, { actionLabel: 'Deshacer', onAction: undo })
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      <Segmented<Kind> aria-label="Tipo" value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Gasto' }, { value: 'income', label: 'Ingreso' }]} />

      <div className="pt-2">
        <AmountInput size="hero" value={amount} onChange={setAmount} currency={currency} autoFocus />
        {usingCard && card && card.currencies.length > 1 && (
          <div className="mt-2 flex justify-center">
            <button type="button" onClick={() => setCardCurrency(currency === 'ARS' ? 'USD' : 'ARS')} className="rounded-full bg-fill px-3 py-1.5 text-footnote font-semibold text-tint active:opacity-60">
              {currency === 'ARS' ? 'Pasar a dólares' : 'Pasar a pesos'}
            </button>
          </div>
        )}
        {(errors.amount ?? errors.cashPrice) && <p className="mt-2 text-center text-footnote text-red">{errors.amount ?? errors.cashPrice}</p>}
      </div>

      {kind === 'expense' ? (
        <div>
          <p className="pb-1 text-footnote uppercase text-label-2">Categoría</p>
          <div className="-mx-4">
            <CategoryPicker categories={expenseCategories} value={categoryId} onChange={setCategoryId} />
          </div>
          {errors.categoryId && <p className="pt-1 text-footnote text-red">{errors.categoryId}</p>}
        </div>
      ) : (
        <div>
          <p className="pb-1 text-footnote uppercase text-label-2">De dónde viene</p>
          <div className="-mx-4">
            <Chips aria-label="Fuente" value={source} onChange={setSource} options={(incomeSources ?? []).map((c) => ({ value: c.name, label: `${c.icon} ${c.name}` }))} />
          </div>
          {errors.source && <p className="pt-1 text-footnote text-red">{errors.source}</p>}
        </div>
      )}

      {kind === 'expense' && (cards?.length ?? 0) > 0 && (
        <label className="card flex min-h-12 items-center justify-between px-4">
          <span className="text-body">¿Con tarjeta de crédito?</span>
          <Toggle checked={withCard} onChange={setWithCard} aria-label="Con tarjeta" />
        </label>
      )}

      {usingCard ? (
        <div className="flex flex-col gap-3">
          <div className="-mx-4">
            <Chips aria-label="Tarjeta" value={cardId} onChange={setCardId} options={(cards ?? []).map((c) => ({ value: c.id, label: `${c.name} •${c.last4}` }))} />
          </div>
          <div>
            <p className="pb-1 text-footnote uppercase text-label-2">Cuotas</p>
            <div className="-mx-4">
              <Chips aria-label="Cuotas" value={installments} onChange={setInstallments} options={INSTALLMENTS.map((n) => ({ value: n as number, label: n === 1 ? '1 pago' : String(n) }))} />
            </div>
          </div>
          {installments > 1 && (
            <div className="card divide-y divide-separator/60">
              <label className="flex min-h-12 items-center justify-between px-4">
                <span className="text-body">Con interés</span>
                <Toggle checked={withInterest} onChange={setWithInterest} aria-label="Con interés" />
              </label>
              {withInterest && (
                <label className="flex min-h-12 items-center gap-3 px-4">
                  <span className="shrink-0 text-body">Cada cuota</span>
                  <AmountInput value={installmentValue} onChange={setInstallmentValue} currency={currency} aria-label="Valor de cada cuota" />
                </label>
              )}
            </div>
          )}
          {financing && installments > 1 && (
            <p className="text-center text-footnote text-label-2">
              {installments} cuotas de <span className="tabular font-semibold text-label">{formatMoney(financing.installmentAmount, currency)}</span> · total{' '}
              <span className="tabular">{formatMoney(financing.totalAmount, currency)}</span>
              {financing.totalInterest > 0 && <span className="text-orange"> (+{formatPct(financing.surchargePct)})</span>}
            </p>
          )}
          {errors.interestInput && <p className="text-center text-footnote text-red">Cargá el valor de cada cuota</p>}
        </div>
      ) : (
        <div>
          <p className="pb-1 text-footnote uppercase text-label-2">{kind === 'income' ? 'Entra en' : 'Sale de'}</p>
          <div className="-mx-4">
            <AccountPicker accounts={accounts} value={accountId} onChange={setAccountId} />
          </div>
          {errors.accountId && <p className="pt-1 text-footnote text-red">{errors.accountId}</p>}
        </div>
      )}

      <div className="-mx-4">
        <DatePicker value={date} onChange={setDate} />
      </div>

      <label className="card flex min-h-12 items-center px-4">
        <TextField align="left" value={note} onChange={(e) => setNote(e.target.value)} placeholder={usingCard ? 'Descripción (opcional)' : 'Nota (opcional)'} enterKeyHint="done" />
      </label>

      {/* Pegado abajo del área visible: con el teclado abierto sigue a un toque. */}
      <div className="sticky bottom-0 -mx-4 bg-surface px-4 pt-2 pb-1">
        <Button className="w-full" onClick={() => void save()}>
          {kind === 'income' ? 'Guardar ingreso' : usingCard ? 'Guardar compra' : 'Guardar gasto'}
        </Button>
      </div>
    </div>
  )
}
