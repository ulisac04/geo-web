import { useEffect, useRef } from 'react'
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
  type StyleSpecification,
} from 'maplibre-gl'
import maplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { Driver, LiveTrip, MapMode, OrderDraft, PinFocus } from '../types'
import { useTheme } from '../context/ThemeContext'
import { isPickupLeg } from '../lib/services'
import { fetchDrivingRoute } from '../lib/routing'
import MapModeToggle from './MapModeToggle'

setWorkerUrl(maplibreWorker)

type RouteFeature = {
  type: 'Feature'
  properties: Record<string, string>
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}

function cartoStyle(variant: 'dark_all' | 'light_all'): StyleSpecification {
  return {
    version: 8,
    sources: {
      carto: {
        type: 'raster',
        tiles: [
          `https://a.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}@2x.png`,
          `https://b.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}@2x.png`,
          `https://c.basemaps.cartocdn.com/${variant}/{z}/{x}/{y}@2x.png`,
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      },
    },
    layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
  }
}

const DARK_STYLE = cartoStyle('dark_all')
const LIGHT_STYLE = cartoStyle('light_all')

const EMPTY_ROUTE: RouteFeature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: [] },
}

const EMPTY_COLLECTION = {
  type: 'FeatureCollection' as const,
  features: [] as RouteFeature[],
}

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
  onFocusTrip: (id: string | null) => void
  onSetPin: (coords: [number, number]) => void
  onMoveOrigin: (coords: [number, number]) => void
  onMoveDest: (coords: [number, number]) => void
  onTakeOffline: (driverId: string) => void
}

export default function MapViewer({
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
  onModeChange,
  onFocusTrip,
  onSetPin,
  onMoveOrigin,
  onMoveDest,
  onTakeOffline,
}: MapViewerProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const driverMarkersRef = useRef<Marker[]>([])
  const originMarkerRef = useRef<Marker | null>(null)
  const destMarkerRef = useRef<Marker | null>(null)
  const livePinsRef = useRef<Marker[]>([])
  const draggingOriginRef = useRef(false)
  const draggingDestRef = useRef(false)
  const abortTripRef = useRef<AbortController | null>(null)
  const abortDriverRef = useRef<AbortController | null>(null)
  const abortLiveRef = useRef<AbortController | null>(null)
  const skipThemeStyleRef = useRef(true)
  const fitKeyRef = useRef('')
  const liveCoordsRef = useRef<Record<string, [number, number][]>>({})
  const onSetPinRef = useRef(onSetPin)
  const onMoveOriginRef = useRef(onMoveOrigin)
  const onMoveDestRef = useRef(onMoveDest)
  const onTakeOfflineRef = useRef(onTakeOffline)
  const onFocusTripRef = useRef(onFocusTrip)
  const modeRef = useRef(mode)
  const liveTripsRef = useRef(liveTrips)
  const focusedTripIdRef = useRef(focusedTripId)

  onSetPinRef.current = onSetPin
  onMoveOriginRef.current = onMoveOrigin
  onMoveDestRef.current = onMoveDest
  onTakeOfflineRef.current = onTakeOffline
  onFocusTripRef.current = onFocusTrip
  modeRef.current = mode
  liveTripsRef.current = liveTrips
  focusedTripIdRef.current = focusedTripId

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: document.documentElement.classList.contains('light')
        ? LIGHT_STYLE
        : DARK_STYLE,
      center,
      zoom: 13.2,
      attributionControl: { compact: true },
    })

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    const ensureRouteLayers = () => {
      if (!map.getSource('trip-route')) {
        map.addSource('trip-route', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [EMPTY_ROUTE] },
        })
        map.addLayer({
          id: 'trip-route-line',
          type: 'line',
          source: 'trip-route',
          paint: {
            'line-color': '#34d399',
            'line-width': 3.5,
            'line-opacity': 0.9,
          },
        })
      }
      if (!map.getSource('driver-route')) {
        map.addSource('driver-route', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [EMPTY_ROUTE] },
        })
        map.addLayer({
          id: 'driver-route-line',
          type: 'line',
          source: 'driver-route',
          paint: {
            'line-color': '#fbbf24',
            'line-width': 2.5,
            'line-opacity': 0.85,
            'line-dasharray': [2, 1.4],
          },
        })
      }
      if (!map.getSource('live-pickup-routes')) {
        map.addSource('live-pickup-routes', {
          type: 'geojson',
          data: EMPTY_COLLECTION,
        })
        map.addLayer({
          id: 'live-pickup-line',
          type: 'line',
          source: 'live-pickup-routes',
          paint: {
            'line-color': '#fbbf24',
            'line-width': 2.5,
            'line-opacity': 0.85,
            'line-dasharray': [2, 1.4],
          },
        })
      }
      if (!map.getSource('live-dropoff-routes')) {
        map.addSource('live-dropoff-routes', {
          type: 'geojson',
          data: EMPTY_COLLECTION,
        })
        map.addLayer({
          id: 'live-dropoff-line',
          type: 'line',
          source: 'live-dropoff-routes',
          paint: {
            'line-color': '#34d399',
            'line-width': 3.5,
            'line-opacity': 0.9,
          },
        })
      }
    }

    const focusFromLayer = (event: { features?: Array<{ properties?: Record<string, unknown> }> }) => {
      const tripId = event.features?.[0]?.properties?.tripId
      if (typeof tripId === 'string') onFocusTripRef.current(tripId)
    }

    const setLineCursor = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const clearLineCursor = () => {
      map.getCanvas().style.cursor = ''
    }

    map.on('load', ensureRouteLayers)
    map.on('styledata', ensureRouteLayers)
    map.on('click', 'live-pickup-line', focusFromLayer)
    map.on('click', 'live-dropoff-line', focusFromLayer)
    map.on('mouseenter', 'live-pickup-line', setLineCursor)
    map.on('mouseenter', 'live-dropoff-line', setLineCursor)
    map.on('mouseleave', 'live-pickup-line', clearLineCursor)
    map.on('mouseleave', 'live-dropoff-line', clearLineCursor)
    map.on('click', (event) => {
      if (modeRef.current === 'live') return
      const target = event.originalEvent.target
      if (target instanceof Element && target.closest('.driver-pin, .order-pin')) {
        return
      }
      onSetPinRef.current([event.lngLat.lng, event.lngLat.lat])
    })

    mapRef.current = map

    return () => {
      abortTripRef.current?.abort()
      abortDriverRef.current?.abort()
      abortLiveRef.current?.abort()
      driverMarkersRef.current.forEach((marker) => marker.remove())
      driverMarkersRef.current = []
      livePinsRef.current.forEach((marker) => marker.remove())
      livePinsRef.current = []
      originMarkerRef.current?.remove()
      destMarkerRef.current?.remove()
      originMarkerRef.current = null
      destMarkerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (skipThemeStyleRef.current) {
      skipThemeStyleRef.current = false
      return
    }
    map.setStyle(theme === 'light' ? LIGHT_STYLE : DARK_STYLE)
  }, [theme])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({ center, zoom: 13.2, duration: 900 })
  }, [center])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    driverMarkersRef.current.forEach((marker) => marker.remove())
    driverMarkersRef.current = []

    for (const driver of drivers) {
      const highlighted =
        hoveredDriverId === driver.id ||
        focusedDriverId === driver.id ||
        selectedDriver?.id === driver.id
      const el = createDriverPin(driver, highlighted)
      el.addEventListener('click', (event) => {
        event.stopPropagation()
        if (modeRef.current !== 'live') return
        const trip = liveTripsRef.current.find((item) => item.driver.id === driver.id)
        if (trip) onFocusTripRef.current(trip.record.id)
      })

      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat(driver.coords)
        .setPopup(
          new Popup({ offset: 22, closeButton: true, closeOnClick: true }).setDOMContent(
            createDriverPopup(driver, () => onTakeOfflineRef.current(driver.id)),
          ),
        )
        .addTo(map)

      driverMarkersRef.current.push(marker)
    }
  }, [drivers, hoveredDriverId, focusedDriverId, selectedDriver])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (mode === 'live') {
      originMarkerRef.current?.remove()
      destMarkerRef.current?.remove()
      originMarkerRef.current = null
      destMarkerRef.current = null
      return
    }

    originMarkerRef.current = syncOrderPin({
      map,
      marker: originMarkerRef.current,
      coords: order.originCoords,
      color: '#34d399',
      label: 'Punto A · Recogida',
      active: activePin === 'origin',
      draggingRef: draggingOriginRef,
      onMove: (coords) => onMoveOriginRef.current(coords),
    })
    destMarkerRef.current = syncOrderPin({
      map,
      marker: destMarkerRef.current,
      coords: order.destCoords,
      color: '#f43f5e',
      label: 'Punto B · Entrega',
      active: activePin === 'dest',
      draggingRef: draggingDestRef,
      onMove: (coords) => onMoveDestRef.current(coords),
    })
  }, [mode, activePin, order.originCoords, order.destCoords])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    livePinsRef.current.forEach((marker) => marker.remove())
    livePinsRef.current = []
    if (mode !== 'live') return

    for (const trip of liveTrips) {
      const { record } = trip
      if (record.originCoords) {
        livePinsRef.current.push(
          createLivePin({
            map,
            coords: record.originCoords,
            color: '#34d399',
            label: `A · ${record.origin}`,
            active: focusedTripId === record.id,
            onClick: () => onFocusTripRef.current(record.id),
          }),
        )
      }
      if (record.destCoords) {
        livePinsRef.current.push(
          createLivePin({
            map,
            coords: record.destCoords,
            color: '#f43f5e',
            label: `B · ${record.destination}`,
            active: focusedTripId === record.id,
            onClick: () => onFocusTripRef.current(record.id),
          }),
        )
      }
    }
  }, [mode, liveTrips, focusedTripId])

  const routeDriver =
    drivers.find((driver) => driver.id === focusedDriverId) ?? selectedDriver ?? null
  const driverLng = routeDriver?.coords[0]
  const driverLat = routeDriver?.coords[1]
  const originCoords = order.originCoords
  const destCoords = order.destCoords

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    abortTripRef.current?.abort()

    const paint = async () => {
      const tripSource = map.getSource('trip-route') as GeoJSONSource | undefined
      if (mode !== 'fleet' || !originCoords || !destCoords) {
        tripSource?.setData({ type: 'FeatureCollection', features: [EMPTY_ROUTE] })
        return
      }

      applyCoordinates(map, 'trip-route', [originCoords, destCoords])
      fitTo(map, [originCoords, destCoords])

      const controller = new AbortController()
      abortTripRef.current = controller
      try {
        const route = await fetchDrivingRoute(originCoords, destCoords, controller.signal)
        if (controller.signal.aborted) return
        applyCoordinates(map, 'trip-route', route.coordinates)
        fitTo(map, route.coordinates)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('Ruta A→B no disponible, se usa línea recta', error)
        }
      }
    }

    const runWhenReady = () => {
      if (map.getSource('trip-route')) {
        void paint()
        return
      }
      map.once('styledata', runWhenReady)
    }

    runWhenReady()

    return () => {
      abortTripRef.current?.abort()
      map.off('styledata', runWhenReady)
    }
  }, [destCoords, originCoords, mode, theme])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    abortDriverRef.current?.abort()

    const paint = async () => {
      const driverSource = map.getSource('driver-route') as GeoJSONSource | undefined
      if (mode !== 'fleet' || driverLng == null || driverLat == null || !originCoords) {
        driverSource?.setData({ type: 'FeatureCollection', features: [EMPTY_ROUTE] })
        return
      }

      const from: [number, number] = [driverLng, driverLat]
      applyCoordinates(map, 'driver-route', [from, originCoords])

      const controller = new AbortController()
      abortDriverRef.current = controller
      try {
        const route = await fetchDrivingRoute(from, originCoords, controller.signal)
        if (controller.signal.aborted) return
        applyCoordinates(map, 'driver-route', route.coordinates)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('Ruta chofer→A no disponible, se usa línea recta', error)
        }
      }
    }

    const runWhenReady = () => {
      if (map.getSource('driver-route')) {
        void paint()
        return
      }
      map.once('styledata', runWhenReady)
    }

    runWhenReady()

    return () => {
      abortDriverRef.current?.abort()
      map.off('styledata', runWhenReady)
    }
  }, [driverLat, driverLng, originCoords, mode, theme])

  const liveRouteKey = liveTrips
    .map(
      (trip) =>
        `${trip.record.id}:${trip.record.status}:${trip.driver.coords[0]},${trip.driver.coords[1]}`,
    )
    .join('|')

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    abortLiveRef.current?.abort()

    const paint = async () => {
      if (mode !== 'live') {
        clearLiveRoutes(map)
        liveCoordsRef.current = {}
        return
      }

      const pickupFeatures: RouteFeature[] = []
      const dropoffFeatures: RouteFeature[] = []
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
        const feature = lineFeature(trip.record.id, straight)
        if (isPickupLeg(trip.record.status)) pickupFeatures.push(feature)
        else dropoffFeatures.push(feature)
      }

      applyFeatures(map, 'live-pickup-routes', pickupFeatures)
      applyFeatures(map, 'live-dropoff-routes', dropoffFeatures)
      liveCoordsRef.current = { ...coordsByTrip, all }
      fitLiveTrip(map, focusedTripIdRef.current, liveCoordsRef.current, fitKeyRef)

      const controller = new AbortController()
      abortLiveRef.current = controller
      try {
        const resolved = await Promise.all(
          liveTrips.map(async (trip) => {
            const target = isPickupLeg(trip.record.status)
              ? trip.record.originCoords
              : trip.record.destCoords
            if (!target) return null
            try {
              const route = await fetchDrivingRoute(
                trip.driver.coords,
                target,
                controller.signal,
              )
              return { trip, coordinates: route.coordinates }
            } catch (error) {
              if (!controller.signal.aborted) {
                console.warn('Ruta en curso no disponible, se usa línea recta', error)
              }
              return { trip, coordinates: [trip.driver.coords, target] }
            }
          }),
        )
        if (controller.signal.aborted) return

        const nextPickup: RouteFeature[] = []
        const nextDropoff: RouteFeature[] = []
        const nextCoords: Record<string, [number, number][]> = {}
        const nextAll: [number, number][] = []

        for (const item of resolved) {
          if (!item) continue
          nextCoords[item.trip.record.id] = item.coordinates
          nextAll.push(...item.coordinates)
          const feature = lineFeature(item.trip.record.id, item.coordinates)
          if (isPickupLeg(item.trip.record.status)) nextPickup.push(feature)
          else nextDropoff.push(feature)
        }

        applyFeatures(map, 'live-pickup-routes', nextPickup)
        applyFeatures(map, 'live-dropoff-routes', nextDropoff)
        liveCoordsRef.current = { ...nextCoords, all: nextAll }
        fitLiveTrip(map, focusedTripIdRef.current, liveCoordsRef.current, fitKeyRef)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('No se pudieron pintar las rutas en curso', error)
        }
      }
    }

    const runWhenReady = () => {
      if (map.getSource('live-pickup-routes') && map.getSource('live-dropoff-routes')) {
        void paint()
        return
      }
      map.once('styledata', runWhenReady)
    }

    runWhenReady()

    return () => {
      abortLiveRef.current?.abort()
      map.off('styledata', runWhenReady)
    }
  }, [liveRouteKey, liveTrips, mode, theme])

  useEffect(() => {
    const map = mapRef.current
    if (!map || mode !== 'live') {
      fitKeyRef.current = ''
      return
    }
    fitLiveTrip(map, focusedTripId, liveCoordsRef.current, fitKeyRef)
  }, [mode, focusedTripId])

  return (
    <section className="relative h-full w-full min-w-0">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <MapModeToggle mode={mode} onChange={onModeChange} />
        <div className="pointer-events-none rounded-lg border border-line bg-panel/90 px-3 py-2 text-xs text-mist backdrop-blur">
          {mode === 'live' ? (
            <>
              <p className="font-medium text-snow">Servicios en curso</p>
              <p>Ámbar: va a buscar · Verde: va a dejar</p>
              <p className="mt-1">Click en un viaje o chofer para enfocar la ruta.</p>
            </>
          ) : (
            <>
              <p className="font-medium text-snow">Ruta A → B</p>
              <p>Verde: recogida · Rojo: entrega · Ámbar: chofer</p>
              <p className="mt-1">
                Click coloca el punto {activePin === 'origin' ? 'A' : 'B'}. Arrastra para
                ajustar.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function fitLiveTrip(
  map: MapLibreMap,
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

function lineFeature(tripId: string, coordinates: [number, number][]): RouteFeature {
  return {
    type: 'Feature',
    properties: { tripId },
    geometry: { type: 'LineString', coordinates },
  }
}

function applyFeatures(map: MapLibreMap, sourceId: string, features: RouteFeature[]) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined
  source?.setData({ type: 'FeatureCollection', features })
}

function clearLiveRoutes(map: MapLibreMap) {
  applyFeatures(map, 'live-pickup-routes', [])
  applyFeatures(map, 'live-dropoff-routes', [])
}

function applyCoordinates(
  map: MapLibreMap,
  sourceId: string,
  coordinates: [number, number][],
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined
  source?.setData({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates },
      },
    ],
  })
}

function fitTo(map: MapLibreMap, coordinates: [number, number][]) {
  const bounds = coordinates.reduce(
    (acc, coord) => acc.extend(coord),
    new LngLatBounds(coordinates[0], coordinates[0]),
  )
  map.fitBounds(bounds, { padding: 80, duration: 700, maxZoom: 15 })
}

function syncOrderPin({
  map,
  marker,
  coords,
  color,
  label,
  active,
  draggingRef,
  onMove,
}: {
  map: MapLibreMap
  marker: Marker | null
  coords: [number, number] | null
  color: string
  label: string
  active: boolean
  draggingRef: { current: boolean }
  onMove: (coords: [number, number]) => void
}): Marker | null {
  if (!coords) {
    marker?.remove()
    return null
  }

  if (!marker) {
    const next = createPin(map, coords, color, label, true)
    next.on('dragstart', () => {
      draggingRef.current = true
    })
    next.on('dragend', () => {
      draggingRef.current = false
      const lngLat = next.getLngLat()
      onMove([lngLat.lng, lngLat.lat])
    })
    togglePinActive(next, active)
    return next
  }

  togglePinActive(marker, active)
  if (!draggingRef.current) {
    marker.setLngLat(coords)
  }
  return marker
}

function createLivePin({
  map,
  coords,
  color,
  label,
  active,
  onClick,
}: {
  map: MapLibreMap
  coords: [number, number]
  color: string
  label: string
  active: boolean
  onClick: () => void
}): Marker {
  const marker = createPin(map, coords, color, label, false)
  togglePinActive(marker, active)
  marker.getElement().addEventListener('click', (event) => {
    event.stopPropagation()
    onClick()
  })
  return marker
}

function togglePinActive(marker: Marker, active: boolean) {
  marker.getElement().classList.toggle('is-active', active)
}

function createPin(
  map: MapLibreMap,
  coords: [number, number],
  color: string,
  label: string,
  draggable: boolean,
): Marker {
  const el = document.createElement('div')
  el.className = `order-pin${draggable ? '' : ' is-static'}`
  el.innerHTML = `<svg viewBox="0 0 24 32" width="28" height="36"><path d="M12 0C6.5 0 2 4.4 2 9.8c0 7.2 10 22.2 10 22.2s10-15 10-22.2C22 4.4 17.5 0 12 0z" fill="${color}"/><circle cx="12" cy="10" r="3.4" fill="var(--pin-hole)"/></svg>`
  el.addEventListener('click', (event) => event.stopPropagation())
  return new Marker({ element: el, anchor: 'bottom', draggable })
    .setLngLat(coords)
    .setPopup(new Popup({ offset: 18, closeButton: false }).setText(label))
    .addTo(map)
}

function createDriverPopup(driver: Driver, onTakeOffline: () => void): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'driver-popup'

  const name = document.createElement('strong')
  name.textContent = driver.name
  wrap.append(name)

  if (driver.licensePlate) {
    const plate = document.createElement('span')
    plate.className = 'popup-muted'
    plate.textContent = driver.licensePlate
    wrap.append(plate)
  }

  const status = document.createElement('span')
  status.className = 'popup-muted'
  status.textContent =
    driver.status === 'busy'
      ? 'Ocupado'
      : driver.status === 'offline'
        ? 'Fuera de servicio'
        : 'Disponible'
  wrap.append(status)

  if (driver.status !== 'offline') {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'driver-popup-offline'
    button.textContent = 'Fuera de servicio'
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      onTakeOffline()
    })
    wrap.append(button)
  }

  return wrap
}

function createDriverPin(driver: Driver, highlighted: boolean): HTMLDivElement {
  const pin = document.createElement('div')
  pin.className = `driver-pin ${driver.status}${highlighted ? ' highlighted' : ''}`

  const label = document.createElement('div')
  label.className = 'driver-marker-label'
  const name = document.createElement('strong')
  name.textContent = driver.name
  label.append(name)
  if (driver.licensePlate) {
    const plate = document.createElement('span')
    plate.textContent = driver.licensePlate
    label.append(plate)
  }

  const face = document.createElement('div')
  face.className = 'driver-marker'
  fillDriverMarker(face, driver)

  pin.append(label, face)
  return pin
}

function fillDriverMarker(el: HTMLDivElement, driver: Driver) {
  if (driver.driverPhoto) {
    const img = document.createElement('img')
    img.src = driver.driverPhoto
    img.alt = driver.name
    el.append(img)
    return
  }

  const initials = document.createElement('span')
  initials.className = 'driver-marker-initials'
  initials.textContent = driverInitials(driver.name)
  el.append(initials)
}

function driverInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
