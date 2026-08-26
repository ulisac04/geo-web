import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useDispatchFlow } from '../context/DispatchContext'
import { useServices } from '../context/ServicesContext'
import { useSettings } from '../context/SettingsContext'
import { convertFromUsd } from '../lib/money'
import { defaultScheduleLocal, fromDatetimeLocal } from '../lib/schedule'
import { sortServiceTypeOptions } from '../lib/services'
import PhoneField from './PhoneField'
import PlaceSearchField from './PlaceSearchField'

export default function ValidationStep() {
  const { city, settings } = useSettings()
  const {
    order,
    updateOrder,
    acceptService,
    scheduleService,
    searching,
    searchError,
    activePin,
    setActivePin,
  } = useDispatchFlow()
  const { types } = useServices()
  const [scheduleLater, setScheduleLater] = useState(false)
  const [scheduledLocal, setScheduledLocal] = useState(() => defaultScheduleLocal())

  const activeTypes = types.filter((item) => item.active)
  const typeOptions = sortServiceTypeOptions(
    order.serviceTypeId && !activeTypes.some((item) => item.id === order.serviceTypeId)
      ? [...activeTypes, types.find((item) => item.id === order.serviceTypeId)].filter(
          (item): item is NonNullable<typeof item> => Boolean(item),
        )
      : activeTypes,
  )

  const ready =
    Boolean(order.originCoords) &&
    Boolean(order.destCoords) &&
    Boolean(order.origin.trim()) &&
    Boolean(order.destination.trim()) &&
    Boolean(order.clientName.trim()) &&
    Boolean(order.clientPhone.trim())
  const scheduledIso = fromDatetimeLocal(scheduledLocal)
  const scheduleReady =
    ready && Boolean(scheduledIso) && new Date(scheduledIso as string).getTime() > Date.now()

  return (
    <div className="space-y-3">
      <p className="text-xs text-mist">
        Busca como en Maps: el pin es una referencia. Debajo, el operador escribe el punto exacto.
      </p>

      {typeOptions.length > 0 ? (
        <div className="space-y-1">
          <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
            Tipo de servicio
          </span>
          <div
            role="group"
            aria-label="Tipo de servicio"
            className="flex w-full overflow-hidden rounded-lg border border-line bg-ink"
          >
            {typeOptions.map((item, index) => {
              const active = order.serviceTypeId === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => updateOrder({ serviceTypeId: item.id })}
                  className={`flex-1 px-3 py-1.5 text-xs font-semibold transition ${
                    index > 0 ? 'border-l border-line' : ''
                  } ${
                    active
                      ? 'bg-signal/15 text-signal'
                      : 'text-mist hover:bg-elevated hover:text-snow'
                  }`}
                >
                  {item.name}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <PlaceSearchField
        label="Origen (Punto A)"
        value={order.origin}
        active={activePin === 'origin'}
        hasCoords={Boolean(order.originCoords)}
        hint={order.originHint}
        placeholder={`Empieza a escribir un barrio de ${city.name}…`}
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
      <Field
        label="Nombre cliente"
        value={order.clientName}
        onChange={(value) => updateOrder({ clientName: value })}
      />
      <PhoneField
        label="Teléfono"
        value={order.clientPhone}
        onChange={(value) => updateOrder({ clientPhone: value })}
      />
      <AmountFields
        usd={order.amount}
        usdToCop={settings.usdToCop}
        usdToVes={settings.usdToVes}
        onUsdChange={(value) => updateOrder({ amount: value })}
      />
      <label className="block space-y-1">
        <span className="text-[11px] font-medium tracking-wide text-mist uppercase">Notas</span>
        <textarea
          value={order.notes}
          rows={4}
          onChange={(e) => updateOrder({ notes: e.target.value })}
          className="w-full resize-y rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow placeholder:text-mist/40 focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
        />
      </label>

      {settings.schedulingEnabled ? (
        <div className="space-y-2 rounded-lg border border-line bg-ink px-3 py-3">
          <label className="flex items-center justify-between gap-3 text-sm text-snow">
            Agendar para más tarde
            <input
              type="checkbox"
              checked={scheduleLater}
              onChange={(e) => setScheduleLater(e.target.checked)}
              className="size-4 accent-emerald-400"
            />
          </label>
          {scheduleLater ? (
            <label className="block space-y-1">
              <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                Fecha y hora
              </span>
              <input
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
                className="w-full rounded-md border border-line bg-panel px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {searchError ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-rose-200">
          {searchError}
        </p>
      ) : null}

      <button
        type="button"
        disabled={
          searching ||
          (scheduleLater && settings.schedulingEnabled ? !scheduleReady : !ready)
        }
        onClick={() => {
          if (scheduleLater && settings.schedulingEnabled && scheduledIso) {
            void scheduleService(scheduledIso)
            return
          }
          void acceptService()
        }}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-signal py-2.5 text-sm font-semibold text-on-signal transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {searching ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        {searching
          ? scheduleLater
            ? 'Agendando…'
            : 'Creando servicio…'
          : scheduleLater && settings.schedulingEnabled
            ? 'Agendar servicio'
            : 'Aceptar servicio'}
      </button>
    </div>
  )
}

function AmountFields({
  usd,
  usdToCop,
  usdToVes,
  onUsdChange,
}: {
  usd: string
  usdToCop: number
  usdToVes: number
  onUsdChange: (value: string) => void
}) {
  const cop = convertFromUsd(usd, usdToCop)
  const ves = convertFromUsd(usd, usdToVes)
  return (
    <div className="grid grid-cols-3 gap-2">
      <label className="block space-y-1">
        <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
          🇺🇸 USD
        </span>
        <input
          value={usd}
          inputMode="decimal"
          placeholder="0.00"
          onChange={(e) => onUsdChange(e.target.value)}
          className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow placeholder:text-mist/40 focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
          🇨🇴 COP
        </span>
        <input
          value={cop}
          readOnly
          tabIndex={-1}
          placeholder="—"
          className="w-full cursor-default rounded-md border border-line bg-ink/60 px-2.5 py-1.5 text-sm text-mist placeholder:text-mist/40 outline-none"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
          🇻🇪 VES
        </span>
        <input
          value={ves}
          readOnly
          tabIndex={-1}
          placeholder="—"
          className="w-full cursor-default rounded-md border border-line bg-ink/60 px-2.5 py-1.5 text-sm text-mist placeholder:text-mist/40 outline-none"
        />
      </label>
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
