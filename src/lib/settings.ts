import type { AppSettings, MapRefreshSeconds } from '../types'

const SETTINGS_KEY = 'geo_settings_v1'

export const MAP_REFRESH_OPTIONS: MapRefreshSeconds[] = [5, 10, 15, 30, 60]

export const DEFAULT_SETTINGS: AppSettings = {
  mapRefreshSeconds: 15,
}

function isRefreshSeconds(value: unknown): value is MapRefreshSeconds {
  return MAP_REFRESH_OPTIONS.includes(value as MapRefreshSeconds)
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      mapRefreshSeconds: isRefreshSeconds(parsed.mapRefreshSeconds)
        ? parsed.mapRefreshSeconds
        : DEFAULT_SETTINGS.mapRefreshSeconds,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function persistSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
