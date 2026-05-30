<template>
    <ion-page>
    <ion-content fullscreen class="profile-page">
      <main class="profile-shell">
        <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>

        <!-- Skeleton -->
        <div v-if="loading" class="skeleton-wrap">
          <div class="skeleton-hero"></div>
          <div class="skeleton-metrics">
            <div class="skeleton-metric"></div>
            <div class="skeleton-metric"></div>
            <div class="skeleton-metric"></div>
          </div>
          <div class="skeleton-row" v-for="n in 5" :key="n"></div>
        </div>

        <template v-if="!loading">
          <!-- Hero -->
          <section class="profile-hero">
            <button
              type="button"
              class="theme-toggle theme-toggle--hero"
              :aria-label="themeToggleLabel"
              @click="toggleThemeMode"
            >
              <ion-icon :icon="themeIcon" />
            </button>
            <!-- <p class="profile-eyebrow">Profil Karyawan</p> -->
            <ion-avatar class="profile-avatar">
              <img v-if="photoUrl" :src="photoUrl" alt="Foto profil" />
              <span v-else>{{ initials }}</span>
            </ion-avatar>
            <h1>{{ profileName }}</h1>
            <p class="profile-subtitle">{{ positionLabel }} · {{ departmentLabel }}</p>
            <span class="profile-username">
              <ion-icon :icon="idCardOutline" aria-hidden="true" />
              {{ employee?.nik || username }}
            </span>
          </section>

          <!-- Metrics -->
          <section class="profile-metrics">
            <article class="metric-card">
              <ion-icon :icon="calendarOutline" aria-hidden="true" />
              <strong>{{ joinDateLabel }}</strong>
              <span>Bergabung</span>
            </article>
            <article class="metric-card">
              <ion-icon :icon="layersOutline" aria-hidden="true" />
              <strong>{{ employee?.unit || '-' }}</strong>
              <span>Unit</span>
            </article>
            <article class="metric-card">
              <ion-icon :icon="businessOutline" aria-hidden="true" />
              <strong>{{ departmentLabel }}</strong>
              <span>Dept</span>
            </article>
          </section>

          <!-- Data Karyawan -->
          <section class="profile-section">
            <h2>Informasi Kerja</h2>
            <div class="info-group">
              <article v-for="item in workFields" :key="item.label" class="info-row">
                <div class="info-icon">
                  <ion-icon :icon="item.icon" aria-hidden="true" />
                </div>
                <div class="info-copy">
                  <span>{{ item.label }}</span>
                  <strong>{{ shown(item.value, item.label) }}</strong>
                </div>
              </article>
            </div>
          </section>

          <!-- Kontak & Pribadi -->
          <section class="profile-section">
            <h2>Kontak & Pribadi</h2>
            <div class="info-group">
              <article v-for="item in personalFields" :key="item.label" class="info-row">
                <div class="info-icon">
                  <ion-icon :icon="item.icon" aria-hidden="true" />
                </div>
                <div class="info-copy">
                  <span>{{ item.label }}</span>
                  <strong>{{ shown(item.value, item.label) }}</strong>
                </div>
              </article>
            </div>
          </section>

          <!-- Keluarga & Payroll -->
          <section class="profile-section">
            <h2>Keluarga & Payroll</h2>
            <div class="info-group">
              <article v-for="item in familyAndPayrollFields" :key="item.label" class="info-row">
                <div class="info-icon">
                  <ion-icon :icon="item.icon" aria-hidden="true" />
                </div>
                <div class="info-copy">
                  <span>{{ item.label }}</span>
                  <strong>{{ shown(item.value, item.label) }}</strong>
                </div>
              </article>
            </div>
          </section>
        </template>

        <!-- Logout selalu tampil -->
        <section class="profile-actions">
          <ion-button expand="block" class="logout-button" @click="logout">
            <ion-icon slot="start" :icon="logOutOutline" aria-hidden="true" />
            Logout
          </ion-button>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAvatar, IonButton, IonContent, IonIcon, IonPage } from '@ionic/vue'
import {
  briefcaseOutline,
  businessOutline,
  calendarOutline,
  callOutline,
  fileTrayFullOutline,
  gitNetworkOutline,
  homeOutline,
  idCardOutline,
  layersOutline,
  locationOutline,
  logOutOutline,
  mailOutline,
  peopleOutline,
  personOutline,
  ribbonOutline,
  schoolOutline,
  walletOutline,
  moonOutline,
  sunnyOutline,
} from 'ionicons/icons'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiErrorMessage } from '@/services/api'
import { authState, logoutEmployee } from '@/services/auth'
import { getStaffProfile, type StaffProfile } from '@/services/staff'
import { themeMode, toggleTheme } from '@/services/theme'
import { formatDate } from '@/utils/formatters'

type ProfileField = {
  label: string
  value: unknown
  icon: string
}

const router = useRouter()
const profile = ref<StaffProfile | null>(null)
const loading = ref(false)
const errorMessage = ref('')

const employee = computed(() => profile.value?.employee)
const profileName = computed(
  () => employee.value?.nama_karyawan || employee.value?.name || authState.user?.name || 'Karyawan',
)
const username = computed(() => profile.value?.user?.username || authState.user?.username || '-')
const positionLabel = computed(
  () => employee.value?.jabatan || employee.value?.posisi || authState.user?.position || 'Karyawan',
)
const departmentLabel = computed(() => employee.value?.departement || employee.value?.divisi || '-')
const photoUrl = computed(() => profile.value?.user?.photo_url || authState.user?.photo_url)
const initials = computed(() =>
  profileName.value
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase(),
)
const joinDateLabel = computed(() => formatDate(employee.value?.join_date))
const themeIcon = computed(() => (themeMode.value === 'dark' ? sunnyOutline : moonOutline))
const themeToggleLabel = computed(() =>
  themeMode.value === 'dark' ? 'Beralih ke tema terang' : 'Beralih ke tema gelap',
)

const workFields = computed<ProfileField[]>(() => [
  { label: 'Nama', value: profileName.value, icon: personOutline },
  { label: 'Jabatan', value: positionLabel.value, icon: briefcaseOutline },
  { label: 'Departemen', value: departmentLabel.value, icon: businessOutline },
  { label: 'Unit', value: employee.value?.unit, icon: layersOutline },
  { label: 'Atasan Langsung', value: employee.value?.nama_atasan_langsung, icon: personOutline },
  { label: 'Atasan Tidak Langsung', value: employee.value?.atasan_tidak_langsung, icon: gitNetworkOutline },
  { label: 'Tanggal Bergabung', value: joinDateLabel.value, icon: calendarOutline },
])

const personalFields = computed<ProfileField[]>(() => [
  { label: 'Email', value: profile.value?.user?.email || employee.value?.email, icon: mailOutline },
  { label: 'Nomor HP', value: employee.value?.no_hp, icon: callOutline },
  { label: 'Tempat Lahir', value: employee.value?.tempat_lahir, icon: locationOutline },
  { label: 'Tanggal Lahir', value: formatDate(employee.value?.tanggal_lahir), icon: calendarOutline },
  { label: 'Jenis Kelamin', value: employee.value?.jenis_kelamin, icon: personOutline },
  { label: 'Agama', value: employee.value?.agama, icon: ribbonOutline },
  { label: 'Kewarganegaraan', value: employee.value?.kewarganegaraan, icon: homeOutline },
  { label: 'Alamat', value: employee.value?.alamat, icon: locationOutline },
])

const familyAndPayrollFields = computed<ProfileField[]>(() => [
  { label: 'Pendidikan Terakhir', value: employee.value?.pendidikan_terakhir, icon: schoolOutline },
  { label: 'Institusi', value: employee.value?.nama_institusi, icon: schoolOutline },
  { label: 'Jurusan', value: employee.value?.jurusan, icon: schoolOutline },
  { label: 'Nama Pasangan', value: employee.value?.nama_pasangan, icon: peopleOutline },
  { label: 'Nama Ayah', value: employee.value?.nama_ayah, icon: peopleOutline },
  { label: 'Nama Ibu', value: employee.value?.nama_ibu, icon: peopleOutline },
  { label: 'Kontak Darurat', value: employee.value?.kontak_darurat_nama, icon: callOutline },
  { label: 'Hubungan Kontak', value: employee.value?.kontak_darurat_hubungan, icon: peopleOutline },
  { label: 'Nomor Darurat', value: employee.value?.kontak_darurat_no_hp, icon: callOutline },
  { label: 'Nama Rekening', value: employee.value?.account_name, icon: walletOutline },
  { label: 'Bank', value: employee.value?.bank, icon: walletOutline },
  { label: 'Nomor Rekening', value: employee.value?.no_rekening, icon: fileTrayFullOutline },
  { label: 'NPWP', value: employee.value?.no_npwp || (employee.value?.npwp ? 'Terdaftar' : '-'), icon: idCardOutline },
  { label: 'BPJS', value: employee.value?.no_bpjs || (employee.value?.bpjs ? 'Terdaftar' : '-'), icon: idCardOutline },
])

async function loadProfile() {
  loading.value = true
  errorMessage.value = ''
  try {
    profile.value = await getStaffProfile()
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Profil tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

function shown(value: unknown, label?: string) {
  if (value === null || value === undefined || value === '') return '-'

  if (label === 'Jenis Kelamin') {
    const normalized = String(value).trim().toUpperCase()
    if (normalized === 'L') return 'Laki laki'
    if (normalized === 'P') return 'Perempuan'
  }

  return String(value)
}

async function logout() {
  await logoutEmployee()
  await router.replace('/login')
}

function toggleThemeMode() {
  toggleTheme()
}

onMounted(loadProfile)
</script>

<style scoped>
.profile-page {
  --background: var(--hris-bg);
}

.profile-shell {
  min-height: 100%;
  padding: 0 0 96px;
}

/* ── Error ── */
.error-banner {
  margin: 12px 14px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #FEE2E2;
  color: #B91C1C;
}

/* ── Hero ── */
.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: max(28px, env(safe-area-inset-top)) 20px 52px;
  background: linear-gradient(160deg, var(--ion-color-primary) 0%, var(--ion-color-primary-shade) 100%);
  color: #fff;
}

.profile-eyebrow {
  margin: 0 0 16px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border: 3px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 26px;
  font-weight: 600;
  margin-bottom: 14px;
}

.profile-avatar span {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
}

.profile-hero h1 {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.profile-subtitle {
  margin: 0 0 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

.profile-username {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
}

.profile-username ion-icon {
  font-size: 14px;
}

/* ── Metrics ── */
.profile-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: -24px 14px 0;
  position: relative;
  z-index: 1;
}

.metric-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 14px 8px 12px;
  border-radius: 16px;
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.1);
}

.metric-card ion-icon {
  font-size: 20px;
  color: var(--ion-color-primary);
  margin-bottom: 6px;
}

.metric-card strong {
  display: block;
  color: var(--hris-text-dark);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 3px;
}

.metric-card span {
  display: block;
  color: var(--hris-text-secondary);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ── Sections ── */
.profile-section {
  margin-top: 20px;
  padding: 0 14px;
}

.profile-section h2 {
  margin: 0 0 10px;
  color: var(--hris-text-secondary);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

/* Group: satu card container, divider antar row */
.info-group {
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  border-radius: 16px;
  overflow: hidden;
}

.info-row {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 13px 14px;
  border-bottom: 1px solid var(--hris-border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-icon {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--hris-soft-surface);
  color: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-icon ion-icon {
  font-size: 17px;
}

.info-copy {
  min-width: 0;
  flex: 1;
}

.info-copy span {
  display: block;
  color: var(--hris-text-secondary);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  text-transform: capitalize;
}

.info-copy strong {
  display: block;
  margin-top: 2px;
  color: var(--hris-text-dark);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  text-transform: uppercase;
}

/* ── Actions ── */
.profile-actions {
  margin-top: 20px;
  padding: 0 14px;
}

.logout-button {
  height: 48px;
  --border-radius: 12px;
  --background: var(--hris-primary-button-bg);
  --background-activated: var(--hris-primary-button-bg-active);
  font-weight: 600;
}

/* ── Skeleton ── */
@keyframes shimmer {
  0% { opacity: 0.35; }
  50% { opacity: 0.7; }
  100% { opacity: 0.35; }
}

.skeleton-wrap {
  padding: 0 14px;
  padding-top: max(20px, env(safe-area-inset-top));
  display: grid;
  gap: 10px;
}

.skeleton-hero,
.skeleton-metric,
.skeleton-row {
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  border-radius: 16px;
  animation: shimmer 1.4s ease-in-out infinite;
}

.skeleton-hero {
  height: 220px;
  border-radius: 20px;
}

.skeleton-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.skeleton-metric {
  height: 80px;
}

.skeleton-row {
  height: 56px;
}

.theme-toggle {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid var(--hris-border);
  background: var(--hris-card-bg);
  color: var(--hris-text-dark);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.theme-toggle ion-icon {
  font-size: 18px;
}

.theme-toggle--hero {
  align-self: flex-end;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.18);
  color: #fff;
}
</style>
