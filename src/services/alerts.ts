import { alertController } from '@ionic/vue'

export type AppAlertType = 'success' | 'warning' | 'danger' | 'info'

export interface AppAlertOptions {
  header?: string
  subHeader?: string
  message: string
  type?: AppAlertType
  backdropDismiss?: boolean
  buttons?: Array<string | { text: string; role?: string; handler?: () => boolean | void }>
}

export async function showAppAlert(options: AppAlertOptions) {
  const alert = await alertController.create({
    header: options.header,
    subHeader: options.subHeader,
    message: options.message,
    buttons: options.buttons || [{ text: 'Tutup', role: 'cancel' }],
    backdropDismiss: options.backdropDismiss ?? true,
    cssClass: [`app-alert`, `app-alert--${options.type || 'info'}`],
  })

  await alert.present()
  return alert
}
