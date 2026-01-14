"""
WRI Global Power Plant Database Fetcher
Fetches and filters power plant data from World Resources Institute
"""
import pandas as pd
import requests
from io import StringIO


class PowerPlantsFetcher:
    """Fetch and parse WRI Global Power Plant Database"""

    DATABASE_URL = "https://datasets.wri.org/dataset/globalpowerplantdatabase"
    # Using GitHub raw URL since the S3 URL is no longer available
    CSV_URL = "https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv"

    # Renewable energy sources to exclude (don't contribute to pollution)
    RENEWABLE_FUELS = {
        'Solar', 'Wind', 'Hydro', 'Geothermal', 'Biomass',
        'Wave and Tidal', 'Storage'
    }

    def fetch_power_plants(self, min_capacity_mw=100):
        """
        Download and filter power plant database

        Args:
            min_capacity_mw: Minimum capacity in MW to include (default 100)

        Returns:
            List of power plant dictionaries with lat, lon, capacity, fuel type, etc.

        Notes:
            - Downloads ~50 MB CSV file (may take 1-2 minutes)
            - Filters: capacity_mw > min_capacity_mw
            - Excludes all renewable fuel types
            - ~35k plants globally, ~8-10k after filtering
            - Dataset updated yearly by WRI
            - No API key required
        """
        print("Downloading WRI Global Power Plant Database...")
        print("This may take 1-2 minutes (downloading ~50 MB CSV file)...")

        try:
            response = requests.get(self.CSV_URL, timeout=120)
        except requests.exceptions.Timeout:
            raise Exception("WRI database download timed out after 120 seconds")
        except requests.exceptions.RequestException as e:
            raise Exception(f"WRI database download failed: {str(e)}")

        if response.status_code != 200:
            raise Exception(f"WRI database download failed: HTTP {response.status_code}")

        print("Parsing power plant database...")

        # Parse CSV with pandas
        try:
            df = pd.read_csv(StringIO(response.text), low_memory=False)
        except Exception as e:
            raise Exception(f"Failed to parse WRI CSV data: {str(e)}")

        initial_count = len(df)
        print(f"Loaded {initial_count} power plants from database")

        # Filter by capacity
        df = df[df['capacity_mw'] > min_capacity_mw]
        print(f"After capacity filter (>{min_capacity_mw} MW): {len(df)} plants")

        # Exclude renewables
        df = df[~df['primary_fuel'].isin(self.RENEWABLE_FUELS)]
        print(f"After excluding renewables: {len(df)} plants")

        # Extract relevant fields
        plants = []
        skipped = 0

        for _, row in df.iterrows():
            # Skip if missing coordinates
            if pd.isna(row['latitude']) or pd.isna(row['longitude']):
                skipped += 1
                continue

            # Skip if missing critical data
            if pd.isna(row['name']) or pd.isna(row['capacity_mw']) or pd.isna(row['primary_fuel']):
                skipped += 1
                continue

            try:
                plants.append({
                    'lat': float(row['latitude']),
                    'lon': float(row['longitude']),
                    'name': str(row['name']),
                    'capacity_mw': float(row['capacity_mw']),
                    'fuel_type': str(row['primary_fuel']),
                    'country': str(row['country']) if pd.notna(row['country']) else 'Unknown'
                })
            except (ValueError, TypeError) as e:
                print(f"Warning: Skipping power plant due to data conversion error: {e}")
                skipped += 1
                continue

        if skipped > 0:
            print(f"Skipped {skipped} plants due to missing/invalid data")

        print(f"Successfully processed {len(plants)} power plants")
        return plants
