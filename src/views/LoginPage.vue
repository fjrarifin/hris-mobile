<template>
  <ion-page>
    <ion-content fullscreen class="login-page">
      <main class="login-shell">

        <!-- Decorative orbs -->
        <div class="orb orb1" />
        <div class="orb orb2" />
        <div class="orb orb3" />

        <!-- Top bar: logo -->
        <header class="topbar">
          <img src="/app-icon.png" class="ess-badge" alt="App Icon" />
          <span class="logo-name">Employee Self Service</span>
          <div class="logo-chip">
            <img v-if="BACKEND_LOGO_URL" :src="BACKEND_LOGO_URL" alt="Logo" class="logo-img" />
            <ion-icon v-else :icon="businessOutline" class="logo-icon" />
          </div>
        </header>

        <!-- Hero -->
        <section class="hero">
          <div class="hero-eyebrow">
            <span class="hero-dot" />
            Portal Karyawan
          </div>
          <h1 class="hero-title">Selamat datang<span class="hero-accent">.</span></h1>
          <p class="hero-sub">Masuk menggunakan NIK dan password Anda.</p>
        </section>

        <!-- Form card -->
        <section class="form-card">
          <form autocomplete="on" @submit.prevent="submit">

            <!-- NIK field -->
            <div class="field" :class="{ 'field--focus': nikFocus, 'field--error': !!errorMessage }">
              <ion-icon :icon="idCardOutline" class="field-icon" aria-hidden="true" />
              <div class="field-inner">
                <ion-input
                  v-model.trim="form.username"
                  label="NIK"
                  label-placement="floating"
                  name="username"
                  autocomplete="username"
                  inputmode="text"
                  required
                  class="field-input"
                  @ionFocus="nikFocus = true"
                  @ionBlur="nikFocus = false"
                />
              </div>
            </div>

            <!-- Password field -->
            <div class="field" :class="{ 'field--focus': pwFocus, 'field--error': !!errorMessage }">
              <ion-icon :icon="lockClosedOutline" class="field-icon" aria-hidden="true" />
              <div class="field-inner">
                <ion-input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  label="Password"
                  label-placement="floating"
                  name="password"
                  autocomplete="current-password"
                  required
                  class="field-input"
                  @ionFocus="pwFocus = true"
                  @ionBlur="pwFocus = false"
                />
              </div>
              <button
                type="button"
                class="eye-btn"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                @click="showPassword = !showPassword"
              >
                <ion-icon :icon="showPassword ? eyeOffOutline : eyeOutline" aria-hidden="true" />
              </button>
            </div>

            <label class="remember-row">
              <input v-model="rememberUsername" type="checkbox" />
              <span>Ingat NIK saya</span>
            </label>

            <!-- Submit -->
            <ion-button
              expand="block"
              type="submit"
              class="submit-btn"
              :disabled="loading"
            >
              <ion-spinner v-if="loading" name="crescent" slot="start" />
              <span>{{ loading ? 'Memverifikasi...' : 'Masuk' }}</span>
            </ion-button>

          </form>

          <!-- Divider -->
          <div class="divider-row">
            <span class="divider-line" />
            <span class="divider-txt">atau</span>
            <span class="divider-line" />
          </div>

          <!-- Action buttons -->
          <div class="action-row">
            <a href="https://wa.me/6282117289833" class="action-btn">
              <ion-icon :icon="logoWhatsapp" class="action-icon whatsapp" aria-hidden="true" />
              <span>Hubungi IT</span>
            </a>
            <button type="button" class="action-btn" @click="showHelp">
              <ion-icon :icon="helpCircleOutline" class="action-icon" aria-hidden="true" />
              <span>Bantuan</span>
            </button>
          </div>

          <p class="ver-txt">© 2026 · Build by IT Dept · v{{ appVersion }} </p>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonPage,
  IonSpinner,
} from '@ionic/vue'
import {
  businessOutline,
  eyeOffOutline,
  eyeOutline,
  helpCircleOutline,
  idCardOutline,
  lockClosedOutline,
  logoWhatsapp,
} from 'ionicons/icons'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showAppAlert } from '@/services/alerts'
import { ApiRequestError, BACKEND_LOGO_URL, apiErrorMessage, isApiRequestError } from '@/services/api'
import { loginEmployee } from '@/services/auth'

const router = useRouter()
const appVersion = import.meta.env.VITE_APP_VERSION || '1.6.3'

const form = reactive({ username: '', password: '' })
const loading  = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)
const nikFocus = ref(false)
const pwFocus  = ref(false)
const rememberUsername = ref(false)
const REMEMBER_USERNAME_KEY = 'hris_mobile_remember_username'

/* ── Active session message ──────────────────────────── */
function formatSessionTime(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value))
}

function activeSessionMessage(error: ApiRequestError) {
  const session   = error.data.active_session
  const lastActive = formatSessionTime(session?.last_active_at)
  return `Akun ini sedang login di perangkat lain. Aktivitas terakhir: ${lastActive} WIB.`
}

/* ── Bantuan alert ───────────────────────────────────── */
async function showHelp() {
  await showAppAlert({
    header: 'Bantuan Login',
    message: 'Gunakan NIK dan password yang diberikan HRD. Jika lupa password, kirim OTP ke nomor WhatsApp yang terdaftar.',
    type: 'info',
    buttons: [
      {
        text: 'Lupa Password',
        handler: () => { void router.push('/forgot-password') },
      },
      { text: 'Tutup', role: 'cancel' },
    ],
  })
}

/* ── Submit ──────────────────────────────────────────── */
async function submit() {
  if (loading.value) return
  loading.value  = true
  errorMessage.value = ''

  try {
    await loginEmployee(form.username, form.password)

    if (rememberUsername.value) {
      localStorage.setItem(REMEMBER_USERNAME_KEY, form.username)
    } else {
      localStorage.removeItem(REMEMBER_USERNAME_KEY)
    }

    await router.replace('/tabs/home')

  } catch (error) {
    let msg = apiErrorMessage(error, 'Login gagal. Periksa NIK dan password.')

    if (isApiRequestError(error)) {
      if (error.data.code === 'ACTIVE_SESSION_EXISTS') {
        msg = activeSessionMessage(error)
      } else if (error.data.code === 'INVALID_CREDENTIALS') {
        msg = 'NIK atau password salah. Silakan coba lagi.'
      } else if (error.data.code === 'ACCOUNT_LOCKED') {
        msg = 'Akun Anda terkunci. Hubungi IT Dept.'
      }
    } else if (error instanceof Error && !(error instanceof ApiRequestError)) {
      msg = error.message
    }

    errorMessage.value = msg

    /* Shake animation on fields */
    const fields = document.querySelectorAll<HTMLElement>('.field--error')
    fields.forEach(el => {
      el.classList.remove('field--shake')
      void el.offsetWidth
      el.classList.add('field--shake')
    })

    await showAppAlert({
      header: 'Login Gagal',
      message: msg,
      type: 'danger',
    })

  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const rememberedUsername = localStorage.getItem(REMEMBER_USERNAME_KEY) || ''

  if (rememberedUsername) {
    form.username = rememberedUsername
    rememberUsername.value = true
  }
})
</script>

<style scoped>
/* ─── Page ─────────────────────────────────────────── */
.login-page {
  --background: #0A0F1E;
}

.login-shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: max(20px, env(safe-area-inset-top)) 20px 0;
  position: relative;
  overflow: hidden;
}

/* ─── Orbs ─────────────────────────────────────────── */
.orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.orb1 {
  width: 280px; height: 280px;
  background: #1E3A8A;
  opacity: .45;
  top: -80px; right: -70px;
}
.orb2 {
  width: 180px; height: 180px;
  background: #4338CA;
  opacity: .3;
  top: 100px; left: -60px;
}
.orb3 {
  width: 120px; height: 120px;
  background: #38BDF8;
  opacity: .1;
  bottom: 38%; right: 20px;
}

/* ─── Topbar ────────────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: auto;
  position: relative;
  z-index: 1;
}

.logo-chip {
  width: 54px; height: 54px;
  background: rgba(129, 140, 248, .15);
  border: 1px solid rgba(129, 140, 248, .35);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-left: auto;
}

.logo-img {
  width: 100%; height: 100%;
  object-fit: contain;
  padding: 4px;
}

.logo-icon {
  font-size: 20px;
  color: #818CF8;
}

.logo-name {
  font-size: 18px;
  font-weight: 700;
  color: #C7D2FE;
}

.ess-badge {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
}

/* ─── Hero ─────────────────────────────────────────── */
.hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px 0 16px;
  position: relative;
  z-index: 1;
}

.hero-eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #818CF8;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.hero-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #818CF8;
}

.hero-title {
  margin: 0 0 10px;
  font-size: 40px;
  font-weight: 800;
  color: #E0E7FF;
  line-height: 1.1;
  letter-spacing: -1px;
}

.hero-accent {
  color: #38BDF8;
}

.hero-sub {
  margin: 0;
  font-size: 13px;
  color: #6272A4;
  line-height: 1.6;
}

/* ─── Form Card ────────────────────────────────────── */
.form-card {
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 22px 20px max(20px, env(safe-area-inset-bottom));
  margin: 0 -20px;
  position: relative;
  z-index: 1;
}

/* ─── Fields ───────────────────────────────────────── */
.field {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #F5F7FF;
  border: 1px solid #C7D2FE;
  border-radius: 14px;
  padding: 0 14px;
  min-height: 58px;
  margin-bottom: 10px;
  transition: border-color .2s, box-shadow .2s;
}

.field--focus {
  border-color: #818CF8;
  box-shadow: 0 0 0 3px rgba(129, 140, 248, .12);
  background: #F8F7FF;
}

.field--error {
  border-color: #F87171;
  background: #FFF5F5;
}

/* Shake animation */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-6px); }
  40%       { transform: translateX(6px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
}
.field--shake {
  animation: shake .4s ease;
}

.field-icon {
  font-size: 20px;
  color: #818CF8;
  flex-shrink: 0;
  transition: color .2s;
}

.field--focus .field-icon { color: #6366F1; }
.field--error .field-icon { color: #F87171; }

.remember-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  color: #3730A3;
  font-size: 12px;
  font-weight: 700;
}

.remember-row input {
  width: 16px;
  height: 16px;
  accent-color: #1E3A8A;
}

.field-inner {
  flex: 1;
  min-width: 0;
}

.field-input {
  --color: #1E1B4B;
  --placeholder-color: #A5B4FC;
  --background: transparent;
  --padding-start: 0;
  --padding-end: 0;
}

.eye-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 20px;
  color: #A5B4FC;
  flex-shrink: 0;
}

/* ─── Submit ───────────────────────────────────────── */
.submit-btn {
  margin-top: 4px;
  height: 52px;
  --border-radius: 14px;
  --background: #1E3A8A;
  --background-activated: #1e40af;
  --box-shadow: 0 6px 20px rgba(30, 58, 138, .4);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: .3px;
}

/* ─── Divider ──────────────────────────────────────── */
.divider-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: #E0E7FF;
}

.divider-txt {
  font-size: 11px;
  color: #A5B4FC;
  font-weight: 600;
}

/* ─── Action buttons ───────────────────────────────── */
.action-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #F5F7FF;
  border: 1px solid #C7D2FE;
  border-radius: 12px;
  height: 42px;
  font-size: 12px;
  font-weight: 600;
  color: #3730A3;
  cursor: pointer;
  text-decoration: none;
  transition: background .15s;
}

.action-btn:active {
  background: #EEF2FF;
}

.action-icon {
  font-size: 17px;
  color: #818CF8;
}

.action-icon.whatsapp {
  color: #25D366;
}

/* ─── Version ──────────────────────────────────────── */
.ver-txt {
  text-align: center;
  font-size: 11px;
  color: #3b5cdd;
  opacity: .6;
}
</style>
