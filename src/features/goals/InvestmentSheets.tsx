import { useEffect, useState } from 'react'
import { toast } from '@/app/toast'
import { AmountInput } from '@/components/form/AmountInput'
import { Chips } from '@/components/form/Chips'
import { DatePicker } from '@/components/form/Pickers'
import { TextField } from '@/components/form/TextField'
import { Button } from '@/components/Pressable'
import { Sheet } from '@/components/Sheet'
import { todayISO } from '@/core/dates'
import { formatDate, formatMoney } from '@/core/format'
import { FIXED_TERM_DAYS, fixedTermReturn, maturityFor } from '@/core/investments'
import type { Account, Cents, Investment } from '@/core/types'
import { closeInvestment, renewFixedTerm, setValuation } from '@/db'
import { ACCOUNT_TYPE_ICON } from '@/lib/labels'

const NO_ACCOUNT = 'none'

/** Valuación a mano (FCI, cripto, acciones): lo que dice hoy el broker o la app del banco. */
export function ValuationSheet({ investment, open, onClose }: { investment: Investment; open: boolean; onClose: () => void }) {
  const [value, setValue] = useState<Cents | null>(investment.currentValue ?? null)
  useEffect(() => {
    if (open) setValue(investment.currentValue ?? investment.amount)
  }, [open, investment.currentValue, investment.amount])
  const save = async (v: Cents | null) => {
    await setValuation(investment.id, v, todayISO())
    onClose()
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Valuación de hoy"
      footer={
        <div className="flex flex-col gap-3">
          <Button className="w-full" onClick={() => void save(value && value > 0 ? value : null)}>
            Guardar valuación
          </Button>
          {investment.currentValue !== undefined && (
            <Button variant="secondary" className="w-full" onClick={() => void save(null)}>
              Quitar valuación manual
            </Button>
          )}
        </div>
      }
    >
      <p className="pb-2 text-center text-footnote uppercase text-label-2">¿Cuánto vale hoy {investment.name}?</p>
      <AmountInput size="hero" value={value} onChange={setValue} currency={investment.currency} autoFocus />
      <p className="pt-3 text-center text-footnote text-label-2">Invertiste {formatMoney(investment.amount, investment.currency)} el {formatDate(investment.date)}.</p>
    </Sheet>
  )
}

interface CloseProps {
  investment: Investment
  open: boolean
  onClose: () => void
  /** Valor sugerido para cobrar (al vencimiento, o valor de hoy). */
  suggested: Cents
  accounts: readonly Account[]
}

/** Rescatar o vender: lo cobrado entra en una cuenta (o queda como registro). */
export function CloseSheet({ investment, open, onClose, suggested, accounts }: CloseProps) {
  const eligible = accounts.filter((a) => a.currency === investment.currency)
  const [amount, setAmount] = useState<Cents | null>(suggested)
  const [date, setDate] = useState(todayISO())
  const [accountId, setAccountId] = useState(NO_ACCOUNT)
  useEffect(() => {
    if (!open) return
    setAmount(suggested)
    const matured = investment.maturityDate && investment.maturityDate <= todayISO()
    setDate(matured ? investment.maturityDate! : todayISO())
    setAccountId(investment.accountId && eligible.some((a) => a.id === investment.accountId) ? investment.accountId : (eligible[0]?.id ?? NO_ACCOUNT))
  }, [open]) // solo al abrir: después manda lo que elija el usuario
  const save = async () => {
    if (amount === null || amount < 0) return
    const undo = await closeInvestment(investment.id, { amount, date, ...(accountId !== NO_ACCOUNT ? { accountId } : {}) })
    onClose()
    const gain = amount - investment.amount
    toast(`Rescate registrado${gain !== 0 ? ` · ${gain > 0 ? 'ganaste' : 'perdiste'} ${formatMoney(Math.abs(gain), investment.currency)}` : ''}`, { actionLabel: 'Deshacer', onAction: undo })
  }
  return (
    <Sheet open={open} onClose={onClose} title={investment.type === 'plazo_fijo' ? 'Cobrar el plazo fijo' : 'Rescatar o vender'} footer={<Button className="w-full" onClick={() => void save()}>Registrar rescate</Button>}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="pb-2 text-center text-footnote uppercase text-label-2">Lo que cobraste</p>
          <AmountInput size="hero" value={amount} onChange={setAmount} currency={investment.currency} />
        </div>
        <div>
          <p className="pb-1 text-footnote uppercase text-label-2">Entra en</p>
          <div className="-mx-4">
            <Chips aria-label="Cuenta" value={accountId} onChange={setAccountId} options={[...eligible.map((a) => ({ value: a.id, label: `${ACCOUNT_TYPE_ICON[a.type]} ${a.name}` })), { value: NO_ACCOUNT, label: 'Solo registro' }]} />
          </div>
        </div>
        <div className="-mx-4">
          <DatePicker value={date} onChange={setDate} />
        </div>
      </div>
    </Sheet>
  )
}

/** Renovar un plazo fijo: capital + intereses a un plazo nuevo, sin pasar por una cuenta. */
export function RenewSheet({ investment, open, onClose, total, onRenewed }: { investment: Investment; open: boolean; onClose: () => void; total: Cents; onRenewed: (id: string) => void }) {
  const start = investment.maturityDate ?? todayISO()
  const [amount, setAmount] = useState<Cents | null>(total)
  const [tna, setTna] = useState('')
  const [days, setDays] = useState<number>(30)
  useEffect(() => {
    if (!open) return
    setAmount(total)
    setTna(investment.tna !== undefined ? String(Math.round(investment.tna * 10000) / 100).replace('.', ',') : '')
    setDays(30)
  }, [open, total, investment.tna])
  const tnaValue = tna.trim() ? Number(tna.replace(',', '.')) / 100 : NaN
  const maturity = maturityFor(start, days)
  const preview = amount && Number.isFinite(tnaValue) ? fixedTermReturn(amount, tnaValue, start, maturity) : null
  const save = async () => {
    if (!amount || !Number.isFinite(tnaValue)) return
    const renewed = await renewFixedTerm(investment.id, { total: amount, startDate: start, maturityDate: maturity, tna: tnaValue })
    onClose()
    onRenewed(renewed.id)
    toast('Plazo fijo renovado')
  }
  return (
    <Sheet open={open} onClose={onClose} title="Renovar plazo fijo" footer={<Button className="w-full" onClick={() => void save()}>Renovar</Button>}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="pb-2 text-center text-footnote uppercase text-label-2">Capital + intereses</p>
          <AmountInput size="hero" value={amount} onChange={setAmount} currency={investment.currency} />
          <p className="pt-1 text-center text-footnote text-label-2">Desde el {formatDate(start)}</p>
        </div>
        <label className="card flex min-h-12 items-center gap-3 px-4">
          <span className="shrink-0 text-body">TNA (%)</span>
          <TextField value={tna} inputMode="decimal" onChange={(e) => setTna(e.target.value)} placeholder="30" />
        </label>
        <div className="-mx-4">
          <Chips aria-label="Plazo" value={days} onChange={setDays} options={FIXED_TERM_DAYS.map((d) => ({ value: d as number, label: `${d} días` }))} />
        </div>
        {preview && (
          <p className="text-center text-subhead text-label-2">
            Vence el {formatDate(maturity)}: cobrás <span className="tabular font-semibold text-label">{formatMoney(preview.total, investment.currency)}</span>{' '}
            <span className="text-green">(+{formatMoney(preview.interest, investment.currency)})</span>
          </p>
        )}
      </div>
    </Sheet>
  )
}
