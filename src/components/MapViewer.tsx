import { useEffect, useMemo, useRef, useState } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import GoogleMapFrame from './GoogleMapFrame'
import MapModeToggle from './MapModeToggle'
import type { Driver, LiveTrip, MapMode, OrderDraft, PinFocus, VehicleFilter } from '../types'
import { vehicleTypeLabel } from '../lib/vehicles'
import { rankNearestToOrigin } from '../lib/fleet'
import { isPickupLeg } from '../lib/services'
import { fetchDrivingRoute } from '../lib/routing'
import { hasGoogleMapsKey } from '../lib/mapsConfig'
import {
  clearPolyline,
  createRoutePolyline,
  fitTo,
  setPolylineCoords,
} from '../lib/mapGeometry'
import {
  createAdvancedMarker,
  createDriverPinElement,
  createDriverPopup,
  createOrderPinElement,
  markerLngLat,
  ORDER_PIN_DEST,
  ORDER_PIN_ORIGIN,
  removeMarker,
  setMarkerLngLat,
  togglePinActive,
} from '../lib/mapPins'

interface MapViewerProps {
  drivers: Driver[]
  order: OrderDraft
  hoveredDriverId: string | null
  focusedDriverId: string | null
  selectedDriver: Driver | null
  activePin: PinFocus
  mode: MapMode
  liveTrips: LiveTrip[]
  focusedTripId: string | null
  center: [number, number]
  onModeChange: (mode: MapMode) => void
  onFocusDriver: (id: string | null) => void
  onFocusTrip: (id: string | null) => void
  onSetPin: (coords: [number, number]) => void
  onMoveOrigin: (coords: [number, number]) => void
  onMoveDest: (coords: [number, number]) => void
  onClearPin: (pin: PinFocus) => void
  onTakeOffline: (driverId: string) => void
}

const NEAREST_LIMIT = 5

export default function MapViewer(props: MapViewerProps) {
  const routeMapped = Boolean(props.order.originCoords && props.order.destCoords)
  const [nearestOnly, setNearestOnly] = useState(false)
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>('all')
  const canFilterNearest = props.mode === 'fleet' && routeMapped

  useEffect(() => {
    if (!canFilterNearest) setNearestOnly(false)
  }, [canFilterNearest])

  const typedDrivers = useMemo(
    () =>
      vehicleFilter === 'all'
        ? props.drivers
        : props.drivers.filter((driver) => driver.vehicleType === vehicleFilter),
    [props.drivers, vehicleFilter],
  )
  const typedLiveTrips = useMemo(
    () =>
      vehicleFilter === 'all'
        ? props.liveTrips
        : props.liveTrips.filter((trip) => trip.driver.vehicleType === vehicleFilter),
    [props.liveTrips, vehicleFilter],
  )

  const mapDrivers = useMemo(() => {
    if (!nearestOnly || !props.order.originCoords || props.mode !== 'fleet') {
      return typedDrivers
    }
    const nearest = rankNearestToOrigin(typedDrivers, props.order.originCoords, NEAREST_LIMIT)
    const focusedId = props.focusedDriverId ?? props.selectedDriver?.id ?? null
    if (!focusedId || nearest.some((driver) => driver.id === focusedId)) return nearest
    const extra = typedDrivers.find((driver) => driver.id === focusedId)
    return extra ? [...nearest, extra] : nearest
  }, [
    nearestOnly,
    typedDrivers,
    props.mode,
    props.order.originCoords,
    props.focusedDriverId,
    props.selectedDriver?.id,
  ])

  return (
    <section className="relative h-full w-full min-w-0">
      {hasGoogleMapsKey() ? (
        <GoogleMapFrame id="dispatch-map" center={props.center} className="h-full w-full">
          <MapViewerController
            {...props}
            drivers={mapDrivers}
            liveTrips={typedLiveTrips}
            nearestOnly={nearestOnly}
          />
        </GoogleMapFrame>
      ) : (
        <GoogleMapFrame id="dispatch-map" center={props.center} className="h-full w-full" />
      )}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <MapModeToggle
          mode={props.mode}
          onChange={props.onModeChange}
          showNone
          vehicleFilter={vehicleFilter}
          onVehicleFilterChange={setVehicleFilter}
        />
        <div className="pointer-events-none rounded-lg border border-line bg-panel/90 px-3 py-2 text-xs text-mist backdrop-blur">
          {props.mode === 'live' ? (
            <>
              <p className="font-medium text-snow">
                Servicios en curso
                {vehicleFilter === 'all' ? '' : ` · ${vehicleTypeLabel(vehicleFilter)}`}
              </p>
              <p>Ámbar: va a buscar · Verde: va a dejar</p>
              <p className="mt-1">Click en un viaje o chofer para enfocar la ruta.</p>
            </>
          ) : (
            <>
              <p className="font-medium text-snow">Ruta A → B</p>
              <p>
                {props.mode === 'none'
                  ? 'Solo puntos de la orden. Flota y viajes ocultos.'
                  : nearestOnly
                    ? `Solo los ${NEAREST_LIMIT} choferes más cercanos al punto A (disponibles u ocupados).`
                    : vehicleFilter === 'all'
                      ? 'Verde: recogida · Rojo: entrega · Ámbar: chofer'
                      : `Solo ${vehicleTypeLabel(vehicleFilter).toLowerCase()}. Verde: recogida · Rojo: entrega · Ámbar: chofer`}
              </p>
              <p className="mt-1">
                Click coloca el punto {props.activePin === 'origin' ? 'A' : 'B'}. Arrastra para
                ajustar. Clic derecho en un pin para quitarlo.
              </p>
            </>
          )}
        </div>
        {canFilterNearest ? (
          <button
            type="button"
            onClick={() => setNearestOnly((current) => !current)}
            className={`w-fit rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              nearestOnly
                ? 'border-signal/50 bg-signal/15 text-signal'
                : 'border-line bg-panel/90 text-snow backdrop-blur hover:border-mist/40 hover:text-snow'
            }`}
          >
            {nearestOnly
              ? 'Ver toda la flota'
              : `5 más cercanos al punto A`}
          </button>
        ) : null}
      </div>
    </section>
  )
}

function MapViewerController({
  drivers,
  order,
  hoveredDriverId,
  focusedDriverId,
  selectedDriver,
  activePin,
  mode,
  liveTrips,
  focusedTripId,
  center,
  nearestOnly,
  onFocusDriver,
  onFocusTrip,
  onSetPin,
  onMoveOrigin,
  onMoveDest,
  onClearPin,
  onTakeOffline,
}: MapViewerProps & { nearestOnly: boolean }) {
  const map = useMap('dispatch-map')
  const markerLib = useMapsLibrary('marker')
  const driverMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const originMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const destMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const livePinsRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const tripLineRef = useRef<google.maps.Polyline | null>(null)
  const driverLineRef = useRef<google.maps.Polyline | null>(null)
  const livePickupRef = useRef<google.maps.Polyline[]>([])
  const liveDropoffRef = useRef<google.maps.Polyline[]>([])
  const driverInfoRef = useRef<google.maps.InfoWindow | null>(null)
  const pinInfoRef = useRef<google.maps.InfoWindow | null>(null)
  const draggingOriginRef = useRef(false)
  const draggingDestRef = useRef(false)
  const abortTripRef = useRef<AbortController | null>(null)
  const abortDriverRef = useRef<AbortController | null>(null)
  const abortLiveRef = useRef<AbortController | null>(null)
  const fitKeyRef = useRef('')
  const liveCoordsRef = useRef<Record<string, [number, number][]>>({})
  const onSetPinRef = useRef(onSetPin)
  const onMoveOriginRef = useRef(onMoveOrigin)
  const onMoveDestRef = useRef(onMoveDest)
  const onClearPinRef = useRef(onClearPin)
  const onTakeOfflineRef = useRef(onTakeOffline)
  const onFocusDriverRef = useRef(onFocusDriver)
  const onFocusTripRef = useRef(onFocusTrip)
  const modeRef = useRef(mode)
  const liveTripsRef = useRef(liveTrips)
  const focusedTripIdRef = useRef(focusedTripId)
  const focusedDriverIdRef = useRef(focusedDriverId)
  const nearestOnlyRef = useRef(nearestOnly)

  onSetPinRef.current = onSetPin
  onMoveOriginRef.current = onMoveOrigin
  onMoveDestRef.current = onMoveDest
  onClearPinRef.current = onClearPin
  onTakeOfflineRef.current = onTakeOffline
  onFocusDriverRef.current = onFocusDriver
  onFocusTripRef.current = onFocusTrip
  modeRef.current = mode
  liveTripsRef.current = liveTrips
  focusedTripIdRef.current = focusedTripId
  focusedDriverIdRef.current = focusedDriverId
  nearestOnlyRef.current = nearestOnly

  useEffect(() => {
    if (!map) return

    tripLineRef.current = createRoutePolyline({
      map,
      color: '#3b82f6',
      weight: 3.5,
    })
    driverLineRef.current = createRoutePolyline({
      map,
      color: '#fbbf24',
      dashed: true,
      weight: 2.5,
    })
    driverInfoRef.current = new google.maps.InfoWindow({ pixelOffset: new google.maps.Size(0, -8) })
    pinInfoRef.current = new google.maps.InfoWindow({ pixelOffset: new google.maps.Size(0, -28) })

    const clickListener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (modeRef.current === 'live') return
      const target = event.domEvent?.target
      if (target instanceof Element && target.closest('.driver-pin, .order-pin')) return
      if (!event.latLng) return
      onSetPinRef.current([event.latLng.lng(), event.latLng.lat()])
    })

    return () => {
      abortTripRef.current?.abort()
      abortDriverRef.current?.abort()
      abortLiveRef.current?.abort()
      clickListener.remove()
      driverInfoRef.current?.close()
      pinInfoRef.current?.close()
      driverMarkersRef.current.forEach(removeMarker)
      driverMarkersRef.current = []
      livePinsRef.current.forEach(removeMarker)
      livePinsRef.current = []
      removeMarker(originMarkerRef.current)
      removeMarker(destMarkerRef.current)
      originMarkerRef.current = null
      destMarkerRef.current = null
      clearPolyline(tripLineRef.current)
      clearPolyline(driverLineRef.current)
      livePickupRef.current.forEach(clearPolyline)
      liveDropoffRef.current.forEach(clearPolyline)
      livePickupRef.current = []
      liveDropoffRef.current = []
      tripLineRef.current = null
      driverLineRef.current = null
    }
  }, [map])

  useEffect(() => {
    if (!map) return
    map.panTo({ lat: center[1], lng: center[0] })
    map.setZoom(13.2)
  }, [center, map])

  useEffect(() => {
    if (!map || !markerLib) return

    driverMarkersRef.current.forEach(removeMarker)
    driverMarkersRef.current = []

    for (const driver of drivers) {
      const focused = focusedDriverId === driver.id || selectedDriver?.id === driver.id
      const hovered = hoveredDriverId === driver.id && !focused
      const el = createDriverPinElement(driver, { hovered, focused })
      const marker = createAdvancedMarker({
        map,
        coords: driver.coords,
        content: el,
        title: driver.name,
        zIndex: focused ? 25 : hovered ? 20 : 10,
      })
      marker.addListener('click', () => {
        driverInfoRef.current?.setContent(
          createDriverPopup(driver, () => onTakeOfflineRef.current(driver.id)),
        )
        driverInfoRef.current?.open({ map, anchor: marker })
        if (modeRef.current === 'live') {
          const trip = liveTripsRef.current.find((item) => item.driver.id === driver.id)
          if (trip) onFocusTripRef.current(trip.record.id)
          return
        }
        onFocusDriverRef.current(driver.id)
      })
      driverMarkersRef.current.push(marker)
    }
  }, [drivers, hoveredDriverId, focusedDriverId, selectedDriver, map, markerLib])

  useEffect(() => {
    if (!map || !markerLib) return

    if (mode === 'live') {
      removeMarker(originMarkerRef.current)
      removeMarker(destMarkerRef.current)
      originMarkerRef.current = null
      destMarkerRef.current = null
      return
    }

    originMarkerRef.current = syncOrderPin({
      map,
      marker: originMarkerRef.current,
      coords: order.originCoords,
      color: ORDER_PIN_ORIGIN,
      label: 'Punto A · Recogida',
      active: activePin === 'origin',
      draggingRef: draggingOriginRef,
      infoWindow: pinInfoRef.current,
      onMove: (coords) => onMoveOriginRef.current(coords),
      onRemove: () => onClearPinRef.current('origin'),
    })
    destMarkerRef.current = syncOrderPin({
      map,
      marker: destMarkerRef.current,
      coords: order.destCoords,
      color: ORDER_PIN_DEST,
      label: 'Punto B · Entrega',
      active: activePin === 'dest',
      draggingRef: draggingDestRef,
      infoWindow: pinInfoRef.current,
      onMove: (coords) => onMoveDestRef.current(coords),
      onRemove: () => onClearPinRef.current('dest'),
    })
  }, [mode, activePin, order.originCoords, order.destCoords, map, markerLib])

  useEffect(() => {
    if (!map || !markerLib) return

    livePinsRef.current.forEach(removeMarker)
    livePinsRef.current = []
    if (mode !== 'live') return

    for (const trip of liveTrips) {
      const { record } = trip
      if (record.originCoords) {
        livePinsRef.current.push(
          createLivePin({
            map,
            coords: record.originCoords,
            color: ORDER_PIN_ORIGIN,
            label: `A · ${record.origin}`,
            active: focusedTripId === record.id,
            infoWindow: pinInfoRef.current,
            onClick: () => onFocusTripRef.current(record.id),
          }),
        )
      }
      if (record.destCoords) {
        livePinsRef.current.push(
          createLivePin({
            map,
            coords: record.destCoords,
            color: ORDER_PIN_DEST,
            label: `B · ${record.destination}`,
            active: focusedTripId === record.id,
            infoWindow: pinInfoRef.current,
            onClick: () => onFocusTripRef.current(record.id),
          }),
        )
      }
    }
  }, [mode, liveTrips, focusedTripId, map, markerLib])

  const routeDriver =
    drivers.find((driver) => driver.id === focusedDriverId) ?? selectedDriver ?? null
  const driverLng = routeDriver?.coords[0]
  const driverLat = routeDriver?.coords[1]
  const originCoords = order.originCoords
  const destCoords = order.destCoords
  const nearestIds = nearestOnly ? drivers.map((driver) => driver.id).join('|') : ''

  useEffect(() => {
    const line = tripLineRef.current
    if (!map || !line) return

    abortTripRef.current?.abort()

    if (mode === 'live' || !originCoords || !destCoords) {
      line.setPath([])
      return
    }

    setPolylineCoords(line, [originCoords, destCoords])
    if (!nearestOnlyRef.current && !focusedDriverIdRef.current) {
      fitTo(map, [originCoords, destCoords])
    }

    const controller = new AbortController()
    abortTripRef.current = controller
    void fetchDrivingRoute(originCoords, destCoords, controller.signal)
      .then((route) => {
        if (controller.signal.aborted) return
        setPolylineCoords(line, route.coordinates)
        if (!nearestOnlyRef.current && !focusedDriverIdRef.current) {
          fitTo(map, route.coordinates)
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.warn('Ruta A→B no disponible, se usa línea recta', error)
        }
      })

    return () => abortTripRef.current?.abort()
  }, [destCoords, originCoords, mode, map])

  useEffect(() => {
    if (!map || !nearestOnly || mode !== 'fleet' || !originCoords) return
    if (focusedDriverId) return
    const points: [number, number][] = [
      originCoords,
      ...(destCoords ? [destCoords] : []),
      ...drivers.map((driver) => driver.coords),
    ]
    fitTo(map, points)
  }, [destCoords, focusedDriverId, map, mode, nearestIds, nearestOnly, originCoords])

  useEffect(() => {
    const line = driverLineRef.current
    if (!map || !line) return

    abortDriverRef.current?.abort()

    if (mode !== 'fleet' || driverLng == null || driverLat == null || !originCoords) {
      line.setPath([])
      return
    }

    const from: [number, number] = [driverLng, driverLat]
    setPolylineCoords(line, [from, originCoords])
    if (focusedDriverId) fitTo(map, [from, originCoords])

    const controller = new AbortController()
    abortDriverRef.current = controller
    void fetchDrivingRoute(from, originCoords, controller.signal)
      .then((route) => {
        if (controller.signal.aborted) return
        setPolylineCoords(line, route.coordinates)
        if (focusedDriverIdRef.current) fitTo(map, route.coordinates)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.warn('Ruta chofer→A no disponible, se usa línea recta', error)
        }
      })

    return () => abortDriverRef.current?.abort()
  }, [driverLat, driverLng, focusedDriverId, originCoords, mode, map])

  const liveRouteKey = liveTrips
    .map(
      (trip) =>
        `${trip.record.id}:${trip.record.status}:${trip.driver.coords[0]},${trip.driver.coords[1]}`,
    )
    .join('|')

  useEffect(() => {
    if (!map) return

    abortLiveRef.current?.abort()

    const paintStraight = () => {
      livePickupRef.current.forEach(clearPolyline)
      liveDropoffRef.current.forEach(clearPolyline)
      livePickupRef.current = []
      liveDropoffRef.current = []

      if (mode !== 'live') {
        liveCoordsRef.current = {}
        return
      }

      const coordsByTrip: Record<string, [number, number][]> = {}
      const all: [number, number][] = []

      for (const trip of liveTrips) {
        const target = isPickupLeg(trip.record.status)
          ? trip.record.originCoords
          : trip.record.destCoords
        if (!target) continue
        const straight: [number, number][] = [trip.driver.coords, target]
        coordsByTrip[trip.record.id] = straight
        all.push(...straight)
        const pickup = isPickupLeg(trip.record.status)
        const line = createRoutePolyline({
          map,
          color: pickup ? '#fbbf24' : '#34d399',
          dashed: pickup,
          weight: pickup ? 2.5 : 3.5,
          clickable: true,
          zIndex: pickup ? 2 : 3,
        })
        setPolylineCoords(line, straight)
        line.addListener('click', () => onFocusTripRef.current(trip.record.id))
        if (pickup) livePickupRef.current.push(line)
        else liveDropoffRef.current.push(line)
      }

      liveCoordsRef.current = { ...coordsByTrip, all }
      fitLiveTrip(map, focusedTripIdRef.current, liveCoordsRef.current, fitKeyRef)
    }

    paintStraight()

    if (mode !== 'live') return

    const controller = new AbortController()
    abortLiveRef.current = controller
    void Promise.all(
      liveTrips.map(async (trip) => {
        const target = isPickupLeg(trip.record.status)
          ? trip.record.originCoords
          : trip.record.destCoords
        if (!target) return null
        try {
          const route = await fetchDrivingRoute(trip.driver.coords, target, controller.signal)
          return { trip, coordinates: route.coordinates }
        } catch (error) {
          if (!controller.signal.aborted) {
            console.warn('Ruta en curso no disponible, se usa línea recta', error)
          }
          return { trip, coordinates: [trip.driver.coords, target] as [number, number][] }
        }
      }),
    )
      .then((resolved) => {
        if (controller.signal.aborted) return
        livePickupRef.current.forEach(clearPolyline)
        liveDropoffRef.current.forEach(clearPolyline)
        livePickupRef.current = []
        liveDropoffRef.current = []
        const nextCoords: Record<string, [number, number][]> = {}
        const nextAll: [number, number][] = []
        for (const item of resolved) {
          if (!item) continue
          nextCoords[item.trip.record.id] = item.coordinates
          nextAll.push(...item.coordinates)
          const pickup = isPickupLeg(item.trip.record.status)
          const line = createRoutePolyline({
            map,
            color: pickup ? '#fbbf24' : '#34d399',
            dashed: pickup,
            weight: pickup ? 2.5 : 3.5,
            clickable: true,
            zIndex: pickup ? 2 : 3,
          })
          setPolylineCoords(line, item.coordinates)
          line.addListener('click', () => onFocusTripRef.current(item.trip.record.id))
          if (pickup) livePickupRef.current.push(line)
          else liveDropoffRef.current.push(line)
        }
        liveCoordsRef.current = { ...nextCoords, all: nextAll }
        fitLiveTrip(map, focusedTripIdRef.current, liveCoordsRef.current, fitKeyRef)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.warn('No se pudieron pintar las rutas en curso', error)
        }
      })

    return () => abortLiveRef.current?.abort()
  }, [liveRouteKey, liveTrips, mode, map])

  useEffect(() => {
    if (!map || mode !== 'live') {
      fitKeyRef.current = ''
      return
    }
    fitLiveTrip(map, focusedTripId, liveCoordsRef.current, fitKeyRef)
  }, [mode, focusedTripId, map])

  return null
}

function fitLiveTrip(
  map: google.maps.Map,
  tripId: string | null,
  coordsByTrip: Record<string, [number, number][]>,
  fitKeyRef: { current: string },
) {
  const fitKey = `live:${tripId ?? 'all'}`
  if (fitKeyRef.current === fitKey) return
  const coords = coordsByTrip[tripId ?? 'all']
  if (!coords?.length) return
  fitTo(map, coords)
  fitKeyRef.current = fitKey
}

function syncOrderPin({
  map,
  marker,
  coords,
  color,
  label,
  active,
  draggingRef,
  infoWindow,
  onMove,
  onRemove,
}: {
  map: google.maps.Map
  marker: google.maps.marker.AdvancedMarkerElement | null
  coords: [number, number] | null
  color: string
  label: string
  active: boolean
  draggingRef: { current: boolean }
  infoWindow: google.maps.InfoWindow | null
  onMove: (coords: [number, number]) => void
  onRemove: () => void
}): google.maps.marker.AdvancedMarkerElement | null {
  if (!coords) {
    removeMarker(marker)
    return null
  }

  if (!marker) {
    const next = createAdvancedMarker({
      map,
      coords,
      content: createOrderPinElement(color, true),
      title: `${label} · clic derecho para quitar`,
      draggable: true,
      zIndex: 15,
    })
    next.addListener('dragstart', () => {
      draggingRef.current = true
    })
    next.addListener('dragend', () => {
      draggingRef.current = false
      const lngLat = markerLngLat(next)
      if (lngLat) onMove(lngLat)
    })
    next.addListener('click', () => {
      infoWindow?.setContent(label)
      infoWindow?.open({ map, anchor: next })
    })
    const remove = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      infoWindow?.close()
      onRemove()
    }
    const el = next.content
    if (el instanceof HTMLElement) {
      el.addEventListener('contextmenu', remove)
      el.title = `${label} · clic derecho para quitar`
    }
    next.addEventListener('contextmenu', remove)
    togglePinActive(next, active)
    return next
  }

  togglePinActive(marker, active)
  const el = marker.content
  if (el instanceof HTMLElement) {
    el.querySelector('path')?.setAttribute('fill', color)
  }
  if (!draggingRef.current) setMarkerLngLat(marker, coords)
  return marker
}

function createLivePin({
  map,
  coords,
  color,
  label,
  active,
  infoWindow,
  onClick,
}: {
  map: google.maps.Map
  coords: [number, number]
  color: string
  label: string
  active: boolean
  infoWindow: google.maps.InfoWindow | null
  onClick: () => void
}): google.maps.marker.AdvancedMarkerElement {
  const marker = createAdvancedMarker({
    map,
    coords,
    content: createOrderPinElement(color, false),
    title: label,
    zIndex: active ? 16 : 12,
  })
  togglePinActive(marker, active)
  marker.addListener('click', () => {
    infoWindow?.setContent(label)
    infoWindow?.open({ map, anchor: marker })
    onClick()
  })
  return marker
}
