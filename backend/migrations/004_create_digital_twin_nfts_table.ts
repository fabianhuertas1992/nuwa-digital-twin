/**
 * Migration: Create digital_twin_nfts table for Cardano NFTs
 */

import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export async function up(queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> {
  await queryInterface.createTable('digital_twin_nfts', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    farm_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'farms',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    token_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    ipfs_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    tx_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    baseline_carbon_tco2e: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    eudr_compliant: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    minted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Create indexes
  await queryInterface.addIndex('digital_twin_nfts', ['farm_id']);
  await queryInterface.addIndex('digital_twin_nfts', ['token_id'], { unique: true });
  await queryInterface.addIndex('digital_twin_nfts', ['tx_hash']);

  console.log('Digital twin NFTs table created');
}

export async function down(queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> {
  await queryInterface.dropTable('digital_twin_nfts');
  console.log('Digital twin NFTs table dropped');
}
