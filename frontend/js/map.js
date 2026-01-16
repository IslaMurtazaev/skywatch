/**
 * Main Map Application - Initializes map and orchestrates all layers
 */

// Global variables
let map;
let forecastData;
let pm25Layer;
let windLayer;
let precipLayer;
let temperatureLayer;
let pollutionSourcesLayer;
let timeController;

/**
 * Initialize the application
 */
async function init() {
    try {
        // Show loading overlay
        showLoading(true);

        // Initialize map
        initMap();

        // Load forecast data
        forecastData = await loadForecastData();

        // Initialize layers
        pm25Layer = new PM25Layer(map);
        windLayer = new WindLayer(map);
        precipLayer = new PrecipLayer(map);
        temperatureLayer = new TemperatureLayer(map);
        pollutionSourcesLayer = new PollutionSourcesLayer(map);

        // Initialize time controller
        timeController = new TimeController(forecastData.timesteps, onTimeChange);

        // Setup layer toggles
        setupLayerToggles();

        // Render initial timestep
        renderTimestep(0);

        // Render pollution sources (fires and power plants)
        renderPollutionSources();

        // Hide loading overlay
        showLoading(false);

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showError(`Failed to load forecast data: ${error.message}`);
        showLoading(false);
    }
}

/**
 * Initialize Leaflet map
 */
function initMap() {
    // Create map centered on global view
    map = L.map('map', {
        center: [20, 0],
        zoom: 3,
        minZoom: 2,
        maxZoom: 15
    });

    // Add CartoDB Voyager tiles (better label visibility under overlays)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    console.log('Map initialized');
}

/**
 * Load forecast data from JSON file
 * @returns {Promise<Object>} Forecast data
 */
async function loadForecastData() {
    // Try multiple paths for compatibility
    const paths = [
        '../output/forecast_data.json',
        './output/forecast_data.json',
        'output/forecast_data.json'
    ];

    for (const path of paths) {
        try {
            console.log(`Attempting to load data from: ${path}`);
            const response = await fetch(path);

            if (!response.ok) {
                continue; // Try next path
            }

            const data = await response.json();
            console.log('Data loaded successfully from:', path);
            console.log('Timesteps:', data.metadata.num_timesteps);
            return data;
        } catch (error) {
            console.warn(`Failed to load from ${path}:`, error.message);
        }
    }

    throw new Error('Could not load forecast data. Please run: python backend/main.py');
}

/**
 * Handle timestep change
 * @param {number} index - Timestep index
 */
function onTimeChange(index) {
    renderTimestep(index);
}

/**
 * Render a specific timestep
 * @param {number} index - Timestep index
 */
function renderTimestep(index) {
    const timestep = forecastData.timesteps[index];

    console.log(`Rendering timestep ${index}:`, timestep.valid_time);

    // Render PM2.5 layer
    if (document.getElementById('pm25-toggle').checked) {
        pm25Layer.render(timestep.pm25.data);
    } else {
        pm25Layer.clear();
    }

    // Render wind layer
    if (document.getElementById('wind-toggle').checked) {
        windLayer.render(timestep.wind.data);
    } else {
        windLayer.clear();
    }

    // Render precipitation layer
    if (document.getElementById('precip-toggle').checked) {
        precipLayer.render(timestep.precipitation.data);
    } else {
        precipLayer.clear();
    }

    // Render temperature layer
    if (document.getElementById('temperature-toggle').checked) {
        temperatureLayer.render(timestep.temperature.data);
    } else {
        temperatureLayer.clear();
    }

    // Update statistics
    updateStatistics(timestep);
}

/**
 * Update statistics panel
 * @param {Object} timestep - Current timestep data
 */
function updateStatistics(timestep) {
    const statsContent = document.getElementById('stats-content');

    const pm25Stats = timestep.pm25.statistics;
    const windStats = timestep.wind.statistics;
    const precipStats = timestep.precipitation.statistics;
    const temperatureStats = timestep.temperature.statistics;

    statsContent.innerHTML = `
        <p><strong>PM2.5:</strong></p>
        <p>Min: ${pm25Stats.min.toFixed(1)} μg/m³</p>
        <p>Max: ${pm25Stats.max.toFixed(1)} μg/m³</p>
        <p>Avg: ${pm25Stats.mean.toFixed(1)} μg/m³</p>
        <br>
        <p><strong>Wind:</strong></p>
        <p>Min: ${windStats.min_speed.toFixed(1)} m/s</p>
        <p>Max: ${windStats.max_speed.toFixed(1)} m/s</p>
        <p>Avg: ${windStats.mean_speed.toFixed(1)} m/s</p>
        <br>
        <p><strong>Precipitation:</strong></p>
        <p>Max: ${precipStats.max.toFixed(1)} mm</p>
        <p>Total: ${precipStats.total.toFixed(1)} mm</p>
        <br>
        <p><strong>Temperature:</strong></p>
        <p>Min: ${temperatureStats.min.toFixed(1)} °F</p>
        <p>Max: ${temperatureStats.max.toFixed(1)} °F</p>
        <p>Avg: ${temperatureStats.mean.toFixed(1)} °F</p>
    `;
}

/**
 * Render pollution sources layer (fires and power plants)
 */
function renderPollutionSources() {
    if (!forecastData.pollution_sources) {
        console.warn('No pollution sources data available');
        return;
    }

    if (document.getElementById('pollution-sources-toggle').checked) {
        pollutionSourcesLayer.render(forecastData.pollution_sources.sources);
        const meta = forecastData.pollution_sources.metadata;
        console.log(`Loaded ${meta.fire_count} fires and ${meta.power_plant_count} power plants`);
    }
}

/**
 * Setup layer toggle controls
 */
function setupLayerToggles() {
    const pm25Toggle = document.getElementById('pm25-toggle');
    const windToggle = document.getElementById('wind-toggle');
    const precipToggle = document.getElementById('precip-toggle');
    const temperatureToggle = document.getElementById('temperature-toggle');

    pm25Toggle.addEventListener('change', (e) => {
        pm25Layer.setVisibility(e.target.checked);
        if (e.target.checked) {
            renderTimestep(timeController.currentIndex);
        }
    });

    windToggle.addEventListener('change', (e) => {
        windLayer.setVisibility(e.target.checked);
        if (e.target.checked) {
            renderTimestep(timeController.currentIndex);
        }
    });

    precipToggle.addEventListener('change', (e) => {
        precipLayer.setVisibility(e.target.checked);
        if (e.target.checked) {
            renderTimestep(timeController.currentIndex);
        }
    });

    temperatureToggle.addEventListener('change', (e) => {
        temperatureLayer.setVisibility(e.target.checked);
        if (e.target.checked) {
            renderTimestep(timeController.currentIndex);
        }
    });

    const pollutionSourcesToggle = document.getElementById('pollution-sources-toggle');
    pollutionSourcesToggle.addEventListener('change', (e) => {
        pollutionSourcesLayer.setVisibility(e.target.checked);
        if (e.target.checked) {
            renderPollutionSources();
        }
    });

    // Pollution sources view mode radio buttons
    const viewModeRadios = document.querySelectorAll('input[name="pollution-view-mode"]');
    viewModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            pollutionSourcesLayer.setViewMode(e.target.value);
            updatePollutionLegend(e.target.value);
        });
    });
}

/**
 * Update pollution sources legend based on view mode
 * @param {string} mode - 'circles' or 'icons'
 */
function updatePollutionLegend(mode) {
    const legendDiv = document.getElementById('pollution-legend');
    if (!legendDiv) return;

    if (mode === 'icons') {
        // Main power plant icon for legend
        const powerPlantMain = `
            <rect x="2" y="9" width="12" height="13" stroke="#555" stroke-width="1.5" fill="none"/>
            <rect x="4" y="12" width="3" height="3" stroke="#555" stroke-width="1" fill="none"/>
            <rect x="9" y="12" width="3" height="3" stroke="#555" stroke-width="1" fill="none"/>
            <rect x="11" y="2" width="4" height="10" stroke="#555" stroke-width="1.5" fill="none"/>
        `;
        legendDiv.innerHTML = `
            <h4>Pollution Sources</h4>
            <div class="legend-note" style="font-size: 0.9em; margin-bottom: 6px;"><strong>Active Fires</strong></div>
            <div class="legend-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5" style="margin-right: 6px;">
                    <path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/>
                    <path d="M12 12c0 2-1.5 3-1.5 4.5a1.5 1.5 0 0 0 3 0c0-1.5-1.5-2.5-1.5-4.5z"/>
                </svg> Fire
            </div>
            <div class="legend-note" style="font-size: 0.9em; margin: 6px 0;"><strong>Power Plants</strong> (fossil fuel)</div>
            <div class="legend-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="margin-right: 6px;">
                    ${powerPlantMain}
                    <circle cx="19" cy="19" r="4" fill="white" stroke="white" stroke-width="1"/>
                    <path d="M16 19c0-1.5 1.5-3 3-3s3 1.5 3 3-1.5 3-3 3-3-1.5-3-3z" fill="#555"/>
                </svg> Coal
            </div>
            <div class="legend-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="margin-right: 6px;">
                    ${powerPlantMain}
                    <circle cx="19" cy="19" r="4" fill="white" stroke="white" stroke-width="1"/>
                    <path d="M19 14c0 2-2 3-2 5a2 2 0 0 0 4 0c0-2-2-3-2-5z" fill="#555"/>
                </svg> Gas
            </div>
            <div class="legend-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="margin-right: 6px;">
                    ${powerPlantMain}
                    <circle cx="19" cy="19" r="4" fill="white" stroke="white" stroke-width="1"/>
                    <path d="M19 14c0 0-3 3-3 5.5a3 3 0 0 0 6 0c0-2.5-3-5.5-3-5.5z" fill="#555"/>
                </svg> Oil
            </div>
            <div class="legend-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="margin-right: 6px;">
                    ${powerPlantMain}
                    <circle cx="19" cy="19" r="4" fill="white" stroke="white" stroke-width="1"/>
                    <path d="M17 17l2 4 2-4M19 21v-6" stroke="#555" stroke-width="1.5" fill="none"/>
                </svg> Waste
            </div>
            <div class="legend-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="margin-right: 6px;">
                    ${powerPlantMain}
                </svg> Other
            </div>
        `;
    } else {
        legendDiv.innerHTML = `
            <h4>Pollution Sources</h4>
            <div class="legend-note" style="font-size: 0.9em; margin-bottom: 6px;"><strong>Active Fires</strong></div>
            <div class="legend-item"><span class="color-box" style="background: #FF8C00;"></span> Nominal Confidence</div>
            <div class="legend-item"><span class="color-box" style="background: #FF0000;"></span> High Confidence</div>
            <div class="legend-note" style="font-size: 0.9em; margin: 6px 0;"><strong>Power Plants</strong> (fossil fuel)</div>
            <div class="legend-item"><span class="color-box" style="background: #1a1a1a;"></span> Coal</div>
            <div class="legend-item"><span class="color-box" style="background: #4169E1;"></span> Gas</div>
            <div class="legend-item"><span class="color-box" style="background: #8B4513;"></span> Oil</div>
            <div class="legend-item"><span class="color-box" style="background: #696969;"></span> Other</div>
        `;
    }
}

/**
 * Show/hide loading overlay
 * @param {boolean} show - Whether to show the overlay
 */
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = show ? 'flex' : 'none';
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.querySelector('p').textContent = message;
    errorDiv.style.display = 'block';

    // Auto-hide after 10 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 10000);
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
