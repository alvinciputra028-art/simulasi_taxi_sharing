/**
 * simulation.js
 * Core engine simulasi perjalanan taxi, animasi frame-by-frame, evaluasi spasial,
 * dan manajemen penjemputan dinamis (ride-sharing detour).
 */

import { state } from './state.js';
import { map } from './map.js';
import { icons, supadioLatLng, maxPassengersCount, simulationMultiplier } from './config.js';
import { dom, updateStatus, updateTampilanEstimasi, updatePassengerCountDisplay, tampilkanPesanan, sembunyikanPesanan } from './ui.js';
import { resetStatusPenumpang } from './passenger.js';
import { dapatkanRuteOSRM } from './routing.js';

/**
 * Memulai animasi simulasi perjalanan taxi dari titik asal ke bandara.
 */
export function mulaiSimulasi() {
    if (!state.routeGeoJSON || state.isAnimating) return;

    state.currentTravelDistance = 0;
    state.isAnimating = true;

    // Kunci tombol pengaturan saat simulasi berjalan
    dom.btnPlay.disabled = true;
    dom.btnSetStart.disabled = true;
    dom.btnGenerate.disabled = true;
    dom.inputPassCount.disabled = true;
    updateStatus("Taxi sedang dalam perjalanan...");

    const startCoords = state.routeGeoJSON.geometry.coordinates[0];
    const startLatLng = [startCoords[1], startCoords[0]];

    // Buat atau posisikan marker taxi dan lingkaran radius
    if (!state.taxiMarker) {
        state.taxiMarker = L.marker(startLatLng, {
            icon: icons.taxi,
            zIndexOffset: 1000
        }).addTo(map);

        state.taxiRadiusCircle = L.circle(startLatLng, {
            radius: parseFloat(dom.inputRadius.value) || 1500,
            color: '#f39c12',
            fillColor: '#f1c40f',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '5, 5'
        }).addTo(map);
    } else {
        state.taxiMarker.setLatLng(startLatLng);
        state.taxiRadiusCircle.setLatLng(startLatLng);
    }

    resetStatusPenumpang();
    state.lastTimestamp = performance.now();
    requestAnimationFrame(animasiPerjalanan);
}

/**
 * Loop animasi pergerakan taxi menggunakan requestAnimationFrame.
 */
export function animasiPerjalanan(timestamp) {
    if (!state.isAnimating) return;

    const dt = timestamp - state.lastTimestamp;
    state.lastTimestamp = timestamp;

    const speedKmh = parseFloat(dom.inputSpeed.value) || 60;
    const speedMs = (speedKmh * 1000 / 3600) * simulationMultiplier;

    state.currentTravelDistance += speedMs * (dt / 1000);

    if (state.currentTravelDistance >= state.totalRouteDistance) {
        state.currentTravelDistance = state.totalRouteDistance;
        state.isAnimating = false;
    }

    const currentPoint = turf.along(state.routeGeoJSON, state.currentTravelDistance, { units: 'meters' });
    const currentLng = currentPoint.geometry.coordinates[0];
    const currentLat = currentPoint.geometry.coordinates[1];
    const currentLatLng = [currentLat, currentLng];

    state.taxiMarker.setLatLng(currentLatLng);
    state.taxiRadiusCircle.setLatLng(currentLatLng);

    const currentRadius = parseFloat(dom.inputRadius.value) || 1500;
    state.taxiRadiusCircle.setRadius(currentRadius);

    evaluasiPenumpang(currentLng, currentLat, currentRadius);
    cobaMunculkanPesanan();
    updateTampilanEstimasi();

    if (state.isAnimating) {
        state.animationFrameId = requestAnimationFrame(animasiPerjalanan);
    } else {
        updateStatus("Tiba di Bandara Supadio.");
        dom.btnSetStart.disabled = false;
        dom.btnPlay.disabled = false;
        dom.btnGenerate.disabled = false;
        dom.inputPassCount.disabled = false;
    }
}

/**
 * Mengevaluasi jarak penumpang terhadap posisi terkini taxi.
 */
export function evaluasiPenumpang(taxiLng, taxiLat, radiusMeter) {
    const taxiPt = turf.point([taxiLng, taxiLat]);

    state.passengers.forEach(p => {
        if (p.state === 'OUT_OF_REACH' || p.state === 'ONBOARD') return;

        const personPt = turf.point(p.coords);
        const jarak = turf.distance(taxiPt, personPt, { units: 'meters' });

        // Logika jika taxi telah sampai di titik jemput penumpang (Detour Complete)
        if (p.state === 'ACCEPTED' && jarak <= 50) {
            p.state = 'ONBOARD';
            p.marker.setOpacity(0); // Sembunyikan dari peta karena sudah di dalam taxi
            updateStatus(`${p.name} berhasil dijemput!`);
            // Hapus dari daftar jemput yang belum dikunjungi
            state.unvisitedPickups = state.unvisitedPickups.filter(
                wp => wp[0] !== p.coords[1] && wp[1] !== p.coords[0]
            );
            return;
        }

        if (p.state === 'WAITING') {
            if (jarak <= radiusMeter) {
                p.state = 'IN_RADIUS';
                p.marker.setIcon(icons.green);
            }
        } else if (p.state === 'IN_RADIUS') {
            if (jarak > radiusMeter) {
                p.state = 'PASSED';
                p.marker.setIcon(icons.red);

                if (state.activeRequestPassenger && state.activeRequestPassenger.id === p.id) {
                    sembunyikanPesanan();
                    updateStatus("Pesanan terlewat (Kadaluarsa).");
                }
            }
        }
    });
}

/**
 * Mencoba memunculkan permintaan pesanan masuk dari calon penumpang yang berada di radius.
 */
export function cobaMunculkanPesanan() {
    const sisaKapasitas = maxPassengersCount - state.currentPassengersCount;

    if (!state.isAnimating || sisaKapasitas <= 0 || state.activeRequestPassenger || Math.random() > 0.015) {
        return;
    }

    // Calon = Dalam Radius + Belum Pesan + Jumlah Rombongan Muat di Kursi Tersisa
    const kandidat = state.passengers.filter(p =>
        (p.state === 'WAITING' || p.state === 'IN_RADIUS') &&
        !p.hasRequested &&
        p.partySize <= sisaKapasitas
    );

    if (kandidat.length > 0) {
        const terpilih = kandidat[Math.floor(Math.random() * kandidat.length)];
        tampilkanPesanan(terpilih);
    }
}

/**
 * Menyetujui pesanan masuk, menghentikan sementara mobil, dan menghitung ulang rute detour OSRM.
 */
export async function terimaPesanan() {
    const passenger = state.activeRequestPassenger;
    if (passenger && (state.currentPassengersCount + passenger.partySize) <= maxPassengersCount) {
        // 1. Terima dan Jeda Simulasi
        state.isAnimating = false;

        passenger.state = 'ACCEPTED';
        passenger.marker.setIcon(icons.purple);

        state.currentPassengersCount += passenger.partySize;
        updatePassengerCountDisplay();
        updateStatus(`Kalkulasi rute memutar ke ${passenger.name}...`);
        sembunyikanPesanan();

        // 2. Simpan titik tujuan jemput [lat, lng]
        state.unvisitedPickups.push([passenger.coords[1], passenger.coords[0]]);

        // 3. Bangun Rute Baru (Posisi Taxi Saat Ini -> Waypoint Jemputan -> Bandara)
        const currentTaxiLatLng = state.taxiMarker.getLatLng();
        const newWaypoints = [
            [currentTaxiLatLng.lat, currentTaxiLatLng.lng],
            ...state.unvisitedPickups,
            supadioLatLng
        ];

        await dapatkanRuteOSRM(newWaypoints);

        // 4. Lanjutkan perjalanan dari titik awal rute baru
        state.currentTravelDistance = 0;
        state.lastTimestamp = performance.now();
        state.isAnimating = true;
        requestAnimationFrame(animasiPerjalanan);
    }
}

/**
 * Menolak pesanan masuk dan menutup dialog pesanan.
 */
export function tolakPesanan() {
    sembunyikanPesanan();
    updateStatus("Pesanan ditolak.");
}
