"""
CAMS Data Fetcher - Fetches PM2.5 and wind data from Copernicus CAMS Global Forecasts
"""
import cdsapi
import os
from datetime import datetime, timedelta
from typing import Optional, List
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class CAMSFetcher:
    """Fetches PM2.5 and wind data from CAMS Global Atmospheric Composition Forecasts"""

    def __init__(self):
        """Initialize the CDS API client"""
        try:
            self.client = cdsapi.Client()
            logger.info("Successfully initialized CAMS CDS API client")
        except Exception as e:
            logger.error(f"Failed to initialize CDS API client: {e}")
            raise

    def fetch(
        self,
        date: Optional[str] = None,
        bbox: Optional[List[float]] = None,
        forecast_days: int = 7,
        output_path: str = "data/cams_forecast.nc"
    ) -> str:
        """
        Fetch PM2.5 and wind (U/V components) data from CAMS.

        Args:
            date: Date in YYYY-MM-DD format. Defaults to yesterday (latest available).
            bbox: Bounding box [N, W, S, E] to limit spatial extent. None = global.
            forecast_days: Number of forecast days (1-7). Default 7.
            output_path: Path to save the downloaded NetCDF file.

        Returns:
            Path to the downloaded file.
        """
        # Default to yesterday (CAMS data usually available with 1-day lag)
        if date is None:
            date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')

        # Generate lead times for forecast_days in 6-hour increments
        max_hours = forecast_days * 24
        lead_times = [str(h) for h in range(0, max_hours + 1, 6)]

        logger.info(f"Fetching CAMS data for {date}")
        logger.info(f"Forecast days: {forecast_days} ({len(lead_times)} timesteps)")
        logger.info(f"Lead times: {lead_times[0]}-{lead_times[-1]} hours")

        if bbox:
            logger.info(f"Bounding box: N={bbox[0]}, W={bbox[1]}, S={bbox[2]}, E={bbox[3]}")
        else:
            logger.info("Region: Global")

        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Build request parameters
        request_params = {
            'date': date,
            'type': 'forecast',
            'variable': [
                'particulate_matter_2.5um',
                '10m_u_component_of_wind',
                '10m_v_component_of_wind',
                'total_precipitation',
                '2m_temperature'
            ],
            'leadtime_hour': lead_times,
            'time': '00:00',  # Forecast initialization time
            'format': 'netcdf'
        }

        # Add bounding box if specified
        if bbox is not None:
            request_params['area'] = bbox  # [N, W, S, E]

        try:
            logger.info("Submitting request to CAMS API (this may take 1-5 minutes)...")
            self.client.retrieve(
                'cams-global-atmospheric-composition-forecasts',
                request_params,
                output_path
            )
            logger.info(f"Successfully downloaded data to: {output_path}")

            # Get file size
            file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
            logger.info(f"File size: {file_size_mb:.2f} MB")

            return output_path

        except Exception as e:
            logger.error(f"Failed to fetch CAMS data: {e}")
            raise


def main():
    """Test the CAMS fetcher"""
    import argparse

    parser = argparse.ArgumentParser(description='Fetch CAMS PM2.5 and wind data')
    parser.add_argument('--date', type=str, help='Date (YYYY-MM-DD), default: yesterday')
    parser.add_argument('--bbox', type=str, help='Bounding box: N,W,S,E (e.g., 70,-10,35,40)')
    parser.add_argument('--days', type=int, default=7, help='Forecast days (1-7)')
    parser.add_argument('--output', type=str, default='data/cams_forecast.nc', help='Output file path')

    args = parser.parse_args()

    # Parse bounding box
    bbox = None
    if args.bbox:
        bbox = [float(x.strip()) for x in args.bbox.split(',')]
        if len(bbox) != 4:
            raise ValueError("Bounding box must have 4 values: N,W,S,E")

    # Fetch data
    fetcher = CAMSFetcher()
    output_file = fetcher.fetch(
        date=args.date,
        bbox=bbox,
        forecast_days=args.days,
        output_path=args.output
    )

    print(f"\nSuccess! Data saved to: {output_file}")


if __name__ == '__main__':
    main()
