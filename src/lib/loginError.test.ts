import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { TENANT_SUSPENDED_MESSAGE, loginErrorMessage } from './loginError'

describe('loginErrorMessage', () => {
  it('traduce la empresa suspendida y el HTML que devuelve CloudFront', () => {
    expect(
      loginErrorMessage(new ApiError('tenant is suspended', 403, 'FORBIDDEN')),
    ).toBe(TENANT_SUSPENDED_MESSAGE)
    expect(loginErrorMessage(new ApiError('x', 200, 'TENANT_SUSPENDED'))).toBe(
      TENANT_SUSPENDED_MESSAGE,
    )
    expect(loginErrorMessage(new ApiError('No se pudo leer', 200, 'NON_JSON'))).toBe(
      TENANT_SUSPENDED_MESSAGE,
    )
    expect(
      loginErrorMessage(new SyntaxError("Unexpected token '<', \"<!doctype \"... is not valid JSON")),
    ).toBe(TENANT_SUSPENDED_MESSAGE)
  })

  it('deja el resto de errores de login en español', () => {
    expect(loginErrorMessage(new ApiError('invalid credentials', 401, 'UNAUTHORIZED'))).toBe(
      'Correo o contraseña incorrectos.',
    )
    expect(loginErrorMessage(new Error('falló la red'))).toBe('No se pudo iniciar sesión')
  })
})
