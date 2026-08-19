import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { CostRule, CostRuleDraft, CostRuleType, SurchargeType } from '../types'
import { EMPTY_COST_DRAFT } from '../lib/costs'

interface CostRuleFormProps {
  open: boolean
  rule: CostRule | null
  onClose: () => void
  onSubmit: (draft: CostRuleDraft) => void | Promise<void>
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

export default function CostRuleForm({ open, rule, onClose, onSubmit }: CostRuleFormProps) {
  const [draft, setDraft] = useState<CostRuleDraft>(EMPTY_COST_DRAFT)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setDraft(
      rule
        ? {
            name: rule.name,
            enabled: rule.enabled,
            type: rule.type,
            pricePerKm: rule.pricePerKm ?? 2.5,
            startHour: rule.startHour ?? 22,
            endHour: rule.endHour ?? 6,
            surchargeType: rule.surchargeType ?? 'percent',
            surchargeValue: rule.surchargeValue ?? 20,
          }
        : EMPTY_COST_DRAFT,
    )
  }, [open, rule])

  if (!open) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft.name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (draft.type === 'distance' && draft.pricePerKm < 0) {
      setError('El precio por km no puede ser negativo.')
      return
    }
    if (draft.type === 'night' && draft.surchargeValue < 0) {
      setError('El recargo no puede ser negativo.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit(draft)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la regla')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-snow">
            {rule ? 'Editar regla' : 'Nueva regla'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-mist hover:bg-elevated hover:text-snow"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
              Nombre
            </span>
            <input
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
              Tipo
            </span>
            <select
              value={draft.type}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, type: e.target.value as CostRuleType }))
              }
              className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
            >
              <option value="distance">Distancia</option>
              <option value="night">Hora de la noche</option>
            </select>
          </label>

          {draft.type === 'distance' ? (
            <label className="block space-y-1">
              <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                Precio por km
              </span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={draft.pricePerKm}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, pricePerKm: Number(e.target.value) }))
                }
                className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
              />
            </label>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <HourSelect
                  label="Desde"
                  value={draft.startHour}
                  onChange={(startHour) => setDraft((prev) => ({ ...prev, startHour }))}
                />
                <HourSelect
                  label="Hasta"
                  value={draft.endHour}
                  onChange={(endHour) => setDraft((prev) => ({ ...prev, endHour }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                    Tipo de recargo
                  </span>
                  <select
                    value={draft.surchargeType}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        surchargeType: e.target.value as SurchargeType,
                      }))
                    }
                    className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
                  >
                    <option value="percent">Porcentaje</option>
                    <option value="fixed">Monto fijo</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                    {draft.surchargeType === 'percent' ? 'Porcentaje' : 'Monto'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={draft.surchargeType === 'percent' ? 1 : 0.1}
                    value={draft.surchargeValue}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        surchargeValue: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
                  />
                </label>
              </div>
            </>
          )}

          <label className="flex items-center gap-2 text-sm text-snow">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="size-4 rounded border-line"
            />
            Regla activa
          </label>

          {error ? (
            <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-3 py-2 text-sm text-mist hover:text-snow"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-signal px-3 py-2 text-sm font-semibold text-on-signal hover:bg-emerald-300 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : rule ? 'Guardar cambios' : 'Crear regla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function HourSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium tracking-wide text-mist uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
      >
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>
            {String(hour).padStart(2, '0')}:00
          </option>
        ))}
      </select>
    </label>
  )
}
