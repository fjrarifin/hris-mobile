import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'hris_mobile_theme'

export const themeMode = ref<ThemeMode>('dark')

function getDocumentRoot() {
  return typeof document !== 'undefined' ? document.documentElement : null
}

function normalizeTheme(value: string | null | undefined): ThemeMode {
  return value === 'light' ? 'light' : 'dark'
}

export function applyTheme(mode: ThemeMode) {
  themeMode.value = mode

  const root = getDocumentRoot()
  if (root) {
    root.dataset.theme = mode
    root.style.colorScheme = mode
  }

  localStorage.setItem(STORAGE_KEY, mode)
}

export function initTheme() {
  const stored = normalizeTheme(localStorage.getItem(STORAGE_KEY))
  applyTheme(stored)
}

export function toggleTheme() {
  applyTheme(themeMode.value === 'dark' ? 'light' : 'dark')
}

export function isLightTheme() {
  return themeMode.value === 'light'
}
