import { reactive } from 'vue'
import { apiRequest, setUnauthorizedHandler } from './api'

const TOKEN_KEY = 'hris_mobile_token'

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

export const authState = reactive({
  token: localStorage.getItem(TOKEN_KEY),
  user: null as AuthUser | null,
  initialized: false,
})

function applySession(payload: SessionPayload) {
  authState.user = payload.user
}

function ensureEmployee(payload: SessionPayload) {
  if (payload.user.level !== 3) {
    throw new Error('Aplikasi mobile hanya dapat digunakan oleh akun karyawan.')
  }
}

export async function loginEmployee(username: string, password: string) {
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
    const payload = await apiRequest<SessionPayload>('/auth/me', {
      token: authState.token,
    })

    ensureEmployee(payload)
    applySession(payload)
  } catch {
    clearSession()
  } finally {
    authState.initialized = true
  }
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
