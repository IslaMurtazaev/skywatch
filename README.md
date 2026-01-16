# SkyWatch - Air Quality & Weather Forecast Visualization

Interactive web application visualizing 5-day global forecasts of air quality, wind, precipitation, temperature, and pollution sources on a Leaflet map.

## Features

- **PM2.5 Air Quality** - Grayscale heatmap (EPA AQI scale, >9.0 μg/m³)
- **Wind Arrows** - Monochrome arrows showing direction, size indicates speed
- **Precipitation** - Green gradient heatmap (6-hourly, >2mm)
- **Temperature** - Blue-to-red image overlay (-40°F to 122°F)
- **Pollution Sources** - Active fires (NASA FIRMS) and fossil fuel power plants (WRI)
  - Toggle between color-coded circles and minimalistic icons
  - Clustered markers for better performance
- **Time Controls** - Animated playback through 20 forecast timesteps
- **Layer Toggles** - Show/hide individual layers

## Data Sources

| Layer | Source | Update Frequency |
|-------|--------|------------------|
| PM2.5, Wind, Precip, Temp | [CAMS](https://atmosphere.copernicus.eu/) | Daily (1-day lag) |
| Active Fires | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) | Daily |
| Power Plants | [WRI Database](https://datasets.wri.org/) | Static (v1.3.0) |

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

## Project Structure

```
skywatch3/
├── backend/
│   ├── main.py                  # CLI orchestrator
│   ├── fetchers/
│   │   ├── cams_fetcher.py      # CAMS API (weather data)
│   │   ├── firms_fetcher.py     # NASA FIRMS API (fires)
│   │   └── powerplants_fetcher.py # WRI database (power plants)
│   └── parsers/
│       └── netcdf_parser.py     # NetCDF → JSON conversion
├── frontend/
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── map.js               # Main app
│       ├── pm25_layer.js
│       ├── wind_layer.js
│       ├── precip_layer.js
│       ├── temperature_layer.js
│       ├── pollution_sources_layer.js
│       └── controls.js
├── data/                        # Raw data (gitignored)
│   ├── cams_forecast.nc
│   └── fire_data.json
├── output/                      # Processed data (gitignored)
│   ├── forecast_data.json
│   └── pollution_sources.json
├── requirements.txt
└── README.md
```

## CLI Options

```bash
python backend/main.py [options]

--region        Region: global, europe, north_america, asia (default: global)
--bbox N,W,S,E  Custom bounding box (overrides --region)
--forecast-days Number of days 1-5 (default: 5)
--sample-rate   Spatial sampling 1-5 (default: 2, use 4+ for global)
--output        Output path (default: output/forecast_data.json)
--skip-fetch    Skip API fetch, use existing data
--verbose       Enable debug logging
```

## Sample Rate Guide

| Rate | Resolution | Use Case |
|------|------------|----------|
| 2 | 0.8° | Regional maps |
| 4 | 1.6° | Global maps (recommended) |
| 5 | 2.0° | Fast preview |

## Data Processing

### Weather Data (CAMS)
- Fetches PM2.5, wind (U/V), precipitation, temperature
- Converts units: kg/m³→μg/m³, K→°F, m→mm
- Skips initialization timestep (t=0h)
- Calculates 6-hourly precipitation from cumulative

### Pollution Sources
- **Fires**: Fetched from NASA FIRMS API, falls back to cached `data/fire_data.json`
- **Power Plants**: Fetched from WRI GitHub, filtered to >100MW fossil fuel only (Coal, Gas, Oil, Petcoke, Waste)
- Combined into single `pollution_sources.json` with `type` field
- Displayed as clustered markers with two view modes: circles (color-coded by type) or icons (monochrome)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| ← → | Previous/Next timestep |

## Troubleshooting

**"Failed to load forecast data"**
- Run `python backend/main.py` to generate data
- Use local server: `python -m http.server 8000`

**"API authentication failed"**
- Check `~/.cdsapirc` credentials
- Test: `python -c "import cdsapi; cdsapi.Client()"`

**Browser crashes on global map**
- Use `--sample-rate 4` or higher

## Credits

- [CAMS/ECMWF](https://atmosphere.copernicus.eu/) - Weather & air quality data
- [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) - Active fire data
- [WRI](https://www.wri.org/) - Power plant database
- [Leaflet.js](https://leafletjs.com/) - Map visualization
- [OpenStreetMap](https://www.openstreetmap.org/) - Base tiles

## License

Data: [Copernicus License](https://atmosphere.copernicus.eu/data-licence) - Free with attribution

*"Contains modified Copernicus Atmosphere Monitoring Service information [2026]"*
