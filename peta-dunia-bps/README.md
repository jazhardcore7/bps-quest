# Peta Dunia BPS — Vite & Firebase Architecture

Aplikasi gamifikasi internal BPS yang dimigrasikan ke arsitektur modern berbasis **Vite (Vanilla JS, ES Modules)** dan terintegrasi dengan konfigurasi **Firebase (Modular SDK v9+)** serta emulator lokal.

---

## Prasyarat Lingkungan (Prerequisites)

1. **Node.js**: Versi LTS (v18+ atau v20+ / v22+).
2. **Java Runtime (JRE / JDK 11+)**: **Wajib diinstal** untuk menjalankan Firebase Firestore Emulator (`npm run emulators`). Periksa ketersediaan Java dengan menjalankan:
   ```bash
   java -version
   ```

---

## Konfigurasi Lingkungan (.env)

Salin berkas contoh `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Isi variabel lingkungan berikut sesuai konfigurasi proyek Firebase Anda:

| Variabel | Deskripsi |
|---|---|
| `VITE_FIREBASE_API_KEY` | API Key web Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domain autentikasi Firebase (`<project-id>.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Project ID Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket Cloud Storage |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID Cloud Messaging |
| `VITE_FIREBASE_APP_ID` | App ID web Firebase |
| `VITE_USE_EMULATORS` | Set `"true"` untuk menghubungkan Auth & Firestore ke emulator lokal saat `npm run dev` |

> [!IMPORTANT]
> Berkas `.env` dan `.env.local` telah dimasukkan ke dalam `.gitignore` dan **tidak boleh dicatat atau diunggah ke repository git**.

---

## Perintah Pengembangan (Scripts)

### 1. Menjalankan Firebase Emulators
Jalankan emulator lokal (Auth pada port `9099`, Firestore pada port `8080`):
```bash
npm run emulators
```
> [!NOTE]
> Emulator Firestore memerlukan runtime **Java**. Jika Java belum terpasang, perintah ini akan meminta instalasi JRE/JDK.

### 2. Menjalankan Server Pengembangan (Dev Server)
Jalankan server Vite lokal:
```bash
npm run dev
```
Buka URL lokal yang muncul (default: `http://localhost:5173/`).
Pada mode pengembangan (`DEV`), bilah dev bar di bagian atas layar (**"Simulasi pegawai dari:"**) akan otomatis aktif untuk mempermudah pengujian peran.

### 3. Membangun Bundle Produksi (Build)
```bash
npm run build
```
Menghasilkan bundle statis teroptimasi di dalam folder `./dist/` (tanpa bilah dev bar).

### 4. Pratinjau Hasil Build (Preview)
```bash
npm run preview
```
Menjalankan web server lokal untuk menguji hasil build produksi secara langsung.

### 5. Menjalankan Pengujian Unit & Security Rules
```bash
# Menjalankan unit test helpers (XP formula, weekKey, monthKey, dailyPeriodKey)
npm run test:helpers

# Menjalankan security rules test suites terhadap emulator Firestore
npm run test:rules

# Menjalankan seluruh test suite sekaligus
npm test
```

### 6. Seeding Data Awal ke Emulator
```bash
npm run seed
```

---

## Known Security Trade-offs & Limitations

Dalam arsitektur MVP berbasis *client-driven Firestore* tanpa Cloud Functions atau custom auth claims, terdapat beberapa batasan keamanan dan kompromi arsitektural yang didokumentasikan secara sadar:

1. **Visibilitas Kunci Jawaban Kuis (`quiz.correctIndex`)**:
   - Karena dokumen kuis pada koleksi `quests` dibaca langsung oleh klien yang terautentikasi (`allow read: if isSignedIn()`), nilai `quiz.correctIndex` dapat dibaca melalui DevTools/skrip klien.
   - *Mitigasi di masa depan*: Pindahkan validasi kuis ke Firebase Cloud Functions (Callable Function atau HTTP Cloud Run) yang memvalidasi jawaban di sisi server sebelum mengeksekusi penulisan dokumen `completions`.

2. **Validasi Kunci Periode (`periodKey`)**:
   - Integritas penyelesaian kuis harian vs checkpoint dijaga melalui format ID dokumen deterministik `completions/{uid}_{questId}_{periodKey}`, aturan larangan *update/delete*, dan pemastian `request.resource.data.createdAt == request.time`.
   - *Mitigasi di masa depan*: Server Timestamp / Scheduled Function untuk menutup jendela klaim harian di zona waktu Asia/Jakarta secara independen.

3. **Perhitungan Akumulasi Periode Klien (`weekKey` & `monthKey`)**:
   - Security Rules memvalidasi bahwa klien hanya dapat memperbarui `xp`, `level`, `weekKey`, `xpWeek`, `monthKey`, `xpMonth`, dan `lastCompletionId` secara atomik bersamaan dengan pembuatan dokumen `completions` yang valid.
   - Format `weekKey` divalidasi dengan regex `^[0-9]{4}-W[0-9]{2}$` dan `monthKey` dengan `^[0-9]{4}-[0-9]{2}$`. Jika klien memalsukan nilai kunci minggu/bulan pada saat rollover, hal tersebut hanya berdampak pada akumulasi periodik pengguna itu sendiri (`xpWeek`/`xpMonth`), dan sama sekali tidak dapat memalsukan total akumulasi XP sepanjang waktu (`xp`) maupun level pemain.

4. **Kontrol Akses Peran Admin**:
   - Pembuatan dan pengubahan unit kerja (`units`) serta daftar quest (`quests`) dibatasi secara ketat hanya untuk pengguna berstatus `role == 'admin'` dalam dokumen profil `users/{auth.uid}`. Klien non-admin tidak dapat memodifikasi koleksi ini.

5. **Arsitektur Papan Peringkat Rendah Biaya Baca (Leaderboard Low-Read Cost)**:
   - Tiga tab papan peringkat ("Sepanjang Waktu", "Mingguan", "Bulanan") dirancang hemat kuota Firestore: masing-masing tab hanya mengeksekusi **1 query tunggal** langsung ke koleksi `users` (maksimal 60 dokumen) dengan composite index (`weekKey + xpWeek` dan `monthKey + xpMonth`), tanpa pernah membaca koleksi riwayat `completions`.
   - Hasil query dicache di memori klien selama 60 detik (TTL). Tombol *Segarkan* memaksa refresh manual.
   - Pemeringkatan dan tie-breaking (XP total tertinggi, kemudian alfabetik nama) serta filter unit dilakukan secara instan di sisi klien.

---

## Struktur Berkas Proyek

```
peta-dunia-bps/
├── .env.example             # Template variabel lingkungan aman
├── .gitignore               # Mengabaikan .env, node_modules, dist, log emulator
├── firebase.json            # Konfigurasi emulator (auth: 9099, firestore: 8080)
├── firestore.rules          # Security rules Firebase (completions, users, allowedEmails, quests)
├── firestore.indexes.json   # Definisi composite index firestore (weekKey+xpWeek, monthKey+xpMonth)
├── package.json             # Dependensi (firebase, vite, firebase-tools)
├── index.html               # Entry HTML Vite dengan <script type="module">
├── public/                  # Aset publik statis
├── tests/
│   ├── config.test.js       # Unit test rumus level & date helpers (Asia/Jakarta)
│   ├── leaderboard.test.js  # Unit test sorting, tie-breaking, filtering leaderboard
│   └── rules.test.js        # Security rules integration tests
├── scripts/
│   └── seed.js              # Script seeding emulator data (users, quests, allowlist, units)
└── src/
    ├── main.js              # Entrypoint utama: CSS, devbar, stage scaler, router
    ├── config.js            # Validasi variabel lingkungan Firebase & kalkulasi XP/Level
    ├── router.js            # Hash router (#/login, #/world, #/island, #/office, #/leaderboard)
    ├── firebase/
    │   ├── client.js        # Inisialisasi Firebase v9 & koneksi emulator lokal
    │   ├── auth.js          # Layanan autentikasi, Google Popup, allowlist checking
    │   ├── quests.js        # Layanan Firestore quests & atomic completions batching
    │   └── leaderboard.js   # Layanan query leaderboard (users collection, 60s cache)
    ├── state/
    │   └── index.js         # AppState global, observer & canStartQuest()
    ├── data/
    │   └── index.js         # Data 8 pulau & 7 biro unit kerja
    ├── screens/
    │   ├── login.js         # Screen 0: Autentikasi email/password & Google
    │   ├── world.js         # Screen 1: Peta Dunia BPS (8 pulau)
    │   ├── island.js        # Screen 2: Pulau Sekretariat Utama (7 biro)
    │   ├── office.js        # Screen 3: Denah Lantai Kantor Biro SDM (Canvas 2D)
    │   └── leaderboard.js   # Screen 4: Papan Peringkat (All-Time, Mingguan, Bulanan)
    ├── ui/
    │   ├── hud.js           # Kartu HUD pemain, tombol piala leaderboard, progress bar XP
    │   ├── panel.js         # Modal Papan Informasi, sub-view, quest sheet, quiz, focus trap
    │   └── devbar.js        # Bilah simulasi pegawai (hanya tampil pada mode DEV)
    └── styles/
        └── style.css        # Stylesheet terpadu & responsif
```

---

## Skenario Pengujian Fitur (Demo Script)

1. **Peta Dunia (`#/world`)**: Klik pulau **Sekretariat Utama** untuk masuk. Klik pulau terkunci untuk melihat toast *"Pulau ini segera hadir"*.
2. **Pulau Sestama (`#/island`)**: Perhatikan ubin **"Biro SDM · Biro Anda"** berbingkai emas saat bilah simulasi dev memilih *Biro SDM*. Klik *Biro SDM* untuk masuk ke denah kantor.
3. **Fisika & Denah Kantor (`#/office`)**: Gerakkan avatar menggunakan `WASD` / tombol panah / D-Pad sentuh. Avatar meluncur mulus sepanjang dinding tanpa tembus.
4. **Papan Informasi & Balon Interaksi**: Dekati papan kuning hingga balon *"Tekan E"* muncul di atas avatar.
5. **Role Match ("Biro SDM")**: Buka panel (tekan `E` atau klik papan di kanvas). Akses 4 baris informasi, lalu klik tombol biru **"Mulai Quest"** untuk membuka lembar quest aktif.
6. **Klaim Quest & XP**: Selesaikan kuis checkpoint atau klaim quest harian. Muncul animasi toast `+N XP`, progress bar dan level di HUD terupdate seketika secara atomik.
7. **Papan Peringkat (`#/leaderboard`)**: Klik ikon piala emas pada kartu HUD untuk membuka papan peringkat.
   - Tab **"Sepanjang Waktu"**, **"Mingguan"**, dan **"Bulanan"** menampilkan peringkat 1-3 dengan badge piala emas/perak/perunggu.
   - Pengguna aktif ditandai dengan aksen emas `(Kamu)`. Jika pengguna berada di luar daftar 60 besar, baris pengguna dipin di bagian bawah layar.
   - Filter unit chip ("Semua", "Biro SDM") menyaring tampilan secara instan tanpa re-query.
   - Tombol kembali (Back) di kartu kiri mengembalikan pemain ke layar sebelumnya.
