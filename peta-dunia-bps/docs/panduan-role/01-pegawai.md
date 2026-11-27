# Panduan Role: Pegawai (`employee`)

- **Tujuan:** Menjelajahi peta organisasi BPS RI Pusat, membaca profil resmi tiap unit kerja, menyelesaikan *quest* di unit sendiri, dan memantau papan peringkat.
- **Akun Demo (Emulator Only):** `pegawai.sdm1@demo.bps.local` (Biro SDM), `pegawai.sdm2@demo.bps.local`, `pegawai.sdm3@demo.bps.local`, `pegawai.umum@demo.bps.local`, `pegawai.harga@demo.bps.local`.

## Langkah Tugas di Aplikasi

1. **Masuk ke Aplikasi (`#/login`):**
   - Masuk menggunakan email/kata sandi demo atau klik tombol **Pegawai SDM 1** pada panel **Akun Demo (Emulator)** di pojok kanan bawah.
   - Setelah masuk, Anda diarahkan ke **Peta Dunia BPS** (`#/world`). Perhatikan pada kartu HUD kanan atas tidak terdapat tombol **Kelola**.
2. **Menjelajahi Pulau & Profil Unit (`#/world` → `#/island/<id>`):**
   - Klik salah satu dari 8 pulau (misalnya **Sekretariat Utama** untuk membuka `#/island/sestama`).
   - Unit tempat Anda bertugas ditandai dengan label `· Biro Anda` dan bingkai emas.
   - Klik unit mana pun selain Biro SDM (misalnya **Biro Umum & Humas**) untuk membuka panel informasi unit secara langsung.
   - Klik baris **Profil & Tugas Fungsi**, **Struktur Organisasi**, **Fasilitas & Layanan**, atau **Papan Informasi Terkini** untuk membaca detailnya, lalu klik **&larr; Kembali** atau tombol tutup (`×`).
   - Untuk unit lain, bagian bawah panel hanya menampilkan catatan abu-abu (`Quest hanya tersedia untuk pegawai ...`) tanpa tombol **Mulai Quest**.
3. **Masuk ke Denah Kantor Biro SDM & Klaim Quest (`#/office`):**
   - Pada pulau **Sekretariat Utama**, klik ubin **Biro SDM** untuk membuka denah lantai `#/office`.
   - Gerakkan avatar dengan tombol `WASD` / panah (atau D-Pad) menuju **Papan Informasi** kuning lalu tekan `E`, atau klik langsung papan kuning tersebut.
   - Klik tombol **Mulai Quest**.
   - Untuk tipe Harian (`daily`), klik **Selesaikan (+20 XP)**.
   - Untuk tipe Checkpoint (`checkpoint`), pilih salah satu opsi jawaban kuis lalu klik **Kirim Jawaban**.
4. **Melihat Papan Peringkat (`#/leaderboard`):**
   - Klik ikon piala (**Papan Peringkat**) di HUD kanan atas untuk melihat peringkat **Minggu Ini**, **Bulan Ini**, dan **Semua Waktu**, serta filter unit.

## Batasan & Galat Umum

- **Tidak dapat mengakses `#/manage`:** Jika membuka `#/manage` langsung di URL, sistem otomatis mengalihkan ke `#/world`.
- **Klaim unit lain ditolak:** Tombol **Mulai Quest** hanya muncul pada unit asal Anda; di aturan Firestore, klaim untuk unit lain ditolak dengan `permission-denied`.
- **Klaim ganda pada hari yang sama:** *Quest* harian hanya dapat diklaim 1 kali per hari (zona waktu Jakarta). Jika mencoba mengklaim ulang, muncul pesan penolakan klaim.
- **Jawaban kuis salah:** Muncul pesan `"Jawaban belum tepat, silakan coba lagi!"`.
- **Akun dinonaktifkan:** Jika `active` diset `false` oleh Super Admin, saat masuk akan keluar otomatis dengan pesan `"Akun dinonaktifkan. Hubungi super admin."`.
