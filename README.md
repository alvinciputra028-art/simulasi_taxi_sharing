# 🚖 WebGIS Simulasi Ride-Sharing Taxi Bandara Supadio

Aplikasi simulasi spasial berbasis web (**WebGIS**) yang memodelkan skenario layanan berbagi tumpangan (*ride-sharing/taxi-pooling*) untuk taksi menuju **Bandara Internasional Supadio (Pontianak - Kubu Raya)**. Proyek ini dibangun menggunakan **Vanilla JavaScript modern (ES6 Modules)**, **Leaflet.js**, dan **Turf.js** tanpa memerlukan bundler atau dependensi eksternal.

---

## 🌟 Fitur Utama

1. **Penetapan Titik Asal Dinamis (Titik A):**
   - Pengguna dapat menentukan lokasi penjemputan penumpang pertama secara interaktif dengan mengklik area peta.
   - Mengatur kapasitas penumpang awal (1 hingga 4 orang).

2. **Kalkulasi Rute Mengemudi Nyata (OSRM Routing):**
   - Mengintegrasikan API Open Source Routing Machine (OSRM) untuk menghitung rute jaringan jalan nyata dari titik asal ke Bandara Supadio.
   - Menghitung jarak rute dan estimasi waktu tempuh secara otomatis berdasarkan kecepatan kendaraan.

3. **Generator Penumpang Spasial (Turf.js):**
   - Menyebarkan 50 titik calon penumpang acak yang difokuskan pada koridor di sepanjang garis rute perjalanan.
   - Memberikan identitas tiruan (nama, nama jalan, dan jumlah rombongan 1–3 orang).
   - Klasifikasi status visual penumpang berdasarkan radius ambang batas jangkauan rute:
     - 🔵 **Biru:** Berpotensi (dalam radius koridor rute rujukan).
     - 🔴 **Merah:** Di luar jangkauan rute / terlewat.

4. **Simulasi Pergerakan Taxi & Radius Deteksi Real-Time:**
   - Animasi pergerakan taxi berbasis frame (`requestAnimationFrame`) sepanjang geometri polyline GeoJSON.
   - Lingkaran radius dinamis di sekitar taxi yang memindai calon penumpang di sekitarnya.
   - Penumpang yang berada di dalam radius taxi berubah menjadi 🟢 **Hijau** (layak memesan).

5. **Sistem Pesanan Masuk & Rute Memutar (*Detour Rerouting*):**
   - Munculnya panel penawaran pesanan masuk secara mengambang (*floating modal*) saat taxi melintas dekat penumpang potensial.
   - **Terima:** Mobil menjeda perjalanan, penumpang berubah menjadi 🟣 **Ungu**, dan rute dihitung ulang secara dinamis melewati titik jemput tambahan sebelum menuju bandara.
   - **Tolak:** Pesanan ditutup dan mobil melanjutkan rute yang ada.

---

## 🏗️ Struktur Folder Proyek

Proyek ini telah direfaktor menggunakan arsitektur modular yang rapi:

```text
simulasi_taxi_sharing/
│
├── index.html                     # Halaman utama WebGIS (HTML Semantik)
├── README.md                      # Dokumentasi proyek
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
        ├── passenger.js           # Algoritma sebaran spasial Turf.js & status penumpang
        ├── simulation.js          # Core engine animasi simulasi & dynamic detour
        ├── ui.js                  # Referensi DOM & update tampilan antarmuka
        └── main.js                # Entry point utama aplikasi
```

---

## 🛠️ Teknologi & Pustaka

- **HTML5 & CSS3:** Tata letak responsif, flexbox, dan custom styling komponen GIS.
- **Vanilla JavaScript (ES6 Modules):** Modularisasi kode murni tanpa build tool.
- **[Leaflet.js v1.9.4](https://leafletjs.com/):** Pustaka peta interaktif berbasis web.
- **[Turf.js v6.5.0](https://turfjs.org/):** Pustaka analisis spasial tingkat lanjut (perhitungan jarak titik ke garis, interpolasi rute, dan offset destinasi).
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
   - Tentukan jumlah penumpang awal yang dibawa taxi (1–4 orang).
   - Atur kecepatan mobil (km/jam) dan radius penerimaan pesanan (meter).
2. **Tetapkan Titik Awal:**
   - Klik tombol **"📍 Set Titik Penumpang Pertama"**, lalu klik lokasi mana saja pada peta.
   - Rute jalan raya terbaik menuju Bandara Supadio akan digambar otomatis di peta.
3. **Sebarkan Penumpang:**
   - Klik tombol **"🧍‍♂️ Sebar Penumpang Lain (Acak)"** untuk memunculkan 50 calon penumpang di sekitar koridor rute.
4. **Mulai Perjalanan:**
   - Klik tombol **"▶ Mulai Perjalanan"** untuk menjalankan animasi taksi.
5. **Respon Pesanan Masuk:**
   - Jika ada penumpang yang cocok dalam radius, notifikasi pop-up akan muncul. Pilih **Terima** untuk melakukan penjemputan (*detour* rute baru) atau **Tolak** untuk terus melanjutkan perjalanan.
