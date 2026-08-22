import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useCosts } from '../context/CostsContext'
import { useDispatchFlow } from '../context/DispatchContext'
import { useServices } from '../context/ServicesContext'
import { useSettings } from '../context/SettingsContext'
import { estimateFare, formatFare, requestFareEstimate } from '../lib/costs'
import { formatDistance, haversineMeters } from '../lib/geo'
import PlaceSearchField from './PlaceSearchField'
import type { FareEstimate } from '../types'

export default function ValidationStep() {
  const { city } = useSettings()
  const {
    order,
    updateOrder,
    acceptService,
    searching,
    searchError,
    activePin,
    setActivePin,
  } = useDispatchFlow()
  const { types } = useServices()
  const { rules } = useCosts()

  const activeTypes = types.filter((item) => item.active)
  const typeOptions =
    order.serviceTypeId && !activeTypes.some((item) => item.id === order.serviceTypeId)
      ? [...activeTypes, types.find((item) => item.id === order.serviceTypeId)].filter(
          (item): item is NonNullable<typeof item> => Boolean(item),
        )
      : activeTypes

  const localEstimate = useMemo(() => {
    if (!order.originCoords || !order.destCoords) return null
    const distanceM = haversineMeters(order.originCoords, order.destCoords)
    return estimateFare(distanceM, new Date(), rules)
  }, [order.originCoords, order.destCoords, rules])

  const [remoteEstimate, setRemoteEstimate] = useState<FareEstimate | null>(null)

  useEffect(() => {
    if (!order.originCoords || !order.destCoords) {
      setRemoteEstimate(null)
      return
    }
    let cancelled = false
    const handle = window.setTimeout(() => {
      const distanceM = haversineMeters(order.originCoords!, order.destCoords!)
      void requestFareEstimate({
        distanceM,
        originCoords: order.originCoords,
        destCoords: order.destCoords,
      })
        .then((next) => {
          if (!cancelled) setRemoteEstimate(next)
        })
        .catch(() => {
          if (!cancelled) setRemoteEstimate(null)
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [order.originCoords, order.destCoords, rules])

  const estimate = remoteEstimate ?? localEstimate

  const ready =
    Boolean(order.originCoords) &&
    Boolean(order.destCoords) &&
    Boolean(order.origin.trim()) &&
    Boolean(order.destination.trim()) &&
    Boolean(order.clientName.trim()) &&
    Boolean(order.clientPhone.trim())

  return (
    <div className="space-y-3">
      <p className="text-xs text-mist">
        Busca como en Maps: el pin es una referencia. Debajo, el operador escribe el punto exacto.
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

      <PlaceSearchField
        label="Origen (Punto A)"
        value={order.origin}
        active={activePin === 'origin'}
        hasCoords={Boolean(order.originCoords)}
        hint={order.originHint}
        placeholder={`Empieza a escribir un barrio de ${city.name}…`}
        accent="origin"
        onActivate={() => setActivePin('origin')}
        onQueryChange={(value) => updateOrder({ origin: value, originHint: '' })}
        onSelect={(hit) => {
          setActivePin('dest')
          updateOrder({
            origin: hit.label,
            originCoords: hit.coords,
            originHint: hit.secondary ? `${hit.label}, ${hit.secondary}` : hit.label,
          })
        }}
      >
        <Field
          label="Punto exacto"
          value={order.originExact}
          placeholder="Apto, local, portón, km…"
          onChange={(value) => updateOrder({ originExact: value })}
        />
      </PlaceSearchField>
      <PlaceSearchField
        label="Destino (Punto B)"
        value={order.destination}
        active={activePin === 'dest'}
        hasCoords={Boolean(order.destCoords)}
        hint={order.destHint}
        placeholder={`Empieza a escribir un barrio de ${city.name}…`}
        accent="dest"
        onActivate={() => setActivePin('dest')}
        onQueryChange={(value) => updateOrder({ destination: value, destHint: '' })}
        onSelect={(hit) => {
          updateOrder({
            destination: hit.label,
            destCoords: hit.coords,
            destHint: hit.secondary ? `${hit.label}, ${hit.secondary}` : hit.label,
          })
        }}
      >
        <Field
          label="Punto exacto"
          value={order.destExact}
          placeholder="Apto, local, portón, km…"
          onChange={(value) => updateOrder({ destExact: value })}
        />
      </PlaceSearchField>
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
      <Field
        label="Notas"
        value={order.notes}
        onChange={(value) => updateOrder({ notes: value })}
      />

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
      ) : (
        <p className="rounded-lg border border-line bg-ink px-3 py-2 text-xs text-mist">
          Coloca A y B para ver la ruta y la tarifa.
        </p>
      )}

      {searchError ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-rose-200">
          {searchError}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!ready || searching}
        onClick={() => void acceptService()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-signal py-2.5 text-sm font-semibold text-on-signal transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {searching ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        {searching ? 'Creando servicio…' : 'Aceptar servicio'}
      </button>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium tracking-wide text-mist uppercase">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow placeholder:text-mist/40 focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
      />
    </label>
  )
}
