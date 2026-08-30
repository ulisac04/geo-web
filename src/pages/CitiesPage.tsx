import { Check } from 'lucide-react'
import { useFleet } from '../context/FleetContext'
import { useServices } from '../context/ServicesContext'
import { useSettings } from '../context/SettingsContext'
import { type City } from '../lib/cities'
import { isLiveServiceStatus } from '../lib/services'
import type { Driver, ServiceRecord } from '../types'

function cityStats(city: City, drivers: Driver[], records: ServiceRecord[]) {
  const fleet = drivers.filter((driver) => driver.cityId === city.id)
  const trips = records.filter((record) => record.cityId === city.id)
  return {
    total: fleet.length,
    available: fleet.filter((driver) => driver.status === 'available').length,
    busy: fleet.filter((driver) => driver.status === 'busy').length,
    stale: fleet.filter((driver) => driver.status === 'stale').length,
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
  const { city } = useSettings()
  const { drivers } = useFleet()
  const { records } = useServices()
  const stats = cityStats(city, drivers, records)

  return (
    <div className="flex h-full flex-col bg-ink">
      <header className="border-b border-line px-6 py-4">
        <h1 className="text-lg font-semibold text-snow">Ciudad</h1>
        <p className="text-xs text-mist">
          Esta empresa opera solo aquí. El mapa, el autocomplete y la agenda siguen esta ciudad.
        </p>
      </header>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-md rounded-xl border border-signal/60 bg-signal/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium tracking-wide text-mist uppercase">
                {city.code} · {city.country}
              </p>
              <h2 className="mt-1 text-base font-semibold text-snow">{city.name}</h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-signal/20 px-2 py-0.5 text-[11px] font-semibold text-signal">
              <Check className="size-3" />
              Asignada
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div>
              <dt className="text-mist">Conductores</dt>
              <dd className="font-semibold text-snow">{stats.total}</dd>
            </div>
            <div>
              <dt className="text-mist">En servicio</dt>
              <dd className="text-snow">
                {stats.available} disp. · {stats.busy} ocup. · {stats.stale} sin señal
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
        </div>
      </div>
    </div>
  )
}
