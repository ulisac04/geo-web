import { useEffect, useRef } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Driver } from '../types'
import GoogleMapFrame from './GoogleMapFrame'
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
    if (!map || !markerLib) return
    if (!driver || !driverCoords) {
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
    } else {
      driverRef.current.content = createDriverPinElement(driver, { focused: true, size: 26 })
      setMarkerLngLat(driverRef.current, driverCoords)
    }
  }, [driver, driverCoords, map, markerLib])

  useEffect(() => {
    return () => {
      removeMarker(driverRef.current)
      driverRef.current = null
    }
  }, [])

  useEffect(() => {
    const line = lineRef.current
    if (!line) return
    if (originCoords && driverCoords) {
      setPolylineCoords(line, [driverCoords, originCoords])
    } else {
      setPolylineCoords(line, [])
    }
  }, [driverCoords, originCoords])

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
