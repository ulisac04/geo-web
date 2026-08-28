import { useCallback, useEffect, useState } from 'react'

export type VoiceExtractMode = 'direct' | 'transcribe'

const STORAGE_KEY = 'geo_voice_extract_mode_v1'
const CHANGE_EVENT = 'geo-voice-extract-mode'

export function loadVoiceExtractMode(): VoiceExtractMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'transcribe' ? 'transcribe' : 'direct'
  } catch {
    return 'direct'
  }
}

export function saveVoiceExtractMode(mode: VoiceExtractMode): void {
  localStorage.setItem(STORAGE_KEY, mode)
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: mode }))
}

export function useVoiceExtractMode() {
  const [mode, setModeState] = useState<VoiceExtractMode>(loadVoiceExtractMode)

  useEffect(() => {
    function apply(next: VoiceExtractMode) {
      setModeState(next)
    }
    function onCustom(event: Event) {
      const detail = (event as CustomEvent).detail
      if (detail === 'direct' || detail === 'transcribe') apply(detail)
    }
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) apply(loadVoiceExtractMode())
    }
    window.addEventListener(CHANGE_EVENT, onCustom)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(CHANGE_EVENT, onCustom)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const setMode = useCallback((next: VoiceExtractMode) => {
    saveVoiceExtractMode(next)
    setModeState(next)
  }, [])

  return [mode, setMode] as const
}
