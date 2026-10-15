/**
 * state.js
 * Manajemen state reaktif bersama (shared state) untuk simulasi taxi-sharing.
 */

export const state = {
    // Status alur
    isSettingStart: false,
    isAnimating: false,

    // Layer & Marker Leaflet
    startMarker: null,
    taxiMarker: null,
    taxiRadiusCircle: null,
    routePolyline: null,

    // Rute & Jarak
    routeGeoJSON: null,
    totalRouteDistance: 0,
    currentTravelDistance: 0,
    animationFrameId: null,
    lastTimestamp: 0,

    // Penumpang & Penjemputan
    passengers: [],
    unvisitedPickups: [],
    currentPassengersCount: 1,
    activeRequestPassenger: null
};
