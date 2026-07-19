/**
 * uiController.js - DENGAN FILTER LAYER DAN TABEL HASIL
 */

const UIController = (function() {
    'use strict';
    
    const elements = {};
    let currentTab = 'all';
    let currentResults = null;
    let currentFilter = 'all';
    
    function init() {
        elements.loadingOverlay = document.getElementById('loadingOverlay');
        elements.totalData = document.getElementById('totalData');
        elements.totalPoints = document.getElementById('totalPoints');
        elements.densestArea = document.getElementById('densestArea');
        elements.avgDensity = document.getElementById('avgDensity');
        elements.radiusDisplay = document.getElementById('radiusDisplay');
        elements.infoBox = document.getElementById('infoBox');
        elements.infoContent = document.getElementById('infoContent');
        elements.dataInfo = document.getElementById('dataInfo');
        elements.resultsPanel = document.getElementById('resultsPanel');
        elements.resultsContent = document.getElementById('resultsContent');
        elements.resultsTitle = document.getElementById('resultsTitle');
        
        elements.analysisMethod = document.getElementById('analysisMethod');
        elements.kdeRadius = document.getElementById('kdeRadius');
        elements.pointRadius = document.getElementById('pointRadius');
        elements.filterRegional = document.getElementById('filterRegional');
        elements.filterPaket = document.getElementById('filterPaket');
        elements.showHeatmap = document.getElementById('showHeatmap');
        elements.showMarkers = document.getElementById('showMarkers');
        elements.showHotspots = document.getElementById('showHotspots');
        elements.showColdspots = document.getElementById('showColdspots');
        
        if (elements.kdeRadius) {
            elements.kdeRadius.addEventListener('input', function() {
                if (elements.radiusDisplay) {
                    elements.radiusDisplay.textContent = this.value + ' km';
                }
            });
        }
        
        if (elements.pointRadius) {
            elements.pointRadius.addEventListener('input', function() {
                const display = document.getElementById('pointRadiusDisplay');
                if (display) {
                    display.textContent = this.value + ' km';
                }
            });
        }
        
        if (elements.analysisMethod) {
            elements.analysisMethod.addEventListener('change', function() {
                const kdeGroup = document.querySelector('.kde-group');
                const pointGroup = document.querySelector('.point-group');
                
                if (kdeGroup) kdeGroup.style.display = this.value === 'kde' ? 'block' : 'none';
                if (pointGroup) pointGroup.style.display = this.value === 'point' ? 'block' : 'none';
            });
        }
        
        document.getElementById('closeResults')?.addEventListener('click', function() {
            if (elements.resultsPanel) {
                elements.resultsPanel.classList.remove('active');
            }
        });
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
        if (elements.dataInfo) {
            elements.dataInfo.innerHTML = 
                `<i class="fas fa-check-circle" style="color: #2e7d32;"></i> ${total} data valid`;
        }
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
            
            clearTimeout(elements.infoTimeout);
            elements.infoTimeout = setTimeout(() => {
                elements.infoBox.classList.remove('active');
            }, duration);
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
    
    function showResultsTable(results, filter = 'all') {
        if (!elements.resultsPanel || !elements.resultsContent) return;
        
        currentResults = results;
        currentFilter = filter;
        elements.resultsPanel.classList.add('active');
        renderFilteredResults(results, filter);
    }
    
    function renderFilteredResults(results, filter) {
        if (!results) return;
        
        let html = '';
        let title = 'Hasil Analisis';
        
        switch(filter) {
            case 'heatmap':
                title = '🔥 Hasil KDE berdasarkan Regional';
                break;
            case 'hotspot':
                title = '🔥 Distribusi Hotspot per Regional';
                break;
            case 'coldspot':
                title = '❄️ Distribusi Coldspot per Regional';
                break;
            case 'marker':
                title = '📍 Distribusi Marker per Regional';
                break;
            default:
                title = '📊 Hasil Analisis Lengkap';
        }
        
        if (elements.resultsTitle) {
            elements.resultsTitle.textContent = title;
        }
        
        html += `
            <div class="summary-stats">
                <div class="stat-item">
                    <div class="stat-value">${results.total || 0}</div>
                    <div class="stat-label">Total Data</div>
                </div>
                <div class="stat-item hotspot">
                    <div class="stat-value">${results.hotspotCount || 0}</div>
                    <div class="stat-label">🔥 Hotspot</div>
                </div>
                <div class="stat-item coldspot">
                    <div class="stat-value">${results.coldspotCount || 0}</div>
                    <div class="stat-label">❄️ Coldspot</div>
                </div>
            </div>
        `;
        
        html += `
            <div class="layer-filters">
                <button class="layer-filter-btn ${filter === 'all' ? 'active' : ''}" data-filter="all">📊 Semua</button>
                <button class="layer-filter-btn ${filter === 'heatmap' ? 'active' : ''}" data-filter="heatmap">🔥 Heatmap</button>
                <button class="layer-filter-btn ${filter === 'marker' ? 'active' : ''}" data-filter="marker">📍 Marker</button>
                <button class="layer-filter-btn ${filter === 'hotspot' ? 'active' : ''}" data-filter="hotspot">🔥 Hotspot</button>
                <button class="layer-filter-btn ${filter === 'coldspot' ? 'active' : ''}" data-filter="coldspot">❄️ Coldspot</button>
            </div>
        `;
        
        if (filter === 'heatmap' || filter === 'all') {
            html += renderHeatmapResults(results);
        }
        
        if (filter === 'marker' || filter === 'all') {
            html += renderMarkerResults(results);
        }
        
        if (filter === 'hotspot' || filter === 'all') {
            html += renderHotspotResults(results);
        }
        
        if (filter === 'coldspot' || filter === 'all') {
            html += renderColdspotResults(results);
        }
        
        elements.resultsContent.innerHTML = html;
        
        document.querySelectorAll('.layer-filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const newFilter = this.dataset.filter;
                document.querySelectorAll('.layer-filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentFilter = newFilter;
                renderFilteredResults(currentResults, newFilter);
            });
        });
    }
    
    function renderHeatmapResults(results) {
        if (!results.regionalData) return '';
        
        let html = `
            <div class="result-section">
                <h5><i class="fas fa-fire" style="color: #e65100;"></i> Hasil KDE berdasarkan Regional</h5>
                <div class="kde-summary">
                    <div class="kde-item">
                        <span class="kde-label">Metode:</span>
                        <span class="kde-value">${results.method === 'kde' ? 'Kernel Density Estimation' : 'Point Density'}</span>
                    </div>
                    <div class="kde-item">
                        <span class="kde-label">Radius:</span>
                        <span class="kde-value">${results.radius} km</span>
                    </div>
                    <div class="kde-item">
                        <span class="kde-label">Total Titik:</span>
                        <span class="kde-value">${results.total}</span>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Regional</th>
                            <th>Total</th>
                            <th>🔥 Hotspot</th>
                            <th>❄️ Coldspot</th>
                            <th>Neutral</th>
                            <th>Kepadatan</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        results.regionalData.forEach(reg => {
            const hotspotPercent = reg.total > 0 ? ((reg.hotspot / reg.total) * 100).toFixed(1) : 0;
            const densityLevel = hotspotPercent > 20 ? 'Sangat Tinggi' 
                              : hotspotPercent > 15 ? 'Tinggi'
                              : hotspotPercent > 10 ? 'Sedang'
                              : hotspotPercent > 5 ? 'Rendah'
                              : 'Sangat Rendah';
            
            const densityColor = hotspotPercent > 20 ? '#c62828'
                               : hotspotPercent > 15 ? '#e65100'
                               : hotspotPercent > 10 ? '#f9a825'
                               : hotspotPercent > 5 ? '#2e7d32'
                               : '#1565c0';
            
            html += `
                <tr>
                    <td><strong>${reg.regional}</strong></td>
                    <td>${reg.total}</td>
                    <td style="color: #c62828; font-weight: 600;">${reg.hotspot}</td>
                    <td style="color: #1565c0; font-weight: 600;">${reg.coldspot}</td>
                    <td>${reg.neutral}</td>
                    <td>
                        <span style="color: ${densityColor}; font-weight: 600;">
                            ${densityLevel}
                            <span style="font-size:10px;color:#666;">(${hotspotPercent}%)</span>
                        </span>
                    </td>
                </tr>
            `;
        });
        
        html += `</tbody></table></div>`;
        return html;
    }
    
    function renderMarkerResults(results) {
        if (!results.allData || results.allData.length === 0) return '';
        
        const markerData = results.allData.slice(0, 50);
        
        let html = `
            <div class="result-section">
                <h5><i class="fas fa-map-marker-alt" style="color: #1a237e;"></i> Distribusi Marker per Regional</h5>
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Nama Kantor</th>
                            <th>Regional</th>
                            <th>Provinsi</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        markerData.forEach((item, index) => {
            let status = '<span class="badge badge-neutral">● Neutral</span>';
            if (item.isHotspot) status = '<span class="badge badge-hotspot">🔥 Hotspot</span>';
            else if (item.isColdspot) status = '<span class="badge badge-coldspot">❄️ Coldspot</span>';
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${item['NAMA KANTOR'] || 'Unknown'}</strong></td>
                    <td>${item['REGIONAL'] || '-'}</td>
                    <td>${item['PROVINSI'] || '-'}</td>
                    <td>${status}</td>
                </tr>
            `;
        });
        
        if (results.allData.length > 50) {
            html += `
                <tr>
                    <td colspan="5" style="text-align:center;color:#666;font-style:italic;">
                        Menampilkan 50 dari ${results.allData.length} data
                    </td>
                </tr>
            `;
        }
        
        html += `</tbody></table></div>`;
        return html;
    }
    
    function renderHotspotResults(results) {
        if (!results.hotspots || results.hotspots.length === 0) {
            return `
                <div class="result-section">
                    <h5><i class="fas fa-fire" style="color: #c62828;"></i> Distribusi Hotspot per Regional</h5>
                    <p style="text-align:center;padding:10px;color:#666;">Tidak ada data hotspot</p>
                </div>
            `;
        }
        
        const hotspotRegional = {};
        results.hotspots.forEach(item => {
            const reg = item['REGIONAL'] || 'Unknown';
            if (!hotspotRegional[reg]) hotspotRegional[reg] = 0;
            hotspotRegional[reg]++;
        });
        
        const sortedRegional = Object.keys(hotspotRegional).sort((a, b) => hotspotRegional[b] - hotspotRegional[a]);
        
        let html = `
            <div class="result-section">
                <h5><i class="fas fa-fire" style="color: #c62828;"></i> Distribusi Hotspot per Regional</h5>
                <div class="hotspot-stats">
                    <div class="stat-card">
                        <span class="stat-card-value">${results.hotspots.length}</span>
                        <span class="stat-card-label">Total Hotspot</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-card-value">${sortedRegional.length}</span>
                        <span class="stat-card-label">Regional Terdampak</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-card-value">${((results.hotspots.length / results.total) * 100).toFixed(1)}%</span>
                        <span class="stat-card-label">Persentase Hotspot</span>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Regional</th>
                            <th>Jumlah Hotspot</th>
                            <th>Persentase</th>
                            <th>Visual</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        const maxHotspot = Math.max(...Object.values(hotspotRegional), 1);
        
        sortedRegional.forEach((reg, index) => {
            const count = hotspotRegional[reg];
            const percent = ((count / results.hotspots.length) * 100).toFixed(1);
            const barWidth = (count / maxHotspot) * 100;
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${reg}</strong></td>
                    <td style="color: #c62828; font-weight: 600;">${count}</td>
                    <td>${percent}%</td>
                    <td>
                        <div style="background: #ffcdd2; height: 20px; border-radius: 4px; width: 100px; overflow: hidden;">
                            <div style="background: #c62828; height: 100%; width: ${barWidth}%; border-radius: 4px;"></div>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `</tbody></table></div>`;
        return html;
    }
    
    function renderColdspotResults(results) {
        if (!results.coldspots || results.coldspots.length === 0) {
            return `
                <div class="result-section">
                    <h5><i class="fas fa-snowflake" style="color: #1565c0;"></i> Distribusi Coldspot per Regional</h5>
                    <p style="text-align:center;padding:10px;color:#666;">Tidak ada data coldspot</p>
                </div>
            `;
        }
        
        const coldspotRegional = {};
        results.coldspots.forEach(item => {
            const reg = item['REGIONAL'] || 'Unknown';
            if (!coldspotRegional[reg]) coldspotRegional[reg] = 0;
            coldspotRegional[reg]++;
        });
        
        const sortedRegional = Object.keys(coldspotRegional).sort((a, b) => coldspotRegional[b] - coldspotRegional[a]);
        
        let html = `
            <div class="result-section">
                <h5><i class="fas fa-snowflake" style="color: #1565c0;"></i> Distribusi Coldspot per Regional</h5>
                <div class="coldspot-stats">
                    <div class="stat-card">
                        <span class="stat-card-value">${results.coldspots.length}</span>
                        <span class="stat-card-label">Total Coldspot</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-card-value">${sortedRegional.length}</span>
                        <span class="stat-card-label">Regional Terdampak</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-card-value">${((results.coldspots.length / results.total) * 100).toFixed(1)}%</span>
                        <span class="stat-card-label">Persentase Coldspot</span>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Regional</th>
                            <th>Jumlah Coldspot</th>
                            <th>Persentase</th>
                            <th>Visual</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        const maxColdspot = Math.max(...Object.values(coldspotRegional), 1);
        
        sortedRegional.forEach((reg, index) => {
            const count = coldspotRegional[reg];
            const percent = ((count / results.coldspots.length) * 100).toFixed(1);
            const barWidth = (count / maxColdspot) * 100;
            
            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${reg}</strong></td>
                    <td style="color: #1565c0; font-weight: 600;">${count}</td>
                    <td>${percent}%</td>
                    <td>
                        <div style="background: #bbdefb; height: 20px; border-radius: 4px; width: 100px; overflow: hidden;">
                            <div style="background: #1565c0; height: 100%; width: ${barWidth}%; border-radius: 4px;"></div>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `</tbody></table></div>`;
        return html;
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
        getControlValues: getControlValues,
        showResultsTable: showResultsTable,
        renderFilteredResults: renderFilteredResults
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}
