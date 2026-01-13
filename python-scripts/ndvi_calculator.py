#!/usr/bin/env python3
"""
NDVI Calculator
Calculates NDVI statistics from Sentinel-2 imagery using Google Earth Engine
"""

import argparse
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional

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


def retry_ee_operation(operation, max_retries: int = 3, delay: float = 2.0, operation_name: str = "operation"):
    """
    Retry an Earth Engine operation with exponential backoff
    
    Args:
        operation: Function that returns an Earth Engine operation result
        max_retries: Maximum number of retry attempts
        delay: Initial delay between retries in seconds
        operation_name: Name of the operation for error messages
    
    Returns:
        Result of the operation
    """
    last_error = None
    
    for attempt in range(max_retries):
        try:
            return operation()
        except ee.EEException as e:
            error_msg = str(e).lower()
            last_error = e
            
            # Check if it's a timeout or rate limit error
            if 'timeout' in error_msg or 'rate limit' in error_msg or 'quota' in error_msg:
                if attempt < max_retries - 1:
                    wait_time = delay * (2 ** attempt)  # Exponential backoff
                    print(f"Warning: {operation_name} failed (attempt {attempt + 1}/{max_retries}): {e}", file=sys.stderr)
                    print(f"Retrying in {wait_time:.1f} seconds...", file=sys.stderr)
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"Error: {operation_name} failed after {max_retries} attempts: {e}", file=sys.stderr)
                    raise
            else:
                # Non-retryable error
                print(f"Error: {operation_name} failed: {e}", file=sys.stderr)
                raise
        except Exception as e:
            # Non-EE exceptions are not retried
            print(f"Error: {operation_name} failed with unexpected error: {e}", file=sys.stderr)
            raise
    
    # Should not reach here, but handle it just in case
    if last_error:
        raise last_error
    raise RuntimeError(f"{operation_name} failed after {max_retries} attempts")


def calculate_ndvi(polygon: Dict[str, Any], start_date: str, end_date: str) -> Dict[str, Any]:
    """
    Calculate NDVI statistics for a polygon from Sentinel-2 imagery
    
    Args:
        polygon: GeoJSON polygon
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
    
    Returns:
        Dictionary with NDVI statistics
    """
    # Convert GeoJSON to Earth Engine Geometry
    try:
        if polygon.get('type') == 'Feature':
            coords = polygon['geometry']['coordinates']
        else:
            coords = polygon['coordinates']
        
        if not coords or len(coords) == 0:
            raise ValueError("Polygon coordinates are empty")
        
        ee_polygon = ee.Geometry.Polygon(coords)
    except Exception as e:
        print(f"Error: Invalid polygon geometry: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Load Sentinel-2 collection
    try:
        collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                      .filterDate(start_date, end_date)
                      .filterBounds(ee_polygon)
                      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))
        
        # Check if collection is empty
        def check_collection_size():
            return collection.size().getInfo()
        
        collection_size = retry_ee_operation(
            check_collection_size,
            max_retries=3,
            delay=2.0,
            operation_name="Checking image collection size"
        )
        
        if collection_size == 0:
            error_msg = (
                f"Error: No Sentinel-2 images found for the specified date range "
                f"({start_date} to {end_date}) and location.\n"
                "This may be due to:\n"
                "  - No images available in the date range\n"
                "  - All images have >20% cloud coverage\n"
                "  - Location is outside Sentinel-2 coverage area"
            )
            print(error_msg, file=sys.stderr)
            sys.exit(1)
        
        print(f"Found {collection_size} images in collection", file=sys.stderr)
        
    except Exception as e:
        print(f"Error: Failed to load Sentinel-2 collection: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Calculate average cloud coverage for all images
    def calculate_cloud_coverage():
        cloud_stats = collection.aggregate_mean('CLOUDY_PIXEL_PERCENTAGE').getInfo()
        return cloud_stats if cloud_stats is not None else 0.0
    
    try:
        avg_cloud_coverage = retry_ee_operation(
            calculate_cloud_coverage,
            max_retries=3,
            delay=1.0,
            operation_name="Calculating cloud coverage"
        )
    except Exception as e:
        print(f"Warning: Could not calculate cloud coverage: {e}", file=sys.stderr)
        avg_cloud_coverage = None
    
    # Calculate NDVI
    def add_ndvi(image):
        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        return image.addBands(ndvi)
    
    collection_with_ndvi = collection.map(add_ndvi)
    
    # Create median composite
    median_image = collection_with_ndvi.select('NDVI').median()
    
    # Calculate statistics with retry logic
    stats = median_image.reduceRegion(
        reducer=ee.Reducer.minMax().combine(
            reducer2=ee.Reducer.mean(),
            sharedInputs=True
        ).combine(
            reducer2=ee.Reducer.median(),
            sharedInputs=True
        ).combine(
            reducer2=ee.Reducer.stdDev(),
            sharedInputs=True
        ),
        geometry=ee_polygon,
        scale=10,  # 10m resolution
        maxPixels=1e9
    )
    
    # Get statistics with retry
    try:
        def get_stats():
            return stats.getInfo()
        
        ndvi_stats = retry_ee_operation(
            get_stats,
            max_retries=3,
            delay=2.0,
            operation_name="Calculating NDVI statistics"
        )
        
        if not ndvi_stats:
            raise ValueError("Statistics calculation returned empty result")
        
        mean = ndvi_stats.get('NDVI_mean', 0)
        median = ndvi_stats.get('NDVI_median', 0)
        std = ndvi_stats.get('NDVI_stdDev', 0)
        min_val = ndvi_stats.get('NDVI_min', 0)
        max_val = ndvi_stats.get('NDVI_max', 0)
        
        # Validate statistics are reasonable
        if mean is None or not isinstance(mean, (int, float)):
            raise ValueError("Invalid mean NDVI value")
        if median is None or not isinstance(median, (int, float)):
            raise ValueError("Invalid median NDVI value")
        
        # Generate image URL (thumbnail) with retry
        image_url = None
        try:
            def get_thumbnail():
                return median_image.getThumbURL({
                    'region': ee_polygon,
                    'dimensions': 512,
                    'format': 'png',
                    'palette': ['red', 'yellow', 'green']
                })
            
            image_url = retry_ee_operation(
                get_thumbnail,
                max_retries=2,
                delay=1.0,
                operation_name="Generating thumbnail"
            )
        except Exception as e:
            print(f"Warning: Could not generate thumbnail: {e}", file=sys.stderr)
            # Continue without thumbnail - not critical
        
        result = {
            'mean': round(float(mean), 4),
            'median': round(float(median), 4),
            'std': round(float(std), 4),
            'min': round(float(min_val), 4),
            'max': round(float(max_val), 4),
            'calculatedAt': datetime.now().isoformat()
        }
        
        if image_url:
            result['imageUrl'] = image_url
        
        if avg_cloud_coverage is not None:
            result['cloudCoverage'] = round(float(avg_cloud_coverage), 2)
        
        return result
        
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: Failed to calculate NDVI statistics: {e}", file=sys.stderr)
        print("This may be due to:", file=sys.stderr)
        print("  - Earth Engine timeout or rate limiting", file=sys.stderr)
        print("  - Polygon area too large", file=sys.stderr)
        print("  - Insufficient image data", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Calculate NDVI from Sentinel-2')
    parser.add_argument('--polygon', required=True, help='Path to GeoJSON polygon file')
    parser.add_argument('--start-date', required=True, help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end-date', required=True, help='End date (YYYY-MM-DD)')
    
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
    
    # Calculate NDVI
    result = calculate_ndvi(polygon, args.start_date, args.end_date)
    
    # Output JSON result
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
