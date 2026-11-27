# Referensi Gaya Pulau (diturunkan dari layar Kantor)

Branch `ui/island-revamp` (dibuat dari `feat/roles-demo` @ `6438718`) · 2026-11-27 · Fase 0

Dokumen ini menjabarkan bahasa visual layar Kantor (`#/office`) persis seperti yang dirender di branch ini, lalu menerjemahkannya ke Peta Dunia (`#/world`), layar Pulau (`#/island/<id>`), dan HUD. Sumbernya adalah kode `src/screens/office.js` dan bagian "Screen 3: Office" di `src/styles/style.css`, ditambah screenshot `docs/screenshots/island-revamp/before-office-1440x900.jpg`.

Jika ada yang bertentangan, layar Kantor yang menentukan identitas visual. Aturan aksesibilitas dan UX dari skill ui-ux-pro-max tetap berlaku (lihat `design-system/peta-dunia-bps/DECISIONS.md`).

## 1. Ekstraksi gaya Kantor (dari kode)

Kantor di branch ini adalah **versi polos**: ruangan pastel datar, garis navy tebal, papan kuning. Semua angka di bawah berasal dari kode. Satuan "dunia" pada Canvas dikali `WORLD_SCALE` = 920/1240 ≈ 0,742 untuk mendapat px CSS pada skala stage 1.

### 1.1 Palet

| Peran | Hex | Sumber |
| --- | --- | --- |
| Lantai | `#E8EEF6` | `FLOOR.fill` |
| Garis dinding/ruangan (ink outline) | `#1E3A5F` | `FLOOR.stroke`, `drawRooms` |
| Teks label ruangan (ink text) | `#10263F` | `drawRooms` |
| Ruang rapat/kerja (biru pastel) | `#CFE3F7` | `ROOMS` (Rapat 1/2, R. Pembinaan, Perkap, Ruang Kepala) |
| Ruang servis (abu pastel) | `#D9D9E3` | Pintu Keluar, WC |
| Ruang sholat/kolaborasi (hijau pastel) | `#D5ECD0` | R. Sholat, R. Kolaborasi |
| Pantry/tunggu (krem pastel) | `#F7E6C4` | R. Pantry, R. Tunggu |
| Label area lantai | `#6B7F96` | `drawFloorLabels` (kontras 3,53:1 di lantai, hanya untuk teks besar 26px tebal) |
| Papan Informasi: isi | `#FFD24A` | `BOARD.fill` |
| Papan Informasi: garis | `#B8860B` | `BOARD.stroke` |
| Papan Informasi: teks | `#5A4500` | `drawBoard` (6,37:1 di atas emas) |
| Gelembung "Tekan E" | `#0F3D6E`, teks `#FFFFFF` | `drawInteractionBubble` |
| Avatar | badan `#2E86DE` dengan garis putih 4, kulit `#F2B583`, rambut `#3B2A20` | `drawAvatar` |
| Latar layar | `#10263F` | `.screen-office` |
| Teks petunjuk | `#8FA8C4` | `.office-hint-text` |
| Tombol D-pad | navy `rgba(15,61,110,.85)`, aktif emas `#FFD24A` | `.dpad-btn` |

### 1.2 Garis, sudut, bayangan

- **Garis:** dinding lantai 6 satuan (sekitar 4,5px), ruangan 5 satuan (sekitar 3,7px), papan 5 satuan. Semua solid dan tanpa gradien. Diterjemahkan sebagai **garis tinta 3px** di DOM/SVG.
- **Sudut:** ruangan bersudut tajam (persegi). Papan membulat dengan radius 18 satuan (sekitar 13px). Gelembung radius 8. Elemen kanvas CSS radius 6px. Tombol D-pad radius 8px.
- **Bayangan:** Kantor memakai bayangan **lembut** (kanvas `0 4px 16px rgba(0,0,0,.4)`, gelembung `shadowBlur 6`, D-pad `0 3px 6px`). Instruksi tugas menetapkan gaya polos = **bayangan keras tanpa blur**, jadi pulau memakai bayangan keras (lihat keputusan D-02).

### 1.3 Label dan tipografi

- Font sistem: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`, dengan teks label ruangan 15–18px regular. Ruang Kepala ditulis tebal dan dibagi dua baris; label area lantai 26px tebal.
- Label diletakkan di tengah ruangan, langsung di atas isi pastel, tanpa pelat.
- Papan memakai teks tebal 16px yang diputar −90°.

### 1.4 Gerak

- Hanya avatar yang bergerak (220 satuan/detik).
- **Tidak ada animasi glow/pulse.** Papan statis, dan gelembung "Tekan E" muncul/hilang tanpa transisi saat jarak ≤ 80.
- D-pad memakai transisi 0,1s dan `scale(.94)` saat ditekan.

## 2. Aturan terjemahan ke pulau, peta, dan HUD

1. **Pulau = denah mini.** Setiap pulau digambar seperti ruangan Kantor: isian datar, garis tinta, tanpa gradien pada bangunan. Hanya lautnya yang boleh bergradien, mengikuti latar stage yang sudah ada.
2. **Lapisan pulau (SVG inline, deterministik):** cincin air dangkal → buih → tepi pasir bergaris tinta → rumput bergaris tinta → 2–3 pohon atau properti → **satu bangunan** dalam tata bahasa Kantor: isian pastel datar, garis tinta, bayangan keras, kisi jendela warna lantai `#E8EEF6`, dan tepi atas yang lebih terang.
3. **Siluet dan motif berbeda per pulau** (bentuk pulau berbeda, bangunan bermotif): `pimpinan` menara berbendera, `sestama` aula administrasi berbintang, `mis` blok server berantena, `sosial` rumah komunitas berikon orang, `produksi` pabrik bercerobong, `distribusi-jasa` gudang dengan peti kiriman, `neraca` gedung dengan papan diagram lingkaran, `itama` gedung berperisai.
4. **Warna unit** (`blockColor` dari `src/data/index.js`) hanya mewarnai atap/aksen bangunan; dinding tetap pastel Kantor.
5. **Pil label:** isian warna unit dengan garis tinta, bayangan keras, teks putih. Pil yang kurang dari 4,5:1 mendapat isian lebih gelap dari token CSS, tanpa mengubah `src/data/index.js`.
6. **Sorotan "unit Anda" = perlakuan Papan Informasi:** isian emas `#FFD24A`, garis dalam emas tua `#B8860B`, ditambah **garis tinta luar** agar batasnya tetap ≥ 3:1 terhadap rumput/laut (emas tua di atas emas hanya 2,26:1). Teks di atas emas memakai ink `#10263F` (10,63:1) atau `#5A4500` (6,37:1).
7. **HUD:** kartu navy `#0F3D6E` seperti gelembung "Tekan E", diberi garis tinta dan bayangan keras. Teks putih (10,98:1) dan subteks `#CFE6FA` (8,55:1).
8. **Gerak:** sesuai Kantor, bangunan dan pil diam. Gerak ambien hanya di laut (awan, perahu, kilau air) dengan `transform`/`opacity`, dan seluruhnya mati di bawah `prefers-reduced-motion`. Jumlah elemen beranimasi menunggu keputusan pemilik (lihat D-08).
9. **Tipografi:** tetap font sistem Kantor; tidak ada font baru.

## 3. Preserved hooks (wajib tetap ada)

Hasil grep pada `tests/`, `demo-test/`, `scripts/`, dan `docs/`:
- Tidak ada tes, skrip, atau skenario demo yang melakukan query ke DOM peta, pulau, atau HUD.
- Kecocokan `biro-sdm`, `biro-umum`, dan sejenisnya adalah **ID data unit**, bukan selector.
- Yang dirujuk di dokumentasi adalah hook di bawah. Hook yang dipakai oleh JS aplikasi sendiri juga dicatat, karena perilaku tidak boleh berubah.

### 3.1 Dirujuk oleh `docs/`

| Hook | Jenis | Dirujuk di |
| --- | --- | --- |
| `#hud-manage-btn` | id tombol "Kelola" | `docs/DEMO_DRYRUN_REPORT.md` |
| `.hud-right-card` | class kartu pemain | `docs/DEMO_TEST_REPORT.md` |
| "Kelola" | teks/`aria-label` tombol | `docs/AKUN_DEMO.md`, `SKENARIO_DEMO.md`, `demo_tutorial.md`, `latest_report.md`, `panduan-role/*` |
| "Pusat Pengelolaan" | `title` tombol Kelola | `docs/latest_report.md`, `panduan-role/02-pimpinan-eselon-2.md` |
| "Papan Peringkat" | `aria-label`/`title` tombol piala | `AKUN_DEMO.md`, `DEMO_TEST_REPORT.md`, `SKENARIO_DEMO.md`, `demo_tutorial.md`, `panduan-role/01-pegawai.md` |
| "Keluar dari akun" | `aria-label`/`title` tombol logout | `DEMO_TEST_REPORT.md` |
| "Kembali" | `aria-label` tombol kembali | `DEMO_TEST_REPORT.md`, `panduan-role/01-pegawai.md` |
| "· Biro Anda" | teks penanda pada tile unit sendiri | `SKENARIO_DEMO.md`, `demo_tutorial.md`, `latest_report.md`, `panduan-role/01-pegawai.md` ("bingkai emas") |
| "<Pulau> · N unit" | subjudul kartu kiri di layar pulau | `SKENARIO_DEMO.md`, `demo_tutorial.md` |
| `#/world`, `#/island/<id>`, `#/island` → `#/island/sestama`, `#/office`, `#/manage` | rute | beberapa dokumen |

### 3.2 Dipakai oleh JS aplikasi (`src/`)

| Hook | Dipakai di |
| --- | --- |
| `.hud-right-wrapper`, `.hud-left-wrapper` | `world.js`, `island.js`, layar lain (`updateHud`) |
| `#hud-manage-btn`, `#hud-trophy-btn`, `#hud-logout-btn` | delegasi klik di `hud.js` |
| `#hud-back-button` | `bindLeftCardEvents` di `hud.js` |
| `.hud-card`, `.hud-left-card`, `.has-back`, `.hud-title`, `.hud-subtitle`, `.hud-player-name`, `.hud-player-level`, `.hud-xp-text`, `.hud-progress-track` (`role="progressbar"`), `.hud-progress-fill`, `.hud-avatar-wrap`, `.hud-action-btn`, `.hud-trophy-btn`, `.hud-logout-btn`, `.hud-manage-btn`, `aria-label="Informasi Pemain"` | markup HUD |
| `.screen-world`, `.world-islands` (`role="region"`, `aria-label="Daftar Pulau Unit Kerja"`), `.world-island`, `.is-unlocked`, `#island-<id>`, `data-id` | `world.js` (klik membaca `data-id`) |
| `.island-building`, `.building-roof-accent`, `.building-windows`, `.window-pane`, `.building-door`, `.island-pill`, `.island-pill-label` | markup pulau di `world.js` |
| `.screen-island`, `.island-main-oval` (`role="region"`, `aria-label="Pulau <label>"`), `.biro-tiles-grid` | `island.js` |
| `.biro-tile`, `data-id`, `data-label`, `.is-current-unit`, `.is-island-root` | `island.js` (`updateTiles`, klik) |
| `.biro-building-block`, `.biro-building-roof`, `.biro-windows`, `.b-win`, `.biro-door`, `.biro-pill`, `.biro-pill-text` | `island.js` (`updateTiles` mengubah `.biro-building-block` dan `.biro-pill-text`) |
| `.bps-toast` (`role="alert"`) | `showToast` di `hud.js` |

**Aturan:** class lama tidak diganti nama. Gaya baru ditambahkan lewat class baru, dan elemen lama tetap ada walaupun tampilannya diganti. Contohnya, `.island-building` dapat membungkus SVG baru.

## 4. Konsep visual (ringkas)

- **Peta Dunia:** laut biru stage yang sudah ada dengan cincin air dangkal dan buih putih di sekeliling tiap pulau. Delapan pulau dengan bentuk dan bangunan bermotif berbeda, digambar seperti denah Kantor mini: dinding pastel, garis tinta 3px, bayangan keras ke bawah, dan atap berwarna unit. Pil nama bergaris tinta dengan bayangan keras. Badge kecil "5 biro" / "3 direktorat" hanya muncul jika data unit sudah dimuat. Pin emas "Unit Anda" mengikuti gaya Papan Informasi. Rute putus-putus tipis dan kompas kecil di laut. Gerak ambien pelan dan terbatas.
- **Layar Pulau:** pulau besar bergaya sama. Setiap unit adalah bangunan kecil seperti ruangan Kantor (pastel, garis tinta, bayangan keras) dengan pelat nama. Unit sendiri memakai emas Papan Informasi beserta teks "· Biro Anda". Nama lengkap ada di `title`.
- **HUD:** kartu navy bergaris tinta dengan bayangan keras. Kartu pemain menampilkan nama di baris pertama (elipsis hanya setelah lebar maksimum yang longgar, nilai lengkap di `title`), "Level N" ditambah chip peran di baris kedua, dan bar XP bersegmen dengan label "x / y XP". Tombol Kelola, piala, dan keluar tetap `<button>` dengan `aria-label`.
