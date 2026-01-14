#!/usr/bin/env python3
"""
Analiza una finca desde archivo JSON local
Combina: NDVI + Deforestacion EUDR + Carbon Baseline

Uso:
    python scripts/local-analysis/analyze_farm.py data/farms/input/mi_finca.json

Opciones:
    --ndvi-only              Solo calcular NDVI
    --deforestation-only     Solo analizar deforestacion
    --carbon-only            Solo calcular carbono
    --start-date YYYY-MM-DD  Fecha inicio para NDVI (default: 2024-01-01)
    --end-date YYYY-MM-DD    Fecha fin para NDVI (default: 2024-12-31)
    --output PATH            Archivo de salida (default: auto)
"""

import json
import sys
import os
import argparse
from datetime import datetime, timedelta
from pathlib import Path

try:
    import ee
except ImportError:
    print("Error: earthengine-api not installed. Run: pip install earthengine-api")
    sys.exit(1)

# Initialize Earth Engine
PROJECT_ID = 'nuwa-digital-twin'

# Only initialize EE when run as main script, not on import
# This allows batch_process.py to import functions without initializing EE
if __name__ == '__main__':
    try:
        ee.Initialize(project=PROJECT_ID)
    except Exception as e:
        print(f"Error inicializando Earth Engine: {e}")
        print("   Ejecuta: earthengine authenticate --project=nuwa-digital-twin")
        sys.exit(1)

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def _strip_z_coordinates(coords):
    """
    Remove Z coordinate from GeoJSON coordinates (3D -> 2D).

    Works recursively for Polygon / MultiPolygon style coordinate arrays.
    """
    # Base case: a single coordinate like [x, y] or [x, y, z]
    if isinstance(coords, list) and coords and isinstance(coords[0], (int, float)):
        # Keep only X, Y
        return coords[:2]

    # Recursive case: list of coordinates / rings / polygons
    if isinstance(coords, list):
        return [_strip_z_coordinates(c) for c in coords]

    # Any other structure, return as-is
    return coords


def _normalize_geometry(geometry):
    """
    Normaliza una geometria GeoJSON a formato interno:
    { "type": "Polygon", "coordinates": [...] }

    - Elimina coordenada Z si existe
    - Si es MultiPolygon, toma el primer poligono como representativo
    """
    if not isinstance(geometry, dict):
        raise ValueError("Geometria invalida: se esperaba un objeto GeoJSON")

    geom_type = geometry.get('type')
    coords = geometry.get('coordinates')

    if not geom_type or coords is None:
        raise ValueError("Geometria invalida: falta 'type' o 'coordinates'")

    # Strip Z dimension from all coordinates
    coords_2d = _strip_z_coordinates(coords)

    # Si es MultiPolygon, usamos el primer poligono como representativo
    if geom_type == 'MultiPolygon':
        if not coords_2d or not isinstance(coords_2d[0], list):
            raise ValueError("MultiPolygon invalido: sin poligonos")
        # Tomar el primer poligono (lista de anillos)
        coords_2d = coords_2d[0]
        geom_type = 'Polygon'

    return {
        'type': geom_type,
        'coordinates': coords_2d
    }


def _extract_from_properties(props):
    """
    Extrae campos estandarizados desde propiedades de Feature.
    Maneja variantes:
      - name / Name
      - owner / Owner
      - Description
    """
    props = props or {}

    def _first_present(keys):
        for key in keys:
            value = props.get(key)
            if value:
                return value
        return None

    name = _first_present(['name', 'Name', 'Description'])
    owner = _first_present(['owner', 'Owner'])

    return name, owner


def load_farm_json(json_path):
    """Carga datos de finca desde JSON local y normaliza a formato interno.

    Soporta:
      1. FeatureCollection (GeoJSON estandar)
      2. Feature simple (GeoJSON)
      3. JSON simple con campo 'polygon' (formato interno/custom)

    Formato interno resultante:
    {
      "polygon": { "type": "...", "coordinates": [...] },  # siempre 2D
      "name": str,
      "farmId": str,
      "owner": str | None,
      "metadata": dict,
      ... (otros campos originales utiles, p.ej. location, treeInventory)
    }
    """
    if not os.path.exists(json_path):
        raise FileNotFoundError(f"Archivo no encontrado: {json_path}")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    filename_stem = Path(json_path).stem
    generated_farm_id = f"farm-{filename_stem.replace(' ', '-').lower()}"

    polygon = None
    name = None
    owner = None
    metadata = {}

    # ----------------------------------------------------------------------
    # 1) FeatureCollection (GeoJSON estandar)
    # ----------------------------------------------------------------------
    if isinstance(data, dict) and data.get('type') == 'FeatureCollection':
        features = data.get('features') or []
        if not features:
            raise ValueError("FeatureCollection vacia: no hay features")

        feature = features[0]
        geometry = feature.get('geometry')
        if not geometry:
            raise ValueError("FeatureCollection invalida: feature sin geometria")

        polygon = _normalize_geometry(geometry)

        props = feature.get('properties') or {}
        name_from_props, owner_from_props = _extract_from_properties(props)
        name = name_from_props
        owner = owner_from_props

        # Metadata combina propiedades + cualquier metadata existente
        metadata = {
            **props,
            **data.get('metadata', {})
        }

    # ----------------------------------------------------------------------
    # 2) Feature simple (GeoJSON)
    # ----------------------------------------------------------------------
    elif isinstance(data, dict) and data.get('type') == 'Feature':
        geometry = data.get('geometry')
        if not geometry:
            raise ValueError("Feature invalido: falta geometria")

        polygon = _normalize_geometry(geometry)

        props = data.get('properties') or {}
        name_from_props, owner_from_props = _extract_from_properties(props)
        name = name_from_props
        owner = owner_from_props

        metadata = {
            **props,
            **data.get('metadata', {})
        }

    # ----------------------------------------------------------------------
    # 3) JSON simple con campo 'polygon' (formato interno/custom)
    # ----------------------------------------------------------------------
    elif isinstance(data, dict) and 'polygon' in data:
        raw_polygon = data['polygon']

        # Permitir que 'polygon' sea una geometria directa o un Feature
        if isinstance(raw_polygon, dict) and raw_polygon.get('type') == 'Feature':
            geometry = raw_polygon.get('geometry')
            if not geometry:
                raise ValueError("Feature en 'polygon' invalido: falta geometria")
            polygon = _normalize_geometry(geometry)
        else:
            polygon = _normalize_geometry(raw_polygon)

        name = data.get('name') or data.get('Name')
        owner = data.get('owner') or data.get('Owner')
        metadata = data.get('metadata', {})

    else:
        raise ValueError(
            "Formato de finca no soportado. Se esperaba FeatureCollection, "
            "Feature o JSON con campo 'polygon'."
        )

    if not polygon:
        raise ValueError("No se pudo extraer poligono de la finca")

    # Fallbacks para name / owner / farmId
    if not name:
        # Intentar de nuevo en el nivel raiz si existiera
        name = data.get('name') or data.get('Name') or filename_stem

    if not owner:
        owner = data.get('owner') or data.get('Owner')

    farm_id = (
        data.get('farmId')
        or data.get('projectId')
        or generated_farm_id
    )

    # Asegurar que metadata siempre es un dict
    if not isinstance(metadata, dict):
        metadata = {'value': metadata}

    # Construir objeto normalizado manteniendo campos utiles existentes
    normalized = {
        'polygon': polygon,
        'name': name,
        'farmId': farm_id,
        'owner': owner,
        'metadata': metadata
    }

    # Preservar algunos campos comunes si estaban presentes
    for key in ('location', 'treeInventory'):
        if key in data:
            normalized[key] = data[key]

    return normalized

def print_header(text):
    """Imprime header decorado"""
    print(f"\n{'='*70}")
    print(f"  {text}")
    print(f"{'='*70}\n")

def print_section(text):
    """Imprime seccion"""
    print(f"\n{'-'*70}")
    print(f"  {text}")
    print(f"{'-'*70}")

# ============================================================================
# NDVI CALCULATION
# ============================================================================

def calculate_ndvi(polygon, start_date, end_date):
    """Calcula NDVI para un poligono"""
    print_section("CALCULANDO NDVI")
    print(f"   Periodo: {start_date} -> {end_date}")

    # Handle both Feature and Polygon formats
    if polygon.get('type') == 'Feature':
        coords = polygon['geometry']['coordinates']
    else:
        coords = polygon['coordinates']

    aoi = ee.Geometry.Polygon(coords)

    collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterDate(start_date, end_date)
                  .filterBounds(aoi)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))

    count = collection.size().getInfo()
    print(f"   Imagenes encontradas: {count}")

    if count == 0:
        return {'error': 'No se encontraron imagenes Sentinel-2'}

    # Calculate NDVI
    def add_ndvi(img):
        return img.normalizedDifference(['B8', 'B4']).rename('NDVI')

    ndvi_collection = collection.map(add_ndvi)
    ndvi_composite = ndvi_collection.select('NDVI').median()

    # Statistics
    stats = ndvi_composite.reduceRegion(
        reducer=ee.Reducer.mean()
            .combine(ee.Reducer.median(), '', True)
            .combine(ee.Reducer.stdDev(), '', True)
            .combine(ee.Reducer.minMax(), '', True),
        geometry=aoi,
        scale=10,
        maxPixels=1e9
    ).getInfo()

    # Thumbnail
    vis_params = {'min': 0, 'max': 1, 'palette': ['red', 'yellow', 'green']}
    thumbnail_url = ndvi_composite.getThumbURL({
        'region': aoi,
        'dimensions': 512,
        'format': 'png',
        **vis_params
    })

    result = {
        'mean': round(float(stats.get('NDVI_mean', 0)), 3),
        'median': round(float(stats.get('NDVI_median', 0)), 3),
        'std': round(float(stats.get('NDVI_stdDev', 0)), 3),
        'min': round(float(stats.get('NDVI_min', 0)), 3),
        'max': round(float(stats.get('NDVI_max', 0)), 3),
        'imageUrl': thumbnail_url,
        'imagesUsed': count,
        'dateRange': f"{start_date} to {end_date}",
        'timestamp': datetime.now().isoformat()
    }

    print(f"   [OK] NDVI Media: {result['mean']:.3f}")
    print(f"   [OK] NDVI Mediana: {result['median']:.3f}")
    print(f"   [OK] Rango: {result['min']:.3f} - {result['max']:.3f}")

    return result

# ============================================================================
# DEFORESTATION ANALYSIS
# ============================================================================

def analyze_deforestation(polygon, farm_id):
    """Analiza deforestacion en ultimos 5 anios"""
    print_section("ANALIZANDO DEFORESTACION (EUDR)")

    # Handle both Feature and Polygon formats
    if polygon.get('type') == 'Feature':
        coords = polygon['geometry']['coordinates']
    else:
        coords = polygon['coordinates']

    aoi = ee.Geometry.Polygon(coords)

    # Dates
    end_date = datetime.now()
    start_date = end_date - timedelta(days=5*365)
    start_year = start_date.year
    end_year = end_date.year

    print(f"   Periodo: {start_year} -> {end_year} (5 anios)")

    # Hansen Global Forest Change (2024 version)
    hansen = ee.Image('UMD/hansen/global_forest_change_2024_v1_12')
    loss_year = hansen.select(['lossyear'])
    tree_cover = hansen.select(['treecover2000'])

    # Loss mask
    loss_mask = loss_year.gte(start_year - 2000).And(loss_year.lte(end_year - 2000))
    tree_cover_thresh = tree_cover.gte(30)

    # Initial area
    initial_forest_result = tree_cover_thresh.multiply(ee.Image.pixelArea()).reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=aoi,
        scale=30,
        maxPixels=1e9
    ).getInfo()

    initial_forest_area = initial_forest_result.get('treecover2000', 0) or 0

    # Lost area
    forest_loss_result = loss_mask.multiply(tree_cover_thresh).multiply(ee.Image.pixelArea()).reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=aoi,
        scale=30,
        maxPixels=1e9
    ).getInfo()

    forest_loss = forest_loss_result.get('lossyear', 0) or 0

    # Convert to hectares
    initial_forest_ha = initial_forest_area / 10000
    loss_ha = forest_loss / 10000
    deforestation_percent = (loss_ha / initial_forest_ha * 100) if initial_forest_ha > 0 else 0

    # EUDR compliance
    compliant = deforestation_percent < 5.0

    # Change visualization
    loss_visualization = loss_mask.updateMask(loss_mask).visualize(palette=['red'])
    change_url = loss_visualization.getThumbURL({
        'region': aoi,
        'dimensions': 512,
        'format': 'png'
    })

    # Historical images
    historical_images = []
    print(f"   Generando imagenes historicas...")
    for year in range(start_year, end_year + 1):
        year_start = f"{year}-06-01"
        year_end = f"{year}-08-31"

        collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                     .filterDate(year_start, year_end)
                     .filterBounds(aoi)
                     .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))

        if collection.size().getInfo() > 0:
            composite = collection.median()
            thumbnail = composite.getThumbURL({
                'region': aoi,
                'dimensions': 512,
                'bands': ['B4', 'B3', 'B2'],
                'min': 0,
                'max': 3000,
                'format': 'png'
            })
            historical_images.append({'year': year, 'url': thumbnail})

    result = {
        'deforestationPercent': round(deforestation_percent, 2),
        'areaLostHa': round(loss_ha, 2),
        'initialForestHa': round(initial_forest_ha, 2),
        'compliant': compliant,
        'historicalImages': historical_images,
        'changeDetectionUrl': change_url,
        'analysisDate': datetime.now().isoformat(),
        'methodology': 'Hansen GFC + Sentinel-2 validation',
        'periodAnalyzed': f"{start_year} - {end_year}"
    }

    status = "[OK] CUMPLE" if compliant else "[X] NO CUMPLE"
    print(f"   {status} EUDR")
    print(f"   Deforestacion: {result['deforestationPercent']:.2f}%")
    print(f"   Area inicial: {result['initialForestHa']:.2f} ha")
    print(f"   Area perdida: {result['areaLostHa']:.2f} ha")
    print(f"   Imagenes historicas: {len(historical_images)}")

    return result

# ============================================================================
# CARBON BASELINE
# ============================================================================

# Wood density database (g/cm3)
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

def calculate_carbon_baseline(polygon, farm_id, tree_inventory=None):
    """Calcula linea base de carbono"""
    print_section("CALCULANDO LINEA BASE DE CARBONO")

    # Handle both Feature and Polygon formats
    if polygon.get('type') == 'Feature':
        coords = polygon['geometry']['coordinates']
    else:
        coords = polygon['coordinates']

    aoi = ee.Geometry.Polygon(coords)
    area_m2 = aoi.area().getInfo()
    area_ha = area_m2 / 10000

    print(f"   Area: {area_ha:.2f} ha")

    # Determine method
    if tree_inventory and len(tree_inventory) > 0:
        method = 'field'
        print(f"   Metodo: Campo (inventario de {len(tree_inventory)} arboles)")

        # Calculate from field data using Chave et al. 2014
        total_agb_kg = 0
        trees_analyzed = 0

        for tree in tree_inventory:
            species = tree.get('species', 'default')
            dbh_cm = tree.get('dbh_cm', tree.get('avgDbh', 0))
            height_m = tree.get('height_m', tree.get('avgHeight', 0))
            count = tree.get('count', 1)

            if dbh_cm <= 0 or height_m <= 0:
                continue

            rho = WOOD_DENSITY.get(species, WOOD_DENSITY['default'])

            # Chave et al. 2014 pantropical equation
            # AGB (kg) = 0.0673 * (rho * DBH^2 * H)^0.976
            agb_kg = 0.0673 * ((rho * (dbh_cm ** 2) * height_m) ** 0.976)
            total_agb_kg += agb_kg * count
            trees_analyzed += count

        total_agb = total_agb_kg / 1000  # kg to tonnes
        agb_per_ha = total_agb / area_ha if area_ha > 0 else 0
        confidence = 'high' if trees_analyzed >= 10 else 'medium'

    else:
        method = 'satellite'
        print(f"   Metodo: Satelital (NDVI)")
        trees_analyzed = 0

        # Satellite estimation
        end_date = datetime.now()
        start_date = datetime(end_date.year - 1, 1, 1)

        collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                     .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                     .filterBounds(aoi)
                     .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))

        collection_size = collection.size().getInfo()

        if collection_size == 0:
            print("   Advertencia: Sin imagenes satelitales, usando estimacion por defecto")
            agb_per_ha = 50  # Conservative default
            total_agb = agb_per_ha * area_ha
            confidence = 'low'
        else:
            print(f"   Imagenes Sentinel-2: {collection_size}")

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
            print(f"   NDVI medio: {ndvi_mean:.4f}")

            # Simplified AGB estimation from NDVI
            # Based on literature correlations for tropical/subtropical forests
            if ndvi_mean > 0.3:
                agb_per_ha = max(20, min(200, 150 * (ndvi_mean ** 2)))
            else:
                agb_per_ha = max(5, 50 * ndvi_mean)

            total_agb = agb_per_ha * area_ha
            confidence = 'medium'

    # Convert AGB to Carbon (47% of biomass is carbon)
    total_carbon = total_agb * 0.47

    # Add belowground biomass estimate (20% of aboveground for tropical systems)
    total_carbon_with_bgb = total_carbon * 1.2

    # Convert Carbon to CO2e (molecular weight ratio: 44/12 = 3.67)
    total_co2e = total_carbon_with_bgb * (44 / 12)

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

    print(f"   [OK] Carbono Baseline: {result['baselineCarbonTCO2e']:.2f} tCO2e")
    print(f"   [OK] Biomasa: {result['agbTonnesPerHa']:.2f} t/ha")
    print(f"   [OK] Confianza: {confidence}")

    return result

# ============================================================================
# MAIN FUNCTION
# ============================================================================

def main():
    # Initialize Earth Engine when run as main script
    try:
        ee.Initialize(project=PROJECT_ID)
    except Exception as e:
        print(f"Error inicializando Earth Engine: {e}")
        print("   Ejecuta: earthengine authenticate --project=nuwa-digital-twin")
        sys.exit(1)
    
    parser = argparse.ArgumentParser(
        description='Analiza una finca desde archivo JSON local',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  # Analisis completo
  python scripts/local-analysis/analyze_farm.py data/farms/input/finca.json

  # Solo NDVI
  python scripts/local-analysis/analyze_farm.py data/farms/input/finca.json --ndvi-only

  # Con fechas especificas
  python scripts/local-analysis/analyze_farm.py data/farms/input/finca.json --start-date 2023-06-01 --end-date 2023-08-31
        """
    )

    parser.add_argument('json_file', help='Ruta al archivo JSON de la finca')
    parser.add_argument('--ndvi-only', action='store_true', help='Solo calcular NDVI')
    parser.add_argument('--deforestation-only', action='store_true', help='Solo analizar deforestacion')
    parser.add_argument('--carbon-only', action='store_true', help='Solo calcular carbono')
    parser.add_argument('--start-date', default='2024-01-01', help='Fecha inicio NDVI (YYYY-MM-DD)')
    parser.add_argument('--end-date', default='2024-12-31', help='Fecha fin NDVI (YYYY-MM-DD)')
    parser.add_argument('--output', help='Archivo de salida')

    args = parser.parse_args()

    try:
        # Load farm data
        print_header("ANALISIS DE FINCA - NUWA DIGITAL TWIN")

        farm_data = load_farm_json(args.json_file)
        polygon = farm_data['polygon']

        print(f"   Archivo: {args.json_file}")
        print(f"   Finca: {farm_data.get('name', 'Sin nombre')}")
        print(f"   ID: {farm_data.get('farmId', farm_data.get('projectId', 'N/A'))}")
        print(f"   Propietario: {farm_data.get('owner', 'N/A')}")

        results = {}

        # NDVI
        if not args.deforestation_only and not args.carbon_only:
            try:
                ndvi_result = calculate_ndvi(polygon, args.start_date, args.end_date)
                results['ndvi'] = ndvi_result
            except Exception as e:
                print(f"   [ERROR] NDVI: {e}")
                results['ndvi'] = {'error': str(e)}

        # Deforestation
        if not args.ndvi_only and not args.carbon_only:
            try:
                deforest_result = analyze_deforestation(
                    polygon,
                    farm_data.get('farmId', farm_data.get('projectId', 'unknown'))
                )
                results['deforestation'] = deforest_result
            except Exception as e:
                print(f"   [ERROR] Deforestacion: {e}")
                results['deforestation'] = {'error': str(e)}

        # Carbon
        if not args.ndvi_only and not args.deforestation_only:
            try:
                tree_inventory = farm_data.get('treeInventory', None)
                carbon_result = calculate_carbon_baseline(
                    polygon,
                    farm_data.get('farmId', farm_data.get('projectId', 'unknown')),
                    tree_inventory
                )
                results['carbon'] = carbon_result
            except Exception as e:
                print(f"   [ERROR] Carbono: {e}")
                results['carbon'] = {'error': str(e)}

        # Save results
        output = {
            'farmInfo': {
                'name': farm_data.get('name', 'N/A'),
                'farmId': farm_data.get('farmId', farm_data.get('projectId', 'N/A')),
                'owner': farm_data.get('owner', 'N/A'),
                'location': farm_data.get('location', {})
            },
            'polygon': farm_data['polygon'],
            'metadata': farm_data.get('metadata', {}),
            'analysis': results,
            'generatedAt': datetime.now().isoformat()
        }

        if args.output:
            output_path = args.output
        else:
            input_filename = Path(args.json_file).stem
            os.makedirs('data/farms/output', exist_ok=True)
            output_path = f"data/farms/output/{input_filename}_analysis.json"

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print_header("ANALISIS COMPLETADO")
        print(f"   Resultados guardados en: {output_path}")

        # Summary
        print("\n   RESUMEN:")
        if 'ndvi' in results and 'error' not in results['ndvi']:
            print(f"   - NDVI: {results['ndvi']['mean']:.3f}")
        if 'deforestation' in results and 'error' not in results['deforestation']:
            status = "[OK] CUMPLE" if results['deforestation']['compliant'] else "[X] NO CUMPLE"
            print(f"   - EUDR: {status} ({results['deforestation']['deforestationPercent']}%)")
        if 'carbon' in results and 'error' not in results['carbon']:
            print(f"   - Carbono: {results['carbon']['baselineCarbonTCO2e']:.2f} tCO2e")

        print()

    except Exception as e:
        print(f"\n   [ERROR]: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
