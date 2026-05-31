<template>
  <ion-page>
    <ion-content fullscreen class="notifications-page">
      <main class="notifications-shell">
        <header class="page-header">
          <button type="button" class="back-btn" aria-label="Kembali" @click="goBack">
            <ion-icon :icon="chevronBackOutline" />
          </button>
          <div>
            <span class="page-eyebrow">Pusat Notifikasi</span>
            <h1>Notifikasi</h1>
          </div>
        </header>

        <section class="summary-card">
          <div class="summary-icon">
            <ion-icon :icon="notificationsOutline" />
          </div>
          <div>
            <p>Histori notifikasi karyawan</p>
            <strong>{{ notifications.length }} notifikasi tersedia</strong>
          </div>
        </section>

        <section class="notification-list" aria-label="Daftar notifikasi">
          <article
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-card"
          >
            <span class="notification-dot" />
            <div class="notification-copy">
              <div class="notification-meta">
                <strong>{{ notification.title }}</strong>
                <span>{{ notification.time }}</span>
              </div>
              <p>{{ notification.message }}</p>
            </div>
          </article>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/vue'
import {
  chevronBackOutline,
  notificationsOutline,
} from 'ionicons/icons'
import { useRouter } from 'vue-router'

const router = useRouter()

const notifications = [
  {
    id: 'welcome-hris',
    title: 'Selamat Datang',
    message: 'Selamat Datang di Aplikasi HRIS HomPim Play.',
    time: 'Baru saja',
  },
]

function goBack() {
  router.back()
}
</script>

<style scoped>
.notifications-page {
  --background: var(--hris-bg);
}

.notifications-shell {
  min-height: 100%;
  padding: max(20px, env(safe-area-inset-top)) 16px 100px;
  display: grid;
  align-content: start;
  gap: 14px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid var(--hris-border);
  background: var(--hris-card-bg);
  color: var(--hris-text-dark);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  cursor: pointer;
}

.back-btn ion-icon {
  font-size: 20px;
}

.page-eyebrow {
  display: block;
  color: var(--ion-color-primary);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.7px;
}

.page-header h1 {
  margin: 3px 0 0;
  color: var(--hris-text-light);
  font-size: 26px;
  font-weight: 900;
}

.summary-card,
.notification-card {
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.summary-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: rgba(59, 130, 246, 0.12);
  color: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.summary-icon ion-icon {
  font-size: 23px;
}

.summary-card p {
  margin: 0 0 4px;
  color: var(--hris-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.summary-card strong {
  color: var(--hris-text-dark);
  font-size: 15px;
  font-weight: 850;
}

.notification-list {
  display: grid;
  gap: 10px;
}

.notification-card {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 15px;
}

.notification-dot {
  width: 10px;
  height: 10px;
  margin-top: 5px;
  border-radius: 50%;
  background: #22C55E;
  box-shadow: 0 0 0 5px rgba(34, 197, 94, 0.12);
  flex-shrink: 0;
}

.notification-copy {
  min-width: 0;
  display: grid;
  gap: 7px;
}

.notification-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.notification-meta strong {
  color: var(--hris-text-dark);
  font-size: 15px;
  font-weight: 850;
}

.notification-meta span {
  color: var(--hris-text-muted);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.notification-copy p {
  margin: 0;
  color: var(--hris-text-secondary);
  font-size: 13px;
  line-height: 1.55;
}
</style>
