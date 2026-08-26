import { describe, expect, it } from 'vitest'
import { composePhone, parsePhone, toWhatsAppDigits } from './phone'

describe('parsePhone', () => {
  it('separa prefijo colombiano y venezolano', () => {
    expect(parsePhone('573155551101')).toEqual({ country: 'CO', national: '3155551101' })
    expect(parsePhone('+58 414-555-0123')).toEqual({ country: 'VE', national: '4145550123' })
  })

  it('quita el 0 local y usa el país de respaldo', () => {
    expect(parsePhone('04125550189', 'VE')).toEqual({ country: 'VE', national: '4125550189' })
    expect(parsePhone('3155551101', 'CO')).toEqual({ country: 'CO', national: '3155551101' })
  })
})

describe('composePhone', () => {
  it('agrega +57 o +58 al número nacional', () => {
    expect(composePhone('CO', '3155551101')).toBe('573155551101')
    expect(composePhone('VE', '04145550123')).toBe('584145550123')
  })

  it('reconoce un internacional pegado en el campo nacional', () => {
    expect(composePhone('VE', '573155551101')).toBe('573155551101')
  })
})

describe('toWhatsAppDigits', () => {
  it('deja listo el número para wa.me', () => {
    expect(toWhatsAppDigits('0412-555-0189', 'VE')).toBe('584125550189')
    expect(toWhatsAppDigits('+57 315 555 1101')).toBe('573155551101')
  })
})
