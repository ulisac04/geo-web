import { Clock, MapPin, UserCheck } from 'lucide-react'
import DriverAvatar from './DriverAvatar'
import TakeOfflineButton from './TakeOfflineButton'
import type { Driver } from '../types'
import { formatDistance } from '../lib/geo'
import { formatVehicleLine } from '../lib/vehicles'

interface CandidateCardProps {
  driver: Driver
  highlighted: boolean
  nextTurn: boolean
  onHover: (id: string | null) => void
  onFocus: (id: string) => void
  onAssign: (driver: Driver) => void | Promise<void>
  onTakeOffline: (id: string) => void | Promise<void>
}

export default function CandidateCard({
  driver,
  highlighted,
  nextTurn,
  onHover,
  onFocus,
  onAssign,
  onTakeOffline,
}: CandidateCardProps) {
  const busy = driver.status === 'busy'
  const afterCurrent = Boolean(driver.afterCurrent)
  const turns = driver.completedToday ?? 0
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
            <p className="truncate text-xs text-mist">
              {formatVehicleLine(driver.vehicleType, driver.vehicle)}
            </p>
            {driver.licensePlate ? (
              <p className="font-mono text-[11px] tracking-wide text-snow">{driver.licensePlate}</p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`text-3xl font-semibold leading-none tabular-nums ${
              nextTurn ? 'text-signal' : 'text-snow'
            }`}
          >
            {turns}
          </p>
          <p className={`mt-1 text-[11px] font-medium ${nextTurn ? 'text-signal' : 'text-mist'}`}>
            {nextTurn ? 'le toca' : 'ya pasó'}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-mist">
            <Clock className="size-3" />
            {afterCurrent ? 'Al terminar · ' : ''}
            {driver.etaMin} min · {formatDistance(driver.distanceM)}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="flex min-w-0 items-center gap-1 text-[11px] text-mist">
          <MapPin className="size-3 text-signal" />
          {afterCurrent
            ? 'ETA al terminar el pedido actual'
            : busy
              ? 'En un servicio ahora'
              : 'Cercano al punto A'}
        </span>
        {busy ? (
          <span className="rounded-md border border-line bg-ink px-2.5 py-1.5 text-xs font-medium text-mist">
            Ocupado
          </span>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              void onAssign(driver)
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-signal px-2.5 py-1.5 text-xs font-semibold text-on-signal hover:bg-emerald-300"
          >
            <UserCheck className="size-3.5" />
            Ofrecer
          </button>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <TakeOfflineButton
          compact
          driverName={driver.name}
          onClick={() => onTakeOffline(driver.id)}
        />
      </div>
    </article>
  )
}
