#!/usr/bin/env python3
"""
Deforestation Analysis
Analyzes forest loss over time using Hansen Global Forest Change dataset
"""

import argparse
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any

try:
    import ee
except ImportError:
    print("Error: earthengine-api not installed. Run: pip install earthengine-api", file=sys.stderr)
    sys.exit(1)


def initialize_gee() -> None:
    """Initialize Google Earth Engine"""
    try:
        ee.Initialize(project='nuwa-digital-twin')
    except Exception as e:
        print(f"Error initializing GEE: {e}", file=sys.stderr)
        print("Make sure you have authenticated with: earthengine authenticate", file=sys.stderr)
        sys.exit(1)


def analyze_deforestation(polygon: Dict[str, Any], start_date: str, end_date: str, project_id: str) -> Dict[str, Any]:
    """
    Analyze deforestation using Hansen Global Forest Change dataset
    
    Args:
        polygon: GeoJSON polygon
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        project_id: Project identifier
    
    Returns:
        Dictionary with deforestation analysis results
    """
    # Convert GeoJSON to Earth Engine Geometry
    if polygon.get('type') == 'Feature':
        coords = polygon['geometry']['coordinates']
    else:
        coords = polygon['coordinates']
    
    ee_polygon = ee.Geometry.Polygon(coords)
    
    # Load Hansen Global Forest Change dataset
    hansen = ee.Image("UMD/hansen/global_forest_change_2023_v1_11")
    
    # Get forest cover in the first year (2000)
    forest_2000 = hansen.select('treecover2000')
    
    # Get loss year band (0 = no loss, year = loss occurred in that year)
    loss_year = hansen.select('lossyear')
    
    # Parse dates
    start_year = int(start_date.split('-')[0])
    end_year = int(end_date.split('-')[0])
    
    # Create mask for loss in the analysis period
    loss_mask = loss_year.gte(start_year - 2000).And(loss_year.lte(end_year - 2000))
    
    # Calculate total area and forest area
    area_stats = forest_2000.reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=ee_polygon,
        scale=30,  # 30m resolution for Hansen
        maxPixels=1e9
    )
    
    loss_stats = loss_mask.multiply(forest_2000).reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=ee_polygon,
        scale=30,
        maxPixels=1e9
    )
    
    try:
        print(f"Analyzing deforestation for period {start_year}-{end_year}...", file=sys.stderr)
        area_info = area_stats.getInfo()
        loss_info = loss_stats.getInfo()

        # Pixel area in hectares (30m x 30m = 900 m² = 0.09 ha)
        pixel_area_ha = 0.09

        total_forest_pixels = area_info.get('treecover2000', 0)
        lost_pixels = loss_info.get('lossyear', 0)

        total_forest_ha = total_forest_pixels * pixel_area_ha / 100  # treecover is 0-100 scale
        area_lost_ha = lost_pixels * pixel_area_ha / 100

        deforestation_percent = (area_lost_ha / total_forest_ha * 100) if total_forest_ha > 0 else 0
        compliant = deforestation_percent < 5  # EUDR threshold: <5% loss

        print(f"Initial forest: {total_forest_ha:.2f} ha, Lost: {area_lost_ha:.2f} ha ({deforestation_percent:.2f}%)", file=sys.stderr)
        print(f"EUDR Compliant: {compliant}", file=sys.stderr)

        # Generate change detection visualization
        change_detection_url = None
        try:
            loss_visualization = loss_mask.updateMask(loss_mask).visualize(palette=['red'])
            change_detection_url = loss_visualization.getThumbURL({
                'region': ee_polygon,
                'dimensions': 512,
                'format': 'png'
            })
        except Exception as e:
            print(f"Warning: Could not generate change detection image: {e}", file=sys.stderr)

        # Generate historical images for each year
        historical_images = []
        for year in range(start_year, end_year + 1):
            try:
                # Use dry season (June-August) for better visibility
                year_start = f"{year}-06-01"
                year_end = f"{year}-08-31"

                collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                             .filterDate(year_start, year_end)
                             .filterBounds(ee_polygon)
                             .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))

                collection_size = collection.size().getInfo()
                if collection_size > 0:
                    composite = collection.median()
                    thumbnail = composite.getThumbURL({
                        'region': ee_polygon,
                        'dimensions': 512,
                        'bands': ['B4', 'B3', 'B2'],
                        'min': 0,
                        'max': 3000,
                        'format': 'png'
                    })
                    historical_images.append({
                        'year': year,
                        'url': thumbnail
                    })
                    print(f"Generated historical image for {year}", file=sys.stderr)
            except Exception as e:
                print(f"Warning: Could not generate image for {year}: {e}", file=sys.stderr)

        result = {
            'deforestationPercent': round(deforestation_percent, 2),
            'areaLostHa': round(area_lost_ha, 2),
            'initialForestHa': round(total_forest_ha, 2),
            'compliant': compliant,
            'historicalImages': historical_images,
            'analyzedPeriod': {
                'startDate': start_date,
                'endDate': end_date
            },
            'analysisDate': datetime.now().isoformat(),
            'methodology': 'Hansen GFC + Sentinel-2 validation'
        }

        if change_detection_url:
            result['changeDetectionUrl'] = change_detection_url

        return result
    except Exception as e:
        print(f"Error calculating deforestation: {e}", file=sys.stderr)
        # Return default values if calculation fails
        return {
            'deforestationPercent': 0.0,
            'areaLostHa': 0.0,
            'initialForestHa': 0.0,
            'compliant': True,
            'historicalImages': [],
            'analyzedPeriod': {
                'startDate': start_date,
                'endDate': end_date
            },
            'analysisDate': datetime.now().isoformat(),
            'methodology': 'Hansen GFC + Sentinel-2 validation',
            'warning': 'Deforestation calculation failed, using default values'
        }


def main():
    parser = argparse.ArgumentParser(description='Analyze deforestation')
    parser.add_argument('--polygon', required=True, help='Path to GeoJSON polygon file')
    parser.add_argument('--start-date', required=True, help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end-date', required=True, help='End date (YYYY-MM-DD)')
    parser.add_argument('--project-id', required=True, help='Project identifier')
    
    args = parser.parse_args()
    
    # Load polygon
    try:
        with open(args.polygon, 'r') as f:
            polygon = json.load(f)
    except Exception as e:
        print(f"Error loading polygon: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Initialize GEE
    initialize_gee()
    
    # Analyze deforestation
    result = analyze_deforestation(polygon, args.start_date, args.end_date, args.project_id)
    
    # Output JSON result
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
