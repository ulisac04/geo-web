import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ServiceRecord, ServiceStatus, ServiceType, ServiceTypeDraft } from '../types'
import {
  createService,
  createServiceType,
  deleteServiceType,
  fetchServiceRecords,
  fetchServiceTypes,
  patchService,
  updateServiceType,
  type CreateServiceInput,
} from '../lib/services'

interface ServicesContextValue {
  types: ServiceType[]
  records: ServiceRecord[]
  refreshServices: () => Promise<void>
  addType: (draft: ServiceTypeDraft) => Promise<void>
  updateType: (id: string, draft: ServiceTypeDraft) => Promise<void>
  removeType: (id: string) => Promise<void>
  addRecord: (input: CreateServiceInput) => Promise<ServiceRecord>
  updateRecord: (
    id: string,
    patch: { driverId?: string; status?: ServiceStatus },
  ) => Promise<ServiceRecord>
}

const ServicesContext = createContext<ServicesContextValue | null>(null)

export function ServicesProvider({ children }: { children: ReactNode }) {
  const [types, setTypes] = useState<ServiceType[]>([])
  const [records, setRecords] = useState<ServiceRecord[]>([])

  const refreshServices = useCallback(async () => {
    const [nextTypes, nextRecords] = await Promise.all([
      fetchServiceTypes(),
      fetchServiceRecords(),
    ])
    setTypes(nextTypes)
    setRecords(nextRecords)
  }, [])

  useEffect(() => {
    void refreshServices().catch(() => {
      setTypes([])
      setRecords([])
    })
  }, [refreshServices])

  const addType = useCallback(async (draft: ServiceTypeDraft) => {
    const created = await createServiceType(draft)
    setTypes((current) => [...current, created])
  }, [])

  const updateType = useCallback(async (id: string, draft: ServiceTypeDraft) => {
    const updated = await updateServiceType(id, draft)
    setTypes((current) => current.map((item) => (item.id === id ? updated : item)))
  }, [])

  const removeType = useCallback(async (id: string) => {
    await deleteServiceType(id)
    setTypes((current) => current.filter((item) => item.id !== id))
  }, [])

  const addRecord = useCallback(async (input: CreateServiceInput) => {
    const record = await createService(input)
    setRecords((current) => [record, ...current])
    return record
  }, [])

  const updateRecord = useCallback(
    async (id: string, patch: { driverId?: string; status?: ServiceStatus }) => {
      const updated = await patchService(id, patch)
      setRecords((current) => current.map((record) => (record.id === id ? updated : record)))
      return updated
    },
    [],
  )

  const value = useMemo(
    () => ({
      types,
      records,
      refreshServices,
      addType,
      updateType,
      removeType,
      addRecord,
      updateRecord,
    }),
    [types, records, refreshServices, addType, updateType, removeType, addRecord, updateRecord],
  )

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>
}

export function useServices(): ServicesContextValue {
  const ctx = useContext(ServicesContext)
  if (!ctx) {
    throw new Error('useServices debe usarse dentro de ServicesProvider')
  }
  return ctx
}
