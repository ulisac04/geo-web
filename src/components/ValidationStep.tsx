import { Loader2, Navigation } from 'lucide-react'
import { useDispatchFlow } from '../context/DispatchContext'
import { resolvePlace } from '../lib/mock-data'

export default function ValidationStep() {
  const { order, updateOrder, searchDrivers, searching } = useDispatchFlow()

  const ready =
    order.origin.trim() &&
    order.destination.trim() &&
    order.clientName.trim() &&
    order.clientPhone.trim()

  return (
    <div className="space-y-3">
      <p className="text-xs text-mist">
        Revisa y corrige los campos extraídos antes de buscar conductores.
      </p>

      <Field
        label="Origen (Punto A)"
        value={order.origin}
        onChange={(value) =>
          updateOrder({ origin: value, originCoords: resolvePlace(value) ?? order.originCoords })
        }
      />
      <Field
        label="Destino (Punto B)"
        value={order.destination}
        onChange={(value) =>
          updateOrder({
            destination: value,
            destCoords: resolvePlace(value) ?? order.destCoords,
          })
        }
      />
      <div className="grid grid-cols-2 gap-2">
        <Field
          label="Nombre cliente"
          value={order.clientName}
          onChange={(value) => updateOrder({ clientName: value })}
        />
        <Field
          label="Teléfono"
          value={order.clientPhone}
          onChange={(value) => updateOrder({ clientPhone: value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field
          label="Método de pago"
          value={order.paymentMethod}
          onChange={(value) => updateOrder({ paymentMethod: value })}
        />
        <Field
          label="Monto"
          value={order.amount}
          onChange={(value) => updateOrder({ amount: value })}
        />
      </div>

      <button
        type="button"
        disabled={!ready || searching}
        onClick={() => void searchDrivers()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-signal py-2.5 text-sm font-semibold text-ink transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {searching ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
        {searching ? 'Buscando cercanos…' : 'Buscar Conductores Cercanos'}
      </button>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium tracking-wide text-mist uppercase">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
      />
    </label>
  )
}
