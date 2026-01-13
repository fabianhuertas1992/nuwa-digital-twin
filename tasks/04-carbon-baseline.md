# Task: Implement Carbon Baseline Calculation Service

## Context
Calculate the baseline carbon stock (tCO2e) of a farm using allometric equations following Verra VM0042 methodology. This baseline is critical for determining additionality and calculating future carbon credits.

## Technical Requirements

### Python Script (python-scripts/carbon_baseline.py)
- Accept CLI arguments:
  - --polygon (GeoJSON)
  - --project-id (string)
  - --tree-inventory (JSON file path, optional)
  - --biomass-method (enum: 'satellite', 'field', 'hybrid')
- Calculate Aboveground Biomass (AGB) using:
  - **Satellite-based:** Derive from NDVI + Canopy Height Model (if available)
  - **Field-based:** Use tree inventory (DAP, height, species) with allometric equations
  - **Hybrid:** Combine both methods
- Allometric equations:
  - Chave et al. 2014: `AGB = 0.0673 × (ρ × DBH² × H)^0.976`
  - Where: ρ = wood density, DBH = diameter at breast height, H = height
- Calculate carbon stock: `C = AGB × 0.47` (carbon fraction in dry wood)
- Convert to CO2e: `tCO2e = C × (44/12)` (molecular weight ratio)
- Return JSON with:
  - baselineCarbonTCO2e (total)
  - agbTonnesPerHa (biomass per hectare)
  - methodology (which method was used)
  - confidence (low/medium/high based on data quality)
  - treesAnalyzed (if field data available)
  - calculationDate

### Python Script Structure
```python
import ee
import json
import argparse
import sys
from datetime import datetime

# Allometric equation from Chave et al. 2014
def calculate_agb_from_field_data(tree_inventory):
    """
    Calculate AGB from tree measurements
    tree_inventory: [{"species": "Pinus caribaea", "dbh_cm": 25, "height_m": 15}, ...]
    """
    # Wood density database (simplified)
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
        
        # Chave et al. 2014 pantropical equation
        agb_kg = 0.0673 * ((rho * (dbh ** 2) * height) ** 0.976)
        total_agb += agb_kg
    
    return total_agb / 1000  # Convert kg to tonnes

def calculate_agb_from_satellite(polygon, start_date, end_date):
    """
    Estimate AGB from NDVI and other satellite indices
    This is a simplified approach - production would use ML models
    """
    aoi = ee.Geometry.Polygon(polygon['coordinates'][0])
    
    # Get Sentinel-2 NDVI
    collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterDate(start_date, end_date)
                  .filterBounds(aoi)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))
    
    if collection.size().getInfo() == 0:
        raise ValueError("No satellite imagery available")
    
    # Calculate NDVI
    ndvi_collection = collection.map(lambda img: img.normalizedDifference(['B8', 'B4']).rename('NDVI'))
    ndvi_mean = ndvi_collection.select('NDVI').median().reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=aoi,
        scale=10,
        maxPixels=1e9
    ).getInfo()['NDVI']
    
    # Simplified AGB estimation from NDVI
    # Real implementation would use trained ML models
    # This is based on literature correlations for tropical forests
    # AGB (t/ha) ≈ 100 * NDVI - 20 (very simplified!)
    agb_per_ha = max(0, (100 * ndvi_mean) - 20)
    
    # Get area
    area_m2 = aoi.area().getInfo()
    area_ha = area_m2 / 10000
    
    total_agb = agb_per_ha * area_ha
    
    return {
        'total_agb_tonnes': total_agb,
        'agb_per_ha': agb_per_ha,
        'area_ha': area_ha,
        'ndvi_mean': ndvi_mean
    }

def calculate_carbon_baseline(polygon, project_id, tree_inventory=None, method='satellite'):
    """
    Main function to calculate carbon baseline
    """
    ee.Initialize(project='nuwa-digital-twin')
    
    # Area calculation
    aoi = ee.Geometry.Polygon(polygon['coordinates'][0])
    area_m2 = aoi.area().getInfo()
    area_ha = area_m2 / 10000
    
    # Calculate AGB based on method
    if method == 'field' and tree_inventory:
        total_agb = calculate_agb_from_field_data(tree_inventory)
        agb_per_ha = total_agb / area_ha
        confidence = 'high'
        trees_analyzed = len(tree_inventory)
    elif method == 'satellite':
        result = calculate_agb_from_satellite(polygon, '2024-01-01', '2024-12-31')
        total_agb = result['total_agb_tonnes']
        agb_per_ha = result['agb_per_ha']
        confidence = 'medium'
        trees_analyzed = 0
    else:  # hybrid
        # Combine both methods if available
        confidence = 'high'
        trees_analyzed = 0
        # Implementation would combine field + satellite
        result = calculate_agb_from_satellite(polygon, '2024-01-01', '2024-12-31')
        total_agb = result['total_agb_tonnes']
        agb_per_ha = result['agb_per_ha']
    
    # Convert AGB to Carbon
    total_carbon_tonnes = total_agb * 0.47  # Carbon fraction in biomass
    
    # Convert Carbon to CO2e
    total_co2e = total_carbon_tonnes * (44 / 12)  # Molecular weight ratio
    
    return {
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

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--polygon', type=str, required=True)
    parser.add_argument('--project-id', type=str, required=True)
    parser.add_argument('--tree-inventory', type=str, help='Path to tree inventory JSON')
    parser.add_argument('--biomass-method', type=str, default='satellite', 
                       choices=['satellite', 'field', 'hybrid'])
    
    args = parser.parse_args()
    polygon = json.loads(args.polygon)
    
    # Load tree inventory if provided
    tree_inventory = None
    if args.tree_inventory and os.path.exists(args.tree_inventory):
        with open(args.tree_inventory, 'r') as f:
            tree_inventory = json.load(f)
    
    try:
        result = calculate_carbon_baseline(
            polygon,
            args.project_id,
            tree_inventory,
            args.biomass_method
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

### TypeScript Service (backend/services/carbon.service.ts)
- Class: CarbonService
- Method: calculateBaseline(polygon, projectId, treeInventory?, method?)
- Execute Python script with appropriate parameters
- Parse JSON result
- Return typed CarbonBaseline interface
- Add logging for baseline values

### TypeScript Types (backend/types/carbon.types.ts)
```typescript
export interface TreeMeasurement {
  species: string;
  dbh_cm: number;  // Diameter at Breast Height in cm
  height_m: number;
  location?: {
    lat: number;
    lon: number;
  };
}

export interface CarbonBaseline {
  baselineCarbonTCO2e: number;
  agbTonnesPerHa: number;
  totalAgbTonnes: number;
  totalCarbonTonnes: number;
  areaHa: number;
  methodology: 'satellite' | 'field' | 'hybrid';
  confidence: 'low' | 'medium' | 'high';
  treesAnalyzed: number;
  calculationDate: string;
  equation: string;
  verraMethodology: string;
}

export interface CarbonProjection {
  baselineYear: number;
  projectedYear: number;
  estimatedSequestration: number;
  methodology: string;
}
```

### Update Farm Controller (backend/api/controllers/farm.controller.ts)
- Add method: calculateBaseline(req, res)
- Accept: polygon, projectId, treeInventory (optional), method (optional)
- Call CarbonService.calculateBaseline()
- Return response

### Update Farm Routes (backend/api/routes/farm.routes.ts)
- Add: POST /calculate-baseline

## Files to Create
1. `python-scripts/carbon_baseline.py`
2. `backend/services/carbon.service.ts`
3. `backend/types/carbon.types.ts`

## Files to Modify
1. `backend/api/controllers/farm.controller.ts`
2. `backend/api/routes/farm.routes.ts`

## Testing

### Test 1: Satellite-based (no field data)
```bash
curl -X POST http://localhost:3001/api/v1/farms/calculate-baseline \
  -H "Content-Type: application/json" \
  -d '{
    "polygon": {
      "type": "Polygon",
      "coordinates": [[...]]
    },
    "projectId": "farm-libano-001",
    "method": "satellite"
  }'
```

### Test 2: Field-based (with tree inventory)
```bash
curl -X POST http://localhost:3001/api/v1/farms/calculate-baseline \
  -H "Content-Type: application/json" \
  -d '{
    "polygon": {...},
    "projectId": "farm-libano-001",
    "method": "field",
    "treeInventory": [
      {"species": "Pinus caribaea", "dbh_cm": 25, "height_m": 15},
      {"species": "Eucalyptus", "dbh_cm": 30, "height_m": 18}
    ]
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "baselineCarbonTCO2e": 125.5,
    "agbTonnesPerHa": 45.2,
    "totalAgbTonnes": 452.0,
    "totalCarbonTonnes": 212.4,
    "areaHa": 10.0,
    "methodology": "satellite",
    "confidence": "medium",
    "treesAnalyzed": 0,
    "calculationDate": "2026-01-13T...",
    "equation": "Chave et al. 2014 (pantropical)",
    "verraMethodology": "VM0042"
  },
  "message": "Carbon baseline calculated"
}
```

## Acceptance Criteria
- [ ] Satellite-based estimation works
- [ ] Field-based calculation with allometric equations works
- [ ] Returns tCO2e value
- [ ] Confidence level is assigned correctly
- [ ] Area calculation is accurate
- [ ] API endpoint responds properly
- [ ] Types are well-defined

## Dependencies
- Requires: GEE authenticated
- Requires: NDVI service (reuses satellite data access)
- Blocks: NFT minting (needs baseline for metadata)