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
  /** Adónde ir si no hay historial (la app se abrió directo en esta pantalla). */
  backTo?: string
  right?: ReactNode
  /** true en pantallas sin título grande: el del header es el encabezado de la pantalla. */
  isHeading?: boolean
}

/**
 * Barra superior translúcida. Cuando el contenido está arriba del todo es
 * transparente; al scrollear se materializa el vidrio (scroll edge effect).
 */
export function GlassHeader({ title, showTitle, back, backTo = '/', right, isHeading = false }: Props) {
  const navigate = useNavigate()
  const TitleTag = isHeading ? 'h1' : 'span'
  const goBack = () => {
    // react-router guarda el índice de la entrada en history.state; 0 = primera pantalla de la sesión.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(backTo, { replace: true })
  }
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
            onClick={goBack}
            aria-label={`Volver a ${back}`}
          >
            <ChevronLeft size={28} strokeWidth={2.2} className="-ml-1" />
            <span className="-ml-1">{back}</span>
          </Pressable>
        )}
        {/* En pantallas de detalle este es el único título (h1); en las de título grande es un
            eco visual del h1 del contenido y se oculta para lectores de pantalla. */}
        <TitleTag
          className={`max-w-[52%] truncate text-headline transition-opacity duration-200 ${showTitle ? 'opacity-100' : 'opacity-0'}`}
          aria-hidden={isHeading ? undefined : true}
        >
          {title}
        </TitleTag>
        {right && <div className="absolute right-2 flex items-center">{right}</div>}
      </div>
      <div className={`hairline transition-opacity duration-200 ${showTitle ? 'opacity-100' : 'opacity-0'}`} />
    </header>
  )
}
