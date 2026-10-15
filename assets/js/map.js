/**
 * map.js
 * Inisialisasi peta Leaflet, tile layer, dan manajemen layer pada peta.
 */

import { defaultMapCenter, defaultZoom, supadioLatLng } from './config.js';
import { state } from './state.js';

export let map;

/**
 * Inisialisasi peta dan marker tujuan akhir (Bandara Supadio).
 */
export function initMap() {
    map = L.map('map').setView(defaultMapCenter, defaultZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.marker(supadioLatLng)
        .addTo(map)
        .bindPopup("<b>Bandara Supadio</b><br>Tujuan Akhir")
        .openPopup();

    return map;
}

/**
 * Membersihkan marker titik awal dan kendaraan taxi dari peta.
 */
export function clearVehicleLayers() {
    if (state.startMarker) {
        map.removeLayer(state.startMarker);
        state.startMarker = null;
    }
    if (state.taxiMarker) {
        map.removeLayer(state.taxiMarker);
        state.taxiMarker = null;
    }
    if (state.taxiRadiusCircle) {
        map.removeLayer(state.taxiRadiusCircle);
        state.taxiRadiusCircle = null;
    }
    if (state.traveledPolyline) {
        map.removeLayer(state.traveledPolyline);
        state.traveledPolyline = null;
    }
    state.traveledCoords = [];
}
