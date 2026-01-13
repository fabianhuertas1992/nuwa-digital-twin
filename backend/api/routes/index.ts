/**
 * Main route aggregator
 * Combines all route modules
 */

import { Router } from 'express';
import healthRoutes from './health.routes.js';
import farmRoutes from './farm.routes.js';

const router = Router();

// Health check routes
router.use(healthRoutes);

// API routes
router.use('/farms', farmRoutes);

export default router;
