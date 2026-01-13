/**
 * Health check routes
 */

import { Router, Request, Response } from 'express';
import { ApiResponse } from '../../types/index.js';

const router = Router();

/**
 * GET /api/v1/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
  };

  res.json(response);
});

export default router;
