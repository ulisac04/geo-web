import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppSettings, CityId, MapRefreshSeconds } from '../types'
import { getCity, type City } from '../lib/cities'
import { DEFAULT_SETTINGS, fetchSettings, patchSettings } from '../lib/settings'

interface SettingsContextValue {
  settings: AppSettings
  city: City
  setMapRefreshSeconds: (seconds: MapRefreshSeconds) => Promise<void>
  setCityId: (cityId: CityId) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    let cancelled = false
    void fetchSettings()
      .then((next) => {
        if (!cancelled) setSettings(next)
      })
      .catch(() => {
        // api() already handles 401; keep defaults on other errors
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setMapRefreshSeconds = useCallback(async (seconds: MapRefreshSeconds) => {
    const next = await patchSettings({ mapRefreshSeconds: seconds })
    setSettings(next)
  }, [])

  const setCityId = useCallback(async (cityId: CityId) => {
    const next = await patchSettings({ cityId })
    setSettings(next)
  }, [])

  const city = useMemo(() => getCity(settings.cityId), [settings.cityId])

  const value = useMemo(
    () => ({ settings, city, setMapRefreshSeconds, setCityId }),
    [settings, city, setMapRefreshSeconds, setCityId],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error('useSettings debe usarse dentro de SettingsProvider')
  }
  return ctx
}
