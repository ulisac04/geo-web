import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent } from 'react'
import { FileText, Image, Loader2, Sparkles, Upload } from 'lucide-react'
import { useDispatchFlow } from '../context/DispatchContext'
import { SAMPLE_WHATSAPP } from '../lib/mock-data'

export default function OrderInputStep() {
  const {
    inputTab,
    setInputTab,
    rawText,
    setRawText,
    screenshotPreview,
    setScreenshot,
    extractWithAI,
    extracting,
  } = useDispatchFlow()
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function readFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setScreenshot(reader.result)
    }
    reader.readAsDataURL(file)
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const items = event.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) readFile(file)
        event.preventDefault()
        break
      }
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) readFile(file)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) readFile(file)
  }

  useEffect(() => {
    if (inputTab !== 'screenshot') return

    function onWindowPaste(event: globalThis.ClipboardEvent) {
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) readFile(file)
          break
        }
      }
    }

    window.addEventListener('paste', onWindowPaste)
    return () => window.removeEventListener('paste', onWindowPaste)
  }, [inputTab, setScreenshot])

  const canExtract = inputTab === 'screenshot' || rawText.trim().length > 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-lg border border-line bg-ink p-1">
        <button
          type="button"
          onClick={() => setInputTab('text')}
          className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition ${
            inputTab === 'text'
              ? 'bg-elevated text-snow'
              : 'text-mist hover:text-snow'
          }`}
        >
          <FileText className="size-4" />
          Texto WhatsApp
        </button>
        <button
          type="button"
          onClick={() => setInputTab('screenshot')}
          className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition ${
            inputTab === 'screenshot'
              ? 'bg-elevated text-snow'
              : 'text-mist hover:text-snow'
          }`}
        >
          <Image className="size-4" />
          Captura de Pantalla
        </button>
      </div>

      {inputTab === 'text' ? (
        <div className="space-y-2">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Pega aquí el mensaje del cliente (Ctrl + V)..."
            className="min-h-44 w-full resize-none rounded-lg border border-line bg-ink px-3 py-3 text-sm leading-relaxed text-snow placeholder:text-mist/50 focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setRawText(SAMPLE_WHATSAPP)}
            className="text-xs text-mist hover:text-signal"
          >
            Cargar mensaje de ejemplo
          </button>
        </div>
      ) : (
        <div
          tabIndex={0}
          onPaste={handlePaste}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition ${
            dragging
              ? 'border-signal bg-signal/10'
              : 'border-line bg-ink hover:border-mist/50'
          }`}
        >
          {screenshotPreview ? (
            <img
              src={screenshotPreview}
              alt="Captura pegada"
              className="max-h-40 rounded-md border border-line object-contain"
            />
          ) : (
            <>
              <Upload className="mb-2 size-6 text-mist" />
              <p className="text-sm text-snow">Arrastra una imagen o pégala (Ctrl + V)</p>
              <p className="mt-1 text-xs text-mist">
                PNG, JPG · clic para seleccionar · o extrae un pedido de demostración
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      <button
        type="button"
        disabled={!canExtract || extracting}
        onClick={() => void extractWithAI()}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-signal py-2.5 text-sm font-semibold text-on-signal transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {extracting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {extracting ? 'Extrayendo datos…' : 'Extraer Datos con IA'}
      </button>
    </div>
  )
}
