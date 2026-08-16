import ForgotPasswordForm from '../components/ForgotPasswordForm'
import { AuthShell } from './LoginPage'

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Solicita un enlace de restablecimiento para tu operador."
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}
