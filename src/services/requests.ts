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

export interface ExtraOffSource {
  source_period_start: string
  source_period_end: string
  label: string
  days: number
  used_days: number
  remaining_days: number
}

export interface ExtraOffRequestItem {
  id: number
  source_period_start: string
  source_period_end: string
  claim_date: string
  status: string
}

export interface ExtraOffResponse {
  balance: number
  sources: ExtraOffSource[]
  requests: ExtraOffRequestItem[]
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

export interface TeamScheduleEmployee {
  nik: string
  name: string
  position: string
  department: string
  unit: string
  relationship: string
  total_period_days: number
  scheduled_days: number
}

export interface TeamScheduleCategory {
  id: number
  code: string
  name: string
  start_time: string | null
  end_time: string | null
  type: string | null
}

export interface TeamScheduleResponse {
  filters: {
    start_date: string
    end_date: string
  }
  supervisor: {
    nik: string
    name: string
    position: string
  }
  employees: TeamScheduleEmployee[]
  categories: TeamScheduleCategory[]
}

export interface TeamEmployeeScheduleResponse {
  employee: {
    nik: string
    name: string
    position: string
    department: string
  }
  dates: Array<{
    date: string
    code: string
  }>
  categories: TeamScheduleCategory[]
}

export interface OvertimeSubordinate {
  nik: string
  nama_karyawan: string
  jabatan?: string | null
  departement?: string | null
}

export interface OvertimeRequestItem {
  id: number
  date: string
  start_time: string
  end_time: string
  reason?: string | null
  status: string
  user?: {
    name?: string | null
    karyawan?: {
      nama_karyawan?: string | null
      nik?: string | null
    } | null
  } | null
}

export interface OvertimeResponse {
  subordinates: OvertimeSubordinate[]
  requests: OvertimeRequestItem[]
}

export type SubordinateApprovalType = 'leave' | 'ph' | 'extra_off' | 'permission'

export interface SubordinateApprovalItem {
  id: number
  type: SubordinateApprovalType
  employee_nik: string
  employee_name: string
  label: string
  start_date: string | null
  end_date: string | null
  reason: string | null
  status: string
  created_at: string
}

export interface SubordinateApprovalsResponse {
  requests: SubordinateApprovalItem[]
}

const TTL = {
  requests: 10 * 60 * 1000,
  publicHoliday: 12 * 60 * 60 * 1000,
  teamSchedule: 5 * 60 * 1000,
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

export function getExtraOffs(options: { force?: boolean } = {}) {
  return cachedApiRequest<ExtraOffResponse>('requests-extra-off', '/staff/extra-off', {
    ttlMs: TTL.publicHoliday,
    force: options.force,
  })
}

export async function createExtraOff(payload: { source_period_start: string; source_period_end: string; claim_date: string }) {
  const response = await apiRequest<{ message: string }>('/staff/extra-off', {
    method: 'POST',
    token: authState.token,
    body: payload,
  })

  invalidateCache(['requests-extra-off', 'staff-dashboard'])

  return response
}

export async function deleteExtraOff(id: number) {
  const response = await apiRequest<{ message: string }>(`/staff/extra-off/${id}`, {
    method: 'DELETE',
    token: authState.token,
  })

  invalidateCache(['requests-extra-off', 'staff-dashboard'])

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

export function getTeamSchedules(startDate: string, endDate: string, options: { force?: boolean } = {}) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate })

  return cachedApiRequest<TeamScheduleResponse>(`team-schedules:${startDate}:${endDate}`, `/staff/team-schedules?${params.toString()}`, {
    ttlMs: TTL.teamSchedule,
    force: options.force,
  })
}

export function getTeamEmployeeSchedule(nik: string, startDate: string, endDate: string, options: { force?: boolean } = {}) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate })

  return cachedApiRequest<TeamEmployeeScheduleResponse>(
    `team-schedules:${nik}:${startDate}:${endDate}`,
    `/staff/team-schedules/employees/${encodeURIComponent(nik)}?${params.toString()}`,
    {
      ttlMs: TTL.teamSchedule,
      force: options.force,
    },
  )
}

export async function saveTeamEmployeeSchedule(nik: string, payload: { start_date: string; end_date: string; schedules: Array<{ date: string; code: string }> }) {
  const response = await apiRequest<{ message: string }>(`/staff/team-schedules/employees/${encodeURIComponent(nik)}`, {
    method: 'PUT',
    token: authState.token,
    body: payload,
  })

  invalidateCache([
    `team-schedules:${payload.start_date}:${payload.end_date}`,
    `team-schedules:${nik}:${payload.start_date}:${payload.end_date}`,
  ])

  return response
}

export function getOvertime(options: { force?: boolean } = {}) {
  return cachedApiRequest<OvertimeResponse>('requests-overtime', '/staff/overtime', {
    ttlMs: TTL.requests,
    force: options.force,
  })
}

export async function createOvertime(payload: {
  employee_niks: string[]
  date: string
  start_time: string
  end_time: string
  reason: string
}) {
  const response = await apiRequest<{ message: string }>('/staff/overtime', {
    method: 'POST',
    token: authState.token,
    body: payload,
  })

  invalidateCache(['requests-overtime'])

  return response
}

export async function deleteOvertime(id: number) {
  const response = await apiRequest<{ message: string }>(`/staff/overtime/${id}`, {
    method: 'DELETE',
    token: authState.token,
  })

  invalidateCache(['requests-overtime'])

  return response
}

export function getSubordinateApprovals(options: { force?: boolean } = {}) {
  return cachedApiRequest<SubordinateApprovalsResponse>('staff-approvals', '/staff/approvals', {
    ttlMs: TTL.requests,
    force: options.force,
  })
}

export async function decideSubordinateApproval(
  type: SubordinateApprovalType,
  id: number,
  payload: { decision: 'approved' | 'rejected'; reason?: string },
) {
  const response = await apiRequest<{ message: string }>(`/staff/approvals/${type}/${id}`, {
    method: 'POST',
    token: authState.token,
    body: payload,
  })

  invalidateCache(['staff-approvals', 'staff-dashboard'])

  return response
}
