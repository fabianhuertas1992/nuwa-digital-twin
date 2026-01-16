/**
 * Carbon Baseline Service
 * Calculates carbon baseline using Verra VM0042 methodology
 * Supports satellite-based, field-based, and hybrid estimation methods
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, access, constants } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { GeoJSONPolygon, CarbonBaseline, TreeMeasurement } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../api/middleware/error-handler.js';
import { parseJsonOutput } from '../utils/json-parser.js';

const execAsync = promisify(exec);

export type BiomassMethod = 'satellite' | 'field' | 'hybrid';

export class CarbonBaselineService {
  private pythonScriptsPath: string;
  private pythonPath: string;

  constructor() {
    this.pythonScriptsPath = join(process.cwd(), 'python-scripts');
    this.pythonPath = process.env.PYTHON_PATH || join(this.pythonScriptsPath, 'venv', 'bin', 'python3');
  }

  /**
   * Validate that Python executable exists
   */
  private async validatePythonPath(): Promise<void> {
    try {
      await access(this.pythonPath, constants.F_OK | constants.X_OK);
    } catch {
      logger.error('Python executable not found', { pythonPath: this.pythonPath });
      throw new AppError(
        `Python executable not found at ${this.pythonPath}. Please set PYTHON_PATH environment variable.`,
        500,
        'PYTHON_NOT_FOUND'
      );
    }
  }

  /**
   * Validate scripts directory exists
   */
  private validateScriptsDirectory(): void {
    const scriptPath = join(this.pythonScriptsPath, 'carbon_baseline.py');
    if (!existsSync(scriptPath)) {
      logger.error('Carbon baseline script not found', { path: scriptPath });
      throw new AppError(
        `Carbon baseline script not found at ${scriptPath}`,
        500,
        'SCRIPT_NOT_FOUND'
      );
    }
  }

  /**
   * Validate polygon coordinates
   */
  private validatePolygon(polygon: GeoJSONPolygon): void {
    let coordinates: number[][][];

    if ('geometry' in polygon && polygon.geometry) {
      if (polygon.geometry.type !== 'Polygon') {
        throw new AppError('Polygon geometry type must be "Polygon"', 400, 'INVALID_POLYGON');
      }
      coordinates = polygon.geometry.coordinates;
    } else if ('coordinates' in polygon) {
      coordinates = polygon.coordinates;
    } else {
      throw new AppError('Invalid polygon format: missing coordinates', 400, 'INVALID_POLYGON');
    }

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
      throw new AppError('Polygon must have at least one ring of coordinates', 400, 'INVALID_POLYGON');
    }

    const firstRing = coordinates[0];
    if (!Array.isArray(firstRing) || firstRing.length < 4) {
      throw new AppError('Polygon ring must have at least 4 coordinates', 400, 'INVALID_POLYGON');
    }
  }

  /**
   * Calculate carbon baseline for a polygon
   */
  async calculateBaseline(
    polygon: GeoJSONPolygon,
    projectId: string,
    method: BiomassMethod = 'satellite',
    treeInventory?: TreeMeasurement[]
  ): Promise<CarbonBaseline> {
    const startTime = Date.now();

    logger.info('Starting carbon baseline calculation', {
      projectId,
      method,
      hasTreeInventory: !!treeInventory && treeInventory.length > 0,
    });

    try {
      // Validate inputs
      this.validatePolygon(polygon);
      if (!projectId || projectId.trim() === '') {
        throw new AppError('Project ID is required', 400, 'INVALID_PROJECT_ID');
      }

      // Validate Python environment
      await this.validatePythonPath();
      this.validateScriptsDirectory();

      // Ensure tmp directory exists
      const tmpDir = join(process.cwd(), 'tmp');
      await mkdir(tmpDir, { recursive: true });

      // Write polygon to temp file
      const timestamp = Date.now();
      const polygonFile = join(tmpDir, `polygon_${timestamp}.json`);
      await writeFile(polygonFile, JSON.stringify(polygon), 'utf-8');

      // Build command
      let command = `"${this.pythonPath}" "${join(
        this.pythonScriptsPath,
        'carbon_baseline.py'
      )}" --polygon "${polygonFile}" --project-id "${projectId}" --biomass-method "${method}"`;

      // Add tree inventory if provided
      if (treeInventory && treeInventory.length > 0) {
        const treeFile = join(tmpDir, `trees_${timestamp}.json`);
        await writeFile(treeFile, JSON.stringify(treeInventory), 'utf-8');
        command += ` --tree-inventory "${treeFile}"`;
      }

      logger.debug('Executing carbon baseline script', { method, projectId });

      let stdout: string;
      let stderr: string;

      try {
        const result = await execAsync(command, { timeout: 90000 });
        stdout = result.stdout;
        stderr = result.stderr || '';
      } catch (execError: unknown) {
        const error = execError as { code?: string; signal?: string; stdout?: string; stderr?: string };

        if (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
          logger.error('Carbon baseline calculation timed out', { timeout: 90000, projectId });
          throw new AppError(
            'Carbon baseline calculation timed out after 90 seconds.',
            504,
            'GEE_TIMEOUT'
          );
        }

        stdout = error.stdout || '';
        stderr = error.stderr || '';

        if (!stderr && !stdout) {
          throw new AppError(
            `Python script execution failed: ${error.code || error.signal || 'Unknown error'}`,
            500,
            'PYTHON_EXECUTION_ERROR'
          );
        }
      }

      // Log stderr output (informational messages)
      if (stderr) {
        const hasError = stderr.toLowerCase().includes('error:') ||
                        stderr.toLowerCase().includes('exception:') ||
                        stderr.toLowerCase().includes('traceback');

        if (hasError) {
          logger.error('Carbon baseline calculation error from Python', { stderr, projectId });
          throw new AppError(
            `Carbon baseline calculation failed: ${stderr.substring(0, 200)}`,
            500,
            'CARBON_ERROR'
          );
        } else {
          logger.debug('Python script output', { stderr: stderr.substring(0, 500) });
        }
      }

      // Parse JSON output
      let result: CarbonBaseline;
      try {
        result = parseJsonOutput<CarbonBaseline>(stdout, 'Carbon baseline calculation');
      } catch (parseError) {
        logger.error('Failed to parse carbon baseline output', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          stdout: stdout.substring(0, 500),
          projectId,
        });
        throw new AppError(
          'Failed to parse carbon baseline result',
          500,
          'JSON_PARSE_ERROR'
        );
      }

      // Validate result structure
      if (typeof result.baselineCarbonTCO2e !== 'number') {
        logger.error('Invalid carbon baseline result structure', { result, projectId });
        throw new AppError(
          'Invalid carbon baseline result structure from Python script',
          500,
          'INVALID_RESULT'
        );
      }

      const executionTime = Date.now() - startTime;
      logger.info('Carbon baseline calculation completed', {
        projectId,
        baselineCarbonTCO2e: result.baselineCarbonTCO2e,
        agbTonnesPerHa: result.agbTonnesPerHa,
        methodology: result.methodology,
        confidence: result.confidence,
        executionTimeMs: executionTime,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof AppError) {
        logger.error('Carbon baseline calculation failed', {
          error: error.message,
          code: error.code,
          projectId,
          executionTimeMs: executionTime,
        });
        throw error;
      }

      logger.error('Carbon baseline calculation failed with unexpected error', {
        error: error instanceof Error ? error.message : String(error),
        projectId,
        executionTimeMs: executionTime,
      });

      throw new AppError(
        'Failed to calculate carbon baseline. Please check GEE configuration.',
        500,
        'CARBON_ERROR'
      );
    }
  }
}
