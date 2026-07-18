/**
 * main.js
 * File utama - HANYA TAMPILKAN DATA VALID
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // ============================================
    // 1. INISIALISASI
    // ============================================
    
    UIController.init();
    const map = MapController.init('map');
    
    // Tampilkan loading
    UIController.showLoading('⏳ Memuat data dari file CSV...');
    updateLoadingProgress(10, 'Mempersiapkan...');
    
    // ============================================
    // 2. LOAD DATA DARI FILE CSV
    // ============================================
    
    const csvFilePath = 'data/data.csv';
    
    // Load data dari file
    DataLoader.loadFromFile(
        csvFilePath,
        function(data, error) {
            if (error) {
                console.error('Gagal memuat data:', error);
                UIController.showInfo('❌ Gagal memuat data dari file. Coba refresh.');
                UIController.hideLoading();
                return;
            }
            
            const validData = data;
            const stats = DataLoader.getStats();
            const invalidCount = DataLoader.getInvalidCount();
            
            console.log('📊 ===== STATISTIK DATA =====');
            console.log(`  - Total data di CSV: ${stats.totalRaw}`);
            console.log(`  - Data VALID: ${validData.length}`);
            console.log(`  - Data INVALID (diabaikan): ${invalidCount}`);
            console.log(`  - Data diperbaiki: ${validData.filter(d => d.isFixed).length}`);
            
            // Update info di UI
            document.getElementById('dataInfo').innerHTML = 
                `<i class="fas fa-check-circle" style="color: #2e7d32;"></i> ${validData.length} data valid (${invalidCount} data invalid diabaikan)`;
            
            if (validData.length === 0) {
                UIController.showInfo('⚠️ Tidak ada data valid di Indonesia. Periksa format koordinat di file CSV.', 5000);
                UIController.hideLoading();
                
                // Tampilkan contoh data invalid
                const invalidLog = DataLoader.getInvalidData();
                if (invalidLog.length > 0) {
                    console.warn('Contoh data invalid:');
                    invalidLog.slice(0, 5).forEach(row => {
                        console.warn(`  - ${row.nama}: lat="${row.lat}", lng="${row.lng}"`);
                    });
                }
                return;
            }
            
            // Update UI
            UIController.updateDataInfo(validData.length);
            
            // Populate filters
            const regionals = DataLoader.getRegionals();
            UIController.populateRegionalFilter(regionals);
            
            const pakets = DataLoader.getPakets();
            UIController.populatePaketFilter(pakets);
            
            UIController.showInfo(`✅ ${validData.length} titik valid siap dianalisis`, 2000);
            
            // Jalankan analisis
            setTimeout(function() {
                UIController.showLoading('🔬 Menganalisis kepadatan...');
                updateLoadingProgress(80, 'Menganalisis data...');
                
                setTimeout(function() {
                    applyAnalysis();
                    UIController.hideLoading();
                    updateLoadingProgress(100, 'Selesai!');
                }, 200);
            }, 300);
        },
        function(progress, message) {
            updateLoadingProgress(progress, message);
        }
    );
    
    // ============================================
    // 3. FUNGSI UPDATE PROGRESS
    // ============================================
    
    function updateLoadingProgress(progress, message) {
        const progressEl = document.getElementById('loadingProgress');
        if (progressEl) {
            const progressText = message || `Memuat data... ${Math.round(progress)}%`;
            progressEl.textContent = progressText;
            
            const loadingText = document.querySelector('.loading-text');
            if (loadingText && progress < 100) {
                loadingText.textContent = progressText;
            }
        }
    }
    
    // ============================================
    // 4. FUNGSI ANALISIS
    // ============================================
    
    let analysisTimeout = null;
    let isAnalyzing = false;
    
    function applyAnalysis() {
        if (isAnalyzing) {
            console.log('⏳ Analisis sedang berjalan, lewati...');
            return;
        }
        
        isAnalyzing = true;
        
        setTimeout(function() {
            try {
                const controls = UIController.getControlValues();
                
                const filters = {
                    regional: controls.regional,
                    paket: controls.paket
                };
                
                // Data sudah difilter hanya yang valid
                let filteredData = DataLoader.getFilteredData(filters);
                
                if (filteredData.length === 0) {
                    UIController.showInfo('⚠️ Tidak ada data sesuai filter', 3000);
                    MapController.clearLayers();
                    MapController.fitToData([]);
                    UIController.updateDataInfo(0);
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
                    // KDE Analysis
                    if (bounds) {
                        const kdeResult = KDEAnalysis.calculateKDE(
                            points,
                            controls.kdeRadius,
                            bounds,
                            30
                        );
                        
                        if (kdeResult) {
                            const heatData = KDEAnalysis.kdeToHeatmapData(kdeResult, 0.01, 2000);
                            
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
                    // Point Density Analysis
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
                            30
                        );
                        
                        if (gridResult) {
                            const heatData = PointDensityAnalysis.gridToHeatmapData(gridResult, 0.01, 2000);
                            
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
                        UIController.showInfo(`🔥 Ditemukan ${hotspotResult.hotspots.length} Hotspot`, 3000);
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
                console.error('Error dalam analisis:', error);
                UIController.showInfo('❌ Error dalam analisis: ' + error.message, 5000);
            } finally {
                isAnalyzing = false;
            }
        }, 50);
    }
    
    function debounceAnalysis() {
        if (analysisTimeout) {
            clearTimeout(analysisTimeout);
        }
        analysisTimeout = setTimeout(function() {
            applyAnalysis();
        }, 300);
    }
    
    // ============================================
    // 5. EVENT LISTENER
    // ============================================
    
    document.getElementById('btnApply')?.addEventListener('click', function() {
        UIController.showLoading('🔄 Menganalisis ulang...');
        setTimeout(function() {
            applyAnalysis();
            setTimeout(function() {
                UIController.hideLoading();
            }, 200);
        }, 100);
    });
    
    document.getElementById('btnReset')?.addEventListener('click', function() {
        MapController.resetView();
        UIController.updateDensityStats(null);
        UIController.showInfo('🔄 Peta direset', 2000);
    });
    
    document.addEventListener('mapMoved', function() {
        debounceAnalysis();
    });
    
    // ============================================
    // 6. HANDLE RESIZE
    // ============================================
    
    let resizeTimeout = null;
    window.addEventListener('resize', function() {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            const map = MapController.getMap();
            if (map) map.invalidateSize();
        }, 200);
    });
    
    // ============================================
    // 7. EXPOSE GLOBAL
    // ============================================
    
    window.webgis = {
        DataLoader: DataLoader,
        KDEAnalysis: KDEAnalysis,
        PointDensityAnalysis: PointDensityAnalysis,
        MapController: MapController,
        UIController: UIController,
        applyAnalysis: applyAnalysis,
        reloadData: function() {
            location.reload();
        }
    };
    
    console.log('✅ WebGIS Density Analysis siap!');
    console.log(`📊 Total data valid: ${DataLoader.getAllData().length} titik`);
    console.log('💡 Data invalid otomatis diabaikan');
});
