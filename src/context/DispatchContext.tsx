import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  DispatchStep,
  Driver,
  LiveTrip,
  MapMode,
  OrderDraft,
  PinFocus,
} from '../types'
import { ApiError, isAbortError } from '../lib/api'
import { closestAssignable, fetchCandidates, NEARBY_RADIUS_M, rankCandidates } from '../lib/fleet'
import { formatPlaceHint, geocodeFirst, reverseGeocode } from '../lib/geocode'
import { haversineMeters } from '../lib/geo'
import { EMPTY_ORDER } from '../lib/mock-data'
import { formatDestLabel, formatOriginLabel } from '../lib/orderStops'
import { extractOrder, extractedToDraft, ParserError } from '../lib/parser'
import { isLiveServiceStatus } from '../lib/services'
import { buildClientMessage, buildClientWhatsAppUrl, buildDispatchMessage, buildWhatsAppUrl, copyAndOpenWhatsApp, openWhatsAppPopup } from '../lib/whatsapp'
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
  rawText: string
  extracting: boolean
  extractError: string | null
  searching: boolean
  searchError: string | null
  copied: 'driver' | 'client' | null
  availableCount: number
  busyCount: number
  offlineCount: number
  activePin: PinFocus
  mapMode: MapMode
  focusedTripId: string | null
  liveTrips: LiveTrip[]
  setMapMode: (mode: MapMode) => void
  focusTrip: (id: string | null) => void
  setRawText: (value: string) => void
  setActivePin: (pin: PinFocus) => void
  updateOrder: (patch: Partial<OrderDraft>) => void
  extractWithAI: () => Promise<void>
  cancelExtract: () => void
  continueManually: () => void
  acceptService: () => Promise<void>
  hoverDriver: (id: string | null) => void
  focusDriver: (id: string | null) => void
  setPinFromMap: (coords: [number, number]) => void
  moveOrigin: (coords: [number, number]) => void
  moveDest: (coords: [number, number]) => void
  clearPin: (pin: PinFocus) => void
  assignDriver: (driver: Driver) => Promise<void>
  takeOffline: (driverId: string) => void
  pendingOffline: { id: string; name: string } | null
  takingOffline: boolean
  confirmTakeOffline: () => Promise<void>
  cancelTakeOffline: () => void
  resetOrder: () => void
  copyMessage: (target?: 'driver' | 'client') => Promise<void>
  sendWhatsApp: (target: 'driver' | 'client') => Promise<void>
  getWhatsAppUrl: (target?: 'driver' | 'client') => string | null
  getFormattedMessage: (target?: 'driver' | 'client') => string
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
  const [rawText, setRawText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'driver' | 'client' | null>(null)
  const [activePin, setActivePin] = useState<PinFocus>('origin')
  const [acceptedServiceId, setAcceptedServiceId] = useState<string | null>(null)
  const [mapMode, setMapMode] = useState<MapMode>('fleet')
  const [focusedTripId, setFocusedTripId] = useState<string | null>(null)
  const [pendingOffline, setPendingOffline] = useState<{ id: string; name: string } | null>(
    null,
  )
  const [takingOffline, setTakingOffline] = useState(false)
  const extractAbortRef = useRef<AbortController | null>(null)

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

  const originReverseRef = useRef(0)
  const destReverseRef = useRef(0)

  const applyMapCoords = useCallback(
    (which: 'origin' | 'dest', coords: [number, number], extra?: Partial<OrderDraft>) => {
      setOrder((prev) => ({
        ...prev,
        ...extra,
        ...(which === 'origin' ? { originCoords: coords } : { destCoords: coords }),
      }))
      const token = which === 'origin' ? ++originReverseRef.current : ++destReverseRef.current
      void reverseGeocode(coords, city).then((hit) => {
        if (!hit) return
        if (which === 'origin' && token !== originReverseRef.current) return
        if (which === 'dest' && token !== destReverseRef.current) return
        const hint = formatPlaceHint(hit)
        setOrder((prev) => {
          const current = which === 'origin' ? prev.originCoords : prev.destCoords
          if (
            !current ||
            current[0] !== coords[0] ||
            current[1] !== coords[1]
          ) {
            return prev
          }
          if (which === 'origin') {
            return { ...prev, origin: hit.label, originHint: hint }
          }
          return { ...prev, destination: hit.label, destHint: hint }
        })
      })
    },
    [city],
  )

  const moveOrigin = useCallback(
    (coords: [number, number]) => applyMapCoords('origin', coords),
    [applyMapCoords],
  )

  const moveDest = useCallback(
    (coords: [number, number]) => applyMapCoords('dest', coords),
    [applyMapCoords],
  )

  const clearPin = useCallback((pin: PinFocus) => {
    if (pin === 'origin') {
      originReverseRef.current += 1
      setOrder((prev) => ({
        ...prev,
        origin: '',
        originHint: '',
        originExact: '',
        originCoords: null,
      }))
      setActivePin('origin')
      return
    }
    destReverseRef.current += 1
    setOrder((prev) => ({
      ...prev,
      destination: '',
      destHint: '',
      destExact: '',
      destCoords: null,
    }))
    setActivePin('dest')
  }, [])

  const setPinFromMap = useCallback(
    (coords: [number, number]) => {
      if (!order.originCoords) {
        applyMapCoords('origin', coords, {
          origin: order.origin.trim() ? order.origin : 'Punto A en el mapa',
          originHint: order.originHint || 'Punto en el mapa',
        })
        setActivePin('dest')
        return
      }
      if (!order.destCoords) {
        applyMapCoords('dest', coords, {
          destination: order.destination.trim() ? order.destination : 'Punto B en el mapa',
          destHint: order.destHint || 'Punto en el mapa',
        })
        return
      }
      applyMapCoords(activePin, coords)
    },
    [
      activePin,
      applyMapCoords,
      order.destCoords,
      order.destHint,
      order.destination,
      order.origin,
      order.originCoords,
      order.originHint,
    ],
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
    extractAbortRef.current?.abort()
    const controller = new AbortController()
    extractAbortRef.current = controller
    setExtractError(null)
    setExtracting(true)
    try {
      const extracted = await extractOrder({ rawText }, controller.signal)
      if (controller.signal.aborted) return
      const draft = extractedToDraft(extracted, order.serviceTypeId)
      const [originHit, destHit] = await Promise.all([
        geocodeFirst(draft.origin, city, controller.signal),
        geocodeFirst(draft.destination, city, controller.signal),
      ])
      if (controller.signal.aborted) return
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
      if (controller.signal.aborted || isAbortError(error)) return
      const message =
        error instanceof ParserError || error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'No se pudo extraer el pedido'
      setExtractError(message)
    } finally {
      if (extractAbortRef.current === controller) {
        extractAbortRef.current = null
      }
      setExtracting(false)
    }
  }, [city, order.serviceTypeId, rawText])

  const cancelExtract = useCallback(() => {
    extractAbortRef.current?.abort()
  }, [])

  useEffect(() => {
    return () => {
      extractAbortRef.current?.abort()
    }
  }, [])

  const continueManually = useCallback(() => {
    setExtractError(null)
    setAcceptedServiceId(null)
    setStep(2)
  }, [])

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
        origin: formatOriginLabel(order),
        destination: formatDestLabel(order),
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
      let ranked: Driver[] = []
      try {
        ranked = await fetchCandidates({
          pickup: order.originCoords,
          dropoff: order.destCoords,
          cityId: city.id,
          limit: 5,
          serviceTypeId: order.serviceTypeId,
        })
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) {
          throw error
        }
      }
      if (ranked.length === 0) {
        ranked = closestAssignable(fleet, order.originCoords)
      }
      setCandidates(ranked)
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
  }, [addRecord, city.id, fleet, order])

  const assignDriver = useCallback(
    async (driver: Driver) => {
      const popup = openWhatsAppPopup()
      setSelectedDriver(driver)
      setFocusedDriverId(driver.id)
      setHoveredDriverId(driver.id)
      try {
        if (acceptedServiceId) {
          await updateRecord(acceptedServiceId, {
            driverId: driver.id,
            status: 'en_route',
          })
          await refreshDrivers()
        }
        const message = buildDispatchMessage(order, driver)
        await copyAndOpenWhatsApp(buildWhatsAppUrl(order, driver), message, popup)
        setCopied('driver')
        window.setTimeout(() => setCopied((current) => (current === 'driver' ? null : current)), 1800)
        setStep(4)
      } catch (error) {
        popup?.close()
        setSearchError(
          error instanceof ApiError || error instanceof Error
            ? error.message
            : 'No se pudo asignar el conductor',
        )
      }
    },
    [acceptedServiceId, order, refreshDrivers, updateRecord],
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
    setCopied(null)
    setExtractError(null)
    setSearchError(null)
    setActivePin('origin')
    setAcceptedServiceId(null)
  }, [types])

  const getFormattedMessage = useCallback(
    (target: 'driver' | 'client' = 'driver') => {
      if (!selectedDriver) return ''
      return target === 'client'
        ? buildClientMessage(order, selectedDriver)
        : buildDispatchMessage(order, selectedDriver)
    },
    [order, selectedDriver],
  )

  const getWhatsAppUrl = useCallback(
    (target: 'driver' | 'client' = 'driver') => {
      if (!selectedDriver) return null
      return target === 'client'
        ? buildClientWhatsAppUrl(order, selectedDriver)
        : buildWhatsAppUrl(order, selectedDriver)
    },
    [order, selectedDriver],
  )

  const copyMessage = useCallback(
    async (target: 'driver' | 'client' = 'driver') => {
      const message = getFormattedMessage(target)
      if (!message) return
      await navigator.clipboard.writeText(message)
      setCopied(target)
      window.setTimeout(() => setCopied((current) => (current === target ? null : current)), 1800)
    },
    [getFormattedMessage],
  )

  const sendWhatsApp = useCallback(
    async (target: 'driver' | 'client') => {
      const url = getWhatsAppUrl(target)
      const message = getFormattedMessage(target)
      if (!url || !message) return
      await copyAndOpenWhatsApp(url, message)
      setCopied(target)
      window.setTimeout(() => setCopied((current) => (current === target ? null : current)), 1800)
    },
    [getFormattedMessage, getWhatsAppUrl],
  )

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
      rawText,
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
      setRawText,
      setActivePin,
      updateOrder,
      extractWithAI,
      cancelExtract,
      continueManually,
      acceptService,
      hoverDriver: setHoveredDriverId,
      focusDriver,
      setPinFromMap,
      moveOrigin,
      moveDest,
      clearPin,
      assignDriver,
      takeOffline,
      pendingOffline,
      takingOffline,
      confirmTakeOffline,
      cancelTakeOffline,
      resetOrder,
      copyMessage,
      sendWhatsApp,
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
      rawText,
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
      cancelExtract,
      continueManually,
      acceptService,
      focusDriver,
      setPinFromMap,
      moveOrigin,
      moveDest,
      clearPin,
      assignDriver,
      takeOffline,
      pendingOffline,
      takingOffline,
      confirmTakeOffline,
      cancelTakeOffline,
      resetOrder,
      copyMessage,
      sendWhatsApp,
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
