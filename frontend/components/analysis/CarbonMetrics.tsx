'use client'

import { Leaf, TrendingUp, Scale, Award } from 'lucide-react'
import type { CarbonResult } from '@/types'
import { formatNumber, formatCurrency } from '@/lib/utils'

interface CarbonMetricsProps {
  data: CarbonResult
}

export default function CarbonMetrics({ data }: CarbonMetricsProps) {
  const {
    baselineCarbonTCO2e,
    agbTonnesPerHa,
    areaHa,
    confidence,
    methodology,
    verraMethodology,
    treesAnalyzed,
  } = data

  // Estimate value at $25/tCO2e
  const estimatedValue = baselineCarbonTCO2e * 25

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'high':
        return 'bg-green-100 text-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getConfidenceLabel = (conf: string) => {
    switch (conf) {
      case 'high':
        return 'Alta'
      case 'medium':
        return 'Media'
      default:
        return 'Baja'
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Leaf className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Linea Base de Carbono</h3>
            <p className="text-sm text-gray-500">{verraMethodology}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(confidence)}`}>
          Confianza {getConfidenceLabel(confidence)}
        </span>
      </div>

      {/* Main metric */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6">
        <p className="text-sm text-green-700 mb-2">Carbono Total Almacenado</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-green-700">
            {formatNumber(baselineCarbonTCO2e)}
          </span>
          <span className="text-lg text-green-600">tCO2e</span>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-4 w-4 text-gray-500" />
            <p className="text-sm text-gray-500">Biomasa</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatNumber(agbTonnesPerHa)} t/ha</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <p className="text-sm text-gray-500">Area</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatNumber(areaHa)} ha</p>
        </div>
      </div>

      {/* Value estimation */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-green-600" />
            <span className="text-gray-700 font-medium">Valor Estimado</span>
          </div>
          <span className="text-2xl font-bold text-green-600">
            {formatCurrency(estimatedValue)}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          * Estimacion basada en $25 USD/tCO2e (precio referencial mercado voluntario)
        </p>
      </div>

      {/* Method info */}
      <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
        <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
          Metodo: {methodology}
        </span>
        {treesAnalyzed > 0 && (
          <span className="px-2 py-1 bg-green-100 rounded text-xs text-green-700">
            {treesAnalyzed} arboles analizados
          </span>
        )}
      </div>
    </div>
  )
}
