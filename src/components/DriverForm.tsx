import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import PhotoUploadField from './PhotoUploadField'
import type { Driver, DriverDraft, DriverStatus } from '../types'
import { EMPTY_DRAFT, ZONES } from '../lib/fleet'

interface DriverFormProps {
  open: boolean
  driver: Driver | null
  onClose: () => void
  onSubmit: (draft: DriverDraft) => void
}

const STATUSES: { value: DriverStatus; label: string }[] = [
  { value: 'available', label: 'Disponible' },
  { value: 'busy', label: 'Ocupado' },
  { value: 'offline', label: 'Fuera de servicio' },
]

export default function DriverForm({ open, driver, onClose, onSubmit }: DriverFormProps) {
  const [draft, setDraft] = useState<DriverDraft>(EMPTY_DRAFT)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setDraft(
      driver
        ? {
            name: driver.name,
            phone: driver.phone,
            vehicle: driver.vehicle,
            licensePlate: driver.licensePlate,
            driverPhoto: driver.driverPhoto,
            vehiclePhoto: driver.vehiclePhoto,
            status: driver.status,
            zone: driver.zone,
            notes: driver.notes,
          }
        : EMPTY_DRAFT,
    )
  }, [open, driver])

  if (!open) return null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft.name.trim() || !draft.phone.trim() || !draft.vehicle.trim() || !draft.licensePlate.trim()) {
      setError('Nombre, teléfono, vehículo y placa son obligatorios.')
      return
    }
    onSubmit(draft)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-none">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-snow">
            {driver ? 'Editar conductor' : 'Nuevo conductor'}
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
          <Field
            label="Nombre"
            value={draft.name}
            onChange={(value) => setDraft((prev) => ({ ...prev, name: value }))}
          />
          <Field
            label="Teléfono"
            value={draft.phone}
            onChange={(value) => setDraft((prev) => ({ ...prev, phone: value }))}
            placeholder="58414..."
          />
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Vehículo"
              value={draft.vehicle}
              onChange={(value) => setDraft((prev) => ({ ...prev, vehicle: value }))}
              placeholder="Moto Empire 150"
            />
            <Field
              label="Placa"
              value={draft.licensePlate}
              onChange={(value) => setDraft((prev) => ({ ...prev, licensePlate: value.toUpperCase() }))}
              placeholder="AB123CD"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PhotoUploadField
              label="Foto del conductor"
              value={draft.driverPhoto}
              onChange={(value) => setDraft((prev) => ({ ...prev, driverPhoto: value }))}
            />
            <PhotoUploadField
              label="Foto del carro"
              value={draft.vehiclePhoto}
              onChange={(value) => setDraft((prev) => ({ ...prev, vehiclePhoto: value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                Zona
              </span>
              <input
                list="zones"
                value={draft.zone}
                onChange={(e) => setDraft((prev) => ({ ...prev, zone: e.target.value }))}
                className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
              />
              <datalist id="zones">
                {ZONES.map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
                Estado
              </span>
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, status: e.target.value as DriverStatus }))
                }
                className="w-full rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
              >
                {STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
              Notas
            </span>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full resize-none rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-snow focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
            />
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
              className="rounded-lg bg-signal px-3 py-2 text-sm font-semibold text-on-signal hover:bg-emerald-300"
            >
              {driver ? 'Guardar cambios' : 'Agregar a la agenda'}
            </button>
          </div>
        </form>
      </div>
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
