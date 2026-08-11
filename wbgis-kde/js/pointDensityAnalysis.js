/**
 * pointDensityAnalysis.js
 * ---------------------------------------------------------
 * Point Density Analysis untuk Eksperimen
 *
 * Fungsi utama:
 * 1. Menghitung kepadatan titik berdasarkan radius tertentu.
 * 2. Menghitung kepadatan pada grid.
 * 3. Mengubah hasil grid menjadi data heatmap.
 * 4. Menentukan lokasi dengan kepadatan tertinggi.
 * 5. Menghitung statistik kepadatan.
 * 6. Mengidentifikasi hotspot dan coldspot.
 * ---------------------------------------------------------
 */

const PointDensityAnalysis = (function() {
    'use strict';

    /**
     * ======================================================
     * 1. CALCULATE POINT DENSITY
     * ======================================================
     *
     * Menghitung jumlah titik lain yang berada dalam
     * radius tertentu dari setiap titik.
     *
     * Parameter:
     * @param {Array} points  - Data titik koordinat.
     * @param {Number} radius - Radius pencarian dalam kilometer.
     * @param {Object} bounds - Batas wilayah analisis.
     *
     * Output:
     * Array titik yang dilengkapi nilai density,
     * status hotspot, dan coldspot.
     */
    function calculatePointDensity(points, radius, bounds = null) {

        // Jika data titik kosong, kembalikan array kosong
        if (!points || points.length === 0) return [];

        // Konversi radius dari kilometer menjadi derajat geografis.
        // 1 derajat latitude ≈ 111.32 km.
        const radiusDeg = radius / 111.32;

        // Kuadrat radius digunakan untuk menghindari
        // perhitungan akar kuadrat saat menghitung jarak.
        const radiusDegSq = radiusDeg * radiusDeg;

        // Secara default seluruh titik digunakan.
        let filteredPoints = points;

        // Jika bounds diberikan, hanya titik yang berada
        // di dalam batas wilayah yang akan dianalisis.
        if (bounds) {

            // Mendapatkan batas latitude bagian selatan.
            const minLat = bounds.getSouth ? bounds.getSouth() : bounds.minLat;

            // Mendapatkan batas latitude bagian utara.
            const maxLat = bounds.getNorth ? bounds.getNorth() : bounds.maxLat;

            // Mendapatkan batas longitude bagian barat.
            const minLng = bounds.getWest ? bounds.getWest() : bounds.minLng;

            // Mendapatkan batas longitude bagian timur.
            const maxLng = bounds.getEast ? bounds.getEast() : bounds.maxLng;

            // Memfilter titik agar hanya titik di dalam bounds
            // yang digunakan dalam proses analisis.
            filteredPoints = points.filter(
                p =>
                    p.lat >= minLat &&
                    p.lat <= maxLat &&
                    p.lng >= minLng &&
                    p.lng <= maxLng
            );
        }

        // Menentukan ukuran grid berdasarkan jumlah titik.
        // Nilai dibatasi minimal 10 dan maksimal 30.
        const gridSize = Math.max(
            10,
            Math.min(30, Math.sqrt(filteredPoints.length))
        );

        // Menentukan nilai minimum dan maksimum latitude.
        const latMin = Math.min(...filteredPoints.map(p => p.lat));
        const latMax = Math.max(...filteredPoints.map(p => p.lat));

        // Menentukan nilai minimum dan maksimum longitude.
        const lngMin = Math.min(...filteredPoints.map(p => p.lng));
        const lngMax = Math.max(...filteredPoints.map(p => p.lng));

        // Menghitung ukuran setiap cell grid pada latitude.
        const latStep = (latMax - latMin) / gridSize;

        // Menghitung ukuran setiap cell grid pada longitude.
        const lngStep = (lngMax - lngMin) / gridSize;

        // Object grid digunakan untuk menyimpan indeks titik
        // berdasarkan posisi cell grid.
        const grid = {};

        // Memasukkan setiap titik ke dalam cell grid.
        filteredPoints.forEach((p, idx) => {

            // Menentukan indeks baris berdasarkan latitude.
            const gi = Math.floor(
                (p.lat - latMin) / latStep
            );

            // Menentukan indeks kolom berdasarkan longitude.
            const gj = Math.floor(
                (p.lng - lngMin) / lngStep
            );

            // Membuat key berdasarkan posisi cell.
            const key = gi + ',' + gj;

            // Jika cell belum tersedia, buat array baru.
            if (!grid[key]) grid[key] = [];

            // Menyimpan indeks titik pada cell tersebut.
            grid[key].push(idx);
        });

        /**
         * Menghitung kepadatan untuk setiap titik.
         */
        const result = filteredPoints.map((point, index) => {

            // Menyimpan jumlah titik tetangga.
            let count = 0;

            // Menentukan posisi cell dari titik yang sedang dianalisis.
            const gi = Math.floor(
                (point.lat - latMin) / latStep
            );

            const gj = Math.floor(
                (point.lng - lngMin) / lngStep
            );

            // Memeriksa cell sekitar titik.
            // Hanya cell 3x3 yang diperiksa untuk meningkatkan efisiensi.
            for (let di = -1; di <= 1; di++) {

                for (let dj = -1; dj <= 1; dj++) {

                    // Membuat key cell tetangga.
                    const key = (gi + di) + ',' + (gj + dj);

                    // Mengambil daftar titik pada cell tersebut.
                    const cells = grid[key];

                    // Jika cell kosong, lanjut ke cell berikutnya.
                    if (!cells) continue;

                    // Memeriksa seluruh titik pada cell.
                    for (const idx of cells) {

                        // Titik itu sendiri tidak dihitung.
                        if (idx === index) continue;

                        // Mengambil koordinat titik tetangga.
                        const other = filteredPoints[idx];

                        // Selisih latitude.
                        const dLat = other.lat - point.lat;

                        // Selisih longitude.
                        const dLng = other.lng - point.lng;

                        // Menghitung jarak kuadrat.
                        const distSq =
                            dLat * dLat +
                            dLng * dLng;

                        // Jika jarak berada dalam radius,
                        // titik dihitung sebagai tetangga.
                        if (distSq <= radiusDegSq) {
                            count++;
                        }
                    }
                }
            }

            // Menyimpan hasil kepadatan untuk titik.
            return {
                ...point,

                // Jumlah titik tetangga dalam radius.
                density: count,

                // Status awal hotspot.
                isHotspot: false,

                // Status awal coldspot.
                isColdspot: false
            };
        });

        // Mengambil seluruh nilai density.
        const densities = result.map(r => r.density);

        // Menghitung nilai rata-rata density.
        const mean =
            densities.reduce((a, b) => a + b, 0) /
            densities.length;

        // Menghitung variance.
        const variance =
            densities.reduce(
                (a, b) => a + Math.pow(b - mean, 2),
                0
            ) / densities.length;

        // Menghitung standar deviasi.
        const stdDev = Math.sqrt(variance);

        // Menentukan nilai threshold berdasarkan
        // 1.5 kali standar deviasi.
        const threshold = 1.5 * stdDev;

        /**
         * Menentukan klasifikasi hotspot dan coldspot.
         *
         * Hotspot:
         * density > mean + threshold
         *
         * Coldspot:
         * density < mean - threshold
         */
        result.forEach(r => {

            // Menentukan apakah titik termasuk hotspot.
            r.isHotspot =
                r.density > (mean + threshold);

            // Menentukan apakah titik termasuk coldspot.
            r.isColdspot =
                r.density < (mean - threshold);
        });

        // Mengembalikan seluruh hasil analisis.
        return result;
    }


    /**
     * ======================================================
     * 2. CALCULATE GRID DENSITY
     * ======================================================
     *
     * Menghitung kepadatan titik pada setiap cell grid.
     *
     * Berbeda dengan calculatePointDensity(),
     * fungsi ini menghitung density berdasarkan lokasi
     * cell grid, bukan berdasarkan setiap titik.
     */
    function calculateGridDensity(
        points,
        radius,
        bounds,
        gridSize = 30
    ) {

        // Jika data titik kosong, kembalikan null.
        if (!points || points.length === 0) return null;

        // Membatasi ukuran grid maksimal 35 cell.
        gridSize = Math.min(gridSize, 35);

        // Mendapatkan batas wilayah analisis.
        const minLat =
            bounds.getSouth ? bounds.getSouth() : bounds.minLat;

        const maxLat =
            bounds.getNorth ? bounds.getNorth() : bounds.maxLat;

        const minLng =
            bounds.getWest ? bounds.getWest() : bounds.minLng;

        const maxLng =
            bounds.getEast ? bounds.getEast() : bounds.maxLng;

        // Menghitung ukuran cell latitude.
        const latStep =
            (maxLat - minLat) / gridSize;

        // Menghitung ukuran cell longitude.
        const lngStep =
            (maxLng - minLng) / gridSize;

        // Mengubah radius dari kilometer menjadi derajat.
        const radiusDeg = radius / 111.32;

        // Menghitung radius kuadrat.
        const radiusDegSq =
            radiusDeg * radiusDeg;

        // Membuat struktur array untuk menyimpan density grid.
        const grid = [];

        // Membuat grid dua dimensi.
        for (let i = 0; i < gridSize; i++) {
            grid[i] = new Float32Array(gridSize);
        }

        // Mengambil hanya informasi koordinat dari setiap titik.
        const pts = points.map(p => ({
            lat: p.lat,
            lng: p.lng
        }));

        /**
         * Menghitung jumlah titik yang berada
         * dalam radius setiap cell grid.
         */
        for (let i = 0; i < gridSize; i++) {

            // Menentukan latitude cell.
            const lat = minLat + i * latStep;

            for (let j = 0; j < gridSize; j++) {

                // Menentukan longitude cell.
                const lng = minLng + j * lngStep;

                // Counter jumlah titik.
                let count = 0;

                // Memeriksa setiap titik terhadap cell.
                for (const point of pts) {

                    // Selisih latitude.
                    const dLat = point.lat - lat;

                    // Selisih longitude.
                    const dLng = point.lng - lng;

                    // Menghitung jarak kuadrat.
                    const distSq =
                        dLat * dLat +
                        dLng * dLng;

                    // Jika titik berada dalam radius,
                    // density cell ditambah satu.
                    if (distSq <= radiusDegSq) {
                        count++;
                    }
                }

                // Menyimpan jumlah titik pada cell.
                grid[i][j] = count;
            }
        }

        // Variabel untuk menyimpan density maksimum.
        let maxDensity = 0;

        // Mencari nilai density terbesar.
        for (let i = 0; i < gridSize; i++) {

            for (let j = 0; j < gridSize; j++) {

                if (grid[i][j] > maxDensity) {
                    maxDensity = grid[i][j];
                }
            }
        }

        /**
         * Normalisasi nilai density.
         *
         * Nilai terbesar akan menjadi 1,
         * sedangkan nilai lainnya berada antara 0–1.
         */
        if (maxDensity > 0) {

            // Faktor pembagi untuk normalisasi.
            const invMax = 1 / maxDensity;

            for (let i = 0; i < gridSize; i++) {

                for (let j = 0; j < gridSize; j++) {

                    // Normalisasi nilai density.
                    grid[i][j] *= invMax;
                }
            }
        }

        // Mengembalikan hasil analisis grid.
        return {
            grid,
            gridSize,
            minLat,
            maxLat,
            minLng,
            maxLng,
            latStep,
            lngStep,

            // Density maksimum sebelum normalisasi.
            maxDensity,

            // Radius analisis.
            radius,

            // Jumlah titik yang dianalisis.
            points: points.length
        };
    }


    /**
     * ======================================================
     * 3. GRID TO HEATMAP DATA
     * ======================================================
     *
     * Mengubah hasil grid density menjadi format
     * yang dapat digunakan oleh Leaflet Heatmap.
     *
     * Format data:
     * [latitude, longitude, intensity]
     */
    function gridToHeatmapData(
        gridResult,
        threshold = 0.01,
        maxPoints = 2000
    ) {

        // Jika hasil grid tidak tersedia,
        // kembalikan array kosong.
        if (!gridResult) return [];

        // Mengambil informasi grid.
        const {
            grid,
            gridSize,
            minLat,
            maxLat,
            minLng,
            maxLng,
            latStep,
            lngStep
        } = gridResult;

        // Array untuk menyimpan data heatmap.
        const heatData = [];

        // Menentukan interval pengambilan cell.
        // Digunakan untuk mengurangi jumlah titik heatmap.
        const step = Math.max(
            1,
            Math.floor(gridSize / 25)
        );

        // Iterasi baris grid.
        for (let i = 0; i < gridSize; i += step) {

            // Iterasi kolom grid.
            for (let j = 0; j < gridSize; j += step) {

                // Mengambil nilai density cell.
                const density = grid[i][j];

                // Hanya density di atas threshold
                // yang dimasukkan ke heatmap.
                if (density > threshold) {

                    // Menyimpan latitude, longitude,
                    // dan nilai intensity.
                    heatData.push([
                        minLat + i * latStep,
                        minLng + j * lngStep,
                        density
                    ]);

                    // Membatasi jumlah data heatmap.
                    if (heatData.length >= maxPoints) {
                        return heatData;
                    }
                }
            }
        }

        // Mengembalikan data heatmap.
        return heatData;
    }


    /**
     * ======================================================
     * 4. FIND HIGHEST DENSITY
     * ======================================================
     *
     * Mencari lokasi cell dengan nilai density tertinggi.
     */
    function findHighestDensity(gridResult) {

        // Jika hasil grid tidak tersedia,
        // kembalikan null.
        if (!gridResult) return null;

        // Mengambil parameter grid.
        const {
            grid,
            gridSize,
            minLat,
            maxLat,
            minLng,
            maxLng,
            latStep,
            lngStep
        } = gridResult;

        // Nilai awal density maksimum.
        let maxVal = 0;

        // Indeks cell dengan density tertinggi.
        let maxI = 0;
        let maxJ = 0;

        // Mencari density tertinggi.
        for (let i = 0; i < gridSize; i++) {

            for (let j = 0; j < gridSize; j++) {

                if (grid[i][j] > maxVal) {

                    maxVal = grid[i][j];
                    maxI = i;
                    maxJ = j;
                }
            }
        }

        // Mengembalikan koordinat lokasi
        // dengan density tertinggi.
        return {
            lat: minLat + maxI * latStep,
            lng: minLng + maxJ * lngStep,

            // Nilai density tertinggi.
            density: maxVal
        };
    }


    /**
     * ======================================================
     * 5. GET DENSITY STATISTICS
     * ======================================================
     *
     * Menghasilkan statistik dasar dari grid density.
     *
     * Statistik:
     * - average : rata-rata density
     * - min     : density minimum
     * - max     : density maksimum
     * - totalCells : jumlah cell yang memiliki density > 0
     */
    function getDensityStats(gridResult) {

        // Validasi hasil grid.
        if (!gridResult || !gridResult.grid) {
            return null;
        }

        // Mengambil grid dan ukuran grid.
        const {
            grid,
            gridSize
        } = gridResult;

        // Variabel statistik.
        let sum = 0;
        let count = 0;
        let min = Infinity;
        let max = 0;

        // Menentukan interval sampling cell.
        const step = Math.max(
            1,
            Math.floor(gridSize / 15)
        );

        // Iterasi cell grid.
        for (let i = 0; i < gridSize; i += step) {

            for (let j = 0; j < gridSize; j += step) {

                // Mengambil nilai density.
                const val = grid[i][j];

                // Hanya cell dengan density > 0
                // yang digunakan untuk statistik.
                if (val > 0) {

                    // Menambahkan density ke total.
                    sum += val;

                    // Menambah jumlah cell.
                    count++;

                    // Menentukan nilai minimum.
                    if (val < min) {
                        min = val;
                    }

                    // Menentukan nilai maksimum.
                    if (val > max) {
                        max = val;
                    }
                }
            }
        }

        // Mengembalikan hasil statistik.
        return {

            // Nilai rata-rata density.
            average:
                count > 0 ? sum / count : 0,

            // Nilai density minimum.
            min:
                min === Infinity ? 0 : min,

            // Nilai density maksimum.
            max,

            // Jumlah cell yang memiliki density.
            totalCells: count
        };
    }


    /**
     * ======================================================
     * 6. IDENTIFY HOTSPOTS
     * ======================================================
     *
     * Mengidentifikasi titik yang termasuk:
     * - Hotspot
     * - Coldspot
     * - Neutral
     *
     * Parameter threshold disediakan sebagai parameter
     * fungsi, tetapi klasifikasi aktual dilakukan
     * oleh calculatePointDensity().
     */
    function identifyHotspots(
        points,
        radius,
        threshold = 1.5
    ) {

        // Jika tidak terdapat data titik,
        // kembalikan struktur hasil kosong.
        if (!points || points.length === 0) {

            return {
                hotspots: [],
                coldspots: [],
                neutral: [],

                stats: {
                    total: 0,
                    hotspotCount: 0,
                    coldspotCount: 0
                }
            };
        }

        // Menghitung density setiap titik.
        const densityResult =
            calculatePointDensity(points, radius);

        // Memisahkan titik yang termasuk hotspot.
        const hotspots =
            densityResult.filter(
                p => p.isHotspot
            );

        // Memisahkan titik yang termasuk coldspot.
        const coldspots =
            densityResult.filter(
                p => p.isColdspot
            );

        // Titik yang bukan hotspot maupun coldspot
        // dikategorikan sebagai neutral.
        const neutral =
            densityResult.filter(
                p =>
                    !p.isHotspot &&
                    !p.isColdspot
            );

        // Mengembalikan hasil klasifikasi.
        return {

            // Daftar hotspot.
            hotspots,

            // Daftar coldspot.
            coldspots,

            // Daftar titik netral.
            neutral,

            // Seluruh hasil density.
            all: densityResult,

            // Statistik hasil analisis.
            stats: {

                // Total titik.
                total: densityResult.length,

                // Jumlah hotspot.
                hotspotCount: hotspots.length,

                // Jumlah coldspot.
                coldspotCount: coldspots.length,

                // Persentase hotspot.
                hotspotPercent:
                    (
                        hotspots.length /
                        densityResult.length *
                        100
                    ).toFixed(1),

                // Persentase coldspot.
                coldspotPercent:
                    (
                        coldspots.length /
                        densityResult.length *
                        100
                    ).toFixed(1)
            }
        };
    }


    /**
     * ======================================================
     * 7. PUBLIC API
     * ======================================================
     *
     * Menentukan fungsi yang dapat dipanggil
     * dari luar module PointDensityAnalysis.
     */
    return {

        // Menghitung density berdasarkan titik.
        calculatePointDensity,

        // Menghitung density berdasarkan grid.
        calculateGridDensity,

        // Mengubah grid menjadi data heatmap.
        gridToHeatmapData,

        // Mencari lokasi density tertinggi.
        findHighestDensity,

        // Menghasilkan statistik density.
        getDensityStats,

        // Mengidentifikasi hotspot dan coldspot.
        identifyHotspots
    };

})();


/**
 * ==========================================================
 * 8. NODE.JS / COMMONJS EXPORT
 * ==========================================================
 *
 * Jika file dijalankan menggunakan Node.js,
 * module PointDensityAnalysis dapat digunakan
 * melalui require().
 */
if (typeof module !== 'undefined' && module.exports) {

    // Mengekspor module PointDensityAnalysis.
    module.exports = PointDensityAnalysis;
}
