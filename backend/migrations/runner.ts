/**
 * Migration Runner
 * Executes all migrations in order
 */

import 'dotenv/config';
import { Sequelize } from 'sequelize';
import { readdirSync } from 'fs';
import { join } from 'path';

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/nuwa';

async function runMigrations() {
  console.log('Starting migrations...');
  console.log(`Connecting to: ${connectionString.replace(/:[^:@]+@/, ':***@')}`);

  const sequelize = new Sequelize(connectionString, {
    dialect: 'postgres',
    logging: console.log,
  });

  try {
    await sequelize.authenticate();
    console.log('Database connection established');

    // Create migrations tracking table if not exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Get already executed migrations
    const [executedRows] = await sequelize.query<{ name: string }>(
      'SELECT name FROM _migrations ORDER BY id'
    );
    const executed = new Set(executedRows.map((row: { name: string }) => row.name));

    // Get migration files (excluding runner.ts)
    const migrationsDir = __dirname;
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.ts') && f !== 'runner.ts')
      .sort();

    console.log(`Found ${files.length} migration files`);

    for (const file of files) {
      if (executed.has(file)) {
        console.log(`Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`Running migration: ${file}`);

      const migration = await import(join(migrationsDir, file));

      if (typeof migration.up !== 'function') {
        console.error(`Migration ${file} has no 'up' function`);
        continue;
      }

      await migration.up(sequelize.getQueryInterface(), sequelize);

      // Record migration as executed
      await sequelize.query('INSERT INTO _migrations (name) VALUES (?)', {
        replacements: [file],
      });

      console.log(`Completed: ${file}`);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
runMigrations();
