# 🚖 WebGIS Simulasi Ride-Sharing Taxi Bandara Supadio

Aplikasi simulasi spasial berbasis web (**WebGIS**) yang memodelkan skenario layanan berbagi tumpangan (*ride-sharing/taxi-pooling*) untuk taksi menuju **Bandara Internasional Supadio (Pontianak - Kubu Raya)**. Proyek ini dibangun menggunakan **Vanilla JavaScript modern (ES6 Modules)**, **Leaflet.js**, dan **Turf.js** tanpa memerlukan bundler atau dependensi eksternal.

---

## 🌟 Fitur Utama

1. **Penetapan Titik Asal & Sinkronisasi Real-Time:**
   - Pengguna dapat menentukan lokasi penjemputan penumpang pertama secara interaktif dengan mengklik area peta.
   - **Sinkronisasi Instan:** Jumlah rombongan penumpang pertama (1–4 orang) terupdate secara real-time pada panel status sidebar dan memperbarui teks popup marker Titik A secara dinamis bahkan setelah marker diletakkan di peta.

2. **Kalkulasi Rute Mengemudi Nyata (OSRM Routing):**
   - Mengintegrasikan API Open Source Routing Machine (OSRM) untuk menghitung rute jaringan jalan nyata dari titik asal ke Bandara Supadio.
   - Menghitung jarak rute dan estimasi waktu tempuh secara otomatis berdasarkan kecepatan kendaraan.

3. **Generator Penumpang Spasial & Proyeksi Rute (Turf.js):**
   - Menyebarkan 50 titik calon penumpang acak yang difokuskan pada koridor di sepanjang garis rute perjalanan.
   - Mengkalkulasi jarak kumulatif proyeksi setiap penumpang terhadap garis rute (`routeDist`) menggunakan `turf.nearestPointOnLine`.
   - Memberikan identitas tiruan (nama, nama jalan, dan jumlah rombongan 1–3 orang).
   - Klasifikasi status visual penumpang:
     - 🔵 **Biru (Waiting):** Berpotensi (dalam radius koridor rute rujukan).
     - 🟢 **Hijau (In Radius):** Di dalam radius jangkauan mobil dan berada di depan arah laju mobil (siap memesan).
     - 🔴 **Merah (Passed / Out of Reach):** Di luar jangkauan atau **sudah terlewat di belakang mobil**.
     - 🟣 **Ungu (Accepted):** Pesanan disetujui untuk dijemput.

4. **Validasi Spasial Terarah & Proteksi Pesanan Kadaluarsa:**
   - **Mencegah Pesanan Terlewat:** Pesanan hanya dapat diajukan oleh penumpang yang posisinya berada di depan taxi (`p.routeDist >= currentTravelDistance`).
   - Penumpang yang telah terlewati secara otomatis berubah menjadi merah (`PASSED`), dan tawaran pesanan yang sedang terbuka akan langsung kadaluarsa.

5. **Jejak Riwayat Perjalanan (*Breadcrumb Trail*):**
   - Taxi meninggalkan garis jejak abu-abu putus-putus (*breadcrumb trail*) di sepanjang jalan yang sudah dilalui.
   - Ketika taxi mengambil rute memutar (*detour*), garis perjalanan dari Titik A ke posisi mobil tetap terjaga utuh bersama marker Titik A asli.

6. **Sistem Pesanan Masuk & Rute Memutar (*Detour Rerouting*) Mulus:**
   - Munculnya panel penawaran pesanan masuk mengambang (*floating modal*) saat taxi melintas dekat penumpang potensial.
   - **Terima:** Mobil menjeda simulasi dengan status informatif (`🔄 Menghitung rute...`), proteksi tombol dari klik ganda, dan OSRM menghitung rute baru melewati titik penjemputan menuju bandara dengan kamera peta yang tetap stabil tanpa sentakan (*smooth zoom*).
   - **Tolak:** Pesanan ditutup dan mobil langsung melanjutkan perjalanan semula.

---

## 🏗️ Struktur Folder Proyek

Proyek ini menggunakan arsitektur modular murni berbasis ES6 Modules:

```text
simulasi_taxi_sharing/
│
├── index.html                     # Halaman utama WebGIS (HTML Semantik)
├── README.md                      # Dokumentasi komprehensif proyek
│
└── assets/
    ├── css/
    │   ├── style.css              # Styling tata letak, sidebar, dan form kontrol
    │   └── map.css                # Styling peta, custom marker Leaflet, dan panel pesanan
    │
    └── js/
        ├── config.js              # Konstanta, koordinat Supadio, data mock, icon Leaflet
        ├── state.js               # Manajemen state terpusat (shared reactive state)
        ├── map.js                 # Inisialisasi peta Leaflet & manajemen layer
        ├── routing.js             # Integrasi OSRM API & kalkulasi polyline GeoJSON
        ├── passenger.js           # Algoritma sebaran spasial Turf.js & kalkulasi proyeksi rute
        ├── simulation.js          # Core engine animasi simulasi, deteksi arah, & detour mulus
        ├── ui.js                  # Referensi DOM & update tampilan antarmuka
        └── main.js                # Entry point utama aplikasi & event listeners
```

---

## 🛠️ Teknologi & Pustaka

- **HTML5 & CSS3:** Tata letak responsif, flexbox, dan custom styling komponen GIS.
- **Vanilla JavaScript (ES6 Modules):** Modularisasi kode murni tanpa bundler atau build tool.
- **[Leaflet.js v1.9.4](https://leafletjs.com/):** Pustaka peta interaktif berbasis web.
- **[Turf.js v6.5.0](https://turfjs.org/):** Pustaka analisis spasial tingkat lanjut (`pointToLineDistance`, `nearestPointOnLine`, `along`, `destination`).
- **[OpenStreetMap](https://www.openstreetmap.org/):** Penyedia peta dasar (*base tile layer*).
- **[OSRM (Open Source Routing Machine)](http://project-osrm.org/):** Layanan routing jaringan jalan raya.

---

## 🚀 Cara Menjalankan

Karena proyek ini menggunakan fitur standar **ES6 Modules**, file web harus dijalankan melalui web server lokal (protokol `http://`):

1. **Pastikan Web Server Aktif:**
   - Buka control panel **XAMPP** dan aktifkan modul **Apache**.
2. **Penempatan Direktori:**
   - Pastikan folder proyek berada di dalam folder `htdocs`, misalnya:
     `c:\xampp_new\htdocs\simulasi_taxi_sharing\`
3. **Buka di Browser:**
   - Buka browser modern (Google Chrome, Microsoft Edge, Mozilla Firefox) dan akses:
     ```
     http://localhost/simulasi_taxi_sharing/
     ```

---

## 📖 Panduan Penggunaan Simulasi

1. **Atur Pengaturan Kendaraan:**
   - Tentukan jumlah penumpang awal yang dibawa taxi (1–4 orang). Informasi pada status sidebar akan langsung tersinkronisasi.
   - Atur kecepatan mobil (km/jam) dan radius penerimaan pesanan (meter).
2. **Tetapkan Titik Awal:**
   - Klik tombol **"📍 Set Titik Penumpang Pertama"**, lalu klik lokasi mana saja pada peta.
   - Rute jalan raya terbaik menuju Bandara Supadio akan digambar otomatis di peta.
3. **Sebarkan Penumpang:**
   - Klik tombol **"🧍‍♂️ Sebar Penumpang Lain (Acak)"** untuk memunculkan 50 calon penumpang di koridor rute.
4. **Mulai Perjalanan:**
   - Klik tombol **"▶ Mulai Perjalanan"** untuk menjalankan animasi taksi. Mobil akan meninggalkan jejak lintasan abu-abu putus-putus.
5. **Respon Pesanan Masuk:**
   - Jika ada penumpang yang cocok dan berada di depan mobil dalam radius, notifikasi pop-up akan muncul.
   - Pilih **Terima** untuk melakukan penjemputan (*detour* rute baru tanpa menghilangkan jejak Titik A) atau **Tolak** untuk terus melanjutkan perjalanan.
6. **Kontrol Simulasi:**
   - Klik **Jeda** untuk menghentikan sementara animasi tanpa mengubah posisi taxi atau progres perjalanan.
   - Klik **Lanjutkan** pada tombol mulai untuk meneruskan simulasi dari posisi terakhir.
   - Klik **Stop/Reset** untuk menghentikan simulasi dan membersihkan rute, marker, serta penumpang sehingga simulasi baru dapat dimulai tanpa me-refresh halaman.
