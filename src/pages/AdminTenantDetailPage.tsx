import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  addOperator,
  deleteTenantLogo,
  getTenant,
  getTenantStats,
  listTenantSettlements,
  patchTenant,
  resetOperatorPassword,
  uploadTenantLogo,
  type AdminTenantDetail,
  type ServiceSettlement,
  type TenantStats,
} from '../lib/admin'
import { appBaseHost, contrastOn, logoSrc } from '../lib/branding'
import { CITIES, getCity, isCityId } from '../lib/cities'
import type { CityId } from '../types'

function isoRange(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

export default function AdminTenantDetailPage() {
  const { tenantId = '' } = useParams()
  const [tenant, setTenant] = useState<AdminTenantDetail | null>(null)
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [settlements, setSettlements] = useState<ServiceSettlement[]>([])
  const [days, setDays] = useState<7 | 30>(30)
  const [error, setError] = useState('')
  const [savingBrand, setSavingBrand] = useState(false)
  const [savingCity, setSavingCity] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [cityId, setCityId] = useState<CityId>('caracas')
  const [primaryColor, setPrimaryColor] = useState('#34d399')
  const [accentColor, setAccentColor] = useState('#059669')
  const [subdomain, setSubdomain] = useState('')
  const [opName, setOpName] = useState('')
  const [opEmail, setOpEmail] = useState('')
  const [opPassword, setOpPassword] = useState('')
  const hostSuffix = appBaseHost() || 'tudominio.com'

  async function refresh() {
    const detail = await getTenant(tenantId)
    setTenant(detail)
    setName(detail.name)
    setCityId(isCityId(detail.city_id) ? detail.city_id : 'caracas')
    setPrimaryColor(detail.primary_color)
    setAccentColor(detail.accent_color)
    setSubdomain(detail.subdomain ?? '')
    setSettlements(await listTenantSettlements(tenantId))
  }

  useEffect(() => {
    refresh().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : 'No se pudo cargar'),
    )
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return
    const { from, to } = isoRange(days)
    getTenantStats(tenantId, from, to)
      .then(setStats)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las estadísticas'),
      )
  }, [tenantId, days])

  async function toggleStatus() {
    if (!tenant) return
    const status = tenant.status === 'active' ? 'suspended' : 'active'
    try {
      await patchTenant(tenant.id, { status })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar')
    }
  }

  async function saveBrand(event: FormEvent) {
    event.preventDefault()
    if (!tenant) return
    setSavingBrand(true)
    setError('')
    try {
      await patchTenant(tenant.id, {
        name,
        primary_color: primaryColor,
        accent_color: accentColor,
        subdomain,
      })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la marca')
    } finally {
      setSavingBrand(false)
    }
  }

  async function saveCity(event: FormEvent) {
    event.preventDefault()
    if (!tenant) return
    setSavingCity(true)
    setError('')
    try {
      await patchTenant(tenant.id, { city_id: cityId })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la ciudad')
    } finally {
      setSavingCity(false)
    }
  }

  async function handleLogo(file: File | null) {
    if (!tenant || !file) return
    setLogoBusy(true)
    setError('')
    try {
      await uploadTenantLogo(tenant.id, file)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el logo')
    } finally {
      setLogoBusy(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  async function handleRemoveLogo() {
    if (!tenant) return
    setLogoBusy(true)
    setError('')
    try {
      await deleteTenantLogo(tenant.id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el logo')
    } finally {
      setLogoBusy(false)
    }
  }

  async function handleAddOperator(event: FormEvent) {
    event.preventDefault()
    if (!tenant) return
    setError('')
    try {
      await addOperator(tenant.id, {
        name: opName,
        email: opEmail,
        password: opPassword,
      })
      setOpName('')
      setOpEmail('')
      setOpPassword('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el operador')
    }
  }

  async function handleReset(userId: string) {
    if (!tenant) return
    const password = window.prompt('Nueva contraseña (mínimo 6 caracteres)')
    if (!password) return
    try {
      await resetOperatorPassword(tenant.id, userId, password)
      window.alert('Contraseña actualizada')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo resetear')
    }
  }

  const logo = useMemo(() => logoSrc(tenant?.logo_url), [tenant?.logo_url])

  if (!tenant) {
    return <p className="px-6 py-8 text-sm text-mist">{error || 'Cargando…'}</p>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <Link to="/admin" className="text-sm text-signal hover:underline">
        ← Empresas
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt="" className="size-12 rounded-lg object-cover ring-1 ring-line" />
          ) : null}
          <div>
            <h1 className="text-xl font-semibold text-snow">{tenant.name}</h1>
            <p className="text-sm text-mist">
              Código app: <span className="font-mono text-snow">{tenant.code}</span> ·{' '}
              {getCity(tenant.city_id).name} · {tenant.driver_count} conductores · límite{' '}
              <span className={tenant.service_limit < 0 ? 'text-rose-300' : 'text-snow'}>
                {tenant.service_limit}
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void toggleStatus()}
          className="rounded-lg border border-line px-3 py-2 text-sm text-snow hover:bg-elevated"
        >
          {tenant.status === 'active' ? 'Suspender' : 'Activar'}
        </button>
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <section className="rounded-xl border border-line p-4">
        <h2 className="mb-3 text-sm font-semibold text-snow">Ciudad</h2>
        <p className="mb-3 text-xs text-mist">
          La empresa opera solo en esta ciudad. El operador no puede cambiarla.
        </p>
        <form onSubmit={saveCity} className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 space-y-1">
            <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
              Ciudad asignada
            </span>
            <select
              required
              value={cityId}
              onChange={(e) => setCityId(e.target.value as CityId)}
              className={inputClass}
            >
              {CITIES.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name} · {city.country}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={savingCity || cityId === tenant.city_id}
            className="rounded-md bg-signal px-3 py-2 text-sm font-semibold text-on-signal disabled:opacity-60"
          >
            {savingCity ? 'Guardando…' : 'Guardar ciudad'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line p-4">
        <h2 className="mb-3 text-sm font-semibold text-snow">Marca</h2>
        <form onSubmit={saveBrand} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-[11px] font-medium tracking-wide text-mist uppercase">Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium tracking-wide text-mist uppercase">Primario</span>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-md border border-line bg-ink"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium tracking-wide text-mist uppercase">Acento</span>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-md border border-line bg-ink"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm font-semibold"
              style={{ background: primaryColor, color: contrastOn(primaryColor) }}
            >
              Vista previa
            </button>
          </div>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-[11px] font-medium tracking-wide text-mist uppercase">
              Subdominio
            </span>
            <div className="flex items-center gap-2">
              <input
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                className={inputClass}
              />
              <span className="shrink-0 text-sm text-mist">.{hostSuffix}</span>
            </div>
          </label>
          <div className="space-y-2 sm:col-span-2">
            <span className="text-[11px] font-medium tracking-wide text-mist uppercase">Logo</span>
            <div className="flex flex-col gap-3 rounded-lg border border-line bg-elevated/30 p-3 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled={logoBusy}
                onClick={() => logoInputRef.current?.click()}
                className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-ink transition hover:border-signal/50 disabled:opacity-60"
                aria-label={tenant.has_logo ? 'Cambiar logo' : 'Subir logo'}
              >
                {logo ? (
                  <img src={logo} alt="" className="size-full object-cover" />
                ) : (
                  <ImagePlus className="size-7 text-mist" />
                )}
              </button>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm text-snow">
                  {logoBusy
                    ? 'Actualizando logo…'
                    : tenant.has_logo
                      ? 'Logo actual de la empresa'
                      : 'Todavía no hay logo'}
                </p>
                <p className="text-xs text-mist">
                  PNG, JPEG, WebP o SVG · máx. 512 KB (las imágenes grandes se reducen al subir)
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={logoBusy}
                    onClick={() => logoInputRef.current?.click()}
                    className="rounded-md bg-signal px-3 py-2 text-sm font-semibold text-on-signal disabled:opacity-60"
                  >
                    {tenant.has_logo ? 'Cambiar logo' : 'Subir logo'}
                  </button>
                  {tenant.has_logo ? (
                    <button
                      type="button"
                      disabled={logoBusy}
                      onClick={() => void handleRemoveLogo()}
                      className="rounded-md border border-line px-3 py-2 text-sm text-snow hover:bg-elevated disabled:opacity-60"
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => void handleLogo(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={savingBrand}
            className="rounded-md bg-signal px-3 py-2 text-sm font-semibold text-on-signal disabled:opacity-60 sm:col-span-2"
          >
            {savingBrand ? 'Guardando…' : 'Guardar marca'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-line p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-snow">Estadísticas</h2>
          <div className="flex gap-2">
            {([7, 30] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDays(value)}
                className={`rounded-md px-2 py-1 text-xs ${
                  days === value ? 'bg-signal text-on-signal' : 'border border-line text-mist'
                }`}
              >
                {value} días
              </button>
            ))}
          </div>
        </div>
        {stats ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard title="Conductores">
              <p>Total {stats.drivers.total}</p>
              <p>Disponibles {stats.drivers.available}</p>
              <p>Ocupados {stats.drivers.busy}</p>
              <p>Offline {stats.drivers.offline}</p>
            </StatCard>
            <StatCard title="Servicios">
              <p>Total {stats.services.total}</p>
              <p>Pendientes {stats.services.pending}</p>
              <p>Asignados {stats.services.assigned}</p>
              <p>En ruta {stats.services.en_route}</p>
              <p>En curso {stats.services.in_progress}</p>
              <p>Completados {stats.services.completed}</p>
              <p>Cancelados {stats.services.cancelled}</p>
              <p>En el periodo {stats.services.in_range}</p>
            </StatCard>
            <StatCard title="Parser">
              <p>Total {stats.gemini.total}</p>
              <p>OK {stats.gemini.ok}</p>
              <p>Errores {stats.gemini.errors}</p>
              <p>Extract {stats.gemini.by_kind.extract}</p>
              <p>Transcribe {stats.gemini.by_kind.transcribe}</p>
              <p>OCR {stats.gemini.by_kind.ocr}</p>
            </StatCard>
          </div>
        ) : (
          <p className="text-sm text-mist">Cargando estadísticas…</p>
        )}
      </section>

      <section className="rounded-xl border border-line p-4">
        <h2 className="mb-3 text-sm font-semibold text-snow">Liquidaciones</h2>
        {settlements.length === 0 ? (
          <p className="text-sm text-mist">Todavía no hay liquidaciones para esta empresa.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-mist">
              <tr>
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Saldo archivado</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="py-2 text-mist">
                    {new Date(row.settled_at).toLocaleString('es')}
                  </td>
                  <td
                    className={`py-2 tabular-nums ${
                      row.balance < 0 ? 'text-rose-300' : 'text-snow'
                    }`}
                  >
                    {row.balance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-xl border border-line p-4">
        <h2 className="mb-3 text-sm font-semibold text-snow">Operadores</h2>
        <ul className="space-y-2 text-sm">
          {tenant.operators.map((operator) => (
            <li key={operator.id} className="flex items-center justify-between gap-3">
              <span className="text-snow">
                {operator.name} <span className="text-mist">({operator.email})</span>
              </span>
              <button
                type="button"
                onClick={() => void handleReset(operator.id)}
                className="text-xs text-signal hover:underline"
              >
                Reset password
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddOperator} className="mt-4 grid gap-2 sm:grid-cols-4">
          <input
            required
            placeholder="Nombre"
            value={opName}
            onChange={(e) => setOpName(e.target.value)}
            className={inputClass}
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={opEmail}
            onChange={(e) => setOpEmail(e.target.value)}
            className={inputClass}
          />
          <input
            required
            minLength={6}
            placeholder="Contraseña"
            value={opPassword}
            onChange={(e) => setOpPassword(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            className="rounded-md bg-signal px-3 py-2 text-sm font-semibold text-on-signal"
          >
            Agregar
          </button>
        </form>
      </section>
    </div>
  )
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-elevated/30 p-3 text-sm text-mist">
      <p className="mb-2 font-semibold text-snow">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

const inputClass =
  'w-full rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-snow focus:border-signal/50 focus:outline-none'
