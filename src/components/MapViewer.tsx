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
import type { Driver, OrderDraft } from '../types'
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
  onSetPickup: (coords: [number, number]) => void
}

export default function MapViewer({
  drivers,
  order,
  hoveredDriverId,
  focusedDriverId,
  selectedDriver,
  onSetPickup,
}: MapViewerProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const readyRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const skipThemeStyleRef = useRef(true)
  const onSetPickupRef = useRef(onSetPickup)

  onSetPickupRef.current = onSetPickup

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

    const ensureRouteLayer = () => {
      if (map.getSource('route')) {
        readyRef.current = true
        return
      }
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [EMPTY_ROUTE] },
      })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': '#34d399',
          'line-width': 3.5,
          'line-opacity': 0.9,
        },
      })
      readyRef.current = true
    }

    map.on('load', ensureRouteLayer)
    map.on('styledata', ensureRouteLayer)
    map.on('click', (event) => {
      const target = event.originalEvent.target
      if (target instanceof Element && target.closest('.driver-marker, .order-pin')) {
        return
      }
      onSetPickupRef.current([event.lngLat.lng, event.lngLat.lat])
    })

    mapRef.current = map

    return () => {
      readyRef.current = false
      abortRef.current?.abort()
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
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
    readyRef.current = false
    map.setStyle(theme === 'light' ? LIGHT_STYLE : DARK_STYLE)
  }, [theme])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    for (const driver of drivers) {
      const el = document.createElement('div')
      const highlighted =
        hoveredDriverId === driver.id ||
        focusedDriverId === driver.id ||
        selectedDriver?.id === driver.id
      el.className = `driver-marker ${driver.status}${highlighted ? ' highlighted' : ''}`
      el.innerHTML = motorcycleSvg()
      el.addEventListener('click', (event) => {
        event.stopPropagation()
      })

      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat(driver.coords)
        .setPopup(
          new Popup({ offset: 16, closeButton: false }).setHTML(
            `<strong>${driver.name}</strong><br/><span class="popup-muted">${driver.vehicle}${driver.licensePlate ? ` · ${driver.licensePlate}` : ''}</span><br/>Batería ${driver.battery}% · ${driver.status === 'available' ? 'Disponible' : 'Ocupado'}`,
          ),
        )
        .addTo(map)

      markersRef.current.push(marker)
    }

    if (order.originCoords) {
      markersRef.current.push(createPin(map, order.originCoords, '#34d399', 'Pickup'))
    }
    if (order.destCoords) {
      markersRef.current.push(createPin(map, order.destCoords, '#f43f5e', 'Dropoff'))
    }
  }, [
    drivers,
    hoveredDriverId,
    focusedDriverId,
    selectedDriver,
    order.originCoords,
    order.destCoords,
  ])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const routeDriver =
      drivers.find((driver) => driver.id === focusedDriverId) ?? selectedDriver ?? null

    abortRef.current?.abort()

    const paintRoute = async () => {
      const source = map.getSource('route') as GeoJSONSource | undefined
      if (!routeDriver || !order.originCoords) {
        source?.setData({ type: 'FeatureCollection', features: [EMPTY_ROUTE] })
        return
      }

      applyCoordinates(map, [routeDriver.coords, order.originCoords])

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const route = await fetchDrivingRoute(
          routeDriver.coords,
          order.originCoords,
          controller.signal,
        )
        if (controller.signal.aborted) return
        applyCoordinates(map, route.coordinates)
      } catch (error) {
        if (controller.signal.aborted) return
        console.warn('Ruta OSRM no disponible, se usa línea recta', error)
      }
    }

    const runWhenReady = () => {
      if (map.getSource('route')) {
        void paintRoute()
        return
      }
      map.once('styledata', runWhenReady)
    }

    runWhenReady()

    return () => {
      abortRef.current?.abort()
      map.off('styledata', runWhenReady)
    }
  }, [focusedDriverId, selectedDriver, order.originCoords, drivers, theme])

  return (
    <section className="relative h-full w-[70%] min-w-0">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute top-4 left-4 rounded-lg border border-line bg-panel/90 px-3 py-2 text-xs text-mist backdrop-blur">
        <p className="font-medium text-snow">Flota en tiempo real</p>
        <p>Verde: disponible · Ámbar: ocupado</p>
        <p className="mt-1">Click en el mapa para mover el pickup.</p>
        <p>Elige un conductor cercano en el panel para ver la ruta.</p>
      </div>
    </section>
  )
}

function applyCoordinates(map: MapLibreMap, coordinates: [number, number][]) {
  const source = map.getSource('route') as GeoJSONSource | undefined
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

  if (coordinates.length >= 2) {
    const bounds = coordinates.reduce(
      (acc, coord) => acc.extend(coord),
      new LngLatBounds(coordinates[0], coordinates[0]),
    )
    map.fitBounds(bounds, { padding: 80, duration: 700, maxZoom: 15 })
  }
}

function createPin(
  map: MapLibreMap,
  coords: [number, number],
  color: string,
  label: string,
): Marker {
  const el = document.createElement('div')
  el.className = 'order-pin'
  el.innerHTML = `<svg viewBox="0 0 24 32" width="28" height="36"><path d="M12 0C6.5 0 2 4.4 2 9.8c0 7.2 10 22.2 10 22.2s10-15 10-22.2C22 4.4 17.5 0 12 0z" fill="${color}"/><circle cx="12" cy="10" r="3.4" fill="var(--pin-hole)"/></svg>`
  el.addEventListener('click', (event) => event.stopPropagation())
  return new Marker({ element: el, anchor: 'bottom' })
    .setLngLat(coords)
    .setPopup(new Popup({ offset: 18, closeButton: false }).setText(label))
    .addTo(map)
}

function motorcycleSvg(): string {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--on-signal)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M8 17h5l3-6h3"/><path d="M6 12h4l2-4h4"/></svg>`
}
