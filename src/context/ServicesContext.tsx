import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ServiceRecord, ServiceType, ServiceTypeDraft } from '../types'
import {
  createServiceRecord,
  createServiceType,
  loadServiceRecords,
  loadServiceTypes,
  persistServiceRecords,
  persistServiceTypes,
} from '../lib/services'

interface ServicesContextValue {
  types: ServiceType[]
  records: ServiceRecord[]
  addType: (draft: ServiceTypeDraft) => void
  updateType: (id: string, draft: ServiceTypeDraft) => void
  removeType: (id: string) => void
  addRecord: (draft: Omit<ServiceRecord, 'id' | 'createdAt'>) => ServiceRecord
  updateRecord: (id: string, patch: Partial<ServiceRecord>) => void
}

const ServicesContext = createContext<ServicesContextValue | null>(null)

export function ServicesProvider({ children }: { children: ReactNode }) {
  const [types, setTypes] = useState<ServiceType[]>(() => loadServiceTypes())
  const [records, setRecords] = useState<ServiceRecord[]>(() => loadServiceRecords())

  const commitTypes = useCallback((next: ServiceType[]) => {
    setTypes(next)
    persistServiceTypes(next)
  }, [])

  const commitRecords = useCallback((next: ServiceRecord[]) => {
    setRecords(next)
    persistServiceRecords(next)
  }, [])

  const addType = useCallback(
    (draft: ServiceTypeDraft) => {
      commitTypes([...types, createServiceType(draft)])
    },
    [commitTypes, types],
  )

  const updateType = useCallback(
    (id: string, draft: ServiceTypeDraft) => {
      commitTypes(
        types.map((item) => (item.id === id ? createServiceType(draft, item) : item)),
      )
    },
    [commitTypes, types],
  )

  const removeType = useCallback(
    (id: string) => {
      commitTypes(types.filter((item) => item.id !== id))
    },
    [commitTypes, types],
  )

  const addRecord = useCallback(
    (draft: Omit<ServiceRecord, 'id' | 'createdAt'>) => {
      const record = createServiceRecord(draft)
      commitRecords([record, ...records])
      return record
    },
    [commitRecords, records],
  )

  const updateRecord = useCallback(
    (id: string, patch: Partial<ServiceRecord>) => {
      commitRecords(
        records.map((record) => (record.id === id ? { ...record, ...patch } : record)),
      )
    },
    [commitRecords, records],
  )

  const value = useMemo(
    () => ({ types, records, addType, updateType, removeType, addRecord, updateRecord }),
    [types, records, addType, updateType, removeType, addRecord, updateRecord],
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
