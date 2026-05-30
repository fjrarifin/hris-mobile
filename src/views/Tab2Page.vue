<template>
  <ion-page>
    <ion-content fullscreen class="mobile-page">
      <ion-refresher slot="fixed" @ionRefresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <main class="page-shell">
        <section class="hero-card">
          <span class="hero-eyebrow">Absensi</span>
          <h2>Kehadiran Saya</h2>
          <p>
            Lihat riwayat absensi Anda, termasuk status kehadiran, jadwal, dan waktu scan masuk-keluar.
          </p>
        </section>

        <section class="filter-card">
          <div class="filter-header">
            <div>
              <span>Filter Tanggal</span>
              <strong>{{ filterLabel }}</strong>
            </div>
            <ion-button fill="clear" size="small" class="reset-button" @click="resetFilters">
              Reset
            </ion-button>
          </div>

          <form class="filter-form" @submit.prevent="loadAttendance">
            <label class="filter-field">
              <span>Tanggal Awal</span>
              <input v-model="filters.start_date" type="date" />
            </label>
            <label class="filter-field">
              <span>Tanggal Akhir</span>
              <input v-model="filters.end_date" type="date" />
            </label>
            <ion-button type="submit" expand="block" class="apply-button" :disabled="loading">
              {{ loading ? 'Memuat...' : 'Terapkan Filter' }}
            </ion-button>
          </form>
        </section>

        <section v-if="hasLoaded" class="summary-grid">
          <article class="summary-card">
            <span>Total Hari</span>
            <strong>{{ attendance?.summary.attendance_days ?? 0 }}</strong>
          </article>
          <article class="summary-card">
            <span>Lengkap</span>
            <strong>{{ attendance?.summary.complete_days ?? 0 }}</strong>
          </article>
          <article class="summary-card">
            <span>Belum Lengkap</span>
            <strong>{{ attendance?.summary.incomplete_days ?? 0 }}</strong>
          </article>
        </section>

        <section class="attendance-list">
          <div v-if="!hasLoaded && !loading" class="empty-state">
            Pilih tanggal awal dan tanggal akhir, lalu tekan <strong>Terapkan Filter</strong> untuk menampilkan absensi.
          </div>
          <div v-else-if="loading" class="empty-state">Memuat absensi...</div>

          <template v-else>
            <article
              v-for="day in records"
              :key="day.date"
              class="attendance-row"
              :class="statusMeta(day).className"
            >
              <div class="row-top">
                <div class="date-stack">
                  <strong>{{ formatLongDate(day.date) }}</strong>
                  <span>Jadwal : {{ scheduleText(day) }}</span>
                </div>

                <span class="status-pill" :class="statusMeta(day).className">
                  {{ statusMeta(day).code }}
                </span>
              </div>

              <div class="row-scans">
                <div class="scan-col">
                  <span>Masuk</span>
                  <strong>{{ formatTime(day.scan_in) }}</strong>
                </div>
                <div class="scan-col">
                  <span>Keluar</span>
                  <strong>{{ formatTime(day.scan_out) }}</strong>
                </div>
              </div>

              <div class="row-footer">
                <span class="status-label">{{ statusMeta(day).label }}</span>
              </div>
            </article>

            <div v-if="!records.length" class="empty-state">
              Tidak ada data absensi pada rentang tanggal ini.
            </div>
          </template>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/vue'
import type { RefresherCustomEvent } from '@ionic/vue'
import { calendarOutline } from 'ionicons/icons'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { showAppAlert } from '@/services/alerts'
import { apiErrorMessage } from '@/services/api'
import { getStaffAttendance, type StaffAttendanceRecord, type StaffAttendanceResponse } from '@/services/staff'
import { formatTime, getAttendanceStatusMeta } from '@/utils/formatters'

const attendance = ref<StaffAttendanceResponse | null>(null)
const loading = ref(false)
const hasLoaded = ref(false)
const filters = reactive({
  start_date: '',
  end_date: '',
})

const records = computed<StaffAttendanceRecord[]>(() => attendance.value?.records || [])

const filterLabel = computed(() => {
  if (filters.start_date && filters.end_date) {
    return `${formatDateLong(filters.start_date)} - ${formatDateLong(filters.end_date)}`
  }

  if (filters.start_date) {
    return `Mulai ${formatDateLong(filters.start_date)}`
  }

  if (filters.end_date) {
    return `Sampai ${formatDateLong(filters.end_date)}`
  }

  return 'Pilih tanggal awal dan tanggal akhir'
})

function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return {
    start_date: dateKey(start),
    end_date: dateKey(end),
  }
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDateLong(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function scheduleText(day: StaffAttendanceRecord) {
  if (!day.schedule_code) {
    return '-'
  }

  if (day.schedule_start_time && day.schedule_end_time) {
    const start = day.schedule_start_time.slice(0, 5)
    const end = day.schedule_end_time.slice(0, 5)
    return `${day.schedule_code} (${start} - ${end})`
  }

  return day.schedule_code
}

function statusMeta(day: StaffAttendanceRecord) {
  const isComplete = day.is_complete || (day.scan_in !== null && day.scan_out !== null)
  return getAttendanceStatusMeta(day.status, isComplete, false)
}

async function loadAttendance() {
  loading.value = true

  try {
    const fallback = currentMonthRange()
    const start_date = filters.start_date || fallback.start_date
    const end_date = filters.end_date || fallback.end_date

    if (!filters.start_date) {
      filters.start_date = start_date
    }

    if (!filters.end_date) {
      filters.end_date = end_date
    }

    attendance.value = await getStaffAttendance(start_date, end_date)
    hasLoaded.value = true
  } catch (error) {
    await showAppAlert({
      header: 'Gagal Memuat Absensi',
      message: apiErrorMessage(error, 'Data absensi tidak dapat dimuat.'),
      type: 'danger',
    })
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  attendance.value = null
  hasLoaded.value = false
  filters.start_date = ''
  filters.end_date = ''
}

async function refresh(event: RefresherCustomEvent) {
  if (hasLoaded.value) {
    await loadAttendance()
  }

  event.target.complete()
}

onMounted(() => {
  window.addEventListener('attendance-submitted', loadAttendance)
})

onUnmounted(() => {
  window.removeEventListener('attendance-submitted', loadAttendance)
})
</script>

<style scoped>
.mobile-page {
  --background: var(--hris-bg);
}

.page-shell {
  min-height: 100%;
  padding: max(24px, env(safe-area-inset-top)) 16px 96px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.page-header p {
  margin: 0 0 3px;
  color: var(--ion-color-primary);
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0;
  color: var(--hris-text-light);
  font-size: 27px;
  font-weight: 800;
}

.page-header ion-icon {
  width: 46px;
  height: 46px;
  padding: 10px;
  border-radius: 12px;
  background: var(--hris-soft-surface);
  color: var(--ion-color-primary);
}

.hero-card,
.info-card,
.guide-header,
.guide-content {
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  border-radius: 18px;
}

.hero-card {
  padding: 18px;
  margin-bottom: 18px;
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--hris-soft-surface);
  color: var(--ion-color-primary);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.hero-card h2 {
  margin: 12px 0 8px;
  color: var(--hris-text-light);
  font-size: 27px;
  font-weight: 900;
}

.hero-card p,
.info-card p {
  margin: 0;
  color: var(--hris-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.filter-card,
.summary-card,
.attendance-row,
.empty-state {
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.filter-card {
  padding: 16px;
  border-radius: var(--hris-radius-xl);
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filter-header span {
  display: block;
  color: var(--hris-text-secondary);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.filter-header strong {
  display: block;
  margin-top: 4px;
  color: var(--hris-text-dark);
  font-size: 13px;
}

.reset-button {
  --color: var(--ion-color-primary);
  margin: 0;
}

.filter-form {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.filter-field {
  display: grid;
  gap: 6px;
}

.filter-field span {
  color: var(--hris-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.filter-field input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--hris-input-border);
  background: var(--hris-input-bg);
  color: var(--hris-text-dark);
}

.apply-button {
  height: 48px;
  --border-radius: 12px;
  --background: var(--hris-primary-button-bg);
  --background-activated: var(--hris-primary-button-bg-active);
  font-weight: 600;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.summary-card {
  padding: 14px 12px;
  border-radius: 16px;
}

.summary-card span {
  display: block;
  color: var(--hris-text-secondary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  color: var(--hris-text-dark);
  font-size: 20px;
  font-weight: 800;
}

.attendance-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.empty-state {
  padding: 26px 16px;
  border-radius: 12px;
  color: var(--hris-text-secondary);
  text-align: center;
  font-size: 13px;
}

.attendance-row {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: var(--hris-radius-lg);
}

.row-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.date-stack strong {
  display: block;
  color: var(--hris-text-dark);
  font-size: 15px;
}

.date-stack span {
  display: block;
  margin-top: 4px;
  color: var(--hris-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.row-scans {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.scan-col {
  background: var(--hris-soft-surface);
  border: 1px solid var(--hris-border);
  border-radius: 14px;
  padding: 10px 12px;
}

.scan-col span {
  display: block;
  color: var(--hris-text-secondary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.scan-col strong {
  display: block;
  margin-top: 6px;
  color: var(--hris-text-dark);
  font-size: 18px;
  font-weight: 800;
}

.row-footer {
  display: flex;
  justify-content: flex-start;
}

.status-pill {
  min-width: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.4px;
}

.status-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--hris-text-secondary);
}

.status-success {
  background: rgba(34, 197, 94, 0.16);
  color: #16A34A;
  border: 1px solid rgba(34, 197, 94, 0.24);
}

.status-warning {
  background: rgba(251, 191, 36, 0.18);
  color: #B45309;
  border: 1px solid rgba(251, 191, 36, 0.28);
}

.status-danger {
  background: rgba(239, 68, 68, 0.14);
  color: #DC2626;
  border: 1px solid rgba(239, 68, 68, 0.22);
}

.status-muted {
  background: rgba(100, 116, 139, 0.14);
  color: #64748B;
  border: 1px solid rgba(100, 116, 139, 0.22);
}

.status-holiday {
  background: rgba(167, 139, 250, 0.14);
  color: #7C3AED;
  border: 1px solid rgba(167, 139, 250, 0.22);
}

.status-leave {
  background: rgba(251, 191, 36, 0.14);
  color: #B45309;
  border: 1px solid rgba(251, 191, 36, 0.22);
}

.status-permit {
  background: rgba(96, 165, 250, 0.14);
  color: #2563EB;
  border: 1px solid rgba(96, 165, 250, 0.22);
}

.status-sick {
  background: rgba(20, 184, 166, 0.14);
  color: #0F766E;
  border: 1px solid rgba(20, 184, 166, 0.22);
}

@media (max-width: 420px) {
  .attendance-row {
    gap: 10px;
  }

  .row-scans {
    gap: 8px;
  }
}
</style>
