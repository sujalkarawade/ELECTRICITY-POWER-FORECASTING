/* ============================================================
   page_results.js — Step 3: Results rendering logic
   ============================================================ */
'use strict';

// Guard: redirect if no forecast data
const _s = Store.get();
if (!_s.forecastData) {
  showToast('Run a forecast first.', 'info');
  window.location.href = '/configure';
}

const data = _s.forecastData;

// ── Stat cards ────────────────────────────────────────────────
$('statMAE').textContent    = data.metrics.mae.toFixed(3);
$('statRMSE').textContent   = data.metrics.rmse.toFixed(3);
$('statAIC').textContent    = data.metrics.aic.toFixed(1);
$('statPoints').textContent = data.historical.dates.length.toLocaleString();

// ── Chart ─────────────────────────────────────────────────────
(function renderChart() {
  const { historical, fitted, forecast } = data;
  const datasets = [];

  // Confidence interval band
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

  // Historical
  datasets.push({
    label: 'Historical',
    data: historical.dates.map((d, i) => ({ x: d, y: historical.values[i] })),
    borderColor: '#4e9af1', backgroundColor: 'rgba(78,154,241,0.06)',
    borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: false, order: 2,
  });

  // Fitted
  if (fitted) {
    datasets.push({
      label: 'Fitted',
      data: fitted.dates.map((d, i) => ({ x: d, y: fitted.values[i] })),
      borderColor: 'rgba(78,154,241,0.4)', borderWidth: 1,
      borderDash: [4, 3], pointRadius: 0, tension: 0.3, fill: false, order: 3,
    });
  }

  // Forecast
  datasets.push({
    label: 'Forecast',
    data: forecast.dates.map((d, i) => ({ x: d, y: forecast.values[i] })),
    borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)',
    borderWidth: 2.5, borderDash: [6, 3], pointRadius: 0, tension: 0.3, fill: false, order: 1,
  });

  new Chart($('forecastChart'), {
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
              if (['Upper CI','Lower CI'].includes(ctx.dataset.label)) return null;
              const v = ctx.parsed.y;
              return v != null ? ` ${ctx.dataset.label}: ${v.toFixed(2)} kWh` : null;
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
})();

// ── Forecast table ────────────────────────────────────────────
(function renderTable() {
  const tbody = $('forecastTableBody');
  data.forecast.dates.forEach((date, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${date}</td>
      <td class="fw-semibold">${data.forecast.values[i].toFixed(2)}</td>
      <td class="text-muted">${data.forecast.lower[i].toFixed(2)}</td>
      <td class="text-muted">${data.forecast.upper[i].toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });
})();

// ── Model summary ─────────────────────────────────────────────
(function renderSummary() {
  const p = data.params;
  const m = data.metrics;
  const rows = [
    ['Model',   `SARIMA(${p.p},${p.d},${p.q})(${p.P},${p.D},${p.Q})[${p.s}]`],
    ['Horizon', `${data.forecast.dates.length} days`],
    ['AIC',     m.aic.toFixed(2)],
    ['MAE',     m.mae.toFixed(4)],
    ['RMSE',    m.rmse.toFixed(4)],
  ];
  $('modelSummary').innerHTML = rows.map(([k, v]) => `
    <div class="model-summary-row">
      <span class="model-summary-key">${k}</span>
      <span class="model-summary-value">${v}</span>
    </div>
  `).join('');
})();

// ── Download CSV ──────────────────────────────────────────────
$('btnDownload').addEventListener('click', () => {
  const { forecast, params } = data;
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
