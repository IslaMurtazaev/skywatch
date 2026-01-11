"""
Parse NetCDF air quality data and convert to JSON format.
"""
import xarray as xr
import json
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class AirQualityDataParser:
    """Parse NetCDF atmospheric composition data to JSON."""
    
    def __init__(self, netcdf_path: str):
        """
        Initialize parser with NetCDF file.
        
        Args:
            netcdf_path: Path to the NetCDF file to parse.
        """
        self.netcdf_path = netcdf_path
        self.dataset = None
        self._load_dataset()
    
    def _load_dataset(self):
        """Load the NetCDF dataset."""
        try:
            self.dataset = xr.open_dataset(self.netcdf_path)
            logger.info(f"Successfully loaded NetCDF file: {self.netcdf_path}")
            logger.info(f"Variables in dataset: {list(self.dataset.data_vars)}")
        except Exception as e:
            logger.error(f"Failed to load NetCDF file: {e}")
            raise
    
    def get_metadata(self) -> Dict[str, Any]:
        """
        Extract metadata from the dataset.
        
        Returns:
            Dictionary containing metadata information.
        """
        metadata = {
            "source": "CAMS Global Atmospheric Composition Forecasts",
            "file_path": self.netcdf_path,
            "variables": list(self.dataset.data_vars),
            "dimensions": dict(self.dataset.dims),
            "attributes": dict(self.dataset.attrs)
        }
        
        # Add coordinate information
        if 'latitude' in self.dataset.coords:
            metadata['latitude_range'] = [
                float(self.dataset.latitude.min()),
                float(self.dataset.latitude.max())
            ]
        
        if 'longitude' in self.dataset.coords:
            metadata['longitude_range'] = [
                float(self.dataset.longitude.min()),
                float(self.dataset.longitude.max())
            ]
        
        if 'time' in self.dataset.coords:
            times = self.dataset.time.values
            metadata['time_range'] = [
                str(times[0]),
                str(times[-1])
            ]
            metadata['num_timesteps'] = len(times)
        
        return metadata
    
    def parse_pm25_to_json(
        self,
        output_path: str,
        variable_name: Optional[str] = None,
        sample_rate: int = 1,
        max_points_per_time: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Parse PM2.5 data and save as JSON.
        
        Args:
            output_path: Path to save the JSON file.
            variable_name: Name of the variable to parse. If None, auto-detect PM2.5.
            sample_rate: Spatial sampling rate (e.g., 2 = every 2nd point). Reduces output size.
            max_points_per_time: Maximum data points per timestep. If None, include all points.
        
        Returns:
            Dictionary containing the parsed data.
        """
        # Auto-detect PM2.5 variable
        if variable_name is None:
            possible_names = ['pm2p5', 'pm2.5', 'pm25', 'particulate_matter_2p5um']
            for name in possible_names:
                if name in self.dataset.data_vars:
                    variable_name = name
                    break
            
            if variable_name is None:
                # Take the first variable
                variable_name = list(self.dataset.data_vars)[0]
                logger.warning(f"Could not find PM2.5 variable, using: {variable_name}")
        
        logger.info(f"Parsing variable: {variable_name}")
        
        # Extract the data array
        data_array = self.dataset[variable_name]
        
        # Get dimension names
        dims = data_array.dims
        logger.info(f"Dimensions: {dims}")
        
        # Extract coordinates - handle different time dimensions
        if 'time' in dims:
            times = data_array.time.values
            time_dim = 'time'
        elif 'forecast_period' in dims:
            times = data_array.forecast_period.values
            time_dim = 'forecast_period'
        elif 'valid_time' in self.dataset.coords:
            times = self.dataset.valid_time.values
            time_dim = 'forecast_period' if 'forecast_period' in dims else None
        else:
            times = [None]
            time_dim = None
        
        # Handle latitude
        if 'latitude' in dims or 'lat' in dims:
            lat_name = 'latitude' if 'latitude' in dims else 'lat'
            lats = data_array[lat_name].values[::sample_rate]
        else:
            lats = None
        
        # Handle longitude
        if 'longitude' in dims or 'lon' in dims:
            lon_name = 'longitude' if 'longitude' in dims else 'lon'
            lons = data_array[lon_name].values[::sample_rate]
        else:
            lons = None
        
        # Get units if available
        units = data_array.attrs.get('units', 'kg m**-3')
        long_name = data_array.attrs.get('long_name', variable_name)
        
        # Build JSON structure
        result = {
            "metadata": {
                "source": "CAMS Global Atmospheric Composition Forecasts",
                "variable": variable_name,
                "long_name": long_name,
                "unit": units,
                "spatial_resolution": f"{abs(float(lons[1] - lons[0])):.2f}° (sampled)" if lons is not None and len(lons) > 1 else "N/A",
                "time_steps": len(times),
                "generated_at": datetime.now().isoformat()
            },
            "forecasts": []
        }
        
        # Parse data for each timestep
        for time_idx, time_val in enumerate(times):
            logger.info(f"Processing timestep {time_idx + 1}/{len(times)}")
            
            # Get valid time if available
            if 'valid_time' in self.dataset.coords:
                if time_dim and self.dataset.valid_time.ndim > 1:
                    valid_time = self.dataset.valid_time.values[0, time_idx]
                else:
                    valid_time = time_val
            else:
                valid_time = time_val
            
            forecast_entry = {
                "timestep_index": time_idx,
                "timestamp": str(valid_time) if valid_time is not None else None,
                "forecast_period": str(time_val) if time_val is not None else None
            }
            
            # Extract data for this timestep
            if time_dim and time_dim in dims:
                # Select this time index and squeeze out singleton dimensions
                time_data = data_array.isel({time_dim: time_idx})
                
                # Remove forecast_reference_time dimension if it exists and is size 1
                if 'forecast_reference_time' in time_data.dims:
                    time_data = time_data.squeeze('forecast_reference_time')
            else:
                time_data = data_array
            
            # Sample spatially
            if lats is not None and lons is not None:
                time_data = time_data.isel({
                    lat_name: slice(None, None, sample_rate),
                    lon_name: slice(None, None, sample_rate)
                })
            
            # Convert to numpy array
            values = time_data.values
            
            # Handle different data shapes
            data_points = []
            
            if lats is not None and lons is not None:
                # 2D spatial data
                for i, lat in enumerate(lats):
                    for j, lon in enumerate(lons):
                        value = float(values[i, j]) if values.ndim == 2 else float(values[i, j])
                        
                        # Skip NaN and infinite values
                        if np.isnan(value) or np.isinf(value):
                            continue
                        
                        # Convert units if needed (kg/m³ to μg/m³)
                        if 'kg' in units.lower():
                            value = value * 1e9  # kg/m³ to μg/m³
                        
                        data_points.append({
                            "lat": float(lat),
                            "lon": float(lon),
                            "value": round(value, 4)
                        })
                        
                        # Limit number of points if specified
                        if max_points_per_time and len(data_points) >= max_points_per_time:
                            break
                    
                    if max_points_per_time and len(data_points) >= max_points_per_time:
                        break
            else:
                # Handle other data structures
                logger.warning("Data structure not fully supported, saving raw values")
                data_points = values.flatten().tolist()
            
            forecast_entry["data_points"] = len(data_points)
            forecast_entry["data"] = data_points
            
            result["forecasts"].append(forecast_entry)
        
        # Add summary statistics
        result["summary"] = self._calculate_summary_stats(result)
        
        # Save to JSON
        logger.info(f"Saving JSON to: {output_path}")
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        logger.info(f"Successfully saved JSON with {len(result['forecasts'])} timesteps")
        
        return result
    
    def _calculate_summary_stats(self, data: Dict) -> Dict[str, Any]:
        """Calculate summary statistics from the parsed data."""
        all_values = []
        
        for forecast in data['forecasts']:
            if isinstance(forecast.get('data'), list):
                for point in forecast['data']:
                    if isinstance(point, dict) and 'value' in point:
                        all_values.append(point['value'])
        
        if not all_values:
            return {}
        
        return {
            "total_data_points": len(all_values),
            "min_value": round(float(np.min(all_values)), 4),
            "max_value": round(float(np.max(all_values)), 4),
            "mean_value": round(float(np.mean(all_values)), 4),
            "median_value": round(float(np.median(all_values)), 4),
            "std_dev": round(float(np.std(all_values)), 4)
        }
    
    def get_variable_info(self, variable_name: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific variable.
        
        Args:
            variable_name: Name of the variable.
        
        Returns:
            Dictionary with variable information.
        """
        if variable_name not in self.dataset.data_vars:
            raise ValueError(f"Variable '{variable_name}' not found in dataset")
        
        var = self.dataset[variable_name]
        
        return {
            "name": variable_name,
            "dimensions": list(var.dims),
            "shape": list(var.shape),
            "dtype": str(var.dtype),
            "attributes": dict(var.attrs)
        }
    
    def close(self):
        """Close the dataset."""
        if self.dataset is not None:
            self.dataset.close()
            logger.info("Dataset closed")


def main():
    """Example usage of the parser."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python parse_data.py <netcdf_file> [output_json]")
        sys.exit(1)
    
    netcdf_file = sys.argv[1]
    output_json = sys.argv[2] if len(sys.argv) > 2 else "output/parsed_data.json"
    
    parser = AirQualityDataParser(netcdf_file)
    
    # Print metadata
    metadata = parser.get_metadata()
    print(json.dumps(metadata, indent=2))
    
    # Parse to JSON
    result = parser.parse_pm25_to_json(
        output_path=output_json,
        sample_rate=2,  # Sample every 2nd point to reduce file size
        max_points_per_time=10000  # Limit to 10k points per timestep
    )
    
    print(f"\nParsed data saved to: {output_json}")
    print(f"Total timesteps: {len(result['forecasts'])}")
    
    parser.close()


if __name__ == "__main__":
    main()
