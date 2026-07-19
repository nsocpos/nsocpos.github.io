/**
 * mapController.js - Kontrol Peta
 */

const MapController = (function() {
    'use strict';
    
    let map = null;
    let heatmapLayer = null;
    let markerLayer = null;
    let hotspotLayer = null;
    let coldspotLayer = null;
    let isInitialized = false;
    
    const INDONESIA_BOUNDS = {
        minLat: -12.0, maxLat: 8.0, minLng: 94.0, maxLng: 142.0
    };
    
    function init(elementId = 'map', options = {}) {
        if (isInitialized) return map;
        
        map = L.map(elementId, {
            center: [-2.5, 118.0],
            zoom: 5,
            minZoom: 3,
            maxZoom: 18,
            ...options
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            minZoom: 3, maxZoom: 19
        }).addTo(map);
        
        L.control.layers({
            'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
            'CartoDB': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'),
            'Satelit': L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            })
        }, null, { position: 'topright' }).addTo(map);
        
        L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);
        
        isInitialized = true;
        map.on('moveend', function() { document.dispatchEvent(new Event('mapMoved')); });
        
        return map;
    }
    
    function getMap() { return map; }
    function isInIndonesia(lat, lng) {
        return lat >= INDONESIA_BOUNDS.minLat && lat <= INDONESIA_BOUNDS.maxLat &&
               lng >= INDONESIA_BOUNDS.minLng && lng <= INDONESIA_BOUNDS.maxLng;
    }
    
    function showHeatmap(data, config = {}) {
        removeHeatmap();
        if (!data || data.length === 0) return;
        
        const filteredData = data.filter(p => isInIndonesia(p[0], p[1]));
        if (filteredData.length === 0) return;
        
        const defaultConfig = {
            radius: 25, blur: 15, maxZoom: 17,
            minOpacity: 0.3, maxOpacity: 0.8,
            gradient: { 0.0: 'blue', 0.2: 'cyan', 0.4: 'lime', 0.6: 'yellow', 0.8: 'orange', 1.0: 'red' }
        };
        
        try {
            heatmapLayer = L.heatLayer(filteredData, { ...defaultConfig, ...config });
            heatmapLayer.addTo(map);
        } catch(e) {
            console.warn('Heatmap fallback:', e);
            showHeatmapFallback(filteredData);
        }
    }
    
    function showHeatmapFallback(data) {
        const group = L.layerGroup();
        const maxIntensity = Math.max(...data.map(d => d[2] || 0), 1);
        
        data.forEach(point => {
            const lat = point[0], lng = point[1];
            const intensity = (point[2] || 0) / maxIntensity;
            const radius = 3 + intensity * 15;
            const color = intensity > 0.8 ? '#ff0000' : intensity > 0.6 ? '#ff8800' :
                         intensity > 0.4 ? '#ffff00' : intensity > 0.2 ? '#00ff88' : '#0066ff';
            
            const marker = L.circleMarker([lat, lng], {
                radius, fillColor: color, color: color,
                weight: 0.5, opacity: 0.6, fillOpacity: 0.3 + intensity * 0.5
            });
            
            marker.bindTooltip(`Kepadatan: ${(intensity * 100).toFixed(1)}%`,
                { permanent: false, direction: 'top', className: 'custom-tooltip' });
            group.addLayer(marker);
        });
        
        heatmapLayer = group;
        heatmapLayer.addTo(map);
    }
    
    function removeHeatmap() { if (heatmapLayer) { try { map.removeLayer(heatmapLayer); } catch(e) {} heatmapLayer = null; } }
    
    function showMarkers(data) {
        removeMarkers();
        if (!data || data.length === 0) return;
        
        const filteredData = data.filter(item => isInIndonesia(item.lat || item.LATITUDE, item.lng || item.LONGITUDE));
        if (filteredData.length === 0) return;
        
        markerLayer = L.layerGroup();
        
        filteredData.forEach(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
            
            const isHotspot = item.isHotspot || false;
            const isColdspot = item.isColdspot || false;
            const density = item.density || 0;
            
            let fillColor = '#1a237e';
            let radius = 5;
            if (isHotspot) { fillColor = '#c62828'; radius = 8; }
            else if (isColdspot) { fillColor = '#1565c0'; radius = 8; }
            
            const marker = L.circleMarker([lat, lng], {
                radius, fillColor, color: fillColor,
                weight: 1.5, opacity: 0.8, fillOpacity: 0.7
            });
            
            let tooltip = `<strong>${item['NAMA KANTOR'] || 'Fasilitas'}</strong>`;
            if (density > 0) tooltip += `<br>Kepadatan: ${density} titik`;
            if (isHotspot) tooltip += `<br><span style="color:#c62828;">🔥 HOTSPOT</span>`;
            if (isColdspot) tooltip += `<br><span style="color:#1565c0;">❄️ COLDSPOT</span>`;
            
            marker.bindTooltip(tooltip, { permanent: false, direction: 'top', className: 'custom-tooltip' });
            
            marker.bindPopup(`
                <div style="min-width:200px;padding:5px;">
                    <div style="font-weight:600;color:#1a237e;font-size:14px;">${item['NAMA KANTOR'] || 'Fasilitas'}</div>
                    <hr style="margin:5px 0;">
                    <table style="font-size:12px;width:100%;">
                        <tr><td><b>Paket:</b></td><td>${item['Paket'] || '-'}</td></tr>
                        <tr><td><b>Regional:</b></td><td>${item['REGIONAL'] || '-'}</td></tr>
                        <tr><td><b>Provinsi:</b></td><td>${item['PROVINSI'] || '-'}</td></tr>
                        ${density > 0 ? `<tr><td><b>Kepadatan:</b></td><td>${density} titik</td></tr>` : ''}
                        ${isHotspot ? '<tr><td colspan="2" style="color:#c62828;font-weight:600;">🔥 HOTSPOT</td></tr>' : ''}
                        ${isColdspot ? '<tr><td colspan="2" style="color:#1565c0;font-weight:600;">❄️ COLDSPOT</td></tr>' : ''}
                    </table>
                </div>
            `, { className: 'custom-popup', maxWidth: 300 });
            
            markerLayer.addLayer(marker);
        });
        
        markerLayer.addTo(map);
    }
    
    function removeMarkers() { if (markerLayer) { try { map.removeLayer(markerLayer); } catch(e) {} markerLayer = null; } }
    
    function showHotspots(data) {
        removeHotspots();
        if (!data || data.length === 0) return;
        
        const filteredData = data.filter(item => isInIndonesia(item.lat || item.LATITUDE, item.lng || item.LONGITUDE));
        if (filteredData.length === 0) return;
        
        hotspotLayer = L.layerGroup();
        
        filteredData.forEach(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
            
            const density = item.density || 0;
            
            const marker = L.circleMarker([lat, lng], {
                radius: 10, fillColor: '#c62828', color: '#ff1744',
                weight: 2, opacity: 1, fillOpacity: 0.8
            });
            
            marker.bindTooltip(`
                <div style="text-align:center;">
                    <strong style="color:#c62828;">🔥 HOTSPOT</strong><br>
                    ${item['NAMA KANTOR'] || 'Fasilitas'}<br>
                    <span style="font-size:14px;font-weight:600;">Kepadatan: ${density} titik</span>
                </div>
            `, { permanent: false, direction: 'top', className: 'custom-tooltip hotspot-tooltip' });
            
            marker.bindPopup(`
                <div style="min-width:200px;padding:5px;">
                    <div style="color:#c62828;font-weight:700;font-size:16px;">🔥 HOTSPOT</div>
                    <hr style="margin:5px 0;">
                    <div style="font-weight:600;font-size:14px;">${item['NAMA KANTOR'] || 'Fasilitas'}</div>
                    <table style="font-size:12px;margin-top:5px;width:100%;">
                        <tr><td><b>Regional:</b></td><td>${item['REGIONAL'] || '-'}</td></tr>
                        <tr><td><b>Provinsi:</b></td><td>${item['PROVINSI'] || '-'}</td></tr>
                        <tr><td><b>Kepadatan:</b></td><td>${density} titik</td></tr>
                    </table>
                </div>
            `, { className: 'custom-popup' });
            
            hotspotLayer.addLayer(marker);
        });
        
        hotspotLayer.addTo(map);
    }
    
    function removeHotspots() { if (hotspotLayer) { try { map.removeLayer(hotspotLayer); } catch(e) {} hotspotLayer = null; } }
    
    function showColdspots(data) {
        removeColdspots();
        if (!data || data.length === 0) return;
        
        const filteredData = data.filter(item => isInIndonesia(item.lat || item.LATITUDE, item.lng || item.LONGITUDE));
        if (filteredData.length === 0) return;
        
        coldspotLayer = L.layerGroup();
        
        filteredData.forEach(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
            
            const density = item.density || 0;
            
            const marker = L.circleMarker([lat, lng], {
                radius: 10, fillColor: '#1565c0', color: '#448aff',
                weight: 2, opacity: 1, fillOpacity: 0.8
            });
            
            marker.bindTooltip(`
                <div style="text-align:center;">
                    <strong style="color:#1565c0;">❄️ COLDSPOT</strong><br>
                    ${item['NAMA KANTOR'] || 'Fasilitas'}<br>
                    <span style="font-size:14px;font-weight:600;">Kepadatan: ${density} titik</span>
                </div>
            `, { permanent: false, direction: 'top', className: 'custom-tooltip coldspot-tooltip' });
            
            marker.bindPopup(`
                <div style="min-width:200px;padding:5px;">
                    <div style="color:#1565c0;font-weight:700;font-size:16px;">❄️ COLDSPOT</div>
                    <hr style="margin:5px 0;">
                    <div style="font-weight:600;font-size:14px;">${item['NAMA KANTOR'] || 'Fasilitas'}</div>
                    <table style="font-size:12px;margin-top:5px;width:100%;">
                        <tr><td><b>Regional:</b></td><td>${item['REGIONAL'] || '-'}</td></tr>
                        <tr><td><b>Provinsi:</b></td><td>${item['PROVINSI'] || '-'}</td></tr>
                        <tr><td><b>Kepadatan:</b></td><td>${density} titik</td></tr>
                    </table>
                </div>
            `, { className: 'custom-popup' });
            
            coldspotLayer.addLayer(marker);
        });
        
        coldspotLayer.addTo(map);
    }
    
    function removeColdspots() { if (coldspotLayer) { try { map.removeLayer(coldspotLayer); } catch(e) {} coldspotLayer = null; } }
    
    function clearLayers() { removeHeatmap(); removeMarkers(); removeHotspots(); removeColdspots(); }
    
    function fitToData(data) {
        if (!map) return;
        if (!data || data.length === 0) { map.setView([-2.5, 118.0], 5); return; }
        
        const bounds = data.map(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            return [lat, lng];
        }).filter(([lat, lng]) => lat && lng && !isNaN(lat) && !isNaN(lng) && isInIndonesia(lat, lng));
        
        if (bounds.length > 0) {
            try { map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 }); }
            catch(e) { map.setView([-2.5, 118.0], 5); }
        } else { map.setView([-2.5, 118.0], 5); }
    }
    
    function resetView() { if (map) { map.setView([-2.5, 118.0], 5); clearLayers(); } }
    function getBounds() { return map ? map.getBounds() : null; }
    
    return {
        init, getMap, isInIndonesia,
        showHeatmap, removeHeatmap,
        showMarkers, removeMarkers,
        showHotspots, removeHotspots,
        showColdspots, removeColdspots,
        clearLayers, fitToData, resetView, getBounds
    };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = MapController; }
