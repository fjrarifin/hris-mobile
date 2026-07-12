import { reactive } from 'vue'
import { apiRequest, setUnauthorizedHandler } from './api'

const TOKEN_KEY = 'hris_mobile_token'
const USER_KEY = 'hris_mobile_user'
const SESSION_RESTORE_ATTEMPTS = 3

export interface AuthUser {
  id: number
  username: string
  name: string
  email: string | null
  position: string | null
  level: number
  level_label: string
  photo_url: string | null
  must_change_password: boolean
  allow_mobile_attendance: boolean
  attendance_radius_required: boolean
  session_idle_timeout_minutes?: number
}

export interface ForgotPasswordOtpPayload {
  message: string
  expires_in: number
}

export interface SessionPayload {
  token?: string
  user: AuthUser
  dashboard_path?: string
  menus?: unknown[]
}

function storedUser(): AuthUser | null {
  try {
    const value = localStorage.getItem(USER_KEY)
    return value ? JSON.parse(value) as AuthUser : null
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

const storedToken = localStorage.getItem(TOKEN_KEY)

export const authState = reactive({
  token: storedToken,
  user: storedToken ? storedUser() : null,
  initialized: false,
})

function applySession(payload: SessionPayload) {
  authState.user = payload.user
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
}

function ensureEmployee(payload: SessionPayload) {
  if (payload.user.level !== 3) {
    throw new Error('Aplikasi mobile hanya dapat digunakan oleh akun karyawan.')
  }
}

export async function loginEmployee(username: string, password: string) {
  if (authState.token) {
    const restored = await restoreExistingSession()

    if (restored) {
      return
    }
  }

  const payload = await apiRequest<SessionPayload>('/auth/login', {
    method: 'POST',
    body: { username, password, client: 'mobile' },
  })

  if (payload.user.level !== 3) {
    if (payload.token) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        token: payload.token,
      }).catch(() => undefined)
    }

    throw new Error('Aplikasi mobile hanya dapat digunakan oleh akun karyawan.')
  }

  if (!payload.token) {
    throw new Error('Token login tidak diterima dari server.')
  }

  authState.token = payload.token
  localStorage.setItem(TOKEN_KEY, payload.token)
  applySession(payload)
  authState.initialized = true
}

export function requestPasswordOtp(nik: string) {
  return apiRequest<ForgotPasswordOtpPayload>('/auth/forgot-password/request-otp', {
    method: 'POST',
    body: { nik },
  })
}

export function verifyPasswordOtp(nik: string, otp: string) {
  return apiRequest<{ message: string }>('/auth/forgot-password/verify-otp', {
    method: 'POST',
    body: { nik, otp },
  })
}

export function resetForgottenPassword(
  nik: string,
  otp: string,
  password: string,
  passwordConfirmation: string,
) {
  return apiRequest<{ message: string }>('/auth/forgot-password/reset', {
    method: 'POST',
    body: {
      nik,
      otp,
      password,
      password_confirmation: passwordConfirmation,
    },
  })
}

export async function changeEmployeePassword(
  currentPassword: string,
  password: string,
  passwordConfirmation: string,
) {
  const payload = await apiRequest<SessionPayload>('/auth/change-password', {
    method: 'POST',
    token: authState.token,
    body: {
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    },
  })

  ensureEmployee(payload)
  applySession(payload)
}

export async function restoreSession() {
  if (authState.initialized) {
    return
  }

  if (!authState.token) {
    authState.initialized = true
    return
  }

  try {
    await restoreExistingSession()
  } catch {
    // Token tetap dipertahankan. Halaman login dapat mencoba memulihkan sesi
    // yang sama lagi tanpa membuat token baru di backend.
  } finally {
    authState.initialized = true
  }
}

async function restoreExistingSession() {
  if (!authState.token) {
    return false
  }

  let lastError: unknown

  for (let attempt = 1; attempt <= SESSION_RESTORE_ATTEMPTS; attempt += 1) {
    try {
      const payload = await apiRequest<SessionPayload>('/auth/me', {
        token: authState.token,
      })

      ensureEmployee(payload)
      applySession(payload)
      return true
    } catch (error) {
      lastError = error

      if (attempt < SESSION_RESTORE_ATTEMPTS) {
        await new Promise((resolve) => window.setTimeout(resolve, attempt * 750))
      }
    }
  }

  // Gangguan jaringan atau server tidak membatalkan sesi. Token tetap disimpan
  // agar pengguna tidak membuat sesi kedua saat koneksi kembali normal.
  if (authState.user) {
    return true
  }

  throw lastError
}

export async function refreshSession() {
  if (!authState.token) {
    return null
  }

  const payload = await apiRequest<SessionPayload>('/auth/me', {
    token: authState.token,
  })

  ensureEmployee(payload)
  applySession(payload)
  authState.initialized = true

  return payload
}

export async function logoutEmployee() {
  const token = authState.token

  try {
    if (token) {
      await apiRequest('/auth/logout', {
        method: 'POST',
        token,
      })
    }
  } finally {
    clearSession()
  }
}

export function clearSession() {
  authState.token = null
  authState.user = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

setUnauthorizedHandler(() => {
  clearSession()
  window.location.replace(`${import.meta.env.BASE_URL}login`)
})

export function updateEmployeePhoto(photoUrl: string | null) {
  if (authState.user) {
    authState.user.photo_url = photoUrl
  }
}
