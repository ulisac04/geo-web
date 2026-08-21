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
import { useTheme } from '../context/ThemeContext'

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

export default function ServiceTrackMap({
  center,
  originCoords,
  destCoords,
  coordinates,
  estimated,
}: {
  center: [number, number]
  originCoords: [number, number] | null
  destCoords: [number, number] | null
  coordinates: [number, number][]
  estimated: boolean
}) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const originMarkerRef = useRef<Marker | null>(null)
  const destMarkerRef = useRef<Marker | null>(null)
  const skipThemeStyleRef = useRef(true)
  const fitKeyRef = useRef('')
  const initialCenterRef = useRef(center)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new MapLibreMap({
      container: containerRef.current,
      style: document.documentElement.classList.contains('light') ? LIGHT_STYLE : DARK_STYLE,
      center: initialCenterRef.current,
      zoom: 13.2,
      attributionControl: { compact: true },
    })

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

    const ensureLayers = () => {
      if (map.getSource('service-track')) return
      map.addSource('service-track', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [EMPTY_ROUTE] },
      })
      map.addLayer({
        id: 'service-track-line',
        type: 'line',
        source: 'service-track',
        paint: {
          'line-color': '#34d399',
          'line-width': 3.5,
          'line-opacity': 0.9,
        },
      })
    }

    map.on('load', ensureLayers)
    map.on('styledata', ensureLayers)
    mapRef.current = map

    const observer = new ResizeObserver(() => map.resize())
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
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

    originMarkerRef.current?.remove()
    destMarkerRef.current?.remove()
    originMarkerRef.current = null
    destMarkerRef.current = null

    if (originCoords) {
      originMarkerRef.current = createPin(map, originCoords, '#fbbf24', 'Origen')
    }
    if (destCoords) {
      destMarkerRef.current = createPin(map, destCoords, '#34d399', 'Destino')
    }
  }, [originCoords, destCoords, theme])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const apply = () => {
      const source = map.getSource('service-track') as GeoJSONSource | undefined
      if (!source) return
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
      if (map.getLayer('service-track-line')) {
        map.setPaintProperty(
          'service-track-line',
          'line-dasharray',
          estimated ? [2, 1.4] : [1, 0],
        )
        map.setPaintProperty(
          'service-track-line',
          'line-color',
          estimated ? '#fbbf24' : '#34d399',
        )
      }
    }

    if (map.isStyleLoaded()) apply()
    else map.once('load', apply)
  }, [coordinates, estimated, theme])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const points: [number, number][] = [
      ...coordinates,
      ...(originCoords ? [originCoords] : []),
      ...(destCoords ? [destCoords] : []),
    ]
    const key = points.map((p) => p.join(',')).join('|')
    if (!points.length) {
      fitKeyRef.current = ''
      map.easeTo({ center, zoom: 13.2, duration: 400 })
      return
    }
    if (fitKeyRef.current === key) return
    fitKeyRef.current = key

    if (points.length === 1) {
      map.easeTo({ center: points[0], zoom: 14, duration: 400 })
      return
    }

    const bounds = points.reduce(
      (next, coords) => next.extend(coords),
      new LngLatBounds(points[0], points[0]),
    )
    map.fitBounds(bounds, { padding: 48, maxZoom: 16, duration: 500 })
  }, [center, coordinates, destCoords, originCoords])

  return <div ref={containerRef} className="h-full min-h-[240px] w-full" />
}

function createPin(
  map: MapLibreMap,
  coords: [number, number],
  color: string,
  label: string,
): Marker {
  const el = document.createElement('div')
  el.className = 'order-pin is-static'
  el.innerHTML = `<svg viewBox="0 0 24 32" width="28" height="36"><path d="M12 0C6.5 0 2 4.4 2 9.8c0 7.2 10 22.2 10 22.2s10-15 10-22.2C22 4.4 17.5 0 12 0z" fill="${color}"/><circle cx="12" cy="10" r="3.4" fill="var(--pin-hole)"/></svg>`
  return new Marker({ element: el, anchor: 'bottom' })
    .setLngLat(coords)
    .setPopup(new Popup({ offset: 18, closeButton: false }).setText(label))
    .addTo(map)
}
