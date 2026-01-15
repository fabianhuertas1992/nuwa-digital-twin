'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Leaf } from 'lucide-react'
import type { NDVIResult } from '@/types'

interface NDVIChartProps {
  data: NDVIResult
}

export default function NDVIChart({ data }: NDVIChartProps) {
  const chartData = [
    { name: 'Min', value: data.min, color: '#ef4444' },
    { name: 'Media', value: data.mean, color: '#22c55e' },
    { name: 'Mediana', value: data.median, color: '#16a34a' },
    { name: 'Max', value: data.max, color: '#15803d' },
  ]

  const getNDVIStatus = (ndvi: number) => {
    if (ndvi >= 0.6) return { text: 'Excelente', color: 'text-green-600' }
    if (ndvi >= 0.4) return { text: 'Bueno', color: 'text-green-500' }
    if (ndvi >= 0.2) return { text: 'Moderado', color: 'text-yellow-500' }
    return { text: 'Bajo', color: 'text-red-500' }
  }

  const status = getNDVIStatus(data.mean)

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Leaf className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Indice NDVI</h3>
            <p className="text-sm text-gray-500">Salud de la vegetacion</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium bg-green-50 ${status.color}`}>
          {status.text}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Media</p>
          <p className="text-3xl font-bold text-green-600">{data.mean.toFixed(3)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">Desv. Estandar</p>
          <p className="text-3xl font-bold text-gray-700">{data.std.toFixed(3)}</p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => typeof value === 'number' ? value.toFixed(3) : value}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {data.imageUrl && (
        <div className="mt-4 pt-4 border-t">
          <a
            href={data.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 hover:underline"
          >
            Ver imagen NDVI completa →
          </a>
        </div>
      )}
    </div>
  )
}
