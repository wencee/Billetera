import { addDays, todayISO } from '@/core/dates'
import type { Account, Currency } from '@/core/types'
import { ACCOUNT_TYPE_ICON } from '@/lib/labels'
import { Chips } from './Chips'
import { DateField } from './TextField'

interface AccountPickerProps {
  accounts: readonly Account[] | undefined
  value: string
  onChange: (id: string) => void
  /** Si se pasa, solo muestra cuentas de esa moneda. */
  currency?: Currency
  'aria-label'?: string
}

/** Cuentas como chips (con la moneda si hay cuentas en dólares). */
export function AccountPicker({ accounts, value, onChange, currency, ...aria }: AccountPickerProps) {
  const list = (accounts ?? []).filter((a) => !currency || a.currency === currency)
  const showCurrency = (accounts ?? []).some((a) => a.currency === 'USD')
  return (
    <Chips
      aria-label={aria['aria-label'] ?? 'Cuenta'}
      value={value || null}
      onChange={onChange}
      options={list.map((a) => ({ value: a.id, label: `${ACCOUNT_TYPE_ICON[a.type]} ${a.name}${showCurrency && a.currency === 'USD' ? ' · US$' : ''}` }))}
    />
  )
}

/** Fecha con atajos "Hoy" y "Ayer" y un selector para cualquier otra. */
export function DatePicker({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const today = todayISO()
  const yesterday = addDays(today, -1)
  const preset = value === today ? 'today' : value === yesterday ? 'yesterday' : 'other'
  return (
    <div className="flex items-center gap-2 pr-4">
      <Chips
        aria-label="Fecha"
        value={preset}
        onChange={(v) => {
          if (v === 'today') onChange(today)
          else if (v === 'yesterday') onChange(yesterday)
        }}
        options={[
          { value: 'today', label: 'Hoy' },
          { value: 'yesterday', label: 'Ayer' },
        ]}
      />
      <div className={`ml-auto flex h-9 items-center rounded-full px-3 ${preset === 'other' ? 'bg-accent text-white' : 'bg-fill'}`}>
        <DateField aria-label="Otra fecha" value={value} max={addDays(today, 366)} onChange={(e) => e.target.value && onChange(e.target.value)} className="w-[9rem] appearance-none" />
      </div>
    </div>
  )
}
