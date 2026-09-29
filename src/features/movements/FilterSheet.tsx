import { Chips } from '@/components/form/Chips'
import { DateField } from '@/components/form/TextField'
import { MultiChips } from '@/components/form/MultiChips'
import { Button } from '@/components/Pressable'
import { Sheet } from '@/components/Sheet'
import { useAccounts, useAllCards, useCategories } from '@/db/hooks'
import { METHOD_LABEL, type AnyMethod } from '@/lib/labels'
import { RANGE_LABEL, useMovementFilters, type RangePreset } from './filterStore'

const METHOD_OPTIONS: AnyMethod[] = ['cash', 'debit', 'transfer', 'wallet', 'card', 'transfer-internal', 'card-payment']

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-5">
      <h3 className="mb-2 text-footnote uppercase text-label-2">{title}</h3>
      {children}
    </section>
  )
}

export function FilterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const filters = useMovementFilters((s) => s.filters)
  const set = useMovementFilters((s) => s.set)
  const reset = useMovementFilters((s) => s.reset)
  const categories = useCategories('expense')
  const accounts = useAccounts(true)
  const cards = useAllCards()

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filtros"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={reset}>
            Limpiar
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Ver resultados
          </Button>
        </div>
      }
    >
      <Section title="Período">
        <div className="-mx-4">
          <Chips<RangePreset>
            aria-label="Período"
            value={filters.range}
            onChange={(range) => set({ range })}
            options={(Object.keys(RANGE_LABEL) as RangePreset[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }))}
          />
        </div>
        {filters.range === 'custom' && (
          <div className="card mt-3 divide-y divide-separator/60">
            <label className="flex min-h-12 items-center gap-3 px-4">
              <span className="text-body">Desde</span>
              <DateField value={filters.from} onChange={(e) => set({ from: e.target.value })} />
            </label>
            <label className="flex min-h-12 items-center gap-3 px-4">
              <span className="text-body">Hasta</span>
              <DateField value={filters.to} onChange={(e) => set({ to: e.target.value })} />
            </label>
          </div>
        )}
      </Section>

      <Section title="Categoría">
        <MultiChips aria-label="Categorías" values={filters.categoryIds} onChange={(categoryIds) => set({ categoryIds })} options={(categories ?? []).map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))} />
      </Section>

      <Section title="Medio de pago">
        <MultiChips aria-label="Medios" values={filters.methods} onChange={(methods) => set({ methods })} options={METHOD_OPTIONS.map((m) => ({ value: m, label: METHOD_LABEL[m] }))} />
      </Section>

      {cards && cards.length > 0 && (
        <Section title="Tarjeta">
          <MultiChips aria-label="Tarjetas" values={filters.cardIds} onChange={(cardIds) => set({ cardIds })} options={cards.map((c) => ({ value: c.id, label: `${c.name} •${c.last4}` }))} />
        </Section>
      )}

      {accounts && accounts.length > 0 && (
        <Section title="Cuenta">
          <MultiChips aria-label="Cuentas" values={filters.accountIds} onChange={(accountIds) => set({ accountIds })} options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
        </Section>
      )}

      <Section title="Moneda">
        <MultiChips aria-label="Monedas" values={filters.currencies} onChange={(currencies) => set({ currencies })} options={[{ value: 'ARS' as const, label: 'Pesos' }, { value: 'USD' as const, label: 'Dólares' }]} />
      </Section>
    </Sheet>
  )
}
