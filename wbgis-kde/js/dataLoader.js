/**
 * dataLoader.js - OPTIMASI SUPER CEPAT
 * Hanya load data valid, abaikan data invalid
 */

const DataLoader = (function() {
    'use strict';
    
    let allData = [];
    let isLoading = false;
    let invalidCount = 0;
    let totalRaw = 0;
    
    // Batas Indonesia
    const INDONESIA_BOUNDS = {
        minLat: -12.0,
        maxLat: 8.0,
        minLng: 94.0,
        maxLng: 142.0
    };
    
    /**
     * Fast coordinate cleaner - optimized
     */
    function fastCleanCoordinate(coord) {
        if (!coord) return null;
        
        // Remove spaces and trim
        let cleaned = coord.toString().trim().replace(/\s/g, '');
        
        // Replace comma with dot
        if (cleaned.includes(',')) {
            cleaned = cleaned.replace(/,/g, '.');
        }
        
        // Quick check: if it has multiple dots, fix it
        const dotCount = (cleaned.match(/\./g) || []).length;
        if (dotCount > 1) {
            // For format like 3.591.867 -> 3.591867
            const parts = cleaned.split('.');
            if (parts.length === 3 && parts[0].length <= 2) {
                // Format: xx.xxx.xxx (like 3.591.867)
                cleaned = parts[0] + '.' + parts[1] + parts[2];
            } else {
                // Complex format, try to salvage
                const firstPart = parts[0];
                const rest = parts.slice(1).join('');
                cleaned = firstPart + '.' + rest;
            }
        }
        
        const parsed = parseFloat(cleaned);
        if (isNaN(parsed) || parsed < -180 || parsed > 180) return null;
        
        return parsed;
    }
    
    /**
     * Quick validation for Indonesia
     */
    function isValidIndonesia(lat, lng) {
        return lat !== null && lng !== null && 
               !isNaN(lat) && !isNaN(lng) &&
               lat >= INDONESIA_BOUNDS.minLat && lat <= INDONESIA_BOUNDS.maxLat &&
               lng >= INDONESIA_BOUNDS.minLng && lng <= INDONESIA_BOUNDS.maxLng;
    }
    
    /**
     * Fast parse CSV with minimal processing
     */
    function loadFromFile(url, callback, progressCallback) {
        if (isLoading) {
            console.warn('Loading in progress...');
            return;
        }
        
        isLoading = true;
        allData = [];
        invalidCount = 0;
        totalRaw = 0;
        
        // Use fetch with streaming for large files
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvString => {
                // Parse with Papa Parse - fast mode
                if (typeof Papa === 'undefined') {
                    throw new Error('Papa Parse not found');
                }
                
                const results = Papa.parse(csvString, {
                    header: true,
                    delimiter: ';',
                    skipEmptyLines: true,
                    fastMode: true, // Enable fast mode
                    transform: function(value) {
                        return value ? value.trim() : '';
                    }
                });
                
                if (results.errors.length > 0) {
                    console.warn('Some parsing errors:', results.errors);
                }
                
                const rows = results.data;
                totalRaw = rows.length;
                
                // Process data - optimized loop
                const validData = [];
                let fixedCount = 0;
                
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const latRaw = row.LATITUDE || '';
                    const lngRaw = row.LONGITUDE || '';
                    
                    // Skip empty rows
                    if (!latRaw && !lngRaw) continue;
                    
                    let lat = fastCleanCoordinate(latRaw);
                    let lng = fastCleanCoordinate(lngRaw);
                    
                    // Try to fix if invalid
                    let isValid = false;
                    let isFixed = false;
                    
                    if (lat !== null && lng !== null) {
                        isValid = isValidIndonesia(lat, lng);
                    }
                    
                    // If invalid, try one more fix (swap)
                    if (!isValid && lat !== null && lng !== null) {
                        // Try swapping
                        const tempLat = lat;
                        const tempLng = lng;
                        if (isValidIndonesia(tempLng, tempLat)) {
                            lat = tempLng;
                            lng = tempLat;
                            isValid = true;
                            isFixed = true;
                        }
                    }
                    
                    // If still invalid, try another fix (remove all dots)
                    if (!isValid && latRaw && lngRaw) {
                        const latNoDot = parseFloat(latRaw.replace(/\./g, ''));
                        const lngNoDot = parseFloat(lngRaw.replace(/\./g, ''));
                        if (!isNaN(latNoDot) && !isNaN(lngNoDot)) {
                            if (isValidIndonesia(latNoDot, lngNoDot)) {
                                lat = latNoDot;
                                lng = lngNoDot;
                                isValid = true;
                                isFixed = true;
                            }
                        }
                    }
                    
                    if (isValid) {
                        validData.push({
                            ...row,
                            lat: lat,
                            lng: lng,
                            isFixed: isFixed
                        });
                    } else {
                        invalidCount++;
                    }
                    
                    // Update progress periodically
                    if (i % 100 === 0 && progressCallback) {
                        const progress = Math.min(80, 10 + (i / rows.length) * 70);
                        progressCallback(progress, `Memproses ${i}/${rows.length}...`);
                    }
                }
                
                allData = validData;
                
                // Log results
                console.log('📊 ===== LOAD DATA COMPLETE =====');
                console.log(`  - Total: ${totalRaw}`);
                console.log(`  - Valid: ${allData.length}`);
                console.log(`  - Invalid: ${invalidCount}`);
                console.log(`  - Fixed: ${fixedCount}`);
                
                isLoading = false;
                if (progressCallback) progressCallback(100, 'Selesai!');
                if (callback) callback(allData, null);
            })
            .catch(error => {
                console.error('Error:', error);
                isLoading = false;
                if (callback) callback(null, [{ message: error.message }]);
            });
    }
    
    function getAllData() {
        return allData;
    }
    
    function getFilteredData(filters = {}) {
        let result = [...allData];
        
        if (filters.regional && filters.regional !== 'all') {
            result = result.filter(row => row['REGIONAL'] === filters.regional);
        }
        
        if (filters.paket && filters.paket !== 'all') {
            result = result.filter(row => row['Paket'] === filters.paket);
        }
        
        return result;
    }
    
    function getRegionals() {
        const regionals = new Set();
        for (const row of allData) {
            if (row['REGIONAL']) regionals.add(row['REGIONAL']);
        }
        return Array.from(regionals).sort();
    }
    
    function getPakets() {
        const pakets = new Set();
        for (const row of allData) {
            if (row['Paket']) pakets.add(row['Paket']);
        }
        return Array.from(pakets).sort();
    }
    
    function getStats() {
        return {
            total: allData.length,
            totalRaw: totalRaw,
            invalid: invalidCount
        };
    }
    
    function getInvalidCount() {
        return invalidCount;
    }
    
    function isLoadingData() {
        return isLoading;
    }
    
    return {
        loadFromFile: loadFromFile,
        getAllData: getAllData,
        getFilteredData: getFilteredData,
        getRegionals: getRegionals,
        getPakets: getPakets,
        getStats: getStats,
        getInvalidCount: getInvalidCount,
        isLoadingData: isLoadingData
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLoader;
}
