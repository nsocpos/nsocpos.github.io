/**
 * dataLoader.js
 * Modul untuk memuat dan memproses data CSV dengan validasi ketat
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
            // Coba parse dengan menghapus semua titik kecuali yang pertama
            const parts = cleaned.split('.');
            if (parts.length > 2) {
                // Ambil bagian pertama (bisa negatif) dan gabungkan sisanya
                const firstPart = parts[0];
                const rest = parts.slice(1).join('');
                cleaned = firstPart + '.' + rest;
            }
        }
        
        // Jika ada format seperti 3.591.867 (ribuan)
        // Ubah menjadi 3.591867
        if (cleaned.match(/^\d{1,2}\.\d{3}\.\d{3}$/)) {
            const parts = cleaned.split('.');
            cleaned = parts[0] + '.' + parts[1] + parts[2];
        }
        
        // Jika ada format seperti -6,193982 (koma)
        cleaned = cleaned.replace(/,/g, '.');
        
        // Konversi ke float
        const parsed = parseFloat(cleaned);
        
        // Validasi: harus number, tidak NaN
        if (isNaN(parsed)) return null;
        
        // Validasi rentang koordinat
        // Latitude: -90 s/d 90, Longitude: -180 s/d 180
        if (parsed < -90 || parsed > 90) {
            // Coba sebagai longitude (mungkin terbalik)
            if (parsed >= -180 && parsed <= 180) {
                return parsed;
            }
            return null;
        }
        
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
     * Coba perbaiki koordinat yang terbalik (longitude di latitude)
     */
    function tryFixSwappedCoordinates(lat, lng) {
        // Jika latitude tidak valid tapi longitude valid untuk latitude
        if ((lat < -90 || lat > 90) && (lng >= -90 && lng <= 90)) {
            // Coba swap
            const temp = lat;
            lat = lng;
            lng = temp;
        }
        return { lat, lng };
    }
    
    /**
     * Perbaiki data yang memiliki format koordinat dengan koma desimal
     * Contoh: -6,193982 menjadi -6.193982
     */
    function fixCommaDecimal(value) {
        if (typeof value === 'string' && value.includes(',')) {
            return value.replace(/,/g, '.');
        }
        return value;
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
        
        processedData = rawData.map((row, index) => {
            let latRaw = row.LATITUDE || '';
            let lngRaw = row.LONGITUDE || '';
            
            // Perbaiki format koma
            latRaw = fixCommaDecimal(latRaw);
            lngRaw = fixCommaDecimal(lngRaw);
            
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
            
            // Jika tidak valid, coba perbaiki dengan berbagai cara
            if (lat === null || lng === null || !isValidIndonesia(lat, lng)) {
                // Coba parse ulang dengan pendekatan berbeda
                const latStr = latRaw.toString();
                const lngStr = lngRaw.toString();
                
                // Coba hapus semua titik kecuali yang pertama
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
                
                // Coba swap
                if (lat !== null && lng !== null) {
                    const swapped = tryFixSwappedCoordinates(lat, lng);
                    lat = swapped.lat;
                    lng = swapped.lng;
                }
                
                isValid = lat !== null && lng !== null && 
                         !isNaN(lat) && !isNaN(lng) &&
                         isValidIndonesia(lat, lng);
                isFixed = isValid;
            } else {
                isValid = true;
            }
            
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
            } else {
                validCount++;
                if (isFixed) fixedCount++;
            }
            
            return {
                ...row,
                lat: lat,
                lng: lng,
                isValid: isValid,
                isFixed: isFixed,
                _rawLat: latRaw,
                _rawLng: lngRaw
            };
        });
        
        // Filter data valid
        allData = processedData.filter(row => row.isValid);
        
        // Log informasi detail
        console.log('📊 ===== HASIL LOAD DATA =====');
        console.log(`  - Total rows: ${rawData.length}`);
        console.log(`  - Valid: ${validCount}`);
        console.log(`  - Invalid: ${invalidCount}`);
        console.log(`  - Fixed: ${fixedCount}`);
        console.log(`  - Valid di Indonesia: ${allData.length}`);
        
        // Log data tidak valid (sample)
        if (invalidRows.length > 0) {
            console.warn('⚠️ Contoh data tidak valid (max 20):');
            invalidRows.forEach(row => {
                console.warn(`  - ${row.nama} (lat: ${row.lat}, lng: ${row.lng}) -> parsed: ${row.parsedLat}, ${row.parsedLng}`);
            });
            if (invalidCount > 20) {
                console.warn(`  ... dan ${invalidCount - 20} lainnya`);
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
        return processedData.filter(row => !row.isValid);
    }
    
    function getInvalidDataLog() {
        return invalidDataLog;
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
        getInvalidDataLog: getInvalidDataLog,
        cleanCoordinate: cleanCoordinate,
        isValidIndonesia: isValidIndonesia,
        isLoadingData: isLoadingData
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLoader;
}
