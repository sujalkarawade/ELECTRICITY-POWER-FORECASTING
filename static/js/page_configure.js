/* ============================================================
   page_configure.js — Step 2: Configure SARIMA logic
   ============================================================ */
'use strict';

// Guard: redirect to data page if no data loaded
if (!Store.get().dataLoaded) {
  showToast('Please load data first.', 'info');
  window.location.href = '/';
}

const btnAutoParams    = $('btnAutoParams');
const autoParamsResult = $('autoParamsResult');
const horizonSlider    = $('horizonSlider');
const horizonLabel     = $('horizonLabel');
const btnForecast      = $('btnForecast');

const paramInputs = {
  p: $('paramP'), d: $('paramD'), q: $('paramQ'),
  P: $('paramSP'), D: $('paramSD'), Q: $('paramSQ'), s: $('paramS'),
};

// ── Restore saved params if any ───────────────────────────────
(function restoreParams() {
  const s = Store.get();
  if (s.params) {
    Object.entries(s.params).forEach(([k, v]) => {
      if (paramInputs[k]) paramInputs[k].value = v;
    });
  }
  if (s.horizon) {
    horizonSlider.value      = s.horizon;
    horizonLabel.textContent = `${s.horizon} day${s.horizon > 1 ? 's' : ''}`;
  }
})();

// ── Horizon slider ────────────────────────────────────────────
horizonSlider.addEventListener('input', () => {
  const v = horizonSlider.value;
  horizonLabel.textContent = `${v} day${v > 1 ? 's' : ''}`;
});

// ── Read params from inputs ───────────────────────────────────
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

// ── Set params into inputs ────────────────────────────────────
function setParams(params) {
  ['p','d','q','P','D','Q','s'].forEach(k => {
    if (params[k] !== undefined && paramInputs[k]) {
      paramInputs[k].value = params[k];
      paramInputs[k].classList.add('param-updated');
      setTimeout(() => paramInputs[k].classList.remove('param-updated'), 900);
    }
  });
}

// ── Auto-detect parameters ────────────────────────────────────
btnAutoParams.addEventListener('click', async () => {
  showLoading('Running grid search…', 'Testing parameter combinations by AIC — this may take a minute.');
  autoParamsResult.textContent = '';
  try {
    const s    = parseInt(paramInputs.s.value, 10) || 7;
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

// ── Run forecast ──────────────────────────────────────────────
btnForecast.addEventListener('click', async () => {
  showLoading('Fitting SARIMA model…', 'Generating forecast and confidence intervals.');
  try {
    const params = getParams();

    // Save params to store
    Store.update({ params, horizon: params.horizon });

    const data = await apiPost('/api/forecast', params);
    if (!data.success) throw new Error(data.error);

    // Persist forecast results
    Store.update({ forecastData: data });

    setStatus('Forecast ready', 'active');
    showToast(`Forecast complete — ${data.forecast.dates.length} days ahead.`, 'success');
    window.location.href = '/results';
  } catch (err) {
    showToast('Forecast failed: ' + err.message, 'error');
    setStatus('Forecast error');
  } finally {
    hideLoading();
  }
});
