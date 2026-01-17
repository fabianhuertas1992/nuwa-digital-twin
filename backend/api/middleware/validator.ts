/**
 * Input validation middleware using Joi
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './error-handler.js';
import { logger } from '../../utils/logger.js';

/**
 * Validates request body against Joi schema
 */
export const validateBody = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation error', { errors, body: req.body });

      throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    }

    // Replace request body with validated value
    req.body = value;
    next();
  };
};

/**
 * Validates request query parameters against Joi schema
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Query validation error', { errors, query: req.query });

      throw new AppError('Query validation failed', 400, 'VALIDATION_ERROR');
    }

    req.query = value;
    next();
  };
};

/**
 * Validates request params against Joi schema
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Params validation error', { errors, params: req.params });

      throw new AppError('Params validation failed', 400, 'VALIDATION_ERROR');
    }

    req.params = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  uuid: Joi.string().uuid().required(),
  geoJsonPolygon: Joi.alternatives().try(
    // Direct Polygon type
    Joi.object({
      type: Joi.string().valid('Polygon').required(),
      coordinates: Joi.array()
        .items(
          Joi.array().items(
            Joi.array().items(Joi.number().min(-180).max(180)).length(2)
          )
        )
        .min(1)
        .required(),
    }),
    // Feature type with geometry
    Joi.object({
      type: Joi.string().valid('Feature').required(),
      geometry: Joi.object({
        type: Joi.string().valid('Polygon').required(),
        coordinates: Joi.array()
          .items(
            Joi.array().items(
              Joi.array().items(Joi.number().min(-180).max(180)).length(2)
            )
          )
          .min(1)
          .required(),
      }).required(),
      properties: Joi.object().optional().unknown(true),
      id: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
    })
  ),
  date: Joi.string().isoDate(),
};
