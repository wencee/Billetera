import { Plus } from 'lucide-react'
import { Pressable } from './Pressable'

interface Props {
  onPress: () => void
}

/** Botón flotante "+" siempre visible, por encima de la tab bar. */
export function Fab({ onPress }: Props) {
  return (
    <Pressable
      pressScale={0.9}
      onClick={onPress}
      aria-label="Cargar un gasto"
      className="absolute z-30 flex h-14 w-14 items-center justify-center rounded-full bg-tint text-white shadow-[0_8px_24px_rgba(0,122,255,0.35)]"
      style={{ right: 'calc(var(--safe-right) + 1rem)', bottom: 'calc(var(--safe-bottom) + var(--tabbar-h) + 1rem)' }}
    >
      <Plus size={30} strokeWidth={2.5} aria-hidden />
    </Pressable>
  )
}
