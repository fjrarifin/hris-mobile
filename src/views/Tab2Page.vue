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

        <div class="quick-filter-row" aria-label="Filter cepat absensi">
          <button
            v-for="option in quickFilterOptions"
            :key="option.value"
            type="button"
            class="quick-filter-chip"
            :class="{ 'quick-filter-chip--active': activeFilter === option.value }"
            @click="selectQuickFilter(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <section class="filter-card">
          <div class="filter-header">
            <div>
              <span>Filter Tanggal</span>
              <strong>{{ filterLabel }}</strong>
            </div>
            <ion-button fill="outline" size="small" class="reset-button" @click="resetFilters">
              Reset
            </ion-button>
          </div>

          <form class="filter-form" @submit.prevent="loadAttendance()">
            <label class="filter-field">
              <span>Tanggal Awal</span>
              <input v-model="filters.start_date" type="date" @input="markCustomFilter" />
            </label>
            <label class="filter-field">
              <span>Tanggal Akhir</span>
              <input v-model="filters.end_date" type="date" @input="markCustomFilter" />
            </label>
            <ion-button type="submit" fill="outline" expand="block" class="apply-button" :disabled="loading">
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
                <span v-if="day.is_corrected" class="status-label correction-note">
                  <br>⚠️ {{ day.correction_notes || 'Diperbaiki otomatis oleh HRD' }}
                </span>
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
  IonPage,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/vue'
import type { RefresherCustomEvent } from '@ionic/vue'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { showAppAlert } from '@/services/alerts'
import { apiErrorMessage } from '@/services/api'
import { getStaffAttendance, type StaffAttendanceRecord, type StaffAttendanceResponse } from '@/services/staff'
import { formatTime, getAttendanceStatusMeta } from '@/utils/formatters'

const route = useRoute()
const attendance = ref<StaffAttendanceResponse | null>(null)
const loading = ref(false)
const hasLoaded = ref(false)
type AttendanceQuickFilter = '7d' | '30d' | 'month' | 'custom'
const activeFilter = ref<AttendanceQuickFilter>('7d')
const filters = reactive({
  start_date: '',
  end_date: '',
})

const records = computed<StaffAttendanceRecord[]>(() => attendance.value?.records || [])
const quickFilterOptions: Array<{ label: string; value: AttendanceQuickFilter }> = [
  { label: '7 hari', value: '7d' },
  { label: '30 hari', value: '30d' },
  { label: 'Bulan ini', value: 'month' },
  { label: 'Kustom', value: 'custom' },
]

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

function recentDaysRange(days: number) {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - (days - 1))

  return {
    start_date: dateKey(start),
    end_date: dateKey(now),
  }
}

function rangeForFilter(filter: AttendanceQuickFilter) {
  if (filter === '7d') return recentDaysRange(7)
  if (filter === '30d') return recentDaysRange(30)
  if (filter === 'month') return currentMonthRange()

  return {
    start_date: filters.start_date,
    end_date: filters.end_date,
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

async function loadAttendance(force = false) {
  loading.value = true

  try {
    const fallback = activeFilter.value === 'custom' ? currentMonthRange() : rangeForFilter(activeFilter.value)
    const start_date = filters.start_date || fallback.start_date
    const end_date = filters.end_date || fallback.end_date

    if (!filters.start_date) {
      filters.start_date = start_date
    }

    if (!filters.end_date) {
      filters.end_date = end_date
    }

    attendance.value = await getStaffAttendance(start_date, end_date, {
      force,
      range: activeFilter.value,
    })
    filters.start_date = attendance.value.filters.start_date
    filters.end_date = attendance.value.filters.end_date
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
  void selectQuickFilter('7d', true)
}

async function selectQuickFilter(filter: AttendanceQuickFilter, force = false) {
  activeFilter.value = filter

  if (filter !== 'custom') {
    const range = rangeForFilter(filter)
    filters.start_date = range.start_date
    filters.end_date = range.end_date
    await loadAttendance(force)
  }
}

function markCustomFilter() {
  activeFilter.value = 'custom'
}

function applyQueryFilters() {
  const startDate = typeof route.query.start_date === 'string' ? route.query.start_date : ''
  const endDate = typeof route.query.end_date === 'string' ? route.query.end_date : ''

  if (!startDate && !endDate) {
    return false
  }

  filters.start_date = startDate || endDate
  filters.end_date = endDate || startDate
  activeFilter.value = 'custom'

  return true
}

function handleAttendanceSubmitted() {
  void loadAttendance(true)
}

watch(
  () => route.fullPath,
  () => {
    if (applyQueryFilters()) {
      void loadAttendance()
    }
  },
)

async function refresh(event: RefresherCustomEvent) {
  if (hasLoaded.value) {
    await loadAttendance(true)
  }

  event.target.complete()
}

onMounted(() => {
  if (applyQueryFilters()) {
    void loadAttendance()
  } else {
    void selectQuickFilter('7d')
  }

  window.addEventListener('attendance-submitted', handleAttendanceSubmitted)
})

onUnmounted(() => {
  window.removeEventListener('attendance-submitted', handleAttendanceSubmitted)
})
</script>

<style scoped>
.mobile-page {
  --background: var(--hris-bg);
}

.page-shell {
  min-height: 100%;
  padding: max(18px, env(safe-area-inset-top)) 14px 84px;
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
  padding: 14px;
  margin-bottom: 12px;
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--hris-soft-surface);
  color: var(--ion-color-primary);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.hero-card h2 {
  margin: 9px 0 6px;
  color: var(--hris-text-light);
  font-size: 20px;
  font-weight: 900;
}

.hero-card p,
.info-card p {
  margin: 0;
  color: var(--hris-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.quick-filter-row {
  display: flex;
  gap: 10px;
  margin: 0 0 14px;
  overflow-x: auto;
  scrollbar-width: none;
}

.quick-filter-row::-webkit-scrollbar {
  display: none;
}

.quick-filter-chip {
  flex: 0 0 auto;
  min-height: 30px;
  padding: 0 15px;
  border-radius: 999px;
  border: 1px solid var(--hris-border);
  background: var(--hris-card-bg);
  color: var(--hris-text-secondary);
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
}

.quick-filter-chip--active {
  border-color: var(--ion-color-primary);
  background: #EFF6FF;
  color: var(--ion-color-primary);
}

:root[data-theme="dark"] .quick-filter-chip {
  background: rgba(255, 255, 255, 0.12);
  color: #E2E8F0;
}

:root[data-theme="dark"] .quick-filter-chip--active {
  border-color: #60A5FA;
  background: rgba(96, 165, 250, 0.18);
  color: #93C5FD;
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
  border-radius: 16px;
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
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.filter-header strong {
  display: block;
  margin-top: 4px;
  color: var(--hris-text-dark);
  font-size: 12px;
}

.reset-button {
  min-width: 72px;
  height: 36px;
  --border-radius: 8px;
  --border-color: var(--hris-input-border);
  --border-style: solid;
  --border-width: 1px;
  --color: var(--hris-text-dark);
  --padding-start: 14px;
  --padding-end: 14px;
  margin: 0;
  font-weight: 800;
}

.filter-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 10px;
  margin-top: 16px;
}

.filter-field {
  display: grid;
  gap: 4px;
}

.filter-field span {
  color: var(--hris-text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.filter-field input {
  width: 100%;
  min-height: 38px;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid var(--hris-input-border);
  background: var(--hris-input-bg);
  color: var(--hris-text-dark);
  font-size: 12px;
  font-weight: 700;
}

.apply-button {
  grid-column: 1 / -1;
  height: 40px;
  --border-radius: 10px;
  --background: transparent;
  --background-activated: var(--hris-soft-surface);
  --box-shadow: none;
  --border-color: var(--hris-input-border);
  --border-style: solid;
  --border-width: 1px;
  --color: var(--hris-text-dark);
  font-size: 12px;
  font-weight: 900;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.summary-card {
  padding: 10px 9px;
  border-radius: 13px;
}

.summary-card span {
  display: block;
  color: var(--hris-text-secondary);
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
}

.summary-card strong {
  display: block;
  margin-top: 5px;
  color: var(--hris-text-dark);
  font-size: 17px;
  font-weight: 800;
}

.attendance-list {
  display: grid;
  gap: 9px;
  margin-top: 12px;
}

.empty-state {
  padding: 18px 13px;
  border-radius: 12px;
  color: var(--hris-text-secondary);
  text-align: center;
  font-size: 12px;
}

.attendance-row {
  display: grid;
  gap: 9px;
  padding: 12px;
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
  font-size: 13px;
}

.date-stack span {
  display: block;
  margin-top: 4px;
  color: var(--hris-text-secondary);
  font-size: 11px;
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
  border-radius: 11px;
  padding: 8px 10px;
}

.scan-col span {
  display: block;
  color: var(--hris-text-secondary);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.scan-col strong {
  display: block;
  margin-top: 4px;
  color: var(--hris-text-dark);
  font-size: 15px;
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
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.4px;
}

.status-label {
  font-size: 11px;
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

.correction-note {
  color: #B45309;
  font-weight: 600;
  line-height: 1.4;
  margin-top: 4px;
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
