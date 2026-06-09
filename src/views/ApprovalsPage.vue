<template>
  <ion-page>
    <ion-content fullscreen class="request-page">
      <ion-refresher slot="fixed" @ionRefresh="refresh"><ion-refresher-content /></ion-refresher>
      <main class="request-shell">
        <header class="page-header">
          <button type="button" aria-label="Kembali" @click="router.back()"><ion-icon :icon="arrowBackOutline" /></button>
          <div><span>Supervisor Tools</span><h1>Approval Bawahan</h1></div>
        </header>

        <section class="hero-card">
          <span class="hero-eyebrow">Persetujuan Tim</span>
          <h2>{{ pendingCount }} pengajuan menunggu</h2>
          <p>Proses cuti, PH, extra off, izin, dan sakit dari bawahan langsung Anda.</p>
        </section>

        <section class="history-section">
          <h2>Daftar Pengajuan</h2>
          <div v-if="loading" class="empty-card">Memuat approval bawahan...</div>

          <article v-for="item in approvals" :key="`${item.type}-${item.id}`" class="history-card approval-card">
            <div class="history-top">
              <div>
                <strong>{{ item.employee_name }}</strong>
                <small>{{ item.employee_nik }} · {{ approvalTypeLabel(item.type) }}</small>
              </div>
              <span class="status-pill status-pending">{{ item.label }}</span>
            </div>

            <p>{{ dateRangeLabel(item) }}</p>
            <small>{{ item.reason || 'Tanpa alasan tambahan.' }}</small>

            <div class="approval-actions">
              <button type="button" class="reject-button" :disabled="processingKey === keyFor(item)" @click="openReject(item)">
                Tolak
              </button>
              <button type="button" class="approve-button" :disabled="processingKey === keyFor(item)" @click="approve(item)">
                {{ processingKey === keyFor(item) ? 'Memproses...' : 'Setujui' }}
              </button>
            </div>
          </article>

          <div v-if="!loading && !approvals.length" class="empty-card">
            Belum ada pengajuan bawahan yang menunggu approval.
          </div>
        </section>

        <ion-modal :is-open="rejectModalOpen" class="approval-modal" @didDismiss="closeReject">
          <section class="approval-modal-card">
            <h2>Tolak Pengajuan</h2>
            <p>{{ selectedApproval?.employee_name || 'Karyawan' }} · {{ selectedApproval ? approvalTypeLabel(selectedApproval.type) : '-' }}</p>
            <label>
              <span>Alasan penolakan</span>
              <textarea v-model.trim="rejectReason" rows="4" placeholder="Tuliskan alasan untuk karyawan" />
            </label>
            <div class="modal-actions">
              <ion-button fill="outline" :disabled="Boolean(processingKey)" @click="closeReject">Batal</ion-button>
              <ion-button color="danger" :disabled="Boolean(processingKey)" @click="rejectSelected">
                {{ processingKey ? 'Memproses...' : 'Tolak Pengajuan' }}
              </ion-button>
            </div>
          </section>
        </ion-modal>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonModal, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import type { RefresherCustomEvent } from '@ionic/vue'
import { arrowBackOutline } from 'ionicons/icons'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showAppAlert } from '@/services/alerts'
import { apiErrorMessage } from '@/services/api'
import {
  decideSubordinateApproval,
  getSubordinateApprovals,
  type SubordinateApprovalItem,
  type SubordinateApprovalType,
} from '@/services/requests'
import { requestDate } from '@/utils/requestFormatters'

const router = useRouter()
const approvals = ref<SubordinateApprovalItem[]>([])
const loading = ref(true)
const processingKey = ref('')
const rejectModalOpen = ref(false)
const rejectReason = ref('')
const selectedApproval = ref<SubordinateApprovalItem | null>(null)
const pendingCount = computed(() => approvals.value.length)

function keyFor(item: SubordinateApprovalItem) {
  return `${item.type}-${item.id}`
}

function approvalTypeLabel(type: SubordinateApprovalType) {
  return {
    leave: 'Cuti',
    ph: 'Public Holiday',
    extra_off: 'Extra Off',
    permission: 'Izin/Sakit',
  }[type]
}

function dateRangeLabel(item: SubordinateApprovalItem) {
  const start = item.start_date ? requestDate(item.start_date) : '-'
  const end = item.end_date ? requestDate(item.end_date) : null

  return end && end !== start ? `${start} - ${end}` : start
}

async function load(force = false) {
  loading.value = true
  try {
    const response = await getSubordinateApprovals({ force })
    approvals.value = response.requests || []
  } catch (error) {
    await showAppAlert({ header: 'Gagal Memuat Approval', message: apiErrorMessage(error, 'Approval bawahan tidak dapat dimuat.'), type: 'danger' })
  } finally {
    loading.value = false
  }
}

async function approve(item: SubordinateApprovalItem) {
  processingKey.value = keyFor(item)
  try {
    const response = await decideSubordinateApproval(item.type, item.id, { decision: 'approved' })
    await load(true)
    await showAppAlert({ header: 'Pengajuan Disetujui', message: response.message, type: 'success' })
  } catch (error) {
    await showAppAlert({ header: 'Approval Gagal', message: apiErrorMessage(error, 'Pengajuan tidak dapat disetujui.'), type: 'danger' })
  } finally {
    processingKey.value = ''
  }
}

function openReject(item: SubordinateApprovalItem) {
  selectedApproval.value = item
  rejectReason.value = ''
  rejectModalOpen.value = true
}

function closeReject() {
  if (processingKey.value) return
  rejectModalOpen.value = false
  selectedApproval.value = null
  rejectReason.value = ''
}

async function rejectSelected() {
  if (!selectedApproval.value) return

  processingKey.value = keyFor(selectedApproval.value)
  try {
    const response = await decideSubordinateApproval(selectedApproval.value.type, selectedApproval.value.id, {
      decision: 'rejected',
      reason: rejectReason.value,
    })
    rejectModalOpen.value = false
    selectedApproval.value = null
    rejectReason.value = ''
    await load(true)
    await showAppAlert({ header: 'Pengajuan Ditolak', message: response.message, type: 'success' })
  } catch (error) {
    await showAppAlert({ header: 'Penolakan Gagal', message: apiErrorMessage(error, 'Pengajuan tidak dapat ditolak.'), type: 'danger' })
  } finally {
    processingKey.value = ''
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
.approval-card .history-top > div {
  min-width: 0;
}

.approval-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 11px;
}

.approval-actions button {
  min-height: 38px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 900;
}

.reject-button {
  border: 1px solid rgba(239, 68, 68, 0.24);
  background: rgba(239, 68, 68, 0.1);
  color: #F87171;
}

.approve-button {
  border: 1px solid rgba(34, 197, 94, 0.24);
  background: rgba(34, 197, 94, 0.14);
  color: #4ADE80;
}

.approval-actions button:disabled {
  opacity: .6;
}

.approval-modal {
  --background: transparent;
  --height: auto;
  --width: min(92vw, 420px);
  --border-radius: 18px;
}

.approval-modal-card {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--hris-border);
  background: var(--hris-card-bg);
  color: var(--hris-text-dark);
}

.approval-modal-card h2 {
  margin: 0;
  color: var(--hris-text-light);
  font-size: 17px;
  font-weight: 900;
}

.approval-modal-card p {
  margin: 6px 0 14px;
  color: var(--hris-text-secondary);
  font-size: 12px;
}

.approval-modal-card label {
  display: grid;
  gap: 6px;
}

.approval-modal-card label span {
  color: var(--hris-text-secondary);
  font-size: 11px;
  font-weight: 800;
}

.approval-modal-card textarea {
  width: 100%;
  border: 1px solid var(--hris-input-border);
  border-radius: 10px;
  background: var(--hris-input-bg);
  padding: 10px 11px;
  color: var(--hris-text-dark);
  font-size: 13px;
  outline: none;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.modal-actions ion-button {
  min-height: 38px;
  margin: 0;
  --border-radius: 9px;
  font-size: 12px;
  font-weight: 800;
}
</style>
