/**
 * mapController.js
 * Modul untuk mengontrol peta Leaflet
 */

const MapController = (function() {
    'use strict';
    
    let map = null;
    let heatmapLayer = null;
    let markerLayer = null;
    let clusterLayer = null;
    let currentData = [];
    let isInitialized = false;
    
    // Konfigurasi heatmap
    const HEATMAP_CONFIG = {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        minOpacity: 0.3,
        maxOpacity: 0.8,
        gradient: {
            0.0: 'blue',
            0.25: 'cyan',
            0.5: 'lime',
            0.75: 'yellow',
            1.0: 'red'
        }
    };
    
    /**
     * Inisialisasi peta
     * @param {string} elementId - ID elemen peta
     * @param {Object} options - Opsi peta
     * @returns {Object} - Instance peta
     */
    function init(elementId = 'map', options = {}) {
        if (isInitialized) {
            return map;
        }
        
        const defaultOptions = {
            center: [-3.5, 118.0],
            zoom: 5,
            zoomControl: true,
            ...options
        };
        
        map = L.map(elementId, defaultOptions);
        
        // Base layers
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        });
        
        const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap, &copy; CartoDB'
        });
        
        const satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        });
        
        // Tambahkan base layer
        osmLayer.addTo(map);
        
        // Layer control
        L.control.layers({
            'OpenStreetMap': osmLayer,
            'CartoDB': cartoLayer,
            'Satelit': satelliteLayer
        }).addTo(map);
        
        // Scale control
        L.control.scale({
            position: 'bottomleft',
            metric: true,
            imperial: false
        }).addTo(map);
        
        isInitialized = true;
        
        // Event listener
        map.on('moveend', function() {
            // Trigger event untuk update
            document.dispatchEvent(new Event('mapMoved'));
        });
        
        return map;
    }
    
    /**
     * Mendapatkan instance peta
     * @returns {Object} - Instance peta
     */
    function getMap() {
        return map;
    }
    
    /**
     * Menampilkan heatmap dari data
     * @param {Array} data - Array data [lat, lng, intensity]
     * @param {Object} config - Konfigurasi heatmap
     */
    function showHeatmap(data, config = {}) {
        if (!map) return;
        
        // Hapus heatmap lama
        removeHeatmap();
        
        if (!data || data.length === 0) {
            return;
        }
        
        const finalConfig = { ...HEATMAP_CONFIG, ...config };
        heatmapLayer = L.heatLayer(data, finalConfig);
        heatmapLayer.addTo(map);
    }
    
    /**
     * Menghapus heatmap
     */
    function removeHeatmap() {
        if (heatmapLayer) {
            map.removeLayer(heatmapLayer);
            heatmapLayer = null;
        }
    }
    
    /**
     * Menampilkan marker untuk setiap titik
     * @param {Array} data - Array data dengan lat, lng, dan properti lainnya
     * @param {Object} options - Opsi marker
     */
    function showMarkers(data, options = {}) {
        if (!map) return;
        
        // Hapus marker lama
        removeMarkers();
        
        if (!data || data.length === 0) {
            return;
        }
        
        const defaultOptions = {
            radius: 6,
            fillColor: '#1a237e',
            color: '#0d47a1',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.6,
            popupTemplate: null
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        markerLayer = L.layerGroup();
        
        data.forEach(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
            
            const marker = L.circleMarker([lat, lng], {
                radius: finalOptions.radius,
                fillColor: finalOptions.fillColor,
                color: finalOptions.color,
                weight: finalOptions.weight,
                opacity: finalOptions.opacity,
                fillOpacity: finalOptions.fillOpacity
            });
            
            // Buat popup
            let popupContent = '';
            if (finalOptions.popupTemplate) {
                popupContent = finalOptions.popupTemplate(item);
            } else {
                popupContent = `
                    <div style="min-width: 200px;">
                        <div class="popup-title">${item['NAMA KANTOR'] || 'Fasilitas'}</div>
                        <hr style="margin: 5px 0;">
                        <b>Paket:</b> ${item['Paket'] || '-'}<br>
                        <b>Regional:</b> ${item['REGIONAL'] || '-'}<br>
                        <b>Alamat:</b> ${item['ALAMAT'] || '-'}<br>
                        <b>Koordinat:</b> ${lat.toFixed(4)}, ${lng.toFixed(4)}
                    </div>
                `;
            }
            
            marker.bindPopup(popupContent, {
                className: 'custom-popup'
            });
            
            markerLayer.addLayer(marker);
        });
        
        markerLayer.addTo(map);
    }
    
    /**
     * Menghapus marker
     */
    function removeMarkers() {
        if (markerLayer) {
            map.removeLayer(markerLayer);
            markerLayer = null;
        }
    }
    
    /**
     * Menampilkan cluster marker
     * @param {Array} data - Array data
     * @param {Object} options - Opsi cluster
     */
    function showClusters(data, options = {}) {
        if (!map) return;
        
        // Hapus cluster lama
        removeClusters();
        
        if (!data || data.length === 0) {
            return;
        }
        
        const defaultOptions = {
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        clusterLayer = L.markerClusterGroup(finalOptions);
        
        data.forEach(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
            
            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'custom-cluster-marker',
                    html: `<div style="background: #1a237e; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">1</div>`,
                    iconSize: [30, 30]
                })
            });
            
            marker.bindPopup(`
                <strong>${item['NAMA KANTOR'] || 'Fasilitas'}</strong><br>
                ${item['ALAMAT'] || ''}
            `);
            
            clusterLayer.addLayer(marker);
        });
        
        clusterLayer.addTo(map);
    }
    
    /**
     * Menghapus cluster
     */
    function removeClusters() {
        if (clusterLayer) {
            map.removeLayer(clusterLayer);
            clusterLayer = null;
        }
    }
    
    /**
     * Menyesuaikan tampilan peta ke data
     * @param {Array} data - Array data dengan lat/lng
     * @param {Object} options - Opsi fit bounds
     */
    function fitToData(data, options = {}) {
        if (!map || !data || data.length === 0) return;
        
        const bounds = data.map(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            return [lat, lng];
        }).filter(([lat, lng]) => lat && lng && !isNaN(lat) && !isNaN(lng));
        
        if (bounds.length > 0) {
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 12,
                ...options
            });
        }
    }
    
    /**
     * Reset peta ke tampilan awal
     */
    function resetView() {
        if (!map) return;
        map.setView([-3.5, 118.0], 5);
        removeHeatmap();
        removeMarkers();
        removeClusters();
    }
    
    /**
     * Hapus semua layer
     */
    function clearLayers() {
        removeHeatmap();
        removeMarkers();
        removeClusters();
    }
    
    /**
     * Mendapatkan bounds peta saat ini
     * @returns {Object} - Bounds peta
     */
    function getBounds() {
        if (!map) return null;
        return map.getBounds();
    }
    
    // Public API
    return {
        init: init,
        getMap: getMap,
        showHeatmap: showHeatmap,
        removeHeatmap: removeHeatmap,
        showMarkers: showMarkers,
        removeMarkers: removeMarkers,
        showClusters: showClusters,
        removeClusters: removeClusters,
        fitToData: fitToData,
        resetView: resetView,
        clearLayers: clearLayers,
        getBounds: getBounds
    };
})();

// Ekspor untuk penggunaan global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapController;
}