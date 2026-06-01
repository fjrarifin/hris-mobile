import { apiRequest } from './api'
import { authState } from './auth'

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

export function getLeaves() {
  return apiRequest<LeaveResponse>('/staff/leave', {
    token: authState.token,
  })
}

export function createLeave(payload: {
  leave_type: string
  start_date: string
  end_date: string
  reason: string
}) {
  return apiRequest<{ message: string }>('/staff/leave', {
    method: 'POST',
    token: authState.token,
    body: payload,
  })
}

export function deleteLeave(id: number) {
  return apiRequest<{ message: string }>(`/staff/leave/${id}`, {
    method: 'DELETE',
    token: authState.token,
  })
}

export function getPublicHolidays() {
  return apiRequest<PublicHolidayResponse>('/staff/public-holiday', {
    token: authState.token,
  })
}

export function createPublicHoliday(payload: { public_holiday_id: string; claim_date: string }) {
  return apiRequest<{ message: string }>('/staff/public-holiday', {
    method: 'POST',
    token: authState.token,
    body: payload,
  })
}

export function deletePublicHoliday(id: number) {
  return apiRequest<{ message: string }>(`/staff/public-holiday/${id}`, {
    method: 'DELETE',
    token: authState.token,
  })
}

export function getPermissions() {
  return apiRequest<PermissionResponse>('/staff/permission', {
    token: authState.token,
  })
}

export function createPermission(payload: FormData) {
  return apiRequest<{ message: string }>('/staff/permission', {
    method: 'POST',
    token: authState.token,
    body: payload,
  })
}

export function deletePermission(id: number) {
  return apiRequest<{ message: string }>(`/staff/permission/${id}`, {
    method: 'DELETE',
    token: authState.token,
  })
}
