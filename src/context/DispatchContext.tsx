import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { DispatchStep, Driver, InputTab, OrderDraft } from '../types'
import { delay, extractOrderFromText } from '../lib/extract'
import {
  EMPTY_ORDER,
  NEARBY_RADIUS_M,
  rankCandidates,
  SCREENSHOT_ORDER,
} from '../lib/mock-data'
import { buildDispatchMessage, buildWhatsAppUrl } from '../lib/whatsapp'
import { useFleet } from './FleetContext'

interface DispatchContextValue {
  step: DispatchStep
  order: OrderDraft
  fleet: Driver[]
  candidates: Driver[]
  nearbyDrivers: Driver[]
  hoveredDriverId: string | null
  focusedDriverId: string | null
  selectedDriver: Driver | null
  inputTab: InputTab
  rawText: string
  screenshotPreview: string | null
  extracting: boolean
  searching: boolean
  copied: boolean
  availableCount: number
  busyCount: number
  setInputTab: (tab: InputTab) => void
  setRawText: (value: string) => void
  setScreenshot: (dataUrl: string | null) => void
  updateOrder: (patch: Partial<OrderDraft>) => void
  extractWithAI: () => Promise<void>
  searchDrivers: () => Promise<void>
  hoverDriver: (id: string | null) => void
  focusDriver: (id: string | null) => void
  setPickupFromMap: (coords: [number, number]) => void
  assignDriver: (driver: Driver) => void
  resetOrder: () => void
  copyMessage: () => Promise<void>
  getWhatsAppUrl: () => string | null
  getFormattedMessage: () => string
}

const DispatchContext = createContext<DispatchContextValue | null>(null)

export function DispatchProvider({ children }: { children: ReactNode }) {
  const { drivers: fleet } = useFleet()
  const [step, setStep] = useState<DispatchStep>(1)
  const [order, setOrder] = useState<OrderDraft>(EMPTY_ORDER)
  const [candidates, setCandidates] = useState<Driver[]>([])
  const [hoveredDriverId, setHoveredDriverId] = useState<string | null>(null)
  const [focusedDriverId, setFocusedDriverId] = useState<string | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [inputTab, setInputTab] = useState<InputTab>('text')
  const [rawText, setRawText] = useState('')
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [searching, setSearching] = useState(false)
  const [copied, setCopied] = useState(false)

  const availableCount = fleet.filter((d) => d.status === 'available').length
  const busyCount = fleet.filter((d) => d.status === 'busy').length

  const nearbyDrivers = useMemo(() => {
    if (!order.originCoords) return []
    return rankCandidates(fleet, order.originCoords, 4, NEARBY_RADIUS_M)
  }, [fleet, order.originCoords])

  const updateOrder = useCallback((patch: Partial<OrderDraft>) => {
    setOrder((prev) => ({ ...prev, ...patch }))
  }, [])

  const setPickupFromMap = useCallback((coords: [number, number]) => {
    setOrder((prev) => ({
      ...prev,
      originCoords: coords,
      origin: prev.origin.trim() ? prev.origin : 'Punto en el mapa',
    }))
  }, [])

  const focusDriver = useCallback((id: string | null) => {
    setFocusedDriverId(id)
  }, [])

  const extractWithAI = useCallback(async () => {
    setExtracting(true)
    await delay(1100)
    const next =
      inputTab === 'screenshot' ? SCREENSHOT_ORDER : extractOrderFromText(rawText)
    setOrder(next)
    setExtracting(false)
    setStep(2)
  }, [inputTab, rawText])

  const searchDrivers = useCallback(async () => {
    if (!order.originCoords) return
    setSearching(true)
    await delay(800)
    setCandidates(rankCandidates(fleet, order.originCoords, 5))
    setSearching(false)
    setStep(3)
  }, [fleet, order.originCoords])

  const assignDriver = useCallback((driver: Driver) => {
    setSelectedDriver(driver)
    setFocusedDriverId(driver.id)
    setHoveredDriverId(driver.id)
    setStep(4)
  }, [])

  const resetOrder = useCallback(() => {
    setStep(1)
    setOrder(EMPTY_ORDER)
    setCandidates([])
    setHoveredDriverId(null)
    setFocusedDriverId(null)
    setSelectedDriver(null)
    setRawText('')
    setScreenshotPreview(null)
    setInputTab('text')
    setCopied(false)
  }, [])

  const getFormattedMessage = useCallback(() => {
    if (!selectedDriver) return ''
    return buildDispatchMessage(order, selectedDriver)
  }, [order, selectedDriver])

  const getWhatsAppUrl = useCallback(() => {
    if (!selectedDriver) return null
    return buildWhatsAppUrl(order, selectedDriver)
  }, [order, selectedDriver])

  const copyMessage = useCallback(async () => {
    const message = getFormattedMessage()
    if (!message) return
    await navigator.clipboard.writeText(message)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }, [getFormattedMessage])

  const value = useMemo<DispatchContextValue>(
    () => ({
      step,
      order,
      fleet,
      candidates,
      nearbyDrivers,
      hoveredDriverId,
      focusedDriverId,
      selectedDriver,
      inputTab,
      rawText,
      screenshotPreview,
      extracting,
      searching,
      copied,
      availableCount,
      busyCount,
      setInputTab,
      setRawText,
      setScreenshot: setScreenshotPreview,
      updateOrder,
      extractWithAI,
      searchDrivers,
      hoverDriver: setHoveredDriverId,
      focusDriver,
      setPickupFromMap,
      assignDriver,
      resetOrder,
      copyMessage,
      getWhatsAppUrl,
      getFormattedMessage,
    }),
    [
      step,
      order,
      fleet,
      candidates,
      nearbyDrivers,
      hoveredDriverId,
      focusedDriverId,
      selectedDriver,
      inputTab,
      rawText,
      screenshotPreview,
      extracting,
      searching,
      copied,
      availableCount,
      busyCount,
      updateOrder,
      setPickupFromMap,
      extractWithAI,
      searchDrivers,
      focusDriver,
      assignDriver,
      resetOrder,
      copyMessage,
      getWhatsAppUrl,
      getFormattedMessage,
    ],
  )

  return <DispatchContext.Provider value={value}>{children}</DispatchContext.Provider>
}

export function useDispatchFlow(): DispatchContextValue {
  const ctx = useContext(DispatchContext)
  if (!ctx) {
    throw new Error('useDispatchFlow debe usarse dentro de DispatchProvider')
  }
  return ctx
}
