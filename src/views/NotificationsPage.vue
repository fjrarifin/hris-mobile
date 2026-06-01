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
            :class="{ 'notification-card--read': isRead(notification.id) }"
            role="button"
            tabindex="0"
            @click="openNotification(notification)"
            @keydown.enter="openNotification(notification)"
          >
            <span v-if="!isRead(notification.id)" class="notification-dot" />
            <div class="notification-copy">
              <div class="notification-meta">
                <strong>{{ notification.title }}</strong>
              </div>
              <span class="notification-time">{{ relativeTime(notification.createdAt) }}</span>
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
import { onMounted, onUnmounted, ref } from 'vue'
import {
  markNotificationAsRead,
  notificationHistory,
  readNotificationIdsSnapshot,
  type AppNotification,
} from '@/services/notifications'

const router = useRouter()

const notifications = ref<AppNotification[]>([])
const readNotificationIds = ref(new Set<string>())
const currentTime = ref(Date.now())
let relativeTimeTimer: number | undefined

function loadNotifications() {
  notifications.value = notificationHistory()
  readNotificationIds.value = readNotificationIdsSnapshot()
}

function isRead(id: string) {
  return readNotificationIds.value.has(id)
}

function relativeTime(createdAt: string) {
  const elapsedSeconds = Math.max(0, Math.floor((currentTime.value - new Date(createdAt).getTime()) / 1000))
  if (elapsedSeconds < 60) return 'Baru saja'

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  if (elapsedMinutes < 60) return `${elapsedMinutes} menit lalu`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours} jam lalu`

  const elapsedDays = Math.floor(elapsedHours / 24)
  return `${elapsedDays} hari lalu`
}

async function openNotification(notification: AppNotification) {
  markNotificationAsRead(notification.id)
  loadNotifications()

  if (notification.path) {
    await router.push(notification.path)
  }
}

function goBack() {
  router.back()
}

onMounted(() => {
  loadNotifications()
  relativeTimeTimer = window.setInterval(() => {
    currentTime.value = Date.now()
  }, 60000)
})

onUnmounted(() => window.clearInterval(relativeTimeTimer))
</script>

<style scoped>
.notifications-page {
  --background: var(--hris-bg);
}

.notifications-shell {
  min-height: 100%;
  padding: max(18px, env(safe-area-inset-top)) 14px 84px;
  display: grid;
  align-content: start;
  gap: 10px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 34px;
  height: 34px;
  border-radius: 11px;
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
  font-size: 17px;
}

.page-eyebrow {
  display: block;
  color: var(--ion-color-primary);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.7px;
}

.page-header h1 {
  margin: 3px 0 0;
  color: var(--hris-text-light);
  font-size: 21px;
  font-weight: 900;
}

.summary-card,
.notification-card {
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.notification-card--read {
  opacity: .76;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
}

.summary-icon {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: rgba(59, 130, 246, 0.12);
  color: var(--ion-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.summary-icon ion-icon {
  font-size: 19px;
}

.summary-card p {
  margin: 0 0 4px;
  color: var(--hris-text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.summary-card strong {
  color: var(--hris-text-dark);
  font-size: 13px;
  font-weight: 850;
}

.notification-list {
  display: grid;
  gap: 8px;
}

.notification-card {
  position: relative;
  display: flex;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
}

.notification-dot {
  width: 8px;
  height: 8px;
  margin-top: 5px;
  border-radius: 50%;
  background: #22C55E;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
  flex-shrink: 0;
}

.notification-copy {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 5px;
}

.notification-meta {
  display: flex;
  align-items: flex-start;
  padding-right: 72px;
}

.notification-meta strong {
  color: var(--hris-text-dark);
  font-size: 13px;
  font-weight: 850;
}

.notification-time {
  position: absolute;
  top: 12px;
  right: 12px;
  color: var(--hris-text-muted);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.notification-copy p {
  margin: 0;
  color: var(--hris-text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.empty-state {
  margin: 0;
  padding: 18px 12px;
  border-radius: 14px;
  border: 1px dashed var(--hris-border);
  color: var(--hris-text-secondary);
  font-size: 12px;
  text-align: center;
}
</style>
