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

---

## Struktur Berkas Proyek

```
peta-dunia-bps/
├── .env.example             # Template variabel lingkungan aman
├── .gitignore               # Mengabaikan .env, node_modules, dist, log emulator
├── firebase.json            # Konfigurasi emulator (auth: 9099, firestore: 8080)
├── firestore.rules          # Security rules default (deny all)
├── firestore.indexes.json   # Definisi indeks firestore
├── package.json             # Dependensi (firebase, vite, firebase-tools)
├── index.html               # Entry HTML Vite dengan <script type="module">
├── public/                  # Aset publik statis
└── src/
    ├── main.js              # Entrypoint utama: CSS, devbar, stage scaler, router
    ├── config.js            # Validasi variabel lingkungan Firebase
    ├── router.js            # Hash router (#/world, #/island, #/office)
    ├── firebase/
    │   └── client.js        # Inisialisasi Firebase v9 & koneksi emulator lokal
    ├── state/
    │   └── index.js         # AppState global, observer, localStorage & canStartQuest()
    ├── data/
    │   └── index.js         # Data 8 pulau & 7 biro unit kerja
    ├── screens/
    │   ├── world.js         # Screen 1: Peta Dunia BPS (8 pulau)
    │   ├── island.js        # Screen 2: Pulau Sekretariat Utama (7 biro)
    │   └── office.js        # Screen 3: Denah Lantai Kantor Biro SDM (Canvas 2D)
    ├── ui/
    │   ├── hud.js           # Kartu HUD pemain, XP progress bar, toast notification
    │   ├── panel.js         # Modal Papan Informasi, sub-view, quest sheet, focus trap
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
5. **Role Match ("Biro SDM")**: Buka panel (tekan `E` atau klik papan di kanvas). Akses 4 baris informasi, lalu klik tombol biru **"Mulai Quest"** untuk membuka lembar 3 quest aktif.
6. **Role Restriction ("Biro Umum")**: Ubah dropdown di atas menjadi *Biro Umum*, lalu buka panel kembali. Tombol *"Mulai Quest"* tidak ada di dalam DOM, dan digantikan oleh catatan abu-abu *"Quest hanya tersedia untuk pegawai Biro SDM"*.
