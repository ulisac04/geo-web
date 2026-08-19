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
import {
  createDriver,
  deleteDriver,
  fetchDrivers,
  patchDriverStatus,
  updateDriver as patchDriver,
} from '../lib/fleet'
import { useSettings } from './SettingsContext'

interface FleetContextValue {
  drivers: Driver[]
  refreshDrivers: () => Promise<void>
  addDriver: (draft: DriverDraft) => Promise<void>
  updateDriver: (id: string, draft: DriverDraft) => Promise<void>
  removeDriver: (id: string) => Promise<void>
  setStatus: (id: string, status: DriverStatus) => Promise<void>
}

const FleetContext = createContext<FleetContextValue | null>(null)

export function FleetProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [drivers, setDrivers] = useState<Driver[]>([])

  const refreshDrivers = useCallback(async () => {
    setDrivers(await fetchDrivers())
  }, [])

  useEffect(() => {
    void refreshDrivers().catch(() => {
      setDrivers([])
    })
  }, [refreshDrivers])

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshDrivers().catch(() => undefined)
    }, settings.mapRefreshSeconds * 1000)
    return () => window.clearInterval(id)
  }, [refreshDrivers, settings.mapRefreshSeconds])

  const addDriver = useCallback(
    async (draft: DriverDraft) => {
      const created = await createDriver(draft, settings.cityId)
      setDrivers((current) => [...current, created])
    },
    [settings.cityId],
  )

  const updateDriver = useCallback(async (id: string, draft: DriverDraft) => {
    const updated = await patchDriver(id, draft)
    setDrivers((current) => current.map((driver) => (driver.id === id ? updated : driver)))
  }, [])

  const removeDriver = useCallback(async (id: string) => {
    await deleteDriver(id)
    setDrivers((current) => current.filter((driver) => driver.id !== id))
  }, [])

  const setStatus = useCallback(async (id: string, status: DriverStatus) => {
    const updated = await patchDriverStatus(id, status)
    setDrivers((current) => current.map((driver) => (driver.id === id ? updated : driver)))
  }, [])

  const value = useMemo(
    () => ({ drivers, refreshDrivers, addDriver, updateDriver, removeDriver, setStatus }),
    [drivers, refreshDrivers, addDriver, updateDriver, removeDriver, setStatus],
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
