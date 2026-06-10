<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>

      <ion-tab-bar slot="bottom" class="custom-tab-bar">
        <!-- FAB di tengah tab bar -->
        <div class="fab-container" @click="openSelfAttendance">
          <div class="qris-fab">
            <ion-icon :icon="cameraOutline" />
          </div>
        </div>

        <ion-tab-button tab="home" href="/tabs/home" class="tab-btn">
          <ion-icon :icon="homeOutline" />
          <!-- <ion-label>Beranda</ion-label> -->
        </ion-tab-button>

        <ion-tab-button tab="attendance" href="/tabs/attendance" class="tab-btn">
          <ion-icon :icon="fingerPrintOutline" />
          <!-- <ion-label>Absensi</ion-label> -->
        </ion-tab-button>

        <!-- Placeholder kosong di tengah -->
        <ion-tab-button class="tab-btn tab-placeholder" disabled>
        </ion-tab-button>

        <ion-tab-button tab="guide" href="/tabs/guide" class="tab-btn">
          <ion-icon :icon="bookOutline" />
          <!-- <ion-label>Panduan</ion-label> -->
        </ion-tab-button>

        <ion-tab-button tab="profile" href="/tabs/profile" class="tab-btn" @click="openOwnProfile">
          <span class="tab-profile-avatar">
            <SecureImage v-if="profilePhoto" :src="profilePhoto" alt="Foto profil" />
            <span v-else class="tab-profile-initials">{{ profileInitials }}</span>
          </span>
          <!-- <ion-label>Profil</ion-label> -->
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>

    <!-- Self Attendance Modal -->
    <ion-modal :is-open="showModal" @didDismiss="closeSelfAttendance" class="qr-modal">
      <div class="qr-modal-content">
        <div class="qr-modal-header">
          <h2>Self Absensi</h2>
          <button class="close-btn" @click="closeSelfAttendance">✕</button>
        </div>

        <!-- Camera Area (Active State) -->
        <div v-if="!attendanceSuccess" class="qr-scanner-area">
          <video v-show="cameraActive" ref="videoRef" autoplay playsinline class="camera-feed" />
          <canvas ref="canvasRef" style="display:none" />

          <!-- Face scanner oval overlay -->
          <div v-if="cameraActive" class="scan-overlay">
            <div class="face-guide">
              <div class="pulse-ring"></div>
            </div>
            <p class="scan-hint">Posisikan wajah Anda di dalam lingkaran</p>
          </div>

          <div v-if="!cameraActive && !cameraError" class="camera-loading">
            <div class="spinner" />
            <p>Memulai kamera depan...</p>
          </div>

          <div v-if="cameraError" class="camera-error">
            <p>{{ cameraError }}</p>
            <button class="retry-btn" @click="startCamera">Coba Lagi</button>
          </div>
        </div>

        <!-- Success State View -->
        <div v-else class="success-attendance-view">
          <div class="success-header">
            <div class="success-icon-wrap">
              <ion-icon :icon="checkmarkCircleOutline" class="success-icon" />
            </div>
            <h3>Absensi Berhasil!</h3>
            <p>{{ todayStatusLabel }}</p>
          </div>

          <div class="success-card">
            <div class="selfie-preview-wrap">
              <img :src="capturedPhoto" alt="Foto Absen" class="selfie-preview" />
            </div>

            <div class="success-details">
              <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="detail-val status-chip" :class="attendanceType === 'Masuk' ? 'arrival' : 'departure'">
                  {{ attendanceType }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Tanggal</span>
                <span class="detail-val">{{ successDateLabel }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Waktu</span>
                <span class="detail-val text-blue">{{ successTimeLabel }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Lokasi</span>
                <span class="detail-val">{{ successLocationLabel }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="qr-modal-actions">
          <!-- Real-time clock and location info when active -->
          <div v-if="!attendanceSuccess" class="attendance-info-strip">
            <div class="info-time">{{ liveTime }}</div>
            <div class="info-gps" :class="{ 'gps-active': gpsCoords }">
              <span class="gps-pulse" v-if="gpsLoading"></span>
              <span>{{ gpsStatusText }}</span>
            </div>
          </div>

          <div v-if="!attendanceSuccess" class="attendance-type-badge">
            <span :class="['attendance-type-pill', attendanceType === 'Masuk' ? 'arrival' : 'departure']">
              Tipe Absen: {{ attendanceType }}
            </span>
          </div>

          <button 
            v-if="!attendanceSuccess" 
            class="capture-btn" 
            :disabled="!cameraActive || gpsLoading"
            @click="takeSelfieAndAbsen"
          >
            <ion-icon :icon="cameraOutline" />
            Ambil Foto & Absen
          </button>
          <button v-else class="done-btn" @click="closeSelfAttendance">
            Selesai
          </button>
        </div>
      </div>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonIcon,
  IonModal,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/vue'
import {
  bookOutline,
  fingerPrintOutline,
  homeOutline,
  cameraOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SecureImage from '@/components/SecureImage.vue'
import { getStaffDashboard } from '@/services/staff'
import { apiErrorMessage } from '@/services/api'
import { showAppAlert } from '@/services/alerts'
import { authState } from '@/services/auth'
import { saveSelfAttendanceLog, getSelfAttendanceLogs, saveSelfAttendanceToBackend } from '@/services/attendance'

const showModal = ref(false)
const router = useRouter()
const route = useRoute()
const cameraActive = ref(false)
const cameraError = ref('')
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const stream = ref<MediaStream | null>(null)

const gpsLoading = ref(false)
const gpsCoords = ref<{ latitude: number; longitude: number } | null>(null)
const gpsStatusText = ref('Mendeteksi lokasi GPS...')
const liveTime = ref('')

const attendanceSuccess = ref(false)
const capturedPhoto = ref('')
const successDateLabel = ref('')
const successTimeLabel = ref('')
const successLocationLabel = ref('')
const todayStatusLabel = ref('Absen Masuk Berhasil!')
const attendanceType = ref<'Masuk' | 'Pulang'>('Masuk')
const profilePhoto = computed(() => authState.user?.photo_url || '')
const profileInitials = computed(() =>
  (authState.user?.name || authState.user?.username || 'P')
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase(),
)

let clockInterval: any = null

function openOwnProfile() {
  if (route.path === '/tabs/profile' && route.query.nik) {
    void router.replace({ path: '/tabs/profile' })
  }
}

function startClock() {
  const updateClock = () => {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
    const dateStr = now.toLocaleDateString('id-ID', options)
    const timeStr = now.toTimeString().split(' ')[0]
    liveTime.value = `${dateStr} - ${timeStr} WIB`
  }
  updateClock()
  clockInterval = setInterval(updateClock, 1000)
}

function stopClock() {
  if (clockInterval) {
    clearInterval(clockInterval)
    clockInterval = null
  }
}

function getGPSLocation() {
  gpsLoading.value = true
  gpsStatusText.value = 'Mendeteksi koordinat GPS...'
  
  if (!navigator.geolocation) {
    gpsCoords.value = { latitude: -6.2088, longitude: 106.8456 }
    gpsStatusText.value = '📍 GPS: -6.2088, 106.8456 (Mock)'
    gpsLoading.value = false
    return
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 0,
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude
      const lon = position.coords.longitude
      const acc = Math.round(position.coords.accuracy)
      gpsCoords.value = { latitude: lat, longitude: lon }
      gpsStatusText.value = `📍 GPS: ${lat.toFixed(5)}, ${lon.toFixed(5)} (Akurasi: ${acc}m)`
      gpsLoading.value = false
    },
    (error) => {
      console.warn('Geolocation error:', error)
      // Fallback office coordinates to not block user flow
      gpsCoords.value = { latitude: -6.2088, longitude: 106.8456 }
      gpsStatusText.value = '📍 GPS: -6.2088, 106.8456 (Default)'
      gpsLoading.value = false
    },
    options
  )
}

async function openSelfAttendance() {
  if (!authState.user?.allow_mobile_attendance) {
    void showAppAlert({
      header: 'Akses Ditolak',
      message: 'Fitur absensi mobile dinonaktifkan untuk akun Anda. Silakan hubungi IT Administrator.',
      type: 'warning'
    })
    return
  }

  if (await recentlyCheckedIn()) {
    void showAppAlert({
      header: 'Absen Masuk Sudah Tercatat',
      message: 'Silakan tunggu minimal 5 menit setelah absen masuk sebelum melakukan absen pulang.',
      type: 'warning',
    })
    return
  }

  showModal.value = true
  cameraActive.value = false
  cameraError.value = ''
  attendanceSuccess.value = false
  capturedPhoto.value = ''
  gpsCoords.value = null
  attendanceType.value = 'Masuk'
  todayStatusLabel.value = 'Absen Masuk Berhasil!'

  startClock()
  getGPSLocation()
  determineAttendanceType()
  setTimeout(startCamera, 400)
}

async function recentlyCheckedIn() {
  const today = new Date().toISOString().slice(0, 10)
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000
  const localLogs = getSelfAttendanceLogs()
    .filter((log) => log.date === today)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  if (localLogs.length === 1 && now - new Date(localLogs[0].timestamp).getTime() < fiveMinutes) {
    return true
  }

  try {
    const dashboard = await getStaffDashboard({ force: true })
    const todayEntry = dashboard.weekly_attendance.days.find((day) => day.date === today)

    if (!todayEntry?.scan_in || todayEntry.scan_out) {
      return false
    }

    const scanInAt = todayScanTime(todayEntry.scan_in)

    return scanInAt !== null && now - scanInAt.getTime() < fiveMinutes
  } catch {
    return false
  }
}

function todayScanTime(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/)

  if (!match) {
    return null
  }

  const date = new Date()
  date.setHours(Number(match[1]), Number(match[2]), Number(match[3] || 0), 0)

  return date
}

async function determineAttendanceType() {
  const today = new Date().toISOString().slice(0, 10)
  const localLogs = getSelfAttendanceLogs().filter((log) => log.date === today)

  try {
    const dashboard = await getStaffDashboard()
    const todayEntry = dashboard.weekly_attendance.days.find((day) => day.date === today)
    const hasBackendScan = !!todayEntry?.scan_in
    const shouldUsePulang = hasBackendScan || localLogs.length > 0

    if (shouldUsePulang) {
      attendanceType.value = 'Pulang'
      todayStatusLabel.value = 'Absen Pulang Berhasil!'
    }
  } catch {
    if (localLogs.length > 0) {
      attendanceType.value = 'Pulang'
      todayStatusLabel.value = 'Absen Pulang Berhasil!'
    }
  }
}

async function startCamera() {
  try {
    cameraError.value = ''
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: 'user', // Front camera for selfie
        width: { ideal: 640 }, 
        height: { ideal: 640 } 
      },
      audio: false,
    })
    
    stream.value = mediaStream
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      cameraActive.value = true
    }
  } catch (err: any) {
    console.error('Camera error:', err)
    cameraError.value = err?.name === 'NotAllowedError'
      ? 'Akses kamera ditolak. Izinkan kamera di pengaturan browser.'
      : 'Kamera tidak dapat diakses.'
    void showAppAlert({
      header: 'Kamera Tidak Aktif',
      message: cameraError.value,
      type: 'warning',
    })
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach((track) => track.stop())
    stream.value = null
  }
  cameraActive.value = false
}

function closeSelfAttendance() {
  stopCamera()
  stopClock()
  showModal.value = false
}

onMounted(() => {
  window.addEventListener('open-self-attendance', openSelfAttendance)
})

onUnmounted(() => {
  window.removeEventListener('open-self-attendance', openSelfAttendance)
})

async function takeSelfieAndAbsen() {
  const canvas = canvasRef.value
  const video = videoRef.value
  
  if (canvas && video && cameraActive.value) {
    const context = canvas.getContext('2d')
    if (context) {
      const sourceWidth = video.videoWidth || 640
      const sourceHeight = video.videoHeight || 480
      const maxDimension = 1280
      const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
      const width = Math.max(1, Math.round(sourceWidth * scale))
      const height = Math.max(1, Math.round(sourceHeight * scale))
      
      canvas.width = width
      canvas.height = height
      
      // Mirror horizontally for natural selfie capture
      context.translate(width, 0)
      context.scale(-1, 1)
      context.drawImage(video, 0, 0, width, height)
      context.setTransform(1, 0, 0, 1, 0, 0) // reset
      
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.72)
      const lat = gpsCoords.value?.latitude ?? -6.2088
      const lon = gpsCoords.value?.longitude ?? 106.8456

        try {
          const response = await saveSelfAttendanceToBackend(photoDataUrl, lat, lon)
          attendanceType.value = response.attendance_type
          todayStatusLabel.value = `Absen ${response.attendance_type} Berhasil!`

          const newLog = saveSelfAttendanceLog(photoDataUrl, lat, lon)
          const dateObj = new Date(newLog.timestamp)
        successDateLabel.value = dateObj.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          weekday: 'long',
        })
        successTimeLabel.value = `${newLog.time} WIB`
        successLocationLabel.value = `${lat.toFixed(5)}, ${lon.toFixed(5)}`

        capturedPhoto.value = photoDataUrl
        attendanceSuccess.value = true
        stopCamera()
        window.dispatchEvent(new CustomEvent('attendance-submitted'))
      } catch (error: any) {
        cameraError.value = apiErrorMessage(error, 'Gagal mengirim absensi. Coba lagi.')
        void showAppAlert({
          header: 'Absensi Gagal',
          message: cameraError.value,
          type: 'danger',
        })
      }
    }
  }
}
</script>

<style scoped>
/* ─── Tab Bar ── */
.custom-tab-bar {
  --background: var(--hris-card-bg);
  --border: 1px solid var(--hris-border);
  height: 48px;
  box-shadow: 0 -8px 30px rgba(15, 23, 42, 0.08);
  position: relative;
  overflow: visible !important;
  contain: none !important;
}

.tab-btn {
  --color: var(--hris-text-secondary);
  --color-selected: var(--ion-color-primary);
}

/* ─── Center FAB Button ── */
.qris-tab {
  --color: transparent;
  --color-selected: transparent;
  --ripple-color: transparent;
  overflow: visible;
}

.fab-container {
  position: absolute;
  left: 50%;
  top: 5px;
  transform: translate(-50%, -50%);
  z-index: 10;
  pointer-events: auto;
}

.qris-fab {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-primary-shade));
  border: 3px solid #0B0F1E;
  box-shadow: 0 -2px 16px rgba(37, 99, 235, 0.45), 0 4px 14px rgba(37, 99, 235, 0.28);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  gap: 1px;
}

.qris-fab ion-icon { font-size: 30px; }
.qris-label { font-size: 7.5px; font-weight: 800; letter-spacing: 0.5px; }

.tab-placeholder {
  pointer-events: none;
  opacity: 0;
}

.tab-guide-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
  font-size: 10px;
}

.tab-guide-label small {
  font-size: 9px;
  font-weight: 700;
}

/* ─── Modal ────────────────────────────────────────── */
.tab-profile-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--hris-soft-surface);
  border: 1px solid var(--hris-border);
  margin-bottom: 2px;
}

.tab-profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tab-profile-initials {
  font-size: 9px;
  font-weight: 800;
  color: var(--hris-text-dark);
}

.qr-modal {
  --height: 90%;
  --border-radius: 24px 24px 0 0;
}

.qr-modal-content {
  background: var(--hris-card-bg);
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 18px 16px;
  color: var(--hris-text-dark);
}

.qr-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.qr-modal-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.close-btn {
  background: rgba(15, 23, 42, .12);
  border: none;
  color: var(--hris-text-dark);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-scanner-area {
  flex: 1;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* Mirror camera feed for user-friendly preview */
}

.camera-loading,
.camera-error {
  text-align: center;
  color: #94A3B8;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #334155;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.retry-btn {
  margin-top: 12px;
  background: #2563EB;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 18px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

/* ─── Selfie Scan Overlay ───────────────────────────── */
.scan-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.face-guide {
  width: 230px;
  height: 230px;
  border: 4px dashed rgba(59, 130, 246, 0.6);
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 4px solid #3B82F6;
  border-radius: 50%;
  opacity: 0;
  animation: radar-pulse 2s ease-out infinite;
}

@keyframes radar-pulse {
  0% {
    transform: scale(0.95);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.2);
    opacity: 0;
  }
}

.scan-hint {
  margin-top: 24px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* ─── Success View ──────────────────────────────────── */
.success-attendance-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
  text-align: center;
}

.success-header {
  margin-bottom: 20px;
}

.success-icon-wrap {
  width: 64px;
  height: 64px;
  background: rgba(16, 185, 129, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.success-icon {
  font-size: 48px;
  color: #10B981;
}

.success-header h3 {
  margin: 0;
  font-size: 21px;
  font-weight: 800;
  color: #fff;
}

.success-header p {
  margin: 4px 0 0;
  font-size: 14px;
  color: #10B981;
  font-weight: 700;
}

.success-card {
  background: #1E293B;
  border-radius: 16px;
  padding: 16px;
  width: 100%;
  max-width: 290px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  margin-bottom: 12px;
}

.selfie-preview-wrap {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 16px;
  border: 3px solid #3B82F6;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

.selfie-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.success-details {
  display: grid;
  gap: 10px;
  text-align: left;
  border-top: 1px solid #334155;
  padding-top: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.detail-label {
  color: #94A3B8;
  font-weight: 600;
}

.detail-val {
  color: #F1F5F9;
  font-weight: 700;
  text-align: right;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 74px;
  padding: 6px 10px;
  border-radius: 999px;
}

.status-chip.arrival {
  background: rgba(34, 197, 94, 0.18);
  color: #86efac;
}

.status-chip.departure {
  background: rgba(245, 158, 11, 0.18);
  color: #fde68a;
}

.text-blue {
  color: #60A5FA !important;
}

/* ─── Actions and GPS Info ──────────────────────────── */
.qr-modal-actions {
  margin-top: 16px;
}

.attendance-info-strip {
  margin-bottom: 14px;
  text-align: center;
  background: #1E293B;
  padding: 8px 12px;
  border-radius: 10px;
}

.info-time {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.info-gps {
  font-size: 11px;
  color: #94A3B8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-weight: 600;
}

.attendance-type-badge {
  margin-bottom: 14px;
  text-align: center;
}

.attendance-type-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}

.attendance-type-pill.arrival {
  background: #22C55E;
}

.attendance-type-pill.departure {
  background: #F59E0B;
}

.info-gps.gps-active {
  color: #34D399;
}

.gps-pulse {
  width: 6px;
  height: 6px;
  background: #3B82F6;
  border-radius: 50%;
  animation: gps-pulse-anim 1.2s infinite alternate;
}

@keyframes gps-pulse-anim {
  0% { transform: scale(0.8); opacity: 0.5; }
  100% { transform: scale(1.3); opacity: 1; }
}

.capture-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #3B82F6, #1D4ED8);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.2s;
}

.capture-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.done-btn {
  width: 100%;
  padding: 14px;
  background: #10B981;
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 750;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
}
</style>
