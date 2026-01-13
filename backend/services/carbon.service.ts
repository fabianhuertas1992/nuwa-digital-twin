/**
 * Carbon Service
 * Handles carbon baseline calculations using allometric equations
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { FarmData, TreeInventory, CarbonBaseline, CarbonProjection } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../api/middleware/error-handler.js';

const execAsync = promisify(exec);

export class CarbonService {
  private pythonScriptsPath: string;

  constructor() {
    this.pythonScriptsPath = join(process.cwd(), 'python-scripts');
  }

  /**
   * Calculate baseline carbon using allometric equations
   */
  async calculateBaseline(
    farmData: FarmData,
    treeData: TreeInventory[]
  ): Promise<CarbonBaseline> {
    logger.info('Calculating carbon baseline', {
      farmId: farmData.farmId,
      treeCount: treeData.length,
    });

    try {
      // Ensure tmp directory exists
      const tmpDir = join(process.cwd(), 'tmp');
      await mkdir(tmpDir, { recursive: true });

      // Write input data to temp files
      const timestamp = Date.now();
      const farmDataFile = join(tmpDir, `farm_${timestamp}.json`);
      const treeDataFile = join(tmpDir, `trees_${timestamp}.json`);

      await writeFile(farmDataFile, JSON.stringify(farmData), 'utf-8');
      await writeFile(treeDataFile, JSON.stringify(treeData), 'utf-8');

      // Execute Python script
      const command = `python3 "${join(
        this.pythonScriptsPath,
        'carbon_baseline.py'
      )}" --farm-data "${farmDataFile}" --tree-inventory "${treeDataFile}"`;

      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes('Warning')) {
        logger.error('Carbon baseline calculation error', new Error(stderr));
        throw new AppError('Carbon baseline calculation failed', 500, 'CARBON_ERROR');
      }

      // Parse JSON output
      const result = JSON.parse(stdout) as CarbonBaseline;
      result.calculatedAt = new Date().toISOString();

      logger.info('Carbon baseline calculated successfully', {
        baselineCarbonTCO2e: result.baselineCarbonTCO2e,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      logger.error('Carbon baseline calculation failed', error as Error);

      // Fallback to basic estimation if Python script fails
      logger.warn('Using fallback carbon estimation');
      return this.fallbackCarbonEstimation(farmData, treeData);
    }
  }

  /**
   * Estimate future carbon sequestration
   */
  async projectCarbonSequestration(
    baseline: CarbonBaseline,
    years: number
  ): Promise<CarbonProjection> {
    logger.info('Projecting carbon sequestration', { years, baseline: baseline.baselineCarbonTCO2e });

    // Simple projection: assume 2-5% annual growth rate
    const annualGrowthRate = 0.03; // 3% per year (conservative estimate)

    const projectedCarbonTCO2e =
      baseline.baselineCarbonTCO2e * Math.pow(1 + annualGrowthRate, years);

    const annualSequestrationRate =
      (projectedCarbonTCO2e - baseline.baselineCarbonTCO2e) / years;

    return {
      projectedCarbonTCO2e: Math.round(projectedCarbonTCO2e * 100) / 100,
      years,
      annualSequestrationRate: Math.round(annualSequestrationRate * 100) / 100,
    };
  }

  /**
   * Fallback carbon estimation when Python script is unavailable
   */
  private fallbackCarbonEstimation(
    farmData: FarmData,
    treeData: TreeInventory[]
  ): CarbonBaseline {
    logger.warn('Using fallback carbon estimation method');

    let totalCarbon = 0;

    if (treeData.length > 0) {
      // Use basic allometric equation: C = 0.5 * AGB (Above Ground Biomass)
      // AGB = 0.0673 * (DBH^2 * H)^0.976 (Chave et al. 2014 - simplified)
      for (const tree of treeData) {
        const dbhM = tree.avgDbh / 100; // Convert cm to m
        const agbKg = 0.0673 * Math.pow(dbhM * dbhM * tree.avgHeight, 0.976);
        const carbonKg = agbKg * 0.5; // Convert to carbon (50% of biomass)
        const carbonT = carbonKg / 1000; // Convert to tonnes
        const co2eT = carbonT * 3.67; // Convert to CO2 equivalent
        totalCarbon += co2eT * tree.count;
      }
    } else {
      // No tree inventory: use default estimation based on area
      // Assume 50-100 tCO2e per hectare for agroforestry systems
      const carbonPerHa = 75; // Conservative estimate
      totalCarbon = farmData.areaHa * carbonPerHa;
    }

    return {
      baselineCarbonTCO2e: Math.round(totalCarbon * 100) / 100,
      methodology: 'fallback-allometric-equation',
      confidence: treeData.length > 0 ? 'medium' : 'low',
      calculatedAt: new Date().toISOString(),
    };
  }
}
