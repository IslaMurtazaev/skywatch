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

        // Initialize time controller
        timeController = new TimeController(forecastData.timesteps, onTimeChange);

        // Setup layer toggles
        setupLayerToggles();

        // Render initial timestep
        renderTimestep(0);

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

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
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
