import axios from 'axios'
import type { ApiResponse, GeoJSONPolygon, NDVIResult, DeforestationResult, CarbonResult, AnalysisResult } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// FarmData interface for the api object
interface FarmData {
  name?: string;
  owner?: string;
  farmId?: string;
}

// NDVI Analysis
export async function calculateNDVI(
  polygon: GeoJSONPolygon,
  startDate: string = '2024-01-01',
  endDate: string = '2024-12-31'
): Promise<NDVIResult> {
  const response = await apiClient.post<ApiResponse<NDVIResult>>('/farms/calculate-ndvi', {
    polygon,
    startDate,
    endDate,
  })

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Error calculating NDVI')
  }

  return response.data.data
}

// Deforestation Analysis (EUDR)
export async function analyzeDeforestation(
  polygon: GeoJSONPolygon,
  projectId: string
): Promise<DeforestationResult> {
  const response = await apiClient.post<ApiResponse<DeforestationResult>>('/farms/analyze-deforestation', {
    polygon,
    projectId,
  })

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Error analyzing deforestation')
  }

  return response.data.data
}

// Carbon Baseline
export async function calculateCarbon(
  polygon: GeoJSONPolygon,
  projectId: string,
  method: 'satellite' | 'field' | 'hybrid' = 'satellite',
  treeInventory?: Array<{ species: string; dbh_cm: number; height_m: number; count?: number }>
): Promise<CarbonResult> {
  const response = await apiClient.post<ApiResponse<CarbonResult>>('/farms/calculate-baseline', {
    polygon,
    projectId,
    method,
    treeInventory,
  })

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Error calculating carbon baseline')
  }

  return response.data.data
}

// Complete Farm Analysis (function export)
export async function analyzeFarm(params: {
  polygon: GeoJSONPolygon;
  projectId: string;
  name?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AnalysisResult> {
  const { polygon, projectId, startDate, endDate } = params

  // Run all analyses in parallel
  const [ndvi, deforestation, carbon] = await Promise.all([
    calculateNDVI(polygon, startDate, endDate),
    analyzeDeforestation(polygon, projectId),
    calculateCarbon(polygon, projectId),
  ])

  return { ndvi, deforestation, carbon }
}

// API object with all methods (for task compatibility)
export const api = {
  async analyzeFarm(polygon: GeoJSONPolygon, farmData: FarmData): Promise<{
    farmId: string;
    name: string;
    owner?: string;
    polygon: GeoJSONPolygon;
    analysis: AnalysisResult;
  }> {
    const projectId = farmData.farmId || `farm-${Date.now()}`

    // Run all analyses in parallel
    const [ndvi, deforestation, carbon] = await Promise.all([
      calculateNDVI(polygon),
      analyzeDeforestation(polygon, projectId),
      calculateCarbon(polygon, projectId),
    ])

    return {
      farmId: projectId,
      name: farmData.name || 'Nueva Finca',
      owner: farmData.owner,
      polygon,
      analysis: { ndvi, deforestation, carbon }
    }
  },

  async healthCheck(): Promise<{ status: string }> {
    const response = await apiClient.get('/health')
    return response.data
  },
}

export default api
