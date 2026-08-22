import { Clock, MapPin, Navigation } from 'lucide-react'
import DriverAvatar from './DriverAvatar'
import TakeOfflineButton from './TakeOfflineButton'
import { useDispatchFlow } from '../context/DispatchContext'
import { etaFromMeters, formatDistance, haversineMeters } from '../lib/geo'
import { isPickupLeg } from '../lib/services'

export default function LiveTripsList() {
  const {
    liveTrips,
    focusedTripId,
    focusTrip,
    takeOffline,
    confirmOffer,
    markInProgress,
    completeTrip,
    cancelTrip,
    beginReassign,
    actingTripId,
  } = useDispatchFlow()

  if (liveTrips.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-ink px-3 py-8 text-center text-sm text-mist">
        No hay servicios en curso.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {liveTrips.map((trip) => {
        const { record, driver } = trip
        const pickup = isPickupLeg(record.status)
        const waiting = record.status === 'assigned'
        const target = pickup ? record.originCoords : record.destCoords
        const meters = target ? haversineMeters(driver.coords, target) : 0
        const highlighted = focusedTripId === record.id
        const acting = actingTripId === record.id
        const badge = waiting
          ? 'Esperando respuesta'
          : pickup
            ? 'Va a buscar'
            : 'Va a dejar'

        return (
          <article
            key={record.id}
            onClick={() => focusTrip(record.id)}
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
                  <p className="truncate text-xs text-mist">{record.clientName}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  waiting
                    ? 'bg-amber-400/15 text-amber-300'
                    : pickup
                      ? 'bg-warn/15 text-amber-300'
                      : 'bg-signal/15 text-signal'
                }`}
              >
                <Navigation className="size-3" />
                {badge}
              </span>
            </div>

            <p className="mt-2 truncate text-xs text-snow">{record.origin}</p>
            <p className="truncate text-[11px] text-mist">→ {record.destination}</p>

            <div className="mt-2 flex items-center justify-between text-[11px] text-mist">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3 text-signal" />
                {record.typeName}
              </span>
              {target && !waiting ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {etaFromMeters(meters)} min · {formatDistance(meters)}
                </span>
              ) : null}
            </div>

            <div
              className="mt-2 flex flex-wrap gap-1.5"
              onClick={(event) => event.stopPropagation()}
            >
              {waiting ? (
                <>
                  <TripAction
                    disabled={acting}
                    onClick={() => void confirmOffer(record.id)}
                    label="Confirmar"
                    primary
                  />
                  <TripAction
                    disabled={acting}
                    onClick={() => void beginReassign(record.id)}
                    label="Reasignar"
                  />
                </>
              ) : null}
              {record.status === 'en_route' ? (
                <TripAction
                  disabled={acting}
                  onClick={() => void markInProgress(record.id)}
                  label="En viaje"
                  primary
                />
              ) : null}
              {record.status === 'in_progress' ? (
                <TripAction
                  disabled={acting}
                  onClick={() => void completeTrip(record.id)}
                  label="Finalizar"
                  primary
                />
              ) : null}
              <TripAction
                disabled={acting}
                onClick={() => void cancelTrip(record.id)}
                label="Cancelar"
                danger
              />
            </div>

            {driver.status === 'offline' ? (
              <p className="mt-2 text-[11px] text-rose-300">Fuera de servicio · oculto en el mapa</p>
            ) : (
              <div className="mt-2">
                <TakeOfflineButton
                  compact
                  driverName={driver.name}
                  onClick={() => takeOffline(driver.id)}
                />
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function TripAction({
  label,
  onClick,
  disabled,
  primary,
  danger,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40 ${
        danger
          ? 'border border-danger/40 text-rose-300 hover:bg-danger/15'
          : primary
            ? 'bg-signal text-on-signal hover:bg-emerald-300'
            : 'border border-line text-snow hover:border-mist/50'
      }`}
    >
      {label}
    </button>
  )
}
