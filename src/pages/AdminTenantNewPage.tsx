import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createTenant, uploadTenantLogo } from '../lib/admin'
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  appBaseHost,
  contrastOn,
} from '../lib/branding'
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
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR)
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR)
  const [subdomain, setSubdomain] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const hostSuffix = appBaseHost() || 'tudominio.com'

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
        primary_color: primaryColor,
        accent_color: accentColor,
        subdomain: subdomain.trim() || undefined,
      })
      if (logoFile) {
        await uploadTenantLogo(created.id, logoFile)
      }
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
        Crea el tenant, la marca y el primer operador. Ellos llenan la Agenda.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre comercial">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
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
            required
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
          <p className="mt-1 text-xs text-mist">La empresa opera solo en esta ciudad.</p>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Color primario">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-md border border-line bg-ink"
            />
          </Field>
          <Field label="Color de acento">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-md border border-line bg-ink"
            />
          </Field>
        </div>
        <div className="rounded-lg border border-line bg-elevated/40 p-3">
          <p className="mb-2 text-[11px] font-medium tracking-wide text-mist uppercase">Vista previa</p>
          <button
            type="button"
            className="rounded-md px-3 py-2 text-sm font-semibold"
            style={{ background: primaryColor, color: contrastOn(primaryColor) }}
          >
            Botón de {name || 'la empresa'}
          </button>
        </div>
        <Field label="Logo (PNG, JPEG, WebP o SVG · máx. 512 KB)">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-mist file:mr-3 file:rounded-md file:border-0 file:bg-signal file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-on-signal"
          />
        </Field>
        <Field label="Subdominio (opcional)">
          <div className="flex items-center gap-2">
            <input
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
              placeholder="norte"
              className={inputClass}
            />
            <span className="shrink-0 text-sm text-mist">.{hostSuffix}</span>
          </div>
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
