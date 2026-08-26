import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { CITIES } from '../lib/cities'
import { parseUsd } from '../lib/money'
import { MAP_REFRESH_OPTIONS, OFFER_WAIT_OPTIONS, REMINDER_MINUTE_OPTIONS, type ReminderMinutes } from '../lib/settings'
import {
  DEFAULT_CLIENT_TEMPLATE,
  DEFAULT_DRIVER_TEMPLATE,
  WHATSAPP_TOKENS,
  buildClientMessage,
  buildDispatchMessage,
  resolveWhatsAppTemplate,
} from '../lib/whatsapp'
import { useSettings } from '../context/SettingsContext'
import type { CityId, Driver, MapRefreshSeconds, OfferWaitSeconds, OrderDraft } from '../types'

export default function SettingsPage() {
  const {
    settings,
    city,
    setCityId,
    setMapRefreshSeconds,
    setUsdToCop,
    setUsdToVes,
    setWhatsappDriverTemplate,
    setWhatsappClientTemplate,
    setSchedulingEnabled,
    setSchedulingReminderMinutes,
    setOfferWaitSeconds,
  } = useSettings()
  const [copDraft, setCopDraft] = useState(rateDraft(settings.usdToCop))
  const [vesDraft, setVesDraft] = useState(rateDraft(settings.usdToVes))

  useEffect(() => {
    setCopDraft(rateDraft(settings.usdToCop))
  }, [settings.usdToCop])

  useEffect(() => {
    setVesDraft(rateDraft(settings.usdToVes))
  }, [settings.usdToVes])

  return (
    <div className="flex h-full flex-col bg-ink">
      <header className="border-b border-line px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-snow">Configuración</h1>
          <span className="rounded-full border border-signal/40 bg-signal/15 px-2.5 py-0.5 text-xs font-medium text-signal">
            {city.name}
          </span>
        </div>
        <p className="text-xs text-mist">Ajustes operativos del despacho</p>
      </header>

      <div className="grid flex-1 grid-cols-1 items-start gap-4 overflow-auto px-6 py-6 lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-xl border border-line bg-panel p-5">
            <h2 className="text-sm font-semibold text-snow">Ciudad operativa</h2>
            <p className="mt-1 text-xs text-mist">
              El mapa, el autocomplete y la flota siguen esta ciudad. Cambia a San Cristóbal para
              probar el despacho allá.
            </p>
            <label className="mt-4 block space-y-1">
              <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                Ciudad
              </span>
              <select
                value={settings.cityId}
                onChange={(e) => void setCityId(e.target.value as CityId)}
                className="w-full rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
              >
                {CITIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.country}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="rounded-xl border border-line bg-panel p-5">
            <h2 className="text-sm font-semibold text-snow">Refresco del mapa</h2>
            <p className="mt-1 text-xs text-mist">
              Cada cuánto se actualizan las posiciones de la flota en el mapa.
            </p>
            <label className="mt-4 block space-y-1">
              <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                Intervalo
              </span>
              <select
                value={settings.mapRefreshSeconds}
                onChange={(e) =>
                  void setMapRefreshSeconds(Number(e.target.value) as MapRefreshSeconds)
                }
                className="w-full rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
              >
                {MAP_REFRESH_OPTIONS.map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {seconds} segundos
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="rounded-xl border border-line bg-panel p-5">
            <h2 className="text-sm font-semibold text-snow">Espera de oferta</h2>
            <p className="mt-1 text-xs text-mist">
              Tiempo máximo esperando que el chofer tome el servicio. Al cumplirse, la oferta avisa
              para reasignar.
            </p>
            <label className="mt-4 block space-y-1">
              <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                Máximo de espera
              </span>
              <select
                value={settings.offerWaitSeconds}
                onChange={(e) =>
                  void setOfferWaitSeconds(Number(e.target.value) as OfferWaitSeconds)
                }
                className="w-full rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
              >
                {OFFER_WAIT_OPTIONS.map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {seconds} segundos
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="rounded-xl border border-line bg-panel p-5">
            <h2 className="text-sm font-semibold text-snow">Tasas del día</h2>
            <p className="mt-1 text-xs text-mist">
              Cuántos pesos y bolívares equivalen a 1 dólar. El despacho convierte el monto USD con
              estas tasas.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                  🇨🇴 Peso (COP)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={copDraft}
                  placeholder="COP por 1 USD"
                  onChange={(e) => setCopDraft(e.target.value)}
                  onBlur={() =>
                    void commitRate(copDraft, settings.usdToCop, setUsdToCop, setCopDraft)
                  }
                  className="w-full rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-snow placeholder:text-mist/40 focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                  🇻🇪 Bolívar (VES)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={vesDraft}
                  placeholder="VES por 1 USD"
                  onChange={(e) => setVesDraft(e.target.value)}
                  onBlur={() =>
                    void commitRate(vesDraft, settings.usdToVes, setUsdToVes, setVesDraft)
                  }
                  className="w-full rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-snow placeholder:text-mist/40 focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-panel p-5">
            <h2 className="text-sm font-semibold text-snow">Agendar servicios</h2>
            <p className="mt-1 text-xs text-mist">
              Permite guardar pedidos con fecha y hora. El chofer se elige cuando llega el momento.
              El recordatorio suena en este navegador si el dashboard está abierto.
            </p>
            <label className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm text-snow">Activar agendado</span>
              <input
                type="checkbox"
                checked={settings.schedulingEnabled}
                onChange={(e) => void setSchedulingEnabled(e.target.checked)}
                className="size-4 accent-emerald-400"
              />
            </label>
            <label className="mt-4 block space-y-1">
              <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                Avisar con anticipación
              </span>
              <select
                value={settings.schedulingReminderMinutes}
                disabled={!settings.schedulingEnabled}
                onChange={(e) =>
                  void setSchedulingReminderMinutes(Number(e.target.value) as ReminderMinutes)
                }
                className="w-full rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none disabled:opacity-50"
              >
                {REMINDER_MINUTE_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} minutos antes
                  </option>
                ))}
              </select>
            </label>
            <NotificationPermissionButton enabled={settings.schedulingEnabled} />
          </section>
        </div>

        <section className="min-w-0 rounded-xl border border-line bg-panel p-5">
          <h2 className="text-sm font-semibold text-snow">Mensajes de WhatsApp</h2>
          <p className="mt-1 text-xs text-mist">
            Plantillas que se copian al conductor y al cliente. Vacío o Restablecer vuelve al
            mensaje por defecto. Las variables vacías (sin monto, notas o placa) se omiten.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <TemplateEditor
              title="Al conductor"
              stored={settings.whatsappDriverTemplate}
              fallback={DEFAULT_DRIVER_TEMPLATE}
              preview={(template) =>
                buildDispatchMessage(
                  PREVIEW_ORDER,
                  PREVIEW_DRIVER,
                  { usdToCop: settings.usdToCop, usdToVes: settings.usdToVes },
                  template,
                )
              }
              onSave={setWhatsappDriverTemplate}
            />
            <TemplateEditor
              title="Al cliente"
              stored={settings.whatsappClientTemplate}
              fallback={DEFAULT_CLIENT_TEMPLATE}
              preview={(template) =>
                buildClientMessage(
                  PREVIEW_ORDER,
                  PREVIEW_DRIVER,
                  template,
                  'https://tu-ruta.app/s/demo',
                )
              }
              onSave={setWhatsappClientTemplate}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function NotificationPermissionButton({ enabled }: { enabled: boolean }) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )

  if (!enabled || permission === 'unsupported') return null

  if (permission === 'granted') {
    return (
      <p className="mt-3 text-[11px] text-signal">Notificaciones del navegador activadas.</p>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        void Notification.requestPermission().then((next) => setPermission(next))
      }}
      className="mt-4 w-full rounded-lg border border-line bg-ink px-3 py-2 text-xs font-medium text-snow hover:border-signal/40"
    >
      {permission === 'denied'
        ? 'Notificaciones bloqueadas en el navegador'
        : 'Permitir notificaciones del navegador'}
    </button>
  )
}

function TemplateEditor({
  title,
  stored,
  fallback,
  preview,
  onSave,
}: {
  title: string
  stored: string
  fallback: string
  preview: (template: string) => string
  onSave: (template: string) => Promise<void>
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState(() => resolveWhatsAppTemplate(stored, fallback))

  useEffect(() => {
    setDraft(resolveWhatsAppTemplate(stored, fallback))
  }, [stored, fallback])

  const previewText = useMemo(() => preview(draft), [draft, preview])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-mist">{title}</h3>
        <button
          type="button"
          onClick={() => {
            setDraft(fallback)
            void commitTemplate(fallback, stored, fallback, onSave)
          }}
          className="text-[11px] text-signal hover:underline"
        >
          Restablecer
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {WHATSAPP_TOKENS.map((item) => (
          <button
            key={item.token}
            type="button"
            onClick={() => insertToken(textareaRef, item.token, draft, setDraft)}
            className="rounded-full border border-line bg-ink px-2 py-0.5 text-[10px] text-mist hover:border-signal/40 hover:text-snow"
            title={item.label}
          >
            {item.token}
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={draft}
        rows={9}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commitTemplate(draft, stored, fallback, onSave)}
        className="w-full resize-y rounded-md border border-line bg-ink px-2.5 py-2 font-mono text-xs leading-5 text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
      />
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-mist">Vista previa</p>
        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-ink px-2.5 py-2 text-xs text-snow/90">
          {previewText}
        </pre>
      </div>
    </div>
  )
}

function insertToken(
  ref: RefObject<HTMLTextAreaElement | null>,
  token: string,
  draft: string,
  setDraft: (value: string) => void,
): void {
  const el = ref.current
  if (!el) {
    setDraft(draft + token)
    return
  }
  const start = el.selectionStart
  const end = el.selectionEnd
  const next = `${el.value.slice(0, start)}${token}${el.value.slice(end)}`
  setDraft(next)
  requestAnimationFrame(() => {
    el.focus()
    const pos = start + token.length
    el.setSelectionRange(pos, pos)
  })
}

function rateDraft(value: number): string {
  return value > 0 ? String(value) : ''
}

async function commitRate(
  draft: string,
  current: number,
  save: (rate: number) => Promise<void>,
  reset: (value: string) => void,
): Promise<void> {
  if (!draft.trim()) {
    if (current !== 0) await save(0)
    reset('')
    return
  }
  const parsed = parseUsd(draft)
  if (parsed == null) {
    reset(rateDraft(current))
    return
  }
  if (parsed !== current) await save(parsed)
}

function persistableTemplate(draft: string, fallback: string): string {
  const trimmed = draft.trim()
  if (!trimmed || draft === fallback) return ''
  return draft.slice(0, 4000)
}

async function commitTemplate(
  draft: string,
  stored: string,
  fallback: string,
  save: (template: string) => Promise<void>,
): Promise<void> {
  const next = persistableTemplate(draft, fallback)
  if (next === stored) return
  await save(next)
}

const PREVIEW_ORDER: OrderDraft = {
  origin: 'Av. Francisco de Miranda, Altamira',
  destination: 'CC Sambil, Chacao',
  originCoords: null,
  destCoords: null,
  originHint: '',
  destHint: '',
  originExact: 'Torre Corp Banca',
  destExact: '',
  clientName: 'María González',
  clientPhone: '04125550189',
  paymentMethod: 'Efectivo',
  amount: '15',
  notes: 'Llamar al llegar',
  serviceTypeId: '',
}

const PREVIEW_DRIVER: Driver = {
  id: 'preview',
  name: 'Juan Pérez',
  phone: '584145550123',
  vehicleType: 'motorcycle',
  vehicle: 'Yamaha NMAX',
  licensePlate: 'AB123CD',
  driverPhoto: '',
  vehiclePhoto: '',
  fichaPhoto: '',
  status: 'available',
  coords: [0, 0],
  battery: 100,
  distanceM: 0,
  etaMin: 0,
  notes: '',
  cityId: 'caracas',
}
