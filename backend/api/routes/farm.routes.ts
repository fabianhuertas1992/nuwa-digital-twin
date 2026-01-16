/**
 * Farm management routes
 */

import { Router } from 'express';
import { FarmController } from '../controllers/farm.controller.js';
import { validateBody, validateParams, schemas } from '../middleware/validator.js';
import Joi from 'joi';

const router = Router();
const farmController = new FarmController();

// Create farm
router.post(
  '/',
  validateBody(
    Joi.object({
      name: Joi.string().min(1).max(255).required(),
      ownerId: schemas.uuid,
      polygon: schemas.geoJsonPolygon,
    })
  ),
  farmController.createFarm.bind(farmController)
);

// Get farm by ID
router.get(
  '/:id',
  validateParams(Joi.object({ id: schemas.uuid })),
  farmController.getFarm.bind(farmController)
);

// Calculate NDVI (direct - accepts polygon in body)
router.post(
  '/calculate-ndvi',
  validateBody(
    Joi.object({
      polygon: schemas.geoJsonPolygon.required(),
      startDate: schemas.date.optional(),
      endDate: schemas.date.optional(),
    })
  ),
  farmController.calculateNDVIDirect.bind(farmController)
);

// Calculate NDVI for existing farm
router.post(
  '/:id/calculate-ndvi',
  validateParams(Joi.object({ id: schemas.uuid })),
  validateBody(
    Joi.object({
      startDate: schemas.date.optional(),
      endDate: schemas.date.optional(),
    })
  ),
  farmController.calculateNDVI.bind(farmController)
);

// Analyze deforestation (direct - accepts polygon in body)
router.post(
  '/analyze-deforestation',
  validateBody(
    Joi.object({
      polygon: schemas.geoJsonPolygon.required(),
      projectId: Joi.string().min(1).max(255).required(),
    })
  ),
  farmController.analyzeDeforestationDirect.bind(farmController)
);

// Analyze deforestation for existing farm
router.post(
  '/:id/analyze-deforestation',
  validateParams(Joi.object({ id: schemas.uuid })),
  farmController.analyzeDeforestation.bind(farmController)
);

// Calculate carbon baseline (direct - accepts polygon in body)
router.post(
  '/calculate-baseline',
  validateBody(
    Joi.object({
      polygon: schemas.geoJsonPolygon.required(),
      projectId: Joi.string().min(1).max(255).required(),
      method: Joi.string().valid('satellite', 'field', 'hybrid').optional(),
      treeInventory: Joi.array()
        .items(
          Joi.object({
            species: Joi.string().required(),
            dbh_cm: Joi.number().min(0).required(),
            height_m: Joi.number().min(0).required(),
            count: Joi.number().integer().min(1).optional(),
            location: Joi.object({
              lat: Joi.number().required(),
              lon: Joi.number().required(),
            }).optional(),
          })
        )
        .optional(),
    })
  ),
  farmController.calculateBaselineDirect.bind(farmController)
);

// Calculate carbon baseline for existing farm
router.post(
  '/:id/calculate-baseline',
  validateParams(Joi.object({ id: schemas.uuid })),
  validateBody(
    Joi.object({
      treeInventory: Joi.array()
        .items(
          Joi.object({
            species: Joi.string().required(),
            count: Joi.number().integer().min(0).required(),
            avgDbh: Joi.number().min(0).required(),
            avgHeight: Joi.number().min(0).required(),
          })
        )
        .optional(),
      agroforestryType: Joi.string().valid('agroforestry', 'silvopastoral').optional(),
    })
  ),
  farmController.calculateBaseline.bind(farmController)
);

// Mint NFT
router.post(
  '/:id/mint-nft',
  validateParams(Joi.object({ id: schemas.uuid })),
  farmController.mintNFT.bind(farmController)
);

// Get farm status
router.get(
  '/:id/status',
  validateParams(Joi.object({ id: schemas.uuid })),
  farmController.getStatus.bind(farmController)
);

export default router;
