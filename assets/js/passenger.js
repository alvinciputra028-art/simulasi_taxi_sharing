/**
 * passenger.js
 * Manajemen pembuatan penumpang tiruan (spasial acak dengan Turf.js) dan statusnya.
 */

import { state } from './state.js';
import { map } from './map.js';
import { mockNames, icons } from './config.js';
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
    return generatePenumpangFromRoads(radiusAmbang);
}

async function snapToRoad(point) {
    const [lng, lat] = point.geometry.coordinates;
    const response = await fetch(
        `https://router.project-osrm.org/nearest/v1/driving/${lng},${lat}?number=1`
    );
    if (!response.ok) {
        throw new Error(`OSRM nearest gagal (${response.status})`);
    }

    const data = await response.json();
    if (data.code !== 'Ok' || !data.waypoints?.length) {
        throw new Error('OSRM nearest tidak menemukan jalan');
    }

    const waypoint = data.waypoints[0];
    return {
        point: turf.point(waypoint.location),
        roadName: waypoint.name?.trim() || null
    };
}

async function reverseGeocodeRoad(point) {
    const [lng, lat] = point.geometry.coordinates;
    const query = new URLSearchParams({
        format: 'jsonv2',
        lat: lat.toString(),
        lon: lng.toString(),
        zoom: '18',
        addressdetails: '1'
    });
    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${query.toString()}`,
        { headers: { 'Accept-Language': 'id' } }
    );
    if (!response.ok) {
        throw new Error(`Reverse geocoding gagal (${response.status})`);
    }

    const data = await response.json();
    const road = data.address?.road || data.address?.pedestrian || data.address?.residential;
    if (!road) {
        throw new Error('Nama jalan tidak tersedia untuk titik tersebut');
    }
    return road;
}

async function createPassenger(radiusAmbang, routeLength, id) {
    const randDistAlongRoute = Math.random() * routeLength;
    const ptOnRoute = turf.along(state.routeGeoJSON, randDistAlongRoute, { units: 'meters' });
    const randomOffsetDist = 20 + (Math.random() * 2980);
    const randomBearing = Math.random() * 360;
    const candidate = turf.destination(ptOnRoute, randomOffsetDist, randomBearing, { units: 'meters' });
    const snapped = await snapToRoad(candidate);
    const roadName = snapped.roadName || await reverseGeocodeRoad(snapped.point);
    const [randLng, randLat] = snapped.point.geometry.coordinates;
    const routePoint = turf.nearestPointOnLine(state.routeGeoJSON, snapped.point, { units: 'meters' });
    const routeDist = routePoint.properties.location || 0;
    const distToRoute = turf.pointToLineDistance(snapped.point, state.routeGeoJSON, { units: 'meters' });
    const statusAwal = distToRoute <= radiusAmbang ? 'WAITING' : 'OUT_OF_REACH';
    const iconAwal = statusAwal === 'WAITING' ? icons.blue : icons.red;
    const randName = mockNames[Math.floor(Math.random() * mockNames.length)];
    const randParty = Math.floor(Math.random() * 3) + 1;
    const marker = L.marker([randLat, randLng], { icon: iconAwal }).addTo(map);
    marker.bindPopup(`<b>${randName} (${randParty} Orang)</b><br>${roadName}`);

    return {
        id,
        name: randName,
        loc: roadName,
        partySize: randParty,
        marker,
        coords: [randLng, randLat],
        routeDist,
        state: statusAwal,
        hasRequested: false
    };
}

async function generatePenumpangFromRoads(radiusAmbang) {
    bersihkanPenumpang();
    if (!state.routeGeoJSON) return;

    const routeLength = turf.length(state.routeGeoJSON, { units: 'meters' });
    const results = await Promise.allSettled(
        Array.from({ length: 50 }, (_, id) => createPassenger(radiusAmbang, routeLength, id))
    );

    results.forEach(result => {
        if (result.status === 'fulfilled') {
            state.passengers.push(result.value);
        } else {
            console.error('Passenger road lookup error:', result.reason);
        }
    });

    return state.passengers.length;
}

/**
 * Memperbarui jarak kumulatif proyeksi penumpang terhadap rute baru (misal setelah rute memutar).
 */
export function updatePassengersRouteDist() {
    if (!state.routeGeoJSON || !state.passengers.length) return;
    state.passengers.forEach(p => {
        const pt = turf.point(p.coords);
        const snapped = turf.nearestPointOnLine(state.routeGeoJSON, pt, { units: 'meters' });
        p.routeDist = snapped.properties.location || 0;
    });
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
        if (p.state !== 'OUT_OF_REACH') {
            p.state = 'WAITING';
            p.marker.setIcon(icons.blue);
            p.hasRequested = false;
            p.marker.setOpacity(1);
        }
    });
}
