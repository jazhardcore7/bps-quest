# Laporan Uji Coba Demo (*Dry Run*) — Peta Dunia BPS

- **Tanggal Uji Coba:** 27 November 2026
- **Lingkungan:** Firebase Auth Emulator (`127.0.0.1:9099`) & Firestore Emulator (`127.0.0.1:8080`), proyek `demo-bps`, data dari `npm run demo:reset`
- **Metode:** Eksekusi skrip otomatis berbasis layanan klien aplikasi ([auth.js](file:///d:/career/bps-quest/peta-dunia-bps/src/firebase/auth.js), [units.js](file:///d:/career/bps-quest/peta-dunia-bps/src/firebase/units.js), [quests.js](file:///d:/career/bps-quest/peta-dunia-bps/src/firebase/quests.js), [manage.js](file:///d:/career/bps-quest/peta-dunia-bps/src/firebase/manage.js), [leaderboard.js](file:///d:/career/bps-quest/peta-dunia-bps/src/firebase/leaderboard.js)) terhadap emulator aktif, ditambah pemeriksaan `demo:check` dan `demo-build.test.js`. Langkah interaksi visual browser dicatat sebagai **MANUAL** karena Chrome DevTools MCP tidak terhubung (`DevToolsActivePort` tidak tersedia).

## Ringkasan Waktu & Hasil

- **Total waktu eksekusi jalur data skenario (5 langkah otomatis):** **1.611 ms (1,61 detik)**
- **Estimasi durasi penyampaian demo langsung oleh presenter:** **10–12 menit** (sesuai pembagian waktu di [SKENARIO_DEMO.md](file:///d:/career/bps-quest/peta-dunia-bps/docs/SKENARIO_DEMO.md))
- **Ringkasan Status:** **7 PASS**, **0 FAIL**, **4 MANUAL** (khusus interaksi visual/klik browser)

## Rincian Hasil per Langkah

| Langkah | Tipe | Status | Durasi | Bukti / Catatan |
| :--- | :--- | :---: | :---: | :--- |
| Prasyarat: `npm run demo:reset` & `npm run demo:check` | Otomatis | **PASS** | ~4 dtk | Berhasil mengisi & memverifikasi 33 unit, 67 quest, 36 pengguna, 36 allowlist, 11 akun Auth terverifikasi, 0 teks `[` / `]` / `TODO` |
| Build produksi bebas pengalih demo (`npm run build` + `demo-build.test.js`) | Otomatis | **PASS** | 2,78 dtk | 0 file di `dist/` mengandung `demo-login` atau `@demo.bps.local` |
| Langkah 1 (Data): `pegawai.sdm1` muat 7 tile `sestama`, lihat 3 quest Biro SDM, klaim harian +20 XP, muat leaderboard | Otomatis | **PASS** | 921 ms | `canStartQuest('biro-sdm') === true`, `canStartQuest('biro-umum') === false`, klaim +20 XP sukses, 36 peserta leaderboard termuat |
| Langkah 2 (Data): `kabiro.sdm` buat quest baru, lihat Tim Saya Biro SDM, perbarui konten & pengumuman unit | Otomatis | **PASS** | 157 ms | Quest `EtsnYIV22JLJ8FqdmtUA` tersimpan, Tim Saya berisi 4 anggota `biro-sdm`, pengumuman `ann-dryrun` tersimpan |
| Langkah 3 (Data): `pegawai.sdm2` melihat quest baru dari Kabiro SDM | Otomatis | **PASS** | 50 ms | Quest baru muncul di `fetchUnitQuests('biro-sdm')` (total 4 quest aktif) |
| Langkah 4 (Data): `sestama` & `deputi.sosial` melihat subtree Tim Saya | Otomatis | **PASS** | 94 ms | `sestama` memuat 12 pegawai (termasuk `biro-sdm` & `biro-umum`, tanpa `dir-harga`); `deputi.sosial` memuat 4 pegawai |
| Langkah 5 (Data): `superadmin` ubah role & nonaktifkan `pegawai.umum`, buat & arsipkan unit baru | Otomatis | **PASS** | 389 ms | Role diperbarui ke `head_e2`, akun dinonaktifkan, login ulang ditolak dengan `"Akun dinonaktifkan. Hubungi super admin."`; unit `dir-demo-uji` dibuat & diarsipkan |
| UI-1: Klik 8 pulau di `#/world`, tampilkan `#/island/<id>`, klik canvas Papan Informasi `#/office`, buka panel unit lain | Browser | **MANUAL** | — | Jalankan `npm run dev` dengan `VITE_USE_EMULATORS=true`, buka `http://localhost:5173`, verifikasi semua 8 pulau terbuka dan modal panel tidak menampilkan chip XP lama |
| UI-2: Pengalih **Akun Demo (Emulator)** di pojok kanan bawah | Browser | **MANUAL** | — | Verifikasi klik tombol akun di `#emu-switcher-panel` berpindah akun dan mengarah ke `#/world` |
| UI-3: Pegawai tidak melihat tombol **Kelola** & `#/manage` redirect ke `#/world` | Browser | **MANUAL** | — | Masuk sebagai **Pegawai SDM 1**, pastikan tombol `#hud-manage-btn` tidak ada dan akses langsung `#/manage` kembali ke `#/world` |
| UI-4: Interaksi tab `#/manage` (`Quest`, `Tim Saya`, `Konten Unit`, `Akun`, `Struktur`) & dialog konfirmasi | Browser | **MANUAL** | — | Masuk sebagai **Kabiro SDM (E2)** (3 tab) dan **Super Admin** (5 tab), uji form, counter karakter, dan modal konfirmasi |

## Temuan & Bug (*Severity* dan Repro)

1. **Rendah — `devbar.js` hanya menampilkan 2 opsi unit simulasi (`Biro SDM` dan `Biro Umum`):**
   - *Repro:* Buka aplikasi mode dev; bilah atas `#dev-bar` hanya memiliki pilihan `biro-sdm` dan `biro-umum`. Tidak memengaruhi demo berbasis akun di `#emu-switcher-panel` selama tidak mengubah dropdown devbar.
2. **Rendah — Peringatan ukuran chunk Vite > 500 kB saat `npm run build`:**
   - *Repro:* Jalankan `npm run build`; `dist/assets/index-*.js` berukuran `626,11 kB` karena SDK Firebase + data bundled dalam satu chunk (plus peringatan `client.js` diimpor statis & dinamis oleh `leaderboard.js`). Tidak memengaruhi fungsionalitas.
3. **Informasi — `MetadataLookupWarning` dari `firebase-admin` di Windows lokal:**
   - *Repro:* Jalankan `npm run demo:reset` di PC lokal tanpa GCE metadata server; muncul peringatan `MetadataLookupWarning` non-fatal sebelum skrip berjalan normal dan keluar dengan kode `0`.
4. **Cakupan Uji UI — Browser otomatis tidak dapat dijalankan:**
   - *Repro:* Chrome remote debugging (`DevToolsActivePort`) tidak aktif sehingga verifikasi klik UI browser harus dijalankan secara manual sebelum presentasi.

## Top 5 Hal yang Perlu Dipoles Sebelum Presentasi

1. **Lakukan gladi resik visual manual di Chrome (`http://localhost:5173`):** Jalankan langkah `UI-1` sampai `UI-4` minimal sekali sebelum presentasi untuk memastikan tata letak 7 tile di pulau `sestama` dan tabel `#/manage` tampil rapi pada layar proyektor.
2. **Perluas opsi unit pada `src/ui/devbar.js` (atau sembunyikan saat demo presentasi):** Agar saat demo publik tidak membingungkan audiens karena bilah dev hanya menampilkan 2 biro.
3. **Pertahankan jumlah baris ringkas di tab `Konten Unit` & `Quest`:** Pada layar 960×560 ter-skala, pastikan teks deskripsi quest yang diisi saat live demo singkat (1–2 kalimat) agar tidak perlu banyak gulir (*scroll*).
4. **Tambahkan penanda visual halaman aktif di `#/manage` & tombol kembali ke pulau saat ini di `#/office`:** Saat ini `#/office` kembali ke `#/island/sestama` (sudah tepat karena Biro SDM ada di Sestama), namun jika kelak ada denah kantor unit lain, perlu parameter unit/pulau.
5. **Pecah bundel (*code-splitting*) Firebase/layar `#/manage` pada tahap UI revamp:** Mengurangi ukuran bundel awal dari ~626 kB agar waktu muat awal lebih cepat pada jaringan lambat.
