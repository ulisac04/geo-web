import { useEffect, useRef } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Driver } from '../types'
import GoogleMapFrame from './GoogleMapFrame'
import { LIVE_DRIVER_LERP_MS, lerpLngLat, sameLngLat } from '../lib/lerpLngLat'
import { hasGoogleMapsKey } from '../lib/mapsConfig'
import {
  clearPolyline,
  createRoutePolyline,
  fitTo,
  setPolylineCoords,
} from '../lib/mapGeometry'
import {
  createAdvancedMarker,
  type MapPinMarker,
  createDriverPinElement,
  createOrderPinElement,
  ORDER_PIN_ORIGIN,
  removeMarker,
  setMarkerLngLat,
} from '../lib/mapPins'

const MAP_ID = 'client-track-map'

export default function TrackLiveMap({
  center,
  originCoords,
  driver,
  driverCoords,
}: {
  center: [number, number]
  originCoords: [number, number] | null
  driver: Driver | null
  driverCoords: [number, number] | null
}) {
  if (!hasGoogleMapsKey()) {
    return <GoogleMapFrame id={MAP_ID} center={center} className="h-full w-full" />
  }

  return (
    <GoogleMapFrame id={MAP_ID} center={center} className="h-full w-full">
      <TrackLiveController
        center={center}
        originCoords={originCoords}
        driver={driver}
        driverCoords={driverCoords}
      />
    </GoogleMapFrame>
  )
}

function TrackLiveController({
  center,
  originCoords,
  driver,
  driverCoords,
}: {
  center: [number, number]
  originCoords: [number, number] | null
  driver: Driver | null
  driverCoords: [number, number] | null
}) {
  const map = useMap(MAP_ID)
  const markerLib = useMapsLibrary('marker')
  const originRef = useRef<MapPinMarker | null>(null)
  const driverRef = useRef<MapPinMarker | null>(null)
  const lineRef = useRef<google.maps.Polyline | null>(null)
  const fitKeyRef = useRef('')
  const visualRef = useRef<[number, number] | null>(null)
  const fromRef = useRef<[number, number] | null>(null)
  const targetRef = useRef<[number, number] | null>(null)
  const animStartRef = useRef(0)
  const rafRef = useRef(0)
  const originCoordsRef = useRef(originCoords)
  originCoordsRef.current = originCoords

  const cancelLerp = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }

  const paintVisual = (coords: [number, number]) => {
    visualRef.current = coords
    const marker = driverRef.current
    if (marker) setMarkerLngLat(marker, coords)
    const line = lineRef.current
    const origin = originCoordsRef.current
    if (!line) return
    if (origin) setPolylineCoords(line, [coords, origin])
    else setPolylineCoords(line, [])
  }

  useEffect(() => {
    if (!map) return
    lineRef.current = createRoutePolyline({
      map,
      color: '#34d399',
      dashed: true,
      weight: 3,
    })
    return () => {
      clearPolyline(lineRef.current)
      lineRef.current = null
    }
  }, [map])

  useEffect(() => {
    if (!map || !markerLib) return
    removeMarker(originRef.current)
    originRef.current = null
    if (originCoords) {
      originRef.current = createAdvancedMarker({
        map,
        coords: originCoords,
        content: createOrderPinElement(ORDER_PIN_ORIGIN, false),
        title: 'Recogida',
      })
    }
    return () => {
      removeMarker(originRef.current)
      originRef.current = null
    }
  }, [map, markerLib, originCoords])

  useEffect(() => {
    const visual = visualRef.current
    const line = lineRef.current
    if (!line) return
    if (originCoords && visual) setPolylineCoords(line, [visual, originCoords])
    else if (!originCoords) setPolylineCoords(line, [])
  }, [originCoords])

  useEffect(() => {
    if (!map || !markerLib) return
    if (!driver || !driverCoords) {
      cancelLerp()
      visualRef.current = null
      fromRef.current = null
      targetRef.current = null
      removeMarker(driverRef.current)
      driverRef.current = null
      return
    }
    if (!driverRef.current) {
      driverRef.current = createAdvancedMarker({
        map,
        coords: driverCoords,
        content: createDriverPinElement(driver, { focused: true, size: 26 }),
        title: driver.name,
        zIndex: 20,
      })
      visualRef.current = driverCoords
      targetRef.current = driverCoords
      paintVisual(driverCoords)
      return
    }
    driverRef.current.content = createDriverPinElement(driver, { focused: true, size: 26 })
    const current = visualRef.current ?? driverCoords
    if (sameLngLat(current, driverCoords) && sameLngLat(targetRef.current ?? driverCoords, driverCoords)) {
      return
    }
    fromRef.current = current
    targetRef.current = driverCoords
    animStartRef.current = performance.now()
    cancelLerp()
    const tick = (now: number) => {
      const from = fromRef.current
      const to = targetRef.current
      if (!from || !to) return
      const t = (now - animStartRef.current) / LIVE_DRIVER_LERP_MS
      paintVisual(lerpLngLat(from, to, t))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [driver, driverCoords, map, markerLib])

  useEffect(() => {
    return () => {
      cancelLerp()
      removeMarker(driverRef.current)
      driverRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!map) return
    const points: [number, number][] = [
      ...(originCoords ? [originCoords] : []),
      ...(driverCoords ? [driverCoords] : []),
    ]
    const key = points.map((point) => point.join(',')).join('|')
    if (!points.length) {
      fitKeyRef.current = ''
      map.panTo({ lat: center[1], lng: center[0] })
      map.setZoom(13.2)
      return
    }
    if (fitKeyRef.current === key) return
    fitKeyRef.current = key
    fitTo(map, points, 56)
  }, [center, driverCoords, map, originCoords])

  return null
}
