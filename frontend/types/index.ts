// GeoJSON types
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONPolygon;
  properties?: Record<string, unknown>;
}

// Analysis types
export interface NDVIResult {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  imageUrl?: string;
  calculatedAt: string;
}

export interface DeforestationResult {
  deforestationPercent: number;
  areaLostHa: number;
  initialForestHa: number;
  compliant: boolean;
  historicalImages?: Array<{ year: number; url: string }>;
  changeDetectionUrl?: string;
  analysisDate: string;
}

export interface CarbonResult {
  baselineCarbonTCO2e: number;
  agbTonnesPerHa: number;
  totalAgbTonnes: number;
  totalCarbonTonnes: number;
  areaHa: number;
  methodology: string;
  confidence: 'low' | 'medium' | 'high';
  treesAnalyzed: number;
  calculationDate: string;
  verraMethodology: string;
}

export interface FarmAnalysis {
  farmInfo: {
    name: string;
    farmId: string;
    owner?: string;
    location?: Record<string, string>;
  };
  polygon: GeoJSONPolygon;
  analysis: {
    ndvi?: NDVIResult;
    deforestation?: DeforestationResult;
    carbon?: CarbonResult;
  };
  generatedAt: string;
}

// Analysis result type (combined)
export interface AnalysisResult {
  ndvi?: NDVIResult;
  deforestation?: DeforestationResult;
  carbon?: CarbonResult;
}

// API types
export interface AnalyzeRequest {
  polygon: GeoJSONPolygon;
  projectId: string;
  name?: string;
  owner?: string;
  startDate?: string;
  endDate?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Farm list types
export interface FarmSummary {
  id: string;
  name: string;
  areaHa: number;
  carbonTCO2e: number;
  eudrCompliant: boolean;
  ndviMean: number;
  analysisDate: string;
}
