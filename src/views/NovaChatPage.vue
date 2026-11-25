<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <div class="nova-header">
        <button v-if="!isTabRoute" type="button" class="nova-icon-btn" aria-label="Kembali" @click="router.back()">
          <ion-icon :icon="arrowBackOutline" />
        </button>
        <div class="nova-header-title">
          <strong>Nova HRIS AI</strong>
          <span>Asisten Pintar Karyawan</span>
        </div>
        <button
          type="button"
          class="nova-icon-btn"
          aria-label="Reset percakapan"
          :disabled="clearing || sending"
          @click="resetConversation"
        >
          <ion-icon :icon="trashOutline" />
        </button>
      </div>
    </ion-header>

    <ion-content ref="contentRef" class="nova-content">
      <div class="nova-messages">
        <div v-if="loadingHistory" class="nova-empty">Memuat riwayat percakapan...</div>

        <div v-else-if="!messages.length" class="nova-welcome">
          <div class="nova-avatar">✨</div>
          <h2>Halo, {{ greetingTitle }}!</h2>
          <p>Tanyakan seputar saldo cuti, PH, Extra Off, absensi, jadwal shift, atau SOP HRIS.</p>
          <div class="nova-quick-list">
            <button
              v-for="prompt in quickPrompts"
              :key="prompt"
              type="button"
              class="nova-quick-chip"
              :disabled="sending"
              @click="sendText(prompt)"
            >
              {{ prompt }}
            </button>
          </div>
        </div>

        <template v-else>
          <div
            v-for="item in messages"
            :key="item.id"
            class="nova-bubble-row"
            :class="item.role === 'user' ? 'is-user' : 'is-nova'"
          >
            <div class="nova-bubble">
              <div class="nova-bubble-text" v-html="formatRichText(item.text)" />
              <img v-if="item.image_url" :src="item.image_url" alt="Lampiran Nova" class="nova-bubble-img" />
              <span v-if="item.created_at" class="nova-bubble-time">{{ formatMessageTime(item.created_at) }}</span>
            </div>
          </div>
        </template>

        <div v-if="sending" class="nova-bubble-row is-nova">
          <div class="nova-bubble nova-typing">Nova sedang mengetik...</div>
        </div>
      </div>
    </ion-content>

    <ion-footer class="nova-footer">
      <form class="nova-composer" @submit.prevent="sendText()">
        <textarea
          v-model="draft"
          rows="1"
          placeholder="Tanya Nova sesuatu..."
          class="nova-input"
          @keydown.enter.exact.prevent="sendText()"
        />
        <button type="submit" class="nova-send-btn" :disabled="!canSend" aria-label="Kirim pesan">
          <ion-icon :icon="sendOutline" />
        </button>
      </form>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonFooter, IonHeader, IonIcon, IonPage } from '@ionic/vue'
import { arrowBackOutline, sendOutline, trashOutline } from 'ionicons/icons'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showAppAlert } from '@/services/alerts'
import { apiErrorMessage } from '@/services/api'
import { authState } from '@/services/auth'
import {
  clearNovaChatHistory,
  getNovaChatHistory,
  sendNovaChatMessage,
  type NovaChatMessage,
} from '@/services/novaChat'

const route = useRoute()
const router = useRouter()
const isTabRoute = computed(() => route.path === '/tabs/nova')
const contentRef = ref<InstanceType<typeof IonContent> | null>(null)
const messages = ref<NovaChatMessage[]>([])
const draft = ref('')
const loadingHistory = ref(true)
const sending = ref(false)
const clearing = ref(false)

const quickPrompts = [
  'Saldo cuti, PH & Extra Off saya',
  'Status absen saya hari ini',
  'Jadwal shift saya minggu ini',
  'Cara pengajuan cuti & izin',
]

const greetingTitle = computed(() => {
  const raw = String(authState.user?.name || authState.user?.username || '').trim()
  const first = raw.split(/\s+/)[0] || ''
  return first ? `Kak ${first.charAt(0).toUpperCase()}${first.slice(1).toLowerCase()}` : 'Kak'
})

const canSend = computed(() => draft.value.trim().length > 0 && !sending.value)

function escapeHtml(text: string) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatRichText(text: string) {
  const linkPlaceholders: string[] = []
  let formatted = escapeHtml(text)

  formatted = formatted.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
    const token = `__URL_TOKEN_${linkPlaceholders.length}__`
    linkPlaceholders.push(`<a href="${url}" target="_blank" rel="noopener noreferrer" style="text-decoration: underline; word-break: break-all;">${url}</a>`)
    return token
  })

  formatted = formatted
    .replace(/`([^`\n]+)`/g, '<code style="font-family: monospace; padding: 1px 4px; border-radius: 4px; background: rgba(148,163,184,0.2);">$1</code>')
    .replace(/\*\*([^\*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^\*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br>')

  linkPlaceholders.forEach((anchor, index) => {
    formatted = formatted.replace(`__URL_TOKEN_${index}__`, anchor)
  })

  return formatted
}

function formatMessageTime(iso: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

async function scrollToBottom() {
  await nextTick()
  const el = contentRef.value?.$el as { scrollToBottom?: (duration?: number) => Promise<void> } | undefined
  if (el?.scrollToBottom) {
    await el.scrollToBottom(200)
  }
}

async function loadHistory() {
  loadingHistory.value = true
  try {
    const data = await getNovaChatHistory()
    messages.value = Array.isArray(data?.history) ? data.history : []
  } catch {
    messages.value = []
  } finally {
    loadingHistory.value = false
    await scrollToBottom()
  }
}

async function sendText(customText?: string) {
  const text = String(customText ?? draft.value).trim()
  if (!text || sending.value) return

  if (customText === undefined) {
    draft.value = ''
  }

  const optimisticId = `temp-${Date.now()}`
  messages.value.push({
    id: optimisticId,
    role: 'user',
    text,
    image_url: null,
    created_at: new Date().toISOString(),
  })
  sending.value = true
  await scrollToBottom()

  try {
    const data = await sendNovaChatMessage(text)
    if (Array.isArray(data?.history)) {
      messages.value = data.history
    } else {
      messages.value.push({
        id: `nova-${Date.now()}`,
        role: 'nova',
        text: data?.reply || 'Maaf, Nova tidak menerima balasan dari server.',
        image_url: data?.image_url || null,
        created_at: new Date().toISOString(),
      })
    }
  } catch (error) {
    messages.value = messages.value.filter((item) => item.id !== optimisticId)
    if (customText === undefined) draft.value = text
    await showAppAlert({
      header: 'Gagal Menghubungi Nova',
      message: apiErrorMessage(error, 'Silakan coba kirim ulang beberapa saat lagi.'),
      type: 'danger',
    })
  } finally {
    sending.value = false
    await scrollToBottom()
  }
}

async function resetConversation() {
  if (clearing.value || sending.value) return
  if (!window.confirm('Hapus riwayat percakapan dengan Nova?')) return
  clearing.value = true
  try {
    await clearNovaChatHistory()
    messages.value = []
  } catch (error) {
    await showAppAlert({ header: 'Gagal Reset Chat', message: apiErrorMessage(error), type: 'danger' })
  } finally {
    clearing.value = false
  }
}

onMounted(() => void loadHistory())
</script>

<style scoped>
.nova-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(var(--ion-safe-area-top, 0px) + 12px) 16px 12px;
  background: var(--ion-background-color, #ffffff);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}
.nova-header-title {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.nova-header-title strong {
  font-size: 1rem;
}
.nova-header-title span {
  font-size: 0.74rem;
  opacity: 0.7;
}
.nova-icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: transparent;
  color: inherit;
  display: grid;
  place-items: center;
  font-size: 1.2rem;
}
.nova-messages {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.nova-empty {
  text-align: center;
  padding: 32px 16px;
  font-size: 0.86rem;
  opacity: 0.7;
}
.nova-welcome {
  text-align: center;
  padding: 24px 12px;
}
.nova-avatar {
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  border-radius: 18px;
  background: rgba(168, 85, 247, 0.14);
  display: grid;
  place-items: center;
  font-size: 1.6rem;
}
.nova-welcome h2 {
  font-size: 1.15rem;
  margin: 0 0 6px;
}
.nova-welcome p {
  font-size: 0.84rem;
  opacity: 0.75;
  margin: 0 0 18px;
}
.nova-quick-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nova-quick-chip {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(168, 85, 247, 0.3);
  background: rgba(168, 85, 247, 0.08);
  color: inherit;
  font-size: 0.84rem;
  text-align: left;
}
.nova-bubble-row {
  display: flex;
}
.nova-bubble-row.is-user {
  justify-content: flex-end;
}
.nova-bubble-row.is-nova {
  justify-content: flex-start;
}
.nova-bubble {
  max-width: 84%;
  padding: 10px 13px;
  border-radius: 16px;
  font-size: 0.88rem;
  line-height: 1.45;
  background: rgba(148, 163, 184, 0.14);
}
.nova-bubble-row.is-user .nova-bubble {
  background: var(--ion-color-primary, #2563eb);
  color: #ffffff;
  border-bottom-right-radius: 4px;
}
.nova-bubble-row.is-nova .nova-bubble {
  border-bottom-left-radius: 4px;
}
.nova-bubble-img {
  display: block;
  margin-top: 8px;
  max-width: 100%;
  border-radius: 10px;
}
.nova-bubble-time {
  display: block;
  margin-top: 4px;
  font-size: 0.68rem;
  opacity: 0.7;
  text-align: right;
}
.nova-typing {
  font-style: italic;
  opacity: 0.75;
}
.nova-footer {
  padding: 10px 12px calc(var(--ion-safe-area-bottom, 0px) + 10px);
  background: var(--ion-background-color, #ffffff);
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}
.nova-composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.nova-input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: transparent;
  color: inherit;
  font-size: 0.9rem;
  resize: none;
  max-height: 96px;
}
.nova-send-btn {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: none;
  background: var(--ion-color-primary, #2563eb);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 1.15rem;
}
.nova-send-btn:disabled {
  opacity: 0.45;
}
</style>
