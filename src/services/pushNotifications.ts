import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import {
  type ActionPerformed,
  type PushNotificationSchema,
  PushNotifications,
  type Token,
} from '@capacitor/push-notifications'
import type { Router } from 'vue-router'
import { apiRequest } from './api'
import { authState } from './auth'
import { NOTIFICATIONS_CHANGED_EVENT } from './notifications'

let initialized = false
let currentToken = ''
let navigationInProgress = false

export async function setupPushNotifications(router: Router) {
  if (initialized || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return
  }

  initialized = true

  await PushNotifications.addListener('registration', (token: Token) => {
    currentToken = token.value
    void registerMobileToken(token.value)
  })

  await PushNotifications.addListener('registrationError', (error) => {
    console.warn('Push registration error:', error)
  })

  await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT))
    void showForegroundNotification(notification)
  })

  await PushNotifications.addListener('pushNotificationActionPerformed', (event: ActionPerformed) => {
    const data = event.notification.data || {}
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT))
    void openNotificationPath(router, data)
  })

  await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const data = event.notification.extra || {}
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT))
    void openNotificationPath(router, data)
  })
}

export async function registerForPushNotifications() {
  if (!initialized || !authState.token || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return
  }

  try {
    await PushNotifications.createChannel({
      id: 'hris_requests',
      name: 'HRIS Pengajuan',
      description: 'Notifikasi pengajuan, approval, dan status HRIS.',
      importance: 5,
      visibility: 1,
      lights: true,
      vibration: true,
    })

    await LocalNotifications.createChannel({
      id: 'hris_requests',
      name: 'HRIS Pengajuan',
      description: 'Notifikasi pengajuan, approval, dan status HRIS.',
      importance: 5,
      visibility: 1,
      lights: true,
      vibration: true,
    })

    let permission = await PushNotifications.checkPermissions()

    if (permission.receive !== 'granted') {
      permission = await PushNotifications.requestPermissions()
    }

    if (permission.receive !== 'granted') {
      return
    }

    const localPermission = await LocalNotifications.checkPermissions()
    if (localPermission.display !== 'granted') {
      await LocalNotifications.requestPermissions()
    }

    await PushNotifications.register()

    if (currentToken) {
      await registerMobileToken(currentToken)
    }
  } catch (error) {
    console.warn('Push notification setup failed:', error)
  }
}

async function showForegroundNotification(notification: PushNotificationSchema) {
  const title = notification.title || notification.data?.title || 'Notifikasi HRIS'
  const body = notification.body || notification.data?.message || ''

  if (!title && !body) {
    return
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now() % 2147483647,
          title: String(title),
          body: String(body),
          channelId: 'hris_requests',
          extra: notification.data || {},
        },
      ],
    })
  } catch (error) {
    console.warn('Foreground local notification failed:', error)
  }
}

async function openNotificationPath(router: Router, data: Record<string, unknown>) {
  if (navigationInProgress) {
    return
  }

  navigationInProgress = true
  try {
    await router.isReady()
    await router.push(normalizeNotificationPath(data.mobile_path || data.path))
  } catch (error) {
    console.warn('Notification navigation failed:', error)
    try {
      await router.push('/notifications')
    } catch {
      // Keep the app open even when navigation fallback fails.
    }
  } finally {
    setTimeout(() => {
      navigationInProgress = false
    }, 500)
  }
}

function normalizeNotificationPath(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return '/notifications'
  }

  const path = value.trim()

  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path)
      return `${url.pathname}${url.search}${url.hash}` || '/notifications'
    } catch {
      return '/notifications'
    }
  }

  return path.startsWith('/') ? path : `/${path}`
}

export async function unregisterForPushNotifications() {
  if (!currentToken || !authState.token || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return
  }

  try {
    await apiRequest('/notifications/mobile-token', {
      method: 'DELETE',
      token: authState.token,
      body: {
        token: currentToken,
        platform: 'android',
      },
    })
  } catch (error) {
    console.warn('Mobile push token unregister failed:', error)
  }
}

export function sendTestPushNotification() {
  return apiRequest<{ message: string; sent: number; registered_tokens: number }>('/notifications/test-push', {
    method: 'POST',
    token: authState.token,
  })
}

async function registerMobileToken(token: string) {
  if (!authState.token) return

  try {
    await apiRequest('/notifications/mobile-token', {
      method: 'POST',
      token: authState.token,
      body: {
        token,
        platform: 'android',
        device_name: navigator.userAgent.slice(0, 120),
      },
    })
  } catch (error) {
    console.warn('Mobile push token registration failed:', error)
  }
}
