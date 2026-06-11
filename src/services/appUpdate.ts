import { App } from '@capacitor/app'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { apiRequest, apiErrorMessage } from './api'
import { showAppAlert } from './alerts'

interface AppUpdaterPlugin {
  canInstallPackages(): Promise<{ allowed: boolean }>
  openInstallSettings(): Promise<void>
  downloadAndInstall(options: { url: string; fileName: string }): Promise<{ download_id: number }>
}

const AppUpdater = registerPlugin<AppUpdaterPlugin>('AppUpdater')

export interface MobileAppRelease {
  id: number
  version_code: number
  version_name: string
  apk_url: string
  sha256: string
  file_size: number
  mandatory: boolean
  notes: string | null
  published_at: string | null
}

let checking = false
let lastPromptedVersionCode = 0

export async function checkForAppUpdate(options: { silent?: boolean } = {}) {
  if (checking || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return
  }

  checking = true
  try {
    const [{ release }, info] = await Promise.all([
      apiRequest<{ release: MobileAppRelease | null }>('/mobile-app/latest'),
      App.getInfo(),
    ])

    if (!release) {
      return
    }

    const currentVersionCode = Number(info.build || 0)
    if (release.version_code <= currentVersionCode) {
      return
    }

    if (options.silent && !release.mandatory && lastPromptedVersionCode === release.version_code) {
      return
    }
    lastPromptedVersionCode = release.version_code

    await promptUpdate(release, currentVersionCode)
  } catch (error) {
    if (!options.silent) {
      await showAppAlert({
        header: 'Cek Update Gagal',
        message: apiErrorMessage(error, 'Versi aplikasi terbaru tidak dapat dicek.'),
        type: 'warning',
      })
    }
  } finally {
    checking = false
  }
}

async function promptUpdate(release: MobileAppRelease, currentVersionCode: number) {
  const sizeMb = release.file_size ? `${(release.file_size / 1024 / 1024).toFixed(1)} MB` : '-'
  const notes = release.notes ? `\n\n${release.notes}` : ''
  const message = [
    `Versi terbaru ${release.version_name} tersedia.`,
    `Versi terpasang: ${currentVersionCode || '-'}`,
    `Ukuran file: ${sizeMb}`,
    notes,
  ].join('\n')

  await showAppAlert({
    header: release.mandatory ? 'Update Wajib Tersedia' : 'Update Aplikasi Tersedia',
    message,
    type: release.mandatory ? 'warning' : 'info',
    backdropDismiss: !release.mandatory,
    buttons: [
      ...(release.mandatory ? [] : [{ text: 'Nanti', role: 'cancel' }]),
      {
        text: 'Update Sekarang',
        handler: () => {
          void startUpdate(release)
        },
      },
    ],
  })
}

async function startUpdate(release: MobileAppRelease) {
  try {
    const permission = await AppUpdater.canInstallPackages()
    if (!permission.allowed) {
      await showAppAlert({
        header: 'Izinkan Install Aplikasi',
        message: 'Aktifkan izin install aplikasi untuk HRIS Mobile, lalu tekan Update Sekarang lagi.',
        type: 'warning',
        buttons: [
          { text: 'Batal', role: 'cancel' },
          {
            text: 'Buka Pengaturan',
            handler: () => {
              void AppUpdater.openInstallSettings()
            },
          },
        ],
      })
      return
    }

    await showAppAlert({
      header: 'Download Update Dimulai',
      message: 'APK terbaru sedang didownload. Setelah selesai, Android akan menampilkan layar install/update.',
      type: 'info',
    })

    await AppUpdater.downloadAndInstall({
      url: release.apk_url,
      fileName: `hris-mobile-${release.version_name}-${release.version_code}.apk`,
    })
  } catch (error) {
    await showAppAlert({
      header: 'Update Gagal',
      message: error instanceof Error ? error.message : 'Update aplikasi tidak dapat dimulai.',
      type: 'danger',
    })
  }
}
