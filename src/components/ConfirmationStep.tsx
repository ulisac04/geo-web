import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Copy, IdCard, Plus, Send, X } from 'lucide-react'
import DriverAvatar from './DriverAvatar'
import { useDispatchFlow } from '../context/DispatchContext'
import { formatVehicleLine } from '../lib/vehicles'

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (minutes === 0) return `${seconds} s`
  return `${minutes} min ${seconds.toString().padStart(2, '0')} s`
}

export default function ConfirmationStep() {
  const {
    selectedDriver,
    order,
    copied,
    copyDriverFicha,
    copyMessage,
    sendWhatsApp,
    getFormattedMessage,
    resetOrder,
    offeredRecord,
    acceptedServiceId,
    confirmOffer,
    beginReassign,
    actingTripId,
  } = useDispatchFlow()

  const status = offeredRecord?.status
  const waiting = !status || status === 'assigned'
  const [offeredAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [fichaError, setFichaError] = useState<string | null>(null)
  const [fichaOpen, setFichaOpen] = useState(false)

  useEffect(() => {
    if (!waiting) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [waiting])

  useEffect(() => {
    if (!fichaOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFichaOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fichaOpen])

  if (!selectedDriver) return null

  const canMessageClient = order.clientPhone.replace(/\D/g, '').length > 0
  const taken = status === 'en_route' || status === 'in_progress'
  const rejected = status === 'pending'
  const closed = status === 'completed' || status === 'cancelled'
  const acting = actingTripId === acceptedServiceId
  const hasFicha = Boolean(selectedDriver.fichaPhoto.trim())

  const title = rejected
    ? `${selectedDriver.name} no tomó el servicio`
    : taken
      ? `Lo tomó ${selectedDriver.name}`
      : closed
        ? `Servicio ${status === 'completed' ? 'completado' : 'cancelado'}`
        : `Ofrecido a ${selectedDriver.name}`
  const subtitle = waiting
    ? 'Esperando que lo tome en la app, o confírmalo aquí.'
    : rejected
      ? 'Reasigna a otro conductor.'
      : formatVehicleLine(selectedDriver.vehicleType, selectedDriver.vehicle)

  return (
    <div className="space-y-4">
      <div
        className={`flex items-start gap-3 rounded-lg border px-3 py-3 ${
          waiting
            ? 'border-amber-400/40 bg-amber-400/10'
            : rejected
              ? 'border-danger/30 bg-danger/10'
              : 'border-signal/30 bg-signal/10'
        }`}
      >
        <CheckCircle2
          className={`mt-0.5 size-5 shrink-0 ${waiting ? 'text-amber-300' : 'text-signal'}`}
        />
        <DriverAvatar src={selectedDriver.driverPhoto} name={selectedDriver.name} />
        <div>
          <p className="text-sm font-semibold text-snow">{title}</p>
          <p className="text-xs text-mist">
            {subtitle}
            {selectedDriver.licensePlate ? ` · ${selectedDriver.licensePlate}` : ''}
          </p>
          {waiting ? (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium tabular-nums text-amber-200">
              <Clock className="size-3.5" />
              {formatElapsed(now - offeredAt)}
            </p>
          ) : null}
        </div>
      </div>

      {waiting || rejected ? (
        <div className="grid grid-cols-2 gap-2">
          {waiting ? (
            <button
              type="button"
              disabled={acting || !acceptedServiceId}
              onClick={() => void confirmOffer()}
              className="rounded-lg bg-signal py-2.5 text-sm font-semibold text-on-signal hover:bg-emerald-300 disabled:opacity-40"
            >
              Confirmar que lo tomó
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={acting || !acceptedServiceId}
            onClick={() => acceptedServiceId && void beginReassign(acceptedServiceId)}
            className="rounded-lg border border-line bg-card py-2.5 text-sm font-semibold text-snow hover:border-mist/50 disabled:opacity-40"
          >
            Reasignar
          </button>
        </div>
      ) : null}

      <pre className="max-h-36 overflow-auto rounded-lg border border-line bg-ink px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-mist">
        {getFormattedMessage('driver')}
      </pre>

      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-wide text-mist uppercase">Conductor</p>
          <div className="flex overflow-hidden rounded-lg border border-emerald-700/70">
            <button
              type="button"
              onClick={() => void sendWhatsApp('driver')}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 bg-emerald-600 px-2 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
            >
              <Send className="size-3.5 shrink-0" />
              <span className="truncate">{copied === 'driver' ? 'Abierto' : 'WhatsApp'}</span>
            </button>
            <button
              type="button"
              title="Copia el mensaje del conductor sin abrir WhatsApp"
              onClick={() => {
                setFichaError(null)
                void copyMessage('driver').catch((error: unknown) => {
                  setFichaError(
                    error instanceof Error ? error.message : 'No se pudo copiar el mensaje',
                  )
                })
              }}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 border-l border-emerald-700/70 bg-card px-2 py-2.5 text-xs font-semibold text-snow transition hover:bg-white/5"
            >
              <Copy
                className={`size-3.5 shrink-0 ${copied === 'driver-text' ? 'text-signal' : ''}`}
              />
              <span className="truncate">
                {copied === 'driver-text' ? 'Copiado' : 'Copiar msg'}
              </span>
            </button>
            <button
              type="button"
              disabled={!hasFicha}
              title={
                hasFicha
                  ? 'Ver y copiar la ficha del conductor'
                  : 'Este conductor no tiene ficha. Cárgala en Agenda.'
              }
              onClick={() => {
                setFichaError(null)
                setFichaOpen(true)
              }}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 border-l border-emerald-700/70 bg-card px-2 py-2.5 text-xs font-semibold text-snow transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IdCard className="size-3.5 shrink-0" />
              <span className="truncate">Ficha</span>
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-medium tracking-wide text-mist uppercase">Cliente</p>
          <div className="flex overflow-hidden rounded-lg border border-emerald-700/70">
            <button
              type="button"
              disabled={!canMessageClient}
              onClick={() => void sendWhatsApp('client')}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 bg-emerald-950/40 px-2 py-2.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="size-3.5 shrink-0" />
              <span className="truncate">{copied === 'client' ? 'Abierto' : 'WhatsApp'}</span>
            </button>
            <button
              type="button"
              title="Copia el mensaje del cliente sin abrir WhatsApp"
              onClick={() => {
                setFichaError(null)
                void copyMessage('client').catch((error: unknown) => {
                  setFichaError(
                    error instanceof Error ? error.message : 'No se pudo copiar el mensaje',
                  )
                })
              }}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 border-l border-emerald-700/70 bg-card px-2 py-2.5 text-xs font-semibold text-snow transition hover:bg-white/5"
            >
              <Copy
                className={`size-3.5 shrink-0 ${copied === 'client-text' ? 'text-signal' : ''}`}
              />
              <span className="truncate">
                {copied === 'client-text' ? 'Copiado' : 'Copiar msg'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {fichaError && !fichaOpen ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-rose-200">
          {fichaError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={resetOrder}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-card py-2.5 text-sm text-snow hover:border-mist/50"
      >
        <Plus className="size-4" />
        Nuevo pedido
      </button>

      {fichaOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setFichaOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ficha-dialog-title"
            className="w-full max-w-md rounded-2xl border border-line bg-panel p-5 shadow-none"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="ficha-dialog-title" className="text-base font-semibold text-snow">
                Ficha de {selectedDriver.name}
              </h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setFichaOpen(false)}
                className="rounded-md p-1 text-mist hover:bg-white/5 hover:text-snow"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-line bg-ink">
              <img
                src={selectedDriver.fichaPhoto}
                alt={`Ficha de ${selectedDriver.name}`}
                className="mx-auto max-h-[70vh] w-full object-contain"
              />
            </div>
            {fichaError ? (
              <p className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-rose-200">
                {fichaError}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFichaOpen(false)}
                className="rounded-lg border border-line bg-card px-3 py-2 text-sm text-snow hover:border-mist/50"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setFichaError(null)
                  void copyDriverFicha().catch((error: unknown) => {
                    setFichaError(
                      error instanceof Error ? error.message : 'No se pudo copiar la ficha',
                    )
                  })
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-signal px-3 py-2 text-sm font-semibold text-on-signal hover:bg-emerald-300"
              >
                <Copy className="size-4" />
                {copied === 'ficha' ? 'Ficha copiada' : 'Copiar ficha'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
