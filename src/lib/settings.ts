import type { AppSettings, CityId, MapRefreshSeconds } from '../types'
import { api } from './api'
import { DEFAULT_CITY_ID, isCityId } from './cities'

export const MAP_REFRESH_OPTIONS: MapRefreshSeconds[] = [5, 10, 15, 30, 60]

export const DEFAULT_SETTINGS: AppSettings = {
  mapRefreshSeconds: 15,
  cityId: DEFAULT_CITY_ID,
}

interface ApiSettings {
  map_refresh_seconds: number
  city_id: string
}

function isRefreshSeconds(value: unknown): value is MapRefreshSeconds {
  return MAP_REFRESH_OPTIONS.includes(value as MapRefreshSeconds)
}

function fromApi(data: ApiSettings): AppSettings {
  return {
    mapRefreshSeconds: isRefreshSeconds(data.map_refresh_seconds)
      ? data.map_refresh_seconds
      : DEFAULT_SETTINGS.mapRefreshSeconds,
    cityId: isCityId(data.city_id) ? data.city_id : DEFAULT_CITY_ID,
  }
}

export async function fetchSettings(): Promise<AppSettings> {
  return fromApi(await api<ApiSettings>('/api/v1/settings'))
}

export async function patchSettings(patch: {
  mapRefreshSeconds?: MapRefreshSeconds
  cityId?: CityId
}): Promise<AppSettings> {
  return fromApi(
    await api<ApiSettings>('/api/v1/settings', {
      method: 'PATCH',
      body: {
        map_refresh_seconds: patch.mapRefreshSeconds,
        city_id: patch.cityId,
      },
    }),
  )
}
