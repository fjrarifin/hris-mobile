export function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDay(value?: string | null) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: '2-digit',
  }).format(new Date(value))
}

export function formatTime(value?: string | null) {
  return value ? `${value.slice(0, 5)} WIB` : '-'
}

export interface AttendanceStatusMeta {
  code: string
  label: string
  className: string
}

export function getAttendanceStatusMeta(
  status?: string | null,
  isComplete = false,
  isFuture = false,
): AttendanceStatusMeta {
  if (isFuture) {
    return {
      code: '',
      label: 'Mendatang',
      className: 'status-muted',
    }
  }

  const normalized = (status || '').toLowerCase()

  if (normalized === 'public_holiday' || normalized === 'ph') {
    return { code: 'PH', label: 'Public Holiday', className: 'status-holiday' }
  }

  if (normalized === 'extra_off' || normalized === 'eo') {
    return { code: 'EO', label: 'Extra Off', className: 'status-holiday' }
  }

  if (normalized === 'leave' || normalized === 'cuti') {
    return { code: 'C', label: 'Cuti', className: 'status-leave' }
  }

  if (normalized === 'permission' || normalized === 'izin') {
    return { code: 'I', label: 'Izin', className: 'status-permit' }
  }

  if (normalized === 'sick' || normalized === 'sakit') {
    return { code: 'S', label: 'Sakit', className: 'status-sick' }
  }

  if (normalized === 'holiday' || normalized === 'libur' || normalized === 'off') {
    return { code: 'L', label: 'Libur', className: 'status-muted' }
  }

  if (normalized === 'absent') {
    return { code: 'A', label: 'Alfa / Tidak Hadir', className: 'status-danger' }
  }

  return {
    code: 'M',
    label: 'Masuk',
    className: isComplete ? 'status-success' : 'status-warning',
  }
}

export function weeklyAttendanceLabel(status: string) {
  if (status === 'public_holiday' || status === 'ph') {
    return 'Public Holiday'
  }

  if (status === 'extra_off' || status === 'eo') {
    return 'Extra Off'
  }

  if (status === 'leave' || status === 'cuti') {
    return 'Cuti'
  }

  if (status === 'permission' || status === 'izin') {
    return 'Izin'
  }

  if (status === 'sick' || status === 'sakit') {
    return 'Sakit'
  }

  if (status === 'holiday' || status === 'libur' || status === 'off') {
    return 'Libur'
  }

  return (
    {
      checked_out: 'Hadir',
      working: 'Bekerja',
      present: 'Bekerja',
      missing_in: 'Scan masuk kosong',
      missing_out: 'Belum scan pulang',
      absent: 'Tidak hadir',
      completed: 'Hadir',
      late_completed: 'Hadir',
      future: 'Mendatang',
    }[status] || 'Tidak hadir'
  )
}

export function weeklyAttendanceClass(status: string) {
  if (status === 'public_holiday' || status === 'ph') {
    return 'status-holiday'
  }

  if (status === 'extra_off' || status === 'eo') {
    return 'status-holiday'
  }

  if (status === 'leave' || status === 'cuti') {
    return 'status-leave'
  }

  if (status === 'permission' || status === 'izin') {
    return 'status-permit'
  }

  if (status === 'sick' || status === 'sakit') {
    return 'status-sick'
  }

  if (status === 'holiday' || status === 'libur' || status === 'off') {
    return 'status-muted'
  }

  return (
    {
      checked_out: 'status-success',
      working: 'status-success',
      present: 'status-success',
      missing_in: 'status-warning',
      missing_out: 'status-warning',
      absent: 'status-danger',
      future: 'status-muted',
      completed: 'status-success',
      late_completed: 'status-warning',
    }[status] || 'status-muted'
  )
}
