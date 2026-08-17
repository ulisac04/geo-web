import { useEffect, useState } from 'react'
import { CircleDollarSign, Moon, Route, X } from 'lucide-react'
import { useCosts } from '../context/CostsContext'
import { formatRuleSummary } from '../lib/costs'

export default function CostRulesFab() {
  const [open, setOpen] = useState(false)
  const { rules } = useCosts()
  const active = rules.filter((rule) => rule.enabled)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute right-4 bottom-10 z-10 grid size-12 place-items-center rounded-full bg-signal text-on-signal shadow-lg transition hover:bg-emerald-300"
        title="Reglas de costos"
        aria-label="Ver reglas de costos"
      >
        <CircleDollarSign className="size-5" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cost-rules-title"
            className="w-full max-w-md rounded-2xl border border-line bg-panel p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 id="cost-rules-title" className="text-base font-semibold text-snow">
                  Reglas de costos
                </h2>
                <p className="mt-1 text-xs text-mist">
                  Solo consulta. La tarifa suma distancia y recargo nocturno de las reglas
                  activas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-mist hover:bg-elevated hover:text-snow"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            </div>

            {active.length === 0 ? (
              <p className="rounded-lg border border-line bg-ink px-3 py-3 text-sm text-mist">
                No hay reglas activas. La tarifa estimada queda en $0.00.
              </p>
            ) : (
              <ul className="space-y-2">
                {active.map((rule) => {
                  const Icon = rule.type === 'night' ? Moon : Route
                  return (
                    <li
                      key={rule.id}
                      className="rounded-lg border border-line bg-card px-3 py-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-signal/15 text-signal">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-snow">{rule.name}</p>
                          <p className="mt-0.5 text-xs text-mist">
                            {rule.type === 'distance' ? 'Por distancia' : 'Recargo nocturno'}
                            {' · '}
                            {formatRuleSummary(rule)}
                          </p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            <p className="mt-3 text-[11px] text-mist">
              {rules.length - active.length > 0
                ? `${rules.length - active.length} regla(s) inactiva(s) no se aplican.`
                : 'Se pueden editar en Costos.'}
            </p>
          </div>
        </div>
      ) : null}
    </>
  )
}
