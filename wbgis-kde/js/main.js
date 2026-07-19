/**
 * main.js - DENGAN FILTER LAYER DAN TABEL HASIL
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    UIController.init();
    const map = MapController.init('map');
    UIController.showLoading('⏳ Memuat data...');
    
    const csvFilePath = 'data/data.csv';
    
    DataLoader.loadFromFile(
        csvFilePath,
        function(data, error) {
            if (error) {
                console.error('Error:', error);
                UIController.showInfo('❌ Gagal memuat data');
                UIController.hideLoading();
                return;
            }
            
            const validData = data;
            const stats = DataLoader.getStats();
            
            console.log(`✅ Loaded ${validData.length} valid data (${stats.invalid} invalid skipped)`);
            
            document.getElementById('dataInfo').innerHTML = 
                `<i class="fas fa-check-circle" style="color: #2e7d32;"></i> ${validData.length} data valid (${stats.invalid} invalid diabaikan)`;
            
            if (validData.length === 0) {
                UIController.showInfo('⚠️ Tidak ada data valid', 3000);
                UIController.hideLoading();
                return;
            }
            
            UIController.updateDataInfo(validData.length);
            
            const regionals = DataLoader.getRegionals();
            UIController.populateRegionalFilter(regionals);
            
            const pakets = DataLoader.getPakets();
            UIController.populatePaketFilter(pakets);
            
            window._allData = validData;
            
            applyAnalysis();
            UIController.hideLoading();
        },
        function(progress, message) {
            const progressEl = document.getElementById('loadingProgress');
            if (progressEl) {
                progressEl.textContent = message || `Loading... ${Math.round(progress)}%`;
            }
        }
    );
    
    let isAnalyzing = false;
    let lastResults = null;
    
    function applyAnalysis() {
        if (isAnalyzing) return;
        isAnalyzing = true;
        
        try {
            const controls = UIController.getControlValues();
            
            const filters = {
                regional: controls.regional,
                paket: controls.paket
            };
            
            let filteredData = DataLoader.getFilteredData(filters);
            
            if (filteredData.length === 0) {
                UIController.showInfo('⚠️ Tidak ada data sesuai filter', 2000);
                MapController.clearLayers();
                isAnalyzing = false;
                return;
            }
            
            UIController.updateDataInfo(filteredData.length);
            MapController.clearLayers();
            
            const points = filteredData.map(row => ({
                lat: row.lat,
                lng: row.lng,
                intensity: 1.0,
                ...row
            }));
            
            const bounds = MapController.getBounds();
            let heatData = [];
            let hotspotResult = null;
            let densityResult = [];
            let kdeStats = null;
            
            // KDE Analysis
            if (controls.method === 'kde' && bounds) {
                const kdeResult = KDEAnalysis.calculateKDE(
                    points,
                    controls.kdeRadius,
                    bounds,
                    30
                );
                
                if (kdeResult) {
                    heatData = KDEAnalysis.kdeToHeatmapData(kdeResult, 0.01, 2000);
                    const densest = KDEAnalysis.findDensestPoint(kdeResult);
                    kdeStats = KDEAnalysis.getDensityStats(kdeResult);
                    UIController.updateDensityStats({
                        densestPoint: densest,
                        average: kdeStats ? kdeStats.average : 0
                    });
                    console.log(`✅ KDE selesai: ${heatData.length} titik heatmap`);
                }
            }
            
            // Point Density Analysis
            if (controls.method === 'point') {
                densityResult = PointDensityAnalysis.calculatePointDensity(
                    points,
                    controls.pointRadius,
                    bounds
                );
                
                if (bounds) {
                    const gridResult = PointDensityAnalysis.calculateGridDensity(
                        points,
                        controls.pointRadius,
                        bounds,
                        30
                    );
                    
                    if (gridResult) {
                        heatData = PointDensityAnalysis.gridToHeatmapData(gridResult, 0.01, 2000);
                        const highest = PointDensityAnalysis.findHighestDensity(gridResult);
                        const stats = PointDensityAnalysis.getDensityStats(gridResult);
                        UIController.updateDensityStats({
                            densestPoint: highest,
                            average: stats ? stats.average : 0
                        });
                    }
                }
                
                hotspotResult = PointDensityAnalysis.identifyHotspots(
                    points,
                    controls.pointRadius,
                    1.5
                );
                
                console.log(`✅ Point Density selesai:`);
                console.log(`  - Hotspot: ${hotspotResult.hotspots.length} titik`);
                console.log(`  - Coldspot: ${hotspotResult.coldspots.length} titik`);
            }
            
            // Tampilkan Layer
            if (controls.showHeatmap && heatData.length > 0) {
                const gradient = controls.method === 'kde' 
                    ? { 0.0: 'blue', 0.25: 'cyan', 0.5: 'lime', 0.75: 'yellow', 1.0: 'red' }
                    : { 0.0: 'blue', 0.3: 'cyan', 0.6: 'yellow', 0.8: 'orange', 1.0: 'red' };
                
                MapController.showHeatmap(heatData, { gradient: gradient });
            }
            
            if (controls.showMarkers) {
                if (densityResult.length > 0) {
                    MapController.showMarkers(densityResult);
                } else {
                    MapController.showMarkers(filteredData);
                }
            }
            
            if (controls.showHotspots && hotspotResult && hotspotResult.hotspots.length > 0) {
                MapController.showHotspots(hotspotResult.hotspots);
                UIController.showInfo(`🔥 Ditemukan ${hotspotResult.hotspots.length} Hotspot`, 3000);
            }
            
            if (controls.showColdspots && hotspotResult && hotspotResult.coldspots.length > 0) {
                MapController.showColdspots(hotspotResult.coldspots);
            }
            
            // Siapkan data tabel
            const regionalMap = {};
            const allDataWithStatus = [];
            
            if (densityResult.length > 0) {
                densityResult.forEach(item => {
                    const regional = item['REGIONAL'] || 'Unknown';
                    if (!regionalMap[regional]) {
                        regionalMap[regional] = { total: 0, hotspot: 0, coldspot: 0, neutral: 0 };
                    }
                    regionalMap[regional].total++;
                    if (item.isHotspot) regionalMap[regional].hotspot++;
                    else if (item.isColdspot) regionalMap[regional].coldspot++;
                    else regionalMap[regional].neutral++;
                    
                    allDataWithStatus.push({
                        ...item,
                        status: item.isHotspot ? 'hotspot' : (item.isColdspot ? 'coldspot' : 'neutral')
                    });
                });
            } else {
                filteredData.forEach(item => {
                    const regional = item['REGIONAL'] || 'Unknown';
                    if (!regionalMap[regional]) {
                        regionalMap[regional] = { total: 0, hotspot: 0, coldspot: 0, neutral: 0 };
                    }
                    regionalMap[regional].total++;
                    regionalMap[regional].neutral++;
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
            
            const tableResults = {
                total: allDataWithStatus.length,
                hotspotCount: hotspotResult ? hotspotResult.hotspots.length : 0,
                coldspotCount: hotspotResult ? hotspotResult.coldspots.length : 0,
                hotspots: hotspotResult ? hotspotResult.hotspots : [],
                coldspots: hotspotResult ? hotspotResult.coldspots : [],
                allData: allDataWithStatus,
                regionalData: regionalData,
                method: controls.method,
                radius: controls.method === 'kde' ? controls.kdeRadius : controls.pointRadius
            };
            
            lastResults = tableResults;
            
            let activeFilter = 'all';
            if (controls.showHeatmap && !controls.showMarkers && !controls.showHotspots && !controls.showColdspots) {
                activeFilter = 'heatmap';
            } else if (controls.showHotspots && !controls.showHeatmap && !controls.showMarkers && !controls.showColdspots) {
                activeFilter = 'hotspot';
            } else if (controls.showColdspots && !controls.showHeatmap && !controls.showMarkers && !controls.showHotspots) {
                activeFilter = 'coldspot';
            } else if (controls.showMarkers && !controls.showHeatmap && !controls.showHotspots && !controls.showColdspots) {
                activeFilter = 'marker';
            }
            
            UIController.showResultsTable(tableResults, activeFilter);
            MapController.fitToData(filteredData);
            
        } catch (error) {
            console.error('Error:', error);
            UIController.showInfo('❌ Error: ' + error.message, 5000);
        } finally {
            isAnalyzing = false;
        }
    }
    
    document.getElementById('btnApply')?.addEventListener('click', function() {
        UIController.showLoading('🔄 Analisis...');
        setTimeout(() => {
            applyAnalysis();
            UIController.hideLoading();
        }, 50);
    });
    
    document.getElementById('btnReset')?.addEventListener('click', function() {
        MapController.resetView();
        UIController.updateDensityStats(null);
        UIController.showInfo('🔄 Reset', 1500);
    });
    
    document.querySelectorAll('#showHeatmap, #showMarkers, #showHotspots, #showColdspots').forEach(el => {
        el?.addEventListener('change', function() {
            if (lastResults) {
                const controls = UIController.getControlValues();
                const filteredData = lastResults.allData || [];
                
                if (filteredData.length === 0) return;
                
                MapController.clearLayers();
                
                if (controls.showHeatmap && lastResults.heatData && lastResults.heatData.length > 0) {
                    MapController.showHeatmap(lastResults.heatData);
                }
                
                if (controls.showMarkers) {
                    if (lastResults.allData && lastResults.allData.length > 0) {
                        MapController.showMarkers(lastResults.allData);
                    }
                }
                
                if (controls.showHotspots && lastResults.hotspots && lastResults.hotspots.length > 0) {
                    MapController.showHotspots(lastResults.hotspots);
                }
                
                if (controls.showColdspots && lastResults.coldspots && lastResults.coldspots.length > 0) {
                    MapController.showColdspots(lastResults.coldspots);
                }
            }
        });
    });
    
    window.webgis = {
        DataLoader: DataLoader,
        KDEAnalysis: KDEAnalysis,
        PointDensityAnalysis: PointDensityAnalysis,
        MapController: MapController,
        UIController: UIController,
        applyAnalysis: applyAnalysis,
        reload: () => location.reload()
    };
    
    console.log('✅ WebGIS siap!');
    console.log(`📊 ${DataLoader.getAllData().length} data valid`);
});
