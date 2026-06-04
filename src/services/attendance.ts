import { apiRequest } from './api'
import { authState } from './auth'
import { invalidateCache, invalidateCachePrefix } from './cache'

export interface SelfAttendanceLog {
  date: string      // YYYY-MM-DD
  time: string      // HH:mm:ss
  timestamp: string // ISO date string
  photo: string     // Base64 data URL
  latitude: number
  longitude: number
}

export interface SelfAttendanceBackendResponse {
  message: string
  attendance_type: 'Masuk' | 'Pulang'
  scan_time: string
}

function getStorageKey(): string {
  const username = authState.user?.username || 'guest'
  return `hris_self_attendance_logs_${username}`
}

export function getSelfAttendanceLogs(): SelfAttendanceLog[] {
  try {
    const key = getStorageKey()
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function saveSelfAttendanceToBackend(
  photo: string,
  latitude: number,
  longitude: number
): Promise<SelfAttendanceBackendResponse> {
  const response = await apiRequest<SelfAttendanceBackendResponse>('/staff/attendance/selfie', {
    token: authState.token,
    method: 'POST',
    body: {
      photo,
      latitude,
      longitude,
    },
  })

  invalidateCache(['staff-dashboard'])
  invalidateCachePrefix('staff-attendance:')

  return response
}

export function saveSelfAttendanceLog(photo: string, latitude: number, longitude: number): SelfAttendanceLog {
  const now = new Date()
  
  // Format Date (YYYY-MM-DD)
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const date = `${yyyy}-${mm}-${dd}`
  
  // Format Time (HH:mm:ss)
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const time = `${hh}:${min}:${ss}`
  
  const newLog: SelfAttendanceLog = {
    date,
    time,
    timestamp: now.toISOString(),
    photo,
    latitude,
    longitude,
  }
  
  const logs = getSelfAttendanceLogs()
  logs.push(newLog)
  
  localStorage.setItem(getStorageKey(), JSON.stringify(logs))
  return newLog
}
