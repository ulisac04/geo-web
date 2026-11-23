import { useState } from 'react'
import { Car, Motorbike } from 'lucide-react'
import type { PublicTrack } from '../lib/track'
import PhotoLightbox from './PhotoLightbox'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

/** Oculta la foto si la descarga falla (p. ej. el enlace venció entre consultas). */
function usePhoto(src: string | null): [string | null, () => void] {
  const [failed, setFailed] = useState<string | null>(null)
  const visible = src && failed !== src ? src : null
  return [visible, () => setFailed(src)]
}

export default function TrackDriverCard({
  track,
  title,
  detail,
  distance,
  accent,
  onAccent,
}: {
  track: PublicTrack
  title: string
  detail: string
  distance: string
  accent: string
  onAccent: string
}) {
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null)
  const [vehiclePhoto, onVehicleError] = usePhoto(track.vehiclePhotoUrl)
  const [driverPhoto, onDriverError] = usePhoto(track.driverPhotoUrl)
  const name = track.driverName || 'Conductor'
  const vehicleAlt = track.vehicle || 'Vehículo'
  const VehicleIcon = track.vehicleType === 'motorcycle' ? Motorbike : Car
  const hasDriverInfo = Boolean(track.driverName || track.vehicle || track.licensePlate)

  return (
    <footer className="shrink-0 border-t border-line bg-card px-4 pb-4 pt-3">
      {hasDriverInfo ? (
        <div className="mb-3 flex items-center gap-4">
          <div className="relative h-[72px] w-24 shrink-0">
            {vehiclePhoto ? (
              <button
                type="button"
                aria-label={`Ver foto de ${vehicleAlt}`}
                className="block size-full overflow-hidden rounded-xl border border-line bg-elevated"
                onClick={() => setZoomed({ src: vehiclePhoto, alt: vehicleAlt })}
              >
                <img
                  src={vehiclePhoto}
                  alt={vehicleAlt}
                  loading="lazy"
                  width={96}
                  height={72}
                  className="size-full object-cover"
                  onError={onVehicleError}
                />
              </button>
            ) : (
              <div className="grid size-full place-items-center rounded-xl border border-line bg-elevated text-mist">
                <VehicleIcon className="size-8" aria-hidden />
              </div>
            )}

            <div
              className="absolute -bottom-2 -right-3 size-11 overflow-hidden rounded-full border-2 shadow-md"
              style={{ borderColor: accent }}
            >
              {driverPhoto ? (
                <button
                  type="button"
                  aria-label={`Ver foto de ${name}`}
                  className="block size-full"
                  onClick={() => setZoomed({ src: driverPhoto, alt: name })}
                >
                  <img
                    src={driverPhoto}
                    alt={name}
                    loading="lazy"
                    width={44}
                    height={44}
                    className="size-full object-cover"
                    onError={onDriverError}
                  />
                </button>
              ) : (
                <span
                  className="grid size-full place-items-center text-xs font-bold"
                  style={{ background: accent, color: onAccent }}
                >
                  {initials(name)}
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-base font-semibold text-snow">{name}</p>
            {track.vehicle ? <p className="truncate text-xs text-mist">{track.vehicle}</p> : null}
            {track.licensePlate ? (
              <span className="inline-block rounded-md border-2 border-neutral-800 bg-white px-2 py-0.5 font-mono text-sm font-extrabold uppercase tracking-widest text-neutral-900">
                {track.licensePlate}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="text-sm font-semibold text-snow">{title}</p>
        <p className="text-xs text-mist">{detail}</p>
        {distance ? (
          <p className="text-xs text-mist">
            Distancia recorrida: <span className="text-snow">{distance}</span>
          </p>
        ) : null}
        {track.origin ? (
          <p className="text-xs text-mist">
            Recogida: <span className="text-snow">{track.origin}</span>
          </p>
        ) : null}
      </div>

      {zoomed ? (
        <PhotoLightbox src={zoomed.src} alt={zoomed.alt} onClose={() => setZoomed(null)} />
      ) : null}
    </footer>
  )
}
