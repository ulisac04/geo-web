import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppSettings, CityId, MapRefreshSeconds } from '../types'
import { getCity, type City } from '../lib/cities'
import {
  cacheSettings,
  fetchSettings,
  loadCachedSettings,
  patchSettings,
} from '../lib/settings'

interface SettingsContextValue {
  settings: AppSettings
  city: City
  setMapRefreshSeconds: (seconds: MapRefreshSeconds) => Promise<void>
  setCityId: (cityId: CityId) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadCachedSettings)
  const generation = useRef(0)

  const apply = useCallback((next: AppSettings) => {
    cacheSettings(next)
    setSettings(next)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const started = generation.current
    void fetchSettings(controller.signal)
      .then((next) => {
        if (controller.signal.aborted || generation.current !== started) return
        apply(next)
      })
      .catch(() => {
        // api() already handles 401; keep cached/defaults on other errors
      })
    return () => {
      controller.abort()
    }
  }, [apply])

  const setMapRefreshSeconds = useCallback(
    async (seconds: MapRefreshSeconds) => {
      generation.current += 1
      setSettings((current) => {
        const next = { ...current, mapRefreshSeconds: seconds }
        cacheSettings(next)
        return next
      })
      try {
        apply(await patchSettings({ mapRefreshSeconds: seconds }))
      } catch {
        // Keep the local interval so the map poll still follows the operator.
      }
    },
    [apply],
  )

  const setCityId = useCallback(
    async (cityId: CityId) => {
      generation.current += 1
      setSettings((current) => {
        const next = { ...current, cityId }
        cacheSettings(next)
        return next
      })
      try {
        apply(await patchSettings({ cityId }))
      } catch {
        // Keep the local city so map/autocomplete/fleet still switch.
      }
    },
    [apply],
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
