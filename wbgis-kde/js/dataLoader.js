/**
 * dataLoader.js
 * Modul untuk memuat dan memproses data CSV dari file eksternal
 */

const DataLoader = (function() {
    'use strict';
    
    let rawData = [];
    let processedData = [];
    let allData = [];
    let isLoading = false;
    let loadProgress = 0;
    
    /**
     * Membersihkan koordinat dengan validasi yang lebih baik
     */
    function cleanCoordinate(coord) {
        if (!coord) return null;
        
        // Hapus spasi dan karakter aneh
        let cleaned = coord.toString().trim().replace(/\s/g, '');
        
        // Jika koordinat memiliki format dengan banyak titik
        if (cleaned.includes('.') && cleaned.split('.').length > 3) {
            const parts = cleaned.split('.');
            if (parts.length > 2) {
                const firstPart = parts[0];
                const rest = parts.slice(1).join('');
                cleaned = firstPart + '.' + rest;
            }
        }
        
        const parsed = parseFloat(cleaned);
        
        if (isNaN(parsed)) return null;
        
        return parsed;
    }
    
    /**
     * Validasi apakah koordinat berada di Indonesia
     */
    function isValidIndonesia(lat, lng) {
        const MIN_LAT = -11.0;
        const MAX_LAT = 6.0;
        const MIN_LNG = 95.0;
        const MAX_LNG = 141.0;
        
        return lat !== null && lng !== null && 
               !isNaN(lat) && !isNaN(lng) &&
               lat >= MIN_LAT && lat <= MAX_LAT &&
               lng >= MIN_LNG && lng <= MAX_LNG;
    }
    
    /**
     * Memuat data dari file CSV eksternal
     */
    function loadFromFile(url, callback, progressCallback) {
        if (isLoading) {
            console.warn('Data sedang dimuat...');
            return;
        }
        
        isLoading = true;
        loadProgress = 0;
        
        // Gunakan Fetch API untuk membaca file
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvString => {
                loadProgress = 30;
                if (progressCallback) progressCallback(loadProgress, 'Parsing CSV...');
                
                parseCSV(csvString, function(data, error) {
                    isLoading = false;
                    loadProgress = 100;
                    if (progressCallback) progressCallback(loadProgress, 'Selesai!');
                    
                    if (callback) callback(data, error);
                }, progressCallback);
            })
            .catch(error => {
                isLoading = false;
                console.error('Error loading CSV file:', error);
                if (callback) callback(null, [{ message: error.message }]);
            });
    }
    
    /**
     * Memuat data dari string CSV (untuk fallback)
     */
    function loadFromCSV(csvString, callback) {
        parseCSV(csvString, callback);
    }
    
    /**
     * Parse CSV string
     */
    function parseCSV(csvString, callback, progressCallback) {
        if (typeof Papa === 'undefined') {
            console.error('Papa Parse library tidak ditemukan');
            if (callback) callback(null, [{ message: 'Papa Parse library tidak ditemukan' }]);
            return;
        }
        
        const results = Papa.parse(csvString, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true,
            transform: function(value) {
                return value ? value.trim() : '';
            },
            step: function(row, parser) {
                // Progress per row untuk file besar
                if (progressCallback) {
                    const progress = Math.min(70, 30 + (row.meta.cursor / row.meta.filesize) * 40);
                    progressCallback(progress, `Memproses data... (${Math.round(progress)}%)`);
                }
            }
        });
        
        if (results.errors.length > 0) {
            console.error('Error parsing CSV:', results.errors);
            if (callback) callback(null, results.errors);
            return;
        }
        
        rawData = results.data;
        
        let validCount = 0;
        let invalidCount = 0;
        const invalidRows = [];
        
        processedData = rawData.map((row, index) => {
            const latRaw = row.LATITUDE || '';
            const lngRaw = row.LONGITUDE || '';
            
            const lat = cleanCoordinate(latRaw);
            const lng = cleanCoordinate(lngRaw);
            
            const isValid = lat !== null && lng !== null && 
                           !isNaN(lat) && !isNaN(lng) &&
                           isValidIndonesia(lat, lng);
            
            if (!isValid) {
                invalidCount++;
                if (invalidRows.length < 10) {
                    invalidRows.push({
                        index: index,
                        nama: row['NAMA KANTOR'] || 'Unknown',
                        lat: latRaw,
                        lng: lngRaw
                    });
                }
            } else {
                validCount++;
            }
            
            return {
                ...row,
                lat: lat,
                lng: lng,
                isValid: isValid,
                _rawLat: latRaw,
                _rawLng: lngRaw
            };
        });
        
        allData = processedData.filter(row => row.isValid);
        
        console.log(`📊 Load Data Results:`);
        console.log(`  - Total rows: ${rawData.length}`);
        console.log(`  - Valid: ${validCount}`);
        console.log(`  - Invalid: ${invalidCount}`);
        
        if (invalidRows.length > 0) {
            console.warn(`⚠️ Contoh data tidak valid:`);
            invalidRows.forEach(row => {
                console.warn(`  - ${row.nama} (lat: ${row.lat}, lng: ${row.lng})`);
            });
            if (invalidCount > 10) {
                console.warn(`  ... dan ${invalidCount - 10} lainnya`);
            }
        }
        
        if (callback) callback(allData, null);
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
        
        if (filters.provinsi && filters.provinsi !== 'all') {
            result = result.filter(row => row['PROVINSI'] === filters.provinsi);
        }
        
        return result;
    }
    
    function getRegionals() {
        const regionals = new Set();
        allData.forEach(row => {
            if (row['REGIONAL']) {
                regionals.add(row['REGIONAL']);
            }
        });
        return Array.from(regionals).sort();
    }
    
    function getPakets() {
        const pakets = new Set();
        allData.forEach(row => {
            if (row['Paket']) {
                pakets.add(row['Paket']);
            }
        });
        return Array.from(pakets).sort();
    }
    
    function getProvinsis() {
        const provinsis = new Set();
        allData.forEach(row => {
            if (row['PROVINSI']) {
                provinsis.add(row['PROVINSI']);
            }
        });
        return Array.from(provinsis).sort();
    }
    
    function getStats() {
        return {
            total: allData.length,
            regionals: getRegionals().length,
            pakets: getPakets().length,
            provinces: getProvinsis().length
        };
    }
    
    function getInvalidData() {
        return processedData.filter(row => !row.isValid);
    }
    
    function isLoadingData() {
        return isLoading;
    }
    
    return {
        loadFromFile: loadFromFile,
        loadFromCSV: loadFromCSV,
        getAllData: getAllData,
        getFilteredData: getFilteredData,
        getRegionals: getRegionals,
        getPakets: getPakets,
        getProvinsis: getProvinsis,
        getStats: getStats,
        getInvalidData: getInvalidData,
        cleanCoordinate: cleanCoordinate,
        isValidIndonesia: isValidIndonesia,
        isLoadingData: isLoadingData
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLoader;
}
