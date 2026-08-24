import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Copy, Plus, Send, User } from 'lucide-react'
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

  useEffect(() => {
    if (!waiting) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [waiting])

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

      <button
        type="button"
        onClick={() => void sendWhatsApp('driver')}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
      >
        <Send className="size-4" />
        {copied === 'driver' ? 'Copiado · WhatsApp conductor' : 'WhatsApp conductor'}
      </button>

      <button
        type="button"
        disabled={!canMessageClient}
        onClick={() => void sendWhatsApp('client')}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-700/70 bg-emerald-950/40 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <User className="size-4" />
        {copied === 'client' ? 'Copiado · WhatsApp cliente' : 'WhatsApp cliente'}
      </button>

      {fichaError ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-rose-200">
          {fichaError}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!hasFicha}
          title={
            hasFicha
              ? 'Copia la ficha del conductor al portapapeles'
              : 'Este conductor no tiene ficha. Cárgala en Agenda.'
          }
          onClick={() => {
            setFichaError(null)
            void copyDriverFicha().catch((error: unknown) => {
              setFichaError(
                error instanceof Error ? error.message : 'No se pudo copiar la ficha',
              )
            })
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-card py-2 text-sm text-snow hover:border-mist/50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Copy className={`size-4 ${copied === 'ficha' ? 'text-signal' : ''}`} />
          {copied === 'ficha' ? 'Ficha copiada' : 'Copiar conductor'}
        </button>
        <button
          type="button"
          onClick={resetOrder}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-card py-2 text-sm text-snow hover:border-mist/50"
        >
          <Plus className="size-4" />
          Nuevo Pedido
        </button>
      </div>
    </div>
  )
}
