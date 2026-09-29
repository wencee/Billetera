import { create } from 'zustand'
import { addPeriods, firstDayOfPeriod, lastDayOfPeriod, periodOf, todayISO } from '@/core/dates'
import type { MovementFilter, MovementKind } from '@/core/movements'

export type RangePreset = 'all' | 'thisMonth' | 'lastMonth' | 'last3' | 'custom'

export const RANGE_LABEL: Record<RangePreset, string> = {
  all: 'Todo',
  thisMonth: 'Este mes',
  lastMonth: 'Mes pasado',
  last3: 'Últimos 3 meses',
  custom: 'Elegir fechas',
}

export type KindChip = 'all' | 'expense' | 'income' | 'card' | 'transfer'

export const KIND_CHIPS: { value: KindChip; label: string; kinds: MovementKind[] }[] = [
  { value: 'all', label: 'Todos', kinds: [] },
  { value: 'expense', label: 'Gastos', kinds: ['expense'] },
  { value: 'card', label: 'Tarjeta', kinds: ['card', 'cardPayment'] },
  { value: 'income', label: 'Ingresos', kinds: ['income'] },
  { value: 'transfer', label: 'Transferencias', kinds: ['transfer'] },
]

export interface FilterState {
  query: string
  kind: KindChip
  range: RangePreset
  from: string
  to: string
  categoryIds: string[]
  methods: NonNullable<MovementFilter['methods']>[number][]
  cardIds: string[]
  accountIds: string[]
  currencies: ('ARS' | 'USD')[]
}

export const EMPTY_FILTERS: FilterState = {
  query: '', kind: 'all', range: 'all', from: '', to: '', categoryIds: [], methods: [], cardIds: [], accountIds: [], currencies: [],
}

/** Rango de fechas del preset, relativo a hoy. */
export function rangeDates(state: Pick<FilterState, 'range' | 'from' | 'to'>, today = todayISO()): { from?: string; to?: string } {
  const month = periodOf(today)
  switch (state.range) {
    case 'all': return {}
    case 'thisMonth': return { from: firstDayOfPeriod(month), to: lastDayOfPeriod(month) }
    case 'lastMonth': return { from: firstDayOfPeriod(addPeriods(month, -1)), to: lastDayOfPeriod(addPeriods(month, -1)) }
    case 'last3': return { from: firstDayOfPeriod(addPeriods(month, -2)), to: lastDayOfPeriod(month) }
    case 'custom': return { ...(state.from ? { from: state.from } : {}), ...(state.to ? { to: state.to } : {}) }
  }
}

export function toMovementFilter(state: FilterState): MovementFilter {
  const kinds = KIND_CHIPS.find((k) => k.value === state.kind)?.kinds ?? []
  return {
    query: state.query,
    ...rangeDates(state),
    kinds,
    categoryIds: state.categoryIds,
    methods: state.methods,
    cardIds: state.cardIds,
    accountIds: state.accountIds,
    currencies: state.currencies,
  }
}

/** Los filtros sobreviven al ir a editar un movimiento y volver. */
export const useMovementFilters = create<{ filters: FilterState; set: (patch: Partial<FilterState>) => void; reset: () => void }>((set) => ({
  filters: EMPTY_FILTERS,
  set: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  reset: () => set((s) => ({ filters: { ...EMPTY_FILTERS, query: s.filters.query, kind: s.filters.kind } })),
}))
