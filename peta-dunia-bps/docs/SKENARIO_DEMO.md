# Skenario Demo Peta Dunia BPS (Durasi 10–12 Menit)

## Daftar Periksa Pra-Demo (*Pre-Demo Checklist*)

1. **Prasyarat Terpasang:** Pastikan `java -version` (untuk Firebase Emulator) dan `node -v` (Node 22+) tersedia di terminal.
2. **Port Bebas:** Pastikan port `9099` (Auth Emulator), `8080` (Firestore Emulator), `4000` (Emulator UI), dan `5173` (Vite Dev Server) tidak sedang dipakai proses lain.
3. **Terminal 1 — Jalankan Emulator:**
   ```powershell
   cd D:\career\bps-quest\peta-dunia-bps
   npm run emulators
   ```
   Tunggu hingga muncul keterangan seluruh emulator siap (`All emulators ready!`).
4. **Terminal 2 — Reset & Verifikasi Data Demo:**
   ```powershell
   cd D:\career\bps-quest\peta-dunia-bps
   $env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
   $env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
   npm run demo:reset
   npm run demo:check
   ```
   Pastikan `demo:check` lolos dengan `33 units, 67 quests, 36 users, 36 allowlist entries, 11 Auth accounts, 0 placeholder hits`.
5. **Terminal 2 — Jalankan Aplikasi Dev (Mode Emulator):**
   ```powershell
   $env:VITE_USE_EMULATORS="true"
   npm run dev
   ```
   Buka `http://localhost:5173` di browser dan pastikan panel **Akun Demo (Emulator)** tampil di pojok kanan bawah.

---

## Alur Presentasi & Poin Bicara (*Talking Points*)

### 1. Pengalaman Pegawai (`pegawai.sdm1@demo.bps.local`) — ±3 menit
- **Aksi:** Klik **Pegawai SDM 1** di panel **Akun Demo (Emulator)**.
- **Poin bicara:** *"Saat masuk sebagai pegawai, tampilan utama adalah Peta Dunia BPS dengan 8 pulau yang mencerminkan struktur resmi BPS RI Pusat sesuai Perpres 1/2025 dan Peraturan BPS 2/2025. Di HUD kanan atas tidak ada tombol Kelola karena pegawai tidak memiliki hak pengelolaan."*
- **Aksi:** Klik pulau **Sekretariat Utama** (`#/island/sestama`), tunjukkan jumlah unit (`7 unit`), marker `· Biro Anda` pada **Biro SDM**, lalu klik unit lain (misalnya **Biro Umum & Humas**) untuk membuka panel info.
- **Poin bicara:** *"Di unit lain, pegawai tetap bisa membaca Profil & Tugas Fungsi, Struktur Organisasi, Layanan, dan Papan Informasi Terkini, tetapi tidak ada tombol Mulai Quest — diganti catatan bahwa quest hanya untuk pegawai unit tersebut."*
- **Aksi:** Tutup panel, klik **Biro SDM** (`#/office`), gerakkan avatar (`WASD`/panah) atau klik papan kuning **Papan Informasi**, klik **Mulai Quest**, lalu klaim quest harian **Baca papan informasi** (`Selesaikan (+20 XP)`).
- **Poin bicara:** *"Setiap klaim diverifikasi atomik oleh Firestore Rules: periodKey harian mengikuti tanggal server zona Asia/Jakarta sehingga tidak bisa dimanipulasi atau diklaim dua kali di hari yang sama."*
- **Aksi:** Klik ikon piala (**Papan Peringkat**) di HUD kanan atas, tunjukkan tab **Minggu Ini**, **Bulan Ini**, dan **Semua Waktu**.

### 2. Pengalaman Pimpinan Eselon II (`kabiro.sdm@demo.bps.local`) — ±3 menit
- **Aksi:** Klik **Kabiro SDM (E2)** di panel **Akun Demo (Emulator)**, lalu klik tombol **Kelola** di HUD kanan atas (`#/manage`).
- **Poin bicara:** *"Untuk Pimpinan Eselon II, tombol Kelola muncul otomatis dan membuka 3 tab: Quest, Tim Saya, dan Konten Unit. Tab Akun dan Struktur tidak tampil karena khusus Super Admin."*
- **Aksi (Tab `Quest`):** Tunjukkan dropdown **Unit Kerja** hanya berisi `Biro Sumber Daya Manusia` (tidak bisa memilih unit lain), lalu buat quest harian baru (misalnya `"Kuis Demo Kabiro SDM"`, XP `30`) dan klik **Simpan Quest**.
- **Poin bicara:** *"Batas XP pimpinan dibatasi maksimal 100 XP, dan pimpinan hanya bisa menonaktifkan quest, bukan menghapus permanen, agar riwayat klaim pegawai tetap utuh."*
- **Aksi (Tab `Tim Saya` & `Konten Unit`):** Buka **Tim Saya** (tunjukkan hanya 4 pegawai Biro SDM tanpa kolom Email), lalu buka **Konten Unit**, tambahkan satu pengumuman singkat, dan klik **Simpan Konten Unit**.

### 3. Verifikasi Langsung oleh Pegawai (`pegawai.sdm2@demo.bps.local`) — ±1 menit
- **Aksi:** Klik **Pegawai SDM 2**, masuk ke `Sekretariat Utama` → `Biro SDM` → **Papan Informasi** → **Mulai Quest** untuk menunjukkan quest baru dari Kabiro SDM dan pengumuman baru langsung muncul.

### 4. Perspektif Pimpinan Eselon I (`sestama@demo.bps.local` atau `deputi.sosial@demo.bps.local`) — ±1,5 menit
- **Aksi:** Klik **Sestama (E1)** → **Kelola** → tab **Tim Saya**.
- **Poin bicara:** *"Sekretaris Utama melihat seluruh pegawai di bawah Sekretariat Utama beserta 5 biro turunannya (12 pegawai pada data demo), menggunakan kueri `unitPath array-contains` dengan indeks komposit Firestore. Deputi Bidang Statistik Sosial melihat 3 direktorat di bawahnya."*

### 5. Pengelolaan Menyeluruh Super Admin (`superadmin@demo.bps.local`) — ±2 menit
- **Aksi:** Klik **Super Admin** → **Kelola**. Tunjukkan 5 tab lengkap (**Quest**, **Tim Saya**, **Konten Unit**, **Akun**, **Struktur**).
- **Aksi (Tab `Akun`):** Tunjukkan daftar allowlist & status profil serta catatan bahwa pegawai mendaftar sendiri lewat **Buat Akun**. Ubah role salah satu akun atau demonstrasikan **Nonaktifkan** pada akun lain (dan tegaskan tombol nonaktifkan tidak tersedia untuk akun sendiri).
- **Aksi (Tab `Struktur`):** Tunjukkan daftar 33 unit resmi, formulir **+ Unit Baru** (`ancestorIds` otomatis), dan tombol **Arsipkan** (bukan hapus permanen).

### 6. Penutup — ±30 detik
- Rangkum: struktur terverifikasi Perpres 1/2025 & Peraturan BPS 2/2025, keamanan berbasis `firestore.rules`, dan kesiapan berlanjut ke tahap pemolesan UI.

---

## Rencana Cadangan Jika Emulator Bermasalah (*Fallback Plan*)

Jika pada saat demo port `9099`/`8080` gagal dijalankan atau Java bermasalah:
1. **Jalankan mode fallback statis (`npm run dev` tanpa emulator):** Aplikasi tetap memuat ke-33 unit dan profil resmi BPS RI Pusat dari [bps-structure.json](file:///d:/career/bps-quest/peta-dunia-bps/src/data/bps-structure.json) melalui mekanisme cadangan `loadUnits()`, atau tunjukkan hasil tangkapan/laporan [DEMO_DRYRUN_REPORT.md](file:///d:/career/bps-quest/peta-dunia-bps/docs/DEMO_DRYRUN_REPORT.md).
2. **Tunjukkan hasil uji otomatis:** Jalankan `npm run test:structure`, `npm run test:helpers`, `node --test tests/manage-helpers.test.js`, dan `node --test tests/demo-build.test.js` (yang tidak membutuhkan emulator berjalan) untuk membuktikan validasi skema, batas XP, dan cakupan peran.

---

## Antisipasi Pertanyaan

1. **Mengapa role ditegakkan di `firestore.rules`, bukan hanya di UI?**
   Menyembunyikan tombol **Kelola** atau mengalihkan rute `#/manage` di JavaScript hanya untuk kenyamanan pengguna. Penyerang bisa langsung memanggil API Firestore dari konsol browser. Oleh karena itu, seluruh pengecekan cakupan (`inScope`), batas XP (`100` vs `500`), keaktifan akun (`active`), dan kunci field wajib ditegakkan di server melalui [firestore.rules](file:///d:/career/bps-quest/peta-dunia-bps/firestore.rules).
2. **Di mana seluruh data aplikasi disimpan?**
   Di Cloud Firestore pada 5 koleksi utama: `units` (struktur & konten unit), `quests` (daftar misi), `users` (profil, role, `unitPath`, XP), `completions` (bukti klaim periodik anti-duplikat), dan `allowedEmails` (daftar izin registrasi). Identitas login dikelola oleh Firebase Authentication.
3. **Bagaimana batasan kuota pada paket gratis Firebase (Spark Plan)?**
   Paket gratis Spark menyediakan sekitar 50.000 pembacaan, 20.000 penulisan, dan 20.000 penghapusan dokumen per hari serta tanpa akses Cloud Functions eksternal/Admin SDK berbayar. Untuk menghemat kuota baca, data `units` di-cache 5 menit di memori (`loadUnits()`), `leaderboard` di-cache per tab, dan daftar **Tim Saya** dibatasi maksimal 200 baris.
4. **Mengapa pengelolaan akun memakai mekanisme `allowedEmails` + profil `users`?**
   Membuat atau menghapus akun Firebase Authentication milik orang lain dari aplikasi klien memerlukan Firebase Admin SDK di sisi server (Cloud Functions), yang membutuhkan paket berbayar Blaze. Dengan pola `allowedEmails`, Super Admin mengatur daftar email yang diizinkan, unit, role, dan status `active`, lalu pegawai membuat kata sandi sendiri melalui layar **Buat Akun** (dengan verifikasi email) atau masuk dengan Google.
5. **Apa keterbatasan yang saat ini diketahui?**
   - Dokumen koleksi `users` (termasuk field `email`) dapat dibaca oleh seluruh pengguna yang sudah masuk karena dibutuhkan untuk papan peringkat; di antarmuka **Tim Saya**, kolom email hanya ditampilkan ke Super Admin.
   - Kunci jawaban kuis (`quiz.correctIndex`) terbaca oleh klien karena evaluasi kuis berlangsung di browser tanpa Cloud Functions; keamanan tetap dijaga pada batas XP, kesesuaian unit, `periodKey` server Jakarta, dan pencegahan klaim ganda.
   - Pembuatan/penghapusan akun Firebase Authentication belum dapat dilakukan otomatis dari sisi klien tanpa Cloud Functions.
6. **Bagaimana peta jalan pengembangan selanjutnya (*Roadmap*)?**
   - **Perombakan UI (*UI Revamp*):** Pembaruan visual antarmuka peta pulau, kartu unit, dan pusat pengelolaan pada branch terpisah setelah fondasi data dan peran stabil.
   - **Responsivitas Mobile:** Penyesuaian tata letak layar `#/manage`, panel info, dan kontrol sentuh D-pad untuk layar ponsel/tablet.
   - **Cloud Functions (jika anggaran Blaze tersedia):** Memindahkan validasi jawaban kuis ke server, pembuatan akun otomatis, dan pembatasan pembacaan kolom sensitif `users`.
