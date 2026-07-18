/**
 * pointDensityAnalysis.js
 * Modul untuk analisis Point Density - OPTIMASI
 */

const PointDensityAnalysis = (function() {
    'use strict';
    
    /**
     * Menghitung point density dengan optimasi
     * Menggunakan spatial indexing sederhana
     */
    function calculatePointDensity(points, radius, bounds = null) {
        if (!points || points.length === 0) {
            return [];
        }
        
        const radiusDeg = radius / 111.32;
        const radiusDegSq = radiusDeg * radiusDeg;
        
        // Filter points jika ada bounds
        let filteredPoints = points;
        if (bounds) {
            const minLat = bounds.getSouth ? bounds.getSouth() : bounds.minLat;
            const maxLat = bounds.getNorth ? bounds.getNorth() : bounds.maxLat;
            const minLng = bounds.getWest ? bounds.getWest() : bounds.minLng;
            const maxLng = bounds.getEast ? bounds.getEast() : bounds.maxLng;
            
            filteredPoints = points.filter(p => 
                p.lat >= minLat && p.lat <= maxLat &&
                p.lng >= minLng && p.lng <= maxLng
            );
        }
        
        const n = filteredPoints.length;
        if (n === 0) return [];
        
        // Optimasi: Gunakan grid-based spatial indexing
        const gridSize = Math.max(5, Math.min(20, Math.sqrt(n)));
        const latMin = Math.min(...filteredPoints.map(p => p.lat));
        const latMax = Math.max(...filteredPoints.map(p => p.lat));
        const lngMin = Math.min(...filteredPoints.map(p => p.lng));
        const lngMax = Math.max(...filteredPoints.map(p => p.lng));
        
        const latStep = (latMax - latMin) / gridSize;
        const lngStep = (lngMax - lngMin) / gridSize;
        
        // Buat grid index
        const grid = {};
        filteredPoints.forEach((p, idx) => {
            const gi = Math.floor((p.lat - latMin) / latStep);
            const gj = Math.floor((p.lng - lngMin) / lngStep);
            const key = gi + ',' + gj;
            if (!grid[key]) grid[key] = [];
            grid[key].push(idx);
        });
        
        // Hitung density untuk setiap titik
        const result = filteredPoints.map((point, index) => {
            let count = 0;
            const pointLat = point.lat;
            const pointLng = point.lng;
            
            // Cari di grid tetangga
            const gi = Math.floor((pointLat - latMin) / latStep);
            const gj = Math.floor((pointLng - lngMin) / lngStep);
            
            // Periksa grid tetangga (3x3)
            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    const key = (gi + di) + ',' + (gj + dj);
                    const cells = grid[key];
                    if (!cells) continue;
                    
                    for (const idx of cells) {
                        if (idx === index) continue;
                        const other = filteredPoints[idx];
                        const dLat = other.lat - pointLat;
                        const dLng = other.lng - pointLng;
                        const distSq = dLat * dLat + dLng * dLng;
                        
                        if (distSq <= radiusDegSq) {
                            count++;
                        }
                    }
                }
            }
            
            return {
                ...point,
                density: count,
                normalizedDensity: 0,
                isHotspot: false,
                isColdspot: false
            };
        });
        
        // Normalisasi density
        const densities = result.map(r => r.density);
        const maxDensity = Math.max(...densities, 1);
        const minDensity = Math.min(...densities, 0);
        const range = maxDensity - minDensity || 1;
        
        result.forEach(r => {
            r.normalizedDensity = (r.density - minDensity) / range;
        });
        
        // Identifikasi hotspot dan coldspot
        const mean = densities.reduce((a, b) => a + b, 0) / densities.length;
        const variance = densities.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / densities.length;
        const stdDev = Math.sqrt(variance);
        const threshold = 1.5 * stdDev;
        
        result.forEach(r => {
            r.isHotspot = r.density > (mean + threshold);
            r.isColdspot = r.density < (mean - threshold);
        });
        
        return result;
    }
    
    /**
     * Menghitung density pada grid dengan optimasi
     */
    function calculateGridDensity(points, radius, bounds, gridSize = 30) {
        if (!points || points.length === 0) {
            return null;
        }
        
        gridSize = Math.min(gridSize, 35);
        
        const minLat = bounds.getSouth ? bounds.getSouth() : bounds.minLat;
        const maxLat = bounds.getNorth ? bounds.getNorth() : bounds.maxLat;
        const minLng = bounds.getWest ? bounds.getWest() : bounds.minLng;
        const maxLng = bounds.getEast ? bounds.getEast() : bounds.maxLng;
        
        const latStep = (maxLat - minLat) / gridSize;
        const lngStep = (maxLng - minLng) / gridSize;
        const radiusDeg = radius / 111.32;
        const radiusDegSq = radiusDeg * radiusDeg;
        
        const grid = [];
        for (let i = 0; i < gridSize; i++) {
            grid[i] = new Float32Array(gridSize);
        }
        
        // Optimasi: Pre-calculate points array
        const pts = points.map(p => ({ lat: p.lat, lng: p.lng }));
        
        // Gunakan parallel-like processing dengan chunk
        const chunkSize = Math.ceil(gridSize / 2);
        
        for (let i = 0; i < gridSize; i++) {
            const lat = minLat + i * latStep;
            for (let j = 0; j < gridSize; j++) {
                const lng = minLng + j * lngStep;
                let count = 0;
                
                // Optimasi: Skip jika terlalu jauh dari semua titik
                let skip = true;
                for (const point of pts) {
                    const dLat = point.lat - lat;
                    const dLng = point.lng - lng;
                    if (Math.abs(dLat) < radiusDeg && Math.abs(dLng) < radiusDeg) {
                        skip = false;
                        break;
                    }
                }
                if (skip) continue;
                
                for (const point of pts) {
                    const dLat = point.lat - lat;
                    const dLng = point.lng - lng;
                    const distSq = dLat * dLat + dLng * dLng;
                    
                    if (distSq <= radiusDegSq) {
                        count++;
                    }
                }
                
                grid[i][j] = count;
            }
        }
        
        // Normalisasi
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
            grid: grid,
            gridSize: gridSize,
            minLat: minLat,
            maxLat: maxLat,
            minLng: minLng,
            maxLng: maxLng,
            latStep: latStep,
            lngStep: lngStep,
            maxDensity: maxDensity,
            radius: radius,
            points: points.length
        };
    }
    
    function gridToHeatmapData(gridResult, threshold = 0.01, maxPoints = 3000) {
        if (!gridResult) return [];
        
        const { grid, gridSize, minLat, maxLat, minLng, maxLng, latStep, lngStep } = gridResult;
        const heatData = [];
        
        const step = Math.max(1, Math.floor(gridSize / 25));
        
        for (let i = 0; i < gridSize; i += step) {
            for (let j = 0; j < gridSize; j += step) {
                const density = grid[i][j];
                if (density > threshold) {
                    const lat = minLat + i * latStep;
                    const lng = minLng + j * lngStep;
                    heatData.push([lat, lng, density]);
                    
                    if (heatData.length >= maxPoints) {
                        return heatData;
                    }
                }
            }
        }
        
        return heatData;
    }
    
    function getDensityStats(gridResult) {
        if (!gridResult || !gridResult.grid) return null;
        
        const { grid, gridSize } = gridResult;
        let sum = 0;
        let count = 0;
        let min = Infinity;
        let max = 0;
        
        const step = Math.max(1, Math.floor(gridSize / 15));
        
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
    
    function findHighestDensity(gridResult) {
        if (!gridResult) return null;
        
        const { grid, gridSize, minLat, maxLat, minLng, maxLng, latStep, lngStep } = gridResult;
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
    
    function identifyHotspots(points, radius, threshold = 1.5) {
        if (!points || points.length === 0) {
            return { hotspots: [], coldspots: [], neutral: [], stats: { total: 0, hotspotCount: 0, coldspotCount: 0, neutralCount: 0 } };
        }
        
        const densityResult = calculatePointDensity(points, radius);
        
        const hotspots = densityResult.filter(p => p.isHotspot);
        const coldspots = densityResult.filter(p => p.isColdspot);
        const neutral = densityResult.filter(p => !p.isHotspot && !p.isColdspot);
        
        return {
            hotspots: hotspots,
            coldspots: coldspots,
            neutral: neutral,
            all: densityResult,
            stats: {
                total: densityResult.length,
                hotspotCount: hotspots.length,
                coldspotCount: coldspots.length,
                neutralCount: neutral.length
            }
        };
    }
    
    return {
        calculatePointDensity: calculatePointDensity,
        calculateGridDensity: calculateGridDensity,
        gridToHeatmapData: gridToHeatmapData,
        getDensityStats: getDensityStats,
        findHighestDensity: findHighestDensity,
        identifyHotspots: identifyHotspots
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PointDensityAnalysis;
}
