/**
 * Farm service - Business logic for farm operations
 */

import { AppError } from '../api/middleware/error-handler.js';
import { GEEService } from './gee.service.js';
import { CarbonService } from './carbon.service.js';
import { IPFSService } from './ipfs.service.js';
import { BlockchainService } from './blockchain.service.js';
import { FarmModel } from '../models/farm.model.js';
import {
  GeoJSONPolygon,
  NDVIResult,
  DeforestationAnalysis,
  CarbonBaseline,
  FarmBaseline,
  TreeInventory,
  Farm,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

interface CreateFarmInput {
  name: string;
  ownerId: string;
  polygon: GeoJSONPolygon;
}

interface FarmStatus {
  farmId: string;
  name: string;
  hasNDVI: boolean;
  hasDeforestationAnalysis: boolean;
  hasCarbonBaseline: boolean;
  isEUDRCompliant: boolean | null;
  hasNFT: boolean;
  nftTokenId?: string;
}

export class FarmService {
  private geeService: GEEService;
  private carbonService: CarbonService;
  private ipfsService: IPFSService;
  private blockchainService: BlockchainService;
  private farmModel: FarmModel;

  constructor() {
    this.geeService = new GEEService();
    this.carbonService = new CarbonService();
    this.ipfsService = new IPFSService();
    this.blockchainService = new BlockchainService();
    this.farmModel = new FarmModel();
  }

  /**
   * Create a new farm
   */
  async createFarm(input: CreateFarmInput): Promise<Farm> {
    logger.info('Creating new farm', { name: input.name, ownerId: input.ownerId });

    // Calculate area from polygon
    const areaHa = this.calculatePolygonArea(input.polygon);

    const farm = await this.farmModel.create({
      name: input.name,
      ownerId: input.ownerId,
      polygon: input.polygon,
      areaHa,
    });

    logger.info('Farm created successfully', { farmId: farm.id });

    return farm;
  }

  /**
   * Get farm by ID
   */
  async getFarmById(id: string): Promise<Farm> {
    const farm = await this.farmModel.findById(id);

    if (!farm) {
      throw new AppError('Farm not found', 404, 'FARM_NOT_FOUND');
    }

    return farm;
  }

  /**
   * Calculate NDVI for a farm
   */
  async calculateNDVI(
    farmId: string,
    startDate?: string,
    endDate?: string
  ): Promise<NDVIResult> {
    logger.info('Calculating NDVI', { farmId, startDate, endDate });

    const farm = await this.getFarmById(farmId);

    // Use default date range if not provided (last 30 days)
    const end = endDate || new Date().toISOString().split('T')[0];
    const start =
      startDate ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await this.geeService.calculateNDVI(farm.polygon, start, end);

    // Save analysis result
    await this.farmModel.saveAnalysis(farmId, 'ndvi', result);

    logger.info('NDVI calculation completed', { farmId, mean: result.mean });

    return result;
  }

  /**
   * Analyze deforestation for EUDR compliance
   */
  async analyzeDeforestation(farmId: string): Promise<DeforestationAnalysis> {
    logger.info('Analyzing deforestation', { farmId });

    const farm = await this.getFarmById(farmId);

    // Analyze last 5 years
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const result = await this.geeService.analyzeDeforestation(farm.polygon, farmId);

    // Save analysis result
    await this.farmModel.saveAnalysis(farmId, 'deforestation', result);

    logger.info('Deforestation analysis completed', {
      farmId,
      compliant: result.compliant,
      deforestationPercent: result.deforestationPercent,
    });

    return result;
  }

  /**
   * Calculate carbon baseline
   */
  async calculateBaseline(
    farmId: string,
    options?: {
      treeInventory?: TreeInventory[];
      agroforestryType?: 'agroforestry' | 'silvopastoral';
    }
  ): Promise<CarbonBaseline> {
    logger.info('Calculating carbon baseline', { farmId, options });

    const farm = await this.getFarmById(farmId);

    const farmData = {
      farmId: farm.id,
      areaHa: farm.areaHa || 0,
      location: 'Colombia', // TODO: Extract from polygon or make it required
      agroforestryType: options?.agroforestryType || 'agroforestry',
    };

    const result = await this.carbonService.calculateBaseline(
      farmData,
      options?.treeInventory || []
    );

    // Save analysis result
    await this.farmModel.saveAnalysis(farmId, 'baseline', result);

    logger.info('Carbon baseline calculated', {
      farmId,
      baselineCarbonTCO2e: result.baselineCarbonTCO2e,
    });

    return result;
  }

  /**
   * Mint digital twin NFT
   */
  async mintNFT(farmId: string): Promise<{ tokenId: string; txHash: string; ipfsHash: string }> {
    logger.info('Minting digital twin NFT', { farmId });

    const farm = await this.getFarmById(farmId);

    // Get all analyses
    const analyses = await this.farmModel.getAnalyses(farmId);

    const ndvi = analyses.find((a) => a.analysisType === 'ndvi')?.result as
      | NDVIResult
      | undefined;
    const deforestation = analyses.find((a) => a.analysisType === 'deforestation')?.result as
      | DeforestationAnalysis
      | undefined;
    const baseline = analyses.find((a) => a.analysisType === 'baseline')?.result as
      | CarbonBaseline
      | undefined;

    if (!ndvi || !deforestation || !baseline) {
      throw new AppError(
        'Missing required analyses. Please calculate NDVI, deforestation, and baseline first.',
        400,
        'MISSING_ANALYSES'
      );
    }

    const farmBaseline: FarmBaseline = {
      farmId: farm.id,
      name: farm.name,
      polygon: farm.polygon,
      ndvi,
      deforestation,
      carbonBaseline: baseline,
    };

    // Upload to IPFS
    const metadataBuffer = Buffer.from(JSON.stringify(farmBaseline));
    const ipfsHash = await this.ipfsService.upload(metadataBuffer, {
      farmId: farm.id,
      name: farm.name,
      type: 'digital-twin-metadata',
    });

    logger.info('Metadata uploaded to IPFS', { farmId, ipfsHash });

    // Mint NFT on Cardano
    const { tokenId, txHash } = await this.blockchainService.mintDigitalTwinNFT({
      ...farmBaseline,
      ipfsHash,
    });

    // Save NFT record
    await this.farmModel.saveNFT({
      farmId: farm.id,
      tokenId,
      ipfsHash,
      txHash,
      baselineCarbonTCO2e: baseline.baselineCarbonTCO2e,
      eudrCompliant: deforestation.compliant,
    });

    logger.info('NFT minted successfully', { farmId, tokenId, txHash });

    return { tokenId, txHash, ipfsHash };
  }

  /**
   * Get farm status
   */
  async getFarmStatus(farmId: string): Promise<FarmStatus> {
    const farm = await this.getFarmById(farmId);
    const analyses = await this.farmModel.getAnalyses(farmId);
    const nft = await this.farmModel.getNFT(farmId);

    const deforestationAnalysis = analyses.find(
      (a) => a.analysisType === 'deforestation'
    )?.result as DeforestationAnalysis | undefined;

    return {
      farmId: farm.id,
      name: farm.name,
      hasNDVI: analyses.some((a) => a.analysisType === 'ndvi'),
      hasDeforestationAnalysis: !!deforestationAnalysis,
      hasCarbonBaseline: analyses.some((a) => a.analysisType === 'baseline'),
      isEUDRCompliant: deforestationAnalysis?.compliant ?? null,
      hasNFT: !!nft,
      nftTokenId: nft?.tokenId,
    };
  }

  /**
   * Calculate polygon area in hectares
   */
  private calculatePolygonArea(polygon: GeoJSONPolygon): number {
    // Extract coordinates
    let coordinates: number[][][];
    if ('geometry' in polygon && polygon.geometry) {
      coordinates = polygon.geometry.coordinates;
    } else if ('coordinates' in polygon) {
      coordinates = polygon.coordinates;
    } else {
      return 0;
    }

    // Simple area calculation using spherical excess formula
    // This is a simplified version - for production, use PostGIS
    const coords = coordinates[0];
    if (coords.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const [lon1, lat1] = coords[i];
      const [lon2, lat2] = coords[i + 1];
      area += (lon2 - lon1) * (lat2 + lat1);
    }

    // Convert to hectares (approximate)
    const areaDegrees = Math.abs(area) / 2;
    const areaKm2 = areaDegrees * 111 * 111 * Math.cos((coords[0][1] * Math.PI) / 180);
    const areaHa = areaKm2 * 100;

    return Math.round(areaHa * 100) / 100; // Round to 2 decimal places
  }
}
