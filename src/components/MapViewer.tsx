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
import type { Driver, OrderDraft, PinFocus } from '../types'
import { useTheme } from '../context/ThemeContext'
import { CITY_CENTER } from '../lib/mock-data'
import { fetchDrivingRoute } from '../lib/routing'

setWorkerUrl(maplibreWorker)

type RouteFeature = {
  type: 'Feature'
  properties: Record<string, never>
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

interface MapViewerProps {
  drivers: Driver[]
  order: OrderDraft
  hoveredDriverId: string | null
  focusedDriverId: string | null
  selectedDriver: Driver | null
  activePin: PinFocus
  onSetPin: (coords: [number, number]) => void
  onMoveOrigin: (coords: [number, number]) => void
  onMoveDest: (coords: [number, number]) => void
}

export default function MapViewer({
  drivers,
  order,
  hoveredDriverId,
  focusedDriverId,
  selectedDriver,
  activePin,
  onSetPin,
  onMoveOrigin,
  onMoveDest,
}: MapViewerProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const driverMarkersRef = useRef<Marker[]>([])
  const originMarkerRef = useRef<Marker | null>(null)
  const destMarkerRef = useRef<Marker | null>(null)
  const draggingOriginRef = useRef(false)
  const draggingDestRef = useRef(false)
  const abortTripRef = useRef<AbortController | null>(null)
  const abortDriverRef = useRef<AbortController | null>(null)
  const skipThemeStyleRef = useRef(true)
  const onSetPinRef = useRef(onSetPin)
  const onMoveOriginRef = useRef(onMoveOrigin)
  const onMoveDestRef = useRef(onMoveDest)

  onSetPinRef.current = onSetPin
  onMoveOriginRef.current = onMoveOrigin
  onMoveDestRef.current = onMoveDest

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: document.documentElement.classList.contains('light')
        ? LIGHT_STYLE
        : DARK_STYLE,
      center: CITY_CENTER,
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
    }

    map.on('load', ensureRouteLayers)
    map.on('styledata', ensureRouteLayers)
    map.on('click', (event) => {
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
      driverMarkersRef.current.forEach((marker) => marker.remove())
      driverMarkersRef.current = []
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
      })

      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat(driver.coords)
        .addTo(map)

      driverMarkersRef.current.push(marker)
    }
  }, [drivers, hoveredDriverId, focusedDriverId, selectedDriver])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

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
  }, [activePin, order.originCoords, order.destCoords])

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
      if (!originCoords || !destCoords) {
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
  }, [destCoords, originCoords, theme])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    abortDriverRef.current?.abort()

    const paint = async () => {
      const driverSource = map.getSource('driver-route') as GeoJSONSource | undefined
      if (driverLng == null || driverLat == null || !originCoords) {
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
  }, [driverLat, driverLng, originCoords, theme])

  return (
    <section className="relative h-full w-[70%] min-w-0">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute top-4 left-4 rounded-lg border border-line bg-panel/90 px-3 py-2 text-xs text-mist backdrop-blur">
        <p className="font-medium text-snow">Ruta A → B</p>
        <p>Verde: recogida · Rojo: entrega · Ámbar: chofer</p>
        <p className="mt-1">
          Click coloca el punto {activePin === 'origin' ? 'A' : 'B'}. Arrastra para ajustar.
        </p>
      </div>
    </section>
  )
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
  el.className = 'order-pin'
  el.innerHTML = `<svg viewBox="0 0 24 32" width="28" height="36"><path d="M12 0C6.5 0 2 4.4 2 9.8c0 7.2 10 22.2 10 22.2s10-15 10-22.2C22 4.4 17.5 0 12 0z" fill="${color}"/><circle cx="12" cy="10" r="3.4" fill="var(--pin-hole)"/></svg>`
  el.addEventListener('click', (event) => event.stopPropagation())
  return new Marker({ element: el, anchor: 'bottom', draggable })
    .setLngLat(coords)
    .setPopup(new Popup({ offset: 18, closeButton: false }).setText(label))
    .addTo(map)
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
