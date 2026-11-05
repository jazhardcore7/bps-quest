# Peta Dunia BPS — Clickable Prototype

Prototipe interaktif lokal (tanpa backend/server) untuk konsep gamifikasi internal BPS: pegawai menjelajahi pulau-pulau unit kerja, memasuki kantor biro, dan mengakses papan informasi serta quest peran pegawai.

---

## Cara Menjalankan

1. Buka folder `./peta-dunia-bps/`.
2. Klik ganda (**double-click**) file `index.html`.
3. Aplikasi akan langsung berjalan di browser favorit Anda (Google Chrome, Microsoft Edge, Mozilla Firefox, Apple Safari) melalui protokol `file://`.
4. **Tidak memerlukan** instalasi `npm`, `node`, `build tools`, server web lokal, maupun koneksi internet (100% offline & self-contained).

---

## Arsitektur Singkat

- **Teknologi**: Vanilla HTML5, CSS3, dan JavaScript (ES5/standard classic script tags tanpa modul `import`/`export`).
- **Desain & Responsivitas**: Kanvas tetap `960px × 560px` di dalam `#stage` yang otomatis di-scaling menggunakan CSS transform preserving aspect ratio pada resolusi layar apa pun (termasuk 1440×900 hingga 900×560).
- **Perutean (Routing)**: Hash router berbasis `#` (`#/world`, `#/island`, `#/office`) yang mendukung tombol navigasi in-app dan browser Back/Forward.
- **State & Reaktivitas**: `AppState` global dengan pola Observer (Pub/Sub) serta penyimpanan aman `localStorage` di dalam blok `try/catch`.
- **Kanvas Lantai Kantor**: Render grafis resolusi tajam via `devicePixelRatio`, avatar interaktif dengan fisika delta-time (`220 px/s`), deteksi tabrakan independen sumbu X/Y (sliding collision), kontrol D-pad layar sentuh, dan focus trap aksesibilitas dialog.

---

## Skenario Demo 6 Langkah (6-Step Demo Script)

Ikuti panduan 6 langkah berikut untuk menguji seluruh fitur dari Part 1 hingga Part 3:

### Langkah 1: Eksplorasi Peta Dunia (Screen 1 — `#/world`)
1. Buka `index.html`.
2. Anda berada di **Peta Dunia BPS** yang menampilkan 8 pulau unit kerja:
   - Perhatikan pulau **Sekretariat Utama** berstatus terbuka dengan ikon bintang emas.
   - Klik salah satu pulau lain yang terkunci (misalnya *"Kepala & Wakil Kepala BPS"*).
   - Muncul notifikasi toast di bagian atas: **"Pulau ini segera hadir"** (hilang otomatis setelah 2 detik).

### Langkah 2: Masuk ke Pulau Sekretariat Utama (Screen 2 — `#/island`)
1. Klik pulau **Sekretariat Utama**.
2. Rute berpindah ke `#/island`.
3. Terlihat pulau besar dengan 7 biro:
   - Secara default bilah simulasi dev di atas memilih **Biro SDM**.
   - Perhatikan ubin **Biro SDM** memiliki border emas dengan label **"Biro SDM · Biro Anda"**.

### Langkah 3: Interaksi Ubin Biro & Masuk Kantor
1. Klik ubin biro lain (misalnya *"Biro Keuangan"*).
2. Muncul toast: **"Peta kantor belum tersedia di prototype"**.
3. Klik ubin **Biro SDM**.
4. Rute berpindah ke `#/office` (Denah lantai kantor Biro SDM).

### Langkah 4: Navigasi Avatar & Papan Informasi (Screen 3 — `#/office`)
1. Avatar spawn pada posisi tengah ruangan `(700, 290)`.
2. Gerakkan avatar menggunakan tombol **W / A / S / D**, **Tombol Panah**, atau tombol **D-Pad** di pojok kanan bawah.
3. Dekati dinding atau ruangan (misalnya *R. Kolaborasi*); avatar meluncur mulus sepanjang dinding tanpa tembus (wall sliding collision).
4. Dekati **Papan Informasi** (balok kuning di dekat pintu keluar).
5. Saat berada dalam jarak dekat (radius 80 unit), muncul balon interaksi **"Tekan E"** di atas kepala avatar.

### Langkah 5: Kasus 1 — Pegawai Biro SDM (Eligibel Mulai Quest)
1. Tekan tombol **E** pada keyboard atau klik langsung pada objek **Papan Informasi** di kanvas.
2. Modal putih **Papan Informasi** terbuka dan avatar berhenti bergerak:
   - Di bagian atas tampak judul *"Biro SDM"*, chip induk *"Sekretariat Utama"*, dan chip gedung *"Level 2 · 350/600 XP"*.
   - Uji 4 baris **Akses Informasi** (*Profil & Tugas Fungsi*, *Struktur Organisasi*, dll.): klik salah satu baris untuk masuk ke sub-view penjelasan, lalu klik tombol **"← Kembali"** untuk kembali ke menu utama.
   - Karena bilah simulasi dev disetel ke **Biro SDM**, tombol biru **"Mulai Quest"** tampil penuh di bagian bawah.
3. Klik tombol **"Mulai Quest"**:
   - Lembar daftar **"Quest tersedia"** terbuka, menampilkan 3 quest dengan badge XP (`+50 XP`, `+30 XP`, `+20 XP`).
4. Tekan tombol **Escape**, klik tombol **×**, atau klik area gelap latar belakang:
   - Modal tertutup dan avatar dapat digerakkan kembali dengan normal.

### Langkah 6: Kasus 2 — Pegawai Non-SDM (Biro Umum / Pembatasan Peran)
1. Pada bilah dev gelap di bagian paling atas layar, ubah dropdown **"Simulasi pegawai dari:"** menjadi **"Biro Umum"**.
2. Dekati kembali Papan Informasi dan tekan **E** (atau klik papan di kanvas).
3. Perhatikan bagian bawah modal:
   - Tombol **"Mulai Quest" sama sekali tidak ada di dalam DOM**.
   - Tampil kotak catatan abu-abu berbunyi: **"Quest hanya tersedia untuk pegawai Biro SDM"**.
4. Tutup modal, lalu klik tombol panah kembali di HUD kiri untuk kembali ke Pulau (`#/island`) dan Peta Dunia (`#/world`).
5. Perhatikan bahwa pilihan unit *"Biro Umum"* tetap tersimpan di `localStorage` bahkan setelah me-refresh halaman browser.

