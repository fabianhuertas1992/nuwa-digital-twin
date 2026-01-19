'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TreePine,
  Leaf,
  TrendingUp,
  PlusCircle,
  ExternalLink,
  CheckCircle,
  XCircle,
  Trash2,
} from 'lucide-react'
import { getFarms, deleteFarm, StoredFarm } from '@/lib/farmStore'

// Mock data for demonstration (will be merged with stored farms)
const mockFarms: StoredFarm[] = [
  {
    id: '1',
    name: 'Finca El Sinai',
    owner: 'Juan Carlos Rodriguez',
    location: 'Tolima, Colombia',
    areaHa: 45.2,
    lastAnalysis: '2024-01-10',
    createdAt: '2023-06-15',
    status: 'warning',
    eudrValidationStatus: 'rejected',
    nftStatus: 'not_minted',
    baselineVerified: true,
    polygon: { type: 'Polygon', coordinates: [] },
    analysis: {
      ndvi: { mean: 0.72, median: 0.74, std: 0.08, min: 0.45, max: 0.89, cloudCoverage: 12.5, calculatedAt: '2024-01-10' },
      deforestation: { deforestationPercent: 6.2, areaLostHa: 2.8, initialForestHa: 45.2, compliant: false, analysisDate: '2024-01-10', methodology: 'Hansen GFC' },
      carbon: { baselineCarbonTCO2e: 1250, agbTonnesPerHa: 55, totalAgbTonnes: 2486, areaHa: 45.2, methodology: 'satellite', confidence: 'high', verraMethodology: 'VM0042', totalCarbonTonnes: 605, treesAnalyzed: 0, calculationDate: '2024-01-10' },
    },
  },
  {
    id: '2',
    name: 'Finca Fedar',
    owner: 'Maria Elena Gomez',
    location: 'Huila, Colombia',
    areaHa: 28.5,
    lastAnalysis: '2024-01-12',
    createdAt: '2023-08-20',
    status: 'healthy',
    eudrValidationStatus: 'active',
    nftStatus: 'minted',
    baselineVerified: true,
    nft: { tokenId: 'NUWA_FEDAR_2024', txHash: '0x7a2f8c9e', ipfsHash: 'QmX8Y9Z7', mintedAt: '2024-01-12' },
    polygon: { type: 'Polygon', coordinates: [] },
    analysis: {
      ndvi: { mean: 0.68, median: 0.70, std: 0.06, min: 0.52, max: 0.82, cloudCoverage: 8.3, calculatedAt: '2024-01-12' },
      deforestation: { deforestationPercent: 2.1, areaLostHa: 0.6, initialForestHa: 28.5, compliant: true, analysisDate: '2024-01-12', methodology: 'Hansen GFC' },
      carbon: { baselineCarbonTCO2e: 780, agbTonnesPerHa: 48, totalAgbTonnes: 1368, areaHa: 28.5, methodology: 'satellite', confidence: 'medium', verraMethodology: 'VM0042', totalCarbonTonnes: 377, treesAnalyzed: 0, calculationDate: '2024-01-12' },
    },
  },
  {
    id: '3',
    name: 'Granja Paraiso',
    owner: 'Pedro Antonio Silva',
    location: 'Cauca, Colombia',
    areaHa: 62.0,
    lastAnalysis: '2024-01-08',
    createdAt: '2023-03-10',
    status: 'critical',
    eudrValidationStatus: 'rejected',
    nftStatus: 'not_minted',
    baselineVerified: true,
    polygon: { type: 'Polygon', coordinates: [] },
    analysis: {
      ndvi: { mean: 0.45, median: 0.43, std: 0.12, min: 0.22, max: 0.68, cloudCoverage: 18.7, calculatedAt: '2024-01-08' },
      deforestation: { deforestationPercent: 12.5, areaLostHa: 7.75, initialForestHa: 62.0, compliant: false, analysisDate: '2024-01-08', methodology: 'Hansen GFC' },
      carbon: { baselineCarbonTCO2e: 1890, agbTonnesPerHa: 42, totalAgbTonnes: 2604, areaHa: 62.0, methodology: 'satellite', confidence: 'medium', verraMethodology: 'VM0042', totalCarbonTonnes: 915, treesAnalyzed: 0, calculationDate: '2024-01-08' },
    },
  },
  {
    id: '4',
    name: 'Patio Bonito',
    owner: 'Ana Lucia Mendez',
    location: 'Quindio, Colombia',
    areaHa: 35.8,
    lastAnalysis: '2024-01-15',
    createdAt: '2023-11-05',
    status: 'healthy',
    eudrValidationStatus: 'approved',
    nftStatus: 'not_minted',
    baselineVerified: true,
    polygon: { type: 'Polygon', coordinates: [] },
    analysis: {
      ndvi: { mean: 0.81, median: 0.83, std: 0.05, min: 0.68, max: 0.92, cloudCoverage: 5.2, calculatedAt: '2024-01-15' },
      deforestation: { deforestationPercent: 1.8, areaLostHa: 0.64, initialForestHa: 35.8, compliant: true, analysisDate: '2024-01-15', methodology: 'Hansen GFC' },
      carbon: { baselineCarbonTCO2e: 950, agbTonnesPerHa: 52, totalAgbTonnes: 1861.6, areaHa: 35.8, methodology: 'satellite', confidence: 'high', verraMethodology: 'VM0042', totalCarbonTonnes: 460, treesAnalyzed: 0, calculationDate: '2024-01-15' },
    },
  },
]

export default function DashboardPage() {
  const [farms, setFarms] = useState<StoredFarm[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load farms from localStorage and merge with mock data
    const storedFarms = getFarms()
    const storedIds = new Set(storedFarms.map(f => f.id))

    // Only add mock farms that aren't already in stored farms
    const combinedFarms = [
      ...storedFarms,
      ...mockFarms.filter(f => !storedIds.has(f.id))
    ]

    setFarms(combinedFarms)
    setIsLoading(false)
  }, [])

  const handleDelete = (farmId: string) => {
    if (confirm('¿Estas seguro de eliminar esta finca?')) {
      deleteFarm(farmId)
      setFarms(farms.filter(f => f.id !== farmId))
    }
  }

  // Calculate stats from current farms
  const stats = {
    totalFarms: farms.length,
    totalArea: farms.reduce((sum, f) => sum + (f.areaHa || 0), 0),
    totalCarbon: farms.reduce((sum, f) => sum + (f.analysis?.carbon?.baselineCarbonTCO2e || 0), 0),
    averageNDVI: farms.length > 0
      ? farms.reduce((sum, f) => sum + (f.analysis?.ndvi?.mean || 0), 0) / farms.length
      : 0,
    compliantFarms: farms.filter(f => f.analysis?.deforestation?.compliant).length,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-700'
      case 'warning':
        return 'bg-yellow-100 text-yellow-700'
      case 'critical':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mb-8"></div>
          <div className="grid grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Resumen de tus fincas y analisis ambientales
          </p>
        </div>
        <Link
          href="/farm/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          <PlusCircle className="h-5 w-5" />
          Nueva Finca
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TreePine className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Total Fincas</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalFarms}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Area Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalArea.toFixed(1)} ha</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Leaf className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-sm text-gray-500">Carbono Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalCarbon.toLocaleString()} tCO2e</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Leaf className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">NDVI Promedio</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.averageNDVI.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">EUDR Cumple</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.compliantFarms}/{stats.totalFarms}</p>
        </div>
      </div>

      {/* Farms Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Mis Fincas</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Finca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Area
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NDVI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carbono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EUDR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {farms.map((farm) => {
                const ndviMean = farm.analysis?.ndvi?.mean || 0
                const carbonTCO2e = farm.analysis?.carbon?.baselineCarbonTCO2e || 0
                const eudrCompliant = farm.analysis?.deforestation?.compliant ?? false

                return (
                  <tr key={farm.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <TreePine className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{farm.name}</p>
                          <p className="text-sm text-gray-500">
                            Ultimo: {farm.lastAnalysis}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {farm.areaHa?.toFixed(1) || 'N/A'} ha
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${
                        ndviMean >= 0.6 ? 'text-green-600' :
                        ndviMean >= 0.4 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {ndviMean.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {carbonTCO2e.toLocaleString()} tCO2e
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {eudrCompliant ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Cumple
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          No cumple
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(farm.status)}`}>
                        {getStatusLabel(farm.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/farm/${farm.id}`}
                          className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium"
                        >
                          Ver detalles
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        {!['1', '2', '3', '4'].includes(farm.id) && (
                          <button
                            onClick={() => handleDelete(farm.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {farms.length === 0 && (
          <div className="px-6 py-12 text-center">
            <TreePine className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No tienes fincas registradas</p>
            <Link
              href="/farm/new"
              className="inline-flex items-center gap-2 mt-4 text-green-600 hover:text-green-700 font-medium"
            >
              <PlusCircle className="h-5 w-5" />
              Agregar tu primera finca
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
