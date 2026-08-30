import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Driver, DriverDraft, WritableDriverStatus } from '../types'
import {
  createDriver,
  deleteDriver,
  fetchDrivers,
  patchDriverLocation,
  patchDriverStatus,
  regenerateDriverInvite,
  updateDriver as patchDriver,
} from '../lib/fleet'
import { useSettings } from './SettingsContext'

interface FleetContextValue {
  drivers: Driver[]
  refreshDrivers: () => Promise<Driver[]>
  addDriver: (draft: DriverDraft) => Promise<void>
  updateDriver: (id: string, draft: DriverDraft) => Promise<void>
  removeDriver: (id: string) => Promise<void>
  setStatus: (id: string, status: WritableDriverStatus) => Promise<void>
  setDriverLocation: (id: string, coords: [number, number]) => Promise<void>
  rotateInvite: (id: string) => Promise<Driver>
}

const FleetContext = createContext<FleetContextValue | null>(null)

export function FleetProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [drivers, setDrivers] = useState<Driver[]>([])

  const refreshDrivers = useCallback(async () => {
    const next = await fetchDrivers()
    setDrivers(next)
    return next
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

  const setStatus = useCallback(async (id: string, status: WritableDriverStatus) => {
    const updated = await patchDriverStatus(id, status)
    setDrivers((current) => current.map((driver) => (driver.id === id ? updated : driver)))
  }, [])

  const setDriverLocation = useCallback(async (id: string, coords: [number, number]) => {
    const updated = await patchDriverLocation(id, coords[0], coords[1])
    setDrivers((current) => current.map((driver) => (driver.id === id ? updated : driver)))
  }, [])

  const rotateInvite = useCallback(async (id: string) => {
    const updated = await regenerateDriverInvite(id)
    setDrivers((current) => current.map((driver) => (driver.id === id ? updated : driver)))
    return updated
  }, [])

  const value = useMemo(
    () => ({
      drivers,
      refreshDrivers,
      addDriver,
      updateDriver,
      removeDriver,
      setStatus,
      setDriverLocation,
      rotateInvite,
    }),
    [
      drivers,
      refreshDrivers,
      addDriver,
      updateDriver,
      removeDriver,
      setStatus,
      setDriverLocation,
      rotateInvite,
    ],
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
