import { useMemo, useState } from 'react'
import { Car, MapPinned, MessageCircle, Motorbike, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import DriverAvatar from '../components/DriverAvatar'
import DriverForm from '../components/DriverForm'
import { useFleet } from '../context/FleetContext'
import { useSettings } from '../context/SettingsContext'
import { CITIES } from '../lib/cities'
import { formatVehicleLine, vehicleTypeLabel } from '../lib/vehicles'
import type { CityId, Driver, DriverDraft, DriverStatus, VehicleFilter, VehicleType } from '../types'

const FILTERS: { value: 'all' | DriverStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'available', label: 'Disponibles' },
  { value: 'busy', label: 'Ocupados' },
  { value: 'offline', label: 'Fuera de servicio' },
]

const STATUS_BUTTONS: { value: DriverStatus; label: string; short: string }[] = [
  { value: 'available', label: 'Disponible', short: 'Disp.' },
  { value: 'busy', label: 'Ocupado', short: 'Ocup.' },
  { value: 'offline', label: 'Fuera de servicio', short: 'Fuera' },
]

const VEHICLE_FILTERS: {
  value: VehicleType
  label: string
  icon: typeof Motorbike
}[] = [
  { value: 'motorcycle', label: 'Motos', icon: Motorbike },
  { value: 'car', label: 'Carros', icon: Car },
]

function VehicleTypeIcon({ type, className }: { type: VehicleType; className?: string }) {
  const Icon = type === 'motorcycle' ? Motorbike : Car
  return <Icon className={className ?? 'size-4'} />
}

function statusButtonClass(value: DriverStatus, active: boolean) {
  return `status-toggle-btn status-toggle-btn--${value}${active ? ' is-active' : ''}`
}

export default function DriversPage() {
  const { city } = useSettings()
  const { drivers, addDriver, updateDriver, removeDriver, setStatus, moveDriverCity } = useFleet()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | DriverStatus>('all')
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>('all')
  const [editing, setEditing] = useState<Driver | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [pendingOffline, setPendingOffline] = useState<Driver | null>(null)
  const [takingOffline, setTakingOffline] = useState(false)
  const [moving, setMoving] = useState<Driver | null>(null)
  const [targetCityId, setTargetCityId] = useState<CityId | ''>('')
  const [movingBusy, setMovingBusy] = useState(false)
  const [moveError, setMoveError] = useState('')

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
      const matchesVehicle = vehicleFilter === 'all' || driver.vehicleType === vehicleFilter
      const matchesQuery =
        !q ||
        driver.name.toLowerCase().includes(q) ||
        driver.phone.includes(q) ||
        driver.vehicle.toLowerCase().includes(q) ||
        driver.vehicleType.includes(q) ||
        vehicleTypeLabel(driver.vehicleType).toLowerCase().includes(q) ||
        driver.licensePlate.toLowerCase().includes(q)
      return matchesFilter && matchesVehicle && matchesQuery
    })
  }, [cityDrivers, filter, query, vehicleFilter])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(driver: Driver) {
    setEditing(driver)
    setFormOpen(true)
  }

  async function handleSubmit(draft: DriverDraft) {
    if (editing) await updateDriver(editing.id, draft)
    else await addDriver(draft)
  }

  function requestStatus(driver: Driver, status: DriverStatus) {
    if (status === driver.status) return
    if (status === 'offline') {
      setPendingOffline(driver)
      return
    }
    void setStatus(driver.id, status)
  }

  async function confirmTakeOffline() {
    if (!pendingOffline) return
    setTakingOffline(true)
    try {
      await setStatus(pendingOffline.id, 'offline')
      setPendingOffline(null)
    } finally {
      setTakingOffline(false)
    }
  }

  function openMove(driver: Driver) {
    const next = CITIES.find((item) => item.id !== driver.cityId)
    setMoving(driver)
    setTargetCityId(next?.id ?? '')
    setMoveError('')
  }

  async function confirmMove() {
    if (!moving || !targetCityId || targetCityId === moving.cityId) return
    setMovingBusy(true)
    setMoveError('')
    try {
      await moveDriverCity(moving.id, targetCityId)
      setMoving(null)
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'No se pudo mover el conductor')
    } finally {
      setMovingBusy(false)
    }
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
            placeholder="Buscar por nombre, teléfono, placa o vehículo…"
            className="w-full rounded-lg border border-line bg-panel py-2 pr-3 pl-9 text-sm text-snow placeholder:text-mist/50 focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="group" aria-label="Estado">
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
          <span className="hidden h-4 w-px bg-line sm:block" aria-hidden />
          <div className="flex gap-1" role="group" aria-label="Tipo de vehículo">
            {VEHICLE_FILTERS.map((item) => {
              const active = vehicleFilter === item.value
              const Icon = item.icon
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setVehicleFilter(active ? 'all' : item.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? 'bg-signal/15 text-signal'
                      : 'text-mist hover:bg-elevated hover:text-snow'
                  }`}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-ink text-[11px] tracking-wide text-mist uppercase">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">Conductor</th>
              <th className="py-2 pr-3 font-medium">Teléfono</th>
              <th className="py-2 pr-3 font-medium">Vehículo</th>
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
                    <span
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-signal"
                      title={vehicleTypeLabel(driver.vehicleType)}
                      aria-label={vehicleTypeLabel(driver.vehicleType)}
                    >
                      <VehicleTypeIcon type={driver.vehicleType} />
                    </span>
                    {driver.vehiclePhoto ? (
                      <img
                        src={driver.vehiclePhoto}
                        alt={driver.vehicle}
                        className="size-9 shrink-0 rounded-md border border-line object-cover"
                      />
                    ) : null}
                    <div>
                      <p className="text-mist">{formatVehicleLine(driver.vehicleType, driver.vehicle)}</p>
                      <p className="font-mono text-[11px] tracking-wide text-snow">
                        {driver.licensePlate || '—'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-3">
                  <div
                    role="group"
                    aria-label={`Estado de ${driver.name}`}
                    className="status-toggle"
                  >
                    {STATUS_BUTTONS.map((item) => {
                      const active = driver.status === item.value
                      return (
                        <button
                          key={item.value}
                          type="button"
                          title={item.label}
                          aria-pressed={active}
                          onClick={() => requestStatus(driver, item.value)}
                          className={statusButtonClass(item.value, active)}
                        >
                          {item.short}
                        </button>
                      )
                    })}
                  </div>
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
                      onClick={() => openMove(driver)}
                      className="rounded-md p-1.5 text-mist hover:bg-elevated hover:text-snow"
                      title="Mover de ciudad"
                    >
                      <MapPinned className="size-4" />
                    </button>
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
                          void removeDriver(driver.id)
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
      <ConfirmDialog
        open={pendingOffline !== null}
        title="¿Sacar de servicio?"
        description={
          pendingOffline ? (
            <>
              ¿Estás seguro de que quieres sacar a{' '}
              <span className="font-semibold text-snow">{pendingOffline.name}</span> de servicio?
              Desaparecerá del mapa y no se le asignarán viajes hasta que lo reactives.
            </>
          ) : null
        }
        confirmLabel="Sí, sacar de servicio"
        busy={takingOffline}
        onCancel={() => {
          if (!takingOffline) setPendingOffline(null)
        }}
        onConfirm={confirmTakeOffline}
      />
      {moving ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => {
            if (!movingBusy) setMoving(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-city-title"
            className="w-full max-w-md rounded-2xl border border-line bg-panel p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="move-city-title" className="text-base font-semibold text-snow">
              Mover de ciudad
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              {moving.name} está en {CITIES.find((item) => item.id === moving.cityId)?.name}. Elige
              la ciudad destino. Si no tiene GPS en vivo, el mapa lo colocará en el centro de esa
              ciudad.
            </p>
            <label className="mt-4 block space-y-1">
              <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                Ciudad destino
              </span>
              <select
                value={targetCityId}
                onChange={(e) => setTargetCityId(e.target.value as CityId)}
                className="w-full rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
              >
                {CITIES.filter((item) => item.id !== moving.cityId).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.country}
                  </option>
                ))}
              </select>
            </label>
            {moveError ? (
              <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-rose-200">
                {moveError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={movingBusy}
                onClick={() => setMoving(null)}
                className="rounded-lg border border-line bg-card px-3 py-2 text-sm text-snow hover:border-mist/50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={movingBusy || !targetCityId}
                onClick={() => void confirmMove()}
                className="rounded-lg bg-signal px-3 py-2 text-sm font-semibold text-on-signal hover:bg-emerald-300 disabled:opacity-50"
              >
                {movingBusy ? 'Moviendo…' : 'Mover'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
