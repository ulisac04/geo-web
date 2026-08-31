import { Car, Motorbike } from 'lucide-react'
import type { MapMode, VehicleFilter } from '../types'

interface MapModeToggleProps {
  mode: MapMode
  onChange: (mode: MapMode) => void
  fullWidth?: boolean
  fleetLabel?: string
  liveLabel?: string
  liveCount?: number
  liveAlert?: boolean
  scheduledLabel?: string
  scheduledCount?: number
  showScheduled?: boolean
  noneLabel?: string
  showNone?: boolean
  vehicleFilter?: VehicleFilter
  onVehicleFilterChange?: (filter: VehicleFilter) => void
  embedded?: boolean
  compactVehicles?: boolean
}

function chipClass(active: boolean, fullWidth?: boolean) {
  return `rounded-md px-3 py-1.5 text-xs font-semibold transition ${
    fullWidth ? 'flex-1' : ''
  } ${
    active
      ? 'bg-signal/15 text-signal'
      : 'text-mist hover:bg-elevated hover:text-snow'
  }`
}

export default function MapModeToggle({
  mode,
  onChange,
  fullWidth,
  fleetLabel = 'Flota',
  liveLabel = 'En curso',
  liveCount,
  liveAlert,
  scheduledLabel = 'Agendados',
  scheduledCount,
  showScheduled,
  noneLabel = 'Ninguno',
  showNone,
  vehicleFilter = 'all',
  onVehicleFilterChange,
  embedded,
  compactVehicles,
}: MapModeToggleProps) {
  const options: { value: MapMode; label: string }[] = [
    { value: 'fleet', label: fleetLabel },
    ...(showScheduled ? [{ value: 'scheduled' as const, label: scheduledLabel }] : []),
    { value: 'live', label: liveLabel },
    ...(showNone ? [{ value: 'none' as const, label: noneLabel }] : []),
  ]
  const showVehicle = Boolean(onVehicleFilterChange)

  return (
    <div
      className={`inline-flex items-stretch ${
        embedded ? '' : 'rounded-lg border border-line bg-ink p-0.5'
      } ${fullWidth ? 'w-full' : ''}`}
    >
      <div
        className={`inline-flex ${fullWidth && !showVehicle ? 'w-full' : ''}`}
        role="tablist"
        aria-label="Vista del mapa"
      >
        {options.map((item) => {
          const active = mode === item.value
          const showCount =
            (item.value === 'live' && liveCount != null) ||
            (item.value === 'scheduled' && scheduledCount != null)
          const count = item.value === 'scheduled' ? scheduledCount : liveCount
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={
                showCount && count != null ? `${item.label}: ${count}` : item.label
              }
              onClick={() => onChange(item.value)}
              className={`inline-flex items-center justify-center gap-1.5 ${chipClass(active, fullWidth && !showVehicle)}`}
            >
              {item.label}
              {showCount ? (
                <span
                  className={`inline-grid h-4 min-w-4 place-items-center rounded-full px-0.5 text-[10px] font-bold ${
                    item.value === 'live' && liveAlert
                      ? 'bg-amber-400 text-ink'
                      : active
                        ? 'bg-signal text-on-signal'
                        : 'bg-elevated text-mist'
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      {showVehicle ? (
        <>
          <span className="mx-1 my-1 w-px shrink-0 bg-line" aria-hidden />
          <div
            className="inline-flex"
            role="group"
            aria-label="Tipo de vehículo"
          >
            {([
              { value: 'motorcycle' as const, label: 'Moto', icon: Motorbike },
              { value: 'car' as const, label: 'Carro', icon: Car },
            ]).map((item) => {
              const active = vehicleFilter === item.value
              const Icon = item.icon
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() =>
                    onVehicleFilterChange?.(active ? 'all' : item.value)
                  }
                  className={`inline-flex items-center ${compactVehicles ? 'px-2' : 'gap-1.5'} ${chipClass(active)}`}
                >
                  <Icon className="size-3.5" />
                  {compactVehicles ? null : item.label}
                </button>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}
