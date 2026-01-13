# NUWA | NEPTURA - Project Specification

## 🎯 Project Vision
Build a SaaS platform that tokenizes and commercializes verified carbon credits from agroforestry and silvopastoral systems, integrating blockchain, satellite monitoring (MRV), and the EU CBAM mechanism.

---

## 📍 Current Phase: MOMENTO 1 - DIGITAL TWIN

### Objective
Create an immutable, blockchain-backed digital representation of farms including:
- Geolocation + boundary polygon (GeoJSON)
- Baseline carbon stock (tCO2e)
- NDVI vegetation analysis
- EUDR compliance (deforestation validation)
- NFT certificate on Cardano

### Success Criteria
- ✅ Upload farm polygon (GeoJSON)
- ✅ Calculate NDVI statistics from Sentinel-2
- ✅ Validate no deforestation in last 5 years (<5% forest loss)
- ✅ Calculate carbon baseline using allometric equations
- ✅ Store data in PostgreSQL + PostGIS
- ✅ Generate immutable hash stored in IPFS
- ✅ Mint NFT on Cardano with metadata

---

## 🏗️ System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Farmer/Validator)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 1. Upload GeoJSON Polygon
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND (Next.js + React)                     │
│  - Map viewer (Mapbox/Leaflet)                             │
│  - Farm upload interface                                    │
│  - NDVI/Deforestation visualizations                        │
│  - Dashboard with farm status                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 2. REST API Calls
                         ↓
┌─────────────────────────────────────────────────────────────┐
│           BACKEND API (Node.js + Express)                   │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │           CONTROLLERS (HTTP Layer)           │          │
│  │  - FarmController                            │          │
│  │  - ValidationController                      │          │
│  │  - BlockchainController                      │          │
│  └──────────────────┬───────────────────────────┘          │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────┐          │
│  │         SERVICES (Business Logic)            │          │
│  │  - GEEService (NDVI, deforestation)         │          │
│  │  - CarbonService (baseline calculation)     │          │
│  │  - IPFSService (immutable storage)          │          │
│  │  - BlockchainService (Cardano minting)      │          │
│  └──────────────────┬───────────────────────────┘          │
│                     │                                       │
└─────────────────────┼───────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ↓            ↓            ↓
┌──────────────┐ ┌─────────┐ ┌──────────────┐
│ PYTHON       │ │ POSTGRE │ │ IPFS/        │
│ SCRIPTS      │ │ SQL +   │ │ ARWEAVE      │
│              │ │ PostGIS │ │              │
│ - GEE API    │ │         │ │ - Imagery    │
│ - NDVI calc  │ │ - Farms │ │ - Metadata   │
│ - Deforest   │ │ - Users │ │ - Hashes     │
│ - Carbon eq  │ │ - Logs  │ │              │
└──────────────┘ └─────────┘ └──────────────┘
         │
         │ 5. Return processed data
         ↓
┌─────────────────────────────────────────────────────────────┐
│              CARDANO BLOCKCHAIN                             │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │      SMART CONTRACTS (Plutus)                │          │
│  │                                               │          │
│  │  - DigitalTwinNFT.plutus                    │          │
│  │    → Mint NFT with farm baseline            │          │
│  │                                               │          │
│  │  - EUDRValidator.plutus                     │          │
│  │    → Validate deforestation compliance      │          │
│  │                                               │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Components

### 1. Backend API (Node.js + TypeScript)

#### Core Services

**GEEService** - Google Earth Engine Integration
```typescript
class GEEService {
  // Calculate NDVI from Sentinel-2 imagery
  async calculateNDVI(polygon: GeoJSON, startDate: string, endDate: string): Promise<NDVIResult>
  
  // Analyze deforestation over 5 years
  async analyzeDeforestation(polygon: GeoJSON, projectId: string): Promise<DeforestationAnalysis>
  
  // Get NDVI time series (monthly/quarterly)
  async getNDVITimeSeries(polygon: GeoJSON, startDate: string, endDate: string): Promise<TimeSeriesData[]>
}
```

**CarbonService** - Carbon Baseline Calculations
```typescript
class CarbonService {
  // Calculate baseline carbon using allometric equations
  async calculateBaseline(farmData: FarmData, treeData: TreeInventory): Promise<CarbonBaseline>
  
  // Estimate future carbon sequestration
  async projectCarbonSequestration(baseline: CarbonBaseline, years: number): Promise<CarbonProjection>
}
```

**IPFSService** - Immutable Storage
```typescript
class IPFSService {
  // Upload file to IPFS/Arweave
  async upload(file: Buffer, metadata: object): Promise<string> // Returns CID
  
  // Retrieve file from IPFS
  async retrieve(cid: string): Promise<Buffer>
}
```

**BlockchainService** - Cardano Integration
```typescript
class BlockchainService {
  // Mint NFT for digital twin
  async mintDigitalTwinNFT(farmBaseline: FarmBaseline): Promise<string> // Returns TX hash
  
  // Validate EUDR compliance on-chain
  async validateEUDR(projectId: string, compliant: boolean): Promise<string>
}
```

#### API Endpoints (v1)
```
POST   /api/v1/farms                        - Create new farm
GET    /api/v1/farms/:id                    - Get farm details
POST   /api/v1/farms/:id/calculate-ndvi     - Calculate NDVI
POST   /api/v1/farms/:id/analyze-deforestation - Deforestation analysis
POST   /api/v1/farms/:id/calculate-baseline - Carbon baseline
POST   /api/v1/farms/:id/mint-nft          - Mint digital twin NFT
GET    /api/v1/farms/:id/status             - Get validation status
```

---

### 2. Python Scripts (GEE Processing)

**ndvi_calculator.py**
```python
# Calculate NDVI from Sentinel-2
# Input: --polygon (GeoJSON), --start-date, --end-date
# Output: JSON with statistics (mean, median, std, min, max, imageUrl)
```

**deforestation_analysis.py**
```python
# Analyze forest loss using Hansen GFC + Sentinel-2
# Input: --polygon, --start-date (5 years ago), --end-date (now)
# Output: JSON with deforestationPercent, areaLostHa, compliant, changeDetectionUrl
```

**carbon_baseline.py**
```python
# Calculate carbon baseline using allometric equations
# Input: --farm-data (JSON), --tree-inventory (JSON)
# Output: JSON with baselineCarbonTCO2e, methodology, confidence
```

---

### 3. Database Models (PostgreSQL + PostGIS)

**farms**
```sql
CREATE TABLE farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES users(id),
  polygon GEOMETRY(POLYGON, 4326) NOT NULL,
  area_ha DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_farms_polygon ON farms USING GIST(polygon);
```

**farm_analyses**
```sql
CREATE TABLE farm_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id),
  analysis_type VARCHAR(50) NOT NULL, -- 'ndvi', 'deforestation', 'baseline'
  result JSONB NOT NULL,
  analysis_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_farm_analyses_farm_id ON farm_analyses(farm_id);
CREATE INDEX idx_farm_analyses_type ON farm_analyses(analysis_type);
```

**digital_twin_nfts**
```sql
CREATE TABLE digital_twin_nfts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id),
  token_id VARCHAR(255) UNIQUE NOT NULL,
  ipfs_hash VARCHAR(255) NOT NULL,
  tx_hash VARCHAR(255) NOT NULL,
  baseline_carbon_tco2e DECIMAL(10, 2),
  eudr_compliant BOOLEAN DEFAULT FALSE,
  minted_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📊 Data Flow Example

### Creating a Digital Twin

1. **User uploads farm polygon**
```json
   POST /api/v1/farms
   {
     "name": "Finca Santa Rita",
     "owner": "farmer@example.com",
     "polygon": {
       "type": "Polygon",
       "coordinates": [[[-75.5, 4.5], [-75.5, 4.6], ...]]
     }
   }
```

2. **System calculates NDVI**
   - Backend calls Python script with polygon + dates
   - Python queries Google Earth Engine
   - Returns NDVI statistics
   - Saved to `farm_analyses` table

3. **System validates EUDR compliance**
   - Analyzes deforestation over 5 years
   - If <5% loss → compliant ✅
   - If ≥5% loss → not compliant ❌

4. **System calculates carbon baseline**
   - Uses tree inventory data (if available)
   - Applies allometric equations
   - Estimates tCO2e stored

5. **System mints NFT**
   - Uploads metadata to IPFS
   - Calls Cardano smart contract
   - Mints NFT with immutable reference
   - Returns transaction hash

---

## 🧪 Testing Strategy

### Unit Tests
- Service methods (GEEService, CarbonService, etc.)
- Utility functions (coordinate conversion, validation)
- Allometric equation calculations

### Integration Tests
- API endpoints with mocked Python scripts
- Database operations
- IPFS upload/retrieve

### E2E Tests
- Complete farm creation flow
- NDVI calculation with real GEE data (limited)
- NFT minting on Cardano testnet

---

## 🚀 Development Phases

### Phase 1 (Current): Core Backend - Week 1
- [x] Project setup
- [ ] GEEService + NDVI calculation
- [ ] Deforestation analysis
- [ ] Carbon baseline calculation
- [ ] PostgreSQL + PostGIS setup
- [ ] API endpoints

### Phase 2: Storage & Blockchain - Week 2
- [ ] IPFS integration
- [ ] Cardano smart contracts (Plutus)
- [ ] NFT minting flow
- [ ] Wallet integration

### Phase 3: Frontend - Week 3-4
- [ ] Next.js setup
- [ ] Map viewer
- [ ] Farm upload interface
- [ ] Dashboard

---

## 🔐 Security Considerations

- **API Keys**: Store in `.env`, never commit
- **Database**: Use connection pooling, prepared statements
- **Input Validation**: Validate all user inputs (polygon format, dates, etc.)
- **Rate Limiting**: Prevent abuse of GEE API calls
- **Authentication**: JWT tokens for API access
- **CORS**: Restrict origins in production

---

## 📚 Key References

- **Google Earth Engine**: https://earthengine.google.com/
- **Sentinel-2**: https://sentinel.esa.int/web/sentinel/missions/sentinel-2
- **EUDR Regulation**: EU 2023/1115
- **Cardano Plutus**: https://plutus.readthedocs.io/
- **PostGIS**: https://postgis.net/

---

## 💡 Next Immediate Steps

1. ✅ Create project structure
2. ✅ Setup .cursorrules and PROJECT_SPEC.md
3. ⏳ Initialize Node.js backend with TypeScript
4. ⏳ Implement GEEService + ndvi_calculator.py
5. ⏳ Create API endpoints for NDVI calculation
6. ⏳ Test with real farm polygon

---

_Last Updated: 2026-01-13_
_Author: Fabian - BigData Analyst & Systems Engineering Student_
```

Guarda el archivo.

---

## PASO 4: INICIALIZAR EL PROYECTO CON CURSOR

Ahora vamos a pedirle a Cursor que cree toda la estructura inicial.

### 4.1 Abrir Cursor Composer

Presiona **Cmd+Shift+I** (Mac) o **Ctrl+Shift+I** (Windows/Linux) para abrir el Composer.

### 4.2 Pegar este prompt

Copia y pega exactamente esto en Composer:
```
I need you to initialize the NUWA Digital Twin project backend. Follow the specifications in PROJECT_SPEC.md and the rules in .cursorrules.

Please create:

1. Backend structure:
   - Initialize Node.js project with package.json
   - Setup TypeScript with strict tsconfig.json
   - Create folder structure as specified in .cursorrules
   - Install these dependencies:
     * express, cors, dotenv, helmet
     * pg, pg-hstore, sequelize
     * typescript, ts-node, nodemon, tsx
     * @types/express, @types/cors, @types/node
     * axios (for HTTP calls)

2. Configuration files:
   - .env.example with all required variables (DATABASE_URL, GEE keys, IPFS, etc.)
   - .gitignore (node_modules, .env, dist, etc.)
   - tsconfig.json with strict mode and path aliases

3. Core files:
   - backend/server.ts - Express server with basic setup
   - backend/api/routes/index.ts - Route aggregator
   - backend/api/middleware/error-handler.ts - Global error handling
   - backend/api/middleware/validator.ts - Input validation
   - backend/utils/logger.ts - Structured logging

4. Add npm scripts in package.json:
   - "dev": "nodemon --exec tsx server.ts"
   - "build": "tsc"
   - "start": "node dist/server.js"
   - "lint": "eslint . --ext .ts"

5. Create a basic health check endpoint:
   - GET /api/v1/health
   - Should return: { status: "healthy", timestamp: ISO date, version: "1.0.0" }

Requirements:
- Use ES modules (type: "module" in package.json)
- Add proper TypeScript types for everything
- Include error handling
- Add structured logging
- Follow the conventions in .cursorrules

After creating everything, the command `npm install && npm run dev` should work and start the server on port 3001.