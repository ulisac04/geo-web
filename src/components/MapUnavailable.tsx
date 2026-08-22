export default function MapUnavailable({
  className,
  message = 'Configura VITE_GOOGLE_MAPS_API_KEY para ver el mapa.',
}: {
  className?: string
  message?: string
}) {
  return (
    <section
      className={`flex h-full min-h-[240px] w-full items-center justify-center bg-panel px-6 text-center ${className ?? ''}`}
    >
      <p className="max-w-sm text-sm text-mist">{message}</p>
    </section>
  )
}
