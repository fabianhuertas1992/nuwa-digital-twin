'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  TreePine,
  Leaf,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Download,
  Share2,
} from 'lucide-react'
import NDVIChart from '@/components/analysis/NDVIChart'
import EUDRStatus from '@/components/analysis/EUDRStatus'
import CarbonMetrics from '@/components/analysis/CarbonMetrics'
import { Button } from '@/components/ui/button'

// Dynamic import for MapViewer to avoid SSR issues with mapbox
const MapViewer = dynamic(() => import('@/components/map/MapViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
    </div>
  ),
})

// Mock data for farms - in production this would come from API/database
const mockFarmsData: Record<string, {
  id: string;
  name: string;
  owner: string;
  location: string;
  areaHa: number;
  lastAnalysis: string;
  createdAt: string;
  status: string;
  polygon: {
    type: 'Feature';
    geometry: {
      type: 'Polygon';
      coordinates: number[][][];
    };
  };
  analysis: {
    ndvi: {
      mean: number;
      median: number;
      std: number;
      min: number;
      max: number;
      cloudCoverage: number;
      calculatedAt: string;
      imageUrl?: string;
    };
    deforestation: {
      deforestationPercent: number;
      areaLostHa: number;
      initialForestHa: number;
      compliant: boolean;
      analyzedPeriod: { startDate: string; endDate: string };
      methodology: string;
    };
    carbon: {
      baselineCarbonTCO2e: number;
      agbTonnesPerHa: number;
      totalAgbTonnes: number;
      areaHa: number;
      methodology: string;
      confidence: string;
      verraMethodology: string;
      breakdown: { abovegroundBiomass: number; belowgroundBiomass: number };
    };
  };
}> = {
  '1': {
    id: '1',
    name: 'Finca El Sinai',
    owner: 'Juan Carlos Rodriguez',
    location: 'Tolima, Colombia',
    areaHa: 45.2,
    lastAnalysis: '2024-01-10',
    createdAt: '2023-06-15',
    status: 'warning',
    polygon: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-75.041159, 4.907896], [-75.043946, 4.910125], [-75.040981, 4.910710], [-75.041159, 4.907896]]]
      }
    },
    analysis: {
      ndvi: {
        mean: 0.72,
        median: 0.74,
        std: 0.08,
        min: 0.45,
        max: 0.89,
        cloudCoverage: 12.5,
        calculatedAt: '2024-01-10T14:30:00Z',
      },
      deforestation: {
        deforestationPercent: 6.2,
        areaLostHa: 2.8,
        initialForestHa: 45.2,
        compliant: false,
        analyzedPeriod: { startDate: '2019-01-10', endDate: '2024-01-10' },
        methodology: 'Hansen GFC + Sentinel-2 validation',
      },
      carbon: {
        baselineCarbonTCO2e: 1250,
        agbTonnesPerHa: 55,
        totalAgbTonnes: 2486,
        areaHa: 45.2,
        methodology: 'satellite',
        confidence: 'high',
        verraMethodology: 'VM0042',
        breakdown: { abovegroundBiomass: 1125, belowgroundBiomass: 125 },
      },
    },
  },
  '2': {
    id: '2',
    name: 'Finca Fedar',
    owner: 'Maria Elena Gomez',
    location: 'Huila, Colombia',
    areaHa: 28.5,
    lastAnalysis: '2024-01-12',
    createdAt: '2023-08-20',
    status: 'healthy',
    polygon: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-75.5, 2.5], [-75.52, 2.52], [-75.48, 2.53], [-75.5, 2.5]]]
      }
    },
    analysis: {
      ndvi: {
        mean: 0.68,
        median: 0.70,
        std: 0.06,
        min: 0.52,
        max: 0.82,
        cloudCoverage: 8.3,
        calculatedAt: '2024-01-12T10:15:00Z',
      },
      deforestation: {
        deforestationPercent: 2.1,
        areaLostHa: 0.6,
        initialForestHa: 28.5,
        compliant: true,
        analyzedPeriod: { startDate: '2019-01-12', endDate: '2024-01-12' },
        methodology: 'Hansen GFC + Sentinel-2 validation',
      },
      carbon: {
        baselineCarbonTCO2e: 780,
        agbTonnesPerHa: 48,
        totalAgbTonnes: 1368,
        areaHa: 28.5,
        methodology: 'satellite',
        confidence: 'medium',
        verraMethodology: 'VM0042',
        breakdown: { abovegroundBiomass: 702, belowgroundBiomass: 78 },
      },
    },
  },
  '3': {
    id: '3',
    name: 'Granja Paraiso',
    owner: 'Pedro Antonio Silva',
    location: 'Cauca, Colombia',
    areaHa: 62.0,
    lastAnalysis: '2024-01-08',
    createdAt: '2023-03-10',
    status: 'critical',
    polygon: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-76.2, 2.8], [-76.25, 2.85], [-76.18, 2.87], [-76.2, 2.8]]]
      }
    },
    analysis: {
      ndvi: {
        mean: 0.45,
        median: 0.43,
        std: 0.12,
        min: 0.22,
        max: 0.68,
        cloudCoverage: 18.7,
        calculatedAt: '2024-01-08T09:45:00Z',
      },
      deforestation: {
        deforestationPercent: 12.5,
        areaLostHa: 7.75,
        initialForestHa: 62.0,
        compliant: false,
        analyzedPeriod: { startDate: '2019-01-08', endDate: '2024-01-08' },
        methodology: 'Hansen GFC + Sentinel-2 validation',
      },
      carbon: {
        baselineCarbonTCO2e: 1890,
        agbTonnesPerHa: 42,
        totalAgbTonnes: 2604,
        areaHa: 62.0,
        methodology: 'satellite',
        confidence: 'medium',
        verraMethodology: 'VM0042',
        breakdown: { abovegroundBiomass: 1701, belowgroundBiomass: 189 },
      },
    },
  },
  '4': {
    id: '4',
    name: 'Patio Bonito',
    owner: 'Ana Lucia Mendez',
    location: 'Quindio, Colombia',
    areaHa: 35.8,
    lastAnalysis: '2024-01-15',
    createdAt: '2023-11-05',
    status: 'healthy',
    polygon: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-75.7, 4.5], [-75.73, 4.53], [-75.68, 4.54], [-75.7, 4.5]]]
      }
    },
    analysis: {
      ndvi: {
        mean: 0.81,
        median: 0.83,
        std: 0.05,
        min: 0.68,
        max: 0.92,
        cloudCoverage: 5.2,
        calculatedAt: '2024-01-15T16:20:00Z',
      },
      deforestation: {
        deforestationPercent: 1.8,
        areaLostHa: 0.64,
        initialForestHa: 35.8,
        compliant: true,
        analyzedPeriod: { startDate: '2019-01-15', endDate: '2024-01-15' },
        methodology: 'Hansen GFC + Sentinel-2 validation',
      },
      carbon: {
        baselineCarbonTCO2e: 950,
        agbTonnesPerHa: 52,
        totalAgbTonnes: 1861.6,
        areaHa: 35.8,
        methodology: 'satellite',
        confidence: 'high',
        verraMethodology: 'VM0042',
        breakdown: { abovegroundBiomass: 855, belowgroundBiomass: 95 },
      },
    },
  },
}

export default function FarmDetailPage() {
  const params = useParams()
  const farmId = params.id as string
  const farm = mockFarmsData[farmId]

  if (!farm) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <TreePine className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Finca no encontrada</h1>
        <p className="text-gray-500 mb-6">
          La finca con ID &quot;{farmId}&quot; no existe en el sistema.
        </p>
        <Link href="/dashboard">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Saludable'
      case 'warning':
        return 'Alerta'
      case 'critical':
        return 'Critico'
      default:
        return 'Desconocido'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <TreePine className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{farm.name}</h1>
              <div className="flex items-center gap-4 mt-1 text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {farm.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Ultimo analisis: {farm.lastAnalysis}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(farm.status)}`}>
              {getStatusLabel(farm.status)}
            </span>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-analizar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Compartir
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Area Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{farm.areaHa} ha</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Leaf className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">NDVI Promedio</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{farm.analysis.ndvi.mean.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TreePine className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-sm text-gray-500">Carbono</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{farm.analysis.carbon.baselineCarbonTCO2e.toLocaleString()} tCO2e</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${farm.analysis.deforestation.compliant ? 'bg-green-100' : 'bg-red-100'}`}>
              {farm.analysis.deforestation.compliant ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <span className="text-sm text-gray-500">EUDR</span>
          </div>
          <p className={`text-2xl font-bold ${farm.analysis.deforestation.compliant ? 'text-green-600' : 'text-red-600'}`}>
            {farm.analysis.deforestation.compliant ? 'Cumple' : 'No Cumple'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Map & Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Ubicacion de la Finca</h2>
            </div>
            <div className="p-4">
              <MapViewer initialPolygon={farm.polygon} showDrawControls={false} />
            </div>
          </div>

          {/* NDVI Analysis */}
          <NDVIChart data={farm.analysis.ndvi} />

          {/* EUDR Status */}
          <EUDRStatus data={farm.analysis.deforestation} />

          {/* Carbon Metrics */}
          <CarbonMetrics data={farm.analysis.carbon} />
        </div>

        {/* Right Column - Farm Info */}
        <div className="space-y-6">
          {/* Farm Details Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informacion de la Finca</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Propietario</label>
                <p className="font-medium text-gray-900">{farm.owner}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Ubicacion</label>
                <p className="font-medium text-gray-900">{farm.location}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Fecha de Registro</label>
                <p className="font-medium text-gray-900">{farm.createdAt}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Ultimo Analisis</label>
                <p className="font-medium text-gray-900">{farm.lastAnalysis}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Area Total</label>
                <p className="font-medium text-gray-900">{farm.areaHa} hectareas</p>
              </div>
            </div>
          </div>

          {/* Carbon Value Card */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-sm p-6 text-white">
            <h2 className="text-lg font-semibold mb-4">Valor Estimado de Carbono</h2>

            <div className="text-4xl font-bold mb-2">
              ${(farm.analysis.carbon.baselineCarbonTCO2e * 25).toLocaleString()}
            </div>
            <p className="text-green-100 text-sm mb-4">
              Basado en $25 USD/tCO2e
            </p>

            <div className="bg-white/20 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span>Creditos disponibles:</span>
                <span className="font-semibold">{farm.analysis.carbon.baselineCarbonTCO2e.toLocaleString()} tCO2e</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rapidas</h2>

            <div className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar Analisis NDVI
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <TreePine className="h-4 w-4 mr-2" />
                Recalcular Carbono
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Descargar Reporte PDF
              </Button>
              <Button className="w-full justify-start bg-green-600 hover:bg-green-700 text-white">
                <Leaf className="h-4 w-4 mr-2" />
                Generar Certificado NFT
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
