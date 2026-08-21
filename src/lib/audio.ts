export const MAX_AUDIO_SECONDS = 90
export const MAX_AUDIO_BYTES = 1_200_000

const DECODE_TIMEOUT_MS = 8_000
const MIN_PEAK = 0.01

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

/** Convierte grabaciones webm/ogg a WAV 16 kHz mono si hay señal y cabe en el límite JSON. */
export async function prepareRecordingDataUrl(blob: Blob): Promise<string> {
  const mime = stripAudioMime(blob.type)
  if (mime === 'audio/webm' || mime === 'audio/ogg' || mime === 'audio/opus') {
    try {
      const wav = await blobToWavDataUrl(blob)
      if (estimatedDecodedBytes(wav) <= MAX_AUDIO_BYTES) return wav
    } catch {
      // Gemini acepta audio/webm y audio/ogg; se envía el original con MIME limpio.
    }
  }
  return blobToDataUrl(blob)
}

export function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

function estimatedDecodedBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf('base64,')
  const b64 = comma >= 0 ? dataUrl.slice(comma + 7) : dataUrl
  return Math.floor((b64.length * 3) / 4)
}

async function blobToWavDataUrl(blob: Blob): Promise<string> {
  const ctx = new AudioContext()
  try {
    await ctx.resume()
    const buffer = await withTimeout(ctx.decodeAudioData(await blob.arrayBuffer()), DECODE_TIMEOUT_MS)
    if (!hasAudibleEnergy(buffer)) {
      throw new Error('silent')
    }
    const wav = encodeWavPcm16Mono(resampleMonoSync(buffer, 16_000))
    const base64 = arrayBufferToBase64(wav)
    return `data:audio/wav;base64,${base64}`
  } finally {
    await ctx.close()
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function hasAudibleEnergy(buffer: AudioBuffer): boolean {
  const channels = buffer.numberOfChannels
  const length = buffer.length
  if (length === 0 || channels === 0) return false
  const step = Math.max(1, Math.floor(length / 8_000))
  let peak = 0
  for (let ch = 0; ch < channels; ch += 1) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < length; i += step) {
      const abs = Math.abs(data[i] ?? 0)
      if (abs > peak) peak = abs
      if (peak >= MIN_PEAK) return true
    }
  }
  return peak >= MIN_PEAK
}

function resampleMonoSync(buffer: AudioBuffer, targetRate: number): Float32Array {
  const ratio = buffer.sampleRate / targetRate
  const outLength = Math.max(1, Math.round(buffer.length / ratio))
  const out = new Float32Array(outLength)
  const channels = buffer.numberOfChannels
  for (let i = 0; i < outLength; i += 1) {
    const srcIndex = i * ratio
    const i0 = Math.min(buffer.length - 1, Math.floor(srcIndex))
    let sample = 0
    for (let ch = 0; ch < channels; ch += 1) {
      sample += buffer.getChannelData(ch)[i0] ?? 0
    }
    out[i] = sample / channels
  }
  return out
}

function encodeWavPcm16Mono(samples: Float32Array, sampleRate = 16_000): ArrayBuffer {
  const dataSize = samples.length * 2
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataSize, true)
  let offset = 44
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return buffer
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i))
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
