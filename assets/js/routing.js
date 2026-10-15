/**
 * routing.js
 * Integrasi API OSRM untuk pencarian rute mengemudi, penggambaran polyline, dan GeoJSON.
 */

import { osrmApiBase } from './config.js';
import { state } from './state.js';
import { map } from './map.js';
import { updateTampilanEstimasi, updateStatus } from './ui.js';

/**
 * Mengambil rute perjalanan terbaik dari OSRM berdasarkan daftar waypoints.
 * @param {Array<[number, number]>} waypoints - Array koordinat [lat, lng]
 * @param {boolean} isInitialRoute - Apakah ini rute awal (true) atau kalkulasi ulang/detour (false)
 */
export async function dapatkanRuteOSRM(waypoints, isInitialRoute = true) {
    try {
        // Format OSRM: lng,lat;lng,lat
        const coordsString = waypoints.map(wp => `${wp[1]},${wp[0]}`).join(';');
        const url = `${osrmApiBase}${coordsString}?overview=full&geometries=geojson`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== 'Ok') throw new Error("Gagal mencari rute dari OSRM");

        const routeData = data.routes[0];
        const coords = routeData.geometry.coordinates; // [lng, lat]
        const leafletCoords = coords.map(c => [c[1], c[0]]); // [lat, lng]

        // Hapus polyline rute lama jika ada
        if (state.routePolyline) {
            map.removeLayer(state.routePolyline);
        }

        state.routePolyline = L.polyline(leafletCoords, {
            color: '#3498db',
            weight: 5,
            opacity: 0.7
        }).addTo(map);

        // Hanya fitBounds pada awal penetapan titik rute agar kamera tidak meloncat kaget saat reroute
        if (isInitialRoute) {
            map.fitBounds(state.routePolyline.getBounds(), { padding: [40, 40] });
        }

        state.routeGeoJSON = turf.lineString(coords);
        state.totalRouteDistance = routeData.distance;

        updateTampilanEstimasi();
        return true;

    } catch (error) {
        console.error("OSRM Routing Error:", error);
        alert("Gagal mendapatkan rute. Coba titik lain.");
        updateStatus("Error rute.");
        return false;
    }
}
