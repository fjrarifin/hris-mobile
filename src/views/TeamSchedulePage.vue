<template>
  <ion-page>
    <ion-content fullscreen class="request-page">
      <ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content /></ion-refresher>
      <main class="request-shell">
        <header class="page-header">
          <button type="button" aria-label="Kembali" @click="router.back()"><ion-icon :icon="arrowBackOutline" /></button>
          <div><span>Supervisor Tools</span><h1>Jadwal Tim</h1></div>
        </header>

        <section class="hero-card">
          <span class="hero-eyebrow">Assignment Shift</span>
          <h2>{{ team?.supervisor.name || 'Jadwal bawahan' }}</h2>
          <p>Atur jadwal bawahan langsung dan tidak langsung untuk periode maksimal 46 hari.</p>
        </section>

        <section class="form-card">
          <h2>Filter Periode</h2>
          <form class="request-form" @submit.prevent="loadTeam(true)">
            <div class="field-grid">
              <label><span>Dari Tanggal</span><input v-model="filters.startDate" type="date" required /></label>
              <label><span>Sampai Tanggal</span><input v-model="filters.endDate" type="date" required /></label>
            </div>
            <ion-button type="submit" expand="block" :disabled="loading">
              {{ loading ? 'Memuat...' : 'Tampilkan Tim' }}
            </ion-button>
          </form>
        </section>

        <section class="history-section">
          <h2>Daftar Bawahan</h2>
          <div v-if="loading" class="empty-card">Memuat jadwal tim...</div>
          <article v-for="employee in team?.employees || []" :key="employee.nik" class="history-card team-card">
            <div class="history-top">
              <strong>{{ employee.name }}</strong>
              <span class="status-pill status-approved">{{ employee.scheduled_days }}/{{ employee.total_period_days }}</span>
            </div>
            <p>{{ employee.position }} · {{ employee.department }}</p>
            <small>{{ employee.unit }} · {{ employee.relationship }}</small>
            <button type="button" class="secondary-button" @click="openEmployee(employee.nik)">
              Detail / Edit Jadwal
            </button>
          </article>
          <div v-if="!loading && team && !team.employees.length" class="empty-card">
            Belum ada bawahan yang terhubung.
          </div>
          <div v-if="!loading && !team" class="empty-card">
            {{ errorMessage || 'Jadwal tim belum dimuat.' }}
          </div>
        </section>

        <section v-if="employeeSchedule" class="form-card">
          <h2>Jadwal {{ employeeSchedule.employee.name }}</h2>
          <form class="request-form" @submit.prevent="saveSchedule">
            <label v-for="date in employeeSchedule.dates" :key="date.date">
              <span>{{ requestDate(date.date) }}</span>
              <select v-model="date.code">
                <option value="">Belum ditentukan</option>
                <option v-for="category in employeeSchedule.categories" :key="category.code" :value="category.code">
                  {{ category.code }} - {{ category.name }}
                </option>
              </select>
            </label>
            <ion-button type="submit" expand="block" :disabled="saving">
              {{ saving ? 'Menyimpan...' : 'Simpan Jadwal Bawahan' }}
            </ion-button>
          </form>
        </section>

        <section v-if="scheduleCategories.length" class="history-section">
          <h2>Panduan Kode</h2>
          <article v-for="category in scheduleCategories" :key="category.code" class="history-card code-card">
            <div class="history-top">
              <strong>{{ category.code }} - {{ category.name }}</strong>
            </div>
            <p>{{ scheduleTime(category) }}</p>
          </article>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import type { RefresherCustomEvent } from '@ionic/vue'
import { arrowBackOutline } from 'ionicons/icons'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showAppAlert } from '@/services/alerts'
import { apiErrorMessage, isApiRequestError } from '@/services/api'
import {
  getTeamEmployeeSchedule,
  getTeamSchedules,
  saveTeamEmployeeSchedule,
  type TeamEmployeeScheduleResponse,
  type TeamScheduleCategory,
  type TeamScheduleResponse,
} from '@/services/requests'
import { requestDate } from '@/utils/requestFormatters'

const router = useRouter()
const filters = reactive({
  startDate: todayDate(),
  endDate: addDays(todayDate(), 6),
})
const team = ref<TeamScheduleResponse | null>(null)
const employeeSchedule = ref<TeamEmployeeScheduleResponse | null>(null)
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const noSubordinateNoticeShown = ref(false)
const scheduleCategories = computed(() => employeeSchedule.value?.categories || team.value?.categories || [])

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(value: string, days: number) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function scheduleTime(category: TeamScheduleCategory) {
  if (!category.start_time || !category.end_time) return 'Tanpa jam kerja'
  return `${category.start_time.slice(0, 5)} - ${category.end_time.slice(0, 5)}`
}

async function loadTeam(force = false) {
  loading.value = true
  errorMessage.value = ''
  employeeSchedule.value = null
  try {
    team.value = await getTeamSchedules(filters.startDate, filters.endDate, { force })
    if (!team.value.employees.length) {
      await showNoSubordinateNotice()
    }
  } catch (error) {
    team.value = null
    errorMessage.value = apiErrorMessage(error, 'Jadwal tim tidak dapat dimuat.')

    if (isApiRequestError(error) && error.status === 403) {
      await showNoSubordinateNotice(errorMessage.value)
    } else {
      await showAppAlert({ header: 'Gagal Memuat Jadwal Tim', message: errorMessage.value, type: 'danger' })
    }
  } finally {
    loading.value = false
  }
}

async function showNoSubordinateNotice(message = 'Menu Jadwal Tim digunakan oleh atasan yang memiliki bawahan langsung atau tidak langsung.') {
  if (noSubordinateNoticeShown.value) return
  noSubordinateNoticeShown.value = true
  await showAppAlert({
    header: 'Belum Ada Bawahan',
    message,
    type: 'warning',
  })
}

async function openEmployee(nik: string) {
  try {
    employeeSchedule.value = await getTeamEmployeeSchedule(nik, filters.startDate, filters.endDate, { force: true })
  } catch (error) {
    await showAppAlert({ header: 'Gagal Memuat Detail', message: apiErrorMessage(error, 'Detail jadwal bawahan tidak dapat dimuat.'), type: 'danger' })
  }
}

async function saveSchedule() {
  if (!employeeSchedule.value) return
  saving.value = true
  try {
    const response = await saveTeamEmployeeSchedule(employeeSchedule.value.employee.nik, {
      start_date: filters.startDate,
      end_date: filters.endDate,
      schedules: employeeSchedule.value.dates,
    })
    await loadTeam(true)
    await showAppAlert({ header: 'Jadwal Tersimpan', message: response.message, type: 'success' })
  } catch (error) {
    await showAppAlert({ header: 'Gagal Menyimpan', message: apiErrorMessage(error, 'Jadwal bawahan tidak dapat disimpan.'), type: 'danger' })
  } finally {
    saving.value = false
  }
}

async function refresh(event: RefresherCustomEvent) {
  await loadTeam(true)
  event.target.complete()
}

onMounted(loadTeam)
</script>

<style scoped src="./request-page.css"></style>
<style scoped>
.team-card .secondary-button,
.secondary-button {
  margin-top: 10px;
  width: 100%;
  border: 1px solid rgba(59, 130, 246, 0.22);
  border-radius: 9px;
  background: rgba(59, 130, 246, 0.1);
  padding: 8px 9px;
  color: var(--ion-color-primary);
  font-size: 11px;
  font-weight: 900;
}

.code-card {
  box-shadow: none;
}
</style>
