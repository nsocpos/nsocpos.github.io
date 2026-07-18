/**
 * dataLoader.js
 * Modul untuk memuat dan memproses data CSV - HANYA DATA VALID
 */

const DataLoader = (function() {
    'use strict';
    
    let rawData = [];
    let processedData = [];
    let allData = [];
    let isLoading = false;
    let loadProgress = 0;
    let invalidDataLog = [];
    
    /**
     * Membersihkan koordinat dengan validasi yang sangat kuat
     */
    function cleanCoordinate(coord) {
        if (!coord) return null;
        
        // Hapus spasi dan karakter aneh
        let cleaned = coord.toString().trim().replace(/\s/g, '');
        
        // Ganti koma dengan titik
        cleaned = cleaned.replace(/,/g, '.');
        
        // Jika koordinat memiliki format dengan banyak titik (seperti -689.418.027.494.068)
        if (cleaned.includes('.') && cleaned.split('.').length > 3) {
            const parts = cleaned.split('.');
            if (parts.length > 2) {
                const firstPart = parts[0];
                const rest = parts.slice(1).join('');
                cleaned = firstPart + '.' + rest;
            }
        }
        
        // Jika ada format seperti 3.591.867 (ribuan) -> 3.591867
        if (cleaned.match(/^\d{1,2}\.\d{3}\.\d{3}$/)) {
            const parts = cleaned.split('.');
            cleaned = parts[0] + '.' + parts[1] + parts[2];
        }
        
        // Jika ada format seperti 1.234.567.890 (terlalu banyak)
        if (cleaned.split('.').length > 3) {
            const parts = cleaned.split('.');
            // Ambil 2 bagian pertama dan gabungkan sisanya
            const firstTwo = parts.slice(0, 2);
            const rest = parts.slice(2).join('');
            cleaned = firstTwo.join('.') + rest;
        }
        
        // Konversi ke float
        const parsed = parseFloat(cleaned);
        
        // Validasi: harus number, tidak NaN
        if (isNaN(parsed)) return null;
        
        // Validasi rentang koordinat (dasar)
        if (parsed < -180 || parsed > 180) return null;
        
        return parsed;
    }
    
    /**
     * Validasi apakah koordinat berada di Indonesia
     */
    function isValidIndonesia(lat, lng) {
        // Batas Indonesia yang lebih longgar
        const MIN_LAT = -12.0;
        const MAX_LAT = 8.0;
        const MIN_LNG = 94.0;
        const MAX_LNG = 142.0;
        
        return lat !== null && lng !== null && 
               !isNaN(lat) && !isNaN(lng) &&
               lat >= MIN_LAT && lat <= MAX_LAT &&
               lng >= MIN_LNG && lng <= MAX_LNG;
    }
    
    /**
     * Coba perbaiki koordinat yang terbalik
     */
    function tryFixSwappedCoordinates(lat, lng) {
        // Jika latitude tidak valid tapi longitude valid untuk latitude
        if ((lat < -90 || lat > 90) && (lng >= -90 && lng <= 90)) {
            const temp = lat;
            lat = lng;
            lng = temp;
        }
        return { lat, lng };
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
        invalidDataLog = [];
        
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
     * Parse CSV string - HANYA DATA VALID YANG DISIMPAN
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
        let fixedCount = 0;
        const invalidRows = [];
        
        // Proses setiap baris
        processedData = rawData.map((row, index) => {
            let latRaw = row.LATITUDE || '';
            let lngRaw = row.LONGITUDE || '';
            
            // Bersihkan koordinat
            let lat = cleanCoordinate(latRaw);
            let lng = cleanCoordinate(lngRaw);
            
            // Coba swap jika perlu
            if (lat !== null && lng !== null) {
                const swapped = tryFixSwappedCoordinates(lat, lng);
                lat = swapped.lat;
                lng = swapped.lng;
            }
            
            let isValid = false;
            let isFixed = false;
            
            // Validasi koordinat di Indonesia
            if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
                isValid = isValidIndonesia(lat, lng);
                
                // Jika tidak valid, coba perbaiki dengan cara lain
                if (!isValid) {
                    // Coba hapus semua titik kecuali yang pertama (untuk format ribuan)
                    const latStr = latRaw.toString();
                    const lngStr = lngRaw.toString();
                    
                    if (latStr.includes('.') && latStr.split('.').length > 2) {
                        const parts = latStr.split('.');
                        const newLat = parseFloat(parts[0] + '.' + parts.slice(1).join(''));
                        if (!isNaN(newLat)) lat = newLat;
                    }
                    if (lngStr.includes('.') && lngStr.split('.').length > 2) {
                        const parts = lngStr.split('.');
                        const newLng = parseFloat(parts[0] + '.' + parts.slice(1).join(''));
                        if (!isNaN(newLng)) lng = newLng;
                    }
                    
                    // Coba swap lagi
                    if (lat !== null && lng !== null) {
                        const swapped = tryFixSwappedCoordinates(lat, lng);
                        lat = swapped.lat;
                        lng = swapped.lng;
                    }
                    
                    // Validasi ulang
                    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
                        isValid = isValidIndonesia(lat, lng);
                        isFixed = isValid;
                    }
                }
            }
            
            // Catat data tidak valid
            if (!isValid) {
                invalidCount++;
                if (invalidRows.length < 20) {
                    invalidRows.push({
                        index: index,
                        nama: row['NAMA KANTOR'] || 'Unknown',
                        lat: latRaw,
                        lng: lngRaw,
                        parsedLat: lat,
                        parsedLng: lng
                    });
                }
                // Return null untuk data tidak valid (akan difilter)
                return null;
            } else {
                validCount++;
                if (isFixed) fixedCount++;
                
                return {
                    ...row,
                    lat: lat,
                    lng: lng,
                    isValid: true,
                    isFixed: isFixed,
                    _rawLat: latRaw,
                    _rawLng: lngRaw
                };
            }
        });
        
        // Filter data yang null (tidak valid)
        processedData = processedData.filter(row => row !== null);
        
        // Semua data yang diproses adalah data valid
        allData = processedData;
        
        // Log informasi detail
        console.log('📊 ===== HASIL LOAD DATA =====');
        console.log(`  - Total rows di CSV: ${rawData.length}`);
        console.log(`  - Data VALID: ${validCount}`);
        console.log(`  - Data INVALID (diabaikan): ${invalidCount}`);
        console.log(`  - Data diperbaiki: ${fixedCount}`);
        console.log(`  - Total data ditampilkan: ${allData.length}`);
        
        // Log data tidak valid (sample)
        if (invalidRows.length > 0) {
            console.warn('⚠️ Data INVALID (diabaikan) - sample:');
            invalidRows.slice(0, 10).forEach(row => {
                console.warn(`  - ${row.nama} (lat: ${row.lat}, lng: ${row.lng})`);
            });
            if (invalidCount > 10) {
                console.warn(`  ... dan ${invalidCount - 10} lainnya`);
            }
        }
        
        invalidDataLog = invalidRows;
        
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
            totalRaw: rawData.length,
            invalid: rawData.length - allData.length,
            regionals: getRegionals().length,
            pakets: getPakets().length,
            provinces: getProvinsis().length
        };
    }
    
    function getInvalidData() {
        return invalidDataLog;
    }
    
    function getInvalidCount() {
        return rawData.length - allData.length;
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
        getInvalidCount: getInvalidCount,
        cleanCoordinate: cleanCoordinate,
        isValidIndonesia: isValidIndonesia,
        isLoadingData: isLoadingData
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLoader;
}
