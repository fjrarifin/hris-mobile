import { apiRequest } from './api'
import { authState } from './auth'
import { getSelfAttendanceLogs } from './attendance'

export interface StaffDashboard {
  as_of_date: string
  employee: {
    nik: string
    name: string
    position: string | null
    department: string | null
    join_date: string | null
    photo_url: string | null
  }
  summary: {
    working_days: number
    attendance_days: number
    leave_balance: number
    public_holiday_balance: number
  }
  attendance_period: {
    start: string
    end: string
  }
  has_subordinates: boolean
  subordinates_today: unknown[]
  pending_subordinate_approvals: unknown[]
  weekly_attendance: {
    start_date: string
    end_date: string
    total_duration: string
    days: Array<{
      date: string
      scan_in: string | null
      scan_out: string | null
      status: string
      duration: string
    }>
  }
}

export interface StaffProfile {
  user: {
    id: number
    name: string
    username: string
    email: string | null
    photo_url: string | null
    photo_changed_at?: string | null
    photo_change_available_at?: string | null
    photo_change_available_label?: string | null
    can_change_photo?: boolean
    email_updated_at?: string | null
    phone_updated_at?: string | null
    can_change_email?: boolean
    can_change_phone?: boolean
  }
  employee: {
    nik: string
    nama_karyawan?: string | null
    name?: string | null
    jabatan?: string | null
    posisi?: string | null
    departement?: string | null
    divisi?: string | null
    unit?: string | null
    nama_atasan_langsung?: string | null
    atasan_tidak_langsung?: string | null
    no_hp?: string | null
    email?: string | null
    tempat_lahir?: string | null
    tanggal_lahir?: string | null
    jenis_kelamin?: string | null
    golongan_darah?: string | null
    alamat?: string | null
    status_pernikahan?: string | null
    status_pajak?: string | null
    agama?: string | null
    kewarganegaraan?: string | null
    pendidikan_terakhir?: string | null
    nama_institusi?: string | null
    jurusan?: string | null
    nama_pasangan?: string | null
    jumlah_anak?: number | string | null
    nama_anak_1?: string | null
    nama_anak_2?: string | null
    nama_anak_3?: string | null
    nama_ayah?: string | null
    nama_ibu?: string | null
    kontak_darurat_nama?: string | null
    kontak_darurat_hubungan?: string | null
    kontak_darurat_no_hp?: string | null
    account_name?: string | null
    bank?: string | null
    no_rekening?: string | null
    no_npwp?: string | null
    npwp?: boolean | null
    no_bpjs?: string | null
    bpjs?: boolean | null
    join_date?: string | null
    photo_url?: string | null
  }
}

export interface StaffAttendanceRecord {
  date: string
  scan_in: string | null
  scan_out: string | null
  total_scans: number
  is_complete: boolean
  status?: string
  schedule_code?: string | null
  schedule_label?: string | null
  schedule_start_time?: string | null
  schedule_end_time?: string | null
}

export interface StaffAttendanceResponse {
  employee: {
    nik: string
    name: string
    pin: string | null
  }
  filters: {
    start_date: string
    end_date: string
  }
  summary: {
    attendance_days: number
    complete_days: number
    incomplete_days: number
  }
  records: StaffAttendanceRecord[]
}

export async function getStaffDashboard() {
  const dashboard = await apiRequest<StaffDashboard>('/staff/dashboard', {
    token: authState.token,
  })

  if (dashboard && dashboard.weekly_attendance && dashboard.weekly_attendance.days) {
    const localLogs = getSelfAttendanceLogs()

    const oldPresentDays = dashboard.weekly_attendance.days.filter(d => d.scan_in !== null).length

    dashboard.weekly_attendance.days = dashboard.weekly_attendance.days.map((day) => {
      const dayLogs = localLogs.filter((log) => log.date === day.date)
      if (dayLogs.length > 0) {
        dayLogs.sort((a, b) => a.time.localeCompare(b.time))

        const localScanIn = dayLogs[0].time
        const localScanOut = dayLogs.length > 1 ? dayLogs[dayLogs.length - 1].time : null

        const scan_in = day.scan_in || localScanIn
        const scan_out = day.scan_out || localScanOut

        let status = day.status
        if (!scan_in && scan_out) {
          status = 'missing_in'
        } else if (scan_in && scan_out) {
          const [hour, min] = scan_in.split(':').map(Number)
          status = hour > 8 || (hour === 8 && min > 0) ? 'late_completed' : 'completed'
        } else if (scan_in) {
          status = 'working'
        }

        return {
          ...day,
          scan_in,
          scan_out,
          status,
        }
      }
      return day
    })

    const newPresentDays = dashboard.weekly_attendance.days.filter(d => d.scan_in !== null).length
    const diff = newPresentDays - oldPresentDays
    if (diff > 0 && dashboard.summary) {
      dashboard.summary.attendance_days += diff
    }
  }

  return dashboard
}

export function getStaffAttendance(startDate: string, endDate: string) {
  return apiRequest<StaffAttendanceResponse>(
    `/staff/attendance?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
    {
      token: authState.token,
    },
  )
}

export function getStaffProfile() {
  return apiRequest<StaffProfile>('/staff/profile', {
    token: authState.token,
  })
}
