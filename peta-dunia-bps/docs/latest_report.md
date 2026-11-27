# Latest Implementation Report — Peta Dunia BPS (Parts 1–4)

Laporan ini merangkum seluruh pekerjaan yang telah dibangun dan diverifikasi pada branch `feat/roles-demo` di workspace `peta-dunia-bps/`.

---

## Ringkasan Pencapaian per Bagian

### Part 1 — Dataset Resmi Struktur & Profil Unit BPS RI Pusat
- **Sumber Hukum Terverifikasi:** Menelusuri dan memverifikasi naskah resmi **Peraturan Presiden Nomor 1 Tahun 2025**, **Peraturan BPS Nomor 2 Tahun 2025**, **Peraturan BPS Nomor 5 Tahun 2026**, **Portal PPID BPS**, dan **Portal Resmi Pusdiklat BPS**.
- **Dataset:** Membangun [bps-structure.json](file:///d:/career/bps-quest/peta-dunia-bps/src/data/bps-structure.json) berisi **33 unit terverifikasi** (`bps-pusat`, `sestama` + 5 biro, `pusdiklat`, 5 deputi teknis + 15 direktorat, `itama` + 3 inspektorat + `Bagian Umum`) lengkap dengan `parentId`, `ancestorIds`, `island`, `headTitle`, `echelon`, `summary`, `tugas`, `services`, dan `sources`.
- **Dokumentasi & Uji:** Menulis [SUMBER_KONTEN.md](file:///d:/career/bps-quest/peta-dunia-bps/docs/SUMBER_KONTEN.md) (mencatat seluruh sumber, selisih dengan konsep mockup lama, konfirmasi Pusdiklat, dan URL 404) serta [structure.test.js](file:///d:/career/bps-quest/peta-dunia-bps/tests/structure.test.js) (`npm run test:structure`: **7/7 lulus**).

### Part 2 — Fondasi Role, Hierarki, Keamanan Firestore & Seed Emulator
- **Model Role & Konstanta ([config.js](file:///d:/career/bps-quest/peta-dunia-bps/src/config.js)):** Mendefinisikan `employee`, `head_e2`, `head_e1`, `head_top`, `super_admin` (plus dukungan alias warisan `admin`), label UI berbahasa Indonesia, fungsi `isHeadRole` / `isSuperAdminRole` / `getRoleLabel`, serta batas XP (`QUEST_XP_MAX_HEAD = 100`, `QUEST_XP_MAX_ADMIN = 500`).
- **Otentikasi & State ([auth.js](file:///d:/career/bps-quest/peta-dunia-bps/src/firebase/auth.js), [state/index.js](file:///d:/career/bps-quest/peta-dunia-bps/src/state/index.js)):** Penyediaan profil menyalin `jabatan`, `active`, dan menghitung `unitPath` dari unit/struktur; akun dengan `active: false` otomatis dikeluarkan dengan pesan `"Akun dinonaktifkan. Hubungi super admin."`; `AppState.canManageUnit(unitId)` menjadi satu sumber kebenaran hak pengelolaan di UI.
- **Aturan Keamanan ([firestore.rules](file:///d:/career/bps-quest/peta-dunia-bps/firestore.rules)):**
  - `quests`: cakupan hierarki (`inScope`), `createdBy`/`createdAt` immutable, batas XP `100` (pimpinan) vs `500` (super admin), validasi kuis `checkpoint` dan pelarangan `quiz` pada `daily`, *hard delete* hanya oleh `super_admin`.
  - `units`: konten dapat diubah pimpinan dalam cakupan; perubahan struktur & arsip (`archived: true`) hanya oleh `super_admin`; *hard delete* unit dilarang total.
  - `users` & `completions`: akun nonaktif (`active == false`) diblokir dari klaim/ubah profil; `super_admin` dapat memperbarui akun lain tanpa boleh mengubah `role` atau `active` dirinya sendiri; validasi `unitPath`.
  - `allowedEmails`: akses baca/tulis/daftar penuh untuk `super_admin` dengan validasi kecocokan ID email huruf kecil.
- **Seed & Uji:** Memperbarui [seed.js](file:///d:/career/bps-quest/peta-dunia-bps/scripts/seed.js), menambah matriks uji di [rules.test.js](file:///d:/career/bps-quest/peta-dunia-bps/tests/rules.test.js) dan [config.test.js](file:///d:/career/bps-quest/peta-dunia-bps/tests/config.test.js), serta menulis [ROLES_DESIGN.md](file:///d:/career/bps-quest/peta-dunia-bps/docs/ROLES_DESIGN.md).

### Part 3 — Pulau Berbasis Data, Panel Informasi Unit & Pusat Pengelolaan (`#/manage`)
- **Lapisan Data & Cache ([units.js](file:///d:/career/bps-quest/peta-dunia-bps/src/firebase/units.js), [data/index.js](file:///d:/career/bps-quest/peta-dunia-bps/src/data/index.js)):** `loadUnits()` memuat koleksi `units` dari Firestore dengan cache memori 5 menit, `refreshUnits()` setelah perubahan, dan fallback otomatis ke `bps-structure.json`. Daftar `biros` hardcoded dihapus.
- **Peta Dunia & Pulau Dinamis ([world.js](file:///d:/career/bps-quest/peta-dunia-bps/src/screens/world.js), [island.js](file:///d:/career/bps-quest/peta-dunia-bps/src/screens/island.js), [office.js](file:///d:/career/bps-quest/peta-dunia-bps/src/screens/office.js), [router.js](file:///d:/career/bps-quest/peta-dunia-bps/src/router.js)):** Seluruh 8 pulau terbuka menuju `#/island/<islandId>` (`#/island` menjadi alias `#/island/sestama`). Layar pulau menampilkan root unit terlebih dahulu diikuti unit anak non-arsip secara fleksibel, marker `· Biro Anda`, klik `biro-sdm` menuju `#/office`, dan unit lain langsung membuka panel info.
- **Panel Info Berbasis ID Unit ([panel.js](file:///d:/career/bps-quest/peta-dunia-bps/src/ui/panel.js)):** Menghapus chip `"Level 2 · 350/600 XP"` dan semua teks placeholder `"[...]"`, menampilkan data nyata untuk **Profil & Tugas Fungsi**, **Struktur Organisasi**, **Fasilitas & Layanan**, dan **Papan Informasi Terkini**, sambil menjaga aturan `canStartQuest(unitId)` dan aksesibilitas modal.
- **Pusat Pengelolaan `#/manage` ([hud.js](file:///d:/career/bps-quest/peta-dunia-bps/src/ui/hud.js), [manage.js](file:///d:/career/bps-quest/peta-dunia-bps/src/firebase/manage.js), [screens/manage/*](file:///d:/career/bps-quest/peta-dunia-bps/src/screens/manage/index.js)):** Tombol **Kelola** pada HUD dan route guard `#/manage`, dilengkapi 5 tab sesuai peran: **Quest**, **Tim Saya** (dengan indeks komposit baru di [firestore.indexes.json](file:///d:/career/bps-quest/peta-dunia-bps/firestore.indexes.json) dan penyembunyian email bagi non-super-admin), **Konten Unit**, **Akun**, dan **Struktur**.

### Part 4 — Kesiapan Demo, Pengalih Akun Emulator, Panduan & Dry Run
- **Demo Seed ([demo-seed.js](file:///d:/career/bps-quest/peta-dunia-bps/scripts/demo-seed.js)):** Mengisi emulator `demo-bps` (Auth + Firestore) dengan 11 akun peran utama, 25 pegawai fiktif, 33 unit beserta pengumuman demo, dan 67 quest berbasis fakta `bps-structure.json`, lengkap dengan `npm run demo:reset` dan `npm run demo:check`.
- **Quick Account Switcher ([demo-login.js](file:///d:/career/bps-quest/peta-dunia-bps/src/ui/demo-login.js), [main.js](file:///d:/career/bps-quest/peta-dunia-bps/src/main.js)):** Panel **Akun Demo (Emulator)** hanya dimuat ketika `import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true'`, dan dipastikan absen dari bundel produksi `dist/` melalui [demo-build.test.js](file:///d:/career/bps-quest/peta-dunia-bps/tests/demo-build.test.js).
- **Dokumentasi Lengkap (`docs/`):** Matriks hak akses & 5 panduan per role (`docs/panduan-role/00..05`), [AKUN_DEMO.md](file:///d:/career/bps-quest/peta-dunia-bps/docs/AKUN_DEMO.md), [SKENARIO_DEMO.md](file:///d:/career/bps-quest/peta-dunia-bps/docs/SKENARIO_DEMO.md), [DEMO_DRYRUN_REPORT.md](file:///d:/career/bps-quest/peta-dunia-bps/docs/DEMO_DRYRUN_REPORT.md), [demo_tutorial.md](file:///d:/career/bps-quest/peta-dunia-bps/docs/demo_tutorial.md), dan laporan ini.

---

## Ringkasan Verifikasi

- `npm run build`: lulus (`dist/` bersih dari `demo-login` dan `@demo.bps.local`)
- `npm run test:structure`: **7/7** lulus
- `npm run test:helpers`: **23/23** lulus
- `node --test tests/leaderboard.test.js`: **5/5** lulus
- `node --test tests/manage-helpers.test.js`: **13/13** lulus
- `node --test tests/demo-build.test.js`: **1/1** lulus
- `npm run test:rules` (terhadap Firebase Emulators): **29/29** lulus
- `npm run demo:reset` & `npm run demo:check`: lulus (**33 unit, 67 quest, 36 pengguna, 11 akun Auth, 0 placeholder**)
- Dry run skenario demo emulator: **5/5 jalur data PASS (1.611 ms)**; **4 langkah visual browser ditandai MANUAL** karena Chrome DevTools MCP tidak aktif.
