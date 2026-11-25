import { apiRequest } from './api'
import { authState } from './auth'

export interface StaffJobdeskItem {
  id: number
  kategori: string
  tipe_tugas: string
  deskripsi: string
  has_document?: boolean
}

export interface StaffKpiItem {
  id: number
  nama_kpi: string
  template_name?: string | null
  deskripsi?: string | null
  target: string | number
  satuan?: string | null
  bobot: string | number
  formula_penilaian?: string | null
}

export interface StaffTalentResponse {
  employee: {
    jabatan: string
    departemen?: string | null
  }
  jobdesks: StaffJobdeskItem[]
  kpis: StaffKpiItem[]
}

export interface StaffJobdeskPdfPreviewResponse {
  content_base64: string
  mime_type: string
  filename?: string
}

export function getStaffTalent() {
  return apiRequest<StaffTalentResponse>('/staff/talent', {
    token: authState.token,
  })
}

export function getStaffJobdeskPdfPreview(id: number) {
  return apiRequest<StaffJobdeskPdfPreviewResponse>(`/staff/talent/jobdesks/${id}/pdf-preview`, {
    token: authState.token,
  })
}
