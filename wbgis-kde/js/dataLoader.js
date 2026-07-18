/**
 * dataLoader.js
 * Modul untuk memuat dan memproses data CSV dengan validasi ketat
 */

const DataLoader = (function() {
    'use strict';
    
    let rawData = [];
    let processedData = [];
    let allData = [];
    
    /**
     * Membersihkan koordinat dengan validasi yang lebih baik
     */
    function cleanCoordinate(coord) {
        if (!coord) return null;
        
        // Hapus spasi dan karakter aneh
        let cleaned = coord.toString().trim().replace(/\s/g, '');
        
        // Jika koordinat memiliki format dengan banyak titik (seperti -689.418.027.494.068)
        // maka ambil bagian yang valid
        if (cleaned.includes('.') && cleaned.split('.').length > 3) {
            // Coba parse dengan menghapus semua titik kecuali yang pertama
            const parts = cleaned.split('.');
            if (parts.length > 2) {
                // Ambil bagian pertama dan gabungkan sisanya
                const firstPart = parts[0];
                const rest = parts.slice(1).join('');
                cleaned = firstPart + '.' + rest;
            }
        }
        
        // Konversi ke float
        const parsed = parseFloat(cleaned);
        
        // Validasi: harus number, tidak NaN, dan dalam rentang koordinat yang masuk akal
        if (isNaN(parsed)) return null;
        
        // Validasi rentang koordinat (Latitude: -90 s/d 90, Longitude: -180 s/d 180)
        // Tapi untuk Indonesia, kita batasi lebih ketat
        return parsed;
    }
    
    /**
     * Validasi apakah koordinat berada di Indonesia
     */
    function isValidIndonesia(lat, lng) {
        // Batas Indonesia
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
     * Memuat data dari string CSV
     */
    function loadFromCSV(csvString, callback) {
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
                invalidRows.push({
                    index: index,
                    nama: row['NAMA KANTOR'] || 'Unknown',
                    lat: latRaw,
                    lng: lngRaw
                });
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
        
        // Filter data valid
        allData = processedData.filter(row => row.isValid);
        
        // Log informasi
        console.log(`📊 Load Data Results:`);
        console.log(`  - Total rows: ${rawData.length}`);
        console.log(`  - Valid: ${validCount}`);
        console.log(`  - Invalid: ${invalidCount}`);
        
        if (invalidRows.length > 0) {
            console.warn(`⚠️ Data tidak valid (${invalidRows.length}):`);
            invalidRows.slice(0, 5).forEach(row => {
                console.warn(`  - Row ${row.index}: ${row.nama} (lat: ${row.lat}, lng: ${row.lng})`);
            });
            if (invalidRows.length > 5) {
                console.warn(`  ... dan ${invalidRows.length - 5} lainnya`);
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
    
    return {
        loadFromCSV: loadFromCSV,
        getAllData: getAllData,
        getFilteredData: getFilteredData,
        getRegionals: getRegionals,
        getPakets: getPakets,
        getProvinsis: getProvinsis,
        getStats: getStats,
        getInvalidData: getInvalidData,
        cleanCoordinate: cleanCoordinate,
        isValidIndonesia: isValidIndonesia
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLoader;
}
