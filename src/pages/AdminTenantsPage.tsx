import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { listTenants, type AdminTenant } from '../lib/admin'
import { getCity } from '../lib/cities'

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    listTenants()
      .then((rows) => {
        if (!cancelled) setTenants(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-snow">Empresas</h1>
          <p className="text-sm text-mist">Alta de tenants después de cerrar un contrato.</p>
        </div>
        <Link
          to="/admin/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-signal px-3 py-2 text-sm font-semibold text-on-signal"
        >
          <Plus className="size-4" />
          Nueva empresa
        </Link>
      </div>
      {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}
      {loading ? <p className="text-sm text-mist">Cargando…</p> : null}
      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-elevated text-xs uppercase tracking-wide text-mist">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Conductores</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link to={`/admin/${tenant.id}`} className="font-medium text-signal hover:underline">
                    {tenant.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-snow">{tenant.code}</td>
                <td className="px-4 py-3 text-mist">{getCity(tenant.city_id).name}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      tenant.status === 'active' ? 'text-signal' : 'text-amber-300'
                    }
                  >
                    {tenant.status === 'active' ? 'Activa' : 'Suspendida'}
                  </span>
                </td>
                <td className="px-4 py-3 text-snow">{tenant.driver_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && tenants.length === 0 ? (
          <p className="px-4 py-6 text-sm text-mist">No hay empresas todavía.</p>
        ) : null}
      </div>
    </div>
  )
}
