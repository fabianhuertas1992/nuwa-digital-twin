'use client'

import Link from 'next/link'
import {
  TreePine,
  Leaf,
  TrendingUp,
  PlusCircle,
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react'

// Mock data for demonstration
const mockFarms = [
  {
    id: '1',
    name: 'Finca El Sinai',
    areaHa: 45.2,
    lastAnalysis: '2024-01-10',
    ndviMean: 0.72,
    carbonTCO2e: 1250,
    eudrCompliant: false,
    status: 'warning',
  },
  {
    id: '2',
    name: 'Finca Fedar',
    areaHa: 28.5,
    lastAnalysis: '2024-01-12',
    ndviMean: 0.68,
    carbonTCO2e: 780,
    eudrCompliant: true,
    status: 'healthy',
  },
  {
    id: '3',
    name: 'Granja Paraiso',
    areaHa: 62.0,
    lastAnalysis: '2024-01-08',
    ndviMean: 0.45,
    carbonTCO2e: 1890,
    eudrCompliant: false,
    status: 'critical',
  },
  {
    id: '4',
    name: 'Patio Bonito',
    areaHa: 35.8,
    lastAnalysis: '2024-01-15',
    ndviMean: 0.81,
    carbonTCO2e: 950,
    eudrCompliant: true,
    status: 'healthy',
  },
]

const stats = {
  totalFarms: 4,
  totalArea: 171.5,
  totalCarbon: 4870,
  averageNDVI: 0.665,
  compliantFarms: 2,
}

export default function DashboardPage() {
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
          <p className="text-2xl font-bold text-gray-900">{stats.totalArea} ha</p>
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
              {mockFarms.map((farm) => (
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
                    {farm.areaHa} ha
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${
                      farm.ndviMean >= 0.6 ? 'text-green-600' :
                      farm.ndviMean >= 0.4 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {farm.ndviMean.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {farm.carbonTCO2e.toLocaleString()} tCO2e
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {farm.eudrCompliant ? (
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
                    <Link
                      href={`/farm/${farm.id}`}
                      className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      Ver detalles
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {mockFarms.length === 0 && (
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
