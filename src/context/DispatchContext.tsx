import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  DispatchStep,
  Driver,
  InputTab,
  LiveTrip,
  MapMode,
  OrderDraft,
  PinFocus,
} from '../types'
import { delay } from '../lib/extract'
import { geocodeFirst } from '../lib/geocode'
import { haversineMeters } from '../lib/geo'
import { EMPTY_ORDER, NEARBY_RADIUS_M, rankCandidates } from '../lib/mock-data'
import { extractOrder, extractedToDraft, ParserError } from '../lib/parser'
import { isLiveServiceStatus } from '../lib/services'
import { buildDispatchMessage, buildWhatsAppUrl } from '../lib/whatsapp'
import { useFleet } from './FleetContext'
import { useServices } from './ServicesContext'
import { useSettings } from './SettingsContext'

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
  extractError: string | null
  searching: boolean
  copied: boolean
  availableCount: number
  busyCount: number
  activePin: PinFocus
  mapMode: MapMode
  focusedTripId: string | null
  liveTrips: LiveTrip[]
  setMapMode: (mode: MapMode) => void
  focusTrip: (id: string | null) => void
  setInputTab: (tab: InputTab) => void
  setRawText: (value: string) => void
  setScreenshot: (dataUrl: string | null) => void
  setActivePin: (pin: PinFocus) => void
  updateOrder: (patch: Partial<OrderDraft>) => void
  extractWithAI: () => Promise<void>
  acceptService: () => Promise<void>
  hoverDriver: (id: string | null) => void
  focusDriver: (id: string | null) => void
  setPinFromMap: (coords: [number, number]) => void
  moveOrigin: (coords: [number, number]) => void
  moveDest: (coords: [number, number]) => void
  assignDriver: (driver: Driver) => void
  resetOrder: () => void
  copyMessage: () => Promise<void>
  getWhatsAppUrl: () => string | null
  getFormattedMessage: () => string
}

const DispatchContext = createContext<DispatchContextValue | null>(null)

export function DispatchProvider({ children }: { children: ReactNode }) {
  const { city } = useSettings()
  const { drivers, setStatus } = useFleet()
  const { types, records, addRecord, updateRecord } = useServices()
  const fleet = useMemo(
    () => drivers.filter((driver) => driver.cityId === city.id),
    [city.id, drivers],
  )
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
  const [extractError, setExtractError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activePin, setActivePin] = useState<PinFocus>('origin')
  const [acceptedServiceId, setAcceptedServiceId] = useState<string | null>(null)
  const [mapMode, setMapMode] = useState<MapMode>('fleet')
  const [focusedTripId, setFocusedTripId] = useState<string | null>(null)

  const availableCount = fleet.filter((d) => d.status === 'available').length
  const busyCount = fleet.filter((d) => d.status === 'busy').length

  const liveTrips = useMemo<LiveTrip[]>(() => {
    return records.flatMap((record) => {
      if (record.cityId !== city.id || !isLiveServiceStatus(record.status) || !record.driverId) {
        return []
      }
      const driver = fleet.find((item) => item.id === record.driverId)
      return driver ? [{ record, driver }] : []
    })
  }, [city.id, fleet, records])

  const nearbyDrivers = useMemo(() => {
    if (!order.originCoords) return []
    return rankCandidates(fleet, order.originCoords, 4, NEARBY_RADIUS_M)
  }, [fleet, order.originCoords])

  const updateOrder = useCallback((patch: Partial<OrderDraft>) => {
    setOrder((prev) => ({ ...prev, ...patch }))
  }, [])

  const moveOrigin = useCallback((coords: [number, number]) => {
    setOrder((prev) => ({ ...prev, originCoords: coords }))
  }, [])

  const moveDest = useCallback((coords: [number, number]) => {
    setOrder((prev) => ({ ...prev, destCoords: coords }))
  }, [])

  const setPinFromMap = useCallback(
    (coords: [number, number]) => {
      if (!order.originCoords) {
        setOrder((prev) => ({
          ...prev,
          originCoords: coords,
          origin: prev.origin.trim() ? prev.origin : 'Punto A en el mapa',
          originHint: prev.originHint || 'Punto en el mapa',
        }))
        setActivePin('dest')
        return
      }
      if (!order.destCoords) {
        setOrder((prev) => ({
          ...prev,
          destCoords: coords,
          destination: prev.destination.trim() ? prev.destination : 'Punto B en el mapa',
          destHint: prev.destHint || 'Punto en el mapa',
        }))
        return
      }
      if (activePin === 'origin') {
        setOrder((prev) => ({ ...prev, originCoords: coords }))
        return
      }
      setOrder((prev) => ({ ...prev, destCoords: coords }))
    },
    [activePin, order.destCoords, order.originCoords],
  )

  const focusDriver = useCallback((id: string | null) => {
    setFocusedDriverId(id)
  }, [])

  const focusTrip = useCallback(
    (id: string | null) => {
      setFocusedTripId(id)
      if (!id) {
        setFocusedDriverId(null)
        return
      }
      const trip = liveTrips.find((item) => item.record.id === id)
      setFocusedDriverId(trip?.driver.id ?? null)
    },
    [liveTrips],
  )

  const extractWithAI = useCallback(async () => {
    setExtractError(null)
    setExtracting(true)
    try {
      const extracted = await extractOrder(
        inputTab === 'screenshot'
          ? { imageDataUrl: screenshotPreview }
          : { rawText },
      )
      const draft = extractedToDraft(extracted, order.serviceTypeId)
      const [originHit, destHit] = await Promise.all([
        geocodeFirst(draft.origin, city),
        geocodeFirst(draft.destination, city),
      ])
      setOrder({
        ...draft,
        originCoords: originHit?.coords ?? null,
        destCoords: destHit?.coords ?? null,
        originHint: originHit ? `${originHit.label}${originHit.secondary ? `, ${originHit.secondary}` : ''}` : '',
        destHint: destHit ? `${destHit.label}${destHit.secondary ? `, ${destHit.secondary}` : ''}` : '',
      })
      setActivePin(originHit ? 'dest' : 'origin')
      setAcceptedServiceId(null)
      setStep(2)
    } catch (error) {
      const message =
        error instanceof ParserError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'No se pudo extraer el pedido'
      setExtractError(message)
    } finally {
      setExtracting(false)
    }
  }, [city, inputTab, order.serviceTypeId, rawText, screenshotPreview])

  const acceptService = useCallback(async () => {
    if (!order.originCoords || !order.destCoords) return
    if (!order.clientName.trim() || !order.clientPhone.trim()) return

    setSearching(true)
    try {
      const type = types.find((item) => item.id === order.serviceTypeId)
      const distanceM = Math.round(haversineMeters(order.originCoords, order.destCoords))
      const record = addRecord({
        typeId: order.serviceTypeId,
        typeName: type?.name ?? 'Sin tipo',
        origin: order.origin,
        destination: order.destination,
        originCoords: order.originCoords,
        destCoords: order.destCoords,
        clientName: order.clientName,
        clientPhone: order.clientPhone,
        driverId: '',
        driverName: '',
        paymentMethod: order.paymentMethod,
        amount: order.amount,
        distanceM,
        status: 'pending',
        cityId: city.id,
      })
      setAcceptedServiceId(record.id)
      await delay(400)
      setCandidates(rankCandidates(fleet, order.originCoords, 5))
      setStep(3)
    } finally {
      setSearching(false)
    }
  }, [addRecord, city.id, fleet, order, types])

  const assignDriver = useCallback(
    (driver: Driver) => {
      setSelectedDriver(driver)
      setFocusedDriverId(driver.id)
      setHoveredDriverId(driver.id)
      setStep(4)

      if (!acceptedServiceId) return
      updateRecord(acceptedServiceId, {
        driverId: driver.id,
        driverName: driver.name,
        status: 'en_route',
      })
      setStatus(driver.id, 'busy')
    },
    [acceptedServiceId, setStatus, updateRecord],
  )

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
    setExtractError(null)
    setActivePin('origin')
    setAcceptedServiceId(null)
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
      extractError,
      searching,
      copied,
      availableCount,
      busyCount,
      activePin,
      mapMode,
      focusedTripId,
      liveTrips,
      setMapMode,
      focusTrip,
      setInputTab,
      setRawText,
      setScreenshot: setScreenshotPreview,
      setActivePin,
      updateOrder,
      extractWithAI,
      acceptService,
      hoverDriver: setHoveredDriverId,
      focusDriver,
      setPinFromMap,
      moveOrigin,
      moveDest,
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
      extractError,
      searching,
      copied,
      availableCount,
      busyCount,
      activePin,
      mapMode,
      focusedTripId,
      liveTrips,
      focusTrip,
      updateOrder,
      extractWithAI,
      acceptService,
      focusDriver,
      setPinFromMap,
      moveOrigin,
      moveDest,
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
