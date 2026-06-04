<template>
  <ion-page>
    <ion-content fullscreen class="request-page">
      <ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content /></ion-refresher>
      <main class="request-shell">
        <header class="page-header">
          <button type="button" aria-label="Kembali" @click="router.back()"><ion-icon :icon="arrowBackOutline" /></button>
          <div><span>Employee Self Service</span><h1>Public Holiday</h1></div>
        </header>
        <section class="hero-card">
          <span class="hero-eyebrow">Saldo PH Tersedia</span>
          <strong>{{ data.balance }}</strong>
          <p>Pilih hak PH yang tersedia dan tentukan tanggal pengambilannya.</p>
        </section>
        <section class="form-card">
          <h2>Ajukan Public Holiday</h2>
          <form class="request-form" @submit.prevent="submit">
            <label>
              <span>Hari Libur</span>
              <select v-model="form.public_holiday_id" required>
                <option disabled value="">Pilih Public Holiday</option>
                <option v-for="holiday in data.holidays" :key="holiday.id" :value="String(holiday.id)">
                  {{ holiday.name }} - {{ requestDate(holiday.holiday_date) }}
                </option>
              </select>
            </label>
            <label><span>Tanggal Pengambilan</span><input v-model="form.claim_date" type="date" required /></label>
            <ion-button type="submit" expand="block" :disabled="saving">{{ saving ? 'Mengirim...' : 'Kirim Pengajuan PH' }}</ion-button>
          </form>
        </section>
        <section class="history-section">
          <h2>Riwayat Public Holiday</h2>
          <div v-if="loading" class="empty-card">Memuat riwayat...</div>
          <article v-for="item in data.requests" :key="item.id" class="history-card">
            <div class="history-top">
              <strong>{{ item.holiday?.name || 'Public Holiday' }}</strong>
              <span class="status-pill" :class="requestStatusClass(item.status)">{{ requestStatusLabel(item.status) }}</span>
            </div>
            <p>Diambil pada {{ requestDate(item.claim_date) }}</p>
            <button v-if="item.status === 'pending'" type="button" class="cancel-button" @click="remove(item.id)">Batalkan pengajuan</button>
          </article>
          <div v-if="!loading && !data.requests.length" class="empty-card">Belum ada pengajuan PH.</div>
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
import { createPublicHoliday, deletePublicHoliday, getPublicHolidays, type PublicHolidayResponse } from '@/services/requests'
import { requestDate, requestStatusClass, requestStatusLabel } from '@/utils/requestFormatters'

const router = useRouter()
const data = ref<PublicHolidayResponse>({ balance: 0, holidays: [], requests: [] })
const form = reactive({ public_holiday_id: '', claim_date: '' })
const loading = ref(true)
const saving = ref(false)

async function load(force = false) {
  loading.value = true
  try { data.value = await getPublicHolidays({ force }) }
  catch (error) { await showAppAlert({ header: 'Gagal Memuat PH', message: apiErrorMessage(error), type: 'danger' }) }
  finally { loading.value = false }
}

async function submit() {
  saving.value = true
  try {
    const response = await createPublicHoliday(form)
    form.public_holiday_id = ''; form.claim_date = ''
    await load(true)
    await showAppAlert({ header: 'Pengajuan Terkirim', message: response.message, type: 'success' })
  } catch (error) { await showAppAlert({ header: 'Pengajuan Gagal', message: apiErrorMessage(error), type: 'danger' }) }
  finally { saving.value = false }
}

async function remove(id: number) {
  if (!window.confirm('Batalkan pengajuan Public Holiday ini?')) return
  try {
    const response = await deletePublicHoliday(id); await load(true)
    await showAppAlert({ header: 'Pengajuan Dibatalkan', message: response.message, type: 'success' })
  } catch (error) { await showAppAlert({ header: 'Pembatalan Gagal', message: apiErrorMessage(error), type: 'danger' }) }
}

async function refresh(event: RefresherCustomEvent) { await load(true); event.target.complete() }
onMounted(load)
</script>

<style scoped src="./request-page.css"></style>
