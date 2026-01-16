"""
NASA FIRMS (Fire Information for Resource Management System) Fetcher
Fetches active fire data from NASA's FIRMS API
"""
import requests
from datetime import datetime


class FIRMSFetcher:
    """Fetch active fire data from NASA FIRMS API"""

    BASE_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
    MAP_KEY = "bd8ecae7a73d1972082137f911abc193"  # User needs to register at https://firms.modaps.eosdis.nasa.gov/api/

    def fetch_global_fires(self, days=1):
        """
        Fetch global fires from last N days

        Args:
            days: Number of days to look back (1-10)

        Returns:
            List of fire dictionaries with lat, lon, confidence, etc.

        Notes:
            - Uses VIIRS_NOAA20_NRT data (375m resolution, better than MODIS)
            - Global bounding box: -180,-90,180,90
            - Filters: confidence > 50%
            - Rate limit: ~100 requests/day
            - Data latency: 3-5 hours
        """
        if self.MAP_KEY == "YOUR_API_KEY":
            raise ValueError(
                "NASA FIRMS API key not configured. "
                "Register at https://firms.modaps.eosdis.nasa.gov/api/ "
                "and update MAP_KEY in firms_fetcher.py"
            )

        # VIIRS_NOAA20_NRT: Latest VIIRS data with 375m resolution
        # Global bounding box: west, south, east, north
        url = f"{self.BASE_URL}/{self.MAP_KEY}/VIIRS_NOAA20_NRT/-180,-90,180,90/{days}"

        print(f"Fetching fire data from NASA FIRMS (last {days} day(s))...")

        try:
            response = requests.get(url, timeout=30)
        except requests.exceptions.Timeout:
            raise Exception("NASA FIRMS API request timed out after 30 seconds")
        except requests.exceptions.RequestException as e:
            raise Exception(f"NASA FIRMS API request failed: {str(e)}")

        if response.status_code != 200:
            if response.status_code == 403:
                raise Exception("NASA FIRMS API authentication failed. Check your MAP_KEY.")
            elif response.status_code == 404:
                raise Exception("NASA FIRMS API endpoint not found. Check the URL.")
            else:
                raise Exception(f"NASA FIRMS API error: HTTP {response.status_code}")

        # Parse CSV response
        lines = response.text.strip().split('\n')

        print(f"DEBUG: API returned {len(lines)} lines")
        if len(lines) > 0:
            print(f"DEBUG: Headers: {lines[0]}")
        if len(lines) > 1:
            print(f"DEBUG: First data row: {lines[1]}")

        if len(lines) < 2:
            print("No fire data available from FIRMS")
            return []

        headers = lines[0].split(',')

        fires = []
        filtered_count = 0
        parse_errors = 0

        for line in lines[1:]:
            values = line.split(',')

            if len(values) != len(headers):
                continue  # Skip malformed lines

            data = dict(zip(headers, values))

            # Filter by confidence
            # VIIRS uses categorical: 'l'=low, 'n'=nominal, 'h'=high
            conf_raw = data.get('confidence', '')
            if conf_raw in ('l', 'low'):
                filtered_count += 1
                continue  # Skip low confidence
            elif conf_raw in ('n', 'nominal'):
                confidence = 70
            elif conf_raw in ('h', 'high'):
                confidence = 95
            else:
                # Try numeric (for other data sources)
                try:
                    confidence = float(conf_raw)
                    if confidence <= 50:
                        filtered_count += 1
                        continue
                except (ValueError, TypeError):
                    parse_errors += 1
                    if parse_errors <= 3:
                        print(f"DEBUG: Failed to parse confidence value: '{conf_raw}'")
                    continue

            # Parse fire data
            try:
                fires.append({
                    'lat': float(data['latitude']),
                    'lon': float(data['longitude']),
                    'confidence': confidence,
                    'brightness': float(data['bright_ti4']),
                    'frp': float(data['frp']),
                    'acquisition_time': data['acq_date'] + 'T' + data['acq_time']
                })
            except (KeyError, ValueError) as e:
                print(f"Warning: Skipping fire data point due to parsing error: {e}")
                continue

        print(f"Retrieved {len(fires)} high-confidence fires (filtered {filtered_count} low-confidence, {parse_errors} parse errors)")
        return fires
