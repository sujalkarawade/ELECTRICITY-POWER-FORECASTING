/* ============================================================
   page_data.js — Step 1: Data Source logic
   ============================================================ */
'use strict';

const btnSample      = $('btnSample');
const uploadZone     = $('uploadZone');
const fileInput      = $('fileInput');
const uploadFeedback = $('uploadFeedback');
const dataPreview    = $('dataPreview');
const previewMsg     = $('previewMsg');
const previewPoints  = $('previewPoints');
const previewStart   = $('previewStart');
const previewEnd     = $('previewEnd');
const btnContinue    = $('btnContinue');

// ── Restore preview if data already loaded ────────────────────
(function restorePreview() {
  const s = Store.get();
  if (s.dataLoaded) {
    previewMsg.textContent    = s.dataMessage || 'Data loaded.';
    previewPoints.textContent = s.dataPoints;
    previewStart.textContent  = s.dataStart;
    previewEnd.textContent    = s.dataEnd;
    dataPreview.classList.remove('d-none');
  }
})();

// ── Apply loaded data ─────────────────────────────────────────
function applyData(data) {
  Store.update({
    dataLoaded:  true,
    dataMessage: data.message,
    dataPoints:  data.dates.length,
    dataStart:   data.dates[0],
    dataEnd:     data.dates[data.dates.length - 1],
    dates:       data.dates,
    values:      data.values,
    // clear any previous forecast
    forecastData: null,
  });

  previewMsg.textContent    = data.message;
  previewPoints.textContent = data.dates.length.toLocaleString();
  previewStart.textContent  = data.dates[0];
  previewEnd.textContent    = data.dates[data.dates.length - 1];
  dataPreview.classList.remove('d-none');

  setStatus(`${data.dates.length} data points loaded`, 'active');
}

// ── Load sample data ──────────────────────────────────────────
btnSample.addEventListener('click', async () => {
  showLoading('Loading sample data…');
  try {
    const data = await apiGet('/api/sample-data');
    if (!data.success) throw new Error(data.error);
    applyData(data);
    showToast(data.message, 'success');
  } catch (err) {
    showToast('Failed to load sample data: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
});

// ── File upload ───────────────────────────────────────────────
uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleUpload(fileInput.files[0]);
});

async function handleUpload(file) {
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
    applyData(data);
    showToast(data.message, 'success');
    uploadFeedback.innerHTML = `<span class="text-success"><i class="bi bi-check-circle me-1"></i>${data.message}</span>`;
  } catch (err) {
    showToast('Upload failed: ' + err.message, 'error');
    uploadFeedback.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle me-1"></i>${err.message}</span>`;
  } finally {
    hideLoading();
  }
}

// ── Continue to configure ─────────────────────────────────────
btnContinue.addEventListener('click', () => {
  if (!Store.get().dataLoaded) {
    showToast('Please load data first.', 'info');
    return;
  }
  window.location.href = '/configure';
});
