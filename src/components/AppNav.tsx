import { NavLink, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Contact,
  LayoutDashboard,
  LogOut,
  Moon,
  RadioTower,
  Settings,
  Sun,
} from 'lucide-react'
import { getSession, logout } from '../lib/auth'
import { useTheme } from '../context/ThemeContext'

const LINKS = [
  { to: '/dashboard', label: 'Despacho', icon: LayoutDashboard },
  { to: '/conductores', label: 'Agenda', icon: Contact },
  { to: '/servicios', label: 'Servicios', icon: Briefcase },
  { to: '/configuracion', label: 'Config', icon: Settings },
]

export default function AppNav() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const session = getSession()
  const initials = (session?.operator ?? 'OP')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="flex h-full w-[76px] shrink-0 flex-col items-center border-r border-line bg-panel py-4">
      <div
        className="grid size-10 place-items-center rounded-lg bg-signal/15 text-signal"
        title="Andina Dispatch"
      >
        <RadioTower className="size-5" />
      </div>
      <div className="mt-6 flex flex-1 flex-col gap-1">
        {LINKS.map((link) => {
          const Icon = link.icon
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex w-[60px] flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[10px] font-medium transition ${
                  isActive
                    ? 'bg-signal/15 text-signal'
                    : 'text-mist hover:bg-elevated hover:text-snow'
                }`
              }
            >
              <Icon className="size-5" />
              {link.label}
            </NavLink>
          )
        })}
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-md p-2 text-mist hover:bg-elevated hover:text-snow"
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <div
          className="grid size-9 place-items-center rounded-full bg-elevated text-[11px] font-semibold text-snow"
          title={session?.operator}
        >
          {initials}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md p-2 text-mist hover:bg-elevated hover:text-snow"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </nav>
  )
}
