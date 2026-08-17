import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppSettings, CityId, MapRefreshSeconds } from '../types'
import { getCity, type City } from '../lib/cities'
import { loadSettings, persistSettings } from '../lib/settings'

interface SettingsContextValue {
  settings: AppSettings
  city: City
  setMapRefreshSeconds: (seconds: MapRefreshSeconds) => void
  setCityId: (cityId: CityId) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  const commit = useCallback((next: AppSettings) => {
    persistSettings(next)
    setSettings(next)
  }, [])

  const setMapRefreshSeconds = useCallback(
    (seconds: MapRefreshSeconds) => {
      commit({ ...settings, mapRefreshSeconds: seconds })
    },
    [commit, settings],
  )

  const setCityId = useCallback(
    (cityId: CityId) => {
      commit({ ...settings, cityId })
    },
    [commit, settings],
  )

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
