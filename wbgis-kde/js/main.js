/**
 * main.js - OPTIMASI SUPER CEPAT
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // ============================================
    // 1. INISIALISASI
    // ============================================
    
    UIController.init();
    const map = MapController.init('map');
    
    // Show loading
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
            
            // Langsung analisis tanpa delay
            applyAnalysis();
            UIController.hideLoading();
        },
        function(progress, message) {
            // Update progress
            const progressEl = document.getElementById('loadingProgress');
            if (progressEl) {
                progressEl.textContent = message || `Loading... ${Math.round(progress)}%`;
            }
        }
    );
    
    // ============================================
    // 3. FUNGSI ANALISIS (Cepat)
    // ============================================
    
    let isAnalyzing = false;
    
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
            
            if (controls.method === 'kde') {
                // KDE Analysis - dengan grid kecil untuk kecepatan
                if (bounds) {
                    const kdeResult = KDEAnalysis.calculateKDE(
                        points,
                        controls.kdeRadius,
                        bounds,
                        25 // Grid lebih kecil untuk kecepatan
                    );
                    
                    if (kdeResult) {
                        const heatData = KDEAnalysis.kdeToHeatmapData(kdeResult, 0.01, 1500);
                        
                        if (controls.showHeatmap && heatData.length > 0) {
                            MapController.showHeatmap(heatData);
                        }
                        
                        const densest = KDEAnalysis.findDensestPoint(kdeResult);
                        const stats = KDEAnalysis.getDensityStats(kdeResult);
                        UIController.updateDensityStats({
                            densestPoint: densest,
                            average: stats ? stats.average : 0
                        });
                    }
                }
                
                if (controls.showMarkers) {
                    MapController.showMarkers(filteredData);
                }
                
            } else if (controls.method === 'point') {
                // Point Density Analysis - cepat
                const densityResult = PointDensityAnalysis.calculatePointDensity(
                    points,
                    controls.pointRadius,
                    bounds
                );
                
                if (bounds) {
                    const gridResult = PointDensityAnalysis.calculateGridDensity(
                        points,
                        controls.pointRadius,
                        bounds,
                        25
                    );
                    
                    if (gridResult) {
                        const heatData = PointDensityAnalysis.gridToHeatmapData(gridResult, 0.01, 1500);
                        
                        if (controls.showHeatmap && heatData.length > 0) {
                            MapController.showHeatmap(heatData, {
                                gradient: {
                                    0.0: 'blue',
                                    0.3: 'cyan',
                                    0.6: 'yellow',
                                    0.8: 'orange',
                                    1.0: 'red'
                                }
                            });
                        }
                        
                        const highest = PointDensityAnalysis.findHighestDensity(gridResult);
                        const stats = PointDensityAnalysis.getDensityStats(gridResult);
                        UIController.updateDensityStats({
                            densestPoint: highest,
                            average: stats ? stats.average : 0
                        });
                    }
                }
                
                // Hotspot & Coldspot
                const hotspotResult = PointDensityAnalysis.identifyHotspots(
                    points,
                    controls.pointRadius,
                    1.5
                );
                
                if (controls.showHotspots && hotspotResult.hotspots.length > 0) {
                    MapController.showHotspots(hotspotResult.hotspots);
                }
                
                if (controls.showColdspots && hotspotResult.coldspots.length > 0) {
                    MapController.showColdspots(hotspotResult.coldspots);
                }
                
                if (controls.showMarkers) {
                    const neutralPoints = hotspotResult.neutral || [];
                    if (neutralPoints.length > 0) {
                        MapController.showMarkers(neutralPoints);
                    }
                }
            }
            
            MapController.fitToData(filteredData);
            
        } catch (error) {
            console.error('Error:', error);
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
