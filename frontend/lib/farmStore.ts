/**
 * Farm Store - LocalStorage persistence for farms
 * In production, this would be replaced with API calls to the backend
 */

import type { GeoJSONPolygon, NDVIResult, DeforestationResult, CarbonResult } from '@/types'

export interface StoredFarm {
  id: string
  name: string
  owner: string
  location: string
  areaHa: number
  lastAnalysis: string
  createdAt: string
  status: 'healthy' | 'warning' | 'critical'
  eudrValidationStatus: 'pending' | 'validating' | 'approved' | 'active' | 'rejected'
  nftStatus: 'not_minted' | 'minting' | 'minted'
  baselineVerified: boolean
  nft?: {
    tokenId: string
    txHash: string
    ipfsHash: string
    mintedAt: string
  }
  polygon: GeoJSONPolygon
  analysis: {
    ndvi?: NDVIResult
    deforestation?: DeforestationResult
    carbon?: CarbonResult
  }
}

const STORAGE_KEY = 'nuwa_farms'

/**
 * Get all stored farms
 */
export function getFarms(): StoredFarm[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error reading farms from localStorage:', error)
    return []
  }
}

/**
 * Get a single farm by ID
 */
export function getFarmById(id: string): StoredFarm | null {
  const farms = getFarms()
  return farms.find(farm => farm.id === id) || null
}

/**
 * Save a new farm
 */
export function saveFarm(farm: StoredFarm): void {
  if (typeof window === 'undefined') return

  try {
    const farms = getFarms()
    // Check if farm already exists (update) or is new (add)
    const existingIndex = farms.findIndex(f => f.id === farm.id)

    if (existingIndex >= 0) {
      farms[existingIndex] = farm
    } else {
      farms.unshift(farm) // Add to beginning
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(farms))
  } catch (error) {
    console.error('Error saving farm to localStorage:', error)
  }
}

/**
 * Update a farm
 */
export function updateFarm(id: string, updates: Partial<StoredFarm>): StoredFarm | null {
  const farms = getFarms()
  const index = farms.findIndex(f => f.id === id)

  if (index < 0) return null

  farms[index] = { ...farms[index], ...updates }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(farms))

  return farms[index]
}

/**
 * Delete a farm
 */
export function deleteFarm(id: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    const farms = getFarms()
    const filtered = farms.filter(f => f.id !== id)

    if (filtered.length === farms.length) return false

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Error deleting farm from localStorage:', error)
    return false
  }
}

/**
 * Calculate farm status based on analysis
 */
export function calculateFarmStatus(deforestationPercent: number): 'healthy' | 'warning' | 'critical' {
  if (deforestationPercent < 3) return 'healthy'
  if (deforestationPercent < 5) return 'warning'
  return 'critical'
}

/**
 * Calculate area from polygon coordinates
 */
export function calculateAreaHa(coordinates: number[][][]): number {
  // Simplified area calculation using Shoelace formula
  // In production, use turf.js or similar for accurate geodesic area
  const ring = coordinates[0]
  let area = 0

  for (let i = 0; i < ring.length - 1; i++) {
    area += ring[i][0] * ring[i + 1][1]
    area -= ring[i + 1][0] * ring[i][1]
  }

  area = Math.abs(area) / 2
  // Convert from degrees² to hectares (approximate)
  // 1 degree ≈ 111km at equator, so 1 degree² ≈ 12321 km² = 1232100 ha
  const haPerDegree2 = 1232100
  return Math.round(area * haPerDegree2 * 100) / 100
}

/**
 * Generate a unique farm ID
 */
export function generateFarmId(): string {
  return `farm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
