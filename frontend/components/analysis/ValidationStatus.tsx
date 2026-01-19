'use client'

import { CheckCircle, Clock, AlertCircle, Loader2, Shield, FileCheck, Sparkles } from 'lucide-react'

export type ValidationStep = 'pending' | 'validating' | 'approved' | 'active' | 'rejected'

interface ValidationStatusProps {
  eudrStatus: ValidationStep
  nftStatus: 'not_minted' | 'minting' | 'minted'
  baselineVerified: boolean
  deforestationPercent: number
  onMintNFT?: () => void
}

const steps = [
  {
    id: 'baseline',
    label: 'Linea Base',
    description: 'Datos satelitales capturados',
  },
  {
    id: 'eudr',
    label: 'Validacion EUDR',
    description: 'Verificacion deforestacion <5%',
  },
  {
    id: 'nft',
    label: 'NFT Digital Twin',
    description: 'Certificado en blockchain',
  },
]

export default function ValidationStatus({
  eudrStatus,
  nftStatus,
  baselineVerified,
  deforestationPercent,
  onMintNFT,
}: ValidationStatusProps) {
  const getStepStatus = (stepId: string): 'completed' | 'current' | 'pending' | 'error' => {
    if (stepId === 'baseline') {
      return baselineVerified ? 'completed' : 'current'
    }
    if (stepId === 'eudr') {
      if (!baselineVerified) return 'pending'
      if (eudrStatus === 'rejected') return 'error'
      if (eudrStatus === 'approved' || eudrStatus === 'active') return 'completed'
      if (eudrStatus === 'validating') return 'current'
      return 'pending'
    }
    if (stepId === 'nft') {
      if (eudrStatus !== 'approved' && eudrStatus !== 'active') return 'pending'
      if (nftStatus === 'minted') return 'completed'
      if (nftStatus === 'minting') return 'current'
      return 'pending'
    }
    return 'pending'
  }

  const getOverallStatus = () => {
    if (nftStatus === 'minted') {
      return { label: 'Activo', color: 'text-green-600', bg: 'bg-green-100', icon: Sparkles }
    }
    if (eudrStatus === 'rejected') {
      return { label: 'Rechazado', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle }
    }
    if (eudrStatus === 'approved') {
      return { label: 'Aprobado', color: 'text-blue-600', bg: 'bg-blue-100', icon: FileCheck }
    }
    if (eudrStatus === 'validating') {
      return { label: 'Validando', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Loader2 }
    }
    return { label: 'Pendiente', color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock }
  }

  const status = getOverallStatus()
  const StatusIcon = status.icon

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Shield className="h-5 w-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Estado de Validacion</h2>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bg}`}>
          <StatusIcon className={`h-4 w-4 ${status.color} ${status.label === 'Validando' ? 'animate-spin' : ''}`} />
          <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
        </div>
      </div>

      <div className="p-6">
        {/* Progress Steps */}
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{
                width:
                  nftStatus === 'minted'
                    ? '100%'
                    : eudrStatus === 'approved' || eudrStatus === 'active'
                    ? '66%'
                    : baselineVerified
                    ? '33%'
                    : '0%',
              }}
            />
          </div>

          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const stepStatus = getStepStatus(step.id)

              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      stepStatus === 'completed'
                        ? 'bg-green-500 border-green-500 text-white'
                        : stepStatus === 'current'
                        ? 'bg-white border-blue-500 text-blue-500'
                        : stepStatus === 'error'
                        ? 'bg-red-100 border-red-500 text-red-500'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {stepStatus === 'completed' ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : stepStatus === 'current' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : stepStatus === 'error' ? (
                      <AlertCircle className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <p
                      className={`text-sm font-medium ${
                        stepStatus === 'completed'
                          ? 'text-green-600'
                          : stepStatus === 'current'
                          ? 'text-blue-600'
                          : stepStatus === 'error'
                          ? 'text-red-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-[100px]">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* EUDR Details */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Deforestacion (5 anos)</span>
            <span
              className={`text-sm font-bold ${
                deforestationPercent < 5 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {deforestationPercent.toFixed(2)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                deforestationPercent < 5 ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(deforestationPercent * 10, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">0%</span>
            <span className="text-xs text-gray-500">Umbral EUDR: 5%</span>
            <span className="text-xs text-gray-500">10%</span>
          </div>
        </div>

        {/* Action Button */}
        {eudrStatus === 'approved' && nftStatus === 'not_minted' && (
          <button
            onClick={onMintNFT}
            className="mt-6 w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="h-5 w-5" />
            Generar NFT Digital Twin
          </button>
        )}

        {nftStatus === 'minted' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">NFT Certificado Emitido</p>
                <p className="text-sm text-green-600">Token verificado en Cardano blockchain</p>
              </div>
            </div>
          </div>
        )}

        {eudrStatus === 'rejected' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Validacion EUDR Fallida</p>
                <p className="text-sm text-red-600">
                  Deforestacion detectada superior al 5%. No elegible para certificacion.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
