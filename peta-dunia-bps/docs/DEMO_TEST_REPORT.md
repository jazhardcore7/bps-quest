# Laporan Uji Demo — branch `fix/pilot-blockers`

Tanggal uji: 2026-11-27. Branch: `fix/pilot-blockers` (HEAD `d1bbb02`, tiga commit di atas `main` `f0f8c73`). Proyek: `peta-dunia-bps/`.

Laporan ini menjalankan ulang seluruh skenario demo dari `ui/indie-revamp` (laporan lama: `DEMO_TEST_REPORT.md` di root branch itu) pada branch yang akan dipakai untuk pilot. Branch ini **tidak** memuat UI revamp, jadi skenario yang khusus revamp (overlay naik level, D-pad docked, font) dinilai sesuai UI di branch ini.

## Lingkungan dan keamanan uji

- Semua uji memakai **Firebase Emulator** (Auth 9099, Firestore 8080, project `demo-bps`). Data dan akun palsu. Data emulator hilang saat emulator berhenti (tanpa export).
- Seed memakai `node scripts/seed.js` dengan `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` dan `GCLOUD_PROJECT=demo-bps`. `.env` tidak dimuat dan tidak dibuka. `scripts/seed-cloud.js` tidak dijalankan.
- Browser: panel browser bawaan (Chromium). Dev server dijalankan dengan `node --env-file=<file demo di scratchpad> node_modules/vite/bin/vite.js`. File itu hanya berisi nilai demo (`VITE_FIREBASE_PROJECT_ID=demo-bps`, `VITE_USE_EMULATORS=true`, kunci palsu). Variabel proses mengalahkan `.env` di Vite, sehingga konfigurasi asli tidak dipakai. Konsol menampilkan `[Firebase] Connecting to local Emulators (Auth: 9099, Firestore: 8080)...` di setiap muat halaman.
- Permintaan jaringan yang masih tersimpan di tab tidak berisi satu pun `https://` (semua ke `localhost:5173` atau `127.0.0.1`). Tab hanya menyimpan permintaan terbaru, jadi bukti utama adalah konfigurasi di atas.
- Catatan: saat seed, `firebase-admin` mencoba mendeteksi kredensial lewat metadata server GCP dan gagal (`MetadataLookupWarning ... ETIMEDOUT, ENOTFOUND`). Ini bukan kontak ke project Firebase; semua data masuk ke emulator.
- Panel browser tersembunyi selama uji, sehingga animasi `requestAnimationFrame` di-throttle (sekitar 1 fps). Gerak avatar diuji secara deterministik (lihat OFF-01).

Alat:
- Skrip `demo-test/emulator-scenarios.mjs` (disalin dari `ui/indie-revamp`, lalu disesuaikan; lihat bagian 6). Hasil terakhir: `demo-test/results-emulator.json` (48 PASS, 1 FAIL).
- Browser untuk skenario UI, dengan event keyboard asli (Tab, Shift+Tab, Enter, E, Escape) dan klik asli untuk alur utama.

---

## 1. Ringkasan

| Status | Uji awal (sebelum perbaikan) | Setelah perbaikan |
|---|---|---|
| PASS | 109 | **119** |
| FAIL | 14 | **4** |
| MANUAL | 3 | 3 |
| BLOCKED | 0 | 0 |
| **Total** | **126** | **126** |

Rincian total: 9 preflight, 49 skenario skrip, 68 skenario browser.

**Kesiapan pilot 10 orang: SIAP DENGAN SYARAT, untuk laptop/desktop.**
1. Delapan bug baru ditemukan dan diperbaiki di branch ini (bagian 2), termasuk satu berisiko **Tinggi**: nama pengguna dirender tanpa escape (XSS) di leaderboard dan HUD.
2. **Syarat 1:** deploy `firestore.rules` dari branch ini (verifikasi email, `periodKey`, `displayName`), lalu jalankan langkah MANUAL di bagian 5.
3. **Syarat 2:** jangan pakai HP untuk pilot sampai UI revamp digabung. Di layar 390 px semua tombol 10–14 px, termasuk D-pad (RSP-04).
4. **Sisa Sedang:** jawaban kuis (`correctIndex`) masih terbaca klien (QX-01). Perlu keputusan (bagian 4).
5. Sisi lain (rules, klaim, XP, rollover, leaderboard, navigasi, kantor, panel, gating unit, kontras) lulus.

---

## 2. Bug ditemukan dan diperbaiki dalam uji ini

| # | Severity | Bug | Skenario | Perbaikan | File | Uji ulang |
|---|---|---|---|---|---|---|
| C1 | **Tinggi** | `displayName` dirender tanpa escape. Nama lama berisi HTML di data (`<img src=x onerror=...>`) dijalankan di leaderboard untuk setiap pembaca. Nama dengan tanda kutip (lolos rules karena tanpa `<` `>`) keluar dari atribut `title` di HUD dan membuat atribut `onmouseover`. | LBU-07, LBU-07b | Helper `escapeHtml` baru (sama dengan `ui/indie-revamp`) dipakai untuk nama dan label unit di baris leaderboard, baris pinned, dan HUD. | `src/ui/escape.js` (baru), `src/ui/hud.js`, `src/screens/leaderboard.js`, `tests/escape.test.js` (baru) | LBU-07: 0 `img` tersisip, `onerror` 0×, nama tampil sebagai teks. LBU-07b: tidak ada atribut `onmouseover`. `escape.test.js` 4/4 |
| C2 | Sedang | Login pertama setelah verifikasi: `loginWithEmail` dan listener auth sama-sama memanggil `ensureUserProfile`, keduanya membuat `users/{uid}`, dan tulis yang kalah ditolak rules (`permission-denied`). Jika yang kalah adalah listener, router mengira pengguna logout dan mengembalikan ke `#/login`; jika yang kalah adalah form, galat mentah bisa tampil. | AUTH-14, VER-UI-2 | Panggilan bersamaan untuk uid yang sama berbagi satu proses (`profileRuns`). | `src/firebase/auth.js` | AUTH-14 pada kode lama: `fulfilled, rejected; error: permission-denied`. Setelah perbaikan: `fulfilled, fulfilled`. Browser: 0 warning/galat saat login pertama |
| C3 | Sedang | Nama dan level di HUD terpotong menjadi "Bud…" dan "Lev…" di semua layar dan ukuran. Kartu HUD lebar tetap 230 px, sedangkan avatar dan dua tombol memakai ±190 px, sehingga kolom nama hanya 38 px. | HUD-01 | Lebar kartu mengikuti isi: `min-width: 230px; max-width: 340px`. | `src/styles/style.css` (`.hud-right-card`) | Nama "Penguji UI Dua" dan "Level 1 · Explorer" utuh. Nama 59 karakter: kartu 331 px, nama elipsis (lengkap di tooltip), tidak menimpa kartu kiri |
| C4 | Sedang | Fokus keyboard tidak terlihat pada pulau, gedung biro, tab/chip/Segarkan leaderboard, D-pad, dan tombol klaim (`outline: none` tanpa pengganti). WCAG 2.4.7. | A11Y-02 | Cincin fokus `:focus-visible`: gelap di laut/rumput, emas di kartu gelap, biru di panel putih. | `src/styles/style.css` (blok "Keyboard focus rings") | Screenshot: cincin gelap pada pulau dan gedung, emas pada tab Mingguan, biru pada "Kirim Jawaban" |
| C5 | Rendah | Baris pinned "Kamu" menampilkan "+0 XP" di tab Mingguan dan Bulanan walaupun pengguna punya XP periode itu. | LBU-08 | XP pinned dibaca dari profil sendiri; `weekKey`/`monthKey` lama dihitung 0, sama seperti query. | `src/screens/leaderboard.js` | Siti (15 XP, filter Biro SDM): +15 di tiga tab; dengan key lama: +0 |
| C6 | Rendah | Teks "atau" di halaman login kontras 2,88:1 (minimal 4,5:1). | A11Y-04 | Warna `#A0B2C6` (sama dengan subjudul login). | `src/styles/style.css` (`.login-divider span`) | 6,32:1 |
| C7 | Rendah (DEV) | Select dev bar kosong setelah login: value option "Biro SDM", state berisi `biro-sdm`. | PNL-04 | Value option `biro-sdm` dan `biro-umum`. | `src/ui/devbar.js` | Select menampilkan "Biro SDM" |
| C8 | Rendah (DEV) | Ganti unit di dev bar saat panel terbuka: tombol "Mulai Quest" tetap tampil walau `canStartQuest` sudah false. | PNL-03 | Panel memantau AppState selama terbuka dan menggambar ulang tampilan utama jika akses quest berubah. Di produksi unit tidak pernah berubah, jadi tidak ada render ulang. | `src/ui/panel.js` | Ke Biro Umum: tombol hilang, catatan tampil; kembali ke SDM: tombol kembali |

Perbaikan pada alat uji (bukan bug aplikasi): AUTH-02 di skrip menghitung semua email verifikasi untuk alamat itu, termasuk dari run sebelumnya (emulator menyimpan kode OOB walau akun dihapus). Run kedua di emulator yang sama gagal palsu (3 dan 4, bukan 1 dan 2). Skrip kini menghitung selisih selama run.

---

## 3. Hasil per skenario

### 3.0 Preflight

| ID | Langkah | Hasil | Status |
|---|---|---|---|
| PRE-01 | `node --version` | `v22.14.0` | PASS |
| PRE-02 | `java -version` | `17.0.12 LTS` | PASS |
| PRE-03 | `npm run build` | Sukses, 38 modul. JS 538 kB (gzip 132 kB), CSS 24 kB. Peringatan lama: chunk > 500 kB, `client.js` diimpor statis dan dinamis | PASS |
| PRE-04 | `npm run test:helpers` | 18/18 | PASS |
| PRE-05 | `node --test tests/leaderboard.test.js` | 5/5 | PASS |
| PRE-06 | `npm run emulators` | 9099 dan 8080 siap ±29 dtk. Peringatan "multiple instances" (sisa lock dari run sebelumnya; port sudah dicek kosong) | PASS |
| PRE-07 | Seed emulator (tanpa `.env`) | Sukses untuk `peta-dunia-bps` dan `demo-bps` di emulator. Lihat catatan `MetadataLookupWarning` | PASS |
| PRE-08 | `npm run test:rules` | 23/23 (sebelum dan sesudah perbaikan) | PASS |
| PRE-09 | `node --test tests/escape.test.js` | 4/4 (baru) | PASS |

### 3.1 Skrip emulator (`demo-test/emulator-scenarios.mjs`)

Hasil akhir 48 PASS, 1 FAIL. Hasil lengkap per skenario ada di `demo-test/results-emulator.json`.

| ID | Cek | Hasil akhir | Status |
|---|---|---|---|
| AUTH-01 | Daftar, verifikasi, login pertama (Biro SDM) | Profil biro-sdm/employee, xp 0 | PASS |
| AUTH-02 | Daftar tanpa verifikasi | 1 email verifikasi, tidak login; login ditolak dan tautan dikirim ulang (total 2); profil tidak ada; tulis langsung `permission-denied` | PASS |
| AUTH-03 | Email huruf campur dan spasi | Berhasil, email dinormalisasi | PASS |
| AUTH-04 | Kata sandi salah | "Email atau kata sandi salah." | PASS |
| AUTH-05 | Email di luar allowlist | Pesan allowlist, akun Auth dihapus | PASS |
| AUTH-06 / 06b | Admin belum/sudah terverifikasi menulis quest | Ditolak / diizinkan | PASS |
| AUTH-07 | Daftar Biro Umum | unit biro-umum | PASS |
| AUTH-08 | Profil sendiri dengan role admin, xp 5000, unit lain | Ketiganya ditolak | PASS |
| DN-01 (baru) | Nama allowlist `  <b>Nama</b>   Kotor  ` | Profil dibuat, nama `bNama/b Kotor` | PASS |
| DN-02 (baru) | Nama allowlist kosong | Profil dibuat, nama `tanpa.nama` | PASS |
| AUTH-14 (baru) | Dua `ensureUserProfile` bersamaan saat login pertama | Awal: **FAIL** (`fulfilled, rejected; permission-denied`). Akhir: `fulfilled, fulfilled` | PASS (setelah C2) |
| AUTH-13s (baru) | Login Google lewat kredensial uji emulator | Allowlist: profil "Penguji Google". Email luar: pesan allowlist, akun dihapus, tidak login | PASS |
| QX-00 | Baca quest unit | 3 quest | PASS |
| QX-01 | `quiz.correctIndex` tidak boleh terbaca | Terbaca: checkpoint-1 = 0, checkpoint-2 = 1 | **FAIL** (bagian 4) |
| QX-02 – QX-04 | Klaim harian, klaim kedua (klien dan batch langsung) | +20; ditolak; `permission-denied` | PASS |
| QX-05 | 3 `periodKey` palsu | Semua `permission-denied`, xp tetap 20 | PASS |
| QX-06 – QX-08 | Checkpoint sekali, kedua, `once-lagi` | +50; ditolak; `permission-denied` | PASS |
| QX-09 – QX-14 | Edit xp langsung, pakai ulang `lastCompletionId`, xp digelembungkan, xp completion palsu, ubah nama; ubah avatar | Lima ditolak; avatar diizinkan | PASS |
| QX-15 – QX-18 | Non-admin menulis quest/unit; baca allowlist; klaim unit lain; `unitId` palsu | Sesuai rules | PASS |
| QX-19 – QX-22 | Naik level 490→510, tepat 500, rollover minggu/bulan, increment periode sama | level 2; level 2; 20/20; 50/50 | PASS |
| QX-23 | Baca `users` tanpa login | `permission-denied` | PASS |
| LB-09a | Profil dengan nama HTML | `permission-denied` (aturan `displayName`) | PASS |
| LB-09c (baru) | Nama dengan tanda kutip, tanpa `<` `>` | Diizinkan sesuai aturan; aman karena dirender ter-escape (LBU-07b) | PASS |
| LB-01 – LB-03 | Urutan tiga tab | Terurut | PASS |
| LB-04 | Hendra (`weekKey` lama) | Tidak ada di Mingguan, ada di Sepanjang Waktu | PASS |
| LB-05 | Tie Citra vs Doni | Citra dulu | PASS |
| LB-06 | Filter Biro SDM | 14/16 user, semua biro-sdm | PASS |
| LB-07 | Cache 60 dtk dan forceReload | true/true/true | PASS |
| LB-08 | Dokumen per tab (seed) | 16 / 15 / 16 | PASS |
| LB-09b | Nama HTML tidak sampai ke data leaderboard | Tidak ada | PASS |
| LB-10 | +70 user dummy | 60 / 60 / 60 | PASS |

### 3.2 Navigasi dan autentikasi (browser)

| ID | Langkah | Hasil | Status |
|---|---|---|---|
| NAV-01 | Login | `#/world`, HUD nama pengguna | PASS |
| NAV-02 | Sekretariat Utama → Biro SDM | `#/island` → `#/office` | PASS |
| NAV-03 | Pulau terkunci | Toast "Pulau ini segera hadir", tetap `#/world` | PASS |
| NAV-04 | Gedung Biro Umum | Toast "Peta kantor belum tersedia di prototype" | PASS |
| NAV-05 | Tombol Papan Peringkat | `#/leaderboard` | PASS |
| NAV-06 | Keluar dari akun | `#/login` | PASS |
| NAV-07 | `#/office` tanpa login (muat penuh) | Dialihkan ke `#/login`, `currentUser` null | PASS |
| NAV-08 | `#/leaderboard` setelah logout | `#/login` | PASS |
| NAV-09 | Back dari office; Back setelah logout | `#/island`; tetap `#/login` | PASS |
| NAV-10 | Reload penuh di `#/leaderboard` | Tetap di leaderboard dan tetap login | PASS |
| AUTH-09 | UI: daftar email di luar allowlist | Kotak merah `role="alert"`: pesan allowlist | PASS |
| AUTH-10 | UI: kata sandi salah | Kotak merah: "Email atau kata sandi salah." | PASS |
| AUTH-11 | Sesi bertahan setelah reload | Lihat NAV-10 | PASS |
| AUTH-12 | Login admin | role admin, HUD "Administrator" | PASS |
| AUTH-13 | Popup "Masuk dengan Google" | Panel browser membuka popup di tab yang sama, sehingga emulator gagal mengirim hasil ("No matching frame"). Logika profil diuji di AUTH-13s | MANUAL |
| VER-UI-1 | UI: daftar email allowlist baru | Kotak info `role="status"` (biru, bukan merah), `currentUser` null, 1 email verifikasi | PASS |
| VER-UI-2 | Login sebelum verifikasi, verifikasi, login pertama | Sebelum: kotak merah "belum diverifikasi", email ke-2. Login pertama awal: masuk `#/world` tetapi `PERMISSION_DENIED` di konsol (C2). Akhir: 0 warning/galat | PASS (setelah C2) |

### 3.3 Kantor (office)

| ID | Langkah | Hasil | Status |
|---|---|---|---|
| OFF-01 | Event `keydown` asli + 60 frame × 1/60 dtk | `d`: tepat 220 px. `ArrowDown`: berhenti di R. Pembinaan (82,95 px). Tombol dilepas bersih | PASS |
| OFF-01b | Gerak real-time halus | Panel browser tersembunyi, rAF ±1 fps | MANUAL |
| OFF-02 | D-pad `pointerdown`/`pointerup`/`pointerleave` 4 arah | Semua aktif lalu lepas | PASS |
| OFF-03 | 60.000 langkah acak + dorong ke 13 ruangan dan papan dari setiap sisi bebas | 0 tabrakan, 0 keluar lantai, 143 sel, 17/17 dorongan ditahan | PASS |
| OFF-04 | Dinding luar 4 arah | atas y=92, bawah y=478, kiri x=92, kanan x=1263 | PASS |
| OFF-05 | E pada jarak 153, 81, 48 px | Hanya 48 px membuka panel | PASS |
| OFF-06 | Gelembung "Tekan E" | Dihitung lewat spy `drawInteractionBubble`: digambar di 48 px, tidak di 81 px dan jauh. Tampilan visual belum dilihat | PASS (logika) |
| OFF-07 | Klik papan di canvas | Panel terbuka | PASS |
| OFF-08 | Panel terbuka, tahan `d` 42 frame; Esc | Avatar diam (`isPaused`), jalan lagi setelah Esc. D-pad tetap tampil di bawah backdrop, tetapi tidak aktif saat jeda | PASS |
| OFF-09 | Keluar-masuk kantor 3× | `keydown` +3/−3, 1 canvas, 4 tombol D-pad, 1 callback rAF per frame, kecepatan 220 | PASS |
| OFF-10 | Panel terbuka, Back, Forward | Panel tertutup, tidak jeda, bergerak 110 px, E membuka lagi, Esc menutup | PASS |

### 3.4 Panel dan gating unit

| ID | Langkah | Hasil | Status |
|---|---|---|---|
| PNL-01 | Pegawai Biro SDM buka papan | Tombol "Mulai Quest" ada | PASS |
| PNL-02 | Pegawai Biro Umum buka papan | "Quest hanya tersedia untuk pegawai Biro SDM", tidak ada tombol di DOM | PASS |
| PNL-03 | Dev bar ganti unit saat panel terbuka (DEV) | Awal: tombol tetap tampil. Akhir: footer berganti dua arah | PASS (setelah C8) |
| PNL-04 | Dev bar setelah login (DEV) | Awal: select kosong. Akhir: "Biro SDM" | PASS (setelah C7) |
| PNL-05 | 4 baris Akses Informasi | 4 sub-view, isi masih placeholder "[Konten diisi pihak Biro SDM]" | PASS |
| PNL-06 | Escape | Panel tertutup, game lanjut | PASS |
| PNL-07 | Klik backdrop | Tertutup | PASS |
| PNL-08 | Tab 6×, Shift+Tab (tombol asli) | Fokus berputar: baris 1–4, Mulai Quest, kembali ke Tutup panel; Shift+Tab ke Mulai Quest | PASS |
| PNL-09 | Fokus setelah tutup | Kembali ke `body` (elemen sebelum E) | PASS |
| PNL-10 | Biro Umum, dev bar ke SDM, klaim | Ditolak rules; toast "Klaim ditolak. Quest ini mungkin sudah kamu selesaikan atau belum tersedia untuk unitmu."; tombol aktif lagi | PASS |

### 3.5 Quest di UI

| ID | Langkah | Hasil | Status |
|---|---|---|---|
| QUI-01 | Klik "Selesaikan (+20 XP)" | Toast "+20 XP", HUD 20/500, "✓ Selesai" | PASS |
| QUI-02 | Kuis salah ("Loyal") | "Jawaban belum tepat, silakan coba lagi!", XP tetap | PASS |
| QUI-03 | Kuis benar | Toast "+50 XP", HUD 70/500, kotak kuis hilang | PASS |
| QUI-04 | Buka ulang daftar quest | 2 selesai tanpa tombol, 1 kuis tersisa | PASS |
| QUI-05 | XP 490 (fixture emulator), kuis +30 | Toast "+30 XP" lalu "Selamat! Kamu naik ke Level 2! 🎉", HUD 520/1000, Level 2 | PASS |

### 3.6 Leaderboard di UI

| ID | Langkah | Hasil | Status |
|---|---|---|---|
| LBU-01 | 3 tab | Terurut; Hendra tidak ada di Mingguan | PASS |
| LBU-02 | Filter Biro SDM | Hanya Biro SDM | PASS |
| LBU-03 | Ganti tab dalam 60 dtk; Segarkan | 0 request Listen; 2 request setelah Segarkan | PASS |
| LBU-04 | Dokumen dimuat per tab | 15 / 14 / 15 (≤ 60) | PASS |
| LBU-05 | Pinned row Siti (Biro Umum) | "Biro Umum · Di luar daftar terlihat" | PASS |
| LBU-06 | Empty state | "Belum ada XP periode ini..." | PASS |
| LBU-07 | Nama lama berisi `<img onerror>` (disuntik ke emulator) | Awal: **1 `img` tersisip, `onerror` jalan**. Akhir: 0 `img`, tampil sebagai teks | PASS (setelah C1) |
| LBU-07b (baru) | Login sebagai pengguna bernama `Uji" onmouseover="alert(1)` | Awal: **atribut `onmouseover` dibuat** di HUD. Akhir: nama utuh di `title`, tanpa atribut tambahan | PASS (setelah C1) |
| LBU-08 | Pinned row dengan 15 XP minggu/bulan ini | Awal: Mingguan/Bulanan "+0 XP". Akhir: +15 di tiga tab | PASS (setelah C5) |
| HUD-01 (baru) | Nama dan level di HUD | Awal: "Bud…", "Lev…" di semua ukuran. Akhir: utuh | PASS (setelah C3) |

### 3.7 Responsif dan aksesibilitas

Diukur di world, island, office, dan leaderboard: scroll samping halaman, kontrol di luar layar, dan target sentuh < 24 px.

| ID | Langkah | Hasil | Status |
|---|---|---|---|
| RSP-01 | 1440×900 | 0 scroll samping, 0 di luar layar, 0 target < 24 px | PASS |
| RSP-02 | 1024×768 | Sama | PASS |
| RSP-03 | 768×1024 | Leaderboard: chip "Semua" 48×19, "Biro SDM" 58×19 (< 24 px). Lainnya lulus | **FAIL** (bagian 4) |
| RSP-04 | 390×844 (emulasi HP) | Stage diperkecil menjadi 390×228. Semua tombol 10–14 px, D-pad 14×14 px | **FAIL** (bagian 4) |
| A11Y-01 | Keyboard saja: Tab ke pulau, Enter, Tab ke gedung, Enter, E, Tab, Esc | Berhasil. Avatar ditaruh dekat papan lewat skrip karena gerak real-time di-throttle | PASS |
| A11Y-02 | Fokus terlihat | Awal: pulau, gedung, tab/chip leaderboard, D-pad, tombol klaim tanpa indikator. Akhir: cincin terlihat (screenshot) | PASS (setelah C4) |
| A11Y-03 | `prefers-reduced-motion` | Tidak bisa diemulasikan di alat ini | MANUAL |
| A11Y-04 | Kontras teks (44 sampel: office, panel, quest, leaderboard, world, login, kotak error dan info) | Awal: "atau" 2,88:1. Akhir: terendah 4,55:1 (deskripsi quest 11 px); kotak info baru 8,36:1 | PASS (setelah C6) |
| A11Y-05 | Zoom 200% (diemulasikan dengan viewport 720×450) | Tidak ada konten terpotong atau scroll, tetapi teks **tidak membesar**: stage menyesuaikan viewport (judul 14,2 px × 2 = 28,4 px, sama dengan 28,8 px di 100%) | **FAIL** (bagian 4) |

### 3.8 Build produksi

| ID | Cek | Hasil | Status |
|---|---|---|---|
| PROD-01 | Dev bar ("Simulasi pegawai", `dev-unit-select`) di `dist/` | 0 file | PASS |
| PROD-02 | Literal mirip rahasia di file tracked (`AIza…`, private key, `sk_live_`, `ghp_`, `xox`), `.env*` dikecualikan | Tidak ditemukan | PASS |
| PROD-03 | Ukuran bundle | JS 538 kB (gzip 132 kB), CSS 24 kB. Melewati peringatan 500 kB Vite | PASS (catatan) |
| PROD-04 | `window.openInfoPanel`, `window.closeInfoPanel`, `window.AppState` di `dist/` | 0 file | PASS |
| PROD-05 | `.env` tidak ter-track | Hanya `.env.example` yang tracked; `.env` ignored | PASS |
| PROD-07 | Referensi font di `dist/` | 0 (tidak ada request font 404) | PASS |

(PROD-06 di laporan lama memeriksa PRD UI revamp; tidak berlaku untuk branch ini.)

---

## 4. Belum diperbaiki (perlu keputusan)

| # | Severity | Temuan | Kenapa tidak diperbaiki di sini | Rekomendasi |
|---|---|---|---|---|
| O1 | Sedang | Jawaban kuis terbaca klien (QX-01) | Perlu ubah model data: koleksi jawaban terpisah, rules completion memeriksa jawaban, seed lokal dan cloud, klien. Data yang sudah ada di project juga harus dimigrasi | Putuskan: terima risiko untuk 10 orang tepercaya, atau pindahkan `correctIndex` ke `questAnswers/{id}` (`allow read: if false`) dan periksa `answerIndex` di rules |
| O2 | Sedang (jika HP dipakai) | Di HP (390 px) semua kontrol 10–14 px (RSP-04) | Sudah ditangani di `ui/indie-revamp` (D-pad docked, tombol 44 px, stage bisa dipan). Memindahkannya ke sini sama dengan memindahkan revamp | Pilot di laptop/desktop, atau gabungkan UI revamp dulu |
| O3 | Rendah | Chip filter leaderboard 19 px di 768 px (RSP-03) | Sama dengan O2 (ukuran target sadar skala ada di revamp) | Ikut UI revamp |
| O4 | Rendah | Zoom browser tidak memperbesar teks (A11Y-05) | Sifat desain stage yang menyesuaikan layar | Pertimbangkan saat desain berikutnya (misalnya batas skala maksimum) |
| O5 | Rendah | Chip panel "Level 2 · 350/600 XP" masih hardcode (`src/ui/panel.js:44`, `:541`) | Keputusan produk: apa arti "XP gedung" | Sembunyikan "350/600 XP" atau isi dari data |

Catatan perilaku (bukan bug): setelah klaim ditolak, override dev bar kembali ke unit asli karena Firestore menerapkan tulisan secara lokal dulu, lalu snapshot profil memanggil `setUserProfile` (DEV saja).

---

## 5. Langkah MANUAL untuk Anda

| Yang belum diuji | Alasan | Langkah |
|---|---|---|
| Popup login Google (AUTH-13) | Panel browser tidak mendukung popup | Jalankan `npm run emulators` dan `npm run dev` dengan `$env:VITE_USE_EMULATORS="true"`. Tambahkan email uji ke `allowedEmails` di Emulator UI (`http://127.0.0.1:4000/firestore`). Klik "Masuk dengan Google", pilih "Add new account", isi email itu, lalu "Sign in with Google.com". Pastikan masuk ke `#/world` dan HUD memakai nama dari allowlist. Ulangi dengan email di luar allowlist: harus muncul pesan allowlist |
| Gerak real-time (OFF-01b) dan gelembung "E" (visual OFF-06) | Panel browser tersembunyi | Di `#/office`, tahan D 2 detik: avatar bergerak mulus ±440 px. Jalan ke papan kuning: gelembung "E" muncul dalam ±80 px dan hilang saat menjauh |
| Reduced motion (A11Y-03) | Tidak bisa diemulasikan | Chrome DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce", lalu cek animasi pulau dan toast |
| HP nyata, Safari/Firefox | Hanya Chromium | `npm run dev -- --host` di jaringan yang sama. Diharapkan sama dengan RSP-04 (kontrol kecil) |
| Rules dan verifikasi email di project asli | Larangan kontak project remote | Setelah deploy rules, buat 1 akun uji di project, pastikan email verifikasi datang dan login pertama langsung masuk `#/world` |

---

## 6. File yang berubah (belum di-commit)

| File | Perubahan |
|---|---|
| `src/firebase/auth.js` | C2: `ensureUserProfile` berbagi satu proses per uid |
| `src/ui/escape.js` (baru) | C1: helper `escapeHtml` (isi sama dengan `ui/indie-revamp`) |
| `src/ui/hud.js` | C1: nama di HUD di-escape (teks dan `title`) |
| `src/screens/leaderboard.js` | C1: nama dan label unit di-escape; C5: XP pinned per periode |
| `src/ui/panel.js` | C8: footer mengikuti perubahan unit selama panel terbuka |
| `src/ui/devbar.js` | C7: value option memakai ID unit |
| `src/styles/style.css` | C3: lebar kartu HUD; C4: cincin fokus; C6: warna "atau" |
| `tests/escape.test.js` (baru) | 4 test `escapeHtml` |
| `demo-test/emulator-scenarios.mjs` (baru di branch ini) | Disalin dari `ui/indie-revamp`. Referensi baris rules diperbarui; LB-09a/b mengikuti aturan `displayName`; skenario baru DN-01, DN-02, AUTH-14, AUTH-13s, LB-09c; AUTH-02 menghitung email per run |
| `demo-test/results-emulator.json` (baru) | Hasil run terakhir (48 PASS, 1 FAIL) |
| `docs/DEMO_TEST_REPORT.md` (baru) | Laporan ini |

Saat `ui/indie-revamp` nanti digabung, `src/ui/escape.js` identik dengan versi revamp. Perkirakan konflik di `style.css`, `hud.js`, `leaderboard.js`, dan `panel.js` karena revamp menulis ulang file-file itu.

## 7. Cara menjalankan ulang

```powershell
cd D:\career\bps-quest\peta-dunia-bps
npm run emulators
```

Di terminal kedua:

```powershell
cd D:\career\bps-quest\peta-dunia-bps
npm run test:rules
node demo-test/emulator-scenarios.mjs
```

Skrip menghapus dan mengisi ulang hanya project emulator `demo-bps`, lalu menulis `demo-test/results-emulator.json`.
