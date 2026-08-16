import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import CostRuleForm from '../components/CostRuleForm'
import { useCosts } from '../context/CostsContext'
import { estimateFare, formatFare, formatRuleSummary } from '../lib/costs'
import type { CostRule, CostRuleDraft } from '../types'

function currentTimeValue(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function dateFromTimeInput(value: string): Date {
  const [hours, minutes] = value.split(':').map(Number)
  const next = new Date()
  next.setHours(hours || 0, minutes || 0, 0, 0)
  return next
}

export default function CostsPage() {
  const { rules, addRule, updateRule, removeRule, setEnabled } = useCosts()
  const [editing, setEditing] = useState<CostRule | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [previewKm, setPreviewKm] = useState(5)
  const [previewTime, setPreviewTime] = useState(currentTimeValue)

  const estimate = useMemo(
    () => estimateFare(previewKm * 1000, dateFromTimeInput(previewTime), rules),
    [previewKm, previewTime, rules],
  )

  function handleSubmit(draft: CostRuleDraft) {
    if (editing) updateRule(editing.id, draft)
    else addRule(draft)
  }

  return (
    <div className="flex h-full flex-col bg-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-snow">Costos</h1>
          <p className="text-xs text-mist">
            {rules.filter((rule) => rule.enabled).length} reglas activas de {rules.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-signal px-3 py-2 text-sm font-semibold text-on-signal hover:bg-emerald-300"
        >
          <Plus className="size-4" />
          Nueva regla
        </button>
      </header>

      <div className="flex-1 overflow-auto px-6 py-4">
        <section className="mb-5 max-w-xl rounded-xl border border-line bg-panel p-4">
          <h2 className="text-sm font-semibold text-snow">Vista previa</h2>
          <p className="mt-1 text-xs text-mist">
            Combina las reglas activas de distancia y recargo nocturno.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                Distancia (km)
              </span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={previewKm}
                onChange={(e) => setPreviewKm(Number(e.target.value))}
                className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                Hora
              </span>
              <input
                type="time"
                value={previewTime}
                onChange={(e) => setPreviewTime(e.target.value)}
                className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
              />
            </label>
          </div>
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between text-mist">
              <dt>Distancia</dt>
              <dd>{formatFare(estimate.distanceSubtotal)}</dd>
            </div>
            <div className="flex justify-between text-mist">
              <dt>
                Noche
                {estimate.appliedNightRules.length
                  ? ` (${estimate.appliedNightRules.join(', ')})`
                  : ''}
              </dt>
              <dd>{formatFare(estimate.nightSurcharge)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold text-snow">
              <dt>Total</dt>
              <dd>{formatFare(estimate.total)}</dd>
            </div>
          </dl>
        </section>

        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-ink text-[11px] tracking-wide text-mist uppercase">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">Regla</th>
              <th className="py-2 pr-3 font-medium">Tipo</th>
              <th className="py-2 pr-3 font-medium">Detalle</th>
              <th className="py-2 pr-3 font-medium">Estado</th>
              <th className="py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b border-line/70 hover:bg-panel/70">
                <td className="py-3 pr-3 font-medium text-snow">{rule.name}</td>
                <td className="py-3 pr-3 text-mist">
                  {rule.type === 'distance' ? 'Distancia' : 'Noche'}
                </td>
                <td className="py-3 pr-3 text-mist">{formatRuleSummary(rule)}</td>
                <td className="py-3 pr-3">
                  <select
                    value={rule.enabled ? 'on' : 'off'}
                    onChange={(e) => setEnabled(rule.id, e.target.value === 'on')}
                    className="rounded-md border border-line bg-card px-2 py-1 text-xs text-snow"
                  >
                    <option value="on">Activa</option>
                    <option value="off">Inactiva</option>
                  </select>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(rule)
                        setFormOpen(true)
                      }}
                      className="rounded-md p-1.5 text-mist hover:bg-elevated hover:text-snow"
                      title="Editar"
                    >
                      <Pencil className="size-4" />
                    </button>
                    {pendingDelete === rule.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          removeRule(rule.id)
                          setPendingDelete(null)
                        }}
                        className="rounded-md px-2 py-1 text-xs font-medium text-rose-300 hover:bg-danger/15"
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingDelete(rule.id)}
                        className="rounded-md p-1.5 text-mist hover:bg-elevated hover:text-danger"
                        title="Eliminar"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rules.length === 0 ? (
          <p className="mt-8 text-center text-sm text-mist">No hay reglas de costo.</p>
        ) : null}
      </div>

      <CostRuleForm
        open={formOpen}
        rule={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
