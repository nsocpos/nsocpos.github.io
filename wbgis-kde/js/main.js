/**
 * main.js - DENGAN DATA LENGKAP UNTUK SEMUA LAYER
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // ============================================
    // 1. INISIALISASI
    // ============================================
    
    UIController.init();
    const map = MapController.init('map');
    
    UIController.showLoading('⏳ Memuat data...');
    
    // ============================================
    // 2. LOAD DATA
    // ============================================
    
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
            
            // Update UI
            document.getElementById('dataInfo').innerHTML = 
                `<i class="fas fa-check-circle" style="color: #2e7d32;"></i> ${validData.length} data valid (${stats.invalid} invalid diabaikan)`;
            
            if (validData.length === 0) {
                UIController.showInfo('⚠️ Tidak ada data valid', 3000);
                UIController.hideLoading();
                return;
            }
            
            UIController.updateDataInfo(validData.length);
            
            // Populate filters
            const regionals = DataLoader.getRegionals();
            UIController.populateRegionalFilter(regionals);
            
            const pakets = DataLoader.getPakets();
            UIController.populatePaketFilter(pakets);
            
            // Simpan data untuk digunakan nanti
            window._allData = validData;
            
            // Langsung analisis
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
    
    // ============================================
    // 3. FUNGSI ANALISIS
    // ============================================
    
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
            
            // Siapkan data points
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
            
            // ============================================
            // KDE ANALYSIS
            // ============================================
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
                    const stats = KDEAnalysis.getDensityStats(kdeResult);
                    UIController.updateDensityStats({
                        densestPoint: densest,
                        average: stats ? stats.average : 0
                    });
                    
                    console.log(`✅ KDE selesai: ${heatData.length} titik heatmap`);
                }
            }
            
            // ============================================
            // POINT DENSITY ANALYSIS
            // ============================================
            if (controls.method === 'point') {
                // Hitung density
                densityResult = PointDensityAnalysis.calculatePointDensity(
                    points,
                    controls.pointRadius,
                    bounds
                );
                
                // Grid density untuk heatmap
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
                
                // Identifikasi Hotspot & Coldspot
                hotspotResult = PointDensityAnalysis.identifyHotspots(
                    points,
                    controls.pointRadius,
                    1.5
                );
                
                console.log(`✅ Point Density selesai:`);
                console.log(`  - Hotspot: ${hotspotResult.hotspots.length} titik`);
                console.log(`  - Coldspot: ${hotspotResult.coldspots.length} titik`);
                console.log(`  - Neutral: ${hotspotResult.neutral.length} titik`);
            }
            
            // ============================================
            // TAMPILKAN LAYER
            // ============================================
            
            // 1. Heatmap
            if (controls.showHeatmap && heatData.length > 0) {
                const gradient = controls.method === 'kde' 
                    ? {
                        0.0: 'blue',
                        0.25: 'cyan',
                        0.5: 'lime',
                        0.75: 'yellow',
                        1.0: 'red'
                      }
                    : {
                        0.0: 'blue',
                        0.3: 'cyan',
                        0.6: 'yellow',
                        0.8: 'orange',
                        1.0: 'red'
                      };
                
                MapController.showHeatmap(heatData, { gradient: gradient });
            }
            
            // 2. Marker
            if (controls.showMarkers) {
                // Jika ada data density, gunakan dengan status
                if (densityResult.length > 0) {
                    MapController.showMarkers(densityResult);
                } else {
                    MapController.showMarkers(filteredData);
                }
            }
            
            // 3. Hotspot
            if (controls.showHotspots && hotspotResult && hotspotResult.hotspots.length > 0) {
                MapController.showHotspots(hotspotResult.hotspots);
                UIController.showInfo(`🔥 Ditemukan ${hotspotResult.hotspots.length} Hotspot`, 3000);
            }
            
            // 4. Coldspot
            if (controls.showColdspots && hotspotResult && hotspotResult.coldspots.length > 0) {
                MapController.showColdspots(hotspotResult.coldspots);
            }
            
            // Simpan hasil untuk referensi
            lastResults = {
                filteredData,
                points,
                heatData,
                hotspotResult,
                densityResult
            };
            
            // Fit peta ke data
            MapController.fitToData(filteredData);
            
        } catch (error) {
            console.error('Error dalam analisis:', error);
            UIController.showInfo('❌ Error: ' + error.message, 5000);
        } finally {
            isAnalyzing = false;
        }
    }
    
    // ============================================
    // 4. EVENT LISTENER
    // ============================================
    
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
    
    // Auto-apply saat checkbox berubah
    document.querySelectorAll('#showHeatmap, #showMarkers, #showHotspots, #showColdspots').forEach(el => {
        el?.addEventListener('change', function() {
            if (lastResults) {
                // Re-apply dengan data yang sama
                const controls = UIController.getControlValues();
                const filteredData = lastResults.filteredData || [];
                
                if (filteredData.length === 0) return;
                
                MapController.clearLayers();
                
                // Tampilkan layer berdasarkan checkbox
                if (controls.showHeatmap && lastResults.heatData && lastResults.heatData.length > 0) {
                    MapController.showHeatmap(lastResults.heatData);
                }
                
                if (controls.showMarkers) {
                    if (lastResults.densityResult && lastResults.densityResult.length > 0) {
                        MapController.showMarkers(lastResults.densityResult);
                    } else {
                        MapController.showMarkers(filteredData);
                    }
                }
                
                if (controls.showHotspots && lastResults.hotspotResult && lastResults.hotspotResult.hotspots.length > 0) {
                    MapController.showHotspots(lastResults.hotspotResult.hotspots);
                }
                
                if (controls.showColdspots && lastResults.hotspotResult && lastResults.hotspotResult.coldspots.length > 0) {
                    MapController.showColdspots(lastResults.hotspotResult.coldspots);
                }
            }
        });
    });
    
    // ============================================
    // 5. EXPOSE GLOBAL
    // ============================================
    
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
