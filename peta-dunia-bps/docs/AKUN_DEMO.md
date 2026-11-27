# Daftar Akun Demo (Emulator Lokal)

> **PERINGATAN PENTING:** Seluruh akun di bawah ini **HANYA ADA DI FIREBASE EMULATOR LOKAL** (`demo-bps`, domain fiktif `@demo.bps.local`) dan **TIDAK BOLEH PERNAH DIBUAT ATAU DIGUNAKAN DI PROYEK FIREBASE PRODUKSI**.

Semua akun utama memakai kata sandi emulator bersama yang didefinisikan di [demo-seed.js](file:///d:/career/bps-quest/peta-dunia-bps/scripts/demo-seed.js) (`DemoPassword123!`) dan dapat langsung dipilih lewat panel mengambang **Akun Demo (Emulator)** saat menjalankan aplikasi secara lokal dengan `VITE_USE_EMULATORS=true`.

## Akun Utama per Role

| Email Demo | Role | Label UI | Unit Kerja | Keterangan Demo |
| :--- | :--- | :--- | :--- | :--- |
| `superadmin@demo.bps.local` | `super_admin` | Super Admin | `bps-pusat` | Akses penuh 5 tab `#/manage`, XP maks 500, hapus quest |
| `kepala@demo.bps.local` | `head_top` | Pimpinan Tertinggi | `bps-pusat` | Kelola seluruh unit di bawah `bps-pusat` (XP maks 100) |
| `sestama@demo.bps.local` | `head_e1` | Pimpinan Eselon I | `sestama` | Kelola `sestama` + 5 biro turunannya |
| `deputi.sosial@demo.bps.local` | `head_e1` | Pimpinan Eselon I | `deputi-sosial` | Kelola `deputi-sosial` + 3 direktorat turunannya |
| `kabiro.sdm@demo.bps.local` | `head_e2` | Pimpinan Eselon II | `biro-sdm` | Kelola `biro-sdm` saja (quest, tim, konten) |
| `direktur.harga@demo.bps.local` | `head_e2` | Pimpinan Eselon II | `dir-harga` | Kelola `dir-harga` saja (contoh unit lintas deputi) |
| `pegawai.sdm1@demo.bps.local` | `employee` | Pegawai | `biro-sdm` | Pegawai Biro SDM (180 XP, Level 1) |
| `pegawai.sdm2@demo.bps.local` | `employee` | Pegawai | `biro-sdm` | Pegawai Biro SDM (420 XP, Level 1) |
| `pegawai.sdm3@demo.bps.local` | `employee` | Pegawai | `biro-sdm` | Pegawai Biro SDM (610 XP, Level 2) |
| `pegawai.umum@demo.bps.local` | `employee` | Pegawai | `biro-umum` | Pegawai Biro Umum (240 XP, Level 1) |
| `pegawai.harga@demo.bps.local` | `employee` | Pegawai | `dir-harga` | Pegawai Dit. Statistik Harga (310 XP, Level 1) |

## Pegawai Fiktif Tambahan

Selain 11 akun utama di atas, `scripts/demo-seed.js` mengisi **25 profil pegawai fiktif** (`pegawai.demo01@demo.bps.local` s.d. `pegawai.demo25@demo.bps.local`) yang tersebar di berbagai biro, direktorat, pusdiklat, dan inspektorat dengan variasi XP, `xpWeek`, `xpMonth`, dan Level 1–2 agar tampilan **Papan Peringkat** dan **Tim Saya** langsung hidup saat demo.
