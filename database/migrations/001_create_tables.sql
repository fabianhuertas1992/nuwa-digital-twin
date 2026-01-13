-- NUWA Digital Twin Database Schema
-- PostgreSQL with PostGIS extension

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table (basic structure - can be extended)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Farms table
CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  polygon GEOMETRY(POLYGON, 4326) NOT NULL,
  area_ha DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create spatial index on farms polygon
CREATE INDEX IF NOT EXISTS idx_farms_polygon ON farms USING GIST(polygon);
CREATE INDEX IF NOT EXISTS idx_farms_owner_id ON farms(owner_id);

-- Farm analyses table
CREATE TABLE IF NOT EXISTS farm_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('ndvi', 'deforestation', 'baseline')),
  result JSONB NOT NULL,
  analysis_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes on farm_analyses
CREATE INDEX IF NOT EXISTS idx_farm_analyses_farm_id ON farm_analyses(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_analyses_type ON farm_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_farm_analyses_analysis_date ON farm_analyses(analysis_date);

-- Digital Twin NFTs table
CREATE TABLE IF NOT EXISTS digital_twin_nfts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  token_id VARCHAR(255) UNIQUE NOT NULL,
  ipfs_hash VARCHAR(255) NOT NULL,
  tx_hash VARCHAR(255) NOT NULL,
  baseline_carbon_tco2e DECIMAL(10, 2),
  eudr_compliant BOOLEAN DEFAULT FALSE,
  minted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes on digital_twin_nfts
CREATE INDEX IF NOT EXISTS idx_digital_twin_nfts_farm_id ON digital_twin_nfts(farm_id);
CREATE INDEX IF NOT EXISTS idx_digital_twin_nfts_token_id ON digital_twin_nfts(token_id);
CREATE INDEX IF NOT EXISTS idx_digital_twin_nfts_tx_hash ON digital_twin_nfts(tx_hash);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on farms
CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON farms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on users
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
