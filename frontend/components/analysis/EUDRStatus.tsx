'use client'

import { CheckCircle, XCircle, AlertTriangle, TreePine } from 'lucide-react'
import type { DeforestationResult } from '@/types'

interface EUDRStatusProps {
  data: DeforestationResult
}

export default function EUDRStatus({ data }: EUDRStatusProps) {
  const { compliant, deforestationPercent, areaLostHa, initialForestHa } = data

  return (
    <div className={`rounded-xl p-6 shadow-sm border ${
      compliant
        ? 'bg-green-50 border-green-200'
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-start gap-4 mb-6">
        <div className={`p-3 rounded-xl ${compliant ? 'bg-green-100' : 'bg-red-100'}`}>
          {compliant ? (
            <CheckCircle className="h-8 w-8 text-green-600" />
          ) : (
            <XCircle className="h-8 w-8 text-red-600" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            Validacion EUDR
          </h3>
          <p className={`text-lg font-medium ${compliant ? 'text-green-700' : 'text-red-700'}`}>
            {compliant ? 'Cumple con la regulacion' : 'No cumple con la regulacion'}
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="text-gray-600 flex items-center gap-2">
            <TreePine className="h-4 w-4" />
            Deforestacion detectada
          </span>
          <span className={`font-bold text-lg ${
            deforestationPercent < 5 ? 'text-green-600' : 'text-red-600'
          }`}>
            {deforestationPercent.toFixed(2)}%
          </span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="text-gray-600">Area forestal inicial</span>
          <span className="font-semibold">{initialForestHa.toFixed(2)} ha</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="text-gray-600">Area perdida</span>
          <span className={`font-semibold ${areaLostHa > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {areaLostHa.toFixed(2)} ha
          </span>
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-gray-600">Umbral EUDR</span>
          <span className="font-semibold text-gray-500">{'<'} 5%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              deforestationPercent < 5 ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(deforestationPercent * 20, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>0%</span>
          <span className="text-red-500 font-medium">5% (limite)</span>
        </div>
      </div>

      {!compliant && (
        <div className="p-4 bg-amber-100 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Accion requerida</p>
            <p className="text-sm text-amber-700 mt-1">
              Esta finca requiere un plan de reforestacion para ser elegible
              para creditos de carbono bajo la regulacion EUDR.
            </p>
          </div>
        </div>
      )}

      {data.historicalImages && data.historicalImages.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            Imagenes historicas disponibles: {data.historicalImages.length} años
          </p>
        </div>
      )}
    </div>
  )
}
