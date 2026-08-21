import { Clock, Navigation } from 'lucide-react'
import DriverAvatar from './DriverAvatar'
import TakeOfflineButton from './TakeOfflineButton'
import { useDispatchFlow } from '../context/DispatchContext'
import { formatDistance } from '../lib/geo'
import { formatVehicleLine } from '../lib/vehicles'

export default function NearbyDriverList() {
  const { nearbyDrivers, focusedDriverId, hoverDriver, focusDriver, takeOffline } =
    useDispatchFlow()

  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-medium text-snow">Conductores cerca del pickup</p>
        <p className="text-[11px] text-mist">Hasta 1.5 km · click para dibujar la ruta</p>
      </div>

      {nearbyDrivers.length === 0 ? (
        <p className="rounded-lg border border-line bg-ink px-3 py-3 text-xs text-mist">
          Nadie tan cerca. Mueve el pin verde en el mapa.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {nearbyDrivers.map((driver) => {
            const active = focusedDriverId === driver.id
            return (
              <li key={driver.id}>
                <button
                  type="button"
                  onMouseEnter={() => hoverDriver(driver.id)}
                  onMouseLeave={() => hoverDriver(null)}
                  onClick={() => focusDriver(driver.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${
                    active
                      ? 'border-signal/60 bg-signal/10'
                      : 'border-line bg-card hover:border-mist/40'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <DriverAvatar src={driver.driverPhoto} name={driver.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-snow">{driver.name}</span>
                      <span className="block truncate text-[11px] text-mist">
                        {formatVehicleLine(driver.vehicleType, driver.vehicle)}
                        {driver.licensePlate ? ` · ${driver.licensePlate}` : ''}
                      </span>
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 flex-col items-end gap-1 text-[11px] text-mist">
                    <span className="inline-flex items-center gap-1">
                      {active ? (
                        <Navigation className="size-3 text-signal" />
                      ) : (
                        <Clock className="size-3" />
                      )}
                      {driver.etaMin} min · {formatDistance(driver.distanceM)}
                    </span>
                    <TakeOfflineButton
                      compact
                      driverName={driver.name}
                      onClick={() => takeOffline(driver.id)}
                    />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
