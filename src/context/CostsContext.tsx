import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CostRule, CostRuleDraft } from '../types'
import {
  createCostRule,
  deleteCostRule,
  fetchCostRules,
  patchCostRuleEnabled,
  updateCostRule,
} from '../lib/costs'

interface CostsContextValue {
  rules: CostRule[]
  addRule: (draft: CostRuleDraft) => Promise<void>
  updateRule: (id: string, draft: CostRuleDraft) => Promise<void>
  removeRule: (id: string) => Promise<void>
  setEnabled: (id: string, enabled: boolean) => Promise<void>
}

const CostsContext = createContext<CostsContextValue | null>(null)

export function CostsProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<CostRule[]>([])

  useEffect(() => {
    let cancelled = false
    void fetchCostRules()
      .then((next) => {
        if (!cancelled) setRules(next)
      })
      .catch(() => {
        if (!cancelled) setRules([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const addRule = useCallback(async (draft: CostRuleDraft) => {
    const created = await createCostRule(draft)
    setRules((current) => [...current, created])
  }, [])

  const updateRule = useCallback(async (id: string, draft: CostRuleDraft) => {
    const updated = await updateCostRule(id, draft)
    setRules((current) => current.map((rule) => (rule.id === id ? updated : rule)))
  }, [])

  const removeRule = useCallback(async (id: string) => {
    await deleteCostRule(id)
    setRules((current) => current.filter((rule) => rule.id !== id))
  }, [])

  const setEnabled = useCallback(async (id: string, enabled: boolean) => {
    const updated = await patchCostRuleEnabled(id, enabled)
    setRules((current) => current.map((rule) => (rule.id === id ? updated : rule)))
  }, [])

  const value = useMemo(
    () => ({ rules, addRule, updateRule, removeRule, setEnabled }),
    [rules, addRule, updateRule, removeRule, setEnabled],
  )

  return <CostsContext.Provider value={value}>{children}</CostsContext.Provider>
}

export function useCosts(): CostsContextValue {
  const ctx = useContext(CostsContext)
  if (!ctx) {
    throw new Error('useCosts debe usarse dentro de CostsProvider')
  }
  return ctx
}
