import type { ReactNode } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { GOOGLE_MAPS_API_KEY, hasGoogleMapsKey } from '../lib/mapsConfig'

export default function MapsProvider({ children }: { children: ReactNode }) {
  if (!hasGoogleMapsKey()) return children
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} language="es" libraries={['places', 'marker', 'routes']}>
      {children}
    </APIProvider>
  )
}
