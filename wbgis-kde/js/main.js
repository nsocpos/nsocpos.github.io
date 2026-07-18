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
PAKET 1;19000;KTPU JAKARTASOEKARNOHATTA;-;REGIONAL
