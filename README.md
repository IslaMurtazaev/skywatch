# Copernicus Air Quality Data Fetcher

A Python application to fetch and parse PM2.5 air quality forecast data from the [Copernicus Atmosphere Monitoring Service (CAMS)](https://atmosphere.copernicus.eu/) and convert it to JSON format for easy consumption.

## Features

- ✅ Fetch global PM2.5 forecasts from CAMS Global Atmospheric Composition Forecasts
- ✅ Download data in NetCDF format via the official Copernicus API
- ✅ Parse NetCDF files and convert to structured JSON
- ✅ Support for spatial filtering (bounding box)
- ✅ Configurable forecast lead times (0-120 hours)
- ✅ Data sampling to reduce output file size
- ✅ Comprehensive error handling and logging
- ✅ Command-line interface with flexible options

## Available Datasets

The application currently focuses on **CAMS Global Forecasts** but can be extended to support:

| Dataset | Coverage | Resolution | Variables |
|---------|----------|------------|-----------|
| **CAMS Global Forecasts** ⭐ | Global | ~40km | PM2.5, PM10, O3, NO2, CO, SO2, aerosols |
| CAMS European Forecasts | Europe | ~10km | Same + dust |
| CAMS Global Reanalysis | Global | ~80km | Historical data since 2003 |
| CAMS European Reanalysis | Europe | ~10km | Historical validated data |

## Prerequisites

- Python 3.9 or higher
- Active internet connection
- Copernicus ADS account and API key

## Installation

### 1. Clone or download this repository

```bash
cd skywatch3
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

**Note**: Installing `cfgrib` requires the ECMWF eccodes library. On macOS:

```bash
brew install eccodes
```

On Linux (Ubuntu/Debian):

```bash
sudo apt-get install libeccodes-dev
```

### 3. Configure API credentials

You need to register for a free account on the [Copernicus Atmosphere Data Store](https://ads.atmosphere.copernicus.eu/).

After registration:

1. Log in to your account
2. Go to your profile page to find your API key
3. Create a file named `.cdsapirc` in your home directory (`~/.cdsapirc`) with the following content:

```yaml
url: https://ads.atmosphere.copernicus.eu/api
key: YOUR-API-KEY-HERE
```

Replace `YOUR-API-KEY-HERE` with your actual API key.

**Important**: Make sure the file has the correct permissions:

```bash
chmod 600 ~/.cdsapirc
```

## Usage

### Basic Usage

Fetch the latest PM2.5 forecast (yesterday's data, which is typically the most recent available):

```bash
python main.py
```

This will:
- Download PM2.5 forecast data to `data/` directory
- Parse it and save JSON to `output/` directory
- Include forecasts for 0, 24, 48, 72, 96, and 120 hours

### Fetch Data for a Specific Date

```bash
python main.py --date 2026-01-10
```

Or use shortcuts:

```bash
python main.py --date yesterday
python main.py --date today
```

### Custom Forecast Lead Times

Specify which forecast hours to include (0-120 hours):

```bash
python main.py --lead-times 0,6,12,24,48
```

### Regional Data (Bounding Box)

Fetch data for a specific region using a bounding box (North, West, South, East):

```bash
# Europe
python main.py --bbox 70,-10,35,40

# North America
python main.py --bbox 60,-130,25,-60

# Asia
python main.py --bbox 50,60,10,150
```

### Reduce Output Size

For large datasets, you can sample the data spatially and limit the number of points:

```bash
# Sample every 2nd grid point and limit to 10,000 points per timestep
python main.py --sample-rate 2 --max-points 10000

# More aggressive sampling (every 4th point)
python main.py --sample-rate 4 --max-points 5000
```

### Custom Output Name

```bash
python main.py --output my_custom_name
```

This will create `data/my_custom_name.nc` and `output/my_custom_name.json`.

### Complete Example

Fetch PM2.5 data for Europe on January 9, 2026, with 6 forecast timesteps, sampled to reduce size:

```bash
python main.py \
  --date 2026-01-09 \
  --lead-times 0,24,48,72,96,120 \
  --bbox 60,-20,30,50 \
  --sample-rate 2 \
  --max-points 10000 \
  --output europe_pm25
```

### Verbose Output

Enable detailed logging:

```bash
python main.py --verbose
```

## Output Format

### JSON Structure

The parsed JSON file has the following structure:

```json
{
  "metadata": {
    "source": "CAMS Global Atmospheric Composition Forecasts",
    "variable": "pm2p5",
    "long_name": "Particulate matter d < 2.5 µm",
    "unit": "μg/m³",
    "spatial_resolution": "0.40°",
    "time_steps": 6,
    "generated_at": "2026-01-11T10:30:00"
  },
  "forecasts": [
    {
      "timestep_index": 0,
      "timestamp": "2026-01-10T00:00:00",
      "data_points": 8640,
      "data": [
        {"lat": 52.5, "lon": 13.4, "value": 15.3},
        {"lat": 52.5, "lon": 13.8, "value": 14.7},
        ...
      ]
    },
    ...
  ],
  "summary": {
    "total_data_points": 51840,
    "min_value": 0.5,
    "max_value": 125.3,
    "mean_value": 12.4,
    "median_value": 10.2,
    "std_dev": 8.7
  }
}
```

### Files Created

- `data/pm25_forecast_YYYY-MM-DD.nc` - Raw NetCDF file from Copernicus
- `output/pm25_forecast_YYYY-MM-DD.json` - Parsed JSON file
- `air_quality_fetcher.log` - Application log file

## Python API Usage

You can also use the modules programmatically:

```python
from fetch_data import CopernicusDataFetcher
from parse_data import AirQualityDataParser

# Fetch data
fetcher = CopernicusDataFetcher()
netcdf_path = fetcher.fetch_pm25_forecast(
    date='2026-01-10',
    lead_times=['0', '24', '48'],
    bbox=[60, -20, 30, 50]  # Europe
)

# Parse data
parser = AirQualityDataParser(netcdf_path)
result = parser.parse_pm25_to_json(
    output_path='output/my_data.json',
    sample_rate=2
)
parser.close()

print(f"Parsed {len(result['forecasts'])} timesteps")
```

### Fetch Multiple Pollutants

```python
from fetch_data import CopernicusDataFetcher

fetcher = CopernicusDataFetcher()
netcdf_path = fetcher.fetch_multiple_pollutants(
    date='2026-01-10',
    variables=[
        'particulate_matter_2.5um',
        'particulate_matter_10um',
        'nitrogen_dioxide',
        'ozone'
    ],
    output_path='data/multi_pollutant.nc'
)
```

## Troubleshooting

### Issue: API request fails

**Problem**: `Exception: Authentication failed`

**Solution**: Check that your `.cdsapirc` file is in your home directory with the correct format and permissions:

```bash
cat ~/.cdsapirc
chmod 600 ~/.cdsapirc
```

### Issue: eccodes library not found

**Problem**: `ImportError: libeccodes.so: cannot open shared object file`

**Solution**: Install the eccodes library:

```bash
# macOS
brew install eccodes

# Ubuntu/Debian
sudo apt-get install libeccodes-dev

# Then reinstall cfgrib
pip install --upgrade cfgrib
```

### Issue: Request queued for a long time

**Problem**: Download is very slow or stuck

**Solution**: The Copernicus ADS uses a queue system. Popular data requests may take several minutes. You can:
- Check the queue status at [ADS Portal](https://ads.atmosphere.copernicus.eu/requests)
- Reduce the spatial extent using `--bbox`
- Fetch fewer lead times using `--lead-times`

### Issue: JSON file is too large

**Problem**: Output JSON file is hundreds of megabytes

**Solution**: Use sampling options:

```bash
python main.py --sample-rate 4 --max-points 5000
```

### Issue: Missing data or NaN values

**Problem**: Some grid points have no data

**Solution**: This is normal for certain pollutants or regions. The parser automatically filters out NaN values. Check the data coverage in the metadata.

## Data Notes

- **Data Availability**: CAMS forecast data is typically available with a 1-day lag. Use `--date yesterday` or leave it as default.
- **Temporal Coverage**: Each forecast provides 5-day predictions (120 hours) from the base time.
- **Spatial Resolution**: Global forecasts are at ~0.4° × 0.4° (~40km) resolution.
- **Units**: PM2.5 values are automatically converted from kg/m³ to μg/m³ for readability.
- **File Sizes**: Full global NetCDF files can be 100-500 MB. Use bounding boxes and sampling to reduce size.

## Resources

- [Copernicus ADS Portal](https://ads.atmosphere.copernicus.eu/)
- [CAMS Global Forecasts Dataset](https://ads.atmosphere.copernicus.eu/datasets/cams-global-atmospheric-composition-forecasts)
- [CDS API Documentation](https://ads.atmosphere.copernicus.eu/how-to-api)
- [CAMS Documentation](https://atmosphere.copernicus.eu/documentation)

## License

This project uses data from the Copernicus Atmosphere Monitoring Service. Please review the [Copernicus License](https://atmosphere.copernicus.eu/data-licence) for data usage terms.

## Contributing

Feel free to extend this application to support:
- Additional pollutants (PM10, O3, NO2, SO2, CO)
- European regional forecasts (higher resolution)
- Historical reanalysis data
- Visualization capabilities
- API server for real-time queries

## Support

For issues with the application, check the log file `air_quality_fetcher.log`.

For Copernicus API issues, visit the [ECMWF Forum](https://forum.ecmwf.int/).
