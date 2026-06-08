<template>
  <ion-page>
    <ion-content fullscreen class="guide-page">
      <main class="guide-shell">
        <section class="hero-card">
          <span class="hero-eyebrow">Panduan Aplikasi</span>
          <h2>HomPimPlay Guide</h2>
          <p>
            Ringkasan singkat untuk absensi, cuti, izin, Public Holiday, jadwal tim, dan profil karyawan.
          </p>
        </section>

        <section v-for="group in guideGroups" :key="group.title" class="guide-category">
          <h3>{{ group.title }}</h3>
          <ion-accordion-group class="guide-group">
            <ion-accordion v-for="section in group.items" :key="section.title" :value="section.title">
              <ion-item slot="header" lines="none" class="guide-header">
                <span class="guide-icon-wrap" :style="{ background: section.bg, color: section.color }" slot="start">
                  <ion-icon :icon="section.icon" class="guide-icon" />
                </span>
                <ion-label>
                  <h2>{{ section.title }}</h2>
                  <p>{{ section.note }}</p>
                </ion-label>
              </ion-item>

              <div slot="content" class="guide-content">
                <ol>
                  <li v-for="step in section.steps" :key="step">
                    {{ step }}
                  </li>
                </ol>
              </div>
            </ion-accordion>
          </ion-accordion-group>
        </section>

        <section class="info-card">
          <h3>Untuk Atasan</h3>
          <p>
            Menu persetujuan pengajuan dan lembur hanya tampil bila Anda memiliki bawahan. Dari sana,
            Anda dapat memproses cuti, PH, izin, dan sakit bawahan, lalu meneruskannya ke HRD.
          </p>
        </section>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonAccordion,
  IonAccordionGroup,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonPage,
} from '@ionic/vue'
import {
  calendarClearOutline,
  calendarOutline,
  fingerPrintOutline,
  flashlightOutline,
  keyOutline,
  layersOutline,
  medkitOutline,
  peopleOutline,
  personCircleOutline,
  shieldCheckmarkOutline,
  timerOutline,
} from 'ionicons/icons'

const sections = [
  {
    title: 'Dashboard Karyawan',
    icon: peopleOutline,
    group: 'Kehadiran & Waktu',
    color: '#2563EB',
    bg: '#EFF6FF',
    note: 'Ringkasan status pribadi dan tim.',
    steps: [
      'Kartu kehadiran menampilkan status harian, jam masuk, jam keluar, dan durasi kerja.',
      'Dashboard juga menampilkan ringkasan saldo cuti dan Public Holiday.',
      'Gunakan tombol profil untuk melihat data karyawan secara lengkap.',
      'Ikon di bagian atas menampilkan tema terang atau gelap.',
    ],
  },
  {
    title: 'Pengajuan Cuti',
    icon: calendarClearOutline,
    group: 'Cuti & Izin',
    color: '#16A34A',
    bg: '#DCFCE7',
    note: 'Maksimal 5 hari per pengajuan.',
    steps: [
      'Buka menu Pengajuan Cuti dan isi jenis, periode, serta alasan.',
      'Pastikan tanggal yang dipilih tidak bentrok dengan cuti atau PH lain.',
      'Atasan langsung menyetujui atau menolak pengajuan sebelum diteruskan ke HRD.',
    ],
  },
  {
    title: 'Public Holiday',
    icon: calendarOutline,
    group: 'Cuti & Izin',
    color: '#F97316',
    bg: '#FFEDD5',
    note: 'PH dapat digunakan sesuai ketentuan perusahaan.',
    steps: [
      'Pilih Public Holiday yang masih tersedia lalu tentukan tanggal pengambilan.',
      'Pengajuan PH tidak boleh bentrok dengan jadwal cuti atau tanggal yang sudah terlewat.',
      'Setelah disetujui atasan, pengajuan akan diverifikasi oleh HRD.',
    ],
  },
  {
    title: 'Extra Off',
    icon: shieldCheckmarkOutline,
    group: 'Cuti & Izin',
    color: '#0D9488',
    bg: '#CCFBF1',
    note: 'Pengganti hari libur yang bekerja.',
    steps: [
      'Buka menu Extra Off lalu pilih periode sumber hak Extra Off yang tersedia.',
      'Tentukan tanggal pengambilan Extra Off sesuai kebutuhan dan jadwal kerja.',
      'Pastikan tanggal tidak bentrok dengan cuti, izin, sakit, atau Public Holiday yang sudah diajukan.',
      'Pengajuan yang disetujui akan tercatat sebagai EO pada kalender absensi.',
    ],
  },
  {
    title: 'Izin / Sakit',
    icon: medkitOutline,
    group: 'Cuti & Izin',
    color: '#EF4444',
    bg: '#FEE2E2',
    note: 'Surat sakit wajib diunggah untuk jenis Sakit.',
    steps: [
      'Pilih Izin atau Sakit lalu isi tanggal pengajuan.',
      'Untuk Izin, tuliskan alasan; untuk Sakit, unggah dokumen pendukung.',
      'Atasan memeriksa pengajuan sebelum diteruskan ke HRD.',
    ],
  },
  {
    title: 'Absensi Saya',
    icon: fingerPrintOutline,
    group: 'Kehadiran & Waktu',
    color: '#0F766E',
    bg: '#CCFBF1',
    note: 'Periksa scan masuk dan pulang secara berkala.',
    steps: [
      'Buka menu Absensi Saya, lalu tentukan tanggal awal dan tanggal akhir.',
      'Jam masuk berasal dari scan pertama dan jam pulang berasal dari scan terakhir.',
      'Status harian ditampilkan sebagai M, A, PH, C, I, S, atau L sesuai data absensi.',
    ],
  },
  {
    title: 'Pengajuan Lembur',
    icon: timerOutline,
    group: 'Kehadiran & Waktu',
    color: '#7C3AED',
    bg: '#F3E8FF',
    note: 'Khusus atasan yang memiliki bawahan langsung.',
    steps: [
      'Menu Pengajuan Lembur muncul bila Anda terdaftar sebagai atasan langsung.',
      'Pilih bawahan, lalu isi tanggal, jam mulai, jam selesai, dan alasan lembur.',
      'Pengajuan yang belum diproses dapat dibatalkan dari riwayat.',
    ],
  },
  {
    title: 'Jadwal Tim',
    icon: layersOutline,
    group: 'Kehadiran & Waktu',
    color: '#4F46E5',
    bg: '#EEF2FF',
    note: 'Khusus karyawan pada level Supervisor.',
    steps: [
      'Menu Jadwal Tim hanya tampil untuk Supervisor dan bawahan yang menjadi tanggung jawabnya.',
      'Pilih periode jadwal lalu edit kode shift untuk tiap tanggal yang diperlukan.',
      'Gunakan keterangan kode shift agar pagi, siang, libur, cuti, dan PH tidak tertukar.',
    ],
  },
  {
    title: 'Sesi Login',
    icon: flashlightOutline,
    group: 'Akun & Keamanan',
    color: '#06B6D4',
    bg: '#CFFAFE',
    note: 'Berakhir otomatis setelah 7 hari tidak digunakan.',
    steps: [
      'Jika aplikasi tidak dipakai atau tidak dibuka selama 7 hari, Anda perlu login ulang.',
      'Satu akun tidak bisa digunakan bersamaan di banyak perangkat.',
      'Gunakan logout saat selesai memakai aplikasi.',
    ],
  },
  {
    title: 'Mengganti Foto Profil',
    icon: personCircleOutline,
    group: 'Akun & Keamanan',
    color: '#64748B',
    bg: '#F1F5F9',
    note: 'Maksimal 1 kali dalam 30 hari.',
    steps: [
      'Buka profil, lalu gunakan bagian perbarui foto profil.',
      'Pilih foto formal satu orang dengan wajah terlihat jelas dan format JPG, JPEG, atau PNG.',
      'Pastikan preview sudah benar sebelum menyimpan foto.',
    ],
  },
  {
    title: 'Mengganti Password',
    icon: keyOutline,
    group: 'Akun & Keamanan',
    color: '#D97706',
    bg: '#FEF3C7',
    note: 'Maksimal 1 kali dalam 30 hari.',
    steps: [
      'Buka menu ubah password dari halaman profil atau login.',
      'Masukkan password saat ini, password baru, dan konfirmasi password baru.',
      'Simpan perubahan lalu login kembali dengan password baru.',
    ],
  },
  {
    title: 'Lupa Password',
    icon: shieldCheckmarkOutline,
    group: 'Akun & Keamanan',
    color: '#2563EB',
    bg: '#DBEAFE',
    note: 'OTP WhatsApp berlaku 2 menit.',
    steps: [
      'Pada halaman login, pilih menu lupa password dan masukkan NIK.',
      'Kode OTP 6 digit dikirim ke nomor terdaftar dan harus diisi sebelum waktu habis.',
      'Buat password baru yang aman, lalu login kembali.',
    ],
  },
]

const guideGroupOrder = ['Kehadiran & Waktu', 'Cuti & Izin', 'Akun & Keamanan']
const guideGroups = guideGroupOrder
  .map((title) => ({
    title,
    items: sections.filter((section) => section.group === title),
  }))
  .filter((group) => group.items.length > 0)
</script>

<style scoped>
.guide-page {
  --background: var(--hris-bg);
}

.guide-shell {
  min-height: 100%;
  padding: max(18px, env(safe-area-inset-top)) 14px 84px;
  display: grid;
  gap: 14px;
}

.hero-card,
.info-card {
  background: var(--hris-card-bg);
  border: 1px solid var(--hris-border);
  border-radius: 18px;
}

.hero-card {
  padding: 14px;
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--hris-soft-surface);
  color: var(--ion-color-primary);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.hero-card h2 {
  margin: 9px 0 6px;
  color: var(--hris-text-light);
  font-size: 20px;
  font-weight: 900;
}

.hero-card p,
.info-card p {
  margin: 0;
  color: var(--hris-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.guide-category {
  display: grid;
  gap: 8px;
}

.guide-category h3 {
  margin: 0 0 1px 5px;
  color: var(--hris-text-secondary);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.guide-group {
  overflow: hidden;
  border: 1px solid var(--hris-border);
  border-radius: 16px;
  background: var(--hris-card-bg);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
}

.guide-group ion-accordion {
  display: block;
  background: transparent;
  border-bottom: 1px solid var(--hris-border);
}

.guide-group ion-accordion:last-child {
  border-bottom: 0;
}

.guide-header {
  --min-height: 66px;
  --padding-start: 12px;
  --padding-end: 12px;
  --inner-padding-end: 0;
  --background: transparent;
  --color: var(--hris-text-dark);
  --detail-icon-color: var(--hris-text-secondary);
  --detail-icon-opacity: 1;
}

.guide-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.guide-icon {
  font-size: 18px;
}

.guide-header h2 {
  margin: 0;
  color: var(--hris-text-dark);
  font-size: 14px;
  font-weight: 900;
}

.guide-header p {
  margin: 2px 0 0;
  color: var(--hris-text-secondary);
  font-size: 12px;
  font-weight: 650;
  line-height: 1.2;
}

.guide-content {
  padding: 0 14px 14px 62px;
  background: var(--hris-card-bg);
  color: var(--hris-text-secondary);
}

.guide-content ol {
  margin: 0;
  padding-top: 2px;
  padding-left: 18px;
  display: grid;
  gap: 7px;
}

.guide-content li {
  color: var(--hris-text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

:root[data-theme="dark"] .guide-group {
  background: #202734;
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 14px 30px rgba(2, 6, 23, 0.28);
}

:root[data-theme="dark"] .guide-group ion-accordion {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

:root[data-theme="dark"] .guide-header {
  --color: #F8FAFC;
  --detail-icon-color: rgba(226, 232, 240, 0.72);
}

:root[data-theme="dark"] .guide-header h2 {
  color: #F8FAFC;
}

:root[data-theme="dark"] .guide-header p,
:root[data-theme="dark"] .guide-content,
:root[data-theme="dark"] .guide-content li {
  color: #CBD5E1;
}

:root[data-theme="dark"] .guide-content {
  background: #202734;
}

:root[data-theme="light"] .guide-category h3 {
  color: #9CA3AF;
}

:root[data-theme="light"] .guide-group {
  background: #FFFFFF;
  border-color: rgba(30, 41, 59, 0.1);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
}

:root[data-theme="light"] .guide-content {
  background: #FFFFFF;
}

.info-card {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--hris-border);
  background: var(--hris-card-bg);
}

.info-card h3 {
  margin: 0 0 8px;
  color: var(--hris-text-dark);
  font-size: 14px;
  font-weight: 800;
}
</style>
