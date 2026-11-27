# Panduan Role: Pimpinan Eselon II (`head_e2`)

- **Tujuan:** Mengelola *quest*, memantau capaian XP pegawai, dan memperbarui konten profil unit pada unit Eselon II yang dipimpinnya.
- **Akun Demo (Emulator Only):** `kabiro.sdm@demo.bps.local` (Biro SDM) dan `direktur.harga@demo.bps.local` (Direktorat Statistik Harga).

## Langkah Tugas di Aplikasi

1. **Masuk & Buka Pusat Pengelolaan:**
   - Masuk melalui panel **Akun Demo (Emulator)** (misalnya **Kabiro SDM (E2)**).
   - Pada kartu HUD kanan atas, klik tombol **Kelola** untuk membuka `#/manage`.
   - Tab yang tersedia untuk Eselon II adalah **Quest**, **Tim Saya**, dan **Konten Unit** (tab **Akun** dan **Struktur** tidak ditampilkan).
2. **Mengelola Quest (Tab `Quest`):**
   - Pada kolom **Unit Kerja**, pilihan terbatas hanya pada unit dalam cakupan Anda (misalnya `Biro Sumber Daya Manusia`).
   - Isi **Judul Quest (3–80 karakter)**, **Deskripsi (maks 300 karakter)**, pilih **Tipe Quest** (`Harian (daily)` atau `Checkpoint (Kuis)`), dan isi **XP (1–100)**.
   - Jika memilih `Checkpoint (Kuis)`, isi **Pertanyaan Kuis**, 2–4 opsi jawaban (bisa klik **+ Tambah Opsi**), dan pilih radio button jawaban benar.
   - Klik **Simpan Quest**.
   - Pada daftar **Quest dalam Cakupan**, Anda dapat menekan **Ubah** untuk memperbarui atau **Nonaktifkan** / **Aktifkan** (dengan dialog konfirmasi). Tombol **Hapus** permanen tidak tersedia untuk pimpinan.
3. **Memantau Tim (Tab `Tim Saya`):**
   - Menampilkan ringkasan **Jumlah Pegawai** dan **Total XP Minggu Ini** khusus unit Anda.
   - Gunakan **Cari Nama Pegawai** atau **Filter Unit** untuk menyaring daftar. Kolom **Email** tidak ditampilkan pada tabel tim pimpinan.
4. **Memperbarui Konten Unit (Tab `Konten Unit`):**
   - Pilih unit pada **Pilih Unit Kerja**, ubah **Ringkasan Unit** (maks 400 karakter), **Tugas dan Fungsi** (1 butir/baris, maks 6 baris × 200 karakter), **Fasilitas dan Layanan** (maks 8 baris × 120 karakter), atau kelola **Papan Pengumuman** (maks 5 item × 240 karakter).
   - Klik **Simpan Konten Unit**; perubahan langsung tampak saat membuka panel informasi unit tersebut.

## Batasan & Galat Umum

- **Batas XP maksimal 100:** Memasukkan XP `> 100` ditolak baik oleh validasi formulir maupun `firestore.rules`.
- **Unit luar cakupan:** Anda tidak dapat memilih atau menulis *quest*/konten unit lain (misalnya `biro-umum` bagi Kepala Biro SDM).
- **Klaim *quest* pribadi:** Sama seperti pegawai biasa, Anda tetap dapat mengklaim *quest* aktif di unit Anda sendiri.
