import type { AppSettings, CityId, MapRefreshSeconds } from '../types'
import { api } from './api'
import { DEFAULT_CITY_ID, isCityId } from './cities'

const SETTINGS_KEY = 'geo_settings_v1'

export const MAP_REFRESH_OPTIONS: MapRefreshSeconds[] = [5, 10, 15, 30, 60]

export const DEFAULT_SETTINGS: AppSettings = {
  mapRefreshSeconds: 15,
  cityId: DEFAULT_CITY_ID,
  usdToCop: 0,
  usdToVes: 0,
  whatsappDriverTemplate: '',
  whatsappClientTemplate: '',
}

interface ApiSettings {
  map_refresh_seconds?: number
  city_id?: string
  usd_to_cop?: number
  usd_to_ves?: number
  whatsapp_driver_template?: string
  whatsapp_client_template?: string
}

function isRefreshSeconds(value: unknown): value is MapRefreshSeconds {
  return MAP_REFRESH_OPTIONS.includes(value as MapRefreshSeconds)
}

function isNonNegativeRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isTemplate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 4000
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
      usdToCop: isNonNegativeRate(parsed.usdToCop) ? parsed.usdToCop : DEFAULT_SETTINGS.usdToCop,
      usdToVes: isNonNegativeRate(parsed.usdToVes) ? parsed.usdToVes : DEFAULT_SETTINGS.usdToVes,
      whatsappDriverTemplate: isTemplate(parsed.whatsappDriverTemplate)
        ? parsed.whatsappDriverTemplate
        : DEFAULT_SETTINGS.whatsappDriverTemplate,
      whatsappClientTemplate: isTemplate(parsed.whatsappClientTemplate)
        ? parsed.whatsappClientTemplate
        : DEFAULT_SETTINGS.whatsappClientTemplate,
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
    usdToCop: isNonNegativeRate(data.usd_to_cop) ? data.usd_to_cop : fallback.usdToCop,
    usdToVes: isNonNegativeRate(data.usd_to_ves) ? data.usd_to_ves : fallback.usdToVes,
    whatsappDriverTemplate: isTemplate(data.whatsapp_driver_template)
      ? data.whatsapp_driver_template
      : fallback.whatsappDriverTemplate,
    whatsappClientTemplate: isTemplate(data.whatsapp_client_template)
      ? data.whatsapp_client_template
      : fallback.whatsappClientTemplate,
  }
}

export async function fetchSettings(signal?: AbortSignal): Promise<AppSettings> {
  return fromApi(await api<ApiSettings>('/api/v1/settings', { signal }), loadCachedSettings())
}

export async function patchSettings(patch: {
  mapRefreshSeconds?: MapRefreshSeconds
  cityId?: CityId
  usdToCop?: number
  usdToVes?: number
  whatsappDriverTemplate?: string
  whatsappClientTemplate?: string
}): Promise<AppSettings> {
  const body: Record<string, string | number> = {}
  if (patch.mapRefreshSeconds !== undefined) {
    body.map_refresh_seconds = patch.mapRefreshSeconds
  }
  if (patch.cityId !== undefined) {
    body.city_id = patch.cityId
  }
  if (patch.usdToCop !== undefined) {
    body.usd_to_cop = patch.usdToCop
  }
  if (patch.usdToVes !== undefined) {
    body.usd_to_ves = patch.usdToVes
  }
  if (patch.whatsappDriverTemplate !== undefined) {
    body.whatsapp_driver_template = patch.whatsappDriverTemplate
  }
  if (patch.whatsappClientTemplate !== undefined) {
    body.whatsapp_client_template = patch.whatsappClientTemplate
  }
  const cached = loadCachedSettings()
  const fallback: AppSettings = {
    mapRefreshSeconds: patch.mapRefreshSeconds ?? cached.mapRefreshSeconds,
    cityId: patch.cityId ?? cached.cityId,
    usdToCop: patch.usdToCop ?? cached.usdToCop,
    usdToVes: patch.usdToVes ?? cached.usdToVes,
    whatsappDriverTemplate: patch.whatsappDriverTemplate ?? cached.whatsappDriverTemplate,
    whatsappClientTemplate: patch.whatsappClientTemplate ?? cached.whatsappClientTemplate,
  }
  return fromApi(
    await api<ApiSettings>('/api/v1/settings', {
      method: 'PATCH',
      body,
    }),
    fallback,
  )
}
