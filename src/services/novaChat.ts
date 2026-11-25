import { apiRequest } from './api'
import { authState } from './auth'

export interface NovaChatMessage {
  id: string | number
  role: 'user' | 'nova' | 'assistant'
  text: string
  image_url?: string | null
  created_at?: string | null
}

export interface NovaChatHistoryResponse {
  history: NovaChatMessage[]
}

export interface NovaChatSendResponse {
  reply?: string
  image_url?: string | null
  history?: NovaChatMessage[]
}

export function getNovaChatHistory() {
  return apiRequest<NovaChatHistoryResponse>('/nova/chat', {
    token: authState.token,
  })
}

export function sendNovaChatMessage(message: string) {
  return apiRequest<NovaChatSendResponse>('/nova/chat', {
    method: 'POST',
    token: authState.token,
    body: { message },
  })
}

export function clearNovaChatHistory() {
  return apiRequest<{ message?: string }>('/nova/chat', {
    method: 'DELETE',
    token: authState.token,
  })
}
