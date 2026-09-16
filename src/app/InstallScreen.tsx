import { Plus, Share, SquarePlus } from 'lucide-react'
import { Button } from '@/components/Pressable'

interface Props {
  onContinue?: () => void
  /** Cuando se muestra desde Ajustes, sin botón de "seguir en Safari". */
  embedded?: boolean
}

export function InstallScreen({ onContinue, embedded = false }: Props) {
  const steps = [
    { Icon: Share, text: 'Tocá el botón Compartir en la barra de Safari.' },
    { Icon: SquarePlus, text: 'Elegí "Agregar a pantalla de inicio".' },
    { Icon: Plus, text: 'Tocá "Agregar" arriba a la derecha. Listo: abrila desde el ícono.' },
  ]
  return (
    <div
      className={embedded ? 'px-4' : 'flex h-full flex-col overflow-y-auto bg-bg px-6'}
      style={embedded ? undefined : { paddingTop: 'calc(var(--safe-top) + 2rem)', paddingBottom: 'calc(var(--safe-bottom) + 2rem)' }}
    >
      {!embedded && (
        <>
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#3a8dff] to-[#5e5ce6] text-4xl shadow-lg">
            👛
          </div>
          <h1 className="text-largetitle">Instalá Billetera en tu iPhone</h1>
          <p className="mt-2 text-body text-label-2">
            Funciona como una app: pantalla completa, sin conexión y con tus datos guardados solo en este teléfono.
          </p>
        </>
      )}
      <ol className="mt-6 space-y-4">
        {steps.map(({ Icon, text }, i) => (
          <li key={i} className="card flex items-center gap-4 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tint/12 text-tint">
              <Icon size={24} aria-hidden />
            </span>
            <span className="text-body">
              <span className="mr-1 font-semibold">{i + 1}.</span>
              {text}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-footnote text-label-2">
        Si no ves "Agregar a pantalla de inicio", deslizá la lista de opciones del menú Compartir hacia arriba.
      </p>
      {!embedded && onContinue && (
        <div className="mt-auto pt-8">
          <Button variant="secondary" className="w-full" onClick={onContinue}>
            Seguir en Safari igual
          </Button>
        </div>
      )}
    </div>
  )
}
