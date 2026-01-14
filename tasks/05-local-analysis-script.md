# Task: Create Local Farm Analysis Script

## Context
Create a Python script that analyzes a farm from a local JSON file, combining NDVI, deforestation, and carbon baseline calculations. The script should be standalone and easy to use.

## Technical Requirements

### Main Script (scripts/local-analysis/analyze_farm.py)
- Accept JSON file path as first argument
- Load farm data from JSON file
- Execute 3 analyses sequentially:
  1. NDVI calculation
  2. Deforestation analysis (EUDR)
  3. Carbon baseline calculation
- Save complete results to output folder
- Show progress and results in console
- Handle errors gracefully

### Input JSON Format
```json
{
  "name": "Finca Example",
  "farmId": "farm-001",
  "owner": "Owner Name",
  "location": {
    "municipality": "Líbano",
    "department": "Tolima",
    "country": "Colombia"
  },
  "polygon": {
    "type": "Polygon",
    "coordinates": [[
      [-75.0639, 4.9214],
      [-75.0629, 4.9214],
      [-75.0629, 4.9204],
      [-75.0639, 4.9204],
      [-75.0639, 4.9214]
    ]]
  },
  "metadata": {
    "areaHa": 10.5,
    "crops": ["café", "plátano"],
    "registrationDate": "2024-01-15"
  },
  "treeInventory": [
    {
      "species": "Pinus caribaea",
      "dbh_cm": 25,
      "height_m": 15
    }
  ]
}
```

### Script Implementation
```python
#!/usr/bin/env python3
"""
Analiza una finca desde archivo JSON local
Combina: NDVI + Deforestación EUDR + Carbon Baseline

Uso:
    python scripts/local-analysis/analyze_farm.py data/farms/input/mi_finca.json
    
Opciones:
    --ndvi-only              Solo calcular NDVI
    --deforestation-only     Solo analizar deforestación
    --carbon-only            Solo calcular carbono
    --start-date YYYY-MM-DD  Fecha inicio para NDVI (default: 2024-01-01)
    --end-date YYYY-MM-DD    Fecha fin para NDVI (default: 2024-12-31)
    --output PATH            Archivo de salida (default: auto)
"""

import ee
import json
import sys
import os
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# Initialize Earth Engine
PROJECT_ID = 'nuwa-digital-twin'

try:
    ee.Initialize(project=PROJECT_ID)
except Exception as e:
    print(f"❌ Error inicializando Earth Engine: {e}")
    print("   Ejecuta: earthengine authenticate --project=nuwa-digital-twin")
    sys.exit(1)

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def load_farm_json(json_path):
    """Carga datos de finca desde JSON"""
    if not os.path.exists(json_path):
        raise FileNotFoundError(f"Archivo no encontrado: {json_path}")
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if 'polygon' not in data:
        raise ValueError("JSON debe contener campo 'polygon'")
    
    return data

def print_header(text):
    """Imprime header decorado"""
    print(f"\n{'='*70}")
    print(f"  {text}")
    print(f"{'='*70}\n")

def print_section(text):
    """Imprime sección"""
    print(f"\n{'─'*70}")
    print(f"📊 {text}")
    print(f"{'─'*70}")

# ============================================================================
# NDVI CALCULATION
# ============================================================================

def calculate_ndvi(polygon, start_date, end_date):
    """Calcula NDVI para un polígono"""
    print_section("CALCULANDO NDVI")
    print(f"   Período: {start_date} → {end_date}")
    
    aoi = ee.Geometry.Polygon(polygon['coordinates'][0])
    
    collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterDate(start_date, end_date)
                  .filterBounds(aoi)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))
    
    count = collection.size().getInfo()
    print(f"   Imágenes encontradas: {count}")
    
    if count == 0:
        return {'error': 'No se encontraron imágenes Sentinel-2'}
    
    # Calculate NDVI
    ndvi_collection = collection.map(lambda img: img.normalizedDifference(['B8', 'B4']).rename('NDVI'))
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
    
    print(f"   ✅ NDVI Media: {result['mean']:.3f}")
    print(f"   ✅ NDVI Mediana: {result['median']:.3f}")
    print(f"   ✅ Rango: {result['min']:.3f} - {result['max']:.3f}")
    
    return result

# ============================================================================
# DEFORESTATION ANALYSIS
# ============================================================================

def analyze_deforestation(polygon, farm_id):
    """Analiza deforestación en últimos 5 años"""
    print_section("ANALIZANDO DEFORESTACIÓN (EUDR)")
    
    aoi = ee.Geometry.Polygon(polygon['coordinates'][0])
    
    # Dates
    end_date = datetime.now()
    start_date = end_date - timedelta(days=5*365)
    start_year = start_date.year
    end_year = end_date.year
    
    print(f"   Período: {start_year} → {end_year} (5 años)")
    
    # Hansen Global Forest Change
    hansen = ee.Image('UMD/hansen/global_forest_change_2023_v1_11')
    loss_year = hansen.select(['lossyear'])
    tree_cover = hansen.select(['treecover2000'])
    
    # Loss mask
    loss_mask = loss_year.gte(start_year - 2000).And(loss_year.lte(end_year - 2000))
    tree_cover_thresh = tree_cover.gte(30)
    
    # Initial area
    initial_forest_area = tree_cover_thresh.multiply(ee.Image.pixelArea()).reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=aoi,
        scale=30,
        maxPixels=1e9
    ).getInfo()['treecover2000']
    
    # Lost area
    forest_loss = loss_mask.multiply(tree_cover_thresh).multiply(ee.Image.pixelArea()).reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=aoi,
        scale=30,
        maxPixels=1e9
    ).getInfo()['lossyear']
    
    # Convert to hectares
    initial_forest_ha = initial_forest_area / 10000
    loss_ha = (forest_loss / 10000) if forest_loss else 0
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
    print(f"   Generando imágenes históricas...")
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
    
    status = "✅ CUMPLE" if compliant else "❌ NO CUMPLE"
    print(f"   {status} EUDR")
    print(f"   Deforestación: {result['deforestationPercent']:.2f}%")
    print(f"   Área inicial: {result['initialForestHa']:.2f} ha")
    print(f"   Área perdida: {result['areaLostHa']:.2f} ha")
    print(f"   Imágenes históricas: {len(historical_images)}")
    
    return result

# ============================================================================
# CARBON BASELINE
# ============================================================================

def calculate_carbon_baseline(polygon, farm_id, tree_inventory=None):
    """Calcula línea base de carbono"""
    print_section("CALCULANDO LÍNEA BASE DE CARBONO")
    
    aoi = ee.Geometry.Polygon(polygon['coordinates'][0])
    area_m2 = aoi.area().getInfo()
    area_ha = area_m2 / 10000
    
    print(f"   Área: {area_ha:.2f} ha")
    
    # Determine method
    if tree_inventory and len(tree_inventory) > 0:
        method = 'field'
        print(f"   Método: Campo (inventario de {len(tree_inventory)} árboles)")
        
        # Calculate from field data
        WOOD_DENSITY = {
            "Pinus caribaea": 0.51,
            "Eucalyptus": 0.65,
            "Acacia": 0.58,
            "default": 0.60
        }
        
        total_agb = 0
        for tree in tree_inventory:
            species = tree.get('species', 'default')
            dbh = tree['dbh_cm']
            height = tree['height_m']
            rho = WOOD_DENSITY.get(species, WOOD_DENSITY['default'])
            
            # Chave et al. 2014
            agb_kg = 0.0673 * ((rho * (dbh ** 2) * height) ** 0.976)
            total_agb += agb_kg
        
        total_agb = total_agb / 1000  # kg to tonnes
        agb_per_ha = total_agb / area_ha
        confidence = 'high'
        trees_analyzed = len(tree_inventory)
        
    else:
        method = 'satellite'
        print(f"   Método: Satelital (NDVI)")
        
        # Satellite estimation
        collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                     .filterDate('2024-01-01', '2024-12-31')
                     .filterBounds(aoi)
                     .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))
        
        if collection.size().getInfo() == 0:
            return {'error': 'No satellite imagery available'}
        
        ndvi_collection = collection.map(lambda img: img.normalizedDifference(['B8', 'B4']).rename('NDVI'))
        ndvi_mean = ndvi_collection.select('NDVI').median().reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=aoi,
            scale=10,
            maxPixels=1e9
        ).getInfo()['NDVI']
        
        # Simplified AGB from NDVI
        agb_per_ha = max(0, (100 * ndvi_mean) - 20)
        total_agb = agb_per_ha * area_ha
        confidence = 'medium'
        trees_analyzed = 0
    
    # Convert to Carbon and CO2e
    total_carbon_tonnes = total_agb * 0.47
    total_co2e = total_carbon_tonnes * (44 / 12)
    
    result = {
        'baselineCarbonTCO2e': round(total_co2e, 2),
        'agbTonnesPerHa': round(agb_per_ha, 2),
        'totalAgbTonnes': round(total_agb, 2),
        'totalCarbonTonnes': round(total_carbon_tonnes, 2),
        'areaHa': round(area_ha, 2),
        'methodology': method,
        'confidence': confidence,
        'treesAnalyzed': trees_analyzed,
        'calculationDate': datetime.now().isoformat(),
        'equation': 'Chave et al. 2014 (pantropical)',
        'verraMethodology': 'VM0042'
    }
    
    print(f"   ✅ Carbono Baseline: {result['baselineCarbonTCO2e']:.2f} tCO2e")
    print(f"   ✅ Biomasa: {result['agbTonnesPerHa']:.2f} t/ha")
    print(f"   ✅ Confianza: {confidence}")
    
    return result

# ============================================================================
# MAIN FUNCTION
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Analiza una finca desde archivo JSON local',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  # Análisis completo
  python scripts/local-analysis/analyze_farm.py data/farms/input/finca.json
  
  # Solo NDVI
  python scripts/local-analysis/analyze_farm.py data/farms/input/finca.json --ndvi-only
  
  # Con fechas específicas
  python scripts/local-analysis/analyze_farm.py data/farms/input/finca.json --start-date 2023-06-01 --end-date 2023-08-31
        """
    )
    
    parser.add_argument('json_file', help='Ruta al archivo JSON de la finca')
    parser.add_argument('--ndvi-only', action='store_true', help='Solo calcular NDVI')
    parser.add_argument('--deforestation-only', action='store_true', help='Solo analizar deforestación')
    parser.add_argument('--carbon-only', action='store_true', help='Solo calcular carbono')
    parser.add_argument('--start-date', default='2024-01-01', help='Fecha inicio NDVI (YYYY-MM-DD)')
    parser.add_argument('--end-date', default='2024-12-31', help='Fecha fin NDVI (YYYY-MM-DD)')
    parser.add_argument('--output', help='Archivo de salida')
    
    args = parser.parse_args()
    
    try:
        # Load farm data
        print_header("🌾 ANÁLISIS DE FINCA - NUWA DIGITAL TWIN")
        
        farm_data = load_farm_json(args.json_file)
        polygon = farm_data['polygon']
        
        print(f"📂 Archivo: {args.json_file}")
        print(f"🌾 Finca: {farm_data.get('name', 'Sin nombre')}")
        print(f"🆔 ID: {farm_data.get('farmId', 'N/A')}")
        print(f"👤 Propietario: {farm_data.get('owner', 'N/A')}")
        
        results = {}
        
        # NDVI
        if not args.deforestation_only and not args.carbon_only:
            try:
                ndvi_result = calculate_ndvi(polygon, args.start_date, args.end_date)
                results['ndvi'] = ndvi_result
            except Exception as e:
                print(f"❌ Error en NDVI: {e}")
                results['ndvi'] = {'error': str(e)}
        
        # Deforestation
        if not args.ndvi_only and not args.carbon_only:
            try:
                deforest_result = analyze_deforestation(polygon, farm_data.get('farmId', 'unknown'))
                results['deforestation'] = deforest_result
            except Exception as e:
                print(f"❌ Error en deforestación: {e}")
                results['deforestation'] = {'error': str(e)}
        
        # Carbon
        if not args.ndvi_only and not args.deforestation_only:
            try:
                tree_inventory = farm_data.get('treeInventory', None)
                carbon_result = calculate_carbon_baseline(
                    polygon,
                    farm_data.get('farmId', 'unknown'),
                    tree_inventory
                )
                results['carbon'] = carbon_result
            except Exception as e:
                print(f"❌ Error en carbono: {e}")
                results['carbon'] = {'error': str(e)}
        
        # Save results
        output = {
            'farmInfo': {
                'name': farm_data.get('name', 'N/A'),
                'farmId': farm_data.get('farmId', 'N/A'),
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
        
        print_header("✅ ANÁLISIS COMPLETADO")
        print(f"💾 Resultados guardados en: {output_path}")
        
        # Summary
        print("\n📊 RESUMEN:")
        if 'ndvi' in results and 'error' not in results['ndvi']:
            print(f"   🌿 NDVI: {results['ndvi']['mean']:.3f}")
        if 'deforestation' in results and 'error' not in results['deforestation']:
            status = "✅ CUMPLE" if results['deforestation']['compliant'] else "❌ NO CUMPLE"
            print(f"   🌳 EUDR: {status} ({results['deforestation']['deforestationPercent']}%)")
        if 'carbon' in results and 'error' not in results['carbon']:
            print(f"   💨 Carbono: {results['carbon']['baselineCarbonTCO2e']:.2f} tCO2e")
        
        print()
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
```

## Directory Structure
Create these directories:
```
scripts/
└── local-analysis/
    └── analyze_farm.py

data/
└── farms/
    ├── input/    (user places JSON files here)
    └── output/   (analysis results saved here)
```

## Files to Create
1. `scripts/local-analysis/analyze_farm.py` - Main analysis script
2. `scripts/local-analysis/batch_process.py` - Batch processing script (optional)

## Usage Examples

### Basic usage
```bash
python scripts/local-analysis/analyze_farm.py data/farms/input/finca_libano.json
```

### Only NDVI
```bash
python scripts/local-analysis/analyze_farm.py data/farms/input/finca_libano.json --ndvi-only
```

### Only Deforestation
```bash
python scripts/local-analysis/analyze_farm.py data/farms/input/finca_libano.json --deforestation-only
```

### Only Carbon
```bash
python scripts/local-analysis/analyze_farm.py data/farms/input/finca_libano.json --carbon-only
```

### Custom date range for NDVI
```bash
python scripts/local-analysis/analyze_farm.py data/farms/input/finca_libano.json \
  --start-date 2023-06-01 \
  --end-date 2023-08-31
```

### Custom output location
```bash
python scripts/local-analysis/analyze_farm.py data/farms/input/finca_libano.json \
  --output resultados/mi_analisis.json
```

## Output Format
```json
{
  "farmInfo": {
    "name": "Finca Líbano",
    "farmId": "farm-libano-001",
    "owner": "Juan Pérez",
    "location": {...}
  },
  "polygon": {...},
  "metadata": {...},
  "analysis": {
    "ndvi": {
      "mean": 0.72,
      "median": 0.75,
      ...
    },
    "deforestation": {
      "deforestationPercent": 2.3,
      "compliant": true,
      ...
    },
    "carbon": {
      "baselineCarbonTCO2e": 145.8,
      "agbTonnesPerHa": 52.5,
      ...
    }
  },
  "generatedAt": "2026-01-13T..."
}
```

## Acceptance Criteria
- [ ] Script accepts JSON file path as argument
- [ ] Loads farm data correctly
- [ ] Executes all 3 analyses successfully
- [ ] Saves results to output folder
- [ ] Shows progress in console
- [ ] Handles errors gracefully
- [ ] Supports selective analysis (--ndvi-only, etc.)
- [ ] Supports custom date ranges
- [ ] Makes script executable: chmod +x scripts/local-analysis/analyze_farm.py

## Dependencies
- Requires: Python scripts already created (ndvi_calculator.py, deforestation_analysis.py, carbon_baseline.py)
- Requires: Earth Engine authenticated