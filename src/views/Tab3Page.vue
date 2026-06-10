<template>
    <ion-page>
    <ion-content fullscreen class="profile-page">
      <ion-refresher slot="fixed" @ionRefresh="refreshProfile">
        <ion-refresher-content />
      </ion-refresher>
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
            <div class="hero-actions">
              <button
                type="button"
                class="theme-toggle theme-toggle--hero"
                :aria-label="themeToggleLabel"
                @click="toggleThemeMode"
              >
                <ion-icon :icon="themeIcon" />
              </button>
              <button
                type="button"
                class="theme-toggle theme-toggle--hero profile-qr-button"
                aria-label="Tampilkan QR karyawan"
                v-if="canEditProfile"
                @click="openQrModal"
              >
                <ion-icon :icon="qrCodeOutline" />
              </button>
              <div v-if="canEditProfile" class="settings-wrap">
                <button
                  v-if="settingsOpen"
                  type="button"
                  class="settings-backdrop"
                  aria-label="Tutup menu konfigurasi profil"
                  @click="closeSettingsMenu"
                ></button>
                <button
                  type="button"
                  class="theme-toggle theme-toggle--hero"
                  aria-label="Buka konfigurasi profil"
                  @click.stop="toggleSettingsMenu"
                >
                  <ion-icon :icon="settingsOutline" />
                </button>
                <div v-if="settingsOpen" class="settings-menu" @click.stop>
                  <button type="button" @click="openChangePassword">
                    <ion-icon :icon="keyOutline" />
                    Ubah Password
                  </button>
                  <button type="button" :disabled="photoLocked || uploadingPhoto" @click="openPhotoPicker">
                    <ion-icon :icon="cameraOutline" />
                    Ganti Foto Profil
                  </button>
                  <button type="button" :disabled="emailLocked || savingContact" @click="openContactModal('email')">
                    <ion-icon :icon="mailOutline" />
                    Ubah Email
                  </button>
                  <button type="button" :disabled="phoneLocked || savingContact" @click="openContactModal('phone')">
                    <ion-icon :icon="callOutline" />
                    Ganti Nomor Telepon
                  </button>
                  <!-- <button type="button" :disabled="testingPush" @click="testPushNotification">
                    <ion-icon :icon="notificationsOutline" />
                    Test Push Notification
                  </button> -->
                  <button type="button" class="settings-logout" @click="logout">
                    <ion-icon :icon="logOutOutline" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
            <input
              ref="photoInput"
              class="hidden-input"
              type="file"
              accept="image/png,image/jpeg"
              @change="choosePhoto"
            />
            <!-- <p class="profile-eyebrow">Profil Karyawan</p> -->
            <ion-avatar class="profile-avatar">
              <SecureImage v-if="photoUrl" :src="photoUrl" alt="Foto profil" />
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
          <section v-if="canEditProfile" class="profile-section">
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
          <section v-if="canEditProfile" class="profile-section">
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

        <ion-modal :is-open="photoModalOpen" class="profile-modal" @didDismiss="closePhotoModal">
          <section class="profile-modal-card">
            <h2>Preview Foto Profil</h2>
            <p>Pastikan foto sudah sesuai sebelum disimpan.</p>
            <img v-if="photoPreviewUrl" :src="photoPreviewUrl" alt="Preview foto profil" class="photo-preview" />
            <div class="modal-actions">
              <ion-button fill="outline" :disabled="uploadingPhoto" @click="closePhotoModal">Batal</ion-button>
              <ion-button :disabled="uploadingPhoto || !selectedPhoto" @click="savePhoto">
                {{ uploadingPhoto ? 'Menyimpan...' : 'Simpan Foto' }}
              </ion-button>
            </div>
          </section>
        </ion-modal>

        <ion-modal :is-open="contactModalOpen" class="profile-modal" @didDismiss="closeContactModal">
          <section class="profile-modal-card">
            <h2>{{ contactMode === 'email' ? 'Ubah Email' : 'Ganti Nomor Telepon' }}</h2>
            <p v-if="contactMode === 'email'">Email hanya dapat diubah satu kali melalui aplikasi.</p>
            <p v-else-if="phoneStep === 'input'">OTP akan dikirim ke nomor WhatsApp baru untuk memastikan nomor valid.</p>
            <p v-else>Kode OTP telah dikirim. Masukkan 6 digit kode sebelum menyimpan nomor.</p>

            <label class="modal-field">
              <span>{{ contactMode === 'email' ? 'Email baru' : 'Nomor WhatsApp baru' }}</span>
              <input
                v-model.trim="contactValue"
                :type="contactMode === 'email' ? 'email' : 'tel'"
                :disabled="contactMode === 'phone' && phoneStep === 'otp'"
                :placeholder="contactMode === 'email' ? 'nama@email.com' : '081234567890'"
              />
            </label>

            <label v-if="contactMode === 'phone' && phoneStep === 'otp'" class="modal-field">
              <span>Kode OTP</span>
              <input v-model.trim="phoneOtp" inputmode="numeric" maxlength="6" placeholder="6 digit OTP" />
            </label>

            <p v-if="contactMessage" class="modal-feedback" :class="{ danger: contactHasError }">
              {{ contactMessage }}
            </p>

            <div class="modal-actions">
              <ion-button fill="outline" :disabled="savingContact" @click="closeContactModal">Batal</ion-button>
              <ion-button v-if="contactMode === 'email'" :disabled="savingContact" @click="saveEmail">
                {{ savingContact ? 'Menyimpan...' : 'Simpan Email' }}
              </ion-button>
              <ion-button
                v-else-if="phoneStep === 'input'"
                :disabled="savingContact"
                @click="sendPhoneOtp"
              >
                {{ savingContact ? 'Mengirim...' : 'Kirim OTP' }}
              </ion-button>
              <ion-button v-else :disabled="savingContact || phoneOtp.length !== 6" @click="savePhone">
                {{ savingContact ? 'Menyimpan...' : 'Verifikasi & Simpan' }}
              </ion-button>
            </div>
          </section>
        </ion-modal>

        <ion-modal :is-open="qrModalOpen" class="profile-modal" @didDismiss="closeQrModal">
          <section class="profile-modal-card profile-qr-modal">
            <h2>QR Akses Gate</h2>
            <p>{{ profileName }} · {{ employee?.nik || username }}</p>

            <div class="qr-frame">
              <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR karyawan" />
              <span v-else>Memuat QR...</span>
            </div>

            <div class="modal-actions">
              <ion-button fill="outline" @click="refreshQrCode">Refresh</ion-button>
              <ion-button @click="closeQrModal">Tutup</ion-button>
            </div>
          </section>
        </ion-modal>

      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonAvatar, IonButton, IonContent, IonIcon, IonModal, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import type { RefresherCustomEvent } from '@ionic/vue'
import {
  briefcaseOutline,
  businessOutline,
  calendarOutline,
  cameraOutline,
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
  qrCodeOutline,
  ribbonOutline,
  schoolOutline,
  walletOutline,
  moonOutline,
  notificationsOutline,
  keyOutline,
  settingsOutline,
  sunnyOutline,
} from 'ionicons/icons'
import QRCode from 'qrcode'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import SecureImage from '@/components/SecureImage.vue'
import { useRoute, useRouter } from 'vue-router'
import { apiErrorMessage } from '@/services/api'
import { authState, logoutEmployee, updateEmployeePhoto } from '@/services/auth'
import {
  getStaffEmployeeProfile,
  getStaffProfile,
  requestStaffProfilePhoneOtp,
  updateStaffProfileContact,
  updateStaffProfilePhoto,
  type StaffProfile,
} from '@/services/staff'
import { themeMode, toggleTheme } from '@/services/theme'
import { formatDate } from '@/utils/formatters'
import { setSecureScreen } from '@/services/secureScreen'
import { sendTestPushNotification } from '@/services/pushNotifications'
import { showAppAlert } from '@/services/alerts'

type ProfileField = {
  label: string
  value: unknown
  icon: string
}

const router = useRouter()
const route = useRoute()
const profile = ref<StaffProfile | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const settingsOpen = ref(false)
const uploadingPhoto = ref(false)
const savingContact = ref(false)
const photoInput = ref<HTMLInputElement | null>(null)
const photoModalOpen = ref(false)
const selectedPhoto = ref<File | null>(null)
const photoPreviewUrl = ref('')
const contactModalOpen = ref(false)
const contactMode = ref<'email' | 'phone'>('phone')
const contactValue = ref('')
const phoneOtp = ref('')
const phoneStep = ref<'input' | 'otp'>('input')
const contactMessage = ref('')
const contactHasError = ref(false)
const qrModalOpen = ref(false)
const qrDataUrl = ref('')
const testingPush = ref(false)

const selectedNik = computed(() => {
  const nik = route.query.nik
  return typeof nik === 'string' && nik.trim() ? nik.trim() : ''
})
const canEditProfile = computed(
  () => profile.value?.editable !== false && (!selectedNik.value || selectedNik.value === authState.user?.username),
)
const shouldSecureScreen = computed(
  () => Boolean(selectedNik.value && selectedNik.value !== authState.user?.username),
)

function toggleSettingsMenu() {
  settingsOpen.value = !settingsOpen.value
}

function closeSettingsMenu() {
  settingsOpen.value = false
}
const employee = computed(() => profile.value?.employee)
const profileName = computed(
  () => employee.value?.nama_karyawan || employee.value?.name || authState.user?.name || 'Karyawan',
)
const username = computed(() => profile.value?.user?.username || authState.user?.username || '-')
const positionLabel = computed(
  () => employee.value?.jabatan || employee.value?.posisi || authState.user?.position || 'Karyawan',
)
const departmentLabel = computed(() => employee.value?.departement || employee.value?.divisi || '-')
const photoUrl = computed(() => profile.value?.user?.photo_url || (canEditProfile.value ? authState.user?.photo_url : ''))
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
const photoLocked = computed(() => profile.value?.user?.can_change_photo === false)
const phoneLocked = computed(() => profile.value?.user?.can_change_phone === false)
const emailLocked = computed(() => profile.value?.user?.can_change_email === false)
const qrDateCode = computed(() => {
  const today = new Date()
  const year = String(today.getFullYear()).slice(-2)
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}${month}${day}`
})
const qrPayload = computed(() =>
  JSON.stringify({
    t: employee.value?.nik || username.value,
    m: profileName.value,
    c: qrDateCode.value,
    x: [[9, 100, 374]],
  }),
)

const workFields = computed<ProfileField[]>(() => [
  { label: 'Nama', value: profileName.value, icon: personOutline },
  { label: 'Jabatan', value: positionLabel.value, icon: briefcaseOutline },
  { label: 'Departemen', value: departmentLabel.value, icon: businessOutline },
  { label: 'Unit', value: employee.value?.unit, icon: layersOutline },
  { label: 'Atasan Langsung', value: employee.value?.nama_atasan_langsung, icon: personOutline },
  { label: 'Atasan Tidak Langsung', value: employee.value?.atasan_tidak_langsung, icon: gitNetworkOutline },
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

async function loadProfile(force = false) {
  loading.value = true
  errorMessage.value = ''
  try {
    profile.value = selectedNik.value
      ? await getStaffEmployeeProfile(selectedNik.value, { force })
      : await getStaffProfile({ force })
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Profil tidak dapat dimuat.')
  } finally {
    loading.value = false
  }
}

async function refreshProfile(event: RefresherCustomEvent) {
  await loadProfile(true)
  event.target.complete()
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

async function openChangePassword() {
  settingsOpen.value = false
  await router.push('/change-password')
}

async function testPushNotification() {
  settingsOpen.value = false
  testingPush.value = true
  try {
    const response = await sendTestPushNotification()
    await showAppAlert({ header: 'Test Push', message: response.message, type: response.sent > 0 ? 'success' : 'warning' })
  } catch (error) {
    await showAppAlert({ header: 'Test Push Gagal', message: apiErrorMessage(error, 'Push notification tidak dapat dites.'), type: 'danger' })
  } finally {
    testingPush.value = false
  }
}

function openPhotoPicker() {
  settingsOpen.value = false
  if (photoLocked.value) {
    errorMessage.value = `Foto profil baru dapat diganti pada ${profile.value?.user?.photo_change_available_label || 'jadwal berikutnya'}.`
    return
  }
  photoInput.value?.click()
}

async function choosePhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const photo = input.files?.[0]
  if (!photo) return

  errorMessage.value = ''
  if (!['image/png', 'image/jpeg'].includes(photo.type)) {
    errorMessage.value = 'Foto profil harus berformat PNG, JPG, atau JPEG.'
    input.value = ''
    return
  }
  if (photo.size > 5 * 1024 * 1024) {
    errorMessage.value = 'Ukuran foto profil maksimal 5 MB.'
    input.value = ''
    return
  }

  try {
    selectedPhoto.value = await compressProfilePhoto(photo)
    photoPreviewUrl.value = URL.createObjectURL(selectedPhoto.value)
    photoModalOpen.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Foto profil tidak dapat diproses.'
    input.value = ''
  }
}

async function savePhoto() {
  if (!selectedPhoto.value) return

  uploadingPhoto.value = true
  try {
    const response = await updateStaffProfilePhoto(selectedPhoto.value)
    if (profile.value) Object.assign(profile.value.user, response)
    updateEmployeePhoto(response.photo_url)
    closePhotoModal(true)
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Foto profil tidak dapat diperbarui.')
  } finally {
    uploadingPhoto.value = false
  }
}

function closePhotoModal(force = false) {
  if (uploadingPhoto.value && !force) return
  photoModalOpen.value = false
  selectedPhoto.value = null
  if (photoPreviewUrl.value) URL.revokeObjectURL(photoPreviewUrl.value)
  photoPreviewUrl.value = ''
  if (photoInput.value) photoInput.value.value = ''
}

function compressProfilePhoto(photo: File) {
  return new Promise<File>((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(photo)
    image.onload = () => {
      const maxDimension = 1200
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d')
      if (!context) {
        URL.revokeObjectURL(objectUrl)
        reject(new Error('Foto profil tidak dapat dikompres.'))
        return
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objectUrl)
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Foto profil tidak dapat dikompres.'))
          return
        }
        resolve(new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.82)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Foto profil tidak dapat dibaca.'))
    }
    image.src = objectUrl
  })
}

function openContactModal(mode: 'email' | 'phone') {
  settingsOpen.value = false
  contactMode.value = mode
  contactValue.value = mode === 'email' ? profile.value?.user?.email || '' : employee.value?.no_hp || ''
  phoneOtp.value = ''
  phoneStep.value = 'input'
  contactMessage.value = ''
  contactHasError.value = false
  contactModalOpen.value = true
}

function closeContactModal(force = false) {
  if (savingContact.value && !force) return
  contactModalOpen.value = false
}

async function openQrModal() {
  qrModalOpen.value = true
  await refreshQrCode()
}

function closeQrModal() {
  qrModalOpen.value = false
}

async function refreshQrCode() {
  qrDataUrl.value = await QRCode.toDataURL(qrPayload.value, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  })
}

async function saveEmail() {
  savingContact.value = true
  contactHasError.value = false
  try {
    const response = await updateStaffProfileContact({ email: contactValue.value })
    if (profile.value) {
      Object.assign(profile.value.user, response.user)
      Object.assign(profile.value.employee, response.employee)
    }
    closeContactModal(true)
  } catch (error) {
    contactHasError.value = true
    contactMessage.value = apiErrorMessage(error, 'Email tidak dapat diperbarui.')
  } finally {
    savingContact.value = false
  }
}

async function sendPhoneOtp() {
  savingContact.value = true
  contactHasError.value = false
  try {
    const response = await requestStaffProfilePhoneOtp(contactValue.value)
    phoneStep.value = 'otp'
    contactMessage.value = response.message
  } catch (error) {
    contactHasError.value = true
    contactMessage.value = apiErrorMessage(error, 'Kode OTP tidak dapat dikirim.')
  } finally {
    savingContact.value = false
  }
}

async function savePhone() {
  savingContact.value = true
  contactHasError.value = false
  try {
    const response = await updateStaffProfileContact({ no_hp: contactValue.value, phone_otp: phoneOtp.value })
    if (profile.value) {
      Object.assign(profile.value.user, response.user)
      Object.assign(profile.value.employee, response.employee)
    }
    closeContactModal(true)
  } catch (error) {
    contactHasError.value = true
    contactMessage.value = apiErrorMessage(error, 'Nomor telepon tidak dapat diperbarui.')
  } finally {
    savingContact.value = false
  }
}

onMounted(() => {
  void loadProfile(true)
})
watch(selectedNik, () => {
  closeSettingsMenu()
  void loadProfile(true)
})
watch(() => route.fullPath, () => {
  closeSettingsMenu()
})
watch(shouldSecureScreen, (enabled) => {
  void setSecureScreen(enabled)
}, { immediate: true })
onUnmounted(() => {
  closeSettingsMenu()
  void setSecureScreen(false)
  if (photoPreviewUrl.value) URL.revokeObjectURL(photoPreviewUrl.value)
})
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
  padding: max(20px, env(safe-area-inset-top)) 20px 52px;
  background: linear-gradient(160deg, var(--ion-color-primary) 0%, var(--ion-color-primary-shade) 100%);
  color: #fff;
}

.hero-actions {
  align-self: stretch;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.settings-wrap {
  position: relative;
}

.settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  border: 0;
  background: transparent;
  padding: 0;
}

.settings-menu {
  position: absolute;
  top: 40px;
  right: 0;
  z-index: 21;
  width: 210px;
  padding: 6px;
  border-radius: 14px;
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  box-shadow: 0 16px 32px rgba(15, 23, 42, .2);
}

.settings-menu button {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 10px 9px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--hris-text-dark);
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}

.settings-menu button:disabled {
  opacity: .48;
}

.settings-menu ion-icon {
  color: var(--ion-color-primary);
  font-size: 17px;
}

.settings-menu .settings-logout {
  margin-top: 4px;
  border-top: 1px solid var(--hris-border);
  border-radius: 0 0 9px 9px;
  color: var(--ion-color-danger);
}

.settings-menu .settings-logout ion-icon {
  color: var(--ion-color-danger);
}

.hidden-input {
  display: none;
}

.profile-modal {
  --background: transparent;
  --height: auto;
  --width: min(92vw, 420px);
  --border-radius: 18px;
}

.profile-modal-card {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--hris-border);
  background: var(--hris-card-bg);
  color: var(--hris-text-dark);
}

.profile-modal-card h2 {
  margin: 0;
  color: var(--hris-text-dark);
  font-size: 17px;
  font-weight: 800;
}

.profile-modal-card p {
  margin: 6px 0 0;
  color: var(--hris-text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.photo-preview {
  display: block;
  width: min(100%, 260px);
  max-height: 280px;
  margin: 14px auto 0;
  border-radius: 14px;
  object-fit: cover;
}

.modal-field {
  display: grid;
  gap: 5px;
  margin-top: 14px;
}

.modal-field span {
  color: var(--hris-text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.modal-field input {
  width: 100%;
  padding: 10px 11px;
  border: 1px solid var(--hris-input-border);
  border-radius: 10px;
  outline: none;
  background: var(--hris-input-bg);
  color: var(--hris-text-dark);
  font-size: 13px;
}

.modal-field input:focus {
  border-color: var(--hris-input-focus-border);
  box-shadow: var(--hris-input-focus-shadow);
}

.modal-feedback {
  padding: 9px 10px;
  border-radius: 9px;
  background: rgba(34, 197, 94, .12);
  color: #16A34A !important;
}

.modal-feedback.danger {
  background: rgba(239, 68, 68, .12);
  color: #DC2626 !important;
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
  font-weight: 700;
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
  margin: -24px 14px 0;
  position: relative;
  z-index: 1;
  overflow: hidden;
  border-radius: 14px;
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12);
}

.metric-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 72px;
  text-align: center;
  padding: 14px 8px 12px;
  background: transparent;
  border: 0;
  box-shadow: none;
}

.metric-card + .metric-card {
  border-left: 1px solid var(--hris-border);
}

.metric-card ion-icon {
  display: none;
}

.metric-card strong {
  display: block;
  max-width: 100%;
  color: var(--hris-text-dark);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-card span {
  display: block;
  color: var(--hris-text-secondary);
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  /* background: var(--hris-card-bg); */
  border-radius: 14px;
}

.info-row {
  display: flex;
  gap: 9px;
  align-items: center;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--hris-border);
  border-radius: 12px;
  background: var(--hris-card-bg);
}

.info-icon {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: var(--hris-soft-surface);
  color: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-icon ion-icon {
  font-size: 15px;
}

.info-copy {
  min-width: 0;
  flex: 1;
}

.info-copy span {
  display: block;
  color: var(--hris-text-secondary);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  text-transform: capitalize;
}

.info-copy strong {
  display: block;
  margin-top: 2px;
  color: var(--hris-text-dark);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

/* ── Actions ── */
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
  width: 32px;
  height: 32px;
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
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.profile-qr-button {
  color: #fff;
}

.profile-qr-button ion-icon {
  font-size: 18px;
}

.profile-qr-modal {
  text-align: center;
}

.qr-frame {
  display: grid;
  width: min(100%, 300px);
  aspect-ratio: 1;
  place-items: center;
  margin: 16px auto 12px;
  padding: 10px;
  border: 1px solid var(--hris-border);
  border-radius: 16px;
  background: #fff;
}

.qr-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-frame span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.profile-qr-modal code {
  display: block;
  max-height: 86px;
  overflow: auto;
  padding: 10px;
  border-radius: 10px;
  background: var(--hris-soft-surface);
  color: var(--hris-text-dark);
  font-size: 10px;
  line-height: 1.4;
  text-align: left;
  overflow-wrap: anywhere;
}
</style>
