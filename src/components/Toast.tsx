import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import { useToastStore } from '@/app/toast'
import { springs } from '@/motion/springs'
import { Pressable } from './Pressable'

export function ToastHost() {
  const toast = useToastStore((s) => s.toast)
  const dismiss = useToastStore((s) => s.dismiss)
  const reduced = useReducedMotion() ?? false

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => dismiss(toast.id), toast.duration ?? 5000)
    return () => clearTimeout(t)
  }, [toast, dismiss])

  return (
    <div className="pointer-events-none absolute inset-x-0 z-40 flex justify-center px-4" style={{ bottom: 'calc(var(--safe-bottom) + var(--tabbar-h) + 0.75rem)' }}>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            className="pointer-events-auto glass flex max-w-full items-center gap-3 rounded-2xl py-2 pl-4 pr-2 shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={reduced ? { duration: 0.2 } : springs.default}
          >
            <span className="text-subhead">{toast.message}</span>
            {toast.actionLabel && (
              <Pressable
                pressScale={0.95}
                className="rounded-xl px-3 text-subhead font-semibold text-tint"
                onClick={() => {
                  void toast.onAction?.()
                  dismiss(toast.id)
                }}
              >
                {toast.actionLabel}
              </Pressable>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
