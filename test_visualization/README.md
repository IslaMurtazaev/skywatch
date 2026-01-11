# PM2.5 Air Quality Visualization Test

A simple web-based visualization of the PM2.5 air quality data fetched from Copernicus.

## Quick Start

1. **Open the visualization:**
   ```bash
   # From the skywatch3 directory
   open test_visualization/index.html
   ```
   
   Or simply double-click `index.html` in your file browser.

2. **The map will automatically load** the data from `output/test_parsed.json`

## Features

- 🗺️ **Interactive Map**: Pan and zoom to explore the data
- 📊 **Color-coded Markers**: Based on US EPA Air Quality Index
- 🔢 **Value Labels**: Toggle on/off to show PM2.5 values
- 📈 **Statistics Panel**: Min, average, and max values
- ⏱️ **Time Selector**: Switch between different forecast timesteps
- 💬 **Detailed Popups**: Click any marker for details

## Color Legend

- 🟢 Green (0-12): Good
- 🟡 Yellow (12-35): Moderate
- 🟠 Orange (35-55): Unhealthy for Sensitive Groups
- 🔴 Red (55-150): Unhealthy
- 🟣 Purple (150+): Very Unhealthy

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for loading Leaflet and map tiles)
- The `output/test_parsed.json` file must exist

## No Installation Required

This is a pure HTML/JavaScript application:
- No build step needed
- No npm/node required
- No web server required (works from file://)
- Uses CDN for Leaflet library

## To Delete

Simply delete the entire `test_visualization` folder when you're done testing:

```bash
rm -rf test_visualization
```

## Data Source

Visualizes data from:
- **Dataset**: CAMS Global Atmospheric Composition Forecasts
- **Variable**: PM2.5 (Particulate Matter < 2.5 µm)
- **Source**: Copernicus Atmosphere Monitoring Service
- **File**: `output/test_parsed.json`
