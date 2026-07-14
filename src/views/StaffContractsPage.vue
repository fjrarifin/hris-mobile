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
            <span>Informasi Karyawan</span>
            <h1>Kontrak Kerja</h1>
          </div>
        </header>

        <section class="hero-card contract-hero">
          <span class="hero-eyebrow">Dokumen Kepegawaian</span>
          <h2>{{ data?.employee.name || 'Kontrak Saya' }}</h2>
          <p>Lihat masa berlaku kontrak aktif, riwayat kontrak Anda, dan kontrak aktif bawahan langsung.</p>
          <div class="contract-summary">
            <div><strong>{{ activeOwnContracts.length }}</strong><span>Aktif</span></div>
            <div><strong>{{ historyOwnContracts.length }}</strong><span>Riwayat</span></div>
            <div><strong>{{ data?.team_contracts.length || 0 }}</strong><span>Tim Aktif</span></div>
          </div>
        </section>

        <nav class="contract-tabs" aria-label="Kategori kontrak">
          <button type="button" :class="{ active: activeTab === 'mine' }" @click="activeTab = 'mine'">
            Kontrak Saya
          </button>
          <button type="button" :class="{ active: activeTab === 'team' }" @click="activeTab = 'team'">
            Kontrak Tim
          </button>
        </nav>

        <div v-if="loading" class="empty-card">Memuat data kontrak...</div>

        <template v-else-if="activeTab === 'mine'">
          <section class="history-section">
            <div class="section-heading">
              <div>
                <h2>Kontrak Aktif</h2>
                <p>Berlaku per {{ formatDate(data?.as_of_date) }}</p>
              </div>
              <span class="count-pill">{{ activeOwnContracts.length }}</span>
            </div>

            <contract-card
              v-for="contract in activeOwnContracts"
              :key="contract.id"
              :contract="contract"
              :previewing="previewingId === contract.id"
              @preview="previewDocument"
            />

            <div v-if="!activeOwnContracts.length" class="empty-card">Tidak ada kontrak aktif saat ini.</div>
          </section>

          <section class="history-section">
            <div class="section-heading">
              <div>
                <h2>Riwayat Kontrak</h2>
                <p>Kontrak terdahulu dan kontrak berikutnya</p>
              </div>
              <span class="count-pill muted">{{ historyOwnContracts.length }}</span>
            </div>

            <contract-card
              v-for="contract in historyOwnContracts"
              :key="contract.id"
              :contract="contract"
              :previewing="previewingId === contract.id"
              @preview="previewDocument"
            />

            <div v-if="!historyOwnContracts.length" class="empty-card">Belum ada riwayat kontrak.</div>
          </section>
        </template>

        <section v-else class="history-section">
          <div class="section-heading">
            <div>
              <h2>Kontrak Aktif Tim</h2>
              <p>Hanya bawahan langsung dengan kontrak aktif</p>
            </div>
            <span class="count-pill">{{ data?.team_contracts.length || 0 }}</span>
          </div>

          <article v-for="item in data?.team_contracts || []" :key="item.employee.nik" class="team-contract-card">
            <div class="employee-line">
              <div class="avatar">{{ initials(item.employee.name) }}</div>
              <div class="employee-copy">
                <strong>{{ item.employee.name }}</strong>
                <span>{{ item.employee.position || '-' }} · {{ item.employee.department || '-' }}</span>
                <small>{{ item.employee.nik }}</small>
              </div>
            </div>
            <contract-card
              :contract="item.contract"
              :previewing="previewingId === item.contract.id"
              compact
              @preview="previewDocument"
            />
          </article>

          <div v-if="!data?.team_contracts.length" class="empty-card">
            Belum ada kontrak aktif bawahan langsung.
          </div>
        </section>
      </main>

      <ion-modal :is-open="previewOpen" class="pdf-modal" @didDismiss="closePreview">
        <section class="pdf-shell">
          <header>
            <div>
              <span>Dokumen Kontrak</span>
              <strong>{{ previewFilename }}</strong>
            </div>
            <button type="button" aria-label="Tutup dokumen" @click="closePreview">
              <ion-icon :icon="closeOutline" />
            </button>
          </header>
          <iframe v-if="previewUrl" :src="previewUrl" title="Pratinjau dokumen kontrak" />
        </section>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonIcon, IonModal, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import type { RefresherCustomEvent } from '@ionic/vue'
import { arrowBackOutline, closeOutline } from 'ionicons/icons'
import { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, type PropType } from 'vue'
import { useRouter } from 'vue-router'
import { showAppAlert } from '@/services/alerts'
import { apiErrorMessage } from '@/services/api'
import {
  getStaffContractPdfPreview,
  getStaffContracts,
  type StaffContract,
  type StaffContractsResponse,
} from '@/services/staff'

const router = useRouter()
const data = ref<StaffContractsResponse | null>(null)
const loading = ref(true)
const activeTab = ref<'mine' | 'team'>('mine')
const previewingId = ref<number | null>(null)
const previewOpen = ref(false)
const previewUrl = ref('')
const previewFilename = ref('')

const activeOwnContracts = computed(() => data.value?.own_contracts.filter((item) => item.state === 'active') || [])
const historyOwnContracts = computed(() => data.value?.own_contracts.filter((item) => item.state !== 'active') || [])

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(`${value}T00:00:00`))
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'K'
}

const ContractCard = defineComponent({
  name: 'ContractCard',
  props: {
    contract: { type: Object as PropType<StaffContract>, required: true },
    previewing: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
  },
  emits: ['preview'],
  setup(props, { emit }) {
    return () => h('article', { class: ['contract-card', { compact: props.compact }] }, [
      h('div', { class: 'contract-top' }, [
        h('div', {}, [
          h('span', { class: 'contract-number' }, `Kontrak ke-${props.contract.contract_number}`),
          h('strong', {}, props.contract.contract_type),
        ]),
        h('span', { class: ['contract-status', `state-${props.contract.state}`] },
          props.contract.state === 'active' ? 'Aktif' : props.contract.state === 'upcoming' ? 'Akan Datang' : 'Riwayat'),
      ]),
      h('div', { class: 'date-range' }, [
        h('div', {}, [h('span', {}, 'Mulai'), h('strong', {}, formatDate(props.contract.start_date))]),
        h('span', { class: 'range-line' }, '—'),
        h('div', {}, [h('span', {}, 'Berakhir'), h('strong', {}, formatDate(props.contract.end_date))]),
      ]),
      props.contract.state === 'active' && props.contract.remaining_days !== null
        ? h('p', { class: 'remaining-label' }, `${props.contract.remaining_days} hari masa kontrak tersisa`)
        : null,
      props.contract.description ? h('p', { class: 'contract-description' }, props.contract.description) : null,
      props.contract.has_document
        ? h('button', {
            type: 'button',
            class: 'preview-button',
            disabled: props.previewing,
            onClick: () => emit('preview', props.contract),
          }, props.previewing ? 'Membuka dokumen...' : 'Lihat Dokumen Kontrak')
        : h('small', { class: 'no-document' }, 'Dokumen PDF belum tersedia'),
    ])
  },
})

async function loadContracts(force = false) {
  loading.value = true
  try {
    data.value = await getStaffContracts({ force })
  } catch (error) {
    await showAppAlert({
      header: 'Gagal Memuat Kontrak',
      message: apiErrorMessage(error, 'Data kontrak tidak dapat dimuat.'),
      type: 'danger',
    })
  } finally {
    loading.value = false
  }
}

async function refresh(event: RefresherCustomEvent) {
  await loadContracts(true)
  event.target.complete()
}

function base64PdfUrl(content: string, mimeType: string) {
  const binary = atob(content)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return URL.createObjectURL(new Blob([bytes], { type: mimeType || 'application/pdf' }))
}

async function previewDocument(contract: StaffContract) {
  previewingId.value = contract.id
  try {
    const response = await getStaffContractPdfPreview(contract.id)
    closePreview()
    previewUrl.value = base64PdfUrl(response.content_base64, response.mime_type)
    previewFilename.value = response.filename
    previewOpen.value = true
  } catch (error) {
    await showAppAlert({
      header: 'Dokumen Tidak Dapat Dibuka',
      message: apiErrorMessage(error, 'Dokumen kontrak tidak tersedia.'),
      type: 'danger',
    })
  } finally {
    previewingId.value = null
  }
}

function closePreview() {
  previewOpen.value = false
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  previewFilename.value = ''
}

onMounted(loadContracts)
onBeforeUnmount(closePreview)
</script>

<style scoped src="./request-page.css"></style>
<style scoped>
.contract-hero { background: linear-gradient(135deg, rgba(236, 72, 153, .2), rgba(124, 58, 237, .1)), var(--hris-card-bg); }
.contract-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 14px; }
.contract-summary div { padding: 9px; border-radius: 11px; background: var(--hris-soft-surface); text-align: center; }
.contract-summary strong { margin: 0; font-size: 20px; }
.contract-summary span { display: block; margin-top: 3px; color: var(--hris-text-secondary); font-size: 9px; font-weight: 800; text-transform: uppercase; }
.contract-tabs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; padding: 4px; border: 1px solid var(--hris-border); border-radius: 13px; background: var(--hris-card-bg); }
.contract-tabs button { border: 0; border-radius: 9px; background: transparent; padding: 10px; color: var(--hris-text-secondary); font-size: 11px; font-weight: 900; }
.contract-tabs button.active { background: var(--hris-primary-button-bg); color: white; box-shadow: 0 5px 16px rgba(59, 130, 246, .2); }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-heading h2 { margin: 0; }
.section-heading p { margin: 3px 0 0; color: var(--hris-text-secondary); font-size: 10px; }
.count-pill { min-width: 28px; padding: 5px 8px; border-radius: 999px; background: rgba(34, 197, 94, .14); color: #4ade80; font-size: 10px; font-weight: 900; text-align: center; }
.count-pill.muted { background: rgba(148, 163, 184, .14); color: var(--hris-text-secondary); }
:deep(.contract-card) { padding: 13px; border: 1px solid var(--hris-border); border-radius: 15px; background: var(--hris-card-bg); box-shadow: 0 8px 24px rgba(15, 23, 42, .08); }
:deep(.contract-card.compact) { border: 0; border-top: 1px solid var(--hris-border); border-radius: 0; padding: 12px 0 0; box-shadow: none; }
:deep(.contract-top) { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
:deep(.contract-top strong), :deep(.contract-number) { display: block; }
:deep(.contract-number) { color: var(--hris-text-secondary); font-size: 9px; font-weight: 800; text-transform: uppercase; }
:deep(.contract-top strong) { margin-top: 3px; color: var(--hris-text-dark); font-size: 16px; font-weight: 900; }
:deep(.contract-status) { border-radius: 999px; padding: 5px 8px; font-size: 9px; font-weight: 900; }
:deep(.state-active) { background: rgba(34, 197, 94, .14); color: #4ade80; }
:deep(.state-upcoming) { background: rgba(59, 130, 246, .14); color: #60a5fa; }
:deep(.state-history) { background: rgba(148, 163, 184, .14); color: var(--hris-text-secondary); }
:deep(.date-range) { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; margin-top: 13px; padding: 10px; border-radius: 11px; background: var(--hris-soft-surface); }
:deep(.date-range div:last-child) { text-align: right; }
:deep(.date-range span), :deep(.date-range strong) { display: block; }
:deep(.date-range span) { color: var(--hris-text-secondary); font-size: 9px; font-weight: 700; }
:deep(.date-range strong) { margin-top: 3px; color: var(--hris-text-dark); font-size: 11px; font-weight: 900; }
:deep(.range-line) { color: var(--ion-color-primary) !important; }
:deep(.remaining-label) { margin: 9px 0 0; color: #4ade80; font-size: 10px; font-weight: 800; }
:deep(.contract-description) { margin: 8px 0 0; color: var(--hris-text-secondary); font-size: 10px; line-height: 1.45; }
:deep(.preview-button) { width: 100%; margin-top: 11px; border: 1px solid rgba(59, 130, 246, .22); border-radius: 9px; background: rgba(59, 130, 246, .1); padding: 9px; color: var(--ion-color-primary); font-size: 10px; font-weight: 900; }
:deep(.preview-button:disabled) { opacity: .6; }
:deep(.no-document) { display: block; margin-top: 10px; color: var(--hris-text-secondary); font-size: 9px; font-style: italic; }
.team-contract-card { display: grid; gap: 11px; padding: 13px; border: 1px solid var(--hris-border); border-radius: 16px; background: var(--hris-card-bg); box-shadow: 0 9px 26px rgba(15, 23, 42, .08); }
.employee-line { display: flex; align-items: center; gap: 10px; }
.avatar { display: grid; width: 40px; height: 40px; flex: 0 0 auto; place-items: center; border-radius: 14px; background: rgba(236, 72, 153, .13); color: #ec4899; font-size: 11px; font-weight: 900; }
.employee-copy { min-width: 0; }
.employee-copy strong, .employee-copy span, .employee-copy small { display: block; }
.employee-copy strong { color: var(--hris-text-dark); font-size: 13px; font-weight: 900; }
.employee-copy span, .employee-copy small { margin-top: 2px; overflow: hidden; color: var(--hris-text-secondary); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.pdf-modal { --width: 100%; --height: 100%; }
.pdf-shell { display: grid; height: 100%; grid-template-rows: auto 1fr; background: var(--hris-bg); }
.pdf-shell header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: max(14px, env(safe-area-inset-top)) 14px 12px; border-bottom: 1px solid var(--hris-border); background: var(--hris-card-bg); }
.pdf-shell header span, .pdf-shell header strong { display: block; }
.pdf-shell header span { color: var(--ion-color-primary); font-size: 9px; font-weight: 800; text-transform: uppercase; }
.pdf-shell header strong { margin-top: 3px; color: var(--hris-text-dark); font-size: 12px; }
.pdf-shell header button { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid var(--hris-border); border-radius: 11px; background: var(--hris-soft-surface); color: var(--hris-text-dark); }
.pdf-shell iframe { width: 100%; height: 100%; border: 0; background: white; }
</style>
