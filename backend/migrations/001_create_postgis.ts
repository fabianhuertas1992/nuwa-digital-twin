/**
 * Migration: Enable PostGIS extension
 */

import { QueryInterface, Sequelize } from 'sequelize';

export async function up(queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> {
  // Enable PostGIS extension
  await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');

  console.log('PostGIS extension enabled');
}

export async function down(queryInterface: QueryInterface, sequelize: Sequelize): Promise<void> {
  // Note: Dropping PostGIS can be dangerous as it removes all spatial data
  // In production, you would typically not drop this
  await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS postgis CASCADE;');

  console.log('PostGIS extension removed');
}
