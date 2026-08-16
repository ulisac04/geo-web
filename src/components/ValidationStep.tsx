import { useMemo } from 'react'
import { Loader2, Navigation } from 'lucide-react'
import { useCosts } from '../context/CostsContext'
import { useDispatchFlow } from '../context/DispatchContext'
import { useServices } from '../context/ServicesContext'
import { estimateFare, formatFare } from '../lib/costs'
import { formatDistance, haversineMeters } from '../lib/geo'
import { resolvePlace } from '../lib/mock-data'

export default function ValidationStep() {
  const { order, updateOrder, searchDrivers, searching } = useDispatchFlow()
  const { types } = useServices()
  const { rules } = useCosts()

  const activeTypes = types.filter((item) => item.active)
  const typeOptions =
    order.serviceTypeId && !activeTypes.some((item) => item.id === order.serviceTypeId)
      ? [...activeTypes, types.find((item) => item.id === order.serviceTypeId)].filter(
          (item): item is NonNullable<typeof item> => Boolean(item),
        )
      : activeTypes

  const estimate = useMemo(() => {
    if (!order.originCoords || !order.destCoords) return null
    const distanceM = haversineMeters(order.originCoords, order.destCoords)
    return estimateFare(distanceM, new Date(), rules)
  }, [order.originCoords, order.destCoords, rules])

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

      {typeOptions.length > 0 ? (
        <label className="block space-y-1">
          <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
            Tipo de servicio
          </span>
          <select
            value={order.serviceTypeId}
            onChange={(e) => updateOrder({ serviceTypeId: e.target.value })}
            className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
          >
            {typeOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

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

      {estimate ? (
        <div className="rounded-lg border border-line bg-card px-3 py-2">
          <p className="text-[11px] font-medium tracking-wide text-mist uppercase">
            Tarifa estimada
          </p>
          <p className="mt-1 text-sm text-snow">
            {formatFare(estimate.total)}
            <span className="ml-2 text-xs text-mist">
              {formatDistance(estimate.distanceM)} · dist. {formatFare(estimate.distanceSubtotal)}
              {estimate.nightSurcharge > 0
                ? ` · noche ${formatFare(estimate.nightSurcharge)}`
                : ''}
            </span>
          </p>
          <button
            type="button"
            onClick={() => updateOrder({ amount: formatFare(estimate.total) })}
            className="mt-2 text-xs font-medium text-signal hover:text-emerald-300"
          >
            Usar tarifa
          </button>
        </div>
      ) : null}

      <button
        type="button"
        disabled={!ready || searching}
        onClick={() => void searchDrivers()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-signal py-2.5 text-sm font-semibold text-on-signal transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
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
