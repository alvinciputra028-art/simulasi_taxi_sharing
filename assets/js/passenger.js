/**
 * passenger.js
 * Manajemen pembuatan penumpang tiruan (spasial acak dengan Turf.js) dan statusnya.
 */

import { state } from './state.js';
import { map } from './map.js';
import { mockNames, mockStreets, icons } from './config.js';
import { sembunyikanPesanan } from './ui.js';

/**
 * Menghapus semua marker penumpang dari peta dan mengosongkan state.
 */
export function bersihkanPenumpang() {
    state.passengers.forEach(p => {
        if (p.marker) map.removeLayer(p.marker);
    });
    state.passengers = [];
    sembunyikanPesanan();
}

/**
 * Menghasilkan 50 penumpang acak di koridor rute perjalanan menuju bandara.
 * @param {number} radiusAmbang - Ambang batas radius jangkauan (meter)
 */
export function generatePenumpang(radiusAmbang = 1500) {
    bersihkanPenumpang();
    if (!state.routeGeoJSON) return;

    const routeLength = turf.length(state.routeGeoJSON, { units: 'meters' });

    for (let i = 0; i < 50; i++) {
        // 1. Ambil titik acak di sepanjang garis rute perjalanan
        const randDistAlongRoute = Math.random() * routeLength;
        const ptOnRoute = turf.along(state.routeGeoJSON, randDistAlongRoute, { units: 'meters' });

        // 2. Beri simpangan acak menjauhi rute (antara 50m hingga 3000m)
        const randomOffsetDist = 50 + (Math.random() * 2950);
        const randomBearing = Math.random() * 360;
        const finalPt = turf.destination(ptOnRoute, randomOffsetDist, randomBearing, { units: 'meters' });

        const randLng = finalPt.geometry.coordinates[0];
        const randLat = finalPt.geometry.coordinates[1];

        // 3. Evaluasi apakah penumpang berada dalam radius rute
        const distToRoute = turf.pointToLineDistance(finalPt, state.routeGeoJSON, { units: 'meters' });
        const statusAwal = distToRoute <= radiusAmbang ? 'WAITING' : 'OUT_OF_REACH';
        const iconAwal = statusAwal === 'WAITING' ? icons.blue : icons.red;

        const randName = mockNames[Math.floor(Math.random() * mockNames.length)];
        const randLoc = mockStreets[Math.floor(Math.random() * mockStreets.length)];
        const randParty = Math.floor(Math.random() * 3) + 1; // 1 - 3 orang

        const marker = L.marker([randLat, randLng], { icon: iconAwal }).addTo(map);
        marker.bindPopup(`<b>${randName} (${randParty} Orang)</b><br>${randLoc}`);

        state.passengers.push({
            id: i,
            name: randName,
            loc: randLoc,
            partySize: randParty,
            marker: marker,
            coords: [randLng, randLat],
            state: statusAwal,
            hasRequested: false
        });
    }
}

/**
 * Memperbarui status calon penumpang saat slider radius diubah (sebelum simulasi berjalan).
 * @param {number} currentRadius - Radius penerimaan pesanan saat ini (meter)
 */
export function updateRadiusPenumpang(currentRadius) {
    if (!state.routeGeoJSON || state.isAnimating || state.currentTravelDistance !== 0) return;

    state.passengers.forEach(p => {
        const personPt = turf.point(p.coords);
        const distToRoute = turf.pointToLineDistance(personPt, state.routeGeoJSON, { units: 'meters' });
        if (distToRoute <= currentRadius) {
            p.state = 'WAITING';
            p.marker.setIcon(icons.blue);
        } else {
            p.state = 'OUT_OF_REACH';
            p.marker.setIcon(icons.red);
        }
    });
}

/**
 * Mengembalikan status penumpang yang terlewat kembali ke WAITING jika simulasi diputar ulang.
 */
export function resetStatusPenumpang() {
    state.passengers.forEach(p => {
        if (p.state === 'PASSED' || p.state === 'IN_RADIUS') {
            p.state = 'WAITING';
            p.marker.setIcon(icons.blue);
            p.hasRequested = false;
        }
    });
}
