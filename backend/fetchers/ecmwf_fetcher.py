"""
ECMWF Precipitation Fetcher - Fetches precipitation forecasts via Open-Meteo API
"""
import requests
import json
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, List, Dict
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ECMWFFetcher:
    """Fetches precipitation forecast data from ECMWF via Open-Meteo API"""

    def __init__(self):
        """Initialize the ECMWF fetcher"""
        self.base_url = "https://api.open-meteo.com/v1/forecast"
        logger.info("Initialized ECMWF fetcher using Open-Meteo API")

    def fetch(
        self,
        bbox: Optional[List[float]] = None,
        forecast_days: int = 7,
        output_path: str = "data/ecmwf_precipitation.json"
    ) -> str:
        """
        Fetch precipitation forecast data from ECMWF via Open-Meteo.

        Args:
            bbox: Bounding box [N, W, S, E]. Default: Europe.
            forecast_days: Number of forecast days (1-16). Default 7.
            output_path: Path to save the downloaded JSON file.

        Returns:
            Path to the downloaded file.
        """
        # Default to Europe if no bbox specified
        if bbox is None:
            bbox = [70, -10, 35, 40]  # N, W, S, E

        logger.info(f"Fetching ECMWF precipitation data")
        logger.info(f"Forecast days: {forecast_days}")
        logger.info(f"Bounding box: N={bbox[0]}, W={bbox[1]}, S={bbox[2]}, E={bbox[3]}")

        # Create a grid of points within the bounding box
        # Use ~0.5° resolution to match reasonably with CAMS 0.4°
        lat_step = 0.5
        lon_step = 0.5

        lats = np.arange(bbox[2], bbox[0] + lat_step, lat_step)  # South to North
        lons = np.arange(bbox[1], bbox[3] + lon_step, lon_step)  # West to East

        logger.info(f"Grid dimensions: {len(lats)} latitudes × {len(lons)} longitudes")
        logger.info(f"Total grid points: {len(lats) * len(lons)}")

        # Open-Meteo API has a limit on number of locations per request
        # We'll fetch in batches or use a sampled grid
        max_points = 1000
        if len(lats) * len(lons) > max_points:
            # Sample the grid to stay within limits
            lat_sample = max(1, len(lats) // int(np.sqrt(max_points)))
            lon_sample = max(1, len(lons) // int(np.sqrt(max_points)))
            lats = lats[::lat_sample]
            lons = lons[::lon_sample]
            logger.warning(f"Grid too large, sampling to: {len(lats)} × {len(lons)} = {len(lats) * len(lons)} points")

        # Fetch data for the center point to get timestamps first
        center_lat = (bbox[0] + bbox[2]) / 2
        center_lon = (bbox[1] + bbox[3]) / 2

        logger.info("Fetching sample data to get forecast timestamps...")
        sample_data = self._fetch_point(center_lat, center_lon, forecast_days)

        if not sample_data:
            raise ValueError("Failed to fetch sample data")

        timestamps = sample_data['hourly']['time']
        logger.info(f"Forecast period: {timestamps[0]} to {timestamps[-1]}")
        logger.info(f"Total hourly timesteps: {len(timestamps)}")

        # Now fetch precipitation for all grid points
        logger.info("Fetching precipitation data for all grid points...")
        all_data = []

        for i, lat in enumerate(lats):
            for j, lon in enumerate(lons):
                point_data = self._fetch_point(lat, lon, forecast_days)
                if point_data:
                    precip_values = point_data['hourly']['precipitation']
                    all_data.append({
                        'lat': lat,
                        'lon': lon,
                        'precipitation': precip_values
                    })

            if (i + 1) % 10 == 0:
                logger.info(f"Progress: {i + 1}/{len(lats)} latitude rows")

        logger.info(f"Successfully fetched data for {len(all_data)} grid points")

        # Structure the data
        result = {
            'metadata': {
                'source': 'ECMWF via Open-Meteo',
                'variable': 'precipitation',
                'unit': 'mm',
                'forecast_days': forecast_days,
                'num_timesteps': len(timestamps),
                'num_points': len(all_data),
                'bbox': bbox
            },
            'timestamps': timestamps,
            'data': all_data
        }

        # Save to JSON
        import os
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)

        file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
        logger.info(f"Successfully saved precipitation data to: {output_path}")
        logger.info(f"File size: {file_size_mb:.2f} MB")

        return output_path

    def _fetch_point(self, lat: float, lon: float, forecast_days: int) -> Optional[Dict]:
        """Fetch precipitation data for a single point"""
        try:
            params = {
                'latitude': lat,
                'longitude': lon,
                'hourly': 'precipitation',
                'forecast_days': forecast_days,
                'models': 'ecmwf_ifs04'  # ECMWF IFS model
            }

            response = requests.get(self.base_url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()

        except Exception as e:
            logger.warning(f"Failed to fetch data for point ({lat}, {lon}): {e}")
            return None


def main():
    """Test the ECMWF fetcher"""
    import argparse

    parser = argparse.ArgumentParser(description='Fetch ECMWF precipitation data')
    parser.add_argument('--bbox', type=str, help='Bounding box: N,W,S,E (e.g., 70,-10,35,40)')
    parser.add_argument('--days', type=int, default=7, help='Forecast days (1-16)')
    parser.add_argument('--output', type=str, default='data/ecmwf_precipitation.json', help='Output file path')

    args = parser.parse_args()

    # Parse bounding box
    bbox = None
    if args.bbox:
        bbox = [float(x.strip()) for x in args.bbox.split(',')]
        if len(bbox) != 4:
            raise ValueError("Bounding box must have 4 values: N,W,S,E")

    # Fetch data
    fetcher = ECMWFFetcher()
    output_file = fetcher.fetch(
        bbox=bbox,
        forecast_days=args.days,
        output_path=args.output
    )

    print(f"\nSuccess! Data saved to: {output_file}")


if __name__ == '__main__':
    main()
