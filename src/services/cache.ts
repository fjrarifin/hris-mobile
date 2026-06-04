import { apiRequest } from './api'
import { authState } from './auth'

interface CacheEnvelope<T> {
  storedAt: number
  expiresAt: number
  value: T
}

interface CachedApiOptions {
  ttlMs: number
  force?: boolean
}

const CACHE_PREFIX = 'hris_mobile_api_cache'

function accountKey() {
  return authState.user?.username || 'guest'
}

function storageKey(key: string) {
  return `${CACHE_PREFIX}:${accountKey()}:${key}`
}

export function getCachedValue<T>(key: string): T | null {
  try {
    const envelope = JSON.parse(localStorage.getItem(storageKey(key)) || 'null') as CacheEnvelope<T> | null

    if (!envelope || Date.now() > envelope.expiresAt) {
      return null
    }

    return envelope.value
  } catch {
    return null
  }
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number) {
  const now = Date.now()

  localStorage.setItem(
    storageKey(key),
    JSON.stringify({
      storedAt: now,
      expiresAt: now + ttlMs,
      value,
    } satisfies CacheEnvelope<T>),
  )
}

export function invalidateCache(keys: string[]) {
  for (const key of keys) {
    localStorage.removeItem(storageKey(key))
  }
}

export function invalidateCachePrefix(prefix: string) {
  const fullPrefix = storageKey(prefix)

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)

    if (key?.startsWith(fullPrefix)) {
      localStorage.removeItem(key)
    }
  }
}

export async function cachedApiRequest<T>(
  key: string,
  path: string,
  options: CachedApiOptions,
): Promise<T> {
  if (!options.force) {
    const cached = getCachedValue<T>(key)

    if (cached) {
      return cached
    }
  }

  const value = await apiRequest<T>(path, {
    token: authState.token,
  })

  setCachedValue(key, value, options.ttlMs)

  return value
}
