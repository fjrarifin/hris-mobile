<template>
  <ion-page>
    <ion-content fullscreen class="reset-page">
      <main class="reset-shell">
        <section class="heading">
          <ion-icon :icon="keyOutline" aria-hidden="true" />
          <h1>{{ title }}</h1>
          <p>{{ subtitle }}</p>
        </section>

        <form class="reset-panel" @submit.prevent="submit">
          <template v-if="step === 'nik'">
            <ion-item lines="none" class="field">
              <ion-input
                v-model.trim="form.nik"
                label="NIK Karyawan"
                label-placement="floating"
                name="username"
                autocomplete="username"
                required
              />
            </ion-item>
          </template>

          <template v-else-if="step === 'otp'">
            <ion-item lines="none" class="field">
              <ion-input
                v-model.trim="form.otp"
                label="Kode OTP"
                label-placement="floating"
                inputmode="numeric"
                :maxlength="6"
                autocomplete="one-time-code"
                required
              />
            </ion-item>
            <p class="timer">OTP berlaku dalam {{ timerText }}</p>
          </template>

          <template v-else>
            <ion-item lines="none" class="field">
              <ion-input
                v-model="form.password"
                type="password"
                label="Password baru"
                label-placement="floating"
                autocomplete="new-password"
                required
              />
            </ion-item>
            <ion-item lines="none" class="field">
              <ion-input
                v-model="form.passwordConfirmation"
                type="password"
                label="Konfirmasi password"
                label-placement="floating"
                autocomplete="new-password"
                required
              />
            </ion-item>
          </template>

          <p v-if="message" class="feedback" :class="{ danger: hasError }">{{ message }}</p>

          <ion-button expand="block" type="submit" class="submit-button" :disabled="loading || otpExpired">
            <ion-spinner v-if="loading" name="crescent" />
            <span v-else>{{ submitLabel }}</span>
          </ion-button>

          <button v-if="step === 'otp'" type="button" class="link-button" :disabled="loading" @click="sendOtp">
            Kirim ulang OTP
          </button>
          <button type="button" class="link-button" @click="goBack">
            {{ step === 'nik' ? 'Kembali ke login' : 'Ubah NIK' }}
          </button>
        </form>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonPage, IonSpinner } from '@ionic/vue'
import { keyOutline } from 'ionicons/icons'
import { computed, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiErrorMessage } from '@/services/api'
import { requestPasswordOtp, resetForgottenPassword, verifyPasswordOtp } from '@/services/auth'

type ResetStep = 'nik' | 'otp' | 'password'

const router = useRouter()
const step = ref<ResetStep>('nik')
const loading = ref(false)
const message = ref('')
const hasError = ref(false)
const remainingSeconds = ref(0)
const form = reactive({ nik: '', otp: '', password: '', passwordConfirmation: '' })
let timer: number | undefined

const title = computed(() => ({
  nik: 'Lupa Password',
  otp: 'Verifikasi OTP',
  password: 'Buat Password Baru',
})[step.value])
const subtitle = computed(() => ({
  nik: 'Kode OTP akan dikirim ke nomor WhatsApp karyawan yang terdaftar.',
  otp: 'Masukkan 6 digit kode OTP yang dikirim melalui WhatsApp.',
  password: 'Gunakan minimal 8 karakter yang memiliki huruf dan angka.',
})[step.value])
const submitLabel = computed(() => ({
  nik: 'Kirim Kode OTP',
  otp: 'Verifikasi OTP',
  password: 'Simpan Password',
})[step.value])
const timerText = computed(() => {
  const minutes = String(Math.floor(remainingSeconds.value / 60)).padStart(2, '0')
  const seconds = String(remainingSeconds.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})
const otpExpired = computed(() => step.value === 'otp' && remainingSeconds.value === 0)

function startTimer(seconds: number) {
  window.clearInterval(timer)
  remainingSeconds.value = seconds
  timer = window.setInterval(() => {
    remainingSeconds.value = Math.max(0, remainingSeconds.value - 1)
    if (remainingSeconds.value === 0) window.clearInterval(timer)
  }, 1000)
}

async function sendOtp() {
  loading.value = true
  hasError.value = false
  message.value = ''
  try {
    const response = await requestPasswordOtp(form.nik)
    form.otp = ''
    step.value = 'otp'
    startTimer(response.expires_in)
    message.value = response.message
  } catch (error) {
    hasError.value = true
    message.value = apiErrorMessage(error, 'Kode OTP tidak dapat dikirim saat ini.')
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (step.value === 'nik') {
    await sendOtp()
    return
  }

  loading.value = true
  hasError.value = false
  message.value = ''
  try {
    if (step.value === 'otp') {
      const response = await verifyPasswordOtp(form.nik, form.otp)
      step.value = 'password'
      message.value = response.message
      return
    }

    const response = await resetForgottenPassword(form.nik, form.otp, form.password, form.passwordConfirmation)
    await router.replace({ path: '/login', query: { reset: 'success' } })
    void response
  } catch (error) {
    hasError.value = true
    message.value = apiErrorMessage(error, 'Permintaan tidak dapat diproses.')
  } finally {
    loading.value = false
  }
}

async function goBack() {
  if (step.value === 'nik') {
    await router.replace('/login')
    return
  }
  step.value = 'nik'
  form.otp = ''
  message.value = ''
  window.clearInterval(timer)
}

onUnmounted(() => window.clearInterval(timer))
</script>

<style scoped>
.reset-page { --background: var(--hris-bg); }
.reset-shell { min-height: 100%; padding: max(20px, env(safe-area-inset-top)) 18px 22px; display: flex; flex-direction: column; justify-content: center; gap: 16px; }
.heading { text-align: center; }
.heading ion-icon { width: 38px; height: 38px; padding: 11px; border-radius: 50%; background: rgba(56, 189, 248, .12); color: var(--hris-sky-blue); }
.heading h1 { margin: 11px 0 0; color: var(--hris-text-light); font-size: 21px; font-weight: 800; }
.heading p { margin: 6px auto 0; max-width: 310px; color: var(--hris-text-secondary); font-size: 12px; line-height: 1.45; }
.reset-panel { padding: 16px; border-radius: var(--hris-radius-lg); background: var(--hris-card-bg); box-shadow: 0 18px 40px rgba(15, 23, 42, .08); }
.field { --min-height: 46px; --background: var(--hris-input-bg); --color: var(--hris-text-dark); --border-radius: 11px; --padding-start: 12px; --inner-padding-end: 12px; margin-top: 10px; border: 1px solid var(--hris-input-border); border-radius: 11px; }
.field:first-child { margin-top: 0; }
.feedback, .timer { margin: 11px 0 0; padding: 10px 12px; border-radius: 10px; background: #ecfdf5; color: #047857; font-size: 12px; line-height: 1.4; }
.feedback.danger { background: #fef2f2; color: #b91c1c; }
.timer { background: var(--hris-soft-surface); color: var(--hris-text-secondary); text-align: center; }
.submit-button { margin-top: 14px; height: 42px; --border-radius: 10px; --background: var(--hris-primary-button-bg); --background-activated: var(--hris-primary-button-bg-active); font-size: 13px; font-weight: 800; }
.link-button { display: block; width: 100%; margin-top: 12px; border: 0; background: transparent; color: var(--ion-color-primary); font-size: 12px; font-weight: 700; }
</style>
