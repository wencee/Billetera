import { useEffect } from 'react'
import { badgeCount } from '@/core/alerts'
import { useDashboard } from '@/features/home/dashboard'
import { setBadge } from '@/lib/badge'

/** Mantiene el número del ícono igual a los avisos que piden acción. Se monta solo si está activado. */
export function BadgeSync() {
  const dash = useDashboard()
  const count = dash ? badgeCount(dash.alerts) : null
  useEffect(() => {
    if (count !== null) void setBadge(count)
  }, [count])
  useEffect(() => () => void setBadge(0), [])
  return null
}
