# Desain Role, Hierarki Unit, dan Keamanan Firestore

Dokumen ini menjelaskan model peran (*role*), logika cakupan (*scope*) berbasis hierarki unit BPS RI Pusat, batas XP quest, serta alasan desain pengelolaan unit dan akun pada **Peta Dunia BPS**.

## Tabel Role dan Hak Akses

| Role | Label UI | Cakupan (*Scope*) | Kemampuan Utama |
| :--- | :--- | :--- | :--- |
| `employee` | Pegawai | Unit sendiri (`users.unit`) | Membaca data aplikasi dan mengklaim *quest* aktif pada unit miliknya sendiri (selama `active != false`). |
| `head_e2` | Pimpinan Eselon II | Unit sendiri + seluruh unit turunan | Mengelola *quest* (buat/ubah/nonaktifkan dengan `active = false`, XP maks 100) dan mengubah konten profil unit (`summary`, `tugas`, `services`, `announcements`) di dalam cakupan. |
| `head_e1` | Pimpinan Eselon I | Unit sendiri (Sekretariat Utama / Deputi / Itama) + seluruh biro/direktorat/inspektorat/bagian di bawahnya | Sama seperti `head_e2` untuk unit miliknya beserta seluruh unit turunan di bawah koordinasinya. |
| `head_top` | Pimpinan Tertinggi | `bps-pusat` + seluruh unit turunan di bawah BPS Pusat | Sama seperti `head_e2`/`head_e1` dengan cakupan seluruh struktur BPS RI Pusat. |
| `super_admin` | Super Admin | Seluruh unit | Semua hak pengelolaan *quest* (XP maks 500, boleh hapus permanen) dan konten unit, serta pengelolaan struktur unit (arsipkan dengan `archived: true`), pengelolaan `allowedEmails`, dan pembaruan profil pengguna (`role`, `unit`, `unitPath`, `active`, `jabatan`, `displayName`). |
| `admin` *(alias warisan)* | Super Admin | Seluruh unit | Dipertahankan setara dengan `super_admin` pada `firestore.rules` dan klien agar data proyek yang sudah memakai nilai `admin` tetap berfungsi. |

## Logika Cakupan (*Scope*) Hierarki

Setiap unit di koleksi `units/{unitId}` menyimpan `ancestorIds` (daftar ID leluhur berurutan dari root `bps-pusat` hingga induk langsungnya). Setiap dokumen `users/{uid}` menyimpan `unitPath = unit.ancestorIds.concat([unitId])`.

1. **Pada `firestore.rules`:**
   - Fungsi `inScope(unitId)` bernilai benar jika `unitId == user.unit` **atau** `user.unit in get(/databases/$(database)/documents/units/$(unitId)).data.ancestorIds`.
   - Pada koleksi `units/{unitId}`, pengecekan memanfaatkan `resource.data.ancestorIds` secara langsung sehingga tidak menambah pembacaan dokumen (`get()`). Total panggilan `get()` per permintaan tetap di bawah batas 10 (maksimal 3–4 dokumen berbeda).
2. **Pada klien (`src/state/index.js`):**
   - `AppState.canManageUnit(unitId)` menjadi satu-satunya sumber kebenaran UI untuk hak pengelolaan: `super_admin`/`admin` selalu `true`, `head_*` bernilai `true` bila `unitId` sama dengan unit pengguna atau `user.unit` berada di `ancestorIds` unit target berdasarkan struktur statis `src/data/bps-structure.json`.
   - Penyembunyian tombol UI hanya untuk kenyamanan pengguna; penegakan keamanan tetap berada di `firestore.rules`.

## Batas XP Quest (`QUEST_XP_MAX_*`)

- **Pimpinan (`head_e2`, `head_e1`, `head_top`):** XP *quest* dibatasi **`1 <= xp <= 100`** (`QUEST_XP_MAX_HEAD = 100`) untuk mencegah inflasi XP tidak wajar antarunit.
- **Super Admin (`super_admin`, `admin`):** XP *quest* dibatasi **`1 <= xp <= 500`** (`QUEST_XP_MAX_ADMIN = 500`) untuk kebutuhan misi lintas lembaga atau kegiatan khusus.
- **Validasi Tipe Quest:** `checkpoint` wajib memiliki objek `quiz` (`question` 3–200 karakter, `options` 2–4 string masing-masing 1–100 karakter, `correctIndex` bilangan bulat dalam rentang indeks `options`). `daily` dilarang menyertakan `quiz`.

## Mengapa Unit Tidak Pernah Dihapus Permanen (*Hard Delete*)

- Koleksi `units/{unitId}` melarang operasi `delete` (`allow delete: if false;`) bagi semua peran, termasuk `super_admin`.
- Penonaktifan unit dilakukan melalui kolom `archived: true` agar referensi riwayat pada `users.unit`, `users.unitPath`, `quests.unitId`, dan `completions.unitId` tidak putus dan data leaderboard maupun audit historis tetap konsisten.
- Hal serupa berlaku bagi pimpinan (`head_*`) terhadap *quest*: pimpinan hanya menonaktifkan *quest* dengan `active: false` sehingga riwayat penyelesaian (`completions`) pegawai tidak kehilangan rujukan dokumen *quest*.

## Pengelolaan Akun Melalui `allowedEmails` + Profil `users`

- Pembuatan atau penghapusan akun Firebase Authentication langsung dari aplikasi klien (tanpa kredensial pengguna tersebut) membutuhkan **Firebase Admin SDK** di sisi server (misalnya Cloud Functions), yang memerlukan paket berbayar **Blaze**.
- Karena proyek berjalan tanpa Cloud Functions / Blaze, siklus hidup akun dikelola melalui dua koleksi Firestore:
  1. `allowedEmails/{lowercasedEmail}`: dikelola `super_admin` untuk menentukan email yang diizinkan, `role`, `unit`, `jabatan`, dan status `active`.
  2. `users/{uid}`: dibuat otomatis saat pegawai mendaftar/verifikasi email atau masuk dengan Google untuk pertama kali; `super_admin` dapat mengubah `role`, `unit`, `unitPath`, `active`, `jabatan`, dan `displayName` akun lain (namun dilarang mengubah `role` atau `active` miliknya sendiri untuk mencegah penguncian atau eskalasi hak akses sendiri).
- Akun dengan `active: false` pada `allowedEmails` atau `users` ditolak saat masuk, dikeluarkan (*sign out*), serta diblokir di `firestore.rules` dari klaim `completions` dan pembaruan profil.

## Keterbatasan yang Diketahui (*Known Limitations*)

1. **Dokumen `users` dapat dibaca semua pengguna masuk:** `allow read: if isSignedIn()` dipertahankan untuk kebutuhan papan peringkat (*leaderboard*) dan tampilan daftar tim. Akibatnya, kolom pada dokumen `users` (termasuk `email`) secara teknis dapat dibaca oleh pengguna lain yang sudah terautentikasi; oleh karena itu antarmuka tim non-`super_admin` menyembunyikan email pada tampilan klien, dan data sensitif lain tidak disimpan di dokumen `users`.
2. **Kunci jawaban kuis (`quiz.correctIndex`) terbaca klien:** Karena pengecekan jawaban dilakukan di klien sebelum klaim *quest* tanpa Cloud Functions, field `quiz.correctIndex` pada dokumen `quests` dapat dibaca oleh klien yang sudah masuk. Pengaman tetap dijaga pada batas XP, `periodKey` berbasis waktu server Jakarta, kecocokan unit, dan pencegahan klaim ganda.
