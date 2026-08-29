import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import ServiceTrackMap from '../components/ServiceTrackMap'
import ServiceTypeForm from '../components/ServiceTypeForm'
import { useFleet } from '../context/FleetContext'
import { useServices } from '../context/ServicesContext'
import { useSettings } from '../context/SettingsContext'
import { isAbortError } from '../lib/api'
import { formatDistance, haversineMeters } from '../lib/geo'
import { fromDateInputRange } from '../lib/reports'
import { fetchDrivingRoute } from '../lib/routing'
import {
  fetchServiceTrack,
  isLiveServiceStatus,
  listServiceRecords,
  sortServiceTypeOptions,
  type ServiceTrack,
} from '../lib/services'
import { vehicleTypeLabel } from '../lib/vehicles'
import type { ServiceRecord, ServiceStatus, ServiceType, ServiceTypeDraft } from '../types'

type Tab = 'catalog' | 'history'

const TABS: { value: Tab; label: string }[] = [
  { value: 'history', label: 'Historial' },
  { value: 'catalog', label: 'Catálogo' },
]

const STATUS_FILTERS: { value: 'all' | ServiceStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'assigned', label: 'Ofrecidos' },
  { value: 'en_route', label: 'En ruta' },
  { value: 'in_progress', label: 'En viaje' },
  { value: 'completed', label: 'Completados' },
  { value: 'cancelled', label: 'Cancelados' },
]

const STATUS_LABEL: Record<ServiceStatus, string> = {
  pending: 'Pendiente',
  assigned: 'Ofrecido',
  en_route: 'En ruta',
  in_progress: 'En viaje',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

const PAGE_SIZE = 20

const FILTER_INPUT_CLASS =
  'rounded-md border border-line bg-panel px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none'

function dateRangeIso(fromDate: string, toDate: string): { from?: string; to?: string } {
  if (fromDate && toDate) return fromDateInputRange(fromDate, toDate)
  if (fromDate) {
    const { from } = fromDateInputRange(fromDate, fromDate)
    return { from }
  }
  if (toDate) {
    const { to } = fromDateInputRange(toDate, toDate)
    return { to }
  }
  return {}
}

export default function ServicesPage() {
  const { city } = useSettings()
  const { types, addType, updateType, removeType } = useServices()
  const { drivers } = useFleet()
  const [tab, setTab] = useState<Tab>('history')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ServiceStatus>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [driverFilter, setDriverFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [historyRecords, setHistoryRecords] = useState<ServiceRecord[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ServiceType | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const cityDrivers = useMemo(
    () =>
      drivers
        .filter((driver) => driver.cityId === city.id)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [city.id, drivers],
  )
  const typeOptions = useMemo(() => sortServiceTypeOptions(types), [types])

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 300)
    return () => window.clearTimeout(id)
  }, [query])

  useEffect(() => {
    setPage(1)
    setDriverFilter('')
  }, [city.id])

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, statusFilter, fromDate, toDate, driverFilter, typeFilter])

  useEffect(() => {
    if (tab !== 'history') return
    const abort = new AbortController()
    const range = dateRangeIso(fromDate, toDate)
    setHistoryLoading(true)
    setHistoryError(null)
    void listServiceRecords({
      status: statusFilter === 'all' ? undefined : statusFilter,
      q: debouncedQuery.trim() || undefined,
      cityId: city.id,
      from: range.from,
      to: range.to,
      driverId: driverFilter || undefined,
      serviceTypeId: typeFilter || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      signal: abort.signal,
    })
      .then((next) => {
        setHistoryRecords(next.items)
        setHistoryTotal(next.total)
        setHistoryLoading(false)
      })
      .catch((err: unknown) => {
        if (abort.signal.aborted || isAbortError(err)) return
        setHistoryRecords([])
        setHistoryTotal(0)
        setHistoryLoading(false)
        setHistoryError(err instanceof Error ? err.message : 'No se pudo cargar el historial')
      })
    return () => abort.abort()
  }, [
    tab,
    city.id,
    statusFilter,
    debouncedQuery,
    fromDate,
    toDate,
    driverFilter,
    typeFilter,
    page,
  ])

  const visibleTypes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return types.filter(
      (item) =>
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    )
  }, [types, query])

  const totalPages = Math.max(1, Math.ceil(historyTotal / PAGE_SIZE))
  const pageStart = historyTotal === 0 ? 0 : (page - 1) * PAGE_SIZE
  const pageEnd = Math.min(pageStart + historyRecords.length, historyTotal)

  const selectedRecord = useMemo(
    () => historyRecords.find((record) => record.id === selectedId) ?? null,
    [selectedId, historyRecords],
  )

  function resetHistoryFilters() {
    setQuery('')
    setStatusFilter('all')
    setFromDate('')
    setToDate('')
    setDriverFilter('')
    setTypeFilter('')
    setSelectedId(null)
    setPage(1)
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  async function handleSubmit(draft: ServiceTypeDraft) {
    if (editing) await updateType(editing.id, draft)
    else await addType(draft)
  }

  return (
    <div className="flex h-full flex-col bg-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-snow">Servicios</h1>
          <p className="text-xs text-mist">
            {types.length} tipos · {historyTotal} viajes en {city.name}
          </p>
        </div>
        {tab === 'catalog' ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-signal px-3 py-2 text-sm font-semibold text-on-signal hover:bg-emerald-300"
          >
            <Plus className="size-4" />
            Nuevo tipo
          </button>
        ) : null}
      </header>

      <div className="flex flex-col gap-3 border-b border-line px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setTab(item.value)
                  resetHistoryFilters()
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  tab === item.value
                    ? 'bg-signal/15 text-signal'
                    : 'text-mist hover:bg-elevated hover:text-snow'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-[16rem] max-w-sm flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === 'catalog'
                  ? 'Buscar tipo de servicio…'
                  : 'Buscar por tipo, origen, cliente o conductor…'
              }
              className="w-full rounded-lg border border-line bg-panel py-2 pr-3 pl-9 text-sm text-snow placeholder:text-mist/50 focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
            />
          </div>
          {tab === 'history' ? (
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatusFilter(item.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    statusFilter === item.value
                      ? 'bg-signal/15 text-signal'
                      : 'text-mist hover:bg-elevated hover:text-snow'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {tab === 'history' ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-mist uppercase">
              Desde
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  const next = e.target.value
                  if (toDate && next && next > toDate) return
                  setFromDate(next)
                }}
                className={FILTER_INPUT_CLASS}
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-mist uppercase">
              Hasta
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  const next = e.target.value
                  if (fromDate && next && next < fromDate) return
                  setToDate(next)
                }}
                className={FILTER_INPUT_CLASS}
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-mist uppercase">
              Tipo
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={FILTER_INPUT_CLASS}
              >
                <option value="">Todos</option>
                {typeOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-mist uppercase">
              Conductor
              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className={FILTER_INPUT_CLASS}
              >
                <option value="">Todos</option>
                {cityDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>

      {tab === 'catalog' ? (
        <div className="flex-1 overflow-auto px-6 py-4">
          <CatalogTable
            types={visibleTypes}
            pendingDelete={pendingDelete}
            onEdit={(item) => {
              setEditing(item)
              setFormOpen(true)
            }}
            onAskDelete={setPendingDelete}
            onConfirmDelete={(id) => {
              void removeType(id)
              setPendingDelete(null)
            }}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
              {historyError ? (
                <p className="text-sm text-rose-300">{historyError}</p>
              ) : (
                <HistoryTable
                  records={historyRecords}
                  selectedId={selectedId}
                  loading={historyLoading}
                  onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
                />
              )}
            </div>
            {historyTotal > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-3">
                <p className="text-xs text-mist">
                  Mostrando {pageStart + 1}–{pageEnd} de {historyTotal}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs font-medium text-snow hover:border-mist/50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="size-3.5" />
                    Anterior
                  </button>
                  <span className="min-w-16 text-center text-xs text-mist">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs font-medium text-snow hover:border-mist/50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          {selectedRecord ? (
            <HistoryTrackPanel record={selectedRecord} onClose={() => setSelectedId(null)} />
          ) : null}
        </div>
      )}

      <ServiceTypeForm
        open={formOpen}
        serviceType={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

function CatalogTable({
  types,
  pendingDelete,
  onEdit,
  onAskDelete,
  onConfirmDelete,
}: {
  types: ServiceType[]
  pendingDelete: string | null
  onEdit: (item: ServiceType) => void
  onAskDelete: (id: string) => void
  onConfirmDelete: (id: string) => void
}) {
  return (
    <>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-ink text-[11px] tracking-wide text-mist uppercase">
          <tr className="border-b border-line">
            <th className="py-2 pr-3 font-medium">Tipo</th>
            <th className="py-2 pr-3 font-medium">Descripción</th>
            <th className="py-2 pr-3 font-medium">Vehículos</th>
            <th className="py-2 pr-3 font-medium">Estado</th>
            <th className="py-2 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {types.map((item) => (
            <tr key={item.id} className="border-b border-line/70 hover:bg-panel/70">
              <td className="py-3 pr-3 font-medium text-snow">{item.name}</td>
              <td className="py-3 pr-3 text-mist">{item.description || '—'}</td>
              <td className="py-3 pr-3 text-mist">
                {item.allowedVehicleTypes.map(vehicleTypeLabel).join(', ') || '—'}
              </td>
              <td className="py-3 pr-3">
                <span className={item.active ? 'text-signal' : 'text-mist'}>
                  {item.active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="rounded-md p-1.5 text-mist hover:bg-elevated hover:text-snow"
                    title="Editar"
                  >
                    <Pencil className="size-4" />
                  </button>
                  {pendingDelete === item.id ? (
                    <button
                      type="button"
                      onClick={() => onConfirmDelete(item.id)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-rose-300 hover:bg-danger/15"
                    >
                      Confirmar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAskDelete(item.id)}
                      className="rounded-md p-1.5 text-mist hover:bg-elevated hover:text-danger"
                      title="Eliminar"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {types.length === 0 ? (
        <p className="mt-8 text-center text-sm text-mist">No hay tipos de servicio.</p>
      ) : null}
    </>
  )
}

function HistoryTable({
  records,
  selectedId,
  loading,
  onSelect,
}: {
  records: ServiceRecord[]
  selectedId: string | null
  loading: boolean
  onSelect: (id: string) => void
}) {
  return (
    <>
      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-ink text-[11px] tracking-wide text-mist uppercase">
          <tr className="border-b border-line">
            <th className="py-2 pr-3 font-medium">Fecha</th>
            <th className="py-2 pr-3 font-medium">Tipo</th>
            <th className="py-2 pr-3 font-medium">Ruta</th>
            <th className="py-2 pr-3 font-medium">Cliente</th>
            <th className="py-2 pr-3 font-medium">Conductor</th>
            <th className="py-2 pr-3 font-medium">Monto</th>
            <th className="py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.id}
              onClick={() => onSelect(record.id)}
              className={`cursor-pointer border-b border-line/70 hover:bg-panel/70 ${
                selectedId === record.id ? 'bg-signal/10' : ''
              }`}
            >
              <td className="py-3 pr-3 text-mist">
                {new Date(record.createdAt).toLocaleString('es-VE', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </td>
              <td className="py-3 pr-3 text-snow">{record.typeName}</td>
              <td className="py-3 pr-3">
                <p className="text-snow">{record.origin}</p>
                <p className="text-xs text-mist">
                  → {record.destination}
                  {record.distanceM ? ` · ${formatDistance(record.distanceM)}` : ''}
                </p>
              </td>
              <td className="py-3 pr-3 text-mist">{record.clientName}</td>
              <td className="py-3 pr-3 text-mist">{record.driverName || '—'}</td>
              <td className="py-3 pr-3 font-medium text-snow">{record.amount || '—'}</td>
              <td className="py-3 text-mist">{STATUS_LABEL[record.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length === 0 ? (
        <p className="mt-8 text-center text-sm text-mist">
          {loading ? 'Cargando servicios…' : 'No hay servicios que coincidan con la búsqueda.'}
        </p>
      ) : null}
    </>
  )
}

function HistoryTrackPanel({
  record,
  onClose,
}: {
  record: ServiceRecord
  onClose: () => void
}) {
  const { city, settings } = useSettings()
  const [track, setTrack] = useState<ServiceTrack | null>(null)
  const [estimatedCoords, setEstimatedCoords] = useState<[number, number][]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const next = await fetchServiceTrack(record.id)
        if (!cancelled) {
          setTrack(next)
          setError(null)
        }
      } catch {
        if (!cancelled) setError('No se pudo cargar el recorrido.')
      }
    }

    void load()
    const live = isLiveServiceStatus(record.status)
    const timer =
      live && settings.mapRefreshSeconds > 0
        ? window.setInterval(() => {
            void load()
          }, settings.mapRefreshSeconds * 1000)
        : undefined

    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
    }
  }, [record.id, record.status, settings.mapRefreshSeconds])

  useEffect(() => {
    if (!track || track.source === 'gps' || !record.originCoords || !record.destCoords) {
      setEstimatedCoords([])
      return
    }

    const abort = new AbortController()
    void fetchDrivingRoute(record.originCoords, record.destCoords, abort.signal)
      .then((route) => setEstimatedCoords(route.coordinates))
      .catch((err: unknown) => {
        if (abort.signal.aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        setEstimatedCoords([])
      })

    return () => abort.abort()
  }, [record.destCoords, record.originCoords, track])

  const gpsCoords = useMemo(
    (): [number, number][] => track?.points.map((point) => [point.lng, point.lat]) ?? [],
    [track],
  )
  const estimated = track?.source !== 'gps'
  const coordinates = estimated ? estimatedCoords : gpsCoords
  const trackDistanceM = useMemo(() => pathDistanceM(gpsCoords), [gpsCoords])
  const hasMapData =
    gpsCoords.length > 0 || Boolean(record.originCoords) || Boolean(record.destCoords)

  return (
    <aside className="flex w-[min(44%,28rem)] shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-snow">{record.typeName}</p>
          <p className="truncate text-xs text-mist">
            {record.origin} → {record.destination}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-mist hover:bg-elevated hover:text-snow"
          title="Cerrar"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-b border-line px-4 py-3 text-xs">
        <p className="text-mist">Conductor</p>
        <p className="text-snow">{record.driverName || '—'}</p>
        <p className="text-mist">Estado</p>
        <p className="text-snow">{STATUS_LABEL[record.status]}</p>
        <p className="text-mist">Puntos GPS</p>
        <p className="text-snow">{track?.points.length ?? 0}</p>
        <p className="text-mist">{estimated ? 'Ruta' : 'Recorrido'}</p>
        <p className="text-snow">
          {estimated
            ? track?.source === 'none' && record.originCoords && record.destCoords
              ? 'Estimada'
              : 'Sin GPS'
            : trackDistanceM
              ? formatDistance(trackDistanceM)
              : 'GPS'}
        </p>
      </div>
      <div className="relative min-h-0 flex-1">
        {hasMapData ? (
          <ServiceTrackMap
            center={city.center}
            originCoords={record.originCoords}
            destCoords={record.destCoords}
            coordinates={coordinates}
            estimated={estimated && coordinates.length > 0}
          />
        ) : (
          <p className="px-4 py-8 text-center text-sm text-mist">
            Este servicio no tiene coordenadas ni recorrido GPS.
          </p>
        )}
        {error ? (
          <p className="absolute bottom-3 left-3 right-3 rounded-md bg-ink/80 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        ) : null}
        {estimated && coordinates.length > 0 ? (
          <p className="absolute top-3 left-3 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-medium text-amber-200">
            Ruta estimada
          </p>
        ) : null}
        {!estimated && gpsCoords.length > 0 ? (
          <p className="absolute top-3 left-3 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-medium text-signal">
            Recorrido GPS
          </p>
        ) : null}
      </div>
    </aside>
  )
}

function pathDistanceM(coords: [number, number][]): number {
  let total = 0
  for (let i = 1; i < coords.length; i += 1) {
    total += haversineMeters(coords[i - 1], coords[i])
  }
  return total
}
