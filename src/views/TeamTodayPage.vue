<template>
  <ion-page>
    <ion-content fullscreen class="request-page">
      <ion-refresher slot="fixed" @ionRefresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <main class="request-shell">
        <header class="page-header">
          <button type="button" aria-label="Kembali" @click="router.back()">
            <ion-icon :icon="arrowBackOutline" />
          </button>
          <div>
            <span>Supervisor Tools</span>
            <h1>Tim Saya</h1>
          </div>
        </header>

        <section class="hero-card team-hero">
          <span class="hero-eyebrow">Monitoring Bawahan</span>
          <h2>{{ supervisorName }}</h2>
          <p>Lihat status kehadiran bawahan langsung hari ini, termasuk jadwal, scan masuk, dan scan keluar.</p>
        </section>

        <section class="summary-grid">
          <article class="summary-card">
            <span>Total</span>
            <strong>{{ subordinates.length }}</strong>
          </article>
          <article class="summary-card">
            <span>Sudah Scan</span>
            <strong>{{ scannedCount }}</strong>
          </article>
          <article class="summary-card">
            <span>Belum Masuk</span>
            <strong>{{ notPresentCount }}</strong>
          </article>
        </section>

        <section class="history-section">
          <div class="section-head">
            <div>
              <h2>Bawahan Hari Ini</h2>
              <p>{{ todayLabel }}</p>
            </div>
            <button type="button" class="refresh-button" :disabled="loading" @click="loadTeam(true)">
              {{ loading ? 'Memuat' : 'Refresh' }}
            </button>
          </div>

          <div v-if="loading" class="empty-card">Memuat data bawahan...</div>

          <article
            v-for="employee in subordinates"
            v-else
            :key="employee.nik"
            class="history-card subordinate-card"
            :class="statusClass(employee)"
          >
            <div class="employee-line">
              <div class="avatar" aria-hidden="true">{{ initials(employee.name) }}</div>
              <div class="employee-copy">
                <strong>{{ employee.name }}</strong>
                <span>{{ employee.position || '-' }} · {{ employee.department || '-' }}</span>
              </div>
              <span class="team-status-pill">{{ statusLabel(employee) }}</span>
            </div>

            <div class="schedule-line">
              <ion-icon :icon="calendarOutline" />
              <span>{{ scheduleText(employee) }}</span>
            </div>

            <div class="scan-grid">
              <div class="scan-box">
                <span>Masuk</span>
                <strong>{{ formatTime(employee.scan_in) }}</strong>
              </div>
              <div class="scan-box">
                <span>Keluar</span>
                <strong>{{ formatTime(employee.scan_out) }}</strong>
              </div>
            </div>

            <button type="button" class="secondary-button" @click="openProfile(employee.nik)">
              <ion-icon :icon="personCircleOutline" />
              Lihat Profil
            </button>
          </article>

          <div v-if="!loading && !subordinates.length" class="empty-card">
            Belum ada bawahan langsung yang terhubung.
          </div>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonIcon, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import type { RefresherCustomEvent } from '@ionic/vue'
import { arrowBackOutline, calendarOutline, personCircleOutline } from 'ionicons/icons'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showAppAlert } from '@/services/alerts'
import { apiErrorMessage } from '@/services/api'
import { getStaffDashboard, type StaffDashboard, type StaffSubordinateToday } from '@/services/staff'
import { formatTime, weeklyAttendanceClass, weeklyAttendanceLabel } from '@/utils/formatters'

const router = useRouter()
const dashboard = ref<StaffDashboard | null>(null)
const loading = ref(true)

const subordinates = computed(() => dashboard.value?.subordinates_today || [])
const supervisorName = computed(() => dashboard.value?.employee.name || 'Tim Saya')
const scannedCount = computed(() => subordinates.value.filter((employee) => employee.scan_in || employee.scan_out).length)
const notPresentCount = computed(() =>
  subordinates.value.filter((employee) => ['alpha', 'absent', 'not_present'].includes(employee.attendance_status)).length,
)
const todayLabel = computed(() => {
  const value = dashboard.value?.as_of_date || new Date().toISOString().slice(0, 10)

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
})

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase() || 'K'
}

function scheduleText(employee: StaffSubordinateToday) {
  const code = employee.schedule_code || ''
  const label = employee.schedule_label || ''

  if (!code && !label) {
    return 'Jadwal belum tersedia'
  }

  return [code, label].filter(Boolean).join(' - ')
}

function statusLabel(employee: StaffSubordinateToday) {
  return employee.attendance_status_label || weeklyAttendanceLabel(employee.attendance_status)
}

function statusClass(employee: StaffSubordinateToday) {
  return weeklyAttendanceClass(employee.attendance_status)
}

async function loadTeam(force = false) {
  loading.value = true

  try {
    dashboard.value = await getStaffDashboard({ force })
  } catch (error) {
    await showAppAlert({
      header: 'Gagal Memuat Tim',
      message: apiErrorMessage(error, 'Data bawahan tidak dapat dimuat.'),
      type: 'danger',
    })
  } finally {
    loading.value = false
  }
}

async function refresh(event: RefresherCustomEvent) {
  await loadTeam(true)
  event.target.complete()
}

function openProfile(nik: string) {
  router.push({ path: '/tabs/profile', query: { nik } })
}

onMounted(loadTeam)
</script>

<style scoped src="./request-page.css"></style>
<style scoped>
.team-hero {
  background:
    linear-gradient(135deg, rgba(59, 130, 246, 0.24), rgba(20, 184, 166, 0.1)),
    var(--hris-card-bg);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.summary-card {
  border: 1px solid var(--hris-border);
  border-radius: 12px;
  background: var(--hris-card-bg);
  padding: 10px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
}

.summary-card span {
  display: block;
  color: var(--hris-text-secondary);
  font-size: 10px;
  font-weight: 800;
}

.summary-card strong {
  display: block;
  margin-top: 4px;
  color: var(--hris-text-light);
  font-size: 20px;
  font-weight: 900;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.section-head h2 {
  margin: 0;
}

.section-head p {
  margin: 3px 0 0;
  color: var(--hris-text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.refresh-button,
.secondary-button {
  border: 1px solid rgba(59, 130, 246, 0.22);
  border-radius: 9px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--ion-color-primary);
  font-size: 11px;
  font-weight: 900;
}

.refresh-button {
  flex: 0 0 auto;
  padding: 7px 10px;
}

.subordinate-card {
  display: grid;
  gap: 10px;
}

.employee-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  display: grid;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 14px;
  background: rgba(59, 130, 246, 0.14);
  color: var(--ion-color-primary);
  font-size: 12px;
  font-weight: 900;
}

.employee-copy {
  min-width: 0;
  flex: 1 1 auto;
}

.employee-copy strong,
.employee-copy span {
  display: block;
}

.employee-copy strong {
  color: var(--hris-text-dark);
  font-size: 13px;
  font-weight: 900;
}

.employee-copy span {
  margin-top: 2px;
  overflow: hidden;
  color: var(--hris-text-secondary);
  font-size: 10px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-status-pill {
  flex: 0 0 auto;
  max-width: 96px;
  border-radius: 999px;
  padding: 5px 8px;
  background: rgba(148, 163, 184, 0.15);
  color: var(--hris-text-secondary);
  font-size: 9px;
  font-weight: 900;
  text-align: center;
}

.status-success .team-status-pill {
  background: rgba(34, 197, 94, 0.16);
  color: #4ade80;
}

.status-warning .team-status-pill {
  background: rgba(251, 191, 36, 0.16);
  color: #fbbf24;
}

.status-danger .team-status-pill {
  background: rgba(239, 68, 68, 0.16);
  color: #f87171;
}

.status-leave .team-status-pill,
.status-permit .team-status-pill,
.status-sick .team-status-pill,
.status-holiday .team-status-pill {
  background: rgba(59, 130, 246, 0.14);
  color: #60a5fa;
}

.schedule-line {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--hris-text-secondary);
  font-size: 11px;
  font-weight: 800;
}

.schedule-line ion-icon {
  color: var(--ion-color-primary);
  font-size: 15px;
}

.scan-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.scan-box {
  border-radius: 10px;
  background: var(--hris-soft-surface);
  padding: 9px 10px;
}

.scan-box span,
.scan-box strong {
  display: block;
}

.scan-box span {
  color: var(--hris-text-secondary);
  font-size: 10px;
  font-weight: 800;
}

.scan-box strong {
  margin-top: 3px;
  color: var(--hris-text-light);
  font-size: 13px;
  font-weight: 900;
}

.secondary-button {
  display: inline-flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 9px;
}

.secondary-button ion-icon {
  font-size: 15px;
}
</style>
