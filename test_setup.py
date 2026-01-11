#!/usr/bin/env python3
"""
Quick test script to verify the installation and fetch a small sample of data.
This script fetches PM2.5 data for a small region to test the setup.
"""
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fetch_data import CopernicusDataFetcher
from parse_data import AirQualityDataParser


def test_installation():
    """Test if all dependencies are installed."""
    print("=" * 60)
    print("Testing Installation")
    print("=" * 60)
    
    required_modules = [
        ('cdsapi', 'CDS API Client'),
        ('xarray', 'XArray'),
        ('netCDF4', 'NetCDF4'),
        ('numpy', 'NumPy'),
        ('pandas', 'Pandas'),
    ]
    
    all_good = True
    for module_name, display_name in required_modules:
        try:
            __import__(module_name)
            print(f"✓ {display_name} installed")
        except ImportError:
            print(f"✗ {display_name} NOT installed")
            all_good = False
    
    if not all_good:
        print("\nPlease install missing dependencies:")
        print("  pip install -r requirements.txt")
        return False
    
    # Check for API configuration
    home = os.path.expanduser("~")
    cdsapirc = os.path.join(home, ".cdsapirc")
    
    if os.path.exists(cdsapirc):
        print(f"✓ API configuration found at {cdsapirc}")
    else:
        print(f"✗ API configuration NOT found at {cdsapirc}")
        print("\nPlease create ~/.cdsapirc with your API key:")
        print("  url: https://ads.atmosphere.copernicus.eu/api")
        print("  key: YOUR-API-KEY")
        all_good = False
    
    print()
    return all_good


def run_test():
    """Run a quick test to fetch and parse a small dataset."""
    print("=" * 60)
    print("Running Test Fetch")
    print("=" * 60)
    print("This will fetch PM2.5 data for Europe (small region)")
    print("Lead times: 0h and 24h only")
    print()
    
    try:
        # Create directories
        os.makedirs("data", exist_ok=True)
        os.makedirs("output", exist_ok=True)
        
        # Fetch small dataset
        print("Step 1: Fetching data from Copernicus ADS...")
        print("Note: This may take 1-5 minutes depending on the queue...")
        
        fetcher = CopernicusDataFetcher()
        netcdf_path = fetcher.fetch_pm25_forecast(
            date=None,  # Yesterday (default)
            output_path="data/test_pm25.nc",
            lead_times=['0', '24'],  # Only 2 timesteps
            bbox=[55, 0, 45, 10]  # Small region: Central Europe
        )
        
        print(f"✓ Data downloaded to: {netcdf_path}")
        
        # Parse data
        print("\nStep 2: Parsing NetCDF to JSON...")
        
        parser = AirQualityDataParser(netcdf_path)
        
        # Show metadata
        metadata = parser.get_metadata()
        print(f"  Variables: {metadata['variables']}")
        print(f"  Dimensions: {metadata['dimensions']}")
        
        # Parse to JSON
        result = parser.parse_pm25_to_json(
            output_path="output/test_pm25.json",
            sample_rate=2,  # Sample every 2nd point
            max_points_per_time=1000  # Limit to 1000 points
        )
        
        parser.close()
        
        print(f"✓ JSON saved to: output/test_pm25.json")
        
        # Show summary
        if 'summary' in result:
            print("\nData Summary:")
            for key, value in result['summary'].items():
                print(f"  {key}: {value}")
        
        print("\n" + "=" * 60)
        print("✓ TEST SUCCESSFUL!")
        print("=" * 60)
        print("\nYou can now use the full application:")
        print("  python main.py --help")
        print("\nTo fetch global data:")
        print("  python main.py")
        print("\nTo fetch for a specific region:")
        print("  python main.py --bbox 70,-10,35,40")
        
        return True
        
    except Exception as e:
        print(f"\n✗ TEST FAILED: {e}")
        print("\nTroubleshooting:")
        print("1. Check your API key in ~/.cdsapirc")
        print("2. Ensure you have accepted the terms on the ADS website")
        print("3. Check your internet connection")
        print("4. Visit: https://ads.atmosphere.copernicus.eu/requests to see request status")
        return False


def main():
    """Main test function."""
    print("\n" + "=" * 60)
    print("COPERNICUS AIR QUALITY FETCHER - INSTALLATION TEST")
    print("=" * 60)
    print()
    
    # Test installation
    if not test_installation():
        print("\n✗ Please fix installation issues before proceeding.")
        return 1
    
    # Ask user if they want to run the test
    print("Installation check passed!")
    print()
    response = input("Run test fetch? This will download ~10-20 MB of data (y/n): ").lower()
    
    if response in ['y', 'yes']:
        success = run_test()
        return 0 if success else 1
    else:
        print("\nTest skipped. You can run this script again when ready.")
        print("Or use the main application directly:")
        print("  python main.py")
        return 0


if __name__ == "__main__":
    sys.exit(main())
