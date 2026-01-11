"""
Main application for fetching and parsing Copernicus air quality data.
"""
import argparse
import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Optional, List

from fetch_data import CopernicusDataFetcher
from parse_data import AirQualityDataParser

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('air_quality_fetcher.log')
    ]
)
logger = logging.getLogger(__name__)


def setup_directories():
    """Create necessary directories if they don't exist."""
    directories = ['data', 'output']
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"Ensured directory exists: {directory}")


def parse_date(date_str: Optional[str]) -> Optional[str]:
    """
    Parse and validate date string.
    
    Args:
        date_str: Date string in YYYY-MM-DD format or 'today'/'yesterday'.
    
    Returns:
        Validated date string in YYYY-MM-DD format.
    """
    if date_str is None:
        return None
    
    if date_str.lower() == 'today':
        return datetime.now().strftime('%Y-%m-%d')
    elif date_str.lower() == 'yesterday':
        return (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
    
    try:
        # Validate format
        datetime.strptime(date_str, '%Y-%m-%d')
        return date_str
    except ValueError:
        raise ValueError(f"Invalid date format: {date_str}. Use YYYY-MM-DD, 'today', or 'yesterday'")


def parse_bbox(bbox_str: Optional[str]) -> Optional[List[float]]:
    """
    Parse bounding box string.
    
    Args:
        bbox_str: Comma-separated string "N,W,S,E".
    
    Returns:
        List of floats [N, W, S, E] or None.
    """
    if bbox_str is None:
        return None
    
    try:
        bbox = [float(x.strip()) for x in bbox_str.split(',')]
        if len(bbox) != 4:
            raise ValueError("Bounding box must have 4 values: N,W,S,E")
        return bbox
    except Exception as e:
        raise ValueError(f"Invalid bounding box format: {e}")


def fetch_and_parse(
    date: Optional[str] = None,
    lead_times: Optional[List[str]] = None,
    bbox: Optional[List[float]] = None,
    sample_rate: int = 1,
    max_points: Optional[int] = None,
    output_name: Optional[str] = None
) -> tuple:
    """
    Fetch and parse air quality data.
    
    Args:
        date: Date to fetch data for.
        lead_times: Forecast lead times in hours.
        bbox: Bounding box [N, W, S, E].
        sample_rate: Spatial sampling rate.
        max_points: Maximum points per timestep.
        output_name: Base name for output files.
    
    Returns:
        Tuple of (netcdf_path, json_path).
    """
    # Generate output filenames
    if output_name is None:
        date_str = date if date else (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        output_name = f"pm25_forecast_{date_str}"
    
    netcdf_path = f"data/{output_name}.nc"
    json_path = f"output/{output_name}.json"
    
    # Step 1: Fetch data
    logger.info("=" * 60)
    logger.info("STEP 1: Fetching data from Copernicus ADS")
    logger.info("=" * 60)
    
    fetcher = CopernicusDataFetcher()
    netcdf_path = fetcher.fetch_pm25_forecast(
        date=date,
        output_path=netcdf_path,
        lead_times=lead_times,
        bbox=bbox
    )
    
    logger.info(f"✓ Data successfully downloaded to: {netcdf_path}")
    
    # Step 2: Parse data
    logger.info("=" * 60)
    logger.info("STEP 2: Parsing NetCDF to JSON")
    logger.info("=" * 60)
    
    parser = AirQualityDataParser(netcdf_path)
    
    # Print metadata
    metadata = parser.get_metadata()
    logger.info(f"Dataset dimensions: {metadata['dimensions']}")
    logger.info(f"Variables: {metadata['variables']}")
    
    # Parse to JSON
    result = parser.parse_pm25_to_json(
        output_path=json_path,
        sample_rate=sample_rate,
        max_points_per_time=max_points
    )
    
    parser.close()
    
    logger.info(f"✓ JSON successfully saved to: {json_path}")
    
    # Print summary
    if 'summary' in result:
        logger.info("=" * 60)
        logger.info("DATA SUMMARY")
        logger.info("=" * 60)
        summary = result['summary']
        for key, value in summary.items():
            logger.info(f"{key}: {value}")
    
    return netcdf_path, json_path


def main():
    """Main CLI application."""
    parser = argparse.ArgumentParser(
        description='Fetch and parse air quality data from Copernicus CAMS',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Fetch latest PM2.5 data (yesterday by default)
  python main.py
  
  # Fetch data for a specific date
  python main.py --date 2026-01-10
  
  # Fetch data with custom lead times
  python main.py --lead-times 0,6,12,24,48
  
  # Fetch data for a specific region (Europe)
  python main.py --bbox 70,-10,35,40
  
  # Reduce output size with sampling
  python main.py --sample-rate 4 --max-points 5000
  
  # Full example with all options
  python main.py --date 2026-01-09 --lead-times 0,24,48,72,96,120 \\
                 --bbox 60,-20,30,50 --sample-rate 2 --max-points 10000 \\
                 --output europe_pm25
        """
    )
    
    parser.add_argument(
        '--date',
        type=str,
        default=None,
        help="Date to fetch (YYYY-MM-DD format, 'today', or 'yesterday'). Default: yesterday"
    )
    
    parser.add_argument(
        '--lead-times',
        type=str,
        default=None,
        help="Comma-separated forecast lead times in hours (e.g., '0,24,48,72,96,120')"
    )
    
    parser.add_argument(
        '--bbox',
        type=str,
        default=None,
        help="Bounding box as N,W,S,E (e.g., '60,-20,30,50' for Europe)"
    )
    
    parser.add_argument(
        '--sample-rate',
        type=int,
        default=1,
        help="Spatial sampling rate (e.g., 2 = every 2nd point). Default: 1 (no sampling)"
    )
    
    parser.add_argument(
        '--max-points',
        type=int,
        default=None,
        help="Maximum data points per timestep. Default: unlimited"
    )
    
    parser.add_argument(
        '--output',
        type=str,
        default=None,
        help="Base name for output files. Default: auto-generated"
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help="Enable verbose logging"
    )
    
    args = parser.parse_args()
    
    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        # Setup
        setup_directories()
        
        # Parse arguments
        date = parse_date(args.date)
        bbox = parse_bbox(args.bbox)
        lead_times = args.lead_times.split(',') if args.lead_times else None
        
        # Log configuration
        logger.info("=" * 60)
        logger.info("CONFIGURATION")
        logger.info("=" * 60)
        logger.info(f"Date: {date or 'yesterday (default)'}")
        logger.info(f"Lead times: {lead_times or 'default [0, 24, 48, 72, 96, 120] hours'}")
        logger.info(f"Bounding box: {bbox or 'global'}")
        logger.info(f"Sample rate: {args.sample_rate}")
        logger.info(f"Max points per timestep: {args.max_points or 'unlimited'}")
        logger.info(f"Output name: {args.output or 'auto-generated'}")
        
        # Fetch and parse
        netcdf_path, json_path = fetch_and_parse(
            date=date,
            lead_times=lead_times,
            bbox=bbox,
            sample_rate=args.sample_rate,
            max_points=args.max_points,
            output_name=args.output
        )
        
        # Success
        logger.info("=" * 60)
        logger.info("✓ SUCCESS")
        logger.info("=" * 60)
        logger.info(f"NetCDF file: {netcdf_path}")
        logger.info(f"JSON file: {json_path}")
        
        return 0
    
    except KeyboardInterrupt:
        logger.warning("Operation cancelled by user")
        return 130
    
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
