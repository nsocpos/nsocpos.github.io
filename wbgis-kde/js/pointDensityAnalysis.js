/**
 * pointDensityAnalysis.js
 * Modul untuk analisis Point Density (Hotspot/Coldspot)
 */

const PointDensityAnalysis = (function() {
    'use strict';
    
    /**
     * Menghitung jumlah titik dalam radius tertentu untuk setiap titik
     * @param {Array} points - Array titik {lat, lng}
     * @param {number} radius - Radius dalam km
     * @param {Object} bounds - Bounds area (opsional)
     * @returns {Array} - Array titik dengan nilai density
     */
    function calculatePointDensity(points, radius, bounds = null) {
        if (!points || points.length === 0) {
            return [];
        }
        
        // Konversi radius ke derajat (1 derajat ≈ 111.32 km)
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
        
        // Hitung density untuk setiap titik
        const result = filteredPoints.map((point, index) => {
            let count = 0;
            const pointLat = point.lat;
            const pointLng = point.lng;
            
            for (let i = 0; i < filteredPoints.length; i++) {
                if (i === index) continue;
                const other = filteredPoints[i];
                const dLat = other.lat - pointLat;
                const dLng = other.lng - pointLng;
                const distSq = dLat * dLat + dLng * dLng;
                
                if (distSq <= radiusDegSq) {
                    count++;
                }
            }
            
            return {
                ...point,
                density: count,
                normalizedDensity: 0, // akan diisi nanti
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
        // Hotspot: density > mean + 1.5 * std dev
        // Coldspot: density < mean - 1.5 * std dev
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
     * Menghitung density pada grid
     * @param {Array} points - Array titik {lat, lng}
     * @param {number} radius - Radius dalam km
     * @param {Object} bounds - Bounds area
     * @param {number} gridSize - Ukuran grid
     * @returns {Object} - Grid density
     */
    function calculateGridDensity(points, radius, bounds, gridSize = 50) {
        if (!points || points.length === 0) {
            return null;
        }
        
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
        
        // Untuk setiap sel grid, hitung jumlah titik dalam radius
        for (let i = 0; i < gridSize; i++) {
            const lat = minLat + i * latStep;
            for (let j = 0; j < gridSize; j++) {
                const lng = minLng + j * lngStep;
                let count = 0;
                
                for (const point of points) {
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
            radius: radius,
            points: points.length
        };
    }
    
    /**
     * Konversi grid density ke heatmap data
     */
    function gridToHeatmapData(gridResult, threshold = 0.01) {
        if (!gridResult) return [];
        
        const { grid, gridSize, minLat, maxLat, minLng, maxLng, latStep, lngStep } = gridResult;
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
    
    /**
     * Mendapatkan statistik density
     */
    function getDensityStats(densityResult) {
        if (!densityResult || !densityResult.grid) return null;
        
        const { grid, gridSize } = densityResult;
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
    
    /**
     * Menemukan area dengan density tertinggi
     */
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
    
    /**
     * Mengidentifikasi hotspot dan coldspot dari data titik
     */
    function identifyHotspots(points, radius, threshold = 1.5) {
        if (!points || points.length === 0) {
            return { hotspots: [], coldspots: [], neutral: [] };
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
