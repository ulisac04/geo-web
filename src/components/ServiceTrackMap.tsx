import { useEffect, useRef } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
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
  createOrderPinElement,
  removeMarker,
} from '../lib/mapPins'

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
  if (!hasGoogleMapsKey()) {
    return <GoogleMapFrame id="service-track-map" center={center} className="h-full min-h-[240px] w-full" />
  }

  return (
    <GoogleMapFrame id="service-track-map" center={center} className="h-full min-h-[240px] w-full">
      <ServiceTrackController
        center={center}
        originCoords={originCoords}
        destCoords={destCoords}
        coordinates={coordinates}
        estimated={estimated}
      />
    </GoogleMapFrame>
  )
}

function ServiceTrackController({
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
  const map = useMap('service-track-map')
  const markerLib = useMapsLibrary('marker')
  const originMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const destMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const lineRef = useRef<google.maps.Polyline | null>(null)
  const pinInfoRef = useRef<google.maps.InfoWindow | null>(null)
  const fitKeyRef = useRef('')

  useEffect(() => {
    if (!map) return
    lineRef.current = createRoutePolyline({
      map,
      color: estimated ? '#fbbf24' : '#34d399',
      dashed: estimated,
      weight: 3.5,
    })
    pinInfoRef.current ??= new google.maps.InfoWindow({
      pixelOffset: new google.maps.Size(0, -28),
    })
    return () => {
      clearPolyline(lineRef.current)
      lineRef.current = null
    }
  }, [map, estimated])

  useEffect(() => {
    if (!map || !markerLib) return

    removeMarker(originMarkerRef.current)
    removeMarker(destMarkerRef.current)
    originMarkerRef.current = null
    destMarkerRef.current = null

    if (originCoords) {
      originMarkerRef.current = createStaticPin(
        map,
        originCoords,
        '#fbbf24',
        'Origen',
        pinInfoRef.current,
      )
    }
    if (destCoords) {
      destMarkerRef.current = createStaticPin(
        map,
        destCoords,
        '#34d399',
        'Destino',
        pinInfoRef.current,
      )
    }

    return () => {
      removeMarker(originMarkerRef.current)
      removeMarker(destMarkerRef.current)
      originMarkerRef.current = null
      destMarkerRef.current = null
    }
  }, [originCoords, destCoords, map, markerLib])

  useEffect(() => {
    const line = lineRef.current
    if (!line) return
    setPolylineCoords(line, coordinates)
  }, [coordinates, estimated])

  useEffect(() => {
    if (!map) return

    const points: [number, number][] = [
      ...coordinates,
      ...(originCoords ? [originCoords] : []),
      ...(destCoords ? [destCoords] : []),
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
    fitTo(map, points, 48)
  }, [center, coordinates, destCoords, originCoords, map])

  return null
}

function createStaticPin(
  map: google.maps.Map,
  coords: [number, number],
  color: string,
  label: string,
  infoWindow: google.maps.InfoWindow | null,
): google.maps.marker.AdvancedMarkerElement {
  const marker = createAdvancedMarker({
    map,
    coords,
    content: createOrderPinElement(color, false),
    title: label,
  })
  marker.addListener('click', () => {
    infoWindow?.setContent(label)
    infoWindow?.open({ map, anchor: marker })
  })
  return marker
}
