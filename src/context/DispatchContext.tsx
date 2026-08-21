import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { ApiError } from '../lib/api'
import { fetchCandidates, NEARBY_RADIUS_M, rankCandidates } from '../lib/fleet'
import { geocodeFirst } from '../lib/geocode'
import { haversineMeters } from '../lib/geo'
import { EMPTY_ORDER } from '../lib/mock-data'
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
  audioPreview: string | null
  extracting: boolean
  extractError: string | null
  searching: boolean
  searchError: string | null
  copied: boolean
  availableCount: number
  busyCount: number
  offlineCount: number
  activePin: PinFocus
  mapMode: MapMode
  focusedTripId: string | null
  liveTrips: LiveTrip[]
  setMapMode: (mode: MapMode) => void
  focusTrip: (id: string | null) => void
  setInputTab: (tab: InputTab) => void
  setRawText: (value: string) => void
  setScreenshot: (dataUrl: string | null) => void
  setAudio: (dataUrl: string | null) => void
  setActivePin: (pin: PinFocus) => void
  updateOrder: (patch: Partial<OrderDraft>) => void
  extractWithAI: () => Promise<void>
  acceptService: () => Promise<void>
  hoverDriver: (id: string | null) => void
  focusDriver: (id: string | null) => void
  setPinFromMap: (coords: [number, number]) => void
  moveOrigin: (coords: [number, number]) => void
  moveDest: (coords: [number, number]) => void
  assignDriver: (driver: Driver) => Promise<void>
  takeOffline: (driverId: string) => void
  pendingOffline: { id: string; name: string } | null
  takingOffline: boolean
  confirmTakeOffline: () => Promise<void>
  cancelTakeOffline: () => void
  resetOrder: () => void
  copyMessage: () => Promise<void>
  getWhatsAppUrl: () => string | null
  getFormattedMessage: () => string
}

const DispatchContext = createContext<DispatchContextValue | null>(null)

export function DispatchProvider({ children }: { children: ReactNode }) {
  const { city } = useSettings()
  const { drivers, refreshDrivers, setStatus } = useFleet()
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
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [activePin, setActivePin] = useState<PinFocus>('origin')
  const [acceptedServiceId, setAcceptedServiceId] = useState<string | null>(null)
  const [mapMode, setMapMode] = useState<MapMode>('fleet')
  const [focusedTripId, setFocusedTripId] = useState<string | null>(null)
  const [pendingOffline, setPendingOffline] = useState<{ id: string; name: string } | null>(
    null,
  )
  const [takingOffline, setTakingOffline] = useState(false)

  const availableCount = fleet.filter((d) => d.status === 'available').length
  const busyCount = fleet.filter((d) => d.status === 'busy').length
  const offlineCount = fleet.filter((d) => d.status === 'offline').length

  useEffect(() => {
    const first = types.find((item) => item.active) ?? types[0]
    if (!first) return
    setOrder((prev) => {
      if (prev.serviceTypeId && types.some((item) => item.id === prev.serviceTypeId)) {
        return prev
      }
      return { ...prev, serviceTypeId: first.id }
    })
  }, [types])

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
          : inputTab === 'audio'
            ? { audioDataUrl: audioPreview }
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
        error instanceof ParserError || error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'No se pudo extraer el pedido'
      setExtractError(message)
    } finally {
      setExtracting(false)
    }
  }, [city, inputTab, order.serviceTypeId, rawText, screenshotPreview, audioPreview])

  const acceptService = useCallback(async () => {
    if (!order.originCoords || !order.destCoords) return
    if (!order.clientName.trim() || !order.clientPhone.trim()) return
    if (!order.serviceTypeId) return

    setSearching(true)
    setSearchError(null)
    try {
      const distanceM = Math.round(haversineMeters(order.originCoords, order.destCoords))
      const record = await addRecord({
        serviceTypeId: order.serviceTypeId,
        origin: order.origin,
        destination: order.destination,
        originCoords: order.originCoords,
        destCoords: order.destCoords,
        clientName: order.clientName,
        clientPhone: order.clientPhone,
        paymentMethod: order.paymentMethod,
        amount: order.amount,
        distanceM,
        notes: order.notes,
        cityId: city.id,
      })
      setAcceptedServiceId(record.id)
      try {
        const ranked = await fetchCandidates({
          pickup: order.originCoords,
          dropoff: order.destCoords,
          cityId: city.id,
          limit: 5,
          serviceTypeId: order.serviceTypeId,
        })
        setCandidates(ranked)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setCandidates([])
        } else {
          throw error
        }
      }
      setStep(3)
    } catch (error) {
      setSearchError(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'No se pudo crear el servicio',
      )
    } finally {
      setSearching(false)
    }
  }, [addRecord, city.id, order])

  const assignDriver = useCallback(
    async (driver: Driver) => {
      setSelectedDriver(driver)
      setFocusedDriverId(driver.id)
      setHoveredDriverId(driver.id)
      if (!acceptedServiceId) {
        setStep(4)
        return
      }
      try {
        await updateRecord(acceptedServiceId, {
          driverId: driver.id,
          status: 'en_route',
        })
        await refreshDrivers()
        setStep(4)
      } catch (error) {
        setSearchError(
          error instanceof ApiError || error instanceof Error
            ? error.message
            : 'No se pudo asignar el conductor',
        )
      }
    },
    [acceptedServiceId, refreshDrivers, updateRecord],
  )

  const takeOffline = useCallback(
    (driverId: string) => {
      const driver =
        fleet.find((item) => item.id === driverId) ??
        candidates.find((item) => item.id === driverId) ??
        liveTrips.find((item) => item.driver.id === driverId)?.driver
      if (!driver || driver.status === 'offline') return
      setPendingOffline({ id: driver.id, name: driver.name })
    },
    [candidates, fleet, liveTrips],
  )

  const cancelTakeOffline = useCallback(() => {
    if (takingOffline) return
    setPendingOffline(null)
  }, [takingOffline])

  const confirmTakeOffline = useCallback(async () => {
    if (!pendingOffline) return
    const driverId = pendingOffline.id
    setTakingOffline(true)
    try {
      await setStatus(driverId, 'offline')
      setFocusedDriverId((current) => (current === driverId ? null : current))
      setHoveredDriverId((current) => (current === driverId ? null : current))
      setSelectedDriver((current) => (current?.id === driverId ? null : current))
      setCandidates((current) => current.filter((driver) => driver.id !== driverId))
      setPendingOffline(null)
    } finally {
      setTakingOffline(false)
    }
  }, [pendingOffline, setStatus])

  const resetOrder = useCallback(() => {
    const first = types.find((item) => item.active) ?? types[0]
    setStep(1)
    setOrder({ ...EMPTY_ORDER, serviceTypeId: first?.id ?? '' })
    setCandidates([])
    setHoveredDriverId(null)
    setFocusedDriverId(null)
    setSelectedDriver(null)
    setRawText('')
    setScreenshotPreview(null)
    setAudioPreview(null)
    setInputTab('text')
    setCopied(false)
    setExtractError(null)
    setSearchError(null)
    setActivePin('origin')
    setAcceptedServiceId(null)
  }, [types])

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
      audioPreview,
      extracting,
      extractError,
      searching,
      searchError,
      copied,
      availableCount,
      busyCount,
      offlineCount,
      activePin,
      mapMode,
      focusedTripId,
      liveTrips,
      setMapMode,
      focusTrip,
      setInputTab,
      setRawText,
      setScreenshot: setScreenshotPreview,
      setAudio: setAudioPreview,
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
      takeOffline,
      pendingOffline,
      takingOffline,
      confirmTakeOffline,
      cancelTakeOffline,
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
      audioPreview,
      extracting,
      extractError,
      searching,
      searchError,
      copied,
      availableCount,
      busyCount,
      offlineCount,
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
      takeOffline,
      pendingOffline,
      takingOffline,
      confirmTakeOffline,
      cancelTakeOffline,
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
