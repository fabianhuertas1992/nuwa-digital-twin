/**
 * Farm controller - HTTP request handlers
 */

import { Request, Response } from 'express';
import { FarmService } from '../../services/farm.service.js';
import { GEEService } from '../../services/gee.service.js';
import { EUDRService } from '../../services/eudr.service.js';
import { CarbonBaselineService, BiomassMethod } from '../../services/carbon-baseline.service.js';
import { ApiResponse, GeoJSONPolygon, TreeMeasurement } from '../../types/index.js';
import { asyncHandler } from '../middleware/error-handler.js';

export class FarmController {
  private farmService: FarmService;
  private geeService: GEEService;
  private eudrService: EUDRService;
  private carbonService: CarbonBaselineService;

  constructor() {
    this.farmService = new FarmService();
    this.geeService = new GEEService();
    this.eudrService = new EUDRService();
    this.carbonService = new CarbonBaselineService();
  }

  /**
   * POST /api/v1/farms
   * Create a new farm
   */
  createFarm = asyncHandler(async (req: Request, res: Response) => {
    const { name, ownerId, polygon } = req.body;

    const farm = await this.farmService.createFarm({
      name,
      ownerId,
      polygon,
    });

    const response: ApiResponse = {
      success: true,
      data: farm,
      message: 'Farm created successfully',
    };

    res.status(201).json(response);
  });

  /**
   * GET /api/v1/farms/:id
   * Get farm details
   */
  getFarm = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const farm = await this.farmService.getFarmById(id);

    const response: ApiResponse = {
      success: true,
      data: farm,
    };

    res.json(response);
  });

  /**
   * POST /api/v1/farms/:id/calculate-ndvi
   * Calculate NDVI for a farm
   */
  calculateNDVI = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { startDate, endDate } = req.body;

    const result = await this.farmService.calculateNDVI(id, startDate, endDate);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'NDVI calculation completed',
    };

    res.json(response);
  });

  /**
   * POST /api/v1/farms/calculate-ndvi
   * Calculate NDVI directly from polygon (without farm ID)
   */
  calculateNDVIDirect = asyncHandler(async (req: Request, res: Response) => {
    const { polygon, startDate: inputStartDate, endDate: inputEndDate } = req.body;

    // Default to last 30 days if dates not provided
    const end = inputEndDate || new Date().toISOString().split('T')[0];
    const start = inputStartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await this.geeService.calculateNDVI(
      polygon as GeoJSONPolygon,
      start,
      end
    );

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'NDVI calculated successfully',
    };

    res.json(response);
  });

  /**
   * POST /api/v1/farms/:id/analyze-deforestation
   * Analyze deforestation for EUDR compliance (existing farm)
   */
  analyzeDeforestation = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await this.farmService.analyzeDeforestation(id);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: result.compliant
        ? 'Farm is EUDR compliant'
        : 'Farm does not meet EUDR requirements',
    };

    res.json(response);
  });

  /**
   * POST /api/v1/farms/analyze-deforestation
   * Analyze deforestation directly from polygon (without farm ID)
   */
  analyzeDeforestationDirect = asyncHandler(async (req: Request, res: Response) => {
    const { polygon, projectId } = req.body;

    const result = await this.eudrService.analyzeDeforestation(
      polygon as GeoJSONPolygon,
      projectId
    );

    const response: ApiResponse = {
      success: true,
      data: result,
      message: result.compliant
        ? 'EUDR validation completed - Farm is compliant'
        : 'EUDR validation completed - Farm does not meet EUDR requirements',
    };

    res.json(response);
  });

  /**
   * POST /api/v1/farms/:id/calculate-baseline
   * Calculate carbon baseline for existing farm
   */
  calculateBaseline = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { treeInventory, agroforestryType } = req.body;

    const result = await this.farmService.calculateBaseline(id, {
      treeInventory,
      agroforestryType,
    });

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Carbon baseline calculated',
    };

    res.json(response);
  });

  /**
   * POST /api/v1/farms/calculate-baseline
   * Calculate carbon baseline directly from polygon (without farm ID)
   */
  calculateBaselineDirect = asyncHandler(async (req: Request, res: Response) => {
    const { polygon, projectId, method, treeInventory } = req.body;

    const result = await this.carbonService.calculateBaseline(
      polygon as GeoJSONPolygon,
      projectId,
      (method || 'satellite') as BiomassMethod,
      treeInventory as TreeMeasurement[] | undefined
    );

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Carbon baseline calculated',
    };

    res.json(response);
  });

  /**
   * POST /api/v1/farms/:id/mint-nft
   * Mint digital twin NFT
   */
  mintNFT = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await this.farmService.mintNFT(id);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: 'Digital twin NFT minted successfully',
    };

    res.json(response);
  });

  /**
   * GET /api/v1/farms/:id/status
   * Get farm validation status
   */
  getStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const status = await this.farmService.getFarmStatus(id);

    const response: ApiResponse = {
      success: true,
      data: status,
    };

    res.json(response);
  });
}
