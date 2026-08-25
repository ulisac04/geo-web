import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'
import ConfirmDialog from '../components/ConfirmDialog'
import {
  adjustTenantServiceLimit,
  listTenants,
  patchTenant,
  settleTenantServiceLimit,
  type AdminTenant,
} from '../lib/admin'
import { logoSrc } from '../lib/branding'
import { getCity } from '../lib/cities'

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [settleTarget, setSettleTarget] = useState<AdminTenant | null>(null)

  useEffect(() => {
    let cancelled = false
    listTenants()
      .then((rows) => {
        if (!cancelled) {
          setTenants(rows)
          setDrafts(Object.fromEntries(rows.map((row) => [row.id, String(row.service_limit)])))
        }
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

  function replaceTenant(updated: AdminTenant) {
    setTenants((rows) => rows.map((row) => (row.id === updated.id ? updated : row)))
    setDrafts((current) => ({ ...current, [updated.id]: String(updated.service_limit) }))
  }

  async function runAction(id: string, action: () => Promise<AdminTenant>) {
    setBusyId(id)
    setError('')
    try {
      replaceTenant(await action())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el límite')
    } finally {
      setBusyId('')
    }
  }

  async function commitDraft(tenant: AdminTenant) {
    const parsed = Number.parseInt(drafts[tenant.id] ?? '', 10)
    if (Number.isNaN(parsed) || parsed === tenant.service_limit) {
      setDrafts((current) => ({ ...current, [tenant.id]: String(tenant.service_limit) }))
      return
    }
    await runAction(tenant.id, () => patchTenant(tenant.id, { service_limit: parsed }))
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
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
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-elevated text-xs uppercase tracking-wide text-mist">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Conductores</th>
              <th className="px-4 py-3">Límite</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => {
              const logo = logoSrc(tenant.logo_url)
              const busy = busyId === tenant.id
              const negative = tenant.service_limit < 0
              return (
                <tr key={tenant.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/${tenant.id}`}
                      className="flex items-center gap-3 font-medium text-signal hover:underline"
                    >
                      {logo ? (
                        <img
                          src={logo}
                          alt=""
                          className="size-8 rounded-md object-cover ring-1 ring-line"
                        />
                      ) : (
                        <span
                          className="grid size-8 place-items-center rounded-md text-xs font-bold"
                          style={{
                            background: tenant.primary_color || '#34d399',
                            color: '#07090d',
                          }}
                        >
                          {tenant.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      {tenant.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-snow">{tenant.code}</td>
                  <td className="px-4 py-3 text-mist">{getCity(tenant.city_id).name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={tenant.status === 'active' ? 'text-signal' : 'text-amber-300'}
                    >
                      {tenant.status === 'active' ? 'Activa' : 'Suspendida'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-snow">{tenant.driver_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        aria-label="Disminuir límite"
                        onClick={() =>
                          void runAction(tenant.id, () =>
                            adjustTenantServiceLimit(tenant.id, -1),
                          )
                        }
                        className="grid size-7 place-items-center rounded-md border border-line text-snow hover:bg-elevated disabled:opacity-50"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        type="number"
                        disabled={busy}
                        value={drafts[tenant.id] ?? String(tenant.service_limit)}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [tenant.id]: event.target.value,
                          }))
                        }
                        onBlur={() => void commitDraft(tenant)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.currentTarget.blur()
                          }
                        }}
                        className={`w-16 rounded-md border border-line bg-ink px-1.5 py-1 text-center text-sm tabular-nums focus:border-signal/50 focus:outline-none disabled:opacity-50 ${
                          negative ? 'text-rose-300' : 'text-snow'
                        }`}
                      />
                      <button
                        type="button"
                        disabled={busy}
                        aria-label="Aumentar límite"
                        onClick={() =>
                          void runAction(tenant.id, () =>
                            adjustTenantServiceLimit(tenant.id, 1),
                          )
                        }
                        className="grid size-7 place-items-center rounded-md border border-line text-snow hover:bg-elevated disabled:opacity-50"
                      >
                        <Plus className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busy || tenant.service_limit === 0}
                        onClick={() => setSettleTarget(tenant)}
                        className="rounded-md border border-line px-2 py-1 text-xs text-snow hover:bg-elevated disabled:opacity-40"
                      >
                        Liquidar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && tenants.length === 0 ? (
          <p className="px-4 py-6 text-sm text-mist">No hay empresas todavía.</p>
        ) : null}
      </div>
      <ConfirmDialog
        open={settleTarget !== null}
        title="Liquidar límite"
        description={
          settleTarget
            ? `Se guardará el saldo actual (${settleTarget.service_limit}) en el historial y quedará en 0.`
            : null
        }
        confirmLabel="Liquidar"
        busyLabel="Liquidando…"
        busy={Boolean(settleTarget && busyId === settleTarget.id)}
        onCancel={() => {
          if (!busyId) setSettleTarget(null)
        }}
        onConfirm={async () => {
          if (!settleTarget) return
          setBusyId(settleTarget.id)
          setError('')
          try {
            replaceTenant(await settleTenantServiceLimit(settleTarget.id))
            setSettleTarget(null)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo liquidar')
          } finally {
            setBusyId('')
          }
        }}
      />
    </div>
  )
}
