import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent } from 'react'
import { FileText, Image, Loader2, Mic, PenLine, Sparkles, Square, Upload } from 'lucide-react'
import { useDispatchFlow } from '../context/DispatchContext'
import {
  MAX_AUDIO_BYTES,
  MAX_AUDIO_SECONDS,
  pickRecorderMime,
  prepareRecordingDataUrl,
  recorderContainerMime,
  waitForPaint,
} from '../lib/audio'
import { SAMPLE_WHATSAPP } from '../lib/mock-data'
import { ParserError, transcribeAudio } from '../lib/parser'
import { ApiError } from '../lib/api'
import NearbyDriverList from './NearbyDriverList'

export default function OrderInputStep() {
  const {
    inputTab,
    setInputTab,
    rawText,
    setRawText,
    screenshotPreview,
    setScreenshot,
    extractWithAI,
    continueManually,
    extracting,
    extractError,
  } = useDispatchFlow()
  const [dragging, setDragging] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [audioError, setAudioError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const rawTextRef = useRef(rawText)
  rawTextRef.current = rawText

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
    if (!recorder || recorder.state === 'inactive') return
    if (recorder.state === 'recording') recorder.requestData()
    recorder.stop()
  }

  async function processRecording(blob: Blob) {
    setTranscribing(true)
    setAudioError(null)
    await waitForPaint()
    try {
      const dataUrl = await prepareRecordingDataUrl(blob)
      const transcript = await transcribeAudio(dataUrl)
      const current = rawTextRef.current
      setRawText(current.trim() ? `${current.trimEnd()}\n\n${transcript}` : transcript)
    } catch (error) {
      const message =
        error instanceof ParserError || error instanceof ApiError
          ? error.message
          : 'No se pudo transcribir el audio'
      setAudioError(message)
    } finally {
      setTranscribing(false)
    }
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
        const blob = new Blob(chunksRef.current, {
          type: recorderContainerMime(recorder.mimeType || 'audio/webm'),
        })
        chunksRef.current = []
        stopTracks()
        if (blob.size === 0) {
          setAudioError('No se capturó audio')
          return
        }
        if (blob.size > MAX_AUDIO_BYTES) {
          setAudioError('La grabación es demasiado grande')
          return
        }
        void processRecording(blob)
      }
      recorder.start(250)
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

  const busy = extracting || recording || transcribing
  const canExtract =
    inputTab === 'screenshot' ? Boolean(screenshotPreview) : rawText.trim().length > 0

  const tabClass = (active: boolean) =>
    `flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition sm:text-sm ${
      active ? 'bg-elevated text-snow' : 'text-mist hover:text-snow'
    }`

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-lg border border-line bg-ink p-1">
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
      </div>

      {inputTab === 'text' ? (
        <div className="space-y-2">
          <div className="relative">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Pega aquí el mensaje del cliente (Ctrl + V)..."
              disabled={recording || transcribing}
              className="min-h-44 w-full resize-none rounded-lg border border-line bg-ink px-3 py-3 pr-12 text-sm leading-relaxed text-snow placeholder:text-mist/50 focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none disabled:opacity-70"
            />
            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="absolute right-2 bottom-2 flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-2 py-1.5 text-xs font-medium text-rose-300"
                aria-label="Detener grabación"
              >
                <Square className="size-3 fill-current" />
                {formatElapsed(elapsed)}
              </button>
            ) : (
              <button
                type="button"
                disabled={transcribing || extracting}
                onClick={() => void startRecording()}
                className="absolute right-2 bottom-2 rounded-md border border-line bg-elevated p-1.5 text-mist hover:border-signal/50 hover:text-signal disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Grabar audio"
                title="Dictar al micrófono"
              >
                {transcribing ? (
                  <Loader2 className="size-4 animate-spin text-signal" />
                ) : (
                  <Mic className="size-4" />
                )}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setRawText(SAMPLE_WHATSAPP)}
              className="text-xs text-mist hover:text-signal"
            >
              Cargar mensaje de ejemplo
            </button>
            {transcribing ? (
              <span className="text-xs text-mist">Transcribiendo…</span>
            ) : recording ? (
              <span className="text-xs text-mist">Grabando · máx. {MAX_AUDIO_SECONDS}s</span>
            ) : null}
          </div>
          {audioError ? (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-rose-300">
              {audioError}
            </p>
          ) : null}
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
      )}

      <div className="space-y-2">
        <button
          type="button"
          disabled={!canExtract || busy}
          onClick={() => void extractWithAI()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-signal py-2.5 text-sm font-semibold text-on-signal transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {extracting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {extracting ? 'Extrayendo datos…' : 'Extraer Datos con IA'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={continueManually}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-ink py-2.5 text-sm font-medium text-snow transition hover:border-signal/50 hover:text-signal disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PenLine className="size-4" />
          Ingresar datos a mano
        </button>
        <p className="text-center text-[11px] text-mist">La IA es opcional. Puedes ir directo a Puntos.</p>
      </div>

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
