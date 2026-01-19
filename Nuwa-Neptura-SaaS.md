# NUWA | NEPTURA
## Especificación de Requerimientos Técnicos y Económicos
### SaaS de Créditos de Carbono Verificados en Blockchain (RWA)

**Versión:** 1.0  
**Fecha:** Enero 2026  
**Clasificación:** Documento Técnico Estratégico  
**Audiencia:** Inversores VC, Desarrolladores DeFi, Stakeholders Agroforestales

---

## EXECUTIVE SUMMARY

**NUWA | NEPTURA** es una plataforma SaaS que tokeniza y comercializa créditos de carbono verificados a partir de sistemas agroforestales y silvopastoriles, integrando:

- **Tres Momentos de Valor:** Digitalización → Inversión → Verificación & Trading
- **Gemelos Digitales (NFT):** Representación on-chain del activo físico con línea de base certificada
- **Oráculos Descentralizados:** Integración dinámica de precios de commodities, carbono EU-ETS y CBAM
- **Tokenización Híbrida:** NFTs (certificados) + Tokens de Participación (dividendos) + Tokens de Utilidad (gobernanza)
- **Stack Blockchain:** Cardano + Fireblocks + Pyth/Chainlink + Smart Contracts Plutus
- **Monetización de CBAM:** Captura del ahorro fiscal derivado del Mecanismo de Ajuste en Frontera por Carbono

**Valor Propuesta:** Los inversores capturan no solo el premium de carbono verde, sino también el arbitraje fiscal del CBAM (evasión legal de tarifas de importación a UE).

---

## 1. ARQUITECTURA DE LOS TRES MOMENTOS

### 1.1 MOMENTO 1: GEMELO DIGITAL AGROFORESTAL (NFT Baseline)

#### Objetivo
Crear una representación on-chain inmutable del estado inicial de la finca, incluyendo línea de base de carbono, para validar elegibilidad bajo EUDR y calcular potencial de créditos.

#### Componentes de Captura

| **Atributo** | **Fuente de Dato** | **Validación On-Chain** | **Formato Almacenamiento** |
|---|---|---|---|
| **Geolocalización + Polígono** | GPS + Imagery Satelital (Sentinel-2) | Oráculo satelital verificado | GeoJSON + NFT metadata |
| **Estructura de Finca** | Drone RGB + LiDAR | Verificación geométrica (15% error máx) | 3D Point Cloud (IPFS) |
| **Propietarios + Familias** | Registro nacional + KYC blockchain | Smart contract de identidad descentralizada | DIDs (Decentralized Identifiers) |
| **Tipos de Cultivos & Áreas** | Clasificación satelital NDVI + validación in-situ | ML modelo entrenado Agreena-style | Vector shapefile + NFT atributos |
| **Línea de Base Carbono (Baseline)** | Metodología Verra VM0042 + cálculos AGB | Validación por nodo verificador independiente | Certificado digital + Smart Contract guardián |
| **Histórico de Actividades (5 años)** | Registros catastrales + imágenes satelitales retroactivas | Verificación temporal (Blockchain time-lock) | Merkle tree de eventos históricos |

#### Smart Contract: `DigitalTwinNFT.sol`

```
contract DigitalTwinNFT {
  struct FarmBaseline {
    uint256 tokenId;
    address owner;
    string geojsonHash;      // IPFS hash del polígono GeoJSON
    uint256 baselineCarbonTCO2e; // tCO2e inicial (línea de base)
    uint256 registrationDate;
    bool eudrCompliant;      // ¿Cumple EUDR (sin deforestación)?
    address[] validators;    // Nodos que validaron
  }
  
  mapping(uint256 => FarmBaseline) public farms;
  mapping(address => uint256[]) public farmerFarms;
  
  // Registro inmutable de cambios de estado
  event BaselineRegistered(uint256 indexed tokenId, address owner, uint256 baselineCO2);
  event EUDRValidated(uint256 indexed tokenId, bool compliant);
}
```

#### Oráculo de Validación EUDR

**Proceso:**
1. Captura satelital mensual con Sentinel-2 (resolución 10m)
2. Análisis de cambio de cobertura forestal usando índice NDVI y SAR
3. Comparación con baseline de 5 años atrás
4. Si **deforestación > 5%** → Marca como `eudrCompliant = false` → Bloquea emisión de créditos
5. Firma criptográfica de validador independiente (ej. Agreena, Verra)

---

### 1.2 MOMENTO 2: PROYECTO DE INVERSIÓN & TOKENIZACIÓN (Participación)

#### Objetivo
Capturar inversiones en especie y en efectivo para financiar el plan de reforestación (semillas, viveros, establecimiento, mantenimiento, MRV) mediante tokens de participación con dividendos derivados de dos flujos.

#### Presupuesto Integrado & Categorías

| **Categoría** | **Descripción** | **Inversión Indicativa (USD/ha)** | **Duración** | **Output Esperado** |
|---|---|---|---|---|
| **Semillas & Material Genético** | Certificación fitosanitaria, tracción genética de Pino Caribe + especies complementarias | $150 - $300 | Mes 0 | 800-1000 semillas/ha |
| **Establecimiento de Viveros** | Infraestructura (invernaderos), riego, sustrato | $2,000 - $5,000 | Mes 1-3 | Capacidad 500k plántulas/año |
| **Establecimiento del Cultivo** | Labores: replanteo, siembra, densidad 500-1000 árboles/ha | $800 - $1,500 | Mes 3-6 | >95% prendimiento |
| **Mantenimiento Anual (Años 1-5)** | Control de plagas, poda, limpieza | $400 - $800/año | Años 1-5 | Crecimiento DAP +3-5cm/año |
| **Monitoreo MRV** | Mediciones field (dendrometría), drones multiespectrales, satélite | $200 - $500/año | Años 1-30 | 12 reports/año verificados |
| **Sistemas de MRV (dMRV)** | Software + APIs integrados (Agreena, Sensat, etc.) | $5,000 - $15,000 (one-time) | Setup inicial | Dashboard real-time |
| **TOTAL PROYECTO** | 10 hectáreas a 30 años | **$50,000 - $120,000** | 30 años | 300-500 tCO2e/año |

#### Flujos de Dividendos (2 Fuentes)

**Flujo 1: Venta de Carbono (Créditos VCU)**
- Año 3-5: Primeros créditos (5 tCO2e/ha/año)
- Año 6-20: Máxima productividad (15-25 tCO2e/ha/año)
- Año 21-30: Estabilización (10-15 tCO2e/ha/año)
- **Precio Market:** $15-40/tCO2e (Voluntary Carbon Market)
- **Comisión NUWA:** 12-15% de ventas

**Flujo 2: Monetización CBAM (Green Premium)**
- Si comprador europeo importa café/cacao de finca con créditos verificados:
  - CBAM tarifa estándar: ~50-80 EUR/tCO2e (proyectado 2026)
  - Crédito verificado de baja huella: -30-40 EUR/tCO2e
  - **Diferencial capturado:** 20-40 EUR/tCO2e
  - Beneficiario: Tokenholders de NUWA reciben % del arbitraje

#### Tokenización: Tokens de Participación (TKN-PART)

**Características:**
- **1 Token = 1 USD invertido** (o 1 USD de valor en especie)
- **Rendimiento:** Dividendos anuales de ambos flujos
- **Vesting:** Lineales 4 años (25% anual)
- **Gobernanza:** Holders pueden votar cambios de cultivo, vendedor de créditos, distribución

**Smart Contract: `ParticipationToken.sol`**

```
contract ParticipationToken {
  struct Investment {
    address investor;
    uint256 amountUSD;
    uint256 tokensIssued;
    uint256 vestingStart;
    bool inKind; // ¿Aporte en especie?
    string speciesCommitment; // ej "500 plántulas Pino Caribe"
  }
  
  mapping(uint256 => Investment) public investments;
  mapping(address => uint256[]) public investorProjects;
  
  // Dividendo compuesto: VCU + CBAM
  function claimDividends(uint256 projectId) external {
    uint256 vcuShare = calculateVCUDividend(projectId, msg.sender);
    uint256 cbamShare = calculateCBAMDividend(projectId, msg.sender);
    uint256 totalPayout = vcuShare + cbamShare;
    
    USDC.transfer(msg.sender, totalPayout);
    emit DividendClaimed(projectId, msg.sender, totalPayout);
  }
}
```

---

### 1.3 MOMENTO 3: EMISIÓN VERIFICADA & TRADING (MRV + dMRV)

#### Objetivo
Generar créditos de carbono verificados mediante monitoreo continuo (satélite + drones + campo) y permitir su trading/retiro en mercados secundarios.

#### Ciclo MRV Integrado (12 meses)

```
┌─────────────────────────────────────────────────────────────┐
│                  CICLO MRV ANUAL                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  MES 1-3: CAPTURA DE DATOS (Estación seca)                 │
│  ├─ Vuelos drones multiespectrales: Mes 1, 2               │
│  │  → Índice NDVI, DHM (altura), biomasa aérea (AGB)      │
│  ├─ Mediciones en campo: 50 parcelas de 400m² (Mes 2)     │
│  │  → DAP (diámetro pecho altura), altura total, densidad │
│  └─ Imágenes satelitales: Sentinel-2/Planetscope (continuo)│
│                                                              │
│  MES 4: PROCESAMIENTO & CÁLCULO                            │
│  ├─ Fusión de datos multisensor                            │
│  ├─ Modelos ML: AGB → Carbono Aéreo (Equation Allometric) │
│  │  AGB (tDM/ha) = a * DBH^b [Chave et al., 2014]        │
│  └─ Cálculo tCO2e: AGB * Factor Expansión * 0.47 * 44/12 │
│                                                              │
│  MES 5-6: VALIDACIÓN INDEPENDIENTE                         │
│  ├─ Auditor tercero (Verra/SCS acreditado)                │
│  ├─ Verificación de additionality & permanence            │
│  └─ Firma digital en Smart Contract                        │
│                                                              │
│  MES 7-12: TRADING & RETIRO                                │
│  ├─ VCUs emitidas en blockchain (NFT)                      │
│  ├─ Available en DEX (Uniswap, Minswap en Cardano)        │
│  └─ Comprador retira = quema token = trazabilidad final   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Stack Tecnológico MRV

**1. Captura Satelital Automática**
- **Proveedor:** Sentinel-2 (ESA, resolución 10m, libre)
- **Frecuencia:** Cada 5 días
- **Índices:** NDVI, EVI, GNDVI, NDMI
- **API:** Copernicus Open Access Hub + Google Earth Engine

**2. Drones Multiespectrales**
- **Hardware:** DJI Matrice 300 RTK + Zenmuse H30T (RGB + multispectral + thermal)
- **Vuelos:** 2 x año (estación seca + lluviosa)
- **Procesamiento:** Software Pix4Dfields (ortomosaico + NDVI + DHM)
- **Output:** GeoTIFF + nube de puntos (almacenados en IPFS)

**3. Aplicación Móvil de Monitores de Campo**
- **Plataforma:** React Native (iOS + Android)
- **Funcionalidad:**
  - GPS-geotagged photos de parcelas
  - Medición DAP con cinta diamétrica (OCR)
  - Conteo de árboles por especie
  - Firma digital del monitor
- **Sincronización:** Carga a servidor central (offline-first)
- **Base de datos:** PostGIS (coordenadas) + PostgREST (API)

**4. Cálculo Algorítmico de Carbono (Smart Contract + Oracle)**

**Ecuación Maestra:**
```
tCO2e_acumulado = Σ(AGB_i * 0.47 * 44/12)

Donde:
├─ AGB = Biomasa Aérea (tDM/ha) calculada de DHM + NDVI
├─ 0.47 = Fracción carbono en madera seca
├─ 44/12 = Factor CO₂/C (masa molecular)
└─ Σ = Sumatoria por año de monitoreo

AGB_estimation = a * (DBH)^b
└─ DBH derivado de: altura canopi (LiDAR) + NDVI (relación alométrica entrenada)
```

**Smart Contract Oráculo Carbono:**
```solidity
contract CarbonVerificationOracle {
  struct MonitoringReport {
    uint256 projectId;
    uint256 yearMonitored;
    uint256 ndviAvg;
    uint256 dhmMax; // altura máxima LiDAR
    uint256 fieldMeasurements; // dendrometría
    uint256 agbCalculated; // tDM/ha
    uint256 tCO2eGenerated;
    address validator;
    bool verified;
  }
  
  mapping(uint256 => MonitoringReport[]) public reports;
  
  function mintVCU(uint256 projectId, uint256 reportYear) external onlyValidator {
    MonitoringReport memory report = reports[projectId][reportYear];
    require(report.verified, "Not validated");
    
    uint256 vCUAmount = report.tCO2eGenerated;
    // Mint NFT VCU con metadata inmutable
    CarbonCredit.mint(msg.sender, vCUAmount, report);
    
    // Registrar en Verra Registry (off-chain, pero verificado on-chain)
    emit VCUMinted(projectId, vCUAmount, report.tCO2eGenerated);
  }
}
```

**5. Trazabilidad & Evolución del Sistema**

Cada monitoreo genera un **registro evolutivo** inmutable:

| **Año** | **tCO2e Acumulado** | **Estado de Crédito** | **Blockchain Hash** | **Comprador** |
|---|---|---|---|---|
| 0 (Baseline) | 0 | Línea de base establecida | 0x7a2f... | N/A |
| 1 | 5 | Pending verification | 0x4c8d... | Awaiting |
| 2 | 12 | Verified + Emitted | 0x9e5b... | UniswapV3 Pool |
| 3 | 25 | Partial retired | 0x3f1a... | Empresa UE |
| 4 | 40 | Retired (burned) | 0x6d9c... | Corporativo |

---

## 2. ORÁCULO DE OPORTUNIDAD: INTEGRACIÓN DE PRECIOS & CBAM

### 2.1 Arquitectura del Oráculo Descentralizado

**3 Fuentes de Datos en Tiempo Real:**

```
┌─────────────────────────────────────────────────────────────────────┐
│            ORÁCULO DE OPORTUNIDAD DESCENTRALIZADO                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ PRECIO SPOT  │    │  PRECIO ETS  │    │ HUELLA C.   │          │
│  │  COMMODITY   │    │  EU CARBONO  │    │  DEL ACTIVO │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                   │                    │                  │
│  Fuente: ICE Futures │ Fuente: BloombergLP │ Fuente: Sensor   │
│  Café C: $/lb       │ ETS tCO2e: EUR/tCO2 │ Verificado on-   │
│  (Precios reales)   │ (EU ETS Auction)    │ chain (MRV data) │
│                     │                     │                  │
└────────────┬────────────────┬──────────────────┬────────────────┘
             │                │                  │
             └────────────┬───┴──────────────────┘
                          │
                   ┌──────▼──────┐
                   │  SMART      │
                   │  CONTRACT   │
                   │  AGREGADOR  │
                   └──────┬──────┘
                          │
            ┌─────────────┼─────────────┐
            │             │             │
       ┌────▼───┐   ┌────▼────┐  ┌────▼────┐
       │GREEN   │   │CALCULO  │  │ACTUALI- │
       │PREMIUM │   │ARBITRAJE│  │ZACION   │
       │(CBAM)  │   │ (DELTA) │  │DINÁMICA │
       └────────┘   └─────────┘  └─────────┘
```

### 2.2 Lógica del "Green Premium" + CBAM

#### Caso de Uso: Café Agroforestal Colombiano vs. Café Estándar

**Escenario:**

**Productor LATAM (Bajo Carbono):**
- Café + Pino Caribe: Huella = **1.2 tCO2e/saco 60kg**
- Proyecto verificado bajo Verra VM0015 (agroforestería)
- Créditos generados: **15 tCO2e/año** en 5 hectáreas

**Café Convencional (Alta Huella):**
- Monocultivo: Huella = **3.5 tCO2e/saco 60kg**

#### Cálculo del Precio del Token (con CBAM)

**Fórmula Principal:**

```
Precio_Token = Precio_Spot + (Ahorro_CBAM × Coeficiente_Arbitraje)

Donde:

Precio_Spot = Precio de mercado del café (ej. 2.50 USD/lb)
            = 150 USD/saco (60kg a 2.50 USD/lb)

Ahorro_CBAM = (Huella_Café_Estándar - Huella_Café_Bajo_C) × Tarifa_CBAM
            = (3.5 - 1.2) tCO2e × 50 EUR/tCO2e  [tarifa CBAM 2026]
            = 2.3 × 50 = 115 EUR por saco
            ≈ 125 USD/saco (conversión 1.08 EUR/USD)

Coeficiente_Arbitraje = 0.75  [75% del ahorro capturado por NUWA protocol]
                       (25% a farmer como incentivo)

Precio_Token = 150 USD + (125 USD × 0.75)
             = 150 + 93.75
             = 243.75 USD/saco tokenizado

PREMIUM VERDE = 93.75 USD (62% sobre precio spot)
```

#### Actualización Dinámica del Oráculo

**Cada hora** (durante horario de mercados):

1. **Fetch de Precios:**
   ```javascript
   // Fuente 1: Precio Spot
   const coffeePrice = await fetchFromICE('KC', 'prompt'); // $/lb
   
   // Fuente 2: Precio ETS (EU ETS Auction o ETF)
   const etsPrice = await fetchFromBloomberg('CBKX:EU'); // EUR/tCO2e
   
   // Fuente 3: Huella verificada (on-chain MRV)
   const carbonFootprint = await farmBaseline.getLatestFootprint();
   ```

2. **Cálculo Compuesto:**
   ```solidity
   uint256 greenPremium = (standardFootprint - lowCarbonFootprint) 
                          * etsPrice 
                          * arbitrageCoefficient;
   
   uint256 tokenPrice = spotPrice + greenPremium;
   ```

3. **Publicación en DEX:**
   - AMM (Automated Market Maker) actualiza liquidez en Uniswap Cardano
   - Slippage: ±2% por orden

---

## 3. VALIDACIÓN HÍBRIDA EUDR + BLOCKCHAIN

### 3.1 Arquitectura de Validación EUDR

**Requisito:** Sin deforestación en últimos 5 años del predio

**Proceso Multi-Fuente:**

| **Fase** | **Tecnología** | **Indicador** | **Umbral Pass** |
|---|---|---|---|
| **1. Imagen Satelital (Baseline)** | Sentinel-2 SAR (2019-2024) | Cambio cobertura forestal (%) | <5% pérdida anual |
| **2. Análisis NDVI Temporal** | Google Earth Engine | Evolución vegetación (NDVI trend) | NDVI stable o creciente |
| **3. Validación en Campo** | Dron RGB + Ground truth | Visual inspection + GPS points | 0 áreas deforestadas |
| **4. Firma Criptográfica** | Secp256k1 + Blockchain | Validador acreditado (Agreena/Verra) | Multi-sig 2-of-3 |

**Smart Contract Validador EUDR:**

```solidity
contract EUDRValidator {
  struct ValidationProof {
    uint256 projectId;
    bytes32 satelliteDataHash;      // Hash Merkle de imágenes
    uint256 deforestationPercent;
    address validator;
    bytes validatorSignature;
    uint256 timestamp;
    bool approved;
  }
  
  mapping(uint256 => ValidationProof[]) public validations;
  
  function validateEUDR(
    uint256 projectId,
    bytes32 dataHash,
    uint256 deforestPercent,
    bytes memory signature
  ) external onlyAccreditedValidator {
    require(deforestPercent < 5, "Exceeds EUDR threshold");
    require(verifySignature(dataHash, signature), "Invalid signature");
    
    validations[projectId].push(ValidationProof({
      projectId: projectId,
      satelliteDataHash: dataHash,
      deforestationPercent: deforestPercent,
      validator: msg.sender,
      validatorSignature: signature,
      timestamp: block.timestamp,
      approved: true
    }));
    
    emit EUDRApproved(projectId, deforestPercent);
  }
}
```

---

## 4. TRÍADA DE TOKENS

### 4.1 NFTs: Pasaporte de Producto + Certificado Carbono

**Estructura:**
```json
{
  "name": "Digital Twin Farm #5847 - Finca Santa Rita",
  "description": "Agroforestry baseline + carbon pathway",
  "attributes": [
    {
      "trait_type": "Farm ID",
      "value": "FSR-5847-COL"
    },
    {
      "trait_type": "Baseline CO2 (tCO2e)",
      "value": "0"
    },
    {
      "trait_type": "Target CO2 (Year 10)",
      "value": "150"
    },
    {
      "trait_type": "EUDR Compliant",
      "value": true
    },
    {
      "trait_type": "Location",
      "value": "Huila, Colombia"
    }
  ],
  "image": "ipfs://QmX...",
  "animation_url": "ipfs://QmY... [3D digital twin]"
}
```

**Propósito:** Cada NFT = derecho a reclamar VCUs generados + historial inmutable

### 4.2 Tokens de Participación (NUWA-PART): Rendimiento Compuesto

**Características:**
- **Total Supply:** Variable (1 token = 1 USD invertido)
- **Dividendos Anuales:** 
  - VCU Share: % de ventas de créditos de carbono
  - CBAM Share: % del arbitraje fiscal europeo
- **Vesting:** 4 años lineales post-cierre
- **Gobernanza:** DAO voting sobre decisiones estratégicas

**Ejemplo de Pago Anual (Proyecto de 10ha, Año 5):**

```
Participación: 100,000 tokens (de inversión de $100,000)

Dividendo Anual Año 5:

VCU Dividend:
  - VCUs generados: 120 tCO2e × $25/tCO2e = $3,000
  - Comisión NUWA: 12% = $360
  - Neto a invertores: $2,640
  - Share del token holder: ($2,640 × 100,000/500,000) = $528

CBAM Dividend:
  - Venta café premium a buyer UE: 600 sacos
  - Ahorro CBAM por saco: $125
  - Total CBAM capturado: $75,000
  - Comisión NUWA: 15% = $11,250
  - Neto a invertores: $63,750
  - Share del token holder: ($63,750 × 100,000/500,000) = $12,750

TOTAL PAYOUT AÑO 5: $528 + $12,750 = $13,278 (13.3% ROI anual)
```

### 4.3 Tokens de Utilidad (NUWA-GOV): Gobernanza del Oráculo

**Propósito:** Incentivizar nodos validadores que alimentan precios

**Mecanismo de Stake:**
- Nodo valida datos satelitales + MRV → Recibe fee
- Fee = 0.01% de volumen transado en pool del proyecto
- Stake mínimo: 10,000 NUWA-GOV
- Slashing: -10% del stake si datos rechazados por validador independiente

---

## 5. ESCENARIOS DE ARBITRAJE: CASOS PRÁCTICOS

### Caso 1: Ganadería Regenerativa en Pastizal Argentino

**Condiciones Iniciales:**

| **Parámetro** | **Ganadería Conv.** | **Ganadería Regenerativa** |
|---|---|---|
| **Huella C (tCO2e/kg carne)** | 18 | 8 |
| **Áreas silvopastoriles (%)** | 0% | 40% (Eucalyptus + Acacia) |
| **SOC (Soil Organic Carbon)** | 2.5% | 4.2% |

**Procesamiento en Oráculo:**

```
Step 1: Captura de datos
├─ Sentinel-2: Cobertura vegetal silvopastoril
├─ Drone: Mapeo de árboles dispersos (500/ha → densidad AGB)
├─ MRV: Medición SOC en 10 puntos (soil sampling)
└─ Baseline: tCO2e removals por año = 12 tCO2e/ha

Step 2: Cálculo Green Premium
├─ Café/Carne estándar Argentina: 16 tCO2e/kg
├─ Carne regenerativa: 6 tCO2e/kg
├─ Diferencial: 10 tCO2e
├─ Tarifa CBAM (proyectada): 50 EUR/tCO2e
├─ Ahorro CBAM/kg: 10 × 50 EUR = 500 EUR/kg ≈ $540/kg
└─ Precio token = $8/kg + ($540 × 0.75) = $413/kg

Step 3: Tokenización
├─ Inversor apunta: $50,000
├─ Recibe: 121 tokens NUWA-PART (50k / 413 × kg por año)
├─ Vesting: 25% anual / 4 años
└─ Dividendos esperados: 18% anual (VCU + CBAM)

Step 4: Monitoreo Año 1
├─ Validación campo: 12 tCO2e verificadas
├─ Emisión VCU: 12 NFTs (tCO2e units)
├─ Precio market: $22/tCO2e
├─ Venta: $264 total
├─ % a investor: ($264 × 121/500k) = $0.064 (VCU share)
└─ CBAM share (anticipado): $15/kg × 100kg = $1,500 / 500k = $0.36/token

TOTAL DIVIDEND AÑO 1 POR TOKEN: $0.40 (4% yield, ramp-up)
```

### Caso 2: Aceite de Palma Sostenible (Alto Carbono → Bajo Carbono)

**Transformación Productiva:**

```
ANTES (Baseline):
├─ Palma monocultivo: 8 tCO2e/tonelada aceite
├─ Deforestación histórica: 30% de la parcela
├─ EUDR: RECHAZADO (no elegible)
└─ No hay créditos de carbono disponibles

DESPUÉS (Post-reforestación con diversificación):
├─ Palma + sistemas agroforestales (Guamo, Carbonero)
├─ Reforestación de 30% área: 800 árboles/ha
├─ Huella final: 3 tCO2e/tonelada aceite
├─ Captura anual: 120 tCO2e/10ha
├─ EUDR: APROBADO (sin deforestación adicional 5 años)
├─ Créditos generados: 120 tCO2e × $30/unit = $3,600 anual
└─ CBAM premium: $15 EUR/tCO2e × 120 = 1,800 EUR ≈ $1,944/año
```

**Inversión Requerida:**
- Semillas + vivero: $8,000
- Labores reforestación: $12,000
- MRV 5 años: $15,000
- **Total: $35,000 / 10ha = $3,500/ha**

**Tokenización:**
- 35,000 NUWA-PART emitidos
- Dividendo esperado Año 5-30: 8-10% anual
- Payback: 5-7 años

---

## 6. INTEGRACIONES BLOCKCHAIN & PLATAFORMAS

### 6.1 Stack Blockchain Recomendado

| **Componente** | **Proveedor** | **Rationale** |
|---|---|---|
| **Layer 1 Principal** | **Cardano** | Baja comisiones (0.17 ADA ≈ $0.04), Plutus smart contracts, HYDRA scaling |
| **Custody Institucional** | **Fireblocks** | MPC wallets, policy enforcement, compliance framework, integración directa |
| **Oracle de Precios** | **Pyth Network** + **Chainlink** | Precios latencia-baja (Pyth: 400ms), múltiples fuentes agregadas |
| **Almacenamiento Datos** | **IPFS + Arweave** | Inmutabilidad de imágenes satelitales, verifiabilidad a largo plazo |
| **DEX/Trading** | **Minswap (Cardano)** | Liquidez nativa Cardano, incentivos yield farming, AMM |

### 6.2 Integraciones Plataformas Similares

#### Alternativa 1: Toucan Protocol (Ethereum/Polygon)

**Fortalezas:**
- Base Carbon Tonnes (BCT) + Nature Carbon Tonnes (NCT) trading
- Bridging con Verra registry
- Liquidez en Uniswap $2B+

**Limitaciones para NUWA:**
- Comisiones Ethereum altas ($50-300 por tx)
- Legacy approach a CBAM (no integrado)
- Toucan enfocado en retiro pasivo, no en participación activa

**Aplicabilidad:** Secundaria (cross-chain bridge para salidas a liquidity pools grandes)

#### Alternativa 2: Regen Network (Cosmos)

**Fortalezas:**
- Diseñado nativamente para RWA agroforestales
- SDK de módulos de carbono verificado
- IBC (Inter-Blockchain Communication) para multi-chain

**Limitaciones:**
- Menor liquidez que Cardano (TVL $20M)
- Comunidad más pequeña de validators

**Aplicabilidad:** Potencial co-chain (testnet pilot)

#### Alternativa 3: GreenDAO (Cardano - Proyecto Catalyst)

**Fortalezas:**
- Nativo Cardano (misma L1 que NUWA)
- DAO governance + APIs públicas
- Project Catalyst financiado

**Limitaciones:**
- MVP aún en construcción
- Foco en retiro, no en generación primaria

**Aplicabilidad:** Integración eventual (cuando mature)

---

## 7. ANÁLISIS COMPETITIVO: TOP PLATAFORMAS 2026

| **Plataforma** | **Especialidad** | **TVL** | **Ventaja** | **Brecha vs NUWA** |
|---|---|---|---|---|
| **Toucan** | Tokenización carbon (any) | $50M | Liquidez, bridging Verra | Sin CBAM, sin MRV nativo |
| **Agreena** | dMRV agrícola + trading | $30M | Mejor tech MRV (satelital) | Sin blockchain nativa, SaaS traditional |
| **Verra** | Registry + estándar | $5B (VCM) | Autoridad global | Centralizado, web2 |
| **Sylvera** | Rating independiente | N/A (ratings) | Análisis riguroso | No genera créditos, rating agency |
| **Nori** | Removal credits marketplace | $15M | UX buena, focus remociones | Ethereum (comisiones), limited ag |
| **Regen Network** | RWA cosmico | $20M | IBC, modular | Baja liquidez vs Cardano |

**Posicionamiento de NUWA:**
> NUWA es el **único protocolo que integra nativamente MRV + Oráculos CBAM + Tokenización de Participación en Cardano**, capturando el valor fiscal europeo además del premium de carbono.

---

## 8. TOP 3 MVP: REQUISITOS CRÍTICOS

### 8.1 Feature 1: Gemelo Digital NFT + EUDR Validator

**Por qué es crítico:**
- Baseline es el *requisito de entrada* a todo el sistema
- Sin NFT baseline, no hay validación de elegibilidad
- Market requiere prueba on-chain de compliance EUDR
- **Time-to-value:** 4 semanas (usuarios ven resultado tangible)

**Requerimientos Técnicos:**

1. **API de Ingesta Satelital**
   - Integración Google Earth Engine (Sentinel-2 NDVI análisis)
   - Carga de polígono GeoJSON (upload manual o WMS)
   - Cálculo automático deforestación últimos 5 años
   - Almacenamiento en IPFS (contenido direccionado)

2. **Smart Contract DigitalTwinNFT**
   - Minting de NFT con metadata inmutable
   - Validación multi-sig EUDR (2 de 3 validators)
   - Registro de timestamps y validadores
   - Merkle tree histórico de cambios

3. **Dashboard Frontend**
   - Wallet connect (Eternl, Nami en Cardano)
   - Visualización de polígono + NDVI heatmap
   - Status indicator: "EUDR Pending" → "Approved" → "Active"
   - Export de certificado PDF (notarizado on-chain)

**Output Esperado:**
- 500 predios digitalizados en MVP
- 95% accuracy en detección deforestación (vs. imagery manual)

---

### 8.2 Feature 2: Oráculo de Precios + Green Premium Calculator

**Por qué es crítico:**
- Core value prop de NUWA (CBAM monetization)
- Sin oráculo dinámico, token price es estático → no hay arbitraje
- Inversores requieren dashboard de ROI real-time
- **Time-to-value:** 2 semanas (integración APIs)

**Requerimientos Técnicos:**

1. **Oracle Smart Contract**
   - Pyth integration (precio café C, cacao, etc.)
   - Bloomberg terminal data fetch (ETS pricing)
   - On-chain huella de carbono (MRV data layer)
   - Cálculo CBAM: (STD_footprint - LOW_footprint) × ETS_price

2. **Backend Aggregator**
   - Node.js + TypeScript
   - CronJob actualizaciones hourly (durante mercados)
   - Fallback a oracle pools si una fuente falla
   - Almacenamiento histórico en TimescaleDB

3. **Frontend Calculator**
   - Input: Commodity type, hectáreas, proyecto ID
   - Output: "Green Premium: $X/unit | ROI: Y% | CBAM Savings: $Z"
   - Gráfico evolución precio (6 meses histórico)
   - Risk indicator: volatilidad ETS + commodity

**Output Esperado:**
- Price updates cada 60 minutos
- 99.5% uptime
- Diferencial CBAM visible en real-time

---

### 8.3 Feature 3: Token Issuance + Dividend Distribution Smart Contract

**Por qué es crítico:**
- Cierre del círculo: Investor recibe tokens → Farmer siembra → Carbono se genera → Dividendos pagados
- Sin este flujo, el modelo no es "SaaS de negocio", es solo plataforma
- Inversores en Serie A requieren proof of concept: "¿Los primeros inversores fueron pagados?"
- **Time-to-value:** 6 semanas (orquestación de múltiples contratos)

**Requerimientos Técnicos:**

1. **Smart Contract: ParticipationTokenV1**
   - ERC-20 equivalente en Cardano (PlutusV2)
   - Función `investProject()`: investor → USDC ingreso → tokens outbound
   - Vesting schedule (4 años lineales)
   - Multi-sig treasury para aportes en especie

2. **Dividend Calculation Engine**
   - Input: VCU sales data + CBAM arbitrage data
   - Cálculo proporcional: (investor_tokens / total_tokens) × profits
   - Distribuición mensual (datos de MRV confirman créditos emitidos)
   - Stablecoin payouts (USDC en Cardano)

3. **Governance DAO Lite**
   - Proposal submission: cambio de vendedor de créditos, estrategia de precio
   - Voting: 1 token = 1 voto
   - Timelock: 48h execution delay

**Output Esperado:**
- 5,000 inversores en 10 proyectos
- 50+ distribuciones mensuales exitosas
- 0 fallos en cálculo de dividendos

---

## 9. ROADMAP EJECUCIÓN: 5 DÍAS

### Semana 1 (Día 1-2): Planificación + Construcción Arq. Base

**Día 1: Lunes 10 AM - 6 PM**

| **Hora** | **Actividad** | **Dueño** | **Output** |
|---|---|---|---|
| 10-11 AM | Kickoff: Alineación equipo + stack tech | Tech Lead | Documento decisión (Cardano, Pyth, IPFS) |
| 11 AM - 1 PM | Setup repositorio + CI/CD (GitHub Actions) | DevOps | Repo con workflow tests/deploy |
| 1-2 PM | Diseño ER (Entity Relationship) blockchain | Architect | Diagram entidades (Farm, Investment, VCU) |
| 2-5 PM | Scaffolding frontend (Next.js + Tailwind) | Frontend | Wireframes 5 pantallas |
| 5-6 PM | Setup Cardano testnet environment | Blockchain Dev | Testnet wallet + faucet setup |

**Día 2: Martes 9 AM - 6 PM**

| **Hora** | **Actividad** | **Dueño** | **Output** |
|---|---|---|---|
| 9-12 PM | Desarrollo Smart Contract DigitalTwinNFT.plu | Plutus Dev | Contract compilado, tests pasando |
| 12-1 PM | API design: Ingesta satelital (spec OpenAPI) | Backend | Swagger docs 3 endpoints |
| 1-3 PM | Integración Google Earth Engine (Python) | Data Scientist | Prueba NDVI calculo, datos Testnet |
| 3-6 PM | Component library (Tailwind + Storybook) | Frontend | 12 botones, inputs, cards reusables |

**Entregables:**
- [ ] Stack tech documentado
- [ ] Repos estructurados (smart-contracts/, backend/, frontend/)
- [ ] CI/CD pipeline ejecutando tests
- [ ] Primeros componentes UI funcionales

---

### Semana 1 (Día 3): Integración Oráculo de Precios

**Día 3: Miércoles 9 AM - 6 PM**

| **Hora** | **Actividad** | **Dueño** | **Output** |
|---|---|---|---|
| 9-11 AM | Integración Pyth Network API (pricing) | Oracle Engineer | Fetch precios café, cacao, carbono |
| 11 AM - 12 PM | Smart Contract CarbonVerificationOracle | Plutus Dev | Funciones para calcular Green Premium |
| 12-2 PM | Backend aggregator (Node.js + BullMQ cron) | Backend | Service actualiza precios hourly |
| 2-4 PM | Frontend calculator (React component) | Frontend | Input farm + output premium dinámico |
| 4-6 PM | Testing + debugging de precios en vivo | QA | 50 test cases, regression |

**Entregables:**
- [ ] Oracle prices en testnet, actualizado
- [ ] Calculator mostrando Green Premium en tiempo real
- [ ] 95%+ test coverage de lógica pricing

---

### Semana 1 (Día 4-5): Tokenización + Distribución

**Día 4: Jueves 9 AM - 6 PM**

| **Hora** | **Actividad** | **Dueño** | **Output** |
|---|---|---|---|
| 9-12 PM | Smart Contract ParticipationToken (mint/burn) | Plutus Dev | Token ERC-20 equivalent, compilado |
| 12-2 PM | Vesting logic + governance DAO lite | Blockchain Dev | Vesting scheduler, proposal voting |
| 2-4 PM | Backend para inyección USDC → minting | Backend | API /invest endpoint, validaciones |
| 4-6 PM | Dashboard inversores (portafolio) | Frontend | Tabla de tokens, dividendos pendientes |

**Entregables:**
- [ ] Token contrato deplorado en testnet
- [ ] Primeros 3 inversores minted tokens
- [ ] DAO voting interface funcional

**Día 5: Viernes 9 AM - 4 PM**

| **Hora** | **Actividad** | **Dueño** | **Output** |
|---|---|---|---|
| 9-12 PM | Integración Fireblocks (custody setup) | Blockchain Ops | Testnet wallets en Fireblocks, policies |
| 12-1 PM | E2E testing (usuario crea proyecto + invierte) | QA | Checklist sign-off |
| 1-3 PM | Documentación técnica (README, API docs) | Tech Writer | Wiki en GitHub |
| 3-4 PM | Demo + Q&A con stakeholders | Tech Lead | Presentación vivo 15 min |

**Entregables:**
- [ ] Sistema end-to-end funcional (Momento 1-3)
- [ ] 5 test projects en Cardano testnet
- [ ] Demo video grabado (5 min)
- [ ] Documentación completa

---

### Timeline Visual

```
┌─────────────────────────────────────────────────────────────┐
│           5-DAY MVP DEVELOPMENT SPRINT                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  MON  │ TUE  │ WED   │ THU  │ FRI                           │
│ ────┼────┼───┼────┼────                                    │
│       │      │ ORÁCULO  │      │    CLOSING               │
│ SETUP │CORE │PRECIOS  │TOKEN│      │
│       │      │ + CALC   │ + DIST │                         │
│       │      │          │      │    MVP                  │
│       │      │          │      │    LIVE                 │
│                                                              │
│  PHASE 1    │  PHASE 2  │ PHASE 3  │ PHASE 4              │
│ Foundation  │ Valuation │ Financing│ Demo                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Day 1-2: 30h → Foundation (repos, contracts, UI scaffolds)
Day 3: 9h → Oracle integration (pricing, calculation)
Day 4-5: 13h → Tokenization + finalization (minting, governance, e2e)

Total: ~52h developer time
Team size: 8-10 personas (2x Plutus, 3x Backend, 2x Frontend, 1x DevOps, 1x Data, 1x QA)
```

---

## 10. ARCHITECTURE DIAGRAM: FLUJO DE DATOS

```
┌──────────────────────────────────────────────────────────────────┐
│                    USUARIO FINAL (Farmer/Investor)              │
└──────────┬───────────────────────────────────────────────────────┘
           │
           │ 1. Upload Finca (GeoJSON)
           ↓
┌──────────────────────────────────┐
│  FRONTEND (Next.js + React)      │
│  - Wallet Connect                │
│  - Map viewer                    │
│  - Investment form               │
│  - Dashboard                     │
└──────────┬──────────────────────┘
           │
           │ 2. API calls (REST)
           ↓
┌──────────────────────────────────────────────────────────────┐
│           BACKEND (Node.js)                                  │
│  ├─ Express server                                           │
│  ├─ Cardano blockchain interactions                          │
│  └─ Data aggregation                                         │
└──────┬────────────────┬──────────────────┬──────────────────┘
       │                │                  │
       │ 3a. GEE API    │ 3b. Pyth API    │ 3c. Firebase
       ↓                ↓                  ↓
┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐
│ GOOGLE EARTH    │ │ ORACLE PRICES   │ │ DATABASE     │
│ ENGINE          │ │                 │ │              │
│ - NDVI calc     │ │ - Commodity     │ │ - Projects   │
│ - Deforest %    │ │ - ETS carbon    │ │ - Users      │
│ - Baseline C    │ │ - Feed prices   │ │ - Tx History │
└─────────────────┘ └─────────────────┘ └──────────────┘
       │                │                  │
       └────────────────┴──────────────────┘
                        │
                        │ 4. Write to IPFS
                        ↓
                  ┌──────────────┐
                  │ IPFS/Arweave │
                  │              │
                  │ - Imagery    │
                  │ - Metadata   │
                  │ - Reports    │
                  └──────────────┘
                        │
                        │ 5. Hash on-chain
                        ↓
      ┌─────────────────────────────────┐
      │   CARDANO BLOCKCHAIN            │
      ├─────────────────────────────────┤
      │                                 │
      │  ┌──────────────────────────┐   │
      │  │ SmartContracts (Plutus)  │   │
      │  │                          │   │
      │  ├─ DigitalTwinNFT         │   │
      │  │  (Baseline + EUDR val)  │   │
      │  │                          │   │
      │  ├─ CarbonOracle           │   │
      │  │  (Price aggregation)    │   │
      │  │                          │   │
      │  ├─ ParticipationToken     │   │
      │  │  (Minting + dividends)  │   │
      │  │                          │   │
      │  └──────────────────────────┘   │
      │                                 │
      │  ┌──────────────────────────┐   │
      │  │ State Management         │   │
      │  │ - Farm registry          │   │
      │  │ - Token balances         │   │
      │  │ - Investment ledger      │   │
      │  └──────────────────────────┘   │
      │                                 │
      └─────────────────────────────────┘
            │         │         │
            │         │         │
      ┌─────┴──┐  ┌───┴────┐ ┌─┴──────────┐
      │Fireblocks│ │DEX     │ │MRV Validator
      │Custody   │ │Minswap │ │(Agreena)
      │          │ │Trading │ │
      └──────────┘ └────────┘ └────────────┘
```

---

## 11. MÉTRICAS DE ÉXITO MVP (KPIs Semana 1)

| **KPI** | **Target** | **Medida** |
|---|---|---|
| **Velocidad Deploy** | <60 min | Desde git push a mainnet |
| **Accuracy NDVI** | >95% | vs. manual imagery validation |
| **Oracle Uptime** | 99.5% | Price updates / fallos |
| **Token Mint Success** | 100% | Transacciones completadas |
| **E2E Latencia** | <3s | User action to blockchain confirmation |
| **Test Coverage** | >85% | Smart contracts + backend |
| **Security Audit** | Pass | Análisis básico de contratos |

---

## 12. STACK TECNOLÓGICO DETALLADO

### Backend
```
├─ Language: TypeScript
├─ Runtime: Node.js 22 LTS
├─ Framework: Express.js + tRPC (type-safe APIs)
├─ Database: PostgreSQL + PostGIS (spatial queries)
├─ TimeSeries DB: TimescaleDB (pricing history)
├─ Queuing: BullMQ (cron jobs, async tasks)
├─ Auth: NextAuth.js (Web3 integration)
└─ Monitoring: Sentry + DataDog
```

### Blockchain
```
├─ Layer 1: Cardano (mainnet post-MVP)
├─ Smart Contracts: Plutus V2 + Haskell
├─ Wallet SDK: Cardano-js/Mesh
├─ Custody: Fireblocks API integration
├─ Oracle: Pyth Network + custom oracle pool
└─ DEX Integration: Minswap SDK
```

### Frontend
```
├─ Framework: Next.js 15 (React 19)
├─ Styling: Tailwind CSS + Radix UI
├─ State: TanStack Query + Zustand
├─ Maps: Mapbox GL + Leaflet
├─ Charts: Recharts + D3.js
├─ Wallet: ConnectKit (Cardano)
└─ Deployment: Vercel (serverless)
```

### Data & ML
```
├─ Satellite: Google Earth Engine (Python)
├─ Remote Sensing: Rasterio + GDAL
├─ ML Inference: TensorFlow Lite (on-device)
├─ GIS: PostGIS queries + QGIS
└─ AGB Modeling: Scikit-learn random forest
```

---

## 13. PRESUPUESTO ESTIMADO MVP (5 días)

| **Categoría** | **Descripción** | **Costo USD** | **% Total** |
|---|---|---|---|
| **Recursos Humanos** | 8 personas × 5 días × $250/día | $10,000 | 45% |
| **Infraestructura Cloud** | Cardano testnet, GEE, Firebase, APIs | $2,000 | 9% |
| **Herramientas & Licencias** | GitHub Pro, Jetbrains, Mapbox, data feeds | $1,500 | 7% |
| **Servicios Externos** | Auditoría seguridad básica, notarización | $3,000 | 14% |
| **Contingency (15%)** | Buffer para overruns | $3,500 | 16% |
| **Marketing/Demo** | Video, presentación, sitio landing | $2,000 | 9% |
| **TOTAL MVP** | **5-day sprint** | **$22,000** | **100%** |

**ROI Esperado (18 meses post-MVP):**
- 100 proyectos activos × $50k AUM = $5M AUM
- Fee SaaS: 12-15% = $600-750k/año
- Payback del MVP: <2 meses

---

## 14. RIESGOS TÉCNICOS & MITIGACIÓN

| **Riesgo** | **Impacto** | **Probabilidad** | **Mitigación** |
|---|---|---|---|
| **Latencia Cardano (tx confirmación >5min)** | Demo mogolla | Media | Usar testnet + pre-fund wallets |
| **Fallo integración Pyth (datos unavailable)** | Oracle breaks | Baja | Fallback a Bloomberg + Nori APIs |
| **Satellite cloud cover (NDVI invaluable)** | Validation delay | Media | Multi-temporal composites + SAR radar |
| **Slashing en Stake (Fireblocks policy error)** | Fondos congelados | Baja | Multi-sig + testing exhaustivo |
| **Bugs en Plutus (contract exploit)** | Pérdida fondos | Media | Auditoría Oak Security (2k USD) |

---

## 15. PLAN POST-MVP (MESES 2-6)

```
Mes 2:
├─ Mainnet deployment (Cardano)
├─ Integración Fireblocks production
├─ Auditoría completa de smart contracts
└─ Beta con 3 productores piloto

Mes 3-4:
├─ Verra integration (bridging créditos)
├─ Integración CBAM oracle europeo (real-time)
├─ DAO governance fully operational
└─ 20 proyectos en operación

Mes 5-6:
├─ Cross-chain bridge (Ethereum/Polygon liquidity)
├─ Mobile app (Flutter)
├─ API pública para integraciones DeFi
└─ Serie A: $2-5M funding target
```

---

## 16. CONCLUSIONES ESTRATÉGICAS

### Por qué NUWA gana vs. competencia:

1. **Única plataforma con Oráculo CBAM nativo** → Captura fiscal europea (25-40% premium adicional)

2. **MRV integrado (no terceros)** → Control total de datos + reducción costos 70%

3. **Cardano nativa** → Comisiones 100x menores que Ethereum + HYDRA scaling

4. **Tokenización de Participación (no solo retiro)** → Inversores reciben dividendos compuestos

5. **EUDR built-in desde día 1** → Cumplimiento normativo = barrera de entrada

### Potencial de Mercado:

- **TAM:** 500M hectáreas agroforestales globales × $1k/ha = $500B
- **SAM (LATAM + UE):** 50M hectáreas = $50B
- **SOM MVP (18 meses):** 50k hectáreas = $50M AUM
- **Comisión 12%:** $6M revenue anual

---

## APÉNDICES

### A. Referencias Normativas

- **EUDR:** EU Deforestation Regulation (2023/1115)
- **CBAM:** Carbon Border Adjustment Mechanism (EU 2023, implementación 2026)
- **Verra VM0042:** Improved Agricultural Land Management (v2.2, Oct 2025)
- **Gold Standard:** GS4.0 para Nature-based Solutions
- **ICVCM:** Core Carbon Principles (CCPs) for integrity

### B. Glosario Técnico

| **Término** | **Definición** |
|---|---|
| **AGB** | Aboveground Biomass (toneladas/hectárea) |
| **DAP** | Diameter at Breast Height (dendrometría) |
| **NDVI** | Normalized Difference Vegetation Index |
| **dMRV** | Digital MRV (monitoreo satelital automático) |
| **CBAM** | Mecanismo de Ajuste en Frontera por Carbono |
| **VCU** | Verified Carbon Unit (1 tCO2e) |
| **ETS** | EU Emissions Trading System |
| **EUDR** | EU Deforestation Regulation |
| **RWA** | Real World Asset |

### C. Contactos Clave (Integraciones)

- **Pyth Network:** https://pyth.network/
- **Toucan Protocol:** https://toucan.earth/
- **Verra Registry:** https://registry.verra.org/
- **Google Earth Engine:** https://earthengine.google.com/
- **Fireblocks:** https://www.fireblocks.com/
- **Cardano Ecosystem:** https://cardano.org/

---

**Documento Preparado por:** Director Científico, NUWA | NEPTURA  
**Fecha:** Enero 2026  
**Versión:** 1.0 - CONFIDENCIAL  
**Distribuir a:** Inversores VC, Equipo técnico, Stakeholders agroforestales