import { Clock, MapPin, UserCheck } from 'lucide-react'
import DriverAvatar from './DriverAvatar'
import type { Driver } from '../types'
import { formatDistance } from '../lib/geo'

interface CandidateCardProps {
  driver: Driver
  highlighted: boolean
  onHover: (id: string | null) => void
  onFocus: (id: string) => void
  onAssign: (driver: Driver) => void | Promise<void>
}

export default function CandidateCard({
  driver,
  highlighted,
  onHover,
  onFocus,
  onAssign,
}: CandidateCardProps) {
  return (
    <article
      onMouseEnter={() => onHover(driver.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onFocus(driver.id)}
      className={`cursor-pointer rounded-lg border p-3 transition ${
        highlighted
          ? 'border-signal/60 bg-signal/10'
          : 'border-line bg-card hover:border-mist/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <DriverAvatar src={driver.driverPhoto} name={driver.name} size="sm" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-snow">{driver.name}</h3>
            <p className="truncate text-xs text-mist">{driver.vehicle}</p>
            {driver.licensePlate ? (
              <p className="font-mono text-[11px] tracking-wide text-snow">{driver.licensePlate}</p>
            ) : null}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] text-mist">
          <Clock className="size-3" />
          {driver.etaMin} min · {formatDistance(driver.distanceM)}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[11px] text-mist">
          <MapPin className="size-3 text-signal" />
          Cercano al punto A
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            void onAssign(driver)
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-signal px-2.5 py-1.5 text-xs font-semibold text-on-signal hover:bg-emerald-300"
        >
          <UserCheck className="size-3.5" />
          Asignar Conductor
        </button>
      </div>
    </article>
  )
}
