"""
Unified Parser - Combines CAMS and ECMWF data into a single unified JSON format
"""
import json
import numpy as np
from datetime import datetime
from typing import Dict, Any, List
from scipy.interpolate import griddata
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class UnifiedParser:
    """Combine CAMS (PM2.5 + wind) and ECMWF (precipitation) data into unified format"""

    def __init__(self):
        """Initialize unified parser"""
        pass

    def parse(
        self,
        cams_data: Dict[str, Any],
        ecmwf_data: Dict[str, Any],
        output_path: str
    ) -> Dict[str, Any]:
        """
        Combine CAMS and ECMWF data into unified JSON format.

        Args:
            cams_data: Parsed CAMS data (PM2.5 + wind)
            ecmwf_data: ECMWF precipitation data
            output_path: Path to save the unified JSON

        Returns:
            Unified data dictionary
        """
        logger.info("Creating unified dataset...")

        # Align timestamps
        cams_timesteps = cams_data['timesteps']
        ecmwf_timestamps = ecmwf_data['timestamps']
        ecmwf_precip_data = ecmwf_data['data']

        logger.info(f"CAMS timesteps: {len(cams_timesteps)}")
        logger.info(f"ECMWF timesteps: {len(ecmwf_timestamps)}")

        # Convert ECMWF hourly data to 6-hourly to match CAMS
        # Group by 6-hour intervals and sum precipitation
        unified_timesteps = []

        for cams_ts in cams_timesteps:
            cams_time = datetime.fromisoformat(cams_ts['timestamp'].replace('Z', '+00:00'))

            # Find matching ECMWF timestamp (within 1 hour tolerance)
            matching_ecmwf_idx = None
            for idx, ecmwf_time_str in enumerate(ecmwf_timestamps):
                ecmwf_time = datetime.fromisoformat(ecmwf_time_str.replace('Z', '+00:00'))
                time_diff = abs((cams_time - ecmwf_time).total_seconds() / 3600)  # hours
                if time_diff < 1:
                    matching_ecmwf_idx = idx
                    break

            if matching_ecmwf_idx is None:
                logger.warning(f"No matching ECMWF data for {cams_ts['timestamp']}, using zeros")
                # Create empty precipitation data
                precip_data_list = []
            else:
                # Get precipitation data for this timestep
                precip_data_list = []
                for point in ecmwf_precip_data:
                    precip_val = point['precipitation'][matching_ecmwf_idx]
                    if precip_val is not None and not np.isnan(precip_val):
                        precip_data_list.append({
                            'lat': point['lat'],
                            'lon': point['lon'],
                            'value': float(precip_val)
                        })

            # Calculate precipitation statistics
            if precip_data_list:
                precip_values = [p['value'] for p in precip_data_list]
                precip_stats = {
                    'min': float(np.min(precip_values)),
                    'max': float(np.max(precip_values)),
                    'mean': float(np.mean(precip_values)),
                    'total': float(np.sum(precip_values))
                }
            else:
                precip_stats = {'min': 0, 'max': 0, 'mean': 0, 'total': 0}

            # Calculate forecast hour from first timestep
            if len(unified_timesteps) == 0:
                forecast_hour = 0
            else:
                first_time = datetime.fromisoformat(cams_timesteps[0]['timestamp'].replace('Z', '+00:00'))
                forecast_hour = int((cams_time - first_time).total_seconds() / 3600)

            unified_ts = {
                'index': cams_ts['index'],
                'forecast_hour': forecast_hour,
                'valid_time': cams_ts['timestamp'],
                'pm25': cams_ts['pm25'],
                'wind': cams_ts['wind'],
                'precipitation': {
                    'unit': 'mm',
                    'data_points': len(precip_data_list),
                    'data': precip_data_list,
                    'statistics': precip_stats
                }
            }

            unified_timesteps.append(unified_ts)

            logger.info(f"Timestep {cams_ts['index']}: {cams_ts['timestamp']}")
            logger.info(f"  PM2.5: {cams_ts['pm25']['data_points']} points")
            logger.info(f"  Wind: {cams_ts['wind']['data_points']} points")
            logger.info(f"  Precipitation: {len(precip_data_list)} points, total: {precip_stats['total']:.2f} mm")

        # Calculate forecast hours list
        forecast_hours = [ts['forecast_hour'] for ts in unified_timesteps]

        # Build unified result
        result = {
            'metadata': {
                'generated_at': datetime.utcnow().isoformat() + 'Z',
                'forecast_reference_time': unified_timesteps[0]['valid_time'] if unified_timesteps else None,
                'num_timesteps': len(unified_timesteps),
                'forecast_hours': forecast_hours,
                'data_sources': {
                    'pm25': 'CAMS Global Forecasts',
                    'wind': 'CAMS Global Forecasts',
                    'precipitation': 'ECMWF via Open-Meteo'
                }
            },
            'timesteps': unified_timesteps
        }

        # Save to JSON
        import os
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)

        file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
        logger.info(f"Unified data saved to: {output_path}")
        logger.info(f"File size: {file_size_mb:.2f} MB")
        logger.info(f"Total timesteps: {len(unified_timesteps)}")

        return result


def main():
    """Test the unified parser"""
    import argparse

    parser = argparse.ArgumentParser(description='Combine CAMS and ECMWF data')
    parser.add_argument('--cams', type=str, required=True, help='CAMS parsed JSON file')
    parser.add_argument('--ecmwf', type=str, required=True, help='ECMWF precipitation JSON file')
    parser.add_argument('--output', type=str, default='output/forecast_data.json', help='Output unified JSON')

    args = parser.parse_args()

    # Load CAMS data
    with open(args.cams, 'r') as f:
        cams_data = json.load(f)

    # Load ECMWF data
    with open(args.ecmwf, 'r') as f:
        ecmwf_data = json.load(f)

    # Combine
    unified_parser = UnifiedParser()
    result = unified_parser.parse(cams_data, ecmwf_data, args.output)

    print(f"\nSuccess! Unified data saved to: {args.output}")
    print(f"Timesteps: {len(result['timesteps'])}")


if __name__ == '__main__':
    main()
