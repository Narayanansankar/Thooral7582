document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const loadingOverlay = document.getElementById('loading-overlay');
    const lastUpdatedContainer = document.getElementById('last-updated-container');
    const refreshButton = document.getElementById('refresh-data-btn');
    const exportButton = document.getElementById('export-map-btn');
    const map = L.map('map', { attributionControl: false, preferCanvas: true }).setView([8.78, 78.13], 10);
    // map.setMaxBounds([[8.3, 77.7], [9.3, 78.4]]);
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { minZoom: 9, crossOrigin: true });
    const googleSatellite = L.gridLayer.googleMutant({ type: 'satellite', maxZoom: 20 });
    const googleRoadmap = L.gridLayer.googleMutant({ type: 'roadmap', maxZoom: 20 });


    osm.addTo(map);


    const policeMapImageUrl = '/static/images/police_district_map.jpg';
    const policeMapImageBounds = [[8.321394944, 77.665043156], [9.378570475, 78.399076760]];
    const policeMapOverlay = L.imageOverlay(policeMapImageUrl, policeMapImageBounds, { opacity: 0.7, interactive: true });

    const baseMaps = { "Normal Map": osm, "Google Satellite": googleSatellite, "Google Maps": googleRoadmap };
    const overlayMaps = { "Police District Map": policeMapOverlay };
    L.control.layers(baseMaps, overlayMaps).addTo(map);


    const SUBDIVISION_CENTERS = { 'Kovilpatti': { lat: 9.175, lon: 77.875, zoom: 12 }, 'Maniyachi': { lat: 8.95, lon: 77.98, zoom: 11 }, 'Sathankulam': { lat: 8.45, lon: 77.93, zoom: 12 }, 'Srivaikundam': { lat: 8.63, lon: 77.91, zoom: 12 }, 'Tiruchendur': { lat: 8.50, lon: 78.12, zoom: 12 }, 'Thoothukudi Rural': { lat: 8.75, lon: 78.05, zoom: 11 }, 'Thoothukudi Town': { lat: 8.79, lon: 78.15, zoom: 13 }, 'Vilathikulam': { lat: 9.13, lon: 78.16, zoom: 11 } };
    const crimeStyles = {
        'Fighting / Threatening': { fillColor: "#E53E3E", color: "#9B2C2C" }, 'Family Dispute': { fillColor: "#ED8936", color: "#9C4221" },
        'Road Accident': { fillColor: "#4A5568", color: "#1A202C" }, 'Fire Accident': { fillColor: "#DD6B20", color: "#9C4221" },
        'Woman & Child Related': { fillColor: "#D53F8C", color: "#8D244D" }, 'Theft / Robbery': { fillColor: "#718096", color: "#2D3748" },
        'Prohibition Related': { fillColor: "#805AD5", color: "#44337A" }, 'Civil Dispute': { fillColor: "#3182CE", color: "#2A4365" },
        'Complaint Against Police': { fillColor: '#F6E05E', color: '#B7791F' }, // Example color
        '2. Robbery': { fillColor: "#C53030", color: "#742A2A" }, '3. HBD': { fillColor: "#975A16", color: "#5F370E" }, '4. HBN': { fillColor: "#B7791F", color: "#744210" },
        '5. Theft-A': { fillColor: "#718096", color: "#2D3748" }, '6. Theft-C': { fillColor: "#A0AEC0", color: "#4A5568" }, '7. Snatching (BNS)': { fillColor: "#D53F8C", color: "#8D244D" },
        'default': { fillColor: "#A0AEC0", color: "#4A5568" }
    };


    let currentSheet = '100_calls_new';
    let currentSheetData = {};
    let pointLayerGroup = L.layerGroup().addTo(map);
    let heatLayer = null, clusterLayerGroup = null;
    let highlightLayer = L.geoJSON(null, { style: { weight: 4, color: '#FFC107', opacity: 1, fillOpacity: 0.2 } }).addTo(map);

    initializeApp();

    async function initializeApp() {
        applyTheme();
        setupGeneralEventListeners();
        await loadAllBoundaries();
        await switchDataset(currentSheet);
    }

    function showLoading(isloading) {
        loadingOverlay.style.display = isloading ? 'flex' : 'none';
    }

    async function switchDataset(sheetName) {
        currentSheet = sheetName;
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.sheet === sheetName));
        resetFilters(false);
        if (sheetName === 'CCTV') {
            if (!map.hasLayer(googleSatellite)) { map.addLayer(googleSatellite); }
            if (map.hasLayer(osm)) { map.removeLayer(osm); }
        } else {
            if (!map.hasLayer(osm)) { map.addLayer(osm); }
            if (map.hasLayer(googleSatellite)) { map.removeLayer(googleSatellite); }
        }
        showLoading(true);
        try {
            const response = await fetch(`/api/data/${sheetName}`);
            if (!response.ok) throw new Error(`API error ${response.status}: ${response.statusText}`);
            const sheetData = await response.json();
            if (sheetData.error) throw new Error(sheetData.error);

            currentSheetData = sheetData;
            renderUIForCurrentSheet();
            updateMap();
            const now = new Date();
            lastUpdatedContainer.innerHTML = `<span>Updated: ${now.toLocaleTimeString()}</span>`;
        } catch (error) {
            console.error(`Failed to refresh data for ${sheetName}:`, error);
            currentSheetData = {};
            alert(`Could not load data for ${sheetName}. Check console for details.`);
            lastUpdatedContainer.innerHTML = `<span class="error">Update failed</span>`;
            clearAllLayers(); renderUIForCurrentSheet(); displayAnalytics([]);
        } finally {
            showLoading(false);
        }
    }

    function renderUIForCurrentSheet() {
        const filters = currentSheetData.filters || {};
        const hasSubdivisions = filters.subdivisions && filters.subdivisions.length > 0;
        document.getElementById('crime-type-section').style.display = (filters.event_types || filters.crime_types) ? 'block' : 'none';
        document.getElementById('date-range-section').style.display = (filters.date_range) ? 'block' : 'none';
        document.getElementById('subdivision-list-section').style.display = hasSubdivisions ? 'block' : 'none';
        document.getElementById('sub-category-section').style.display = (currentSheet === 'Hurt' || currentSheet === 'POCSO') ? 'block' : 'none';

        if (filters.event_types || filters.crime_types) {
            const header = (currentSheet === 'Robbrey-theft') ? 'Type' : 'Crime Type';
            populateCrimeTypeButtons(filters.event_types || filters.crime_types, header);
        }
        if (filters.date_range) {
            const [min, max] = filters.date_range;
            document.getElementById('fromDate').value = ''; document.getElementById('toDate').value = '';
            document.getElementById('fromDate').setAttribute('min', min); document.getElementById('toDate').setAttribute('max', max);
        }
        if (hasSubdivisions) {
            document.getElementById('subdivision-list-section').querySelector('h4').textContent = "Subdivision (List)";
            populateSubdivisionList(filters.subdivisions);
        }
        const subCategorySection = document.getElementById('sub-category-section');
        if (currentSheet === 'Hurt' || currentSheet === 'POCSO') {
            let content = `<h4>Sub-Category</h4><div class="sub-cat-filters">`;
            if (currentSheet === 'Hurt') content += `<label><input type="checkbox" class="sub-category-filter" value="Simple" checked> Simple</label><label><input type="checkbox" class="sub-category-filter" value="Grievous" checked> Grievous</label>`;
            if (currentSheet === 'POCSO') content += `<label><input type="checkbox" class="sub-category-filter" value="Real" checked> Real</label><label><input type="checkbox" class="sub-category-filter" value="Elopement" checked> Elopement</label>`;
            content += `</div>`;
            subCategorySection.innerHTML = content;
            document.querySelectorAll('.sub-category-filter').forEach(el => el.addEventListener('change', updateMap));
        } else { subCategorySection.innerHTML = ''; }
    }

    function applyFilters() {
        if (!currentSheetData || !currentSheetData.data) return [];
        let dataToFilter = [...currentSheetData.data];
        const filters = currentSheetData.filters || {};
        const activeListItems = document.querySelectorAll('.subdivision-list-item.active');
        if (activeListItems.length > 0) {
            const selectedValues = Array.from(activeListItems).map(item => item.dataset.value);
            const key = 'Subdivision';
            dataToFilter = dataToFilter.filter(item => selectedValues.includes(item[key]));
        }
        if (filters.event_types || filters.crime_types) {
            const activeCrimeBtn = document.querySelector('#crime-buttons-container .filter-btn.active');
            if (activeCrimeBtn && activeCrimeBtn.dataset.crime !== 'All') {
                const crimeKey = currentSheet === 'Robbrey-theft' ? 'CrimeType' : 'EventType';
                dataToFilter = dataToFilter.filter(item => item[crimeKey] === activeCrimeBtn.dataset.crime);
            }
        }
        if (filters.date_range) {
            const fromDateStr = document.getElementById('fromDate').value, toDateStr = document.getElementById('toDate').value;
            if (fromDateStr) dataToFilter = dataToFilter.filter(item => item.Date >= fromDateStr);
            if (toDateStr) dataToFilter = dataToFilter.filter(item => item.Date <= toDateStr);
        }
        if (currentSheet === 'Hurt' || currentSheet === 'POCSO') {
            const selectedSubCats = Array.from(document.querySelectorAll('.sub-category-filter:checked')).map(cb => cb.value);
            if (selectedSubCats.length > 0) {
                dataToFilter = dataToFilter.filter(item => selectedSubCats.includes(item.SubCategory));
            } else {
                dataToFilter = [];
            }
        }
        return dataToFilter;
    }

    function setupGeneralEventListeners() {
        themeToggle.addEventListener('click', () => { body.classList.toggle('dark-mode'); localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light'); applyTheme(); });
        document.querySelector('.tab-switcher').addEventListener('click', e => { if (e.target.classList.contains('tab-button') && !e.target.classList.contains('active')) switchDataset(e.target.dataset.sheet); });
        refreshButton.addEventListener('click', () => switchDataset(currentSheet));
        exportButton.addEventListener('click', () => {
            showLoading(true);
            leafletImage(map, (err, canvas) => {
                showLoading(false);
                if (err) {
                    alert('Could not export map. This can happen with complex layers. Please try again or see console for details.');
                    console.error(err);
                    return;
                }
                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = `crime_map_export_${new Date().toISOString().slice(0, 10)}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        });
        document.getElementById('crime-buttons-container').addEventListener('click', e => { if (e.target.classList.contains('filter-btn')) { document.querySelector('#crime-buttons-container .filter-btn.active')?.classList.remove('active'); e.target.classList.add('active'); updateMap(); } });

        document.getElementById('subdivision-list-container').addEventListener('click', e => {
            const item = e.target.closest('.subdivision-list-item');
            if (item) {
                item.classList.toggle('active');
                const activeItems = document.querySelectorAll('.subdivision-list-item.active');
                const selectedNames = Array.from(activeItems).map(i => i.dataset.value);
                if (item.classList.contains('active') && activeItems.length === 1) {
                    const sdoName = item.dataset.value;
                    if (SUBDIVISION_CENTERS[sdoName]) {
                        map.flyTo([SUBDIVISION_CENTERS[sdoName].lat, SUBDIVISION_CENTERS[sdoName].lon], SUBDIVISION_CENTERS[sdoName].zoom);
                    }
                }
                highlightSubdivision(selectedNames);
                updateMap();
            }
        });

        document.querySelectorAll('input[name="mapView"]').forEach(el => el.addEventListener('change', updateMap));
        document.getElementById('fromDate').addEventListener('change', updateMap);
        document.getElementById('toDate').addEventListener('change', updateMap);
        document.getElementById('heatmap-radius').addEventListener('input', e => { document.getElementById('radius-value').textContent = e.target.value; if (heatLayer) heatLayer.setOptions({ radius: e.target.value, blur: e.target.value / 2 }); });
        document.getElementById('resetFilters').addEventListener('click', () => resetFilters(true));
        map.on('zoomend', () => { const show = map.getZoom() <= 11; document.querySelectorAll('.boundary-label').forEach(l => l.style.opacity = show ? 1 : 0); });
    }

    function resetFilters(triggerUpdate = true) {
        document.querySelectorAll('.subdivision-list-item.active').forEach(item => item.classList.remove('active'));
        const crimeContainer = document.getElementById('crime-buttons-container');
        if (crimeContainer.children.length > 1) {
            crimeContainer.querySelector('.filter-btn.active')?.classList.remove('active');
            crimeContainer.querySelector('.filter-btn[data-crime="All"]').classList.add('active');
        }
        document.querySelectorAll('.sub-category-filter').forEach(cb => cb.checked = true);
        document.getElementById('fromDate').value = ''; document.getElementById('toDate').value = '';
        document.querySelector('input[name="mapView"][value="point"]').checked = true;
        highlightLayer.clearLayers();
        if (triggerUpdate) {
            // map.setView([8.78, 78.13], 10);
            updateMap();
        }
    }

    function populateSubdivisionList(options) {
        document.getElementById('subdivision-list-container').innerHTML = options.map(opt => `<div class="subdivision-list-item" data-value="${opt}">${opt}</div>`).join('');
    }

    async function loadAllBoundaries() {
        try {
            const response = await fetch(`/static/geojson/THOOTHUKUDI-POLICE-MAP-OUTLINE.geojson`);
            if (!response.ok) throw new Error(`Status ${response.status}: Failed to fetch main boundary file.`);
            const geojsonData = await response.json();
            const style = { fill: false, weight: 1.5, opacity: 0.8, color: '#333333', dashArray: '5, 5' };
            L.geoJSON(geojsonData, { style }).addTo(map);
            geojsonData.features.forEach(feature => {
                const name = feature.properties.SD_NAME;
                if (name) {
                    const center = L.geoJSON(feature).getBounds().getCenter();
                    L.tooltip({ permanent: true, direction: 'center', className: 'boundary-label' }).setContent(name).setLatLng(center).addTo(map);
                }
            });
        } catch (error) {
            console.error(`CRITICAL: Could not load main boundary file. Error: ${error}`);
            alert('Warning: Could not load the main district boundary map.');
        }
    }

    async function highlightSubdivision(sdoNames) {
        highlightLayer.clearLayers();
        if (!sdoNames || sdoNames.length === 0) return;
        const names = Array.isArray(sdoNames) ? sdoNames : [sdoNames];
        for (const name of names) {
            const filename = name.toLowerCase().replace(/\s+/g, '') + '.geojson';
            try {
                const response = await fetch(`/static/geojson/${filename}`);
                if (!response.ok) throw new Error(`File not found`);
                const geojsonData = await response.json();
                highlightLayer.addData(geojsonData);
            } catch (error) { console.warn(`Could not load boundary for ${name}`); }
        }
    }

    function updateMap() {
        clearAllLayers();
        const filteredData = applyFilters();
        displayAnalytics(filteredData);
        const mapView = document.querySelector('input[name="mapView"]:checked').value;
        document.getElementById('heatmap-options').style.display = mapView === 'heat' ? 'block' : 'none';
        if (mapView === 'point') drawPointMap(filteredData);
        else if (mapView === 'cluster') drawClusterMap(filteredData);
        else if (mapView === 'heat') drawHeatMap(filteredData);

        if (filteredData.length > 0) {
            const bounds = L.latLngBounds(filteredData.map(d => [d.Latitude, d.Longitude]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    function getStyleForItem(item) {
        if (currentSheet === 'CCTV') {
            return { icon: L.divIcon({ className: 'cctv-icon', iconSize: [16, 16] }) };
        }
        const style = { radius: 6, weight: 1.5, fillOpacity: 1 };
        let colors;
        switch (currentSheet) {
            case 'Hurt': colors = item.SubCategory === 'Grievous' ? { fillColor: "#b30000", color: "#660000" } : { fillColor: "#e67300", color: "#804000" }; break;
            case 'POCSO': colors = item.SubCategory === 'Elopement' ? { fillColor: "#3182CE", color: "#2C5282" } : { fillColor: "#D53F8C", color: "#8D244D" }; break;
            default:
                const key = currentSheet === 'Robbrey-theft' ? item.CrimeType : item.EventType;
                colors = crimeStyles[key] || crimeStyles['default'];
                break;
        }
        return { ...style, ...colors };
    }

    function createPopupContent(item) {
        const [TAB_100_CALLS, TAB_ROBBERY_THEFT, TAB_HURT, TAB_POCSO, TAB_CCTV] = ["100_calls_new", "Robbrey-theft", "Hurt", "POCSO", "CCTV"];
        switch (currentSheet) {
            case TAB_100_CALLS: return `<strong>Event:</strong> ${item.EventType || 'N/A'}<br><strong>Subdivision:</strong> ${item.Subdivision || 'N/A'}<br><strong>PS:</strong> ${item.PoliceStation || 'N/A'}<br><strong>Date:</strong> ${item.Date || 'N/A'}`;
            case TAB_ROBBERY_THEFT: return `<strong>Type:</strong> ${item.CrimeType || 'N/A'}<br><strong>Station:</strong> ${item.Station || 'N/A'}<br><strong>Subdivision:</strong> ${item.Subdivision || 'N/A'}<br><strong>Date:</strong> ${item.Date || 'N/A'}`;
            case TAB_HURT: return `<b>${item.SubCategory} Hurt</b><br><b>Subdivision:</b> ${item.Subdivision || 'N/A'}<br><b>Station:</b> ${item.Station || 'N/A'}`;
            case TAB_POCSO: return `<b>POCSO (${item.SubCategory})</b><br><b>Subdivision:</b> ${item.Subdivision || 'N/A'}<br>${item.PS_Limit || 'N/A'}`;
            case TAB_CCTV: return `<b>${item.Place_Name || 'N/A'} (${item.Subdivision || 'N/A'})</b><br>Status: ${item.Status || 'N/A'}`;
            default: return 'No details available.';
        }
    }

    function drawPointMap(data) {
        data.forEach(item => {
            const options = getStyleForItem(item);
            const marker = options.icon ? L.marker([item.Latitude, item.Longitude], options) : L.circleMarker([item.Latitude, item.Longitude], options);
            marker.bindPopup(createPopupContent(item)).addTo(pointLayerGroup);
        });
    }

    function drawClusterMap(data) {
        clusterLayerGroup = L.markerClusterGroup();
        data.forEach(item => {
            const options = getStyleForItem(item);
            const marker = options.icon ? L.marker([item.Latitude, item.Longitude], options) : L.circleMarker([item.Latitude, item.Longitude], options);
            marker.bindPopup(createPopupContent(item));
            clusterLayerGroup.addLayer(marker);
        });
        map.addLayer(clusterLayerGroup);
    }

    function drawHeatMap(data) { if (data.length === 0) return; const radius = document.getElementById('heatmap-radius').value; heatLayer = L.heatLayer(data.map(item => [item.Latitude, item.Longitude, 0.5]), { radius, blur: radius / 2, maxZoom: 18 }).addTo(map); }
    function clearAllLayers() { pointLayerGroup.clearLayers(); if (heatLayer) map.removeLayer(heatLayer); if (clusterLayerGroup) map.removeLayer(clusterLayerGroup); heatLayer = clusterLayerGroup = null; }

    // FIX: This function is now updated to add background colors to the buttons.
    function populateCrimeTypeButtons(types, header) {
        document.getElementById('crime-type-section').querySelector('h4').textContent = header;

        const buttonsHtml = types.map(type => {
            const styleInfo = crimeStyles[type] || crimeStyles['default'];
            const backgroundColor = styleInfo.fillColor;
            const borderColor = styleInfo.color;

            // Determine text color based on background lightness for better readability
            // This is a simple algorithm, more complex ones exist
            const hex = backgroundColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const textColor = luminance > 0.5 ? '#000' : '#fff';

            const styleAttribute = `style="background-color: ${backgroundColor}; border: 1px solid ${borderColor}; color: ${textColor};"`;

            return `<button class="filter-btn" data-crime="${type}" ${styleAttribute}>${type || 'N/A'}</button>`;
        }).join('');

        document.getElementById('crime-buttons-container').innerHTML = `<button class="filter-btn active" data-crime="All">All</button>${buttonsHtml}`;
    }

    function applyTheme() {
        const themeIcon = themeToggle.querySelector('i');
        if (localStorage.getItem('theme') === 'dark' || body.classList.contains('dark-mode')) {
            body.classList.add('dark-mode');
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        } else {
            body.classList.remove('dark-mode');
            themeIcon.classList.replace('fa-sun', 'fa-moon');
        }
    }

    function displayAnalytics(filteredData) {
        const container = document.getElementById('analytics-container');
        if (filteredData.length === 0) {
            container.innerHTML = '<p>No data to display.</p>'; return;
        }
        const countBy = (key) => filteredData.reduce((acc, item) => {
            const itemKey = item[key] || "Unknown";
            acc[itemKey] = (acc[itemKey] || 0) + 1;
            return acc;
        }, {});
        const topThree = (counts) => Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 3).map(([name, count]) => `<li>${name}: <strong>${count}</strong></li>`).join('');

        let crimeTypeKey, locationKey;
        if (currentSheet === 'Robbrey-theft') {
            crimeTypeKey = 'CrimeType';
            locationKey = 'Subdivision';
        } else if (currentSheet === 'Hurt' || currentSheet === 'POCSO') {
            crimeTypeKey = 'SubCategory';
            locationKey = 'Subdivision';
        } else {
            crimeTypeKey = 'EventType';
            locationKey = 'Subdivision';
        }

        const crimeCounts = countBy(crimeTypeKey);
        const locationCounts = countBy(locationKey);
        let html = `
            <p><strong>Total Cases in View:</strong> ${filteredData.length}</p>
            ${Object.keys(crimeCounts).length > 1 && crimeTypeKey ? `<h4>Top Types:</h4><ul>${topThree(crimeCounts)}</ul>` : ''}
            ${Object.keys(locationCounts).length > 1 ? `<h4>Top Locations:</h4><ul>${topThree(locationCounts)}</ul>` : ''}
        `;
        container.innerHTML = html;
    }
});