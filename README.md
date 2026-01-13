# NUWA Digital Twin

SaaS platform for tokenizing verified carbon credits from agroforestry and silvopastoral systems, integrating blockchain, satellite monitoring (MRV), and the EU CBAM mechanism.

## 🎯 Current Phase: MOMENTO 1 - DIGITAL TWIN

Creating immutable, blockchain-backed digital representations of farms including:
- Geolocation + boundary polygon (GeoJSON)
- Baseline carbon stock (tCO2e)
- NDVI vegetation analysis
- EUDR compliance (deforestation validation)
- NFT certificate on Cardano

## 🏗️ Architecture

```
Backend API (Node.js + TypeScript + Express)
  ├── Services (Business Logic)
  │   ├── GEEService (NDVI, deforestation)
  │   ├── CarbonService (baseline calculation)
  │   ├── IPFSService (immutable storage)
  │   └── BlockchainService (Cardano minting)
  ├── Controllers (HTTP Handlers)
  ├── Models (Database)
  └── Middleware (Validation, Error Handling)

Python Scripts (GEE Processing)
  ├── ndvi_calculator.py
  ├── deforestation_analysis.py
  └── carbon_baseline.py

PostgreSQL + PostGIS
  ├── farms
  ├── farm_analyses
  └── digital_twin_nfts
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.10+
- PostgreSQL 15+ with PostGIS extension
- Google Earth Engine account (for satellite imagery)
- IPFS node (optional, can use public gateway)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nuwa-digital-twin
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   cd python-scripts
   pip install -r requirements.txt
   cd ..
   ```

4. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Setup database**
   ```bash
   # Create database
   createdb nuwa_digital_twin
   
   # Run migrations
   psql nuwa_digital_twin < database/migrations/001_create_tables.sql
   ```

6. **Initialize Google Earth Engine**
   ```bash
   # Authenticate with GEE
   earthengine authenticate
   ```

7. **Start the server**
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:3001`

## 📡 API Endpoints

### Health Check
- `GET /api/v1/health` - Health check endpoint

### Farms
- `POST /api/v1/farms` - Create new farm
- `GET /api/v1/farms/:id` - Get farm details
- `POST /api/v1/farms/:id/calculate-ndvi` - Calculate NDVI
- `POST /api/v1/farms/:id/analyze-deforestation` - Analyze deforestation
- `POST /api/v1/farms/:id/calculate-baseline` - Calculate carbon baseline
- `POST /api/v1/farms/:id/mint-nft` - Mint digital twin NFT
- `GET /api/v1/farms/:id/status` - Get validation status

## 🔧 Configuration

Key environment variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `GEE_SERVICE_ACCOUNT_EMAIL` - GEE service account email
- `GEE_PRIVATE_KEY_PATH` - Path to GEE private key
- `IPFS_API_URL` - IPFS node URL
- `CARDANO_NETWORK` - Cardano network (mainnet/testnet)
- `CARDANO_NODE_URL` - Cardano node URL

## 📝 Development

### Project Structure

```
nuwa-digital-twin/
├── backend/
│   ├── api/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── middleware/
│   ├── services/
│   ├── models/
│   ├── types/
│   ├── utils/
│   └── server.ts
├── python-scripts/
│   ├── ndvi_calculator.py
│   ├── deforestation_analysis.py
│   └── carbon_baseline.py
├── database/
│   └── migrations/
└── package.json
```

### Running in Development

```bash
npm run dev  # Starts with nodemon and tsx
```

### Building for Production

```bash
npm run build  # Compiles TypeScript
npm start      # Runs compiled JavaScript
```

## 🧪 Testing

Tests are not yet implemented. Planned testing strategy:
- Unit tests for services
- Integration tests for API endpoints
- E2E tests for complete flows

## 📚 Documentation

See `PROJECT_SPEC.md` for detailed specifications and architecture.

## 🔐 Security

- API keys stored in `.env` (never commit)
- Input validation on all endpoints
- Rate limiting (to be implemented)
- CORS configuration
- Helmet.js for security headers

## 📄 License

MIT

---

**Author**: Fabian - BigData Analyst & Systems Engineering Student  
**Last Updated**: 2026-01-13
