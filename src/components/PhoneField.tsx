import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useSettings } from '../context/SettingsContext'
import {
  composePhone,
  defaultPhoneCountry,
  parsePhone,
  PHONE_COUNTRIES,
  phoneCountryMeta,
  type PhoneCountry,
} from '../lib/phone'

interface PhoneFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export default function PhoneField({ label, value, onChange }: PhoneFieldProps) {
  const { city } = useSettings()
  const fallback = defaultPhoneCountry(city.country)
  const [countryOverride, setCountryOverride] = useState<PhoneCountry | null>(null)
  const parsed = parsePhone(value, countryOverride ?? fallback)
  const country = value.trim() ? parsed.country : (countryOverride ?? fallback)
  const meta = phoneCountryMeta(country)

  function setCountry(next: PhoneCountry) {
    setCountryOverride(next)
    onChange(composePhone(next, parsed.national))
  }

  function setNational(raw: string) {
    onChange(composePhone(country, raw))
  }

  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium tracking-wide text-mist uppercase">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="flex overflow-hidden rounded-md border border-line bg-ink focus-within:border-signal/50 focus-within:ring-1 focus-within:ring-signal/30"
      >
        <div className="relative shrink-0 border-r border-line">
          <select
            aria-label="Indicativo"
            value={country}
            onChange={(e) => setCountry(e.target.value as PhoneCountry)}
            className="h-full min-w-[6.25rem] appearance-none bg-ink py-1.5 pr-7 pl-2 text-sm text-snow outline-none"
          >
            {PHONE_COUNTRIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.flag} +{item.dial}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-1.5 size-3.5 -translate-y-1/2 text-mist" />
        </div>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={parsed.national}
          placeholder={meta.placeholder}
          onChange={(e) => setNational(e.target.value)}
          className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-sm text-snow placeholder:text-mist/40 outline-none"
        />
      </div>
    </label>
  )
}
