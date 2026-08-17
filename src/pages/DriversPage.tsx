import { useMemo, useState } from 'react'
import { MessageCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import DriverAvatar from '../components/DriverAvatar'
import DriverForm from '../components/DriverForm'
import { useFleet } from '../context/FleetContext'
import { useSettings } from '../context/SettingsContext'
import type { Driver, DriverDraft, DriverStatus } from '../types'

const FILTERS: { value: 'all' | DriverStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'available', label: 'Disponibles' },
  { value: 'busy', label: 'Ocupados' },
  { value: 'offline', label: 'Fuera de servicio' },
]

export default function DriversPage() {
  const { city } = useSettings()
  const { drivers, addDriver, updateDriver, removeDriver, setStatus } = useFleet()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | DriverStatus>('all')
  const [editing, setEditing] = useState<Driver | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const cityDrivers = useMemo(
    () => drivers.filter((driver) => driver.cityId === city.id),
    [city.id, drivers],
  )

  const available = cityDrivers.filter((d) => d.status === 'available').length
  const busy = cityDrivers.filter((d) => d.status === 'busy').length
  const offline = cityDrivers.filter((d) => d.status === 'offline').length

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cityDrivers.filter((driver) => {
      const matchesFilter = filter === 'all' || driver.status === filter
      const matchesQuery =
        !q ||
        driver.name.toLowerCase().includes(q) ||
        driver.phone.includes(q) ||
        driver.vehicle.toLowerCase().includes(q) ||
        driver.licensePlate.toLowerCase().includes(q) ||
        driver.zone.toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [cityDrivers, filter, query])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(driver: Driver) {
    setEditing(driver)
    setFormOpen(true)
  }

  function handleSubmit(draft: DriverDraft) {
    if (editing) updateDriver(editing.id, draft)
    else addDriver(draft)
  }

  return (
    <div className="flex h-full flex-col bg-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-snow">Agenda de conductores</h1>
          <p className="text-xs text-mist">
            Mostrando {city.name} · {available} disponibles · {busy} ocupados · {offline} fuera de
            servicio
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-signal px-3 py-2 text-sm font-semibold text-on-signal hover:bg-emerald-300"
        >
          <Plus className="size-4" />
          Nuevo conductor
        </button>
      </header>

      <div className="flex items-center gap-3 border-b border-line px-6 py-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono, placa, zona o vehículo…"
            className="w-full rounded-lg border border-line bg-panel py-2 pr-3 pl-9 text-sm text-snow placeholder:text-mist/50 focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === item.value
                  ? 'bg-signal/15 text-signal'
                  : 'text-mist hover:bg-elevated hover:text-snow'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-ink text-[11px] tracking-wide text-mist uppercase">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">Conductor</th>
              <th className="py-2 pr-3 font-medium">Teléfono</th>
              <th className="py-2 pr-3 font-medium">Vehículo</th>
              <th className="py-2 pr-3 font-medium">Zona</th>
              <th className="py-2 pr-3 font-medium">Estado</th>
              <th className="py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((driver) => (
              <tr key={driver.id} className="border-b border-line/70 hover:bg-panel/70">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-3">
                    <DriverAvatar src={driver.driverPhoto} name={driver.name} />
                    <div>
                      <p className="font-medium text-snow">{driver.name}</p>
                      {driver.notes ? <p className="text-xs text-mist">{driver.notes}</p> : null}
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-3 text-mist">{driver.phone}</td>
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    {driver.vehiclePhoto ? (
                      <img
                        src={driver.vehiclePhoto}
                        alt={driver.vehicle}
                        className="size-9 shrink-0 rounded-md border border-line object-cover"
                      />
                    ) : null}
                    <div>
                      <p className="text-mist">{driver.vehicle}</p>
                      <p className="font-mono text-[11px] tracking-wide text-snow">
                        {driver.licensePlate || '—'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-3 text-mist">{driver.zone || '—'}</td>
                <td className="py-3 pr-3">
                  <select
                    value={driver.status}
                    onChange={(e) => setStatus(driver.id, e.target.value as DriverStatus)}
                    className="rounded-md border border-line bg-card px-2 py-1 text-xs text-snow"
                  >
                    <option value="available">Disponible</option>
                    <option value="busy">Ocupado</option>
                    <option value="offline">Fuera de servicio</option>
                  </select>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    <a
                      href={`https://wa.me/${driver.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md p-1.5 text-mist hover:bg-elevated hover:text-signal"
                      title="WhatsApp"
                    >
                      <MessageCircle className="size-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => openEdit(driver)}
                      className="rounded-md p-1.5 text-mist hover:bg-elevated hover:text-snow"
                      title="Editar"
                    >
                      <Pencil className="size-4" />
                    </button>
                    {pendingDelete === driver.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          removeDriver(driver.id)
                          setPendingDelete(null)
                        }}
                        className="rounded-md px-2 py-1 text-xs font-medium text-rose-300 hover:bg-danger/15"
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingDelete(driver.id)}
                        className="rounded-md p-1.5 text-mist hover:bg-elevated hover:text-danger"
                        title="Eliminar"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 ? (
          <p className="mt-8 text-center text-sm text-mist">
            No hay conductores que coincidan con la búsqueda.
          </p>
        ) : null}
      </div>

      <DriverForm
        open={formOpen}
        driver={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
