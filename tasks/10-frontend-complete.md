# Task: Build Complete SaaS Frontend Platform

## Context
Create a complete Next.js 14 web application where farmers can upload GeoJSON polygons, get automatic environmental analysis (NDVI, EUDR, Carbon), and view results. The backend API is already running at http://localhost:3001/api/v1.

## Project Setup

### Step 1: Initialize Next.js Project
```bash
# From project root
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd frontend
```

### Step 2: Install Dependencies
```bash
npm install mapbox-gl @mapbox/mapbox-gl-draw
npm install axios zustand
npm install recharts lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-slot
npm install class-variance-authority clsx tailwind-merge
npm install -D @types/mapbox-gl @types/mapbox__mapbox-gl-draw
```

### Step 3: Environment Variables
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiZmFiaWRyZXMzIiwiYSI6ImNta2V2bTA0eTBjN2szZG9menZ3NmgwZXQifQ.msAV7didLz0VIhM4kiAAjA
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Project Structure
```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── farm/
│       └── new/
│           └── page.tsx
├── components/
│   ├── ui/
│   │   └── button.tsx
│   ├── map/
│   │   ├── MapViewer.tsx
│   │   └── PolygonUploader.tsx
│   └── analysis/
│       ├── NDVIChart.tsx
│       ├── EUDRStatus.tsx
│       └── CarbonMetrics.tsx
├── lib/
│   ├── api.ts
│   ├── utils.ts
│   └── mapbox.ts
└── types/
    └── index.ts
```

## File Implementations

### 1. Types (types/index.ts)
```typescript
export interface Polygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface FarmData {
  name?: string;
  owner?: string;
  farmId?: string;
  location?: any;
}

export interface NDVIResult {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  imageUrl: string;
  imagesUsed: number;
}

export interface DeforestationResult {
  deforestationPercent: number;
  areaLostHa: number;
  initialForestHa: number;
  compliant: boolean;
  historicalImages: Array<{ year: number; url: string }>;
}

export interface CarbonResult {
  baselineCarbonTCO2e: number;
  agbTonnesPerHa: number;
  totalAgbTonnes: number;
  areaHa: number;
  methodology: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface AnalysisResult {
  farmId: string;
  name: string;
  owner?: string;
  polygon: Polygon;
  analysis: {
    ndvi?: NDVIResult;
    deforestation?: DeforestationResult;
    carbon?: CarbonResult;
  };
}
```

### 2. API Client (lib/api.ts)
```typescript
import axios from 'axios';
import type { Polygon, FarmData, AnalysisResult } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  async analyzeFarm(polygon: Polygon, farmData: FarmData): Promise<AnalysisResult> {
    const response = await apiClient.post('/farms', {
      polygon,
      name: farmData.name || 'Nueva Finca',
      owner: farmData.owner,
      projectId: farmData.farmId || `farm-${Date.now()}`,
    });
    return response.data.data;
  },

  async healthCheck(): Promise<{ status: string }> {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

export default api;
```

### 3. Utils (lib/utils.ts)
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

export function formatCurrency(num: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(num);
}
```

### 4. Button Component (components/ui/button.tsx)
```typescript
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-green-600 text-white hover:bg-green-700',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50',
        ghost: 'hover:bg-gray-100',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### 5. PolygonUploader Component (components/map/PolygonUploader.tsx)
```typescript
'use client';

import { useState } from 'react';
import { Upload, CheckCircle } from 'lucide-react';

interface PolygonUploaderProps {
  onPolygonLoaded: (polygon: any, farmData: any) => void;
}

export default function PolygonUploader({ onPolygonLoaded }: PolygonUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        let polygon;
        let farmData: any = {};
        
        // Handle FeatureCollection
        if (json.type === 'FeatureCollection' && json.features?.length > 0) {
          const feature = json.features[0];
          polygon = feature.geometry;
          farmData = feature.properties || {};
          
          // Remove Z coordinates if present
          if (polygon.coordinates?.[0]?.[0]?.length === 3) {
            polygon.coordinates = polygon.coordinates.map((ring: any) =>
              ring.map((coord: any) => [coord[0], coord[1]])
            );
          }
        } 
        // Handle single Feature
        else if (json.type === 'Feature') {
          polygon = json.geometry;
          farmData = json.properties || {};
          
          if (polygon.coordinates?.[0]?.[0]?.length === 3) {
            polygon.coordinates = polygon.coordinates.map((ring: any) =>
              ring.map((coord: any) => [coord[0], coord[1]])
            );
          }
        } 
        // Handle direct polygon
        else if (json.polygon) {
          polygon = json.polygon;
          farmData = { ...json };
          delete farmData.polygon;
        } 
        // Handle raw Polygon geometry
        else if (json.type === 'Polygon') {
          polygon = json;
        } else {
          throw new Error('Formato GeoJSON no reconocido');
        }
        
        if (!polygon || polygon.type !== 'Polygon') {
          throw new Error('El archivo debe contener un polígono válido');
        }
        
        setIsLoaded(true);
        setFileName(file.name);
        onPolygonLoaded(polygon, farmData);
      } catch (error: any) {
        alert('Error al leer archivo: ' + error.message);
        setIsLoaded(false);
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
    } else {
      alert('Por favor sube un archivo .json o .geojson');
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
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
        isDragging 
          ? 'border-green-500 bg-green-50' 
          : isLoaded
          ? 'border-green-500 bg-green-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {isLoaded ? (
        <>
          <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
          <p className="text-lg font-medium text-green-700 mb-2">
            Polígono cargado correctamente
          </p>
          <p className="text-sm text-gray-600">{fileName}</p>
        </>
      ) : (
        <>
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">
            Arrastra tu archivo GeoJSON aquí
          </p>
          <p className="text-sm text-gray-500 mb-4">
            o haz clic para seleccionar
          </p>
          <label className="inline-block">
            <input
              type="file"
              accept=".json,.geojson"
              onChange={handleFileInput}
              className="hidden"
            />
            <span className="px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700 inline-block">
              Seleccionar archivo
            </span>
          </label>
          <p className="text-xs text-gray-400 mt-4">
            Formatos soportados: .json, .geojson
          </p>
        </>
      )}
    </div>
  );
}
```

### 6. MapViewer Component (components/map/MapViewer.tsx)
```typescript
'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewerProps {
  polygon?: any;
  center?: [number, number];
  zoom?: number;
}

export default function MapViewer({
  polygon,
  center = [-75.0639, 4.9214],
  zoom = 14
}: MapViewerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error('Mapbox token not found');
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: center,
      zoom: zoom
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    if (polygon) {
      map.current.on('load', () => {
        if (!map.current) return;

        // Add polygon source
        map.current.addSource('polygon', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: polygon
          }
        });

        // Add fill layer
        map.current.addLayer({
          id: 'polygon-fill',
          type: 'fill',
          source: 'polygon',
          paint: {
            'fill-color': '#10b981',
            'fill-opacity': 0.3
          }
        });

        // Add outline layer
        map.current.addLayer({
          id: 'polygon-outline',
          type: 'line',
          source: 'polygon',
          paint: {
            'line-color': '#059669',
            'line-width': 3
          }
        });

        // Fit to polygon bounds
        const coordinates = polygon.coordinates[0];
        const bounds = coordinates.reduce((bounds: any, coord: any) => {
          return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
        
        map.current.fitBounds(bounds, { padding: 50 });
      });
    }

    return () => {
      map.current?.remove();
    };
  }, [polygon, center, zoom]);

  return (
    <div 
      ref={mapContainer} 
      className="w-full h-[500px] rounded-lg overflow-hidden shadow-lg" 
    />
  );
}
```

### 7. Analysis Components

#### NDVIChart (components/analysis/NDVIChart.tsx)
```typescript
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { NDVIResult } from '@/types';

interface NDVIChartProps {
  data: NDVIResult;
}

export default function NDVIChart({ data }: NDVIChartProps) {
  const chartData = [
    { name: 'Mínimo', value: data.min },
    { name: 'Media', value: data.mean },
    { name: 'Mediana', value: data.median },
    { name: 'Máximo', value: data.max }
  ];

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Índice de Vegetación NDVI</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500">Media</p>
          <p className="text-2xl font-bold text-green-600">{data.mean.toFixed(3)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Desviación</p>
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

      <div className="mt-4 text-xs text-gray-500">
        Basado en {data.imagesUsed} imágenes Sentinel-2
      </div>
    </div>
  );
}
```

#### EUDRStatus (components/analysis/EUDRStatus.tsx)
```typescript
'use client';

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { DeforestationResult } from '@/types';

interface EUDRStatusProps {
  data: DeforestationResult;
}

export default function EUDRStatus({ data }: EUDRStatusProps) {
  const { compliant, deforestationPercent, areaLostHa } = data;

  return (
    <div className={`rounded-lg p-6 shadow-sm border ${
      compliant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center gap-3 mb-4">
        {compliant ? (
          <CheckCircle className="h-8 w-8 text-green-600" />
        ) : (
          <XCircle className="h-8 w-8 text-red-600" />
        )}
        <div>
          <h3 className="text-lg font-semibold">Validación EUDR</h3>
          <p className={`text-sm font-medium ${
            compliant ? 'text-green-700' : 'text-red-700'
          }`}>
            {compliant ? '✓ Cumple con la regulación' : '✗ No cumple con la regulación'}
          </p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Deforestación detectada:</span>
          <span className="font-semibold text-lg">{deforestationPercent.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Área perdida:</span>
          <span className="font-semibold">{areaLostHa.toFixed(2)} ha</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Umbral EUDR:</span>
          <span className="font-semibold">5.0%</span>
        </div>
      </div>
      
      {!compliant && (
        <div className="mt-4 p-3 bg-amber-100 rounded-md flex items-start gap-2 border border-amber-200">
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

#### CarbonMetrics (components/analysis/CarbonMetrics.tsx)
```typescript
'use client';

import { Leaf } from 'lucide-react';
import type { CarbonResult } from '@/types';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface CarbonMetricsProps {
  data: CarbonResult;
}

export default function CarbonMetrics({ data }: CarbonMetricsProps) {
  const {
    baselineCarbonTCO2e,
    agbTonnesPerHa,
    areaHa,
    confidence,
    methodology
  } = data;

  const estimatedValue = baselineCarbonTCO2e * 25;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 rounded-lg">
          <Leaf className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Línea Base de Carbono</h3>
          <p className="text-sm text-gray-500">{methodology}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Carbono Total</p>
          <p className="text-3xl font-bold text-green-600">
            {formatNumber(baselineCarbonTCO2e)} tCO₂e
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Biomasa/ha</p>
            <p className="text-xl font-semibold">{formatNumber(agbTonnesPerHa)} t/ha</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Área</p>
            <p className="text-xl font-semibold">{formatNumber(areaHa)} ha</p>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Confianza:</span>
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
              {formatCurrency(estimatedValue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 8. Root Layout (app/layout.tsx)
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NUWA - Digital Twin Agroforestal',
  description: 'Plataforma SaaS para análisis ambiental y tokenización de carbono',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <nav className="border-b bg-white">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">N</span>
              </div>
              <span className="text-xl font-bold">NUWA</span>
            </Link>
            
            <div className="flex items-center gap-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Inicio
              </Link>
              <Link 
                href="/farm/new"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                + Nueva Finca
              </Link>
            </div>
          </div>
        </nav>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
```

### 9. Home Page (app/page.tsx)
```typescript
import Link from 'next/link';
import { Leaf, Map, Shield, Coins } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">
          Digital Twin Agroforestal
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Analiza tu finca, valida compliance EUDR y tokeniza tu carbono
        </p>
        <Link
          href="/farm/new"
          className="inline-block px-8 py-4 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700"
        >
          Comenzar Análisis
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Map className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Geolocalización</h3>
          <p className="text-gray-600 text-sm">
            Sube tu polígono GeoJSON o dibújalo en el mapa
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Leaf className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Análisis NDVI</h3>
          <p className="text-gray-600 text-sm">
            Índice de vegetación histórico con Sentinel-2
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Validación EUDR</h3>
          <p className="text-gray-600 text-sm">
            Verifica compliance sin deforestación
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Coins className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Carbono Base</h3>
          <p className="text-gray-600 text-sm">
            Calcula tCO₂e según metodología Verra VM0042
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 10. New Farm Page (app/farm/new/page.tsx)
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MapViewer from '@/components/map/MapViewer';
import PolygonUploader from '@/components/map/PolygonUploader';
import NDVIChart from '@/components/analysis/NDVIChart';
import EUDRStatus from '@/components/analysis/EUDRStatus';
import CarbonMetrics from '@/components/analysis/CarbonMetrics';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import type { Polygon, FarmData, AnalysisResult } from '@/types';

export default function NewFarmPage() {
  const router = useRouter();
  const [polygon, setPolygon] = useState<Polygon | null>(null);
  const [farmData, setFarmData] = useState<FarmData>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePolygonLoaded = (poly: Polygon, data: FarmData) => {
    setPolygon(poly);
    setFarmData({
      name: data.name || data.Name || '',
      owner: data.owner || data.Owner || '',
      farmId: data.farmId || data.Description || '',
      ...data
    });
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!polygon) {
      setError('Por favor carga un polígono primero');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const analysisResult = await api.analyzeFarm(polygon, farmData);
      setResult(analysisResult);
    } catch (err: any) {
      console.error('Error en análisis:', err);
      setError(err.response?.data?.error || err.message || 'Error al analizar la finca');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Nueva Finca</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">❌ {error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Map/Upload */}
        <div className="lg:col-span-2 space-y-6">
          {!polygon ? (
            <PolygonUploader onPolygonLoaded={handlePolygonLoaded} />
          ) : (
            <MapViewer polygon={polygon} />
          )}

          {/* Analysis Results */}
          {result && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Resultados del Análisis</h2>
              
              {result.analysis.ndvi && (
                <NDVIChart data={result.analysis.ndvi} />
              )}

              {result.analysis.deforestation && (
                <EUDRStatus data={result.analysis.deforestation} />
              )}

              {result.analysis.carbon && (
                <CarbonMetrics data={result.analysis.carbon} />
              )}
            </div>
          )}
        </div>

        {/* Right Column - Info & Actions */}
        <div>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 sticky top-4">
            <h2 className="text-xl font-semibold mb-4">Información de la Finca</h2>
            
            {!polygon ? (
              <p className="text-gray-500 text-sm">
                Sube un archivo GeoJSON para comenzar el análisis ambiental de tu finca.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nombre de la finca
                  </label>
                  <input
                    type="text"
                    value={farmData.name || ''}
                    onChange={(e) => setFarmData({ ...farmData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: Finca El Sinai"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Propietario
                  </label>
                  <input
                    type="text"
                    value={farmData.owner || ''}
                    onChange={(e) => setFarmData({ ...farmData, owner: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Nombre del propietario"
                  />
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full"
                  size="lg"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    'Iniciar Análisis'
                  )}
                </Button>

                {result && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-2">
                      Análisis completado exitosamente
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setPolygon(null);
                        setResult(null);
                        setFarmData({});
                      }}
                    >
                      Analizar otra finca
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 11. Global Styles (app/globals.css)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## Acceptance Criteria
- [ ] Next.js 14 project initialized
- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] Mapbox integration working
- [ ] Users can upload GeoJSON files
- [ ] Map displays polygons correctly
- [ ] API calls to backend work
- [ ] NDVI chart renders
- [ ] EUDR status displays correctly
- [ ] Carbon metrics show properly
- [ ] Responsive design works
- [ ] Error handling implemented
- [ ] Loading states work
- [ ] Navigation between pages works