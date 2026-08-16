import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppSettings, MapRefreshSeconds } from '../types'
import { loadSettings, persistSettings } from '../lib/settings'

interface SettingsContextValue {
  settings: AppSettings
  setMapRefreshSeconds: (seconds: MapRefreshSeconds) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  const setMapRefreshSeconds = useCallback((seconds: MapRefreshSeconds) => {
    setSettings((prev) => {
      const next = { ...prev, mapRefreshSeconds: seconds }
      persistSettings(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ settings, setMapRefreshSeconds }),
    [settings, setMapRefreshSeconds],
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
