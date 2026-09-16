import { useRef, type ReactNode } from 'react'
import { useScrolled } from '@/lib/hooks'
import { GlassHeader } from './GlassHeader'

interface Props {
  title: string
  back?: string
  backTo?: string
  right?: ReactNode
  /** Sin título grande en el contenido (para pantallas de detalle). */
  compact?: boolean
  children: ReactNode
}

/**
 * Pantalla estándar: header de vidrio + contenedor de scroll propio con
 * padding para safe areas, header y tab bar. El contenido pasa por debajo.
 */
export function Screen({ title, back, backTo, right, compact = false, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const scrolled = useScrolled(ref, compact ? 0 : 24)
  return (
    <>
      <GlassHeader title={title} showTitle={compact || scrolled} {...(back ? { back } : {})} {...(backTo ? { backTo } : {})} right={right} />
      <div ref={ref} className="screen-scroll">
        {!compact && <h1 className="px-4 pb-2 pt-1 text-largetitle">{title}</h1>}
        {children}
      </div>
    </>
  )
}
