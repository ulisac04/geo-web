import { api } from './api'

export interface AdminTenant {
  id: string
  code: string
  name: string
  status: string
  city_id: string
  driver_count: number
  created_at: string
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
}) {
  return api<CreatedTenant>('/api/v1/admin/tenants', { method: 'POST', body })
}

export function patchTenant(id: string, body: { status?: string }) {
  return api<AdminTenant>(`/api/v1/admin/tenants/${id}`, { method: 'PATCH', body })
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
