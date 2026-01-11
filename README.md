# SkyWatch - Air Quality & Weather Forecast Visualization

An interactive web application that visualizes 7-day forecasts of air quality (PM2.5), wind patterns, and precipitation on an interactive Leaflet map.

![SkyWatch Screenshot](https://via.placeholder.com/800x400?text=SkyWatch+Visualization)

## Features

- **PM2.5 Air Quality Heatmap** - Color-coded EPA AQI standard visualization
- **Wind Arrows** - Direction and speed visualization with Beaufort scale colors
- **Precipitation** - Intensity-based circle markers showing rainfall/snowfall
- **Time Controls** - Interactive slider with play/pause animation
- **7-Day Forecast** - Hourly or 6-hourly timesteps up to 168 hours
- **Interactive Map** - Pan, zoom, and click for detailed information
- **Layer Toggles** - Show/hide individual data layers
- **Real-time Statistics** - Min/max/avg values for current timestep

## Data Sources

- **CAMS Global Forecasts** (Copernicus) - PM2.5 and wind data
- **ECMWF IFS** (via Open-Meteo) - Precipitation forecasts

## Quick Start

### Prerequisites

- Python 3.9 or higher
- Copernicus ADS API key (already configured in `~/.cdsapirc`)
- Internet connection

### Installation

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Install system dependency (eccodes) for GRIB support:**
```bash
# macOS
brew install eccodes

# Ubuntu/Debian
sudo apt-get install libeccodes-dev
```

### Usage

#### Step 1: Fetch Forecast Data

Fetch 7-day forecast for Europe (default):
```bash
python backend/main.py
```

Custom region and options:
```bash
# North America with 5-day forecast
python backend/main.py --region north_america --forecast-days 5

# Custom bounding box (Central Europe)
python backend/main.py --bbox 55,-5,45,20 --forecast-days 7

# Higher sampling for faster processing
python backend/main.py --region europe --sample-rate 3 --forecast-days 3
```

**Available options:**
- `--region` - Predefined regions: `europe`, `north_america`, `asia`, `global`
- `--bbox N,W,S,E` - Custom bounding box (overrides --region)
- `--forecast-days 1-7` - Number of forecast days (default: 7)
- `--sample-rate N` - Spatial sampling (1=no sampling, 2=every 2nd point)
- `--output PATH` - Output JSON file path
- `--skip-fetch` - Skip fetching, use existing data files
- `--verbose` - Enable detailed logging

#### Step 2: Open Visualization

**Option A: Open directly in browser (file:// protocol)**
```bash
# macOS
open frontend/index.html

# Linux
xdg-open frontend/index.html

# Or drag the file to your browser
```

**Option B: Start a local web server (recommended)**
```bash
python -m http.server 8000
```
Then navigate to: http://localhost:8000/frontend/

## Project Structure

```
skywatch3/
├── backend/
│   ├── fetchers/
│   │   ├── cams_fetcher.py      # CAMS API client (PM2.5 + wind)
│   │   └── ecmwf_fetcher.py     # ECMWF precipitation fetcher
│   ├── parsers/
│   │   ├── netcdf_parser.py     # NetCDF parser for CAMS data
│   │   └── unified_parser.py    # Combines all data sources
│   └── main.py                   # CLI orchestrator
├── frontend/
│   ├── index.html               # Main HTML page
│   ├── css/
│   │   └── styles.css           # Application styles
│   └── js/
│       ├── map.js               # Main map application
│       ├── pm25_layer.js        # PM2.5 heatmap layer
│       ├── wind_layer.js        # Wind arrow layer
│       ├── precip_layer.js      # Precipitation layer
│       └── controls.js          # Time controls
├── data/                        # Downloaded NetCDF/GRIB files
├── output/                      # Generated JSON files
└── requirements.txt             # Python dependencies
```

## How It Works

### Data Pipeline

```
1. Fetch Phase:
   CAMS API → data/cams_forecast.nc (PM2.5, U-wind, V-wind)
   ECMWF API → data/ecmwf_precipitation.json (Precipitation)

2. Parse Phase:
   NetCDF → JSON (PM2.5 + wind with speed/direction calculation)
   Align timestamps between CAMS and ECMWF data

3. Unify Phase:
   Combined JSON → output/forecast_data.json

4. Visualization:
   Leaflet map renders all three data layers
```

### Wind Calculation

Wind speed and direction are calculated from U/V components:
```python
speed = √(u² + v²)
direction = (270 - arctan2(v, u)) % 360  # Meteorological convention
```

### PM2.5 Unit Conversion

CAMS provides PM2.5 in kg/m³, converted to μg/m³:
```python
pm25_μg = pm25_kg × 1e9
```

## Keyboard Shortcuts

- **Space** - Play/Pause animation
- **Left Arrow** - Previous timestep
- **Right Arrow** - Next timestep

## Configuration

### Predefined Regions

| Region | Bounding Box [N, W, S, E] | Coverage |
|--------|---------------------------|----------|
| europe | [70, -10, 35, 40] | Full Europe |
| north_america | [60, -130, 25, -60] | USA + Canada |
| asia | [50, 60, 10, 150] | East Asia |
| global | None | Worldwide |

### Performance Tips

For large regions or slower computers:
- Increase `--sample-rate` (2, 3, or 4)
- Reduce `--forecast-days` (3 or 5 instead of 7)
- Use smaller bounding boxes
- Disable layers you don't need using checkboxes

### File Sizes

Typical output sizes for 7-day forecast:
- Europe (sampled): 5-10 MB
- North America (sampled): 8-12 MB
- Global (sampled): 30-50 MB

## Troubleshooting

### "Failed to load forecast data"

**Cause**: JSON file not found or incorrect path

**Solution**:
1. Verify file exists: `ls -lh output/forecast_data.json`
2. Run data fetch: `python backend/main.py`
3. Use local server instead of file:// protocol

### "API authentication failed"

**Cause**: Invalid or missing Copernicus API key

**Solution**:
1. Check API key file: `cat ~/.cdsapirc`
2. Verify format:
   ```yaml
   url: https://ads.atmosphere.copernicus.eu/api
   key: YOUR-API-KEY
   ```
3. Test connection: `python -c "import cdsapi; cdsapi.Client()"`

### "Request takes too long"

**Cause**: Copernicus uses a queue system (1-5 minute wait is normal)

**Solution**:
- Be patient - requests are queued on the server
- Check status: https://ads.atmosphere.copernicus.eu/requests
- Use smaller regions or fewer days

### "Browser shows blank map"

**Cause**: Path issues or JavaScript errors

**Solution**:
1. Open browser console (F12) and check for errors
2. Use local server: `python -m http.server 8000`
3. Verify JSON file exists in `output/` directory

### "eccodes library not found"

**Cause**: Missing system dependency for GRIB support

**Solution**:
```bash
# macOS
brew install eccodes

# Ubuntu/Debian
sudo apt-get install libeccodes-dev

# Then reinstall Python package
pip install --upgrade cfgrib
```

## Technical Details

### Libraries Used

**Backend:**
- `cdsapi` - Copernicus CDS API client
- `xarray` - NetCDF data handling
- `netCDF4` - NetCDF format support
- `cfgrib` - GRIB format support
- `numpy` - Numerical operations
- `pandas` - Data manipulation
- `requests` - HTTP API calls

**Frontend:**
- `Leaflet.js` - Interactive mapping
- `Leaflet.heat` - Heatmap visualization
- Vanilla JavaScript (ES6+) - No build tools required

### Data Format

The unified JSON schema:
```json
{
  "metadata": {
    "forecast_reference_time": "ISO-8601",
    "num_timesteps": 29,
    "forecast_hours": [0, 6, 12, ..., 168]
  },
  "timesteps": [
    {
      "index": 0,
      "forecast_hour": 0,
      "valid_time": "ISO-8601",
      "pm25": {
        "data": [{"lat": 50.0, "lon": 5.0, "value": 12.5}, ...],
        "statistics": {"min": 5.2, "max": 45.3, "mean": 18.7}
      },
      "wind": {
        "data": [{"lat": 50.0, "lon": 5.0, "speed": 4.1, "direction": 210}, ...],
        "statistics": {"min_speed": 0.5, "max_speed": 18.3}
      },
      "precipitation": {
        "data": [{"lat": 50.0, "lon": 5.0, "value": 2.3}, ...],
        "statistics": {"min": 0.0, "max": 12.5, "total": 450.2}
      }
    }
  ]
}
```

## Limitations

- CAMS data has 1-day lag (yesterday's forecast is the latest available)
- Global forecasts are large and may be slow to render
- Precipitation data limited to 16-day forecast (Open-Meteo limitation)
- Wind arrows are sampled to max 500 for performance

## Future Enhancements

Possible improvements:
- Add more pollutants (PM10, NO2, O3, SO2)
- Support for historical data comparison
- Export timestep as image
- Mobile-optimized interface
- Real-time data updates
- Custom color scales
- Measurement unit selection

## Credits

- **Data**: Copernicus Atmosphere Monitoring Service (CAMS) and ECMWF
- **Mapping**: Leaflet.js and OpenStreetMap
- **API**: Open-Meteo for ECMWF precipitation access

## License

This project uses data from the Copernicus Atmosphere Monitoring Service. Please review the [Copernicus License](https://atmosphere.copernicus.eu/data-licence) for data usage terms.

## Support

For issues:
1. Check the log file: `skywatch.log`
2. Enable verbose mode: `python backend/main.py --verbose`
3. Review browser console (F12) for JavaScript errors
4. Verify your API credentials

---

**Built with ❤️ for air quality and weather enthusiasts**
