import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import {
  hydratePlaceHit,
  PlacesUnavailableError,
  searchPlaces,
  type PlaceHit,
} from '../lib/geocode'
import { useSettings } from '../context/SettingsContext'

interface PlaceSearchFieldProps {
  label: string
  value: string
  active: boolean
  hasCoords: boolean
  hint?: string
  placeholder?: string
  onActivate: () => void
  onQueryChange: (value: string) => void
  onSelect: (hit: PlaceHit) => void
}

export default function PlaceSearchField({
  label,
  value,
  active,
  hasCoords,
  hint,
  placeholder,
  onActivate,
  onQueryChange,
  onSelect,
}: PlaceSearchFieldProps) {
  const { city } = useSettings()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const skipQueryRef = useRef<string | null>(null)
  const [hits, setHits] = useState<PlaceHit[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [empty, setEmpty] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const q = value.trim()
    if (hint) {
      skipQueryRef.current = q
    }
    if (skipQueryRef.current !== null && skipQueryRef.current === q) {
      setHits([])
      setSearching(false)
      setEmpty(false)
      setErrorMessage(null)
      return
    }
    if (q.length < 2) {
      setHits([])
      setSearching(false)
      setEmpty(false)
      setErrorMessage(null)
      setOpen(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearching(true)
      void searchPlaces(q, city, controller.signal)
        .then((next) => {
          if (controller.signal.aborted) return
          setHits(next)
          setHighlight(0)
          setEmpty(next.length === 0)
          setErrorMessage(null)
          setOpen(true)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          if (error instanceof DOMException && error.name === 'AbortError') return
          setHits([])
          setEmpty(true)
          setErrorMessage(
            error instanceof PlacesUnavailableError
              ? error.message
              : 'No se pudo buscar lugares. Revisa la API key de Google Maps.',
          )
          setOpen(true)
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [city, hint, value])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function choose(hit: PlaceHit) {
    skipQueryRef.current = value.trim()
    setOpen(false)
    setHits([])
    setEmpty(false)
    setSearching(true)
    void hydratePlaceHit(hit)
      .then((resolved) => {
        skipQueryRef.current = resolved.label
        onSelect(resolved)
      })
      .catch(() => {
        onSelect(hit)
      })
      .finally(() => {
        setSearching(false)
      })
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((index) => (hits.length === 0 ? 0 : (index + 1) % hits.length))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((index) =>
        hits.length === 0 ? 0 : (index - 1 + hits.length) % hits.length,
      )
      return
    }
    if (event.key === 'Enter' && hits[highlight]) {
      event.preventDefault()
      choose(hits[highlight])
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && (hits.length > 0 || empty)

  return (
    <div ref={rootRef} className="relative block space-y-1">
      <span className="text-[11px] font-medium tracking-wide text-mist uppercase">{label}</span>
      <div
        className={`flex items-center gap-2 rounded-md border bg-ink px-2.5 py-1.5 ${
          active ? 'border-signal/60 ring-1 ring-signal/30' : 'border-line'
        }`}
      >
        <MapPin className={`size-3.5 shrink-0 ${hasCoords ? 'text-signal' : 'text-mist'}`} />
        <input
          value={value}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => {
            onActivate()
            if (hits.length > 0 || empty) setOpen(true)
          }}
          onChange={(event) => {
            skipQueryRef.current = null
            onQueryChange(event.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent text-sm text-snow placeholder:text-mist/50 focus:outline-none"
        />
        {searching ? <Loader2 className="size-3.5 shrink-0 animate-spin text-mist" /> : null}
      </div>
      {hasCoords && hint ? (
        <p className="text-[11px] text-signal">Aprox. en el mapa: {hint}</p>
      ) : null}
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-line bg-panel py-1 shadow-lg"
        >
          {hits.length === 0 ? (
            <li className="px-3 py-2 text-xs text-mist">
              {errorMessage ??
                `Sin coincidencias. Prueba un barrio de ${city.name} o coloca el pin en el mapa.`}
            </li>
          ) : (
            hits.map((hit, index) => (
              <li key={hit.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === highlight}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(hit)}
                  className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left ${
                    index === highlight ? 'bg-elevated' : 'hover:bg-elevated'
                  }`}
                >
                  <span className="text-xs font-medium text-snow">{hit.label}</span>
                  {hit.secondary ? (
                    <span className="text-[11px] text-mist">{hit.secondary}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
