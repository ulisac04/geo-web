import { CheckCircle2, Copy, MessageCircle, Plus, Send, User } from 'lucide-react'
import DriverAvatar from './DriverAvatar'
import { useDispatchFlow } from '../context/DispatchContext'
import { formatVehicleLine } from '../lib/vehicles'

export default function ConfirmationStep() {
  const {
    selectedDriver,
    order,
    copied,
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

  if (!selectedDriver) return null

  const canMessageClient = order.clientPhone.replace(/\D/g, '').length > 0
  const status = offeredRecord?.status
  const waiting = !status || status === 'assigned'
  const taken = status === 'en_route' || status === 'in_progress'
  const rejected = status === 'pending'
  const closed = status === 'completed' || status === 'cancelled'
  const acting = actingTripId === acceptedServiceId
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

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void copyMessage('driver')}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-card py-2 text-sm text-snow hover:border-mist/50"
        >
          {copied === 'driver' ? (
            <MessageCircle className="size-4 text-signal" />
          ) : (
            <Copy className="size-4" />
          )}
          {copied === 'driver' ? 'Copiado' : 'Copiar conductor'}
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
