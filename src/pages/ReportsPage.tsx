import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import { isAbortError } from '../lib/api'
import {
  fetchHeatmap,
  fromDateInputRange,
  rangeDaysIso,
  toDateInputValue,
  type HeatmapKind,
  type HeatmapResponse,
} from '../lib/reports'

const HeatmapMap = lazy(() => import('../components/HeatmapMap'))

const KIND_OPTIONS: { value: HeatmapKind; label: string }[] = [
  { value: 'origin', label: 'Orígenes' },
  { value: 'destination', label: 'Destinos' },
  { value: 'both', label: 'Ambos' },
]

type Preset = 7 | 30 | 'custom'

const INPUT_CLASS =
  'rounded-md border border-line bg-panel px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none'

export default function ReportsPage() {
  const { city } = useSettings()
  const initial = rangeDaysIso(30)
  const [preset, setPreset] = useState<Preset>(30)
  const [fromIso, setFromIso] = useState(initial.from)
  const [toIso, setToIso] = useState(initial.to)
  const [kind, setKind] = useState<HeatmapKind>('origin')
  const [data, setData] = useState<HeatmapResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError(null)
    void fetchHeatmap({
      from: fromIso,
      to: toIso,
      kind,
      cityId: city.id,
      signal: abort.signal,
    })
      .then((next) => {
        setData(next)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (abort.signal.aborted || isAbortError(err)) return
        setData(null)
        setLoading(false)
        setError(err instanceof Error ? err.message : 'No se pudo cargar el reporte')
      })
    return () => abort.abort()
  }, [city.id, fromIso, kind, toIso])

  const fromDate = toDateInputValue(fromIso)
  const toDate = toDateInputValue(new Date(new Date(toIso).getTime() - 1).toISOString())

  const empty = !loading && (data?.with_coords ?? 0) === 0
  const points = data?.points ?? []

  const summary = useMemo(() => {
    if (!data) return `Mapa de calor de servicios completados en ${city.name}`
    return `${data.with_coords} con coordenadas de ${data.services} servicios · ${city.name}`
  }, [city.name, data])

  function applyPreset(days: 7 | 30) {
    const range = rangeDaysIso(days)
    setPreset(days)
    setFromIso(range.from)
    setToIso(range.to)
  }

  function applyCustomDates(nextFrom: string, nextTo: string) {
    if (!nextFrom || !nextTo || nextFrom > nextTo) return
    setPreset('custom')
    const range = fromDateInputRange(nextFrom, nextTo)
    setFromIso(range.from)
    setToIso(range.to)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-snow">Reportes</h1>
          <p className="text-xs text-mist">{summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-line bg-panel">
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className={`px-3 py-1.5 text-xs font-medium ${
                preset === 7 ? 'bg-signal/15 text-signal' : 'text-mist hover:text-snow'
              }`}
            >
              7 días
            </button>
            <button
              type="button"
              onClick={() => applyPreset(30)}
              className={`border-l border-line px-3 py-1.5 text-xs font-medium ${
                preset === 30 ? 'bg-signal/15 text-signal' : 'text-mist hover:text-snow'
              }`}
            >
              30 días
            </button>
          </div>
          <label className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-mist uppercase">
            Desde
            <input
              type="date"
              value={fromDate}
              onChange={(e) => applyCustomDates(e.target.value, toDate)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-mist uppercase">
            Hasta
            <input
              type="date"
              value={toDate}
              onChange={(e) => applyCustomDates(fromDate, e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <div className="flex overflow-hidden rounded-lg border border-line bg-panel">
            {KIND_OPTIONS.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setKind(option.value)}
                className={`px-3 py-1.5 text-xs font-medium ${index > 0 ? 'border-l border-line' : ''} ${
                  kind === option.value ? 'bg-signal/15 text-signal' : 'text-mist hover:text-snow'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <Suspense
          fallback={
            <section className="flex h-full items-center justify-center text-sm text-mist">
              Cargando mapa…
            </section>
          }
        >
          <HeatmapMap center={city.center} points={points} />
        </Suspense>
        {loading ? (
          <p className="absolute top-3 left-3 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-medium text-mist">
            Cargando…
          </p>
        ) : null}
        {empty ? (
          <p className="absolute inset-x-0 top-1/2 mx-auto max-w-sm -translate-y-1/2 rounded-lg bg-ink/80 px-4 py-3 text-center text-sm text-mist">
            No hay coordenadas en este periodo
          </p>
        ) : null}
        {error ? (
          <p className="absolute bottom-3 left-3 right-3 rounded-md bg-ink/80 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        ) : null}
        {kind === 'both' && points.length > 0 ? (
          <div className="absolute right-3 bottom-3 flex gap-3 rounded-full bg-ink/80 px-3 py-1.5 text-[11px] font-medium">
            <span className="text-signal">Orígenes</span>
            <span className="text-amber-300">Destinos</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
