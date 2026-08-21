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
  } = useDispatchFlow()

  if (!selectedDriver) return null

  const canMessageClient = order.clientPhone.replace(/\D/g, '').length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-signal/30 bg-signal/10 px-3 py-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-signal" />
        <DriverAvatar src={selectedDriver.driverPhoto} name={selectedDriver.name} />
        <div>
          <p className="text-sm font-semibold text-snow">
            Servicio asignado a {selectedDriver.name}
          </p>
          <p className="text-xs text-mist">
            {formatVehicleLine(selectedDriver.vehicleType, selectedDriver.vehicle)}
            {selectedDriver.licensePlate ? ` · ${selectedDriver.licensePlate}` : ''}
          </p>
        </div>
      </div>

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
