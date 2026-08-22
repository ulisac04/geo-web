export const MAX_AUDIO_SECONDS = 90
export const MAX_AUDIO_BYTES = 1_200_000

export const AUDIO_ACCEPT =
  'audio/ogg,audio/opus,audio/mpeg,audio/mp3,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/wav,audio/webm,.ogg,.opus,.mp3,.m4a,.webm,.wav'

const ALLOWED_AUDIO_MIME = new Set([
  'audio/ogg',
  'audio/opus',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/webm',
])

export function stripAudioMime(mime: string): string {
  return mime.split(';')[0].trim().toLowerCase()
}

export function mimeFromAudioFile(file: File): string {
  const fromType = stripAudioMime(file.type)
  if (fromType && ALLOWED_AUDIO_MIME.has(fromType)) return fromType

  const name = file.name.toLowerCase()
  if (name.endsWith('.ogg') || name.endsWith('.opus')) return 'audio/ogg'
  if (name.endsWith('.mp3')) return 'audio/mpeg'
  if (name.endsWith('.m4a')) return 'audio/mp4'
  if (name.endsWith('.wav')) return 'audio/wav'
  if (name.endsWith('.webm')) return 'audio/webm'
  if (name.endsWith('.aac')) return 'audio/aac'
  return fromType
}

export function isAllowedAudioFile(file: File): boolean {
  return ALLOWED_AUDIO_MIME.has(mimeFromAudioFile(file))
}

export function pickRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

export function recorderContainerMime(recorderMime: string): string {
  const base = stripAudioMime(recorderMime)
  if (ALLOWED_AUDIO_MIME.has(base)) return base
  return 'audio/webm'
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  const mime = stripAudioMime(blob.type) || 'application/octet-stream'
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('No se pudo leer el audio'))
        return
      }
      const marker = ';base64,'
      const at = reader.result.indexOf(marker)
      const base64 = at >= 0 ? reader.result.slice(at + marker.length) : reader.result
      resolve(`data:${mime};base64,${base64}`)
    }
    reader.onerror = () => reject(new Error('No se pudo leer el audio'))
    reader.readAsDataURL(blob)
  })
}

/** Envía el contenedor nativo (webm/ogg/mp4). Convertir a WAV infla el payload y retrasa Gemini. */
export async function prepareRecordingDataUrl(blob: Blob): Promise<string> {
  return blobToDataUrl(blob)
}

export function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}
