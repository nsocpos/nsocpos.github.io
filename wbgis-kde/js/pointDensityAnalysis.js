/**
 * pointDensityAnalysis.js - OPTIMASI SUPER CEPAT
 */

const PointDensityAnalysis = (function() {
    'use strict';
    
    function calculatePointDensity(points, radius, bounds = null) {
        if (!points || points.length === 0) return [];
        
        const radiusDeg = radius / 111.32;
        const radiusDegSq = radiusDeg * radiusDeg;
        
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
        
        const gridSize = Math.max(10, Math.min(30, Math.sqrt(filteredPoints.length)));
        const latMin = Math.min(...filteredPoints.map(p => p.lat));
        const latMax = Math.max(...filteredPoints.map(p => p.lat));
        const lngMin = Math.min(...filteredPoints.map(p => p.lng));
        const lngMax = Math.max(...filteredPoints.map(p => p.lng));
        
        const latStep = (latMax - latMin) / gridSize;
        const lngStep = (lngMax - lngMin) / gridSize;
        
        const grid = {};
        filteredPoints.forEach((p, idx) => {
            const gi = Math.floor((p.lat - latMin) / latStep);
            const gj = Math.floor((p.lng - lngMin) / lngStep);
            const key = gi + ',' + gj;
            if (!grid[key]) grid[key] = [];
            grid[key].push(idx);
        });
        
        const result = filteredPoints.map((point, index) => {
            let count = 0;
            const gi = Math.floor((point.lat - latMin) / latStep);
            const gj = Math.floor((point.lng - lngMin) / lngStep);
            
            for (let di = -1; di <= 1; di++) {
                for (let dj = -1; dj <= 1; dj++) {
                    const key = (gi + di) + ',' + (gj + dj);
                    const cells = grid[key];
                    if (!cells) continue;
                    
                    for (const idx of cells) {
                        if (idx === index) continue;
                        const other = filteredPoints[idx];
                        const dLat = other.lat - point.lat;
                        const dLng = other.lng - point.lng;
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
                isHotspot: false,
                isColdspot: false
            };
        });
        
        const densities = result.map(r => r.density);
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
    
    function calculateGridDensity(points, radius, bounds, gridSize = 30) {
        if (!points || points.length === 0) return null;
        
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
        
        const pts = points.map(p => ({ lat: p.lat, lng: p.lng }));
        
        for (let i = 0; i < gridSize; i++) {
            const lat = minLat + i * latStep;
            for (let j = 0; j < gridSize; j++) {
                const lng = minLng + j * lngStep;
                let count = 0;
                
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
    
    function gridToHeatmapData(gridResult, threshold = 0.01, maxPoints = 2000) {
        if (!gridResult) return [];
        
        const { grid, gridSize, minLat, maxLat, minLng, maxLng, latStep, lngStep } = gridResult;
        const heatData = [];
        const step = Math.max(1, Math.floor(gridSize / 25));
        
        for (let i = 0; i < gridSize; i += step) {
            for (let j = 0; j < gridSize; j += step) {
                const density = grid[i][j];
                if (density > threshold) {
                    heatData.push([
                        minLat + i * latStep,
                        minLng + j * lngStep,
                        density
                    ]);
                    if (heatData.length >= maxPoints) return heatData;
                }
            }
        }
        return heatData;
    }
    
    function findHighestDensity(gridResult) {
        if (!gridResult) return null;
        
        const { grid, gridSize, minLat, maxLat, minLng, maxLng, latStep, lngStep } = gridResult;
        let maxVal = 0, maxI = 0, maxJ = 0;
        
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
    
    function getDensityStats(gridResult) {
        if (!gridResult || !gridResult.grid) return null;
        
        const { grid, gridSize } = gridResult;
        let sum = 0, count = 0, min = Infinity, max = 0;
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
            totalCells: count
        };
    }
    
    function identifyHotspots(points, radius, threshold = 1.5) {
        if (!points || points.length === 0) {
            return { hotspots: [], coldspots: [], neutral: [], stats: { total: 0, hotspotCount: 0, coldspotCount: 0 } };
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
                hotspotPercent: (hotspots.length / densityResult.length * 100).toFixed(1),
                coldspotPercent: (coldspots.length / densityResult.length * 100).toFixed(1)
            }
        };
    }
    
    return {
        calculatePointDensity: calculatePointDensity,
        calculateGridDensity: calculateGridDensity,
        gridToHeatmapData: gridToHeatmapData,
        findHighestDensity: findHighestDensity,
        getDensityStats: getDensityStats,
        identifyHotspots: identifyHotspots
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PointDensityAnalysis;
}
