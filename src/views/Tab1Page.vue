<template>
  <ion-page>
    <ion-content fullscreen class="dash-page" :scroll-y="true">
      <main class="dash-shell">
        <header class="topbar">
          <div class="brand">
            <img class="brand-logo" :src="backendLogoUrl" alt="HomPimPlay" />
            <!-- <div class="brand-mark">
            </div> -->
            <span>HomPim Play</span>
          </div>
          <div class="topbar-actions">
            <button type="button" class="notification-btn" aria-label="Notifikasi">
              <ion-icon :icon="notificationsOutline" />
            </button>
          </div>
        </header>

        <section class="hero-panel">
          <div class="hero-copy">
            <p class="hero-greeting">{{ greetingLabel }} 👋</p>
            <h2 class="hero-name">{{ employeeName }}</h2>
            <div class="hero-tags">
              <span class="hero-tag hero-tag--success">{{ todayStatusLabel }}</span>
              <span class="hero-tag hero-tag--soft">{{ employeeNik }}</span>
            </div>
          </div>
        </section>

        <section class="today-card">
          <div>
            <p class="today-label">Masuk</p>
            <strong class="today-time" :class="{ 'today-time--set': todayAttendance?.scan_in }">
              {{ formatTime(todayAttendance?.scan_in) || '-:--' }}
            </strong>
          </div>
          <div>
            <p class="today-label">Pulang</p>
            <strong class="today-time" :class="{ 'today-time--set': todayAttendance?.scan_out }">
              {{ formatTime(todayAttendance?.scan_out) || '-:--' }}
            </strong>
          </div>
        </section>

        <section class="stats-row">
          <article v-for="item in summaryCards" :key="item.label" class="stat-card">
            <div class="stat-icon-wrap" :style="{ background: item.bg }">
              <ion-icon :icon="item.icon" :style="{ color: item.color }" />
            </div>
            <div class="stat-copy">
              <span class="stat-lbl">{{ item.label }}</span>
              <strong class="stat-val">{{ item.value }}</strong>
            </div>
          </article>
        </section>

        <div class="section-label">Menu cepat</div>
        <div class="quick-grid">
          <button
            v-for="action in quickActions"
            :key="action.label"
            type="button"
            class="quick-item"
            @click="openFeature(action.path, action.label)"
          >
            <span class="quick-icon" :style="{ background: action.bg }">
              <ion-icon :icon="action.icon" />
            </span>
            <span class="quick-text">
              <strong>{{ action.label }}</strong>
              <small>{{ action.hint }}</small>
            </span>
          </button>
        </div>

        <section class="attendance-panel">
          <div class="attendance-header">
            <div>
              <h3 class="attendance-title">{{ calendarTitle }}</h3>
              <p class="attendance-subtitle">
                {{ calendarAttendanceCount }} hari tercatat, {{ calendarIncompleteCount }} belum lengkap.
              </p>
            </div>

            <div class="calendar-nav">
              <button
                type="button"
                class="calendar-nav-btn"
                :disabled="calendarLoading"
                aria-label="Bulan sebelumnya"
                @click="changeCalendarMonth(-1)"
              >
                <ion-icon :icon="chevronBackOutline" />
              </button>
              <button
                type="button"
                class="calendar-nav-btn"
                :disabled="calendarLoading"
                aria-label="Bulan berikutnya"
                @click="changeCalendarMonth(1)"
              >
                <ion-icon :icon="chevronForwardOutline" />
              </button>
            </div>
          </div>

          <div v-if="calendarLoading" class="loading-state">Memuat kalender...</div>
          <div v-else class="attendance-calendar">
            <div class="calendar-weekdays">
              <span v-for="day in weekDays" :key="day">{{ day }}</span>
            </div>

            <div class="calendar-grid">
              <article
                v-for="day in calendarDays"
                :key="day.key"
                :class="[
                  'calendar-cell',
                  day.inMonth ? 'calendar-cell--in-month' : 'calendar-cell--outside',
                  day.status ? `calendar-cell--${day.status}` : '',
                  day.isToday ? 'calendar-cell--today' : '',
                ]"
              >
                <template v-if="day.inMonth">
                  <strong class="calendar-date">{{ day.dateNumber }}</strong>
                  <span v-if="day.code" class="calendar-code">{{ day.code }}</span>
                </template>
              </article>
            </div>
          </div>
        </section>

        <div class="legend-row">
          <span v-for="item in legendItems" :key="item.label" class="legend-item">
            <span class="legend-dot" :style="{ background: item.color }" />
            <span class="legend-code">{{ item.code }}</span>
            <span class="legend-separator">=</span>
            <span class="legend-label">{{ item.label }}</span>
          </span>
        </div>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/vue'
import {
  cameraOutline,
  calendarClearOutline,
  chevronBackOutline,
  chevronForwardOutline,
  documentTextOutline,
  fingerPrintOutline,
  medkitOutline,
  notificationsOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
  walletOutline,
} from 'ionicons/icons'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showAppAlert } from '@/services/alerts'
import { BACKEND_LOGO_URL, apiErrorMessage } from '@/services/api'
import {
  getStaffAttendance,
  getStaffDashboard,
  type StaffAttendanceResponse,
  type StaffDashboard,
} from '@/services/staff'
import { formatTime, weeklyAttendanceLabel } from '@/utils/formatters'

const router = useRouter()
const dashboard = ref<StaffDashboard | null>(null)
const attendance = ref<StaffAttendanceResponse | null>(null)
const calendarLoading = ref(true)
const calendarMonth = ref(monthKeyFromDate(new Date()))
const currentTime = ref(new Date())
const backendLogoUrl = BACKEND_LOGO_URL
let greetingTimer: number | null = null

const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

interface CalendarDay {
  key: string
  inMonth: boolean
  dateNumber?: number
  isToday?: boolean
  isFuture?: boolean
  record?: StaffAttendanceResponse['records'][number] | null
  status?: 'present' | 'warning' | 'absent' | 'future' | 'holiday' | 'leave' | 'permit' | 'sick'
  code?: string
}

const employeeName = computed(() =>
  dashboard.value?.employee.name || 'Karyawan',
)
const employeeNik = computed(() =>
  dashboard.value?.employee.nik || '-',
)
const todayAttendance = computed(() => {
  const today = dashboard.value?.as_of_date
  return dashboard.value?.weekly_attendance.days.find((day) => day.date === today)
})

const todayStatusLabel = computed(() => {
  const status = todayAttendance.value?.status
  if (status === 'completed' || status === 'late_completed') return 'Selesai'
  return status ? weeklyAttendanceLabel(status) : 'Belum Absen'
})

const greetingLabel = computed(() => {
  const hour = currentTime.value.getHours()

  if (hour >= 4 && hour < 11) return 'Selamat pagi'
  if (hour >= 11 && hour < 15) return 'Selamat siang'
  if (hour >= 15 && hour < 18) return 'Selamat sore'
  return 'Selamat malam'
})

const summaryCards = computed(() => [
  // {
  //   label: 'Total Hadir',
  //   value: dashboard.value?.summary.attendance_days ?? '-',
  //   icon: shieldCheckmarkOutline,
  //   bg: 'rgba(34,197,94,0.12)',
  //   color: '#22C55E',
  // },
  {
    label: 'Jatah Cuti',
    value: dashboard.value?.summary.leave_balance ?? '-',
    icon: calendarClearOutline,
    bg: 'rgba(251,191,36,0.12)',
    color: '#FBBF24',
  },
  {
    label: 'Jatah PH',
    value: dashboard.value?.summary.public_holiday_balance ?? '-',
    icon: walletOutline,
    bg: 'rgba(167,139,250,0.12)',
    color: '#A78BFA',
  },
])

const quickActions = computed(() => [
  { label: 'Absensi', hint: 'Riwayat hadir', icon: fingerPrintOutline, path: '/tabs/attendance', bg: 'rgba(59,130,246,0.12)' },
  { label: 'Cuti', hint: 'Ajukan cuti', icon: calendarClearOutline, path: '', bg: 'rgba(34,197,94,0.12)' },
  { label: 'Izin', hint: 'Ajukan izin', icon: documentTextOutline, path: '', bg: 'rgba(251,191,36,0.12)' },
  { label: 'PH', hint: 'Hari libur', icon: shieldCheckmarkOutline, path: '', bg: 'rgba(167,139,250,0.12)' },
  { label: 'Sakit', hint: 'Lapor sakit', icon: medkitOutline, path: '', bg: 'rgba(244,63,94,0.12)' },
  { label: 'Profil', hint: 'Data diri', icon: personCircleOutline, path: '/tabs/profile', bg: 'rgba(148,163,184,0.18)' },
])

const attendanceRecordsByDate = computed(
  () => new Map((attendance.value?.records || []).map((record) => [record.date, record])),
)

const calendarTitle = computed(() =>
  new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
    monthStartFromKey(calendarMonth.value),
  ),
)

const calendarAttendanceCount = computed(() => attendance.value?.summary.attendance_days ?? 0)
const calendarIncompleteCount = computed(() => attendance.value?.summary.incomplete_days ?? 0)

const calendarDays = computed(() => {
  const start = monthStartFromKey(calendarMonth.value)
  const year = start.getFullYear()
  const month = start.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingDays = start.getDay()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const items: CalendarDay[] = []

  for (let index = 0; index < leadingDays; index += 1) {
    items.push({
      key: `leading-${index}`,
      inMonth: false,
    })
  }

  for (let dateNumber = 1; dateNumber <= daysInMonth; dateNumber += 1) {
    const current = new Date(year, month, dateNumber)
    const key = dateKeyFromDate(current)
    const record = attendanceRecordsByDate.value.get(key)
    const isFuture = current.getTime() > today.getTime()
    const status = resolveCalendarStatus(record, isFuture)

    items.push({
      key,
      inMonth: true,
      dateNumber,
      isToday: key === dateKeyFromDate(today),
      isFuture,
      record,
      status,
      code: resolveCalendarCode(record, isFuture),
    })
  }

  while (items.length % 7 !== 0) {
    items.push({
      key: `trailing-${items.length}`,
      inMonth: false,
    })
  }

  return items
})

const legendItems = [
  { code: 'M', label: 'Masuk', color: '#22C55E' },
  { code: 'A', label: 'Alfa / Tidak Hadir', color: '#EF4444' },
  { code: 'PH', label: 'Public Holiday', color: '#A78BFA' },
  { code: 'C', label: 'Cuti', color: '#FBBF24' },
  { code: 'I', label: 'Izin', color: '#60A5FA' },
  { code: 'S', label: 'Sakit', color: '#14B8A6' },
  { code: 'L', label: 'Libur', color: 'var(--hris-text-secondary)' },
]

function dateKeyFromDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function monthKeyFromDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function monthStartFromKey(value: string) {
  const [year, month] = value.split('-').map(Number)

  return new Date(year, month - 1, 1)
}

function monthEndFromKey(value: string) {
  const start = monthStartFromKey(value)
  return new Date(start.getFullYear(), start.getMonth() + 1, 0)
}

function resolveCalendarStatus(
  record: StaffAttendanceResponse['records'][number] | undefined,
  isFuture: boolean,
): CalendarDay['status'] {
  if (isFuture) {
    return 'future'
  }

  const status = record?.status?.toLowerCase()

  if (status === 'public_holiday' || status === 'ph') return 'holiday'
  if (status === 'leave' || status === 'cuti') return 'leave'
  if (status === 'permission' || status === 'izin') return 'permit'
  if (status === 'sick' || status === 'sakit') return 'sick'

  if (record) {
    return record.is_complete ? 'present' : 'warning'
  }

  return 'absent'
}

function resolveCalendarCode(
  record: StaffAttendanceResponse['records'][number] | undefined,
  isFuture: boolean,
) {
  if (isFuture) return ''

  const status = record?.status?.toLowerCase()
  if (status === 'public_holiday' || status === 'ph') return 'PH'
  if (status === 'leave' || status === 'cuti') return 'C'
  if (status === 'permission' || status === 'izin') return 'I'
  if (status === 'sick' || status === 'sakit') return 'S'
  if (status === 'holiday' || status === 'libur' || status === 'off') return 'L'

  return record ? 'M' : 'A'
}

async function loadAttendanceCalendar() {
  if (!dashboard.value) {
    return
  }

  calendarLoading.value = true

  try {
    const start = monthStartFromKey(calendarMonth.value)
    const end = monthEndFromKey(calendarMonth.value)
    attendance.value = await getStaffAttendance(dateKeyFromDate(start), dateKeyFromDate(end))
  } catch (error) {
    await showAppAlert({
      header: 'Gagal Memuat Kalender',
      message: apiErrorMessage(error, 'Kalender absensi tidak dapat dimuat.'),
      type: 'danger',
    })
  } finally {
    calendarLoading.value = false
  }
}

async function loadDashboard() {
  try {
    dashboard.value = await getStaffDashboard()
    calendarMonth.value = monthKeyFromDate(new Date(dashboard.value.as_of_date))
    await loadAttendanceCalendar()
  } catch (error) {
    await showAppAlert({
      header: 'Gagal Memuat Dashboard',
      message: apiErrorMessage(error, 'Ringkasan dashboard tidak dapat dimuat.'),
      type: 'danger',
    })
    calendarLoading.value = false
  }
}

async function changeCalendarMonth(offset: number) {
  const current = monthStartFromKey(calendarMonth.value)
  current.setMonth(current.getMonth() + offset)
  calendarMonth.value = monthKeyFromDate(current)
  await loadAttendanceCalendar()
}

function openSelfAttendance() {
  window.dispatchEvent(new CustomEvent('open-self-attendance'))
}

function openFeature(path: string, label: string) {
  if (path) {
    router.push(path)
    return
  }

  void showAppAlert({
    header: label,
    message: `${label} akan tersedia pada pembaruan berikutnya.`,
    type: 'info',
  })
}

onMounted(() => {
  const updateGreetingTime = () => {
    currentTime.value = new Date()
  }

  updateGreetingTime()
  greetingTimer = window.setInterval(updateGreetingTime, 60000)
  loadDashboard()
  window.addEventListener('attendance-submitted', loadDashboard)
})

onUnmounted(() => {
  if (greetingTimer) {
    window.clearInterval(greetingTimer)
    greetingTimer = null
  }
  window.removeEventListener('attendance-submitted', loadDashboard)
})
</script>

<style scoped>
.dash-page {
  --background: var(--hris-bg);
}

.dash-shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: max(18px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom));
  gap: 10px;
  overflow: visible;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 6px 2px 2px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--hris-text-light);
  letter-spacing: -0.5px;
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.brand-logo {
  width: 58px;
  object-fit: contain;
  flex-shrink: 0;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-btn {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid var(--hris-border);
  background: var(--hris-card-bg);
  color: var(--hris-text-dark);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.notification-btn ion-icon {
  font-size: 22px;
}

.theme-toggle {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.16);
}

.theme-toggle ion-icon {
  font-size: 18px;
}

.hero-panel {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  background: linear-gradient(180deg, #2740a8 0%, #22378f 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 16px 16px 14px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
}

.hero-copy {
  min-width: 0;
}

.hero-greeting {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.84);
}

.hero-name {
  margin: 6px 0 10px;
  font-size: 24px;
  font-weight: 800;
  color: #fff;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-tag {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
}

.hero-tag--success {
  background: rgba(16, 185, 129, 0.18);
  color: #B7F7D0;
}

.hero-tag--soft {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.82);
}

.hero-cta {
  flex-shrink: 0;
  height: 46px;
  padding: 0 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.16);
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
}

.hero-cta ion-icon {
  font-size: 16px;
}

.today-card {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  border-radius: 18px;
  padding: 14px 16px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.today-label {
  margin: 0 0 5px;
  color: var(--hris-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.today-time {
  display: block;
  color: #16A34A;
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
}

.today-time--set {
  color: #16A34A;
}

.today-cta {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #1E3A8A, #203c97);
  color: #fff;
  font-weight: 800;
  font-size: 13px;
  box-shadow: 0 10px 18px rgba(37, 99, 235, 0.18);
}

.stats-row {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  border-radius: 18px;
  padding: 12px 12px 11px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.stat-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-icon-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  background: transparent !important;
  padding: 0;
  flex-shrink: 0;
}

.stat-icon-wrap ion-icon {
  font-size: 22px;
  flex-shrink: 0;
}

.stat-val {
  font-size: 16px;
  font-weight: 800;
  color: var(--hris-text-dark);
  line-height: 1;
}

.stat-lbl {
  font-size: 10px;
  font-weight: 600;
  color: var(--hris-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.section-label {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  color: var(--hris-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: -4px;
}

.quick-grid {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.quick-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  border-radius: 18px;
  padding: 14px 14px;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  text-align: left;
}

.quick-item:hover {
  background: var(--hris-soft-surface);
}

.quick-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--ion-color-primary);
  flex-shrink: 0;
}

.quick-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.quick-text strong {
  font-size: 13px;
  font-weight: 800;
  color: var(--hris-text-dark);
}

.quick-text small {
  font-size: 11px;
  font-weight: 600;
  color: var(--hris-text-secondary);
}

.attendance-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  border-radius: 18px;
  padding: 12px;
  overflow: hidden;
}

.attendance-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.attendance-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--hris-text-light);
  text-transform: capitalize;
}

.attendance-subtitle {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--hris-text-secondary);
}

.calendar-nav {
  display: inline-flex;
  gap: 8px;
  flex-shrink: 0;
}

.calendar-nav-btn {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  border: 1px solid var(--hris-border);
  background: var(--hris-soft-surface);
  color: var(--hris-text-dark);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.calendar-nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.calendar-nav-btn ion-icon {
  font-size: 16px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--hris-text-secondary);
  font-size: 13px;
  min-height: 240px;
}

.attendance-calendar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.calendar-weekdays span {
  text-align: center;
  font-size: 9px;
  font-weight: 700;
  color: var(--hris-text-secondary);
  text-transform: uppercase;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.calendar-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  border: 1px solid var(--hris-border);
  padding: 8px;
  background: var(--hris-soft-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.calendar-cell--outside {
  background: var(--hris-soft-surface-2);
  border-style: dashed;
}

.calendar-date {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 12px;
  font-weight: 800;
  color: var(--hris-text-dark);
  line-height: 1;
}

.calendar-code {
  min-width: 22px;
  padding: 3px 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  text-align: center;
  letter-spacing: 0.2px;
  color: var(--hris-text-light);
  background: var(--hris-soft-surface-2);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.05) inset;
}

.calendar-cell--present {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.22);
}

.calendar-cell--warning {
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(251, 191, 36, 0.35);
}

.calendar-cell--absent {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.18);
}

.calendar-cell--holiday {
  background: rgba(167, 139, 250, 0.12);
  border-color: rgba(167, 139, 250, 0.22);
}

.calendar-cell--leave {
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.22);
}

.calendar-cell--permit {
  background: rgba(96, 165, 250, 0.12);
  border-color: rgba(96, 165, 250, 0.22);
}

.calendar-cell--sick {
  background: rgba(20, 184, 166, 0.12);
  border-color: rgba(20, 184, 166, 0.22);
}

.calendar-cell--future {
  background: rgba(255, 255, 255, 0.03);
}

.calendar-cell--today {
  border-color: #3b82f6;
  box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.35);
}

.calendar-cell--present .calendar-code {
  background: rgba(34, 197, 94, 0.2);
}

.calendar-cell--warning .calendar-code {
  background: rgba(251, 191, 36, 0.24);
  color: #1f2937;
}

.calendar-cell--absent .calendar-code {
  background: rgba(239, 68, 68, 0.22);
}

.calendar-cell--holiday .calendar-code {
  background: rgba(167, 139, 250, 0.22);
}

.calendar-cell--leave .calendar-code {
  background: rgba(251, 191, 36, 0.22);
  color: #1f2937;
}

.calendar-cell--permit .calendar-code {
  background: rgba(96, 165, 250, 0.22);
}

.calendar-cell--sick .calendar-code {
  background: rgba(20, 184, 166, 0.22);
}

.calendar-cell--future .calendar-code {
  background: rgba(255, 255, 255, 0.08);
}

.legend-row {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding-bottom: 2px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--hris-text-secondary);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-code {
  font-weight: 800;
  color: var(--hris-text-dark);
}

.legend-separator {
  color: var(--hris-text-secondary);
}

.legend-label {
  color: var(--hris-text-secondary);
}

@media (max-width: 380px) {
  .dash-shell {
    padding-left: 12px;
    padding-right: 12px;
  }

  .calendar-cell {
    padding: 7px;
  }

  .calendar-code {
    font-size: 10px;
  }
}

:root[data-theme="light"] .greeting-name,
:root[data-theme="light"] .greeting-action-btn,
:root[data-theme="light"] .greeting-chip {
  color: #fff;
}
</style>
