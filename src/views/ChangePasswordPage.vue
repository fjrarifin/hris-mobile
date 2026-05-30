<template>
  <ion-page>
    <ion-content fullscreen class="password-page">
      <main class="password-shell">
        <section class="heading">
          <ion-icon :icon="keyOutline" aria-hidden="true" />
          <h1>Ganti Password</h1>
          <p>Password awal wajib diganti sebelum fitur HRIS dibuka.</p>
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
import { keyOutline } from 'ionicons/icons'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiErrorMessage } from '@/services/api'
import { changeEmployeePassword } from '@/services/auth'

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
</script>

<style scoped>
.password-page {
  --background: var(--hris-bg);
}

.password-shell {
  min-height: 100%;
  padding: max(40px, env(safe-area-inset-top)) 22px 28px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 22px;
}

.heading {
  text-align: center;
}

.heading ion-icon {
  width: 60px;
  height: 60px;
  padding: 16px;
  border-radius: 50%;
  background: rgba(56, 189, 248, .12);
  color: var(--hris-sky-blue);
}

.heading h1 {
  margin: 16px 0 0;
  color: var(--hris-text-light);
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0;
}

.heading p {
  margin: 8px auto 0;
  max-width: 300px;
  color: var(--hris-text-secondary);
  font-size: 14px;
  line-height: 1.45;
}

.password-panel {
  padding: 22px;
  border-radius: var(--hris-radius-xl);
  background: var(--hris-card-bg);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.field {
  --min-height: 58px;
  --background: #F5F7FF;
  --color: var(--hris-text-dark);
  --border-radius: 14px;
  --padding-start: 14px;
  --inner-padding-end: 14px;
  margin-top: 13px;
  border: 1px solid var(--hris-border);
  border-radius: 14px;
}

.field ion-input {
  --color: var(--hris-text-dark);
  --placeholder-color: var(--hris-text-secondary);
  --placeholder-opacity: 1;
  color: var(--hris-text-dark);
}

.field:first-child {
  margin-top: 0;
}

.feedback {
  margin: 14px 0 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: #ecfdf5;
  color: #047857;
  font-size: 13px;
  line-height: 1.4;
}

.feedback.danger {
  background: #fef2f2;
  color: #b91c1c;
}

.submit-button {
  margin-top: 20px;
  height: 48px;
  --border-radius: 12px;
  --background: var(--hris-primary-button-bg);
  --background-activated: var(--hris-primary-button-bg-active);
  font-weight: 800;
}
</style>
