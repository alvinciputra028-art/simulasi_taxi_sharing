/**
 * config.js
 * Konfigurasi statis, konstanta, data tiruan (mock data), dan icon Leaflet.
 */

export const supadioLatLng = [-0.149830, 109.404610];
export const defaultMapCenter = [-0.0600, 109.3600];
export const defaultZoom = 12;

export const maxPassengersCount = 4;
export const simulationMultiplier = 15;
export const osrmApiBase = 'https://router.project-osrm.org/route/v1/driving/';

export const mockNames = [
    "Budi", "Siti", "Andi", "Rina", "Joko", "Ayu", "Doni",
    "Putri", "Hendra", "Maya", "Rizky", "Lestari", "Agus", "Dewi"
];

export const mockStreets = [
    "Jl. Gajah Mada", "Jl. Tanjungpura", "Jl. Ahmad Yani", "Jl. Imam Bonjol",
    "Jl. Veteran", "Jl. Pahlawan", "Jl. Sutoyo", "Jl. Purnama",
    "Jl. Perdana", "Jl. Ayani 2"
];

export const icons = {
    blue: L.divIcon({ className: 'dot-marker dot-blue', iconSize: [12, 12] }),
    green: L.divIcon({ className: 'dot-marker dot-green', iconSize: [16, 16] }),
    red: L.divIcon({ className: 'dot-marker dot-red', iconSize: [12, 12] }),
    purple: L.divIcon({ className: 'dot-marker dot-purple', iconSize: [16, 16] }),
    taxi: L.divIcon({ className: 'taxi-marker', html: '🚕', iconSize: [30, 30], iconAnchor: [15, 15] })
};
