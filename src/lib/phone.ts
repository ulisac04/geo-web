export type PhoneCountry = 'CO' | 'VE'

export interface PhoneCountryOption {
  code: PhoneCountry
  flag: string
  dial: string
  name: string
  placeholder: string
}

export const PHONE_COUNTRIES: PhoneCountryOption[] = [
  { code: 'CO', flag: '🇨🇴', dial: '57', name: 'Colombia', placeholder: '3155551101' },
  { code: 'VE', flag: '🇻🇪', dial: '58', name: 'Venezuela', placeholder: '4145550123' },
]

const BY_CODE: Record<PhoneCountry, PhoneCountryOption> = {
  CO: PHONE_COUNTRIES[0],
  VE: PHONE_COUNTRIES[1],
}

export function defaultPhoneCountry(countryName?: string): PhoneCountry {
  return countryName === 'Colombia' ? 'CO' : 'VE'
}

export function phoneCountryMeta(code: PhoneCountry): PhoneCountryOption {
  return BY_CODE[code]
}

export function parsePhone(
  value: string,
  fallback: PhoneCountry = 'VE',
): { country: PhoneCountry; national: string } {
  const digits = value.replace(/\D/g, '')
  if (!digits) return { country: fallback, national: '' }

  for (const option of PHONE_COUNTRIES) {
    if (digits.startsWith(option.dial) && digits.length > option.dial.length) {
      return {
        country: option.code,
        national: digits.slice(option.dial.length).replace(/^0+/, '').slice(0, 10),
      }
    }
  }

  return { country: fallback, national: digits.replace(/^0+/, '').slice(0, 10) }
}

export function composePhone(country: PhoneCountry, nationalRaw: string): string {
  const parsed = parsePhone(nationalRaw, country)
  const national = parsed.national
  if (!national) return ''
  return `${phoneCountryMeta(parsed.country).dial}${national}`
}

export function toWhatsAppDigits(value: string, fallback: PhoneCountry = 'VE'): string {
  const parsed = parsePhone(value, fallback)
  return composePhone(parsed.country, parsed.national)
}
