#!/usr/bin/env python3
"""
Carbon Baseline Calculator
Calculates carbon baseline using allometric equations (Verra VM0042 methodology)
Supports satellite-based, field-based, and hybrid estimation methods
"""

import argparse
import json
import sys
import os
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    import ee
except ImportError:
    print("Error: earthengine-api not installed. Run: pip install earthengine-api", file=sys.stderr)
    sys.exit(1)


# Wood density database (g/cm³) - simplified
WOOD_DENSITY = {
    "Pinus caribaea": 0.51,
    "Pinus patula": 0.45,
    "Eucalyptus": 0.65,
    "Eucalyptus grandis": 0.55,
    "Acacia": 0.58,
    "Acacia mangium": 0.52,
    "Coffea arabica": 0.55,
    "Coffea": 0.55,
    "Inga": 0.52,
    "Cordia alliodora": 0.44,
    "Cedrela odorata": 0.42,
    "Swietenia macrophylla": 0.54,
    "Tectona grandis": 0.55,
    "default": 0.60
}


def initialize_gee() -> None:
    """Initialize Google Earth Engine"""
    try:
        ee.Initialize(project='nuwa-digital-twin')
    except Exception as e:
        print(f"Error initializing GEE: {e}", file=sys.stderr)
        print("Make sure you have authenticated with: earthengine authenticate", file=sys.stderr)
        sys.exit(1)


def calculate_agb_from_field_data(tree_inventory: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate AGB from tree measurements using Chave et al. 2014 allometric equation

    Args:
        tree_inventory: List of trees with species, dbh_cm, height_m, count

    Returns:
        Dictionary with total AGB and details
    """
    total_agb_kg = 0
    trees_analyzed = 0

    for tree in tree_inventory:
        species = tree.get('species', 'default')
        dbh_cm = tree.get('dbh_cm', tree.get('avgDbh', 0))
        height_m = tree.get('height_m', tree.get('avgHeight', 0))
        count = tree.get('count', 1)

        if dbh_cm <= 0 or height_m <= 0:
            continue

        # Get wood density for species
        rho = WOOD_DENSITY.get(species, WOOD_DENSITY['default'])

        # Chave et al. 2014 pantropical equation
        # AGB (kg) = 0.0673 × (ρ × DBH² × H)^0.976
        agb_kg = 0.0673 * ((rho * (dbh_cm ** 2) * height_m) ** 0.976)

        total_agb_kg += agb_kg * count
        trees_analyzed += count

    return {
        'total_agb_kg': total_agb_kg,
        'total_agb_tonnes': total_agb_kg / 1000,
        'trees_analyzed': trees_analyzed
    }


def calculate_agb_from_satellite(polygon: Dict[str, Any]) -> Dict[str, Any]:
    """
    Estimate AGB from NDVI correlation (simplified approach)
    Production implementation would use trained ML models

    Args:
        polygon: GeoJSON polygon

    Returns:
        Dictionary with AGB estimate and details
    """
    # Convert GeoJSON to Earth Engine Geometry
    if polygon.get('type') == 'Feature':
        coords = polygon['geometry']['coordinates']
    else:
        coords = polygon['coordinates']

    aoi = ee.Geometry.Polygon(coords)

    # Calculate area
    area_m2 = aoi.area().getInfo()
    area_ha = area_m2 / 10000

    print(f"Area: {area_ha:.2f} ha", file=sys.stderr)

    # Get Sentinel-2 NDVI for last year
    end_date = datetime.now()
    start_date = datetime(end_date.year - 1, 1, 1)

    collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                  .filterBounds(aoi)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))

    collection_size = collection.size().getInfo()
    if collection_size == 0:
        print("Warning: No satellite imagery available, using default estimation", file=sys.stderr)
        # Default to moderate forest biomass
        return {
            'total_agb_tonnes': area_ha * 50,  # Conservative 50 t/ha
            'agb_per_ha': 50,
            'area_ha': area_ha,
            'ndvi_mean': 0.5,
            'method': 'default_estimation'
        }

    print(f"Found {collection_size} Sentinel-2 images", file=sys.stderr)

    # Calculate NDVI
    def add_ndvi(img):
        return img.normalizedDifference(['B8', 'B4']).rename('NDVI')

    ndvi_collection = collection.map(add_ndvi)
    ndvi_median = ndvi_collection.median()

    ndvi_stats = ndvi_median.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=aoi,
        scale=10,
        maxPixels=1e9
    ).getInfo()

    ndvi_mean = ndvi_stats.get('NDVI', 0.5)
    print(f"Mean NDVI: {ndvi_mean:.4f}", file=sys.stderr)

    # Simplified AGB estimation from NDVI
    # Based on literature correlations for tropical/subtropical forests
    # AGB (t/ha) ≈ 150 * NDVI^2 for forested areas
    # This is a simplified model - production would use trained ML
    if ndvi_mean > 0.3:
        agb_per_ha = max(20, min(200, 150 * (ndvi_mean ** 2)))
    else:
        agb_per_ha = max(5, 50 * ndvi_mean)

    total_agb = agb_per_ha * area_ha

    return {
        'total_agb_tonnes': total_agb,
        'agb_per_ha': agb_per_ha,
        'area_ha': area_ha,
        'ndvi_mean': ndvi_mean,
        'method': 'ndvi_correlation'
    }


def calculate_carbon_baseline(
    polygon: Dict[str, Any],
    project_id: str,
    tree_inventory: Optional[List[Dict[str, Any]]] = None,
    method: str = 'satellite'
) -> Dict[str, Any]:
    """
    Calculate carbon baseline using specified method

    Args:
        polygon: GeoJSON polygon
        project_id: Project identifier
        tree_inventory: Optional list of tree measurements
        method: 'satellite', 'field', or 'hybrid'

    Returns:
        Dictionary with carbon baseline results
    """
    print(f"Calculating carbon baseline using {method} method...", file=sys.stderr)

    # Calculate area
    if polygon.get('type') == 'Feature':
        coords = polygon['geometry']['coordinates']
    else:
        coords = polygon['coordinates']

    aoi = ee.Geometry.Polygon(coords)
    area_m2 = aoi.area().getInfo()
    area_ha = area_m2 / 10000

    # Calculate AGB based on method
    trees_analyzed = 0

    if method == 'field' and tree_inventory and len(tree_inventory) > 0:
        # Field-based calculation
        field_result = calculate_agb_from_field_data(tree_inventory)
        total_agb = field_result['total_agb_tonnes']
        agb_per_ha = total_agb / area_ha if area_ha > 0 else 0
        trees_analyzed = field_result['trees_analyzed']
        confidence = 'high' if trees_analyzed >= 10 else 'medium'

    elif method == 'hybrid' and tree_inventory and len(tree_inventory) > 0:
        # Hybrid: average of field and satellite estimates
        field_result = calculate_agb_from_field_data(tree_inventory)
        sat_result = calculate_agb_from_satellite(polygon)

        field_agb = field_result['total_agb_tonnes']
        sat_agb = sat_result['total_agb_tonnes']

        # Weight field data more heavily if many trees sampled
        field_weight = min(0.7, 0.3 + (field_result['trees_analyzed'] / 100))
        sat_weight = 1 - field_weight

        total_agb = (field_agb * field_weight) + (sat_agb * sat_weight)
        agb_per_ha = total_agb / area_ha if area_ha > 0 else 0
        trees_analyzed = field_result['trees_analyzed']
        confidence = 'high'

    else:
        # Satellite-based estimation
        sat_result = calculate_agb_from_satellite(polygon)
        total_agb = sat_result['total_agb_tonnes']
        agb_per_ha = sat_result['agb_per_ha']
        confidence = 'medium'

    # Convert AGB to Carbon (47% of biomass is carbon)
    total_carbon = total_agb * 0.47

    # Add belowground biomass estimate (20% of aboveground for tropical systems)
    total_carbon_with_bgb = total_carbon * 1.2

    # Convert Carbon to CO2e (molecular weight ratio: 44/12 = 3.67)
    total_co2e = total_carbon_with_bgb * (44 / 12)

    print(f"Total AGB: {total_agb:.2f} tonnes", file=sys.stderr)
    print(f"Total Carbon: {total_carbon:.2f} tonnes C", file=sys.stderr)
    print(f"Total CO2e: {total_co2e:.2f} tCO2e", file=sys.stderr)

    # Build result
    result = {
        'baselineCarbonTCO2e': round(total_co2e, 2),
        'agbTonnesPerHa': round(agb_per_ha, 2),
        'totalAgbTonnes': round(total_agb, 2),
        'totalCarbonTonnes': round(total_carbon_with_bgb, 2),
        'areaHa': round(area_ha, 4),
        'methodology': method,
        'confidence': confidence,
        'treesAnalyzed': trees_analyzed,
        'calculationDate': datetime.now().isoformat(),
        'equation': 'Chave et al. 2014 (pantropical)',
        'verraMethodology': 'VM0042',
        'breakdown': {
            'abovegroundBiomass': round(total_carbon, 2),
            'belowgroundBiomass': round(total_carbon * 0.2, 2)
        }
    }

    return result


def main():
    parser = argparse.ArgumentParser(description='Calculate carbon baseline')
    parser.add_argument('--polygon', required=True, help='Path to GeoJSON polygon file')
    parser.add_argument('--project-id', required=True, help='Project identifier')
    parser.add_argument('--tree-inventory', help='Path to tree inventory JSON file')
    parser.add_argument('--biomass-method', default='satellite',
                       choices=['satellite', 'field', 'hybrid'],
                       help='Method for biomass estimation')

    # Legacy arguments for backwards compatibility
    parser.add_argument('--farm-data', help='(Legacy) Path to farm data JSON file')

    args = parser.parse_args()

    # Load polygon
    try:
        with open(args.polygon, 'r') as f:
            polygon = json.load(f)
    except Exception as e:
        print(f"Error loading polygon: {e}", file=sys.stderr)
        sys.exit(1)

    # Load tree inventory if provided
    tree_inventory = None
    if args.tree_inventory and os.path.exists(args.tree_inventory):
        try:
            with open(args.tree_inventory, 'r') as f:
                tree_inventory = json.load(f)
            if not isinstance(tree_inventory, list):
                tree_inventory = None
            print(f"Loaded {len(tree_inventory) if tree_inventory else 0} trees from inventory", file=sys.stderr)
        except Exception as e:
            print(f"Warning: Could not load tree inventory: {e}", file=sys.stderr)

    # Initialize GEE
    initialize_gee()

    # Calculate baseline
    try:
        result = calculate_carbon_baseline(
            polygon,
            args.project_id,
            tree_inventory,
            args.biomass_method
        )
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error calculating carbon baseline: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
