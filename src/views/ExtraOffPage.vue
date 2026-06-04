<template>
  <ion-page>
    <ion-content fullscreen class="request-page">
      <ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content /></ion-refresher>
      <main class="request-shell">
        <header class="page-header">
          <button type="button" aria-label="Kembali" @click="router.back()"><ion-icon :icon="arrowBackOutline" /></button>
          <div><span>Employee Self Service</span><h1>Extra Off</h1></div>
        </header>
        <section class="hero-card">
          <span class="hero-eyebrow">Saldo EO Tersedia</span>
          <strong>{{ data.balance }}</strong>
          <p>Pilih saldo EO dari periode payroll dan tentukan tanggal pengambilannya.</p>
        </section>
        <section class="form-card">
          <h2>Ajukan Extra Off</h2>
          <form class="request-form" @submit.prevent="submit">
            <label>
              <span>Sumber Saldo EO</span>
              <select :value="sourceValue" required @change="chooseSource">
                <option disabled value="">Pilih Periode Payroll</option>
                <option v-for="source in data.sources" :key="`${source.source_period_start}|${source.source_period_end}`" :value="`${source.source_period_start}|${source.source_period_end}`">
                  {{ source.label }} - sisa {{ source.remaining_days }} hari
                </option>
              </select>
            </label>
            <label><span>Tanggal Pengambilan</span><input v-model="form.claim_date" type="date" required /></label>
            <ion-button type="submit" expand="block" :disabled="saving">{{ saving ? 'Mengirim...' : 'Kirim Pengajuan EO' }}</ion-button>
          </form>
        </section>
        <section class="history-section">
          <h2>Riwayat Extra Off</h2>
          <div v-if="loading" class="empty-card">Memuat riwayat...</div>
          <article v-for="item in data.requests" :key="item.id" class="history-card">
            <div class="history-top">
              <strong>{{ requestDate(item.source_period_start) }} - {{ requestDate(item.source_period_end) }}</strong>
              <span class="status-pill" :class="requestStatusClass(item.status)">{{ requestStatusLabel(item.status) }}</span>
            </div>
            <p>Diambil pada {{ requestDate(item.claim_date) }}</p>
            <button v-if="item.status === 'pending'" type="button" class="cancel-button" @click="remove(item.id)">Batalkan pengajuan</button>
          </article>
          <div v-if="!loading && !data.requests.length" class="empty-card">Belum ada pengajuan EO.</div>
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
import { apiErrorMessage } from '@/services/api'
import { createExtraOff, deleteExtraOff, getExtraOffs, type ExtraOffResponse } from '@/services/requests'
import { requestDate, requestStatusClass, requestStatusLabel } from '@/utils/requestFormatters'

const router = useRouter()
const data = ref<ExtraOffResponse>({ balance: 0, sources: [], requests: [] })
const form = reactive({ source_period_start: '', source_period_end: '', claim_date: '' })
const loading = ref(true)
const saving = ref(false)
const sourceValue = computed(() =>
  form.source_period_start && form.source_period_end ? `${form.source_period_start}|${form.source_period_end}` : '',
)

async function load(force = false) {
  loading.value = true
  try { data.value = await getExtraOffs({ force }) }
  catch (error) { await showAppAlert({ header: 'Gagal Memuat EO', message: apiErrorMessage(error), type: 'danger' }) }
  finally { loading.value = false }
}

function chooseSource(event: Event) {
  const [start, end] = String((event.target as HTMLSelectElement).value).split('|')
  form.source_period_start = start || ''
  form.source_period_end = end || ''
}

async function submit() {
  saving.value = true
  try {
    const response = await createExtraOff(form)
    form.source_period_start = ''; form.source_period_end = ''; form.claim_date = ''
    await load(true)
    await showAppAlert({ header: 'Pengajuan Terkirim', message: response.message, type: 'success' })
  } catch (error) { await showAppAlert({ header: 'Pengajuan Gagal', message: apiErrorMessage(error), type: 'danger' }) }
  finally { saving.value = false }
}

async function remove(id: number) {
  if (!window.confirm('Batalkan pengajuan Extra Off ini?')) return
  try {
    const response = await deleteExtraOff(id); await load(true)
    await showAppAlert({ header: 'Pengajuan Dibatalkan', message: response.message, type: 'success' })
  } catch (error) { await showAppAlert({ header: 'Pembatalan Gagal', message: apiErrorMessage(error), type: 'danger' }) }
}

async function refresh(event: RefresherCustomEvent) { await load(true); event.target.complete() }
onMounted(load)
</script>

<style scoped src="./request-page.css"></style>
