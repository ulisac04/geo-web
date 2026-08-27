import { useMemo, useState } from 'react'
import { ChevronDown, Search, Users } from 'lucide-react'
import { useDispatchFlow } from '../context/DispatchContext'
import { formatVehicleLine } from '../lib/vehicles'
import type { Driver, DriverStatus } from '../types'
import DriverAvatar from './DriverAvatar'

const STATUS_RANK: Record<DriverStatus, number> = {
  available: 0,
  busy: 1,
  offline: 2,
}

function matchesQuery(driver: Driver, query: string): boolean {
  if (!query) return true
  const haystack = `${driver.name} ${driver.licensePlate} ${driver.vehicle}`.toLowerCase()
  return haystack.includes(query)
}

function statusDot(status: DriverStatus): { className: string; label: string } {
  if (status === 'available') return { className: 'bg-signal', label: 'Disponible' }
  if (status === 'busy') return { className: 'bg-warn', label: 'Ocupado' }
  return { className: 'bg-danger', label: 'Fuera de servicio' }
}

export default function ActiveDriversDrawer() {
  const { fleet, focusedDriverId, hoverDriver, focusDriver } = useDispatchFlow()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const listed = useMemo(
    () =>
      fleet.slice().sort((a, b) => {
        const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
        if (rank !== 0) return rank
        return a.name.localeCompare(b.name, 'es')
      }),
    [fleet],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return listed.filter((driver) => matchesQuery(driver, q))
  }, [listed, query])

  if (!open) {
    return (
      <div className="absolute top-4 right-4 z-10">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel/90 px-2.5 py-1.5 text-xs font-semibold text-snow shadow-sm backdrop-blur transition hover:border-signal/40"
          aria-expanded={false}
          aria-controls="active-drivers-drawer"
        >
          <Users className="size-3.5 text-signal" aria-hidden />
          Choferes {listed.length}
        </button>
      </div>
    )
  }

  return (
    <div className="absolute top-4 right-4 z-10 w-[min(100%-2rem,17.5rem)]">
      <section
        id="active-drivers-drawer"
        className="flex max-h-[min(60vh,28rem)] flex-col overflow-hidden rounded-lg border border-line bg-panel/90 shadow-sm backdrop-blur"
      >
        <header className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-1.5">
          <h2 className="inline-flex items-center gap-1.5 text-xs font-semibold text-snow">
            <Users className="size-3.5 text-signal" aria-hidden />
            Choferes {listed.length}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-7 place-items-center rounded-md text-mist transition hover:bg-elevated hover:text-snow"
            aria-label="Cerrar lista de choferes"
            aria-expanded={true}
            aria-controls="active-drivers-drawer"
          >
            <ChevronDown className="size-4" />
          </button>
        </header>
        <div className="relative border-b border-line px-2 py-1.5">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-mist" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Alexis…"
            className="w-full rounded-md border border-line bg-ink py-1.5 pr-2.5 pl-8 text-xs text-snow placeholder:text-mist/50 focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-1">
          {listed.length === 0 ? (
            <li className="px-2 py-3 text-xs text-mist">Nadie en la flota</li>
          ) : filtered.length === 0 ? (
            <li className="px-2 py-3 text-xs text-mist">Sin coincidencias</li>
          ) : (
            filtered.map((driver) => {
              const focused = focusedDriverId === driver.id
              const dot = statusDot(driver.status)
              return (
                <li key={driver.id}>
                  <button
                    type="button"
                    onMouseEnter={() => hoverDriver(driver.id)}
                    onMouseLeave={() => hoverDriver(null)}
                    onClick={() => focusDriver(driver.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition ${
                      focused
                        ? 'border border-signal/60 bg-signal/10'
                        : 'border border-transparent hover:bg-elevated'
                    }`}
                  >
                    <DriverAvatar src={driver.driverPhoto} name={driver.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-snow">
                        {driver.name}
                      </span>
                      <span className="block truncate text-[11px] text-mist">
                        {formatVehicleLine(driver.vehicleType, driver.vehicle)}
                        {driver.licensePlate ? ` · ${driver.licensePlate}` : ''}
                      </span>
                    </span>
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${dot.className}`}
                      title={dot.label}
                      aria-label={dot.label}
                    />
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </section>
    </div>
  )
}
