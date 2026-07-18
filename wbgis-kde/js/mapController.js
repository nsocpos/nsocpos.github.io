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
    let hotspotLayer = null;
    let coldspotLayer = null;
    let isInitialized = false;
    
    // Batas Indonesia
    const INDONESIA_BOUNDS = {
        minLat: -11.0,
        maxLat: 6.0,
        minLng: 95.0,
        maxLng: 141.0
    };
    
    // Konfigurasi heatmap
    const HEATMAP_CONFIG = {
        radius: 20,
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
    
    function init(elementId = 'map', options = {}) {
        if (isInitialized) return map;
        
        const defaultOptions = {
            center: [-2.5, 118.0],
            zoom: 5,
            zoomControl: true,
            minZoom: 4,
            maxBounds: [
                [INDONESIA_BOUNDS.minLat - 3, INDONESIA_BOUNDS.minLng - 3],
                [INDONESIA_BOUNDS.maxLat + 3, INDONESIA_BOUNDS.maxLng + 3]
            ],
            maxBoundsViscosity: 1.0,
            ...options
        };
        
        map = L.map(elementId, defaultOptions);
        
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            minZoom: 4,
            maxZoom: 18
        });
        
        const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap, &copy; CartoDB',
            minZoom: 4,
            maxZoom: 18
        });
        
        const satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps',
            minZoom: 4,
            maxZoom: 18
        });
        
        osmLayer.addTo(map);
        
        L.control.layers({
            'OpenStreetMap': osmLayer,
            'CartoDB': cartoLayer,
            'Satelit': satelliteLayer
        }, null, { position: 'topright' }).addTo(map);
        
        L.control.scale({
            position: 'bottomleft',
            metric: true,
            imperial: false
        }).addTo(map);
        
        isInitialized = true;
        
        map.on('moveend', function() {
            document.dispatchEvent(new Event('mapMoved'));
        });
        
        return map;
    }
    
    function getMap() { return map; }
    
    function getIndonesiaBounds() {
        return L.latLngBounds(
            [INDONESIA_BOUNDS.minLat, INDONESIA_BOUNDS.minLng],
            [INDONESIA_BOUNDS.maxLat, INDONESIA_BOUNDS.maxLng]
        );
    }
    
    function isInIndonesia(lat, lng) {
        return lat >= INDONESIA_BOUNDS.minLat && 
               lat <= INDONESIA_BOUNDS.maxLat &&
               lng >= INDONESIA_BOUNDS.minLng && 
               lng <= INDONESIA_BOUNDS.maxLng;
    }
    
    function showHeatmap(data, config = {}) {
        if (!map) return;
        removeHeatmap();
        if (!data || data.length === 0) return;
        
        // Filter data di Indonesia
        const filteredData = data.filter(point => {
            const lat = point[0];
            const lng = point[1];
            return isInIndonesia(lat, lng);
        });
        
        if (filteredData.length === 0) return;
        
        const finalConfig = { ...HEATMAP_CONFIG, ...config };
        heatmapLayer = L.heatLayer(filteredData, finalConfig);
        heatmapLayer.addTo(map);
    }
    
    function removeHeatmap() {
        if (heatmapLayer) {
            map.removeLayer(heatmapLayer);
            heatmapLayer = null;
        }
    }
    
    function showMarkers(data, options = {}) {
        if (!map) return;
        removeMarkers();
        if (!data || data.length === 0) return;
        
        const filteredData = data.filter(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            return isInIndonesia(lat, lng);
        });
        
        if (filteredData.length === 0) return;
        
        const defaultOptions = {
            radius: 5,
            fillColor: '#1a237e',
            color: '#0d47a1',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.6
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        markerLayer = L.layerGroup();
        
        filteredData.forEach(item => {
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
            
            const popupContent = `
                <div style="min-width: 200px;">
                    <div class="popup-title">${item['NAMA KANTOR'] || 'Fasilitas'}</div>
                    <hr style="margin: 5px 0;">
                    <b>Paket:</b> ${item['Paket'] || '-'}<br>
                    <b>Regional:</b> ${item['REGIONAL'] || '-'}<br>
                    <b>Provinsi:</b> ${item['PROVINSI'] || '-'}<br>
                    <b>Alamat:</b> ${item['ALAMAT'] || '-'}
                </div>
            `;
            
            marker.bindPopup(popupContent, { className: 'custom-popup' });
            markerLayer.addLayer(marker);
        });
        
        markerLayer.addTo(map);
    }
    
    function removeMarkers() {
        if (markerLayer) {
            map.removeLayer(markerLayer);
            markerLayer = null;
        }
    }
    
    function showHotspots(data, options = {}) {
        if (!map) return;
        removeHotspots();
        if (!data || data.length === 0) return;
        
        const defaultOptions = {
            radius: 8,
            fillColor: '#c62828',
            color: '#ff1744',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        hotspotLayer = L.layerGroup();
        
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
            
            const density = item.density || 0;
            marker.bindPopup(`
                <div style="min-width: 180px;">
                    <strong style="color: #c62828;">🔥 Hotspot</strong><br>
                    <b>Nama:</b> ${item['NAMA KANTOR'] || 'Fasilitas'}<br>
                    <b>Regional:</b> ${item['REGIONAL'] || '-'}<br>
                    <b>Density:</b> ${density} titik dalam radius
                </div>
            `, { className: 'custom-popup' });
            
            hotspotLayer.addLayer(marker);
        });
        
        hotspotLayer.addTo(map);
    }
    
    function removeHotspots() {
        if (hotspotLayer) {
            map.removeLayer(hotspotLayer);
            hotspotLayer = null;
        }
    }
    
    function showColdspots(data, options = {}) {
        if (!map) return;
        removeColdspots();
        if (!data || data.length === 0) return;
        
        const defaultOptions = {
            radius: 8,
            fillColor: '#1565c0',
            color: '#448aff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        coldspotLayer = L.layerGroup();
        
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
            
            const density = item.density || 0;
            marker.bindPopup(`
                <div style="min-width: 180px;">
                    <strong style="color: #1565c0;">❄️ Coldspot</strong><br>
                    <b>Nama:</b> ${item['NAMA KANTOR'] || 'Fasilitas'}<br>
                    <b>Regional:</b> ${item['REGIONAL'] || '-'}<br>
                    <b>Density:</b> ${density} titik dalam radius
                </div>
            `, { className: 'custom-popup' });
            
            coldspotLayer.addLayer(marker);
        });
        
        coldspotLayer.addTo(map);
    }
    
    function removeColdspots() {
        if (coldspotLayer) {
            map.removeLayer(coldspotLayer);
            coldspotLayer = null;
        }
    }
    
    function showClusters(data) {
        if (!map) return;
        removeClusters();
        if (!data || data.length === 0) return;
        
        const filteredData = data.filter(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            return isInIndonesia(lat, lng);
        });
        
        if (filteredData.length === 0) return;
        
        clusterLayer = L.markerClusterGroup({
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true
        });
        
        filteredData.forEach(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
            
            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'custom-cluster-marker',
                    html: `<div style="background: #1a237e; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">1</div>`,
                    iconSize: [28, 28]
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
    
    function removeClusters() {
        if (clusterLayer) {
            map.removeLayer(clusterLayer);
            clusterLayer = null;
        }
    }
    
    function fitToData(data, options = {}) {
        if (!map || !data || data.length === 0) {
            map.fitBounds(getIndonesiaBounds(), { padding: [50, 50], ...options });
            return;
        }
        
        const bounds = data.map(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            return [lat, lng];
        }).filter(([lat, lng]) => {
            return lat && lng && !isNaN(lat) && !isNaN(lng) && isInIndonesia(lat, lng);
        });
        
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10, ...options });
        } else {
            map.fitBounds(getIndonesiaBounds(), { padding: [50, 50], ...options });
        }
    }
    
    function resetView() {
        if (!map) return;
        map.fitBounds(getIndonesiaBounds(), { padding: [50, 50] });
        clearLayers();
    }
    
    function clearLayers() {
        removeHeatmap();
        removeMarkers();
        removeClusters();
        removeHotspots();
        removeColdspots();
    }
    
    function getBounds() {
        if (!map) return null;
        return map.getBounds();
    }
    
    return {
        init: init,
        getMap: getMap,
        getIndonesiaBounds: getIndonesiaBounds,
        isInIndonesia: isInIndonesia,
        showHeatmap: showHeatmap,
        removeHeatmap: removeHeatmap,
        showMarkers: showMarkers,
        removeMarkers: removeMarkers,
        showHotspots: showHotspots,
        removeHotspots: removeHotspots,
        showColdspots: showColdspots,
        removeColdspots: removeColdspots,
        showClusters: showClusters,
        removeClusters: removeClusters,
        fitToData: fitToData,
        resetView: resetView,
        clearLayers: clearLayers,
        getBounds: getBounds
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapController;
}
