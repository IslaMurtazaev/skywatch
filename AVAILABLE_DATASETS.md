# Available Copernicus CAMS Air Quality Datasets

This document lists all available air quality datasets from the Copernicus Atmosphere Monitoring Service (CAMS) that can be accessed through the Atmosphere Data Store (ADS).

## 1. CAMS Global Atmospheric Composition Forecasts ⭐ (Currently Implemented)

**Dataset ID**: `cams-global-atmospheric-composition-forecasts`

**Description**: Daily 5-day forecasts of atmospheric composition on a global scale.

**Coverage**: 
- Spatial: Global
- Temporal: June 22, 2016 to present + 5-day forecasts
- Resolution: ~0.4° × 0.4° (~40 km)
- Update Frequency: Daily

**Available Variables**:
- `particulate_matter_2.5um` - PM2.5 (particles < 2.5 μm)
- `particulate_matter_10um` - PM10 (particles < 10 μm)
- `nitrogen_dioxide` - NO2
- `sulphur_dioxide` - SO2
- `carbon_monoxide` - CO
- `ozone` - O3
- `dust_aerosol_optical_depth_550nm` - Dust AOD
- `organic_matter_aerosol_optical_depth_550nm` - Organic matter
- `black_carbon_aerosol_optical_depth_550nm` - Black carbon
- `sea_salt_aerosol_optical_depth_550nm` - Sea salt
- `sulphate_aerosol_optical_depth_550nm` - Sulphate aerosol

**Forecast Lead Times**: 0 to 120 hours (5 days)

**Format**: NetCDF, GRIB

**Use Case**: Global air quality monitoring, forecasting, research

---

## 2. CAMS European Air Quality Forecasts

**Dataset ID**: `cams-europe-air-quality-forecasts`

**Description**: High-resolution air quality analyses and forecasts for Europe.

**Coverage**:
- Spatial: Europe (25°N - 70°N, 25°W - 45°E)
- Temporal: 2016 to present + 4-day forecasts
- Resolution: ~0.1° × 0.1° (~10 km)
- Update Frequency: Daily

**Available Variables**:
- `nitrogen_monoxide` - NO
- `nitrogen_dioxide` - NO2
- `sulphur_dioxide` - SO2
- `ozone` - O3
- `particulate_matter_2p5` - PM2.5
- `particulate_matter_10` - PM10
- `dust` - Dust concentrations
- `ammonia` - NH3
- `non_methane_vocs` - NMVOCs
- `peroxyacyl_nitrates` - PANs

**Forecast Lead Times**: 0 to 96 hours (4 days)

**Format**: NetCDF, GRIB

**Use Case**: European regional air quality forecasting, policy making, health studies

---

## 3. CAMS Global Reanalysis (EAC4)

**Dataset ID**: `cams-global-reanalysis-eac4`

**Description**: Consistent multi-year reanalysis of atmospheric composition.

**Coverage**:
- Spatial: Global
- Temporal: 2003 to 2022
- Resolution: ~0.75° × 0.75° (~80 km)
- Update Frequency: Annual updates

**Available Variables**:
- All major pollutants (PM2.5, PM10, O3, NO2, SO2, CO)
- Aerosol species (dust, sea salt, organic matter, black carbon, sulphate)
- Greenhouse gases (CO2, CH4)
- Aerosol optical depth at various wavelengths

**Format**: NetCDF, GRIB

**Use Case**: Historical analysis, trend studies, climate research, model validation

---

## 4. CAMS European Air Quality Reanalyses

**Dataset ID**: `cams-europe-air-quality-reanalyses`

**Description**: Validated annual reanalyses of European air quality.

**Coverage**:
- Spatial: Europe
- Temporal: 2016 to 2022 (updated annually)
- Resolution: ~0.1° × 0.1° (~10 km)
- Update Frequency: Annual

**Available Variables**:
- Same as European forecasts
- Both unvalidated (interim) and validated versions available

**Format**: NetCDF, GRIB

**Use Case**: Historical European air quality analysis, regulatory compliance, health impact studies

---

## 5. CAMS Global Near-Real-Time Data

**Dataset ID**: `cams-global-atmospheric-composition-forecasts` (near-real-time subset)

**Description**: Near-real-time forecasts available through Google Earth Engine and other platforms.

**Coverage**: Same as Global Forecasts

**Use Case**: Real-time monitoring, emergency response, operational services

---

## 6. CAMS Global Greenhouse Gas Reanalysis

**Dataset ID**: `cams-global-greenhouse-gas-reanalysis`

**Description**: Greenhouse gas concentrations from observations and models.

**Available Variables**:
- `carbon_dioxide` - CO2
- `methane` - CH4

**Coverage**: Global, 2003 onwards

**Use Case**: Climate research, carbon cycle studies

---

## 7. CAMS Global Inversion-Optimised Greenhouse Gas Fluxes

**Dataset ID**: `cams-global-greenhouse-gas-inversion`

**Description**: Surface fluxes of greenhouse gases derived from atmospheric observations.

**Available Variables**:
- CO2 fluxes
- CH4 fluxes

**Coverage**: Global

**Use Case**: Understanding sources and sinks of greenhouse gases

---

## 8. CAMS Solar Radiation Time Series

**Dataset ID**: `cams-solar-radiation-timeseries`

**Description**: Surface solar radiation data affected by aerosols and clouds.

**Available Variables**:
- Global horizontal irradiance (GHI)
- Direct normal irradiance (DNI)
- Diffuse horizontal irradiance (DHI)

**Coverage**: Global, 2004 onwards

**Use Case**: Solar energy applications, radiative effects of aerosols

---

## 9. CAMS Global Biomass Burning Emissions

**Dataset ID**: `cams-global-fire-emissions-gfas`

**Description**: Daily fire emissions based on satellite observations.

**Available Variables**:
- Emissions of CO, NO, NO2, SO2, PM2.5, organic carbon, black carbon
- Fire radiative power

**Coverage**: Global, 2003 onwards

**Resolution**: ~0.1° × 0.1°

**Use Case**: Fire monitoring, emission inventories, air quality forecasting

---

## 10. CAMS Global Anthropogenic Emissions

**Dataset ID**: Various anthropogenic emission inventories

**Description**: Human-made emissions from various sectors.

**Available Variables**:
- Emissions by sector (energy, industry, transport, residential, agriculture)
- Major pollutants and greenhouse gases

**Coverage**: Global, typically by year

**Use Case**: Emission inventories, policy analysis, source apportionment

---

## Data Access Summary

| Dataset | Spatial Coverage | Temporal Range | Resolution | Update |
|---------|-----------------|----------------|------------|---------|
| **Global Forecasts** ⭐ | Global | 2016-present+5d | ~40km | Daily |
| **European Forecasts** | Europe | 2016-present+4d | ~10km | Daily |
| **Global Reanalysis** | Global | 2003-2022 | ~80km | Annual |
| **European Reanalysis** | Europe | 2016-2022 | ~10km | Annual |
| **GHG Reanalysis** | Global | 2003-present | ~80km | Monthly |
| **Fire Emissions** | Global | 2003-present | ~11km | Daily |

---

## How to Extend This Application

To fetch other datasets, modify `fetch_data.py`:

### Example: European Air Quality Forecasts

```python
def fetch_european_forecast(self, date, variable='nitrogen_dioxide'):
    request_params = {
        'model': 'ensemble',
        'date': date,
        'format': 'netcdf',
        'variable': variable,
        'type': 'forecast',
        'time': '00:00',
        'leadtime_hour': ['0', '24', '48', '72', '96'],
        'level': '0',
    }
    
    self.client.retrieve(
        'cams-europe-air-quality-forecasts',
        request_params,
        'data/european_forecast.nc'
    )
```

### Example: Global Reanalysis

```python
def fetch_global_reanalysis(self, year, month, variable='particulate_matter_2.5um'):
    request_params = {
        'variable': variable,
        'year': year,
        'month': month,
        'product_type': 'monthly_mean',
        'format': 'netcdf'
    }
    
    self.client.retrieve(
        'cams-global-reanalysis-eac4',
        request_params,
        'data/reanalysis.nc'
    )
```

---

## API Rate Limits and Queue System

- The ADS uses a queue system for data requests
- Large requests may take several minutes to process
- You can check request status at: https://ads.atmosphere.copernicus.eu/requests
- Recommended to limit spatial extent and temporal range for faster processing

---

## References

- [CAMS Data Catalogue](https://ads.atmosphere.copernicus.eu/catalogue)
- [CAMS Documentation](https://atmosphere.copernicus.eu/documentation)
- [CDS API How-to Guide](https://ads.atmosphere.copernicus.eu/how-to-api)
- [CAMS Product Quality Reports](https://atmosphere.copernicus.eu/quality-assurance)
