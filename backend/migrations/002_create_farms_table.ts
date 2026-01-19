/**
 * Migration: Create farms table with PostGIS polygon support
 */

import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export async function up(queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> {
  await queryInterface.createTable('farms', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    polygon: {
      type: 'GEOMETRY(POLYGON, 4326)',
      allowNull: false,
    },
    area_ha: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
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

  // Create spatial index for polygon column
  await queryInterface.sequelize.query(`
    CREATE INDEX farms_polygon_idx ON farms USING GIST (polygon);
  `);

  // Create index on owner_id for faster lookups
  await queryInterface.addIndex('farms', ['owner_id']);

  console.log('Farms table created with PostGIS support');
}

export async function down(queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> {
  await queryInterface.dropTable('farms');
  console.log('Farms table dropped');
}
