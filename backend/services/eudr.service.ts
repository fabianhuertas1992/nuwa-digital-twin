/**
 * EUDR (EU Deforestation Regulation) Service
 * Handles deforestation analysis for EUDR compliance validation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, access, constants } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { GeoJSONPolygon, DeforestationAnalysis, EUDRValidationResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { parseJsonOutput } from '../utils/json-parser.js';
import { AppError } from '../api/middleware/error-handler.js';

const execAsync = promisify(exec);

export class EUDRService {
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
    const scriptPath = join(this.pythonScriptsPath, 'deforestation_analysis.py');
    if (!existsSync(scriptPath)) {
      logger.error('Deforestation analysis script not found', { path: scriptPath });
      throw new AppError(
        `Deforestation analysis script not found at ${scriptPath}`,
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
   * Analyze deforestation for EUDR compliance
   */
  async analyzeDeforestation(
    polygon: GeoJSONPolygon,
    projectId: string
  ): Promise<DeforestationAnalysis> {
    const startTime = Date.now();

    logger.info('Starting EUDR deforestation analysis', { projectId });

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

      // Calculate 5-year date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Write polygon to temp file
      const polygonJson = JSON.stringify(polygon);
      const polygonFile = join(tmpDir, `polygon_${Date.now()}.json`);
      await writeFile(polygonFile, polygonJson, 'utf-8');

      // Execute Python script
      const command = `"${this.pythonPath}" "${join(
        this.pythonScriptsPath,
        'deforestation_analysis.py'
      )}" --polygon "${polygonFile}" --start-date "${startDateStr}" --end-date "${endDateStr}" --project-id "${projectId}"`;

      logger.debug('Executing deforestation analysis script', {
        startDate: startDateStr,
        endDate: endDateStr,
        projectId,
      });

      let stdout: string;
      let stderr: string;

      try {
        const result = await execAsync(command, { timeout: 90000 }); // 90 second timeout
        stdout = result.stdout;
        stderr = result.stderr || '';
      } catch (execError: unknown) {
        const error = execError as { code?: string; signal?: string; stdout?: string; stderr?: string };

        if (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
          logger.error('Deforestation analysis timed out', { timeout: 90000, projectId });
          throw new AppError(
            'Deforestation analysis timed out after 90 seconds. The area may be too large.',
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
          logger.error('Deforestation analysis error from Python', { stderr, projectId });
          throw new AppError(
            `Deforestation analysis failed: ${stderr.substring(0, 200)}`,
            500,
            'GEE_ERROR'
          );
        } else {
          logger.debug('Python script output', { stderr: stderr.substring(0, 500) });
        }
      }

      // Parse JSON output
      let result: DeforestationAnalysis;
      try {
        result = parseJsonOutput<DeforestationAnalysis>(stdout, 'EUDR deforestation analysis');
      } catch (parseError) {
        logger.error('Failed to parse deforestation analysis output', undefined, {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          stdoutLength: stdout?.length ?? 0,
          projectId,
        });
        throw new AppError(
          'Failed to parse deforestation analysis result',
          500,
          'JSON_PARSE_ERROR'
        );
      }

      // Validate result structure
      if (typeof result.deforestationPercent !== 'number' ||
          typeof result.compliant !== 'boolean') {
        logger.error('Invalid deforestation result structure', { result, projectId });
        throw new AppError(
          'Invalid deforestation result structure from Python script',
          500,
          'INVALID_RESULT'
        );
      }

      const executionTime = Date.now() - startTime;
      logger.info('Deforestation analysis completed', {
        projectId,
        deforestationPercent: result.deforestationPercent,
        compliant: result.compliant,
        initialForestHa: result.initialForestHa,
        areaLostHa: result.areaLostHa,
        executionTimeMs: executionTime,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof AppError) {
        logger.error('Deforestation analysis failed', {
          error: error.message,
          code: error.code,
          projectId,
          executionTimeMs: executionTime,
        });
        throw error;
      }

      logger.error('Deforestation analysis failed with unexpected error', {
        error: error instanceof Error ? error.message : String(error),
        projectId,
        executionTimeMs: executionTime,
      });

      throw new AppError(
        'Failed to analyze deforestation. Please check GEE configuration.',
        500,
        'GEE_ERROR'
      );
    }
  }

  /**
   * Validate EUDR compliance and return full validation result
   */
  async validateEUDRCompliance(
    polygon: GeoJSONPolygon,
    projectId: string,
    farmId?: string
  ): Promise<EUDRValidationResult> {
    const analysis = await this.analyzeDeforestation(polygon, projectId);

    return {
      projectId,
      farmId,
      analysis,
      validated: analysis.compliant,
      validatedAt: new Date().toISOString(),
    };
  }
}
