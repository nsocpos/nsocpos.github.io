/**
 * main.js - Aplikasi Utama dengan Tabel Hasil & Tingkat Kepadatan
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
    // 2. FUNGSI TINGKAT KEPADATAN
    // ============================================
    
    function getDensityLevel(density, maxDensity) {
        if (maxDensity === 0) return { level: 'Tidak Ada', color: '#999', icon: '⚪' };
        
        const ratio = density / maxDensity;
        if (ratio > 0.8) return { level: 'Sangat Tinggi', color: '#c62828', icon: '🔴' };
        if (ratio > 0.6) return { level: 'Tinggi', color: '#e65100', icon: '🟠' };
        if (ratio > 0.4) return { level: 'Sedang', color: '#f9a825', icon: '🟡' };
        if (ratio > 0.2) return { level: 'Rendah', color: '#2e7d32', icon: '🟢' };
        return { level: 'Sangat Rendah', color: '#1565c0', icon: '🔵' };
    }
    
    function getDensityBadge(density, maxDensity) {
        const info = getDensityLevel(density, maxDensity);
        return `<span style="color:${info.color};font-weight:600;">${info.icon} ${info.level}</span>`;
    }
    
    // ============================================
    // 3. LOAD DATA
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
            
            dataInfo.className = 'data-info';
            dataInfo.innerHTML = `
                <i class="fas fa-check-circle" style="color:#2e7d32;"></i> 
                ${allData.length} data valid (${invalidData.length} invalid diabaikan)
            `;
            
            document.getElementById('totalData').textContent = allData.length;
            
            populateFilters();
            runAnalysis();
            loadingOverlay.classList.add('hidden');
        },
        function(progress, message) {
            updateLoading(`${message} (${Math.round(progress)}%)`);
        }
    );
    
    // ============================================
    // 4. FILTERS
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
    // 5. ANALISIS UTAMA
    // ============================================
    
    function runAnalysis() {
        if (isAnalyzing) return;
        isAnalyzing = true;
        
        try {
            const method = document.getElementById('analysisMethod').value;
            const radius = parseFloat(document.getElementById('radiusRange').value);
            const regional = document.getElementById('filterRegional').value;
            const paket = document.getElementById('filterPaket').value;
            
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
            let maxDensity = 0;
            
            // ============================================
            // KDE ANALYSIS
            // ============================================
            if (method === 'kde' && bounds) {
                const kdeResult = KDEAnalysis.calculateKDE(points, radius, bounds, 30);
                if (kdeResult) {
                    heatData = KDEAnalysis.kdeToHeatmapData(kdeResult, 0.01, 2000);
                    const densest = KDEAnalysis.findDensestPoint(kdeResult);
                    kdeStats = KDEAnalysis.getDensityStats(kdeResult);
                    maxDensity = kdeResult.maxDensity || 0;
                    
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
                        maxDensity = gridResult.maxDensity || 0;
                        
                        document.getElementById('densestArea').textContent = 
                            highest ? `${highest.lat.toFixed(3)}, ${highest.lng.toFixed(3)}` : '-';
                        document.getElementById('avgDensity').textContent = 
                            stats ? stats.average.toFixed(4) : '-';
                    }
                }
                
                hotspotResult = PointDensityAnalysis.identifyHotspots(points, radius, 1.5);
                
                // Update density di setiap titik dengan maxDensity
                if (densityResult.length > 0 && maxDensity > 0) {
                    densityResult.forEach(item => {
                        item.maxDensity = maxDensity;
                    });
                }
                
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
                    allDataWithStatus.push({ ...item, status: 'neutral', density: 0, maxDensity: maxDensity || 1 });
                });
            }
            
            // Tambahkan maxDensity ke allData
            allDataWithStatus.forEach(item => {
                item.maxDensity = maxDensity || 1;
            });
            
            const regionalData = Object.keys(regionalMap).map(key => ({
                regional: key,
                total: regionalMap[key].total,
                hotspot: regionalMap[key].hotspot || 0,
                coldspot: regionalMap[key].coldspot || 0,
                neutral: regionalMap[key].neutral || 0,
                maxDensity: maxDensity || 1
            })).sort((a, b) => b.total - a.total);
            
            // Hitung kepadatan per regional
            regionalData.forEach(reg => {
                const hotspotPercent = reg.total > 0 ? ((reg.hotspot / reg.total) * 100) : 0;
                reg.densityLevel = getDensityLevel(hotspotPercent, 100);
            });
            
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
                kdeStats: kdeStats,
                maxDensity: maxDensity || 1
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
    // 6. RENDER TABEL HASIL DENGAN TINGKAT KEPADATAN
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
                <button onclick="window.showTab('density')">📈 Tingkat Kepadatan</button>
            </div>
        `;
        
        window._tableData = results;
        window._currentTab = 'regional';
        
        html += renderRegionalTab(results);
        resultsContent.innerHTML = html;
    }
    
    // ============================================
    // 7. TAB: REGIONAL
    // ============================================
    
    function renderRegionalTab(results) {
        if (!results.regionalData || results.regionalData.length === 0) {
            return '<p style="text-align:center;padding:20px;color:#666;">Tidak ada data regional</p>';
        }
        
        let html = `
            <div class="result-section">
                <h5><i class="fas fa-map"></i> Distribusi per Regional dengan Tingkat Kepadatan</h5>
                <table>
                    <thead>
                        <tr>
                            <th>Regional</th>
                            <th>Total</th>
                            <th>🔥 Hotspot</th>
                            <th>❄️ Coldspot</th>
                            <th>Neutral</th>
                            <th>% Hotspot</th>
                            <th>Tingkat Kepadatan</th>
                            <th>Visual</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        const maxTotal = Math.max(...results.regionalData.map(r => r.total), 1);
        
        results.regionalData.forEach(reg => {
            const percent = reg.total > 0 ? ((reg.hotspot / reg.total) * 100).toFixed(1) : 0;
            const barWidth = (reg.total / maxTotal) * 100;
            const densityInfo = reg.densityLevel || getDensityLevel(parseFloat(percent), 100);
            
            html += `
                <tr>
                    <td><strong>${reg.regional}</strong></td>
                    <td>${reg.total}</td>
                    <td style="color:#c62828;font-weight:600;">${reg.hotspot}</td>
                    <td style="color:#1565c0;font-weight:600;">${reg.coldspot}</td>
                    <td>${reg.neutral}</td>
                    <td>${percent}%</td>
                    <td>
                        <span style="color:${densityInfo.color};font-weight:600;font-size:13px;">
                            ${densityInfo.icon} ${densityInfo.level}
                        </span>
                    </td>
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
    
    // ============================================
    // 8. TAB: HOTSPOT
    // ============================================
    
    function renderHotspotTab(results) {
        if (!results.hotspots || results.hotspots.length === 0) {
            return '<p style="text-align:center;padding:20px;color:#666;">🔥 Tidak ada data hotspot</p>';
        }
        
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
                            <th>Tingkat Kepadatan</th>
                            <th>Visual</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        const maxCount = Math.max(...Object.values(regCount), 1);
        const maxDensity = results.maxDensity || 1;
        
        sorted.forEach((reg, i) => {
            const count = regCount[reg];
            const percent = ((count / results.hotspots.length) * 100).toFixed(1);
            const barWidth = (count / maxCount) * 100;
            const densityInfo = getDensityLevel(parseFloat(percent), 100);
            
            html += `
                <tr class="hotspot-row">
                    <td>${i + 1}</td>
                    <td><strong>${reg}</strong></td>
                    <td style="color:#c62828;font-weight:600;">${count}</td>
                    <td>${percent}%</td>
                    <td>
                        <span style="color:${densityInfo.color};font-weight:600;font-size:12px;">
                            ${densityInfo.icon} ${densityInfo.level}
                        </span>
                    </td>
                    <td>
                        <div class="bar-chart" style="width:100px;">
                            <div class="bar bar-hotspot" style="width:${barWidth}%;"></div>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
            <br>
            <h5>📍 Daftar Hotspot dengan Tingkat Kepadatan</h5>
            <table>
                <thead>
                    <tr><th>No</th><th>Nama Kantor</th><th>Regional</th><th>Provinsi</th><th>Kepadatan</th><th>Tingkat</th></tr>
                </thead>
                <tbody>
        `;
        
        const maxDensityHotspot = Math.max(...results.hotspots.map(h => h.density || 0), 1);
        
        results.hotspots.slice(0, 50).forEach((item, i) => {
            const density = item.density || 0;
            const densityInfo = getDensityLevel(density, maxDensityHotspot);
            
            html += `
                <tr class="hotspot-row">
                    <td>${i + 1}</td>
                    <td><strong>${item['NAMA KANTOR'] || 'Unknown'}</strong></td>
                    <td>${item['REGIONAL'] || '-'}</td>
                    <td>${item['PROVINSI'] || '-'}</td>
                    <td>${density}</td>
                    <td>
                        <span style="color:${densityInfo.color};font-weight:600;font-size:11px;">
                            ${densityInfo.icon} ${densityInfo.level}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        if (results.hotspots.length > 50) {
            html += `<tr><td colspan="6" style="text-align:center;color:#666;font-style:italic;">Menampilkan 50 dari ${results.hotspots.length} data</td></tr>`;
        }
        
        html += `</tbody></table></div>`;
        return html;
    }
    
    // ============================================
    // 9. TAB: COLDSPOT
    // ============================================
    
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
                            <th>Tingkat Kepadatan</th>
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
            const densityInfo = getDensityLevel(parseFloat(percent), 100);
            
            html += `
                <tr class="coldspot-row">
                    <td>${i + 1}</td>
                    <td><strong>${reg}</strong></td>
                    <td style="color:#1565c0;font-weight:600;">${count}</td>
                    <td>${percent}%</td>
                    <td>
                        <span style="color:${densityInfo.color};font-weight:600;font-size:12px;">
                            ${densityInfo.icon} ${densityInfo.level}
                        </span>
                    </td>
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
            <h5>📍 Daftar Coldspot dengan Tingkat Kepadatan</h5>
            <table>
                <thead>
                    <tr><th>No</th><th>Nama Kantor</th><th>Regional</th><th>Provinsi</th><th>Kepadatan</th><th>Tingkat</th></tr>
                </thead>
                <tbody>
        `;
        
        const maxDensityColdspot = Math.max(...results.coldspots.map(h => h.density || 0), 1);
        
        results.coldspots.slice(0, 50).forEach((item, i) => {
            const density = item.density || 0;
            const densityInfo = getDensityLevel(density, maxDensityColdspot);
            
            html += `
                <tr class="coldspot-row">
                    <td>${i + 1}</td>
                    <td><strong>${item['NAMA KANTOR'] || 'Unknown'}</strong></td>
                    <td>${item['REGIONAL'] || '-'}</td>
                    <td>${item['PROVINSI'] || '-'}</td>
                    <td>${density}</td>
                    <td>
                        <span style="color:${densityInfo.color};font-weight:600;font-size:11px;">
                            ${densityInfo.icon} ${densityInfo.level}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        if (results.coldspots.length > 50) {
            html += `<tr><td colspan="6" style="text-align:center;color:#666;font-style:italic;">Menampilkan 50 dari ${results.coldspots.length} data</td></tr>`;
        }
        
        html += `</tbody></table></div>`;
        return html;
    }
    
    // ============================================
    // 10. TAB: SEMUA DATA
    // ============================================
    
    function renderAllDataTab(results) {
        if (!results.allData || results.allData.length === 0) {
            return '<p style="text-align:center;padding:20px;color:#666;">Tidak ada data</p>';
        }
        
        const maxDensityAll = results.maxDensity || 1;
        
        let html = `
            <div class="result-section">
                <h5><i class="fas fa-list"></i> Semua Data dengan Tingkat Kepadatan</h5>
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Nama Kantor</th>
                            <th>Regional</th>
                            <th>Provinsi</th>
                            <th>Kepadatan</th>
                            <th>Tingkat Kepadatan</th>
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
            
            const density = item.density || 0;
            const densityInfo = getDensityLevel(density, maxDensityAll);
            
            html += `
                <tr class="${rowClass}">
                    <td>${i + 1}</td>
                    <td><strong>${item['NAMA KANTOR'] || 'Unknown'}</strong></td>
                    <td>${item['REGIONAL'] || '-'}</td>
                    <td>${item['PROVINSI'] || '-'}</td>
                    <td>${density}</td>
                    <td>
                        <span style="color:${densityInfo.color};font-weight:600;font-size:12px;">
                            ${densityInfo.icon} ${densityInfo.level}
                        </span>
                    </td>
                    <td>${status}</td>
                </tr>
            `;
        });
        
        if (results.allData.length > 100) {
            html += `<tr><td colspan="7" style="text-align:center;color:#666;font-style:italic;">Menampilkan 100 dari ${results.allData.length} data</td></tr>`;
        }
        
        html += `</tbody></table></div>`;
        return html;
    }
    
    // ============================================
    // 11. TAB: TINGKAT KEPADATAN
    // ============================================
    
    function renderDensityTab(results) {
        if (!results.allData || results.allData.length === 0) {
            return '<p style="text-align:center;padding:20px;color:#666;">Tidak ada data</p>';
        }
        
        // Hitung distribusi tingkat kepadatan
        const densityLevels = {
            'Sangat Tinggi': 0,
            'Tinggi': 0,
            'Sedang': 0,
            'Rendah': 0,
            'Sangat Rendah': 0
        };
        
        const maxDensity = results.maxDensity || 1;
        
        results.allData.forEach(item => {
            const density = item.density || 0;
            const info = getDensityLevel(density, maxDensity);
            if (densityLevels[info.level] !== undefined) {
                densityLevels[info.level]++;
            }
        });
        
        const colors = {
            'Sangat Tinggi': '#c62828',
            'Tinggi': '#e65100',
            'Sedang': '#f9a825',
            'Rendah': '#2e7d32',
            'Sangat Rendah': '#1565c0'
        };
        
        const icons = {
            'Sangat Tinggi': '🔴',
            'Tinggi': '🟠',
            'Sedang': '🟡',
            'Rendah': '🟢',
            'Sangat Rendah': '🔵'
        };
        
        const total = results.allData.length;
        const sortedLevels = ['Sangat Tinggi', 'Tinggi', 'Sedang', 'Rendah', 'Sangat Rendah'];
        const maxCount = Math.max(...sortedLevels.map(l => densityLevels[l] || 0), 1);
        
        let html = `
            <div class="result-section">
                <h5><i class="fas fa-chart-bar"></i> Distribusi Tingkat Kepadatan</h5>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
        `;
        
        sortedLevels.forEach(level => {
            const count = densityLevels[level] || 0;
            const percent = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            html += `
                <div style="text-align:center;background:${colors[level]}22;padding:8px;border-radius:6px;border:2px solid ${colors[level]};">
                    <div style="font-size:24px;">${icons[level]}</div>
                    <div style="font-size:12px;font-weight:600;color:${colors[level]};">${level}</div>
                    <div style="font-size:18px;font-weight:700;color:${colors[level]};">${count}</div>
                    <div style="font-size:10px;color:#666;">${percent}%</div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <h5 style="margin-top:12px;">📊 Bar Chart Tingkat Kepadatan</h5>
                <div style="background:#f5f5f5;padding:12px;border-radius:8px;">
        `;
        
        sortedLevels.forEach(level => {
            const count = densityLevels[level] || 0;
            const percent = total > 0 ? ((count / total) * 100) : 0;
            const barWidth = (count / maxCount) * 100;
            
            html += `
                <div style="display:flex;align-items:center;margin:4px 0;">
                    <span style="width:100px;font-size:12px;font-weight:600;color:${colors[level]};">
                        ${icons[level]} ${level}
                    </span>
                    <span style="width:40px;font-size:12px;font-weight:600;text-align:right;margin-right:8px;">
                        ${count}
                    </span>
                    <div class="bar-chart" style="flex:1;height:20px;">
                        <div style="height:100%;width:${barWidth}%;background:${colors[level]};border-radius:4px;transition:width 0.5s;"></div>
                    </div>
                    <span style="width:50px;font-size:11px;color:#666;text-align:right;margin-left:8px;">
                        ${percent.toFixed(1)}%
                    </span>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
            
            <div class="result-section">
                <h5><i class="fas fa-info-circle"></i> Keterangan Tingkat Kepadatan</h5>
                <table>
                    <thead>
                        <tr>
                            <th>Level</th>
                            <th>Icon</th>
                            <th>Kriteria</th>
                            <th>Warna</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>Sangat Tinggi</td><td>🔴</td><td>> 80% dari kepadatan maksimum</td><td style="background:#c62828;color:white;text-align:center;">Merah</td></tr>
                        <tr><td>Tinggi</td><td>🟠</td><td>> 60% - 80% dari kepadatan maksimum</td><td style="background:#e65100;color:white;text-align:center;">Oranye</td></tr>
                        <tr><td>Sedang</td><td>🟡</td><td>> 40% - 60% dari kepadatan maksimum</td><td style="background:#f9a825;color:white;text-align:center;">Kuning</td></tr>
                        <tr><td>Rendah</td><td>🟢</td><td>> 20% - 40% dari kepadatan maksimum</td><td style="background:#2e7d32;color:white;text-align:center;">Hijau</td></tr>
                        <tr><td>Sangat Rendah</td><td>🔵</td><td>≤ 20% dari kepadatan maksimum</td><td
