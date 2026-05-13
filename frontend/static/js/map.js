/**
 * map.js
 * Interactive, theme-aware Service Coverage Map for SkillBridge Contact Page
 * Uses Leaflet.js with OpenStreetMap / CartoDB tile layers.
 */

document.addEventListener('DOMContentLoaded', () => {

    const mapEl = document.getElementById('coverage-map');
    if (!mapEl || typeof L === 'undefined') return;

    // ── Service professionals data ─────────────────────────────────────────
    const professionals = [
        { lat: 33.5651, lng: 73.0169, type: '🔧', category: 'Mechanic',      count: 14, area: 'Saddar, Rawalpindi'      },
        { lat: 33.5937, lng: 73.0479, type: '⚡', category: 'Electrician',   count: 9,  area: 'Bahria Town, Rawalpindi' },
        { lat: 33.5479, lng: 73.1215, type: '💧', category: 'Plumber',       count: 11, area: 'Chakra, Rawalpindi'      },
        { lat: 33.6844, lng: 73.0479, type: '🪵', category: 'Carpenter',     count: 7,  area: 'F-10, Islamabad'         },
        { lat: 33.7215, lng: 73.0550, type: '🎨', category: 'Painter',       count: 6,  area: 'F-7, Islamabad'          },
        { lat: 33.6295, lng: 73.0839, type: '❄️', category: 'AC Technician', count: 12, area: 'G-11, Islamabad'         },
        { lat: 33.5800, lng: 73.0800, type: '🏠', category: 'Home Repair',   count: 18, area: 'Rawalpindi Cantt'        },
        { lat: 33.6400, lng: 73.1200, type: '🔧', category: 'Mechanic',      count: 8,  area: 'I-8, Islamabad'          },
        { lat: 33.7010, lng: 73.1340, type: '💧', category: 'Plumber',       count: 5,  area: 'E-11, Islamabad'         },
        { lat: 33.6700, lng: 72.9800, type: '⚡', category: 'Electrician',   count: 10, area: 'Tarnol, Islamabad'       },
    ];

    // ── Tile Layers — use OSM as reliable base ─────────────────────────────
    const lightLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }
    );

    const darkLayer = L.tileLayer(
        'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
        { attribution: '&copy; <a href="https://stamen.com">Stamen Design</a>', maxZoom: 18 }
    );

    // Fallback dark layer using CartoDB (no auth required)
    const darkLayerFallback = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        { subdomains: 'abcd', attribution: '&copy; CartoDB', maxZoom: 19 }
    );

    // ── Initialize Map ─────────────────────────────────────────────────────
    const map = L.map('coverage-map', {
        center: [33.6250, 73.0749],
        zoom: 12,
        scrollWheelZoom: false,
    });

    // Pick initial tile layer based on saved theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const initialLayer = isDark ? darkLayerFallback : lightLayer;
    initialLayer.addTo(map);
    let currentActiveLayer = initialLayer;

    // ── Custom Marker Factory ──────────────────────────────────────────────
    function makeIcon(emoji) {
        return L.divIcon({
            className: '',
            html: `<div class="sb-map-marker"><span class="sb-marker-emoji">${emoji}</span><div class="sb-marker-pulse"></div></div>`,
            iconSize:   [44, 44],
            iconAnchor: [22, 22],
            popupAnchor:[0, -26]
        });
    }

    const hqIcon = L.divIcon({
        className: '',
        html: `<div class="sb-map-hq">🏢</div>`,
        iconSize:   [52, 52],
        iconAnchor: [26, 26],
        popupAnchor:[0, -30]
    });

    // ── Add Markers ────────────────────────────────────────────────────────
    professionals.forEach(pro => {
        L.marker([pro.lat, pro.lng], { icon: makeIcon(pro.type) })
            .bindPopup(`
                <div class="sb-map-popup">
                    <div class="sb-popup-header">${pro.type} <strong>${pro.category}</strong></div>
                    <div class="sb-popup-body">
                        <div class="sb-popup-count"><strong>${pro.count}</strong>&nbsp;professionals active</div>
                        <div class="sb-popup-area">📍 ${pro.area}</div>
                        <a href="listing.html" class="sb-popup-cta">View Available Pros →</a>
                    </div>
                </div>`, { maxWidth: 230 })
            .addTo(map);
    });

    // HQ pin
    L.marker([33.5651, 73.0169], { icon: hqIcon })
        .bindPopup(`
            <div class="sb-map-popup">
                <div class="sb-popup-header">🏢 <strong>SkillBridge HQ</strong></div>
                <div class="sb-popup-body">
                    <div class="sb-popup-area">📍 Saddar, Rawalpindi, Pakistan</div>
                    <div class="sb-popup-area">📞 +92 300 1234567</div>
                    <div class="sb-popup-area">📧 support@skillbridge.com</div>
                </div>
            </div>`, { maxWidth: 240 })
        .addTo(map);

    // ── React to Dark/Light Toggle ─────────────────────────────────────────
    document.addEventListener('themeChanged', (e) => {
        const newTheme = e.detail.theme;
        map.removeLayer(currentActiveLayer);
        currentActiveLayer = newTheme === 'dark' ? darkLayerFallback : lightLayer;
        currentActiveLayer.addTo(map);
    });
});
