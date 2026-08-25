import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import TrackLiveMap from '../components/TrackLiveMap'
import { ApiError, isAbortError } from '../lib/api'
import { applyBranding, contrastOn, logoSrc } from '../lib/branding'
import { getCity } from '../lib/cities'
import { fetchPublicTrack, type PublicTrack } from '../lib/track'
import type { Driver } from '../types'

function statusCopy(status: string, hasGps: boolean): { title: string; detail: string } {
  switch (status) {
    case 'assigned':
      return {
        title: hasGps ? 'El conductor ya está en camino' : 'Esperando al conductor',
        detail: hasGps
          ? 'Así se mueve hacia el punto de recogida.'
          : 'Cuando tome el servicio verás su ubicación en vivo.',
      }
    case 'en_route':
      return {
        title: 'El conductor viene hacia ti',
        detail: 'Ubicación real actualizada desde su teléfono.',
      }
    case 'in_progress':
      return {
        title: 'Servicio en curso',
        detail: 'El viaje ya está en marcha.',
      }
    case 'completed':
      return {
        title: 'El servicio finalizó',
        detail: 'El seguimiento en vivo ya no está activo.',
      }
    case 'cancelled':
      return {
        title: 'El servicio fue cancelado',
        detail: 'Este enlace ya no muestra la ubicación del conductor.',
      }
    default:
      return {
        title: 'Seguimiento del servicio',
        detail: 'La ubicación se actualiza cada pocos segundos.',
      }
  }
}

function stubDriver(track: PublicTrack): Driver | null {
  if (!track.driverCoords) return null
  return {
    id: 'live',
    name: track.driverName || 'Conductor',
    phone: '',
    vehicleType: track.vehicleType ?? 'car',
    vehicle: track.vehicle,
    licensePlate: track.licensePlate,
    driverPhoto: '',
    vehiclePhoto: '',
    fichaPhoto: '',
    status: 'busy',
    coords: track.driverCoords,
    battery: 0,
    distanceM: 0,
    etaMin: 0,
    notes: '',
    cityId: 'caracas',
  }
}

export default function TrackServicePage() {
  const { token } = useParams()
  const [track, setTrack] = useState<PublicTrack | null>(null)
  const [error, setError] = useState<'not_found' | 'network' | null>(null)

  useEffect(() => {
    if (!token) {
      setError('not_found')
      return
    }
    let cancelled = false
    let timer = 0
    let gotData = false
    const controller = new AbortController()

    const load = async () => {
      try {
        const next = await fetchPublicTrack(token, controller.signal)
        if (cancelled) return
        gotData = true
        setTrack(next)
        setError(null)
        applyBranding(next.branding, next.branding.name)
        const delay = Math.max(5, next.refreshSeconds) * 1000
        timer = window.setTimeout(() => {
          void load()
        }, delay)
      } catch (err) {
        if (cancelled || isAbortError(err)) return
        if (err instanceof ApiError && err.status === 404) {
          setError('not_found')
          setTrack(null)
          return
        }
        if (!gotData) setError('network')
        timer = window.setTimeout(() => {
          void load()
        }, 8000)
      }
    }

    void load()
    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timer)
      applyBranding(null)
    }
  }, [token])

  const closed = track?.status === 'completed' || track?.status === 'cancelled'
  const driver = useMemo(() => (track && !closed ? stubDriver(track) : null), [closed, track])
  const copy = statusCopy(track?.status ?? '', Boolean(track?.driverCoords))
  const center = track?.driverCoords ?? track?.originCoords ?? getCity(null).center
  const company = track?.branding.name?.trim() || 'Tu Ruta'
  const logo = logoSrc(track?.branding.logo_url)
  const accent = track?.branding.primary_color || '#34d399'
  const onAccent = contrastOn(accent)
  const vehicleLine = [track?.vehicle, track?.licensePlate].filter(Boolean).join(' · ')

  return (
    <div className="flex min-h-dvh justify-center bg-ink">
      <div className="flex h-dvh w-full max-w-[420px] flex-col overflow-hidden border-x border-line bg-panel shadow-2xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
          {logo ? (
            <img src={logo} alt="" className="size-9 rounded-md object-cover" />
          ) : (
            <span
              className="grid size-9 place-items-center rounded-md text-xs font-bold"
              style={{ background: accent, color: onAccent }}
            >
              {company.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-snow">{company}</p>
            <p className="truncate text-xs text-mist">
              {track?.driverName || 'Seguimiento del servicio'}
            </p>
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          {error === 'not_found' ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-sm text-mist">Este enlace de seguimiento no es válido o ya no existe.</p>
            </div>
          ) : error === 'network' && !track ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-sm text-mist">No se pudo cargar el mapa. Revisa tu conexión.</p>
            </div>
          ) : (
            <TrackLiveMap
              center={center}
              originCoords={track?.originCoords ?? null}
              driver={driver}
              driverCoords={closed ? null : (track?.driverCoords ?? null)}
            />
          )}
        </div>

        <footer className="shrink-0 space-y-1 border-t border-line bg-card px-4 py-3">
          <p className="text-sm font-semibold text-snow">{copy.title}</p>
          <p className="text-xs text-mist">{copy.detail}</p>
          {track?.origin ? (
            <p className="text-xs text-mist">
              Recogida: <span className="text-snow">{track.origin}</span>
            </p>
          ) : null}
          {vehicleLine ? <p className="text-xs text-mist">{vehicleLine}</p> : null}
        </footer>
      </div>
    </div>
  )
}
