# Quick Start Guide

This guide will help you get started with the Copernicus Air Quality Data Fetcher in just a few minutes.

## ✅ What You Have

All the code has been implemented and tested successfully! Here's what's ready:

1. **Data Fetcher** (`fetch_data.py`) - Downloads PM2.5 data from Copernicus
2. **Data Parser** (`parse_data.py`) - Converts NetCDF to JSON
3. **Main Application** (`main.py`) - Complete CLI tool
4. **Test Scripts** - Verify everything works
5. **Documentation** - Complete README and dataset reference

## 🚀 Quick Start (3 Steps)

### 1. Install Dependencies

```bash
# Activate your virtual environment (if you haven't)
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt
```

### 2. Your API Key is Already Configured ✓

Your `.cdsapirc` file is already set up in the home directory at `~/.cdsapirc`.

### 3. Fetch Data!

**Option A: Test with existing data (instant)**
```bash
python test_parse.py
```

This will parse the PM2.5 data you already downloaded and create `output/test_parsed.json`.

**Option B: Fetch new data**
```bash
# Fetch latest global PM2.5 forecast (takes 2-5 minutes)
python main.py

# Or fetch for a specific region (faster - takes 1-3 minutes)
python main.py --bbox 60,-20,30,50 --lead-times 0,24,48
```

## 📊 What You Get

The application creates two files:

1. **NetCDF File** (`data/*.nc`) - Raw data from Copernicus
2. **JSON File** (`output/*.json`) - Parsed, easy-to-use format

### JSON Structure

```json
{
  "metadata": {
    "source": "CAMS Global Atmospheric Composition Forecasts",
    "variable": "pm2p5",
    "unit": "kg m**-3",
    "time_steps": 2
  },
  "forecasts": [
    {
      "timestamp": "2026-01-09T00:00:00",
      "data": [
        {"lat": 55.0, "lon": 0.0, "value": 7.5026},
        {"lat": 55.0, "lon": 0.4, "value": 7.2058},
        ...
      ]
    }
  ],
  "summary": {
    "total_data_points": 1352,
    "min_value": 0.053,
    "max_value": 71.352,
    "mean_value": 4.23
  }
}
```

## ✅ Successful Test Results

Your test run successfully:
- ✓ Downloaded PM2.5 data for Central Europe
- ✓ Parsed NetCDF to JSON  
- ✓ Created 1,352 data points
- ✓ PM2.5 values ranged from 0.05 to 71.35 µg/m³
- ✓ Output saved to `output/test_parsed.json`

## 🎯 Common Use Cases

### 1. Get Latest Global PM2.5 Forecast
```bash
python main.py
```

### 2. Get Data for Specific Region (Europe)
```bash
python main.py --bbox 70,-10,35,40
```

### 3. Get Only Recent Forecasts (0h, 24h, 48h)
```bash
python main.py --lead-times 0,24,48
```

### 4. Reduce File Size with Sampling
```bash
python main.py --sample-rate 2 --max-points 5000
```

### 5. Get Data for Specific Date
```bash
python main.py --date 2026-01-09
```

## 📝 Available Options

```bash
python main.py --help
```

Key options:
- `--date YYYY-MM-DD` - Specific date (default: yesterday)
- `--bbox N,W,S,E` - Bounding box for region
- `--lead-times 0,24,48` - Forecast hours to fetch
- `--sample-rate 2` - Sample every Nth point (reduces size)
- `--max-points 10000` - Limit points per timestep
- `--output name` - Custom output filename
- `--verbose` - Show detailed logs

## 🗂️ File Structure

```
skywatch3/
├── fetch_data.py          # Downloads data from Copernicus
├── parse_data.py          # Converts NetCDF to JSON
├── main.py                # Main CLI application
├── test_parse.py          # Test parser with existing data
├── requirements.txt       # Python dependencies
├── README.md              # Full documentation
├── AVAILABLE_DATASETS.md  # List of all datasets
├── data/                  # Downloaded NetCDF files
│   └── test_pm25.nc      # Your test data ✓
└── output/                # Parsed JSON files
    └── test_parsed.json  # Your test output ✓
```

## 🐛 Troubleshooting

### "Request takes too long"
- Normal! Copernicus uses a queue system (1-5 minutes wait)
- Check status: https://ads.atmosphere.copernicus.eu/requests

### "Too much data"
- Use `--bbox` to limit region
- Use `--lead-times 0,24` for fewer timesteps
- Use `--sample-rate 2` to reduce spatial resolution

### "Parse error"
- The parser has been fixed and tested ✓
- Run `python test_parse.py` to verify

## 📚 Next Steps

1. **Explore the data**: Look at `output/test_parsed.json`
2. **Try different regions**: Use `--bbox` for your area of interest
3. **Fetch more pollutants**: See `AVAILABLE_DATASETS.md` for other options
4. **Read full docs**: See `README.md` for complete guide

## 🎉 You're Ready!

Everything is set up and working. You successfully:
- ✅ Installed all dependencies
- ✅ Configured API credentials
- ✅ Downloaded real data from Copernicus
- ✅ Parsed NetCDF to JSON
- ✅ Generated 1,352 PM2.5 data points

Now you can fetch air quality data whenever you need it!

## 💡 Pro Tips

1. **Start with small regions** to test quickly
2. **Cache downloaded files** - NetCDF files can be reused
3. **Use sampling** for large datasets to reduce JSON size
4. **Check the log file** `air_quality_fetcher.log` for details
5. **Visit the ADS portal** to explore other datasets

Happy coding! 🚀
