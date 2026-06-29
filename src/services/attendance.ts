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

export const ATTENDANCE_CENTER = {
  name: 'HomPimPlay',
  latitude: -6.8698601,
  longitude: 107.6282757,
  radiusMeters: 50,
}

function getStorageKey(): string {
  const username = authState.user?.username || 'guest'
  return `hris_self_attendance_logs_${username}`
}

export function attendanceDistanceMeters(latitude: number, longitude: number) {
  const earthRadiusMeters = 6371000
  const toRadians = (value: number) => (value * Math.PI) / 180
  const lat1 = toRadians(latitude)
  const lat2 = toRadians(ATTENDANCE_CENTER.latitude)
  const deltaLat = toRadians(ATTENDANCE_CENTER.latitude - latitude)
  const deltaLon = toRadians(ATTENDANCE_CENTER.longitude - longitude)
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function isInsideAttendanceRadius(latitude: number, longitude: number) {
  return attendanceDistanceMeters(latitude, longitude) <= ATTENDANCE_CENTER.radiusMeters
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
