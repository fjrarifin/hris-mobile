<template>
  <ion-page>
    <ion-content fullscreen class="request-page">
      <ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content /></ion-refresher>
      <main class="request-shell">
        <header class="page-header">
          <button type="button" aria-label="Kembali" @click="router.back()"><ion-icon :icon="arrowBackOutline" /></button>
          <div><span>Supervisor Tools</span><h1>Pengajuan Lembur</h1></div>
        </header>

        <section class="hero-card">
          <span class="hero-eyebrow">Lembur Tim</span>
          <h2>Ajukan lembur bawahan</h2>
          <p>Durasi lembur yang dapat diajukan adalah 1 sampai 4 jam dan diteruskan ke HR.</p>
        </section>

        <section class="form-card">
          <h2>Pengajuan Baru</h2>
          <form class="request-form" @submit.prevent="submit">
            <div class="employee-picker">
              <span>Pilih Karyawan</span>
              <label v-for="employee in data.subordinates" :key="employee.nik" class="employee-option">
                <input v-model="form.employee_niks" type="checkbox" :value="employee.nik" />
                <span>
                  <strong>{{ employee.nama_karyawan }}</strong>
                  <small>{{ employee.nik }} · {{ employee.jabatan || '-' }}</small>
                </span>
              </label>
              <p v-if="!loading && !data.subordinates.length">Anda belum memiliki bawahan langsung.</p>
            </div>
            <label><span>Tanggal</span><input v-model="form.date" type="date" required /></label>
            <div class="field-grid">
              <label><span>Jam Mulai</span><input v-model="form.start_time" type="time" required /></label>
              <label><span>Jam Selesai</span><input v-model="form.end_time" type="time" required /></label>
            </div>
            <label><span>Alasan</span><textarea v-model="form.reason" rows="3" placeholder="Tuliskan alasan lembur" required /></label>
            <ion-button type="submit" expand="block" :disabled="saving || !data.subordinates.length">
              {{ saving ? 'Mengirim...' : 'Kirim ke HR' }}
            </ion-button>
          </form>
        </section>

        <section class="history-section">
          <h2>Riwayat Pengajuan</h2>
          <div v-if="loading" class="empty-card">Memuat riwayat lembur...</div>
          <article v-for="item in data.requests" :key="item.id" class="history-card">
            <div class="history-top">
              <strong>{{ requestEmployeeName(item) }}</strong>
              <span class="status-pill" :class="requestStatusClass(item.status)">{{ requestStatusLabel(item.status) }}</span>
            </div>
            <p>{{ requestDate(item.date) }} · {{ timeLabel(item.start_time) }} - {{ timeLabel(item.end_time) }}</p>
            <small>{{ item.reason || '-' }}</small>
            <button v-if="item.status === 'pending'" type="button" class="cancel-button" @click="remove(item.id)">
              Batalkan pengajuan
            </button>
          </article>
          <div v-if="!loading && !data.requests.length" class="empty-card">Belum ada pengajuan lembur.</div>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import type { RefresherCustomEvent } from '@ionic/vue'
import { arrowBackOutline } from 'ionicons/icons'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showAppAlert } from '@/services/alerts'
import { apiErrorMessage } from '@/services/api'
import {
  createOvertime,
  deleteOvertime,
  getOvertime,
  type OvertimeRequestItem,
  type OvertimeResponse,
} from '@/services/requests'
import { requestDate, requestStatusClass, requestStatusLabel } from '@/utils/requestFormatters'

const router = useRouter()
const data = ref<OvertimeResponse>({ subordinates: [], requests: [] })
const form = reactive({ employee_niks: [] as string[], date: '', start_time: '', end_time: '', reason: '' })
const loading = ref(true)
const saving = ref(false)
const noSubordinateNoticeShown = ref(false)

async function load(force = false) {
  loading.value = true
  try {
    data.value = await getOvertime({ force })
    if (!data.value.subordinates.length) {
      await showNoSubordinateNotice()
    }
  } catch (error) {
    await showAppAlert({ header: 'Gagal Memuat Lembur', message: apiErrorMessage(error, 'Data lembur tidak dapat dimuat.'), type: 'danger' })
  } finally {
    loading.value = false
  }
}

async function showNoSubordinateNotice() {
  if (noSubordinateNoticeShown.value) return
  noSubordinateNoticeShown.value = true
  await showAppAlert({
    header: 'Belum Ada Bawahan',
    message: 'Menu Pengajuan Lembur digunakan oleh atasan yang memiliki bawahan langsung.',
    type: 'warning',
  })
}

function resetForm() {
  form.employee_niks = []
  form.date = ''
  form.start_time = ''
  form.end_time = ''
  form.reason = ''
}

function timeLabel(value: string) {
  return value?.slice(0, 5) || '-'
}

function requestEmployeeName(item: OvertimeRequestItem) {
  return item.user?.karyawan?.nama_karyawan || item.user?.name || 'Karyawan'
}

async function submit() {
  if (!form.employee_niks.length) {
    await showAppAlert({ header: 'Pilih Karyawan', message: 'Pilih minimal satu bawahan untuk pengajuan lembur.', type: 'warning' })
    return
  }

  saving.value = true
  try {
    const response = await createOvertime(form)
    resetForm()
    await load(true)
    await showAppAlert({ header: 'Pengajuan Terkirim', message: response.message, type: 'success' })
  } catch (error) {
    await showAppAlert({ header: 'Pengajuan Gagal', message: apiErrorMessage(error, 'Pengajuan lembur tidak dapat dikirim.'), type: 'danger' })
  } finally {
    saving.value = false
  }
}

async function remove(id: number) {
  if (!window.confirm('Batalkan pengajuan lembur ini?')) return
  try {
    const response = await deleteOvertime(id)
    await load(true)
    await showAppAlert({ header: 'Pengajuan Dibatalkan', message: response.message, type: 'success' })
  } catch (error) {
    await showAppAlert({ header: 'Pembatalan Gagal', message: apiErrorMessage(error), type: 'danger' })
  }
}

async function refresh(event: RefresherCustomEvent) {
  await load(true)
  event.target.complete()
}

onMounted(load)
</script>

<style scoped src="./request-page.css"></style>
<style scoped>
.employee-picker {
  display: grid;
  gap: 8px;
  padding: 11px;
  border: 1px dashed var(--hris-input-border);
  border-radius: 11px;
  background: var(--hris-soft-surface);
}

.employee-picker > span {
  color: var(--hris-text-secondary);
  font-size: 11px;
  font-weight: 800;
}

.employee-picker p {
  margin: 0;
  color: var(--hris-text-secondary);
  font-size: 12px;
}

.employee-option {
  display: flex !important;
  grid-template-columns: none !important;
  align-items: center;
  gap: 10px !important;
  padding: 9px;
  border-radius: 10px;
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
}

.employee-option input {
  width: 18px !important;
  height: 18px;
  flex-shrink: 0;
}

.employee-option span {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.employee-option strong {
  color: var(--hris-text-dark);
  font-size: 12px;
}

.employee-option small {
  color: var(--hris-text-secondary);
  font-size: 11px;
}
</style>
