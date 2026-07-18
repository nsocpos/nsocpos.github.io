/**
 * uiController.js
 * Modul untuk mengontrol UI dan interaksi pengguna
 */

const UIController = (function() {
    'use strict';
    
    const elements = {};
    let eventListeners = [];
    let isInitialized = false;
    let infoTimeout = null;
    
    function init() {
        if (isInitialized) return;
        
        elements.loadingOverlay = document.getElementById('loadingOverlay');
        elements.totalData = document.getElementById('totalData');
        elements.totalPoints = document.getElementById('totalPoints');
        elements.densestArea = document.getElementById('densestArea');
        elements.avgDensity = document.getElementById('avgDensity');
        elements.radiusDisplay = document.getElementById('radiusDisplay');
        elements.infoBox = document.getElementById('infoBox');
        elements.infoContent = document.getElementById('infoContent');
        elements.methodDisplay = document.getElementById('methodDisplay');
        
        elements.analysisMethod = document.getElementById('analysisMethod');
        elements.kdeRadius = document.getElementById('kdeRadius');
        elements.pointRadius = document.getElementById('pointRadius');
        elements.filterRegional = document.getElementById('filterRegional');
        elements.filterPaket = document.getElementById('filterPaket');
        elements.showHeatmap = document.getElementById('showHeatmap');
        elements.showMarkers = document.getElementById('showMarkers');
        elements.showHotspots = document.getElementById('showHotspots');
        elements.showColdspots = document.getElementById('showColdspots');
        
        setupEventListeners();
        isInitialized = true;
    }
    
    function setupEventListeners() {
        // KDE Radius slider
        if (elements.kdeRadius) {
            const updateKdeRadius = function() {
                const val = elements.kdeRadius.value;
                if (elements.radiusDisplay) {
                    elements.radiusDisplay.textContent = val + ' km';
                }
            };
            elements.kdeRadius.addEventListener('input', updateKdeRadius);
            eventListeners.push({ element: elements.kdeRadius, event: 'input', handler: updateKdeRadius });
        }
        
        // Point Radius slider
        if (elements.pointRadius) {
            const updatePointRadius = function() {
                const val = elements.pointRadius.value;
                const display = document.getElementById('pointRadiusDisplay');
                if (display) {
                    display.textContent = val + ' km';
                }
            };
            elements.pointRadius.addEventListener('input', updatePointRadius);
            eventListeners.push({ element: elements.pointRadius, event: 'input', handler: updatePointRadius });
        }
        
        // Analysis method change
        if (elements.analysisMethod) {
            const onMethodChange = function() {
                const method = elements.analysisMethod.value;
                const kdeGroup = document.querySelector('.kde-group');
                const pointGroup = document.querySelector('.point-group');
                
                if (kdeGroup) kdeGroup.style.display = method === 'kde' ? 'block' : 'none';
                if (pointGroup) pointGroup.style.display = method === 'point' ? 'block' : 'none';
                
                if (elements.methodDisplay) {
                    const labels = {
                        'kde': 'Kernel Density Estimation (KDE)',
                        'point': 'Point Density Analysis'
                    };
                    elements.methodDisplay.textContent = labels[method] || method;
                }
            };
            elements.analysisMethod.addEventListener('change', onMethodChange);
            eventListeners.push({ element: elements.analysisMethod, event: 'change', handler: onMethodChange });
            onMethodChange();
        }
    }
    
    function showLoading(message = 'Memuat Data...') {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.remove('hidden');
            const textEl = elements.loadingOverlay.querySelector('.loading-text');
            if (textEl) textEl.textContent = message;
        }
    }
    
    function hideLoading() {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.classList.add('hidden');
        }
    }
    
    function updateDataInfo(total) {
        if (elements.totalData) elements.totalData.textContent = total;
        if (elements.totalPoints) elements.totalPoints.textContent = total;
    }
    
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
    
    function populateRegionalFilter(regionals) {
        if (!elements.filterRegional) return;
        elements.filterRegional.innerHTML = '';
        
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Semua Regional';
        elements.filterRegional.appendChild(allOption);
        
        regionals.forEach(reg => {
            const option = document.createElement('option');
            option.value = reg;
            option.textContent = reg;
            elements.filterRegional.appendChild(option);
        });
    }
    
    function populatePaketFilter(pakets) {
        if (!elements.filterPaket) return;
        elements.filterPaket.innerHTML = '';
        
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Semua Paket';
        elements.filterPaket.appendChild(allOption);
        
        pakets.forEach(paket => {
            const option = document.createElement('option');
            option.value = paket;
            option.textContent = paket;
            elements.filterPaket.appendChild(option);
        });
    }
    
    function showInfo(message, duration = 5000) {
        if (elements.infoBox && elements.infoContent) {
            elements.infoContent.innerHTML = message;
            elements.infoBox.classList.add('active');
            
            clearTimeout(infoTimeout);
            infoTimeout = setTimeout(() => {
                elements.infoBox.classList.remove('active');
            }, duration);
        }
    }
    
    function hideInfo() {
        if (elements.infoBox) {
            elements.infoBox.classList.remove('active');
            clearTimeout(infoTimeout);
        }
    }
    
    function getControlValues() {
        return {
            method: elements.analysisMethod ? elements.analysisMethod.value : 'kde',
            kdeRadius: elements.kdeRadius ? parseFloat(elements.kdeRadius.value) : 5,
            pointRadius: elements.pointRadius ? parseFloat(elements.pointRadius.value) : 5,
            regional: elements.filterRegional ? elements.filterRegional.value : 'all',
            paket: elements.filterPaket ? elements.filterPaket.value : 'all',
            showHeatmap: elements.showHeatmap ? elements.showHeatmap.checked : true,
            showMarkers: elements.showMarkers ? elements.showMarkers.checked : true,
            showHotspots: elements.showHotspots ? elements.showHotspots.checked : true,
            showColdspots: elements.showColdspots ? elements.showColdspots.checked : true
        };
    }
    
    function destroy() {
        eventListeners.forEach(({ element, event, handler }) => {
            if (element) {
                element.removeEventListener(event, handler);
            }
        });
        eventListeners = [];
        isInitialized = false;
    }
    
    return {
        init: init,
        showLoading: showLoading,
        hideLoading: hideLoading,
        updateDataInfo: updateDataInfo,
        updateDensityStats: updateDensityStats,
        populateRegionalFilter: populateRegionalFilter,
        populatePaketFilter: populatePaketFilter,
        showInfo: showInfo,
        hideInfo: hideInfo,
        getControlValues: getControlValues,
        destroy: destroy
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}
