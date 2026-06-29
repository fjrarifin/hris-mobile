<template>
  <ion-page>
    <ion-content fullscreen class="dash-page" :scroll-y="true">
      <ion-refresher slot="fixed" @ionRefresh="refreshHome" :pull-min="60">
        <ion-refresher-content
          pulling-icon="none"
          :refreshing-spinner="null"
        >
          <template #default>
            <div class="refresh-pill-wrap">
              <div class="refresh-pill">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="refresh-pill-text">Memperbarui...</span>
              </div>
            </div>
          </template>
        </ion-refresher-content>
      </ion-refresher>
      <main class="dash-shell">
        <section class="header-gradient">
          <header class="topbar">
            <div class="brand">
              <img class="brand-logo" :src="BACKEND_LOGO_URL" alt="HomPimPlay" />
              <!-- <div class="brand-mark">
              </div> -->
              <span>HomPim Play | CV. 3 Detik</span>
            </div>
            <div class="topbar-actions">
              <button
                type="button"
                class="notification-btn"
                aria-label="Cari karyawan"
                @click="openEmployeeSearch"
              >
                <ion-icon :icon="searchOutline" />
              </button>
              <button
                type="button"
                class="notification-btn"
                aria-label="Buka notifikasi"
                @click="openNotifications"
              >
                <ion-icon :icon="notificationsOutline" />
                <span v-if="unreadNotificationTotal" class="notification-badge">{{ unreadNotificationTotal }}</span>
              </button>
            </div>
          </header>

          <section class="hero-panel">
            <div class="hero-person">
              <div class="employee-avatar" aria-hidden="true">
                <SecureImage
                  v-if="employeePhotoUrl"
                  :src="employeePhotoUrl"
                  alt="Foto karyawan"
                />
                <span v-else>{{ employeeInitials }}</span>
              </div>
              <div class="hero-copy">
                <p class="hero-greeting">{{ greetingLabel }} 👋</p>
                <h2 class="hero-name">{{ employeeName }}</h2>
                <!-- <div class="hero-tags">
                  <span class="hero-tag hero-tag--success">{{ todayStatusLabel }}</span>
                  <span class="hero-tag hero-tag--soft">{{ employeeNik }}</span>
                </div> -->
              </div>
            </div>
          </section>

          <section class="today-card">
            <div class="today-card-head">
              <p class="today-date">
                Hari ini <strong>{{ todayDateLabel }}</strong>
              </p>
              <p class="today-shift">{{ todayShiftLabel }}</p>
            </div>

            <div class="today-times">
              <div class="today-time-item">
                <span class="today-time-dot today-time-dot--in" />
                <strong class="today-time" :class="{ 'today-time--set': todayAttendance?.scan_in }">
                  {{ formatTime(todayAttendance?.scan_in) || '-:--' }}
                </strong>
                <span class="today-label">Masuk</span>
              </div>
              <div class="today-time-item">
                <span class="today-time-dot today-time-dot--out" />
                <strong class="today-time" :class="{ 'today-time--set': todayAttendance?.scan_out }">
                  {{ formatTime(todayAttendance?.scan_out) || '-:--' }}
                </strong>
                <span class="today-label">Pulang</span>
              </div>
            </div>
          </section>
        </section>

        <!-- <section class="stats-row">
          <article v-for="item in summaryCards" :key="item.label" class="stat-card">
            <div class="stat-icon-wrap" :style="{ background: item.bg }">
              <ion-icon :icon="item.icon" :style="{ color: item.color }" />
            </div>
            <div class="stat-copy">
              <span class="stat-lbl">{{ item.label }}</span>
              <strong class="stat-val">{{ item.value }}</strong>
            </div>
          </article>
        </section> -->

        <div class="quick-header">
          <div class="section-label">Menu cepat</div>
          <button type="button" class="quick-see-all" @click="quickMenuOpen = true">
            Lihat Semua ->
          </button>
        </div>
        <div class="quick-scroller">
          <button
            v-for="action in quickActions"
            :key="action.label"
            type="button"
            class="quick-item"
            @click="openFeature(action)"
          >
            <span class="quick-icon" :style="{ background: action.bg }">
              <ion-icon :icon="action.icon" />
            </span>
            <span class="quick-text">
              <strong>{{ action.label }}</strong>
            </span>
          </button>
        </div>

        <section
          class="attendance-panel"
          @touchstart.passive="startCalendarSwipe"
          @touchend.passive="finishCalendarSwipe"
        >
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

      <ion-modal :is-open="quickMenuOpen" class="quick-menu-modal" @didDismiss="closeQuickMenu">
        <section class="quick-menu-dialog">
          <header class="quick-menu-head">
            <div>
              <span>Menu cepat</span>
              <h2>Semua Menu</h2>
            </div>
            <button type="button" aria-label="Tutup menu cepat" @click="closeQuickMenu">
              <ion-icon :icon="closeOutline" />
            </button>
          </header>

          <div class="quick-menu-grid">
            <button
              v-for="action in quickActions"
              :key="action.label"
              type="button"
              class="quick-menu-item"
              @click="openFeature(action)"
            >
              <span class="quick-icon" :style="{ background: action.bg }">
                <ion-icon :icon="action.icon" />
              </span>
              <strong>{{ action.label }}</strong>
              <small>{{ action.hint }}</small>
            </button>
          </div>
        </section>
      </ion-modal>

      <ion-modal :is-open="employeeSearchOpen" class="employee-search-modal" @didDismiss="closeEmployeeSearch">
        <section class="employee-search-shell">
          <header class="employee-search-header">
            <button type="button" aria-label="Tutup pencarian" @click="closeEmployeeSearch">
              <ion-icon :icon="chevronBackOutline" />
            </button>
            <label class="employee-search-field">
              <ion-icon :icon="searchOutline" aria-hidden="true" />
              <input
                ref="employeeSearchInput"
                v-model.trim="employeeSearchQuery"
                type="search"
                inputmode="search"
                autocomplete="off"
                placeholder="Cari nama karyawan"
              />
            </label>
          </header>

          <div class="employee-search-body">
            <p v-if="employeeSearchQuery.length < 3" class="employee-search-state">
              Ketik minimal 3 huruf untuk mencari karyawan.
            </p>
            <p v-else-if="employeeSearchLoading" class="employee-search-state">
              Mencari karyawan...
            </p>
            <p v-else-if="employeeSearchError" class="employee-search-state employee-search-state--danger">
              {{ employeeSearchError }}
            </p>
            <p v-else-if="!employeeSearchResults.length" class="employee-search-state">
              Tidak ada karyawan yang cocok.
            </p>

            <button
              v-for="employee in employeeSearchResults"
              :key="employee.nik"
              type="button"
              class="employee-result"
              @click="openEmployeeProfile(employee.nik)"
            >
              <span class="employee-result-avatar">{{ employeeResultInitials(employee.name) }}</span>
              <span class="employee-result-copy">
                <strong>{{ employee.name }}</strong>
                <small>{{ employee.position || 'Karyawan' }} · {{ employee.department || employee.unit || '-' }}</small>
              </span>
              <span class="employee-result-nik">{{ employee.nik }}</span>
            </button>
          </div>
        </section>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonContent,
  IonIcon,
  IonModal,
  IonPage,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/vue'
import type { RefresherCustomEvent } from '@ionic/vue'
import {
  calendarClearOutline,
  calendarOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  documentTextOutline,
  fingerPrintOutline,
  bookOutline,
  checkboxOutline,
  layersOutline,
  notificationsOutline,
  peopleOutline,
  personCircleOutline,
  searchOutline,
  shieldCheckmarkOutline,
  timerOutline,
} from 'ionicons/icons'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import SecureImage from '@/components/SecureImage.vue'
import { showAppAlert } from '@/services/alerts'
import { BACKEND_LOGO_URL, apiErrorMessage } from '@/services/api'
import { authState, refreshSession } from '@/services/auth'
import {
  getStaffAttendance,
  getStaffDashboard,
  type StaffScheduleRecord,
  type StaffAttendanceResponse,
  type StaffDashboard,
  type StaffEmployeeSearchResult,
  searchStaffEmployees,
} from '@/services/staff'
import { formatTime, weeklyAttendanceLabel } from '@/utils/formatters'
import {
  NOTIFICATIONS_CHANGED_EVENT,
  unreadNotificationCount,
} from '@/services/notifications'
import { checkForAppUpdate } from '@/services/appUpdate'

const router = useRouter()
const dashboard = ref<StaffDashboard | null>(null)
const attendance = ref<StaffAttendanceResponse | null>(null)
const calendarLoading = ref(true)
const calendarMonth = ref(monthKeyFromDate(new Date()))
const currentTime = ref(new Date())
const unreadNotificationTotal = ref(0)
const quickMenuOpen = ref(false)
const employeeSearchOpen = ref(false)
const employeeSearchQuery = ref('')
const employeeSearchResults = ref<StaffEmployeeSearchResult[]>([])
const employeeSearchLoading = ref(false)
const employeeSearchError = ref('')
const employeeSearchInput = ref<HTMLInputElement | null>(null)
const backendLogoUrl = BACKEND_LOGO_URL
let greetingTimer: number | null = null
let calendarSwipeStartX: number | null = null
let calendarSwipeStartY: number | null = null
let employeeSearchTimer: number | null = null
let employeeSearchRequestId = 0

function handleAttendanceSubmitted() {
  void loadDashboard(true)
}

const weekDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

interface CalendarDay {
  key: string
  inMonth: boolean
  dateNumber?: number
  isToday?: boolean
  isFuture?: boolean
  record?: StaffAttendanceResponse['records'][number] | null
  schedule?: StaffScheduleRecord | null
  status?: 'present' | 'warning' | 'absent' | 'future' | 'schedule' | 'holiday' | 'leave' | 'permit' | 'sick'
  code?: string
}

type QuickActionAccess = 'team_schedules' | 'overtime' | 'approvals' | 'subordinates'

interface QuickAction {
  label: string
  hint: string
  icon: string
  path: string
  bg: string
  access?: QuickActionAccess
}

const employeeName = computed(() =>
  dashboard.value?.employee.name || 'Karyawan',
)
const employeeNik = computed(() =>
  dashboard.value?.employee.nik || '-',
)
const employeePhotoUrl = computed(() =>
  dashboard.value?.employee.photo_url || authState.user?.photo_url || '',
)
const employeeInitials = computed(() => {
  const words = employeeName.value.trim().split(/\s+/).filter(Boolean)
  const initials = words.slice(0, 2).map((word) => word.charAt(0)).join('')

  return initials || 'K'
})
const todayAttendance = computed(() => {
  const today = dashboard.value?.as_of_date
  return dashboard.value?.weekly_attendance.days.find((day) => day.date === today)
})
const todaySchedule = computed(() => {
  const today = dashboard.value?.as_of_date

  return today ? schedulesByDate.value.get(today) : undefined
})
const todayDateLabel = computed(() => {
  const date = dashboard.value?.as_of_date ? new Date(dashboard.value.as_of_date) : new Date()

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
})
const todayShiftLabel = computed(() => {
  const schedule = todaySchedule.value
  const label = schedule?.schedule_label || schedule?.schedule_code
  const start = schedule?.schedule_start_time?.slice(0, 5)
  const end = schedule?.schedule_end_time?.slice(0, 5)
  const range = start && end ? ` [${start} - ${end}]` : ''

  return label ? `Shift: ${label}${range}` : 'Shift: Belum tersedia'
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

const quickActions = computed<QuickAction[]>(() => [
  { label: 'Absensi', hint: 'Riwayat hadir', icon: fingerPrintOutline, path: '/tabs/attendance', bg: 'rgba(59,130,246,0.12)' },
  { label: 'Cuti', hint: 'Ajukan cuti', icon: calendarClearOutline, path: '/requests/leave', bg: 'rgba(34,197,94,0.12)' },
  { label: 'PH', hint: 'Hari libur', icon: shieldCheckmarkOutline, path: '/requests/public-holiday', bg: 'rgba(167,139,250,0.12)' },
  { label: 'EO', hint: 'Extra off', icon: calendarOutline, path: '/requests/extra-off', bg: 'rgba(20,184,166,0.12)' },
  { label: 'Izin', hint: 'Ajukan izin', icon: documentTextOutline, path: '/requests/permission?type=izin', bg: 'rgba(251,191,36,0.12)' },
  { label: 'Tim Saya', hint: 'Status bawahan', icon: peopleOutline, path: '/team-today', bg: 'rgba(14,165,233,0.12)', access: 'subordinates' },
  { label: 'Approval', hint: 'Setujui tim', icon: checkboxOutline, path: '/team-approvals', bg: 'rgba(34,197,94,0.12)', access: 'approvals' },
  { label: 'Jadwal Tim', hint: 'Shift bawahan', icon: layersOutline, path: '/team-schedules', bg: 'rgba(79,70,229,0.12)', access: 'team_schedules' },
  { label: 'Lembur', hint: 'Ajukan tim', icon: timerOutline, path: '/requests/overtime', bg: 'rgba(124,58,237,0.12)', access: 'overtime' },
  { label: 'Profil', hint: 'Data diri', icon: personCircleOutline, path: '/tabs/profile', bg: 'rgba(148,163,184,0.18)' },
  { label: 'Panduan', hint: 'Bantuan', icon: bookOutline, path: '/tabs/guide', bg: 'rgba(20,184,166,0.12)' },
])

const attendanceRecordsByDate = computed(
  () => new Map((attendance.value?.records || []).map((record) => [record.date, record])),
)
const schedulesByDate = computed(
  () => new Map((attendance.value?.schedules || []).map((schedule) => [schedule.date, schedule])),
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
  const leadingDays = (start.getDay() + 6) % 7
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
    const schedule = schedulesByDate.value.get(key)
    const isFuture = current.getTime() > today.getTime()
    const status = resolveCalendarStatus(record, schedule, isFuture)

    items.push({
      key,
      inMonth: true,
      dateNumber,
      isToday: key === dateKeyFromDate(today),
      isFuture,
      record,
      schedule,
      status,
      code: resolveCalendarCode(record, schedule, isFuture),
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
  { code: 'EO', label: 'Extra Off', color: '#A78BFA' },
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
  schedule: StaffScheduleRecord | undefined,
  isFuture: boolean,
): CalendarDay['status'] {
  const status = record?.status?.toLowerCase()

  if (status === 'public_holiday' || status === 'ph') return 'holiday'
  if (status === 'extra_off' || status === 'eo') return 'holiday'
  if (status === 'leave' || status === 'cuti') return 'leave'
  if (status === 'permission' || status === 'izin') return 'permit'
  if (status === 'sick' || status === 'sakit') return 'sick'

  if (isFuture) {
    return schedule?.schedule_code ? 'schedule' : 'future'
  }

  if (record) {
    return record.is_complete ? 'present' : 'warning'
  }

  return 'absent'
}

function resolveCalendarCode(
  record: StaffAttendanceResponse['records'][number] | undefined,
  schedule: StaffScheduleRecord | undefined,
  isFuture: boolean,
) {
  const status = record?.status?.toLowerCase()
  if (status === 'public_holiday' || status === 'ph') return 'PH'
  if (status === 'extra_off' || status === 'eo') return 'EO'
  if (status === 'leave' || status === 'cuti') return 'C'
  if (status === 'permission' || status === 'izin') return 'I'
  if (status === 'sick' || status === 'sakit') return 'S'
  if (status === 'holiday' || status === 'libur' || status === 'off') return 'L'

  if (isFuture) return schedule?.schedule_code || ''

  return record ? 'M' : 'A'
}

async function loadAttendanceCalendar(force = false) {
  if (!dashboard.value) {
    return
  }

  calendarLoading.value = true

  try {
    const start = monthStartFromKey(calendarMonth.value)
    const end = monthEndFromKey(calendarMonth.value)
    attendance.value = await getStaffAttendance(dateKeyFromDate(start), dateKeyFromDate(end), { force })
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

async function loadDashboard(force = false) {
  try {
    dashboard.value = await getStaffDashboard({ force })
    await showBirthdayGreeting()
    calendarMonth.value = monthKeyFromDate(new Date(dashboard.value.as_of_date))
    await loadAttendanceCalendar(force)
  } catch (error) {
    await showAppAlert({
      header: 'Gagal Memuat Dashboard',
      message: apiErrorMessage(error, 'Ringkasan dashboard tidak dapat dimuat.'),
      type: 'danger',
    })
    calendarLoading.value = false
  }
}

async function refreshHome(event: RefresherCustomEvent) {
  try {
    await checkForAppUpdate({ silent: false })
    await refreshSession()
    await loadDashboard(true)
    await refreshNotificationBadge()
  } catch (error) {
    await showAppAlert({
      header: 'Refresh Gagal',
      message: apiErrorMessage(error, 'Data terbaru tidak dapat dimuat.'),
      type: 'danger',
    })
  } finally {
    event.target.complete()
  }
}

async function showBirthdayGreeting() {
  if (!dashboard.value?.employee.is_birthday_today) return

  const storageKey = `hris_mobile_birthday_greeting:${dashboard.value.employee.nik}:${dashboard.value.as_of_date}`
  if (localStorage.getItem(storageKey)) return

  localStorage.setItem(storageKey, 'shown')
  await showAppAlert({
    header: 'Selamat Ulang Tahun',
    message: `Selamat ulang tahun, ${dashboard.value.employee.name}! Semoga hari Anda dipenuhi kebahagiaan, kesehatan, dan hal-hal baik sepanjang tahun ini.`,
    type: 'success',
    buttons: [{ text: 'Terima kasih', role: 'confirm' }],
  })
}

async function changeCalendarMonth(offset: number) {
  const current = monthStartFromKey(calendarMonth.value)
  current.setMonth(current.getMonth() + offset)
  calendarMonth.value = monthKeyFromDate(current)
  await loadAttendanceCalendar()
}

function openNotifications() {
  router.push('/notifications')
}

async function openEmployeeSearch() {
  employeeSearchOpen.value = true
  await nextTick()
  window.setTimeout(() => employeeSearchInput.value?.focus(), 180)
}

function closeEmployeeSearch() {
  employeeSearchOpen.value = false
  employeeSearchQuery.value = ''
  employeeSearchResults.value = []
  employeeSearchError.value = ''
}

function closeQuickMenu() {
  quickMenuOpen.value = false
}

function employeeResultInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()

  return initials || 'K'
}

async function openEmployeeProfile(nik: string) {
  employeeSearchOpen.value = false
  employeeSearchQuery.value = ''
  employeeSearchResults.value = []
  await router.push({ path: '/tabs/profile', query: { nik } })
}

async function refreshNotificationBadge() {
  unreadNotificationTotal.value = await unreadNotificationCount()
}

function startCalendarSwipe(event: TouchEvent) {
  calendarSwipeStartX = event.changedTouches[0]?.clientX ?? null
  calendarSwipeStartY = event.changedTouches[0]?.clientY ?? null
}

function finishCalendarSwipe(event: TouchEvent) {
  if (calendarSwipeStartX === null || calendarSwipeStartY === null || calendarLoading.value) return

  const endX = event.changedTouches[0]?.clientX ?? calendarSwipeStartX
  const endY = event.changedTouches[0]?.clientY ?? calendarSwipeStartY
  const distance = endX - calendarSwipeStartX
  const verticalDistance = endY - calendarSwipeStartY
  calendarSwipeStartX = null
  calendarSwipeStartY = null

  if (Math.abs(distance) < 50 || Math.abs(distance) <= Math.abs(verticalDistance)) return
  void changeCalendarMonth(distance < 0 ? 1 : -1)
}

function hasSupervisorAccess(access?: QuickActionAccess) {
  if (!access) return true
  if (!dashboard.value) return true
  if (access === 'approvals' || access === 'subordinates') return Boolean(dashboard.value.has_subordinates)
  return Boolean(dashboard.value?.supervisor_tools?.[access])
}

async function showSupervisorAccessAlert(action: QuickAction) {
  await showAppAlert({
    header: 'Belum Ada Bawahan',
    message: action.access === 'team_schedules'
      ? 'Menu Jadwal Tim digunakan oleh atasan yang memiliki bawahan langsung atau tidak langsung.'
      : action.access === 'subordinates'
        ? 'Menu Tim Saya digunakan oleh atasan yang memiliki bawahan langsung.'
      : action.access === 'approvals'
        ? 'Menu Approval digunakan oleh atasan yang memiliki bawahan.'
      : 'Menu Pengajuan Lembur digunakan oleh atasan yang memiliki bawahan langsung.',
    type: 'warning',
  })
}

function openFeature(action: QuickAction) {
  quickMenuOpen.value = false

  if (!hasSupervisorAccess(action.access)) {
    void showSupervisorAccessAlert(action)
    return
  }

  if (action.path) {
    router.push(action.path)
    return
  }

  void showAppAlert({
    header: action.label,
    message: `${action.label} akan tersedia pada pembaruan berikutnya.`,
    type: 'info',
  })
}

watch(employeeSearchQuery, (query) => {
  employeeSearchError.value = ''
  const requestId = ++employeeSearchRequestId
  if (employeeSearchTimer) {
    window.clearTimeout(employeeSearchTimer)
    employeeSearchTimer = null
  }

  if (query.length < 3) {
    employeeSearchLoading.value = false
    employeeSearchResults.value = []
    return
  }

  employeeSearchLoading.value = true
  employeeSearchTimer = window.setTimeout(async () => {
    try {
      const response = await searchStaffEmployees(query)
      if (requestId === employeeSearchRequestId) {
        employeeSearchResults.value = response.records
      }
    } catch (error) {
      if (requestId === employeeSearchRequestId) {
        employeeSearchError.value = apiErrorMessage(error, 'Pencarian karyawan tidak dapat dimuat.')
        employeeSearchResults.value = []
      }
    } finally {
      if (requestId === employeeSearchRequestId) {
        employeeSearchLoading.value = false
      }
    }
  }, 280)
})

onMounted(() => {
  const updateGreetingTime = () => {
    currentTime.value = new Date()
  }

  updateGreetingTime()
  greetingTimer = window.setInterval(updateGreetingTime, 60000)
  loadDashboard()
  void refreshNotificationBadge()
  window.addEventListener('attendance-submitted', handleAttendanceSubmitted)
  window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshNotificationBadge)
})

onUnmounted(() => {
  if (greetingTimer) {
    window.clearInterval(greetingTimer)
    greetingTimer = null
  }
  if (employeeSearchTimer) {
    window.clearTimeout(employeeSearchTimer)
    employeeSearchTimer = null
  }
  window.removeEventListener('attendance-submitted', handleAttendanceSubmitted)
  window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshNotificationBadge)
})
</script>

<style scoped>
.dash-page {
  --background: linear-gradient(180deg, #1a73e8 0 74px, var(--hris-bg) 74px 100%);
  background: var(--background);
}

.dash-shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 14px max(14px, env(safe-area-inset-bottom));
  gap: 10px;
  overflow: visible;
}

.header-gradient {
  flex-shrink: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0 -14px 0px;
  padding: max(18px, env(safe-area-inset-top)) 14px 22px;
  overflow: hidden;
  background:
    radial-gradient(circle at 88% 18%, rgba(191, 219, 254, 0.32) 0 2px, transparent 3px),
    radial-gradient(circle at 76% 44%, rgba(147, 197, 253, 0.24) 0 1px, transparent 2px),
    linear-gradient(180deg, #1f4db7 0%, #315fbd 48%, #16223d 100%);
  border-bottom-left-radius: 28px;
  border-bottom-right-radius: 28px;
  box-shadow: 0 18px 36px rgba(2, 6, 23, 0.32);
}

.header-gradient::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.12), transparent 34%),
    radial-gradient(circle at 42% 42%, rgba(96, 165, 250, 0.18), transparent 30%),
    linear-gradient(180deg, transparent 62%, rgba(10, 15, 30, 0.62) 100%);
}

.header-gradient > * {
  position: relative;
  z-index: 1;
}

ion-refresher-content::part(scroll) {
  display: none;
}

.dash-page ion-refresher {
  background: #1a73e8;
  color: #fff;
  z-index: 4;
}

.dash-page ion-refresher,
.dash-page ion-refresher-content,
.dash-page ion-refresher-content::part(container) {
  --background: #1a73e8;
  background: #1a73e8;
}

/* atau override lebih agresif */
.refresher-refreshing-icon,
.refresher-pulling-icon {
  display: none !important;
}

.refresh-pill-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 42px;
  padding: max(6px, env(safe-area-inset-top)) 0 8px;
  background: #1a73e8;
}

.refresh-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.2);
  border: 0.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 20px;
  padding: 5px 14px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: white;
  animation: dotPulse 0.8s ease-in-out infinite alternate;
}

.dot:nth-child(2) { animation-delay: 0.15s; }
.dot:nth-child(3) { animation-delay: 0.3s; }

@keyframes dotPulse {
  from { opacity: 0.3; transform: scale(0.8); }
  to   { opacity: 1;   transform: scale(1);   }
}

.refresh-pill-text {
  font-size: 13px;
  font-weight: 500;
  color: white;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 12px;
  padding: 2px 0 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 auto;
  max-width: calc(100% - 52px);
  min-height: 34px;
  padding: 4px 14px 4px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(14px);
  font-size: 12px;
  font-weight: 800;
  color: #34435f;
  letter-spacing: 0;
}

.brand span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  width: 26px;
  height: 26px;
  border-radius: 999px;
  object-fit: contain;
  flex-shrink: 0;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(12px);
  cursor: pointer;
}

.notification-btn ion-icon {
  font-size: 22px;
}

.notification-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 999px;
  background: #EF4444;
  color: #fff;
  border: 2px solid #315fbd;
  font-size: 10px;
  font-weight: 800;
  line-height: 13px;
  text-align: center;
}

.employee-search-modal {
  --width: 100%;
  --height: 100%;
  --border-radius: 0;
}

.quick-menu-modal {
  --width: min(92vw, 430px);
  --height: auto;
  --border-radius: 18px;
  --box-shadow: 0 24px 60px rgba(2, 6, 23, 0.42);
}

.quick-menu-dialog {
  max-height: min(78vh, 640px);
  overflow: auto;
  background: var(--hris-card-bg);
  color: var(--hris-text-dark);
  border: 1px solid var(--hris-border);
  border-radius: 18px;
  padding: 14px;
}

.quick-menu-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.quick-menu-head span {
  color: var(--ion-color-primary);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.quick-menu-head h2 {
  margin: 4px 0 0;
  color: var(--hris-text-light);
  font-size: 18px;
  font-weight: 900;
}

.quick-menu-head button {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--hris-border);
  background: var(--hris-soft-surface);
  color: var(--hris-text-dark);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.quick-menu-head ion-icon {
  font-size: 19px;
}

.quick-menu-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.quick-menu-item {
  min-width: 0;
  min-height: 106px;
  border-radius: 15px;
  border: 1px solid var(--hris-border);
  background: var(--hris-soft-surface);
  color: var(--hris-text-dark);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 7px;
  text-align: center;
}

.quick-menu-item strong,
.quick-menu-item small {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-menu-item strong {
  color: var(--hris-text-dark);
  font-size: 12px;
  font-weight: 900;
}

.quick-menu-item small {
  color: var(--hris-text-secondary);
  font-size: 10px;
  font-weight: 700;
}

.employee-search-shell {
  min-height: 100%;
  background: var(--hris-bg);
  color: var(--hris-text-dark);
  display: flex;
  flex-direction: column;
  padding: max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom));
}

.employee-search-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-search-header > button {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid var(--hris-border);
  background: var(--hris-card-bg);
  color: var(--hris-text-dark);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.employee-search-header ion-icon {
  font-size: 20px;
}

.employee-search-field {
  min-width: 0;
  flex: 1;
  min-height: 42px;
  border: 1px solid var(--hris-border);
  border-radius: 999px;
  background: var(--hris-card-bg);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  color: var(--hris-text-secondary);
}

.employee-search-field input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--hris-text-dark);
  font-size: 14px;
  font-weight: 700;
}

.employee-search-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 18px;
}

.employee-search-state {
  margin: 20px 4px 0;
  color: var(--hris-text-secondary);
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

.employee-search-state--danger {
  color: #EF4444;
}

.employee-result {
  width: 100%;
  min-height: 66px;
  border-radius: 14px;
  border: 1px solid var(--hris-border);
  background: var(--hris-card-bg);
  color: var(--hris-text-dark);
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  text-align: left;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.employee-result-avatar {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.14);
  color: var(--ion-color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 900;
}

.employee-result-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.employee-result-copy strong,
.employee-result-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.employee-result-copy strong {
  font-size: 14px;
  font-weight: 850;
}

.employee-result-copy small {
  color: var(--hris-text-secondary);
  font-size: 11px;
  font-weight: 650;
}

.employee-result-nik {
  max-width: 86px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--hris-text-secondary);
  font-size: 10px;
  font-weight: 800;
  flex-shrink: 0;
}

:root[data-theme="light"] .header-gradient {
  background:
    radial-gradient(circle at 88% 18%, rgba(255, 255, 255, 0.22) 0 2px, transparent 3px),
    radial-gradient(circle at 76% 44%, rgba(255, 255, 255, 0.18) 0 1px, transparent 2px),
    linear-gradient(180deg, #315fc7 0%, #7898dd 63%, #eef4ff 100%);
  box-shadow: 0 18px 36px rgba(37, 99, 235, 0.16);
}

:root[data-theme="light"] .header-gradient::before {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.16), transparent 34%),
    radial-gradient(circle at 42% 42%, rgba(255, 255, 255, 0.14), transparent 28%);
}

:root[data-theme="light"] .notification-badge {
  border-color: #7698de;
}

:root[data-theme="light"] .today-card {
  background: rgba(255, 255, 255, 0.86);
  border-color: rgba(255, 255, 255, 0.76);
  box-shadow: 0 18px 38px rgba(51, 74, 118, 0.18);
}

:root[data-theme="light"] .today-date {
  color: #64748b;
}

:root[data-theme="light"] .today-date strong {
  color: #1e293b;
}

:root[data-theme="light"] .today-shift {
  color: #64748b;
}

:root[data-theme="light"] .today-label {
  color: #64748b;
}

:root[data-theme="light"] .today-time,
:root[data-theme="light"] .today-time--set {
  color: #16A34A;
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
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 78px;
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 2px 2px 0;
  box-shadow: none;
}

.hero-person {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.employee-avatar {
  width: 54px;
  height: 54px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.72);
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 54px;
  overflow: hidden;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
  font-size: 15px;
  font-weight: 900;
  text-transform: uppercase;
  transform: translateY(-6px);
}

.employee-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-copy {
  min-width: 0;
}

.hero-greeting {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.86);
}

.hero-name {
  margin: 6px 0 10px;
  font-size: 23px;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 12px rgba(15, 23, 42, 0.18);
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
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.hero-tag--soft {
  background: rgba(255, 255, 255, 0.16);
  color: rgba(255, 255, 255, 0.9);
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
  flex-direction: column;
  align-items: stretch;
  gap: 13px;
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 18px;
  padding: 14px 16px 16px;
  box-shadow: 0 18px 38px rgba(2, 6, 23, 0.28);
  backdrop-filter: blur(16px);
  margin-bottom: 0;
}

.today-card-head {
  min-width: 0;
}

.today-date {
  margin: 0;
  color: #E2E8F0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
}

.today-date strong {
  color: #fff;
  font-weight: 900;
  text-transform: capitalize;
}

.today-shift {
  margin: 5px 0 0;
  color: #CBD5E1;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
}

.today-times {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.today-time-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.today-time-dot {
  width: 15px;
  height: 15px;
  border-radius: 999px;
  border: 2px solid currentColor;
  flex: 0 0 15px;
}

.today-time-dot--in {
  color: #5EEAD4;
}

.today-time-dot--out {
  color: #FB7185;
}

.today-label {
  margin: 0;
  color: #CBD5E1;
  font-size: 12px;
  font-weight: 750;
}

.today-time {
  display: inline-block;
  color: #86EFAC;
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
}

.today-time--set {
  color: #86EFAC;
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
  padding: 10px 10px 9px;
  display: flex;
  align-items: center;
  gap: 8px;
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

.quick-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: -4px;
}

.quick-header .section-label {
  margin-bottom: 0;
}

.quick-see-all {
  border: 0;
  background: transparent;
  color: var(--ion-color-primary);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0;
  padding: 2px 0;
  flex-shrink: 0;
}

.quick-scroller {
  flex-shrink: 0;
  display: flex;
  gap: 9px;
  margin: 0 -14px;
  padding: 2px 14px 7px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
}

.quick-scroller::-webkit-scrollbar {
  display: none;
}

.quick-item {
  display: flex;
  width: 70px;
  min-width: 70px;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  border-radius: 15px;
  padding: 8px 5px 7px;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  scroll-snap-align: start;
  text-align: center;
}

.quick-item:hover {
  background: var(--hris-soft-surface);
}

.quick-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
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
  min-width: 0;
  width: 100%;
}

.quick-text strong {
  overflow: hidden;
  font-size: 11px;
  font-weight: 800;
  color: var(--hris-text-dark);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attendance-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 25px;
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
  font-size: 9px;
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

.calendar-cell--schedule {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.24);
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

.calendar-cell--schedule .calendar-code {
  background: rgba(59, 130, 246, 0.24);
  color: #bfdbfe;
}

:root[data-theme="light"] .calendar-cell--schedule {
  background: rgba(37, 99, 235, 0.12);
  border-color: rgba(37, 99, 235, 0.38);
}

:root[data-theme="light"] .calendar-cell--schedule .calendar-code {
  background: rgba(37, 99, 235, 0.2);
  color: #1d4ed8;
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
