/**
 * kdeAnalysis.js
 * Modul untuk analisis Kernel Density Estimation (KDE) - OPTIMASI
 */

const KDEAnalysis = (function() {
    'use strict';
    
    /**
     * Kernel Density Estimation dengan optimasi
     * Menggunakan grid yang lebih kecil untuk kecepatan
     */
    function calculateKDE(points, radius, bounds, gridSize = 30) {
        if (!points || points.length === 0) {
            return null;
        }
        
        // Batasi grid size untuk kecepatan
        gridSize = Math.min(gridSize, 40);
        
        const minLat = bounds.getSouth ? bounds.getSouth() : bounds.minLat;
        const maxLat = bounds.getNorth ? bounds.getNorth() : bounds.maxLat;
        const minLng = bounds.getWest ? bounds.getWest() : bounds.minLng;
        const maxLng = bounds.getEast ? bounds.getEast() : bounds.maxLng;
        
        const latStep = (maxLat - minLat) / gridSize;
        const lngStep = (maxLng - minLng) / gridSize;
        
        // Bandwidth dalam derajat (1 derajat ≈ 111.32 km)
        const bandWidth = radius / 111.32;
        const bandWidthSq = bandWidth * bandWidth;
        const normFactor = 1 / (bandWidth * Math.sqrt(2 * Math.PI));
        
        // Optimasi: Gunakan Float32Array untuk memory lebih efisien
        const grid = [];
        for (let i = 0; i < gridSize; i++) {
            grid[i] = new Float32Array(gridSize);
        }
        
        // Siapkan data points untuk akses cepat
        const pts = points.map(p => ({
            lat: p.lat,
            lng: p.lng,
            intensity: p.intensity || 1.0
        }));
        
        // Optimasi: Gunakan loop yang lebih efisien
        const halfGrid = Math.floor(gridSize / 2);
        
        for (let i = 0; i < gridSize; i++) {
            const lat = minLat + i * latStep;
            for (let j = 0; j < gridSize; j++) {
                const lng = minLng + j * lngStep;
                let density = 0;
                
                // Optimasi: Hanya proses titik yang dekat
                for (const point of pts) {
                    const dLat = point.lat - lat;
                    const dLng = point.lng - lng;
                    const distSq = dLat * dLat + dLng * dLng;
                    
                    // Skip jika terlalu jauh
                    if (distSq > bandWidthSq * 4) continue;
                    
                    density += point.intensity * normFactor * 
                              Math.exp(-0.5 * distSq / bandWidthSq);
                }
                
                grid[i][j] = density;
            }
        }
        
        // Normalisasi - cari max density
        let maxDensity = 0;
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (grid[i][j] > maxDensity) maxDensity = grid[i][j];
            }
        }
        
        // Normalisasi hanya jika perlu
        if (maxDensity > 0 && maxDensity !== 1) {
            const invMax = 1 / maxDensity;
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize; j++) {
                    grid[i][j] *= invMax;
                }
            }
        }
        
        return {
            grid: grid,
            gridSize: gridSize,
            minLat: minLat,
            maxLat: maxLat,
            minLng: minLng,
            maxLng: maxLng,
            latStep: latStep,
            lngStep: lngStep,
            maxDensity: maxDensity,
            bandWidth: bandWidth,
            points: points.length
        };
    }
    
    /**
     * Konversi KDE ke heatmap dengan sampling untuk kecepatan
     */
    function kdeToHeatmapData(kdeResult, threshold = 0.01, maxPoints = 3000) {
        if (!kdeResult) return [];
        
        const { grid, gridSize, minLat, maxLat, minLng, maxLng, latStep, lngStep } = kdeResult;
        const heatData = [];
        
        // Optimasi: Sample grid untuk mengurangi data points
        const step = Math.max(1, Math.floor(gridSize / 30));
        
        for (let i = 0; i < gridSize; i += step) {
            for (let j = 0; j < gridSize; j += step) {
                const density = grid[i][j];
                if (density > threshold) {
                    const lat = minLat + i * latStep;
                    const lng = minLng + j * lngStep;
                    heatData.push([lat, lng, density]);
                    
                    // Batasi jumlah points untuk performa
                    if (heatData.length >= maxPoints) {
                        return heatData;
                    }
                }
            }
        }
        
        return heatData;
    }
    
    function findDensestPoint(kdeResult) {
        if (!kdeResult) return null;
        
        const { grid, gridSize, minLat, maxLat, minLng, maxLng, latStep, lngStep } = kdeResult;
        let maxVal = 0;
        let maxI = 0, maxJ = 0;
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (grid[i][j] > maxVal) {
                    maxVal = grid[i][j];
                    maxI = i;
                    maxJ = j;
                }
            }
        }
        
        return {
            lat: minLat + maxI * latStep,
            lng: minLng + maxJ * lngStep,
            density: maxVal
        };
    }
    
    function getDensityStats(kdeResult) {
        if (!kdeResult) return null;
        
        const { grid, gridSize } = kdeResult;
        let sum = 0;
        let count = 0;
        let min = Infinity;
        let max = 0;
        
        const step = Math.max(1, Math.floor(gridSize / 20));
        
        for (let i = 0; i < gridSize; i += step) {
            for (let j = 0; j < gridSize; j += step) {
                const val = grid[i][j];
                if (val > 0) {
                    sum += val;
                    count++;
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
            }
        }
        
        return {
            average: count > 0 ? sum / count : 0,
            min: min === Infinity ? 0 : min,
            max: max,
            totalCells: count,
            gridSize: gridSize
        };
    }
    
    return {
        calculateKDE: calculateKDE,
        kdeToHeatmapData: kdeToHeatmapData,
        findDensestPoint: findDensestPoint,
        getDensityStats: getDensityStats
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = KDEAnalysis;
}
