# NUWA Digital Twin - Resumen de Progreso

## Descripcion del Proyecto
NUWA es una plataforma de gemelos digitales para fincas agroforestales que permite:
- Analisis de vegetacion mediante NDVI (Google Earth Engine)
- Validacion de cumplimiento EUDR (deforestacion)
- Calculo de linea base de carbono (metodologia Verra VM0042)
- Tokenizacion de activos ambientales en blockchain Cardano

---

## Tareas Completadas

### Task 01: Estructura del Proyecto
- [x] Estructura de carpetas creada
- [x] Configuracion de TypeScript
- [x] Package.json con dependencias

### Task 02: Servicio NDVI
- [x] Endpoint `/api/v1/farms/calculate-ndvi`
- [x] Integracion con Google Earth Engine
- [x] Calculo de estadisticas (mean, median, std, min, max)
- [x] Generacion de imagenes NDVI

### Task 03: Servicio de Deforestacion (EUDR)
- [x] Endpoint `/api/v1/farms/analyze-deforestation`
- [x] Analisis historico desde 2020
- [x] Deteccion de cambio de cobertura forestal
- [x] Validacion de umbral EUDR (< 5%)

### Task 04: Linea Base de Carbono
- [x] Endpoint `/api/v1/farms/calculate-baseline`
- [x] Tres metodos de calculo:
  - `satellite`: Estimacion por NDVI
  - `field`: Inventario de arboles (Chave et al. 2014)
  - `hybrid`: Combinacion de ambos
- [x] Metodologia Verra VM0042

### Task 05: Script de Analisis Local
- [x] `scripts/local-analysis/analyze_farm.py`
- [x] Analisis completo offline de fincas
- [x] Soporte para multiples formatos GeoJSON
- [x] Manejo de coordenadas 3D y MultiPolygon

### Task 07: Almacenamiento IPFS
- [x] `scripts/ipfs/upload_to_ipfs.py`
- [x] `scripts/ipfs/verify_ipfs.py`
- [x] Integracion con Pinata
- [x] Generacion de metadata CIP-25 para NFT Cardano

### Task 08/10: Frontend SaaS
- [x] Next.js 14 con TypeScript
- [x] Tailwind CSS para estilos
- [x] Mapbox GL para visualizacion de mapas
- [x] Componentes de analisis (NDVI, EUDR, Carbon)
- [x] Carga de archivos GeoJSON (drag & drop)
- [x] Integracion con API backend

---

## Arquitectura Actual

```
nuwa-digital-twin/
├── backend/
│   ├── server.ts              # Servidor Express
│   ├── routes/
│   │   └── farms.ts           # Rutas de API
│   ├── services/
│   │   ├── ndvi.service.ts    # Servicio NDVI
│   │   ├── deforestation.service.ts  # Servicio EUDR
│   │   └── carbon.service.ts  # Servicio Carbon
│   └── .env                   # Variables de entorno
│
├── frontend/
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx           # Landing page
│   │   ├── dashboard/         # Dashboard
│   │   └── farm/new/          # Nueva finca
│   ├── components/
│   │   ├── map/               # MapViewer, PolygonUploader
│   │   ├── analysis/          # NDVI, EUDR, Carbon
│   │   └── ui/                # Button, etc.
│   └── lib/
│       └── api.ts             # Cliente API
│
├── scripts/
│   ├── local-analysis/        # Analisis offline
│   └── ipfs/                  # Subida a IPFS
│
├── data/
│   └── farms/                 # GeoJSON de fincas
│       └── output/            # Resultados de analisis
│
└── docs/                      # Documentacion
```

---

## Endpoints de API

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/farms/calculate-ndvi` | Calcula NDVI |
| POST | `/api/v1/farms/analyze-deforestation` | Analiza deforestacion |
| POST | `/api/v1/farms/calculate-baseline` | Calcula carbono |

---

## Configuracion Requerida

### Variables de Entorno Backend (`backend/.env`)
```env
PORT=3001
GEE_PROJECT_ID=nuwa-gee-xxxxx
GEE_PRIVATE_KEY={"type":"service_account",...}
PINATA_API_KEY=xxxxx
PINATA_SECRET_KEY=xxxxx
```

### Variables de Entorno Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

---

## Fincas Analizadas

| Finca | Area (ha) | NDVI | Deforestacion | EUDR | Carbono (tCO2e) |
|-------|-----------|------|---------------|------|-----------------|
| El Sinai | 45.2 | 0.72 | 14.67% | No Cumple | 1,250 |
| Fedar | 28.5 | 0.68 | 2.3% | Cumple | 780 |
| Granja Paraiso | 62.0 | 0.45 | 8.5% | No Cumple | 1,890 |
| Patio Bonito | 35.8 | 0.81 | 1.2% | Cumple | 950 |

---

## Pendientes y Mejoras

### Alta Prioridad

1. **Autenticacion de Usuarios**
   - Implementar JWT o OAuth
   - Roles: admin, farmer, viewer
   - Proteger endpoints de API

2. **Base de Datos**
   - Configurar PostgreSQL o MongoDB
   - Persistir analisis de fincas
   - Historial de cambios

3. **Minteo de NFT en Cardano**
   - Integracion con Lucid/Mesh
   - Smart contracts para certificados
   - Metadata on-chain

### Media Prioridad

4. **Dashboard Mejorado**
   - Graficos historicos de NDVI
   - Comparativa entre fincas
   - Exportacion de reportes PDF

5. **Notificaciones**
   - Alertas de deforestacion
   - Recordatorios de re-analisis
   - Email/SMS

6. **Optimizacion de Imagenes GEE**
   - Cache de imagenes satelitales
   - Procesamiento en batch
   - Reducir tiempo de respuesta

### Baja Prioridad

7. **Internacionalizacion (i18n)**
   - Soporte para ingles
   - Cambio de idioma dinamico

8. **Tests Automatizados**
   - Unit tests para servicios
   - Integration tests para API
   - E2E tests para frontend

9. **CI/CD Pipeline**
   - GitHub Actions
   - Deploy automatico
   - Ambientes staging/production

---

## Bugs Conocidos

| Bug | Severidad | Descripcion | Solucion Propuesta |
|-----|-----------|-------------|-------------------|
| Timeout GEE | Media | Analisis de poligonos grandes puede fallar | Implementar chunking |
| Z-coordinates | Baja | Algunos GeoJSON tienen coordenadas 3D | Ya manejado en uploader |
| CORS | Baja | Errores ocasionales en desarrollo | Configurar proxy |

---

## Como Ejecutar

### Backend
```bash
cd backend
npm install
npx tsx server.ts
# Servidor en http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App en http://localhost:3000
```

### Analisis Local
```bash
python scripts/local-analysis/analyze_farm.py data/farms/PoligonoFedar.json
```

### Subir a IPFS
```bash
python scripts/ipfs/upload_to_ipfs.py data/farms/output/PoligonoFedar_analysis.json
```

---

## Proximos Pasos Recomendados

1. **Semana 1-2**: Implementar autenticacion y base de datos
2. **Semana 3-4**: Desarrollar minteo de NFT en Cardano testnet
3. **Semana 5-6**: Dashboard avanzado con graficos historicos
4. **Semana 7-8**: Tests y CI/CD
5. **Semana 9-10**: Deploy a produccion

---

## Contacto y Recursos

- **Repositorio**: github.com/fabianhuertas1992/nuwa-digital-twin
- **IPFS Gateway**: gateway.pinata.cloud
- **GEE Console**: code.earthengine.google.com
- **Cardano Docs**: developers.cardano.org

---

*Documento generado el 15 de Enero de 2026*
