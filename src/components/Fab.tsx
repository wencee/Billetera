import { AnimatePresence } from 'motion/react'
import { Plus } from 'lucide-react'
import { springs } from '@/motion/springs'
import { Pressable } from './Pressable'

interface Props {
  onPress: () => void
  /** Se esconde en formularios y detalles para no tapar sus botones. */
  visible: boolean
}

/** Botón flotante "+" por encima de la tab bar, en las pantallas principales. */
export function Fab({ onPress, visible }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <Pressable
          key="fab"
          pressScale={0.9}
          onClick={onPress}
          aria-label="Cargar un gasto"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={springs.default}
          className="absolute z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_24px_rgba(0,94,203,0.35)]"
          style={{ right: 'calc(var(--safe-right) + 1rem)', bottom: 'calc(var(--safe-bottom) + var(--tabbar-h) + 1rem)' }}
        >
          <Plus size={30} strokeWidth={2.5} aria-hidden />
        </Pressable>
      )}
    </AnimatePresence>
  )
}
