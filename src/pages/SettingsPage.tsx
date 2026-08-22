import { CITIES } from '../lib/cities'
import { MAP_REFRESH_OPTIONS } from '../lib/settings'
import { useSettings } from '../context/SettingsContext'
import type { CityId, MapRefreshSeconds } from '../types'

export default function SettingsPage() {
  const { settings, city, setCityId, setMapRefreshSeconds } = useSettings()

  return (
    <div className="flex h-full flex-col bg-ink">
      <header className="border-b border-line px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-snow">Configuración</h1>
          <span className="rounded-full border border-signal/40 bg-signal/15 px-2.5 py-0.5 text-xs font-medium text-signal">
            {city.name}
          </span>
        </div>
        <p className="text-xs text-mist">Ajustes operativos del despacho</p>
      </header>

      <div className="flex-1 overflow-auto px-6 py-6 space-y-4">
        <section className="max-w-lg rounded-xl border border-line bg-panel p-5">
          <h2 className="text-sm font-semibold text-snow">Ciudad operativa</h2>
          <p className="mt-1 text-xs text-mist">
            El mapa, el autocomplete y la flota siguen esta ciudad. Cambia a San Cristóbal para
            probar el despacho allá.
          </p>
          <label className="mt-4 block space-y-1">
            <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
              Ciudad
            </span>
            <select
              value={settings.cityId}
              onChange={(e) => void setCityId(e.target.value as CityId)}
              className="w-full rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
            >
              {CITIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.country}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="max-w-lg rounded-xl border border-line bg-panel p-5">
          <h2 className="text-sm font-semibold text-snow">Refresco del mapa</h2>
          <p className="mt-1 text-xs text-mist">
            Cada cuánto se actualizan las posiciones de la flota en el mapa.
          </p>
          <label className="mt-4 block space-y-1">
            <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
              Intervalo
            </span>
            <select
              value={settings.mapRefreshSeconds}
              onChange={(e) =>
                void setMapRefreshSeconds(Number(e.target.value) as MapRefreshSeconds)
              }
              className="w-full rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
            >
              {MAP_REFRESH_OPTIONS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds} segundos
                </option>
              ))}
            </select>
          </label>
        </section>
      </div>
    </div>
  )
}
