import { useEffect, useRef } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Driver } from '../types'
import {
  createAdvancedMarker,
  createDriverPinElement,
  markerLngLat,
  removeMarker,
  setMarkerLngLat,
} from '../lib/mapPins'
import GoogleMapFrame from './GoogleMapFrame'

const MAP_ID = 'driver-place-map'

export default function PlaceDriverMap({
  driver,
  coords,
  onChange,
}: {
  driver: Driver
  coords: [number, number]
  onChange: (coords: [number, number]) => void
}) {
  return (
    <GoogleMapFrame id={MAP_ID} center={coords} className="h-[360px] w-full rounded-xl">
      <PlaceDriverController driver={driver} coords={coords} onChange={onChange} />
    </GoogleMapFrame>
  )
}

function PlaceDriverController({
  driver,
  coords,
  onChange,
}: {
  driver: Driver
  coords: [number, number]
  onChange: (coords: [number, number]) => void
}) {
  const map = useMap(MAP_ID)
  const markerLib = useMapsLibrary('marker')
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
  const draggingRef = useRef(false)
  const onChangeRef = useRef(onChange)
  const coordsRef = useRef(coords)
  onChangeRef.current = onChange
  coordsRef.current = coords

  useEffect(() => {
    if (!map || !markerLib) return

    const marker = createAdvancedMarker({
      map,
      coords: coordsRef.current,
      content: createDriverPinElement(driver, { focused: true }),
      title: `${driver.name} · arrastra o haz clic en el mapa`,
      draggable: true,
      zIndex: 20,
    })
    marker.addListener('dragstart', () => {
      draggingRef.current = true
    })
    marker.addListener('dragend', () => {
      draggingRef.current = false
      const lngLat = markerLngLat(marker)
      if (lngLat) onChangeRef.current(lngLat)
    })
    markerRef.current = marker

    const clickListener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      const target = event.domEvent?.target
      if (target instanceof Element && target.closest('.driver-pin')) return
      if (!event.latLng) return
      onChangeRef.current([event.latLng.lng(), event.latLng.lat()])
    })

    return () => {
      clickListener.remove()
      removeMarker(marker)
      markerRef.current = null
    }
  }, [driver, map, markerLib])

  useEffect(() => {
    const marker = markerRef.current
    if (!marker || draggingRef.current) return
    setMarkerLngLat(marker, coords)
  }, [coords])

  return null
}
