import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Pressable } from '@/components/Pressable'
import { springs } from '@/motion/springs'

/**
 * Aviso "Hay una versión nueva". Además de la comprobación que hace el
 * navegador, revisa cada hora y cada vez que la app vuelve al frente
 * (las apps instaladas en iOS no siempre chequean al abrir).
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => void registration.update()
      const interval = setInterval(check, 60 * 60 * 1000)
      const onVisible = () => {
        if (document.visibilityState === 'visible') check()
      }
      document.addEventListener('visibilitychange', onVisible)
      window.addEventListener('beforeunload', () => clearInterval(interval), { once: true })
    },
  })

  useEffect(() => {
    if (needRefresh) console.info('[pwa] versión nueva disponible')
  }, [needRefresh])

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
          style={{ top: 'calc(var(--safe-top) + 8px)' }}
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={springs.default}
        >
          <Pressable
            onClick={() => void updateServiceWorker(true)}
            className="pointer-events-auto glass rounded-full px-5 py-2.5 text-subhead font-semibold text-tint shadow-lg"
          >
            Hay una versión nueva, tocá para actualizar
          </Pressable>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
