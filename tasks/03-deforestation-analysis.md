# Task: Implement Deforestation Analysis Service (EUDR Validation)

## Context
The EU Deforestation Regulation (EUDR) requires that farms have not experienced more than 5% forest loss in the last 5 years to be eligible for carbon credits. This service analyzes satellite imagery to validate EUDR compliance.

## Technical Requirements

### Python Script (python-scripts/deforestation_analysis.py)
- Accept CLI arguments: --polygon (GeoJSON), --project-id (string)
- Calculate date range: last 5 years (startDate = now - 5 years, endDate = now)
- Use Hansen Global Forest Change dataset (UMD/hansen/global_forest_change_2023_v1_11)
- Use Sentinel-2 for temporal validation
- Calculate:
  - Initial forest area (hectares)
  - Forest loss area (hectares)
  - Deforestation percentage
- Determine EUDR compliance: compliant = (deforestationPercent < 5.0)
- Generate change detection visualization (red overlay for lost areas)
- Return JSON with:
```json
  {
    "deforestationPercent": 2.3,
    "areaLostHa": 1.5,
    "initialForestHa": 65.2,
    "compliant": true,
    "historicalImages": [
      {"year": 2019, "url": "..."},
      {"year": 2020, "url": "..."},
      ...
    ],
    "changeDetectionUrl": "...",
    "analysisDate": "2026-01-13T...",
    "methodology": "Hansen GFC + Sentinel-2 validation"
  }
```

### TypeScript Service (backend/services/eudr.service.ts)
- Class: EUDRService
- Method: analyzeDeforestation(polygon: GeoJSONPolygon, projectId: string)
- Execute Python script
- Parse JSON output
- Return typed DeforestationAnalysis interface
- Add timeout (90 seconds - longer than NDVI because more processing)
- Log execution time and compliance result

### TypeScript Types (backend/types/eudr.types.ts)
```typescript
export interface DeforestationAnalysis {
  deforestationPercent: number;
  areaLostHa: number;
  initialForestHa: number;
  compliant: boolean;
  historicalImages: Array<{
    year: number;
    url: string;
  }>;
  changeDetectionUrl: string;
  analysisDate: string;
  methodology: string;
}

export interface EUDRValidationResult {
  projectId: string;
  farmId?: string;
  analysis: DeforestationAnalysis;
  validated: boolean;
  validatedAt: string;
}
```

### Update Farm Controller (backend/api/controllers/farm.controller.ts)
- Add method: analyzeDeforestation(req: Request, res: Response)
- Validate input (polygon + projectId required)
- Call EUDRService.analyzeDeforestation()
- Return consistent JSON response:
```json
  {
    "success": true,
    "data": { ... DeforestationAnalysis },
    "message": "EUDR validation completed"
  }
```

### Update Farm Routes (backend/api/routes/farm.routes.ts)
- Add: POST /analyze-deforestation

## Implementation Details

### Python Script Structure
```python
import ee
import json
import argparse
import sys
from datetime import datetime, timedelta

def analyze_forest_change(polygon, start_date, end_date, project_id):
    """
    Analyze forest loss using Hansen GFC and Sentinel-2 validation
    """
    aoi = ee.Geometry.Polygon(polygon['coordinates'][0])
    
    # Hansen Global Forest Change
    hansen = ee.Image('UMD/hansen/global_forest_change_2023_v1_11')
    loss_year = hansen.select(['lossyear'])
    tree_cover = hansen.select(['treecover2000'])
    
    # Calculate years from dates
    start_year = int(start_date.split('-')[0])
    end_year = int(end_date.split('-')[0])
    
    # Loss mask for the period
    loss_mask = loss_year.gte(start_year - 2000).And(loss_year.lte(end_year - 2000))
    
    # Initial forest area (30% tree cover threshold)
    tree_cover_thresh = tree_cover.gte(30)
    
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
    
    # Calculate percentage
    deforestation_percent = (loss_ha / initial_forest_ha * 100) if initial_forest_ha > 0 else 0
    
    # EUDR compliance
    compliant = deforestation_percent < 5.0
    
    # Generate historical images (Sentinel-2 snapshots)
    historical_images = []
    for year in range(start_year, end_year + 1):
        # Dry season for better visibility
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
            historical_images.append({
                'year': year,
                'url': thumbnail
            })
    
    # Change detection visualization
    loss_visualization = loss_mask.updateMask(loss_mask).visualize(palette=['red'])
    change_url = loss_visualization.getThumbURL({
        'region': aoi,
        'dimensions': 512,
        'format': 'png'
    })
    
    return {
        'deforestationPercent': round(deforestation_percent, 2),
        'areaLostHa': round(loss_ha, 2),
        'initialForestHa': round(initial_forest_ha, 2),
        'compliant': compliant,
        'historicalImages': historical_images,
        'changeDetectionUrl': change_url,
        'analysisDate': datetime.now().isoformat(),
        'methodology': 'Hansen GFC + Sentinel-2 validation'
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--polygon', type=str, required=True)
    parser.add_argument('--project-id', type=str, required=True)
    
    args = parser.parse_args()
    polygon = json.loads(args.polygon)
    
    # Calculate 5-year window
    end_date = datetime.now()
    start_date = end_date - timedelta(days=5*365)
    
    try:
        ee.Initialize(project='nuwa-digital-twin')
        
        result = analyze_forest_change(
            polygon,
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d'),
            args.project_id
        )
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

### TypeScript Service Pattern
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

export class EUDRService {
  private pythonPath: string;
  private scriptsPath: string;
  
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || '/usr/bin/python3';
    this.scriptsPath = path.join(__dirname, '../../python-scripts');
  }
  
  async analyzeDeforestation(
    polygon: GeoJSONPolygon,
    projectId: string
  ): Promise<DeforestationAnalysis> {
    const startTime = Date.now();
    const polygonStr = JSON.stringify(polygon);
    
    const command = `${this.pythonPath} ${this.scriptsPath}/deforestation_analysis.py \
      --polygon '${polygonStr}' \
      --project-id ${projectId}`;
    
    try {
      const { stdout, stderr } = await execPromise(command, { 
        timeout: 90000, // 90 seconds
        maxBuffer: 10 * 1024 * 1024 
      });
      
      if (stderr) {
        console.error('Python stderr:', stderr);
      }
      
      const result: DeforestationAnalysis = JSON.parse(stdout);
      const duration = Date.now() - startTime;
      
      console.log(`Deforestation analysis completed in ${duration}ms`);
      console.log(`EUDR Compliant: ${result.compliant} (${result.deforestationPercent}% loss)`);
      
      return result;
    } catch (error) {
      console.error('Error analyzing deforestation:', error);
      throw new Error('Deforestation analysis failed');
    }
  }
}
```

## Files to Create
1. `python-scripts/deforestation_analysis.py` - Python script
2. `backend/services/eudr.service.ts` - EUDR service
3. `backend/types/eudr.types.ts` - TypeScript interfaces

## Files to Modify
1. `backend/api/controllers/farm.controller.ts` - Add analyzeDeforestation method
2. `backend/api/routes/farm.routes.ts` - Add POST /analyze-deforestation route

## Testing
```bash
curl -X POST http://localhost:3001/api/v1/farms/analyze-deforestation \
  -H "Content-Type: application/json" \
  -d '{
    "polygon": {
      "type": "Polygon",
      "coordinates": [[
        [-75.5, 4.5],
        [-75.5, 4.6],
        [-75.4, 4.6],
        [-75.4, 4.5],
        [-75.5, 4.5]
      ]]
    },
    "projectId": "farm-test-001"
  }'
```

Expected response (compliant farm):
```json
{
  "success": true,
  "data": {
    "deforestationPercent": 2.3,
    "areaLostHa": 1.5,
    "initialForestHa": 65.2,
    "compliant": true,
    "historicalImages": [...],
    "changeDetectionUrl": "https://...",
    "analysisDate": "2026-01-13T...",
    "methodology": "Hansen GFC + Sentinel-2 validation"
  },
  "message": "EUDR validation completed - Farm is compliant"
}
```

## Acceptance Criteria
- [ ] Python script runs standalone and returns valid JSON
- [ ] Deforestation percentage is calculated correctly
- [ ] EUDR compliance is determined (< 5% = compliant)
- [ ] Historical images are generated for each year
- [ ] Change detection visualization is generated
- [ ] TypeScript service integrates properly
- [ ] API endpoint responds correctly
- [ ] Compliant and non-compliant cases are handled
- [ ] All types are properly defined

## Dependencies
- Requires: GEE authenticated (✓ completed)
- Requires: NDVI service pattern (✓ completed)
- Blocks: Carbon baseline calculation