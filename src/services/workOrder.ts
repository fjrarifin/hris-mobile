import { API_BASE_URL, ApiRequestError, apiRequest } from './api'
import { authState } from './auth'

export interface WorkOrderListItem {
  id: number
  wo_number?: string | null
  job_type: string
  area_name: string
  project_description: string
  status: string
  target_date?: string | null
  requester_name?: string | null
  requester_nik?: string | null
  created_at?: string | null
  photo_path?: string | null
  photo_paths?: string[] | string | null
  request_document_path?: string | null
  my_pending_stage?: string | null
  can_cancel?: boolean
  can_review?: boolean
}

export interface WorkOrderListResponse {
  data: WorkOrderListItem[]
  current_page: number
  last_page: number
  total: number
}

export interface WorkOrderApprover {
  id: number
  name: string
  nik?: string | null
  jabatan?: string | null
}

export interface WorkOrderApprovalItem {
  id: number
  stage: string
  approver_name?: string | null
  approver_jabatan?: string | null
  status: string
  comment?: string | null
  decided_at?: string | null
}

export interface WorkOrderLogItem {
  id: number
  action: string
  actor_name?: string | null
  notes?: string | null
  created_at?: string | null
}

export interface WorkOrderDetailResponse {
  work_order: WorkOrderListItem & {
    notes?: string | null
    completion_photo_path?: string | null
    revision_photo_paths?: string[] | null
    spl_document_path?: string | null
    rab_total?: number | null
    technician_name?: string | null
  }
  approvals: WorkOrderApprovalItem[]
  logs?: WorkOrderLogItem[]
  my_pending_stage?: string | null
  can_cancel?: boolean
  can_review?: boolean
}

export function getWorkOrders(params: {
  page?: number
  per_page?: number
  scope?: 'all' | 'approvals'
  search?: string
  status?: string
} = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.per_page) query.set('per_page', String(params.per_page))
  if (params.scope) query.set('scope', params.scope)
  if (params.search) query.set('search', params.search)
  if (params.status) query.set('status', params.status)
  const qs = query.toString()

  return apiRequest<WorkOrderListResponse>(`/ga/work-orders${qs ? `?${qs}` : ''}`, {
    token: authState.token,
  })
}

export function getWorkOrderDetail(id: number) {
  return apiRequest<WorkOrderDetailResponse>(`/ga/work-orders/${id}`, {
    token: authState.token,
  })
}

export async function getWorkOrderApprovers(search = ''): Promise<WorkOrderApprover[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  const data = await apiRequest<{ approvers?: WorkOrderApprover[] }>(`/ga/work-orders/approvers${qs}`, {
    token: authState.token,
  })
  return data.approvers || []
}

export async function getWorkOrderUnits(): Promise<string[]> {
  const data = await apiRequest<{ units?: Array<string | { name?: string; nama_unit?: string }> }>('/ga/work-orders/units', {
    token: authState.token,
  })
  return (data.units || [])
    .map((u) => (typeof u === 'string' ? u : u.name || u.nama_unit || ''))
    .filter(Boolean)
}

export function createWorkOrder(payload: {
  job_type: string
  area_name: string
  project_description: string
  target_date?: string | null
  notes?: string | null
  photos: string[]
  document?: string | null
  approver_ids: number[]
}) {
  return apiRequest<{ message?: string; work_order?: WorkOrderListItem }>('/ga/work-orders', {
    method: 'POST',
    token: authState.token,
    body: payload,
  })
}

export function approveWorkOrder(
  id: number,
  payload: { stage: string; decision: 'approve' | 'reject'; comment?: string | null },
) {
  return apiRequest<{ message?: string }>(`/ga/work-orders/${id}/approve`, {
    method: 'POST',
    token: authState.token,
    body: payload,
  })
}

export function reviewWorkOrder(
  id: number,
  payload: { decision: 'done' | 'revision'; notes?: string | null; photos?: string[] },
) {
  return apiRequest<{ message?: string }>(`/ga/work-orders/${id}/review`, {
    method: 'POST',
    token: authState.token,
    body: payload,
  })
}

export function cancelWorkOrder(id: number) {
  return apiRequest<{ message?: string }>(`/ga/work-orders/${id}`, {
    method: 'DELETE',
    token: authState.token,
  })
}

export async function fetchWorkOrderAttachment(id: number, type: string, index = 0) {
  const url = `${API_BASE_URL}/ga/work-orders/${id}/attachments/${type}?index=${index}`
  const response = await fetch(url, {
    headers: {
      Authorization: authState.token ? `Bearer ${authState.token}` : '',
      Accept: '*/*',
    },
  })
  if (!response.ok) {
    throw new ApiRequestError(response.status, { message: 'Gagal membuka lampiran.' })
  }
  const blob = await response.blob()
  const contentType = response.headers.get('content-type') || blob.type || 'application/octet-stream'
  return { blob, contentType }
}
