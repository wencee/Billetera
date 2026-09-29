import { ArrowLeftRight, Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { ListGroup, ListRow } from '@/components/List'
import { Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { totalsByCurrency } from '@/core/balances'
import { formatMoney } from '@/core/format'
import { convertCents } from '@/core/money'
import type { Account } from '@/core/types'
import { useAccountBalances, useAccounts, useSettings } from '@/db/hooks'
import { ACCOUNT_TYPE_ICON } from '@/lib/labels'

export function AccountsScreen() {
  const navigate = useNavigate()
  const accounts = useAccounts(true)
  const balances = useAccountBalances()
  const settings = useSettings()
  const privateMode = settings?.privateMode ?? false
  const active = accounts?.filter((a) => !a.archived) ?? []
  const archived = accounts?.filter((a) => a.archived) ?? []
  const totals = balances ? totalsByCurrency(active, balances) : { ARS: 0, USD: 0 }
  const usdRate = settings?.usdRate ?? 0
  const grand = usdRate > 0 ? totals.ARS + convertCents(totals.USD, 'USD', 'ARS', usdRate) : null

  const row = (a: Account, last: boolean) => {
    const balance = balances?.get(a.id) ?? a.initialBalance
    return (
      <ListRow
        key={a.id}
        icon={<span className="text-xl">{ACCOUNT_TYPE_ICON[a.type]}</span>}
        label={a.name}
        value={<span className={balance < 0 ? 'text-red' : ''}>{formatMoney(balance, a.currency, { hide: privateMode })}</span>}
        chevron
        onPress={() => navigate(`/ajustes/cuentas/${a.id}`)}
        last={last}
      />
    )
  }

  return (
    <Screen
      title="Cuentas"
      back="Ajustes"
      backTo="/ajustes"
      right={
        <Pressable pressScale={0.9} aria-label="Nueva cuenta" onClick={() => navigate('/ajustes/cuentas/nueva')} className="flex items-center justify-center text-tint">
          <Plus size={26} />
        </Pressable>
      }
    >
      <div className="card mx-4 p-4">
        <p className="text-footnote uppercase text-label-2">Total en cuentas</p>
        <p className="tabular mt-1 text-title1">{formatMoney(totals.ARS, 'ARS', { hide: privateMode, fractionDigits: 0 })}</p>
        {totals.USD !== 0 && <p className="tabular text-subhead text-label-2">+ {formatMoney(totals.USD, 'USD', { hide: privateMode })}</p>}
        {grand !== null && totals.USD !== 0 && (
          <p className="mt-1 text-footnote text-label-2">≈ {formatMoney(grand, 'ARS', { hide: privateMode, fractionDigits: 0 })} a la cotización cargada</p>
        )}
      </div>

      <ListGroup title="Cuentas" footer="El saldo se calcula con el saldo inicial y todos los movimientos hasta hoy.">
        {active.map((a) => row(a, false))}
        <ListRow icon={<Plus size={22} className="text-tint" />} label="Nueva cuenta" chevron onPress={() => navigate('/ajustes/cuentas/nueva')} last />
      </ListGroup>

      <ListGroup>
        <ListRow icon={<ArrowLeftRight size={22} className="text-tint" />} label="Transferir entre cuentas" chevron onPress={() => navigate('/movimientos/transferencia/nueva')} last />
      </ListGroup>

      {archived.length > 0 && (
        <ListGroup title="Archivadas">
          {archived.map((a, i) => row(a, i === archived.length - 1))}
        </ListGroup>
      )}
    </Screen>
  )
}
