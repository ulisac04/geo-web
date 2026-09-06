import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { RadioTower } from 'lucide-react'
import LoginForm from '../components/LoginForm'
import { LegalFooterLinks } from './LegalPages'
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
  const company = branding?.name ?? 'Tu Ruta'

  return (
    <div className="grid min-h-full bg-ink lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden border-r border-black/20 lg:flex lg:flex-col lg:p-12">
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: "url('/login-hero.jpg')",
            backgroundPosition: '78% 42%',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(7,9,13,0.78) 0%, rgba(7,9,13,0.42) 38%, rgba(7,9,13,0.12) 68%, rgba(7,9,13,0.04) 100%)',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(7,9,13,0.38) 0%, transparent 30%, transparent 58%, rgba(7,9,13,0.5) 100%)',
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          {logo ? (
            <img src={logo} alt="" className="size-10 rounded-lg object-cover ring-1 ring-white/15" />
          ) : (
            <div className="grid size-10 place-items-center rounded-lg bg-emerald-400/20 text-emerald-300 ring-1 ring-white/10">
              <RadioTower className="size-5" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-white">{company}</p>
            <p className="text-xs text-white/65">
              {branding ? 'Operación de flota' : 'Human-in-the-Loop · B2B'}
            </p>
          </div>
        </div>
        <div className="relative mt-24 max-w-md space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-white drop-shadow-sm">
            Despacho logístico asistido, sin perder el control humano.
          </h1>
          <p className="text-sm leading-relaxed text-white/80">
            Extrae pedidos desde WhatsApp, valida datos, elige al conductor más
            cercano y confirma el envío — todo en un solo panel de monitoreo.
          </p>
        </div>
        <p className="relative mt-auto text-xs text-white/55">Caracas · Flota en vivo · Google Maps</p>
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
          <LegalFooterLinks />
        </div>
      </section>
    </div>
  )
}
