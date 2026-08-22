import type { AppSettings, CityId, MapRefreshSeconds } from '../types'
import { api } from './api'
import { DEFAULT_CITY_ID, isCityId } from './cities'

const SETTINGS_KEY = 'geo_settings_v1'

export const MAP_REFRESH_OPTIONS: MapRefreshSeconds[] = [5, 10, 15, 30, 60]

export const DEFAULT_SETTINGS: AppSettings = {
  mapRefreshSeconds: 15,
  cityId: DEFAULT_CITY_ID,
}

interface ApiSettings {
  map_refresh_seconds?: number
  city_id?: string
}

function isRefreshSeconds(value: unknown): value is MapRefreshSeconds {
  return MAP_REFRESH_OPTIONS.includes(value as MapRefreshSeconds)
}

function readCached(): AppSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      mapRefreshSeconds: isRefreshSeconds(parsed.mapRefreshSeconds)
        ? parsed.mapRefreshSeconds
        : DEFAULT_SETTINGS.mapRefreshSeconds,
      cityId: isCityId(parsed.cityId) ? parsed.cityId : DEFAULT_CITY_ID,
    }
  } catch {
    return null
  }
}

export function loadCachedSettings(): AppSettings {
  return readCached() ?? DEFAULT_SETTINGS
}

export function cacheSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function fromApi(data: ApiSettings, fallback: AppSettings = DEFAULT_SETTINGS): AppSettings {
  return {
    mapRefreshSeconds: isRefreshSeconds(data.map_refresh_seconds)
      ? data.map_refresh_seconds
      : fallback.mapRefreshSeconds,
    cityId: isCityId(data.city_id) ? data.city_id : fallback.cityId,
  }
}

export async function fetchSettings(signal?: AbortSignal): Promise<AppSettings> {
  return fromApi(await api<ApiSettings>('/api/v1/settings', { signal }), loadCachedSettings())
}

export async function patchSettings(patch: {
  mapRefreshSeconds?: MapRefreshSeconds
  cityId?: CityId
}): Promise<AppSettings> {
  const body: Record<string, string | number> = {}
  if (patch.mapRefreshSeconds !== undefined) {
    body.map_refresh_seconds = patch.mapRefreshSeconds
  }
  if (patch.cityId !== undefined) {
    body.city_id = patch.cityId
  }
  const fallback: AppSettings = {
    mapRefreshSeconds: patch.mapRefreshSeconds ?? loadCachedSettings().mapRefreshSeconds,
    cityId: patch.cityId ?? loadCachedSettings().cityId,
  }
  return fromApi(
    await api<ApiSettings>('/api/v1/settings', {
      method: 'PATCH',
      body,
    }),
    fallback,
  )
}
