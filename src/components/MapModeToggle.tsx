import type { MapMode } from '../types'

interface MapModeToggleProps {
  mode: MapMode
  onChange: (mode: MapMode) => void
  fullWidth?: boolean
  fleetLabel?: string
  liveLabel?: string
}

export default function MapModeToggle({
  mode,
  onChange,
  fullWidth,
  fleetLabel = 'Flota',
  liveLabel = 'En curso',
}: MapModeToggleProps) {
  const options = [
    { value: 'fleet' as const, label: fleetLabel },
    { value: 'live' as const, label: liveLabel },
  ]
  return (
    <div
      className={`inline-flex rounded-lg border border-line bg-ink p-0.5 ${
        fullWidth ? 'w-full' : ''
      }`}
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
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              fullWidth ? 'flex-1' : ''
            } ${
              active
                ? 'bg-signal/15 text-signal'
                : 'text-mist hover:bg-elevated hover:text-snow'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
