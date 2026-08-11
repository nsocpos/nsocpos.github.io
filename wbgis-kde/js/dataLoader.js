/**
 * ==========================================================
 * dataLoader.js
 * Load dan Validasi Data Eksperimen
 * ==========================================================
 *
 * Fungsi utama:
 * 1. Membaca data eksperimen dari file CSV.
 * 2. Melakukan parsing data menggunakan Papa Parse.
 * 3. Membersihkan format koordinat latitude dan longitude.
 * 4. Memvalidasi koordinat berdasarkan batas wilayah Indonesia.
 * 5. Memperbaiki beberapa format koordinat yang tidak sesuai.
 * 6. Memisahkan data valid dan data tidak valid.
 * 7. Menyediakan data untuk proses analisis selanjutnya.
 * 8. Menyediakan statistik hasil validasi data.
 */

const DataLoader = (function() {
    'use strict';

    /**
     * ======================================================
     * 1. VARIABEL PENYIMPANAN DATA
     * ======================================================
     */

    // Menyimpan seluruh data koordinat yang telah dinyatakan valid.
    let allData = [];

    // Menyimpan data yang tidak valid setelah proses validasi.
    let invalidData = [];

    // Menandai apakah proses loading data sedang berjalan.
    let isLoading = false;

    // Menyimpan jumlah data yang tidak valid.
    let invalidCount = 0;

    // Menyimpan jumlah data yang berhasil diperbaiki.
    let fixedCount = 0;

    // Menyimpan jumlah seluruh baris data mentah.
    let totalRaw = 0;


    /**
     * ======================================================
     * 2. BATAS WILAYAH INDONESIA
     * ======================================================
     *
     * Digunakan sebagai batas validasi koordinat.
     *
     * minLat : batas latitude paling selatan
     * maxLat : batas latitude paling utara
     * minLng : batas longitude paling barat
     * maxLng : batas longitude paling timur
     */
    const INDONESIA_BOUNDS = {

        // Batas latitude minimum Indonesia.
        minLat: -12.0,

        // Batas latitude maksimum Indonesia.
        maxLat: 8.0,

        // Batas longitude minimum Indonesia.
        minLng: 94.0,

        // Batas longitude maksimum Indonesia.
        maxLng: 142.0
    };


    /**
     * ======================================================
     * 3. MEMBERSIHKAN FORMAT KOORDINAT
     * ======================================================
     *
     * Membersihkan dan mengubah nilai koordinat mentah
     * menjadi angka yang dapat digunakan dalam analisis.
     *
     * Proses meliputi:
     * - Menghapus spasi.
     * - Mengubah koma menjadi titik desimal.
     * - Menangani format dengan lebih dari satu titik.
     * - Mengubah string menjadi angka.
     * - Memastikan nilai berada pada rentang koordinat
     *   geografis yang valid.
     */
    function fastCleanCoordinate(coord) {

        // Jika koordinat kosong, kembalikan null.
        if (!coord) return null;

        // Mengubah nilai menjadi string,
        // menghapus spasi di awal/akhir,
        // kemudian menghapus seluruh spasi.
        let cleaned = coord
            .toString()
            .trim()
            .replace(/\s/g, '');

        // Mengubah tanda koma menjadi titik
        // agar sesuai dengan format desimal JavaScript.
        cleaned = cleaned.replace(/,/g, '.');


        /**
         * Menghitung jumlah tanda titik pada koordinat.
         *
         * Contoh:
         * "107.123.456" memiliki 2 titik.
         */
        const dotCount =
            (cleaned.match(/\./g) || []).length;


        // Jika terdapat lebih dari satu titik,
        // dilakukan proses perbaikan format.
        if (dotCount > 1) {

            // Memisahkan nilai berdasarkan tanda titik.
            const parts = cleaned.split('.');


            /**
             * Jika terdapat tiga bagian dan bagian pertama
             * memiliki maksimal dua digit, maka titik kedua
             * dianggap sebagai kesalahan format.
             *
             * Contoh:
             * 107.12.34 → 107.1234
             */
            if (
                parts.length === 3 &&
                parts[0].length <= 2
            ) {

                cleaned =
                    parts[0] +
                    '.' +
                    parts[1] +
                    parts[2];

            /**
             * Jika terdapat lebih dari tiga bagian,
             * seluruh bagian setelah bagian pertama
             * digabung kembali.
             */
            } else if (parts.length > 3) {

                // Menyimpan bagian pertama.
                const firstPart = parts[0];

                // Menggabungkan seluruh bagian berikutnya.
                const rest =
                    parts.slice(1).join('');

                // Membentuk kembali koordinat.
                cleaned =
                    firstPart +
                    '.' +
                    rest;
            }
        }


        // Mengubah string koordinat menjadi angka.
        const parsed = parseFloat(cleaned);


        // Jika hasil parsing bukan angka atau berada
        // di luar rentang koordinat geografis,
        // koordinat dianggap tidak valid.
        if (
            isNaN(parsed) ||
            parsed < -180 ||
            parsed > 180
        ) {
            return null;
        }

        // Mengembalikan koordinat yang telah dibersihkan.
        return parsed;
    }


    /**
     * ======================================================
     * 4. VALIDASI KOORDINAT INDONESIA
     * ======================================================
     *
     * Memeriksa apakah koordinat:
     * - Tidak bernilai null.
     * - Merupakan angka.
     * - Berada di dalam batas wilayah Indonesia.
     */
    function isValidIndonesia(lat, lng) {

        return (
            lat !== null &&
            lng !== null &&
            !isNaN(lat) &&
            !isNaN(lng) &&

            // Memeriksa batas latitude.
            lat >= INDONESIA_BOUNDS.minLat &&
            lat <= INDONESIA_BOUNDS.maxLat &&

            // Memeriksa batas longitude.
            lng >= INDONESIA_BOUNDS.minLng &&
            lng <= INDONESIA_BOUNDS.maxLng
        );
    }


    /**
     * ======================================================
     * 5. MEMUAT DATA DARI FILE
     * ======================================================
     *
     * Membaca file CSV dan melakukan proses:
     * parsing → cleaning → validasi → perbaikan →
     * pemisahan data valid dan invalid.
     */
    function loadFromFile(
        url,
        callback,
        progressCallback
    ) {

        // Jika proses loading masih berjalan,
        // proses baru tidak dijalankan.
        if (isLoading) return;

        // Menandai bahwa proses loading dimulai.
        isLoading = true;


        /**
         * Mereset seluruh data dan counter
         * sebelum proses loading baru.
         */
        allData = [];
        invalidData = [];
        invalidCount = 0;
        fixedCount = 0;
        totalRaw = 0;


        /**
         * ==================================================
         * 5.1 MENGAMBIL FILE
         * ==================================================
         */

        // Mengambil file menggunakan Fetch API.
        fetch(url)

            // Memeriksa response dari server.
            .then(response => {

                // Jika response gagal,
                // lempar error HTTP.
                if (!response.ok) {
                    throw new Error(
                        `HTTP error! status: ${response.status}`
                    );
                }

                // Mengubah response menjadi teks.
                return response.text();
            })


            /**
             * ==================================================
             * 5.2 PARSING DATA CSV
             * ==================================================
             */
            .then(csvString => {

                // Memastikan library Papa Parse tersedia.
                if (typeof Papa === 'undefined') {
                    throw new Error(
                        'Papa Parse not found'
                    );
                }


                // Melakukan parsing data CSV.
                const results = Papa.parse(
                    csvString,
                    {

                        // Baris pertama digunakan sebagai nama kolom.
                        header: true,

                        // File menggunakan tanda titik koma
                        // sebagai delimiter antar kolom.
                        delimiter: ';',

                        // Mengabaikan baris kosong.
                        skipEmptyLines: true,

                        // Mengaktifkan mode parsing cepat.
                        fastMode: true,

                        // Membersihkan spasi pada setiap nilai.
                        transform: function(value) {
                            return value
                                ? value.trim()
                                : '';
                        }
                    }
                );


                /**
                 * ==================================================
                 * 5.3 MENYIAPKAN DATA HASIL PARSING
                 * ==================================================
                 */

                // Mengambil seluruh baris hasil parsing.
                const rows = results.data;

                // Menyimpan jumlah seluruh data mentah.
                totalRaw = rows.length;

                // Menyimpan data yang valid.
                const validData = [];

                // Menyimpan data yang tidak valid.
                const invalidRows = [];


                /**
                 * ==================================================
                 * 5.4 MEMPROSES SETIAP BARIS DATA
                 * ==================================================
                 */

                for (
                    let i = 0;
                    i < rows.length;
                    i++
                ) {

                    // Mengambil satu baris data.
                    const row = rows[i];


                    // Mengambil nilai latitude dari kolom LATITUDE.
                    // Jika tidak tersedia, digunakan string kosong.
                    const latRaw =
                        row.LATITUDE || '';


                    // Mengambil nilai longitude dari kolom LONGITUDE.
                    const lngRaw =
                        row.LONGITUDE || '';


                    // Jika latitude dan longitude sama-sama kosong,
                    // baris tersebut dilewati.
                    if (!latRaw && !lngRaw) continue;


                    /**
                     * Membersihkan koordinat latitude.
                     */
                    let lat =
                        fastCleanCoordinate(latRaw);


                    /**
                     * Membersihkan koordinat longitude.
                     */
                    let lng =
                        fastCleanCoordinate(lngRaw);


                    // Status awal validasi koordinat.
                    let isValid = false;

                    // Status apakah koordinat berhasil diperbaiki.
                    let isFixed = false;

                    // Menyimpan alasan jika data tidak valid.
                    let invalidReason = '';


                    /**
                     * ==================================================
                     * 5.5 VALIDASI AWAL KOORDINAT
                     * ==================================================
                     */

                    // Jika latitude dan longitude berhasil
                    // dikonversi menjadi angka.
                    if (
                        lat !== null &&
                        lng !== null
                    ) {

                        // Memeriksa apakah koordinat
                        // berada dalam wilayah Indonesia.
                        isValid =
                            isValidIndonesia(
                                lat,
                                lng
                            );

                        // Jika berada di luar wilayah Indonesia,
                        // berikan alasan invalid.
                        if (!isValid) {
                            invalidReason =
                                'Di luar Indonesia';
                        }

                    } else {

                        // Jika koordinat tidak dapat diparsing,
                        // berarti format koordinat tidak valid.
                        invalidReason =
                            'Format tidak valid';
                    }


                    /**
                     * ==================================================
                     * 5.6 PERBAIKAN URUTAN LATITUDE DAN LONGITUDE
                     * ==================================================
                     *
                     * Beberapa data dapat memiliki latitude
                     * dan longitude yang tertukar.
                     *
                     * Contoh:
                     * latitude  = 107.xxx
                     * longitude = -6.xxx
                     *
                     * Kondisi tersebut diperiksa dengan
                     * menukar posisi latitude dan longitude.
                     */
                    if (
                        !isValid &&
                        lat !== null &&
                        lng !== null &&
                        isValidIndonesia(lng, lat)
                    ) {

                        // Menyimpan sementara nilai latitude.
                        const temp = lat;

                        // Menukar latitude dengan longitude.
                        lat = lng;

                        // Menempatkan latitude sebelumnya
                        // menjadi longitude.
                        lng = temp;

                        // Menandai data sebagai valid.
                        isValid = true;

                        // Menandai bahwa data telah diperbaiki.
                        isFixed = true;

                        // Menghapus alasan invalid.
                        invalidReason = '';
                    }


                    /**
                     * ==================================================
                     * 5.7 PERBAIKAN FORMAT ANGKA KOORDINAT
                     * ==================================================
                     *
                     * Jika data masih tidak valid,
                     * dilakukan percobaan alternatif dengan
                     * menghapus tanda titik.
                     */
                    if (
                        !isValid &&
                        latRaw &&
                        lngRaw
                    ) {

                        // Menghapus seluruh tanda titik
                        // pada latitude mentah.
                        const latNoDot =
                            parseFloat(
                                latRaw.replace(/\./g, '')
                            );

                        // Menghapus seluruh tanda titik
                        // pada longitude mentah.
                        const lngNoDot =
                            parseFloat(
                                lngRaw.replace(/\./g, '')
                            );


                        // Memeriksa apakah hasil konversi
                        // merupakan koordinat Indonesia.
                        if (
                            !isNaN(latNoDot) &&
                            !isNaN(lngNoDot) &&
                            isValidIndonesia(
                                latNoDot,
                                lngNoDot
                            )
                        ) {

                            // Menggunakan hasil perbaikan latitude.
                            lat = latNoDot;

                            // Menggunakan hasil perbaikan longitude.
                            lng = lngNoDot;

                            // Menandai data sebagai valid.
                            isValid = true;

                            // Menandai bahwa data telah diperbaiki.
                            isFixed = true;

                            // Menghapus alasan invalid.
                            invalidReason = '';
                        }
                    }


                    /**
                     * ==================================================
                     * 5.8 PEMISAHAN DATA VALID DAN INVALID
                     * ==================================================
                     */

                    if (isValid) {

                        /**
                         * Data valid disimpan ke validData.
                         *
                         * Data asli tetap dipertahankan menggunakan
                         * spread operator (...row), kemudian ditambahkan
                         * latitude, longitude, dan status validasi.
                         */
                        validData.push({
                            ...row,
                            lat,
                            lng,
                            isFixed,
                            isValid: true
                        });


                        // Jika data diperbaiki,
                        // counter fixed ditambah satu.
                        if (isFixed) {
                            fixedCount++;
                        }

                    } else {

                        // Menambah jumlah data tidak valid.
                        invalidCount++;


                        /**
                         * Menyimpan data invalid beserta
                         * informasi alasan invalid.
                         */
                        invalidRows.push({
                            ...row,

                            // Menyimpan hasil latitude yang telah diproses.
                            lat,

                            // Menyimpan hasil longitude yang telah diproses.
                            lng,

                            // Menandai data sebagai tidak valid.
                            isValid: false,

                            // Menyimpan alasan data tidak valid.
                            invalidReason:
                                invalidReason ||
                                'Tidak dapat diperbaiki',

                            // Menyimpan nilai latitude asli.
                            _rawLat: latRaw,

                            // Menyimpan nilai longitude asli.
                            _rawLng: lngRaw
                        });
                    }


                    /**
                     * ==================================================
                     * 5.9 PROGRESS PEMROSESAN DATA
                     * ==================================================
                     *
                     * Callback dipanggil setiap 100 baris
                     * untuk memperbarui progress pada antarmuka.
                     */
                    if (
                        i % 100 === 0 &&
                        progressCallback
                    ) {

                        progressCallback(
                            10 +
                            (i / rows.length) * 80,

                            `Memproses ${i}/${rows.length}...`
                        );
                    }
                }


                /**
                 * ==================================================
                 * 5.10 MENYIMPAN HASIL VALIDASI
                 * ==================================================
                 */

                // Menyimpan seluruh data yang valid.
                allData = validData;

                // Menyimpan seluruh data yang tidak valid.
                invalidData = invalidRows;


                /**
                 * ==================================================
                 * 5.11 MENAMPILKAN STATISTIK DATA
                 * ==================================================
                 */

                // Menampilkan header informasi eksperimen.
                console.log(
                    '📊 ===== DATA EKSPERIMEN ====='
                );

                // Menampilkan jumlah seluruh data.
                console.log(
                    `  Total: ${totalRaw}`
                );

                // Menampilkan jumlah dan persentase data valid.
                console.log(
                    `  ✅ Valid: ${allData.length} ` +
                    `(${(allData.length / totalRaw * 100).toFixed(1)}%)`
                );

                // Menampilkan jumlah dan persentase data invalid.
                console.log(
                    `  ❌ Invalid: ${invalidCount} ` +
                    `(${(invalidCount / totalRaw * 100).toFixed(1)}%)`
                );

                // Menampilkan jumlah dan persentase data
                // yang berhasil diperbaiki.
                console.log(
                    `  🔧 Fixed: ${fixedCount} ` +
                    `(${(fixedCount / totalRaw * 100).toFixed(1)}%)`
                );


                /**
                 * ==================================================
                 * 5.12 MENYELESAIKAN PROSES LOADING
                 * ==================================================
                 */

                // Menandai bahwa proses loading telah selesai.
                isLoading = false;


                // Mengirim progress 100% jika callback tersedia.
                if (progressCallback) {
                    progressCallback(
                        100,
                        'Selesai!'
                    );
                }


                // Mengembalikan data valid melalui callback.
                if (callback) {
                    callback(
                        allData,
                        null
                    );
                }
            })


            /**
             * ==================================================
             * 5.13 PENANGANAN ERROR
             * ==================================================
             */
            .catch(error => {

                // Menampilkan error pada console.
                console.error(
                    'Error:',
                    error
                );

                // Mengubah status loading menjadi selesai.
                isLoading = false;


                // Mengembalikan informasi error
                // melalui callback.
                if (callback) {
                    callback(
                        null,
                        [
                            {
                                message: error.message
                            }
                        ]
                    );
                }
            });
    }


    /**
     * ======================================================
     * 6. MENGAMBIL SELURUH DATA VALID
     * ======================================================
     *
     * Mengembalikan seluruh data yang telah dinyatakan valid.
     */
    function getAllData() {

        return allData;
    }


    /**
     * ======================================================
     * 7. MENGAMBIL DATA INVALID
     * ======================================================
     *
     * Mengembalikan seluruh data yang tidak lolos validasi.
     */
    function getInvalidData() {

        return invalidData;
    }


    /**
     * ======================================================
     * 8. FILTER DATA
     * ======================================================
     *
     * Memfilter data berdasarkan:
     * - Regional
     * - Paket
     *
     * Parameter:
     * filters = {
     *     regional: '...',
     *     paket: '...'
     * }
     */
    function getFilteredData(filters = {}) {

        // Membuat salinan data valid agar data asli
        // tidak dimodifikasi secara langsung.
        let result = [...allData];


        /**
         * Filter berdasarkan Regional.
         *
         * Jika regional bernilai 'all', seluruh data digunakan.
         */
        if (
            filters.regional &&
            filters.regional !== 'all'
        ) {

            result = result.filter(
                row =>
                    row['REGIONAL'] ===
                    filters.regional
            );
        }


        /**
         * Filter berdasarkan Paket.
         *
         * Jika paket bernilai 'all', seluruh paket digunakan.
         */
        if (
            filters.paket &&
            filters.paket !== 'all'
        ) {

            result = result.filter(
                row =>
                    row['Paket'] ===
                    filters.paket
            );
        }


        // Mengembalikan data hasil filter.
        return result;
    }


    /**
     * ======================================================
     * 9. MENGAMBIL DAFTAR REGIONAL
     * ======================================================
     *
     * Mengambil seluruh nilai regional unik
     * dari data valid.
     */
    function getRegionals() {

        // Set digunakan untuk menghilangkan nilai duplikat.
        const regionals = new Set();


        // Memeriksa seluruh data valid.
        for (const row of allData) {

            // Jika kolom REGIONAL memiliki nilai,
            // masukkan ke dalam Set.
            if (row['REGIONAL']) {
                regionals.add(
                    row['REGIONAL']
                );
            }
        }


        // Mengubah Set menjadi Array
        // kemudian mengurutkannya.
        return Array
            .from(regionals)
            .sort();
    }


    /**
     * ======================================================
     * 10. MENGAMBIL DAFTAR PAKET
     * ======================================================
     *
     * Mengambil seluruh nilai paket unik
     * dari data valid.
     */
    function getPakets() {

        // Set digunakan untuk menghindari data paket duplikat.
        const pakets = new Set();


        // Memeriksa seluruh data valid.
        for (const row of allData) {

            // Jika kolom Paket memiliki nilai,
            // masukkan ke dalam Set.
            if (row['Paket']) {
                pakets.add(
                    row['Paket']
                );
            }
        }


        // Mengubah Set menjadi Array
        // kemudian mengurutkannya.
        return Array
            .from(pakets)
            .sort();
    }


    /**
     * ======================================================
     * 11. STATISTIK VALIDASI DATA
     * ======================================================
     *
     * Menghasilkan ringkasan hasil validasi:
     * - Total data valid
     * - Total data mentah
     * - Total data invalid
     * - Total data yang diperbaiki
     * - Persentase masing-masing kategori
     */
    function getStats() {

        return {

            // Jumlah data yang valid.
            total: allData.length,

            // Jumlah seluruh data mentah.
            totalRaw: totalRaw,

            // Jumlah data invalid.
            invalid: invalidCount,

            // Jumlah data yang berhasil diperbaiki.
            fixed: fixedCount,

            // Persentase data valid.
            validPercent:
                (
                    allData.length /
                    totalRaw *
                    100
                ).toFixed(1),

            // Persentase data invalid.
            invalidPercent:
                (
                    invalidCount /
                    totalRaw *
                    100
                ).toFixed(1),

            // Persentase data yang berhasil diperbaiki.
            fixedPercent:
                (
                    fixedCount /
                    totalRaw *
                    100
                ).toFixed(1)
        };
    }


    /**
     * ======================================================
     * 12. PUBLIC API
     * ======================================================
     *
     * Menentukan fungsi yang dapat dipanggil
     * dari luar module DataLoader.
     */
    return {

        // Memuat dan memvalidasi data dari file.
        loadFromFile,

        // Mengambil seluruh data valid.
        getAllData,

        // Mengambil seluruh data invalid.
        getInvalidData,

        // Mengambil data berdasarkan filter.
        getFilteredData,

        // Mengambil daftar regional unik.
        getRegionals,

        // Mengambil daftar paket unik.
        getPakets,

        // Mengambil statistik validasi data.
        getStats,

        // Mengambil jumlah data invalid.
        getInvalidCount:
            () => invalidCount
    };

})();


/**
 * ==========================================================
 * 13. NODE.JS / COMMONJS EXPORT
 * ==========================================================
 *
 * Jika kode dijalankan menggunakan Node.js,
 * module DataLoader dapat digunakan menggunakan
 * fungsi require().
 */
if (
    typeof module !== 'undefined' &&
    module.exports
) {

    // Mengekspor module DataLoader.
    module.exports = DataLoader;
}
