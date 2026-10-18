/**
 * simulation.js
 * Core engine simulasi perjalanan taxi, animasi frame-by-frame, evaluasi spasial,
 * dan manajemen penjemputan dinamis (ride-sharing detour).
 */

import { state } from './state.js';
import { map, clearRoute, clearVehicleLayers } from './map.js';
import { icons, supadioLatLng, maxPassengersCount, simulationMultiplier } from './config.js';
import { dom, updateStatus, updateTampilanEstimasi, updatePassengerCountDisplay, tampilkanPesanan, sembunyikanPesanan, updateAcceptedOrders } from './ui.js';
import { bersihkanPenumpang, resetStatusPenumpang, updatePassengersRouteDist } from './passenger.js';
import { dapatkanRuteOSRM } from './routing.js';

/**
 * Memulai animasi simulasi perjalanan taxi dari titik asal ke bandara.
 */
export function mulaiSimulasi() {
    if (!state.routeGeoJSON || state.isAnimating) return;

    const melanjutkan = state.isPaused;
    if (!melanjutkan) {
        state.currentTravelDistance = 0;
        state.lastTimestamp = null;
        resetStatusPenumpang();
    }

    state.isAnimating = true;
    state.isPaused = false;

    // Kunci tombol pengaturan saat simulasi berjalan
    dom.btnPlay.disabled = true;
    dom.btnPlay.innerText = "▶ Mulai Perjalanan";
    dom.btnPause.disabled = false;
    dom.btnReset.disabled = false;
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

    // Inisialisasi jejak perjalanan yang sudah dilalui (breadcrumb trail)
    if (!melanjutkan && state.traveledPolyline) {
        map.removeLayer(state.traveledPolyline);
        state.traveledPolyline = null;
    }
    if (!melanjutkan) {
        state.traveledCoords = [startLatLng];
    }

    state.animationFrameId = requestAnimationFrame(animasiPerjalanan);
}

export function jedaSimulasi() {
    if (!state.isAnimating) return;

    state.isAnimating = false;
    state.isPaused = true;
    if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
    }

    dom.btnPlay.disabled = false;
    dom.btnPlay.innerText = "▶ Lanjutkan";
    dom.btnPause.disabled = true;
    updateStatus("Simulasi dijeda.");
}

export function resetSimulasi() {
    if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
    }

    state.isAnimating = false;
    state.isPaused = false;
    state.animationFrameId = null;
    state.isSettingStart = false;
    state.currentTravelDistance = 0;
    state.lastTimestamp = 0;
    state.currentPassengersCount = parseInt(dom.inputPassCount.value, 10) || 1;
    state.unvisitedPickups = [];

    sembunyikanPesanan();
    bersihkanPenumpang();
    clearVehicleLayers();
    clearRoute();

    dom.btnSetStart.disabled = false;
    dom.btnGenerate.disabled = true;
    dom.btnPlay.disabled = true;
    dom.btnPlay.innerText = "▶ Mulai Perjalanan";
    dom.btnPause.disabled = true;
    dom.btnReset.disabled = true;
    dom.inputPassCount.disabled = false;
    updatePassengerCountDisplay();
    updateAcceptedOrders();
    updateStatus("Menunggu Titik A");
    dom.infoDist.innerText = "-";
    dom.infoEta.innerText = "-";
}

/**
 * Loop animasi pergerakan taxi menggunakan requestAnimationFrame.
 */
export function animasiPerjalanan(timestamp) {
    if (!state.isAnimating) return;

    try {
        // Inisialisasi timestamp frame pertama agar dt tidak pernah negatif
        if (!state.lastTimestamp) {
            state.lastTimestamp = timestamp;
        }

        const dt = Math.max(0, timestamp - state.lastTimestamp);
        state.lastTimestamp = timestamp;

        const speedKmh = parseFloat(dom.inputSpeed.value) || 60;
        const speedMs = (speedKmh * 1000 / 3600) * simulationMultiplier;

        state.currentTravelDistance += speedMs * (dt / 1000);

        if (state.currentTravelDistance >= state.totalRouteDistance) {
            state.currentTravelDistance = state.totalRouteDistance;
            state.isAnimating = false;
        }

        // Pastikan jarak aman antara 0 dan total jarak rute agar turf.along tidak pernah error
        const safeDist = Math.max(0, Math.min(state.currentTravelDistance, state.totalRouteDistance));
        const currentPoint = turf.along(state.routeGeoJSON, safeDist, { units: 'meters' });
        const currentLng = currentPoint.geometry.coordinates[0];
        const currentLat = currentPoint.geometry.coordinates[1];
        const currentLatLng = [currentLat, currentLng];

        state.taxiMarker.setLatLng(currentLatLng);
        state.taxiRadiusCircle.setLatLng(currentLatLng);

        // Perbarui garis jejak rute yang sudah dilalui (warna abu-abu putus-putus)
        const lastCoord = state.traveledCoords[state.traveledCoords.length - 1];
        if (!lastCoord || L.latLng(lastCoord).distanceTo(currentLatLng) > 15) {
            state.traveledCoords.push(currentLatLng);
            if (!state.traveledPolyline) {
                state.traveledPolyline = L.polyline(state.traveledCoords, {
                    color: '#7f8c8d',
                    weight: 4,
                    dashArray: '6, 6',
                    opacity: 0.75
                }).addTo(map);
            } else {
                state.traveledPolyline.setLatLngs(state.traveledCoords);
            }
        }

        const currentRadius = parseFloat(dom.inputRadius.value) || 1500;
        state.taxiRadiusCircle.setRadius(currentRadius);

        evaluasiPenumpang(currentLng, currentLat, currentRadius);
        cobaMunculkanPesanan();
        updateTampilanEstimasi();

    } catch (err) {
        console.error("Simulation animation error:", err);
    }

    if (state.isAnimating) {
        state.animationFrameId = requestAnimationFrame(animasiPerjalanan);
    } else {
        updateStatus("Tiba di Bandara Supadio.");
        dom.btnSetStart.disabled = false;
        dom.btnPlay.disabled = false;
        dom.btnPlay.innerText = "▶ Mulai Ulang";
        dom.btnPause.disabled = true;
        dom.btnReset.disabled = false;
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
        if (p.state === 'OUT_OF_REACH' || p.state === 'ONBOARD' || p.state === 'PASSED') return;

        const personPt = turf.point(p.coords);
        const jarak = turf.distance(taxiPt, personPt, { units: 'meters' });

        // 1. Logika jika taxi telah sampai di titik jemput penumpang (toleransi 100 meter)
        if (p.state === 'ACCEPTED' && jarak <= 100) {
            p.state = 'ONBOARD';
            p.marker.setOpacity(0); // Sembunyikan dari peta karena sudah di dalam taxi
            updateStatus(`${p.name} berhasil dijemput!`);
            // Hapus dari daftar jemput yang belum dikunjungi
            state.unvisitedPickups = state.unvisitedPickups.filter(
                wp => Math.hypot(wp[0] - p.coords[1], wp[1] - p.coords[0]) > 0.0002
            );
            return;
        }

        // 2. Cek jika taxi sudah melaju melewati posisi proyeksi penumpang (hanya yang belum di-accept)
        if (p.state !== 'ACCEPTED' && p.routeDist !== undefined && state.currentTravelDistance > p.routeDist + 100) {
            p.state = 'PASSED';
            p.marker.setIcon(icons.red);

            if (state.activeRequestPassenger && state.activeRequestPassenger.id === p.id) {
                sembunyikanPesanan();
                updateStatus("Pesanan terlewat (Kadaluarsa).");
            }
            return;
        }

        if (p.state === 'WAITING') {
            // Hanya aktif menjadi IN_RADIUS jika berada dalam radius dan di depan/sejajar taxi
            if (jarak <= radiusMeter && (p.routeDist === undefined || p.routeDist >= state.currentTravelDistance - 50)) {
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

    // Calon = Sedang di dalam Radius Mobil (Hijau) + Belum Pesan + Muat Kursi + Posisi di DEPAN Taxi
    const kandidat = state.passengers.filter(p =>
        p.state === 'IN_RADIUS' &&
        !p.hasRequested &&
        p.partySize <= sisaKapasitas &&
        (p.routeDist === undefined || p.routeDist >= state.currentTravelDistance)
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
    if (!passenger || (state.currentPassengersCount + passenger.partySize) > maxPassengersCount) return;

    // 1. Nonaktifkan tombol sementara untuk mencegah klik berulang saat proses fetch rute
    dom.btnAccept.disabled = true;
    dom.btnReject.disabled = true;

    // Jeda simulasi sementara dengan pesan status yang jelas
    state.isAnimating = false;
    state.isPaused = false;
    if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
    }

    passenger.state = 'ACCEPTED';
    updateAcceptedOrders();

    passenger.marker.setIcon(icons.purple);
    updateStatus(`🔄 Menghitung rute memutar ke ${passenger.name}...`);

    // 2. Simpan titik tujuan jemput [lat, lng]
    state.unvisitedPickups.push([passenger.coords[1], passenger.coords[0]]);

    // 3. Bangun Rute Baru (Posisi Taxi Saat Ini -> Waypoints Jemputan -> Bandara)
    const currentTaxiLatLng = state.taxiMarker.getLatLng();
    const newWaypoints = [
        [currentTaxiLatLng.lat, currentTaxiLatLng.lng],
        ...state.unvisitedPickups,
        supadioLatLng
    ];

    // Request rute OSRM baru (isInitialRoute = false agar kamera tidak meloncat kaget)
    const success = await dapatkanRuteOSRM(newWaypoints, false);

    if (success) {
        state.currentPassengersCount += passenger.partySize;
        updatePassengerCountDisplay();
        updatePassengersRouteDist();

        updateStatus(`Rute memutar aktif! Menuju titik jemput ${passenger.name}...`);
        sembunyikanPesanan();

        // 4. Lanjutkan perjalanan dari titik awal rute baru secara mulus
        state.currentTravelDistance = 0;
        state.lastTimestamp = null;
        state.isAnimating = true;
        state.isPaused = false;
        state.animationFrameId = requestAnimationFrame(animasiPerjalanan);
    } else {
        updateStatus("Gagal menghitung rute memutar. Melanjutkan perjalanan awal...");
        sembunyikanPesanan();
        state.lastTimestamp = null;
        state.isAnimating = true;
        state.isPaused = false;
        state.animationFrameId = requestAnimationFrame(animasiPerjalanan);
    }

    dom.btnAccept.disabled = false;
    dom.btnReject.disabled = false;
}

/**
 * Menolak pesanan masuk dan menutup dialog pesanan.
 */
export function tolakPesanan() {
    sembunyikanPesanan();
    updateStatus("Pesanan ditolak.");
}
