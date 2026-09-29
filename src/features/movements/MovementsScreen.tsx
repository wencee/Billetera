import { ArrowLeftRight, Plus, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from '@/app/toast'
import { EmptyState } from '@/components/EmptyState'
import { Chips } from '@/components/form/Chips'
import { MovementRow } from '@/components/MovementRow'
import { Button, Pressable } from '@/components/Pressable'
import { Screen } from '@/components/Screen'
import { SearchField } from '@/components/SearchField'
import { SwipeRow } from '@/components/SwipeRow'
import { todayISO } from '@/core/dates'
import { formatDayHeader, formatMoney } from '@/core/format'
import { activeFilterCount, filterMovements, groupByDay, movementTotals, type Movement } from '@/core/movements'
import { deleteMovement } from '@/db'
import { useCategoryMap, useMovements, useSettings } from '@/db/hooks'
import { FilterSheet } from './FilterSheet'
import { EMPTY_FILTERS, KIND_CHIPS, RANGE_LABEL, toMovementFilter, useMovementFilters, type KindChip } from './filterStore'
import { NewMovementSheet } from './NewMovementSheet'
import { movementEditPath, movementOpenPath } from './routes'

const PAGE = 150

export function MovementsScreen() {
  const navigate = useNavigate()
  const movements = useMovements()
  const categories = useCategoryMap()
  const settings = useSettings()
  const filters = useMovementFilters((s) => s.filters)
  const setFilters = useMovementFilters((s) => s.set)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const privateMode = settings?.privateMode ?? false
  const today = todayISO()

  const movementFilter = useMemo(() => toMovementFilter(filters), [filters])
  const filtered = useMemo(
    () => (movements ? filterMovements(movements, movementFilter, (id) => categories?.get(id)?.name) : []),
    [movements, movementFilter, categories],
  )
  const totals = useMemo(() => movementTotals(filtered), [filtered])
  const groups = useMemo(() => groupByDay(filtered.slice(0, limit)), [filtered, limit])
  const extraFilters = activeFilterCount(movementFilter)

  const remove = async (m: Movement) => {
    const undo = await deleteMovement(m.kind, m.id)
    if (undo) toast(m.kind === 'card' ? 'Compra borrada' : 'Movimiento borrado', { actionLabel: 'Deshacer', onAction: undo })
  }

  const addButton = (
    <Pressable pressScale={0.9} aria-label="Nuevo movimiento" onClick={() => setNewOpen(true)} className="flex items-center justify-center text-tint">
      <Plus size={26} />
    </Pressable>
  )

  return (
    <Screen title="Movimientos" right={addButton}>
      <div className="flex items-center gap-2 px-4">
        <div className="flex-1">
          <SearchField value={filters.query} onChange={(query) => setFilters({ query })} placeholder="Buscar comercio, nota o monto" />
        </div>
        <Pressable pressScale={0.9} aria-label={`Filtros${extraFilters ? ` (${extraFilters} activos)` : ''}`} onClick={() => setFiltersOpen(true)} className="relative flex items-center justify-center rounded-xl text-tint">
          <SlidersHorizontal size={22} />
          {extraFilters > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-tint px-1 text-caption2 font-bold text-white">{extraFilters}</span>
          )}
        </Pressable>
      </div>
      <div className="pt-3">
        <Chips<KindChip> aria-label="Tipo" value={filters.kind} onChange={(kind) => setFilters({ kind })} options={KIND_CHIPS.map((k) => ({ value: k.value, label: k.label }))} />
      </div>

      {movements && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 px-4 pt-4">
          <div className="card p-3">
            <p className="text-footnote text-label-2">Gastado{filters.range !== 'all' ? ` · ${RANGE_LABEL[filters.range].toLowerCase()}` : ''}</p>
            <p className="tabular text-title3">{formatMoney(totals.spent.ARS, 'ARS', { hide: privateMode, fractionDigits: 0 })}</p>
            {totals.spent.USD > 0 && <p className="tabular text-footnote text-label-2">+ {formatMoney(totals.spent.USD, 'USD', { hide: privateMode })}</p>}
          </div>
          <div className="card p-3">
            <p className="text-footnote text-label-2">Ingresado</p>
            <p className="tabular text-title3 text-green">{formatMoney(totals.income.ARS, 'ARS', { hide: privateMode, fractionDigits: 0 })}</p>
            {totals.income.USD > 0 && <p className="tabular text-footnote text-label-2">+ {formatMoney(totals.income.USD, 'USD', { hide: privateMode })}</p>}
          </div>
        </div>
      )}

      {movements && filtered.length === 0 && (
        <EmptyState
          icon={<ArrowLeftRight size={56} strokeWidth={1.5} />}
          title={movements.length === 0 ? 'Todavía no hay movimientos' : 'Nada coincide con la búsqueda'}
          description={movements.length === 0 ? 'Tocá el botón + para cargar tu primer gasto.' : 'Probá con otras palabras o limpiá los filtros.'}
          {...(movements.length > 0 && (extraFilters > 0 || filters.query || filters.kind !== 'all')
            ? { action: <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>Limpiar filtros</Button> }
            : {})}
        />
      )}

      {groups.map((g) => (
        <section key={g.date} className="px-4 pt-5">
          <div className="mb-2 flex items-baseline justify-between px-4">
            <h3 className="text-footnote uppercase text-label-2">{formatDayHeader(g.date, today)}</h3>
            {g.net.ARS !== 0 && (
              <span className={`tabular text-footnote ${g.net.ARS > 0 ? 'text-green' : 'text-label-2'}`}>
                {formatMoney(g.net.ARS, 'ARS', { hide: privateMode, fractionDigits: 0, signed: true })}
              </span>
            )}
          </div>
          <div className="card overflow-hidden">
            {g.items.map((m, i) => (
              <SwipeRow
                key={m.key}
                rowKey={m.key}
                onPress={() => navigate(movementOpenPath(m))}
                {...(m.kind !== 'cardPayment' ? { onEdit: () => navigate(movementEditPath(m)) } : {})}
                onDelete={() => void remove(m)}
              >
                <MovementRow movement={m} category={m.categoryId ? categories?.get(m.categoryId) : undefined} privateMode={privateMode} last={i === g.items.length - 1} />
              </SwipeRow>
            ))}
          </div>
        </section>
      ))}

      {filtered.length > limit && (
        <div className="px-4 pt-5">
          <Button variant="secondary" className="w-full" onClick={() => setLimit((l) => l + PAGE)}>
            Mostrar más ({filtered.length - limit})
          </Button>
        </div>
      )}

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} />
      <NewMovementSheet open={newOpen} onClose={() => setNewOpen(false)} />
    </Screen>
  )
}
