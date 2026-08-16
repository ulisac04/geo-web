import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CostRule, CostRuleDraft } from '../types'
import { createCostRule, loadCostRules, persistCostRules } from '../lib/costs'

interface CostsContextValue {
  rules: CostRule[]
  addRule: (draft: CostRuleDraft) => void
  updateRule: (id: string, draft: CostRuleDraft) => void
  removeRule: (id: string) => void
  setEnabled: (id: string, enabled: boolean) => void
}

const CostsContext = createContext<CostsContextValue | null>(null)

export function CostsProvider({ children }: { children: ReactNode }) {
  const [rules, setRules] = useState<CostRule[]>(() => loadCostRules())

  const commit = useCallback((next: CostRule[]) => {
    setRules(next)
    persistCostRules(next)
  }, [])

  const addRule = useCallback(
    (draft: CostRuleDraft) => {
      commit([...rules, createCostRule(draft)])
    },
    [commit, rules],
  )

  const updateRule = useCallback(
    (id: string, draft: CostRuleDraft) => {
      commit(rules.map((rule) => (rule.id === id ? createCostRule(draft, rule) : rule)))
    },
    [commit, rules],
  )

  const removeRule = useCallback(
    (id: string) => {
      commit(rules.filter((rule) => rule.id !== id))
    },
    [commit, rules],
  )

  const setEnabled = useCallback(
    (id: string, enabled: boolean) => {
      commit(rules.map((rule) => (rule.id === id ? { ...rule, enabled } : rule)))
    },
    [commit, rules],
  )

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
