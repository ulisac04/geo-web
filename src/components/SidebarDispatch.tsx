import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useDispatchFlow } from '../context/DispatchContext'
import { getSession } from '../lib/auth'
import type { DispatchStep } from '../types'
import CandidatesStep from './CandidatesStep'
import ConfirmationStep from './ConfirmationStep'
import ConfirmDialog from './ConfirmDialog'
import LiveTripsList from './LiveTripsList'
import MapModeToggle from './MapModeToggle'
import OrderInputStep from './OrderInputStep'
import ValidationStep from './ValidationStep'

const STEPS: { id: DispatchStep; label: string }[] = [
  { id: 1, label: 'Datos' },
  { id: 2, label: 'Puntos' },
  { id: 3, label: 'Chofer' },
  { id: 4, label: 'Enviar' },
]

export default function SidebarDispatch() {
  const session = getSession()
  const [confirmReset, setConfirmReset] = useState(false)
  const {
    step,
    order,
    rawText,
    screenshotPreview,
    availableCount,
    busyCount,
    offlineCount,
    mapMode,
    setMapMode,
    liveTrips,
    resetOrder,
  } = useDispatchFlow()

  const canReset =
    step > 1 ||
    Boolean(rawText.trim()) ||
    Boolean(screenshotPreview) ||
    Boolean(order.origin.trim()) ||
    Boolean(order.destination.trim()) ||
    Boolean(order.clientName.trim()) ||
    Boolean(order.clientPhone.trim()) ||
    Boolean(order.notes.trim()) ||
    Boolean(order.paymentMethod.trim()) ||
    Boolean(order.amount.trim()) ||
    Boolean(order.originCoords) ||
    Boolean(order.destCoords)

  const initials = (session?.operator ?? 'OP')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')

  return (
    <aside className="relative flex h-full w-[30%] min-w-[340px] max-w-[480px] flex-col border-r border-line bg-panel">
      <header className="border-b border-line px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-signal/15 text-sm font-semibold text-signal">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-snow">{session?.company}</p>
            <p className="text-xs text-mist">{session?.operator} · Operador</p>
          </div>
        </div>

        <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border border-line bg-ink px-3 py-1 text-xs">
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <span className="size-1.5 rounded-full bg-signal" />
            {availableCount} Disponibles
          </span>
          <span className="text-line">|</span>
          <span className="inline-flex items-center gap-1.5 text-amber-300">
            <span className="size-1.5 rounded-full bg-warn" />
            {busyCount} Ocupados
          </span>
          <span className="text-line">|</span>
          <span className="inline-flex items-center gap-1.5 text-rose-300">
            <span className="size-1.5 rounded-full bg-danger" />
            {offlineCount} Fuera
          </span>
        </div>

        <div className="mt-3">
          <MapModeToggle
            mode={mapMode}
            onChange={setMapMode}
            fullWidth
            fleetLabel="Nuevo"
            liveLabel="En curso"
          />
        </div>
      </header>

      {mapMode === 'fleet' ? (
        <div className="border-b border-line px-4 py-3">
          <ol className="flex items-center justify-between">
            {STEPS.map((item, index) => {
              const done = step > item.id
              const current = step === item.id
              return (
                <li key={item.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`grid size-6 place-items-center rounded-full text-[11px] font-semibold ${
                        current || done
                          ? 'bg-signal text-on-signal'
                          : 'bg-elevated text-mist'
                      }`}
                    >
                      {item.id}
                    </span>
                    <span className={`text-[10px] ${current ? 'text-snow' : 'text-mist'}`}>
                      {item.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 ? (
                    <div
                      className={`mx-1 mb-4 h-px flex-1 ${done ? 'bg-signal/60' : 'bg-line'}`}
                    />
                  ) : null}
                </li>
              )
            })}
          </ol>
          <button
            type="button"
            disabled={!canReset}
            onClick={() => setConfirmReset(true)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-ink px-3 py-1.5 text-xs font-medium text-mist transition hover:border-rose-400/40 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" />
            Empezar de cero
          </button>
        </div>
      ) : (
        <div className="border-b border-line px-4 py-3">
          <p className="text-xs font-medium text-snow">Servicios en curso</p>
          <p className="text-[11px] text-mist">
            {liveTrips.length === 1
              ? '1 viaje activo en la ciudad'
              : `${liveTrips.length} viajes activos en la ciudad`}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {mapMode === 'live' ? (
          <LiveTripsList />
        ) : (
          <>
            {step === 1 ? <OrderInputStep /> : null}
            {step === 2 ? <ValidationStep /> : null}
            {step === 3 ? <CandidatesStep /> : null}
            {step === 4 ? <ConfirmationStep /> : null}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="¿Empezar de cero?"
        description="Se borra la orden actual y vuelves al primer paso. No se envía nada."
        confirmLabel="Borrar orden"
        cancelLabel="Seguir editando"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetOrder()
          setConfirmReset(false)
        }}
      />
    </aside>
  )
}
