/**
 * KDEAnalysis.js - Kernel Density Estimation untuk Eksperimen
 * Modul untuk menganalisis kepadatan titik lokasi menggunakan metode KDE
 * @module KDEAnalysis
 */

const KDEAnalysis = (function() {
    'use strict';

    /**
     * Menghitung Kernel Density Estimation (KDE) dari titik-titik lokasi
     * @param {Array} points - Array objek titik dengan properti {lat, lng, intensity?}
     * @param {number} radius - Jari-jari bandwidth dalam kilometer (untuk smoothing)
     * @param {Object} bounds - Batas area geografis {getSouth(), getNorth(), getWest(), getEast()}
     * @param {number} gridSize - Ukuran grid (maksimum 35x35 untuk performa)
     * @returns {Object} Hasil KDE berupa grid kepadatan dan metadata
     */
    function calculateKDE(points, radius, bounds, gridSize = 30) {
        // Validasi input: jika tidak ada titik, return null
        if (!points || points.length === 0) return null;
        // Batasi grid size untuk menjaga performa (maks 35x35 = 1225 sel)
        gridSize = Math.min(gridSize, 35);

         // Ekstrak batas area (support untuk berbagai format bounds)
        const minLat = bounds.getSouth ? bounds.getSouth() : bounds.minLat;
        const maxLat = bounds.getNorth ? bounds.getNorth() : bounds.maxLat;
        const minLng = bounds.getWest ? bounds.getWest() : bounds.minLng;
        const maxLng = bounds.getEast ? bounds.getEast() : bounds.maxLng;

        // Hitung langkah antar grid (ukuran setiap sel)
        const latStep = (maxLat - minLat) / gridSize;
        const lngStep = (maxLng - minLng) / gridSize;
        // Konversi radius dari km ke derajat (1° ≈ 111.32 km di ekuator)
        const bandWidth = radius / 111.32;
        const bandWidthSq = bandWidth * bandWidth;
        // Faktor normalisasi untuk kernel Gaussian
        // 1 / (h * sqrt(2π)) - memastikan integral kernel = 1
        const normFactor = 1 / (bandWidth * Math.sqrt(2 * Math.PI));

        // Inisialisasi grid 2D dengan Float32Array untuk efisiensi memory
        const grid = [];
        for (let i = 0; i < gridSize; i++) {
            grid[i] = new Float32Array(gridSize);
        }

        // Normalisasi intensity (jika ada), default intensity = 1.0
        const pts = points.map(p => ({ lat: p.lat, lng: p.lng, intensity: p.intensity || 1.0 }));

        // Looping untuk setiap sel di grid
        for (let i = 0; i < gridSize; i++) {
            const lat = minLat + i * latStep; // Lintang tengah sel
            for (let j = 0; j < gridSize; j++) {
                const lng = minLng + j * lngStep; // Bujur tengah sel
                let density = 0;
                 // Hitung kontribusi dari setiap titik data
                for (const point of pts) {
                    const dLat = point.lat - lat;
                    const dLng = point.lng - lng;
                    const distSq = dLat * dLat + dLng * dLng;
                    // Optimasi: hanya hitung jika jarak < 2*bandwidth (efek Gaussian kecil di luar itu)
                    if (distSq < bandWidthSq * 4) {
                        // Kernel Gaussian: intensity * (1/(h√(2π))) * e^(-d²/(2h²))
                        density += point.intensity * normFactor * Math.exp(-0.5 * distSq / bandWidthSq);
                    }
                }
                grid[i][j] = density;
            }
        }

        // Cari nilai kepadatan maksimum untuk normalisasi
        let maxDensity = 0;
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (grid[i][j] > maxDensity) maxDensity = grid[i][j];
            }
        }

        // Normalisasi nilai kepadatan ke rentang 0-1 (agar mudah divisualisasikan)
        if (maxDensity > 0) {
            const invMax = 1 / maxDensity;
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize; j++) {
                    grid[i][j] *= invMax;
                }
            }
        }

        // Return hasil KDE lengkap dengan metadata
        return {
            grid, gridSize, minLat, maxLat, minLng, maxLng,
            latStep, lngStep, maxDensity, points: points.length
        };
    }

    /**
     * Mengkonversi hasil KDE menjadi data heatmap (format [lat, lng, density])
     * @param {Object} kdeResult - Hasil dari fungsi calculateKDE()
     * @param {number} threshold - Ambang batas kepadatan minimum (0-1)
     * @param {number} maxPoints - Batas maksimum jumlah titik output
     * @returns {Array} Array titik heatmap [[lat, lng, density], ...]
     */
    
    function kdeToHeatmapData(kdeResult, threshold = 0.01, maxPoints = 2000) {
         // Validasi input
        if (!kdeResult) return [];
        // Ekstrak data dari hasil KDE
        const { grid, gridSize, minLat, maxLat, minLng, maxLng, latStep, lngStep } = kdeResult;
        const heatData = [];
        // Subsample grid untuk mengurangi jumlah titik (step = gridSize/25)
        // Semakin besar step, semakin sedikit titik output
        const step = Math.max(1, Math.floor(gridSize / 25));
        // Loop melalui grid dengan langkah subsampling
        for (let i = 0; i < gridSize; i += step) {
            for (let j = 0; j < gridSize; j += step) {
                const density = grid[i][j];
                if (density > threshold) {
                    heatData.push([minLat + i * latStep, minLng + j * lngStep, density]);
                    if (heatData.length >= maxPoints) return heatData;
                }
            }
        }
        return heatData;
    }

    /**
     * Mencari titik dengan kepadatan tertinggi dari hasil KDE
     * @param {Object} kdeResult - Hasil dari fungsi calculateKDE()
     * @returns {Object} Koordinat dan nilai kepadatan tertinggi
     */
    
    function findDensestPoint(kdeResult) {
        if (!kdeResult) return null;
        const { grid, gridSize, minLat, maxLat, minLng, maxLng, latStep, lngStep } = kdeResult;
        let maxVal = 0, maxI = 0, maxJ = 0;
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (grid[i][j] > maxVal) { maxVal = grid[i][j]; maxI = i; maxJ = j; }
            }
        }
        return { lat: minLat + maxI * latStep, lng: minLng + maxJ * lngStep, density: maxVal };
    }

    /**
     * Menghitung statistik deskriptif dari hasil KDE
     * @param {Object} kdeResult - Hasil dari fungsi calculateKDE()
     * @returns {Object} Statistik kepadatan {average, min, max, totalCells}
     */
    
    function getDensityStats(kdeResult) {
        if (!kdeResult) return null;
        const { grid, gridSize } = kdeResult;
        let sum = 0, count = 0, min = Infinity, max = 0;
        const step = Math.max(1, Math.floor(gridSize / 15));
        for (let i = 0; i < gridSize; i += step) {
            for (let j = 0; j < gridSize; j += step) {
                const val = grid[i][j];
                if (val > 0) { sum += val; count++; if (val < min) min = val; if (val > max) max = val; }
            }
        }
        return { average: count > 0 ? sum / count : 0, min: min === Infinity ? 0 : min, max: max, totalCells: count };
    }
    
    return { calculateKDE, kdeToHeatmapData, findDensestPoint, getDensityStats };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = KDEAnalysis; }
