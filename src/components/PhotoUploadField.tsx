import { useRef, type ChangeEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { compressImage } from '../lib/image'

interface PhotoUploadFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export default function PhotoUploadField({ label, value, onChange }: PhotoUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      onChange(await compressImage(file))
    } catch {
      // ignore invalid files
    }
  }

  return (
    <div className="block space-y-1">
      <span className="text-[11px] font-medium tracking-wide text-mist uppercase">{label}</span>
      <div className="relative">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-28 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-line bg-ink transition hover:border-mist/50"
        >
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <>
              <ImagePlus className="mb-1 size-5 text-mist" />
              <span className="text-[11px] text-mist">Cargar foto</span>
            </>
          )}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1.5 right-1.5 rounded-md bg-ink/80 p-1 text-mist hover:text-snow"
            aria-label={`Quitar ${label}`}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
        />
      </div>
    </div>
  )
}
