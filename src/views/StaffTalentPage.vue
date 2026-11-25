<template>
  <ion-page>
    <ion-content fullscreen class="request-page">
      <ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content /></ion-refresher>
      <main class="request-shell">
        <header class="page-header">
          <button type="button" aria-label="Kembali" @click="router.back()">
            <ion-icon :icon="arrowBackOutline" />
          </button>
          <div>
            <span>Employee Self Service</span>
            <h1>Jobdesk & KPI Saya</h1>
          </div>
        </header>

        <div v-if="loading" class="empty-card">Memuat data Jobdesk & KPI...</div>

        <template v-else-if="data">
          <section class="hero-card">
            <span class="hero-eyebrow">Informasi Jabatan</span>
            <strong style="font-size: 1.35rem;">{{ data.employee.jabatan }}</strong>
            <p>{{ data.employee.departemen || 'Tanpa departemen' }}</p>
          </section>

          <section class="history-section">
            <h2>Jobdesk Aktif ({{ data.jobdesks.length }})</h2>
            <article v-for="item in data.jobdesks" :key="item.id" class="history-card">
              <div class="history-top">
                <strong>{{ item.kategori }}</strong>
                <span class="status-pill status-approved">{{ item.tipe_tugas }}</span>
              </div>
              <p>{{ item.deskripsi }}</p>
              <ion-button
                v-if="item.has_document"
                size="small"
                fill="outline"
                :disabled="loadingPdfId === item.id"
                style="margin-top: 8px;"
                @click="openJobdeskPdf(item.id)"
              >
                {{ loadingPdfId === item.id ? 'Membuka PDF...' : 'Lihat PDF' }}
              </ion-button>
            </article>
            <div v-if="!data.jobdesks.length" class="empty-card">
              Belum ada jobdesk aktif untuk jabatan Anda.
            </div>
          </section>

          <section class="history-section">
            <h2>Target KPI Kinerja ({{ data.kpis.length }})</h2>
            <article v-for="item in data.kpis" :key="item.id" class="history-card">
              <div class="history-top">
                <strong>{{ item.nama_kpi }}</strong>
                <span class="status-pill status-pending">Bobot {{ item.bobot }}%</span>
              </div>
              <p v-if="item.template_name" style="font-size: 0.76rem; opacity: 0.75;">
                Template: {{ item.template_name }}
              </p>
              <p v-if="item.deskripsi">{{ item.deskripsi }}</p>
              <p style="margin-top: 6px; font-weight: 600;">
                Target: {{ item.target }} {{ item.satuan || '' }}
              </p>
              <p v-if="item.formula_penilaian" style="font-size: 0.78rem; opacity: 0.8;">
                Cara Penilaian: {{ item.formula_penilaian }}
              </p>
            </article>
            <div v-if="!data.kpis.length" class="empty-card">
              Belum ada KPI aktif yang ditugaskan kepada Anda.
            </div>
          </section>
        </template>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import type { RefresherCustomEvent } from '@ionic/vue'
import { arrowBackOutline } from 'ionicons/icons'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showAppAlert } from '@/services/alerts'
import { apiErrorMessage } from '@/services/api'
import { getStaffJobdeskPdfPreview, getStaffTalent, type StaffTalentResponse } from '@/services/talent'

const router = useRouter()
const data = ref<StaffTalentResponse | null>(null)
const loading = ref(true)
const loadingPdfId = ref<number | null>(null)

async function load() {
  loading.value = true
  try {
    data.value = await getStaffTalent()
  } catch (error) {
    await showAppAlert({ header: 'Gagal Memuat Data', message: apiErrorMessage(error, 'Jobdesk dan KPI tidak dapat dimuat.'), type: 'danger' })
  } finally {
    loading.value = false
  }
}

async function openJobdeskPdf(id: number) {
  loadingPdfId.value = id
  try {
    const res = await getStaffJobdeskPdfPreview(id)
    const bytes = Uint8Array.from(atob(res.content_base64), (c) => c.charCodeAt(0))
    const url = URL.createObjectURL(new Blob([bytes], { type: res.mime_type || 'application/pdf' }))
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (error) {
    await showAppAlert({ header: 'Gagal Membuka PDF', message: apiErrorMessage(error, 'Dokumen jobdesk tidak dapat ditampilkan.'), type: 'danger' })
  } finally {
    loadingPdfId.value = null
  }
}

async function refresh(event: RefresherCustomEvent) {
  await load()
  event.target.complete()
}

onMounted(() => void load())
</script>

<style scoped src="./request-page.css"></style>
