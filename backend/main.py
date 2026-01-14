"""
Main CLI - Orchestrates data fetching, parsing, and visualization
"""
import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Optional, List

from fetchers.cams_fetcher import CAMSFetcher
from fetchers.firms_fetcher import FIRMSFetcher
from fetchers.powerplants_fetcher import PowerPlantsFetcher
from parsers.netcdf_parser import NetCDFParser

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('skywatch.log')
    ]
)
logger = logging.getLogger(__name__)


# Predefined regions
REGIONS = {
    'europe': [70, -10, 35, 40],      # N, W, S, E
    'north_america': [60, -130, 25, -60],
    'asia': [50, 60, 10, 150],
    'global': None
}


def parse_bbox(bbox_str: Optional[str]) -> Optional[List[float]]:
    """Parse bounding box string to list of floats"""
    if bbox_str is None:
        return None

    try:
        bbox = [float(x.strip()) for x in bbox_str.split(',')]
        if len(bbox) != 4:
            raise ValueError("Bounding box must have 4 values: N,W,S,E")
        return bbox
    except Exception as e:
        raise ValueError(f"Invalid bounding box format: {e}")


def fetch_pollution_sources(data_dir='data', output_dir='output'):
    """
    Fetch and combine pollution sources (fires and power plants) into a single file.

    Args:
        data_dir: Directory containing raw data files (fire_data.json)
        output_dir: Directory to store processed output

    Returns:
        Dictionary containing combined pollution sources data

    Notes:
        - Fires: Try API first, fall back to data/fire_data.json if API unavailable
        - Power plants: Fetch once from WRI and cache in output
        - Combined output saved to output/pollution_sources.json
    """
    os.makedirs(output_dir, exist_ok=True)

    fire_raw_path = os.path.join(data_dir, 'fire_data.json')
    output_path = os.path.join(output_dir, 'pollution_sources.json')

    fires = []
    power_plants = []

    # --- Load Fires ---
    fires_loaded = False

    # Try API first
    try:
        logger.info("Fetching fire data from NASA FIRMS API...")
        firms_fetcher = FIRMSFetcher()
        fires_raw = firms_fetcher.fetch_global_fires(days=1)
        # Normalize fire data format
        for fire in fires_raw:
            fires.append({
                'type': 'fire',
                'lat': fire['lat'],
                'lon': fire['lon'],
                'confidence': fire.get('confidence', 0),
                'frp': fire.get('frp', 0),  # Fire Radiative Power (MW)
                'brightness': fire.get('brightness', 0),
                'datetime': fire.get('datetime', fire.get('acquisition_time', ''))
            })
        logger.info(f"✓ Fire data fetched from API: {len(fires)} fires")
        fires_loaded = True
        # Save raw data for future fallback
        with open(fire_raw_path, 'w') as f:
            json.dump({
                'metadata': {
                    'fetch_time': datetime.now(tz=None).isoformat(),
                    'fire_count': len(fires_raw),
                    'data_source': 'NASA FIRMS',
                    'coverage_area': 'Global'
                },
                'fires': fires_raw
            }, f, indent=2)
    except Exception as e:
        logger.warning(f"NASA FIRMS API unavailable: {e}")

    # Fall back to local file
    if not fires_loaded and os.path.exists(fire_raw_path):
        try:
            with open(fire_raw_path, 'r') as f:
                fire_data = json.load(f)
            for fire in fire_data.get('fires', []):
                fires.append({
                    'type': 'fire',
                    'lat': fire['lat'],
                    'lon': fire['lon'],
                    'confidence': fire.get('confidence', 0),
                    'frp': fire.get('frp', 0),
                    'brightness': fire.get('brightness', 0),
                    'datetime': fire.get('datetime', '')
                })
            logger.info(f"✓ Fire data loaded from {fire_raw_path}: {len(fires)} fires")
            fires_loaded = True
        except Exception as e:
            logger.error(f"Failed to load fire data: {e}")

    if not fires_loaded:
        logger.warning("No fire data available")

    # --- Load Power Plants ---
    try:
        logger.info("Fetching power plant data from WRI database...")
        plants_fetcher = PowerPlantsFetcher()
        plants_raw = plants_fetcher.fetch_power_plants(min_capacity_mw=100)
        # Normalize power plant data format
        for plant in plants_raw:
            power_plants.append({
                'type': 'power_plant',
                'lat': plant['lat'],
                'lon': plant['lon'],
                'name': plant.get('name', 'Unknown'),
                'capacity_mw': plant.get('capacity_mw', 0),
                'fuel_type': plant.get('fuel_type', 'Unknown'),
                'country': plant.get('country', 'Unknown')
            })
        logger.info(f"✓ Power plant data fetched: {len(power_plants)} plants")
    except Exception as e:
        logger.error(f"Failed to fetch power plant data: {e}")

    # --- Combine and Save ---
    pollution_sources = {
        'metadata': {
            'generated_at': datetime.now(tz=None).isoformat(),
            'fire_count': len(fires),
            'power_plant_count': len(power_plants),
            'total_sources': len(fires) + len(power_plants),
            'sources': {
                'fires': 'NASA FIRMS',
                'power_plants': 'WRI Global Power Plant Database v1.3.0'
            }
        },
        'sources': fires + power_plants
    }

    with open(output_path, 'w') as f:
        json.dump(pollution_sources, f)
    logger.info(f"✓ Pollution sources saved: {output_path}")

    return pollution_sources


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='SkyWatch - Air Quality & Weather Forecast Visualization',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Fetch 7-day forecast for Europe
  python backend/main.py --region europe --forecast-days 7

  # Custom bounding box and sampling
  python backend/main.py --bbox 60,-20,30,50 --sample-rate 2 --forecast-days 5

  # Global forecast (large file!)
  python backend/main.py --region global --sample-rate 4 --forecast-days 3
        """
    )

    parser.add_argument(
        '--region',
        type=str,
        choices=['europe', 'north_america', 'asia', 'global'],
        default='global',
        help='Predefined region (default: global)'
    )

    parser.add_argument(
        '--bbox',
        type=str,
        help='Custom bounding box: N,W,S,E (overrides --region)'
    )

    parser.add_argument(
        '--forecast-days',
        type=int,
        default=7,
        help='Number of forecast days (1-7, default: 7)'
    )

    parser.add_argument(
        '--sample-rate',
        type=int,
        default=2,
        help='Spatial sampling rate (1=no sampling, 2=every 2nd point, default: 2)'
    )

    parser.add_argument(
        '--output',
        type=str,
        default='output/forecast_data.json',
        help='Output JSON file path (default: output/forecast_data.json)'
    )

    parser.add_argument(
        '--skip-fetch',
        action='store_true',
        help='Skip data fetching, use existing files'
    )

    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )

    args = parser.parse_args()

    # Set log level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Determine bounding box
    if args.bbox:
        bbox = parse_bbox(args.bbox)
        logger.info(f"Using custom bounding box: {bbox}")
    else:
        bbox = REGIONS[args.region]
        logger.info(f"Using region: {args.region}")
        if bbox:
            logger.info(f"Bounding box: {bbox}")

    # Validate forecast days
    if args.forecast_days < 1 or args.forecast_days > 7:
        logger.error("Forecast days must be between 1 and 7")
        sys.exit(1)

    # File paths
    cams_nc_path = 'data/cams_forecast.nc'

    try:
        # Step 1: Fetch CAMS data (PM2.5 + wind + precipitation)
        if not args.skip_fetch:
            logger.info("="*60)
            logger.info("STEP 1: Fetching CAMS data (PM2.5 + wind + precipitation)")
            logger.info("="*60)

            cams_fetcher = CAMSFetcher()
            cams_nc_path = cams_fetcher.fetch(
                bbox=bbox,
                forecast_days=args.forecast_days,
                output_path=cams_nc_path
            )
            logger.info(f"✓ CAMS data downloaded: {cams_nc_path}")
        else:
            logger.info(f"Skipping CAMS fetch, using: {cams_nc_path}")

        # Step 2: Parse CAMS NetCDF
        logger.info("\n" + "="*60)
        logger.info("STEP 2: Parsing CAMS NetCDF data")
        logger.info("="*60)

        nc_parser = NetCDFParser(cams_nc_path)
        cams_data = nc_parser.parse(sample_rate=args.sample_rate)
        nc_parser.close()

        # Step 3: Fetch pollution sources (fires and power plants)
        logger.info("\n" + "="*60)
        logger.info("STEP 3: Fetching pollution sources")
        logger.info("="*60)

        pollution_sources = fetch_pollution_sources(data_dir='data', output_dir='output')
        cams_data['pollution_sources'] = pollution_sources

        logger.info(f"✓ Pollution sources added: {pollution_sources['metadata']['fire_count']} fires, "
                   f"{pollution_sources['metadata']['power_plant_count']} power plants")

        # Save as final output
        os.makedirs(os.path.dirname(args.output), exist_ok=True)
        with open(args.output, 'w') as f:
            json.dump(cams_data, f, indent=2)

        file_size_mb = os.path.getsize(args.output) / (1024 * 1024)
        logger.info(f"✓ Data parsed and saved: {args.output} ({file_size_mb:.2f} MB)")

        # Final summary
        logger.info("\n" + "="*60)
        logger.info("✓ SUCCESS - Forecast data ready!")
        logger.info("="*60)
        logger.info(f"Output file: {args.output}")
        logger.info(f"Timesteps: {cams_data['metadata']['num_timesteps']}")
        logger.info("\nNext steps:")
        logger.info("  1. Open frontend/index.html in your browser")
        logger.info("  2. Or start a local server: python -m http.server 8000")
        logger.info("  3. Navigate to http://localhost:8000/frontend/")

        return 0

    except KeyboardInterrupt:
        logger.warning("\n\nProcess interrupted by user")
        return 1

    except Exception as e:
        logger.error(f"\n\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
