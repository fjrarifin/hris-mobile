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

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnlyMatch) {
    return formatCalendarDate(dateOnlyMatch)
  }

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    const date = new Date(value)

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      }).format(date)
    }
  }

  const datePrefixMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (datePrefixMatch) {
    return formatCalendarDate(datePrefixMatch)
  }

  return '-'
}

function formatCalendarDate(dateMatch: RegExpMatchArray) {
  const [, year, month, day] = dateMatch

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12)))
}
