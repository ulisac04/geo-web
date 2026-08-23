import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Building2, LogOut, RadioTower } from 'lucide-react'
import { getSession, logout } from '../lib/auth'

export default function AdminLayout() {
  const navigate = useNavigate()
  const session = getSession()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-full overflow-hidden bg-ink">
      <nav className="flex h-full w-56 shrink-0 flex-col border-r border-line bg-panel px-3 py-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="grid size-9 place-items-center rounded-lg bg-signal/15 text-signal">
            <RadioTower className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-snow">Geo Platform</p>
            <p className="text-[11px] text-mist">Administración</p>
          </div>
        </div>
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium ${
              isActive ? 'bg-signal/15 text-signal' : 'text-mist hover:bg-elevated hover:text-snow'
            }`
          }
        >
          <Building2 className="size-4" />
          Empresas
        </NavLink>
        <div className="mt-auto border-t border-line px-2 pt-3">
          <p className="truncate text-xs text-snow">{session?.operator}</p>
          <p className="truncate text-[11px] text-mist">{session?.operatorEmail}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex items-center gap-2 text-xs text-mist hover:text-snow"
          >
            <LogOut className="size-3.5" />
            Cerrar sesión
          </button>
        </div>
      </nav>
      <div className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
