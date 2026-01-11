"""
NetCDF Parser - Parses CAMS NetCDF files to extract PM2.5 and wind data
"""
import xarray as xr
import numpy as np
from typing import Dict, List, Any, Optional
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class NetCDFParser:
    """Parse CAMS NetCDF files containing PM2.5 and wind data"""

    def __init__(self, netcdf_path: str):
        """
        Initialize parser with NetCDF file.

        Args:
            netcdf_path: Path to the CAMS NetCDF file.
        """
        self.netcdf_path = netcdf_path
        self.dataset = None
        self._load_dataset()

    def _load_dataset(self):
        """Load the NetCDF dataset"""
        try:
            self.dataset = xr.open_dataset(self.netcdf_path)
            logger.info(f"Successfully loaded NetCDF file: {self.netcdf_path}")
            logger.info(f"Variables in dataset: {list(self.dataset.data_vars)}")
            logger.info(f"Dimensions: {dict(self.dataset.dims)}")
        except Exception as e:
            logger.error(f"Failed to load NetCDF file: {e}")
            raise

    def parse(self, sample_rate: int = 2) -> Dict[str, Any]:
        """
        Parse the NetCDF file and extract PM2.5 and wind data.

        Args:
            sample_rate: Spatial sampling rate (e.g., 2 = every 2nd point).

        Returns:
            Dictionary containing parsed data with PM2.5 and wind information.
        """
        logger.info("Parsing CAMS NetCDF data...")

        # Auto-detect variable names
        pm25_var = self._detect_variable(['pm2p5', 'pm2.5', 'pm25', 'particulate_matter_2p5um'])
        u_wind_var = self._detect_variable(['u10', 'u10m', '10m_u_component_of_wind'])
        v_wind_var = self._detect_variable(['v10', 'v10m', '10m_v_component_of_wind'])
        precip_var = self._detect_variable(['tp', 'total_precipitation', 'precipitation'])

        if not pm25_var or not u_wind_var or not v_wind_var:
            raise ValueError(f"Could not detect required variables. Available: {list(self.dataset.data_vars)}")

        logger.info(f"Detected variables: PM2.5={pm25_var}, U-wind={u_wind_var}, V-wind={v_wind_var}")
        if precip_var:
            logger.info(f"Precipitation variable detected: {precip_var}")
        else:
            logger.warning("No precipitation variable found in dataset")

        # Get coordinate names (must be actual dimensions, not just coordinate variables)
        lat_coord = self._detect_dimension(['latitude', 'lat'])
        lon_coord = self._detect_dimension(['longitude', 'lon'])
        time_coord = self._detect_dimension(['forecast_period', 'time', 'valid_time'])

        if not lat_coord or not lon_coord or not time_coord:
            raise ValueError(f"Could not detect dimensions. Available dimensions: {list(self.dataset.dims)}, Available coords: {list(self.dataset.coords)}")

        logger.info(f"Detected dimensions: lat={lat_coord}, lon={lon_coord}, time={time_coord}")

        # Extract data
        pm25_data = self.dataset[pm25_var]
        u_wind_data = self.dataset[u_wind_var]
        v_wind_data = self.dataset[v_wind_var]
        precip_data = self.dataset[precip_var] if precip_var else None

        # Handle forecast_reference_time dimension if present (select first value)
        if 'forecast_reference_time' in pm25_data.dims:
            logger.info("Selecting first forecast_reference_time")
            pm25_data = pm25_data.isel(forecast_reference_time=0)
            u_wind_data = u_wind_data.isel(forecast_reference_time=0)
            v_wind_data = v_wind_data.isel(forecast_reference_time=0)
            if precip_data is not None and 'forecast_reference_time' in precip_data.dims:
                precip_data = precip_data.isel(forecast_reference_time=0)

        # Handle level dimension if present (select surface level = 0 or first level)
        if 'level' in pm25_data.dims:
            logger.info("Selecting surface level (level=0)")
            pm25_data = pm25_data.isel(level=0)
            u_wind_data = u_wind_data.isel(level=0)
            v_wind_data = v_wind_data.isel(level=0)
            if precip_data is not None and 'level' in precip_data.dims:
                precip_data = precip_data.isel(level=0)

        # Apply spatial sampling
        if sample_rate > 1:
            logger.info(f"Applying spatial sampling (rate={sample_rate})")
            pm25_data = pm25_data.isel({lat_coord: slice(None, None, sample_rate),
                                       lon_coord: slice(None, None, sample_rate)})
            u_wind_data = u_wind_data.isel({lat_coord: slice(None, None, sample_rate),
                                           lon_coord: slice(None, None, sample_rate)})
            v_wind_data = v_wind_data.isel({lat_coord: slice(None, None, sample_rate),
                                           lon_coord: slice(None, None, sample_rate)})
            if precip_data is not None:
                precip_data = precip_data.isel({lat_coord: slice(None, None, sample_rate),
                                               lon_coord: slice(None, None, sample_rate)})

        # Get dimensions
        lats = pm25_data[lat_coord].values
        lons = pm25_data[lon_coord].values

        # Convert longitude from 0-360 to -180-180 for Leaflet compatibility
        lons = np.where(lons > 180, lons - 360, lons)
        logger.info(f"Longitude range after conversion: {lons.min():.2f} to {lons.max():.2f}")

        # Get actual timestamps from valid_time coordinate if available, otherwise use time dimension values
        if 'valid_time' in self.dataset.coords:
            # Get valid_time coordinate and select same indices as data
            valid_time_coord = self.dataset['valid_time']
            if 'forecast_reference_time' in valid_time_coord.dims:
                valid_time_coord = valid_time_coord.isel(forecast_reference_time=0)
            times = valid_time_coord.values
        else:
            times = pm25_data[time_coord].values

        logger.info(f"Data shape: {len(times)} timesteps × {len(lats)} lats × {len(lons)} lons")
        logger.info(f"Total data points per timestep: {len(lats) * len(lons)}")

        # Parse timesteps
        timesteps = []
        prev_precip_cumulative = None  # Store previous cumulative precipitation

        for t_idx, time_val in enumerate(times):
            logger.info(f"Processing timestep {t_idx + 1}/{len(times)}: {time_val}")

            # Extract PM2.5 data for this timestep
            pm25_slice = pm25_data.isel({time_coord: t_idx})
            pm25_values = pm25_slice.values

            # Convert PM2.5 from kg/m³ to μg/m³ (multiply by 1e9)
            pm25_values = pm25_values * 1e9

            # Extract wind data for this timestep
            u_slice = u_wind_data.isel({time_coord: t_idx})
            v_slice = v_wind_data.isel({time_coord: t_idx})
            u_values = u_slice.values
            v_values = v_slice.values

            # Calculate wind speed and direction
            wind_speed = np.sqrt(u_values**2 + v_values**2)
            # Meteorological convention: direction FROM which wind is blowing
            wind_direction = (270 - np.degrees(np.arctan2(v_values, u_values))) % 360

            # Extract precipitation data for this timestep (if available)
            # CAMS provides CUMULATIVE precipitation, so we need to calculate differences
            if precip_data is not None:
                precip_slice = precip_data.isel({time_coord: t_idx})
                precip_cumulative = precip_slice.values  # in meters

                # Calculate 6-hourly precipitation (difference from previous timestep)
                if t_idx == 0 or prev_precip_cumulative is None:
                    # First timestep: use cumulative value (should be 0 or very small)
                    precip_values = precip_cumulative * 1000  # Convert to mm
                else:
                    # Subsequent timesteps: difference from previous
                    precip_diff = precip_cumulative - prev_precip_cumulative
                    precip_values = precip_diff * 1000  # Convert to mm
                    # Ensure no negative values due to floating point errors
                    precip_values = np.maximum(precip_values, 0)

                # Store current cumulative for next iteration
                prev_precip_cumulative = precip_cumulative.copy()
            else:
                precip_values = None

            # Create data arrays for PM2.5, wind, and precipitation
            pm25_list = []
            wind_list = []
            precip_list = []

            for i, lat in enumerate(lats):
                for j, lon in enumerate(lons):
                    pm25_val = float(pm25_values[i, j])
                    u_val = float(u_values[i, j])
                    v_val = float(v_values[i, j])
                    speed = float(wind_speed[i, j])
                    direction = float(wind_direction[i, j])

                    # Skip NaN values
                    if not np.isnan(pm25_val) and not np.isinf(pm25_val):
                        pm25_list.append({
                            'lat': float(lat),
                            'lon': float(lon),
                            'value': pm25_val
                        })

                    if not np.isnan(u_val) and not np.isnan(v_val):
                        wind_list.append({
                            'lat': float(lat),
                            'lon': float(lon),
                            'u': u_val,
                            'v': v_val,
                            'speed': speed,
                            'direction': direction
                        })

                    # Add precipitation data
                    if precip_values is not None:
                        precip_val = float(precip_values[i, j])
                        if not np.isnan(precip_val) and not np.isinf(precip_val) and precip_val > 0:
                            precip_list.append({
                                'lat': float(lat),
                                'lon': float(lon),
                                'value': precip_val
                            })

            # Calculate statistics
            valid_pm25 = [p['value'] for p in pm25_list]
            pm25_stats = {
                'min': float(np.min(valid_pm25)) if valid_pm25 else 0,
                'max': float(np.max(valid_pm25)) if valid_pm25 else 0,
                'mean': float(np.mean(valid_pm25)) if valid_pm25 else 0,
                'median': float(np.median(valid_pm25)) if valid_pm25 else 0
            }

            valid_wind_speeds = [w['speed'] for w in wind_list]
            wind_stats = {
                'min_speed': float(np.min(valid_wind_speeds)) if valid_wind_speeds else 0,
                'max_speed': float(np.max(valid_wind_speeds)) if valid_wind_speeds else 0,
                'mean_speed': float(np.mean(valid_wind_speeds)) if valid_wind_speeds else 0
            }

            # Calculate precipitation statistics
            if precip_list:
                valid_precip = [p['value'] for p in precip_list]
                precip_stats = {
                    'min': float(np.min(valid_precip)),
                    'max': float(np.max(valid_precip)),
                    'mean': float(np.mean(valid_precip)),
                    'total': float(np.sum(valid_precip))
                }
            else:
                precip_stats = {'min': 0, 'max': 0, 'mean': 0, 'total': 0}

            timestep_data = {
                'index': t_idx,
                'timestamp': str(np.datetime64(time_val)),
                'pm25': {
                    'unit': 'μg/m³',
                    'data_points': len(pm25_list),
                    'data': pm25_list,
                    'statistics': pm25_stats
                },
                'wind': {
                    'unit': 'm/s',
                    'data_points': len(wind_list),
                    'data': wind_list,
                    'statistics': wind_stats
                }
            }

            # Add precipitation data if available
            if precip_values is not None:
                timestep_data['precipitation'] = {
                    'unit': 'mm (6-hourly)',
                    'data_points': len(precip_list),
                    'data': precip_list,
                    'statistics': precip_stats
                }

            timesteps.append(timestep_data)

            logger.info(f"  PM2.5: {len(pm25_list)} points, range: {pm25_stats['min']:.2f}-{pm25_stats['max']:.2f} μg/m³")
            logger.info(f"  Wind: {len(wind_list)} points, speed range: {wind_stats['min_speed']:.2f}-{wind_stats['max_speed']:.2f} m/s")
            if precip_values is not None:
                logger.info(f"  Precipitation (6-hourly): {len(precip_list)} points, range: {precip_stats['min']:.2f}-{precip_stats['max']:.2f} mm")

        result = {
            'metadata': {
                'source': 'CAMS Global Atmospheric Composition Forecasts',
                'file_path': self.netcdf_path,
                'num_timesteps': len(timesteps),
                'spatial_resolution': f"{abs(lats[1] - lats[0]):.2f}°" if len(lats) > 1 else "N/A"
            },
            'timesteps': timesteps
        }

        logger.info("Parsing complete")
        return result

    def _detect_variable(self, possible_names: List[str]) -> Optional[str]:
        """Detect variable name from possible names"""
        for name in possible_names:
            if name in self.dataset.data_vars:
                return name
        return None

    def _detect_coordinate(self, possible_names: List[str]) -> Optional[str]:
        """Detect coordinate name from possible names"""
        for name in possible_names:
            if name in self.dataset.coords:
                return name
        return None

    def _detect_dimension(self, possible_names: List[str]) -> Optional[str]:
        """Detect dimension name from possible names"""
        for name in possible_names:
            if name in self.dataset.dims:
                return name
        return None

    def close(self):
        """Close the dataset"""
        if self.dataset is not None:
            self.dataset.close()
            logger.info("Closed NetCDF dataset")


def main():
    """Test the NetCDF parser"""
    import argparse
    import json

    parser = argparse.ArgumentParser(description='Parse CAMS NetCDF file')
    parser.add_argument('input', type=str, help='Input NetCDF file path')
    parser.add_argument('--output', type=str, default='output/cams_parsed.json', help='Output JSON file path')
    parser.add_argument('--sample-rate', type=int, default=2, help='Spatial sampling rate')

    args = parser.parse_args()

    # Parse NetCDF
    nc_parser = NetCDFParser(args.input)
    result = nc_parser.parse(sample_rate=args.sample_rate)
    nc_parser.close()

    # Save to JSON
    import os
    os.makedirs(os.path.dirname(args.output), exist_ok=True)

    with open(args.output, 'w') as f:
        json.dump(result, f, indent=2)

    file_size_mb = os.path.getsize(args.output) / (1024 * 1024)
    print(f"\nSuccess! Parsed data saved to: {args.output}")
    print(f"File size: {file_size_mb:.2f} MB")


if __name__ == '__main__':
    main()
