<template>
  <ion-page>
    <ion-content fullscreen class="request-page">
      <ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content /></ion-refresher>
      <main class="request-shell">
        <header class="page-header">
          <button type="button" aria-label="Kembali" @click="router.back()"><ion-icon :icon="arrowBackOutline" /></button>
          <div><span>Employee Self Service</span><h1>Izin / Sakit</h1></div>
        </header>
        <section class="hero-card">
          <span class="hero-eyebrow">{{ form.type === 'sakit' ? 'Lapor Sakit' : 'Pengajuan Izin' }}</span>
          <h2>{{ form.type === 'sakit' ? 'Lampirkan surat sakit' : 'Sampaikan alasan izin' }}</h2>
          <p>Pengajuan diteruskan kepada atasan langsung sebelum diverifikasi HRD.</p>
        </section>
        <section class="form-card">
          <h2>Pengajuan Baru</h2>
          <form class="request-form" @submit.prevent="submit">
            <label><span>Jenis Pengajuan</span><select v-model="form.type"><option value="izin">Izin</option><option value="sakit">Sakit</option></select></label>
            <label><span>Tanggal</span><input v-model="form.date" type="date" required /></label>
            <label v-if="form.type === 'izin'"><span>Alasan</span><textarea v-model="form.reason" rows="3" placeholder="Tuliskan alasan izin" required /></label>
            <div v-else class="document-box">
              <span>Surat Sakit</span>
              <p>Unggah PDF atau gambar. Anda juga dapat langsung memotret surat sakit.</p>
              <input ref="uploadInput" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*" class="hidden-input" @change="selectDocument" />
              <input ref="cameraInput" type="file" accept="image/*" capture="environment" class="hidden-input" @change="selectDocument" />
              <div class="document-actions">
                <button type="button" @click="uploadInput?.click()"><ion-icon :icon="cloudUploadOutline" />Upload File</button>
                <button type="button" @click="cameraInput?.click()"><ion-icon :icon="cameraOutline" />Buka Kamera</button>
              </div>
              <small v-if="form.document">{{ form.document.name }}</small>
            </div>
            <ion-button type="submit" expand="block" :disabled="saving">{{ saving ? 'Mengirim...' : 'Kirim Pengajuan' }}</ion-button>
          </form>
        </section>
        <section class="history-section">
          <h2>Riwayat Izin / Sakit</h2>
          <div v-if="loading" class="empty-card">Memuat riwayat...</div>
          <article v-for="item in requests" :key="item.id" class="history-card">
            <div class="history-top">
              <strong>{{ item.type === 'sakit' ? 'Sakit' : 'Izin' }}</strong>
              <span class="status-pill" :class="requestStatusClass(item.status)">{{ requestStatusLabel(item.status) }}</span>
            </div>
            <p>{{ requestDate(item.date) }}</p>
            <a v-if="item.document_url" :href="item.document_url" target="_blank" rel="noopener">Lihat dokumen</a>
            <small v-else>{{ item.reason || '-' }}</small>
            <button v-if="item.status === 'pending'" type="button" class="cancel-button" @click="remove(item.id)">Batalkan pengajuan</button>
          </article>
          <div v-if="!loading && !requests.length" class="empty-card">Belum ada pengajuan izin atau sakit.</div>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import type { RefresherCustomEvent } from '@ionic/vue'
import { arrowBackOutline, cameraOutline, cloudUploadOutline } from 'ionicons/icons'
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showAppAlert } from '@/services/alerts'
import { apiErrorMessage } from '@/services/api'
import { createPermission, deletePermission, getPermissions, type PermissionRequestItem } from '@/services/requests'
import { requestDate, requestStatusClass, requestStatusLabel } from '@/utils/requestFormatters'

const router = useRouter()
const route = useRoute()
const requests = ref<PermissionRequestItem[]>([])
const form = reactive<{ type: 'izin' | 'sakit'; date: string; reason: string; document: File | null }>({ type: 'izin', date: '', reason: '', document: null })
const uploadInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const loading = ref(true)
const saving = ref(false)

async function load() {
  loading.value = true
  try { requests.value = (await getPermissions()).requests }
  catch (error) { await showAppAlert({ header: 'Gagal Memuat Pengajuan', message: apiErrorMessage(error), type: 'danger' }) }
  finally { loading.value = false }
}

function selectDocument(event: Event) {
  form.document = (event.target as HTMLInputElement).files?.[0] || null
}

async function submit() {
  if (form.type === 'sakit' && !form.document) {
    await showAppAlert({ header: 'Surat Sakit Diperlukan', message: 'Upload file atau ambil foto surat sakit terlebih dahulu.', type: 'warning' }); return
  }
  const payload = new FormData()
  payload.append('type', form.type); payload.append('date', form.date); payload.append('reason', form.reason)
  if (form.document) payload.append('document', form.document)
  saving.value = true
  try {
    const response = await createPermission(payload)
    form.date = ''; form.reason = ''; form.document = null
    if (uploadInput.value) uploadInput.value.value = ''
    if (cameraInput.value) cameraInput.value.value = ''
    await load()
    await showAppAlert({ header: 'Pengajuan Terkirim', message: response.message, type: 'success' })
  } catch (error) { await showAppAlert({ header: 'Pengajuan Gagal', message: apiErrorMessage(error), type: 'danger' }) }
  finally { saving.value = false }
}

async function remove(id: number) {
  if (!window.confirm('Batalkan pengajuan izin atau sakit ini?')) return
  try {
    const response = await deletePermission(id); await load()
    await showAppAlert({ header: 'Pengajuan Dibatalkan', message: response.message, type: 'success' })
  } catch (error) { await showAppAlert({ header: 'Pembatalan Gagal', message: apiErrorMessage(error), type: 'danger' }) }
}

function applyRouteType() {
  form.type = route.query.type === 'sakit' ? 'sakit' : 'izin'
}

async function refresh(event: RefresherCustomEvent) { await load(); event.target.complete() }
watch(() => route.query.type, applyRouteType)
onMounted(() => { applyRouteType(); void load() })
</script>

<style scoped src="./request-page.css"></style>
