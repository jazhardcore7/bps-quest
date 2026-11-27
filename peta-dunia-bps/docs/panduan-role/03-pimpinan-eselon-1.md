# Panduan Role: Pimpinan Eselon I (`head_e1`)

- **Tujuan:** Mengelola *quest*, memantau seluruh pegawai, serta memperbarui konten profil pada unit Eselon I dan seluruh Biro/Direktorat/Inspektorat turunannya.
- **Akun Demo (Emulator Only):** `sestama@demo.bps.local` (Sekretariat Utama) dan `deputi.sosial@demo.bps.local` (Deputi Bidang Statistik Sosial).

## Langkah Tugas di Aplikasi

1. **Masuk & Buka `#/manage`:**
   - Masuk sebagai **Sestama (E1)** atau **Deputi Sosial (E1)** lewat panel **Akun Demo (Emulator)**, lalu klik tombol **Kelola** di HUD kanan atas.
2. **Memilih Unit dalam Cakupan (Tab `Quest` & `Konten Unit`):**
   - Pada dropdown **Unit Kerja** / **Pilih Unit Kerja**, `sestama@demo.bps.local` dapat memilih `Sekretariat Utama` beserta seluruh 5 biro di bawahnya (`Biro Perencanaan dan Kerja Sama`, `Biro Keuangan dan Barang Milik Negara`, `Biro Sumber Daya Manusia`, `Biro Hukum dan Organisasi`, `Biro Umum dan Hubungan Masyarakat`).
   - Catatan struktur: sesuai Peraturan BPS 2/2025 Pasal 4 huruf j dan Lampiran bagan hlm. 36, `Pusat Pendidikan dan Pelatihan` berada langsung di bawah `bps-pusat` (dengan koordinasi administratif melalui Sestama), sehingga tidak termasuk turunan langsung `sestama` pada `ancestorIds`.
   - `deputi.sosial@demo.bps.local` dapat memilih `Deputi Bidang Statistik Sosial` beserta 3 direktorat di bawahnya.
   - Buat/ubah/nonaktifkan *quest* (XP maks 100) atau perbarui ringkasan/tugas/layanan/pengumuman untuk unit mana pun dalam cakupan tersebut.
3. **Melihat Subtree Pegawai (Tab `Tim Saya`):**
   - Data dimuat menggunakan kueri `unitPath array-contains <unitId>` sehingga menampilkan seluruh pegawai di unit Eselon I maupun seluruh unit Eselon II turunannya.
   - Gunakan **Filter Unit** untuk memfokuskan ke satu biro/direktorat tertentu, dan **Cari Nama Pegawai** untuk pencarian cepat.

## Batasan & Galat Umum

- **Cakupan terbatas pada deputi/sekretariat sendiri:** `sestama` tidak dapat mengubah atau melihat *Tim Saya* milik `Deputi Bidang Statistik Sosial` atau `Direktorat Statistik Harga`.
- **Tanpa akses Akun & Struktur:** Tab **Akun** dan **Struktur** hanya tampil untuk Super Admin; pimpinan juga tidak dapat menghapus permanen *quest* (gunakan **Nonaktifkan**) dan batas XP adalah 100.
