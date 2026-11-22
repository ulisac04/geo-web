import { ApiError } from './api'

export const TENANT_SUSPENDED_MESSAGE =
  'Esta empresa está suspendida. El acceso queda bloqueado hasta que la reactiven.'

export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (isSuspendedLogin(error)) return TENANT_SUSPENDED_MESSAGE
    if (error.status === 401 || error.message === 'invalid credentials') {
      return 'Correo o contraseña incorrectos.'
    }
    return error.message
  }
  if (error instanceof Error && /Unexpected token|not valid JSON|<!doctype/i.test(error.message)) {
    return TENANT_SUSPENDED_MESSAGE
  }
  return 'No se pudo iniciar sesión'
}

function isSuspendedLogin(error: ApiError): boolean {
  // NON_JSON: CloudFront aún puede cambiar el 403 de la API por el index.html
  // de la SPA (200). En el login eso es una empresa suspendida.
  return (
    error.code === 'TENANT_SUSPENDED' ||
    error.code === 'NON_JSON' ||
    /tenant is suspended/i.test(error.message)
  )
}
