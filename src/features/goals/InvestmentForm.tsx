import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/toast'
import { AmountInput } from '@/components/form/AmountInput'
import { Chips } from '@/components/form/Chips'
import { FormGroup, FormRow } from '@/components/form/Form'
import { DatePicker } from '@/components/form/Pickers'
import { Segmented } from '@/components/form/Segmented'
import { DateField, TextField } from '@/components/form/TextField'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { diffDays, todayISO } from '@/core/dates'
import { formatDate, formatMoney, formatPct } from '@/core/format'
import { FIXED_TERM_DAYS, fixedTermReturn, maturityFor } from '@/core/investments'
import { fieldErrors, investmentInputSchema } from '@/core/schemas'
import type { Currency, InvestmentType } from '@/core/types'
import { createInvestment, db, deleteInvestment, updateInvestment } from '@/db'
import { useAccounts } from '@/db/hooks'
import { ACCOUNT_TYPE_ICON, INVESTMENT_NAME_HINT, INVESTMENT_TYPE_ICON, INVESTMENT_TYPE_LABEL } from '@/lib/labels'

const TYPES: InvestmentType[] = ['plazo_fijo', 'fci', 'usd', 'crypto', 'ars', 'other']
const NO_ACCOUNT = 'none'

export function InvestmentForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const existing = useLiveQuery(() => (id ? db.investments.get(id) : undefined), [id])
  const accounts = useAccounts()
  const [loaded, setLoaded] = useState(!editing)
  const [type, setType] = useState<InvestmentType>('plazo_fijo')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState<number | null>(null)
  const [currency, setCurrency] = useState<Currency>('ARS')
  const [date, setDate] = useState(todayISO())
  const [tna, setTna] = useState('')
  const [termDays, setTermDays] = useState<number | 'custom'>(30)
  const [maturityDate, setMaturityDate] = useState(maturityFor(todayISO(), 30))
  const [accountId, setAccountId] = useState(NO_ACCOUNT)
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!existing || loaded) return
    setType(existing.type)
    setName(existing.name)
    setAmount(existing.amount)
    setCurrency(existing.currency)
    setDate(existing.date)
    if (existing.tna !== undefined) setTna(String(Math.round(existing.tna * 10000) / 100).replace('.', ','))
    if (existing.maturityDate) {
      setMaturityDate(existing.maturityDate)
      const d = diffDays(existing.date, existing.maturityDate)
      setTermDays((FIXED_TERM_DAYS as readonly number[]).includes(d) ? d : 'custom')
    }
    setAccountId(existing.accountId ?? NO_ACCOUNT)
    setNotes(existing.notes ?? '')
    setLoaded(true)
  }, [existing, loaded])

  // La cuenta por defecto: la bancaria en la moneda elegida (solo al crear y al cambiar de moneda;
  // si el usuario elige "Solo registro", se respeta).
  const accountsLoaded = Boolean(accounts)
  useEffect(() => {
    if (editing || !accounts) return
    setAccountId((accounts.find((a) => a.currency === currency && a.type === 'bank') ?? accounts.find((a) => a.currency === currency))?.id ?? NO_ACCOUNT)
  }, [accountsLoaded, currency, editing])

  const isFixedTerm = type === 'plazo_fijo'
  const effectiveMaturity = isFixedTerm ? (termDays === 'custom' ? maturityDate : maturityFor(date, termDays)) : undefined
  const tnaValue = tna.trim() ? Number(tna.replace(',', '.')) / 100 : undefined
  const preview = useMemo(
    () => (isFixedTerm && amount && tnaValue !== undefined && Number.isFinite(tnaValue) && effectiveMaturity ? fixedTermReturn(amount, tnaValue, date, effectiveMaturity) : null),
    [isFixedTerm, amount, tnaValue, date, effectiveMaturity],
  )

  const pickType = (t: InvestmentType) => {
    setType(t)
    if (t === 'usd') setCurrency('USD')
    if (t === 'plazo_fijo' || t === 'ars') setCurrency('ARS')
  }

  const save = async () => {
    const parsed = investmentInputSchema.safeParse({
      type, name: name.trim() || INVESTMENT_TYPE_LABEL[type], amount: amount ?? 0, currency, date,
      tna: isFixedTerm ? tnaValue : undefined, maturityDate: effectiveMaturity,
      accountId: accountId === NO_ACCOUNT ? undefined : accountId, notes: notes || undefined,
    })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    if (editing && id) {
      await updateInvestment(id, parsed.data)
      navigate(-1)
    } else {
      const inv = await createInvestment(parsed.data)
      navigate(`/metas/inversiones/${inv.id}`, { replace: true })
    }
  }

  const remove = async () => {
    if (!id) return
    const undo = await deleteInvestment(id)
    navigate('/metas', { replace: true })
    if (undo) toast('Inversión borrada', { actionLabel: 'Deshacer', onAction: undo })
  }

  const eligible = (accounts ?? []).filter((a) => a.currency === currency)

  return (
    <Screen
      title={editing ? 'Editar inversión' : 'Nueva inversión'}
      back="Metas"
      backTo="/metas"
      compact
      right={
        <Pressable pressScale={0.95} className="px-3 text-body font-semibold text-tint" onClick={() => void save()}>
          Guardar
        </Pressable>
      }
    >
      <div className="pt-4">
        <Chips aria-label="Tipo" value={type} onChange={pickType} options={TYPES.map((t) => ({ value: t, label: `${INVESTMENT_TYPE_ICON[t]} ${INVESTMENT_TYPE_LABEL[t]}` }))} />
      </div>

      <FormGroup error={errors.name ?? errors.amount}>
        <FormRow label="Nombre" error={errors.name}>
          <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder={INVESTMENT_NAME_HINT[type]} />
        </FormRow>
        <FormRow label="Monto invertido" error={errors.amount}>
          <AmountInput value={amount} onChange={setAmount} currency={currency} autoFocus={!editing} />
        </FormRow>
        {type !== 'plazo_fijo' && type !== 'ars' && type !== 'usd' && (
          <div className="px-4 py-3">
            <Segmented<Currency> aria-label="Moneda" value={currency} onChange={setCurrency} options={[{ value: 'ARS', label: 'Pesos' }, { value: 'USD', label: 'Dólares' }]} />
          </div>
        )}
      </FormGroup>

      <FormGroup title="Fecha" error={errors.date}>
        <div className="py-2">
          <DatePicker value={date} onChange={setDate} />
        </div>
      </FormGroup>

      {isFixedTerm && (
        <FormGroup title="Plazo fijo" error={errors.tna ?? errors.maturityDate}>
          <FormRow label="TNA (%)" error={errors.tna}>
            <TextField value={tna} inputMode="decimal" onChange={(e) => setTna(e.target.value)} placeholder="30" />
          </FormRow>
          <div className="py-2">
            <p className="px-4 pb-1 text-footnote uppercase text-label-2">Plazo</p>
            <Chips<number | 'custom'>
              aria-label="Plazo"
              value={termDays}
              onChange={(v) => {
                setTermDays(v)
                if (v !== 'custom') setMaturityDate(maturityFor(date, v))
              }}
              options={[...FIXED_TERM_DAYS.map((d) => ({ value: d as number | 'custom', label: `${d} días` })), { value: 'custom', label: 'Otra fecha' }]}
            />
          </div>
          {termDays === 'custom' ? (
            <FormRow label="Vence" error={errors.maturityDate}>
              <DateField value={maturityDate} onChange={(e) => e.target.value && setMaturityDate(e.target.value)} />
            </FormRow>
          ) : (
            <FormRow label="Vence">
              <span className="text-body text-label-2">{effectiveMaturity ? formatDate(effectiveMaturity) : ''}</span>
            </FormRow>
          )}
        </FormGroup>
      )}

      {preview && (
        <div className="card mx-4 mt-5 p-4">
          <p className="text-footnote uppercase text-label-2">Al vencimiento ({preview.days} días)</p>
          <p className="tabular mt-1 text-title2">{formatMoney(preview.total, currency)}</p>
          <p className="tabular text-subhead text-green">+ {formatMoney(preview.interest, currency)} de interés</p>
          <p className="mt-1 text-footnote text-label-2">TEA si lo renovás siempre igual: {formatPct(preview.tea)}</p>
        </div>
      )}

      <FormGroup title="De dónde sale la plata" footer={accountId === NO_ACCOUNT ? 'Solo registro: no descuenta de ninguna cuenta (útil si ya estaba invertido).' : 'Se descuenta de esa cuenta; cuando la rescates, vuelve a la cuenta que elijas.'}>
        <div className="py-2">
          <Chips
            aria-label="Cuenta"
            value={accountId}
            onChange={setAccountId}
            options={[...eligible.map((a) => ({ value: a.id, label: `${ACCOUNT_TYPE_ICON[a.type]} ${a.name}` })), { value: NO_ACCOUNT, label: 'Solo registro' }]}
          />
        </div>
      </FormGroup>

      <FormGroup title="Notas">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Número de certificado, broker…"
          className="w-full resize-none bg-transparent px-4 py-3 text-body outline-none placeholder:text-label-3"
        />
      </FormGroup>

      <div className="flex flex-col gap-3 px-4 pt-6">
        <Button className="w-full" onClick={() => void save()}>
          {editing ? 'Guardar cambios' : 'Agregar inversión'}
        </Button>
        {editing && (
          <Button variant="destructive" className="w-full" onClick={() => void remove()}>
            Borrar inversión
          </Button>
        )}
      </div>
    </Screen>
  )
}
