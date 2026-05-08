/* ============================================================
   ElectroForecast – main.js
   ============================================================ */

'use strict';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const state = {
  historicalDates:  [],
  historicalValues: [],
  forecastData:     null,   // full forecast response
};

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const $ = id => document.getElementById(id);

const btnSample      = $('btnSample');
const btnAutoParams  = $('btnAutoParams');
const btnForecast    = $('btnForecast');
const btnDownload    = $('btnDownload');
const fileInput      = $('fileInput');
const uploadZone     = $('uploadZone');
const uploadFeedback = $('uploadFeedback');
const horizonSlider  = $('horizonSlider');
const horizonLabel   = $('horizonLabel');
const statusDot      = $('statusDot');
const statusText     = $('statusText');
const loadingOverlay = $('loadingOverlay');
const loadingText    = $('loadingText');
const chartPlaceholder = $('chartPlaceholder');
const forecastCanvas   = $('forecastChart');
const tableCard        = $('tableCard');
const forecastTableBody = $('forecastTableBody');

// Stat elements
const statMAE    = $('statMAE');
const statRMSE   = $('statRMSE');
const statAIC    = $('statAIC');
const statPoints = $('statPoints');

// Param inputs
const paramInputs = {
  p:  $('paramP'),
  d:  $('paramD'),
  q:  $('paramQ'),
  P:  $('paramSP'),
  D:  $('paramSD'),
  Q:  $('paramSQ'),
  s:  $('paramS'),
};

// ---------------------------------------------------------------------------
// Chart instance
// ---------------------------------------------------------------------------
let chartInstance = null;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function showLoading(msg = 'Processing…') {
  loadingText.textContent = msg;
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
  const bsToast = bootstrap.Toast.getOrCreateInstance(toast, { delay: 4000 });
  bsToast.show();
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
  const keys = ['p', 'd', 'q', 'P', 'D', 'Q', 's'];
  keys.forEach(k => {
    if (params[k] !== undefined) {
      paramInputs[k].value = params[k];
      paramInputs[k].classList.add('param-updated');
      setTimeout(() => paramInputs[k].classList.remove('param-updated'), 900);
    }
  });
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Data loading helpers
// ---------------------------------------------------------------------------

function applyHistoricalData(data) {
  state.historicalDates  = data.dates;
  state.historicalValues = data.values;
  statPoints.textContent = data.dates.length.toLocaleString();
  setStatus(`${data.dates.length} data points loaded`, true);
  renderHistoricalOnly();
}

// ---------------------------------------------------------------------------
// Chart rendering
// ---------------------------------------------------------------------------

function buildChartDatasets(historical, fitted, forecast) {
  const datasets = [];

  // 1. Confidence interval (filled area) – rendered first so it sits behind
  if (forecast) {
    const ciData = forecast.dates.map((d, i) => ({ x: d, y: forecast.upper[i] }));
    const ciDataLow = forecast.dates.map((d, i) => ({ x: d, y: forecast.lower[i] }));

    datasets.push({
      label: 'Upper CI',
      data: ciData,
      borderColor: 'transparent',
      backgroundColor: 'rgba(249,115,22,0.18)',
      fill: '+1',
      pointRadius: 0,
      tension: 0.3,
      order: 4,
    });
    datasets.push({
      label: 'Lower CI',
      data: ciDataLow,
      borderColor: 'transparent',
      backgroundColor: 'rgba(249,115,22,0.18)',
      fill: false,
      pointRadius: 0,
      tension: 0.3,
      order: 5,
    });
  }

  // 2. Historical
  datasets.push({
    label: 'Historical',
    data: historical.dates.map((d, i) => ({ x: d, y: historical.values[i] })),
    borderColor: '#4e9af1',
    backgroundColor: 'rgba(78,154,241,0.08)',
    borderWidth: 1.5,
    pointRadius: 0,
    tension: 0.3,
    fill: false,
    order: 2,
  });

  // 3. Fitted values
  if (fitted) {
    datasets.push({
      label: 'Fitted',
      data: fitted.dates.map((d, i) => ({ x: d, y: fitted.values[i] })),
      borderColor: 'rgba(78,154,241,0.45)',
      borderWidth: 1,
      borderDash: [4, 3],
      pointRadius: 0,
      tension: 0.3,
      fill: false,
      order: 3,
    });
  }

  // 4. Forecast
  if (forecast) {
    datasets.push({
      label: 'Forecast',
      data: forecast.dates.map((d, i) => ({ x: d, y: forecast.values[i] })),
      borderColor: '#f97316',
      backgroundColor: 'rgba(249,115,22,0.15)',
      borderWidth: 2.5,
      borderDash: [6, 3],
      pointRadius: 0,
      tension: 0.3,
      fill: false,
      order: 1,
    });
  }

  return datasets;
}

function renderChart(historical, fitted = null, forecast = null) {
  chartPlaceholder.style.display = 'none';
  forecastCanvas.style.display   = 'block';

  const datasets = buildChartDatasets(historical, fitted, forecast);

  const chartConfig = {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 600, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1c2230',
          borderColor: '#30363d',
          borderWidth: 1,
          titleColor: '#e6edf3',
          bodyColor: '#8b949e',
          padding: 10,
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === 'Upper CI' || ctx.dataset.label === 'Lower CI') return null;
              const val = ctx.parsed.y;
              if (val === null || val === undefined) return null;
              return ` ${ctx.dataset.label}: ${val.toFixed(2)} kWh`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'category',
          ticks: {
            color: '#8b949e',
            maxTicksLimit: 12,
            maxRotation: 0,
            font: { size: 11 },
          },
          grid: { color: 'rgba(48,54,61,0.6)' },
        },
        y: {
          ticks: {
            color: '#8b949e',
            font: { size: 11 },
            callback: v => v.toFixed(0) + ' kWh',
          },
          grid: { color: 'rgba(48,54,61,0.6)' },
        },
      },
    },
  };

  if (chartInstance) {
    chartInstance.destroy();
  }
  chartInstance = new Chart(forecastCanvas, chartConfig);
}

function renderHistoricalOnly() {
  renderChart(
    { dates: state.historicalDates, values: state.historicalValues },
    null,
    null
  );
}

// ---------------------------------------------------------------------------
// Forecast table
// ---------------------------------------------------------------------------

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
  tableCard.style.display = 'block';
}

// ---------------------------------------------------------------------------
// Event: Load sample data
// ---------------------------------------------------------------------------

btnSample.addEventListener('click', async () => {
  showLoading('Loading sample data…');
  try {
    const data = await apiGet('/api/sample-data');
    if (!data.success) throw new Error(data.error);
    applyHistoricalData(data);
    showToast(data.message, 'success');
    uploadFeedback.innerHTML = `<span class="text-success"><i class="bi bi-check-circle me-1"></i>${data.message}</span>`;
  } catch (err) {
    showToast('Failed to load sample data: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
});

// ---------------------------------------------------------------------------
// Event: File upload
// ---------------------------------------------------------------------------

uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFileUpload(file);
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
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiUpload('/api/upload', formData);
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

// ---------------------------------------------------------------------------
// Event: Auto-detect parameters
// ---------------------------------------------------------------------------

btnAutoParams.addEventListener('click', async () => {
  if (!state.historicalDates.length) {
    showToast('Load data first before auto-detecting parameters.', 'info');
    return;
  }
  showLoading('Running grid search for best SARIMA parameters…\nThis may take a minute.');
  try {
    const s = parseInt(paramInputs.s.value, 10) || 7;
    const data = await apiPost('/api/auto-params', { s });
    if (!data.success) throw new Error(data.error);
    setParams(data.params);
    showToast(
      `Best params found (AIC ${data.aic}) after testing ${data.models_tried} models.`,
      'success'
    );
  } catch (err) {
    showToast('Auto-detect failed: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
});

// ---------------------------------------------------------------------------
// Event: Horizon slider
// ---------------------------------------------------------------------------

horizonSlider.addEventListener('input', () => {
  const v = horizonSlider.value;
  horizonLabel.textContent = `${v} day${v > 1 ? 's' : ''}`;
});

// ---------------------------------------------------------------------------
// Event: Run forecast
// ---------------------------------------------------------------------------

btnForecast.addEventListener('click', async () => {
  if (!state.historicalDates.length) {
    showToast('Load data first before running a forecast.', 'info');
    return;
  }
  showLoading('Fitting SARIMA model and generating forecast…');
  try {
    const params = getParams();
    const data = await apiPost('/api/forecast', params);
    if (!data.success) throw new Error(data.error);

    state.forecastData = data;

    // Update stats
    statMAE.textContent  = data.metrics.mae.toFixed(3);
    statRMSE.textContent = data.metrics.rmse.toFixed(3);
    statAIC.textContent  = data.metrics.aic.toFixed(1);

    // Render chart
    renderChart(
      data.historical,
      data.fitted,
      data.forecast
    );

    // Render table
    renderForecastTable(data.forecast);

    // Enable download
    btnDownload.disabled = false;

    showToast(
      `Forecast complete — ${data.forecast.dates.length} days ahead.`,
      'success'
    );
    setStatus('Forecast ready', true);
  } catch (err) {
    showToast('Forecast failed: ' + err.message, 'error');
    setStatus('Forecast error');
  } finally {
    hideLoading();
  }
});

// ---------------------------------------------------------------------------
// Event: Download CSV
// ---------------------------------------------------------------------------

btnDownload.addEventListener('click', () => {
  if (!state.forecastData) return;

  const { forecast, params } = state.forecastData;
  const rows = [
    ['date', 'forecast_kwh', 'lower_95', 'upper_95'],
    ...forecast.dates.map((d, i) => [
      d,
      forecast.values[i],
      forecast.lower[i],
      forecast.upper[i],
    ]),
  ];

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `forecast_SARIMA_${params.p}${params.d}${params.q}_${params.P}${params.D}${params.Q}_s${params.s}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Forecast CSV downloaded.', 'info');
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

(function init() {
  horizonLabel.textContent = `${horizonSlider.value} days`;
  setStatus('No data loaded');
})();
