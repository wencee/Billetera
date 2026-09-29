import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, PieChart } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/EmptyState'
import { Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { addPeriods, firstDayOfPeriod, lastDayOfPeriod, periodOf, todayISO } from '@/core/dates'
import { NBSP, formatMoney, formatMoneyCompact, formatPct, formatPeriod, formatPeriodLong } from '@/core/format'
import { average } from '@/core/stats'
import type { Period } from '@/core/types'
import { useSettings } from '@/db/hooks'
import { EMPTY_FILTERS, useMovementFilters } from '@/features/movements/filterStore'
import { AXIS, ChartCard, ChartTooltip, Legend, Segment, seriesColor } from './chartParts'
import { useStats } from './useStats'

const shortMonth = (p: Period) => formatPeriod(p).split(' ')[0]!.toLowerCase()

export function StatsScreen() {
  const navigate = useNavigate()
  const currentMonth = periodOf(todayISO())
  const [month, setMonth] = useState(currentMonth)
  const stats = useStats(month)
  const settings = useSettings()
  const setFilters = useMovementFilters((s) => s.set)
  const reduced = useReducedMotion() ?? false
  const hide = settings?.privateMode ?? false
  const money = (c: number) => formatMoney(c, 'ARS', { hide, fractionDigits: 0 })
  const compact = (c: number) => (hide ? '••••' : formatMoneyCompact(c))
  // En los ejes, sin "$": el título ya dice que son pesos y así el tick entra en una línea.
  const axisMoney = (c: number) => (hide ? '' : formatMoneyCompact(c).split(NBSP).slice(1).join(NBSP))

  if (!stats) return <Screen title="Estadísticas">{null}</Screen>

  const nothing = stats.trend.every((t) => t.spent === 0 && t.income === 0) && stats.commitments.every((c) => c.total === 0)
  if (nothing) {
    return (
      <Screen title="Estadísticas">
        <EmptyState icon={<PieChart size={56} strokeWidth={1.5} />} title="Nada que graficar todavía" description="Cuando cargues gastos e ingresos vas a ver en qué se va la plata y cómo viene cada mes." />
      </Screen>
    )
  }

  const openCategory = (categoryId: string) => {
    setFilters({ ...EMPTY_FILTERS, categoryIds: categoryId === 'other' ? [] : [categoryId], range: 'custom', from: firstDayOfPeriod(month), to: lastDayOfPeriod(month) })
    navigate('/movimientos')
  }

  const maxCategory = Math.max(1, ...stats.categories.map((c) => c.amount))
  const avg = average(stats.trend.map((t) => t.spent))
  const up = stats.spentChange.delta > 0
  const monthName = formatPeriodLong(month).split(' ')[0]!.toLowerCase()
  const prevName = shortMonth(addPeriods(month, -1))
  const cardsWithData = stats.cards.filter((c) => stats.commitments.some((row) => (row.byCard[c.id] ?? 0) > 0))
  const topKey = stats.commitments.map((row) => [...cardsWithData].reverse().find((c) => (row.byCard[c.id] ?? 0) > 0)?.id)
  const commitmentData = stats.commitments.map((row) => ({ label: shortMonth(row.period), period: row.period, total: row.total, ...row.byCard }))

  return (
    <Screen title="Estadísticas">
      {/* Filtro de mes: arriba y único; todo lo de abajo (salvo "Lo que viene") responde a él. */}
      <div className="flex items-center justify-between px-2">
        <Pressable pressScale={0.9} aria-label="Mes anterior" onClick={() => setMonth(addPeriods(month, -1))} className="flex items-center justify-center text-tint">
          <ChevronLeft size={24} />
        </Pressable>
        <span className="text-headline">{formatPeriodLong(month)}</span>
        <Pressable pressScale={0.9} aria-label="Mes siguiente" disabled={month >= currentMonth} onClick={() => setMonth(addPeriods(month, 1))} className="flex items-center justify-center text-tint disabled:opacity-30">
          <ChevronRight size={24} />
        </Pressable>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 pt-2">
        <div className="card p-3">
          <p className="text-caption1 text-label-2">Gastado</p>
          <p className="text-headline">{compact(stats.spent)}</p>
          {stats.spentChange.pct !== null && (
            <p className={`flex items-center text-caption1 ${up ? 'text-red' : 'text-green'}`}>
              {up ? <ArrowUpRight size={14} aria-hidden /> : <ArrowDownRight size={14} aria-hidden />}
              {formatPct(Math.abs(stats.spentChange.pct), 0)} vs {prevName}
            </p>
          )}
        </div>
        <div className="card p-3">
          <p className="text-caption1 text-label-2">Ingresado</p>
          <p className="text-headline">{compact(stats.income)}</p>
        </div>
        <div className="card p-3">
          <p className="text-caption1 text-label-2">Ahorro</p>
          <p className="text-headline">{stats.rate === null ? '—' : formatPct(stats.rate, 0)}</p>
          <p className="text-caption1 text-label-2">de lo que entró</p>
        </div>
      </div>
      {stats.unconvertedUSD > 0 && <p className="px-6 pt-2 text-footnote text-orange">Hay gastos en dólares sin contar: cargá la cotización en Ajustes.</p>}

      <ChartCard title={`¿En qué se fue en ${monthName}?`} subtitle="Las compras en cuotas cuentan de a una cuota por mes. Tocá una categoría para ver sus movimientos.">
        {stats.categories.length === 0 ? (
          <p className="py-4 text-center text-subhead text-label-2">Sin gastos este mes.</p>
        ) : (
          <ul className="-mx-1">
            {stats.categories.map((c) => (
              <li key={c.categoryId}>
                <button type="button" onClick={() => openCategory(c.categoryId)} className="w-full rounded-lg px-1 py-2 text-left active:bg-fill-2">
                  <div className="flex items-baseline justify-between gap-2 text-subhead">
                    <span className="truncate">
                      <span aria-hidden>{c.icon}</span> {c.name}
                    </span>
                    <span className="shrink-0 text-label-2">
                      <span className="tabular font-semibold text-label">{money(c.amount)}</span> · {c.pct > 0 && c.pct < 0.005 ? "<1" : Math.round(c.pct * 100)} %
                    </span>
                  </div>
                  {/* Una sola serie → un solo color; la longitud es el dato. Punta redondeada, base recta. */}
                  <div className="mt-1 h-2.5 rounded-r-[4px] bg-viz-1" style={{ width: `${Math.max(1, (c.amount / maxCategory) * 100)}%` }} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>

      <ChartCard
        title="Gasto de los últimos 6 meses"
        subtitle={`Promedio ${money(avg)}. Tocá un mes para verlo.`}
        table={{ columns: ['Mes', 'Gastado'], rows: stats.trend.map((t) => [formatPeriod(t.month), money(t.spent)]) }}
      >
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.trend.map((t) => ({ ...t, label: shortMonth(t.month) }))} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={AXIS.grid} />
              <XAxis dataKey="label" tick={AXIS.tick} axisLine={AXIS.line} tickLine={false} />
              <YAxis tickFormatter={(v: number) => axisMoney(v)} tick={AXIS.tick} axisLine={false} tickLine={false} width={60} tickCount={4} />
              <ReferenceLine y={avg} stroke="var(--viz-muted)" strokeWidth={1} label={{ value: 'promedio', position: 'insideTopLeft', fill: 'var(--viz-muted)', fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: 'var(--color-fill-2)' }}
                content={({ active, payload }) =>
                  active && payload?.[0] ? <ChartTooltip title={formatPeriodLong((payload[0].payload as { month: Period }).month)} rows={[{ name: 'Gastado', value: Number(payload[0].value), color: seriesColor(1) }]} hide={hide} /> : null
                }
              />
              <Bar dataKey="spent" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={!reduced} onClick={(d) => setMonth((d as unknown as { month: Period }).month)} className="cursor-pointer">
                {/* Énfasis: el mes elegido en color, el resto en gris. */}
                {stats.trend.map((t) => (
                  <Cell key={t.month} fill={t.month === month ? seriesColor(1) : 'var(--viz-deemph)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title="Gastos e ingresos"
        subtitle="Mismo eje para los dos: la diferencia es lo que quedó."
        table={{ columns: ['Mes', 'Gastos', 'Ingresos', 'Quedó'], rows: stats.trend.map((t) => [formatPeriod(t.month), money(t.spent), money(t.income), money(t.income - t.spent)]) }}
      >
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.trend.map((t) => ({ ...t, label: shortMonth(t.month) }))} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke={AXIS.grid} />
              <XAxis dataKey="label" tick={AXIS.tick} axisLine={AXIS.line} tickLine={false} />
              <YAxis tickFormatter={(v: number) => axisMoney(v)} tick={AXIS.tick} axisLine={false} tickLine={false} width={60} tickCount={4} />
              <Tooltip
                cursor={{ fill: 'var(--color-fill-2)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const t = payload[0]!.payload as { month: Period; spent: number; income: number }
                  return (
                    <ChartTooltip
                      title={formatPeriodLong(t.month)}
                      rows={[{ name: 'Gastos', value: t.spent, color: seriesColor(1) }, { name: 'Ingresos', value: t.income, color: seriesColor(2) }]}
                      hide={hide}
                    />
                  )
                }}
              />
              <Bar dataKey="spent" name="Gastos" fill={seriesColor(1)} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={!reduced} />
              <Bar dataKey="income" name="Ingresos" fill={seriesColor(2)} radius={[4, 4, 0, 0]} maxBarSize={16} isAnimationActive={!reduced} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Legend items={[{ name: 'Gastos', color: seriesColor(1) }, { name: 'Ingresos', color: seriesColor(2) }]} />
      </ChartCard>

      {cardsWithData.length > 0 && (
        <>
          <h2 className="px-5 pt-8 text-title3">Lo que viene</h2>
          <p className="px-5 text-footnote text-label-2">Desde hoy, no depende del mes elegido arriba.</p>
          <ChartCard
            title="Compromisos en cuotas"
            subtitle={`Próximo resumen: ${money(stats.commitments[0]?.total ?? 0)}. Incluye suscripciones con tarjeta.${stats.usdInCommitmentsUnconverted ? ' Sin cotización, los dólares no se suman.' : ''}`}
            table={{
              columns: ['Resumen', ...cardsWithData.map((c) => c.label.split(' •')[0]!), 'Total'],
              rows: stats.commitments.map((row) => [formatPeriod(row.period), ...cardsWithData.map((c) => money(row.byCard[c.id] ?? 0)), money(row.total)]),
            }}
          >
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commitmentData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={AXIS.grid} />
                  <XAxis dataKey="label" tick={AXIS.tick} axisLine={AXIS.line} tickLine={false} interval={1} />
                  <YAxis tickFormatter={(v: number) => axisMoney(v)} tick={AXIS.tick} axisLine={false} tickLine={false} width={60} tickCount={4} />
                  <Tooltip
                    cursor={{ fill: 'var(--color-fill-2)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const row = payload[0]!.payload as { period: Period; total: number } & Record<string, number>
                      return (
                        <ChartTooltip
                          title={`Resumen ${formatPeriodLong(row.period).toLowerCase()}`}
                          rows={cardsWithData.map((c) => ({ name: c.label, value: row[c.id] ?? 0, color: seriesColor(c.slot) }))}
                          total={row.total}
                          hide={hide}
                        />
                      )
                    }}
                  />
                  {cardsWithData.map((c) => (
                    <Bar
                      key={c.id}
                      dataKey={c.id}
                      name={c.label}
                      stackId="cards"
                      fill={seriesColor(c.slot)}
                      maxBarSize={24}
                      isAnimationActive={!reduced}
                      shape={(props: unknown) => {
                        const p = props as { x?: number; y?: number; width?: number; height?: number; fill?: string; index?: number }
                        return <Segment {...p} isTop={topKey[p.index ?? 0] === c.id} />
                      }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {cardsWithData.length > 1 && <Legend items={cardsWithData.map((c) => ({ name: c.label, color: seriesColor(c.slot) }))} />}
          </ChartCard>
        </>
      )}
    </Screen>
  )
}
