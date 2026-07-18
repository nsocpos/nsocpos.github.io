/**
 * kdeAnalysis.js
 * Modul untuk analisis Kernel Density Estimation (KDE)
 */

const KDEAnalysis = (function() {
    'use strict';
    
    /**
     * Kernel Density Estimation dengan Gaussian Kernel
     */
    function calculateKDE(points, radius, bounds, gridSize = 50) {
        if (!points || points.length === 0) {
            return null;
        }
        
        const minLat = bounds.getSouth ? bounds.getSouth() : bounds.minLat;
        const maxLat = bounds.getNorth ? bounds.getNorth() : bounds.maxLat;
        const minLng = bounds.getWest ? bounds.getWest() : bounds.minLng;
        const maxLng = bounds.getEast ? bounds.getEast() : bounds.maxLng;
        
        const latStep = (maxLat - minLat) / gridSize;
        const lngStep = (maxLng - minLng) / gridSize;
        
        // Bandwidth dalam derajat (1 derajat ≈ 111.32 km)
        const bandWidth = radius / 111.32;
        
        const grid = [];
        for (let i = 0; i < gridSize; i++) {
            grid[i] = new Float32Array(gridSize);
        }
        
        const pts = points.map(p => ({
            lat: p.lat,
            lng: p.lng,
            intensity: p.intensity || 1.0
        }));
        
        const bandWidthSq = bandWidth * bandWidth;
        const normFactor = 1 / (bandWidth * Math.sqrt(2 * Math.PI));
        
        for (let i = 0; i < gridSize; i++) {
            const lat = minLat + i * latStep;
            for (let j = 0; j < gridSize; j++) {
                const lng = minLng + j * lngStep;
                let density = 0;
                
                for (const point of pts) {
                    const dLat = point.lat - lat;
                    const dLng = point.lng - lng;
                    const distSq = dLat * dLat + dLng * dLng;
                    
                    density += point.intensity * normFactor * 
                              Math.exp(-0.5 * distSq / bandWidthSq);
                }
                
                grid[i][j] = density;
            }
        }
        
        let maxDensity = 0;
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (grid[i][j] > maxDensity) maxDensity = grid[i][j];
            }
        }
        
        if (maxDensity > 0) {
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize; j++) {
                    grid[i][j] /= maxDensity;
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
    
    function kdeToHeatmapData(kdeResult, threshold = 0.01) {
        if (!kdeResult) return [];
        
        const { grid, gridSize, minLat, maxLat, minLng, maxLng, latStep, lngStep } = kdeResult;
        const heatData = [];
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const density = grid[i][j];
                if (density > threshold) {
                    const lat = minLat + i * latStep;
                    const lng = minLng + j * lngStep;
                    heatData.push([lat, lng, density]);
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
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
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
