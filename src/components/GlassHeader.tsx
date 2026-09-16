import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Pressable } from './Pressable'

interface Props {
  title: string
  /** Se muestra en el header solo cuando el contenido scrolleó (estilo large title de iOS). */
  showTitle: boolean
  /** Texto del botón de volver; si está, se muestra. */
  back?: string
  right?: ReactNode
}

/**
 * Barra superior translúcida. Cuando el contenido está arriba del todo es
 * transparente; al scrollear se materializa el vidrio (scroll edge effect).
 */
export function GlassHeader({ title, showTitle, back, right }: Props) {
  const navigate = useNavigate()
  return (
    <header
      className={`absolute inset-x-0 top-0 z-20 transition-[background-color,backdrop-filter] duration-200 ${showTitle ? 'glass' : ''}`}
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div className="relative flex items-center justify-center" style={{ height: 'var(--header-h)' }}>
        {back && (
          <Pressable
            pressScale={0.95}
            className="absolute left-1 flex items-center pr-3 text-body text-tint"
            onClick={() => navigate(-1)}
            aria-label="Volver"
          >
            <ChevronLeft size={28} strokeWidth={2.2} className="-ml-1" />
            <span className="-ml-1">{back}</span>
          </Pressable>
        )}
        <span
          className={`text-headline transition-opacity duration-200 ${showTitle ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden={!showTitle}
        >
          {title}
        </span>
        {right && <div className="absolute right-2 flex items-center">{right}</div>}
      </div>
      <div className={`hairline transition-opacity duration-200 ${showTitle ? 'opacity-100' : 'opacity-0'}`} />
    </header>
  )
}
