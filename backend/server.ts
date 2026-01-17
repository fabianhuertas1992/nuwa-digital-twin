/**
 * NUWA Digital Twin - Backend Server
 * Express server with API routes and middleware
 */

// Load environment variables FIRST (before any other imports)
import 'dotenv/config';

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './utils/logger.js';
import { errorHandler, AppError } from './api/middleware/error-handler.js';
import routes from './api/routes/index.js';
import { initDatabase, FarmModel } from './models/farm.model.js';

const app: Express = express();
const PORT = process.env.PORT || 3001;
const API_VERSION = process.env.API_VERSION || 'v1';

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check (before API routes)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API routes
app.use(`/api/${API_VERSION}`, routes);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  throw new AppError(`Route ${req.method} ${req.path} not found`, 404, 'ROUTE_NOT_FOUND');
});

// Global error handler (must be last)
app.use(errorHandler);

// Initialize database connection
async function initializeDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.warn('DATABASE_URL not set. Database operations will fail.');
    logger.warn('To enable database, set DATABASE_URL in .env file');
    return;
  }

  try {
    const sequelize = initDatabase(databaseUrl);
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Initialize models
    FarmModel.initializeModels(sequelize);

    // Sync database (in production, use migrations instead)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized');
    }
  } catch (error) {
    logger.error('Database connection failed', error as Error);
    logger.warn('Continuing without database...');
  }
}

// Start server
async function startServer(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();

    // Start listening
    app.listen(PORT, () => {
      logger.info('Server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        apiVersion: API_VERSION,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', reason as Error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

// Start the server
startServer();
