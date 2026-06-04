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

        <ion-accordion-group class="guide-group">
          <ion-accordion v-for="section in sections" :key="section.title" :value="section.title">
            <ion-item slot="header" lines="none" class="guide-header">
              <ion-icon :icon="section.icon" slot="start" class="guide-icon" />
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
    note: 'PH dapat digunakan sesuai ketentuan perusahaan.',
    steps: [
      'Pilih Public Holiday yang masih tersedia lalu tentukan tanggal pengambilan.',
      'Pengajuan PH tidak boleh bentrok dengan jadwal cuti atau tanggal yang sudah terlewat.',
      'Setelah disetujui atasan, pengajuan akan diverifikasi oleh HRD.',
    ],
  },
  {
    title: 'Izin / Sakit',
    icon: medkitOutline,
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
    note: 'OTP WhatsApp berlaku 2 menit.',
    steps: [
      'Pada halaman login, pilih menu lupa password dan masukkan NIK.',
      'Kode OTP 6 digit dikirim ke nomor terdaftar dan harus diisi sebelum waktu habis.',
      'Buat password baru yang aman, lalu login kembali.',
    ],
  },
]
</script>

<style scoped>
.guide-page {
  --background: var(--hris-bg);
}

.guide-shell {
  min-height: 100%;
  padding: max(18px, env(safe-area-inset-top)) 14px 84px;
  display: grid;
  gap: 10px;
}

.hero-card,
.info-card,
.guide-header,
.guide-content {
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

.guide-group {
  display: grid;
  gap: 8px;
}

.guide-group ion-accordion {
  display: block;
  border: 1px solid var(--hris-border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--hris-card-bg);
}

.guide-header {
  --min-height: 52px;
  --padding-start: 11px;
  --padding-end: 11px;
  --inner-padding-end: 0;
  --background: transparent;
  --color: var(--hris-text-dark);
}

.guide-icon {
  font-size: 17px;
  color: var(--ion-color-primary);
}

.guide-header h2 {
  margin: 0;
  color: var(--hris-text-dark);
  font-size: 13px;
  font-weight: 800;
}

.guide-header p {
  margin: 3px 0 0;
  color: var(--hris-text-secondary);
  font-size: 11px;
}

.guide-content {
  padding: 0 13px 12px;
  background: var(--hris-card-bg);
  color: var(--hris-text-secondary);
}

.guide-content ol {
  margin: 0;
  padding-top: 9px;
  padding-left: 18px;
  display: grid;
  gap: 7px;
}

.guide-content li {
  color: var(--hris-text-secondary);
  font-size: 12px;
  line-height: 1.45;
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
