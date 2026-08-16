import { useEffect, useRef } from 'react'
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  type GeoJSONSource,
  type StyleSpecification,
} from 'maplibre-gl'
import type { Driver, OrderDraft } from '../types'
import { CITY_CENTER } from '../lib/mock-data'

type RouteFeature = {
  type: 'Feature'
  properties: Record<string, never>
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}

const DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    },
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
}

const EMPTY_ROUTE: RouteFeature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: [] },
}

interface MapViewerProps {
  drivers: Driver[]
  order: OrderDraft
  hoveredDriverId: string | null
  selectedDriver: Driver | null
}

export default function MapViewer({
  drivers,
  order,
  hoveredDriverId,
  selectedDriver,
}: MapViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const readyRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: DARK_STYLE,
      center: CITY_CENTER,
      zoom: 13.2,
      attributionControl: { compact: true },
    })

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
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
          'line-width': 3,
          'line-opacity': 0.85,
        },
      })
      readyRef.current = true
    })

    mapRef.current = map

    return () => {
      readyRef.current = false
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    for (const driver of drivers) {
      const el = document.createElement('div')
      const highlighted =
        hoveredDriverId === driver.id || selectedDriver?.id === driver.id
      el.className = `driver-marker ${driver.status}${highlighted ? ' highlighted' : ''}`
      el.innerHTML = motorcycleSvg()

      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat(driver.coords)
        .setPopup(
          new Popup({ offset: 16, closeButton: false }).setHTML(
            `<strong>${driver.name}</strong><br/><span style="color:#8b9bb0">${driver.vehicle}</span><br/>Batería ${driver.battery}% · ${driver.status === 'available' ? 'Disponible' : 'Ocupado'}`,
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
  }, [drivers, hoveredDriverId, selectedDriver, order.originCoords, order.destCoords])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const applyRoute = () => {
      const focusDriver =
        drivers.find((d) => d.id === hoveredDriverId) ?? selectedDriver ?? null

      const coordinates: [number, number][] = []
      if (focusDriver) coordinates.push(focusDriver.coords)
      if (order.originCoords) coordinates.push(order.originCoords)
      if (order.destCoords) coordinates.push(order.destCoords)

      const source = map.getSource('route') as GeoJSONSource | undefined
      if (source) {
        source.setData({
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

      if (coordinates.length >= 2) {
        const bounds = coordinates.reduce(
          (acc, coord) => acc.extend(coord),
          new LngLatBounds(coordinates[0], coordinates[0]),
        )
        map.fitBounds(bounds, { padding: 80, duration: 700, maxZoom: 15 })
      } else if (focusDriver) {
        map.easeTo({ center: focusDriver.coords, zoom: 14.4, duration: 500 })
      }
    }

    if (readyRef.current) {
      applyRoute()
      return
    }

    map.once('load', applyRoute)
    return () => {
      map.off('load', applyRoute)
    }
  }, [hoveredDriverId, selectedDriver, order.originCoords, order.destCoords, drivers])

  return (
    <section className="relative h-full w-[70%] min-w-0">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute top-4 left-4 rounded-lg border border-line bg-panel/90 px-3 py-2 text-xs text-mist backdrop-blur">
        <p className="font-medium text-snow">Flota en tiempo real</p>
        <p>Verde: disponible · Ámbar: ocupado</p>
      </div>
    </section>
  )
}

function createPin(
  map: MapLibreMap,
  coords: [number, number],
  color: string,
  label: string,
): Marker {
  const el = document.createElement('div')
  el.className = 'order-pin'
  el.innerHTML = `<svg viewBox="0 0 24 32" width="28" height="36"><path d="M12 0C6.5 0 2 4.4 2 9.8c0 7.2 10 22.2 10 22.2s10-15 10-22.2C22 4.4 17.5 0 12 0z" fill="${color}"/><circle cx="12" cy="10" r="3.4" fill="#07090d"/></svg>`
  return new Marker({ element: el, anchor: 'bottom' })
    .setLngLat(coords)
    .setPopup(
      new Popup({ offset: 18, closeButton: false }).setText(label),
    )
    .addTo(map)
}

function motorcycleSvg(): string {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07090d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M8 17h5l3-6h3"/><path d="M6 12h4l2-4h4"/></svg>`
}
