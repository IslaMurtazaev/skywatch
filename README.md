# SkyWatch - Air Quality & Weather Forecast Visualization

Interactive web application visualizing 5-day global forecasts of air quality, wind, precipitation, temperature, and pollution sources on a Leaflet map.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Data Sources](#data-sources)
- [Quick Start](#quick-start)
- [CLI Reference](#cli-reference)
- [Project Structure](#project-structure)
- [Data Processing Pipeline](#data-processing-pipeline)
- [Visualization Layers](#visualization-layers)
- [Technical Decisions](#technical-decisions)
- [Product Decisions](#product-decisions)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)
- [License](#license)

---

## Features

- **PM2.5 Air Quality** - Grayscale heatmap visualization using EPA AQI scale, filtering out "Good" air quality (≤9.0 μg/m³)
- **Wind Arrows** - Monochrome directional arrows where size indicates wind speed
- **Precipitation** - Green gradient heatmap showing 6-hourly accumulation (>2mm threshold)
- **Temperature** - Blue-to-red image overlay covering -40°F to 122°F range
- **Pollution Sources** - Combined layer showing:
  - Active fires from NASA FIRMS (color-coded by confidence level)
  - Fossil fuel power plants from WRI (>100MW capacity)
  - Toggle between color-coded circles and minimalistic icon views
  - Clustered markers for performance at global scale
- **Time Controls** - Animated playback through 20+ forecast timesteps (6-hour intervals)
- **Layer Toggles** - Independent show/hide controls for each data layer
- **Real-time Statistics** - Live min/max/avg values for current timestep

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause animation |
| ← → | Previous/Next timestep |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                              │
│                         (Leaflet Map + Controls)                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (JavaScript)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ PM2.5    │  │ Wind     │  │ Precip   │  │ Temp     │  │ Pollution │  │
│  │ Layer    │  │ Layer    │  │ Layer    │  │ Layer    │  │ Sources   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│                         ▲                                               │
│                         │ JSON                                          │
│               ┌─────────┴─────────┐                                     │
│               │ forecast_data.json │                                    │
│               └───────────────────┘                                     │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Python)                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────────┐    │
│  │ CAMS        │   │ FIRMS       │   │ PowerPlants                 │    │
│  │ Fetcher     │   │ Fetcher     │   │ Fetcher                     │    │
│  └──────┬──────┘   └──────┬──────┘   └──────────────┬──────────────┘    │
│         │                 │                          │                  │
│         ▼                 │                          │                  │
│  ┌─────────────┐          │                          │                  │
│  │ NetCDF      │          │                          │                  │
│  │ Parser      │          │                          │                  │
│  └──────┬──────┘          │                          │                  │
│         │                 │                          │                  │
│         └─────────────────┼──────────────────────────┘                  │
│                           │                                             │
│                           ▼                                             │
│                    ┌─────────────┐                                      │
│                    │ main.py     │  (CLI Orchestrator)                  │
│                    └─────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL DATA SOURCES                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────────┐    │
│  │ Copernicus    │  │ NASA FIRMS    │  │ WRI Global Power Plant    │    │
│  │ CAMS API      │  │ API           │  │ Database                  │    │
│  └───────────────┘  └───────────────┘  └───────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Fetch Phase**: Backend fetchers pull data from external APIs
2. **Parse Phase**: NetCDF parser converts binary CAMS data to JSON
3. **Combine Phase**: Weather data and pollution sources merged into single JSON
4. **Render Phase**: Frontend loads JSON and renders interactive layers

---

## Data Sources

| Layer | Source | Update Frequency | API Type |
|-------|--------|------------------|----------|
| PM2.5, Wind, Precip, Temp | [Copernicus CAMS](https://atmosphere.copernicus.eu/) | Daily (1-day lag) | CDS API |
| Active Fires | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) | Daily | REST API |
| Power Plants | [WRI Database](https://datasets.wri.org/) | Static (v1.3.0) | GitHub CSV |

### Data Characteristics

- **CAMS Forecast**: 0.4° native resolution, 6-hourly timesteps, up to 120 hours (5 days)
- **Fire Data**: MODIS/VIIRS detections, includes confidence level (0-100%) and Fire Radiative Power (MW)
- **Power Plants**: Global database filtered to >100MW fossil fuel plants (Coal, Gas, Oil, Petcoke, Waste)

---

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Copernicus API

Register at [Copernicus ADS](https://ads.atmosphere.copernicus.eu/) and create `~/.cdsapirc`:

```yaml
url: https://ads.atmosphere.copernicus.eu/api
key: YOUR-UID:YOUR-API-KEY
```

### 3. Fetch Data & Run

```bash
# Fetch global forecast (recommended: sample-rate 4 for performance)
python backend/main.py --sample-rate 4

# Or skip fetch if data exists
python backend/main.py --skip-fetch --sample-rate 4
```

### 4. View Map

```bash
python -m http.server 8000
# Open http://localhost:8000/frontend/
```

---

## CLI Reference

```bash
python backend/main.py [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--region` | `global` | Predefined region: `global`, `europe`, `north_america`, `asia` |
| `--bbox N,W,S,E` | - | Custom bounding box (overrides `--region`) |
| `--forecast-days` | `5` | Number of forecast days (1-5) |
| `--sample-rate` | `2` | Spatial sampling rate (1=full, 4=recommended for global) |
| `--output` | `output/forecast_data.json` | Output JSON path |
| `--skip-fetch` | `false` | Skip API fetch, use existing NetCDF files |
| `--verbose` | `false` | Enable debug logging |

### Sample Rate Guide

| Rate | Resolution | Points (Global) | Use Case |
|------|------------|-----------------|----------|
| 1 | 0.4° | ~405,000 | Regional high-detail |
| 2 | 0.8° | ~101,000 | Regional maps |
| 4 | 1.6° | ~25,000 | Global maps (recommended) |
| 5 | 2.0° | ~16,000 | Fast preview |

---

## Project Structure

```
skywatch3/
├── backend/
│   ├── main.py                  # CLI orchestrator - coordinates all fetching and parsing
│   ├── fetchers/
│   │   ├── cams_fetcher.py      # CAMS API client (PM2.5, wind, precip, temp)
│   │   ├── firms_fetcher.py     # NASA FIRMS API client (active fires)
│   │   └── powerplants_fetcher.py # WRI database fetcher (power plants)
│   └── parsers/
│       └── netcdf_parser.py     # NetCDF → JSON conversion with unit transformations
├── frontend/
│   ├── index.html               # Main HTML with control panel UI
│   ├── css/styles.css           # Styling for map and controls
│   └── js/
│       ├── map.js               # Main app initialization and orchestration
│       ├── pm25_layer.js        # PM2.5 image overlay with Mercator correction
│       ├── wind_layer.js        # Wind arrows with rotation and scaling
│       ├── precip_layer.js      # Precipitation heatmap
│       ├── temperature_layer.js # Temperature gradient overlay
│       ├── pollution_sources_layer.js # Fires + power plants with clustering
│       └── controls.js          # Time slider and playback controls
├── data/                        # Raw data (gitignored)
│   ├── cams_forecast.nc         # Downloaded CAMS NetCDF
│   └── fire_data.json           # Cached fire data (API fallback)
├── output/                      # Processed data (gitignored)
│   ├── forecast_data.json       # Main output consumed by frontend
│   └── pollution_sources.json   # Intermediate pollution sources file
├── requirements.txt
└── README.md
```

---

## Data Processing Pipeline

### Weather Data (CAMS)

1. **Fetch**: Download NetCDF from Copernicus CAMS API with specified variables
2. **Variable Detection**: Auto-detect variable names (handles naming variations)
3. **Dimension Handling**: Select surface level and first forecast reference time
4. **Spatial Sampling**: Apply configurable downsampling for performance
5. **Unit Conversions**:
   - PM2.5: kg/m³ → μg/m³ (×10⁹)
   - Temperature: Kelvin → Fahrenheit
   - Precipitation: meters → millimeters (×1000)
6. **Timestep Processing**:
   - Skip initialization timestep (t=0h, no precipitation data)
   - Calculate 6-hourly precipitation from cumulative values
   - Compute wind speed and direction from U/V components
7. **Longitude Normalization**: Convert 0-360° to -180-180° for Leaflet

### Pollution Sources

1. **Fires**:
   - Primary: Fetch from NASA FIRMS API (last 24 hours, global)
   - Fallback: Load cached `data/fire_data.json` if API unavailable
2. **Power Plants**:
   - Fetch WRI CSV from GitHub
   - Filter to fossil fuels only: Coal, Gas, Oil, Petcoke, Waste
   - Filter to >100MW capacity
3. **Combine**: Merge into single `pollution_sources.json` with `type` field

---

## Visualization Layers

### PM2.5 Layer

- **Technique**: Canvas-based image overlay with Mercator projection compensation
- **Color Scheme**: Grayscale gradient (light gray → near black)
- **Threshold**: Hides values ≤9.0 μg/m³ ("Good" AQI)
- **Smoothing**: Bilinear interpolation + CSS blur filter (8px)
- **Scale**: EPA AQI breakpoints (9.0 - 255.5+ μg/m³)

### Wind Layer

- **Technique**: SVG arrow markers placed at grid points
- **Direction**: Meteorological convention (direction wind blows FROM)
- **Scaling**: Arrow size proportional to wind speed
- **Formula**: `speed = √(u² + v²)`, `direction = (270 - atan2(v,u))° mod 360`

### Precipitation Layer

- **Technique**: Canvas heatmap with green gradient
- **Units**: 6-hourly accumulation in millimeters
- **Threshold**: Only shows precipitation >2mm
- **Calculation**: Difference between consecutive cumulative values

### Temperature Layer

- **Technique**: Image overlay with blue-red gradient
- **Range**: -40°F to 122°F (-40°C to 50°C)
- **Color Mapping**: Blue (cold) → White (moderate) → Red (hot)

### Pollution Sources Layer

- **Technique**: Leaflet MarkerCluster for performance
- **Cluster Radius**: 60 pixels
- **View Modes**:
  - Circles: Color-coded by type/confidence, size by magnitude
  - Icons: Monochrome SVG icons with fuel type overlays
- **Fire Markers**: Orange (nominal) / Red (high confidence), size by FRP
- **Plant Markers**: Color by fuel type, size by capacity (MW)

---

## Technical Decisions

### TD-1: JSON as Intermediate Format

**Decision**: Use JSON instead of serving NetCDF directly to frontend.

**Rationale**:
- Browser-native parsing (no additional libraries)
- Allows server-side preprocessing and unit conversions
- Enables data filtering and sampling before transfer
- Simpler frontend code without NetCDF parsing complexity

**Trade-offs**: Larger file sizes compared to binary formats, but acceptable for target data volumes.

### TD-2: Canvas Image Overlays for Continuous Data

**Decision**: Render PM2.5, precipitation, and temperature as canvas-generated image overlays instead of individual markers or vector tiles.

**Rationale**:
- Performance: Single image vs thousands of DOM elements
- Smooth gradients with bilinear interpolation
- CSS blur filter for natural-looking boundaries
- Mercator projection compensation for accurate rendering at all latitudes

**Trade-offs**: Less interactivity (no individual point tooltips), but statistics panel provides summary data.

### TD-3: MarkerCluster for Point Data

**Decision**: Use Leaflet.markercluster for fires and power plants.

**Rationale**:
- Performance: Handles 10,000+ markers smoothly
- UX: Automatic decluttering at zoom levels
- Interactivity: Preserves click/popup functionality

**Trade-offs**: Clusters hide individual point density at low zoom levels.

### TD-4: Grayscale PM2.5 Visualization

**Decision**: Use grayscale gradient instead of traditional AQI colors (green/yellow/orange/red).

**Rationale**:
- Better contrast against colorful map tiles
- Clearer visibility of pollution gradients
- Avoids color interpretation issues (colorblindness, cultural associations)
- Professional, publication-ready appearance

**Trade-offs**: Users familiar with EPA AQI colors may need adjustment.

### TD-5: 6-Hourly Timestep Resolution

**Decision**: Use 6-hour forecast intervals instead of hourly.

**Rationale**:
- Matches CAMS native forecast output intervals
- Reduces data volume by 6× compared to hourly
- Sufficient temporal resolution for weather patterns
- Precipitation requires 6-hour accumulation for meaningful values

**Trade-offs**: Cannot show sub-6-hour variations (e.g., afternoon thunderstorms).

### TD-6: CartoDB Voyager Base Map

**Decision**: Use CartoDB Voyager tiles instead of OpenStreetMap default.

**Rationale**:
- Muted colors don't compete with data overlays
- Labels remain readable under semi-transparent layers
- Clean, modern aesthetic
- Good global coverage and performance

**Trade-offs**: Requires CARTO attribution, less detail than OSM at high zoom.

### TD-7: Skip Initialization Timestep

**Decision**: Exclude t=0h (forecast initialization) from output.

**Rationale**:
- Precipitation at t=0h is always 0 (cumulative starts from init time)
- Initialization data represents analysis, not forecast
- Avoids confusing users with "zero precipitation everywhere"

**Trade-offs**: First available timestep is t=6h, not current conditions.

### TD-8: Client-Side Rendering

**Decision**: All visualization rendering happens in the browser, not pre-rendered tiles.

**Rationale**:
- No tile server infrastructure required
- Dynamic layer toggling without server round-trips
- Works offline once data is loaded
- Simpler deployment (static file hosting)

**Trade-offs**: Initial load time for large datasets, requires capable browser/device.

---

## Product Decisions

### PD-1: Focus on Fossil Fuel Power Plants Only

**Decision**: Exclude nuclear, hydro, solar, and wind power plants from pollution sources layer.

**Rationale**:
- Focus on direct air pollution sources (particulate matter, emissions)
- Nuclear/hydro/solar/wind don't emit PM2.5 during operation
- Aligns with PM2.5 visualization - shows emission sources alongside air quality
- Reduces visual clutter and data volume

**Trade-offs**: Incomplete picture of energy infrastructure, but clear pollution story.

### PD-2: 100MW Minimum Capacity Filter

**Decision**: Only show power plants with capacity ≥100MW.

**Rationale**:
- Focuses on significant pollution sources
- Reduces marker density for better visualization
- Small plants (<100MW) contribute less to regional air quality
- WRI database has ~10,000 plants globally after filtering

**Trade-offs**: Misses cumulative impact of many small plants.

### PD-3: Hide "Good" Air Quality

**Decision**: PM2.5 layer only shows values >9.0 μg/m³.

**Rationale**:
- EPA AQI "Good" category (0-9.0 μg/m³) represents clean air
- Drawing attention to problem areas, not baseline
- Cleaner map with less visual noise in clean regions
- Users can see base map in areas with good air quality

**Trade-offs**: Cannot visualize subtle differences within "Good" range.

### PD-4: Combined Pollution Sources Layer

**Decision**: Merge fires and power plants into single toggleable layer.

**Rationale**:
- Both represent pollution sources (emissions, particulates)
- Single toggle simplifies UI
- Visual storytelling: see all pollution sources together
- Can distinguish by color/icon within same layer

**Trade-offs**: Cannot toggle fires independently from power plants.

### PD-5: Two View Modes for Pollution Sources

**Decision**: Offer both color-coded circles and monochrome icons.

**Rationale**:
- Circles: Better for quick assessment of magnitude and type distribution
- Icons: Cleaner look, better for presentations and screenshots
- User preference varies by use case
- No additional data transfer (pure frontend toggle)

**Trade-offs**: UI complexity with radio button toggle.

### PD-6: 5-Day Forecast Maximum

**Decision**: Limit forecast to 5 days even though CAMS provides up to 5 days.

**Rationale**:
- Forecast accuracy degrades significantly beyond 5 days
- Matches user expectations for weather forecasts
- Reduces data volume and processing time
- UI timeline fits comfortably in control panel

**Trade-offs**: Users wanting extended outlook cannot access days 6-7.

### PD-7: Auto-Play Animation

**Decision**: Include play/pause functionality for timestep animation.

**Rationale**:
- Shows temporal evolution of weather patterns
- Engaging for presentations and demos
- Reveals storm movement and air quality changes
- Standard feature in weather visualization tools

**Trade-offs**: Can be distracting, users may prefer static view.

### PD-8: Statistics Panel

**Decision**: Show live min/max/avg statistics for current timestep.

**Rationale**:
- Quantitative context for qualitative visualization
- Useful for comparing timesteps
- Shows data range without clicking individual points
- Professional/scientific use cases require numbers

**Trade-offs**: Takes UI space, values update with each timestep.

### PD-9: Fahrenheit Temperature Units

**Decision**: Display temperature in Fahrenheit (US default).

**Rationale**:
- Primary target audience consideration
- Consistent with US weather reporting conventions
- Conversion from Kelvin is straightforward

**Trade-offs**: International users may prefer Celsius (future: add unit toggle).

### PD-10: Global Default Region

**Decision**: Default to global view rather than specific region.

**Rationale**:
- Shows full capability of the tool
- No assumption about user's location
- Demonstrates worldwide data availability
- Regional views available via CLI options

**Trade-offs**: Larger data files, may be slow on limited connections.

---

## Troubleshooting

### "Failed to load forecast data"

- Run `python backend/main.py` to generate data
- Use local server: `python -m http.server 8000`
- Check that `output/forecast_data.json` exists

### "API authentication failed"

- Check `~/.cdsapirc` credentials
- Test: `python -c "import cdsapi; cdsapi.Client()"`
- Ensure account is registered at Copernicus ADS

### Browser crashes on global map

- Use `--sample-rate 4` or higher
- Close other browser tabs
- Try a different browser (Chrome/Firefox recommended)

### Fire data not loading

- NASA FIRMS API may be temporarily unavailable
- Fallback uses cached `data/fire_data.json`
- Run with `--verbose` to see API error details

### Slow initial load

- Normal for global datasets (25,000+ points per layer)
- Consider using regional presets: `--region europe`
- Increase sample rate: `--sample-rate 5`

---

## Credits

- [Copernicus CAMS/ECMWF](https://atmosphere.copernicus.eu/) - Weather & air quality forecast data
- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) - Active fire detection data
- [WRI Global Power Plant Database](https://www.wri.org/) - Power plant locations and metadata
- [Leaflet.js](https://leafletjs.com/) - Interactive map library
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) - Marker clustering plugin
- [CartoDB](https://carto.com/) - Base map tiles
- [xarray](https://xarray.dev/) - NetCDF parsing library

---

## License

**Code**: MIT License

**Data**:
- CAMS: [Copernicus License](https://atmosphere.copernicus.eu/data-licence) - Free with attribution
- NASA FIRMS: Public domain
- WRI: Creative Commons Attribution 4.0

*"Contains modified Copernicus Atmosphere Monitoring Service information [2026]"*
