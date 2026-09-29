import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { formatMoney } from '@/core/format'

/** Tinta de ejes y grilla (tokens de index.css). */
export const AXIS = {
  tick: { fill: 'var(--viz-muted)', fontSize: 11 },
  line: { stroke: 'var(--viz-axis)' },
  grid: 'var(--viz-grid)',
} as const

export const seriesColor = (slot: number) => `var(--viz-${Math.min(8, Math.max(1, slot))})`

interface TooltipRow {
  name: string
  value: number
  color: string
}

/**
 * Tooltip de los gráficos: el valor manda (fuerte), el nombre acompaña; cada
 * fila lleva una rayita del color de la serie en vez de un cuadrado.
 */
export function ChartTooltip({ title, rows, total, hide }: { title: string; rows: TooltipRow[]; total?: number; hide: boolean }) {
  return (
    <div className="glass min-w-40 rounded-xl px-3 py-2 text-footnote shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
      <p className="pb-1 text-caption1 text-label-2">{title}</p>
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2 py-0.5">
          <span className="h-0.5 w-3 rounded-full" style={{ background: r.color }} aria-hidden />
          <span className="tabular font-semibold text-label">{formatMoney(r.value, 'ARS', { hide, fractionDigits: 0 })}</span>
          <span className="text-label-2">{r.name}</span>
        </div>
      ))}
      {total !== undefined && rows.length > 1 && (
        <p className="mt-1 border-t border-separator/60 pt-1 text-label-2">
          Total <span className="tabular font-semibold text-label">{formatMoney(total, 'ARS', { hide, fractionDigits: 0 })}</span>
        </p>
      )}
    </div>
  )
}

/** Leyenda: marca del mismo tipo que el gráfico (rectángulo para barras). */
export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-footnote text-label-2">
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} aria-hidden />
          {i.name}
        </li>
      ))}
    </ul>
  )
}

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  /** Versión en tabla del gráfico: nada queda solo dentro del tooltip. */
  table?: { columns: string[]; rows: (string | number)[][] }
}

export function ChartCard({ title, subtitle, children, table }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false)
  return (
    <section className="px-4 pt-5">
      <div className="card p-4">
        <h2 className="text-headline">{title}</h2>
        {subtitle && <p className="text-footnote text-label-2">{subtitle}</p>}
        <div className="pt-3">{children}</div>
        {table && (
          <>
            <button
              type="button"
              aria-expanded={showTable}
              onClick={() => setShowTable((v) => !v)}
              className="mt-2 flex min-h-11 items-center gap-1 text-subhead text-tint active:opacity-60"
            >
              {showTable ? 'Ocultar datos' : 'Ver datos'}
              <ChevronDown size={16} className={`transition-transform duration-200 ${showTable ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {showTable && (
              <div className="overflow-x-auto">
                <table className="w-full text-footnote">
                  <thead>
                    <tr className="text-label-2">
                      {table.columns.map((c, i) => (
                        <th key={c} scope="col" className={`py-1 font-normal ${i === 0 ? 'text-left' : 'text-right'}`}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((r, ri) => (
                      <tr key={ri} className="border-t border-separator/40">
                        {r.map((cell, ci) => (
                          <td key={ci} className={`py-1.5 ${ci === 0 ? 'text-left' : 'tabular text-right'}`}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

interface SegmentProps {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  /** El de arriba de la pila: lleva la punta redondeada y no deja hueco. */
  isTop: boolean
}

/**
 * Segmento de barra apilada: punta redondeada (4px) solo arriba de la pila,
 * base recta, y 2px de hueco (color de fondo) entre segmentos.
 */
export function Segment({ x = 0, y = 0, width = 0, height = 0, fill, isTop }: SegmentProps) {
  const gap = isTop ? 0 : 2
  const h = height - gap
  if (h <= 0 || width <= 0) return null
  const top = y + gap
  const r = isTop ? Math.min(4, width / 2, h) : 0
  const d = `M${x},${top + h} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + width - r},${top} Q${x + width},${top} ${x + width},${top + r} L${x + width},${top + h} Z`
  return <path d={d} fill={fill} />
}
