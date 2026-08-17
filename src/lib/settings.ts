import type { AppSettings, CityId, MapRefreshSeconds } from '../types'
import { DEFAULT_CITY_ID, isCityId } from './cities'

const SETTINGS_KEY = 'geo_settings_v1'

export const MAP_REFRESH_OPTIONS: MapRefreshSeconds[] = [5, 10, 15, 30, 60]

export const DEFAULT_SETTINGS: AppSettings = {
  mapRefreshSeconds: 15,
  cityId: DEFAULT_CITY_ID,
}

function isRefreshSeconds(value: unknown): value is MapRefreshSeconds {
  return MAP_REFRESH_OPTIONS.includes(value as MapRefreshSeconds)
}

function readCityId(value: unknown): CityId {
  return isCityId(value) ? value : DEFAULT_CITY_ID
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
      cityId: readCityId(parsed.cityId),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function persistSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
