import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent } from 'react'
import { Image, Loader2, Mic, PenLine, Sparkles, Square } from 'lucide-react'
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
import { ParserError, ocrImage, transcribeAudio } from '../lib/parser'
import { ApiError } from '../lib/api'
import NearbyDriverList from './NearbyDriverList'

export default function OrderInputStep() {
  const {
    rawText,
    setRawText,
    extractWithAI,
    continueManually,
    extracting,
    extractError,
  } = useDispatchFlow()
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [ocring, setOcring] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const rawTextRef = useRef(rawText)
  rawTextRef.current = rawText

  function appendText(chunk: string) {
    const current = rawTextRef.current
    setRawText(current.trim() ? `${current.trimEnd()}\n\n${chunk}` : chunk)
  }

  function readImageFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setMediaError('Elige una imagen PNG, JPG o similar')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') void processImage(reader.result)
    }
    reader.onerror = () => setMediaError('No se pudo leer la imagen')
    reader.readAsDataURL(file)
  }

  async function processImage(dataUrl: string) {
    setOcring(true)
    setMediaError(null)
    await waitForPaint()
    try {
      const text = await ocrImage(dataUrl)
      appendText(text)
    } catch (error) {
      const message =
        error instanceof ParserError || error instanceof ApiError
          ? error.message
          : 'No se pudo leer la imagen'
      setMediaError(message)
    } finally {
      setOcring(false)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) readImageFile(file)
  }

  function takeImageFromClipboard(event: ClipboardEvent | globalThis.ClipboardEvent): boolean {
    const items = event.clipboardData?.items
    if (!items) return false
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          event.preventDefault()
          readImageFile(file)
          return true
        }
      }
    }
    return false
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
    setMediaError(null)
    await waitForPaint()
    try {
      const dataUrl = await prepareRecordingDataUrl(blob)
      const transcript = await transcribeAudio(dataUrl)
      appendText(transcript)
    } catch (error) {
      const message =
        error instanceof ParserError || error instanceof ApiError
          ? error.message
          : 'No se pudo transcribir el audio'
      setMediaError(message)
    } finally {
      setTranscribing(false)
    }
  }

  async function startRecording() {
    setMediaError(null)
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMediaError('Este navegador no permite grabar audio')
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
          setMediaError('No se capturó audio')
          return
        }
        if (blob.size > MAX_AUDIO_BYTES) {
          setMediaError('La grabación es demasiado grande')
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
      setMediaError('No se pudo acceder al micrófono')
    }
  }

  useEffect(() => {
    function onWindowPaste(event: globalThis.ClipboardEvent) {
      if (event.defaultPrevented) return
      if (recording || transcribing || ocring || extracting) return
      takeImageFromClipboard(event)
    }

    window.addEventListener('paste', onWindowPaste)
    return () => window.removeEventListener('paste', onWindowPaste)
  }, [recording, transcribing, ocring, extracting])

  useEffect(() => {
    return () => {
      clearTimer()
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
      stopTracks()
    }
  }, [])

  const busy = extracting || recording || transcribing || ocring
  const canExtract = rawText.trim().length > 0
  const iconBusy = transcribing || ocring || extracting

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            onPaste={(event) => takeImageFromClipboard(event)}
            placeholder="Pega aquí el mensaje del cliente (Ctrl + V)..."
            disabled={recording || transcribing || ocring}
            className="min-h-44 w-full resize-none rounded-lg border border-line bg-ink px-3 py-3 pr-20 text-sm leading-relaxed text-snow placeholder:text-mist/50 focus:border-signal/50 focus:ring-1 focus:ring-signal/30 focus:outline-none disabled:opacity-70"
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <button
              type="button"
              disabled={iconBusy || recording}
              onClick={() => fileRef.current?.click()}
              className="rounded-md border border-line bg-elevated p-1.5 text-mist hover:border-signal/50 hover:text-signal disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Subir captura"
              title="Leer texto de una captura"
            >
              {ocring ? (
                <Loader2 className="size-4 animate-spin text-signal" />
              ) : (
                <Image className="size-4" />
              )}
            </button>
            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-2 py-1.5 text-xs font-medium text-rose-300"
                aria-label="Detener grabación"
              >
                <Square className="size-3 fill-current" />
                {formatElapsed(elapsed)}
              </button>
            ) : (
              <button
                type="button"
                disabled={iconBusy}
                onClick={() => void startRecording()}
                className="rounded-md border border-line bg-elevated p-1.5 text-mist hover:border-signal/50 hover:text-signal disabled:cursor-not-allowed disabled:opacity-50"
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
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setRawText(SAMPLE_WHATSAPP)}
            className="text-xs text-mist hover:text-signal"
          >
            Cargar mensaje de ejemplo
          </button>
          {ocring ? (
            <span className="text-xs text-mist">Leyendo captura…</span>
          ) : transcribing ? (
            <span className="text-xs text-mist">Transcribiendo…</span>
          ) : recording ? (
            <span className="text-xs text-mist">Grabando · máx. {MAX_AUDIO_SECONDS}s</span>
          ) : null}
        </div>
        {mediaError ? (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-rose-300">
            {mediaError}
          </p>
        ) : null}
      </div>

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
