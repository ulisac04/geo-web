import { Clock, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useDispatchFlow } from '../context/DispatchContext'
import { formatScheduleWhen, isScheduleDue, toDatetimeLocalValue } from '../lib/schedule'

export default function ScheduledTripsList() {
  const {
    scheduledRecords,
    focusedScheduledId,
    focusScheduled,
    beginDispatchScheduled,
    rescheduleService,
    cancelTrip,
    actingTripId,
    searching,
  } = useDispatchFlow()

  if (scheduledRecords.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-ink px-3 py-8 text-center text-sm text-mist">
        No hay servicios agendados.
      </p>
    )
  }

  const due = scheduledRecords.filter(
    (record) => record.scheduledAt && isScheduleDue(record.scheduledAt),
  )
  const upcoming = scheduledRecords.filter(
    (record) => record.scheduledAt && !isScheduleDue(record.scheduledAt),
  )

  return (
    <div className="space-y-4">
      {due.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold tracking-wide text-amber-300 uppercase">
            Listos para despachar
          </p>
          {due.map((record) => (
            <ScheduledCard
              key={record.id}
              record={record}
              highlighted={focusedScheduledId === record.id}
              acting={actingTripId === record.id}
              searching={searching}
              onFocus={() => focusScheduled(record.id)}
              onDispatch={() => void beginDispatchScheduled(record.id)}
              onReschedule={(iso) => void rescheduleService(record.id, iso)}
              onCancel={() => void cancelTrip(record.id)}
            />
          ))}
        </section>
      ) : null}
      {upcoming.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold tracking-wide text-mist uppercase">Próximos</p>
          {upcoming.map((record) => (
            <ScheduledCard
              key={record.id}
              record={record}
              highlighted={focusedScheduledId === record.id}
              acting={actingTripId === record.id}
              searching={searching}
              onFocus={() => focusScheduled(record.id)}
              onDispatch={() => void beginDispatchScheduled(record.id)}
              onReschedule={(iso) => void rescheduleService(record.id, iso)}
              onCancel={() => void cancelTrip(record.id)}
            />
          ))}
        </section>
      ) : null}
    </div>
  )
}

function ScheduledCard({
  record,
  highlighted,
  acting,
  searching,
  onFocus,
  onDispatch,
  onReschedule,
  onCancel,
}: {
  record: {
    id: string
    clientName: string
    origin: string
    destination: string
    typeName: string
    scheduledAt: string | null
  }
  highlighted: boolean
  acting: boolean
  searching: boolean
  onFocus: () => void
  onDispatch: () => void
  onReschedule: (iso: string) => void
  onCancel: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [when, setWhen] = useState(() =>
    record.scheduledAt ? toDatetimeLocalValue(record.scheduledAt) : '',
  )
  const due = Boolean(record.scheduledAt && isScheduleDue(record.scheduledAt))

  return (
    <article
      onClick={onFocus}
      className={`cursor-pointer rounded-lg border p-3 transition ${
        highlighted ? 'border-signal/60 bg-signal/10' : 'border-line bg-card hover:border-mist/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-snow">
            {record.clientName || 'Sin nombre'}
          </h3>
          <p className="truncate text-xs text-snow">{record.origin}</p>
          <p className="truncate text-[11px] text-mist">→ {record.destination}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            due ? 'bg-amber-400/15 text-amber-300' : 'bg-elevated text-mist'
          }`}
        >
          <Clock className="size-3" />
          {record.scheduledAt ? formatScheduleWhen(record.scheduledAt) : 'Sin hora'}
        </span>
      </div>
      <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-mist">
        <MapPin className="size-3 text-signal" />
        {record.typeName}
      </p>
      {editing ? (
        <div className="mt-2 flex gap-1.5" onClick={(event) => event.stopPropagation()}>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-line bg-ink px-2 py-1.5 text-xs text-snow"
          />
          <button
            type="button"
            className="rounded-md bg-signal px-2 py-1 text-[11px] font-semibold text-on-signal"
            onClick={() => {
              const iso = new Date(when).toISOString()
              onReschedule(iso)
              setEditing(false)
            }}
          >
            Guardar
          </button>
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          disabled={acting || searching}
          onClick={onDispatch}
          className="rounded-md bg-signal px-2.5 py-1 text-[11px] font-semibold text-on-signal disabled:opacity-50"
        >
          Despachar
        </button>
        <button
          type="button"
          disabled={acting}
          onClick={() => setEditing((current) => !current)}
          className="rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-mist hover:text-snow"
        >
          {editing ? 'Cerrar' : 'Cambiar hora'}
        </button>
        <button
          type="button"
          disabled={acting}
          onClick={onCancel}
          className="rounded-md px-2.5 py-1 text-[11px] font-medium text-rose-300 hover:bg-danger/10"
        >
          Cancelar
        </button>
      </div>
    </article>
  )
}
