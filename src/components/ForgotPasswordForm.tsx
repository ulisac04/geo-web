import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { requestPasswordReset } from '../lib/auth'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!email.includes('@')) {
      setError('Ingresa un correo corporativo válido.')
      return
    }

    setLoading(true)
    await requestPasswordReset(email)
    setLoading(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-snow">
          Si el correo <span className="font-medium text-snow">{email}</span> está
          registrado, enviaremos un enlace de recuperación en los próximos minutos.
        </div>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-signal hover:underline"
        >
          <ArrowLeft className="size-4" />
          Volver al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-mist">
        Ingresa el correo de tu operador. El administrador del tenant recibirá la
        solicitud de restablecimiento.
      </p>

      <div className="space-y-1.5">
        <label htmlFor="reset-email" className="text-xs font-medium uppercase tracking-wide text-mist">
          Correo corporativo
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist" />
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-line bg-ink py-2.5 pr-3 pl-10 text-sm text-snow placeholder:text-mist/50 focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
            placeholder="tu@empresa.com"
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-signal py-2.5 text-sm font-semibold text-on-signal transition hover:bg-emerald-300 disabled:opacity-60"
      >
        {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
      </button>

      <Link
        to="/login"
        className="inline-flex items-center gap-2 text-sm text-mist hover:text-snow"
      >
        <ArrowLeft className="size-4" />
        Volver al inicio de sesión
      </Link>
    </form>
  )
}
