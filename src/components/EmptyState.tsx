import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <div className="mb-4 text-label-3">{icon}</div>
      <h2 className="text-title3">{title}</h2>
      {description && <p className="mt-1 text-subhead text-label-2">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
