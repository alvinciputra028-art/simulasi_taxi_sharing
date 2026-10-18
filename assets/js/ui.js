/**
 * ui.js
 * Manajemen elemen DOM, pembaruan antarmuka, dan dialog modal pesanan.
 */

import { state } from './state.js';
import { maxPassengersCount } from './config.js';

export const dom = {
    btnSetStart: document.getElementById('btn-set-start'),
    btnGenerate: document.getElementById('btn-generate'),
    btnPlay: document.getElementById('btn-play'),
    btnPause: document.getElementById('btn-pause'),
    btnReset: document.getElementById('btn-reset'),
    inputSpeed: document.getElementById('input-speed'),
    inputRadius: document.getElementById('input-radius'),
    inputPassCount: document.getElementById('input-pass-count'),
    infoPassengers: document.getElementById('info-passengers'),
    infoDist: document.getElementById('info-dist'),
    infoEta: document.getElementById('info-eta'),
    infoStatus: document.getElementById('info-status'),
    requestPanel: document.getElementById('request-panel'),
    reqName: document.getElementById('req-name'),
    reqCount: document.getElementById('req-count'),
    reqLoc: document.getElementById('req-loc'),
    btnAccept: document.getElementById('btn-accept'),
    btnReject: document.getElementById('btn-reject'),
    acceptedOrdersPanel: document.getElementById('accepted-orders-panel'),
    acceptedOrdersList: document.getElementById('accepted-orders-list')
};

/**
 * Memperbarui teks estimasi sisa jarak dan waktu tiba.
 */
export function updateTampilanEstimasi() {
    if (!state.routeGeoJSON) return;

    const speedKmh = parseFloat(dom.inputSpeed.value) || 60;
    const remainingDist = Math.max(0, state.totalRouteDistance - state.currentTravelDistance);
    const timeHours = (remainingDist / 1000) / speedKmh;
    const timeMins = Math.round(timeHours * 60);

    dom.infoDist.innerText = (remainingDist / 1000).toFixed(2) + " km";
    dom.infoEta.innerText = timeMins + " Menit";
}

/**
 * Memperbarui info teks status perjalanan di sidebar.
 */
export function updateStatus(text) {
    dom.infoStatus.innerText = text;
}

/**
 * Memperbarui jumlah penumpang saat ini di sidebar.
 */
export function updatePassengerCountDisplay() {
    dom.infoPassengers.innerText = `${state.currentPassengersCount} / ${maxPassengersCount}`;
}

/**
 * Menampilkan panel popup penawaran pesanan masuk.
 */
export function tampilkanPesanan(penumpang) {
    state.activeRequestPassenger = penumpang;
    penumpang.hasRequested = true;

    dom.reqName.innerText = penumpang.name;
    dom.reqCount.innerText = penumpang.partySize;
    dom.reqLoc.innerText = penumpang.loc;
    dom.requestPanel.classList.remove('hidden');

    penumpang.marker.openPopup();
}

/**
 * Menyembunyikan panel popup pesanan.
 */
export function sembunyikanPesanan() {
    state.activeRequestPassenger = null;
    dom.requestPanel.classList.add('hidden');
}

export function updateAcceptedOrders() {
    const acceptedPassengers = state.passengers.filter(
        passenger => passenger.state === 'ACCEPTED' || passenger.state === 'ONBOARD'
    );

    dom.acceptedOrdersList.innerHTML = acceptedPassengers.map(passenger => `
        <div class="accepted-order">
            <b>${passenger.name}</b>
            <span>${passenger.partySize} orang</span>
            <small>${passenger.loc}</small>
        </div>
    `).join('');
}