import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Driver, DriverDraft, DriverStatus } from '../types'
import { createDriver, loadFleet, persistFleet } from '../lib/fleet'

interface FleetContextValue {
  drivers: Driver[]
  addDriver: (draft: DriverDraft) => void
  updateDriver: (id: string, draft: DriverDraft) => void
  removeDriver: (id: string) => void
  setStatus: (id: string, status: DriverStatus) => void
}

const FleetContext = createContext<FleetContextValue | null>(null)

export function FleetProvider({ children }: { children: ReactNode }) {
  const [drivers, setDrivers] = useState<Driver[]>(() => loadFleet())

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
