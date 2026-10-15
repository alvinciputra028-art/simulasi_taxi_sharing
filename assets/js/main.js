/**
 * main.js
 * Entry point aplikasi WebGIS Simulasi Taxi-Sharing.
 * Menginisialisasi komponen dan mengikat seluruh event listener antarmuka pengguna.
 */

import { state } from './state.js';
import { supadioLatLng } from './config.js';
import { initMap, clearVehicleLayers } from './map.js';
import { dom, updateStatus, updatePassengerCountDisplay, sembunyikanPesanan } from './ui.js';
import { dapatkanRuteOSRM } from './routing.js';
import { bersihkanPenumpang, generatePenumpang, updateRadiusPenumpang } from './passenger.js';
import { mulaiSimulasi, terimaPesanan, tolakPesanan } from './simulation.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inisialisasi Peta
    const map = initMap();

    // Sinkronisasi nilai awal input jumlah penumpang
    const initialPassCount = parseInt(dom.inputPassCount.value, 10) || 1;
    state.currentPassengersCount = initialPassCount;
    updatePassengerCountDisplay();

    // Fungsi sinkronisasi jumlah penumpang pertama secara real-time
    function syncPassengerCount() {
        if (state.isAnimating) return;

        let passInput = parseInt(dom.inputPassCount.value, 10);
        if (isNaN(passInput)) return;

        if (passInput > 4) passInput = 4;
        if (passInput < 1) passInput = 1;
        dom.inputPassCount.value = passInput;

        state.currentPassengersCount = passInput;
        updatePassengerCountDisplay();

        // Jika Titik A sudah ada di peta, perbarui popup informasinya secara real-time
        if (state.startMarker) {
            state.startMarker.setPopupContent(`Titik A (${state.currentPassengersCount} Orang)`);
        }
    }

    dom.inputPassCount.addEventListener('input', syncPassengerCount);
    dom.inputPassCount.addEventListener('change', () => {
        if (state.isAnimating) return;
        let passInput = parseInt(dom.inputPassCount.value, 10) || 1;
        if (passInput > 4) passInput = 4;
        if (passInput < 1) passInput = 1;
        dom.inputPassCount.value = passInput;
        syncPassengerCount();
    });

    // 2. Tombol: Tetapkan Titik Awal Penumpang (Titik A)
    dom.btnSetStart.addEventListener('click', () => {
        state.isSettingStart = true;
        map.getContainer().style.cursor = 'crosshair';
        updateStatus("Klik pada peta untuk menetapkan Titik A");
    });

    // 3. Event Klik Peta: Menentukan Titik A dan Kalkulasi Rute Awal
    map.on('click', async (e) => {
        if (!state.isSettingStart) return;

        state.isSettingStart = false;
        map.getContainer().style.cursor = '';
        updateStatus("Mencari rute terbaik...");

        // Validasi & Reset Jumlah Penumpang Awal
        let passInput = parseInt(dom.inputPassCount.value, 10) || 1;
        if (passInput > 4) passInput = 4;
        if (passInput < 1) passInput = 1;
        dom.inputPassCount.value = passInput;

        state.currentPassengersCount = passInput;
        state.unvisitedPickups = [];
        updatePassengerCountDisplay();
        sembunyikanPesanan();

        clearVehicleLayers();
        bersihkanPenumpang();

        state.startMarker = L.marker(e.latlng)
            .addTo(map)
            .bindPopup(`Titik A (${state.currentPassengersCount} Orang)`)
            .openPopup();

        // Cari rute OSRM: Titik A -> Bandara Supadio
        const success = await dapatkanRuteOSRM([[e.latlng.lat, e.latlng.lng], supadioLatLng]);

        if (success) {
            dom.btnGenerate.disabled = false;
            dom.btnPlay.disabled = false;
            updateStatus("Rute ditemukan. Siap simulasi.");
        }
    });

    // 4. Tombol: Sebar Penumpang Acak
    dom.btnGenerate.addEventListener('click', () => {
        const radius = parseFloat(dom.inputRadius.value) || 1500;
        generatePenumpang(radius);
        updateStatus("50 Penumpang disebar (Fokus sekitar jalur).");
    });

    // 5. Input: Perubahan Radius Dinamis
    dom.inputRadius.addEventListener('input', () => {
        const currentRadius = parseFloat(dom.inputRadius.value) || 1500;
        if (state.taxiRadiusCircle) {
            state.taxiRadiusCircle.setRadius(currentRadius);
        }
        updateRadiusPenumpang(currentRadius);
    });

    // 6. Tombol: Jalankan Simulasi
    dom.btnPlay.addEventListener('click', () => {
        mulaiSimulasi();
    });

    // 7. Tombol Panel Pesanan: Terima dan Tolak
    dom.btnAccept.addEventListener('click', async () => {
        await terimaPesanan();
    });

    dom.btnReject.addEventListener('click', () => {
        tolakPesanan();
    });
});
