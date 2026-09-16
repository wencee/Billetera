import { useLiveQuery } from 'dexie-react-hooks'
import { Settings as SettingsIcon, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { ListGroup, ListRow } from '@/components/List'
import { formatDate, formatMoney } from '@/core/format'
import { todayISO } from '@/core/dates'
import { db } from '@/db'

export function HomeScreen() {
  const navigate = useNavigate()
  const counts = useLiveQuery(async () => ({
    cards: await db.cards.count(),
    purchases: await db.purchases.count(),
    installments: await db.installments.count(),
    accounts: await db.accounts.count(),
    expenses: await db.expenses.count(),
    incomes: await db.incomes.count(),
    goals: await db.goals.count(),
    categories: await db.categories.count(),
  }))
  const settings = useLiveQuery(() => db.settings.get('main'))

  return (
    <Screen
      title="Inicio"
      right={
        <Pressable pressScale={0.9} aria-label="Ajustes" onClick={() => navigate('/ajustes')} className="flex items-center justify-center text-tint">
          <SettingsIcon size={24} />
        </Pressable>
      }
    >
      <p className="px-4 text-subhead text-label-2">{formatDate(todayISO())}</p>

      <section className="px-4 pt-4">
        <div className="card p-4">
          <p className="text-footnote uppercase text-label-2">Disponible del mes</p>
          <p className="tabular mt-1 text-[2.2rem] font-bold leading-tight tracking-tight">{formatMoney(0, 'ARS', { fractionDigits: 0 })}</p>
          <p className="mt-1 text-subhead text-label-2">Se calcula en la fase 5 con ingresos, gastos y cuotas.</p>
        </div>
      </section>

      <ListGroup title="Estado de la base de datos" footer="Cerrá la app del todo y volvé a abrirla: estos números tienen que seguir iguales.">
        <ListRow label="Tarjetas" value={counts?.cards ?? '…'} />
        <ListRow label="Compras con tarjeta" value={counts?.purchases ?? '…'} />
        <ListRow label="Cuotas generadas" value={counts?.installments ?? '…'} />
        <ListRow label="Cuentas" value={counts?.accounts ?? '…'} />
        <ListRow label="Gastos" value={counts?.expenses ?? '…'} />
        <ListRow label="Ingresos" value={counts?.incomes ?? '…'} />
        <ListRow label="Metas" value={counts?.goals ?? '…'} />
        <ListRow label="Categorías" value={counts?.categories ?? '…'} />
        <ListRow label="Dólar" value={settings && settings.usdRate > 0 ? formatMoney(settings.usdRate) : 'sin cargar'} last />
      </ListGroup>

      {counts && counts.cards === 0 && (
        <ListGroup footer="Para ver la app con contenido antes de cargar lo tuyo.">
          <ListRow
            icon={<Sparkles size={22} className="text-tint" />}
            label="Cargar datos de ejemplo"
            chevron
            onPress={() => navigate('/ajustes')}
            last
          />
        </ListGroup>
      )}
    </Screen>
  )
}
