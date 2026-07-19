/**
 * dataLoader.js - DENGAN DATA VALID DAN INVALID
 */

const DataLoader = (function() {
    'use strict';
    
    let allData = [];
    let invalidData = [];
    let isLoading = false;
    let invalidCount = 0;
    let fixedCount = 0;
    let totalRaw = 0;
    
    const INDONESIA_BOUNDS = {
        minLat: -12.0,
        maxLat: 8.0,
        minLng: 94.0,
        maxLng: 142.0
    };
    
    function fastCleanCoordinate(coord) {
        if (!coord) return null;
        
        let cleaned = coord.toString().trim().replace(/\s/g, '');
        cleaned = cleaned.replace(/,/g, '.');
        
        const dotCount = (cleaned.match(/\./g) || []).length;
        if (dotCount > 1) {
            const parts = cleaned.split('.');
            if (parts.length === 3 && parts[0].length <= 2) {
                cleaned = parts[0] + '.' + parts[1] + parts[2];
            } else if (parts.length > 3) {
                const firstPart = parts[0];
                const rest = parts.slice(1).join('');
                cleaned = firstPart + '.' + rest;
            }
        }
        
        const parsed = parseFloat(cleaned);
        if (isNaN(parsed) || parsed < -180 || parsed > 180) return null;
        return parsed;
    }
    
    function isValidIndonesia(lat, lng) {
        return lat !== null && lng !== null && 
               !isNaN(lat) && !isNaN(lng) &&
               lat >= INDONESIA_BOUNDS.minLat && lat <= INDONESIA_BOUNDS.maxLat &&
               lng >= INDONESIA_BOUNDS.minLng && lng <= INDONESIA_BOUNDS.maxLng;
    }
    
    function loadFromFile(url, callback, progressCallback) {
        if (isLoading) {
            console.warn('Loading in progress...');
            return;
        }
        
        isLoading = true;
        allData = [];
        invalidData = [];
        invalidCount = 0;
        fixedCount = 0;
        totalRaw = 0;
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvString => {
                if (typeof Papa === 'undefined') {
                    throw new Error('Papa Parse not found');
                }
                
                const results = Papa.parse(csvString, {
                    header: true,
                    delimiter: ';',
                    skipEmptyLines: true,
                    fastMode: true,
                    transform: function(value) {
                        return value ? value.trim() : '';
                    }
                });
                
                const rows = results.data;
                totalRaw = rows.length;
                
                const validData = [];
                const invalidRows = [];
                
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const latRaw = row.LATITUDE || '';
                    const lngRaw = row.LONGITUDE || '';
                    
                    if (!latRaw && !lngRaw) continue;
                    
                    let lat = fastCleanCoordinate(latRaw);
                    let lng = fastCleanCoordinate(lngRaw);
                    
                    let isValid = false;
                    let isFixed = false;
                    let invalidReason = '';
                    
                    if (lat !== null && lng !== null) {
                        isValid = isValidIndonesia(lat, lng);
                        if (!isValid) {
                            invalidReason = 'Koordinat di luar Indonesia';
                        }
                    } else {
                        invalidReason = 'Format koordinat tidak valid';
                    }
                    
                    // Coba perbaiki dengan swap
                    if (!isValid && lat !== null && lng !== null) {
                        if (isValidIndonesia(lng, lat)) {
                            const temp = lat;
                            lat = lng;
                            lng = temp;
                            isValid = true;
                            isFixed = true;
                            invalidReason = '';
                        }
                    }
                    
                    // Coba perbaiki dengan menghapus titik
                    if (!isValid && latRaw && lngRaw) {
                        const latNoDot = parseFloat(latRaw.replace(/\./g, ''));
                        const lngNoDot = parseFloat(lngRaw.replace(/\./g, ''));
                        if (!isNaN(latNoDot) && !isNaN(lngNoDot)) {
                            if (isValidIndonesia(latNoDot, lngNoDot)) {
                                lat = latNoDot;
                                lng = lngNoDot;
                                isValid = true;
                                isFixed = true;
                                invalidReason = '';
                            }
                        }
                    }
                    
                    if (isValid) {
                        validData.push({
                            ...row,
                            lat: lat,
                            lng: lng,
                            isFixed: isFixed,
                            isValid: true
                        });
                        if (isFixed) fixedCount++;
                    } else {
                        invalidCount++;
                        invalidRows.push({
                            ...row,
                            lat: lat,
                            lng: lng,
                            isValid: false,
                            invalidReason: invalidReason || 'Tidak dapat diperbaiki',
                            _rawLat: latRaw,
                            _rawLng: lngRaw
                        });
                    }
                    
                    if (i % 100 === 0 && progressCallback) {
                        const progress = Math.min(80, 10 + (i / rows.length) * 70);
                        progressCallback(progress, `Memproses ${i}/${rows.length}...`);
                    }
                }
                
                allData = validData;
                invalidData = invalidRows;
                
                console.log('📊 ===== LOAD DATA COMPLETE =====');
                console.log(`  - Total: ${totalRaw}`);
                console.log(`  - Valid: ${allData.length} (${(allData.length/totalRaw*100).toFixed(1)}%)`);
                console.log(`  - Invalid: ${invalidCount} (${(invalidCount/totalRaw*100).toFixed(1)}%)`);
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
    
    function getInvalidData() {
        return invalidData;
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
            invalid: invalidCount,
            fixed: fixedCount,
            validPercent: (allData.length / totalRaw * 100).toFixed(1)
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
        getInvalidData: getInvalidData,
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
