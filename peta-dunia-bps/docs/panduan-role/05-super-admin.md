# Panduan Role: Super Admin (`super_admin`)

- **Tujuan:** Mengelola seluruh *quest* (termasuk batas XP hingga 500 dan hapus permanen), memantau seluruh tim beserta email, memperbarui konten unit mana pun, mengelola allowlist dan status aktif akun pegawai, serta menata/mengarsipkan struktur unit organisasi.
- **Akun Demo (Emulator Only):** `superadmin@demo.bps.local` (juga kompatibel dengan nilai warisan `admin` di `firestore.rules`).

## Langkah Tugas di Aplikasi

1. **Masuk & Buka `#/manage`:**
   - Masuk sebagai **Super Admin** pada panel **Akun Demo (Emulator)**, lalu klik **Kelola**. Kelima tab tersedia: **Quest**, **Tim Saya**, **Konten Unit**, **Akun**, dan **Struktur**.
2. **Quest & Tim Saya & Konten Unit:**
   - Pada tab **Quest**, batas XP adalah **1–500**, dan tiap *quest* memiliki tombol **Hapus** permanen selain **Ubah** dan **Nonaktifkan**.
   - Pada tab **Tim Saya**, tabel menampilkan seluruh pegawai beserta kolom **Email**.
3. **Mengelola Akun (Tab `Akun`):**
   - Perhatikan catatan di bagian atas: *"Akun login dibuat pegawai sendiri lewat Buat Akun. Dari sini kamu mengatur izin, role, unit dan status aktif."*
   - Untuk menambah izin pegawai baru: isi **Email BPS**, **Nama Lengkap**, **Unit Kerja**, **Role**, **Jabatan (opsional)**, centang **Akun Aktif**, lalu klik **Simpan Akun**.
   - Untuk mengubah akun yang sudah ada: klik **Ubah** pada baris akun, perbarui **Unit Kerja**, **Role**, atau **Jabatan**, lalu klik **Perbarui Akun** (jika profil `users/{uid}` sudah ada, sistem memperbarui `allowedEmails` dan `users` sekaligus termasuk `unitPath`).
   - Untuk menonaktifkan akun: klik **Nonaktifkan** pada baris akun lain dan konfirmasi. Pengguna tersebut akan diblokir saat masuk maupun saat mengklaim *quest*.
4. **Mengelola Struktur Organisasi (Tab `Struktur`):**
   - Untuk mengubah label/pulau unit: klik **Ubah** pada daftar unit, perbarui **Nama Lengkap Unit**, **Nama Singkat (shortName)**, **Sebutan Pimpinan (headTitle)**, atau **Pulau (Island)**, lalu klik **Simpan Perubahan Unit**.
   - Untuk menambah unit baru: klik **+ Unit Baru**, isi **ID Unit Baru** (slug huruf kecil), pilih **Unit Induk**, **Tipe Unit**, nama, pimpinan, dan pulau, lalu klik **Buat Unit Baru** (`ancestorIds` dihitung otomatis).
   - Untuk menonaktifkan unit tanpa merusak riwayat: klik **Arsipkan** (dapat dikembalikan dengan **Pulihkan**). Unit tidak pernah dihapus permanen.

## Batasan & Galat Umum

- **Perlindungan akun sendiri:** Anda tidak dapat mengubah `role` atau `active` milik Anda sendiri (kolom dinonaktifkan di UI dan ditolak oleh `firestore.rules`).
- **Format email wajib valid:** ID dokumen `allowedEmails` harus berupa email huruf kecil yang cocok dengan kolom `email`.
- **Tidak ada *hard delete* unit:** Tombol hapus unit sengaja tidak disediakan demi menjaga integritas data historis.
