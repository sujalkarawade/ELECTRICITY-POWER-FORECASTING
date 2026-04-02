// Main JavaScript File - Electricity Power Forecasting Web Application

// Global variables
let currentData = null;
let modelTrained = false;
let currentSection = 'upload';

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupNavigation();
    setupEventListeners();
    showSection('upload');
}

// Navigation functionality
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
}

function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Add active class to corresponding nav item
    const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    currentSection = sectionName;
    
    // Initialize section-specific functionality
    initializeSection(sectionName);
}

function initializeSection(sectionName) {
    switch(sectionName) {
        case 'upload':
            initializeUploadSection();
            break;
        case 'model':
            initializeModelSection();
            break;
        case 'data':
            initializeDataSection();
            break;
        case 'visualization':
            initializeVisualizationSection();
            break;
        case 'forecast':
            initializeForecastSection();
            break;
    }
}

// Setup global event listeners
function setupEventListeners() {
    // File upload
    const fileInput = document.getElementById('csvFile');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // Drag and drop
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
    }
    
    // Form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
}

// Loading overlay functionality
function showLoading(message = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    const messageElement = document.getElementById('loadingMessage');
    
    if (overlay && messageElement) {
        messageElement.textContent = message;
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// Status message functionality
function showStatus(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.classList.remove('hidden', 'alert-success', 'alert-error', 'alert-warning', 'alert-info');
    element.classList.add('alert-' + type);
    element.innerHTML = `
        <i class="fas fa-${getIconForType(type)} mr-2"></i>
        ${message}
    `;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
}

function getIconForType(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// API request helper
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(endpoint, finalOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// File upload functionality
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
        showStatus('uploadStatus', 'Please upload a CSV file', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    showLoading('Uploading and processing file...');
    
    apiRequest('/upload', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type for FormData
    })
    .then(data => {
        hideLoading();
        if (data.success) {
            showStatus('uploadStatus', data.message, 'success');
            currentData = data.preview;
            displayDataPreview(data.preview);
            enableModelSection();
        } else {
            showStatus('uploadStatus', data.error, 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showStatus('uploadStatus', 'Error uploading file: ' + error.message, 'error');
    });
}

// Drag and drop handlers
function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const fileInput = document.getElementById('csvFile');
        if (fileInput) {
            fileInput.files = files;
            handleFileUpload({ target: { files: [files[0]] } });
        }
    }
}

// Display data preview
function displayDataPreview(preview) {
    if (!preview) return;
    
    // Update statistics
    const elements = {
        'totalRecords': preview.shape[0],
        'dateRange': `${preview.date_range.start.split('T')[0]} to ${preview.date_range.end.split('T')[0]}`,
        'avgConsumption': Math.round(preview.statistics.consumption_mw.mean) + ' MW'
    };
    
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
    
    // Create table
    createDataTable(preview);
    
    // Show data preview section
    const previewSection = document.getElementById('dataPreview');
    if (previewSection) {
        previewSection.classList.remove('hidden');
    }
}

function createDataTable(preview) {
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    
    if (!tableHeader || !tableBody || !preview) return;
    
    // Create header
    tableHeader.innerHTML = preview.columns.map(col => 
        `<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${col}</th>`
    ).join('');
    
    // Create body
    tableBody.innerHTML = preview.sample_data.map(row => 
        `<tr class="hover:bg-gray-50">
            ${preview.columns.map(col => `<td class="px-4 py-2 text-sm text-gray-900">${row[col]}</td>`).join('')}
        </tr>`
    ).join('');
}

// Model training functionality
function initializeModelSection() {
    if (!currentData) {
        showStatus('modelStatus', 'Please upload data first', 'warning');
        disableModelControls();
    } else {
        enableModelControls();
    }
}

function enableModelSection() {
    const modelNavItem = document.querySelector('[data-section="model"]');
    if (modelNavItem) {
        modelNavItem.classList.remove('disabled');
    }
}

function enableModelControls() {
    const trainButton = document.getElementById('trainModel');
    if (trainButton) {
        trainButton.disabled = false;
    }
}

function disableModelControls() {
    const trainButton = document.getElementById('trainModel');
    if (trainButton) {
        trainButton.disabled = true;
    }
}

function trainModel() {
    const order = [
        parseInt(document.getElementById('order_p').value),
        parseInt(document.getElementById('order_d').value),
        parseInt(document.getElementById('order_q').value)
    ];
    
    const seasonal_order = [
        parseInt(document.getElementById('seasonal_p').value),
        parseInt(document.getElementById('seasonal_d').value),
        parseInt(document.getElementById('seasonal_q').value),
        parseInt(document.getElementById('seasonal_s').value)
    ];
    
    showLoading('Training SARIMA model... This may take several minutes.');
    
    apiRequest('/train_model', {
        method: 'POST',
        body: JSON.stringify({ order, seasonal_order })
    })
    .then(data => {
        hideLoading();
        if (data.success) {
            showStatus('modelStatus', data.message, 'success');
            displayModelResults(data);
            modelTrained = true;
            enableVisualizationSection();
            enableForecastSection();
        } else {
            showStatus('modelStatus', data.error, 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showStatus('modelStatus', 'Error training model: ' + error.message, 'error');
    });
}

function displayModelResults(data) {
    // Update performance metrics
    const metrics = {
        'rmse': data.performance.rmse.toFixed(2) + ' MW',
        'mae': data.performance.mae.toFixed(2) + ' MW',
        'mape': data.performance.mape.toFixed(2) + '%'
    };
    
    Object.keys(metrics).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = metrics[id];
        }
    });
    
    // Load plots
    Object.keys(data.plots).forEach(plotType => {
        const element = document.getElementById(plotType + 'Plot');
        if (element) {
            element.src = data.plots[plotType] + '?t=' + Date.now();
        }
    });
    
    // Show results section
    const resultsSection = document.getElementById('modelResults');
    if (resultsSection) {
        resultsSection.classList.add('active');
    }
}

// Visualization functionality
function initializeVisualizationSection() {
    if (!modelTrained) {
        showStatus('visualizationStatus', 'Please train a model first', 'warning');
        disableVisualizationControls();
    } else {
        enableVisualizationControls();
    }
}

function enableVisualizationSection() {
    const vizNavItem = document.querySelector('[data-section="visualization"]');
    if (vizNavItem) {
        vizNavItem.classList.remove('disabled');
    }
}

function enableVisualizationControls() {
    const vizButtons = document.querySelectorAll('.viz-button');
    vizButtons.forEach(button => {
        button.disabled = false;
    });
}

function disableVisualizationControls() {
    const vizButtons = document.querySelectorAll('.viz-button');
    vizButtons.forEach(button => {
        button.disabled = true;
    });
}

// Data section functionality
function initializeDataSection() {
    if (!currentData) {
        showStatus('dataStatus', 'No data available. Please upload a file first.', 'warning');
        return;
    }
    
    displayDataOverview();
    setupDataFilters();
}

function displayDataOverview() {
    // Implementation for data overview display
    console.log('Displaying data overview');
}

function setupDataFilters() {
    // Implementation for data filters
    console.log('Setting up data filters');
}

// Forecast functionality
function initializeForecastSection() {
    if (!modelTrained) {
        showStatus('forecastStatus', 'Please train a model first', 'warning');
        disableForecastControls();
    } else {
        enableForecastControls();
    }
}

function enableForecastSection() {
    const forecastNavItem = document.querySelector('[data-section="forecast"]');
    if (forecastNavItem) {
        forecastNavItem.classList.remove('disabled');
    }
}

function enableForecastControls() {
    const forecastButton = document.getElementById('generateForecast');
    if (forecastButton) {
        forecastButton.disabled = false;
    }
}

function disableForecastControls() {
    const forecastButton = document.getElementById('generateForecast');
    if (forecastButton) {
        forecastButton.disabled = true;
    }
}

function generateForecast() {
    const steps = parseInt(document.getElementById('forecastHours').value) || 168;
    
    showLoading('Generating forecast...');
    
    apiRequest('/forecast', {
        method: 'POST',
        body: JSON.stringify({ steps })
    })
    .then(data => {
        hideLoading();
        if (data.success) {
            showStatus('forecastStatus', data.message, 'success');
            displayForecastResults(data);
        } else {
            showStatus('forecastStatus', data.error, 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showStatus('forecastStatus', 'Error generating forecast: ' + error.message, 'error');
    });
}

function displayForecastResults(data) {
    // Update statistics
    const stats = {
        'forecastMean': data.forecast_stats.mean.toFixed(2) + ' MW',
        'forecastMin': data.forecast_stats.min.toFixed(2) + ' MW',
        'forecastMax': data.forecast_stats.max.toFixed(2) + ' MW',
        'forecastStd': data.forecast_stats.std.toFixed(2) + ' MW'
    };
    
    Object.keys(stats).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = stats[id];
        }
    });
    
    // Load forecast plot
    const plotElement = document.getElementById('futureForecastPlot');
    if (plotElement) {
        plotElement.src = data.plot + '?t=' + Date.now();
    }
    
    // Show results
    const resultsSection = document.getElementById('forecastResults');
    if (resultsSection) {
        resultsSection.classList.remove('hidden');
    }
}

// Utility functions
function downloadForecast() {
    window.open('/download_forecast', '_blank');
}

function getSampleData() {
    showLoading('Generating sample data...');
    
    apiRequest('/sample_data')
    .then(data => {
        hideLoading();
        if (data.success) {
            window.open(data.download_url, '_blank');
        } else {
            alert('Error generating sample data: ' + data.error);
        }
    })
    .catch(error => {
        hideLoading();
        alert('Error: ' + error.message);
    });
}

// Form submission handler
function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    if (submitButton) {
        submitButton.click();
    }
}

// Export functions for global access
window.showSection = showSection;
window.trainModel = trainModel;
window.generateForecast = generateForecast;
window.downloadForecast = downloadForecast;
window.getSampleData = getSampleData;
window.handleFileUpload = handleFileUpload;
