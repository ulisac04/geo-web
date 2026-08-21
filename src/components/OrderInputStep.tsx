import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent } from 'react'
import { FileText, Image, Loader2, Mic, Sparkles, Square, Upload } from 'lucide-react'
import { useDispatchFlow } from '../context/DispatchContext'
import {
  AUDIO_ACCEPT,
  blobToDataUrl,
  isAllowedAudioFile,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_SECONDS,
  mimeFromAudioFile,
  pickRecorderMime,
  prepareRecordingDataUrl,
} from '../lib/audio'
import { SAMPLE_WHATSAPP } from '../lib/mock-data'
import NearbyDriverList from './NearbyDriverList'

export default function OrderInputStep() {
  const {
    inputTab,
    setInputTab,
    rawText,
    setRawText,
    screenshotPreview,
    setScreenshot,
    audioPreview,
    setAudio,
    extractWithAI,
    extracting,
    extractError,
  } = useDispatchFlow()
  const [dragging, setDragging] = useState(false)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [audioError, setAudioError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const audioFileRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)

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

  async function ingestAudioFile(file: File) {
    setAudioError(null)
    if (!isAllowedAudioFile(file)) {
      setAudioError('Usa un audio OGG, OPUS, MP3, M4A, WEBM o WAV')
      return
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setAudioError('El audio es demasiado grande (máx. ~1.2 MB)')
      return
    }
    const dataUrl = await blobToDataUrl(file)
    const mime = mimeFromAudioFile(file)
    const comma = dataUrl.indexOf(';base64,')
    const base64 = comma >= 0 ? dataUrl.slice(comma + 8) : dataUrl
    setAudio(`data:${mime};base64,${base64}`)
  }

  function handleAudioDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) void ingestAudioFile(file)
  }

  function handleAudioFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void ingestAudioFile(file)
    event.target.value = ''
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function clearTimer() {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }

  async function startRecording() {
    setAudioError(null)
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setAudioError('Este navegador no permite grabar audio')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mime = pickRecorderMime()
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        clearTimer()
        setRecording(false)
        setElapsed(0)
        stopTracks()
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        if (blob.size === 0) {
          setAudioError('No se capturó audio')
          return
        }
        if (blob.size > MAX_AUDIO_BYTES) {
          setAudioError('La grabación es demasiado grande')
          return
        }
        void prepareRecordingDataUrl(blob)
          .then(setAudio)
          .catch(() => setAudioError('No se pudo procesar la grabación'))
      }
      recorder.start()
      setAudio(null)
      setRecording(true)
      setElapsed(0)
      let seconds = 0
      timerRef.current = window.setInterval(() => {
        seconds += 1
        setElapsed(seconds)
        if (seconds >= MAX_AUDIO_SECONDS) stopRecording()
      }, 1000)
    } catch {
      stopTracks()
      setAudioError('No se pudo acceder al micrófono')
    }
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

  useEffect(() => {
    return () => {
      clearTimer()
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
      stopTracks()
    }
  }, [])

  const canExtract =
    inputTab === 'screenshot'
      ? Boolean(screenshotPreview)
      : inputTab === 'audio'
        ? Boolean(audioPreview)
        : rawText.trim().length > 0

  const tabClass = (active: boolean) =>
    `flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition sm:text-sm ${
      active ? 'bg-elevated text-snow' : 'text-mist hover:text-snow'
    }`

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 rounded-lg border border-line bg-ink p-1">
        <button type="button" onClick={() => setInputTab('text')} className={tabClass(inputTab === 'text')}>
          <FileText className="size-4 shrink-0" />
          Texto
        </button>
        <button
          type="button"
          onClick={() => setInputTab('screenshot')}
          className={tabClass(inputTab === 'screenshot')}
        >
          <Image className="size-4 shrink-0" />
          Captura
        </button>
        <button type="button" onClick={() => setInputTab('audio')} className={tabClass(inputTab === 'audio')}>
          <Mic className="size-4 shrink-0" />
          Audio
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
      ) : inputTab === 'screenshot' ? (
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
            dragging ? 'border-signal bg-signal/10' : 'border-line bg-ink hover:border-mist/50'
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
              <p className="mt-1 text-xs text-mist">PNG, JPG · clic para seleccionar</p>
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
      ) : (
        <div className="space-y-3">
          <div
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleAudioDrop}
            onClick={() => {
              if (!recording) audioFileRef.current?.click()
            }}
            className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition ${
              dragging ? 'border-signal bg-signal/10' : 'border-line bg-ink hover:border-mist/50'
            }`}
          >
            {audioPreview ? (
              <audio
                src={audioPreview}
                controls
                className="w-full"
                onClick={(event) => event.stopPropagation()}
              />
            ) : (
              <>
                <Upload className="mb-2 size-6 text-mist" />
                <p className="text-sm text-snow">Arrastra una nota de voz de WhatsApp</p>
                <p className="mt-1 text-xs text-mist">OGG, OPUS, MP3, M4A, WEBM, WAV · clic para seleccionar</p>
              </>
            )}
            <input
              ref={audioFileRef}
              type="file"
              accept={AUDIO_ACCEPT}
              className="hidden"
              onChange={handleAudioFileChange}
            />
          </div>
          <div className="flex items-center gap-2">
            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-danger/40 bg-danger/10 py-2 text-sm font-medium text-rose-300"
              >
                <Square className="size-3.5 fill-current" />
                Detener · {formatElapsed(elapsed)}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startRecording()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-ink py-2 text-sm font-medium text-snow hover:border-mist/50"
              >
                <Mic className="size-4" />
                Grabar audio
              </button>
            )}
            {audioPreview ? (
              <button
                type="button"
                onClick={() => {
                  setAudio(null)
                  setAudioError(null)
                }}
                className="rounded-lg border border-line px-3 py-2 text-xs text-mist hover:text-snow"
              >
                Quitar
              </button>
            ) : null}
          </div>
          <p className="text-xs text-mist">Máximo {MAX_AUDIO_SECONDS}s. El operador puede dictar el pedido o subir la nota de WhatsApp.</p>
          {audioError ? (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-rose-300">
              {audioError}
            </p>
          ) : null}
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

      {extractError ? (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-rose-300">
          {extractError}
        </p>
      ) : null}

      <NearbyDriverList />
    </div>
  )
}

function formatElapsed(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(1, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
