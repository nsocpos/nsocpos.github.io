/**
 * kdeAnalysis.js - Kernel Density Estimation
 */

const KDEAnalysis = (function() {
    'use strict';
    
    function calculateKDE(points, radius, bounds, gridSize = 30) {
        if (!points || points.length === 0) return null;
        gridSize = Math.min(gridSize, 35);
        
        const minLat = bounds.getSouth ? bounds.getSouth() : bounds.minLat;
        const maxLat = bounds.getNorth ? bounds.getNorth() : bounds.maxLat;
        const minLng = bounds.getWest ? bounds.getWest() : bounds.minLng;
        const maxLng = bounds.getEast ? bounds.getEast() : bounds.maxLng;
        
        const latStep = (maxLat - minLat) / gridSize;
        const lngStep = (maxLng - minLng) / gridSize;
        const bandWidth = radius / 111.32;
        const bandWidthSq = bandWidth * bandWidth;
        const normFactor = 1 / (bandWidth * Math.sqrt(2 * Math.PI));
        
        const grid = [];
        for (let i = 0; i < gridSize; i++) {
            grid[i] = new Float32Array(gridSize);
        }
        
        const pts = points.map(p => ({ lat: p.lat, lng: p.lng, intensity: p.intensity || 1.0 }));
        
        for (let i = 0; i < gridSize; i++) {
            const lat = minLat + i * latStep;
            for (let j = 0; j < gridSize; j++) {
                const lng = minLng + j * lngStep;
                let density = 0;
                for (const point of pts) {
                    const dLat = point.lat - lat;
                    const dLng = point.lng - lng;
                    const distSq = dLat * dLat + dLng * dLng;
                    if (distSq < bandWidthSq * 4) {
                        density += point.intensity * normFactor * Math.exp(-0.5 * distSq / bandWidthSq);
                    }
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
            const invMax = 1 / maxDensity;
            for (let i = 0; i < gridSize; i++) {
                for (let j = 0; j < gridSize; j++) {
                    grid[i][j] *= invMax;
                }
            }
        }
        
        return {
            grid, gridSize, minLat, maxLat, minLng, maxLng,
            latStep, lngStep, maxDensity, points: points.length
        };
    }
    
    function kdeToHeatmapData(kdeResult, threshold = 0.01, maxPoints = 2000) {
        if (!kdeResult) return [];
        const { grid, gridSize, minLat, maxLat, minLng, maxLng, latStep, lngStep } = kdeResult;
        const heatData = [];
        const step = Math.max(1, Math.floor(gridSize / 25));
        
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
