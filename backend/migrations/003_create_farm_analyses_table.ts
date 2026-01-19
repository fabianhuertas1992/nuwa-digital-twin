/**
 * Migration: Create farm_analyses table
 */

import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export async function up(queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> {
  await queryInterface.createTable('farm_analyses', {
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
    analysis_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    result: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    analysis_date: {
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

  // Create indexes for faster queries
  await queryInterface.addIndex('farm_analyses', ['farm_id']);
  await queryInterface.addIndex('farm_analyses', ['analysis_type']);
  await queryInterface.addIndex('farm_analyses', ['analysis_date']);

  console.log('Farm analyses table created');
}

export async function down(queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> {
  await queryInterface.dropTable('farm_analyses');
  console.log('Farm analyses table dropped');
}
