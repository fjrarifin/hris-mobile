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
            <span>General Affairs</span>
            <h1>Work Order</h1>
          </div>
        </header>

        <section class="wo-tabs">
          <button
            type="button"
            class="wo-tab-btn"
            :class="{ active: scope === 'all' }"
            @click="switchScope('all')"
          >
            Semua Work Order
          </button>
          <button
            type="button"
            class="wo-tab-btn"
            :class="{ active: scope === 'approvals' }"
            @click="switchScope('approvals')"
          >
            Approval WO
          </button>
        </section>

        <section class="form-card">
          <div class="wo-toolbar">
            <input
              v-model.trim="filters.search"
              type="search"
              placeholder="Cari nomor, area, atau deskripsi..."
              class="wo-search-input"
              @keyup.enter="load(1)"
            />
            <select v-model="filters.status" class="wo-select" @change="load(1)">
              <option value="">Semua Status</option>
              <option value="WAITING_APPROVAL">Menunggu Persetujuan</option>
              <option value="PENDING_GA">Menunggu Review GA</option>
              <option value="RAB_PENDING">Menunggu Persetujuan RAB</option>
              <option value="ON_PROGRESS">Sedang Dikerjakan</option>
              <option value="REVIEW">Menunggu Review Pemohon</option>
              <option value="DONE">Selesai</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>
          <div class="wo-actions-row">
            <ion-button size="small" fill="outline" @click="load(1)">Cari</ion-button>
            <ion-button v-if="canCreateWorkOrder" size="small" @click="openCreateModal">
              + Buat Work Order
            </ion-button>
          </div>
        </section>

        <section class="history-section">
          <h2>{{ scope === 'approvals' ? 'Daftar Approval Work Order' : 'Daftar Work Order' }} ({{ workOrders.total }})</h2>
          <div v-if="loading" class="empty-card">Memuat Work Order...</div>
          <article
            v-for="item in workOrders.data"
            :key="item.id"
            class="history-card wo-card"
            @click="openDetail(item.id)"
          >
            <div class="history-top">
              <strong>{{ item.wo_number || `WO #${item.id}` }}</strong>
              <span class="wo-pill" :class="statusPillClass(item.status)">
                {{ statusLabel(item.status) }}
              </span>
            </div>
            <p class="wo-area">{{ item.job_type }} • {{ item.area_name }}</p>
            <p class="wo-meta">
              <span v-if="item.requester_name">Pemohon: {{ item.requester_name }}</span>
              <span v-if="item.target_date"> • Target: {{ requestDate(item.target_date) }}</span>
            </p>
          </article>
          <div v-if="!loading && !workOrders.data.length" class="empty-card">
            Belum ada data Work Order.
          </div>

          <div v-if="workOrders.last_page > 1" class="wo-pagination">
            <ion-button
              size="small"
              fill="outline"
              :disabled="workOrders.current_page <= 1 || loading"
              @click="load(workOrders.current_page - 1)"
            >
              Sebelumnya
            </ion-button>
            <span class="wo-page-info">Hal {{ workOrders.current_page }} / {{ workOrders.last_page }}</span>
            <ion-button
              size="small"
              fill="outline"
              :disabled="workOrders.current_page >= workOrders.last_page || loading"
              @click="load(workOrders.current_page + 1)"
            >
              Berikutnya
            </ion-button>
          </div>
        </section>
      </main>

      <!-- Modal Buat Work Order -->
      <ion-modal :is-open="createModalOpen" @didDismiss="createModalOpen = false">
        <ion-page>
          <ion-content class="request-page">
            <main class="request-shell">
              <header class="page-header">
                <button type="button" aria-label="Tutup" @click="createModalOpen = false">
                  <ion-icon :icon="closeOutline" />
                </button>
                <div>
                  <span>Pengajuan Baru</span>
                  <h1>Buat Work Order</h1>
                </div>
              </header>

              <section class="form-card">
                <form class="request-form" @submit.prevent="submitNewWo">
                  <label>
                    <span>Jenis Pekerjaan</span>
                    <select v-model="newWo.job_type" required>
                      <option value="WORK ORDER">WORK ORDER</option>
                      <option value="PERBAIKAN">PERBAIKAN</option>
                      <option value="PEMBUATAN">PEMBUATAN</option>
                      <option value="PENGADAAN">PENGADAAN</option>
                      <option value="LAINNYA">LAINNYA</option>
                    </select>
                  </label>

                  <label>
                    <span>Area / Lokasi (Master Unit)</span>
                    <select v-model="newWo.area_name" required>
                      <option disabled value="">Pilih Area / Lokasi</option>
                      <option v-for="unit in masterUnits" :key="unit" :value="unit">{{ unit }}</option>
                    </select>
                  </label>

                  <label>
                    <span>Deskripsi Pekerjaan</span>
                    <textarea
                      v-model.trim="newWo.project_description"
                      rows="3"
                      placeholder="Jelaskan detail pekerjaan yang dibutuhkan..."
                      required
                    />
                  </label>

                  <label>
                    <span>Target Tanggal (Opsional)</span>
                    <input v-model="newWo.target_date" type="date" />
                  </label>

                  <label>
                    <span>Catatan Tambahan (Opsional)</span>
                    <textarea v-model.trim="newWo.notes" rows="2" placeholder="Catatan tambahan..." />
                  </label>

                  <label>
                    <span>Foto Lampiran (Wajib 1–3 foto, maks 2 MB/foto)</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple @change="onPhotoSelected" />
                  </label>
                  <div v-if="photoItems.length" class="wo-chip-list">
                    <span v-for="(p, idx) in photoItems" :key="idx" class="wo-chip">
                      {{ p.name }}
                      <button type="button" @click="removePhoto(idx)">×</button>
                    </span>
                  </div>

                  <label>
                    <span>Dokumen Pendukung (Opsional, PDF/Gambar maks 5 MB)</span>
                    <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" @change="onDocumentSelected" />
                  </label>
                  <div v-if="documentFileName" class="wo-chip-list">
                    <span class="wo-chip">
                      {{ documentFileName }}
                      <button type="button" @click="removeDocument">×</button>
                    </span>
                  </div>

                  <div class="wo-approver-box">
                    <span class="wo-field-label">Pilih Approver (minimal 1)</span>
                    <input
                      v-model.trim="approverSearch"
                      type="search"
                      placeholder="Cari nama / NIK / jabatan approver..."
                      class="wo-search-input"
                    />
                    <div class="wo-approver-list">
                      <label v-for="u in filteredApprovers" :key="u.id" class="wo-approver-item">
                        <input
                          type="checkbox"
                          :value="u.id"
                          v-model="newWo.approver_ids"
                        />
                        <span>
                          <strong>{{ u.name }}</strong>
                          <small>{{ [u.nik, u.jabatan].filter(Boolean).join(' • ') }}</small>
                        </span>
                      </label>
                      <div v-if="!filteredApprovers.length" class="wo-empty-small">Tidak ada approver ditemukan.</div>
                    </div>
                  </div>

                  <ion-button type="submit" expand="block" :disabled="busy">
                    {{ busy ? 'Mengirim...' : 'Kirim Pengajuan Work Order' }}
                  </ion-button>
                </form>
              </section>
            </main>
          </ion-content>
        </ion-page>
      </ion-modal>

      <!-- Modal Detail Work Order -->
      <ion-modal :is-open="detailModalOpen" @didDismiss="closeDetailModal">
        <ion-page>
          <ion-content class="request-page">
            <main class="request-shell">
              <header class="page-header">
                <button type="button" aria-label="Tutup" @click="closeDetailModal">
                  <ion-icon :icon="closeOutline" />
                </button>
                <div>
                  <span>Detail Work Order</span>
                  <h1>{{ detail?.work_order?.wo_number || (activeDetailId ? `WO #${activeDetailId}` : 'Detail') }}</h1>
                </div>
              </header>

              <div v-if="detailLoading" class="empty-card">Memuat detail Work Order...</div>

              <template v-else-if="detail?.work_order">
                <section class="form-card wo-detail-card">
                  <div class="history-top">
                    <strong>{{ detail.work_order.job_type }} • {{ detail.work_order.area_name }}</strong>
                    <span class="wo-pill" :class="statusPillClass(detail.work_order.status)">
                      {{ statusLabel(detail.work_order.status) }}
                    </span>
                  </div>
                  <p class="wo-desc">{{ detail.work_order.project_description }}</p>
                  <div class="wo-detail-grid">
                    <p v-if="detail.work_order.requester_name"><strong>Pemohon:</strong> {{ detail.work_order.requester_name }}</p>
                    <p v-if="detail.work_order.target_date"><strong>Target:</strong> {{ requestDate(detail.work_order.target_date) }}</p>
                    <p v-if="detail.work_order.technician_name"><strong>Teknisi:</strong> {{ detail.work_order.technician_name }}</p>
                    <p v-if="detail.work_order.rab_total"><strong>Total RAB:</strong> Rp {{ formatRp(detail.work_order.rab_total) }}</p>
                    <p v-if="detail.work_order.notes"><strong>Catatan:</strong> {{ detail.work_order.notes }}</p>
                  </div>

                  <div v-if="detailAttachmentButtons.length" class="wo-attach-row">
                    <ion-button
                      v-for="att in detailAttachmentButtons"
                      :key="att.key"
                      size="small"
                      fill="outline"
                      @click="openAttachment(att.type, att.index)"
                    >
                      {{ att.label }}
                    </ion-button>
                  </div>
                </section>

                <!-- Aksi Approval -->
                <section v-if="detail.my_pending_stage" class="form-card">
                  <h2>Keputusan Persetujuan ({{ detail.my_pending_stage === 'rab' ? 'RAB' : 'Pengajuan Awal' }})</h2>
                  <div class="request-form">
                    <label>
                      <span>Catatan / Komentar (Wajib jika menolak)</span>
                      <textarea v-model.trim="approvalComment" rows="2" placeholder="Tulis komentar persetujuan atau alasan penolakan..." />
                    </label>
                    <div class="wo-actions-row">
                      <ion-button color="success" :disabled="busy" @click="submitDecision('approve')">
                        Setujui
                      </ion-button>
                      <ion-button color="danger" fill="outline" :disabled="busy" @click="submitDecision('reject')">
                        Tolak
                      </ion-button>
                    </div>
                  </div>
                </section>

                <!-- Aksi Review Pemohon -->
                <section v-if="detail.can_review || detail.work_order.status === 'REVIEW'" class="form-card">
                  <h2>Review Hasil Pekerjaan</h2>
                  <div v-if="!showRevisionForm" class="wo-actions-row">
                    <ion-button color="success" :disabled="busy" @click="submitReview('done')">
                      Konfirmasi Selesai (Done)
                    </ion-button>
                    <ion-button color="warning" fill="outline" :disabled="busy" @click="showRevisionForm = true">
                      Minta Revisi
                    </ion-button>
                  </div>
                  <div v-else class="request-form">
                    <label>
                      <span>Catatan Revisi (Wajib)</span>
                      <textarea v-model.trim="reviewNotes" rows="2" placeholder="Jelaskan bagian yang perlu diperbaiki..." />
                    </label>
                    <label>
                      <span>Foto Revisi (Wajib 1–3 foto)</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple @change="onRevisionPhotoSelected" />
                    </label>
                    <div v-if="revisionPhotoItems.length" class="wo-chip-list">
                      <span v-for="(p, idx) in revisionPhotoItems" :key="idx" class="wo-chip">
                        {{ p.name }}
                        <button type="button" @click="revisionPhotoItems.splice(idx, 1)">×</button>
                      </span>
                    </div>
                    <div class="wo-actions-row">
                      <ion-button color="warning" :disabled="busy" @click="submitReview('revision')">
                        Kirim Permintaan Revisi
                      </ion-button>
                      <ion-button fill="outline" :disabled="busy" @click="showRevisionForm = false">
                        Batal
                      </ion-button>
                    </div>
                  </div>
                </section>

                <!-- Daftar Approval -->
                <section v-if="detail.approvals?.length" class="history-section">
                  <h2>Daftar Persetujuan</h2>
                  <article v-for="app in detail.approvals" :key="app.id" class="history-card">
                    <div class="history-top">
                      <strong>{{ app.approver_name || '-' }}</strong>
                      <span class="wo-pill" :class="approvalPillClass(app.status)">
                        {{ approvalStatusLabel(app.status) }}
                      </span>
                    </div>
                    <p>{{ app.stage === 'rab' ? 'Approval RAB' : 'Approval Awal' }}{{ app.approver_jabatan ? ` • ${app.approver_jabatan}` : '' }}</p>
                    <p v-if="app.comment" style="font-style: italic;">"{{ app.comment }}"</p>
                  </article>
                </section>

                <!-- Batalkan WO -->
                <section v-if="detail.can_cancel" class="form-card">
                  <ion-button color="danger" fill="outline" expand="block" :disabled="busy" @click="handleCancel(detail.work_order.id)">
                    Batalkan & Hapus Work Order
                  </ion-button>
                </section>
              </template>
            </main>
          </ion-content>
        </ion-page>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonModal, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import type { RefresherCustomEvent } from '@ionic/vue'
import { arrowBackOutline, closeOutline } from 'ionicons/icons'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showAppAlert } from '@/services/alerts'
import { apiErrorMessage } from '@/services/api'
import { authState } from '@/services/auth'
import {
  approveWorkOrder,
  cancelWorkOrder,
  createWorkOrder,
  fetchWorkOrderAttachment,
  getWorkOrderApprovers,
  getWorkOrderDetail,
  getWorkOrders,
  getWorkOrderUnits,
  reviewWorkOrder,
  type WorkOrderApprover,
  type WorkOrderDetailResponse,
  type WorkOrderListResponse,
} from '@/services/workOrder'
import { requestDate } from '@/utils/requestFormatters'

const route = useRoute()
const router = useRouter()

const scope = ref<'all' | 'approvals'>(route.query.scope === 'approvals' ? 'approvals' : 'all')
const canCreateWorkOrder = computed(() => Boolean(authState.user?.allow_work_order || authState.user?.level === 0))

const loading = ref(true)
const busy = ref(false)
const filters = reactive({ search: '', status: '' })
const workOrders = ref<WorkOrderListResponse>({ data: [], current_page: 1, last_page: 1, total: 0 })

// Create modal
const createModalOpen = ref(false)
const approvers = ref<WorkOrderApprover[]>([])
const masterUnits = ref<string[]>([])
const approverSearch = ref('')
const photoItems = ref<Array<{ name: string; dataUri: string }>>([])
const documentFileName = ref('')
const newWo = reactive({
  job_type: 'WORK ORDER',
  area_name: '',
  project_description: '',
  target_date: '',
  notes: '',
  photos: [] as string[],
  document: '',
  approver_ids: [] as number[],
})

// Detail modal
const detailModalOpen = ref(false)
const activeDetailId = ref<number | null>(null)
const detailLoading = ref(false)
const detail = ref<WorkOrderDetailResponse | null>(null)
const approvalComment = ref('')
const showRevisionForm = ref(false)
const reviewNotes = ref('')
const revisionPhotoItems = ref<Array<{ name: string; dataUri: string }>>([])

const filteredApprovers = computed(() => {
  const q = approverSearch.value.trim().toLowerCase()
  if (!q) return approvers.value
  return approvers.value.filter(
    (u) =>
      u.name?.toLowerCase().includes(q) ||
      u.nik?.toLowerCase().includes(q) ||
      u.jabatan?.toLowerCase().includes(q),
  )
})

const detailAttachmentButtons = computed(() => {
  const wo = detail.value?.work_order
  if (!wo) return []
  const list: Array<{ key: string; type: string; index: number; label: string }> = []
  const photos = Array.isArray(wo.photo_paths) && wo.photo_paths.length
    ? wo.photo_paths
    : wo.photo_path
      ? [wo.photo_path]
      : []
  photos.forEach((_, idx) => {
    list.push({ key: `photo-${idx}`, type: 'photo', index: idx, label: `Foto #${idx + 1}` })
  })
  if (wo.request_document_path) list.push({ key: 'doc', type: 'document', index: 0, label: 'Dokumen' })
  if (wo.completion_photo_path) list.push({ key: 'comp', type: 'completion', index: 0, label: 'Foto Selesai' })
  if (wo.spl_document_path) list.push({ key: 'spl', type: 'spl', index: 0, label: 'Dokumen SPL' })
  return list
})

function formatRp(val: number | string | null | undefined) {
  return new Intl.NumberFormat('id-ID').format(Math.round(Number(val || 0)))
}

function statusLabel(s: string) {
  if (String(s || '').startsWith('REV-')) return `Revisi ${String(s).slice(4)}`
  return (
    ({
      WAITING_APPROVAL: 'Menunggu Persetujuan',
      PENDING_GA: 'Menunggu Review GA',
      RAB_PENDING: 'Menunggu Persetujuan RAB',
      RAB_APPROVED: 'RAB Disetujui',
      SPL_PENDING: 'Menunggu Finance (SPL)',
      BUYING_MATERIAL: 'Pembelian Material',
      ON_PROGRESS: 'Sedang Dikerjakan',
      PROGRES: 'Sedang Dikerjakan',
      REVIEW: 'Menunggu Review Pemohon',
      DONE: 'Selesai',
      HOLD: 'Ditunda',
      REJECTED: 'Ditolak',
      BATAL: 'Dibatalkan',
    } as Record<string, string>)[s] || s
  )
}

function statusPillClass(s: string) {
  if (['DONE', 'RAB_APPROVED'].includes(s)) return 'wo-pill-ok'
  if (['ON_PROGRESS', 'PROGRES', 'BUYING_MATERIAL'].includes(s)) return 'wo-pill-info'
  if (['REJECTED', 'BATAL'].includes(s) || String(s || '').startsWith('REV-')) return 'wo-pill-err'
  return 'wo-pill-warn'
}

function approvalStatusLabel(s: string) {
  return ({ approved: 'Disetujui', rejected: 'Ditolak', pending: 'Menunggu' } as Record<string, string>)[s] || s
}

function approvalPillClass(s: string) {
  if (s === 'approved') return 'wo-pill-ok'
  if (s === 'rejected') return 'wo-pill-err'
  return 'wo-pill-warn'
}

async function load(page = 1) {
  loading.value = true
  try {
    workOrders.value = await getWorkOrders({
      page,
      per_page: 12,
      scope: scope.value,
      search: filters.search || undefined,
      status: filters.status || undefined,
    })
  } catch (error) {
    await showAppAlert({ header: 'Gagal Memuat Work Order', message: apiErrorMessage(error), type: 'danger' })
  } finally {
    loading.value = false
  }
}

function switchScope(next: 'all' | 'approvals') {
  if (scope.value === next) return
  scope.value = next
  void load(1)
}

async function openCreateModal() {
  createModalOpen.value = true
  const tasks: Promise<unknown>[] = []
  if (!approvers.value.length) {
    tasks.push(getWorkOrderApprovers().then((list) => { approvers.value = list }).catch(() => { approvers.value = [] }))
  }
  if (!masterUnits.value.length) {
    tasks.push(getWorkOrderUnits().then((list) => { masterUnits.value = list }).catch(() => { masterUnits.value = [] }))
  }
  if (tasks.length) await Promise.allSettled(tasks)
}

function onPhotoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length) return
  const remaining = 3 - photoItems.value.length
  if (remaining <= 0) {
    void showAppAlert({ header: 'Batas Foto', message: 'Maksimal 3 foto yang dapat dilampirkan.', type: 'warning' })
    input.value = ''
    return
  }
  for (const file of files.slice(0, remaining)) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      void showAppAlert({ header: 'Format Tidak Valid', message: 'Foto harus berupa JPG, PNG, atau WebP.', type: 'warning' })
      continue
    }
    if (file.size > 2 * 1024 * 1024) {
      void showAppAlert({ header: 'Ukuran Terlalu Besar', message: `Foto "${file.name}" melebihi 2 MB.`, type: 'warning' })
      continue
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (photoItems.value.length < 3) {
        photoItems.value.push({ name: file.name, dataUri: String(reader.result || '') })
        newWo.photos = photoItems.value.map((p) => p.dataUri)
      }
    }
    reader.readAsDataURL(file)
  }
  input.value = ''
}

function removePhoto(index: number) {
  photoItems.value.splice(index, 1)
  newWo.photos = photoItems.value.map((p) => p.dataUri)
}

function onDocumentSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    void showAppAlert({ header: 'Format Tidak Valid', message: 'Dokumen harus PDF, JPG, PNG, atau WebP.', type: 'warning' })
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    void showAppAlert({ header: 'Ukuran Terlalu Besar', message: 'Ukuran dokumen maksimal 5 MB.', type: 'warning' })
    return
  }
  documentFileName.value = file.name
  const reader = new FileReader()
  reader.onload = () => {
    newWo.document = String(reader.result || '')
  }
  reader.readAsDataURL(file)
}

function removeDocument() {
  newWo.document = ''
  documentFileName.value = ''
}

async function submitNewWo() {
  if (!newWo.area_name) {
    await showAppAlert({ header: 'Data Belum Lengkap', message: 'Pilih Area / Lokasi terlebih dahulu.', type: 'warning' })
    return
  }
  if (!newWo.photos.length) {
    await showAppAlert({ header: 'Foto Wajib', message: 'Lampiran foto minimal 1 wajib diunggah.', type: 'warning' })
    return
  }
  if (!newWo.approver_ids.length) {
    await showAppAlert({ header: 'Approver Wajib', message: 'Pilih minimal 1 approver.', type: 'warning' })
    return
  }
  busy.value = true
  try {
    const res = await createWorkOrder({
      job_type: newWo.job_type,
      area_name: newWo.area_name,
      project_description: newWo.project_description,
      target_date: newWo.target_date || null,
      notes: newWo.notes || null,
      photos: newWo.photos,
      document: newWo.document || null,
      approver_ids: newWo.approver_ids,
    })
    createModalOpen.value = false
    Object.assign(newWo, {
      job_type: 'WORK ORDER',
      area_name: '',
      project_description: '',
      target_date: '',
      notes: '',
      photos: [],
      document: '',
      approver_ids: [],
    })
    photoItems.value = []
    documentFileName.value = ''
    approverSearch.value = ''
    await load(1)
    await showAppAlert({ header: 'Berhasil', message: res.message || 'Work Order berhasil diajukan.', type: 'success' })
  } catch (error) {
    await showAppAlert({ header: 'Pengajuan Gagal', message: apiErrorMessage(error), type: 'danger' })
  } finally {
    busy.value = false
  }
}

async function openDetail(id: number) {
  activeDetailId.value = id
  detailModalOpen.value = true
  detailLoading.value = true
  approvalComment.value = ''
  showRevisionForm.value = false
  reviewNotes.value = ''
  revisionPhotoItems.value = []
  try {
    detail.value = await getWorkOrderDetail(id)
  } catch (error) {
    detailModalOpen.value = false
    await showAppAlert({ header: 'Gagal Memuat Detail', message: apiErrorMessage(error), type: 'danger' })
  } finally {
    detailLoading.value = false
  }
}

function closeDetailModal() {
  detailModalOpen.value = false
  activeDetailId.value = null
  detail.value = null
}

async function openAttachment(type: string, index = 0) {
  if (!activeDetailId.value) return
  try {
    const { blob } = await fetchWorkOrderAttachment(activeDetailId.value, type, index)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (error) {
    await showAppAlert({ header: 'Gagal Membuka Lampiran', message: apiErrorMessage(error), type: 'danger' })
  }
}

async function submitDecision(decision: 'approve' | 'reject') {
  if (!activeDetailId.value || !detail.value?.my_pending_stage) return
  if (decision === 'reject' && !approvalComment.value.trim()) {
    await showAppAlert({ header: 'Catatan Wajib', message: 'Alasan penolakan wajib diisi.', type: 'warning' })
    return
  }
  busy.value = true
  try {
    const res = await approveWorkOrder(activeDetailId.value, {
      stage: detail.value.my_pending_stage,
      decision,
      comment: approvalComment.value.trim() || null,
    })
    approvalComment.value = ''
    detail.value = await getWorkOrderDetail(activeDetailId.value)
    await load(workOrders.value.current_page || 1)
    await showAppAlert({ header: 'Berhasil', message: res.message || 'Keputusan berhasil disimpan.', type: 'success' })
  } catch (error) {
    await showAppAlert({ header: 'Gagal Menyimpan Keputusan', message: apiErrorMessage(error), type: 'danger' })
  } finally {
    busy.value = false
  }
}

function onRevisionPhotoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  const remaining = 3 - revisionPhotoItems.value.length
  for (const file of files.slice(0, Math.max(0, remaining))) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) continue
    const reader = new FileReader()
    reader.onload = () => {
      if (revisionPhotoItems.value.length < 3) {
        revisionPhotoItems.value.push({ name: file.name, dataUri: String(reader.result || '') })
      }
    }
    reader.readAsDataURL(file)
  }
  input.value = ''
}

async function submitReview(decision: 'done' | 'revision') {
  if (!activeDetailId.value) return
  if (decision === 'revision') {
    if (!reviewNotes.value.trim() || !revisionPhotoItems.value.length) {
      await showAppAlert({ header: 'Data Belum Lengkap', message: 'Catatan revisi dan minimal 1 foto wajib diisi.', type: 'warning' })
      return
    }
  } else if (!window.confirm('Konfirmasi pekerjaan sudah sesuai dan selesaikan Work Order ini?')) {
    return
  }
  busy.value = true
  try {
    const res = await reviewWorkOrder(activeDetailId.value, {
      decision,
      notes: reviewNotes.value.trim() || null,
      photos: decision === 'revision' ? revisionPhotoItems.value.map((p) => p.dataUri) : undefined,
    })
    showRevisionForm.value = false
    reviewNotes.value = ''
    revisionPhotoItems.value = []
    detail.value = await getWorkOrderDetail(activeDetailId.value)
    await load(workOrders.value.current_page || 1)
    await showAppAlert({ header: 'Berhasil', message: res.message || 'Review berhasil disimpan.', type: 'success' })
  } catch (error) {
    await showAppAlert({ header: 'Gagal Menyimpan Review', message: apiErrorMessage(error), type: 'danger' })
  } finally {
    busy.value = false
  }
}

async function handleCancel(id: number) {
  if (!window.confirm('Batalkan dan hapus Work Order ini secara permanen?')) return
  busy.value = true
  try {
    const res = await cancelWorkOrder(id)
    closeDetailModal()
    await load(1)
    await showAppAlert({ header: 'Dibatalkan', message: res.message || 'Work Order berhasil dibatalkan.', type: 'success' })
  } catch (error) {
    await showAppAlert({ header: 'Gagal Membatalkan', message: apiErrorMessage(error), type: 'danger' })
  } finally {
    busy.value = false
  }
}

async function refresh(event: RefresherCustomEvent) {
  await load(1)
  event.target.complete()
}

onMounted(() => void load(1))
</script>

<style scoped src="./request-page.css"></style>
<style scoped>
.wo-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.wo-tab-btn {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: transparent;
  font-weight: 600;
  font-size: 0.85rem;
  color: inherit;
}
.wo-tab-btn.active {
  background: var(--ion-color-primary, #2563eb);
  color: #fff;
  border-color: transparent;
}
.wo-toolbar {
  display: grid;
  gap: 8px;
}
.wo-search-input,
.wo-select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: transparent;
  color: inherit;
  font-size: 0.88rem;
}
.wo-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.wo-card {
  cursor: pointer;
}
.wo-area {
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 0.85;
  margin-top: 4px;
}
.wo-desc {
  font-size: 0.86rem;
  margin-top: 4px;
}
.wo-meta {
  font-size: 0.76rem;
  opacity: 0.7;
  margin-top: 6px;
}
.wo-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}
.wo-page-info {
  font-size: 0.8rem;
  opacity: 0.8;
}
.wo-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.wo-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  background: rgba(59, 130, 246, 0.14);
}
.wo-chip button {
  background: none;
  border: none;
  color: inherit;
  font-weight: 700;
  cursor: pointer;
}
.wo-approver-box {
  display: grid;
  gap: 8px;
}
.wo-field-label {
  font-size: 0.82rem;
  font-weight: 600;
}
.wo-approver-list {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 10px;
  padding: 6px;
  display: grid;
  gap: 6px;
}
.wo-approver-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 8px;
  font-size: 0.82rem;
}
.wo-approver-item small {
  display: block;
  opacity: 0.7;
  font-size: 0.72rem;
}
.wo-empty-small {
  text-align: center;
  font-size: 0.78rem;
  opacity: 0.7;
  padding: 10px;
}
.wo-detail-grid {
  display: grid;
  gap: 4px;
  margin-top: 10px;
  font-size: 0.82rem;
}
.wo-attach-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.wo-pill {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}
.wo-pill-ok {
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.35);
}
.wo-pill-info {
  background: rgba(37, 99, 235, 0.14);
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.35);
}
.wo-pill-warn {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.35);
}
.wo-pill-err {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.35);
}
</style>
