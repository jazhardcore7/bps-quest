# Panduan Role: Pimpinan Tertinggi (`head_top`)

- **Tujuan:** Mengelola *quest*, memantau seluruh pegawai di bawah BPS RI Pusat, dan memperbarui konten profil unit dari tingkat pimpinan hingga seluruh direktorat/biro/inspektorat/pusdiklat.
- **Akun Demo (Emulator Only):** `kepala@demo.bps.local` (unit `bps-pusat`).

## Langkah Tugas di Aplikasi

1. **Masuk & Buka `#/manage`:**
   - Masuk lewat tombol **Kepala BPS (Top)** pada panel **Akun Demo (Emulator)**, lalu klik **Kelola** pada HUD.
2. **Pengelolaan Lintas Unit (Tab `Quest`, `Tim Saya`, `Konten Unit`):**
   - Karena `bps-pusat` adalah akar hierarki (`ancestorIds` seluruh unit lainnya memuat `bps-pusat`), Anda dapat memilih seluruh 33 unit aktif di **Quest** dan **Konten Unit**, serta memantau seluruh pegawai di **Tim Saya** (batas kueri 200 pengguna).
   - Tetap menjaga transparansi privasi ringan di klien: kolom **Email** tidak ditampilkan pada tab **Tim Saya** (hanya tampil untuk Super Admin).

## Batasan & Galat Umum

- **Batas XP tetap 100:** Peran `head_top` mengikuti batas XP pimpinan (`QUEST_XP_MAX_HEAD = 100`). Hanya `super_admin` yang dapat membuat *quest* hingga 500 XP.
- **Tidak mengelola akun atau struktur organisasi:** Tab **Akun** dan **Struktur** tidak tersedia untuk `head_top`, dan *quest* hanya dinonaktifkan (**Nonaktifkan**), tidak dihapus permanen.
