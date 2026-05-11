/* ============================================================
   app.js — Shared state, API helpers, utilities
   All page-specific JS files depend on this being loaded first.
   ============================================================ */
'use strict';

// ─── Shared state (persisted in sessionStorage) ───────────────
const Store = {
  _key: 'ef_state',

  get() {
    try { return JSON.parse(sessionStorage.getItem(this._key)) || {}; }
    catch { return {}; }
  },

  set(data) {
    sessionStorage.setItem(this._key, JSON.stringify(data));
  },

  update(patch) {
    this.set({ ...this.get(), ...patch });
  },

  clear() {
    sessionStorage.removeItem(this._key);
  },
};

// ─── DOM helpers ─────────────────────────────────────────────
const $  = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ─── Status dot / text ───────────────────────────────────────
function setStatus(text, mode = '') {
  const dot  = $('statusDot');
  const span = $('statusText');
  if (!dot || !span) return;
  span.textContent = text;
  dot.className = 'status-dot' + (mode ? ' ' + mode : '');
}

// ─── Toast ───────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = $('appToast');
  const body  = $('toastBody');
  if (!toast || !body) return;
  toast.className = `toast align-items-center border-0 toast-${type}`;
  body.textContent = message;
  bootstrap.Toast.getOrCreateInstance(toast, { delay: 4000 }).show();
}

// ─── Loading overlay ─────────────────────────────────────────
function showLoading(msg = 'Processing…', sub = '') {
  const overlay = $('loadingOverlay');
  const txt     = $('loadingText');
  const sub_el  = $('loadingSubText');
  if (!overlay) return;
  if (txt)    txt.textContent    = msg;
  if (sub_el) sub_el.textContent = sub;
  overlay.classList.remove('d-none');
  setStatus(msg, 'loading');
}

function hideLoading() {
  const overlay = $('loadingOverlay');
  if (overlay) overlay.classList.add('d-none');
}

// ─── API helpers ─────────────────────────────────────────────
async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiUpload(url, formData) {
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Init status on every page ───────────────────────────────
(function initStatus() {
  const s = Store.get();
  if (s.dataLoaded) {
    setStatus(`${s.dataPoints} data points loaded`, 'active');
  } else {
    setStatus('No data loaded');
  }
})();
