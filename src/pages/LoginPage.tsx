import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { RadioTower } from 'lucide-react'
import LoginForm from '../components/LoginForm'
import { getSession, homePath, isAuthenticated } from '../lib/auth'
import {
  applyBranding,
  fetchPublicBranding,
  logoSrc,
  tenantSlugFromHost,
  type PublicBranding,
} from '../lib/branding'

export default function LoginPage() {
  if (isAuthenticated()) {
    const session = getSession()
    return <Navigate to={session ? homePath(session) : '/dashboard'} replace />
  }

  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Acceso exclusivo para operadores del tenant."
    >
      <LoginForm />
    </AuthShell>
  )
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  const [branding, setBranding] = useState<PublicBranding | null>(null)

  useEffect(() => {
    const slug = tenantSlugFromHost()
    if (!slug) {
      applyBranding(null)
      return
    }
    void fetchPublicBranding({ host: window.location.host }).then((data) => {
      setBranding(data)
      applyBranding(data)
    })
  }, [])

  const logo = logoSrc(branding?.logo_url)
  const company = branding?.name ?? 'Andina Dispatch'

  return (
    <div className="grid min-h-full bg-ink lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.12),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(251,191,36,0.08),transparent_35%)]" />
        <div className="relative flex items-center gap-3">
          {logo ? (
            <img src={logo} alt="" className="size-10 rounded-lg object-cover ring-1 ring-line" />
          ) : (
            <div className="grid size-10 place-items-center rounded-lg bg-signal/15 text-signal">
              <RadioTower className="size-5" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-snow">{company}</p>
            <p className="text-xs text-mist">
              {branding ? 'Operación de flota' : 'Human-in-the-Loop · B2B'}
            </p>
          </div>
        </div>
        <div className="relative max-w-md space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-snow">
            Despacho logístico asistido, sin perder el control humano.
          </h1>
          <p className="text-sm leading-relaxed text-mist">
            Extrae pedidos desde WhatsApp, valida datos, elige al conductor más
            cercano y confirma el envío — todo en un solo panel de monitoreo.
          </p>
        </div>
        <p className="relative text-xs text-mist/70">Caracas · Flota en vivo · Google Maps</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            {logo ? (
              <img src={logo} alt="" className="size-9 rounded-lg object-cover" />
            ) : null}
            <p className="text-sm font-semibold text-snow">{company}</p>
          </div>
          <h2 className="text-xl font-semibold text-snow">{title}</h2>
          <p className="mt-1 mb-6 text-sm text-mist">{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  )
}
