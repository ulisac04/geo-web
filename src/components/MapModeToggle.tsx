import type { MapMode, VehicleFilter } from '../types'

interface MapModeToggleProps {
  mode: MapMode
  onChange: (mode: MapMode) => void
  fullWidth?: boolean
  fleetLabel?: string
  liveLabel?: string
  noneLabel?: string
  showNone?: boolean
  vehicleFilter?: VehicleFilter
  onVehicleFilterChange?: (filter: VehicleFilter) => void
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
  noneLabel = 'Ninguno',
  showNone,
  vehicleFilter = 'all',
  onVehicleFilterChange,
}: MapModeToggleProps) {
  const options: { value: MapMode; label: string }[] = [
    { value: 'fleet', label: fleetLabel },
    { value: 'live', label: liveLabel },
    ...(showNone ? [{ value: 'none' as const, label: noneLabel }] : []),
  ]
  const showVehicle = Boolean(onVehicleFilterChange)

  return (
    <div
      className={`inline-flex items-stretch rounded-lg border border-line bg-ink p-0.5 ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      <div
        className={`inline-flex ${fullWidth && !showVehicle ? 'w-full' : ''}`}
        role="tablist"
        aria-label="Vista del mapa"
      >
        {options.map((item) => {
          const active = mode === item.value
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.value)}
              className={chipClass(active, fullWidth && !showVehicle)}
            >
              {item.label}
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
              { value: 'motorcycle' as const, label: 'Moto' },
              { value: 'car' as const, label: 'Carro' },
            ]).map((item) => {
              const active = vehicleFilter === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onVehicleFilterChange?.(active ? 'all' : item.value)
                  }
                  className={chipClass(active)}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}
