<template>
  <ion-page>
    <ion-content fullscreen class="password-page">
      <main class="password-shell">
        <button type="button" class="back-button" @click="goBack">
          <ion-icon :icon="arrowBackOutline" aria-hidden="true" />
          Kembali
        </button>

        <section class="heading">
          <ion-icon :icon="keyOutline" aria-hidden="true" />
          <h1>Ganti Password</h1>
          <p>Gunakan password baru minimal 8 karakter untuk menjaga keamanan akun.</p>
        </section>

        <form class="password-panel" @submit.prevent="submit">
          <ion-item lines="none" class="field">
            <ion-input
              v-model="form.currentPassword"
              type="password"
              label="Password saat ini"
              label-placement="floating"
              autocomplete="current-password"
              required
            />
          </ion-item>

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

          <p v-if="message" class="feedback" :class="{ danger: hasError }">{{ message }}</p>

          <ion-button expand="block" type="submit" class="submit-button" :disabled="loading">
            <ion-spinner v-if="loading" name="crescent" />
            <span v-else>Simpan Password</span>
          </ion-button>
        </form>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonIcon, IonInput, IonItem, IonPage, IonSpinner } from '@ionic/vue'
import { arrowBackOutline, keyOutline } from 'ionicons/icons'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiErrorMessage } from '@/services/api'
import { authState, changeEmployeePassword, logoutEmployee } from '@/services/auth'

const router = useRouter()
const loading = ref(false)
const message = ref('')
const hasError = ref(false)
const form = reactive({
  currentPassword: '',
  password: '',
  passwordConfirmation: '',
})

async function submit() {
  loading.value = true
  message.value = ''
  hasError.value = false

  try {
    await changeEmployeePassword(form.currentPassword, form.password, form.passwordConfirmation)
    await router.replace('/tabs/home')
  } catch (error) {
    hasError.value = true
    message.value = apiErrorMessage(error, 'Password tidak dapat disimpan.')
  } finally {
    loading.value = false
  }
}

async function goBack() {
  if (authState.user?.must_change_password) {
    await logoutEmployee()
    await router.replace('/login')
    return
  }

  router.back()
}
</script>

<style scoped>
.password-page {
  --background: var(--hris-bg);
}

.password-shell {
  min-height: 100%;
  padding: max(20px, env(safe-area-inset-top)) 18px 22px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 5px;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: var(--ion-color-primary);
  font-size: 12px;
  font-weight: 700;
}

.back-button ion-icon {
  font-size: 16px;
}

.heading {
  text-align: center;
}

.heading ion-icon {
  width: 38px;
  height: 38px;
  padding: 11px;
  border-radius: 50%;
  background: rgba(56, 189, 248, .12);
  color: var(--hris-sky-blue);
}

.heading h1 {
  margin: 11px 0 0;
  color: var(--hris-text-light);
  font-size: 21px;
  font-weight: 800;
  letter-spacing: 0;
}

.heading p {
  margin: 6px auto 0;
  max-width: 300px;
  color: var(--hris-text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.password-panel {
  padding: 16px;
  border-radius: var(--hris-radius-lg);
  background: var(--hris-card-bg);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.field {
  --min-height: 46px;
  --background: var(--hris-input-bg);
  --color: var(--hris-text-dark);
  --border-radius: 11px;
  --padding-start: 12px;
  --inner-padding-end: 12px;
  margin-top: 10px;
  border: 1px solid var(--hris-input-border);
  border-radius: 11px;
}

.field ion-input {
  --color: var(--hris-text-dark);
  --placeholder-color: var(--hris-text-secondary);
  --placeholder-opacity: 1;
  color: var(--hris-text-dark);
  font-size: 13px;
}

.field:first-child {
  margin-top: 0;
}

.feedback {
  margin: 11px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #047857;
  font-size: 12px;
  line-height: 1.4;
}

.feedback.danger {
  background: #fef2f2;
  color: #b91c1c;
}

.submit-button {
  margin-top: 14px;
  height: 42px;
  --border-radius: 10px;
  --background: var(--hris-primary-button-bg);
  --background-activated: var(--hris-primary-button-bg-active);
  font-size: 13px;
  font-weight: 800;
}
</style>
