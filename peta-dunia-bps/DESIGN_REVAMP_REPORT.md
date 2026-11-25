# Laporan Revamp UI: "Cozy Archipelago"

Branch `ui/indie-revamp` · 2026-11-25 · Acuan: `docs/PRD_UI_REVAMP.md`

## 1. Ringkasan

Seluruh tampilan Peta Dunia BPS kini bergaya gim eksplorasi indie yang hangat. Elemennya bergaya stiker dengan garis tinta 3px dan bayangan keras, di atas laut cerah, pasir, dan aksen emas untuk hadiah. Revamp ini hanya menyentuh tampilan. Logika XP, quest, klaim, autentikasi, route guard, `AppState`, data, dan aturan Firestore tidak berubah. Tidak ada dependensi baru.

Fase yang sudah di-commit:

| Fase | Commit | Isi |
| --- | --- | --- |
| 0 | `ab112fc` | Design system dari skill ui-ux-pro-max, direkonsiliasi di `DECISIONS.md` |
| 1 | `a780ff6` | `tokens.css`, font face, ikon SVG, komponen dasar, toast 3 detik |
| 2 | `9ed705b` | Peta dunia dan pulau (SVG prosedural, lapisan laut ambient), skala minimum + geser di ponsel |
| 3 | `8bab366` | Kanvas kantor (lapisan statis ter-cache, avatar prosedural, gelembung tombol E, cahaya papan) |
| 4 | `b03f65b` | HUD, panel info, lembar quest, momen naik level, D-pad menempel di layar ponsel |
| 5 | `cf72419` | Papan peringkat (podium), layar masuk bergaya title screen, ukuran target sentuh |
| 6 | (commit ini) | QA, pembersihan CSS mati, target sentuh yang mengikuti skala, laporan ini |

## 2. Apa yang berubah (file)

- **Token dan dasar:** `src/styles/tokens.css` (sumber tunggal warna, tipografi, spasi, bentuk, bayangan, gerak, lapisan), `fonts.css`, `components.css`, dan `style.css` (kini hanya reset, dev bar, dan stage).
- **Layar:** `world.css`, `office.css`, `hud.css`, `panel.css`, `levelup.css`, `leaderboard.css`, `login.css`.
- **Gambar prosedural:** `src/ui/island-art.js` (pulau, bangunan biro, laut) dan `src/ui/office-art.js` (denah kantor di Canvas).
- **Modul UI baru:** `icons.js`, `toast.js`, `levelup.js`, `escape.js`.
- **Layar yang diubah (hanya markup dan presentasi):** `world.js`, `island.js`, `office.js`, `leaderboard.js`, `login.js`, `ui/hud.js`, `ui/panel.js`.
- **Stage:** `src/stage.js`, dipindahkan dari `main.js`, yang tetap mengekspor `updateStageScale`.
- **Alat khusus pengembangan** (tidak ikut build produksi): `dev/component-sheet.html`, `dev/screen-preview.html`, `dev/qa-audit.js`, `dev/qa-states.js`, `dev/qa-reduced-motion.js`, `dev/qa-matrix.md`.

## 3. Keputusan desain utama

Detail lengkap ada di `design-system/peta-dunia-bps/DECISIONS.md`.

- **Palet sesuai PRD:** tinta navy `#0F2A4A`, kertas `#FFF8E7`, laut, pasir, rumput, emas `#FFC93C`, dan koral. Semua pasangan teks diukur minimal 4,5:1.
- **Warna pil unit:** dua pil dipergelap agar teks putih lolos. Sestama menjadi `#18735D` dan Produksi `#9A520A`. File `src/data/index.js` tidak diubah.
- **Font:** Pixelify Sans 600 untuk judul, badge, dan angka; Nunito 400/700/800 untuk teks lain, total empat bobot. File woff2 menyusul dari pemilik; sampai saat itu dipakai font cadangan.
- **Ikon:** geometri Lucide, digambar ulang sebagai SVG inline. Phosphor Bold tidak bisa disalin akurat tanpa paketnya, dan paket baru dilarang.
- **Toast:** tampil 3 detik (keputusan pemilik). Pengumuman pembaca layar lewat satu region `role="status"` yang menetap.
- **Momen naik level:** dipicu kenaikan level di `AppState`, bukan hasil klaim. Toast emoji lama dihapus.
- **Ponsel (lebar di bawah 768px):** stage ditahan pada skala 0,7 dan bisa digeser. D-pad kantor dan layar masuk dipindah keluar stage dalam ukuran asli agar tetap terjangkau dan terbaca.
- **Target sentuh mengikuti skala (Fase 6):** kontrol di dalam stage berukuran `max(44px, 44px ÷ skala)`, sehingga di layar selalu minimal 44px di skala mana pun.
- **Pengecualian warna hex mentah:**
  - `tokens.css`
  - `src/data/index.js` (data unit)
  - literal `FLOOR`/`ROOMS`/`BOARD` di `office.js`, yang dilindungi PRD 9.4 dan nilai warnanya kini tidak dipakai
  - logo "G" Google di tombol "Masuk dengan Google" (aset merek penyedia login)

## 4. Verifikasi

### 4.1 Perintah

| Perintah | Hasil |
| --- | --- |
| `npm run build` | Lulus. JS 140,7 KB gzip, sekitar 8 KB lebih besar dari sebelum revamp (anggaran 60 KB). Peringatan chunk di atas 500 KB sudah ada sebelumnya (Firebase). |
| `npm run test:helpers` | 14/14 lulus |
| `node --test tests/leaderboard.test.js` | 5/5 lulus |
| `git diff --stat main -- src/firebase firestore.rules firestore.indexes.json scripts tests .env* firebase.json .firebaserc src/data src/state src/router.js` | Kosong (tidak ada perubahan) |
| `git diff main -- package.json package-lock.json` | Kosong (tidak ada dependensi baru) |

### 4.2 Matriks QA otomatis

Audit dijalankan dengan `dev/qa-audit.js` (cara mengulang ada di `dev/qa-matrix.md`) pada 1440×900, 1024×768, 768×1024, dan 390×844. Layar yang diaudit: login, dunia, pulau, kantor, panel info, lembar quest, dan papan peringkat.

| Pemeriksaan | Hasil akhir |
| --- | --- |
| Scroll halaman ke samping | Tidak ada di semua viewport |
| Kontrol di bawah 44px di layar (tautan teks di bawah 24px) | 0 setelah perbaikan |
| Kontrol tanpa indikator fokus yang terlihat | 0 |
| Teks di bawah 4,5:1 (teks besar di bawah 3:1) | 0 setelah perbaikan |
| Zoom 200% (viewport 720×450) | Login menempel di layar dan bisa di-scroll; panel tetap di dalam stage dan isinya bisa di-scroll; tidak ada scroll ke samping |
| Reduced motion | Mesin uji memang memakai `prefers-reduced-motion: reduce`. Dengan pengaturan nyata itu, 0 animasi CSS berjalan di dunia, login, kantor, dan overlay naik level. |

Masalah yang ditemukan dan diperbaiki saat QA:
- Stempel "Selesai" berkontras 4,32:1 di kartu quest selesai; latar kini kertas, menjadi 4,84:1.
- Kontrol hanya 35px di layar pada lebar 768px; diperbaiki dengan target sentuh yang mengikuti skala.
- Input login 35px dan tautan "Buat akun" 19px pada lebar 768px; diperbaiki dengan aturan yang sama.

### 4.3 Kriteria penerimaan (PRD §14)

| # | Kriteria | Status | Bukti |
| --- | --- | --- | --- |
| 1 | Build dan dua rangkaian tes lulus | Lulus | §4.1 |
| 2 | Tidak ada perubahan di path terlarang | Lulus | `git diff --stat` kosong |
| 3 | `tokens.css` ada, komponen memakai token, hex mentah hanya pengecualian tercatat | Lulus | §3, `DECISIONS.md` |
| 4 | "Mulai Quest" muncul untuk unit yang sama; unit lain tanpa tombol di DOM | Lulus | Diuji di Fase 4 (Biro SDM vs Biro Umum: `#btn-open-quests` tidak ada, 0 tombol di footer). Cabang `canStartQuest` tidak berubah. |
| 5 | Kantor: gerak, tabrakan, tombol E, dan cleanup sama seperti sebelumnya | Lulus | Fungsi fisika dan loop identik dengan `main`. Kecepatan 220/s; laju rAF sama setelah keluar-masuk 3 kali dan 0 saat unmount; D-pad tidak menumpuk. |
| 6 | Kontras, fokus, jalur keyboard, reduced motion, zoom 200% | Lulus, dengan catatan | §4.2. Jalur keyboard per layar diuji: Tab di dunia dan pulau; tombol E di kantor membuka panel dengan fokus di tombol Tutup (avatar diletakkan di dekat papan lewat handle dev, bukan berjalan ke sana); focus trap dan Escape di panel; panah di opsi kuis; Tab lalu Enter mengganti tab periode ke "Mingguan" di papan peringkat. Teks di dalam Canvas tidak diaudit otomatis. |
| 7 | Empat viewport tanpa clipping atau scroll samping; peta dunia bisa dipakai dengan sentuhan di 390×844 | Lulus | §4.2; pulau sekitar 140px di layar dan stage bisa digeser |
| 8 | `displayName` di-escape di semua HTML | Lulus | HUD dan papan peringkat lewat `escapeHtml` (diuji dengan payload `<img onerror>`); kantor memakai `fillText` di Canvas |
| 9 | Checklist pra-rilis skill dijalankan | Lulus | §5 |

## 5. Checklist pra-rilis skill ui-ux-pro-max

| Item | Hasil |
| --- | --- |
| Tidak ada emoji sebagai ikon | Lulus. Pemindaian `src` menemukan 0 emoji. Medali, piala, dan 🎉 diganti SVG. |
| Satu keluarga ikon yang konsisten | Lulus. Semua ikon Lucide via `icon()`, stroke 2,5, ukuran dari token. |
| `cursor: pointer` hanya pada elemen yang bisa diklik | Lulus. Semuanya `<button>`/`<label>`; overlay naik level juga bisa diklik untuk ditutup. |
| Transisi hover dan press 150–300ms | Sesuai PRD: 120–250ms (PRD menang); semua ditulis sebagai token. |
| Kontras teks 4,5:1 (mode terang) | Lulus (§4.2) |
| Fokus terlihat untuk keyboard | Lulus. Cincin dua warna (emas di dalam, tinta di luar) di semua kontrol. |
| `prefers-reduced-motion` dihormati | Lulus (diuji dengan pengaturan nyata) |
| Responsif 375/768/1024/1440 | Lulus (390×844 sesuai PRD; kantor juga dicek di 375×812) |
| Konten tidak tertutup elemen fixed | Lulus, dengan catatan: dev bar hanya ada di DEV; pada skala minimum HUD kantor menindih tepi atas kanvas sekitar 3px |
| Tidak ada scroll horizontal di ponsel | Lulus (scroll halaman). Stage memang sengaja bisa digeser di dalam viewport. |
| Pressed state tidak menggeser layout | Lulus. Hanya memakai `transform`. |
| Dialog modal: fokus masuk, trap, Escape, kembali ke pemicu | Lulus (perilaku lama tetap) |
| Arti tidak hanya lewat warna | Lulus. Terkunci memakai ikon dan teks; selesai memakai stempel dan teks; benar/salah memakai ikon dan teks; tab memakai bobot dan garis bawah; chip memakai ikon centang; peringkat memakai angka. |
| Mode gelap | Di luar cakupan (PRD §3) |

## 6. Lokasi screenshot

Semua ada di `design-system/peta-dunia-bps/screenshots/`:

- `phase2/`: `world-1440x900.jpg`, `world-768x1024.jpg`, `world-390x844.jpg`, `island-1024x768.jpg`, `island-ribbon-biro-umum.png`, `island-tooltip-focus.png`
- `phase3/`: `office-1440x900.jpg`, `office-board-near.png`, `office-375x812.jpg`
- `phase4/`: `hud-1440.png`, `panel-same-unit.jpg`, `panel-other-unit-footer.png`, `quest-sheet.jpg`, `quiz-wrong-answer.jpg`, `level-up.jpg`, `office-390-docked-dpad.jpg`
- `phase5/`: `login-1440x900.jpg`, `login-1024x768.jpg`, `login-390x844-docked.jpg`, `leaderboard-1440x900.jpg`, `leaderboard-empty.png`, `leaderboard-390x844.jpg`
- `phase6/`: `login-zoom-200.jpg`, `panel-zoom-200.jpg`, `leaderboard-768x1024.jpg`

Catatan: screenshot dari fase 2 dan 3 diambil sebelum HUD baru (fase 4), jadi HUD lama masih terlihat di sana.

## 7. Masalah visual yang diketahui dan batas verifikasi

1. **Font belum terpasang.** Semua screenshot memakai font cadangan (Trebuchet MS / Segoe UI). Setelah file woff2 ditaruh di `public/fonts/` (nama file ada di README di folder itu), tambahkan link preload di `index.html` lalu cek ulang lebar judul, label ruangan Canvas, dan label papan.
2. **Versi beranimasi belum dilihat langsung.** Mesin uji memakai reduced motion, jadi ombak, kapal, awan, bob pulau, burst naik level, langkah avatar, dan denyut papan hanya diverifikasi lewat kode. Mohon dicek manual dengan reduced motion dimatikan.
3. **Alur nyata yang butuh login belum dijalankan.** Klaim quest sungguhan, naik level dari snapshot Firestore, dan sorotan baris "Kamu" dengan pengguna yang benar-benar masuk diuji dengan data contoh di `dev/screen-preview.html`, bukan dengan akun.
4. **D-pad di desktop** menutupi pojok kanan bawah denah (bawah Ruang Kepala Biro SDM). Tidak menghalangi interaksi, tetapi menutupi sebagian ilustrasi.
5. **HUD ikut tergeser di ponsel.** Hanya D-pad dan layar masuk yang menempel di layar; HUD tetap di dalam stage.
6. **Overlay naik level** berupa `div` yang bisa diklik, bukan `<button>`. Pengguna keyboard menutupnya dengan Escape, atau overlay hilang sendiri setelah 4 detik.
7. **Teks di Canvas** (label ruangan, papan nama) tidak terjangkau audit otomatis. Desainnya tinta di atas pelat kertas (13,7:1).

## 8. Ide berikutnya

- **Audio:** efek pendek untuk klaim XP, naik level, dan tombol E, dengan sakelar bisu yang tersimpan dan mati secara default di kantor.
- **Kustomisasi avatar:** warna baju, rambut, dan aksesori. Data warnanya bisa masuk `avatarId`, dan Canvas sudah menggambar avatar secara prosedural.
- **Mode gelap:** cukup menambah set nilai token di `tokens.css` (`prefers-color-scheme`); komponen sudah sepenuhnya memakai token. Kontras perlu diukur ulang.
- **HUD menempel di ponsel:** gunakan pola docking yang sama dengan D-pad.
- **Pulau lain:** saat unit lain dibuka, cukup ubah `locked` di data; ilustrasi pulau langsung berwarna penuh.
