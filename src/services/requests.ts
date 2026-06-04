import { apiRequest } from './api'
import { authState } from './auth'
import { cachedApiRequest, invalidateCache } from './cache'

export interface LeaveRequestItem {
  id: number
  leave_type: string
  start_date: string
  end_date: string
  reason: string | null
  status: string
}

export interface LeaveResponse {
  balance: {
    total: number
    used: number
    available: number
  }
  leave_types: Record<string, string>
  requests: LeaveRequestItem[]
}

export interface PublicHolidayItem {
  id: number
  name: string
  holiday_date: string
}

export interface PublicHolidayRequestItem {
  id: number
  holiday?: PublicHolidayItem | null
  claim_date: string
  status: string
}

export interface PublicHolidayResponse {
  balance: number
  holidays: PublicHolidayItem[]
  requests: PublicHolidayRequestItem[]
}

export interface PermissionRequestItem {
  id: number
  type: 'izin' | 'sakit'
  date: string
  reason: string | null
  document_url?: string | null
  status: string
}

export interface PermissionResponse {
  requests: PermissionRequestItem[]
}

const TTL = {
  requests: 10 * 60 * 1000,
  publicHoliday: 12 * 60 * 60 * 1000,
}

export function getLeaves(options: { force?: boolean } = {}) {
  return cachedApiRequest<LeaveResponse>('requests-leave', '/staff/leave', {
    ttlMs: TTL.requests,
    force: options.force,
  })
}

export async function createLeave(payload: {
  leave_type: string
  start_date: string
  end_date: string
  reason: string
}) {
  const response = await apiRequest<{ message: string }>('/staff/leave', {
    method: 'POST',
    token: authState.token,
    body: payload,
  })

  invalidateCache(['requests-leave', 'staff-dashboard'])

  return response
}

export async function deleteLeave(id: number) {
  const response = await apiRequest<{ message: string }>(`/staff/leave/${id}`, {
    method: 'DELETE',
    token: authState.token,
  })

  invalidateCache(['requests-leave', 'staff-dashboard'])

  return response
}

export function getPublicHolidays(options: { force?: boolean } = {}) {
  return cachedApiRequest<PublicHolidayResponse>('requests-public-holiday', '/staff/public-holiday', {
    ttlMs: TTL.publicHoliday,
    force: options.force,
  })
}

export async function createPublicHoliday(payload: { public_holiday_id: string; claim_date: string }) {
  const response = await apiRequest<{ message: string }>('/staff/public-holiday', {
    method: 'POST',
    token: authState.token,
    body: payload,
  })

  invalidateCache(['requests-public-holiday', 'staff-dashboard'])

  return response
}

export async function deletePublicHoliday(id: number) {
  const response = await apiRequest<{ message: string }>(`/staff/public-holiday/${id}`, {
    method: 'DELETE',
    token: authState.token,
  })

  invalidateCache(['requests-public-holiday', 'staff-dashboard'])

  return response
}

export function getPermissions(options: { force?: boolean } = {}) {
  return cachedApiRequest<PermissionResponse>('requests-permission', '/staff/permission', {
    ttlMs: TTL.requests,
    force: options.force,
  })
}

export async function createPermission(payload: FormData) {
  const response = await apiRequest<{ message: string }>('/staff/permission', {
    method: 'POST',
    token: authState.token,
    body: payload,
  })

  invalidateCache(['requests-permission', 'staff-dashboard'])

  return response
}

export async function deletePermission(id: number) {
  const response = await apiRequest<{ message: string }>(`/staff/permission/${id}`, {
    method: 'DELETE',
    token: authState.token,
  })

  invalidateCache(['requests-permission', 'staff-dashboard'])

  return response
}
