export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'

export const BACKEND_URL = API_BASE_URL.replace(/\/api$/, '')
export const BACKEND_LOGO_URL = `${BACKEND_URL}/hompimplay_icon.png`

export interface ApiErrorBody {
  code?: string
  message?: string
  errors?: Record<string, string[]>
  active_session?: {
    device_name?: string
    network_address?: string | null
    signed_in_at?: string | null
    last_active_at?: string | null
  }
}

export class ApiRequestError extends Error {
  status: number
  data: ApiErrorBody

  constructor(status: number, data: ApiErrorBody) {
    super(data.message || 'Permintaan tidak dapat diproses.')
    this.name = 'ApiRequestError'
    this.status = status
    this.data = data
  }
}

export function isApiRequestError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  token?: string | null
  body?: unknown
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  let response: Response

  try {
    alert(`URL: ${API_BASE_URL}${path}`)

    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body:
        options.body instanceof FormData
          ? options.body
          : options.body !== undefined
            ? JSON.stringify(options.body)
            : undefined,
    })
  } catch (error) {
    alert(`FETCH ERROR: ${String(error)}`)
    console.error('FETCH ERROR:', error)
    throw error
  }

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new ApiRequestError(response.status, data || {})
  }

  return data as T
}

export function apiErrorMessage(error: unknown, fallback = 'Permintaan tidak dapat diproses.') {
  if (!isApiRequestError(error)) {
    return fallback
  }

  const fieldErrors = error.data.errors ? Object.values(error.data.errors).flat() : []

  return fieldErrors[0] || error.data.message || fallback
}
