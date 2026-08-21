import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { ServiceType, ServiceTypeDraft, VehicleType } from '../types'
import { EMPTY_TYPE_DRAFT } from '../lib/services'
import { VEHICLE_TYPE_OPTIONS } from '../lib/vehicles'

interface ServiceTypeFormProps {
  open: boolean
  serviceType: ServiceType | null
  onClose: () => void
  onSubmit: (draft: ServiceTypeDraft) => void | Promise<void>
}

export default function ServiceTypeForm({
  open,
  serviceType,
  onClose,
  onSubmit,
}: ServiceTypeFormProps) {
  const [draft, setDraft] = useState<ServiceTypeDraft>(EMPTY_TYPE_DRAFT)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setDraft(
      serviceType
        ? {
            name: serviceType.name,
            description: serviceType.description,
            active: serviceType.active,
            allowedVehicleTypes: serviceType.allowedVehicleTypes,
          }
        : EMPTY_TYPE_DRAFT,
    )
  }, [open, serviceType])

  if (!open) return null

  function toggleVehicle(type: VehicleType) {
    setDraft((prev) => {
      const has = prev.allowedVehicleTypes.includes(type)
      const allowedVehicleTypes = has
        ? prev.allowedVehicleTypes.filter((item) => item !== type)
        : [...prev.allowedVehicleTypes, type]
      return { ...prev, allowedVehicleTypes }
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft.name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (draft.allowedVehicleTypes.length === 0) {
      setError('Selecciona al menos un tipo de vehículo.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit(draft)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el tipo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-snow">
            {serviceType ? 'Editar tipo de servicio' : 'Nuevo tipo de servicio'}
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
              Descripción
            </span>
            <textarea
              value={draft.description}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="w-full resize-none rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-[11px] font-medium tracking-wide text-mist uppercase">
              Vehículos permitidos
            </legend>
            {VEHICLE_TYPE_OPTIONS.map((item) => {
              const checked = draft.allowedVehicleTypes.includes(item.value)
              return (
                <label key={item.value} className="flex items-center gap-2 text-sm text-snow">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleVehicle(item.value)}
                    className="size-4 rounded border-line"
                  />
                  {item.label}
                </label>
              )
            })}
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-snow">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft((prev) => ({ ...prev, active: e.target.checked }))}
              className="size-4 rounded border-line"
            />
            Activo
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
              {saving ? 'Guardando…' : serviceType ? 'Guardar cambios' : 'Crear tipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
