import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Pressable } from './Pressable'

/** Grupo de filas estilo "inset grouped" de iOS. */
export function ListGroup({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <section className="px-4 pt-6">
      {title && <h3 className="mb-2 px-4 text-footnote uppercase text-label-2">{title}</h3>}
      <div className="card overflow-hidden">{children}</div>
      {footer && <p className="mt-2 px-4 text-footnote text-label-2">{footer}</p>}
    </section>
  )
}

interface RowProps {
  label: string
  value?: ReactNode
  icon?: ReactNode
  onPress?: () => void
  destructive?: boolean
  chevron?: boolean
  last?: boolean
}

export function ListRow({ label, value, icon, onPress, destructive, chevron, last }: RowProps) {
  const content = (
    <>
      {icon && <span className="mr-3 flex h-7 w-7 items-center justify-center">{icon}</span>}
      <span className={`flex-1 text-left text-body ${destructive ? 'text-red' : ''}`}>{label}</span>
      {value !== undefined && <span className="ml-3 text-body text-label-2 tabular">{value}</span>}
      {chevron && <ChevronRight size={18} className="ml-1 text-label-3" aria-hidden />}
    </>
  )
  const cls = `flex w-full items-center px-4 py-3 ${last ? '' : 'border-b border-separator/60'}`
  return onPress ? (
    <Pressable pressScale={1} onClick={onPress} className={`${cls} active:bg-fill-2`}>
      {content}
    </Pressable>
  ) : (
    <div className={cls}>{content}</div>
  )
}
