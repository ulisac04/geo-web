import { api } from './api'
import { prepareLogoFile } from './image'

export interface AdminTenant {
  id: string
  code: string
  name: string
  status: string
  city_id: string
  driver_count: number
  service_limit: number
  created_at: string
  primary_color: string
  accent_color: string
  subdomain: string | null
  has_logo: boolean
  logo_url: string | null
}

export interface AdminOperator {
  id: string
  name: string
  email: string
  role: string
  active: boolean
}

export interface AdminTenantDetail extends AdminTenant {
  operators: AdminOperator[]
}

export interface CreatedTenant {
  id: string
  code: string
  name: string
  status: string
  city_id: string
  operator_email: string
  operator_password: string
  company_code: string
}

export interface ServiceSettlement {
  id: string
  tenant_id: string
  balance: number
  settled_at: string
  note: string | null
}

export interface TenantStats {
  from: string
  to: string
  drivers: {
    total: number
    available: number
    busy: number
    offline: number
  }
  services: {
    total: number
    pending: number
    assigned: number
    en_route: number
    in_progress: number
    completed: number
    cancelled: number
    in_range: number
  }
  gemini: {
    total: number
    ok: number
    errors: number
    by_kind: {
      extract: number
      transcribe: number
      ocr: number
    }
  }
}

export function listTenants() {
  return api<AdminTenant[]>('/api/v1/admin/tenants')
}

export function getTenant(id: string) {
  return api<AdminTenantDetail>(`/api/v1/admin/tenants/${id}`)
}

export function createTenant(body: {
  name: string
  code: string
  city_id: string
  operator_name: string
  operator_email: string
  operator_password: string
  primary_color?: string
  accent_color?: string
  subdomain?: string
}) {
  return api<CreatedTenant>('/api/v1/admin/tenants', { method: 'POST', body })
}

export function patchTenant(
  id: string,
  body: {
    status?: string
    name?: string
    primary_color?: string
    accent_color?: string
    subdomain?: string
    service_limit?: number
  },
) {
  return api<AdminTenant>(`/api/v1/admin/tenants/${id}`, { method: 'PATCH', body })
}

export function adjustTenantServiceLimit(id: string, delta: number) {
  return api<AdminTenant>(`/api/v1/admin/tenants/${id}/service-limit/adjust`, {
    method: 'POST',
    body: { delta },
  })
}

export function settleTenantServiceLimit(id: string, note?: string) {
  return api<AdminTenant>(`/api/v1/admin/tenants/${id}/service-limit/settle`, {
    method: 'POST',
    body: { note },
  })
}

export function listTenantSettlements(id: string) {
  return api<ServiceSettlement[]>(`/api/v1/admin/tenants/${id}/service-limit/settlements`)
}

export async function uploadTenantLogo(id: string, file: File) {
  const body = new FormData()
  body.append('logo', await prepareLogoFile(file))
  return api<AdminTenant>(`/api/v1/admin/tenants/${id}/logo`, { method: 'PUT', body })
}

export function deleteTenantLogo(id: string) {
  return api<AdminTenant>(`/api/v1/admin/tenants/${id}/logo`, { method: 'DELETE' })
}

export function getTenantStats(id: string, from: string, to: string) {
  return api<TenantStats>(`/api/v1/admin/tenants/${id}/stats`, {
    query: { from, to },
  })
}

export function addOperator(
  tenantId: string,
  body: { name: string; email: string; password: string },
) {
  return api<AdminOperator>(`/api/v1/admin/tenants/${tenantId}/operators`, {
    method: 'POST',
    body,
  })
}

export function resetOperatorPassword(tenantId: string, userId: string, password: string) {
  return api<{ ok: boolean }>(
    `/api/v1/admin/tenants/${tenantId}/operators/${userId}/reset-password`,
    { method: 'POST', body: { password } },
  )
}
