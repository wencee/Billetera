import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from '@/app/toast'
import { ListGroup, ListRow } from '@/components/List'
import { ProgressBar } from '@/components/ProgressBar'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { diffDays, todayISO } from '@/core/dates'
import { formatDate, formatMoney, formatPct } from '@/core/format'
import { fixedTermReturn, investmentValue } from '@/core/investments'
import { db, reopenInvestment } from '@/db'
import { useAccounts, useSettings } from '@/db/hooks'
import { INVESTMENT_TYPE_ICON, INVESTMENT_TYPE_LABEL } from '@/lib/labels'
import { CloseSheet, RenewSheet, ValuationSheet } from './InvestmentSheets'

export function InvestmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const inv = useLiveQuery(() => (id ? db.investments.get(id) : undefined), [id])
  const renewedInto = useLiveQuery(async () => (id ? (await db.investments.filter((i) => i.renewedFromId === id).first()) ?? null : null), [id])
  const accounts = useAccounts(true)
  const settings = useSettings()
  const [sheet, setSheet] = useState<'valuation' | 'close' | 'renew' | null>(null)
  const hide = settings?.privateMode ?? false
  const today = todayISO()

  if (!inv) return <Screen title="Inversión" back="Metas" backTo="/metas" compact>{null}</Screen>

  const v = investmentValue(inv, today)
  const money = (c: number) => formatMoney(c, inv.currency, { hide })
  const accountName = (accId?: string) => (accId ? (accounts?.find((a) => a.id === accId)?.name ?? 'Cuenta borrada') : 'Solo registro')
  const isFixedTerm = inv.type === 'plazo_fijo' && inv.tna !== undefined && inv.maturityDate !== undefined
  const atMaturity = isFixedTerm ? fixedTermReturn(inv.amount, inv.tna!, inv.date, inv.maturityDate!) : null
  const totalDays = isFixedTerm ? Math.max(1, diffDays(inv.date, inv.maturityDate!)) : 0
  const elapsed = isFixedTerm ? Math.min(totalDays, Math.max(0, diffDays(inv.date, today))) : 0
  const daysLeft = isFixedTerm ? diffDays(today, inv.maturityDate!) : 0
  const suggestedClose = atMaturity && daysLeft <= 0 ? atMaturity.total : v.value

  const reopen = async () => {
    await reopenInvestment(inv.id)
    toast('La inversión volvió a estar abierta')
  }

  return (
    <Screen
      title={inv.name}
      back="Metas"
      backTo="/metas"
      compact
      right={
        !inv.closed ? (
          <Pressable pressScale={0.95} className="px-3 text-body text-tint" onClick={() => navigate(`/metas/inversiones/${inv.id}/editar`)}>
            Editar
          </Pressable>
        ) : undefined
      }
    >
      <div className="flex flex-col items-center px-4 pt-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green/15 text-4xl" aria-hidden>{INVESTMENT_TYPE_ICON[inv.type]}</span>
        <p className="mt-3 text-subhead text-label-2">{INVESTMENT_TYPE_LABEL[inv.type]}{inv.closed ? ' · cerrada' : ''}</p>
        <p className="tabular text-largetitle">{money(v.value)}</p>
        {v.gain !== 0 && (
          <p className={`tabular text-body ${v.gain > 0 ? 'text-green' : 'text-red'}`}>
            {formatMoney(v.gain, inv.currency, { hide, signed: true })} ({formatPct(v.gainPct)})
          </p>
        )}
        <p className="mt-1 text-footnote text-label-2">
          {v.source === 'accrued' ? 'Con el interés ganado hasta hoy' : v.source === 'manual' && inv.currentValueDate ? `Valuación del ${formatDate(inv.currentValueDate)}` : v.source === 'closed' ? 'Lo que cobraste' : 'Sin valuación cargada: se muestra lo invertido'}
        </p>
      </div>

      {isFixedTerm && atMaturity && !inv.closed && (
        <div className="card mx-4 mt-5 p-4">
          <div className="flex justify-between text-footnote text-label-2">
            <span>{formatDate(inv.date)}</span>
            <span>{daysLeft > 0 ? `faltan ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}` : daysLeft === 0 ? 'vence hoy' : 'vencido'}</span>
            <span>{formatDate(inv.maturityDate!)}</span>
          </div>
          <ProgressBar value={elapsed / totalDays} tone={daysLeft <= 0 ? 'orange' : 'green'} className="mt-2" />
          <p className="mt-3 text-subhead">
            Al vencimiento cobrás <span className="tabular font-semibold">{money(atMaturity.total)}</span>{' '}
            <span className="text-green">(+{money(atMaturity.interest)})</span>
          </p>
        </div>
      )}

      <ListGroup title="Detalle">
        {(
          [
            ['Invertido', money(inv.amount)],
            ['Fecha', formatDate(inv.date)],
            ['Salió de', inv.renewedFromId && !inv.accountId ? 'Renovación del plazo fijo anterior' : accountName(inv.accountId)],
            inv.tna !== undefined ? ['TNA', formatPct(inv.tna)] : null,
            atMaturity ? ['TEA equivalente', formatPct(atMaturity.tea)] : null,
            inv.closed && inv.closedAt ? ['Cerrada', formatDate(inv.closedAt)] : null,
            inv.closed ? ['Cobrado en', inv.closedAccountId ? accountName(inv.closedAccountId) : renewedInto ? 'Renovado' : 'Solo registro'] : null,
            inv.notes ? ['Notas', inv.notes] : null,
          ].filter((r): r is [string, string] => r !== null)
        ).map(([label, value], i, rows) => (
          <ListRow key={label} label={label} value={value} last={i === rows.length - 1} />
        ))}
      </ListGroup>

      <div className="flex flex-col gap-3 px-4 pt-6">
        {!inv.closed && (
          <>
            {isFixedTerm ? (
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => setSheet('renew')}>Renovar</Button>
                <Button onClick={() => setSheet('close')}>Cobrar</Button>
              </div>
            ) : (
              <>
                <Button onClick={() => setSheet('valuation')}>Actualizar valuación</Button>
                <Button variant="secondary" onClick={() => setSheet('close')}>Rescatar o vender</Button>
              </>
            )}
          </>
        )}
        {inv.closed && renewedInto && (
          <Button variant="secondary" onClick={() => navigate(`/metas/inversiones/${renewedInto.id}`, { replace: true })}>
            Ver la renovación
          </Button>
        )}
        {inv.closed && !renewedInto && (
          <Button variant="secondary" onClick={() => void reopen()}>
            Volver a abrirla
          </Button>
        )}
      </div>

      <ValuationSheet investment={inv} open={sheet === 'valuation'} onClose={() => setSheet(null)} />
      <CloseSheet investment={inv} open={sheet === 'close'} onClose={() => setSheet(null)} suggested={suggestedClose} accounts={accounts?.filter((a) => !a.archived) ?? []} />
      {atMaturity && (
        <RenewSheet
          investment={inv}
          open={sheet === 'renew'}
          onClose={() => setSheet(null)}
          total={atMaturity.total}
          onRenewed={(newId) => navigate(`/metas/inversiones/${newId}`, { replace: true })}
        />
      )}
    </Screen>
  )
}
