import { Capacitor } from '@capacitor/core'
import {
  type ActionPerformed,
  PushNotifications,
  type Token,
} from '@capacitor/push-notifications'
import type { Router } from 'vue-router'
import { apiRequest } from './api'
import { authState } from './auth'
import { NOTIFICATIONS_CHANGED_EVENT } from './notifications'

let initialized = false
let currentToken = ''

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

  await PushNotifications.addListener('pushNotificationReceived', () => {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT))
  })

  await PushNotifications.addListener('pushNotificationActionPerformed', (event: ActionPerformed) => {
    const data = event.notification.data || {}
    const path = data.mobile_path || data.path || '/notifications'
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT))
    void router.push(String(path))
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

    let permission = await PushNotifications.checkPermissions()

    if (permission.receive !== 'granted') {
      permission = await PushNotifications.requestPermissions()
    }

    if (permission.receive !== 'granted') {
      return
    }

    await PushNotifications.register()

    if (currentToken) {
      await registerMobileToken(currentToken)
    }
  } catch (error) {
    console.warn('Push notification setup failed:', error)
  }
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
