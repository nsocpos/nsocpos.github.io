/**
 * dataLoader.js
 * Modul untuk memuat dan memproses data CSV
 */

const DataLoader = (function() {
    'use strict';
    
    // Data storage
    let rawData = [];
    let processedData = [];
    let allData = [];
    
    /**
     * Membersihkan koordinat dari format titik ribuan
     * @param {string} coord - Koordinat dalam string
     * @returns {number|null} - Koordinat dalam float
     */
    function cleanCoordinate(coord) {
        if (!coord) return null;
        const cleaned = coord.toString().replace(/\./g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    }
    
    /**
     * Memuat data dari string CSV
     * @param {string} csvString - Data CSV dalam string
     * @param {Function} callback - Fungsi callback setelah load
     */
    function loadFromCSV(csvString, callback) {
        // Gunakan Papa Parse untuk parsing CSV
        if (typeof Papa === 'undefined') {
            console.error('Papa Parse library tidak ditemukan');
            return;
        }
        
        const results = Papa.parse(csvString, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true,
            transform: function(value) {
                return value.trim();
            }
        });
        
        if (results.errors.length > 0) {
            console.error('Error parsing CSV:', results.errors);
            if (callback) callback(null, results.errors);
            return;
        }
        
        rawData = results.data;
        
        // Proses data
        processedData = rawData.map(row => {
            const lat = cleanCoordinate(row.LATITUDE);
            const lng = cleanCoordinate(row.LONGITUDE);
            
            return {
                ...row,
                lat: lat,
                lng: lng,
                isValid: lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)
            };
        });
        
        // Filter data valid
        allData = processedData.filter(row => row.isValid);
        
        if (callback) callback(allData, null);
    }
    
    /**
     * Mendapatkan semua data yang sudah diproses
     * @returns {Array} - Array data
     */
    function getAllData() {
        return allData;
    }
    
    /**
     * Mendapatkan data berdasarkan filter
     * @param {Object} filters - Filter yang akan diterapkan
     * @returns {Array} - Data terfilter
     */
    function getFilteredData(filters = {}) {
        let result = [...allData];
        
        // Filter regional
        if (filters.regional && filters.regional !== 'all') {
            result = result.filter(row => row['REGIONAL'] === filters.regional);
        }
        
        // Filter paket
        if (filters.paket && filters.paket !== 'all') {
            result = result.filter(row => row['Paket'] === filters.paket);
        }
        
        return result;
    }
    
    /**
     * Mendapatkan daftar regional unik
     * @returns {Array} - Daftar regional
     */
    function getRegionals() {
        const regionals = new Set();
        allData.forEach(row => {
            if (row['REGIONAL']) {
                regionals.add(row['REGIONAL']);
            }
        });
        return Array.from(regionals).sort();
    }
    
    /**
     * Mendapatkan daftar paket unik
     * @returns {Array} - Daftar paket
     */
    function getPakets() {
        const pakets = new Set();
        allData.forEach(row => {
            if (row['Paket']) {
                pakets.add(row['Paket']);
            }
        });
        return Array.from(pakets).sort();
    }
    
    /**
     * Mendapatkan statistik data
     * @returns {Object} - Statistik
     */
    function getStats() {
        return {
            total: allData.length,
            regionals: getRegionals().length,
            pakets: getPakets().length,
            provinces: new Set(allData.map(row => row['PROVINSI'])).size
        };
    }
    
    // Public API
    return {
        loadFromCSV: loadFromCSV,
        getAllData: getAllData,
        getFilteredData: getFilteredData,
        getRegionals: getRegionals,
        getPakets: getPakets,
        getStats: getStats,
        cleanCoordinate: cleanCoordinate
    };
})();

// Ekspor untuk penggunaan global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataLoader;
}