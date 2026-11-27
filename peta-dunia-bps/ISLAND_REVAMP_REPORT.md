# Laporan Revamp Pulau (gaya layar Kantor)

Branch `ui/island-revamp` (dari `feat/roles-demo` @ `6438718`) · 2026-11-27

## 1. Ringkasan

Peta Dunia (`#/world`), layar Pulau (`#/island/<id>`), dan HUD bersama kini memakai bahasa visual layar Kantor: isian pastel datar, garis tinta 3px, bayangan keras, kisi jendela warna lantai, dan perlakuan emas Papan Informasi untuk "unit Anda". Revamp ini hanya menyentuh lapisan tampilan. Rute, klik, `canStartQuest`, `canManageUnit`, visibilitas tombol "Kelola", pemuatan unit, dan pemakaian `escapeHtml` tetap sama. Tidak ada dependensi baru, gambar raster, atau permintaan jaringan baru.

| Commit | Isi |
| --- | --- |
| `4b5ae95` | docs: island style reference and design decisions (Fase 0) |
| `f2e5597` | feat(ui): island art and world map restyle (Fase 1–2) |
| `f2122d2` | feat(ui): island screen and HUD restyle (Fase 3) |
| `02c8d8a` | test: island art and contrast |
| `8343a02` | fix(ui): wrap long tile labels and keep the world HUD clear of islands (ditemukan saat screenshot AFTER) |
| (commit ini) | docs: laporan ini |

## 2. Apa yang berubah

- **`src/ui/island-art.js` (baru):**
  - `renderIslandSVG(islandId, opts)` menghasilkan SVG inline yang deterministik. Lapisannya: air dangkal, buih, tepi pasir bergaris tinta, rumput bergaris tinta, pohon, dan satu bangunan bergaya Kantor.
  - Setiap pulau punya siluet dan motif sendiri: menara berbendera, aula berbintang, blok server berantena, rumah komunitas berikon orang, pabrik bercerobong, gudang dengan peti, gedung dengan diagram lingkaran, dan gedung berperisai.
  - Juga berisi `renderBigIslandSVG`, `renderWorldAmbient` (tepat 6 elemen beranimasi), `pillFill`, `islandBadge`, dan `islandOfUser`.
- **`src/screens/world.js`:**
  - Pulau tetap `<button>` di persegi panjang dari `src/data/index.js`.
  - Badge jumlah unit ("5 biro", "3 direktorat"), pin emas "Unit Anda", dan `aria-label` seperti "Sekretariat Utama, 5 biro, Unit Anda".
  - Laut dengan tekstur ombak statis, rute putus-putus, dan kompas.
- **`src/screens/island.js`:**
  - Pulau besar bergaya sama.
  - Tile digambar seperti ruangan Kantor dengan atap warna unit dan pelat nama tinta.
  - Unit sendiri berwarna emas Papan Informasi, ditambah teks "· Biro Anda" yang sudah ada. Nama lengkap ada di `title`.
  - Warna inline diganti class/token. Logika teks "Biro Anda" dan klik tidak berubah.
- **`src/ui/hud.js`:** kartu pemain berisi nama di baris 1, "Level N" ditambah chip peran di baris 2, dan bar XP bersegmen dengan label "x / y XP". Semua class, id, `aria-label`, dan `role="progressbar"` tetap ada.
- **CSS baru:** `src/styles/island-tokens.css`, `island-world.css`, `island-screen.css`, dan `island-hud.css`, dimuat lewat `@import` di `style.css`, karena `main.js` di luar cakupan. Aturan lama untuk peta, pulau, dan HUD dihapus dari `style.css`.
- **Tes baru:** `tests/island-art.test.js` dan `tests/contrast.test.js`.
- **Dokumen:** `docs/ISLAND_STYLE_REFERENCE.md` dan `design-system/peta-dunia-bps/` (MASTER.md, pages/world.md, pages/island.md, DECISIONS.md).

## 3. Screenshot (before/after)

Semua di `docs/screenshots/island-revamp/`. Ini tangkapan JPEG yang diskalakan dari panel browser (misalnya 724×453 untuk viewport 1440×900), bukan PNG ukuran penuh.

| Viewport | Peta Dunia | Pulau Sestama |
| --- | --- | --- |
| BEFORE 1440×900 | `before-world-1440x900.jpg` | `before-island-sestama-1440x900.jpg` |
| BEFORE Kantor 1440×900 | `before-office-1440x900.jpg` | — |
| AFTER 1440×900 | `after-world-1440x900.jpg` | `after-island-sestama-1440x900.jpg` |
| AFTER 1024×768 | `after-world-1024x768.jpg` | `after-island-sestama-1024x768.jpg` |
| AFTER 768×1024 | `after-world-768x1024.jpg` | `after-island-sestama-768x1024.jpg` |
| AFTER 390×844 | `after-world-390x844.jpg` | `after-island-sestama-390x844.jpg` |

Semua dijalankan di emulator lokal (`demo-bps`, data dari `npm run demo:reset`), masuk sebagai akun demo "Kabiro SDM". Pengaturan Firebase dipaksa ke emulator lewat variabel lingkungan proses; `.env` tidak dibuka.

## 4. Verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run build` | Lulus |
| `npm run test:helpers` | 23/23 lulus |
| `npm run test:structure` | 7/7 lulus |
| `node --test tests/leaderboard.test.js` | 5/5 lulus |
| `node --test tests/island-art.test.js` (baru) | 13/13 lulus |
| `node --test tests/contrast.test.js` (baru) | 16/16 lulus |
| Path terlarang (`src/firebase/`, rules, indexes, `scripts/`, `demo-test/`, `src/state/`, `src/data/`, `.env*`, `package.json`, `office.js`) | Tidak ada perubahan (`git diff --stat 6438718` kosong) |
| Preserved hooks (grep ulang) | Semua 57 hook ada |
| Hex mentah di file komponen baru/berubah | Tidak ada |
| Teks terpotong / scroll halaman ke samping (1440×900, 1024×768, 768×1024) | Tidak ada |
| Jalur keyboard | Tab dari pulau ke pulau (cincin fokus emas/tinta), Enter membuka pulau; di layar pulau: Kembali → Kelola → Piala → Keluar → tile, semua dengan cincin fokus |
| Perilaku klik | Pulau → `#/island/<id>`; tile Biro SDM → `#/office`; tile lain membuka panel info |
| JS tambahan | Sekitar 7 KB gzip di level sumber (`island-art.js` 6,4 KB, ditambah selisih kecil di `world.js`, `island.js`, `hud.js`); anggaran 25 KB |

## 5. Checklist pra-rilis skill ui-ux-pro-max

| Item | Hasil |
| --- | --- |
| Tidak ada emoji sebagai ikon | Lulus. Semua ikon dan motif adalah SVG inline. |
| `cursor: pointer` hanya pada elemen yang bisa diklik | Lulus. Pulau, tile, dan tombol HUD, semuanya `<button>`. |
| Transisi hover 150–300ms | Hover 200ms; feedback tekan 120ms (lebih cepat dengan sengaja untuk rasa "taktil", tercatat di token) |
| Kontras teks 4,5:1 | Lulus (tes `contrast.test.js`, §6) |
| Fokus terlihat untuk keyboard | Lulus. Cincin dua warna (emas 3px di dalam, tinta 3px di luar). |
| `prefers-reduced-motion` | Lulus. Semua animasi ambien dan gerak hover dimatikan. Browser uji memang memakai reduced motion, sehingga semua screenshot menunjukkan keadaan statis. |
| Responsif 375/768/1024/1440 | 1440, 1024, dan 768 bersih; 390×844 diukur (§7), tidak diperbaiki sesuai cakupan |
| Arti tidak hanya lewat warna (simbologi peta) | Lulus. Tiap pulau punya siluet dan motif berbeda serta pil teks; "Unit Anda" dan "· Biro Anda" berupa teks. |
| Gerak berlebihan | 6 elemen beranimasi (keputusan pemilik), loop 6–20 detik, hanya `transform`/`opacity`, tanpa `filter` CSS |

## 6. Tabel kontras

| Pasangan | Rasio | Status |
| --- | --- | --- |
| Putih di pil `pimpinan` `#0F3D6E` | 10,98 | Lulus |
| Putih di pil `sestama` `#1F8A70` → kini `#18735D` | 4,26 → **5,75** | Diperbaiki |
| Putih di pil `mis` `#1C4FA0` | 7,85 | Lulus |
| Putih di pil `sosial` `#5B3FB0` | 7,55 | Lulus |
| Putih di pil `produksi` `#C06A10` → kini `#9A520A` | 3,95 → **5,86** | Diperbaiki |
| Putih di pil `distribusi-jasa` `#A82A40` | 6,84 | Lulus |
| Putih di pil `neraca` `#1F7A80` | 5,06 | Lulus |
| Putih di pil `itama` `#5A6678` | 5,82 | Lulus |
| Tinta `#10263F` di pelat `#E8EEF6` (badge, pelat tile, chip peran) | ≥ 13 | Lulus |
| Tinta di emas `#FFD24A` ("Unit Anda", tile sendiri) | 10,63 | Lulus |
| Putih / `#CFE6FA` di kartu HUD `#0F3D6E` | 10,98 / 8,55 | Lulus |
| Tepi tombol HUD `#CFE6FA` vs kartu (batas UI) | 8,55 | Lulus (≥ 3) |
| Cincin fokus emas vs laut bawah `#1A78BD` | 3,26 | Lulus (≥ 3) |

Perbaikan warna pil ada di token CSS (`--pill-fix-sestama`, `--pill-fix-produksi`); `src/data/index.js` tidak diubah. Tes memastikan token perbaikan hanya dipakai jika warna data memang gagal.

## 7. Ukuran kontrol di 390×844 (diukur, tidak diperbaiki)

Stage 960×560 diskalakan ke **0,406** di lebar 390px.

| Kontrol | Sisi terkecil di layar |
| --- | --- |
| Tombol HUD (Kembali, Kelola, Piala, Keluar) | **17,9px** (di bawah 24px WCAG dan 44px platform) |
| Tombol pulau di peta | 44,7px |
| Tile unit di layar pulau | 47,5px |

Teks juga sangat kecil pada skala ini. Sesuai instruksi, masalah ukuran layar kecil tidak diperbaiki dalam tugas ini.

## 8. Masalah yang diketahui

1. **Layar kecil (390×844):** tombol HUD hanya 17,9px dan teks sulit dibaca (lihat §7).
2. **Badge berasal dari data unit di memori** (`getCachedUnits()`: cache Firestore atau struktur bawaan aplikasi). `units.js` di luar cakupan dan tidak memberi tahu apakah data Firestore sudah dimuat, sehingga badge hanya disembunyikan jika jumlahnya 0. Jika unit diarsipkan di Firestore, badge baru akurat setelah data dimuat (misalnya setelah membuka layar pulau).
3. **Angka badge berbeda dengan subjudul layar pulau.** Badge menghitung jenis anak unit terbanyak ("5 biro"); subjudul menghitung semua tile ("7 unit", termasuk Sekretariat Utama dan Pusdiklat).
4. **Kartu pemain di Peta Dunia** memakai dua baris (info, lalu tombol) agar tidak menutupi pulau Pimpinan; layar lain tetap satu baris. Nama di atas 260px (peta) atau 280px (layar lain) diberi elipsis, dengan nilai lengkap di `title`.
5. **Versi beranimasi belum dilihat langsung,** karena browser uji memakai reduced motion. Gerak awan, perahu, dan kilau air hanya diverifikasi lewat kode dan jumlah elemen (tes).
6. **Bayangan Kantor sebenarnya lembut (blur),** sedangkan pulau memakai bayangan keras sesuai definisi tugas (keputusan D-02).
7. **Folder `design-system/peta-dunia-bps/`** juga ada di branch `ui/indie-revamp`, sehingga penggabungan kedua branch akan konflik di folder itu.
8. **Ikon lama di `hud.js`** (avatar, piala, logout) masih memakai hex mentah; ikon tersebut tidak diubah dalam tugas ini.

## 9. Tiga ide berikutnya

1. **Skala minimum untuk layar kecil:** tahan stage di sekitar 0,7 dan izinkan geser, atau tempelkan HUD ke viewport, agar tombol HUD minimal 44px di ponsel.
2. **Badge yang tahu status pemuatan:** tambahkan penanda "sudah dimuat" di `units.js` (perlu izin, karena di luar cakupan ini) agar badge disembunyikan sampai data Firestore tersedia.
3. **Satukan gaya layar Kantor:** terapkan bayangan keras dan pelat label yang sama pada kanvas Kantor, sehingga keempat layar benar-benar konsisten.
