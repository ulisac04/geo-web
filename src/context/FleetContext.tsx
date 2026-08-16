import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Driver, DriverDraft, DriverStatus } from '../types'
import { createDriver, loadFleet, nudgeFleet, persistFleet } from '../lib/fleet'
import { useSettings } from './SettingsContext'

interface FleetContextValue {
  drivers: Driver[]
  addDriver: (draft: DriverDraft) => void
  updateDriver: (id: string, draft: DriverDraft) => void
  removeDriver: (id: string) => void
  setStatus: (id: string, status: DriverStatus) => void
}

const FleetContext = createContext<FleetContextValue | null>(null)

export function FleetProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [drivers, setDrivers] = useState<Driver[]>(() => loadFleet())

  useEffect(() => {
    const id = window.setInterval(() => {
      setDrivers((current) => {
        const next = nudgeFleet(current)
        persistFleet(next)
        return next
      })
    }, settings.mapRefreshSeconds * 1000)
    return () => window.clearInterval(id)
  }, [settings.mapRefreshSeconds])

  const commit = useCallback((next: Driver[]) => {
    setDrivers(next)
    persistFleet(next)
  }, [])

  const addDriver = useCallback(
    (draft: DriverDraft) => {
      commit([...drivers, createDriver(draft)])
    },
    [commit, drivers],
  )

  const updateDriver = useCallback(
    (id: string, draft: DriverDraft) => {
      commit(
        drivers.map((driver) =>
          driver.id === id ? createDriver(draft, driver) : driver,
        ),
      )
    },
    [commit, drivers],
  )

  const removeDriver = useCallback(
    (id: string) => {
      commit(drivers.filter((driver) => driver.id !== id))
    },
    [commit, drivers],
  )

  const setStatus = useCallback(
    (id: string, status: DriverStatus) => {
      commit(
        drivers.map((driver) => (driver.id === id ? { ...driver, status } : driver)),
      )
    },
    [commit, drivers],
  )

  const value = useMemo(
    () => ({ drivers, addDriver, updateDriver, removeDriver, setStatus }),
    [drivers, addDriver, updateDriver, removeDriver, setStatus],
  )

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>
}

export function useFleet(): FleetContextValue {
  const ctx = useContext(FleetContext)
  if (!ctx) {
    throw new Error('useFleet debe usarse dentro de FleetProvider')
  }
  return ctx
}
