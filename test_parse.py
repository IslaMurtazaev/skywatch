#!/usr/bin/env python3
"""
Test parsing of existing NetCDF file.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from parse_data import AirQualityDataParser
import json

def main():
    netcdf_file = "data/test_pm25.nc"
    
    if not os.path.exists(netcdf_file):
        print(f"Error: {netcdf_file} not found")
        print("Run: python test_setup.py first to download data")
        return 1
    
    print("=" * 60)
    print("Testing Parser with Existing NetCDF File")
    print("=" * 60)
    
    try:
        parser = AirQualityDataParser(netcdf_file)
        
        # Show metadata
        print("\nDataset Metadata:")
        metadata = parser.get_metadata()
        print(f"  Variables: {metadata['variables']}")
        print(f"  Dimensions: {metadata['dimensions']}")
        
        # Parse to JSON
        print("\nParsing to JSON...")
        result = parser.parse_pm25_to_json(
            output_path="output/test_parsed.json",
            sample_rate=1,  # No sampling
            max_points_per_time=None  # All points
        )
        
        parser.close()
        
        print("\n" + "=" * 60)
        print("✓ PARSING SUCCESSFUL!")
        print("=" * 60)
        print(f"\nOutput: output/test_parsed.json")
        print(f"Timesteps: {len(result['forecasts'])}")
        
        if 'summary' in result:
            print("\nData Summary:")
            for key, value in result['summary'].items():
                print(f"  {key}: {value}")
        
        # Show first few data points
        if result['forecasts'] and result['forecasts'][0]['data']:
            print("\nFirst 3 data points from timestep 0:")
            for point in result['forecasts'][0]['data'][:3]:
                print(f"  Lat: {point['lat']}, Lon: {point['lon']}, PM2.5: {point['value']} µg/m³")
        
        return 0
        
    except Exception as e:
        print(f"\n✗ PARSING FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
