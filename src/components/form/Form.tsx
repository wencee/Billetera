import type { ReactNode } from 'react'

/** Grupo de campos estilo iOS (título en mayúsculas + tarjeta con filas). */
export function FormGroup({ title, footer, error, children }: { title?: string; footer?: string; error?: string; children: ReactNode }) {
  return (
    <section className="px-4 pt-5">
      {title && <h3 className="mb-2 px-4 text-footnote uppercase text-label-2">{title}</h3>}
      <div className="card divide-y divide-separator/60 overflow-hidden">{children}</div>
      {error ? <p className="mt-2 px-4 text-footnote text-red">{error}</p> : footer ? <p className="mt-2 px-4 text-footnote text-label-2">{footer}</p> : null}
    </section>
  )
}

/** Fila etiqueta + control. El control va a la derecha, alineado como en Ajustes de iOS. */
export function FormRow({ label, error, children, stacked = false }: { label: string; error?: string; children: ReactNode; stacked?: boolean }) {
  return (
    <label className={`flex min-h-12 px-4 py-2 ${stacked ? 'flex-col gap-1' : 'items-center gap-3'}`}>
      <span className={`text-body ${stacked ? 'text-footnote uppercase text-label-2' : 'shrink-0'} ${error ? 'text-red' : ''}`}>{label}</span>
      <span className={`flex min-w-0 items-center ${stacked ? '' : 'flex-1 justify-end'}`}>{children}</span>
      {error && !stacked && <span className="sr-only">{error}</span>}
    </label>
  )
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="px-4 pb-2 text-footnote text-red">{message}</p> : null
}
