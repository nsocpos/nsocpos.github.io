/**
 * main.js
 * File utama untuk inisialisasi WebGIS KDE
 */

// Menunggu semua library siap
document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // ============================================
    // 1. INISIALISASI
    // ============================================
    
    // Inisialisasi UI Controller
    UIController.init();
    
    // Inisialisasi Map Controller
    const map = MapController.init('map');
    
    // Tampilkan loading
    UIController.showLoading('Memuat Data dan Menganalisis...');
    
    // ============================================
    // 2. DATA
    // ============================================
    
    // Data CSV (dari data/data.csv)
    const csvData = `Paket;NOPEN;NAMA KANTOR;NOPEN INDUK;REGIONAL;JENIS KANTOR;Status PSO;ALAMAT;PROVINSI;LATITUDE;LONGITUDE
    PAKET 1;20000;MEDAN;-;REGIONAL 1;KCU;Non LPU;Jl. Pos No. 1 Medan 20111, Kel. Kesawan, Kec. Medan Barat, Medan;Sumatera Utara;3.591.867;98.677.388
    PAKET 1;20004;KANTOR REGIONAL 1;-;REGIONAL 1;KCU;Non LPU;Jl. Prof. H.M. Yamin, S.H. No. 44,Kel. Gunung Batu, Kec. Medan Timur, Medan 20231;Sumatera Utara;3.594.084;98.680.461
    PAKET 1;20900;SPP MEDAN;-;REGIONAL 1;KCU;Non LPU;Jl.Raya Medan - Tanjung Merawa, Kel. Tanjung Baru, Kec. Tanjung Merawa, Deli Serdang;Sumatera Utara;3.550.943;98.828.371
    PAKET 2A;86700;KOMODO;-;REGIONAL 5;KC;Non LPU;Jl. Soekarno Hatta No 77, Kel. Labuanbajo, Kec. Komodo, Manggarai Barat;Nusa Tenggara Timur;-8.494.628;119.878.72
    PAKET 2A;87100;WAINGAPU;-;REGIONAL 5;KC;Non LPU;Jl. Dr.Sutomo No. 21, Wgp 87111, Kel. Kamalaputi, Kec. Kota Waingapu, Sumba Timur;Nusa Tenggara Timur;-9.642.859;120.258.545`;
    
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
        
        console.log(`Data berhasil dimuat: ${data.length} titik`);
        
        // Update UI
        UIController.updateDataInfo(data.length);
        
        // Populate filter regional
        const regionals = DataLoader.getRegionals();
        UIController.populateRegionalFilter(regionals);
        
        // Apply analisis awal
        applyAnalysis();
        
        // Sembunyikan loading
        UIController.hideLoading();
    });
    
    // ============================================
    // 4. FUNGSI ANALISIS
    // ============================================
    
    function applyAnalysis() {
        // Ambil nilai kontrol
        const controls = UIController.getControlValues();
        
        // Filter data
        const filters = {
            regional: controls.regional
        };
        const filteredData = DataLoader.getFilteredData(filters);
        
        if (filteredData.length === 0) {
            UIController.showInfo('Tidak ada data yang sesuai dengan filter');
            return;
        }
        
        UIController.updateDataInfo(filteredData.length);
        
        // Bersihkan layer lama
        MapController.clearLayers();
        
        // Siapkan data untuk heatmap
        const points = filteredData.map(row => ({
            lat: row.lat,
            lng: row.lng,
            intensity: 1.0
        }));
        
        // Analisis berdasarkan metode
        if (controls.method === 'kde') {
            // Gunakan KDE
            const bounds = MapController.getBounds();
            if (bounds) {
                const kdeResult = KDEAnalysis.calculateKDE(
                    points,
                    controls.radius,
                    bounds,
                    50
                );
                
                if (kdeResult) {
                    // Konversi ke heatmap data
                    const heatData = KDEAnalysis.kdeToHeatmapData(kdeResult, 0.01);
                    
                    // Tampilkan heatmap
                    if (controls.showHeatmap && heatData.length > 0) {
                        MapController.showHeatmap(heatData);
                    }
                    
                    // Update statistik
                    const densest = KDEAnalysis.findDensestPoint(kdeResult);
                    const stats = KDEAnalysis.getDensityStats(kdeResult);
                    UIController.updateDensityStats({
                        densestPoint: densest,
                        average: stats ? stats.average : 0
                    });
                }
            }
        } else if (controls.method === 'heatmap') {
            // Heatmap standar
            const heatData = points.map(p => [p.lat, p.lng, 1.0]);
            const radius = controls.radius * 5; // Konversi km ke pixel
            
            if (controls.showHeatmap) {
                MapController.showHeatmap(heatData, { radius: radius });
            }
            
            // Reset statistik
            UIController.updateDensityStats(null);
        }
        
        // Tampilkan marker
        if (controls.showMarkers) {
            MapController.showMarkers(filteredData);
        }
        
        // Tampilkan cluster
        if (controls.showCluster && controls.method === 'cluster') {
            MapController.showClusters(filteredData);
        }
        
        // Fit peta ke data
        MapController.fitToData(filteredData);
    }
    
    // ============================================
    // 5. EVENT LISTENER
    // ============================================
    
    // Tombol Apply Analysis
    document.querySelector('.btn-primary')?.addEventListener('click', function() {
        UIController.showLoading('Menganalisis data...');
        setTimeout(() => {
            applyAnalysis();
            UIController.hideLoading();
            UIController.showInfo('Analisis selesai diterapkan');
        }, 300);
    });
    
    // Tombol Reset
    document.querySelector('.btn-danger')?.addEventListener('click', function() {
        MapController.resetView();
        UIController.updateDensityStats(null);
        UIController.showInfo('Peta telah direset');
    });
    
    // Tombol Export
    document.querySelector('.btn-success')?.addEventListener('click', function() {
        const controls = UIController.getControlValues();
        const filters = { regional: controls.regional };
        const data = DataLoader.getFilteredData(filters);
        
        if (data.length === 0) {
            UIController.showInfo('Tidak ada data untuk diekspor');
            return;
        }
        
        // Ekspor ke CSV
        const headers = ['Paket', 'NAMA KANTOR', 'REGIONAL', 'ALAMAT', 'PROVINSI', 'LATITUDE', 'LONGITUDE'];
        let csvContent = headers.join(';') + '\n';
        
        data.forEach(row => {
            const values = headers.map(h => {
                if (h === 'LATITUDE') return row.lat;
                if (h === 'LONGITUDE') return row.lng;
                return `"${(row[h] || '').replace(/"/g, '""')}"`;
            });
            csvContent += values.join(';') + '\n';
        });
        
        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `analisis_kepadatan_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        
        UIController.showInfo('Data berhasil diekspor');
    });
    
    // Auto-apply ketika map bergerak (untuk KDE real-time)
    document.addEventListener('mapMoved', function() {
        // Optional: auto-apply dengan debounce
        // clearTimeout(window._kdeTimeout);
        // window._kdeTimeout = setTimeout(() => {
        //     applyAnalysis();
        // }, 500);
    });
    
    // ============================================
    // 6. HANDLE RESIZE
    // ============================================
    
    window.addEventListener('resize', function() {
        const map = MapController.getMap();
        if (map) {
            map.invalidateSize();
        }
    });
    
    // ============================================
    // 7. EXPOSE GLOBAL
    // ============================================
    
    // Expose untuk debugging
    window.webgis = {
        DataLoader: DataLoader,
        KDEAnalysis: KDEAnalysis,
        MapController: MapController,
        UIController: UIController,
        applyAnalysis: applyAnalysis
    };
    
    console.log('✅ WebGIS KDE berhasil diinisialisasi');
    console.log(`📊 Total data: ${DataLoader.getAllData().length} titik`);
    console.log('🌐 Gunakan window.webgis untuk debugging');
});