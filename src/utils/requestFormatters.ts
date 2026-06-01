export function requestStatusLabel(status: string) {
  return (
    {
      pending: 'Menunggu Atasan',
      waiting_hr: 'Menunggu HRD',
      approved: 'Disetujui',
      rejected: 'Ditolak',
      cancelled: 'Dibatalkan',
    }[status] || status
  )
}

export function requestStatusClass(status: string) {
  return (
    {
      pending: 'status-pending',
      waiting_hr: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      cancelled: 'status-cancelled',
    }[status] || 'status-cancelled'
  )
}

export function requestDate(value?: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`))
}
