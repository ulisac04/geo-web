import { Check, MapPinned } from 'lucide-react'
import { useFleet } from '../context/FleetContext'
import { useServices } from '../context/ServicesContext'
import { useSettings } from '../context/SettingsContext'
import { CITIES, type City } from '../lib/cities'
import { isLiveServiceStatus } from '../lib/services'
import type { Driver, ServiceRecord } from '../types'

function cityStats(city: City, drivers: Driver[], records: ServiceRecord[]) {
  const fleet = drivers.filter((driver) => driver.cityId === city.id)
  const trips = records.filter((record) => record.cityId === city.id)
  return {
    total: fleet.length,
    available: fleet.filter((driver) => driver.status === 'available').length,
    busy: fleet.filter((driver) => driver.status === 'busy').length,
    offline: fleet.filter((driver) => driver.status === 'offline').length,
    open: trips.filter(
      (record) => record.status === 'pending' || isLiveServiceStatus(record.status),
    ).length,
    completed: trips.filter((record) => record.status === 'completed').length,
    cancelled: trips.filter((record) => record.status === 'cancelled').length,
    trips: trips.length,
  }
}

export default function CitiesPage() {
  const { city, setCityId } = useSettings()
  const { drivers } = useFleet()
  const { records } = useServices()

  return (
    <div className="flex h-full flex-col bg-ink">
      <header className="border-b border-line px-6 py-4">
        <h1 className="text-lg font-semibold text-snow">Ciudades</h1>
        <p className="text-xs text-mist">
          Elige la ciudad operativa. El mapa, el autocomplete y la agenda siguen esta selección.
        </p>
      </header>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CITIES.map((item) => {
            const stats = cityStats(item, drivers, records)
            const active = item.id === city.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCityId(item.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? 'border-signal/60 bg-signal/10'
                    : 'border-line bg-panel hover:border-mist/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium tracking-wide text-mist uppercase">
                      {item.code} · {item.country}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-snow">{item.name}</h2>
                  </div>
                  {active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-signal/20 px-2 py-0.5 text-[11px] font-semibold text-signal">
                      <Check className="size-3" />
                      Activa
                    </span>
                  ) : (
                    <MapPinned className="size-4 text-mist" />
                  )}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-mist">Conductores</dt>
                    <dd className="font-semibold text-snow">{stats.total}</dd>
                  </div>
                  <div>
                    <dt className="text-mist">En servicio</dt>
                    <dd className="text-snow">
                      {stats.available} disp. · {stats.busy} ocup.
                    </dd>
                  </div>
                  <div>
                    <dt className="text-mist">Servicios</dt>
                    <dd className="font-semibold text-snow">{stats.trips}</dd>
                  </div>
                  <div>
                    <dt className="text-mist">Abiertos</dt>
                    <dd className="text-snow">
                      {stats.open} · {stats.completed} ok
                    </dd>
                  </div>
                </dl>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
