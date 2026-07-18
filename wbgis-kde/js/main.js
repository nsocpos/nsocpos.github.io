/**
 * main.js
 * File utama untuk inisialisasi WebGIS dengan KDE & Point Density
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // ============================================
    // 1. INISIALISASI
    // ============================================
    
    UIController.init();
    const map = MapController.init('map');
    UIController.showLoading('Memuat Data dan Menganalisis...');
    
    // ============================================
    // 2. DATA
    // ============================================
    
    const csvData = `Paket;NOPEN;NAMA KANTOR;NOPEN INDUK;REGIONAL;JENIS KANTOR;Status PSO;ALAMAT;PROVINSI;LATITUDE;LONGITUDE
PAKET 1;20000;MEDAN;-;REGIONAL 1;KCU;Non LPU;Jl. Pos No. 1 Medan 20111, Kel. Kesawan, Kec. Medan Barat, Medan;Sumatera Utara;3.591867;98.677388
PAKET 1;20004;KANTOR REGIONAL 1;-;REGIONAL 1;KCU;Non LPU;Jl. Prof. H.M. Yamin, S.H. No. 44,Kel. Gunung Batu, Kec. Medan Timur, Medan 20231;Sumatera Utara;3.594084;98.680461
PAKET 1;20900;SPP MEDAN;-;REGIONAL 1;KCU;Non LPU;Jl.Raya Medan - Tanjung Merawa, Kel. Tanjung Baru, Kec. Tanjung Merawa, Deli Serdang;Sumatera Utara;3.550943;98.828371
PAKET 1;23000;BANDAACEH;-;REGIONAL 1;SPP;Non LPU;Jl. T. Hamzah Bendahara No. 33 Banda Aceh, Kel. Kuta Alam, Kec. Kuta Alam, Banda Aceh;Nanggroe Aceh Darussalam;5.555873;95.321237
PAKET 1;25000;PADANG;-;REGIONAL 1;KCU;Non LPU;Jl. Bagindo Azis Can No. 7 Padang, Kel. Pasar Baru, Kec. Padang Barat, Padang;Sumatera Barat;-0.950585;100.361237
PAKET 1;18000;KTPL TANJUNGPRIOK;-;REGIONAL 2;Kantor Regional;Non LPU;Jl. Cumi No. 38-39, Tanjung Priok;DKI Jakarta;-6.132055;106.871485
PAKET 1;19000;KTPU JAKARTASOEKARNOHATTA;-;REGIONAL 2;SPP;Non LPU;Jl. Cargo Area Bandara International Soekaro Hatta, Kel. Benda, Kec. Benda, Tangerang Banten;Banten;-6.124340;106.659253
PAKET 1;42100;SERANG;-;REGIONAL 2;KCU;Non LPU;Jl. Veteran No. 3 Serang, Kel. Kotabaru, Kec. Serang, Serang;Banten;-6.116375;106.152864
PAKET 2A;15400;TANGERANGSELATAN;-;REGIONAL 2;KC;Non LPU;Jl. RE Martadinata No. 17, Kel. Pondok Cabe, Kec. Udik Pamulang, Tangerang Selatan;Banten;-6.346064;106.749454
PAKET 2A;16400;DEPOK;-;REGIONAL 2;KC;Non LPU;Jl. Sentosa Raya No. 3, Kel. Mekarjaya, Kec. Sukmajaya, Depok;Jawa Barat;-6.396079;106.836847
PAKET 2A;16900;CIBINONG;-;REGIONAL 2;KC;Non LPU;Jl. Tegar Beriman Blok B-4 No. 7, Kel. Pakansari, Kec. Cibinong, Bogor;Jawa Barat;-6.483499;106.832155
PAKET 2A;42400;CILEGON;-;REGIONAL 2;KC;Non LPU;Jl. TB Ismail Kav Blok F No. 105 Cilegon, Kel. Ciwaduk, Kec. Cilegon, Cilegon;Banten;-6.025851;106.049733
PAKET 1;40000;BANDUNG;-;REGIONAL 3;KCU;Non LPU;Jl. Asia Afrika No. 49 Bandung, Kel. Braga, Kec. Sumur Bandung, Bandung;Jawa Barat;-6.920837;107.606172
PAKET 1;40004;KANTOR REGIONAL 3 BANDUNG;-;REGIONAL 3;KCU;Non LPU;Jl. Pahlawan No. 87, Bandung 40123, Kel. Sukaluyu, Kec. Cibeunying Kaler, Bandung;Jawa Barat;-6.894180;107.634677
PAKET 1;40400;SPP BANDUNG;-;REGIONAL 3;SPP;Non LPU;Jl. Soekarno Hatta No. 558, Kel. Sekejati, Kec. Buahbatu, Bandung;Jawa Barat;-6.943084;107.651001
PAKET 1;41300;KARAWANG;-;REGIONAL 3;KCU;Non LPU;Jl. Alun-Alun Selatan No. 1, Kel. Nagasari, Kec. Karawang Barat, Karawang;Jawa Barat;-6.310921;107.293386
PAKET 1;45100;CIREBON;-;REGIONAL 3;KCU;Non LPU;Jl. Yos Sudarso No. 9, Kel. Lemah Wungkuk, Kec. Lemah Wungkuk, Cirebon;Jawa Barat;-6.719652;108.571988
PAKET 3A;54212;Kutoarjo;54100;REGIONAL 4;KCP;Non LPU;Jl. Kantor Pos No. 5 Kutoarjo, Kel. Kutoarjo, Kec. Kutoarjo, Purworejo;Jawa Tengah;-7.725492;109.907194
PAKET 3A;54411;Gombong;54300;REGIONAL 4;KCP;Non LPU;Jl. Dewi Sartika No. 66, Kel. Gombong, Kec. Gombong, Kebumen;Jawa Tengah;-7.603598;109.513432
PAKET 3A;55197;Banguntapan;55000;REGIONAL 4;KCP;Non LPU;Wiyoro Baturetno, Kel. Baturetno, Kec. Banguntapan, Bantul;Daerah Istimewa Yogyakarta;-7.819672;110.415704
PAKET 3A;55500;Sleman;55000;REGIONAL 4;KCP;Non LPU;Jl. Bayangkara No. 20, Kel. Triharjo, Kec. Sleman, Sleman;Daerah Istimewa Yogyakarta;-7.697611;110.347153
PAKET 3A;55564;Godean;55000;REGIONAL 4;KCP;Non LPU;Jl. Raya Godean, Kel. Sidoluhur, Kec. Godean, Sleman;Daerah Istimewa Yogyakarta;-7.765378;110.287887
PAKET 4;61256;Waru;61200;REGIONAL 5;KCP;Non LPU;Jl. Jend. S. Parman 3 no. 28, Kel.Waru, Kec.Waru, Sidoarjo;Jawa Timur;-7.357184;112.727649
PAKET 4;84356;Jereweh;84300;REGIONAL 5;KCP;LPU 2024;Jl. Pendidikan Jereweh, Kel.Belu, Kec.Jereweh, Sumbawa Barat;Nusa Tenggara Barat;-8.903725;116.961690
PAKET 4;67354;Randuagung;67300;REGIONAL 5;KCP;LPU 2024;Jl. Randuagung No. 94, Kel. Randuagung, Kec. Randuagung, Lumajang;Jawa Timur;-8.069751;113.302532
PAKET 4;61353;Kemlagi;61300;REGIONAL 5;KCP;LPU 2024;Jl. Raya Kemlagi, Mojokerto, Kel. Mojokumpul, Kec. Kemlagi, Mojokerto;Jawa Timur;-7.234820;112.223940
PAKET 3B;93351;Toronipa;93000;REGIONAL 6;KCP;LPU 2023;Jl. Toronipa, Kel. Toronipa, Kec. Soropia, Konawe;Sulawesi Tenggara;-3.908907;122.659876
PAKET 3B;93352;Tinobu;93000;REGIONAL 6;KCP;LPU 2023;Jl. Tinobu, Kel. Tinobu, Kec. Lasolo, Konawe Utara;Sulawesi Tenggara;-3.640879;122.213761
PAKET 3B;93373;Landono;93000;REGIONAL 6;KCP;LPU 2023;Jl. Poros Ldo - Mowila, Kel. Landono, Kec. Landono, Konawe Selatan;Sulawesi Tenggara;-4.090894;122.309056
PAKET 2B;97700;TERNATE;-;REGIONAL 6;KC;Non LPU;Jl. Pahlawan Revolusi No. 154, Kel. Gamalama, Kec. Ternate Utara, Ternate Maluku Utara;Maluku Utara;0.788137;127.388464
PAKET 2B;98100;BIAK;-;REGIONAL 6;KC;Non LPU;Jl. M Yamin No. 59 Biak 98111, Kel. Mandala Biak, Kec. Kota Biak, Numfor;Papua;-1.188730;136.098343
PAKET 2B;98300;MANOKWARI;-;REGIONAL 6;KC;Non LPU;Jl. Siliwangi No. 28 Manokwari, Kel. Manokwari Timur, Kec. Manokwari Timur, Manokwari;Papua Barat;-0.867541;134.075749`;
    
    // ============================================
    // 3. LOAD DATA
    // ============================================
    
    DataLoader.loadFromCSV(csvData, function(data, error) {
        if (error) {
            console.error('Gagal memuat data:', error);
            UIController.showInfo('Gagal memuat data. Silakan refresh halaman.');
            UIController.hideLoading();
            return;
        }
        
        const indonesiaData = data.filter(row => {
            return MapController.isInIndonesia(row.lat, row.lng);
        });
        
        console.log(`✅ Data berhasil dimuat: ${indonesiaData.length} titik di Indonesia`);
        
        UIController.updateDataInfo(indonesiaData.length);
        
        const regionals = DataLoader.getRegionals();
        UIController.populateRegionalFilter(regionals);
        
        const pakets = DataLoader.getPakets();
        UIController.populatePaketFilter(pakets);
        
        applyAnalysis();
        UIController.hideLoading();
    });
    
    // ============================================
    // 4. FUNGSI ANALISIS
    // ============================================
    
    function applyAnalysis() {
        const controls = UIController.getControlValues();
        
        const filters = {
            regional: controls.regional,
            paket: controls.paket
        };
        
        let filteredData = DataLoader.getFilteredData(filters);
        filteredData = filteredData.filter(row => {
            return MapController.isInIndonesia(row.lat, row.lng);
        });
        
        if (filteredData.length === 0) {
            UIController.showInfo('⚠️ Tidak ada data yang sesuai dengan filter di Indonesia');
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
            // ============================================
            // KERNEL DENSITY ESTIMATION
            // ============================================
            
            if (bounds) {
                const kdeResult = KDEAnalysis.calculateKDE(
                    points,
                    controls.kdeRadius,
                    bounds,
                    50
                );
                
                if (kdeResult) {
                    const heatData = KDEAnalysis.kdeToHeatmapData(kdeResult, 0.01);
                    
                    if (controls.showHeatmap && heatData.length > 0) {
                        MapController.showHeatmap(heatData);
                    }
                    
                    const densest = KDEAnalysis.findDensestPoint(kdeResult);
                    const stats = KDEAnalysis.getDensityStats(kdeResult);
                    UIController.updateDensityStats({
                        densestPoint: densest,
                        average: stats ? stats.average : 0
                    });
                    
                    UIController.showInfo('✅ Analisis KDE selesai. Area terpadat ditemukan.', 3000);
                }
            }
            
            if (controls.showMarkers) {
                MapController.showMarkers(filteredData);
            }
            
        } else if (controls.method === 'point') {
            // ============================================
            // POINT DENSITY ANALYSIS
            // ============================================
            
            // Hitung density untuk setiap titik
            const densityResult = PointDensityAnalysis.calculatePointDensity(
                points,
                controls.pointRadius,
                bounds
            );
            
            // Hitung grid density untuk heatmap
            if (bounds) {
                const gridResult = PointDensityAnalysis.calculateGridDensity(
                    points,
                    controls.pointRadius,
                    bounds,
                    50
                );
                
                if (gridResult) {
                    const heatData = PointDensityAnalysis.gridToHeatmapData(gridResult, 0.01);
                    
                    if (controls.showHeatmap && heatData.length > 0) {
                        // Gunakan gradient yang berbeda untuk point density
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
            
            // Identifikasi Hotspot dan Coldspot
            const hotspotResult = PointDensityAnalysis.identifyHotspots(
                points,
                controls.pointRadius,
                1.5
            );
            
            // Tampilkan Hotspots (merah)
            if (controls.showHotspots && hotspotResult.hotspots.length > 0) {
                MapController.showHotspots(hotspotResult.hotspots);
                UIController.showInfo(`🔥 Ditemukan ${hotspotResult.hotspots.length} Hotspot`, 4000);
            }
            
            // Tampilkan Coldspots (biru)
            if (controls.showColdspots && hotspotResult.coldspots.length > 0) {
                MapController.showColdspots(hotspotResult.coldspots);
            }
            
            // Tampilkan marker biasa jika tidak ada hotspot/coldspot
            if (controls.showMarkers) {
                const neutralPoints = hotspotResult.neutral || [];
                if (neutralPoints.length > 0) {
                    MapController.showMarkers(neutralPoints);
                }
            }
            
            // Tampilkan statistik tambahan
            console.log(`📊 Point Density Stats:`);
            console.log(`  - Hotspot: ${hotspotResult.stats.hotspotCount}`);
            console.log(`  - Coldspot: ${hotspotResult.stats.coldspotCount}`);
            console.log(`  - Neutral: ${hotspotResult.stats.neutralCount}`);
        }
        
        // Fit peta ke data
        MapController.fitToData(filteredData);
    }
    
    // ============================================
    // 5. EVENT LISTENER
    // ============================================
    
    document.querySelector('.btn-primary')?.addEventListener('click', function() {
        UIController.showLoading('Menganalisis data...');
        setTimeout(() => {
            applyAnalysis();
            UIController.hideLoading();
        }, 300);
    });
    
    document.querySelector('.btn-danger')?.addEventListener('click', function() {
        MapController.resetView();
        UIController.updateDensityStats(null);
        UIController.showInfo('🔄 Peta telah direset');
    });
    
    document.querySelector('.btn-success')?.addEventListener('click', function() {
        const controls = UIController.getControlValues();
        const filters = {
            regional: controls.regional,
            paket: controls.paket
        };
        let data = DataLoader.getFilteredData(filters);
        data = data.filter(row => MapController.isInIndonesia(row.lat, row.lng));
        
        if (data.length === 0) {
            UIController.showInfo('Tidak ada data untuk diekspor');
            return;
        }
        
        const headers = ['Paket', 'NAMA KANTOR', 'REGIONAL', 'PROVINSI', 'ALAMAT', 'LATITUDE', 'LONGITUDE'];
        let csvContent = headers.join(';') + '\n';
        
        data.forEach(row => {
            const values = headers.map(h => {
                if (h === 'LATITUDE') return row.lat;
                if (h === 'LONGITUDE') return row.lng;
                return `"${(row[h] || '').replace(/"/g, '""')}"`;
            });
            csvContent += values.join(';') + '\n';
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `analisis_kepadatan_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        
        UIController.showInfo('✅ Data berhasil diekspor');
    });
    
    // ============================================
    // 6. HANDLE RESIZE
    // ============================================
    
    window.addEventListener('resize', function() {
        const map = MapController.getMap();
        if (map) map.invalidateSize();
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
        applyAnalysis: applyAnalysis
    };
    
    console.log('✅ WebGIS Density Analysis berhasil diinisialisasi');
    console.log(`📊 Total data: ${DataLoader.getAllData().length} titik`);
    console.log('🌐 Gunakan window.webgis untuk debugging');
});
