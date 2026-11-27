# Step-by-Step Demo Tutorial — Peta Dunia BPS

Panduan praktis langkah demi langkah untuk menjalankan dan mendemonstrasikan **Peta Dunia BPS** secara lokal menggunakan Firebase Emulator.

---

## Persiapan Awal (Sekali Sebelum Demo)

Pastikan di komputer sudah terpasang:
- **Node.js** (disarankan v20+ / v22)
- **Java JDK** (dibutuhkan oleh Firebase Firestore & Auth Emulator)
- Semua dependensi proyek sudah terpasang (`npm install` sudah dijalankan sebelumnya).

Pastikan port berikut sedang kosong: `9099`, `8080`, `4000`, dan `5173`.

---

## Langkah 1 — Jalankan Firebase Emulator (Terminal 1)

Buka terminal pertama di folder aplikasi:

```powershell
cd D:\career\bps-quest\peta-dunia-bps
npm run emulators
```

Tunggu hingga muncul log bahwa **Auth Emulator (`127.0.0.1:9099`)** dan **Firestore Emulator (`127.0.0.1:8080`)** siap. Biarkan terminal ini tetap terbuka selama demo berlangsung.

---

## Langkah 2 — Isi Ulang Data Demo & Jalankan Aplikasi (Terminal 2)

Buka terminal kedua di folder yang sama, lalu reset dan cek data demo:

```powershell
cd D:\career\bps-quest\peta-dunia-bps
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
$env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
npm run demo:reset
npm run demo:check
```

Output yang diharapkan pada `demo:check`:
`Check passed: 33 units, 67 quests, 36 users, 36 allowlist entries, 11 Auth accounts, 0 placeholder hits.`

Selanjutnya nyalakan server dev Vite dalam mode emulator:

```powershell
$env:VITE_USE_EMULATORS="true"
npm run dev
```

Buka browser dan kunjungi **`http://localhost:5173`**.
Di pojok kanan bawah akan muncul panel mengambang **Akun Demo (Emulator)** untuk berpindah akun dengan sekali klik. *(Seluruh akun memakai kata sandi `DemoPassword123!` jika ingin login manual lewat form.)*

---

## Langkah 3 — Jalankan Demo Langsung (5 Babak, ~10–12 Menit)

### Babak 1: Sudut Pandang Pegawai (`Pegawai SDM 1`)
1. Klik tombol **Pegawai SDM 1** di panel **Akun Demo (Emulator)**.
2. Di **Peta Dunia BPS** (`#/world`), tunjukkan 8 pulau organisasi BPS RI Pusat yang semuanya sudah terbuka. Tunjukkan pula tidak ada tombol **Kelola** di HUD kanan atas.
3. Klik pulau **Sekretariat Utama** (`#/island/sestama`). Tunjukkan judul **Sekretariat Utama · 7 unit** dan label `· Biro Anda` pada **Biro SDM**.
4. Klik salah satu unit lain, misalnya **Biro Umum & Humas**, untuk membuka panel profil unit. Jelaskan 4 menu informasi (**Profil & Tugas Fungsi**, **Struktur Organisasi**, **Fasilitas & Layanan**, **Papan Informasi Terkini**) dan tunjukkan bagian bawah hanya berupa catatan bahwa quest khusus pegawai unit tersebut (tidak ada tombol **Mulai Quest**). Tutup panel (`×`).
5. Klik **Biro SDM** untuk masuk ke denah lantai kantor (`#/office`).
6. Gerakkan avatar dengan `WASD` / panah ke **Papan Informasi** kuning (atau klik langsung papan kuning), lalu klik **Mulai Quest**.
7. Klik **Selesaikan (+20 XP)** pada quest harian **Baca papan informasi**, lalu buka **Papan Peringkat** (ikon piala di kanan atas HUD) untuk melihat XP bertambah dan posisi peringkat pegawai.

### Babak 2: Sudut Pandang Kepala Biro / Eselon II (`Kabiro SDM (E2)`)
1. Klik **Kabiro SDM (E2)** di panel **Akun Demo (Emulator)**.
2. Klik tombol **Kelola** di HUD kanan atas untuk membuka `#/manage`.
3. Tunjukkan hanya 3 tab yang muncul: **Quest**, **Tim Saya**, dan **Konten Unit**.
4. Di tab **Quest**:
   - Tunjukkan dropdown **Unit Kerja** hanya berisi **Biro Sumber Daya Manusia** (tidak bisa memilih unit lain).
   - Isi formulir quest baru (misal judul `Sosialisasi SKP Triwulanan`, tipe `daily`, XP `30`), lalu klik **Simpan Quest**.
   - Tunjukkan bahwa untuk pimpinan tidak ada tombol **Hapus**, hanya **Ubah** dan **Nonaktifkan**.
5. Buka tab **Tim Saya**: tunjukkan daftar pegawai hanya berasal dari Biro SDM dan kolom **Email** tidak ditampilkan.
6. Buka tab **Konten Unit**: tambahkan satu pengumuman baru pada kotak **Tambah Pengumuman Baru**, klik **Tambah**, lalu klik **Simpan Konten Unit**.

### Babak 3: Bukti Sinkronisasi ke Pegawai (`Pegawai SDM 2`)
1. Klik **Pegawai SDM 2** di panel **Akun Demo (Emulator)**.
2. Masuk kembali ke **Sekretariat Utama** → **Biro SDM** → **Papan Informasi**.
3. Buka **Papan Informasi Terkini** (pengumuman baru muncul) dan klik **Mulai Quest** (quest baru dari Kabiro SDM langsung tersedia untuk diklaim).

### Babak 4: Sudut Pandang Pimpinan Eselon I (`Sestama (E1)`)
1. Klik **Sestama (E1)** di panel **Akun Demo (Emulator)** → klik **Kelola**.
2. Buka tab **Tim Saya**: tunjukkan Sestama melihat seluruh pegawai di Sekretariat Utama beserta 5 biro di bawahnya (12 pegawai pada data demo), dan bisa menyaring per biro lewat **Filter Unit**.

### Babak 5: Sudut Pandang Super Admin (`Super Admin`)
1. Klik **Super Admin** di panel **Akun Demo (Emulator)** → klik **Kelola**.
2. Tunjukkan kini tampil 5 tab lengkap, dan di **Tim Saya** kolom **Email** ikut muncul.
3. Buka tab **Akun**:
   - Tunjukkan pemberitahuan bahwa pegawai membuat akun login sendiri lewat **Buat Akun**, sementara Super Admin mengatur izin allowlist, unit, role, dan status aktif.
   - Tunjukkan bahwa saat mengedit akun sendiri, pilihan **Role** dan **Akun Aktif** dinonaktifkan demi keamanan.
   - Uji **Nonaktifkan** pada salah satu akun pegawai lain melalui dialog konfirmasi.
4. Buka tab **Struktur**:
   - Tunjukkan daftar lengkap 33 unit organisasi, formulir **+ Unit Baru**, dan tombol **Arsipkan** (unit tidak pernah dihapus permanen agar riwayat pegawai dan quest tetap aman).

---

## Langkah 4 — Selesai Demo & Bersihkan Proses

1. Tekan `Ctrl + C` di Terminal 2 (Vite) dan Terminal 1 (Firebase Emulators) untuk menghentikan keduanya.
2. Jika ingin mengulang demo dari kondisi awal, cukup ulangi `npm run demo:reset` di Terminal 2 saat emulator berjalan.
