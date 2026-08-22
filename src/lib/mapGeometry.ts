import { toLatLng } from './mapsConfig'

const DASH_REPEAT = '14px'

export function fitTo(
  map: google.maps.Map,
  coordinates: [number, number][],
  padding = 80,
) {
  if (coordinates.length === 0) return
  if (coordinates.length === 1) {
    map.panTo(toLatLng(coordinates[0]))
    map.setZoom(14)
    return
  }
  const bounds = new google.maps.LatLngBounds()
  for (const coord of coordinates) bounds.extend(toLatLng(coord))
  map.fitBounds(bounds, padding)
}

export function createRoutePolyline({
  map,
  color,
  dashed = false,
  weight = 3.5,
  zIndex = 1,
  clickable = false,
}: {
  map: google.maps.Map
  color: string
  dashed?: boolean
  weight?: number
  zIndex?: number
  clickable?: boolean
}): google.maps.Polyline {
  return new google.maps.Polyline({
    map,
    path: [],
    strokeColor: color,
    strokeWeight: dashed ? 0 : weight,
    strokeOpacity: dashed ? 0 : 0.9,
    clickable,
    zIndex,
    icons: dashed
      ? [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.85,
              strokeColor: color,
              scale: 3,
            },
            offset: '0',
            repeat: DASH_REPEAT,
          },
        ]
      : [],
  })
}

export function setPolylineCoords(
  line: google.maps.Polyline,
  coordinates: [number, number][],
) {
  line.setPath(coordinates.map(toLatLng))
}

export function clearPolyline(line: google.maps.Polyline | null) {
  if (!line) return
  line.setPath([])
  line.setMap(null)
}
