/**
 * Google Earth Engine Service
 * Handles NDVI calculation and deforestation analysis via Python scripts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, access, constants } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { GeoJSONPolygon, NDVIResult, DeforestationAnalysis } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../api/middleware/error-handler.js';
import { parseJsonOutput } from '../utils/json-parser.js';

const execAsync = promisify(exec);

export class GEEService {
  private pythonScriptsPath: string;
  private pythonPath: string;
  private readonly MAX_DATE_RANGE_YEARS = 5;

  constructor() {
    // Assume Python scripts are in python-scripts directory at project root
    this.pythonScriptsPath = join(process.cwd(), 'python-scripts');
    // Use venv Python which has earthengine-api installed
    this.pythonPath = process.env.PYTHON_PATH || join(this.pythonScriptsPath, 'venv', 'bin', 'python3');
  }

  /**
   * Validate that Python executable exists and is accessible
   */
  private async validatePythonPath(): Promise<void> {
    try {
      await access(this.pythonPath, constants.F_OK | constants.X_OK);
    } catch (error) {
      logger.error('Python executable not found or not executable', {
        pythonPath: this.pythonPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError(
        `Python executable not found at ${this.pythonPath}. Please set PYTHON_PATH environment variable.`,
        500,
        'PYTHON_NOT_FOUND'
      );
    }
  }

  /**
   * Validate that scripts directory exists
   */
  private validateScriptsDirectory(): void {
    if (!existsSync(this.pythonScriptsPath)) {
      logger.error('Python scripts directory not found', { path: this.pythonScriptsPath });
      throw new AppError(
        `Python scripts directory not found at ${this.pythonScriptsPath}`,
        500,
        'SCRIPTS_DIR_NOT_FOUND'
      );
    }

    const ndviScriptPath = join(this.pythonScriptsPath, 'ndvi_calculator.py');
    if (!existsSync(ndviScriptPath)) {
      logger.error('NDVI calculator script not found', { path: ndviScriptPath });
      throw new AppError(
        `NDVI calculator script not found at ${ndviScriptPath}`,
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
      // Feature type
      if (polygon.geometry.type !== 'Polygon') {
        throw new AppError('Polygon geometry type must be "Polygon"', 400, 'INVALID_POLYGON');
      }
      coordinates = polygon.geometry.coordinates;
    } else if ('coordinates' in polygon) {
      // Direct Polygon type
      coordinates = polygon.coordinates;
    } else {
      throw new AppError('Invalid polygon format: missing coordinates', 400, 'INVALID_POLYGON');
    }

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
      throw new AppError('Polygon must have at least one ring of coordinates', 400, 'INVALID_POLYGON');
    }

    const firstRing = coordinates[0];
    if (!Array.isArray(firstRing) || firstRing.length < 4) {
      throw new AppError('Polygon ring must have at least 4 coordinates (closed ring)', 400, 'INVALID_POLYGON');
    }

    // Validate coordinate values are numbers and within valid ranges
    for (const ring of coordinates) {
      for (const coord of ring) {
        if (!Array.isArray(coord) || coord.length !== 2) {
          throw new AppError('Each coordinate must be [longitude, latitude]', 400, 'INVALID_POLYGON');
        }
        const [lon, lat] = coord;
        if (typeof lon !== 'number' || typeof lat !== 'number') {
          throw new AppError('Coordinates must be numbers', 400, 'INVALID_POLYGON');
        }
        if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
          throw new AppError(
            `Invalid coordinate: longitude must be [-180, 180], latitude must be [-90, 90]`,
            400,
            'INVALID_POLYGON'
          );
        }
      }
    }
  }

  /**
   * Normalize date to YYYY-MM-DD format
   */
  private normalizeDateString(dateStr: string): string {
    // Handle full ISO format (2024-01-01T00:00:00.000Z)
    if (dateStr.includes('T')) {
      return dateStr.split('T')[0];
    }
    return dateStr;
  }

  /**
   * Validate date format and range
   */
  private validateDates(startDate: string, endDate: string): { startDate: string; endDate: string } {
    // Normalize dates to YYYY-MM-DD format
    const normalizedStart = this.normalizeDateString(startDate);
    const normalizedEnd = this.normalizeDateString(endDate);

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(normalizedStart)) {
      throw new AppError(
        `Invalid start date format: ${startDate}. Expected YYYY-MM-DD`,
        400,
        'INVALID_DATE_FORMAT'
      );
    }

    if (!dateRegex.test(normalizedEnd)) {
      throw new AppError(
        `Invalid end date format: ${endDate}. Expected YYYY-MM-DD`,
        400,
        'INVALID_DATE_FORMAT'
      );
    }

    const start = new Date(normalizedStart);
    const end = new Date(normalizedEnd);

    if (isNaN(start.getTime())) {
      throw new AppError(`Invalid start date: ${startDate}`, 400, 'INVALID_DATE');
    }

    if (isNaN(end.getTime())) {
      throw new AppError(`Invalid end date: ${endDate}`, 400, 'INVALID_DATE');
    }

    if (start > end) {
      throw new AppError('Start date must be before end date', 400, 'INVALID_DATE_RANGE');
    }

    // Check date range is not more than MAX_DATE_RANGE_YEARS years
    const yearsDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (yearsDiff > this.MAX_DATE_RANGE_YEARS) {
      throw new AppError(
        `Date range cannot exceed ${this.MAX_DATE_RANGE_YEARS} years. Current range: ${yearsDiff.toFixed(2)} years`,
        400,
        'DATE_RANGE_TOO_LARGE'
      );
    }

    // Check end date is not in the future
    const now = new Date();
    if (end > now) {
      throw new AppError('End date cannot be in the future', 400, 'INVALID_DATE');
    }

    return { startDate: normalizedStart, endDate: normalizedEnd };
  }

  /**
   * Extract polygon bounds for logging
   */
  private getPolygonBounds(polygon: GeoJSONPolygon): { minLon: number; maxLon: number; minLat: number; maxLat: number } {
    let coordinates: number[][][];

    if ('geometry' in polygon && polygon.geometry) {
      coordinates = polygon.geometry.coordinates;
    } else {
      coordinates = polygon.coordinates;
    }

    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    for (const ring of coordinates) {
      for (const [lon, lat] of ring) {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    }

    return { minLon, maxLon, minLat, maxLat };
  }

  /**
   * Calculate NDVI from Sentinel-2 imagery
   */
  async calculateNDVI(
    polygon: GeoJSONPolygon,
    startDate: string,
    endDate: string
  ): Promise<NDVIResult> {
    const startTime = Date.now();
    const bounds = this.getPolygonBounds(polygon);

    // Log start of calculation with polygon bounds
    logger.info('Starting NDVI calculation', {
      startDate,
      endDate,
      bounds: {
        minLon: bounds.minLon.toFixed(6),
        maxLon: bounds.maxLon.toFixed(6),
        minLat: bounds.minLat.toFixed(6),
        maxLat: bounds.maxLat.toFixed(6),
      },
    });

    try {
      // Validate inputs
      this.validatePolygon(polygon);
      const normalizedDates = this.validateDates(startDate, endDate);

      // Validate Python and scripts directory
      await this.validatePythonPath();
      this.validateScriptsDirectory();

      // Ensure tmp directory exists
      const tmpDir = join(process.cwd(), 'tmp');
      await mkdir(tmpDir, { recursive: true });

      // Write polygon to temp file
      const polygonJson = JSON.stringify(polygon);
      const polygonFile = join(tmpDir, `polygon_${Date.now()}.json`);
      await writeFile(polygonFile, polygonJson, 'utf-8');

      // Execute Python script with normalized dates
      const command = `"${this.pythonPath}" "${join(
        this.pythonScriptsPath,
        'ndvi_calculator.py'
      )}" --polygon "${polygonFile}" --start-date "${normalizedDates.startDate}" --end-date "${normalizedDates.endDate}"`;

      logger.debug('Executing Python script', { command: command.replace(this.pythonPath, 'python') });

      let stdout: string;
      let stderr: string;

      try {
        const result = await execAsync(command, { timeout: 60000 });
        stdout = result.stdout;
        stderr = result.stderr || '';
      } catch (execError: unknown) {
        const error = execError as { code?: string; signal?: string; stdout?: string; stderr?: string };
        
        // Handle timeout specifically
        if (error.code === 'ETIMEDOUT' || error.signal === 'SIGTERM') {
          logger.error('NDVI calculation timed out', {
            timeout: 60000,
            bounds,
          });
          throw new AppError(
            'NDVI calculation timed out after 60 seconds. The area may be too large or GEE may be experiencing high load.',
            504,
            'GEE_TIMEOUT'
          );
        }

        // Handle other execution errors
        stdout = error.stdout || '';
        stderr = error.stderr || '';
        
        if (!stderr && !stdout) {
          logger.error('Python script execution failed', {
            error: error.code || error.signal,
            bounds,
          });
          throw new AppError(
            `Python script execution failed: ${error.code || error.signal || 'Unknown error'}`,
            500,
            'PYTHON_EXECUTION_ERROR'
          );
        }
      }

      // Log stderr output from Python
      if (stderr) {
        // Check if stderr contains actual errors (not just informational messages)
        const hasError = stderr.toLowerCase().includes('error:') ||
                        stderr.toLowerCase().includes('exception:') ||
                        stderr.toLowerCase().includes('traceback');

        if (hasError) {
          logger.error('NDVI calculation error from Python', { stderr, bounds });
          throw new AppError(
            `NDVI calculation failed: ${stderr.substring(0, 200)}`,
            500,
            'GEE_ERROR'
          );
        } else {
          // Log as info for informational messages like "Found X images in collection"
          logger.debug('Python script output', { stderr: stderr.substring(0, 500), bounds });
        }
      }

      // Parse JSON output from Python script
      let result: NDVIResult;
      try {
        result = parseJsonOutput<NDVIResult>(stdout, 'NDVI calculation');
      } catch (parseError) {
        logger.error('Failed to parse JSON output from Python script', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          stdout: stdout.substring(0, 500),
          stderr: stderr.substring(0, 500),
          bounds,
        });
        throw new AppError(
          'Failed to parse NDVI calculation result. The Python script may have encountered an error.',
          500,
          'JSON_PARSE_ERROR'
        );
      }

      // Validate result structure
      if (
        typeof result.mean !== 'number' ||
        typeof result.median !== 'number' ||
        typeof result.std !== 'number' ||
        typeof result.min !== 'number' ||
        typeof result.max !== 'number'
      ) {
        logger.error('Invalid NDVI result structure', { result, bounds });
        throw new AppError(
          'Invalid NDVI result structure from Python script',
          500,
          'INVALID_RESULT'
        );
      }

      result.calculatedAt = new Date().toISOString();

      const executionTime = Date.now() - startTime;
      logger.info('NDVI calculation successful', {
        mean: result.mean,
        median: result.median,
        cloudCoverage: result.cloudCoverage,
        executionTimeMs: executionTime,
        bounds,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      if (error instanceof AppError) {
        logger.error('NDVI calculation failed', {
          error: error.message,
          code: error.code,
          executionTimeMs: executionTime,
          bounds,
        });
        throw error;
      }

      logger.error('NDVI calculation failed with unexpected error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        executionTimeMs: executionTime,
        bounds,
      });
      
      throw new AppError(
        'Failed to calculate NDVI. Please check GEE configuration and try again.',
        500,
        'GEE_ERROR'
      );
    }
  }

  /**
   * Analyze deforestation over 5 years
   */
  async analyzeDeforestation(
    polygon: GeoJSONPolygon,
    projectId: string
  ): Promise<DeforestationAnalysis> {
    logger.info('Calling deforestation analysis Python script', { projectId });

    try {
      // Calculate date range (last 5 years)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Ensure tmp directory exists
      const tmpDir = join(process.cwd(), 'tmp');
      await mkdir(tmpDir, { recursive: true });

      // Write polygon to temp file
      const polygonJson = JSON.stringify(polygon);
      const polygonFile = join(tmpDir, `polygon_${Date.now()}.json`);
      await writeFile(polygonFile, polygonJson, 'utf-8');

      // Execute Python script
      const command = `"${this.pythonPath}" "${join(
        this.pythonScriptsPath,
        'deforestation_analysis.py'
      )}" --polygon "${polygonFile}" --start-date "${startDate}" --end-date "${endDate}" --project-id "${projectId}"`;

      const { stdout, stderr } = await execAsync(command, { timeout: 120000 });

      if (stderr && !stderr.includes('Warning')) {
        logger.error('Deforestation analysis error', new Error(stderr));
        throw new AppError('Deforestation analysis failed', 500, 'GEE_ERROR');
      }

      // Parse JSON output
      const result = parseJsonOutput<DeforestationAnalysis>(stdout, 'Deforestation analysis');

      // Ensure compliant flag is set (<5% loss = compliant)
      if (!('compliant' in result)) {
        result.compliant = result.deforestationPercent < 5;
      }

      logger.info('Deforestation analysis successful', {
        deforestationPercent: result.deforestationPercent,
        compliant: result.compliant,
      });

      return result;
    } catch (error) {
      logger.error('Deforestation analysis failed', error as Error);
      throw new AppError(
        'Failed to analyze deforestation. Please check GEE configuration.',
        500,
        'GEE_ERROR'
      );
    }
  }

  /**
   * Get NDVI time series (monthly/quarterly)
   */
  async getNDVITimeSeries(
    polygon: GeoJSONPolygon,
    startDate: string,
    endDate: string
  ): Promise<Array<{ date: string; value: number }>> {
    logger.info('Getting NDVI time series', { startDate, endDate });

    // This would call a similar Python script for time series
    // For now, return empty array as placeholder
    logger.warn('NDVI time series not yet implemented');

    return [];
  }
}
