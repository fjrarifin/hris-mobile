import { App } from '@capacitor/app'
import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core'
import { apiRequest, apiErrorMessage } from './api'
import { showAppAlert } from './alerts'

interface AppUpdaterPlugin {
  canInstallPackages(): Promise<{ allowed: boolean }>
  openInstallSettings(): Promise<void>
  downloadAndInstall(options: { url: string; fileName: string }): Promise<{ download_id: number }>
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (event: DownloadProgressEvent) => void,
  ): Promise<PluginListenerHandle>
}

interface DownloadProgressEvent {
  progress: number
  downloaded: number
  total: number
  status: number
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
const UPDATE_HELP_WHATSAPP = '6282117289833'

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
    const currentVersionName = info.version || ''
    const versionMatches = release.version_code === currentVersionCode && release.version_name === currentVersionName
    if (versionMatches) {
      return
    }

    if (options.silent && lastPromptedVersionCode === release.version_code) {
      return
    }
    lastPromptedVersionCode = release.version_code

    await promptUpdate(release, currentVersionCode, currentVersionName)
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

async function promptUpdate(release: MobileAppRelease, currentVersionCode: number, currentVersionName: string) {
  const sizeMb = release.file_size ? `${(release.file_size / 1024 / 1024).toFixed(1)} MB` : '-'
  const notes = release.notes ? `\n\n${release.notes}` : ''
  const message = [
    `Versi terbaru ${release.version_name} tersedia.`,
    `Versi terpasang: ${currentVersionName || '-'} (${currentVersionCode || '-'})`,
    `Ukuran file: ${sizeMb}`,
    'Aplikasi harus diperbarui agar data HRIS tetap sesuai production.',
    notes,
  ].join('\n')

  await showAppAlert({
    header: 'Update Wajib Tersedia',
    message,
    type: 'warning',
    backdropDismiss: false,
    buttons: [
      {
        text: 'WhatsApp IT',
        handler: () => {
          openUpdateWhatsApp(release, currentVersionCode, currentVersionName)
          return false
        },
      },
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
  let progressOverlay: ReturnType<typeof createUpdateProgressOverlay> | null = null
  let progressListener: PluginListenerHandle | null = null

  try {
    const permission = await AppUpdater.canInstallPackages()
    if (!permission.allowed) {
      await showAppAlert({
        header: 'Izinkan Install Aplikasi',
        message: 'Aktifkan izin install aplikasi untuk HRIS Mobile. Jika tetap tidak bisa, hubungi IT melalui WhatsApp.',
        type: 'warning',
        backdropDismiss: false,
        buttons: [
          {
            text: 'WhatsApp IT',
            handler: () => {
              openUpdateWhatsApp(release)
            },
          },
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

    progressOverlay = createUpdateProgressOverlay(release)
    progressListener = await AppUpdater.addListener('downloadProgress', (event) => {
      progressOverlay?.update(event)
    })

    await AppUpdater.downloadAndInstall({
      url: release.apk_url,
      fileName: `hris-mobile-${release.version_name}-${release.version_code}.apk`,
    })

    progressOverlay.update({
      progress: 100,
      downloaded: release.file_size,
      total: release.file_size,
      status: 8,
    })
    progressOverlay.setStatus('Download selesai. Membuka installer Android...')
  } catch (error) {
    progressOverlay?.close()
    await showAppAlert({
      header: 'Update Gagal',
      message: `${error instanceof Error ? error.message : 'Update aplikasi tidak dapat dimulai.'}\n\nSilakan coba lagi atau hubungi IT melalui WhatsApp.`,
      type: 'danger',
      backdropDismiss: false,
      buttons: [
        {
          text: 'WhatsApp IT',
          handler: () => {
            openUpdateWhatsApp(release)
          },
        },
        { text: 'Coba Lagi', handler: () => { void startUpdate(release) } },
      ],
    })
  } finally {
    progressListener?.remove()
    window.setTimeout(() => {
      progressOverlay?.close()
    }, 2500)
  }
}

function openUpdateWhatsApp(release: MobileAppRelease, currentVersionCode?: number, currentVersionName?: string) {
  const text = [
    'Halo IT, saya tidak bisa update HRIS Mobile.',
    `Versi production: ${release.version_name} (${release.version_code})`,
    currentVersionCode ? `Versi terpasang: ${currentVersionName || '-'} (${currentVersionCode})` : '',
    'Mohon dibantu.',
  ].filter(Boolean).join('\n')
  const url = `https://wa.me/${UPDATE_HELP_WHATSAPP}?text=${encodeURIComponent(text)}`
  window.open(url, '_system')
}

function createUpdateProgressOverlay(release: MobileAppRelease) {
  const overlay = document.createElement('div')
  overlay.className = 'app-update-progress'
  overlay.innerHTML = `
    <div class="app-update-progress__panel" role="status" aria-live="polite">
      <h3>Download Update</h3>
      <p class="app-update-progress__status">Menyiapkan download versi ${escapeHtml(release.version_name)}...</p>
      <div class="app-update-progress__track">
        <div class="app-update-progress__bar"></div>
      </div>
      <div class="app-update-progress__meta">
        <span class="app-update-progress__percent">0%</span>
        <span class="app-update-progress__size">0 MB / ${formatBytes(release.file_size)}</span>
      </div>
      <small>Jangan tutup aplikasi sampai layar install Android muncul.</small>
    </div>
  `

  document.body.appendChild(overlay)

  const bar = overlay.querySelector<HTMLElement>('.app-update-progress__bar')
  const percent = overlay.querySelector<HTMLElement>('.app-update-progress__percent')
  const size = overlay.querySelector<HTMLElement>('.app-update-progress__size')
  const status = overlay.querySelector<HTMLElement>('.app-update-progress__status')

  const setStatus = (message: string) => {
    if (status) {
      status.textContent = message
    }
  }

  const update = (event: DownloadProgressEvent) => {
    const progress = Math.max(0, Math.min(100, Number(event.progress || 0)))
    const total = event.total > 0 ? event.total : release.file_size

    if (bar) {
      bar.style.width = `${progress}%`
    }
    if (percent) {
      percent.textContent = `${progress}%`
    }
    if (size) {
      size.textContent = `${formatBytes(event.downloaded)} / ${formatBytes(total)}`
    }

    if (progress >= 100) {
      setStatus('Download selesai. Membuka installer Android...')
    } else if (event.downloaded > 0) {
      setStatus('APK terbaru sedang didownload...')
    } else {
      setStatus('Menghubungkan ke server download...')
    }
  }

  const close = () => {
    overlay.remove()
  }

  return { update, setStatus, close }
}

function formatBytes(bytes: number) {
  if (!bytes || bytes < 1) {
    return '-'
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
