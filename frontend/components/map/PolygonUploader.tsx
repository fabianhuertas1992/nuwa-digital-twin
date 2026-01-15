'use client'

import { useState, useCallback } from 'react'
import { Upload, FileJson, AlertCircle } from 'lucide-react'
import type { GeoJSONPolygon } from '@/types'

interface PolygonUploaderProps {
  onPolygonLoaded: (polygon: GeoJSONPolygon, farmData: Record<string, unknown>) => void
}

export default function PolygonUploader({ onPolygonLoaded }: PolygonUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseGeoJSON = useCallback((content: string): { polygon: GeoJSONPolygon; farmData: Record<string, unknown> } => {
    const json = JSON.parse(content)

    let polygon: GeoJSONPolygon
    let farmData: Record<string, unknown> = {}

    // Handle FeatureCollection
    if (json.type === 'FeatureCollection') {
      const feature = json.features?.[0]
      if (!feature?.geometry) {
        throw new Error('FeatureCollection vacia o sin geometria')
      }
      polygon = normalizeGeometry(feature.geometry)
      farmData = { ...feature.properties, ...json }
    }
    // Handle Feature
    else if (json.type === 'Feature') {
      if (!json.geometry) {
        throw new Error('Feature sin geometria')
      }
      polygon = normalizeGeometry(json.geometry)
      farmData = json.properties || {}
    }
    // Handle direct Polygon
    else if (json.type === 'Polygon') {
      polygon = normalizeGeometry(json)
    }
    // Handle custom format with polygon field
    else if (json.polygon) {
      polygon = normalizeGeometry(json.polygon)
      farmData = json
    }
    else {
      throw new Error('Formato GeoJSON no reconocido')
    }

    return { polygon, farmData }
  }, [])

  const normalizeGeometry = (geometry: Record<string, unknown>): GeoJSONPolygon => {
    const type = geometry.type as string
    let coordinates = geometry.coordinates as number[][][]

    // Handle MultiPolygon - take first polygon
    if (type === 'MultiPolygon') {
      coordinates = (coordinates as unknown as number[][][][])[0]
    }

    // Strip Z coordinates if present
    coordinates = coordinates.map(ring =>
      ring.map(coord => coord.slice(0, 2))
    )

    return {
      type: 'Polygon',
      coordinates,
    }
  }

  const handleFile = useCallback((file: File) => {
    setError(null)

    if (!file.name.match(/\.(json|geojson)$/i)) {
      setError('Solo se aceptan archivos .json o .geojson')
      return
    }

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const { polygon, farmData } = parseGeoJSON(content)
        onPolygonLoaded(polygon, farmData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al leer archivo')
      }
    }

    reader.onerror = () => {
      setError('Error al leer archivo')
    }

    reader.readAsText(file)
  }, [onPolygonLoaded, parseGeoJSON])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`p-4 rounded-full ${isDragging ? 'bg-green-100' : 'bg-gray-100'}`}>
            {isDragging ? (
              <FileJson className="h-10 w-10 text-green-600" />
            ) : (
              <Upload className="h-10 w-10 text-gray-400" />
            )}
          </div>

          <div>
            <p className="text-lg font-medium text-gray-700">
              Arrastra tu archivo GeoJSON aqui
            </p>
            <p className="text-sm text-gray-500 mt-1">
              o haz clic para seleccionar
            </p>
          </div>

          <input
            id="file-input"
            type="file"
            accept=".json,.geojson"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <FileJson className="h-4 w-4" />
            <span>Formatos: .json, .geojson</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
