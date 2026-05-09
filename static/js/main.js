/* ============================================================
   ElectroForecast – Multi-page main.js
   ============================================================ */
'use strict';

// ─── State ───────────────────────────────────────────────────
const state = {
  historicalDates:  [],
  historicalValues: [],
  forecastData:     null,
};

// ─── DOM helpers ─────────────────────────────────────────────
const $ = id => document.getElementById(id);

// Navbar
const statusDot  = $('statusDot');
const statusText = $('statusText');

// Page 1
const btnSample      = $('btnSample');
const uploadZone     = $('uploadZone');
const fileInput      = $('fileInput');
const uploadFeedback = $('uploadFeedback');
const dataPreview    = $('dataPreview');
const previewMsg     = $('previewMsg');
const previewPoints  = $('previewPoints');
const previewStart   = $('previewStart');
const previewEnd     = $('previewEnd');
const btnGoToConfigure = $('btnGoToConfigure');

// Page 2
const btnAutoParams    = $('btnAutoParams');
const autoParamsResult = $('autoParamsResult');
const horizonSlider    = $('horizonSlider');
const horizonLabel     = $('horizonLabel');
const btnForecast      = $('btnForecast');
const btnBackToData    = $('btnBackToData');
const paramInputs = {
  p: $('paramP'), d: $('paramD'), q: $('paramQ'),
  P: $('paramSP'), D: $('paramSD'), Q: $('paramSQ'), s: $('paramS'),
};

// Page 3
const statMAE    = $('statMAE');
const statRMSE   = $('statRMSE');
const statAIC    = $('statAIC');
const statPoints = $('statPoints');
const forecastCanvas    = $('forecastChart');
const forecastTableBody = $('forecastTableBody');
const modelSummary      = $('modelSummary');
const btnDownload    = $('btnDownload');
const btnNewForecast = $('btnNewForecast');
const btnChangeData  = $('btnChangeData');

// Loading
const loadingOverlay = $('loadingOverlay');
const loadingText    = $('loadingText');
const loadingSubText = $('loadingSubText');

// ─── Chart ───────────────────────────────────────────────────
let chartInstance = null;

// ─── Page navigation ─────────────────────────────────────────
const pages = ['page-data', 'page-configure', 'page-results'];
const steps = ['step1', 'step2', 'step3'];

function navigateTo(pageId) {
  pages.forEach(id => {
    const el = $(id);
    el.classList.toggle('active', id === pageId);
  });

  const idx = pages.indexOf(pageId);
  steps.forEach((id, i) => {
    const btn = $(id);
    btn.classList.remove('active', 'done');
    if (i < idx)  btn.classList.add('done');
    if (i === idx) btn.classList.add('active');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Wizard step clicks
steps.forEach((id, i) => {
  $(id).addEventListener('click', () => {
    // Only allow going back or to already-accessible steps
    const currentIdx = pages.findIndex(p => $(p).classList.contains('active'));
    if (i <= currentIdx) navigateTo(pages[i]);
    // Going forward only allowed if data is loaded
    if (i === 1 && state.historicalDates.length) navigateTo(pages[1]);
    if (i === 2 && state.forecastData) navigateTo(pages[2]);
  });
});

// ─── Utilities ───────────────────────────────────────────────
function showLoading(msg = 'Processing…', sub = '') {
  loadingText.textContent    = msg;
  loadingSubText.textContent = sub;
  loadingOverlay.classList.remove('d-none');
  statusDot.className = 'status-dot loading';
}

function hideLoading() {
  loadingOverlay.classList.add('d-none');
}

function setStatus(text, active = false) {
  statusText.textContent = text;
  statusDot.className = 'status-dot' + (active ? ' active' : '');
}

function showToast(message, type = 'info') {
  const toast = $('appToast');
  const body  = $('toastBody');
  toast.className = `toast align-items-center border-0 toast-${type}`;
  body.textContent = message;
  bootstrap.Toast.getOrCreateInstance(toast, { delay: 4000 }).show();
}

function getParams() {
  return {
    p: parseInt(paramInputs.p.value, 10) || 0,
    d: parseInt(paramInputs.d.value, 10) || 0,
    q: parseInt(paramInputs.q.value, 10) || 0,
    P: parseInt(paramInputs.P.value, 10) || 0,
    D: parseInt(paramInputs.D.value, 10) || 0,
    Q: parseInt(paramInputs.Q.value, 10) || 0,
    s: parseInt(paramInputs.s.value, 10) || 7,
    horizon: parseInt(horizonSlider.value, 10) || 30,
  };
}

function setParams(params) {
  ['p','d','q','P','D','Q','s'].forEach(k => {
    if (params[k] !== undefined) {
      paramInputs[k].value = params[k];
      paramInputs[k].classList.add('param-updated');
      setTimeout(() => paramInputs[k].classList.remove('param-updated'), 900);
    }
  });
}

// ─── API ─────────────────────────────────────────────────────
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

// ─── Apply loaded data ────────────────────────────────────────
function applyHistoricalData(data) {
  state.historicalDates  = data.dates;
  state.historicalValues = data.values;

  // Show preview
  previewMsg.textContent    = data.message;
  previewPoints.textContent = data.dates.length.toLocaleString();
  previewStart.textContent  = data.dates[0];
  previewEnd.textContent    = data.dates[data.dates.length - 1];
  dataPreview.classList.remove('d-none');

  setStatus(`${data.dates.length} data points loaded`, true);
}

// ─── Page 1: Load sample data ─────────────────────────────────
btnSample.addEventListener('click', async () => {
  showLoading('Loading sample data…');
  try {
    const data = await apiGet('/api/sample-data');
    if (!data.success) throw new Error(data.error);
    applyHistoricalData(data);
    showToast(data.message, 'success');
  } catch (err) {
    showToast('Failed to load sample data: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
});

// ─── Page 1: File upload ──────────────────────────────────────
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFileUpload(fileInput.files[0]);
});

async function handleFileUpload(file) {
  if (!file.name.endsWith('.csv')) {
    showToast('Please upload a CSV file.', 'error');
    return;
  }
  showLoading('Uploading and processing CSV…');
  uploadFeedback.innerHTML = '';
  try {
    const fd = new FormData();
    fd.append('file', file);
    const data = await apiUpload('/api/upload', fd);
    if (!data.success) throw new Error(data.error);
    applyHistoricalData(data);
    showToast(data.message, 'success');
    uploadFeedback.innerHTML = `<span class="text-success"><i class="bi bi-check-circle me-1"></i>${data.message}</span>`;
  } catch (err) {
    showToast('Upload failed: ' + err.message, 'error');
    uploadFeedback.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle me-1"></i>${err.message}</span>`;
  } finally {
    hideLoading();
  }
}

// ─── Page 1 → Page 2 ─────────────────────────────────────────
btnGoToConfigure.addEventListener('click', () => navigateTo('page-configure'));

// ─── Page 2: Back ────────────────────────────────────────────
btnBackToData.addEventListener('click', () => navigateTo('page-data'));

// ─── Page 2: Auto-detect params ──────────────────────────────
btnAutoParams.addEventListener('click', async () => {
  if (!state.historicalDates.length) {
    showToast('Load data first.', 'info');
    return;
  }
  showLoading('Running grid search…', 'Testing parameter combinations by AIC — this may take a minute.');
  autoParamsResult.textContent = '';
  try {
    const s = parseInt(paramInputs.s.value, 10) || 7;
    const data = await apiPost('/api/auto-params', { s });
    if (!data.success) throw new Error(data.error);
    setParams(data.params);
    autoParamsResult.textContent = `✓ Best AIC ${data.aic} — tested ${data.models_tried} models`;
    showToast(`Best params found (AIC ${data.aic})`, 'success');
  } catch (err) {
    showToast('Auto-detect failed: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
});

// ─── Page 2: Horizon slider ───────────────────────────────────
horizonSlider.addEventListener('input', () => {
  const v = horizonSlider.value;
  horizonLabel.textContent = `${v} day${v > 1 ? 's' : ''}`;
});

// ─── Page 2: Run forecast ─────────────────────────────────────
btnForecast.addEventListener('click', async () => {
  if (!state.historicalDates.length) {
    showToast('Load data first.', 'info');
    return;
  }
  showLoading('Fitting SARIMA model…', 'Generating forecast and confidence intervals.');
  try {
    const params = getParams();
    const data = await apiPost('/api/forecast', params);
    if (!data.success) throw new Error(data.error);

    state.forecastData = data;

    // Stats
    statMAE.textContent    = data.metrics.mae.toFixed(3);
    statRMSE.textContent   = data.metrics.rmse.toFixed(3);
    statAIC.textContent    = data.metrics.aic.toFixed(1);
    statPoints.textContent = data.historical.dates.length.toLocaleString();

    // Chart
    renderChart(data.historical, data.fitted, data.forecast);

    // Table
    renderForecastTable(data.forecast);

    // Model summary
    renderModelSummary(data.params, data.metrics);

    setStatus('Forecast ready', true);
    showToast(`Forecast complete — ${data.forecast.dates.length} days ahead.`, 'success');
    navigateTo('page-results');
  } catch (err) {
    showToast('Forecast failed: ' + err.message, 'error');
    setStatus('Forecast error');
  } finally {
    hideLoading();
  }
});

// ─── Chart ───────────────────────────────────────────────────
function renderChart(historical, fitted, forecast) {
  const datasets = [];

  if (forecast) {
    datasets.push({
      label: 'Upper CI',
      data: forecast.dates.map((d, i) => ({ x: d, y: forecast.upper[i] })),
      borderColor: 'transparent',
      backgroundColor: 'rgba(249,115,22,0.15)',
      fill: '+1', pointRadius: 0, tension: 0.3, order: 4,
    });
    datasets.push({
      label: 'Lower CI',
      data: forecast.dates.map((d, i) => ({ x: d, y: forecast.lower[i] })),
      borderColor: 'transparent',
      backgroundColor: 'rgba(249,115,22,0.15)',
      fill: false, pointRadius: 0, tension: 0.3, order: 5,
    });
  }

  datasets.push({
    label: 'Historical',
    data: historical.dates.map((d, i) => ({ x: d, y: historical.values[i] })),
    borderColor: '#4e9af1', backgroundColor: 'rgba(78,154,241,0.06)',
    borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: false, order: 2,
  });

  if (fitted) {
    datasets.push({
      label: 'Fitted',
      data: fitted.dates.map((d, i) => ({ x: d, y: fitted.values[i] })),
      borderColor: 'rgba(78,154,241,0.4)', borderWidth: 1,
      borderDash: [4, 3], pointRadius: 0, tension: 0.3, fill: false, order: 3,
    });
  }

  if (forecast) {
    datasets.push({
      label: 'Forecast',
      data: forecast.dates.map((d, i) => ({ x: d, y: forecast.values[i] })),
      borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)',
      borderWidth: 2.5, borderDash: [6, 3], pointRadius: 0, tension: 0.3, fill: false, order: 1,
    });
  }

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(forecastCanvas, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 700, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1c2230', borderColor: '#30363d', borderWidth: 1,
          titleColor: '#e6edf3', bodyColor: '#8b949e', padding: 10,
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === 'Upper CI' || ctx.dataset.label === 'Lower CI') return null;
              const v = ctx.parsed.y;
              if (v == null) return null;
              return ` ${ctx.dataset.label}: ${v.toFixed(2)} kWh`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'category',
          ticks: { color: '#8b949e', maxTicksLimit: 12, maxRotation: 0, font: { size: 11 } },
          grid: { color: 'rgba(48,54,61,0.6)' },
        },
        y: {
          ticks: { color: '#8b949e', font: { size: 11 }, callback: v => v.toFixed(0) + ' kWh' },
          grid: { color: 'rgba(48,54,61,0.6)' },
        },
      },
    },
  });
}

// ─── Forecast table ───────────────────────────────────────────
function renderForecastTable(forecast) {
  forecastTableBody.innerHTML = '';
  forecast.dates.forEach((date, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${date}</td>
      <td class="fw-semibold">${forecast.values[i].toFixed(2)}</td>
      <td class="text-muted">${forecast.lower[i].toFixed(2)}</td>
      <td class="text-muted">${forecast.upper[i].toFixed(2)}</td>
    `;
    forecastTableBody.appendChild(tr);
  });
}

// ─── Model summary ────────────────────────────────────────────
function renderModelSummary(params, metrics) {
  const rows = [
    ['Model',    `SARIMA(${params.p},${params.d},${params.q})(${params.P},${params.D},${params.Q})[${params.s}]`],
    ['Horizon',  `${state.forecastData.forecast.dates.length} days`],
    ['AIC',      metrics.aic.toFixed(2)],
    ['MAE',      metrics.mae.toFixed(4)],
    ['RMSE',     metrics.rmse.toFixed(4)],
  ];
  modelSummary.innerHTML = rows.map(([k, v]) => `
    <div class="model-summary-row">
      <span class="model-summary-key">${k}</span>
      <span class="model-summary-value">${v}</span>
    </div>
  `).join('');
}

// ─── Page 3: Download CSV ─────────────────────────────────────
btnDownload.addEventListener('click', () => {
  if (!state.forecastData) return;
  const { forecast, params } = state.forecastData;
  const rows = [
    ['date','forecast_kwh','lower_95','upper_95'],
    ...forecast.dates.map((d, i) => [d, forecast.values[i], forecast.lower[i], forecast.upper[i]]),
  ];
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `forecast_SARIMA_${params.p}${params.d}${params.q}_${params.P}${params.D}${params.Q}_s${params.s}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Forecast CSV downloaded.', 'info');
});

// ─── Page 3: New forecast (back to configure) ─────────────────
btnNewForecast.addEventListener('click', () => navigateTo('page-configure'));

// ─── Page 3: Change data source ───────────────────────────────
btnChangeData.addEventListener('click', () => {
  state.historicalDates  = [];
  state.historicalValues = [];
  state.forecastData     = null;
  dataPreview.classList.add('d-none');
  uploadFeedback.innerHTML = '';
  setStatus('No data loaded');
  navigateTo('page-data');
});

// ─── Init ─────────────────────────────────────────────────────
(function init() {
  horizonLabel.textContent = `${horizonSlider.value} days`;
  setStatus('No data loaded');
  navigateTo('page-data');
})();
