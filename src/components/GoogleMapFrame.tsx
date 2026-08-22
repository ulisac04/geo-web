import type { ReactNode } from 'react'
import {
  APILoadingStatus,
  ColorScheme,
  Map,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps'
import { useTheme } from '../context/ThemeContext'
import { GOOGLE_MAPS_MAP_ID, hasGoogleMapsKey } from '../lib/mapsConfig'
import MapUnavailable from './MapUnavailable'

export default function GoogleMapFrame({
  id,
  center,
  className,
  children,
}: {
  id: string
  center: [number, number]
  className?: string
  children?: ReactNode
}) {
  const { theme } = useTheme()

  if (!hasGoogleMapsKey()) {
    return <MapUnavailable className={className} />
  }

  return (
    <Map
      id={id}
      className={className}
      mapId={GOOGLE_MAPS_MAP_ID}
      defaultCenter={{ lat: center[1], lng: center[0] }}
      defaultZoom={13.2}
      colorScheme={theme === 'light' ? ColorScheme.LIGHT : ColorScheme.DARK}
      disableDefaultUI
      zoomControl
      clickableIcons={false}
      gestureHandling="greedy"
    >
      <MapAuthGate className={className}>{children}</MapAuthGate>
    </Map>
  )
}

function MapAuthGate({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  const status = useApiLoadingStatus()
  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <MapUnavailable
        className={className}
        message="No se pudo autenticar Google Maps. Revisa la API key y las restricciones."
      />
    )
  }
  return children
}
