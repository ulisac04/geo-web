import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  addOperator,
  getTenant,
  patchTenant,
  resetOperatorPassword,
  type AdminTenantDetail,
} from '../lib/admin'
import { getCity } from '../lib/cities'

export default function AdminTenantDetailPage() {
  const { tenantId = '' } = useParams()
  const [tenant, setTenant] = useState<AdminTenantDetail | null>(null)
  const [error, setError] = useState('')
  const [opName, setOpName] = useState('')
  const [opEmail, setOpEmail] = useState('')
  const [opPassword, setOpPassword] = useState('')

  async function refresh() {
    const detail = await getTenant(tenantId)
    setTenant(detail)
  }

  useEffect(() => {
    refresh().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : 'No se pudo cargar'),
    )
  }, [tenantId])

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

  if (!tenant) {
    return <p className="px-6 py-8 text-sm text-mist">{error || 'Cargando…'}</p>
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
      <Link to="/admin" className="text-sm text-signal hover:underline">
        ← Empresas
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-snow">{tenant.name}</h1>
          <p className="text-sm text-mist">
            Código app: <span className="font-mono text-snow">{tenant.code}</span> ·{' '}
            {getCity(tenant.city_id).name} · {tenant.driver_count} conductores
          </p>
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
        <h2 className="mb-3 text-sm font-semibold text-snow">Operadores</h2>
        <ul className="space-y-2 text-sm">
          {tenant.operators.map((operator) => (
            <li key={operator.id} className="flex items-center justify-between gap-3">
              <span className="text-snow">
                {operator.name}{' '}
                <span className="text-mist">({operator.email})</span>
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

const inputClass =
  'rounded-md border border-line bg-ink px-2.5 py-2 text-sm text-snow focus:border-signal/50 focus:outline-none'
