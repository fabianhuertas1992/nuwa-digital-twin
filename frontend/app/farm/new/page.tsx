'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import PolygonUploader from '@/components/map/PolygonUploader'
import NDVIChart from '@/components/analysis/NDVIChart'
import EUDRStatus from '@/components/analysis/EUDRStatus'
import CarbonMetrics from '@/components/analysis/CarbonMetrics'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { GeoJSONPolygon, NDVIResult, DeforestationResult, CarbonResult } from '@/types'

// Dynamic import for MapViewer to avoid SSR issues with mapbox
const MapViewer = dynamic(() => import('@/components/map/MapViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
    </div>
  ),
})

interface FarmData {
  name?: string;
  owner?: string;
  farmId?: string;
  Name?: string;
  Owner?: string;
  Description?: string;
}

interface AnalysisResultType {
  farmId: string;
  name: string;
  owner?: string;
  polygon: GeoJSONPolygon;
  analysis: {
    ndvi?: NDVIResult;
    deforestation?: DeforestationResult;
    carbon?: CarbonResult;
  };
}

export default function NewFarmPage() {
  const [polygon, setPolygon] = useState<GeoJSONPolygon | null>(null)
  const [farmData, setFarmData] = useState<FarmData>({})
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResultType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePolygonLoaded = (poly: GeoJSONPolygon, data: FarmData) => {
    setPolygon(poly)
    setFarmData({
      name: data.name || data.Name || '',
      owner: data.owner || data.Owner || '',
      farmId: data.farmId || data.Description || '',
      ...data
    })
    setError(null)
  }

  const handleAnalyze = async () => {
    if (!polygon) {
      setError('Por favor carga un poligono primero')
      return
    }

    setAnalyzing(true)
    setError(null)

    try {
      const analysisResult = await api.analyzeFarm(polygon, farmData)
      setResult(analysisResult)
    } catch (err: unknown) {
      console.error('Error en analisis:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al analizar la finca'
      setError(errorMessage)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleReset = () => {
    setPolygon(null)
    setResult(null)
    setFarmData({})
    setError(null)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Nueva Finca</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Map/Upload */}
        <div className="lg:col-span-2 space-y-6">
          {!polygon ? (
            <PolygonUploader onPolygonLoaded={handlePolygonLoaded} />
          ) : (
            <MapViewer initialPolygon={polygon} showDrawControls={false} />
          )}

          {/* Analysis Results */}
          {result && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Resultados del Analisis</h2>

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
            <h2 className="text-xl font-semibold mb-4">Informacion de la Finca</h2>

            {!polygon ? (
              <p className="text-gray-500 text-sm">
                Sube un archivo GeoJSON para comenzar el analisis ambiental de tu finca.
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
                    'Iniciar Analisis'
                  )}
                </Button>

                {result && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-2">
                      Analisis completado exitosamente
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleReset}
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
  )
}
