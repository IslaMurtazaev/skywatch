# SkyWatch - Global Air Quality & Weather Forecast Visualization

An interactive web application that visualizes 5-day global forecasts of air quality (PM2.5), wind patterns, precipitation, and temperature on an interactive Leaflet map. All data is sourced from the Copernicus Atmosphere Monitoring Service (CAMS).

## Features

- **🌫️ PM2.5 Air Quality Heatmap** - Grayscale visualization showing moderate and unhealthy air quality levels (>9.0 μg/m³)
- **💨 Wind Arrows** - Direction and speed visualization with color-coded Beaufort scale
- **🌧️ Precipitation Heatmap** - Green gradient showing 6-hourly rainfall/snowfall (>2mm)
- **🌡️ Temperature Overlay** - Blue-to-red gradient showing 2-meter air temperature in Fahrenheit
- **⏯️ Time Controls** - Interactive slider with play/pause animation through 20 timesteps
- **🌍 Global Coverage** - Worldwide forecast data
- **🗺️ Interactive Map** - Pan, zoom, and hover for detailed information
- **👁️ Layer Toggles** - Show/hide individual data layers
- **📊 Real-time Statistics** - Min/max/avg values for current timestep

## Data Sources

### Primary Source: CAMS Global Atmospheric Composition Forecasts

**All data is provided by the Copernicus Atmosphere Monitoring Service (CAMS)**

**Provider:** European Centre for Medium-Range Weather Forecasts (ECMWF)
**Service:** CAMS Global Atmospheric Composition Forecasts
**Dataset ID:** `cams-global-atmospheric-composition-forecasts`
**API:** Copernicus Atmosphere Data Store (ADS)

#### What CAMS Provides

| Variable | Description | Native Unit | Display Unit | Coverage |
|----------|-------------|-------------|--------------|----------|
| **PM2.5** | Particulate Matter ≤2.5 μm | kg/m³ | μg/m³ | Global |
| **U-wind (u10)** | 10m U-component of wind | m/s | m/s | Global |
| **V-wind (v10)** | 10m V-component of wind | m/s | m/s | Global |
| **Precipitation (tp)** | Total precipitation (cumulative) | meters | mm (6-hourly) | Global |
| **Temperature (t2m)** | 2-meter air temperature | Kelvin (K) | Fahrenheit (°F) | Global |

**Spatial Resolution:** 0.4° × 0.4° grid spacing (~44 km between points at equator)
**Temporal Resolution:** 6-hourly forecasts
**Forecast Range:** Up to 5 days (120 hours)
**Update Frequency:** Daily (1-day lag - yesterday's forecast is latest available)

#### Data Processing Pipeline

```
1. FETCH PHASE
   ↓
   CAMS API Request
   - Date: Yesterday (latest available)
   - Variables: pm2p5, u10, v10, tp, t2m
   - Lead times: 0h, 6h, 12h, ..., 120h (21 timesteps)
   - Format: NetCDF (.nc)
   ↓
   Download: data/cams_forecast.nc (75 MB for global)

2. PARSE PHASE
   ↓
   NetCDF Parser (xarray)
   - Skip initialization time (t=0h, no precipitation)
   - Extract 20 forecast timesteps (6h to 120h)
   - Apply spatial sampling (rate=3): 0.4° → 1.2° grid
   - Convert coordinates: 0-360° longitude → -180° to 180°
   ↓
   Unit Conversions:
   - PM2.5: kg/m³ × 1e9 → μg/m³
   - Precipitation: meters (cumulative) → mm (6-hourly differences)
   - Wind: U/V components → speed (√(u²+v²)) & direction (atan2)
   - Temperature: Kelvin → Fahrenheit ((K - 273.15) × 9/5 + 32)
   ↓
   Output: output/forecast_data.json

3. VISUALIZATION PHASE
   ↓
   Leaflet.js Map
   - PM2.5 Layer: Heatmap (grayscale), filters <9.0 μg/m³
   - Wind Layer: Arrows (cyan/blue/orange/red/purple), max 500 arrows
   - Precipitation Layer: Heatmap (green), filters <2mm
   - Temperature Layer: Image overlay (blue-to-red gradient), shows all temps
   ↓
   Interactive Web App
```

### Why CAMS?

**CAMS** is the authoritative source for global atmospheric composition forecasting:

- **Official EU Service**: Part of the Copernicus Earth Observation Programme
- **State-of-the-art Model**: ECMWF's Integrated Forecasting System (IFS) with chemistry
- **Comprehensive**: Single source for air quality, meteorology, and precipitation
- **Validated**: Continuously verified against ground stations and satellite data
- **Open Access**: Free API for research and educational use

**Data License:** [Copernicus Data License](https://atmosphere.copernicus.eu/data-licence)

## Quick Start

### Prerequisites

- Python 3.9 or higher
- **Copernicus ADS API key** (required - see setup below)
- Internet connection
- ~500 MB disk space for global forecast data

### Installation

#### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

**Dependencies:**
- `cdsapi` - Copernicus API client
- `xarray` - NetCDF data handling
- `netCDF4` - NetCDF format support
- `numpy` - Numerical operations

#### 2. Configure Copernicus API Key

**a) Register for free API access:**
1. Go to [Copernicus ADS](https://ads.atmosphere.copernicus.eu/)
2. Create a free account
3. Log in and go to your [API key page](https://ads.atmosphere.copernicus.eu/user)
4. Copy your UID and API key

**b) Create API configuration file:**

```bash
nano ~/.cdsapirc
```

Add the following (replace with your credentials):
```yaml
url: https://ads.atmosphere.copernicus.eu/api
key: YOUR-UID:YOUR-API-KEY
```

**Example:**
```yaml
url: https://ads.atmosphere.copernicus.eu/api
key: 12345:abcdef01-2345-6789-abcd-ef0123456789
```

**c) Verify setup:**
```bash
python -c "import cdsapi; print('API configured successfully!')"
```

### Usage

#### Step 1: Fetch Forecast Data

**Default: Global 5-day forecast**

**IMPORTANT: For global maps, use sample rate 4 or higher for better browser performance.**

```bash
python backend/main.py --sample-rate 4
```

This will:
1. Fetch latest global CAMS forecast (yesterday's data)
2. Download ~75 MB NetCDF file
3. Parse and sample to grid
4. Generate `output/forecast_data.json`
5. Takes ~1 minute (30 sec API + 30 sec parsing)

**Custom regions and options:**
```bash
# Europe region
python backend/main.py --region europe --forecast-days 5

# North America
python backend/main.py --region north_america --forecast-days 5

# Custom bounding box (Southeast Asia)
python backend/main.py --bbox 30,90,-10,150 --forecast-days 5

# Faster processing with higher sampling (coarser grid)
python backend/main.py --region europe --sample-rate 4

# Skip data fetch, re-parse existing NetCDF
python backend/main.py --skip-fetch
```

**Available options:**
- `--region` - Predefined regions: `global` (default), `europe`, `north_america`, `asia`
- `--bbox N,W,S,E` - Custom bounding box (overrides --region)
- `--forecast-days 1-5` - Number of forecast days (default: 5)
- `--sample-rate 1-5` - Spatial sampling (use 4+ for global maps)
  - 1 = 0.4° native resolution (very large files)
  - 2 = 0.8° resolution
  - 3 = 1.2° resolution
  - 4 = 1.6° resolution (recommended for global)
  - 5 = 2.0° resolution (faster)
- `--output PATH` - Output JSON file path (default: `output/forecast_data.json`)
- `--skip-fetch` - Skip API fetch, use existing `data/cams_forecast.nc`
- `--verbose` - Enable detailed logging

#### Step 2: Open Visualization

**Option A: Direct browser open**
```bash
# macOS
open frontend/index.html

# Linux
xdg-open frontend/index.html

# Windows
start frontend/index.html
```

**Option B: Local web server (recommended for large files)**
```bash
# From project root
python -m http.server 8000
```
Then navigate to: http://localhost:8000/frontend/

**Controls:**
- **Time Slider:** Drag to change timestep
- **Play Button (▶):** Animate through forecast
- **Previous/Next (◄/►):** Step through timesteps
- **Layer Checkboxes:** Toggle PM2.5, Wind, Precipitation, Temperature
- **Space Bar:** Play/Pause
- **Arrow Keys:** Navigate timesteps

## Project Structure

```
skywatch3/
├── backend/
│   ├── fetchers/
│   │   ├── cams_fetcher.py      # CAMS API client (PM2.5 + wind + precipitation + temperature)
│   │   └── ecmwf_fetcher.py     # [DEPRECATED] No longer used
│   ├── parsers/
│   │   ├── netcdf_parser.py     # NetCDF parser for CAMS data
│   │   └── unified_parser.py    # [DEPRECATED] No longer needed
│   └── main.py                   # CLI orchestrator
├── frontend/
│   ├── index.html               # Main HTML page
│   ├── css/
│   │   └── styles.css           # Application styles
│   └── js/
│       ├── map.js               # Main map initialization
│       ├── pm25_layer.js        # PM2.5 heatmap layer
│       ├── wind_layer.js        # Wind arrow layer
│       ├── precip_layer.js      # Precipitation heatmap layer
│       ├── temperature_layer.js # Temperature image overlay layer
│       └── controls.js          # Time slider controls
├── data/                        # Downloaded NetCDF files (gitignored)
│   └── cams_forecast.nc         # Latest CAMS data (~75 MB)
├── output/                      # Generated JSON (gitignored)
│   └── forecast_data.json       # Parsed forecast (~431 MB for global)
├── requirements.txt             # Python dependencies
└── README.md                    # This file
```

## Data Processing Details

### PM2.5 Air Quality

**Source:** CAMS variable `pm2p5` (Particulate Matter 2.5 μm)

**Processing:**
1. Extract from NetCDF: `pm25_kg_m3`
2. Convert units: `pm25_μg_m3 = pm25_kg_m3 × 1e9`
3. Filter visualization: Only show values >9.0 μg/m³ (EPA AQI "Moderate" and above)

**Visualization:**
- **Type:** Heatmap (canvas-based)
- **Colors:** Grayscale gradient
  - Light gray (0.4 opacity): 9.1-35.4 μg/m³ (Moderate)
  - Medium gray (0.6 opacity): 35.5-55.4 μg/m³ (Unhealthy for Sensitive)
  - Dark gray (0.75 opacity): 55.5-125.4 μg/m³ (Unhealthy)
  - Very dark gray (0.9 opacity): 125.5-255.4 μg/m³ (Very Unhealthy)
  - Nearly black (1.0 opacity): ≥255.5 μg/m³ (Hazardous)

**EPA AQI Breakpoints:**
| Range (μg/m³) | Category | Display |
|---------------|----------|---------|
| 0-9.0 | Good | Hidden |
| 9.1-35.4 | Moderate | Light gray |
| 35.5-55.4 | Unhealthy for Sensitive | Medium gray |
| 55.5-125.4 | Unhealthy | Dark gray |
| 125.5-255.4 | Very Unhealthy | Very dark gray |
| ≥255.5 | Hazardous | Nearly black |

### Wind Data

**Source:** CAMS variables `u10` (U-component) and `v10` (V-component) at 10 meters height

**Processing:**
1. Extract U and V components (m/s)
2. Calculate wind speed: `speed = √(u² + v²)`
3. Calculate direction: `direction = (270 - arctan2(v, u)) % 360`
   - Uses meteorological convention: direction **FROM** which wind blows
   - 0° = North, 90° = East, 180° = South, 270° = West
4. Sample arrows: Display max 500 arrows using 2D grid sampling for even distribution

**Visualization:**
- **Type:** SVG arrows rotated by wind direction
- **Size:** Scales with speed (0.5× to 1.5× base size)
- **Colors:** Beaufort scale
  - Cyan (#00CED1): 0-2 m/s (Light)
  - Blue (#377EB8): 2-6 m/s (Moderate)
  - Orange (#FF7F00): 6-11 m/s (Fresh)
  - Red (#E41A1C): 11-17 m/s (Strong)
  - Purple (#984EA3): 17+ m/s (Storm)

**Tooltip:** Shows speed, direction, and cardinal direction (e.g., "5.2 m/s NW (315°)")

### Precipitation Data

**Source:** CAMS variable `tp` (Total Precipitation)

**IMPORTANT:** CAMS provides **cumulative** precipitation from forecast initialization time.

**Processing:**
1. Extract cumulative precipitation at each timestep (meters)
2. **Skip initialization timestep (t=0h):** Has zero cumulative precipitation
3. Calculate 6-hourly differences:
   ```python
   precip_6h[t] = cumulative[t] - cumulative[t-1]
   precip_6h_mm = precip_6h_m × 1000  # Convert to mm
   ```
4. Filter negative values (floating point errors): `max(0, precip_6h_mm)`
5. Filter visualization: Only show values ≥2mm (moderate or heavier)

**Example:**
```
t=0h (skipped):   cumulative = 0.0000 m
t=6h:  cumulative = 0.0123 m → 6h amount = 12.3 mm ✓ displayed
t=12h: cumulative = 0.0208 m → 6h amount = 8.5 mm ✓ displayed
t=18h: cumulative = 0.0212 m → 6h amount = 0.4 mm ✗ filtered (<2mm)
```

**Visualization:**
- **Type:** Heatmap (canvas-based)
- **Colors:** Green gradient
  - Light green (0.8 opacity): 2-5 mm (Moderate)
  - Lime green (0.85 opacity): 5-10 mm (Heavy)
  - Forest green (0.9 opacity): 10-20 mm (Very Heavy)
  - Dark green (1.0 opacity): ≥20 mm (Extreme)

**Why Green?**
- Distinct from gray PM2.5 pollution
- Distinct from cyan/blue/orange/red wind arrows
- Traditional association with vegetation/rain

### Temperature Data

**Source:** CAMS variable `2m_temperature` (2-meter air temperature)

**Processing:**
1. Extract temperature at 2 meters above ground (Kelvin)
2. Convert to Fahrenheit: `temp_f = (temp_k - 273.15) × 9/5 + 32`
3. No filtering: Show all temperature values (full global range)

**Visualization:**
- **Type:** Web Mercator-compensated image overlay
- **Technique:** Pre-distorted image that accounts for map projection distortion
- **Colors:** Blue-to-red gradient with vertical interpolation
  - Deep blue (0.0): -40°F and below (very cold)
  - Cyan (0.25): ~0-20°F (cold)
  - Green (0.5): ~40-60°F (moderate)
  - Yellow (0.75): ~80-90°F (warm)
  - Orange (0.875): ~95-105°F (hot)
  - Red (1.0): 122°F and above (very hot)

**Technical Details:**
- **Normalization Range:** -40°F to +122°F (covers global temperature extremes)
- **Image Generation:** Creates ~800px tall image with Mercator-aware vertical distribution
  - Near equator: Few pixels per latitude (compressed in Mercator)
  - Near poles: Many pixels per latitude (stretched in Mercator)
- **Interpolation:** Smooth vertical gradients between latitude bands to eliminate pixelation
- **Coverage:** Full global including polar regions (no clipping)

**Why Image Overlay vs Heatmap?**
- Provides smooth, continuous coverage without gaps
- Better performance than 45,300 individual markers
- Compensates for Web Mercator projection distortion
- Maintains uniform appearance in geographic space

## Configuration

### Predefined Regions

| Region | Bounding Box [N, W, S, E] | Coverage |
|--------|---------------------------|----------|
| **global** (default) | None | Worldwide (use sample rate 4+) |
| europe | [70, -10, 35, 40] | Full Europe |
| north_america | [60, -130, 25, -60] | USA + Canada |
| asia | [50, 60, 10, 150] | East Asia |

### Sample Rate Guide

For **global** region: **Use sample rate 4 or higher** for optimal browser performance.

| Sample Rate | Grid Spacing | Approx. Distance* | Quality |
|-------------|--------------|-------------------|---------|
| 1 | 0.4° | ~44 km | Native (very large files) |
| 2 | 0.8° | ~89 km | Excellent (large files) |
| 3 | 1.2° | ~133 km | Excellent (large files) |
| 4 | 1.6° | ~178 km | **Recommended for global** |
| 5 | 2.0° | ~222 km | Good |

*Distance between grid points at the equator (1° ≈ 111 km)

### Performance Tips

**For faster processing:**
- Increase `--sample-rate` (3-5)
- Use regional bounding boxes instead of global
- Reduce `--forecast-days` (3 instead of 5)

**For better quality:**
- Decrease `--sample-rate` (1-2)
- Use local web server for large files
- Disable unused layers in browser

**Browser performance:**
- Modern browser recommended (Chrome, Firefox, Edge, Safari)
- Hardware acceleration helps with heatmap rendering
- For global maps: use sample rate 4 or higher

## Troubleshooting

### "Failed to load forecast data"

**Cause:** JSON file missing or path incorrect

**Solution:**
```bash
# Check if file exists
ls -lh output/forecast_data.json

# Generate data
python backend/main.py

# Use local server (not file://)
python -m http.server 8000
```

### "API authentication failed"

**Cause:** Missing or invalid Copernicus API key

**Solution:**
```bash
# Check config file
cat ~/.cdsapirc

# Should contain:
# url: https://ads.atmosphere.copernicus.eu/api
# key: UID:API-KEY

# Test connection
python -c "import cdsapi; c = cdsapi.Client(); print('Success!')"
```

### "Request queued" / Takes 1-5 minutes

**This is normal!** CAMS uses a queue system.

- Typical wait: 30-60 seconds
- Shows progress: "Request accepted" → "Running" → "Successful"
- Check queue: https://ads.atmosphere.copernicus.eu/requests

### "Invalid Date" in time slider

**Cause:** Old data format (before skipping initialization timestep)

**Solution:**
```bash
# Re-generate with latest parser
python backend/main.py
# Refresh browser (Ctrl+R or Cmd+R)
```

### Browser shows blank map or errors

**Solution:**
1. Open browser console (F12 → Console tab)
2. Check for JavaScript errors
3. Verify JSON loaded: Look for "Data loaded successfully" in console
4. Try local server: `python -m http.server 8000`
5. Check file size: `ls -lh output/forecast_data.json`

### Out of memory / Browser crashes

**Cause:** File too large for browser

**Solution:**
```bash
# Use higher sample rate for global
python backend/main.py --sample-rate 5

# Or use smaller region
python backend/main.py --region europe
```

## Technical Details

### Coordinate Systems

**Input:** CAMS uses 0° to 360° longitude (0° = Greenwich, 180° = Pacific)
**Output:** Leaflet uses -180° to 180° longitude (0° = Greenwich, ±180° = Pacific)

**Conversion:**
```python
lons = np.where(lons > 180, lons - 360, lons)
```

### Temporal Alignment

**CAMS Timesteps:**
- Initialization: t=0h (skipped - no precipitation forecast yet)
- Forecast: t=6h, 12h, 18h, 24h, ..., 120h (20 timesteps)

**Frontend Display:**
- Shows valid time (actual future date/time)
- Shows forecast hour (+6h, +12h, ..., +120h)
- Example: "Jan 10, 18:00 (+18h)"

### JSON Output Schema

```json
{
  "metadata": {
    "source": "CAMS Global Atmospheric Composition Forecasts",
    "file_path": "data/cams_forecast.nc",
    "num_timesteps": 20,
    "spatial_resolution": "1.20°"
  },
  "timesteps": [
    {
      "index": 0,
      "timestamp": "2026-01-10T06:00:00",
      "valid_time": "2026-01-10T06:00:00",
      "forecast_hour": 6,
      "pm25": {
        "unit": "μg/m³",
        "data_points": 45300,
        "data": [
          {"lat": 89.6, "lon": -180.0, "value": 2.5},
          ...
        ],
        "statistics": {
          "min": 0.0,
          "max": 314.2,
          "mean": 12.5,
          "median": 8.3
        }
      },
      "wind": {
        "unit": "m/s",
        "data_points": 45300,
        "data": [
          {"lat": 89.6, "lon": -180.0, "u": 2.1, "v": -1.5, "speed": 2.6, "direction": 235},
          ...
        ],
        "statistics": {
          "min_speed": 0.01,
          "max_speed": 24.24,
          "mean_speed": 6.8
        }
      },
      "precipitation": {
        "unit": "mm (6-hourly)",
        "data_points": 33026,
        "data": [
          {"lat": 45.2, "lon": -120.5, "value": 5.2},
          ...
        ],
        "statistics": {
          "min": 0.0,
          "max": 76.5,
          "mean": 3.1,
          "total": 102456.8
        }
      },
      "temperature": {
        "unit": "°F",
        "data_points": 45300,
        "data": [
          {"lat": 89.6, "lon": -180.0, "value": -15.2},
          ...
        ],
        "statistics": {
          "min": -64.8,
          "max": 112.2,
          "mean": 58.5,
          "median": 62.1
        }
      }
    },
    ... // 19 more timesteps
  ]
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Space** | Play/Pause animation |
| **←** (Left Arrow) | Previous timestep |
| **→** (Right Arrow) | Next timestep |

## Limitations

1. **Data Availability:** 1-day lag (latest = yesterday's forecast)
2. **Forecast Range:** 5 days maximum (CAMS limitation)
3. **Update Frequency:** Manual fetch required (no auto-updates)
4. **Initialization Timestep:** Skipped (t=0h has no precipitation forecast)
5. **File Size:** Global forecasts are large (use sample rate 4+ for better performance)
6. **Browser Performance:** Large datasets may be slow on older devices
7. **Wind Arrow Density:** Limited to 500 arrows for performance

## API Rate Limits

**Copernicus ADS:**
- Free tier: Unlimited requests
- Queue system: 1-5 minute wait typical
- Daily limits: No hard limits for reasonable use
- Recommended: Cache data, don't re-fetch unnecessarily

## Future Enhancements

Potential improvements:
- [ ] Additional pollutants (PM10, NO2, O3, SO2, CO)
- [ ] Historical data / archive access
- [ ] Forecast verification vs observations
- [ ] Export maps as PNG/PDF
- [ ] Mobile-responsive interface
- [ ] Time-series plots at selected location
- [ ] Comparison mode (side-by-side timesteps)
- [ ] Custom color scales
- [ ] Temperature unit toggle (Celsius/Fahrenheit)
- [ ] Automatic daily updates via cron

## Credits

**Data Provider:**
- [Copernicus Atmosphere Monitoring Service (CAMS)](https://atmosphere.copernicus.eu/)
- [European Centre for Medium-Range Weather Forecasts (ECMWF)](https://www.ecmwf.int/)

**Technology:**
- [Leaflet.js](https://leafletjs.com/) - Interactive maps
- [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat) - Heatmap visualization
- [OpenStreetMap](https://www.openstreetmap.org/) - Base map tiles
- [xarray](http://xarray.pydata.org/) - NetCDF data handling
- [cdsapi](https://github.com/ecmwf/cdsapi) - Copernicus API client

**Citation:**
If you use CAMS data in publications, please cite:
> Copernicus Atmosphere Monitoring Service (2023): CAMS global atmospheric composition forecasts. Copernicus Atmosphere Monitoring Service (CAMS) Atmosphere Data Store (ADS). DOI: 10.24381/cds.a3d42367

## Data License

This application uses data from the **Copernicus Atmosphere Monitoring Service (CAMS)**.

**License:** [Copernicus License](https://atmosphere.copernicus.eu/data-licence)

**Summary:**
- ✅ Free to use for research, education, and commercial purposes
- ✅ No registration required for access (but API key needed)
- ✅ Redistribution allowed with proper attribution
- ⚠️ Must acknowledge Copernicus as data source
- ⚠️ No warranty provided for data accuracy

**Attribution:**
*"Contains modified Copernicus Atmosphere Monitoring Service information [2026]"*

## Support

**For data issues:**
1. Check log file: `cat skywatch.log`
2. Enable verbose logging: `python backend/main.py --verbose`
3. Review CAMS data availability: https://ads.atmosphere.copernicus.eu/

**For visualization issues:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify JSON file loads correctly
4. Try local server: `python -m http.server 8000`

**For API issues:**
1. Verify API key: `cat ~/.cdsapirc`
2. Test connection: `python -c "import cdsapi; cdsapi.Client()"`
3. Check API status: https://ads.atmosphere.copernicus.eu/

---

**Built with 🌍 for air quality and weather monitoring**

*Last updated: January 2026*
