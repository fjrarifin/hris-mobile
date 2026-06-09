import { Capacitor, registerPlugin } from '@capacitor/core'

interface SecureScreenPlugin {
  enable(): Promise<void>
  disable(): Promise<void>
}

const SecureScreen = registerPlugin<SecureScreenPlugin>('SecureScreen')

export async function setSecureScreen(enabled: boolean) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return
  }

  try {
    if (enabled) {
      await SecureScreen.enable()
    } else {
      await SecureScreen.disable()
    }
  } catch (error) {
    console.warn('Secure screen toggle failed:', error)
  }
}
