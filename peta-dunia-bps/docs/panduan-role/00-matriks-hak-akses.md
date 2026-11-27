# Matriks Hak Akses Role — Peta Dunia BPS

Dokumen ini merangkum hak akses setiap peran (*role*) yang ditegakkan oleh [firestore.rules](file:///d:/career/bps-quest/peta-dunia-bps/firestore.rules) serta antarmuka klien.

## Aturan Cakupan (*Scope*) Secara Sederhana

- **Pegawai (`employee`)**: hanya dapat mengklaim *quest* aktif pada unit miliknya sendiri (`users.unit`).
- **Pimpinan (`head_e2`, `head_e1`, `head_top`)**: cakupan pengelolaan meliputi **unit sendiri ditambah seluruh unit turunannya** (berdasarkan `ancestorIds` pada dokumen unit dan `unitPath` pada dokumen pegawai).
- **Super Admin (`super_admin`, serta alias warisan `admin`)**: mencakup **seluruh unit** di BPS RI Pusat, ditambah hak mengelola struktur unit, daftar izin (`allowedEmails`), dan profil akun pengguna lain.

## Tabel Kemampuan × Role

| Kemampuan | Pegawai (`employee`) | Pimpinan Eselon II (`head_e2`) | Pimpinan Eselon I (`head_e1`) | Pimpinan Tertinggi (`head_top`) | Super Admin (`super_admin`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Klaim *quest* unit sendiri | Ya (selama `active != false`) | Ya | Ya | Ya | Ya |
| Baca profil semua unit & pulau | Ya | Ya | Ya | Ya | Ya |
| Lihat tombol **Kelola** & buka `#/manage` | Tidak | Ya | Ya | Ya | Ya |
| Buat / ubah / nonaktifkan *quest* | Tidak | Ya (unit sendiri + turunan, maks 100 XP) | Ya (Eselon I + turunan, maks 100 XP) | Ya (`bps-pusat` + semua turunan, maks 100 XP) | Ya (semua unit, maks 500 XP) |
| Hapus permanen *quest* (**Hapus**) | Tidak | Tidak (hanya **Nonaktifkan**) | Tidak (hanya **Nonaktifkan**) | Tidak (hanya **Nonaktifkan**) | Ya |
| Ubah konten unit (`summary`, `tugas`, `services`, `announcements`) | Tidak | Ya (dalam cakupan) | Ya (dalam cakupan) | Ya (dalam cakupan) | Ya (semua unit) |
| Lihat daftar tim (**Tim Saya**) | Tidak | Ya (unit sendiri + turunan, tanpa email) | Ya (Eselon I + turunan, tanpa email) | Ya (seluruh turunan `bps-pusat`, tanpa email) | Ya (semua pegawai, termasuk kolom **Email**) |
| Kelola akun (**Akun**: `allowedEmails` & profil) | Tidak | Tidak | Tidak | Tidak | Ya (dilarang ubah `role`/`active` diri sendiri) |
| Kelola struktur (**Struktur**: buat unit & **Arsipkan**) | Tidak | Tidak | Tidak | Tidak | Ya (tidak ada *hard delete* unit) |
