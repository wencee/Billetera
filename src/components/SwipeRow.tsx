import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { create } from 'zustand'
import { project, snapAfterRelease } from '@/motion/physics'
import { springs } from '@/motion/springs'
import { useHorizontalPan } from '@/motion/useHorizontalPan'

/** Solo una fila abierta a la vez: al empezar a deslizar otra, la anterior se cierra. */
const useOpenRow = create<{ openKey: string | null; setOpenKey: (key: string | null) => void }>((set) => ({
  openKey: null,
  setOpenKey: (openKey) => set({ openKey }),
}))

const ACTION_WIDTH = 76

interface Props {
  rowKey: string
  children: ReactNode
  onPress?: () => void
  onEdit?: () => void
  onDelete: () => void
  deleteLabel?: string
}

/**
 * Fila que se desliza a la izquierda para mostrar Editar y Borrar, como en
 * Mail. Sigue al dedo 1:1; al soltar proyecta el impulso para decidir si queda
 * abierta o cerrada. Deslizar hasta el final borra directamente. Hacia la
 * derecha (donde no hay nada) resiste con elasticidad.
 */
export function SwipeRow({ rowKey, children, onPress, onEdit, onDelete, deleteLabel = 'Borrar' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const reduced = useReducedMotion() ?? false
  const dragged = useRef(false)
  const deleting = useRef(false)
  const openKey = useOpenRow((s) => s.openKey)
  const setOpenKey = useOpenRow((s) => s.setOpenKey)
  const actionsWidth = onEdit ? ACTION_WIDTH * 2 : ACTION_WIDTH

  const width = () => ref.current?.clientWidth ?? 360
  const to = useCallback(
    (target: number, velocity = 0) => animate(x, target, reduced ? { duration: 0.15 } : springs.momentum(velocity)),
    [x, reduced],
  )

  // Si se abrió otra fila, esta se cierra.
  useEffect(() => {
    if (openKey !== rowKey && x.get() !== 0 && !deleting.current) to(0)
  }, [openKey, rowKey, x, to])

  const remove = useCallback(
    (velocity = 0) => {
      deleting.current = true
      setOpenKey(null)
      const done = () => onDelete()
      if (reduced) {
        done()
        return
      }
      animate(x, -width(), { ...springs.dismiss, velocity }).then(done)
    },
    [onDelete, reduced, setOpenKey, x],
  )

  useHorizontalPan({
    ref,
    x,
    // A la izquierda se puede llevar hasta el ancho completo (borrar); a la derecha, 0 con resistencia.
    bounds: () => ({ min: -width(), max: 0 }),
    onStart: () => {
      dragged.current = true
      setOpenKey(rowKey)
    },
    onEnd: (velocity) => {
      const current = x.get()
      const w = width()
      const projected = current + project(velocity)
      if (current < -w * 0.6 || (current < -actionsWidth && projected < -w * 0.9)) {
        remove(velocity)
        return
      }
      const target = snapAfterRelease(current, velocity, [0, -actionsWidth])
      to(target, velocity)
      if (target === 0) setOpenKey(null)
    },
  })

  // El botón de borrar se estira cuando el dedo pasa las acciones (señal de "soltá y se borra").
  const actionsSize = useTransform(x, (v) => Math.max(actionsWidth, -v))
  const editOpacity = useTransform(x, (v) => (-v > width() * 0.6 ? 0 : 1))
  // Con la fila cerrada las acciones no se dibujan (si no, asoman por el borde redondeado).
  const actionsVisibility = useTransform(x, (v) => (v < -0.5 ? 'visible' : 'hidden'))

  return (
    <div ref={ref} className="relative overflow-hidden" style={{ touchAction: 'pan-y' }}>
      <motion.div className="absolute inset-y-0 right-0 flex" style={{ width: actionsSize, visibility: actionsVisibility }} aria-hidden={openKey !== rowKey}>
        {onEdit && (
          <motion.button
            type="button"
            style={{ opacity: editOpacity }}
            onClick={() => {
              to(0)
              setOpenKey(null)
              onEdit()
            }}
            className="flex w-[76px] shrink-0 flex-col items-center justify-center gap-1 bg-accent text-caption1 font-semibold text-white"
          >
            <Pencil size={20} aria-hidden />
            Editar
          </motion.button>
        )}
        <button
          type="button"
          onClick={() => remove()}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-red text-caption1 font-semibold text-white"
        >
          <Trash2 size={20} aria-hidden />
          {deleteLabel}
        </button>
      </motion.div>
      <motion.div
        className="relative bg-surface"
        style={{ x }}
        onClickCapture={(e) => {
          // Un arrastre no es un toque; y tocar una fila abierta solo la cierra.
          if (dragged.current) {
            dragged.current = false
            e.stopPropagation()
            e.preventDefault()
            return
          }
          if (x.get() !== 0) {
            e.stopPropagation()
            e.preventDefault()
            to(0)
            setOpenKey(null)
          }
        }}
        onClick={onPress}
        onPointerDown={() => {
          dragged.current = false
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}
