import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import ServiceTypeForm from '../components/ServiceTypeForm'
import { useServices } from '../context/ServicesContext'
import { formatDistance } from '../lib/geo'
import type { ServiceRecord, ServiceStatus, ServiceType, ServiceTypeDraft } from '../types'

type Tab = 'catalog' | 'history'

const TABS: { value: Tab; label: string }[] = [
  { value: 'catalog', label: 'Catálogo' },
  { value: 'history', label: 'Historial' },
]

const STATUS_FILTERS: { value: 'all' | ServiceStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'assigned', label: 'Asignados' },
  { value: 'completed', label: 'Completados' },
  { value: 'cancelled', label: 'Cancelados' },
]

const STATUS_LABEL: Record<ServiceStatus, string> = {
  assigned: 'Asignado',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

export default function ServicesPage() {
  const { types, records, addType, updateType, removeType } = useServices()
  const [tab, setTab] = useState<Tab>('catalog')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ServiceStatus>('all')
  const [editing, setEditing] = useState<ServiceType | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const visibleTypes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return types.filter(
      (item) =>
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    )
  }, [types, query])

  const visibleRecords = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records.filter((record) => {
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter
      const matchesQuery =
        !q ||
        record.typeName.toLowerCase().includes(q) ||
        record.origin.toLowerCase().includes(q) ||
        record.destination.toLowerCase().includes(q) ||
        record.clientName.toLowerCase().includes(q) ||
        record.driverName.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [records, query, statusFilter])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function handleSubmit(draft: ServiceTypeDraft) {
    if (editing) updateType(editing.id, draft)
    else addType(draft)
  }

  return (
    <div className="flex h-full flex-col bg-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-snow">Servicios</h1>
          <p className="text-xs text-mist">
            {types.length} tipos · {records.length} viajes
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

      <div className="flex items-center gap-3 border-b border-line px-6 py-3">
        <div className="flex gap-1">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setTab(item.value)
                setQuery('')
                setStatusFilter('all')
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
        <div className="relative max-w-sm flex-1">
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
          <div className="flex gap-1">
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

      <div className="flex-1 overflow-auto px-6 py-4">
        {tab === 'catalog' ? (
          <CatalogTable
            types={visibleTypes}
            pendingDelete={pendingDelete}
            onEdit={(item) => {
              setEditing(item)
              setFormOpen(true)
            }}
            onAskDelete={setPendingDelete}
            onConfirmDelete={(id) => {
              removeType(id)
              setPendingDelete(null)
            }}
          />
        ) : (
          <HistoryTable records={visibleRecords} />
        )}
      </div>

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
            <th className="py-2 pr-3 font-medium">Estado</th>
            <th className="py-2 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {types.map((item) => (
            <tr key={item.id} className="border-b border-line/70 hover:bg-panel/70">
              <td className="py-3 pr-3 font-medium text-snow">{item.name}</td>
              <td className="py-3 pr-3 text-mist">{item.description || '—'}</td>
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

function HistoryTable({ records }: { records: ServiceRecord[] }) {
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
            <tr key={record.id} className="border-b border-line/70 hover:bg-panel/70">
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
              <td className="py-3 pr-3 text-mist">{record.driverName}</td>
              <td className="py-3 pr-3 font-medium text-snow">{record.amount || '—'}</td>
              <td className="py-3 text-mist">{STATUS_LABEL[record.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length === 0 ? (
        <p className="mt-8 text-center text-sm text-mist">
          No hay servicios que coincidan con la búsqueda.
        </p>
      ) : null}
    </>
  )
}
