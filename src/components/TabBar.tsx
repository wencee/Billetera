import { ArrowLeftRight, CreditCard, House, PieChart, PiggyBank } from 'lucide-react'
import { NavLink } from 'react-router'

const TABS = [
  { to: '/', label: 'Inicio', Icon: House, end: true },
  { to: '/tarjetas', label: 'Tarjetas', Icon: CreditCard, end: false },
  { to: '/movimientos', label: 'Movimientos', Icon: ArrowLeftRight, end: false },
  { to: '/metas', label: 'Metas', Icon: PiggyBank, end: false },
  { to: '/estadisticas', label: 'Estadísticas', Icon: PieChart, end: false },
] as const

/** Barra de pestañas inferior, translúcida, respetando la safe area de abajo. */
export function TabBar() {
  return (
    <nav
      className="glass glass-edge-top absolute inset-x-0 bottom-0 z-20"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
      aria-label="Secciones"
    >
      <ul className="flex items-stretch justify-around" style={{ height: 'var(--tabbar-h)' }}>
        {TABS.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-0.5 pt-1 transition-colors duration-100 active:opacity-60 ${isActive ? 'text-tint' : 'text-label-2'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={26} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                  <span className="text-caption2 font-medium">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
