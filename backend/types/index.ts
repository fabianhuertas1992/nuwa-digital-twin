/**
 * Core type definitions for NUWA Digital Twin
 */

import { Feature, Polygon } from 'geojson';

// GeoJSON types
export type GeoJSONPolygon = Feature<Polygon> | Polygon;

// NDVI Analysis
export interface NDVIResult {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  imageUrl?: string;
  calculatedAt: string;
  cloudCoverage?: number; // Average cloud coverage percentage
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

// Deforestation Analysis
export interface DeforestationAnalysis {
  deforestationPercent: number;
  areaLostHa: number;
  initialForestHa: number;
  compliant: boolean; // <5% loss = compliant
  historicalImages: Array<{
    year: number;
    url: string;
  }>;
  changeDetectionUrl?: string;
  analyzedPeriod: {
    startDate: string;
    endDate: string;
  };
  analysisDate: string;
  methodology: string;
}

// EUDR Validation
export interface EUDRValidationResult {
  projectId: string;
  farmId?: string;
  analysis: DeforestationAnalysis;
  validated: boolean;
  validatedAt: string;
}

// Carbon Baseline
export interface TreeInventory {
  species: string;
  count: number;
  avgDbh: number; // Diameter at breast height (cm)
  avgHeight: number; // Height (m)
}

export interface FarmData {
  farmId: string;
  areaHa: number;
  location: string;
  agroforestryType: 'agroforestry' | 'silvopastoral';
}

export interface CarbonBaseline {
  baselineCarbonTCO2e: number;
  agbTonnesPerHa: number;
  totalAgbTonnes: number;
  totalCarbonTonnes: number;
  areaHa: number;
  methodology: 'satellite' | 'field' | 'hybrid' | string;
  confidence: 'low' | 'medium' | 'high';
  treesAnalyzed: number;
  calculatedAt: string;
  equation: string;
  verraMethodology: string;
  breakdown?: {
    abovegroundBiomass: number;
    belowgroundBiomass: number;
    soilCarbon?: number;
  };
}

export interface TreeMeasurement {
  species: string;
  dbh_cm: number;
  height_m: number;
  count?: number;
  location?: {
    lat: number;
    lon: number;
  };
}

export interface CarbonProjection {
  projectedCarbonTCO2e: number;
  years: number;
  annualSequestrationRate: number;
}

// Farm Model
export interface FarmBaseline {
  farmId: string;
  name: string;
  polygon: GeoJSONPolygon;
  ndvi: NDVIResult;
  deforestation: DeforestationAnalysis;
  carbonBaseline: CarbonBaseline;
  ipfsHash?: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Database Models
export interface Farm {
  id: string;
  name: string;
  ownerId: string;
  polygon: GeoJSONPolygon;
  areaHa: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FarmAnalysis {
  id: string;
  farmId: string;
  analysisType: 'ndvi' | 'deforestation' | 'baseline';
  result: Record<string, unknown>;
  analysisDate: Date;
  createdAt: Date;
}

export interface DigitalTwinNFT {
  id: string;
  farmId: string;
  tokenId: string;
  ipfsHash: string;
  txHash: string;
  baselineCarbonTCO2e: number | null;
  eudrCompliant: boolean;
  mintedAt: Date;
  createdAt: Date;
}
