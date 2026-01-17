'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import type { GeoJSONPolygon } from '@/types'

interface MapViewerProps {
  onPolygonCreated?: (polygon: GeoJSONPolygon) => void
  initialPolygon?: GeoJSONPolygon
  center?: [number, number]
  zoom?: number
  showDrawControls?: boolean
  className?: string
}

export default function MapViewer({
  onPolygonCreated,
  initialPolygon,
  center = [-75.0639, 4.9214], // Libano, Tolima
  zoom = 14,
  showDrawControls = true,
  className = 'w-full h-[500px]',
}: MapViewerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const draw = useRef<MapboxDraw | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token) {
      console.error('NEXT_PUBLIC_MAPBOX_TOKEN not set')
      return
    }

    mapboxgl.accessToken = token

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: center,
      zoom: zoom,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left')

    // Add drawing tools if enabled
    if (showDrawControls) {
      draw.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          trash: true,
        },
        defaultMode: 'simple_select',
      })

      map.current.addControl(draw.current, 'top-left')

      // Handle polygon creation
      map.current.on('draw.create', (e: { features: GeoJSON.Feature[] }) => {
        const feature = e.features[0]
        if (feature && feature.geometry.type === 'Polygon' && onPolygonCreated) {
          onPolygonCreated(feature.geometry as GeoJSONPolygon)
        }
      })

      map.current.on('draw.update', (e: { features: GeoJSON.Feature[] }) => {
        const feature = e.features[0]
        if (feature && feature.geometry.type === 'Polygon' && onPolygonCreated) {
          onPolygonCreated(feature.geometry as GeoJSONPolygon)
        }
      })
    }

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Load initial polygon when map is loaded
  useEffect(() => {
    if (!mapLoaded || !initialPolygon || !map.current) return

    // Extract geometry - handle both Feature and direct Polygon types
    let geometry: { type: string; coordinates: number[][][] }
    let featureData: GeoJSON.Feature

    if ('geometry' in initialPolygon && initialPolygon.geometry) {
      // It's a Feature type
      geometry = initialPolygon.geometry as { type: string; coordinates: number[][][] }
      featureData = initialPolygon as unknown as GeoJSON.Feature
    } else if ('coordinates' in initialPolygon) {
      // It's a direct Polygon type
      geometry = initialPolygon as unknown as { type: string; coordinates: number[][][] }
      featureData = {
        type: 'Feature',
        properties: {},
        geometry: geometry,
      } as GeoJSON.Feature
    } else {
      console.error('Invalid polygon format')
      return
    }

    // Validate coordinates exist
    if (!geometry.coordinates || !geometry.coordinates[0] || geometry.coordinates[0].length === 0) {
      console.error('Invalid polygon coordinates')
      return
    }

    // Add polygon to draw if available
    if (draw.current) {
      draw.current.add(featureData)
    } else {
      // Add as a layer if no draw control
      if (!map.current.getSource('polygon')) {
        map.current.addSource('polygon', {
          type: 'geojson',
          data: featureData,
        })

        map.current.addLayer({
          id: 'polygon-fill',
          type: 'fill',
          source: 'polygon',
          paint: {
            'fill-color': '#22c55e',
            'fill-opacity': 0.3,
          },
        })

        map.current.addLayer({
          id: 'polygon-outline',
          type: 'line',
          source: 'polygon',
          paint: {
            'line-color': '#16a34a',
            'line-width': 2,
          },
        })
      }
    }

    // Fit bounds to polygon
    const coordinates = geometry.coordinates[0]
    const bounds = coordinates.reduce(
      (bounds, coord) => bounds.extend(coord as [number, number]),
      new mapboxgl.LngLatBounds(
        coordinates[0] as [number, number],
        coordinates[0] as [number, number]
      )
    )

    map.current.fitBounds(bounds, { padding: 50 })
  }, [mapLoaded, initialPolygon])

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      )}
    </div>
  )
}
