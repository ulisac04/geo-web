import { MAP_REFRESH_OPTIONS } from '../lib/settings'
import { useSettings } from '../context/SettingsContext'
import type { MapRefreshSeconds } from '../types'

export default function SettingsPage() {
  const { settings, setMapRefreshSeconds } = useSettings()

  return (
    <div className="flex h-full flex-col bg-ink">
      <header className="border-b border-line px-6 py-4">
        <h1 className="text-lg font-semibold text-snow">Configuración</h1>
        <p className="text-xs text-mist">Ajustes operativos del despacho</p>
      </header>

      <div className="flex-1 overflow-auto px-6 py-6">
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
                setMapRefreshSeconds(Number(e.target.value) as MapRefreshSeconds)
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
