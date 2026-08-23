import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createTenant } from '../lib/admin'
import { CITIES } from '../lib/cities'
import type { CityId } from '../types'

export default function AdminTenantNewPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [cityId, setCityId] = useState<CityId>(CITIES[0]?.id ?? 'caracas')
  const [operatorName, setOperatorName] = useState('')
  const [operatorEmail, setOperatorEmail] = useState('')
  const [operatorPassword, setOperatorPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const created = await createTenant({
        name,
        code,
        city_id: cityId,
        operator_name: operatorName,
        operator_email: operatorEmail,
        operator_password: operatorPassword,
      })
      navigate(`/admin/${created.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la empresa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <Link to="/admin" className="text-sm text-signal hover:underline">
        ← Empresas
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-snow">Nueva empresa</h1>
      <p className="mb-6 text-sm text-mist">
        Crea el tenant y el primer operador. Ellos llenan la Agenda.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre comercial">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Código de empresa (app móvil)">
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            placeholder="norte"
            className={inputClass}
          />
        </Field>
        <Field label="Ciudad">
          <select
            value={cityId}
            onChange={(e) => setCityId(e.target.value as CityId)}
            className={inputClass}
          >
            {CITIES.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Operador (nombre)">
          <input
            required
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Operador (email)">
          <input
            required
            type="email"
            value={operatorEmail}
            onChange={(e) => setOperatorEmail(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Contraseña inicial">
          <input
            required
            minLength={6}
            value={operatorPassword}
            onChange={(e) => setOperatorPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-signal py-2.5 text-sm font-semibold text-on-signal disabled:opacity-60"
        >
          {saving ? 'Creando…' : 'Crear empresa'}
        </button>
      </form>
    </div>
  )
}

const inputClass =
  'w-full rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-snow focus:border-signal/50 focus:outline-none'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium tracking-wide text-mist uppercase">{label}</span>
      {children}
    </label>
  )
}
