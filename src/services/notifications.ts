import { authState } from './auth'

export interface AppNotification {
  id: string
  title: string
  message: string
  createdAt: string
  path?: string
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

export function notificationHistory() {
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

export function unreadNotifications() {
  const readIds = readNotificationIds()
  return notificationHistory().filter((notification) => !readIds.has(notification.id))
}

export function readNotificationIdsSnapshot() {
  return readNotificationIds()
}

export function unreadNotificationCount() {
  return unreadNotifications().length
}

export function markNotificationAsRead(id: string) {
  const readIds = readNotificationIds()
  readIds.add(id)
  localStorage.setItem(accountStorageKey(READ_STORAGE_KEY), JSON.stringify([...readIds]))
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT))
}
