/**
 * Global error handling middleware
 * Catches all errors and returns consistent JSON responses
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';
import { ApiResponse } from '../../types/index.js';

export class AppError extends Error {
  statusCode: number;
  code?: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error('Request error', err, {
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Determine status code and error details
  let statusCode = 500;
  let code: string | undefined;
  let message = 'Internal server error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  } else if (err instanceof Error) {
    message = err.message;
    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      message = 'An unexpected error occurred';
    }
  }

  // Send error response
  const response: ApiResponse = {
    success: false,
    error: message,
    code: code || 'INTERNAL_ERROR',
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err instanceof Error) {
    response.details = {
      stack: err.stack,
    };
  }

  res.status(statusCode).json(response);
};

/**
 * Async error wrapper - catches errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
