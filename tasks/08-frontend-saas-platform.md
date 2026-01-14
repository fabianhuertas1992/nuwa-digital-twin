# Task: Build SaaS Frontend Platform

## Context
Create a complete web interface (SaaS platform) where farmers can upload their farm polygons, get automatic analysis (NDVI, EUDR, Carbon), and receive a Digital Twin NFT certificate.

## Technical Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Maps**: Mapbox GL JS
- **State**: Zustand
- **HTTP**: Axios
- **Forms**: React Hook Form + Zod

## Project Structure
```
frontend/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home/landing
│   ├── dashboard/
│   │   └── page.tsx         # User dashboard
│   ├── farm/
│   │   ├── new/
│   │   │   └── page.tsx     # Create new farm
│   │   └── [id]/
│   │       └── page.tsx     # Farm details
│   └── api/                 # API routes (proxy to backend)
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── map/
│   │   ├── MapViewer.tsx
│   │   ├── PolygonDrawer.tsx
│   │   └── PolygonUploader.tsx
│   ├── analysis/
│   │   ├── NDVIChart.tsx
│   │   ├── EUDRStatus.tsx
│   │   └── CarbonMetrics.tsx
│   └── farm/
│       ├── FarmCard.tsx
│       └── FarmList.tsx
├── lib/
│   ├── api.ts               # API client
│   ├── mapbox.ts            # Mapbox utilities
│   └── utils.ts
├── types/
│   └── index.ts             # TypeScript types
└── public/
```

## Implementation Steps

### Step 1: Initialize Next.js Project
```bash
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir
cd frontend
```

### Step 2: Install Dependencies
```bash
npm install mapbox-gl @mapbox/mapbox-gl-draw
npm install axios zustand
npm install react-hook-form zod @hookform/resolvers
npm install recharts lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-tabs
npm install class-variance-authority clsx tailwind-merge
```

### Step 3: Configure Environment Variables
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Step 4: Create Core Components

#### MapViewer Component
```typescript
// components/map/MapViewer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

interface MapViewerProps {
  onPolygonCreated?: (geojson: any) => void;
  initialPolygon?: any;
  center?: [number, number];
  zoom?: number;
}

export default function MapViewer({
  onPolygonCreated,
  initialPolygon,
  center = [-75.0639, 4.9214], // Líbano, Tolima
  zoom = 14
}: MapViewerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: center,
      zoom: zoom
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add drawing tools
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      }
    });

    map.current.addControl(draw.current);

    // Handle polygon creation
    map.current.on('draw.create', (e) => {
      const data = draw.current?.getAll();
      if (data && onPolygonCreated) {
        onPolygonCreated(data.features[0].geometry);
      }
    });

    // Load initial polygon if provided
    if (initialPolygon) {
      draw.current.add({
        type: 'Feature',
        geometry: initialPolygon
      });
      
      // Fit bounds to polygon
      const coordinates = initialPolygon.coordinates[0];
      const bounds = coordinates.reduce((bounds: any, coord: any) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
      
      map.current.fitBounds(bounds, { padding: 50 });
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div ref={mapContainer} className="w-full h-[600px] rounded-lg overflow-hidden" />
  );
}
```

#### PolygonUploader Component
```typescript
// components/map/PolygonUploader.tsx
'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';

interface PolygonUploaderProps {
  onPolygonLoaded: (polygon: any, farmData: any) => void;
}

export default function PolygonUploader({ onPolygonLoaded }: PolygonUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        let polygon;
        let farmData = {};
        
        // Handle different formats
        if (json.type === 'FeatureCollection') {
          const feature = json.features[0];
          polygon = feature.geometry;
          farmData = feature.properties || {};
        } else if (json.type === 'Feature') {
          polygon = json.geometry;
          farmData = json.properties || {};
        } else if (json.polygon) {
          polygon = json.polygon;
          farmData = json;
        } else {
          throw new Error('Formato no reconocido');
        }
        
        onPolygonLoaded(polygon, farmData);
      } catch (error) {
        alert('Error al leer archivo: ' + error);
      }
    };
    
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.json') || file.name.endsWith('.geojson'))) {
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <p className="text-lg font-medium mb-2">
        Arrastra tu archivo GeoJSON aquí
      </p>
      <p className="text-sm text-gray-500 mb-4">
        o
      </p>
      <label className="inline-block">
        <input
          type="file"
          accept=".json,.geojson"
          onChange={handleFileInput}
          className="hidden"
        />
        <span className="px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700">
          Seleccionar archivo
        </span>
      </label>
    </div>
  );
}
```

#### Analysis Results Components
```typescript
// components/analysis/NDVIChart.tsx
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface NDVIChartProps {
  data: {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
  };
}

export default function NDVIChart({ data }: NDVIChartProps) {
  const chartData = [
    { name: 'Mínimo', value: data.min },
    { name: 'Media', value: data.mean },
    { name: 'Mediana', value: data.median },
    { name: 'Máximo', value: data.max }
  ];

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Índice NDVI</h3>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500">Media</p>
          <p className="text-2xl font-bold text-green-600">{data.mean.toFixed(3)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Desv. Estándar</p>
          <p className="text-2xl font-bold">{data.std.toFixed(3)}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 1]} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```
```typescript
// components/analysis/EUDRStatus.tsx
'use client';

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface EUDRStatusProps {
  compliant: boolean;
  deforestationPercent: number;
  areaLostHa: number;
}

export default function EUDRStatus({ compliant, deforestationPercent, areaLostHa }: EUDRStatusProps) {
  return (
    <div className={`rounded-lg p-6 shadow-sm ${compliant ? 'bg-green-50' : 'bg-red-50'}`}>
      <div className="flex items-center gap-3 mb-4">
        {compliant ? (
          <CheckCircle className="h-8 w-8 text-green-600" />
        ) : (
          <XCircle className="h-8 w-8 text-red-600" />
        )}
        <div>
          <h3 className="text-lg font-semibold">Validación EUDR</h3>
          <p className={`text-sm ${compliant ? 'text-green-700' : 'text-red-700'}`}>
            {compliant ? 'Cumple con regulación' : 'No cumple con regulación'}
          </p>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Deforestación detectada:</span>
          <span className="font-semibold">{deforestationPercent}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Área perdida:</span>
          <span className="font-semibold">{areaLostHa.toFixed(2)} ha</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Umbral EUDR:</span>
          <span className="font-semibold">5%</span>
        </div>
      </div>
      
      {!compliant && (
        <div className="mt-4 p-3 bg-amber-100 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Esta finca requiere un plan de reforestación para ser elegible para créditos de carbono.
          </p>
        </div>
      )}
    </div>
  );
}
```
```typescript
// components/analysis/CarbonMetrics.tsx
'use client';

import { Leaf } from 'lucide-react';

interface CarbonMetricsProps {
  baselineCarbonTCO2e: number;
  agbTonnesPerHa: number;
  areaHa: number;
  confidence: string;
  methodology: string;
}

export default function CarbonMetrics({
  baselineCarbonTCO2e,
  agbTonnesPerHa,
  areaHa,
  confidence,
  methodology
}: CarbonMetricsProps) {
  // Estimate annual value at $25/tCO2e
  const estimatedValue = baselineCarbonTCO2e * 25;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <Leaf className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Línea Base de Carbono</h3>
          <p className="text-sm text-gray-500">{methodology}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="col-span-2">
          <p className="text-sm text-gray-500">Carbono Total</p>
          <p className="text-3xl font-bold text-green-600">{baselineCarbonTCO2e.toFixed(2)} tCO2e</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Biomasa por hectárea</p>
          <p className="text-xl font-semibold">{agbTonnesPerHa.toFixed(2)} t/ha</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Área</p>
          <p className="text-xl font-semibold">{areaHa.toFixed(2)} ha</p>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Confianza del cálculo:</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            confidence === 'high' ? 'bg-green-100 text-green-800' :
            confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {confidence === 'high' ? 'Alta' : confidence === 'medium' ? 'Media' : 'Baja'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Valor estimado:</span>
          <span className="text-lg font-semibold text-green-600">
            ${estimatedValue.toLocaleString('es-CO')} USD
          </span>
        </div>
      </div>
    </div>
  );
}
```

### Step 5: Create Main Pages

#### Create Farm Page
```typescript
// app/farm/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MapViewer from '@/components/map/MapViewer';
import PolygonUploader from '@/components/map/PolygonUploader';
import { analyzeComplete FarmAnalysis } from '@/lib/api';

export default function NewFarmPage() {
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'draw' | 'analyze'>('upload');
  const [polygon, setPolygon] = useState<any>(null);
  const [farmData, setFarmData] = useState<any>({});
  const [analyzing, setAnalyzing] = useState(false);

  const handlePolygonLoaded = (poly: any, data: any) => {
    setPolygon(poly);
    setFarmData(data);
    setStep('analyze');
  };

  const handleAnalyze = async () => {
    if (!polygon) return;
    
    setAnalyzing(true);
    try {
      const result = await analyzeFarm({
        polygon,
        projectId: farmData.farmId || `farm-${Date.now()}`,
        ...farmData
      });
      
      router.push(`/farm/${result.farmId}`);
    } catch (error) {
      alert('Error en análisis: ' + error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Crear Nueva Finca</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 'upload' && (
            <div className="space-y-6">
              <PolygonUploader onPolygonLoaded={handlePolygonLoaded} />
              <div className="text-center">
                <button
                  onClick={() => setStep('draw')}
                  className="text-green-600 hover:underline"
                >
                  O dibuja el polígono en el mapa
                </button>
              </div>
            </div>
          )}
          
          {(step === 'draw' || step === 'analyze') && (
            <MapViewer
              onPolygonCreated={(poly) => {
                setPolygon(poly);
                setStep('analyze');
              }}
              initialPolygon={polygon}
            />
          )}
        </div>
        
        <div>
          <div className="bg-white rounded-lg p-6 shadow-sm sticky top-4">
            <h2 className="text-xl font-semibold mb-4">Información</h2>
            
            {!polygon ? (
              <p className="text-gray-500">
                Sube un archivo GeoJSON o dibuja el polígono de tu finca en el mapa.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre de la finca</label>
                  <input
                    type="text"
                    value={farmData.name || ''}
                    onChange={(e) => setFarmData({...farmData, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ej: Finca El Sinai"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Propietario</label>
                  <input
                    type="text"
                    value={farmData.owner || ''}
                    onChange={(e) => setFarmData({...farmData, owner: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
                >
                  {analyzing ? 'Analizando...' : 'Analizar Finca'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Acceptance Criteria
- [ ] Next.js project initialized with TypeScript
- [ ] Mapbox GL integrated and working
- [ ] Users can upload GeoJSON files
- [ ] Users can draw polygons on map
- [ ] Map shows satellite imagery
- [ ] Analysis results are displayed clearly
- [ ] NDVI chart renders correctly
- [ ] EUDR status shows compliance
- [ ] Carbon metrics are calculated
- [ ] Responsive design works on mobile
- [ ] API calls connect to backend successfully