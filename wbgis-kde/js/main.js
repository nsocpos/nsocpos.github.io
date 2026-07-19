/**
 * main.js - Aplikasi Utama dengan Tabel Hasil
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // ============================================
    // 1. INISIALISASI
    // ============================================
    
    const map = MapController.init('map');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingProgress = document.getElementById('loadingProgress');
    const dataInfo = document.getElementById('dataInfo');
    const resultsPanel = document.getElementById('resultsPanel');
    const resultsContent = document.getElementById('resultsContent');
    const resultsTitle = document.getElementById('resultsTitle');
    const closeResults = document.getElementById('closeResults');
    
    let allData = [];
    let lastResults = null;
    let isAnalyzing = false;
    
    // ============================================
    // 2. LOAD DATA
    // ============================================
    
    function updateLoading(message) {
        if (loadingProgress) loadingProgress.textContent = message;
    }
    
    DataLoader.loadFromFile(
        'data/data.csv',
        function(data, error) {
            if (error) {
                dataInfo.className = 'data-info error';
                dataInfo.innerHTML = '❌ Gagal memuat data';
                loadingOverlay.classList.add('hidden');
                return;
            }
            
            allData = data;
            const stats = DataLoader.getStats();
            const invalidData = DataLoader.getInvalidData();
            
            console.log(`✅ ${allData.length} data valid`);
            console.log(`❌ ${invalidData.length} data invalid`);
            
            // Update info
            dataInfo.className = 'data-info';
            dataInfo.innerHTML = `
                <i class="fas fa-check-circle" style="color:#2e7d32;"></i> 
                ${allData.length} data valid (${invalidData.length} invalid diabaikan)
            `;
            
            document.getElementById('totalData').textContent = allData.length;
            
            // Populate filters
            populateFilters();
            
            // Jalankan analisis pertama
            runAnalysis();
            loadingOverlay.classList.add('hidden');
        },
        function(progress, message) {
            updateLoading(`${message} (${Math.round(progress)}%)`);
        }
    );
    
    // ============================================
    // 3. FILTERS
    // ============================================
    
    function populateFilters() {
        const regionals = DataLoader.getRegionals();
        const filterRegional = document.getElementById('filterRegional');
        filterRegional.innerHTML = '<option value="all">Semua Regional</option>';
        regionals.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r;
            opt.textContent = r;
            filterRegional.appendChild(opt);
        });
        
        const pakets = DataLoader.getPakets();
        const filterPaket = document.getElementById('filterPaket');
        filterPaket.innerHTML = '<option value="all">Semua Paket</option>';
        pakets.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            filterPaket.appendChild(opt);
        });
    }
    
    // ============================================
    // 4. ANALISIS UTAMA
    // ============================================
    
    function runAnalysis() {
        if (isAnalyzing) return;
        isAnalyzing = true;
        
        try {
            const method = document.getElementById('analysisMethod').value;
            const radius = parseFloat(document.getElementById('radiusRange').value);
            const regional = document.getElementById('filterRegional').value;
            const paket = document.getElementById('filterPaket').value;
            
            // Filter data
            const filters = { regional, paket };
            let filteredData = DataLoader.getFilteredData(filters);
            
            if (filteredData.length === 0) {
                resultsPanel.classList.remove('active');
                dataInfo.className = 'data-info warning';
                dataInfo.innerHTML = '⚠️ Tidak ada data sesuai filter';
                isAnalyzing = false;
                return;
            }
            
            document.getElementById('totalPoints').textContent = filteredData.length;
            document.getElementById('methodDisplay').textContent = method === 'kde' ? 'KDE' : 'Point Density';
            
            const points = filteredData.map(row => ({ ...row, lat: row.lat, lng: row.lng, intensity: 1.0 }));
            const bounds = MapController.getBounds();
            
            let heatData = [];
            let hotspotResult = null;
            let densityResult = [];
            let kdeStats = null;
            
            // ============================================
            // KDE ANALYSIS
            // ============================================
            if (method === 'kde' && bounds) {
                const kdeResult = KDEAnalysis.calculateKDE(points, radius, bounds, 30);
                if (kdeResult) {
                    heatData = KDEAnalysis.kdeToHeatmapData(kdeResult, 0.01, 2000);
                    const densest = KDEAnalysis.findDensestPoint(kdeResult);
                    kdeStats = KDEAnalysis.getDensityStats(kdeResult);
                    document.getElementById('densestArea').textContent = 
                        densest ? `${densest.lat.toFixed(3)}, ${densest.lng.toFixed(3)}` : '-';
                    document.getElementById('avgDensity').textContent = 
                        kdeStats ? kdeStats.average.toFixed(4) : '-';
                }
            }
            
            // ============================================
            // POINT DENSITY ANALYSIS
            // ============================================
            if (method === 'point') {
                densityResult = PointDensityAnalysis.calculatePointDensity(points, radius, bounds);
                
                if (bounds) {
                    const gridResult = PointDensityAnalysis.calculateGridDensity(points, radius, bounds, 30);
                    if (gridResult) {
                        heatData = PointDensityAnalysis.gridToHeatmapData(gridResult, 0.01, 2000);
                        const highest = PointDensityAnalysis.findHighestDensity(gridResult);
                        const stats = PointDensityAnalysis.getDensityStats(gridResult);
                        document.getElementById('densestArea').textContent = 
                            highest ? `${highest.lat.toFixed(3)}, ${highest.lng.toFixed(3)}` : '-';
                        document.getElementById('avgDensity').textContent = 
                            stats ? stats.average.toFixed(4) : '-';
                    }
                }
                
                hotspotResult = PointDensityAnalysis.identifyHotspots(points, radius, 1.5);
                
                // Tampilkan layer
                MapController.showHotspots(hotspotResult.hotspots);
                MapController.showColdspots(hotspotResult.coldspots);
                MapController.showMarkers(densityResult);
            }
            
            // Tampilkan heatmap
            if (heatData.length > 0) {
                const gradient = method === 'kde' 
                    ? { 0.0: 'blue', 0.25: 'cyan', 0.5: 'lime', 0.75: 'yellow', 1.0: 'red' }
                    : { 0.0: 'blue', 0.3: 'cyan', 0.6: 'yellow', 0.8: 'orange', 1.0: 'red' };
                MapController.showHeatmap(heatData, { gradient });
            }
            
            MapController.fitToData(filteredData);
            
            // ============================================
            // Siapkan Data untuk Tabel
            // ============================================
            
            const regionalMap = {};
            const allDataWithStatus = [];
            
            if (densityResult.length > 0) {
                densityResult.forEach(item => {
                    const reg = item['REGIONAL'] || 'Unknown';
                    if (!regionalMap[reg]) regionalMap[reg] = { total: 0, hotspot: 0, coldspot: 0, neutral: 0 };
                    regionalMap[reg].total++;
                    if (item.isHotspot) regionalMap[reg].hotspot++;
                    else if (item.isColdspot) regionalMap[reg].coldspot++;
                    else regionalMap[reg].neutral++;
                    allDataWithStatus.push({ ...item, status: item.isHotspot ? 'hotspot' : (item.isColdspot ? 'coldspot' : 'neutral') });
                });
            } else {
                filteredData.forEach(item => {
                    const reg = item['REGIONAL'] || 'Unknown';
                    if (!regionalMap[reg]) regionalMap[reg] = { total: 0, hotspot: 0, coldspot: 0, neutral: 0 };
                    regionalMap[reg].total++;
                    regionalMap[reg].neutral++;
                    allDataWithStatus.push({ ...item, status: 'neutral', density: 0 });
                });
            }
            
            const regionalData = Object.keys(regionalMap).map(key => ({
                regional: key,
                total: regionalMap[key].total,
                hotspot: regionalMap[key].hotspot || 0,
                coldspot: regionalMap[key].coldspot || 0,
                neutral: regionalMap[key].neutral || 0
            })).sort((a, b) => b.total - a.total);
            
            // Hasil untuk tabel
            const tableResults = {
                total: allDataWithStatus.length,
                hotspotCount: hotspotResult ? hotspotResult.hotspots.length : 0,
                coldspotCount: hotspotResult ? hotspotResult.coldspots.length : 0,
                hotspots: hotspotResult ? hotspotResult.hotspots : [],
                coldspots: hotspotResult ? hotspotResult.coldspots : [],
                allData: allDataWithStatus,
                regionalData: regionalData,
                method: method,
                radius: radius,
                kdeStats: kdeStats
            };
            
            lastResults = tableResults;
            
            // Tampilkan tabel
            renderResultsTable(tableResults, method);
            
        } catch (error) {
            console.error('Error:', error);
            document.getElementById('dataInfo').innerHTML = '❌ Error: ' + error.message;
        } finally {
            isAnalyzing = false;
        }
    }
    
    // ============================================
    // 5. RENDER TABEL HASIL
    // ============================================
    
    function renderResultsTable(results, method) {
        if (!results) return;
        
        resultsPanel.classList.add('active');
        resultsTitle.textContent = method === 'kde' ? '📊 Hasil KDE per Regional' : '📊 Hasil Point Density per Regional';
        
        let html = '';
        
        // Summary Stats
        html += `
            <div class="summary-stats">
                <div class="stat-item"><div class="stat-value">${results.total}</div><div class="stat-label">Total Data</div></div>
                <div class="stat-item hotspot"><div class="stat-value">${results.hotspotCount}</div><div class="stat-label">🔥 Hotspot</div></div>
                <div class="stat-item coldspot"><div class="stat-value">${results.coldspotCount}</div><div class="stat-label">❄️ Coldspot</div></div>
                <div class="stat-item"><div class="stat-value">${results.radius} km</div><div class="stat-label">Radius</div></div>
            </div>
        `;
        
        // Tab buttons
        html += `
            <div class="tab-buttons">
                <button class="active" onclick="window.showTab('regional')">📊 Per Regional</button>
                <button onclick="window.showTab('hotspot')">🔥 Hotspot</button>
                <button onclick="window.showTab('coldspot')">❄️ Coldspot</button>
                <button onclick="window.showTab('all')">📋 Semua Data</button>
            </div>
        `;
        
        // Store data for tabs
        window._tableData = results;
        window._currentTab = 'regional';
        
        // Render default tab
        html += renderRegionalTab(results);
        
        resultsContent.innerHTML = html;
    }
    
    function renderRegionalTab(results) {
        if (!results.regionalData || results.regionalData.length === 0) {
            return '<p style="text-align:center;padding:20px;color:#666;">Tidak ada data regional</p>';
        }
        
        let html = `
            <div class="result-section">
                <h5><i class="fas fa-map"></i> Distribusi per Regional</h5>
                <table>
                    <thead>
                        <tr>
                            <th>Regional</th>
                            <th>Total</th>
                            <th>🔥 Hotspot</th>
                            <th>❄️ Coldspot</th>
                            <th>Neutral</th>
                            <th>% Hotspot</th>
                            <th>Visual</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        const maxTotal = Math.max(...results.regionalData.map(r => r.total), 1);
        
        results.regionalData.forEach(reg => {
            const percent = reg.total > 0 ? ((reg.hotspot / reg.total) * 100).toFixed(1) : 0;
            const barWidth = (reg.total / maxTotal) * 100;
            
            html += `
                <tr>
                    <td><strong>${reg.regional}</strong></td>
                    <td>${reg.total}</td>
                    <td style="color:#c62828;font-weight:600;">${reg.hotspot}</td>
                    <td style="color:#1565c0;font-weight:600;">${reg.coldspot}</td>
                    <td>${reg.neutral}</td>
                    <td>${percent}%</td>
                    <td>
                        <div class="bar-chart" style="width:120px;">
                            <div class="bar bar-hotspot" style="width:${(reg.hotspot/maxTotal*100).toFixed(1)}%;"></div>
                            <div class="bar bar-coldspot" style="width:${(reg.coldspot/maxTotal*100).toFixed(1)}%;margin-left:${(reg.hotspot/maxTotal*100).toFixed(1)}%;"></div>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `</tbody></table></div>`;
        return html;
    }
    
    function renderHotspotTab(results) {
        if (!results.hotspots || results.hotspots.length === 0) {
            return '<p style="text-align:center;padding:20px;color:#666;">🔥 Tidak ada data hotspot</p>';
        }
        
        // Hitung per regional
        const regCount = {};
        results.hotspots.forEach(item => {
            const reg = item['REGIONAL'] || 'Unknown';
            regCount[reg] = (regCount[reg] || 0) + 1;
        });
        
        const sorted = Object.keys(regCount).sort((a, b) => regCount[b] - regCount[a]);
        
        let html = `
            <div class="result-section">
                <h5><i class="fas fa-fire" style="color:#c62828;"></i> Distribusi Hotspot per Regional</h5>
                <div class="hotspot-stats">
                    <div class="stat-card"><span class="stat-card-value">${results.hotspots.length}</span><span class="stat-card-label">Total Hotspot</span></div>
                    <div class="stat-card"><span class="stat-card-value">${sorted.length}</span><span class="stat-card-label">Regional Terdampak</span></div>
                    <div class="stat-card"><span class="stat-card-value">${((results.hotspots.length/results.total)*100).toFixed(1)}%</span><span class="stat-card-label">Persentase</span></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Regional</th>
                            <th>Jumlah</th>
                            <th>Persentase</th>
                            <th>Visual</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        const maxCount = Math.max(...Object.values(regCount), 1);
        
        sorted.forEach((reg, i) => {
            const count = regCount[reg];
            const percent = ((count / results.hotspots.length) * 100).toFixed(1);
            const barWidth = (count / maxCount) * 100;
            
            html += `
                <tr class="hotspot-row">
                    <td>${i + 1}</td>
                    <td><strong>${reg}</strong></td>
                    <td style="color:#c62828;font-weight:600;">${count}</td>
                    <td>${percent}%</td>
                    <td>
                        <div class="bar-chart" style="width:100px;">
                            <div class="bar bar-hotspot" style="width:${barWidth}%;"></div>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        // Daftar hotspot
        html += `
                </tbody>
            </table>
            <br>
            <h5>📍 Daftar Hotspot</h5>
            <table>
                <thead>
                    <tr><th>No</th><th>Nama Kantor</th><th>Regional</th><th>Provinsi</th><th>Kepadatan</th></tr>
                </thead>
                <tbody>
        `;
        
        results.hotspots.slice(0, 50).forEach((item, i) => {
            html += `
                <tr class="hotspot-row">
                    <td>${i + 1}</td>
                    <td><strong>${item['NAMA KANTOR'] || 'Unknown'}</strong></td>
                    <td>${item['REGIONAL'] || '-'}</td>
                    <td>${item['PROVINSI'] || '-'}</td>
                    <td>${item.density || 0}</td>
                </tr>
            `;
        });
        
        if (results.hotspots.length > 50) {
            html += `<tr><td colspan="5" style="text-align:center;color:#666;font-style:italic;">Menampilkan 50 dari ${results.hotspots.length} data</td></tr>`;
        }
        
        html += `</tbody></table></div>`;
        return html;
    }
    
    function renderColdspotTab(results) {
        if (!results.coldspots || results.coldspots.length === 0) {
            return '<p style="text-align:center;padding:20px;color:#666;">❄️ Tidak ada data coldspot</p>';
        }
        
        const regCount = {};
        results.coldspots.forEach(item => {
            const reg = item['REGIONAL'] || 'Unknown';
            regCount[reg] = (regCount[reg] || 0) + 1;
        });
        
        const sorted = Object.keys(regCount).sort((a, b) => regCount[b] - regCount[a]);
        
        let html = `
            <div class="result-section">
                <h5><i class="fas fa-snowflake" style="color:#1565c0;"></i> Distribusi Coldspot per Regional</h5>
                <div class="coldspot-stats">
                    <div class="stat-card"><span class="stat-card-value">${results.coldspots.length}</span><span class="stat-card-label">Total Coldspot</span></div>
                    <div class="stat-card"><span class="stat-card-value">${sorted.length}</span><span class="stat-card-label">Regional Terdampak</span></div>
                    <div class="stat-card"><span class="stat-card-value">${((results.coldspots.length/results.total)*100).toFixed(1)}%</span><span class="stat-card-label">Persentase</span></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Regional</th>
                            <th>Jumlah</th>
                            <th>Persentase</th>
                            <th>Visual</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        const maxCount = Math.max(...Object.values(regCount), 1);
        
        sorted.forEach((reg, i) => {
            const count = regCount[reg];
            const percent = ((count / results.coldspots.length) * 100).toFixed(1);
            const barWidth = (count / maxCount) * 100;
            
            html += `
                <tr class="coldspot-row">
                    <td>${i + 1}</td>
                    <td><strong>${reg}</strong></td>
                    <td style="color:#1565c0;font-weight:600;">${count}</td>
                    <td>${percent}%</td>
                    <td>
                        <div class="bar-chart" style="width:100px;">
                            <div class="bar bar-coldspot" style="width:${barWidth}%;"></div>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
            <br>
            <h5>📍 Daftar Coldspot</h5>
            <table>
                <thead>
                    <tr><th>No</th><th>Nama Kantor</th><th>Regional</th><th>Provinsi</th><th>Kepadatan</th></tr>
                </thead>
                <tbody>
        `;
        
        results.coldspots.slice(0, 50).forEach((item, i) => {
            html += `
                <tr class="coldspot-row">
                    <td>${i + 1}</td>
                    <td><strong>${item['NAMA KANTOR'] || 'Unknown'}</strong></td>
                    <td>${item['REGIONAL'] || '-'}</td>
                    <td>${item['PROVINSI'] || '-'}</td>
                    <td>${item.density || 0}</td>
                </tr>
            `;
        });
        
        if (results.coldspots.length > 50) {
            html += `<tr><td colspan="5" style="text-align:center;color:#666;font-style:italic;">Menampilkan 50 dari ${results.coldspots.length} data</td></tr>`;
        }
        
        html += `</tbody></table></div>`;
        return html;
    }
    
    function renderAllDataTab(results) {
        if (!results.allData || results.allData.length === 0) {
            return '<p style="text-align:center;padding:20px;color:#666;">Tidak ada data</p>';
        }
        
        let html = `
            <div class="result-section">
                <h5><i class="fas fa-list"></i> Semua Data</h5>
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Nama Kantor</th>
                            <th>Regional</th>
                            <th>Provinsi</th>
                            <th>Kepadatan</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        results.allData.slice(0, 100).forEach((item, i) => {
            let status = '<span class="badge badge-neutral">● Neutral</span>';
            let rowClass = '';
            if (item.isHotspot) { status = '<span class="badge badge-hotspot">🔥 Hotspot</span>'; rowClass = 'hotspot-row'; }
            else if (item.isColdspot) { status = '<span class="badge badge-coldspot">❄️ Coldspot</span>'; rowClass = 'coldspot-row'; }
            
            html += `
                <tr class="${rowClass}">
                    <td>${i + 1}</td>
                    <td><strong>${item['NAMA KANTOR'] || 'Unknown'}</strong></td>
                    <td>${item['REGIONAL'] || '-'}</td>
                    <td>${item['PROVINSI'] || '-'}</td>
                    <td>${item.density || 0}</td>
                    <td>${status}</td>
                </tr>
            `;
        });
        
        if (results.allData.length > 100) {
            html += `<tr><td colspan="6" style="text-align:center;color:#666;font-style:italic;">Menampilkan 100 dari ${results.allData.length} data</td></tr>`;
        }
        
        html += `</tbody></table></div>`;
        return html;
    }
    
    // ============================================
    // 6. TAB SWITCHING
    // ============================================
    
    window.showTab = function(tab) {
        const results = window._tableData;
        if (!results) return;
        
        window._currentTab = tab;
        
        // Update active button
        document.querySelectorAll('.tab-buttons button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.includes('Per Regional') && tab === 'regional') btn.classList.add('active');
            if (btn.textContent.includes('Hotspot') && tab === 'hotspot') btn.classList.add('active');
            if (btn.textContent.includes('Coldspot') && tab === 'coldspot') btn.classList.add('active');
            if (btn.textContent.includes('Semua') && tab === 'all') btn.classList.add('active');
        });
        
        let html = '';
        switch(tab) {
            case 'regional': html = renderRegionalTab(results); break;
            case 'hotspot': html = renderHotspotTab(results); break;
            case 'coldspot': html = renderColdspotTab(results); break;
            case 'all': html = renderAllDataTab(results); break;
            default: html = renderRegionalTab(results);
        }
        
        // Preserve tab buttons
        const tabsHtml = document.querySelector('.tab-buttons')?.outerHTML || '';
        resultsContent.innerHTML = tabsHtml + html;
        
        // Re-attach active class
        document.querySelectorAll('.tab-buttons button').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.includes('Per Regional') && tab === 'regional') btn.classList.add('active');
            if (btn.textContent.includes('Hotspot') && tab === 'hotspot') btn.classList.add('active');
            if (btn.textContent.includes('Coldspot') && tab === 'coldspot') btn.classList.add('active');
            if (btn.textContent.includes('Semua') && tab === 'all') btn.classList.add('active');
        });
    };
    
    // ============================================
    // 7. EVENT LISTENERS
    // ============================================
    
    document.getElementById('btnAnalyze').addEventListener('click', function() {
        loadingOverlay.classList.remove('hidden');
        updateLoading('Menganalisis data...');
        setTimeout(() => {
            runAnalysis();
            loadingOverlay.classList.add('hidden');
        }, 100);
    });
    
    document.getElementById('btnReset').addEventListener('click', function() {
        MapController.resetView();
        document.getElementById('densestArea').textContent = '-';
        document.getElementById('avgDensity').textContent = '-';
        document.getElementById('totalPoints').textContent = '0';
        resultsPanel.classList.remove('active');
    });
    
    closeResults.addEventListener('click', function() {
        resultsPanel.classList.remove('active');
    });
    
    // Radius display
    document.getElementById('radiusRange').addEventListener('input', function() {
        document.getElementById('radiusDisplay').textContent = this.value + ' km';
    });
    
    // Re-run when filters change
    document.getElementById('filterRegional').addEventListener('change', function() {
        setTimeout(runAnalysis, 100);
    });
    
    document.getElementById('filterPaket').addEventListener('change', function() {
        setTimeout(runAnalysis, 100);
    });
    
    document.getElementById('analysisMethod').addEventListener('change', function() {
        setTimeout(runAnalysis, 100);
    });
    
    // ============================================
    // 8. EXPOSE GLOBAL
    // ============================================
    
    window.webgis = {
        DataLoader, KDEAnalysis, PointDensityAnalysis,
        MapController, runAnalysis, showTab: window.showTab
    };
    
    console.log('✅ WebGIS siap!');
    console.log(`📊 ${allData.length} data valid`);
});
