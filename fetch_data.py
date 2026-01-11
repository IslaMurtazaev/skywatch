"""
Fetch air quality data from Copernicus Atmosphere Data Store (ADS).
"""
import cdsapi
import os
from datetime import datetime, timedelta
from typing import Optional, List
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class CopernicusDataFetcher:
    """Fetches atmospheric composition data from CAMS Global Forecasts."""
    
    def __init__(self):
        """Initialize the CDS API client."""
        try:
            self.client = cdsapi.Client()
            logger.info("Successfully initialized CDS API client")
        except Exception as e:
            logger.error(f"Failed to initialize CDS API client: {e}")
            raise
    
    def fetch_pm25_forecast(
        self,
        date: Optional[str] = None,
        output_path: str = "data/pm25_forecast.nc",
        lead_times: Optional[List[str]] = None,
        bbox: Optional[List[float]] = None
    ) -> str:
        """
        Fetch PM2.5 forecast data from CAMS Global Atmospheric Composition Forecasts.
        
        Args:
            date: Date in YYYY-MM-DD format. Defaults to yesterday (latest available).
            output_path: Path to save the downloaded NetCDF file.
            lead_times: List of forecast lead times in hours (0-120). Defaults to [0, 24, 48, 72, 96, 120].
            bbox: Bounding box [N, W, S, E] to limit spatial extent. None = global.
        
        Returns:
            Path to the downloaded file.
        """
        # Default to yesterday (CAMS data usually available with 1-day lag)
        if date is None:
            date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        # Default lead times: 0h, 24h, 48h, 72h, 96h, 120h (5-day forecast)
        if lead_times is None:
            lead_times = ['0', '24', '48', '72', '96', '120']
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Build request parameters
        request_params = {
            'date': date,
            'type': 'forecast',
            'variable': 'particulate_matter_2.5um',
            'leadtime_hour': lead_times,
            'time': '00:00',
            'format': 'netcdf'
        }
        
        # Add bounding box if specified
        if bbox is not None:
            request_params['area'] = bbox  # [N, W, S, E]
        
        logger.info(f"Fetching PM2.5 forecast data for date: {date}")
        logger.info(f"Lead times: {lead_times}")
        if bbox:
            logger.info(f"Bounding box: {bbox}")
        
        try:
            self.client.retrieve(
                'cams-global-atmospheric-composition-forecasts',
                request_params,
                output_path
            )
            logger.info(f"Successfully downloaded data to: {output_path}")
            return output_path
        
        except Exception as e:
            logger.error(f"Failed to fetch data: {e}")
            raise
    
    def fetch_multiple_pollutants(
        self,
        date: Optional[str] = None,
        variables: Optional[List[str]] = None,
        output_path: str = "data/multi_pollutant_forecast.nc",
        lead_times: Optional[List[str]] = None
    ) -> str:
        """
        Fetch multiple pollutant forecasts.
        
        Args:
            date: Date in YYYY-MM-DD format.
            variables: List of variable names. Available options:
                - particulate_matter_2.5um
                - particulate_matter_10um
                - nitrogen_dioxide
                - sulphur_dioxide
                - carbon_monoxide
                - ozone
            output_path: Path to save the downloaded NetCDF file.
            lead_times: List of forecast lead times in hours.
        
        Returns:
            Path to the downloaded file.
        """
        if date is None:
            date = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        if variables is None:
            variables = ['particulate_matter_2.5um']
        
        if lead_times is None:
            lead_times = ['0', '24', '48', '72', '96', '120']
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        request_params = {
            'date': date,
            'type': 'forecast',
            'variable': variables,
            'leadtime_hour': lead_times,
            'time': '00:00',
            'format': 'netcdf'
        }
        
        logger.info(f"Fetching multiple pollutant data for date: {date}")
        logger.info(f"Variables: {variables}")
        
        try:
            self.client.retrieve(
                'cams-global-atmospheric-composition-forecasts',
                request_params,
                output_path
            )
            logger.info(f"Successfully downloaded data to: {output_path}")
            return output_path
        
        except Exception as e:
            logger.error(f"Failed to fetch data: {e}")
            raise


def main():
    """Example usage of the data fetcher."""
    fetcher = CopernicusDataFetcher()
    
    # Fetch PM2.5 forecast for yesterday
    output_file = fetcher.fetch_pm25_forecast()
    print(f"Data downloaded to: {output_file}")


if __name__ == "__main__":
    main()
