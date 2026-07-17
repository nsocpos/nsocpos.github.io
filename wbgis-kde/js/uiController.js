/**
 * uiController.js
 * Modul untuk mengontrol UI dan interaksi pengguna
 */

const UIController = (function() {
    'use strict';
    
    // DOM Elements cache
    const elements = {};
    let eventListeners = [];
    let isInitialized = false;
    
    /**
     * Inisialisasi UI Controller
     */
    function init() {
        if (isInitialized) return;
        
        // Cache DOM elements
        elements.loadingOverlay = document.getElementById('loadingOverlay');
        elements.totalData = document.getElementById('totalData');
        elements.totalPoints = document.getElementById('totalPoints');
        elements.densestArea = document.getElementById('densestArea');
        elements.avgDensity = document.getElementById('avgDensity');
        elements.radiusDisplay = document.getElementById('radiusDisplay');
        elements.infoBox = document.getElementById('infoBox');
        elements.infoContent = document.getElementById('infoContent');
        
        // Control elements
        elements.analysisMethod = document.getElementById('analysisMethod');
        elements.kdeRadius = document.getElementById('kdeRadius');
        elements.filterRegional = document.getElementById('filterRegional');
        elements.showHeatmap = document.getElementById('showHeatmap');
        elements.showMarkers = document.getElementById('showMarkers');
        elements.showCluster = document.getElementById('showCluster');
        
        // Setup event listeners
        setupEventListeners();
        
        isInitialized = true;
    }
    
    /**
     * Setup event listeners untuk UI
     */
    function setupEventListeners() {
        // Radius slider
        if (elements.kdeRadius) {
            const updateRadius = function() {
                const val = elements.kdeRadius.value;
                if (elements.radiusDisplay) {
                    elements.radiusDisplay.textContent = val + ' km';
                }
            };
            elements.kdeRadius.addEventListener('input', updateRadius);
            eventListeners.push({ element: elements.kdeRadius, event: 'input', handler: updateRadius });
        }
        
        // Analysis method change
        if (elements.analysisMethod) {
            const onMethodChange = function() {
                const method = elements.analysisMethod.value;
                // Show/hide radius slider based on method
                if (elements.kdeRadius) {
                    elements.kdeRadius.disabled = (method === 'cluster');
                }
            };
            elements.analysisMethod.addEventListener('change', onMethodChange);
            eventListeners.push({ element: elements.analysisMethod, event: 'change', handler: onMethodChange });
            // Trigger initial
            onMethodChange();
        }
    }
    
    /**
     * Menampilkan loading overlay
     * @param {string} message - Pesan loading
     */
    function showLoading(message = 'Memuat Data...') {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.remove('hidden');
            const textEl = elements.loadingOverlay.querySelector('.loading-text');
            if (textEl) textEl.textContent = message;
        }
    }
    
    /**
     * Menyembunyikan loading overlay
     */
    function hideLoading() {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.add('hidden');
        }
    }
    
    /**
     * Update informasi data
     * @param {number} total - Total data
     */
    function updateDataInfo(total) {
        if (elements.totalData) {
            elements.totalData.textContent = total;
        }
        if (elements.totalPoints) {
            elements.totalPoints.textContent = total;
        }
    }
    
    /**
     * Update statistik kepadatan
     * @param {Object} stats - Statistik dari KDE
     */
    function updateDensityStats(stats) {
        if (!stats) {
            if (elements.densestArea) elements.densestArea.textContent = '-';
            if (elements.avgDensity) elements.avgDensity.textContent = '-';
            return;
        }
        
        if (elements.densestArea && stats.densestPoint) {
            const p = stats.densestPoint;
            elements.densestArea.textContent = `${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`;
        }
        
        if (elements.avgDensity && stats.average !== undefined) {
            elements.avgDensity.textContent = stats.average.toFixed(4);
        }
    }
    
    /**
     * Populate filter dropdown dengan data regional
     * @param {Array} regionals - Daftar regional
     */
    function populateRegionalFilter(regionals) {
        if (!elements.filterRegional) return;
        
        // Clear existing options (keep 'all')
        elements.filterRegional.innerHTML = '';
        
        // Add 'all' option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Semua Regional';
        elements.filterRegional.appendChild(allOption);
        
        // Add regional options
        regionals.forEach(reg => {
            const option = document.createElement('option');
            option.value = reg;
            option.textContent = reg;
            elements.filterRegional.appendChild(option);
        });
    }
    
    /**
     * Menampilkan info box
     * @param {string} message - Pesan info
     * @param {number} duration - Durasi tampil (ms)
     */
    function showInfo(message, duration = 5000) {
        if (elements.infoBox && elements.infoContent) {
            elements.infoContent.innerHTML = message;
            elements.infoBox.classList.add('active');
            
            // Auto hide
            clearTimeout(elements.infoTimeout);
            elements.infoTimeout = setTimeout(() => {
                elements.infoBox.classList.remove('active');
            }, duration);
        }
    }
    
    /**
     * Menyembunyikan info box
     */
    function hideInfo() {
        if (elements.infoBox) {
            elements.infoBox.classList.remove('active');
            clearTimeout(elements.infoTimeout);
        }
    }
    
    /**
     * Mendapatkan nilai kontrol dari UI
     * @returns {Object} - Nilai kontrol
     */
    function getControlValues() {
        return {
            method: elements.analysisMethod ? elements.analysisMethod.value : 'kde',
            radius: elements.kdeRadius ? parseFloat(elements.kdeRadius.value) : 5,
            regional: elements.filterRegional ? elements.filterRegional.value : 'all',
            showHeatmap: elements.showHeatmap ? elements.showHeatmap.checked : true,
            showMarkers: elements.showMarkers ? elements.showMarkers.checked : true,
            showCluster: elements.showCluster ? elements.showCluster.checked : true
        };
    }
    
    /**
     * Cleanup event listeners
     */
    function destroy() {
        eventListeners.forEach(({ element, event, handler }) => {
            if (element) {
                element.removeEventListener(event, handler);
            }
        });
        eventListeners = [];
        isInitialized = false;
    }
    
    // Public API
    return {
        init: init,
        showLoading: showLoading,
        hideLoading: hideLoading,
        updateDataInfo: updateDataInfo,
        updateDensityStats: updateDensityStats,
        populateRegionalFilter: populateRegionalFilter,
        showInfo: showInfo,
        hideInfo: hideInfo,
        getControlValues: getControlValues,
        destroy: destroy
    };
})();

// Ekspor untuk penggunaan global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}