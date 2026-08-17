import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { searchPlaces, type PlaceHit } from '../lib/geocode'

interface PlaceSearchFieldProps {
  label: string
  value: string
  active: boolean
  placeholder?: string
  onActivate: () => void
  onQueryChange: (value: string) => void
  onSelect: (hit: PlaceHit) => void
}

export default function PlaceSearchField({
  label,
  value,
  active,
  placeholder,
  onActivate,
  onQueryChange,
  onSelect,
}: PlaceSearchFieldProps) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const skipQueryRef = useRef<string | null>(null)
  const [hits, setHits] = useState<PlaceHit[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = value.trim()
    if (skipQueryRef.current && skipQueryRef.current === q) {
      skipQueryRef.current = null
      setHits([])
      setSearching(false)
      return
    }
    if (q.length < 3) {
      setHits([])
      setSearching(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearching(true)
      void searchPlaces(q, controller.signal)
        .then((next) => {
          if (controller.signal.aborted) return
          setHits(next)
          setOpen(next.length > 0)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          if (error instanceof DOMException && error.name === 'AbortError') return
          setHits([])
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, 320)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [value])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <div ref={rootRef} className="relative block space-y-1">
      <span className="text-[11px] font-medium tracking-wide text-mist uppercase">{label}</span>
      <div
        className={`flex items-center gap-2 rounded-md border bg-ink px-2.5 py-1.5 ${
          active ? 'border-signal/60 ring-1 ring-signal/30' : 'border-line'
        }`}
      >
        <MapPin className={`size-3.5 shrink-0 ${active ? 'text-signal' : 'text-mist'}`} />
        <input
          value={value}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          onFocus={() => {
            onActivate()
            if (hits.length > 0) setOpen(true)
          }}
          onChange={(event) => {
            onQueryChange(event.target.value)
            setOpen(true)
          }}
          className="w-full bg-transparent text-sm text-snow placeholder:text-mist/50 focus:outline-none"
        />
        {searching ? <Loader2 className="size-3.5 shrink-0 animate-spin text-mist" /> : null}
      </div>
      {open && hits.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-line bg-panel py-1 shadow-lg"
        >
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  skipQueryRef.current = hit.label
                  onSelect(hit)
                  setOpen(false)
                  setHits([])
                }}
                className="flex w-full px-3 py-2 text-left text-xs text-snow hover:bg-elevated"
              >
                {hit.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
