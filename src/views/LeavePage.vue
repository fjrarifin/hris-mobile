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
            <span>Employee Self Service</span>
            <h1>Pengajuan Cuti</h1>
          </div>
        </header>

        <section class="hero-card">
          <span class="hero-eyebrow">Saldo Cuti</span>
          <strong>{{ data.balance.available }}</strong>
          <p>Ajukan cuti maksimal 5 hari dalam satu pengajuan.</p>
          <div class="balance-row">
            <span>Total {{ data.balance.total }}</span>
            <span>Terpakai {{ data.balance.used }}</span>
          </div>
        </section>

        <section class="form-card">
          <h2>Ajukan Cuti Baru</h2>
          <form class="request-form" @submit.prevent="submit">
            <label>
              <span>Jenis Cuti</span>
              <select v-model="form.leave_type" required>
                <option v-for="(label, value) in data.leave_types" :key="value" :value="value">
                  {{ label }}
                </option>
              </select>
            </label>
            <div v-if="isNormatif" class="info-note">
              Cuti normatif tidak mengurangi hak cuti tahunan.
            </div>
            <div class="field-grid">
              <label>
                <span>Tanggal Mulai</span>
                <input v-model="form.start_date" type="date" required />
              </label>
              <label>
                <span>Tanggal Selesai</span>
                <input v-model="form.end_date" type="date" required />
              </label>
            </div>
            <label>
              <span>Alasan</span>
              <textarea v-model="form.reason" rows="3" placeholder="Tuliskan alasan cuti" required />
            </label>
            <ion-button type="submit" expand="block" :disabled="saving">
              {{ saving ? 'Mengirim...' : 'Kirim Pengajuan' }}
            </ion-button>
          </form>
        </section>

        <section class="history-section">
          <h2>Riwayat Cuti</h2>
          <div v-if="loading" class="empty-card">Memuat riwayat...</div>
          <article v-for="item in data.requests" :key="item.id" class="history-card">
            <div class="history-top">
              <strong>{{ data.leave_types[item.leave_type] || item.leave_type }}</strong>
              <span class="status-pill" :class="requestStatusClass(item.status)">
                {{ requestStatusLabel(item.status) }}
              </span>
            </div>
            <p>{{ requestDate(item.start_date) }} - {{ requestDate(item.end_date) }}</p>
            <small>{{ item.reason || '-' }}</small>
            <button v-if="item.status === 'pending'" type="button" class="cancel-button" @click="remove(item.id)">
              Batalkan pengajuan
            </button>
          </article>
          <div v-if="!loading && !data.requests.length" class="empty-card">Belum ada pengajuan cuti.</div>
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
import { createLeave, deleteLeave, getLeaves, type LeaveResponse } from '@/services/requests'
import { requestDate, requestStatusClass, requestStatusLabel } from '@/utils/requestFormatters'

const router = useRouter()
const data = ref<LeaveResponse>({ balance: { total: 0, used: 0, available: 0 }, leave_types: {}, requests: [] })
const form = reactive({ leave_type: 'cuti_tahunan', start_date: '', end_date: '', reason: '' })
const loading = ref(true)
const saving = ref(false)
const isNormatif = computed(() => (data.value.leave_types[form.leave_type] || '').toLowerCase().includes('normatif'))

async function load() {
  loading.value = true
  try {
    data.value = await getLeaves()
  } catch (error) {
    await showAppAlert({ header: 'Gagal Memuat Cuti', message: apiErrorMessage(error), type: 'danger' })
  } finally {
    loading.value = false
  }
}

async function submit() {
  saving.value = true
  try {
    const response = await createLeave(form)
    form.start_date = ''
    form.end_date = ''
    form.reason = ''
    await load()
    await showAppAlert({ header: 'Pengajuan Terkirim', message: response.message, type: 'success' })
  } catch (error) {
    await showAppAlert({ header: 'Pengajuan Gagal', message: apiErrorMessage(error), type: 'danger' })
  } finally {
    saving.value = false
  }
}

async function remove(id: number) {
  if (!window.confirm('Batalkan pengajuan cuti ini?')) return
  try {
    const response = await deleteLeave(id)
    await load()
    await showAppAlert({ header: 'Pengajuan Dibatalkan', message: response.message, type: 'success' })
  } catch (error) {
    await showAppAlert({ header: 'Pembatalan Gagal', message: apiErrorMessage(error), type: 'danger' })
  }
}

async function refresh(event: RefresherCustomEvent) {
  await load()
  event.target.complete()
}

onMounted(load)
</script>

<style scoped src="./request-page.css"></style>
