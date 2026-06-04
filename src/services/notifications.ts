import { authState } from './auth'
import { apiRequest } from './api'

export interface AppNotification {
  id: string
  title: string
  message: string
  createdAt: string
  readAt?: string | null
  path?: string
}

interface BackendNotification {
  id: string
  title: string
  message: string
  data?: {
    path?: string
    mobile_path?: string
  }
  read_at?: string | null
  created_at?: string | null
}

interface BackendNotificationResponse {
  records?: BackendNotification[]
  unread_count?: number
}

const READ_STORAGE_KEY = 'hris_mobile_read_notifications'
const CREATED_AT_STORAGE_KEY = 'hris_mobile_notification_created_at'
export const NOTIFICATIONS_CHANGED_EVENT = 'hris-notifications-changed'

const notificationDefinitions: Omit<AppNotification, 'createdAt'>[] = [
  {
    id: 'welcome-hris',
    title: 'Selamat Datang',
    message: 'Selamat datang di aplikasi HRIS HomPim Play.',
  },
  {
    id: 'read-application-guide',
    title: 'Baca Panduan Aplikasi',
    message: 'Sebelum menggunakan aplikasi, harap baca panduan aplikasi terlebih dahulu.',
    path: '/tabs/guide',
  },
]

function accountStorageKey(prefix: string) {
  return `${prefix}:${authState.user?.username || 'guest'}`
}

function readNotificationIds() {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(accountStorageKey(READ_STORAGE_KEY)) || '[]'))
  } catch {
    return new Set<string>()
  }
}

function localNotificationHistory() {
  const storageKey = accountStorageKey(CREATED_AT_STORAGE_KEY)
  let timestamps: Record<string, string>

  try {
    timestamps = JSON.parse(localStorage.getItem(storageKey) || '{}')
  } catch {
    timestamps = {}
  }

  let changed = false
  const notifications = notificationDefinitions.map((notification) => {
    if (!timestamps[notification.id]) {
      timestamps[notification.id] = new Date().toISOString()
      changed = true
    }

    return {
      ...notification,
      createdAt: timestamps[notification.id],
    }
  })

  if (changed) {
    localStorage.setItem(storageKey, JSON.stringify(timestamps))
  }

  return notifications
}

async function backendNotificationHistory() {
  if (!authState.token) {
    return null
  }

  const response = await apiRequest<BackendNotificationResponse>('/notifications', {
    token: authState.token,
  })

  return (response.records || []).map((notification): AppNotification => ({
    id: notification.id,
    title: notification.title || 'Notifikasi',
    message: notification.message || '',
    createdAt: notification.created_at || new Date().toISOString(),
    readAt: notification.read_at || null,
    path: notification.data?.mobile_path || notification.data?.path,
  }))
}

export async function notificationHistory() {
  try {
    return (await backendNotificationHistory()) || localNotificationHistory()
  } catch {
    return localNotificationHistory()
  }
}

export async function unreadNotifications() {
  const readIds = readNotificationIds()
  const notifications = await notificationHistory()
  return notifications.filter((notification) => !notification.readAt && !readIds.has(notification.id))
}

export function readNotificationIdsSnapshot() {
  return readNotificationIds()
}

export async function unreadNotificationCount() {
  return (await unreadNotifications()).length
}

export async function markNotificationAsRead(id: string) {
  if (authState.token) {
    try {
      await apiRequest(`/notifications/${id}/read`, {
        method: 'POST',
        token: authState.token,
      })
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT))
      return
    } catch {
      // Static fallback notifications are still tracked locally.
    }
  }

  const readIds = readNotificationIds()
  readIds.add(id)
  localStorage.setItem(accountStorageKey(READ_STORAGE_KEY), JSON.stringify([...readIds]))
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT))
}
