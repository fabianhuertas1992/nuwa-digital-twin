# Task: Implement NDVI Calculation Service

## Context
Farmers need to validate their farm's vegetation health using satellite imagery. This service calculates NDVI (Normalized Difference Vegetation Index) from Sentinel-2 imagery using Google Earth Engine.

## Technical Requirements

### Python Script (python-scripts/ndvi_calculator.py)
- Accept CLI arguments: --polygon (GeoJSON string), --start-date, --end-date
- Use Google Earth Engine API with project 'nuwa-digital-twin'
- Query COPERNICUS/S2_SR_HARMONIZED collection
- Filter by date range and cloud cover (<20%)
- Calculate NDVI: (B8 - B4) / (B8 + B4)
- Return JSON with statistics: mean, median, stdDev, min, max
- Generate thumbnail URL for visualization
- Add proper error handling and logging

### TypeScript Service (backend/services/gee.service.ts)
- Class: GEEService
- Method: calculateNDVI(polygon: GeoJSONPolygon, startDate: string, endDate: string)
- Execute Python script using child_process.exec
- Parse JSON output from Python
- Handle errors gracefully
- Return typed NDVIResult interface
- Add timeout (60 seconds)
- Log execution time

### TypeScript Types (backend/types/gee.types.ts)
```typescript
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface NDVIResult {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  imageUrl: string;
  timestamp: string;
  cloudCoverage?: number;
}
```

### Controller (backend/api/controllers/farm.controller.ts)
- Class: FarmController
- Method: calculateNDVI(req: Request, res: Response)
- Validate input (polygon must be valid GeoJSON, dates in YYYY-MM-DD format)
- Call GEEService.calculateNDVI()
- Return consistent JSON response:
```json
  {
    "success": true,
    "data": { ... NDVIResult },
    "message": "NDVI calculated successfully"
  }
```
- Handle errors with proper HTTP status codes

### Routes (backend/api/routes/farm.routes.ts)
- Express Router
- POST /calculate-ndvi
- Use express.json() middleware
- Map to farmController.calculateNDVI

### Update server.ts
- Import and register farm routes under /api/v1/farms

## Implementation Details

### Python Script Structure
```python
import ee
import json
import argparse
import sys
from datetime import datetime

def geojson_to_ee_geometry(geojson_polygon):
    coords = geojson_polygon['coordinates'][0]
    return ee.Geometry.Polygon(coords)

def calculate_ndvi_statistics(polygon, start_date, end_date):
    # Implementation here
    pass

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--polygon', type=str, required=True)
    parser.add_argument('--start-date', type=str, required=True)
    parser.add_argument('--end-date', type=str, required=True)
    
    args = parser.parse_args()
    polygon = json.loads(args.polygon)
    
    try:
        ee.Initialize(project='nuwa-digital-twin')
        result = calculate_ndvi_statistics(polygon, args.start_date, args.end_date)
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

export class GEEService {
  private pythonPath: string;
  private scriptsPath: string;
  
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || '/usr/bin/python3';
    this.scriptsPath = path.join(__dirname, '../../python-scripts');
  }
  
  async calculateNDVI(
    polygon: GeoJSONPolygon,
    startDate: string,
    endDate: string
  ): Promise<NDVIResult> {
    const startTime = Date.now();
    const polygonStr = JSON.stringify(polygon);
    
    const command = `${this.pythonPath} ${this.scriptsPath}/ndvi_calculator.py \
      --polygon '${polygonStr}' \
      --start-date ${startDate} \
      --end-date ${endDate}`;
    
    try {
      const { stdout, stderr } = await execPromise(command, { 
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024 
      });
      
      if (stderr) {
        console.error('Python stderr:', stderr);
      }
      
      const result = JSON.parse(stdout);
      const duration = Date.now() - startTime;
      
      console.log(`NDVI calculated in ${duration}ms`);
      
      return result;
    } catch (error) {
      console.error('Error calculating NDVI:', error);
      throw new Error('NDVI calculation failed');
    }
  }
}
```

## Files to Create
1. `python-scripts/ndvi_calculator.py` - Main Python script
2. `backend/services/gee.service.ts` - GEE service wrapper
3. `backend/types/gee.types.ts` - TypeScript interfaces
4. `backend/api/controllers/farm.controller.ts` - HTTP controller
5. `backend/api/routes/farm.routes.ts` - Express routes

## Files to Modify
1. `backend/server.ts` - Register farm routes

## Testing
After implementation, test with:
```bash
curl -X POST http://localhost:3001/api/v1/farms/calculate-ndvi \
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
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "mean": 0.72,
    "median": 0.75,
    "std": 0.08,
    "min": 0.45,
    "max": 0.89,
    "imageUrl": "https://earthengine.googleapis.com/...",
    "timestamp": "2026-01-13T..."
  },
  "message": "NDVI calculated successfully"
}
```

## Acceptance Criteria
- [ ] Python script runs standalone and returns valid JSON
- [ ] TypeScript service can call Python script successfully
- [ ] API endpoint responds with proper JSON structure
- [ ] Errors are handled gracefully with meaningful messages
- [ ] Response time is logged
- [ ] All TypeScript types are properly defined
- [ ] Code follows project conventions in .cursorrules

## Dependencies
- Requires: Google Earth Engine authenticated (✓ completed)
- Requires: Python venv with earthengine-api (✓ completed)
- Blocks: Deforestation analysis (will use similar pattern)