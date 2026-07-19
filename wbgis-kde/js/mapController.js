/**
 * mapController.js - DENGAN HOVER EFFECT
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
        minLat: -12.0,
        maxLat: 8.0,
        minLng: 94.0,
        maxLng: 142.0
    };
    
    const HEATMAP_GRADIENT = {
        0.0: 'blue',
        0.2: 'cyan',
        0.4: 'lime',
        0.6: 'yellow',
        0.8: 'orange',
        1.0: 'red'
    };
    
    function init(elementId = 'map', options = {}) {
        if (isInitialized) return map;
        
        const defaultOptions = {
            center: [-2.5, 118.0],
            zoom: 5,
            minZoom: 3,
            maxZoom: 18,
            zoomControl: true,
            ...options
        };
        
        map = L.map(elementId, defaultOptions);
        
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            minZoom: 3,
            maxZoom: 19
        });
        
        const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap, &copy; CartoDB',
            minZoom: 3,
            maxZoom: 19
        });
        
        const satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps',
            minZoom: 3,
            maxZoom: 19
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
        
        const filteredData = data.filter(point => {
            const lat = point[0];
            const lng = point[1];
            return isInIndonesia(lat, lng);
        });
        
        if (filteredData.length === 0) return;
        
        const defaultConfig = {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            minOpacity: 0.3,
            maxOpacity: 0.8,
            gradient: HEATMAP_GRADIENT
        };
        
        const finalConfig = { ...defaultConfig, ...config };
        
        try {
            heatmapLayer = L.heatLayer(filteredData, finalConfig);
            heatmapLayer.addTo(map);
        } catch (error) {
            console.error('Error heatmap:', error);
            showHeatmapFallback(filteredData);
        }
    }
    
    function showHeatmapFallback(data) {
        const group = L.layerGroup();
        const maxIntensity = Math.max(...data.map(d => d[2] || 0), 1);
        
        data.forEach(point => {
            const lat = point[0];
            const lng = point[1];
            const intensity = (point[2] || 0) / maxIntensity;
            const radius = 3 + intensity * 15;
            const color = getHeatmapColor(intensity);
            
            const marker = L.circleMarker([lat, lng], {
                radius: radius,
                fillColor: color,
                color: color,
                weight: 0.5,
                opacity: 0.6,
                fillOpacity: 0.3 + intensity * 0.5
            });
            
            marker.bindTooltip(`Kepadatan: ${(intensity * 100).toFixed(1)}%`, 
                { permanent: false, direction: 'top', className: 'custom-tooltip' }
            );
            
            group.addLayer(marker);
        });
        
        heatmapLayer = group;
        heatmapLayer.addTo(map);
    }
    
    function getHeatmapColor(intensity) {
        const colors = [
            { pos: 0.0, color: [0, 0, 255] },
            { pos: 0.2, color: [0, 255, 255] },
            { pos: 0.4, color: [0, 255, 0] },
            { pos: 0.6, color: [255, 255, 0] },
            { pos: 0.8, color: [255, 165, 0] },
            { pos: 1.0, color: [255, 0, 0] }
        ];
        
        for (let i = 0; i < colors.length - 1; i++) {
            const c1 = colors[i];
            const c2 = colors[i + 1];
            if (intensity >= c1.pos && intensity <= c2.pos) {
                const t = (intensity - c1.pos) / (c2.pos - c1.pos);
                const r = Math.round(c1.color[0] + (c2.color[0] - c1.color[0]) * t);
                const g = Math.round(c1.color[1] + (c2.color[1] - c1.color[1]) * t);
                const b = Math.round(c1.color[2] + (c2.color[2] - c1.color[2]) * t);
                return `rgb(${r},${g},${b})`;
            }
        }
        return 'rgb(255,0,0)';
    }
    
    function removeHeatmap() {
        if (heatmapLayer) {
            try { map.removeLayer(heatmapLayer); } catch(e) {}
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
            
            const density = item.density || 0;
            const isHotspot = item.isHotspot || false;
            const isColdspot = item.isColdspot || false;
            
            let fillColor = finalOptions.fillColor;
            let radius = finalOptions.radius;
            
            if (isHotspot) {
                fillColor = '#c62828';
                radius = 8;
            } else if (isColdspot) {
                fillColor = '#1565c0';
                radius = 8;
            }
            
            const marker = L.circleMarker([lat, lng], {
                radius: radius,
                fillColor: fillColor,
                color: fillColor,
                weight: 1.5,
                opacity: 0.8,
                fillOpacity: 0.7
            });
            
            let tooltipText = `<strong>${item['NAMA KANTOR'] || 'Fasilitas'}</strong>`;
            if (density > 0) {
                tooltipText += `<br>Kepadatan: ${density} titik`;
            }
            if (isHotspot) tooltipText += `<br><span style="color: #c62828; font-weight: 600;">🔥 HOTSPOT</span>`;
            if (isColdspot) tooltipText += `<br><span style="color: #1565c0; font-weight: 600;">❄️ COLDSPOT</span>`;
            
            marker.bindTooltip(tooltipText, {
                permanent: false,
                direction: 'top',
                className: 'custom-tooltip',
                offset: [0, -10]
            });
            
            const popupContent = `
                <div style="min-width: 220px; padding: 5px;">
                    <div style="font-weight: 600; color: #1a237e; font-size: 14px; margin-bottom: 5px;">
                        ${item['NAMA KANTOR'] || 'Fasilitas'}
                    </div>
                    <hr style="margin: 5px 0;">
                    <table style="font-size: 12px; width: 100%;">
                        <tr><td><b>Paket:</b></td><td>${item['Paket'] || '-'}</td></tr>
                        <tr><td><b>Regional:</b></td><td>${item['REGIONAL'] || '-'}</td></tr>
                        <tr><td><b>Provinsi:</b></td><td>${item['PROVINSI'] || '-'}</td></tr>
                        ${density > 0 ? `<tr><td><b>Kepadatan:</b></td><td>${density} titik</td></tr>` : ''}
                        ${isHotspot ? `<tr><td colspan="2" style="color: #c62828; font-weight: 600;">🔥 HOTSPOT</td></tr>` : ''}
                        ${isColdspot ? `<tr><td colspan="2" style="color: #1565c0; font-weight: 600;">❄️ COLDSPOT</td></tr>` : ''}
                    </table>
                </div>
            `;
            
            marker.bindPopup(popupContent, { className: 'custom-popup', maxWidth: 300 });
            markerLayer.addLayer(marker);
        });
        
        markerLayer.addTo(map);
    }
    
    function removeMarkers() {
        if (markerLayer) {
            try { map.removeLayer(markerLayer); } catch(e) {}
            markerLayer = null;
        }
    }
    
    function showHotspots(data, options = {}) {
        if (!map) return;
        removeHotspots();
        if (!data || data.length === 0) return;
        
        const filteredData = data.filter(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            return isInIndonesia(lat, lng);
        });
        
        if (filteredData.length === 0) return;
        
        const defaultOptions = {
            radius: 10,
            fillColor: '#c62828',
            color: '#ff1744',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        hotspotLayer = L.layerGroup();
        const totalData = filteredData.length;
        
        filteredData.forEach((item, index) => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
            
            const density = item.density || 0;
            const percent = totalData > 0 ? (1 / totalData * 100).toFixed(1) : 0;
            
            const marker = L.circleMarker([lat, lng], {
                radius: finalOptions.radius,
                fillColor: finalOptions.fillColor,
                color: finalOptions.color,
                weight: finalOptions.weight,
                opacity: finalOptions.opacity,
                fillOpacity: finalOptions.fillOpacity
            });
            
            marker.bindPopup(`
                <div style="min-width: 200px; padding: 5px;">
                    <div style="color: #c62828; font-weight: 700; font-size: 16px;">🔥 HOTSPOT</div>
                    <hr style="margin: 5px 0;">
                    <div style="font-weight: 600; font-size: 14px;">${item['NAMA KANTOR'] || 'Fasilitas'}</div>
                    <table style="font-size: 12px; margin-top: 5px; width: 100%;">
                        <tr><td><b>Regional:</b></td><td>${item['REGIONAL'] || '-'}</td></tr>
                        <tr><td><b>Provinsi:</b></td><td>${item['PROVINSI'] || '-'}</td></tr>
                        <tr><td><b>Kepadatan:</b></td><td>${density} titik</td></tr>
                        <tr><td><b>Persentase:</b></td><td>${percent}% dari hotspot</td></tr>
                    </table>
                </div>
            `, { className: 'custom-popup' });
            
            const tooltipText = `
                <div style="text-align: center;">
                    <strong style="color: #c62828;">🔥 HOTSPOT</strong><br>
                    ${item['NAMA KANTOR'] || 'Fasilitas'}<br>
                    <span style="font-size: 14px; font-weight: 600;">Kepadatan: ${density} titik</span><br>
                    <span style="font-size: 12px; color: #666;">${percent}% dari total hotspot</span>
                </div>
            `;
            
            marker.bindTooltip(tooltipText, {
                permanent: false,
                direction: 'top',
                className: 'custom-tooltip hotspot-tooltip',
                offset: [0, -15]
            });
            
            // Pulse animation
            setTimeout(() => {
                const el = marker.getElement ? marker.getElement() : null;
                if (el) {
                    el.style.animation = `hotspot-pulse 1.5s ease-in-out infinite`;
                    el.style.animationDelay = `${(index * 0.1) % 1}s`;
                }
            }, 100);
            
            hotspotLayer.addLayer(marker);
        });
        
        hotspotLayer.addTo(map);
    }
    
    function removeHotspots() {
        if (hotspotLayer) {
            try { map.removeLayer(hotspotLayer); } catch(e) {}
            hotspotLayer = null;
        }
    }
    
    function showColdspots(data, options = {}) {
        if (!map) return;
        removeColdspots();
        if (!data || data.length === 0) return;
        
        const filteredData = data.filter(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            return isInIndonesia(lat, lng);
        });
        
        if (filteredData.length === 0) return;
        
        const defaultOptions = {
            radius: 10,
            fillColor: '#1565c0',
            color: '#448aff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        const totalData = filteredData.length;
        
        coldspotLayer = L.layerGroup();
        
        filteredData.forEach((item) => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
            
            const density = item.density || 0;
            const percent = totalData > 0 ? (1 / totalData * 100).toFixed(1) : 0;
            
            const marker = L.circleMarker([lat, lng], {
                radius: finalOptions.radius,
                fillColor: finalOptions.fillColor,
                color: finalOptions.color,
                weight: finalOptions.weight,
                opacity: finalOptions.opacity,
                fillOpacity: finalOptions.fillOpacity
            });
            
            marker.bindPopup(`
                <div style="min-width: 200px; padding: 5px;">
                    <div style="color: #1565c0; font-weight: 700; font-size: 16px;">❄️ COLDSPOT</div>
                    <hr style="margin: 5px 0;">
                    <div style="font-weight: 600; font-size: 14px;">${item['NAMA KANTOR'] || 'Fasilitas'}</div>
                    <table style="font-size: 12px; margin-top: 5px; width: 100%;">
                        <tr><td><b>Regional:</b></td><td>${item['REGIONAL'] || '-'}</td></tr>
                        <tr><td><b>Provinsi:</b></td><td>${item['PROVINSI'] || '-'}</td></tr>
                        <tr><td><b>Kepadatan:</b></td><td>${density} titik</td></tr>
                        <tr><td><b>Persentase:</b></td><td>${percent}% dari coldspot</td></tr>
                    </table>
                </div>
            `, { className: 'custom-popup' });
            
            const tooltipText = `
                <div style="text-align: center;">
                    <strong style="color: #1565c0;">❄️ COLDSPOT</strong><br>
                    ${item['NAMA KANTOR'] || 'Fasilitas'}<br>
                    <span style="font-size: 14px; font-weight: 600;">Kepadatan: ${density} titik</span><br>
                    <span style="font-size: 12px; color: #666;">${percent}% dari total coldspot</span>
                </div>
            `;
            
            marker.bindTooltip(tooltipText, {
                permanent: false,
                direction: 'top',
                className: 'custom-tooltip coldspot-tooltip',
                offset: [0, -15]
            });
            
            coldspotLayer.addLayer(marker);
        });
        
        coldspotLayer.addTo(map);
    }
    
    function removeColdspots() {
        if (coldspotLayer) {
            try { map.removeLayer(coldspotLayer); } catch(e) {}
            coldspotLayer = null;
        }
    }
    
    function clearLayers() {
        removeHeatmap();
        removeMarkers();
        removeHotspots();
        removeColdspots();
    }
    
    function fitToData(data, options = {}) {
        if (!map) return;
        
        if (!data || data.length === 0) {
            map.setView([-2.5, 118.0], 5);
            return;
        }
        
        const bounds = data.map(item => {
            const lat = item.lat || item.LATITUDE;
            const lng = item.lng || item.LONGITUDE;
            return [lat, lng];
        }).filter(([lat, lng]) => lat && lng && !isNaN(lat) && !isNaN(lng) && isInIndonesia(lat, lng));
        
        if (bounds.length > 0) {
            try {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12, ...options });
            } catch(e) {
                map.setView([-2.5, 118.0], 5);
            }
        } else {
            map.setView([-2.5, 118.0], 5);
        }
    }
    
    function resetView() {
        if (!map) return;
        map.setView([-2.5, 118.0], 5);
        clearLayers();
    }
    
    function getBounds() {
        if (!map) return null;
        return map.getBounds();
    }
    
    return {
        init: init,
        getMap: getMap,
        isInIndonesia: isInIndonesia,
        showHeatmap: showHeatmap,
        removeHeatmap: removeHeatmap,
        showMarkers: showMarkers,
        removeMarkers: removeMarkers,
        showHotspots: showHotspots,
        removeHotspots: removeHotspots,
        showColdspots: showColdspots,
        removeColdspots: removeColdspots,
        clearLayers: clearLayers,
        fitToData: fitToData,
        resetView: resetView,
        getBounds: getBounds
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapController;
}
