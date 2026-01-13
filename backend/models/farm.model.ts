/**
 * Farm Model
 * Database operations for farms, analyses, and NFTs
 */

import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import {
  Farm,
  FarmAnalysis,
  DigitalTwinNFT,
  GeoJSONPolygon,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

// Initialize Sequelize (will be configured with actual DB connection)
let sequelize: Sequelize | null = null;

export function initDatabase(connectionString: string): Sequelize {
  sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: (msg) => logger.debug('SQL', { query: msg }),
    dialectOptions: {
      // Enable PostGIS extension
      // This will be handled by migrations
    },
  });

  return sequelize;
}

// Farm Model Definition
interface FarmCreationAttributes extends Optional<Farm, 'id' | 'createdAt' | 'updatedAt'> {}

class FarmEntity extends Model<Farm, FarmCreationAttributes> implements Farm {
  declare id: string;
  declare name: string;
  declare ownerId: string;
  declare polygon: GeoJSONPolygon;
  declare areaHa: number | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

// Farm Analysis Model
interface FarmAnalysisCreationAttributes
  extends Optional<FarmAnalysis, 'id' | 'createdAt'> {}

class FarmAnalysisEntity
  extends Model<FarmAnalysis, FarmAnalysisCreationAttributes>
  implements FarmAnalysis
{
  declare id: string;
  declare farmId: string;
  declare analysisType: 'ndvi' | 'deforestation' | 'baseline';
  declare result: Record<string, unknown>;
  declare analysisDate: Date;
  declare createdAt: Date;
}

// Digital Twin NFT Model
interface DigitalTwinNFTCreationAttributes
  extends Optional<DigitalTwinNFT, 'id' | 'createdAt'> {}

class DigitalTwinNFTEntity
  extends Model<DigitalTwinNFT, DigitalTwinNFTCreationAttributes>
  implements DigitalTwinNFT
{
  declare id: string;
  declare farmId: string;
  declare tokenId: string;
  declare ipfsHash: string;
  declare txHash: string;
  declare baselineCarbonTCO2e: number | null;
  declare eudrCompliant: boolean;
  declare mintedAt: Date;
  declare createdAt: Date;
}

export class FarmModel {
  /**
   * Initialize database models
   */
  static initializeModels(db: Sequelize): void {
    FarmEntity.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        ownerId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        polygon: {
          type: DataTypes.GEOMETRY('POLYGON', 4326),
          allowNull: false,
        },
        areaHa: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize: db,
        tableName: 'farms',
        timestamps: true,
      }
    );

    FarmAnalysisEntity.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        farmId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'farms',
            key: 'id',
          },
        },
        analysisType: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        result: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
        analysisDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        createdAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize: db,
        tableName: 'farm_analyses',
        timestamps: true,
      }
    );

    DigitalTwinNFTEntity.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        farmId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'farms',
            key: 'id',
          },
        },
        tokenId: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        ipfsHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        txHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        baselineCarbonTCO2e: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
        },
        eudrCompliant: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        mintedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        createdAt: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize: db,
        tableName: 'digital_twin_nfts',
        timestamps: true,
      }
    );

    // Define associations
    FarmEntity.hasMany(FarmAnalysisEntity, { foreignKey: 'farmId', as: 'analyses' });
    FarmEntity.hasOne(DigitalTwinNFTEntity, { foreignKey: 'farmId', as: 'nft' });
  }

  /**
   * Create a new farm
   */
  async create(data: {
    name: string;
    ownerId: string;
    polygon: GeoJSONPolygon;
    areaHa: number | null;
  }): Promise<Farm> {
    if (!sequelize) {
      throw new Error('Database not initialized. Call initDatabase first.');
    }

    const farm = await FarmEntity.create({
      name: data.name,
      ownerId: data.ownerId,
      polygon: data.polygon,
      areaHa: data.areaHa,
    });

    return farm.toJSON() as Farm;
  }

  /**
   * Find farm by ID
   */
  async findById(id: string): Promise<Farm | null> {
    if (!sequelize) {
      throw new Error('Database not initialized. Call initDatabase first.');
    }

    const farm = await FarmEntity.findByPk(id);

    return farm ? (farm.toJSON() as Farm) : null;
  }

  /**
   * Save analysis result
   */
  async saveAnalysis(
    farmId: string,
    analysisType: 'ndvi' | 'deforestation' | 'baseline',
    result: Record<string, unknown>
  ): Promise<FarmAnalysis> {
    if (!sequelize) {
      throw new Error('Database not initialized. Call initDatabase first.');
    }

    const analysis = await FarmAnalysisEntity.create({
      farmId,
      analysisType,
      result,
      analysisDate: new Date(),
    });

    return analysis.toJSON() as FarmAnalysis;
  }

  /**
   * Get all analyses for a farm
   */
  async getAnalyses(farmId: string): Promise<FarmAnalysis[]> {
    if (!sequelize) {
      throw new Error('Database not initialized. Call initDatabase first.');
    }

    const analyses = await FarmAnalysisEntity.findAll({
      where: { farmId },
      order: [['createdAt', 'DESC']],
    });

    return analyses.map((a) => a.toJSON() as FarmAnalysis);
  }

  /**
   * Save NFT record
   */
  async saveNFT(data: {
    farmId: string;
    tokenId: string;
    ipfsHash: string;
    txHash: string;
    baselineCarbonTCO2e: number | null;
    eudrCompliant: boolean;
  }): Promise<DigitalTwinNFT> {
    if (!sequelize) {
      throw new Error('Database not initialized. Call initDatabase first.');
    }

    const nft = await DigitalTwinNFTEntity.create({
      ...data,
      mintedAt: new Date(),
    });

    return nft.toJSON() as DigitalTwinNFT;
  }

  /**
   * Get NFT for a farm
   */
  async getNFT(farmId: string): Promise<DigitalTwinNFT | null> {
    if (!sequelize) {
      throw new Error('Database not initialized. Call initDatabase first.');
    }

    const nft = await DigitalTwinNFTEntity.findOne({
      where: { farmId },
    });

    return nft ? (nft.toJSON() as DigitalTwinNFT) : null;
  }
}
